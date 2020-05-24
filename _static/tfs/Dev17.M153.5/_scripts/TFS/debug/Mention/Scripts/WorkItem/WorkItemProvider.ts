import * as Q from "q";
import * as Diag from "VSS/Diag";
import * as VSS from "VSS/VSS";
import * as VSSError from "VSS/Error";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as MentionHelpers from "Mention/Scripts/TFS.Mention.Helpers";
import { EventLogging, CustomerIntelligenceConstants } from "Mention/Scripts/TFS.Social.Telemetry";
import { ArtifactsCache } from "Mention/Scripts/TFS.Mention";
import { IWorkItem } from "Mention/Scripts/WorkItem/WorkItemMentionModels";
import { ISearchResult } from "Mention/Scripts/TFS.Mention.Autocomplete";
import { WorkItemTrackingHttpClient, getClient } from "TFS/WorkItemTracking/RestClient";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { WorkItemTypeColorAndIcons, WorkItemTypeColorAndIconsProvider, IColorAndIcon } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { WorkItemErrorPolicy } from "TFS/WorkItemTracking/Contracts";
import * as Utilities from "Mention/Scripts/WorkItem/WorkItemMentionUtilities";
import * as Resources from "Mention/Scripts/Resources/TFS.Resources.Mention";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { getClient as getSearchClient } from "Search.Client/RestClient";
import { WorkItemSearchRequest, WorkItemSearchResponse } from "Search.Client/Contracts";
import { ExtensionService } from "VSS/Contributions/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export interface IWorkItemProviderOptions {
    wiql?: string;
    workItemIdsToIgnore?: number[];
}

export class WorkItemProvider {
    public static QUEUE_WAIT_MSEC = 10;
    public static MAX_BATCH_SIZE = 50;

    private static DEFAULT_WIQL: string = `([${CoreFieldRefNames.AuthorizedAs}] = @me
                        AND [${CoreFieldRefNames.AuthorizedDate}] >= @today - 30)
                    OR ([${CoreFieldRefNames.CreatedBy}] = @me
                        AND [${CoreFieldRefNames.CreatedDate}] >= @today - 30)
                    OR ([${CoreFieldRefNames.AssignedTo}] = @me
                        AND [${CoreFieldRefNames.AuthorizedDate}] >= @today - 30)
                    ORDER BY [${CoreFieldRefNames.AuthorizedDate}] DESC`;
    private static _instance: WorkItemProvider;

    private _myWorkItems: IPromise<IWorkItem[]>;
    private _client: WorkItemTrackingHttpClient;
    private _wiql: string;
    private _workItemIdsToIgnore: IDictionaryNumberTo<boolean>;
    private _searchEnabledPromise: Promise<boolean>;

    private _isFullTextEnabled: Promise<boolean> = (async (): Promise<boolean> => {
        if (TfsContext.getDefault().isHosted) {
            return true;
        }
        // On prem might disable full text
        const title = await getClient().getField(CoreFieldRefNames.Title);
        for (const { referenceName } of title.supportedOperations) {
            if (referenceName === "SupportedOperations.ContainsWords") {
                return true;
            }
        }
        return false;
    })();

    public static getInstance(): WorkItemProvider {
        return WorkItemProvider._instance = WorkItemProvider._instance || new WorkItemProvider();
    }

    constructor(options?: IWorkItemProviderOptions) {

        this._client = Service.getClient(WorkItemTrackingHttpClient, MentionHelpers.getMainTfsContext().contextData);

        this._wiql = (options != null && options.wiql != null) ? options.wiql : WorkItemProvider.DEFAULT_WIQL;

        this._workItemIdsToIgnore = {};
        if (options && options.workItemIdsToIgnore && options.workItemIdsToIgnore.length > 0) {
            for (const id of options.workItemIdsToIgnore) {
                this._workItemIdsToIgnore[id] = true;
            }
        }
    }

    public getArtifactType() { return "WorkItem"; }

    public getById(id: string): IPromise<IWorkItem> {
        const workItemId = parseInt(id);
        const promises = this.getWorkItemPromises([workItemId]);

        if (promises.length === 1) {
            return promises[0];
        }

        throw new Error("Expected GetWorkItemsByIds to return 1 promise.");
    }

    public prefetch(): void {
        if (this._myWorkItems) {
            return;
        }

        const startTime = new Date().getTime();
        const assignedEndTimeDeferred = $.Deferred();
        const colorAndIconsEndTimeDeferred = $.Deferred();
        $.when(assignedEndTimeDeferred, colorAndIconsEndTimeDeferred).done((assignedEndTime: number, colorAndIconsEndTime: number) => {
            EventLogging.publishWorkItemsInitializeEvent({
                getMyAssignedWorkItemsDurationInMsec: (assignedEndTime - startTime).toString(),
                getWorkItemColorsProviderDurationInMsec: (colorAndIconsEndTime - startTime).toString()
            });
        });

        this._myWorkItems = this.getMyWorkItems();
        this._myWorkItems.then((workItems) => {
            assignedEndTimeDeferred.resolve(new Date().getTime());
        });

        WorkItemProviderCache.getInstance()._witColorAndIconsProviderPromise.then(() => {
            colorAndIconsEndTimeDeferred.resolve(new Date().getTime());
        });

        this._isWorkItemSearchEnabled();
    }

    public searchById(id: string): JQueryPromise<ISearchResult<IWorkItem>[]> {
        this.prefetch();

        const deferred = $.Deferred<ISearchResult<IWorkItem>[]>();

        const workItemId = parseInt(id);

        const foundWorkItems: ISearchResult<IWorkItem>[] = [];
        const foundWorkItemIds: number[] = [];

        const addFoundWorkItem = (workItem: IWorkItem, highlighted: IWorkItem) => {
            if (!Utils_Array.contains(foundWorkItemIds, workItem.id)) {
                foundWorkItemIds.push(workItem.id);
                foundWorkItems.push({
                    original: workItem,
                    highlighted: highlighted
                });
            }
        };

        const searchWorkItemByNumber = (workItem: IWorkItem) => {
            if (workItem !== null) {
                let highlightedWorkItem: IWorkItem;
                if (isNaN(workItemId)) {
                    highlightedWorkItem = {
                        id: workItem.id,
                        projectName: workItem.projectName,
                        colorAndIcon: workItem.colorAndIcon,
                        workItemType: workItem.workItemType,
                        title: Utils_String.htmlEncode(workItem.title)
                    };

                    addFoundWorkItem(workItem, highlightedWorkItem);
                } else {
                    highlightedWorkItem = Utilities.searchHighlightedWorkItem(id, workItem);
                    if (highlightedWorkItem !== workItem) {
                        addFoundWorkItem(workItem, highlightedWorkItem);
                    }
                }
            }
        };

        const exactMatchWorkItemPromise = this.getWorkItems([workItemId]);
        Q.all([exactMatchWorkItemPromise, this._myWorkItems]).then((workItemLists) => {
            workItemLists.forEach(workItemList => {
                workItemList.forEach(workItem => {
                    searchWorkItemByNumber(workItem);
                });
            });
            deferred.resolve(foundWorkItems);
        },
            function () {
                deferred.reject.apply(deferred, arguments);
            });

        return deferred.promise();
    }

    /**
     * Transforms work items into a search result model and optionally higlights matches
     * @param term The search term
     * @param workItems The result work items
     * @param requireHighlight Should we higlight work items and filter out ones that don't get highlighted
     */
    private _transformWorkItems(term: string, workItems: IWorkItem[], requireHighlight: boolean): ISearchResult<IWorkItem>[] {
        const filteredWorkItems: ISearchResult<IWorkItem>[] = [];
        workItems.forEach(workItem => {
            if (!this._workItemIdsToIgnore[workItem.id]) {
                const highlightedWorkItem = requireHighlight
                    ? Utilities.searchHighlightedWorkItem(term, workItem)
                    : workItem;

                if (highlightedWorkItem !== workItem || !requireHighlight) {
                    filteredWorkItems.push({ original: workItem, highlighted: highlightedWorkItem });
                }
            }
        });
        return filteredWorkItems;
    }

    public search(term: string): JQueryPromise<ISearchResult<IWorkItem>[]> {
        this.prefetch();

        const deferred = $.Deferred<ISearchResult<IWorkItem>[]>();
        this._myWorkItems.then(
            (workItems) => {
                const filteredWorkItems: ISearchResult<IWorkItem>[] = this._transformWorkItems(term, workItems, true);
                deferred.resolve(filteredWorkItems);
            },
            (error) => {
                deferred.reject(error);
            });

        return deferred.promise();
    }

    public async searchOnServer(term: string): Promise<ISearchResult<IWorkItem>[]> {
        if (term) {
            const resultCount: number = 50;
            const terms: string[] = Utilities.getMultiTerms(term, false);
            const termsOverLimit = terms.length > Utilities.MultipleTermsLimit;
            publishEvent(new TelemetryEventData(
                CustomerIntelligenceConstants.MENTION_AREA,
                CustomerIntelligenceConstants.WORKITEMPROVIDER_SEARCHONSERVER_EVENT,
                {
                    termsOverLimit: termsOverLimit,
                    numberOfTerms: terms.length
                })
            );

            if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.MentionWorkItemRestSearch) && await this._isWorkItemSearchEnabled()) {
                const request: WorkItemSearchRequest = {
                    $orderBy: null,
                    $skip: 0,
                    $top: resultCount,
                    filters: null,
                    includeFacets: false,
                    searchText: term,
                };
                const lower = (s: string) => s.toLowerCase();
                const result: WorkItemSearchResponse = await getSearchClient().fetchWorkItemSearchResults(request);
                const projectNames = result.results.map(r => r.project.name);

                const colorProvider = WorkItemTypeColorAndIconsProvider.getInstance();
                await colorProvider.ensureColorAndIconsArePopulated(projectNames);

                const wis = result.results.map((r): IWorkItem => {
                    const projectName = r.project.name;
                    const resultWorkItemType: string = r.fields[lower(CoreFieldRefNames.WorkItemType)];
                    const colorAndIcon: IColorAndIcon = colorProvider.getColorAndIcon(projectName, resultWorkItemType);
                    return {
                        id: +r.fields[lower(CoreFieldRefNames.Id)],
                        title: r.fields[lower(CoreFieldRefNames.Title)],
                        colorAndIcon: colorAndIcon,
                        projectName: projectName,
                        workItemType: resultWorkItemType
                    };
                });
                return this._transformWorkItems(term, wis, false);
            } else {
                if (termsOverLimit) {
                    throw new Error(Utils_String.localeFormat(Resources.AutocompleteTermsOverLimit, Utilities.MultipleTermsLimit));
                } else {
                    /**
                     * An example of composed "where" for term "1 2 3 text":
                     * WHERE
                     *     ([System.Title] CONTAINS WORDS '1' AND [System.Title] CONTAINS WORDS '2' AND [System.Title] CONTAINS WORDS '3' AND [System.Title] CONTAINS WORDS 'text')
                     *     OR [System.Title] CONTAINS WORDS '1 2 3 text'
                     *     OR [System.Id] = '1' OR [System.Id] = '2' OR [System.Id] = '3'
                     *     ORDER BY [System.AuthorizedDate] DESC
                     */

                    // Title filter
                    const fullTextEnabled = await this._isFullTextEnabled;
                    const operator = fullTextEnabled ? "CONTAINS WORDS" : "CONTAINS";
                    const titleClauses = terms.map(item => `[${CoreFieldRefNames.Title}] ${operator} '${item.replace(/'/g, "''")}'`);
                    let titleFilter = titleClauses.join(" AND ");
                    if (fullTextEnabled) {
                        titleFilter = `(${titleFilter}) OR [${CoreFieldRefNames.Title}] ${operator} '${term.replace(/'/g, "''")}'`;
                    }

                    // Id filter
                    const idTerms = terms.filter(t => !isNaN(+t));
                    const idClauses = idTerms.map(id => `OR [${CoreFieldRefNames.Id}] = '${id}'`);
                    const idFilter = idClauses.join(" ");

                    // ORDER BY option
                    const orderBy = `ORDER BY [${CoreFieldRefNames.AuthorizedDate}] DESC`;

                    // Final where
                    const where = `${titleFilter}${idFilter ? ` ${idFilter}` : ""} ${orderBy}`;

                    const workItems = await this._getWiqlResults(where, resultCount);
                    const filteredWorkItems: ISearchResult<IWorkItem>[] = this._transformWorkItems(term, workItems, false);
                    return filteredWorkItems;
                }
            }
        } else {
            return [];
        }
    }

    private async _isWorkItemSearchEnabled(): Promise<boolean> {
        if (this._searchEnabledPromise === undefined) {
            this._searchEnabledPromise = new Promise<boolean>(async (resolve, reject) => {
                const service: ExtensionService = Service.getService(ExtensionService);
                try {
                    const contributions: Contribution[] = await service.getContributions(["ms.vss-search-platform.entity-type-collection"], false, true);
                    for (const { id } of contributions) {
                        if (
                            id === "ms.vss-workitem-search.workitem-entity-type" ||
                            id === "ms.vss-workitem-searchonprem.workitem-entity-type"
                        ) {
                            resolve(true);
                            return;
                        }
                    }
                    resolve(false);
                } catch (error) {
                    resolve(false);
                    VSSError.publishErrorToTelemetry(error);
                }
            });
        }

        return await this._searchEnabledPromise;
    }

    public static isValidWorkItemId(id: number) {
        return id >= 1 && id <= 2147483647;
    }

    private getMyWorkItems(): IPromise<IWorkItem[]> {
        return this._getWiqlResults(this._wiql, 50);
    }

    private getWorkItems(ids: number[]): IPromise<IWorkItem[]> {
        if (ids.length === 0) {
            throw new Error("ids must contain elements.");
        }

        return Q.all(this.getWorkItemPromises(ids));
    }

    private getWorkItemPromises(ids: number[]): IPromise<IWorkItem>[] {
        return ids.map((id) => {
            if (!WorkItemProvider.isValidWorkItemId(id)) {
                return Q(null);
            }
            return WorkItemProviderCache.getInstance().cache.getArtifactPromise(id);
        });
    }

    private async _getWiqlResults(whereClause: string, limit: number): Promise<IWorkItem[]> {
        const query = `SELECT [${CoreFieldRefNames.Id}] FROM WorkItems WHERE ${whereClause}`;
        const wiqlResult = await this._client.queryByWiql({ query }, undefined, undefined, undefined, limit);
        const ids = wiqlResult.workItems.map(({ id }) => id).filter(id => !this._workItemIdsToIgnore[id]);
        if (ids.length === 0) {
            return [];
        }
        return this.getWorkItems(ids);
    }
}

export class WorkItemProviderCache {
    private static _instance: WorkItemProviderCache;
    public cache: ArtifactsCache<IWorkItem>;
    private _client: WorkItemTrackingHttpClient;

    public _witColorAndIconsProviderPromise: IPromise<void>;

    public static getInstance(): WorkItemProviderCache {
        if (!WorkItemProviderCache._instance) {
            WorkItemProviderCache._instance = new WorkItemProviderCache();
        }
        return WorkItemProviderCache._instance;
    }

    constructor() {
        this.cache = new ArtifactsCache<IWorkItem>((keys) => this._loadWorkItems(keys), WorkItemProvider.QUEUE_WAIT_MSEC, WorkItemProvider.MAX_BATCH_SIZE);
        this._client = Service.getClient(WorkItemTrackingHttpClient, MentionHelpers.getMainTfsContext().contextData);

        const projectName = this._getProjectName();
        if (!projectName) {
            this._witColorAndIconsProviderPromise = Q<void>(null);
        } else {
            this._witColorAndIconsProviderPromise = WorkItemTypeColorAndIconsProvider.getInstance().queueEnsureColorAndIconsArePopulated(projectName);
        }
    }

    private _loadWorkItems(ids: number[]): IDictionaryNumberTo<IPromise<IWorkItem>> {
        const fieldsToPull = [
            CoreFieldRefNames.Id,
            CoreFieldRefNames.WorkItemType,
            CoreFieldRefNames.Title,
            CoreFieldRefNames.TeamProject
        ];
        const deferreds: IDictionaryNumberTo<Q.Deferred<IWorkItem>> = {};
        const promises: IDictionaryNumberTo<Q.Promise<IWorkItem>> = {};
        ids.forEach((id) => {
            deferreds[id] = Q.defer<IWorkItem>();
            promises[id] = deferreds[id].promise;
        });

        // We are using current team project name to use project-scoped REST API for public project
        // Note that project name is ignored on the server for members and work items that are not in the
        // current project will not be fetched for anonymous/public users
        const projectName = this._getProjectName();
        this._client.getWorkItems(ids, fieldsToPull, null, null, WorkItemErrorPolicy.Omit, projectName).then((workItems) => {
            const workItemIdsFound: number[] = [];

            const getWorkItemsPromises: IPromise<void>[] = workItems.filter(value => value !== null).map((workItem) => {
                const fields = workItem.fields;
                const workItemType = fields[CoreFieldRefNames.WorkItemType];
                const workItemProject = fields[CoreFieldRefNames.TeamProject];

                const coloredWorkItem: IWorkItem = {
                    id: fields[CoreFieldRefNames.Id],
                    projectName: workItemProject,
                    workItemType: workItemType,
                    title: fields[CoreFieldRefNames.Title],
                    colorAndIcon: WorkItemTypeColorAndIcons.getDefault() // keep default color if color provider fails.
                };
                workItemIdsFound.push(coloredWorkItem.id);

                return WorkItemTypeColorAndIconsProvider.getInstance().getColorAndIconAsync(workItemProject, workItemType).then((colorAndIcon: IColorAndIcon) => {
                    coloredWorkItem.colorAndIcon = colorAndIcon;
                    deferreds[coloredWorkItem.id].resolve(coloredWorkItem);
                }, (error) => {
                    // promises are resolved even if color provider fails.
                    deferreds[coloredWorkItem.id].resolve(coloredWorkItem);
                    VSSError.publishErrorToTelemetry(error);
                });
            });

            // Wait until all getWorkItemsPromises are done and
            // reject all ids that have not been found in getWorkItems;
            return Q.allSettled(getWorkItemsPromises).then(() => {
                ids.forEach((id) => {
                    if (workItemIdsFound.indexOf(id) === -1) {
                        const errorMessage = `WorkItem #${id} not returned from server.`;
                        Diag.logWarning(errorMessage);
                        deferreds[id].resolve(null);
                    }
                });
            });
        },
            (error: Error) => {
                VSS.handleError(error);
                ids.forEach((id) => {
                    deferreds[id].reject(error);
                });
            });

        return promises;
    }

    private _getProjectName() {
        return MentionHelpers.getMainTfsContext().navigation.project || Utils_String.empty;
    }
}