import { IBacklogData } from "Agile/Scripts/BacklogsHub/BacklogHubContracts";
import { BacklogPivotActions } from "Agile/Scripts/BacklogsHub/BacklogPivot/ActionsCreator/BacklogPivotActions";
import { BacklogPaneIds } from "Agile/Scripts/BacklogsHub/BacklogPivot/BacklogPivotContracts";
import { IBacklogContextData } from "Agile/Scripts/Common/Agile";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { IBacklogPayload } from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { Contribution } from "VSS/Contributions/Contracts";
import { IStore, Store } from "VSS/Flux/Store";
import { first } from "VSS/Utils/Array";
import { equals } from "VSS/Utils/String";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { IQueryResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";

export interface IBacklogPivotStore extends IStore {
    /** The current pane id */
    readonly paneId: string;

    /** Status of the backlog */
    readonly status: LoadingStatus;

    /** Whether this is the first load of the backlog */
    readonly isInitialLoad: boolean;

    /** Is the backlog empty */
    readonly backlogEmpty: boolean;

    /** The backlog payload to render the grid */
    readonly backlogPayload: IBacklogPayload;

    /** The backlog context */
    readonly backlogContextData: IBacklogContextData;

    /** The initial filter state */
    readonly initialFilterState: IFilterState;

    /** Exception information */
    readonly exceptionInfo: ExceptionInfo;

    /** Is the add item callout visible? */
    readonly addItemCalloutVisible: boolean;

    readonly filterBarVisible: boolean;

    /** Is the backlog pivot filtered? */
    readonly isFiltered: boolean;

    /**
     * Are we on the requirements backlog?
     * We need to maintain this state between reloading backlog data like when the user toggles showParents
     * This will prevent other view options from flickering
     */
    readonly isRequirementsBacklog: boolean;

    /**
     * Is this the root backlog level?
     */
    readonly isRootBacklog: boolean;

    /** Visible work item types in the add panel */
    readonly activeWorkItemTypes: string[];

    /** Right panel contribution info */
    readonly rightPanelContributions: Contribution[];

    /** Event helper */
    readonly eventHelper: ScopedEventHelper;
}

export class BacklogPivotStore extends Store implements IBacklogPivotStore {
    private _actions: BacklogPivotActions;
    private _paneId: string;
    private _backlogData: IBacklogData;
    private _initialFilterState: IFilterState;
    private _exceptionInfo: ExceptionInfo;
    private _status: LoadingStatus;
    private _addItemCalloutVisibility: boolean;
    private _filterBarVisibility: boolean;
    private _isFiltered: boolean;
    private _itemAdded: boolean;
    private _isRequirementsBacklog: boolean;
    private _isRootBacklog: boolean;
    private _activeWorkItemTypes: string[];
    private _rightPanelContributions: Contribution[];
    private _eventHelper: ScopedEventHelper;
    private _isInitialBacklogLoad: boolean;

    public get paneId(): string {
        return this._paneId;
    }

    public get backlogPayload(): IBacklogPayload {
        if (this._backlogData) {
            return this._backlogData.backlogPayload;
        }
        return null;
    }

    public get exceptionInfo(): ExceptionInfo {
        return this._exceptionInfo;
    }

    public get status(): LoadingStatus {
        return this._status;
    }

    public get isInitialLoad(): boolean {
        return this._status === LoadingStatus.Loading && this._isInitialBacklogLoad;
    }

    public get isRequirementsBacklog(): boolean {
        return this._isRequirementsBacklog;
    }

    public get isRootBacklog(): boolean {
        return this._isRootBacklog;
    }

    public get backlogEmpty(): boolean {
        const backlogQueryResults = this._backlogQueryResults;
        return !this._itemAdded && (!backlogQueryResults || backlogQueryResults.payload.rows.length === 0);
    }

    public get backlogContextData(): IBacklogContextData {
        if (this._backlogData) {
            return this._backlogData.backlogContext;
        }
        return null;
    }

    public get initialFilterState(): IFilterState {
        return this._initialFilterState;
    }

    public get addItemCalloutVisible(): boolean {
        return this._addItemCalloutVisibility;
    }

    public get filterBarVisible(): boolean {
        return this._filterBarVisibility;
    }

    public get isFiltered(): boolean {
        return this._isFiltered;
    }

    public get activeWorkItemTypes(): string[] {
        return this._activeWorkItemTypes;
    }

    public get rightPanelContributions(): Contribution[] {
        return this._rightPanelContributions;
    }

    public get eventHelper(): ScopedEventHelper {
        return this._eventHelper;
    }

    private get _backlogQueryResults(): IQueryResult {
        return (this._backlogData && this._backlogData.backlogPayload && this._backlogData.backlogPayload.queryResults) ? this._backlogData.backlogPayload.queryResults : null;
    }

    constructor(actions: BacklogPivotActions) {
        super();
        this._actions = actions;
        this._itemAdded = false;
        this._paneId = BacklogPaneIds.Off;
        this._registerActionHandlers();
    }

    private _registerActionHandlers(): void {
        this._actions.rightPaneChanged.addListener(this._handleRightPaneChanged);
        this._actions.addItemCalloutToggled.addListener(this._handleAddItemCalloutToggled);
        this._actions.filterBarToggled.addListener(this._handleFilterBarToggled);
        this._actions.backlogItemAdded.addListener(this._handleBacklogItemAdded);
        this._actions.loadBacklogSucceeded.addListener(this._backlogDataAvailable);
        this._actions.loadBacklogFailed.addListener(this._errorAvailable);
        this._actions.beginLoadBacklog.addListener(this._beginLoadBacklog);
        this._actions.beginReloadBacklog.addListener(this._beginReloadBacklog);
        this._actions.isFiltered.addListener(this._isFilteredChanged);
        this._actions.loadRightPanelContributions.addListener(this._rightPanelContributionsLoaded);
    }

    private _isFilteredChanged = (isFiltered: boolean): void => {
        const isFilteredChanged = isFiltered !== this._isFiltered;

        if (isFilteredChanged) {
            this._isFiltered = isFiltered;
            this.emitChanged();
        }
    }

    private _beginLoadBacklog = (): void => {
        this._resetLoadedData();
        this._isInitialBacklogLoad = true;
        this.emitChanged();
    }

    private _beginReloadBacklog = (): void => {
        this._resetLoadedData();
        this._isInitialBacklogLoad = false;
        this.emitChanged();
    }

    private _resetLoadedData() {
        this._backlogData = null;
        this._initialFilterState = null;
        this._exceptionInfo = null;
        this._itemAdded = false;
        this._status = LoadingStatus.Loading;
    }

    private _backlogDataAvailable = (backlogData: IBacklogData): void => {
        this._backlogData = backlogData;
        this._exceptionInfo = backlogData.exceptionInfo;
        this._status = LoadingStatus.LoadedWithContent;
        this._initialFilterState = backlogData.initialBacklogFilterJson ? JSON.parse(backlogData.initialBacklogFilterJson) : {};
        this._isRequirementsBacklog = backlogData.backlogPayload ? backlogData.backlogPayload.isRequirementBacklog : false;
        this._isRootBacklog = backlogData.backlogPayload ? backlogData.backlogPayload.isRootBacklog : false;
        this._activeWorkItemTypes = backlogData.activeWorkItemTypes ? backlogData.activeWorkItemTypes : [];
        this._validatePaneId();
        this._eventHelper = new ScopedEventHelper(`ProductBacklog_${(new Date()).getTime().toString()}`);
        this.emitChanged();
    }

    private _errorAvailable = (error: ExceptionInfo): void => {
        this._backlogData = null;
        this._exceptionInfo = error;
        this._status = LoadingStatus.ErrorLoadingData;
        this.emitChanged();
    }

    private _handleRightPaneChanged = (paneId: string): void => {
        this._paneId = paneId;
        this.emitChanged();
    }

    private _handleAddItemCalloutToggled = (visible: boolean): void => {
        this._addItemCalloutVisibility = visible;
        this.emitChanged();
    }

    private _handleFilterBarToggled = (visible: boolean): void => {
        this._filterBarVisibility = visible;
        this.emitChanged();
    }

    private _handleBacklogItemAdded = (): void => {
        this._itemAdded = true;
        this.emitChanged();
    }

    private _validatePaneId(): void {
        if (!equals(this._paneId, BacklogPaneIds.Mapping, true) &&
            !equals(this._paneId, BacklogPaneIds.Planning, true) &&
            !first(this._rightPanelContributions, (contribution) => equals(this._paneId, contribution.id))) {
            // The pane Id does not match any expected panes, set to off
            this._paneId = BacklogPaneIds.Off;
        }
    }

    private _rightPanelContributionsLoaded = (rightPanelContributions: Contribution[]): void => {
        this._rightPanelContributions = rightPanelContributions;
        this.emitChanged();
    }
}