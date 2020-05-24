/// <reference types="q" />

import * as Q from "q";
import { DateSKParser } from "Analytics/Scripts/DateSKParser";
import { AnalyticsODataVersions, OData, ODataQueryOptions } from "Analytics/Scripts/OData";
import * as Contracts from "Widgets/Scripts/KanbanTime/KanbanTimeContracts";
import { KanbanTimeAgileSettingsHelper, BacklogInformation } from "Widgets/Scripts/KanbanTime/KanbanTimeAgileSettingsHelper";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { Events } from "TFS/Dashboards/Events";
import * as WorkContracts from "TFS/Work/Contracts";
import * as Context from "VSS/Context";
import * as Action from "VSS/Events/Action";
import * as DateUtils from "VSS/Utils/Date";
import { SettingsHelper } from "Widgets/Scripts/Utilities/SettingsHelper";
import Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");


export class KanbanTimeDataService extends TfsService implements Contracts.IKanbanTimeDataService {
    protected static readonly axODataVersion: string = AnalyticsODataVersions.v1;
    // Cached data split by work item type and by data options
    private cache: IDictionaryStringTo<(Contracts.KanbanTimeStdDevCalculationData | Contracts.CompletedWorkItem)[]>;

    /**
     * Returns a key for the given data options ignoring work item types.
     * @param dataName indicates what kind of data is being cached.
     * @param dataOptions that should be converted to a caching key.
     * @returns a string that serves as a key into the cache dictionary.
     */
    private static getKey(dataName: string, dataOptions: Contracts.KanbanTimeDataQueryOptions): string {
        var sortedTeamIds = dataOptions.teamIds.slice().sort();

        let key = `${dataName}/${dataOptions.startDate}/${dataOptions.timeType}/${sortedTeamIds.join("/")}`;
        if (dataOptions.backlogCategory != null) {
            key = `${key}/${dataOptions.backlogCategory}`;
        }

        return key;
    }

    private static getCommand(timeType: Contracts.KanbanTimeType): string {
        return timeType === Contracts.KanbanTimeType.Lead ? "LeadTime" : "CycleTime";
    }

    /**
     * Helper to expand an array into a series of or statements.
     * Ex. isInArray("Id", ["1", "2", "3"]) outputs "Id eq 1 or Id eq 2 or Id eq 3".
     * @param propertyName is the property of the entity to check if it is in the array of values.
     * @param propertyIsId indicates whether the property of the entity is of type Guid.
     * @param values are the values that the property should be compared against.
     * @returns a string of clauses linked by 'or'.
     */
    private static isInArray(propertyName: string, propertyIsId: boolean, values: string[]): string {
        let mapping = val => `${propertyName} eq '${val}'`;
        if (propertyIsId) {
            mapping = val => `${propertyName} eq ${val}`;
        }

        let clauses = values.map(mapping);
        return clauses.join(" or ");
    }

    private static convertCalculationDataFromOData(odata: Contracts.ODataKanbanTimeStdDevCalculationData[]): Contracts.KanbanTimeStdDevCalculationData[] {
        return odata.map<Contracts.KanbanTimeStdDevCalculationData>(d => {
            return {
                completedDate: DateSKParser.parseDateSKAsDateString(d.CompletedDateSK),
                workItemType: d.WorkItemType,
                count: d.CompletedCount,
                sum: d.Sum,
                sumOfSquares: d.SumOfSquares
            };
        });
    }

    private static convertCompletedWorkItemsFromOData(odata: Contracts.ODataCompletedWorkItem[], kanbanTimeType: Contracts.KanbanTimeType): Contracts.CompletedWorkItem[] {
        return odata.map<Contracts.CompletedWorkItem>(wi => {
            let kanbanTime = (kanbanTimeType === Contracts.KanbanTimeType.Lead) ? wi.LeadTimeDays : wi.CycleTimeDays

            return {
                id: wi.WorkItemId,
                title: wi.Title,
                workItemType: wi.WorkItemType,
                completedDate: DateSKParser.parseDateSKAsDateString(wi.CompletedDateSK),
                kanbanTime: kanbanTime
            };
        });
    }

    constructor() {
        super();
        this.resetCache();
        this.registerClearCacheOnViewChange();
    }

    /**
     * Retrieves data for calculating standard deviations and averages of Kanban Times.
     * @param dataOptions detailing what data to query for.
     * @returns a promise containing an array of data used to calculate standard deviations and averages.
     */
    public getStdDevCalculationData(dataOptions: Contracts.KanbanTimeDataQueryOptions): IPromise<Contracts.KanbanTimeStdDevCalculationData[]> {
        let dataName = "stdDevData";
        let dataPromise: IPromise<Contracts.KanbanTimeStdDevCalculationData[]>;
        let cachedData = this.getCachedData(dataName, dataOptions) as Contracts.KanbanTimeStdDevCalculationData[];
        const projectId = Context.getDefaultWebContext().project.id;

        if (cachedData == null) {
            let queryOptionsPromise = dataOptions.backlogCategory != null
                ? this.generateStdDevQueryOptionsFromBacklogCategory(projectId, dataOptions)
                : this.generateStdDevQueryOptionsFromWorkItemTypes(projectId, dataOptions);

            dataPromise = queryOptionsPromise
                .then(queryOptions => OData.query(KanbanTimeDataService.getCommand(dataOptions.timeType), queryOptions, dataOptions.timeoutMs))
                .then((data: { value: Contracts.ODataKanbanTimeStdDevCalculationData[] }) => {
                    let convertedData = KanbanTimeDataService.convertCalculationDataFromOData(data.value);
                    this.cacheData(dataName, dataOptions, convertedData);
                    return convertedData;
                });
        } else {
            dataPromise = Q(cachedData);
        }

        return dataPromise;
    }

    /**
     * Retrieves data about completed work items.
     * @param dataOptions detailing what data to query for.
     * @returns a promise containing an array of completed work item information.
     */
    public getCompletedWorkItems(dataOptions: Contracts.KanbanTimeDataQueryOptions): IPromise<Contracts.CompletedWorkItem[]> {
        let dataName = "completedWorkItems";
        let dataPromise: IPromise<Contracts.CompletedWorkItem[]>;
        let cachedData = this.getCachedData(dataName, dataOptions) as Contracts.CompletedWorkItem[];
        const projectId = Context.getDefaultWebContext().project.id;

        if (cachedData == null) {
            let queryOptionsPromise = dataOptions.backlogCategory != null
                ? this.generateCompletedQueryOptionsFromBacklogCategory(projectId, dataOptions)
                : this.generateCompletedQueryOptionsFromWorkItemTypes(projectId, dataOptions);

            dataPromise = queryOptionsPromise
                .then(queryOptions => OData.query(KanbanTimeDataService.getCommand(dataOptions.timeType), queryOptions, dataOptions.timeoutMs))
                .then((data: { value: Contracts.ODataCompletedWorkItem[] }) => {
                    let convertedData = KanbanTimeDataService.convertCompletedWorkItemsFromOData(data.value, dataOptions.timeType);
                    this.cacheData(dataName, dataOptions, convertedData);
                    return convertedData;
                });
        } else {
            dataPromise = Q(cachedData);
        }

        return dataPromise;
    }

    //Note: The following two codepath are ~70% dupe. We should consolidate to avoid duplication.
    private generateStdDevQueryOptionsFromTeamWorkItemClauses(project: string, dataOptions: Contracts.KanbanTimeDataQueryOptions, teamWorkItemClauses: string[]): IPromise<ODataQueryOptions> {
        let startDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(dataOptions.startDate);
        let startDateSK = DateUtils.format(startDate, DateSKParser.dateSKFormat);
        let timeType = (dataOptions.timeType === Contracts.KanbanTimeType.Lead) ? "LeadTimeDays" : "CycleTimeDays";

        let apply =
            "filter("
            + `CompletedDateSK ge ${startDateSK}`
            + ` and Teams/any(t:${teamWorkItemClauses.join(" or ")})`
            + ")"
            + "/groupby((CompletedDateSK, WorkItemType)"
            + ",aggregate($count as CompletedCount"
            + `,${timeType} with sum as Sum`
            + `,${timeType} mul ${timeType} with sum as SumOfSquares))`;

        return Q({
            entityType: "WorkItems",
            oDataVersion: KanbanTimeDataService.axODataVersion,
            project: project,
            $apply: apply
        });
    }

    private generateStdDevQueryOptionsFromWorkItemTypes(project: string, dataOptions: Contracts.KanbanTimeDataQueryOptions): IPromise<ODataQueryOptions> {
        let startDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(dataOptions.startDate);
        let startDateSK = DateUtils.format(startDate, DateSKParser.dateSKFormat);
        let timeType = (dataOptions.timeType === Contracts.KanbanTimeType.Lead) ? "LeadTimeDays" : "CycleTimeDays";

        let teamIdIsInArray = KanbanTimeDataService.isInArray("t/TeamSK", true /* propertyIsId */, dataOptions.teamIds);
        let workItemTypeIsInArray = KanbanTimeDataService.isInArray("WorkItemType", false /* propertyIsId */, dataOptions.workItemTypes);
        let apply =
            "filter("
            + `CompletedDateSK ge ${startDateSK}`
            + ` and (Teams/any(t:${teamIdIsInArray}))`
            + ` and (${workItemTypeIsInArray})`
            + ")"
            + "/groupby((CompletedDateSK, WorkItemType)"
            + ",aggregate($count as CompletedCount"
            + `,${timeType} with sum as Sum`
            + `,${timeType} mul ${timeType} with sum as SumOfSquares))`;

        return Q({
            entityType: "WorkItems",
            oDataVersion: KanbanTimeDataService.axODataVersion,
            project: project,
            $apply: apply
        });
    }

    /**
     * Get Work item types list associated held by each team
     * Currently, only a single team is supported with Kanban widgets. When this expands out, we should set up a dedicated batch API for pulling this data.
     */
    private getWorkItemTypesOfEachTeam(projectId: string, teamIds: string[], backlogCategory: string): IPromise<string[][]> {

        if (teamIds.length > 1) {
            throw "Not implemented Exception"; //Multi-team scenario should be optimized as a batch
        }

        let useAnalytics = SettingsHelper.useAnalyticsForProcessData();
        if (!useAnalytics) {
            var promise = KanbanTimeAgileSettingsHelper.getBacklogInformation(projectId, backlogCategory).then((backlogInformation: BacklogInformation) => {
                let teamWorkItemTypesListPromises: IPromise<string[]>[] = [];
                teamIds.forEach(teamId => {
                    teamWorkItemTypesListPromises.push(KanbanTimeAgileSettingsHelper.getTeamBugsBehavior(projectId, teamId).then((bugsBehavior: WorkContracts.BugsBehavior) => {
                        return this.chooseWorkItemTypesList(bugsBehavior, backlogInformation);
                    }));
                });
                return teamWorkItemTypesListPromises;
            });
            return Q.all(promise);
        } else {
            let teamWorkItemTypesListPromises: IPromise<string[]>[] = [];
            teamIds.forEach(teamId => {
                teamWorkItemTypesListPromises.push(SettingsHelper.getTeamWorkItemTypesOfBacklogCategory(projectId, teamId, backlogCategory));
            });
            return Q.all(teamWorkItemTypesListPromises);
        }
    }

    private chooseWorkItemTypesList(teamBugsBehavior: WorkContracts.BugsBehavior, backlogInformation: BacklogInformation) {
        return teamBugsBehavior === WorkContracts.BugsBehavior.AsRequirements ? backlogInformation.bugsAndWorkItemTypes : backlogInformation.workItemTypes;
    }

    private assembleTeamWorkItemClause(teamId: string, workItemTypesForTeam: string[]): string {
        if (workItemTypesForTeam == null || workItemTypesForTeam.length === 0) { throw new Error(Resources_Widgets.KanbanTime_WorkItemTypeNeeded); } //Without any work item types, the query will fail. The widget needs to be reconfigured.
        let workItemTypeIsInArray = KanbanTimeDataService.isInArray("WorkItemType", false /* propertyIsId */, workItemTypesForTeam);
        return (`(t/TeamSK eq ${teamId} and (${workItemTypeIsInArray}))`);
    }

    private generateCompletedQueryOptionsFromTeamWorkItemClauses(project: string, dataOptions: Contracts.KanbanTimeDataQueryOptions, teamWorkItemClauses: string[]): IPromise<ODataQueryOptions> {
        let startDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(dataOptions.startDate);
        let startDateSK = DateUtils.format(startDate, DateSKParser.dateSKFormat);
        let timeType = (dataOptions.timeType === Contracts.KanbanTimeType.Lead) ? "LeadTimeDays" : "CycleTimeDays";

        let filter = `CompletedDateSK ge ${startDateSK}`
            + ` and Teams/any(t:${teamWorkItemClauses.join(" or ")})`
        let select = `WorkItemId,Title,WorkItemType,CompletedDateSK,${timeType}`;

        return Q({
            entityType: "WorkItems",
            oDataVersion: KanbanTimeDataService.axODataVersion,
            project: project,
            $filter: filter,
            $select: select,
            expectSinglePage: true
        });
    }

    /**
     * This is used for querying on non-requirements backlog levels, as well as specifically requested work-item types.
     */
    private generateCompletedQueryOptionsFromWorkItemTypes(projectId: string, dataOptions: Contracts.KanbanTimeDataQueryOptions): IPromise<ODataQueryOptions> {
        let startDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(dataOptions.startDate);
        let startDateSK = DateUtils.format(startDate, DateSKParser.dateSKFormat);
        let timeType = (dataOptions.timeType === Contracts.KanbanTimeType.Lead) ? "LeadTimeDays" : "CycleTimeDays";

        let teamIdIsInArray = KanbanTimeDataService.isInArray("t/TeamSK", true /* propertyIsId */, dataOptions.teamIds);
        let workItemTypeIsInArray = KanbanTimeDataService.isInArray("WorkItemType", false /* propertyIsId */, dataOptions.workItemTypes);
        let filter = `CompletedDateSK ge ${startDateSK}`
            + ` and (Teams/any(t:${teamIdIsInArray}))`
            + ` and (${workItemTypeIsInArray})`;
        let select = `WorkItemId,Title,WorkItemType,CompletedDateSK,${timeType}`;

        return Q({
            entityType: "WorkItems",
            oDataVersion: KanbanTimeDataService.axODataVersion,
            project: projectId,
            $filter: filter,
            $select: select,
            expectSinglePage: true
        });
    }

    private generateStdDevQueryOptionsFromBacklogCategory(projectId: string, dataOptions: Contracts.KanbanTimeDataQueryOptions): IPromise<ODataQueryOptions> {

        if (SettingsHelper.WitRequirementsCategory === dataOptions.backlogCategory) {
            let teamWorkItemTypesListPromises: IPromise<string[][]> = this.getWorkItemTypesOfEachTeam(projectId, dataOptions.teamIds, dataOptions.backlogCategory);

            return teamWorkItemTypesListPromises
                .then<ODataQueryOptions>(teamWorkItemTypesLists => {
                    let teamWorkItemClauses: string[] = [];
                    for (let i = 0, l = teamWorkItemTypesLists.length; i < l; ++i) {
                        teamWorkItemClauses.push(this.assembleTeamWorkItemClause(dataOptions.teamIds[i], teamWorkItemTypesLists[i]));
                    }

                    return this.generateStdDevQueryOptionsFromTeamWorkItemClauses(projectId, dataOptions, teamWorkItemClauses);
                });
        } else {
            return KanbanTimeAgileSettingsHelper.getBacklogInformation(projectId, dataOptions.backlogCategory)
                .then(backlogInformation => {
                    return this.generateStdDevQueryOptionsFromWorkItemTypes(projectId, {
                        startDate: dataOptions.startDate,
                        teamIds: dataOptions.teamIds,
                        timeType: dataOptions.timeType,
                        workItemTypes: backlogInformation.workItemTypes
                    });
                });
        }
    }

    private generateCompletedQueryOptionsFromBacklogCategory(projectId: string, dataOptions: Contracts.KanbanTimeDataQueryOptions): IPromise<ODataQueryOptions> {
        if (SettingsHelper.WitRequirementsCategory === dataOptions.backlogCategory) {
            let teamWorkItemTypesListPromises: IPromise<string[][]> = this.getWorkItemTypesOfEachTeam(projectId, dataOptions.teamIds, dataOptions.backlogCategory);

            return Q.all(teamWorkItemTypesListPromises)
                .then<ODataQueryOptions>(teamWorkItemTypesLists => {
                    let teamWorkItemClauses: string[] = [];
                    for (let i = 0, l = teamWorkItemTypesLists.length; i < l; ++i) {
                        teamWorkItemClauses.push(this.assembleTeamWorkItemClause(dataOptions.teamIds[i], teamWorkItemTypesLists[i]));
                    }

                    return this.generateCompletedQueryOptionsFromTeamWorkItemClauses(projectId, dataOptions, teamWorkItemClauses);
                });
        } else {
            return KanbanTimeAgileSettingsHelper.getBacklogInformation(projectId, dataOptions.backlogCategory)
                .then(backlogInformation => {
                    return this.generateCompletedQueryOptionsFromWorkItemTypes(projectId, {
                        startDate: dataOptions.startDate,
                        teamIds: dataOptions.teamIds,
                        timeType: dataOptions.timeType,
                        workItemTypes: backlogInformation.workItemTypes
                    });
                });
        }
    }

    /**
     * Retrieves cached data.
     * @param dataName indicates what kind of data to retrieve.
     * @param dataOptions to key off of to see if the cached data exists.
     * @returns cached data (or null if there's no cached data for the given arguments).
     */
    private getCachedData(dataName: string, dataOptions: Contracts.KanbanTimeDataQueryOptions): (Contracts.KanbanTimeStdDevCalculationData | Contracts.CompletedWorkItem)[] {
        let key = KanbanTimeDataService.getKey(dataName, dataOptions);
        let data: (Contracts.KanbanTimeStdDevCalculationData | Contracts.CompletedWorkItem)[];

        if (dataOptions.backlogCategory) {
            data = this.cache[key];
        } else {
            // Merge cached data of the various WITs
            for (let i = 0, l = dataOptions.workItemTypes.length; i < l; ++i) {
                let partialCachedData = this.cache[`${key}/${dataOptions.workItemTypes[i]}`];

                // Return null if we're missing cached data for any requested work item type.
                // We should go to the server and fetch cacheable data instead.
                if (partialCachedData == null) {
                    return null;
                }

                if (data == null) {
                    data = partialCachedData;
                } else {
                    data = data.concat(partialCachedData);
                }
            }
        }

        let dataCopy = data != null
            ? $.extend(true, [], data) // Deep copy data
            : data;
        return dataCopy;
    }

    private cacheData(dataName: string, dataOptions: Contracts.KanbanTimeDataQueryOptions, data: (Contracts.KanbanTimeStdDevCalculationData | Contracts.CompletedWorkItem)[]): void {
        let dataCopy = data != null
            ? $.extend(true, [], data) // Deep copy data
            : data;

        let key = KanbanTimeDataService.getKey(dataName, dataOptions);

        // Cache data by work item type if no backlog category was requested
        if (dataOptions.backlogCategory == null) {
            dataOptions.workItemTypes.forEach(wit => {
                this.cache[`${key}/${wit}`] = dataCopy.filter(d => d.workItemType === wit);
            });
        } else {
            this.cache[key] = dataCopy;
        }
    }

    private resetCache(): void {
        this.cache = {};
    }

    private registerClearCacheOnViewChange(): void {
        Action.getService().registerActionWorker(Events.OnViewChange,
            (args: any, next: (actionArgs: any) => any) => {
                this.resetCache();

                // Continue chain of responsibility
                if ($.isFunction(next)) {
                    next(args);
                }
            });
    }
}