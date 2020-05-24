import { TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { IAggregatedCapacity, ISprintCapacityOptions } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { TaskboardActions } from "Agile/Scripts/SprintsHub/Taskboard/ActionsCreator/TaskboardActions";
import { ISprintTaskboardData, ISprintTaskboardInitialPayload } from "Agile/Scripts/SprintsHub/Taskboard/TaskboardContracts";
import { TaskboardGroupBy } from "Agile/Scripts/Taskboard/TaskboardConstants";
import * as Store_Base from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";
import { isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { mapToFilterState } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { ITaskboardDetailsPanelOptions } from "Agile/Scripts/SprintsHub/Taskboard/Components/TaskboardWrapper";
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import { DroppableWorkItemChangeOptions } from "Presentation/Scripts/TFS/FeatureRef/DroppableEnhancements";

export class TaskboardStore extends Store_Base.Store {
    /** Key coming from BacklogsBoardActionHelper.cs that indicates if the group by is people or parent */
    public static readonly PEOPLE_FILTER_KEY: string = "people";
    private _taskboard: ISprintTaskboardData;

    /* Default to 'None'. We don't want to show a loading indicator on the pivot on initial load.
     * The hub will have a larger loading indicator and we want to avoid having two.
     */
    private _status: LoadingStatus = LoadingStatus.None;
    private _groupByState: TaskboardGroupBy;
    private _newWorkItemTypes: string[] = [];
    private _parentNamePlural: string;
    private _newWorkItemButtonOverride: boolean = false;
    private _aggregatedCapacity: IAggregatedCapacity = null;
    private _sprintCapacityOptions: ISprintCapacityOptions;
    private _teamCapacityModel: TeamCapacityModel;
    private _exceptionsInfo: ExceptionInfo[] = [];
    private _isFilterBarVisible: boolean;
    private _isFiltered: boolean;
    private _initialFilterState: IFilterState;
    private _rightPanelId: string;
    private _fieldAggregator: FieldAggregator;
    private _droppableOptions: DroppableWorkItemChangeOptions;

    constructor(actions: TaskboardActions) {
        super();
        this._attachActionListeners(actions);
    }

    public get rightPanelId(): string {
        return this._rightPanelId;
    }

    public get groupByState(): string {
        return this._groupByState;
    }

    public get taskboardData(): ISprintTaskboardData {
        return this._taskboard;
    }

    public get loadingState(): LoadingStatus {
        return this._status;
    }

    public get newWorkItemTypes(): string[] {
        return this._newWorkItemTypes;
    }

    public get parentNamePlural(): string {
        return this._parentNamePlural;
    }

    public get aggregatedCapacityData(): IAggregatedCapacity {
        return this._aggregatedCapacity;
    }

    public get sprintCapacityOptions(): ISprintCapacityOptions {
        return this._sprintCapacityOptions;
    }

    public get teamCapacityModel(): TeamCapacityModel {
        return this._teamCapacityModel;
    }

    public get exceptionsInfo(): ExceptionInfo[] {
        return this._exceptionsInfo;
    }

    public get isFiltered(): boolean {
        return this._isFiltered;
    }

    public get isFilterBarOpen(): boolean {
        return this._isFilterBarVisible;
    }

    public get initialFilterState(): IFilterState {
        return this._initialFilterState;
    }

    public get droppableOptions(): DroppableWorkItemChangeOptions {
        return this._droppableOptions;
    }

    public get fieldAggregator(): FieldAggregator {
        return this._fieldAggregator;
    }

    public get isNewWorkItemDisabled(): boolean {
        // Disable the "Add new" button if:
        // - we force disable the button OR
        // - we don't know what work item types to create OR
        // - we have data and are groupd by people
        return this._newWorkItemButtonOverride ||
            this._newWorkItemTypes.length === 0 ||
            (this._groupByState === TaskboardGroupBy.PEOPLE_CLASSIFICATION && this._status === LoadingStatus.LoadedWithContent);
    }

    protected _attachActionListeners(actions: TaskboardActions) {
        actions.taskboardContentAvailable.addListener(this._taskboardDataAvailable);
        actions.loadTaskboardFailed.addListener(this._handleLoadTaskboardFailed);
        actions.updateLoadingStatus.addListener(this._updateLoadingStatus);
        actions.groupByChanged.addListener(this._groupByChanged);
        actions.setNewWorkItemButtonState.addListener(this._setNewWorkItemOverride);
        actions.toggleFilterBarVisible.addListener(this._toggleFilterBar);
        actions.isFiltered.addListener(this._isFilteredChanged);
        actions.setRightPanelId.addListener(this._setRightPanelState);
        actions.initializeRightPanelContext.addListener(this._initializeRightPanelContext);
    }

    private _initializeRightPanelContext = (context: ITaskboardDetailsPanelOptions): void => {
        this._fieldAggregator = context.fieldAggregator;
        this._droppableOptions = context.droppableWorkItemChangeOptions;
        this.emitChanged();
    }

    private _setRightPanelState = (rightPanelId: string): void => {
        this._rightPanelId = rightPanelId;
        this.emitChanged();
    }

    private _isFilteredChanged = (filtered: boolean): void => {
        const valueChanged = this._isFiltered !== filtered;
        this._isFiltered = filtered;
        if (valueChanged) {
            this.emitChanged();
        }
    }

    private _toggleFilterBar = (isFilterBarVisible: boolean): void => {
        const valueChanged = this._isFilterBarVisible !== isFilterBarVisible;
        this._isFilterBarVisible = isFilterBarVisible;
        if (valueChanged) {
            this.emitChanged();
        }
    }

    private _setNewWorkItemOverride = (newOverride: boolean): void => {
        this._newWorkItemButtonOverride = newOverride;
        this.emitChanged();
    }

    private _groupByChanged = (newValue: TaskboardGroupBy): void => {
        if (this._groupByState !== newValue) {
            this._groupByState = newValue;
            this.emitChanged();
        }
    }

    private _updateLoadingStatus = (status: LoadingStatus): void => {
        this._status = status;
        this.emitChanged();
    }

    private _taskboardDataAvailable = (payload: ISprintTaskboardInitialPayload): void => {
        const { taskboardContentData, capacityData, teamCapacityModel } = payload;
        const { aggregatedCapacity, capacityOptions } = capacityData;

        //  Clean all previous exceptions.
        this._exceptionsInfo = [];

        if (taskboardContentData.boardCardSettings && !taskboardContentData.taskboardModel) {
            // Empty taskboard data
            if (taskboardContentData.newWorkItemTypes) {
                this._newWorkItemTypes = taskboardContentData.newWorkItemTypes;
            }

            this._status = LoadingStatus.LoadedNoContent;
        } else {
            if (taskboardContentData.newWorkItemTypes) {
                this._newWorkItemTypes = taskboardContentData.newWorkItemTypes;
            }

            const groupFilter = taskboardContentData.taskboardModel.filters[1];

            if (!this._parentNamePlural) {
                this._parentNamePlural = groupFilter.values[1];
            }
            if (!this._groupByState) {
                this._groupByState = Utils_String.equals(groupFilter.selectedValue, TaskboardStore.PEOPLE_FILTER_KEY, /*ignore case*/ true) ? TaskboardGroupBy.PEOPLE_CLASSIFICATION : TaskboardGroupBy.PARENT_CLASSIFICATION;
            }

            this._status = LoadingStatus.LoadedWithContent;
        }

        this._initialFilterState = taskboardContentData.initialFilterState ? JSON.parse(taskboardContentData.initialFilterState) : {};
        this._isFiltered = !isFilterStateEmpty(mapToFilterState(this._initialFilterState));
        this._taskboard = taskboardContentData;
        this._aggregatedCapacity = aggregatedCapacity;
        this._sprintCapacityOptions = capacityOptions;
        this._teamCapacityModel = teamCapacityModel;
        this.emitChanged();
    }

    private _handleLoadTaskboardFailed = (exceptionInfos: ExceptionInfo[]): void => {
        this._status = LoadingStatus.ErrorLoadingData;

        this._exceptionsInfo = [];
        this._exceptionsInfo.push(...exceptionInfos);

        if (!this._taskboard) {
            this._taskboard = {
                boardCardSettings: null,
                taskboardModel: null,
                iterationId: null,
                exceptionInfo: null,
                newWorkItemTypes: null,
                initialFilterState: null
            };
        }

        this.emitChanged();
    }
}
