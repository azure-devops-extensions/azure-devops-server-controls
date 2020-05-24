import { autobind } from "OfficeFabric/Utilities";
import { LinkingUtilities } from "VSS/Artifacts/Services";
import { Store } from "VSS/Flux/Store";
import * as Utils_Array from "VSS/Utils/Array";
import * as  Utils_String from "VSS/Utils/String";

import { IInternalLinkedArtifactDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { WikiHit, WikiResult, WikiSearchResponse } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { getWikiPagePathFromGitPath, removeExtensionfromPagePath } from "SearchUI/Helpers/WikiHelper";
import { ActionListener } from "VersionControl/Scenarios/Shared/ActionListener";
import { WorkItemReference } from "TFS/WorkItemTracking/Contracts";

import {
    ArtifactUriToWorkItemReferencesMap,
    BrokenLinksAutoFixMetrics,
    RenamePageDialogActionsHub,
    WikiPageLinkSearchResultPayload,
    WikiPageUpdateData,
    WorkItemData,
} from "Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialogActionsHub";
import { OperationStatus } from "Wiki/Scripts/CommonInterfaces";
import { getWikiPagePathFromArtifactId } from "Wiki/Scripts/WikiPageArtifactHelpers";

export interface RenamePageDialogState {
    wikiPagesUpdateData: WikiPageUpdateData[];
    hasFetchedAllBrokenPageLinks: boolean;
    isFetchingMorePageLinks: boolean;
    workItemIdToDataMap: IDictionaryNumberTo<WorkItemData>;
    isPageSearchQueryPending: boolean;
    isLoadingWorkItems: boolean;
    hasEvaluationStarted: boolean;
    updateStarted: boolean;
    hasAutofixCompleted: boolean;
    autofixingLinks: boolean;
    wikiPagesToFixCount: number;
    workItemsToFixCount: number;
    brokenLinksAutoFixMetrics: BrokenLinksAutoFixMetrics;
}

export class RenamePageDialogStore extends Store {
    private _artifactUrisToWorkItemReferencesMap: ArtifactUriToWorkItemReferencesMap;
    private _actionListener: ActionListener;
    private _state: RenamePageDialogState = {
        workItemIdToDataMap: {},
        wikiPagesUpdateData: [],
        hasFetchedAllBrokenPageLinks: false,
        isFetchingMorePageLinks: false,
        isLoadingWorkItems: false,
        isPageSearchQueryPending: false,
        hasEvaluationStarted: false,
        updateStarted: false,
        hasAutofixCompleted: false,
        autofixingLinks: false,
        wikiPagesToFixCount: undefined,
        workItemsToFixCount: undefined,
        brokenLinksAutoFixMetrics: {
            pageUpdateSuccessCount: 0,
            pageUpdateFailureCount: 0,
            workItemUpdateSuccessCount: 0,
            workItemUpdateFailureCount: 0,
        },
    };

    constructor(private _actionsHub: RenamePageDialogActionsHub) {
        super();

        this._actionListener = new ActionListener();

        this._actionListener.addListener(this._actionsHub.evaluationStarted, this._onEvaluationStarted);
        this._actionListener.addListener(this._actionsHub.updateStarted, this._onUpdateStarted);
        this._actionListener.addListener(this._actionsHub.autofixCompleted, this._onAutofixCompleted);
        this._actionListener.addListener(this._actionsHub.workItemReferencesLoaded, this._onWorkItemReferencesLoaded);
        this._actionListener.addListener(this._actionsHub.workItemsDisplayDataLoaded, this._onWorkItemsDisplayDataLoaded);
        this._actionListener.addListener(this._actionsHub.wikiPageSearchResultLoaded, this._onWikiPageSearchResultLoaded);
        this._actionListener.addListener(this._actionsHub.wikiPageLinksUpdateSucceeded, this._onPageLinksUpdated);
        this._actionListener.addListener(this._actionsHub.wikiPageLinksUpdateFailed, this._onPageLinksUpdateFailed);
        this._actionListener.addListener(this._actionsHub.workItemUpdateResultsLoaded, this._onWorkItemUpdateResultsLoaded);
        this._actionListener.addListener(this._actionsHub.workItemUpdatesFailed, this._onWorkItemsUpdatesFailed);
        this._actionListener.addListener(this._actionsHub.fetchingPageLinks, this._fetchingPageLinks);
    }

    public get state(): RenamePageDialogState {
        return this._state;
    }

    @autobind
    public getRenamePageDialogState(): RenamePageDialogState {
        return this.state;
    }

    public dispose(): void {
        if (this._actionListener) {
            this._actionListener.disposeActions();
            this._actionListener = null;
        }

        this._actionsHub = null;
        this._state = null;
    }

    @autobind
    private _onEvaluationStarted(): void {
        this._state.isLoadingWorkItems = true;
        this._state.isPageSearchQueryPending = true;
        this._state.hasEvaluationStarted = true;

        this.emitChanged();
    }

    @autobind
    private _onUpdateStarted(autofixingLinks: boolean): void {
        this._state.autofixingLinks = autofixingLinks;
        this._state.updateStarted = true;

        this.emitChanged();
    }

    @autobind
    private _onAutofixCompleted(): void {
        this._state.hasAutofixCompleted = true;

        this.emitChanged();
    }

    @autobind
    private _onWorkItemReferencesLoaded(result: ArtifactUriToWorkItemReferencesMap): void {
        this._artifactUrisToWorkItemReferencesMap = result;
    }

    @autobind
    private _onWorkItemsDisplayDataLoaded(workItemsDisplayData: IInternalLinkedArtifactDisplayData[]): void {
        const idToWorkItemDisplayDataMap: IDictionaryNumberTo<IInternalLinkedArtifactDisplayData> = {};

        this._state.workItemsToFixCount = 0;
        workItemsDisplayData.forEach((workItemDisplayData: IInternalLinkedArtifactDisplayData) => {
            this._state.workItemsToFixCount++;
            idToWorkItemDisplayDataMap[workItemDisplayData.id] = workItemDisplayData;
        });

        const artifactUrisQueryResult = this._artifactUrisToWorkItemReferencesMap;
        const workItemIdToDataMap: IDictionaryNumberTo<WorkItemData> = {};

        if (artifactUrisQueryResult) {
            for (const wikiPageUri in artifactUrisQueryResult) {
                if (artifactUrisQueryResult.hasOwnProperty(wikiPageUri)) {
                    const wikiPagePath: string = getWikiPagePathFromArtifactId(LinkingUtilities.decodeUri(wikiPageUri).id);

                    artifactUrisQueryResult[wikiPageUri].forEach((workItemReference: WorkItemReference) => {
                        const workItemId: number = workItemReference.id;
                        if (workItemIdToDataMap[workItemId]) {
                            workItemIdToDataMap[workItemId].wikiPagePaths.push(wikiPagePath);
                        } else {
                            workItemIdToDataMap[workItemId] = {
                                displayData: idToWorkItemDisplayDataMap[workItemId],
                                updateState: OperationStatus.InProgress,
                                wikiPagePaths: [wikiPagePath],
                            };
                        }
                    });
                }
            }
        }

        this._state.workItemIdToDataMap = workItemIdToDataMap;

        this._state.isLoadingWorkItems = false;
        this.emitChanged();
    }

    @autobind
    private _fetchingPageLinks(isLoadingMore: boolean): void {
        if (isLoadingMore) {
            this._state.isFetchingMorePageLinks = true;
            this.emitChanged();
        }
    }

    @autobind
    private _onWikiPageSearchResultLoaded(payload: WikiPageLinkSearchResultPayload): void {
        const wikiSearchUrlRawField = "contentLinks.lower";
        const highlightTagName = "highlighthit";
        const xmlParser = new DOMParser();
        const wikiPagesUpdateData: WikiPageUpdateData[] = [];

        if (payload.wikiSearchResponse && payload.wikiSearchResponse.results) {
            payload.wikiSearchResponse.results.forEach((wikiResult: WikiResult) => {
                const links: string[] = [];
                wikiResult.hits.forEach((wikiHit: WikiHit) => {
                    if (Utils_String.equals(wikiHit.fieldReferenceName, wikiSearchUrlRawField, true)) {
                        wikiHit.highlights.forEach((highlight: string) => {
                            try {
                                const parsedXml: Document = xmlParser.parseFromString(highlight, "text/xml");
                                const link = parsedXml.getElementsByTagName(highlightTagName)[0].childNodes[0].nodeValue;

                                if (!Utils_Array.contains(links, link)) {
                                    links.push(link);
                                }
                            } catch (e) {
                                // xmlParser.parseFromString can throw exception if highlight content is malformed.
                            }
                        });
                    }
                })

                wikiPagesUpdateData.push({
                    pagePath: getWikiPagePathFromGitPath(removeExtensionfromPagePath(wikiResult.path)),
                    links: links,
                    updateState: OperationStatus.InProgress,
                });
            });

            this._state.wikiPagesToFixCount = payload.wikiSearchResponse.count;

            if (payload.isLoadMore) {
                this._state.wikiPagesUpdateData = this._state.wikiPagesUpdateData.concat(wikiPagesUpdateData);
                this._state.isFetchingMorePageLinks = false;
            } else {
                this._state.wikiPagesUpdateData = wikiPagesUpdateData;
            }
            this._state.hasFetchedAllBrokenPageLinks = this._state.wikiPagesUpdateData.length === payload.wikiSearchResponse.count;
            this._state.isPageSearchQueryPending = false;
        }

        this.emitChanged();
    }

    @autobind
    private _onWorkItemUpdateResultsLoaded(updateResults: IDictionaryNumberTo<boolean>): void {
        const workitemIdToDataMap: IDictionaryNumberTo<WorkItemData> = this._state.workItemIdToDataMap;

        if (updateResults) {
            for (const workItemId in workitemIdToDataMap) {
                if (workitemIdToDataMap.hasOwnProperty(workItemId)) {
                    const success: boolean = updateResults[workItemId];

                    if (success) {
                        this._state.brokenLinksAutoFixMetrics.workItemUpdateSuccessCount++;
                        workitemIdToDataMap[workItemId].updateState = OperationStatus.Completed;
                    } else {
                        this._state.brokenLinksAutoFixMetrics.workItemUpdateFailureCount++;
                        workitemIdToDataMap[workItemId].updateState = OperationStatus.Failed;
                    }
                }
            }

            this._state.workItemIdToDataMap = { ...workitemIdToDataMap };

            this.emitChanged();
        }
    }

    @autobind
    private _onWorkItemsUpdatesFailed(): void {
        const workitemIdToDataMap: IDictionaryNumberTo<WorkItemData> = this._state.workItemIdToDataMap;

        for (const workItemId in workitemIdToDataMap) {
            if (workitemIdToDataMap.hasOwnProperty(workItemId)) {
                workitemIdToDataMap[workItemId].updateState = OperationStatus.Failed;
                this._state.brokenLinksAutoFixMetrics.workItemUpdateFailureCount++;
            }
        }

        this.emitChanged();
    }

    @autobind
    private _onPageLinksUpdated(pagePath: string): void {
        const wikiPagesUpdateData: WikiPageUpdateData[] = this._state.wikiPagesUpdateData;

        if (wikiPagesUpdateData) {
            const wikiPageUpdateData = wikiPagesUpdateData.find((wikiPageUpdateData: WikiPageUpdateData) => wikiPageUpdateData.pagePath === pagePath);
            if (wikiPageUpdateData) {
                this._state.brokenLinksAutoFixMetrics.pageUpdateSuccessCount++;
                wikiPageUpdateData.updateState = OperationStatus.Completed;
            }

            this._state.wikiPagesUpdateData = Utils_Array.clone(wikiPagesUpdateData);
            this.emitChanged();
        }
    }

    @autobind
    private _onPageLinksUpdateFailed(pagePath: string): void {
        const wikiPagesUpdateData: WikiPageUpdateData[] = this._state.wikiPagesUpdateData;

        if (wikiPagesUpdateData) {
            const wikiPageUpdateData = wikiPagesUpdateData.find((wikiPageUpdateData: WikiPageUpdateData) => wikiPageUpdateData.pagePath === pagePath);

            if (wikiPageUpdateData) {
                this._state.brokenLinksAutoFixMetrics.pageUpdateFailureCount++;
                wikiPageUpdateData.updateState = OperationStatus.Failed;
            }

            this._state.wikiPagesUpdateData = Utils_Array.clone(wikiPagesUpdateData);
            this.emitChanged();
        }
    }
}
