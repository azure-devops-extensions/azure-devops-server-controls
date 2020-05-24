import { IBacklogGridItem } from "Agile/Scripts/Backlog/Events";
import { TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import { IBacklogContextData } from "Agile/Scripts/Common/Agile";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { IProductBacklogQueryResult } from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { BacklogActions, ISprintBacklogActionPayload } from "Agile/Scripts/SprintsHub/Backlog/ActionsCreator/BacklogActions";
import { IBacklogRightPanelContext } from "Agile/Scripts/SprintsHub/Backlog/Components/BacklogWrapper";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { IAggregatedCapacity, ISprintCapacityOptions } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { DroppableWorkItemChangeOptions } from "Presentation/Scripts/TFS/FeatureRef/DroppableEnhancements";
import { Contribution } from "VSS/Contributions/Contracts";
import { Store } from "VSS/Flux/Store";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { mapToFilterState } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";

export class BacklogStore extends Store {
    private _actions: BacklogActions;
    private _activeWorkItemTypes: string[];
    private _backlogContext: IBacklogContextData;
    private _backlogExceptions: ExceptionInfo[];
    private _backlogGridData: IProductBacklogQueryResult;
    private _initialFilterState: IFilterState;
    private _isFiltered: boolean;
    private _itemAdded: boolean;
    private _rightPanelContributions: Contribution[];
    private _status: LoadingStatus = LoadingStatus.None;
    private _showAddItemCallout: boolean;
    private _aggregatedCapacity: IAggregatedCapacity;
    private _sprintCapacityOptions: ISprintCapacityOptions;
    private _teamCapacityModel: TeamCapacityModel;
    private _isFilterBarVisible: boolean;
    private _rightPanelContributionId: string;
    private _droppableWorkItemChangeOptions: DroppableWorkItemChangeOptions;
    private _eventHelper: ScopedEventHelper;
    private _fieldAggregator: FieldAggregator;
    private _getSelectedWorkItemsHandler: () => IBacklogGridItem[];

    public get activeWorkItemTypes(): string[] {
        return this._activeWorkItemTypes;
    }

    public get backlogContext(): IBacklogContextData {
        return this._backlogContext;
    }

    public get backlogGridData(): IProductBacklogQueryResult {
        return this._backlogGridData;
    }

    public get backlogExceptions(): ExceptionInfo[] {
        return this._backlogExceptions;
    }

    public get initialFilterState(): IFilterState {
        return this._initialFilterState;
    }

    public get isFiltered(): boolean {
        return this._isFiltered;
    }

    public get isFilterBarOpen(): boolean {
        return this._isFilterBarVisible;
    }

    public get status(): LoadingStatus {
        return this._status;
    }

    public get showAddItemCallout(): boolean {
        return this._showAddItemCallout;
    }

    public get rightPanelContributions(): Contribution[] {
        return this._rightPanelContributions;
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

    public get rightPanelContributionId(): string {
        return this._rightPanelContributionId;
    }

    public get droppableWorkItemChangeOptions(): DroppableWorkItemChangeOptions {
        return this._droppableWorkItemChangeOptions;
    }

    public get fieldAggregator(): FieldAggregator {
        return this._fieldAggregator;
    }

    public get eventHelper(): ScopedEventHelper {
        return this._eventHelper;
    }

    public get getSelectedWorkItemsHandler(): () => IBacklogGridItem[] {
        return this._getSelectedWorkItemsHandler;
    }

    constructor(actions: BacklogActions) {
        super();
        this._actions = actions;

        this._attachActionListeners();
    }

    private _attachActionListeners(): void {
        this._actions.beginLoadBacklog.addListener(this._handleBeginLoadBacklog);
        this._actions.loadBacklogFailed.addListener(this._handleLoadBacklogFailed);
        this._actions.loadBacklogDataSucceeded.addListener(this._handleLoadBacklogSucceeded);
        this._actions.backlogItemAdded.addListener(this._handleBacklogItemAdded);
        this._actions.isFiltered.addListener(this._handleFilterChanged);
        this._actions.updateAddItemCalloutVisibility.addListener(this._newItemCalloutStateChange);
        this._actions.toggleFilterBarVisible.addListener(this._toggleFilterBar);
        this._actions.rightPanelContributionsLoaded.addListener(this._handleRightPanelContributionsLoaded);
        this._actions.setRightPanelVisibility.addListener(this._rightPanelVisibilityChanged);
        this._actions.rightPanelContextChanged.addListener(this._handleRightPanelContextChanged);
    }

    private _rightPanelVisibilityChanged = (rightPanelContributionId: string): void => {
        this._rightPanelContributionId = rightPanelContributionId;
        this.emitChanged();
    }

    private _toggleFilterBar = (isFilterBarVisible: boolean): void => {
        const valueChanged = this._isFilterBarVisible !== isFilterBarVisible;
        this._isFilterBarVisible = isFilterBarVisible;

        if (valueChanged) {
            this.emitChanged();
        }
    }

    private _handleRightPanelContextChanged = (context: IBacklogRightPanelContext): void => {
        this._droppableWorkItemChangeOptions = context.droppableWorkItemChangeOptions;
        this._eventHelper = context.eventHelper;
        this._fieldAggregator = context.fieldAggregator;
        this._getSelectedWorkItemsHandler = context.getSelectedWorkItemsHandler;
        this.emitChanged();
    }

    private _handleBeginLoadBacklog = (status: LoadingStatus): void => {
        this._status = status;
        this._backlogContext = null;
        this._backlogExceptions = null;
        this._backlogGridData = null;
        this._itemAdded = false;
        this._aggregatedCapacity = null;
        this._sprintCapacityOptions = null;
        this._teamCapacityModel = null;
        this._droppableWorkItemChangeOptions = null;
        this._eventHelper = null;
        this._fieldAggregator = null;
        this._getSelectedWorkItemsHandler = null;

        this.emitChanged();
    }

    private _handleRightPanelContributionsLoaded = (contributions: Contribution[]): void => {
        this._rightPanelContributions = contributions;
        this.emitChanged();
    }

    private _handleLoadBacklogSucceeded = (payload: ISprintBacklogActionPayload): void => {
        const { activeWorkItemTypes, backlogContentData, capacityData, teamCapacityModel } = payload;

        this._activeWorkItemTypes = activeWorkItemTypes;
        this._backlogContext = backlogContentData.backlogContext;
        this._backlogExceptions = null;
        this._backlogGridData = backlogContentData.backlogQueryResults;
        this._initialFilterState = backlogContentData.initialBacklogFilterJson ?
            JSON.parse(backlogContentData.initialBacklogFilterJson) :
            {};

        this._isFiltered = !isFilterStateEmpty(mapToFilterState(this._initialFilterState));

        this._aggregatedCapacity = capacityData.aggregatedCapacity;
        this._sprintCapacityOptions = capacityData.capacityOptions;

        if (!this._itemAdded && (!this.backlogGridData || !this.backlogGridData.payload || !this.backlogGridData.payload.rows || this.backlogGridData.payload.rows.length === 0)) {
            this._status = LoadingStatus.LoadedNoContent;
        } else {
            this._status = LoadingStatus.LoadedWithContent;
        }

        this._teamCapacityModel = teamCapacityModel;

        this.emitChanged();
    }

    private _handleLoadBacklogFailed = (exceptionsInfo: ExceptionInfo[]): void => {
        this._status = LoadingStatus.ErrorLoadingData;
        this._backlogExceptions = exceptionsInfo;
        this.emitChanged();
    }

    private _handleBacklogItemAdded = (): void => {
        this._itemAdded = true;
        this._status = LoadingStatus.LoadedWithContent;
        this.emitChanged();
    }

    private _handleFilterChanged = (filtered: boolean): void => {
        this._isFiltered = filtered;
        this.emitChanged();
    }

    private _newItemCalloutStateChange = (state: boolean) => {
        this._showAddItemCallout = state;
        this.emitChanged();
    }
}