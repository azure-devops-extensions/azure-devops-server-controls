import { TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { IFilterStatePersistenceManager } from "Agile/Scripts/Common/FilterStatePersistenceManager";
import { RightPanelExtensionIds } from "Agile/Scripts/Generated/HubConstants";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import * as BacklogResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.BacklogPivot";
import { BacklogActions } from "Agile/Scripts/SprintsHub/Backlog/ActionsCreator/BacklogActions";
import { IBacklogDataProvider } from "Agile/Scripts/SprintsHub/Backlog/ActionsCreator/BacklogDataProvider";
import { ISprintBacklogInitialPayload } from "Agile/Scripts/SprintsHub/Backlog/BacklogContracts";
import { IBacklogRightPanelContext } from "Agile/Scripts/SprintsHub/Backlog/Components/BacklogWrapper";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { SprintCapacityDataProvider } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { ISprintViewPivotContext } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { ExtensionService } from "VSS/Contributions/Services";
import { publishErrorToTelemetry } from "VSS/Error";
import { getService } from "VSS/Service";
import { getErrorMessage } from "VSS/VSS";
import { IFilterState } from "VSSUI/Utilities/Filter";

export class BacklogActionsCreator {
    private _actions: BacklogActions;
    private _dataProvider: IBacklogDataProvider;
    private _filterStatePersistenceManager: IFilterStatePersistenceManager;
    private _sprintViewPivotContext: ISprintViewPivotContext;

    constructor(
        actions: BacklogActions,
        dataProvider: IBacklogDataProvider,
        filterStatePersistenceManager: IFilterStatePersistenceManager,
        sprintViewPivotContext: ISprintViewPivotContext) {

        this._actions = actions;
        this._dataProvider = dataProvider;
        this._filterStatePersistenceManager = filterStatePersistenceManager;
        this._sprintViewPivotContext = sprintViewPivotContext;
    }

    public initialize(): void {
        const errorHandler = this._backlogLoadedFailed("ErrorWhileInitializingBacklog");
        const { team, selectedIteration, teamDaysOff } = this._sprintViewPivotContext;

        this._actions.beginLoadBacklog.invoke(LoadingStatus.None);

        const data = this._dataProvider.getBacklogData(team.id, selectedIteration, teamDaysOff);
        this._backlogLoaded(errorHandler)(data);
    }

    public initializeRightPanelContributions(): IPromise<void> {
        return getService(ExtensionService).getContributionsForTargets([RightPanelExtensionIds.IterationBacklog]).then((contributions) => {
            this._actions.rightPanelContributionsLoaded.invoke(contributions);
        }, (reason) => {
            publishErrorToTelemetry(reason);
        });
    }

    public reloadBacklogData(newSprintViewPivotContext: ISprintViewPivotContext): IPromise<void> {
        //  Set the new pivot context which contains the new team Id and iteration selected.
        this._sprintViewPivotContext = newSprintViewPivotContext;

        const errorHandler = this._backlogLoadedFailed("ErrorWhileRefreshingBacklog");
        const { team, selectedIteration, teamDaysOff } = this._sprintViewPivotContext;

        this._actions.beginLoadBacklog.invoke(LoadingStatus.Loading);

        return this._dataProvider.reloadAndGetBacklogData(team.id, selectedIteration, teamDaysOff).then(
            this._backlogLoaded(errorHandler),
            errorHandler
        );
    }

    public setRightPanelState(rightPanelContributionId: string) {
        this._actions.setRightPanelVisibility.invoke(rightPanelContributionId);
    }

    public openNewItemCallout() {
        this._actions.updateAddItemCalloutVisibility.invoke(true);
    }

    public closeNewItemCallout() {
        this._actions.updateAddItemCalloutVisibility.invoke(false);
    }

    public saveFilterState(filterState: IFilterState): void {
        this._filterStatePersistenceManager.saveFilterStateToServer(filterState);
    }

    public setFiltered(filtered: boolean): void {
        this._actions.isFiltered.invoke(filtered);
    }

    public backlogItemAdded(): void {
        this._actions.backlogItemAdded.invoke(null);
    }

    public toggleFilterBar(isVisible: boolean): void {
        this._actions.toggleFilterBarVisible.invoke(isVisible);
    }

    public initializeRightPanelContext(context: IBacklogRightPanelContext): void {
        this._actions.rightPanelContextChanged.invoke(context);
    }

    private _backlogLoaded(errorHandler: (error: Error, exceptionsInfo?: ExceptionInfo[]) => void): (payload: ISprintBacklogInitialPayload) => void {
        return (payload: ISprintBacklogInitialPayload) => {
            if (!this._verifyAndReportNotMissingDataInPayload(payload, errorHandler) && !this._findAndReportExceptionInfoInPayload(payload, errorHandler)) {
                const { team, selectedIteration, teamDaysOff } = this._sprintViewPivotContext;
                const { allowedActivities, accountCurrentDate, weekends } = payload.capacityData.capacityOptions;

                const teamCapacityModel: TeamCapacityModel = SprintCapacityDataProvider.constructTeamCapacityModel(
                    payload.capacityData.teamCapacity,
                    team.id,
                    selectedIteration,
                    allowedActivities,
                    accountCurrentDate,
                    weekends,
                    teamDaysOff
                );

                this._actions.loadBacklogDataSucceeded.invoke({ ...payload, teamCapacityModel });
            }
        };
    }

    private _backlogLoadedFailed(errorCode: string): (error: Error, exceptionsInfo?: ExceptionInfo[]) => void {
        return (error: Error, exceptionsInfo?: ExceptionInfo[]) => {
            publishErrorToTelemetry({
                name: errorCode,
                message: getErrorMessage(error)
            });

            const exceptions: ExceptionInfo[] = exceptionsInfo ? exceptionsInfo : [{
                exceptionMessage: getErrorMessage(error)
            }];

            this._actions.loadBacklogFailed.invoke(exceptions);
        };
    }

    private _verifyAndReportNotMissingDataInPayload(
        payload: ISprintBacklogInitialPayload,
        errorHandler: (error: Error, exceptionsInfo?: ExceptionInfo[]) => void
    ): boolean {

        const { backlogContentData, capacityData } = payload;
        const errors: string[] = [];

        if (!backlogContentData) {
            errors.push("backlogContentData");
        }

        if (!capacityData) {
            errors.push("capacityData");
        } else {
            if (!capacityData.aggregatedCapacity) {
                errors.push("aggregatedCapacity");
            }

            if (!capacityData.capacityOptions) {
                errors.push("capacityOptions");
            }

            if (!capacityData.teamCapacity) {
                errors.push("teamCapacity");
            }
        }
        if (errors.length > 0) {
            errorHandler(
                new Error(`The following data points are missing in the initial sprints backlog payload: ${errors.join(",")}`),
                [{
                    exceptionMessage: BacklogResources.ServerNoResponse
                }]
            );
        }

        return errors.length > 0;
    }

    private _findAndReportExceptionInfoInPayload(
        payload: ISprintBacklogInitialPayload,
        errorHandler: (error: Error, exceptionsInfo?: ExceptionInfo[]) => void
    ): boolean {

        const { backlogContentData, capacityData } = payload;
        const { aggregatedCapacity, capacityOptions, teamCapacity } = capacityData;
        const exceptionsInfo: ExceptionInfo[] = [];
        const errors: string[] = [];

        if (backlogContentData.exceptionInfo) {
            exceptionsInfo.push(backlogContentData.exceptionInfo);
            errors.push("backlogContentData");
        }

        if (aggregatedCapacity.exceptionInfo) {
            exceptionsInfo.push(aggregatedCapacity.exceptionInfo);
            errors.push("aggregatedCapacity");
        }

        if (capacityOptions.exceptionInfo) {
            exceptionsInfo.push(capacityOptions.exceptionInfo);
            errors.push("capacityOptions");
        }

        if (teamCapacity.exceptionInfo) {
            exceptionsInfo.push(teamCapacity.exceptionInfo);
            errors.push("teamCapacityModel");
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