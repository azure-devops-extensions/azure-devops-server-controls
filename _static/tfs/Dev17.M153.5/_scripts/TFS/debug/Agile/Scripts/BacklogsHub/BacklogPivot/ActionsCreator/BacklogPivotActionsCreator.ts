import { IBacklogData } from "Agile/Scripts/BacklogsHub/BacklogHubContracts";
import { IBacklogDataProvider } from "Agile/Scripts/BacklogsHub/BacklogPivot/ActionsCreator/BacklogDataProvider";
import { BacklogPivotActions } from "Agile/Scripts/BacklogsHub/BacklogPivot/ActionsCreator/BacklogPivotActions";
import { IFilterStatePersistenceManager } from "Agile/Scripts/Common/FilterStatePersistenceManager";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import * as BacklogResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.BacklogPivot";
import * as ConfigurationsConstants from "Presentation/Scripts/TFS/TFS.Configurations.Constants";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Events_Action from "VSS/Events/Action";
import { getErrorMessage } from "VSS/VSS";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { mapToFilterState } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";

export interface IBacklogPivotActionsCreator {
    initialize(): void;
    initializeRightPanelContributions(): void;
    reloadBacklog(forecasting: boolean, inProgress: boolean): void;
    toggleAddItemCallout(visible: boolean);
    toggleFilterBar(visible: boolean);
    toggleFiltered(visible: boolean);
    /** Toggle the visibility of the planning view */
    updateActiveRightPane(paneId: string): void;
    backlogItemAdded(): void;
    openSettings(): void;
    saveFilterState(filterState: IFilterState): void;
    updateFilterStatePersistenceManager(filterStatePersistenceManager: IFilterStatePersistenceManager);
}

export class BacklogPivotActionsCreator implements IBacklogPivotActionsCreator {
    private _actions: BacklogPivotActions;
    private _dataProvider: IBacklogDataProvider;
    private _filterStatePersistenceManager: IFilterStatePersistenceManager;

    constructor(actions: BacklogPivotActions, dataProvider: IBacklogDataProvider, filterStatePersistenceManager: IFilterStatePersistenceManager) {
        this._actions = actions;
        this._dataProvider = dataProvider;
        this._filterStatePersistenceManager = filterStatePersistenceManager;
    }

    public initialize(): void {
        this._actions.beginLoadBacklog.invoke(null);
        const pivotData = this._dataProvider.initializeBacklogData();
        this._backlogDataAvailable(pivotData);
    }

    public reloadBacklog(forecasting: boolean, inProgress: boolean): void {
        this._actions.beginReloadBacklog.invoke(null);

        this._dataProvider.reloadBacklogPivotData(forecasting, inProgress).then((pivotData) => {
            this._backlogDataAvailable(pivotData);
            this.initializeRightPanelContributions();
        }, (reason) => {
            this.backlogLoadFailed("reloadBacklogPivotData", reason);
        });
    }

    public initializeRightPanelContributions(): void {
        this._dataProvider.loadRightPanelContributions().then((contributions) => {
            this._actions.loadRightPanelContributions.invoke(contributions);
        }, (reason) => {
            publishErrorToTelemetry(reason);
        });
    }

    public toggleAddItemCallout(visible: boolean): void {
        this._actions.addItemCalloutToggled.invoke(visible);
    }

    public toggleFilterBar(visible: boolean): void {
        this._actions.filterBarToggled.invoke(visible);
    }

    public toggleFiltered(filtered: boolean): void {
        this._actions.isFiltered.invoke(filtered);
    }

    public updateActiveRightPane(paneId: string): void {
        this._actions.rightPaneChanged.invoke(paneId);
    }

    public backlogItemAdded(): void {
        this._actions.backlogItemAdded.invoke(null);
    }

    public openSettings() {
        Events_Action.getService().performAction(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION);
    }

    public saveFilterState(filterState: IFilterState): void {
        this._filterStatePersistenceManager.saveFilterStateToServer(filterState);

        if (isFilterStateEmpty(mapToFilterState(filterState))) {
            this.toggleFiltered(false);
        } else {
            this.toggleFiltered(true);
        }
    }

    public updateFilterStatePersistenceManager(filterStatePersistenceManager: IFilterStatePersistenceManager) {
        this._filterStatePersistenceManager = filterStatePersistenceManager;
    }

    private _backlogDataAvailable(pivotData: IBacklogData) {
        if (!pivotData) {
            this.backlogLoadFailed("ErrorInitializingBacklog", new Error(BacklogResources.ServerNoResponse));
        } else if (pivotData.exceptionInfo) {
            const { exceptionInfo } = pivotData;
            this.backlogLoadFailed("ErrorInitializingBacklog", new Error(exceptionInfo.exceptionMessage), exceptionInfo);
        } else {
            this._actions.loadBacklogSucceeded.invoke(pivotData);
        }
    }

    private backlogLoadFailed(errorCode: string, error: Error, exceptionInfo?: ExceptionInfo): void {
        publishErrorToTelemetry({
            name: errorCode,
            message: getErrorMessage(error)
        });

        const exception = exceptionInfo ? exceptionInfo : {
            exceptionMessage: getErrorMessage(error)
        } as ExceptionInfo;

        this._actions.loadBacklogFailed.invoke(exception);
    }
}