import Q = require("q");

import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");

import Capacity_Models = require("Agile/Scripts/Capacity/CapacityModels");
import { IterationDateUtil } from "Agile/Scripts/Common/IterationDateUtil";

import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WorkItemTracking_Contracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemTracking_RestClient = require("TFS/WorkItemTracking/RestClient");

import Ajax = require("VSS/Ajax");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Locations = require("VSS/Locations");

import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");
import { BacklogConfiguration, BacklogConfigurationService, WorkItemStateCategory } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";

import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

var WebContextHelper = Widget_Utils.WebContextHelper;

export var undefinedIterationsVSErrorCode = "TF400511";

export function getSprintCapacitySummarySingleton(): ISprintCapacitySummary {
    return SprintCapacitySummarySingleton.getInstance();
}

/**
 * @interface
 *
 * A wrapper interface that provides type safety around the JSON we get back from the _agiletile/SprintCapacitySummary web method
 * The fields in this interface are guaranteed to be valid if configured is true; else their value is unknown
 *
 * Some of the fields returned are computed based on the data received from _agiletile/SprintCapacitySummary, and added after the fact.
 * Those fields are:
 *
 *      workDaysRemaining
 *
 * @member configured - true if all fields under value are valid
 * @member value - a subset of the fields returned by _agiletile/SprintCapacitySummary.  All fields are valid if configured is true, else they're unknown
 */
export interface ISprintCapacitySummaryData {
    configured: boolean;
    value: ISprintSummaryData;
}

export interface ISprintSummaryData extends Capacity_Models.IRawTeamCapacityData {
    sprintName: string;
    sprintDateRange: string;
    iterationPath: string;
    workDaysRemaining: number;
    workDaysTotal: number;
}

export interface ISprintCapacitySummary {
    get(forceRequest?: boolean, teamId?: string): Q.IPromise<ISprintCapacitySummaryData>;
}

/**
 * @class
 *
 * The SprintCapacitySummarySingleton implements ISprintCapacitySummary as a singleton.
 * It's not exported and must be instantiated by the exported function getSprintCapacitySummarySingleton().
 *
 * The SprintCapacitySummarySingleton is responsible for downloading data available from the
 * _agiletime/SprintCapacitySummary web method.  It converts this data into an ISprintCapacitySummaryData
 * structure for consumption.
 *
 * SprintCapacitySummarySingleton can only be instantiated for the current team scope.
 */
export class SprintCapacitySummarySingleton implements ISprintCapacitySummary {

    private static _theInstance: SprintCapacitySummarySingleton = null;

    private _sprintCapacitySummaryPromise: IPromise<ISprintCapacitySummaryData> = null;

    public static getInstance(): ISprintCapacitySummary
    {
        if (SprintCapacitySummarySingleton._theInstance === null)
        {
            SprintCapacitySummarySingleton._theInstance = new SprintCapacitySummarySingleton();
        }

        return SprintCapacitySummarySingleton._theInstance;
    }

    constructor() {
    }

    /**
     * Get the data from the server with an Ajax request. This will keep the response for subsequent call of that method.
     * @param {boolean} forceRequest - Indicate that we force to get the data back from the server
     * @returns {IPromise} Promise with the data from the server. This data can also be the cached one
     */
    public get(forceRequest: boolean = false, teamId: string = null): Q.IPromise<ISprintCapacitySummaryData> {

        if (!forceRequest && null !== this._sprintCapacitySummaryPromise) {
            return this._sprintCapacitySummaryPromise;
        }

        var deferred = Q.defer<ISprintCapacitySummaryData>();
        this._sprintCapacitySummaryPromise = deferred.promise;

        var teamContext = TFS_Dashboards_Common.getDashboardTeamContext();

        var url = Locations.urlHelper.getMvcUrl({
            action: "sprintCapacitySummary",
            controller: "agiletile",
            team: teamId || teamContext.id,
            queryParams: {
                teamId: teamId || teamContext.id
            }
        });

        var ajaxOptions: JQueryAjaxSettings = {
            type: "get",
            dataType: "html",
            timeout: TFS_Dashboards_Common.ClientConstants.WidgetAjaxTimeoutMs
        };

        Ajax.issueRequest(url, ajaxOptions).then(
            (data) => {
                try {
                    var response = this.parseResponse(forceRequest, data);
                    deferred.resolve(response);
                }
                catch (e) {
                    deferred.reject(e);
                }
            }, (e) => {
                    deferred.reject(e);
                }
            );

        return this._sprintCapacitySummaryPromise;
    }

    private getWorkDaysRemaining(teamCapacity: Capacity_Models.TeamCapacityModel): number {
        Diag.Debug.assert(teamCapacity.hasIterationDates()); // Should've validated this already

        var currentDate = teamCapacity.getIterationInfo().getCurrentDateInIteration();
        if (currentDate < teamCapacity.getIterationStartDate()) {
            currentDate = teamCapacity.getIterationStartDate();
        } else if (currentDate > teamCapacity.getIterationEndDate()) {
            currentDate = teamCapacity.getIterationEndDate();
        }

        // This is the current iteration, display the remaining days for this iteration
        return teamCapacity.getTeamDaysOffCurrentDatesBreakdown().workingDays;
    }

    private getWorkDaysTotal(teamCapacity: Capacity_Models.TeamCapacityModel): number {
        Diag.Debug.assert(teamCapacity.hasIterationDates()); // Should've validated this already

        var currentDate = teamCapacity.getIterationInfo().getCurrentDateInIteration();
        if (currentDate < teamCapacity.getIterationStartDate()) {
            currentDate = teamCapacity.getIterationStartDate();
        } else if (currentDate > teamCapacity.getIterationEndDate()) {
            currentDate = teamCapacity.getIterationEndDate();
        }

        // This is the current iteration, display the remaining days for this iteration
        return teamCapacity.getTeamDaysOffTotalDatesBreakdown().workingDays;
    }

    private parseResponse(forceRequest: boolean, response: string): ISprintCapacitySummaryData {
        var div = $("<div/>");
        div.html(response);

        // check if iterations are enabled and parse iteration data.
        var iterationsConfiguration = div.find("script[defer]");
        if (iterationsConfiguration && iterationsConfiguration.text()) {

            var result = Utils_Core.parseMSJSON(iterationsConfiguration.text(), false);

            if (Widget_Utils.isUndefinedOrNull(result.IterationStartDate)
                || Widget_Utils.isUndefinedOrNull(result.IterationEndDate))
            {
                // We required sprint date ranges to be configured
                return { configured: false, value: null };
            }

            if (Widget_Utils.isUndefinedOrNull(result.IterationId))
            {
                // Something went wrong. We should never see configured iteration dates but no iteration ID.
                throw new Error(Resources.Widget_InternalError);
            }

            var capacityDataService = Capacity_Models.getService();
            var teamCapacity = capacityDataService.getCapacityModelFromPayload(result, forceRequest);
            result.workDaysRemaining = this.getWorkDaysRemaining(teamCapacity); // augment result by calculating work days left in the current sprint
            result.workDaysTotal = this.getWorkDaysTotal(teamCapacity);  // augment result by calculating total work days in the current sprint

            // Sprint dates
            result.sprintDateRange = IterationDateUtil.getSprintDatesDisplay(teamCapacity.getIterationStartDate(), teamCapacity.getIterationEndDate());
            return { configured: true, value: result };
        }

        // if iterations are not enabled.
        var noActiveIterationConfiguration = div.find(".error-text");
        if (noActiveIterationConfiguration.length > 0 && noActiveIterationConfiguration.text().search(undefinedIterationsVSErrorCode) >= 0) {
            return { configured: false, value: null };
        } else if (noActiveIterationConfiguration.text().length > 0) {
            const errorLink = div.find("a");
            if (errorLink.length > 0) {
                // We construct our own html message to avoid any IDs and classes on the original error html
                const htmlError = $("<div />")
                    .append($("<div/>")
                        .text(noActiveIterationConfiguration.text()))
                    .append($("<a/>")
                        .text(errorLink.text())
                        .attr("href", errorLink.attr("href"))
                        .attr("target", "_blank"));

                throw { html: htmlError.html() } as Widget_Utils.HtmlError;
            }

            throw new Error(noActiveIterationConfiguration.text());
        }

        // Something went wrong and we don't know what.
        throw new Error(Resources.Widget_InternalError);
    }
}

export interface IBacklogOptions {
    witClient: WorkItemTracking_RestClient.WorkItemTrackingHttpClient;
}

export interface IBacklog {
    getBugsCount(): number;
    getBugsProposedOrCommitted(): number;
    getBugsInProgress(): number;
    getBugsCompleted(): number;
    getBugsNotCompleted(): number;
    getRequirementsCount(): number;
    getRequirementsProposedOrCommitted(): number;
    getRequirementsInProgress(): number;
    getRequirementsCompleted(): number;
    getRequirementsNotCompletedCount(): number;
    getWorkItemsCount(): number;
    getWorkItemsNotCompletedCount(): number;
    getWorkItemsNoCostNotCompleted(): number;
    getRequirementsEffortCount(): number,
    getRequirementsEffortProposedOrCommitted(): number;
    getRequirementsEffortInProgress(): number;
    getRequirementsEffortCompleted(): number;
    getBugsEffortCount(): number;
    getBugsEffortProposedOrCommitted(): number;
    getBugsEffortInProgress(): number;
    getBugsEffortCompleted(): number;
    initialize(iterationId: string): Q.IPromise<any>;
}

interface IWorkItemCountsByCategory {
    completed: number;
    inProgress: number;
    proposedOrCommitted: number;
}

export class Backlog implements IBacklog {

    // workItemsRestApiPageSize is the number of work items that can be returned from the REST API _apis/wit/workitems in a single call.
    // For details, see: <https://www.visualstudio.com/en-us/integrate/api/wit/work-items#Getalistofworkitems>
    private static workItemsRestApiPageSize: number = 200;

    // This is defined in CategoryConfiguration.cs, but there is no TypeScript equivalent.
    // When ProjectProcessConfiguration.TaskBacklog.WorkItemCountLimit is set to -1, this means "no limit on size of the backlog".
    // We should remove this private definition once a TypeScript shared constant becomes available (talk to HayderC)
    private static UnlimitedWorkItemCount: number = -1;

    // This value can be returned based on interactions with data created by older versions of the TFS OM.
    // 0 should be treated as "use the default limit", which is 1000.  Per HayderC, both of these are inaccessible
    // from the web client and should be hard-coded until a TypeScript library becomes available.
    private static UnconfiguredWorkItemCount: number = 0;
    private static DefaultWorkItemCount: number = 1000;

    private _effortField: string;
    private _remainingField: string;
    private _processConfig: TFS_AgileCommon.ProjectProcessConfiguration;
    private _tfsContext: Contracts_Platform.WebContext;
    private _teamContext: Contracts_Platform.TeamContext;
    private _witClient: any;
    private _workItems: WorkItemTracking_Contracts.WorkItem[] = [];

    private _bugs: IWorkItemCountsByCategory = { completed: 0, inProgress: 0, proposedOrCommitted: 0 };
    private _requirements: IWorkItemCountsByCategory = { completed: 0, inProgress: 0, proposedOrCommitted: 0 };
    private _bugsEffort: IWorkItemCountsByCategory = { completed: 0, inProgress: 0, proposedOrCommitted: 0 };
    private _requirementsEffort: IWorkItemCountsByCategory = { completed: 0, inProgress: 0, proposedOrCommitted: 0 };
    private _workItemsNoCost: number = 0;

    constructor(processConfig: TFS_AgileCommon.ProjectProcessConfiguration, tfsContext: Contracts_Platform.WebContext, backlogOptions: IBacklogOptions = null, teamContext: Contracts_Platform.TeamContext = null) {
        this._processConfig = processConfig;
        this._tfsContext = tfsContext;
        this._teamContext = teamContext || TFS_Dashboards_Common.getDashboardTeamContext();
        this._effortField = this._processConfig.getTypeField(
            TFS_AgileCommon.ProjectProcessConfiguration.FieldType.Effort).name;
        this._remainingField = this._processConfig.getTypeField(
            TFS_AgileCommon.ProjectProcessConfiguration.FieldType.RemainingWork).name;
        this._witClient = (backlogOptions !== null) ? backlogOptions.witClient : WorkItemTracking_RestClient.getClient({ timeout: TFS_Dashboards_Common.ClientConstants.WidgetAjaxTimeoutMs });
    }

    public getBugsCount(): number {
        return this._bugs.proposedOrCommitted + this._bugs.inProgress + this._bugs.completed;
    }

    public getBugsProposedOrCommitted(): number {
        return this._bugs.proposedOrCommitted;
    }

    public getBugsInProgress(): number {
        return this._bugs.inProgress;
    }

    public getBugsCompleted(): number {
        return this._bugs.completed;
    }

    public getBugsNotCompleted(): number {
        return this._bugs.proposedOrCommitted + this._bugs.inProgress;
    }

    public getRequirementsCount(): number {
        return this._requirements.proposedOrCommitted + this._requirements.inProgress + this._requirements.completed;
    }

    public getRequirementsProposedOrCommitted(): number {
        return this._requirements.proposedOrCommitted;
    }

    public getRequirementsInProgress(): number {
        return this._requirements.inProgress;
    }

    public getRequirementsCompleted(): number {
        return this._requirements.completed;
    }

    public getRequirementsNotCompletedCount(): number {
        return this.getRequirementsCount() - this._requirements.completed;
    }

    public getRequirementsEffortCount(): number {
        return this._requirementsEffort.proposedOrCommitted + this._requirementsEffort.inProgress + this._requirementsEffort.completed;
    }

    public getRequirementsEffortProposedOrCommitted(): number {
        return this._requirementsEffort.proposedOrCommitted;
    }

    public getRequirementsEffortInProgress(): number {
        return this._requirementsEffort.inProgress;
    }

    public getRequirementsEffortCompleted(): number {
        return this._requirementsEffort.completed;
    }

    public getBugsEffortCount(): number {
        return this._bugsEffort.proposedOrCommitted + this._bugsEffort.inProgress + this._bugsEffort.completed;
    }

    public getBugsEffortProposedOrCommitted(): number {
        return this._bugsEffort.proposedOrCommitted;
    }

    public getBugsEffortInProgress(): number {
        return this._bugsEffort.inProgress;
    }

    public getBugsEffortCompleted(): number {
        return this._bugsEffort.completed;
    }

    public getWorkItemsCount(): number {
        return this._workItems.length;
    }

    public getWorkItemsNotCompletedCount(): number {
        return this._workItems.length - this._bugs.completed - this._requirements.completed;
    }

    public getWorkItemsNoCostNotCompleted(): number {
        return this._workItemsNoCost;
    }

    private initializeWorkItemCountsByCategory(): void {
        $.each(this._workItems, (index: number, item: WorkItemTracking_Contracts.WorkItem) => {

            // We assume that every item returned to us has an effort field.
            var workItemEffort = item.fields[this._effortField] || 0;
            var workItemType = item.fields["System.WorkItemType"];
            var workItemState = item.fields["System.State"];

            var category = this._processConfig.getCategoryForWorkItemType(item.fields["System.WorkItemType"]);
            var workItem = (category === "Microsoft.BugCategory") ? this._bugs : this._requirements;
            var effortItem = (category === "Microsoft.BugCategory") ? this._bugsEffort : this._requirementsEffort;

            let metaState = BacklogConfigurationService.getBacklogConfiguration().getWorkItemStateCategory(workItemType, workItemState);
            switch (metaState) {
                case WorkItemStateCategory.InProgress:
                case WorkItemStateCategory.Resolved:
                    workItem.inProgress++;
                    effortItem.inProgress += workItemEffort;
                    if (workItemEffort === 0) {
                        this._workItemsNoCost++;
                    }
                    break;

                case WorkItemStateCategory.Completed:
                    workItem.completed++;
                    effortItem.completed += workItemEffort;
                    break;

                case WorkItemStateCategory.Proposed:
                    workItem.proposedOrCommitted++;
                    effortItem.proposedOrCommitted += workItemEffort;
                    if (workItemEffort === 0) {
                        this._workItemsNoCost++;
                    }
                break;
            }

        });
    }

    private getWorkItemsForIdList(ids: number[], fields: string[]): IPromise<WorkItemTracking_Contracts.WorkItem[]> {
        Diag.Debug.assert(ids.length !== 0);

        const getWorkItems = (maxsize: number): IPromise<WorkItemTracking_Contracts.WorkItem[]> => {
            if (maxsize === Backlog.UnlimitedWorkItemCount) {
                maxsize = Number.MAX_VALUE;
            } else if (maxsize == Backlog.UnconfiguredWorkItemCount || maxsize == null) {
                maxsize = Backlog.DefaultWorkItemCount;
            }

            let childItemsPromises: IPromise<WorkItemTracking_Contracts.WorkItem[]>[] = [];
            let pagesize = Backlog.workItemsRestApiPageSize;
            for (var i = 0; i < ids.length && i < maxsize; i += pagesize) {
                var currentPageSize = Math.min(pagesize, maxsize - i);
                var idsToPage = ids.slice(i, i + currentPageSize);
                childItemsPromises.push(this._witClient.getWorkItems(idsToPage, fields));
            }

            return Q.all(childItemsPromises).then(
                (results: (WorkItemTracking_Contracts.WorkItem[])[]) => {
                    for (var j = 1; j < childItemsPromises.length; j++) {
                        for (var k = 0; k < results[j].length; k++) {
                            results[0].push(results[j][k]);
                        }
                    }
                    return results[0];
                },
                (e) => {
                    return Q.reject(e);
                });
        }


        return BacklogConfigurationService.beginGetBacklogConfiguration(/** teamId, will get project Scoped configuration */ null).then(
            (backlogConfiguration: BacklogConfiguration) => {
                let limit = backlogConfiguration.taskBacklog.workItemCountLimit;
                return getWorkItems(limit);
            },
            (error: Error) => { return Q.reject(error); }
        );
    }

    public initialize(iterationId: string): IPromise<any> {

        //
        // Example URL for getting a query
        // https://mseng.visualstudio.com/DefaultCollection/b924d696-3eae-4116-8443-9a18392d8544/25f1f19f-d952-40d4-9063-cd4d5dccbb59/_api/_Backlog/IterationBacklogQuery?__v=5&fields=System.Title&fields=System.State&fields=System.AssignedTo&fields=Microsoft.VSTS.Scheduling.RemainingWork&iterationId=83dd884f-fdf7-4367-b303-dffe2ac75fd0
        //
        var queryBuilderUrl = Utils_String.format(
            "{0}{1}/{2}/_api/_Backlog/IterationBacklogQuery?__v=5&fields=System.Title&fields=System.State&fields=System.AssignedTo&fields={3}&iterationId={4}&teamid={2}",
            WebContextHelper.getCollectionRelativeUrl(this._tfsContext),
            this._tfsContext.project.id,
            this._teamContext.id,
            this._effortField,
            iterationId
            );

        var ajaxOptions: JQueryAjaxSettings = {
            type: "get",
            dataType: "html",
            timeout: TFS_Dashboards_Common.ClientConstants.WidgetAjaxTimeoutMs
        };

        return Ajax.issueRequest(queryBuilderUrl, ajaxOptions)
            .then((data) => {
                var iterationQuery: WorkItemTracking_Contracts.Wiql = <WorkItemTracking_Contracts.Wiql >{};
                iterationQuery.query = Utils_Core.parseMSJSON(data, false).wiql;
                return iterationQuery;
            })
            .then((iterationQuery: WorkItemTracking_Contracts.Wiql) => {
                return this._witClient.queryByWiql(iterationQuery, this._tfsContext.project.id);
            })
            .then((result: WorkItemTracking_Contracts.WorkItemQueryResult) => {
                var workItems: number[] = [];
                $.each(result.workItemRelations, (index: number, value: WorkItemTracking_Contracts.WorkItemLink) => {
                    workItems.push(value.target.id);
                });

                if (workItems.length === 0) {
                    // our workItem #s are already initialized to zero - nothing more to do
                    return Q.resolve(undefined);
                }

                var fields: string[] = ["System.Id", "System.WorkItemType", "System.State", this._effortField];
                return this.getWorkItemsForIdList(workItems, fields)
                    .then((result: WorkItemTracking_Contracts.WorkItem[]) => {
                        this._workItems = result;
                        this.initializeWorkItemCountsByCategory();
                    });
            });
    }
}
