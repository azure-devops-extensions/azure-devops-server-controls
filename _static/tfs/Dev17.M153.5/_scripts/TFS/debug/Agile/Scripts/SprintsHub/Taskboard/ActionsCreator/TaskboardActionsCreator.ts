import { IFilterStatePersistenceManager } from "Agile/Scripts/Common/FilterStatePersistenceManager";
import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { SprintsHubStorageConstants } from "Agile/Scripts/Generated/HubConstants";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import { ICapacity } from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import {
    AGGREGATEDCAPACITY_DATAPROVIDER_ID,
    CAPACITYOPTIONS_DATAPROVIDER_ID,
    IAggregatedCapacity,
    ISprintCapacityOptions,
    SprintCapacityDataProvider,
    TEAMCAPACITY_DATAPROVIDER_ID
} from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { ISprintViewPivotContext } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { TaskboardActions } from "Agile/Scripts/SprintsHub/Taskboard/ActionsCreator/TaskboardActions";
import { ITaskboardDetailsPanelOptions } from "Agile/Scripts/SprintsHub/Taskboard/Components/TaskboardWrapper";
import { ISprintTaskboardData, ISprintTaskboardInitialPayload } from "Agile/Scripts/SprintsHub/Taskboard/TaskboardContracts";
import { TaskboardTelemetryConstants } from "Agile/Scripts/SprintsHub/Taskboard/TaskboardTelemetryConstants";
import { TaskboardGroupBy } from "Agile/Scripts/Taskboard/TaskboardConstants";
import { ContextUtils } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WebPageDataService } from "VSS/Contributions/Services";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Service from "VSS/Service";
import { getErrorMessage } from "VSS/VSS";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { IFilterState } from "VSSUI/Utilities/Filter";

export const TASKBOARD_DATAPROVIDER_ID = "ms.vss-work-web.sprints-hub-taskboard-data-provider";

export class TaskboardActionsCreator {
    private _actions: TaskboardActions;
    private _sprintViewPivotContext: ISprintViewPivotContext;
    private _filterStatePersistenceManager: IFilterStatePersistenceManager;

    constructor(
        actions: TaskboardActions,
        sprintViewPivotContext: ISprintViewPivotContext,
        filterStatePersistenceManager: IFilterStatePersistenceManager) {

        this._actions = actions;
        this._sprintViewPivotContext = sprintViewPivotContext;
        this._filterStatePersistenceManager = filterStatePersistenceManager;
    }

    public setNewWorkItemButtonState(disabled: boolean): void {
        this._actions.setNewWorkItemButtonState.invoke(disabled);
    }

    public groupByChanged(teamId: string, newValue: TaskboardGroupBy): void {
        SprintsHubTelemetryHelper.publishTelemetry(TaskboardTelemetryConstants.GROUP_BY_CHANGED, { groupByValue: newValue }, /*immediate*/ true);

        ContextUtils.saveTeamUserStringSetting(teamId, SprintsHubStorageConstants.AgileBoardFilter + SprintsHubStorageConstants.Group, newValue);
        this._actions.groupByChanged.invoke(newValue);
    }

    public fetchTaskboardData(): void {
        // check for the errors
        const errorHandler = this._taskboardCapacityDataLoadFailed("ErrorWhileFetchingTaskboardData");

        // Fetch taskboard content
        const pageDataService = Service.getService(WebPageDataService);
        const taskboardContent = pageDataService.getPageData<ISprintTaskboardData>(TASKBOARD_DATAPROVIDER_ID);

        //  Fetch capacity data: Aggregated capacity and capacity options. We need these to build the team capacity model.
        //  The team capacity model and aggregated capacity are used to build the field aggregator, which needs to be
        //  available on load to keep the taskboard model and field aggregator data in sync, even if the work details pane
        //  is not toggled.
        const capacityOptions = SprintCapacityDataProvider.getCapacityOptionsFromPageData();
        const aggregatedCapacity = SprintCapacityDataProvider.getAggregatedCapacityFromPageData();
        const teamCapacityData = SprintCapacityDataProvider.getTeamCapacityFromPageData();

        if (
            !this._verifyAndReportNotMissingData(taskboardContent, capacityOptions, aggregatedCapacity, teamCapacityData, errorHandler) &&
            !this._findAndReportExceptionInfo(taskboardContent, capacityOptions, aggregatedCapacity, teamCapacityData, errorHandler)
        ) {
            const { team, selectedIteration, teamDaysOff } = this._sprintViewPivotContext;
            const { allowedActivities, accountCurrentDate, weekends } = capacityOptions;

            const teamCapacityModel = SprintCapacityDataProvider.constructTeamCapacityModel(
                teamCapacityData,
                team.id,
                selectedIteration,
                allowedActivities,
                accountCurrentDate,
                weekends,
                teamDaysOff
            );

            const payload: ISprintTaskboardInitialPayload = {
                taskboardContentData: taskboardContent,
                capacityData: {
                    capacityOptions: capacityOptions,
                    aggregatedCapacity: aggregatedCapacity,
                    teamCapacity: teamCapacityData
                },
                teamCapacityModel
            };

            this._actions.taskboardContentAvailable.invoke(payload);
        }
    }

    public reloadTaskboardData(newSprintViewPivotContext?: ISprintViewPivotContext): IPromise<void> {
        if (newSprintViewPivotContext) {
            this._sprintViewPivotContext = newSprintViewPivotContext;
        }

        const errorHandler = this._taskboardCapacityDataLoadFailed("ErrorWhileRefreshingTaskboard");

        // Invoke loading state
        this._actions.updateLoadingStatus.invoke(LoadingStatus.Loading);
        const pageDataService = Service.getService(WebPageDataService);

        const contributionIds = [
            TASKBOARD_DATAPROVIDER_ID,
            AGGREGATEDCAPACITY_DATAPROVIDER_ID,
            CAPACITYOPTIONS_DATAPROVIDER_ID,
            TEAMCAPACITY_DATAPROVIDER_ID
        ];

        const contributions = contributionIds.map((cid) => {
            return {
                id: cid,
                properties: {
                    serviceInstanceType: ServiceInstanceTypes.TFS
                }
            } as Contribution;
        });

        return pageDataService.ensureDataProvidersResolved(contributions, true).then(
            () => this.fetchTaskboardData(),
            errorHandler
        );
    }

    public toggleFilterBar(isVisible: boolean): void {
        this._actions.toggleFilterBarVisible.invoke(isVisible);
    }

    public toggleFiltered(filtered: boolean): void {
        this._actions.isFiltered.invoke(filtered);
    }

    public setRightPanelId(rightPanelId: string): void {
        this._actions.setRightPanelId.invoke(rightPanelId);
    }

    public initializeRightPanelContext(context: ITaskboardDetailsPanelOptions): void {
        this._actions.initializeRightPanelContext.invoke(context);
    }

    public saveFilterState(filterState: IFilterState): void {
        this._filterStatePersistenceManager.saveFilterStateToServer(filterState);
    }

    private _taskboardCapacityDataLoadFailed(errorCode: string): (error: Error, exceptionsInfo?: ExceptionInfo[]) => void {
        return (error: Error, exceptionsInfo?: ExceptionInfo[]) => {
            publishErrorToTelemetry({
                name: errorCode,
                message: getErrorMessage(error)
            });

            const exceptions: ExceptionInfo[] = exceptionsInfo ? exceptionsInfo : [{
                exceptionMessage: getErrorMessage(error)
            }];

            this._actions.loadTaskboardFailed.invoke(exceptions);
        };
    }

    private _verifyAndReportNotMissingData(
        taskboardContent: ISprintTaskboardData,
        capacityOptions: ISprintCapacityOptions,
        aggregatedCapacity: IAggregatedCapacity,
        teamCapacityData: ICapacity,
        errorHandler: (error: Error, exceptionsInfo?: ExceptionInfo[]) => void
    ): boolean {
        const errors: string[] = [];

        if (!taskboardContent) {
            errors.push("taskboardContent");
        }

        if (!capacityOptions) {
            errors.push("capacityOptions");
        }

        if (!aggregatedCapacity) {
            errors.push("aggregatedCapacity");
        }

        if (!teamCapacityData) {
            errors.push("teamCapacityData");
        }

        if (errors.length > 0) {
            errorHandler(
                new Error(`The following data points are missing in the initial taskboard backlog payload: ${errors.join(",")}`),
                [{
                    exceptionMessage: SprintsHubResources.ServerNoResponse
                }]
            );
        }

        return errors.length > 0;
    }

    private _findAndReportExceptionInfo(
        taskboardContent: ISprintTaskboardData,
        capacityOptions: ISprintCapacityOptions,
        aggregatedCapacity: IAggregatedCapacity,
        teamCapacityData: ICapacity,
        errorHandler: (error: Error, exceptionsInfo?: ExceptionInfo[]) => void
    ): boolean {
        const exceptionsInfo: ExceptionInfo[] = [];
        const errors: string[] = [];

        if (taskboardContent.exceptionInfo) {
            exceptionsInfo.push(taskboardContent.exceptionInfo);
            errors.push("taskboardContent");
        }

        if (capacityOptions.exceptionInfo) {
            exceptionsInfo.push(capacityOptions.exceptionInfo);
            errors.push("capacityOptions");
        }

        if (aggregatedCapacity.exceptionInfo) {
            exceptionsInfo.push(capacityOptions.exceptionInfo);
            errors.push("aggregatedCapacity");
        }

        if (teamCapacityData.exceptionInfo) {
            exceptionsInfo.push(teamCapacityData.exceptionInfo);
            errors.push("teamCapacityData");
        }

        const foundExceptions = exceptionsInfo.length > 0;

        if (foundExceptions) {
            const errorMsg = `The following data providers contain exception information: ${errors.join(",")}`;

            errorHandler(
                new Error(errorMsg),
                exceptionsInfo);
        }

        return foundExceptions;
    }
}