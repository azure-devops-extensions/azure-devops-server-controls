import { autobind } from "OfficeFabric/Utilities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_WebSettingsService from "Presentation/Scripts/TFS/TFS.WebSettingsService";
import { BaseControl, Enhancement } from "VSS/Controls";
import { IPivotFilterItem } from "VSS/Controls/Navigation";
import { Splitter } from "VSS/Controls/Splitter";
import { Debug, logTracePoint } from "VSS/Diag";
import { getHistoryService } from "VSS/Navigation/Services";
import { getLocalService } from "VSS/Service";
import { LocalSettingsScope, LocalSettingsService } from "VSS/Settings";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import { classExtend, requireModules } from "VSS/VSS";
import { resizeSplitter } from "WorkItemTracking/Scripts/Utils/SplitterUtils";
import { FilterBar } from "WorkItemTracking/Scripts/Controls/Filters/FilterBar";
import { QueryResultGrid } from "WorkItemTracking/Scripts/Controls/Query/QueryResultGrid";
import { QueryResultInfoBar } from "WorkItemTracking/Scripts/Controls/Query/QueryResultInfoBar";
import * as TriageViewWorkItemLauncherAsync from "WorkItemTracking/Scripts/Controls/TriageViewWorkItemLauncher";
import { LoadingSpinnerOverlay } from "WorkItemTracking/Scripts/Controls/WorkItemForm/LoadingSpinnerOverlay";
import { WorkItemsNavigator } from "WorkItemTracking/Scripts/Controls/WorkItemsNavigator";
import { QueryResultsProvider, WorkItemsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { PerformanceEvents, WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature, WITPerformanceScenario } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { IQueryParamsExtras } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { IShowWorkItemFormOptions } from "WorkItemTracking/Scripts/OM/TriageViewInterfaces";
import { WorkItemPaneMode } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { RecycleBinTelemetryConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import { LoadingWorkItem } from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItemSettingsService } from "WorkItemTracking/Scripts/Services/WorkItemSettingsService";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { FilterManager } from "WorkItemTracking/Scripts/Filtering/FilterManager";

const WORKITEMPANE_HEIGHT_KEY = "workItemPaneHeight";
const WORKITEMPANE_WIDTH_KEY = "workItemPaneWidth";
const WORKITEMPANE_MINIMUM_BOTTOM = 200;
const WORKITEMPANE_MINIMUM_RIGHT = 200;
const WORKITEMPANE_MINIMUM_TOP = 120;
const WORKITEMPANE_MINIMUM_LEFT = 160;

class TriageView extends BaseControl {

    public static readonly enhancementTypeName: string = "tfs.wit.triageView";

    private _splitter: Splitter;
    private _gridInfoBar: QueryResultInfoBar;
    private _grid: QueryResultGrid;
    private _filterBar: FilterBar;
    private _workItemPaneMode: string;
    private _workItemsProvider: WorkItemsProvider;
    private _workItemsNavigator: WorkItemsNavigator;
    private _queriesHubContext: IQueriesHubContext;
    private _resizeDelegate = () => { this._handleResize(); };
    private _saveSplitterSizeDelegate = () => { this.saveSplitterSize(); };
    private _showWorkItemPaneDelegate = (sender: null, item: IPivotFilterItem) => this.showWorkItemPane(item.value, true);
    private _onSelectedWorkItemChangedDelegate = (sender: WorkItemsNavigator) => this.onSelectedWorkItemChanged(sender, sender.getSelectedWorkItemId());
    private _localSettingsService: LocalSettingsService;
    private _loadingOverlay: LoadingSpinnerOverlay;
    protected _triageViewWorkItemLauncherAsync: typeof TriageViewWorkItemLauncherAsync;
    private _isWorkItemModuleEnsured: boolean;
    private _workItemFormContainer: JQuery;

    public currentWorkItemId: number = 0;

    constructor(options?) {
        super(options);

        this._localSettingsService = getLocalService<LocalSettingsService>(LocalSettingsService);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "triage-view",
            infoBar: true
        }, options));

        this._queriesHubContext = options.queriesHubContext;
    }

    public initialize() {
        const that = this;

        super.initialize();

        this._bind($(".work-items-pane-filter"), "changed", this._showWorkItemPaneDelegate, true);

        this._splitter._bind("changed", this._saveSplitterSizeDelegate);

        this.attachWorkItemSelectionEvents();

        $(this._grid).on("queryResultsStarting", this._onQueryResultsStarting);
        $(this._grid).on("queryResultsComplete", this._onQueryResultsComplete);

        if (this._gridInfoBar) {
            this._gridInfoBar.bind(this._grid);
        }

        if (this._filterBar) {
            const context: TfsContext = this._options.tfsContext;
            const filterManager = this._grid.getFilterManager();
            this._filterBar.bind(context.navigation.project, filterManager, this._grid, this._options.initialFilterState);
            if (this._options.initialFilterState) {
                this._filterBar.showElement();
            }

            filterManager.attachEvent(FilterManager.EVENT_FILTER_CLEARED, this._onClearFilter);
            $(window).resize(this._resizeDelegate);
        }

        const selectedWorkItemId = this._grid.getSelectedWorkItemId();
        this.onSelectedWorkItemChanged(null, selectedWorkItemId);

        logTracePoint("TriageView.ctor.complete");

        this._workItemFormContainer = $("<div>").addClass("work-item-form-container").appendTo(this._splitter.rightPane);
    }

    public dispose() {
        this.detachNavigatorEvents();

        this._splitter._unbind("changed", this._saveSplitterSizeDelegate);

        this._unbind($(".work-items-pane-filter"), "changed", this._showWorkItemPaneDelegate, true);

        super.dispose();

        $(window).off("resize", this._resizeDelegate);

        if (this._filterBar) {
            this._filterBar.unbind();
            this._filterBar = null;
        }

        if (this._loadingOverlay) {
            this._loadingOverlay.dispose();
            this._loadingOverlay = null;
        }

        if (this._workItemsProvider) {
            this._workItemsProvider.detachEvent(QueryResultsProvider.EVENT_QUERY_RESULTS_MODEL_CHANGED, this._refreshQueryResultGrid);
        }

        const filterManager = this._grid.getFilterManager();
        if (filterManager) {
            filterManager.detachEvent(FilterManager.EVENT_FILTER_CLEARED, this._onClearFilter);
        }

        this._grid.attachTabBehavior(null);
        this._grid.dispose();
        this._grid = null;
    }

    public getWorkItemsNavigator(): WorkItemsNavigator {
        return this._workItemsNavigator;
    }

    public getResultsGrid(): QueryResultGrid {
        return this._grid;
    }

    public _enhance(element: JQuery) {
        super._enhance(element);

        this._splitter = <Splitter>Enhancement.ensureEnhancement(Splitter, this._element);
        Debug.assert(this._splitter ? true : false, "Unable to find Splitter control.");

        // instantiate query results grid if it is not created and enhanced already
        this._grid = <QueryResultGrid>Enhancement.ensureEnhancement(QueryResultGrid, this._element);

        Debug.assert(this._grid ? true : false, "Unable to find QueryResultsGrid control.");

        // Setting thhe hub context and to use zero data experience
        this._grid.setNewQueryContextOptions(this._queriesHubContext, true);

        // get the work items navigator from options or instantiate it
        this._workItemsNavigator = this._options.workItemsNavigator || new WorkItemsNavigator();

        this._grid.setNavigator(this._workItemsNavigator);

        // Set options for sourceArea used with delete key
        this._grid._options.sourceArea = RecycleBinTelemetryConstants.WORK_ITEMS_VIEW_SOURCE;
        this._grid._options.readWorkItems = false;

        this._grid.setInitialSelectedWorkItemId(this._options.initialSelectedWorkItemId);

        this._gridInfoBar = <QueryResultInfoBar>Enhancement.ensureEnhancement(QueryResultInfoBar, this._element);
        this._filterBar = <FilterBar>Enhancement.ensureEnhancement(FilterBar, this._element);
    }

    public onSelectedWorkItemChanged(e?: WorkItemsNavigator, id?: number) {
        const historySvc = getHistoryService();
        const currentState = historySvc.getCurrentState();
        // Do not update workitems in triage view if user is in 'workitem-edit' view or query-edit view
        // We dont want to show workitem in the triage view in this case, if the selectedItem changes in either the query-edit view or
        // work item edit view. Since in these 2 cases the triage view is hidden, calling showWorkItem in triage view brings some layout issues in the
        // wit form.
        if (!currentState.triage && localeIgnoreCaseComparer(currentState.action, "query-edit") !== 0 && id !== null) {
            this._ensureAndShowWorkItem(id, true);
            logTracePoint("TriageView.selectedWorkItemChanged.complete");
        }
    }

    public saveSplitterSize() {
        const splitterSize = this._splitter.getFixedSidePixels();
        if (splitterSize !== undefined && splitterSize !== null) {
            this._localSettingsService.write(this.getSplitterCacheKey(), "" + splitterSize, LocalSettingsScope.Global);
        }
    }

    public showElement() {
        super.showElement();
        // A window resize might have happened, so resize splitter
        this._resizeSplitter();
        this._splitter.attachResize(true);
    }

    public hideElement() {
        this._splitter.detachResize();
        super.hideElement();
    }

    public detachWorkItemForm() {
        this._unbindWorkItemForm(true);
    }

    public detachWorkItemSelectionEvents() {
        this._workItemsNavigator.detachEvent(WorkItemsNavigator.EVENT_NAVIGATE_INDEX_CHANGED, this._onSelectedWorkItemChangedDelegate);
    }

    public attachWorkItemSelectionEvents() {
        this._workItemsNavigator.attachEvent(WorkItemsNavigator.EVENT_NAVIGATE_INDEX_CHANGED, this._onSelectedWorkItemChangedDelegate);
    }

    public detachNavigatorEvents() {
        this._grid.detachNavigatorEvents();
    }

    public attachNavigatorEvents() {
        this._grid.attachNavigatorEvents();
    }

    private _onClearFilter = () => {
        // Clear the initial filter state on clear filter
        this._options.initialFilterState = null;
    }

    private getSplitterCacheKey(): string {
        if (this._workItemPaneMode === WorkItemPaneMode.Right) {
            return WORKITEMPANE_WIDTH_KEY;
        } else {
            return WORKITEMPANE_HEIGHT_KEY;
        }
    }

    private getSplitterInitialSize(): number | undefined {
        const cacheKey: string = this.getSplitterCacheKey();
        const cachedSize: string | undefined = this._localSettingsService
            .read(cacheKey, undefined, LocalSettingsScope.Global);
        if (!cachedSize) {
            return undefined;
        } else {
            return parseInt(cachedSize);
        }
    }

    private _getSplitterMinSize(): number {
        if (this._workItemPaneMode === WorkItemPaneMode.Right) {
            return WORKITEMPANE_MINIMUM_RIGHT;
        } else {
            return WORKITEMPANE_MINIMUM_BOTTOM;
        }
    }

    private _getSplitterMaxSize(): number {
        if (this._workItemPaneMode === WorkItemPaneMode.Right) {
            return $(this._element).width() - WORKITEMPANE_MINIMUM_LEFT;
        } else {
            const elementHeigth = $(this._element).height();
            return elementHeigth - WORKITEMPANE_MINIMUM_TOP;
        }
    }

    /**
     * Update the position/visibilty of the work item pane
     * @param mode The mode for work item pane, "off", "right", everything else
     * @param persist Indicates if the setting should be persisted to the server
     */
    public showWorkItemPane(mode: string, persist: boolean = false) {
        if (this._workItemPaneMode !== mode) {
            publishEvent(new TelemetryEventData(
                WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                WITCustomerIntelligenceFeature.WORKITEMPANECHANGED,
                {
                    prevMode: this._workItemPaneMode,
                    newMode: mode
                }));

            this._workItemPaneMode = mode;
            const settingsService = TFS_OM_Common.Application.getConnection(this._options.tfsContext).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
            if (persist) {
                settingsService.beginWriteSetting("/WorkItemPane", mode);
                const workItemSettingsService = WorkItemSettingsService.getInstance();
                const currentSettings = workItemSettingsService.getUserSettings();
                if (currentSettings && currentSettings.workItemPaneMode !== mode) {
                    currentSettings.workItemPaneMode = mode;
                    workItemSettingsService.setUserSettings(currentSettings);
                }
            }

            if (mode === WorkItemPaneMode.Off) {
                this._splitter.noSplit();
                this._unbindWorkItemForm();

                // When the triage view isn't open, single click on title opens the form.
                this._grid.setTitleInteraction(true, true);
            } else {
                if (mode === WorkItemPaneMode.Right) {
                    this._splitter.horizontal(); // vertical == false
                } else {
                    this._splitter.vertical();
                }
                this._splitter.split();
                const initialSize: number | undefined = this.getSplitterInitialSize();
                if (initialSize) {
                    this._splitter.resize(initialSize, true);
                }
                this._resizeSplitter();
                // When triage view is visible, single click on the title shouldn't open the full work item link.
                this._grid.setTitleInteraction(true, false);

                this._ensureAndShowWorkItem(this.currentWorkItemId, true);
            }
        }
    }

    private _showLoadingIndicator() {
        if (!this._loadingOverlay) {
            this._loadingOverlay = new LoadingSpinnerOverlay(this._workItemFormContainer[0]);
        }

        this._loadingOverlay.show(0, LoadingWorkItem);
    }

    private _hideLoadingIndicator() {
        if (this._loadingOverlay) {
            this._loadingOverlay.hide();
        }
    }

    protected _ensureModule(callback: () => void) {
        if (!this._triageViewWorkItemLauncherAsync) {
            this._showLoadingIndicator();
            PerfScenarioManager.addSplitTiming(PerformanceEvents.TRIAGEVIEW_ENSUREWORKITEMFORMMODULE, true);
            requireModules(["WorkItemTracking/Scripts/Controls/TriageViewWorkItemLauncher"]).spread((triageViewWorkItemLauncherAsync: typeof TriageViewWorkItemLauncherAsync) => {
                this._triageViewWorkItemLauncherAsync = triageViewWorkItemLauncherAsync;
                PerfScenarioManager.addSplitTiming(PerformanceEvents.TRIAGEVIEW_ENSUREWORKITEMFORMMODULE, false);
                callback();
                this._hideLoadingIndicator();
            });
        } else {
            callback();
        }
    }

    protected _showWorkItem(id: number, workItemFormOptions: IShowWorkItemFormOptions, forceShow?: boolean, forceCreateForm?: boolean) {
        this._triageViewWorkItemLauncherAsync.TriageViewWorkItemLauncher.showWorkItem(id, workItemFormOptions, forceShow, forceCreateForm, (error: any) => {
            if (this._queriesHubContext && error) {
                let errorMessage: string | JSX.Element;
                if (typeof error === "string") {
                    errorMessage = error;
                } else if ((<Error>error).message !== undefined) {
                    errorMessage = (<Error>error).message;
                } else {
                    errorMessage = error;
                }
                errorMessage && this._queriesHubContext.actionsCreator.showErrorMessageForTriageView(errorMessage);
            }
        });
    }

    private _ensureAndShowWorkItem(id: number, forceShow?: boolean) {
        if (this.currentWorkItemId !== id || forceShow) {
            this.currentWorkItemId = id;
            if (this._workItemPaneMode !== WorkItemPaneMode.Off) {
                if (id && !this._isWorkItemModuleEnsured) {
                    this._isWorkItemModuleEnsured = true;
                    const recreateForm: boolean = !this._triageViewWorkItemLauncherAsync;

                    this._ensureModule(() => {
                        const workItemFormOptions = {
                            tfsContext: this._options.tfsContext,
                            workItemsNavigator: this._workItemsNavigator,
                            container: this._workItemFormContainer,
                            grid: this._grid,
                            workItemsProvider: this._workItemsProvider
                        };
                        // Checking if triage view is disposed before showing workitem.
                        if (!this.isDisposed()) {
                            // If users switch to an another workitem while the current workitem is loading then we show the very latest one.
                            id = this.currentWorkItemId !== id ? this.currentWorkItemId : id;
                            this._showWorkItem(id, workItemFormOptions, forceShow, recreateForm);
                        }
                        this._isWorkItemModuleEnsured = false;
                    });
                } else if (!id) { // Unbind the form if the id is zero, it could happen if this is the last item in recycle bin
                    this._unbindWorkItemForm();
                }
            }
        }
    }

    protected _unbindWorkItemForm(detachLayout?: boolean) {
        if (this._triageViewWorkItemLauncherAsync) {
            this._triageViewWorkItemLauncherAsync.TriageViewWorkItemLauncher.unBindWorkItem(detachLayout);
        }
    }

    private _refreshQueryResultGrid = () => {
        // Refreshing the grid rows but skipping running the query again
        this._grid.refresh(true);
    }

    public setProvider(queryResultsProvider: QueryResultsProvider, callback: IResultCallback, errorCallback?: IErrorCallback, extras?: IQueryParamsExtras) {
        if (queryResultsProvider !== this._workItemsProvider) {
            // Reset filtering when query provider changes.
            this._grid.getFilterManager().clearFilters();
        }

        this._workItemsProvider = queryResultsProvider;
        this._workItemsProvider.attachEvent(QueryResultsProvider.EVENT_QUERY_RESULTS_MODEL_CHANGED, this._refreshQueryResultGrid);

        if (this._workItemsNavigator) {
            this._workItemsNavigator.setProvider(queryResultsProvider);
        }

        extras = { ...extras, runQuery: true };

        this._grid.beginShowResults(queryResultsProvider,
            () => {
                this._ensureAndShowWorkItem(this._grid.getSelectedWorkItemId(), true);
                if ($.isFunction(callback)) {
                    callback.call(this);
                }
            },
            errorCallback,
            extras);
    }

    public getProvider() {
        return this._workItemsProvider;
    }

    public scrollIntoView(force: boolean) {
        this._grid.getSelectedRowIntoView(force);
    }

    public saveWorkitems() {
        this._grid.saveWorkitems();
    }

    public refreshWorkItems() {
        this._grid.refresh();
    }

    public toggleFilter() {
        if (this._filterBar) {
            this._filterBar.toggle();
        }
    }

    /**
     * Shows and focuses the filter bar.
     */
    public activateFilter() {
        if (this._filterBar) {
            this._filterBar.showElement();
            this._filterBar.focus();
        }
    }

    private _resizeSplitter = (): void => {
        resizeSplitter(this._splitter, this._getSplitterMaxSize(), this._getSplitterMinSize());
        this.saveSplitterSize();
    }

    private _handleResize() {
        const toolbarHeight = 0;

        if (this._filterBar && this._filterBar.isVisible()) {
            const filterBarHeight = this._filterBar.getElement().height();

            this._grid.getElement().css("top", filterBarHeight + toolbarHeight);
        } else {
            // Clear the element style to use the default top.
            this._grid.getElement().css("top", "");
        }

        // Only deal with splitter when in right or bottom mode
        // The splitter should not be updated when triage view is not visible
        if (this._workItemPaneMode !== WorkItemPaneMode.Off && this.isVisible()) {
            this._resizeSplitter();
        }
    }

    @autobind
    private _onQueryResultsStarting(event: Event, skipInvalidateResults: boolean): void {
        if (!skipInvalidateResults) {
            PerfScenarioManager.addSplitTiming(PerformanceEvents.TRIAGEVIEW_QUERYRESULT, true);
        }
    }

    @autobind
    private _onQueryResultsComplete(event: Event, skipInvalidateResults: boolean): void {
        if (!skipInvalidateResults) {
            PerfScenarioManager.addSplitTiming(PerformanceEvents.TRIAGEVIEW_QUERYRESULT, false);

            // To track the number of workitems per query load. This can help us to see if the increase in number of workitems
            // increase the grid rendering time
            const workItemsCount = this._grid.getWorkItemIds().length;
            PerfScenarioManager.addData({ "QueryResultCount": workItemsCount });
            if (this._workItemPaneMode === WorkItemPaneMode.Off // Work item pane turned off
                || workItemsCount === 0) { // Empty query result
                PerfScenarioManager.endScenario(WITPerformanceScenario.QUERY_OPENRESULTS);

                // If in case the query result returns 0 records due to recent changes then unbind the old form
                if (workItemsCount === 0) {
                    this._unbindWorkItemForm();
                }
            } else {
                if (!PerfScenarioManager.isScenarioActive(WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENWORKITEM)) {
                    PerfScenarioManager.startScenario(WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENWORKITEM, false);
                }
            }

            PerfScenarioManager.endScenario(WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENBREADCRUMBQUERYRESULTS);
        }

        // Filter bar should be loaded by now
        // Also set initial state here directly so there is no delay
        if (this._options.initialFilterState && this._filterBar) {
            this._grid.getFilterManager().setFilters(this._options.initialFilterState);
        }
    }
}

classExtend(TriageView, TfsContext.ControlExtensions);

export = TriageView;
