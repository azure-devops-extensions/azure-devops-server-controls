// tslint:disable:member-ordering
/// <reference types="jquery" />
import * as Q from "q";

import "VSS/LoaderPlugins/Css!Agile";
import { AddChildTaskGridBehavior, Backlog, OrphanGroup } from "Agile/Scripts/Backlog/Backlog";
import { ProductBacklogsPanelPivotFilterManager } from "Agile/Scripts/Backlog/BacklogsPanelPivotFilterManager";
import { BacklogBehaviorConstants } from "Agile/Scripts/Backlog/Constants";
import * as Events from "Agile/Scripts/Backlog/Events";
import { IEffortData, SprintLineManager } from "Agile/Scripts/Backlog/Forecasting/SprintLineManager";
import { SprintLinesViewManager } from "Agile/Scripts/Backlog/Forecasting/SprintLinesViewManager";
import { GridReorderBehavior } from "Agile/Scripts/Backlog/GridReorderBehavior";
import * as TFS_Agile_ProductBacklog_ContextMenu from "Agile/Scripts/Backlog/ProductBacklogContextMenu";
import * as TFS_Agile_ProductBacklog_DM from "Agile/Scripts/Backlog/ProductBacklogDataManager";
import * as TFS_Agile_ProductBacklog_Grid from "Agile/Scripts/Backlog/ProductBacklogGrid";
import * as MappingPanel_NOREQUIRE from "Agile/Scripts/Backlog/ProductBacklogMappingPanel";
import { ShowParents } from "Agile/Scripts/Backlog/ProductBacklogMru";
import * as Board_Settings_Controls_NO_REQUIRE from "Agile/Scripts/Board/BoardsSettingsControls";
import * as StyleCustomization_NO_REQUIRE from "Agile/Scripts/Card/CardCustomizationStyle";
import * as TFS_Agile from "Agile/Scripts/Common/Agile";
import * as TFS_Agile_ContributableTabsUtils from "Agile/Scripts/Common/ContributableTabsUtils";
import * as TFS_Agile_Controls from "Agile/Scripts/Common/Controls";
import * as CustomerIntelligenceConstants from "Agile/Scripts/Common/CustomerIntelligence";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import * as TFS_Agile_Utils from "Agile/Scripts/Common/Utils";
import * as TFS_Agile_WorkItemChanges from "Agile/Scripts/Common/WorkItemChanges";
import { BacklogConstants, BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import {
    IBacklogPageContext,
    IBacklogPayload,
    IProductBacklogMappingPaneHandler,
    IProductBacklogQueryResult,
    IVelocityChartSettings,
    ProductBacklogConstants,
    ProductBacklogOptions
} from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { ProductBacklogMembershipEvaluator } from "Agile/Scripts/ProductBacklog/ProductBacklogMembershipEvaluator";
import { ProductBacklogUrlHelpers } from "Agile/Scripts/ProductBacklog/ProductBacklogUrlHelpers";
import { VelocityInputControl } from "Agile/Scripts/ProductBacklog/VelocityInputControl";
import * as AgileProductBacklogResources from "Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog";
import * as Agile_Utils_CSC_NO_REQUIRE from "Agile/Scripts/Settings/CommonSettingsConfiguration";
import { MessageBarType } from "OfficeFabric/MessageBar";
import {
    BacklogConfigurationService,
    BacklogFieldTypes,
    IBacklogLevelConfiguration
} from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import * as TFS_RowSavingManager from "Presentation/Scripts/TFS/FeatureRef/RowSavingManager";
import * as TFS_TeamAwarenessService from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as Configurations_NO_REQUIRE from "Presentation/Scripts/TFS/TFS.Configurations";
import * as ConfigurationsConstants from "Presentation/Scripts/TFS/TFS.Configurations.Constants";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as HostUIActions from "Presentation/Scripts/TFS/TFS.Host.UI.Actions";
import * as Ajax from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_UI_Controls_Common from "Presentation/Scripts/TFS/TFS.UI.Controls.Common";
import * as TFS_WebSettingsService from "Presentation/Scripts/TFS/TFS.WebSettingsService";
import * as TeamServices from "TfsCommon/Scripts/Team/Services";
import * as Controls from "VSS/Controls";
import * as Grids from "VSS/Controls/Grids";
import * as Menus from "VSS/Controls/Menus";
import * as Navigation from "VSS/Controls/Navigation";
import * as Notifications from "VSS/Controls/Notifications";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import * as StatusIndicator from "VSS/Controls/StatusIndicator";
import * as Diag from "VSS/Diag";
import * as Events_Action from "VSS/Events/Action";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as Service from "VSS/Service";
import * as Telemetry from "VSS/Telemetry/Services";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import { IDisplayColumnResult, IQueryResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { RecycleBinTelemetryConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IRecycleBinOptions } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin";

const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
const WorkItemUtils = TFS_Agile_Utils.WorkItemUtils;

export class ProductBacklog extends Backlog {
    public static SHOW_FORECAST_FILTER_CLASS = ".show-forecast-filter";
    public static FILTER_CONSTANT_OFF = "off";
    public static FILTER_CONSTANT_ON = "on";
    public static SHOW_INPROGRESS_FILTER_CLASS = ".show-inprogress-filter";
    public static SHOW_PARENTS_FILTER_CLASS = ".show-parents-filter";
    public static BACKLOG_SEARCH_BUTTON = "text-filter-button";
    public static PRODUCT_BACKLOG_TOAST = "product-backlog-toast";
    public static MAPPING_PANE_ON_EVENT = "mapping-pane-on-event";
    public static ID_MENU_ITEM_SEARCH_FILTER: string = "id-searchFilterMenuItem";

    public static VERIFY_MEMBERSHIP_EXPLICIT = "verify-membership";
    private static TOAST_TIME = 2000;
    private static TOAST_FADE_IN_TIME = 250;
    private static TOAST_FADE_OUT_TIME = 1000;
    private static LOADING_OVERLAY_DELAY = 500;
    private static DATASOURCE_NAME = "ProductBacklogGrid";

    /**
     * Create the message that will be displayed in the ToastNotification area
     * @param parentTitle Title of the parent work item
     * @param childrenInformation Title of the work item being parented or the number of work items that were reparented
     *
     * @returns JQuery object containing message content
     */
    public static createReparentToast(parentTitle: string, childrenInformation: number | string): JQuery {
        Diag.Debug.assertParamIsString(parentTitle, "parentTitle");
        Diag.Debug.assertParamIsNotNull(childrenInformation, "childrenInformation");

        const $container = $("<div>");
        const $section1 = $("<div>").appendTo($container);

        if (typeof childrenInformation === "number") {
            $section1.text(Utils_String.format(AgileProductBacklogResources.ProductBacklog_Reparent_Toast_Multiple, childrenInformation, parentTitle));
        } else {
            $section1.text(Utils_String.format(AgileProductBacklogResources.ProductBacklog_Reparent_Toast_1, childrenInformation, parentTitle));
        }

        return $container;
    }

    public static computeDataIndexForRow(isAboveFirstOrBelowLast: boolean, dataIndex: number): number {
        return (isAboveFirstOrBelowLast && dataIndex) ? -dataIndex : dataIndex;
    }

    // This method is 'public' only for unit testing purpose
    public static _addCustomRows(queryResults: IQueryResult) {
        const backlogContext = TFS_Agile.BacklogContext.getInstance();
        let hublevel: number = null;
        $.each(BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels(), (idx, value: IBacklogLevelConfiguration) => {
            if (value.name === backlogContext.level.name) {
                hublevel = idx + 1;
                return false;
            }
        });

        TFS_Agile_ProductBacklog_Grid.GridGroupRowBase.workitemIDMap = {};
        $.each(queryResults.targetIds, (idx, id) => {
            if (id < 0) {
                const groupRow: TFS_Agile_ProductBacklog_Grid.IGridGroupRow = new OrphanGroup(id + hublevel, id, queryResults);

                TFS_Agile_ProductBacklog_Grid.GridGroupRowBase.workitemIDMap[id] = groupRow;

                // Since the hierarchy is already built, we call 'buildHierarchy' with empty array to update _pageData with unparented rows
                const additionalFields: { [field: string]: string } = {};
                additionalFields[WITConstants.CoreFieldRefNames.Id] = id.toString();
                $.extend(queryResults, groupRow.buildHierarchy([], additionalFields));
            }
        });

        return queryResults;
    }

    protected _backlogPayload: IBacklogPayload;
    protected _sprintLineManager: SprintLineManager;
    protected _options: ProductBacklogOptions;

    private _dataManagerCreated: boolean;

    /** Indicates whether the forecasting infrastructure has been initialized */
    private _sprintLinesInitialized: boolean = false;
    private _sprintLinesViewManager: SprintLinesViewManager;
    private _componentsDisabled: boolean;
    private _isRequirementBacklog: boolean;
    private _backlogViewControl: TFS_Agile_Controls.BacklogViewControl;
    private _sprintViewControl: TFS_Agile_Controls.SprintViewControl;
    private _initialPopulationComplete: boolean;
    private _$velocityChartDiv: JQuery;
    private _velocityInputControl: VelocityInputControl;
    private _velocityChartControl: TFS_Agile_Controls.VelocityChartControl;
    private _cfdChartControl: TFS_Agile_Controls.CumulativeFlowChartControl;
    private _showForecastFilter: Navigation.PivotFilter;
    private _showParentsFilter: Navigation.PivotFilter;
    private _showInProgressFilter: Navigation.PivotFilter;
    private _backlogPivotView: Navigation.PivotView;
    private _mappingPaneOptions: MappingPanel_NOREQUIRE.IMappingPanelOptions;
    private _mappingPaneHandler: IProductBacklogMappingPaneHandler;
    private _agilePortfolioManagementNotification: TFS_UI_Controls_Common.DismissableMessageAreaControl;
    private _$loadingOverlay: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _isRefreshing: boolean;
    private _originalLevelRequest: string;
    private _backlogsPanelPivotFilterManager: ProductBacklogsPanelPivotFilterManager;

    // Record start time of getBacklogPayload request for telemetry
    private _productBacklogPerf: Performance.IScenarioDescriptor;

    /**
     * ProductBacklog constructor
     * @param options the options for the product backlog
     */
    constructor(options: ProductBacklogOptions) {
        super(options);

        Performance.getScenarioManager().split("ProductBacklog.Initialize");

        this._registerEvents();

        this._initialPopulationComplete = false;

        if (!options.isNewHub) {
            // Get the current state so we can check if an action wasnt provided then we are supporting
            // legacy URL structure and defaulting to requirement backlog
            const historySvc = Navigation_Services.getHistoryService();

            const refresh = (sender: any, state: any) => {
                if (state.action === ProductBacklogConstants.BACKLOG_ACTION) {
                    if (this._productBacklogPerf) {
                        // If a scenario is running, add split
                        this._productBacklogPerf.addSplitTiming("ProductBacklog.GetPayload");
                    }
                    const callBack = () => {
                        //this is the guid for this particular message
                        if (!TFS_UI_Controls_Common.DismissableMessageAreaControl.isDismissedOnClient(TFS_Agile.NotificationGuids.LimitedPortfolioAccess, TFS_WebSettingsService.WebSettingsScope.User)) {
                            if (this._backlogContext.isPortfolioInContext()) {
                                $(".tfs-basic-user-limited-portfolio-access-notification").addClass("visible").show();
                            } else {
                                $(".tfs-basic-user-limited-portfolio-access-notification").removeClass("visible").hide();
                            }
                        }

                        if (!TFS_UI_Controls_Common.DismissableMessageAreaControl.isDismissedOnClient(TFS_Agile.NotificationGuids.NewBacklogLevelVisibilityNotSet, TFS_WebSettingsService.WebSettingsScope.User)) {
                            const launchCommonSettingsDialog = (e: JQueryKeyEventObject) => {
                                Events_Action.getService().performAction(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, {
                                    defaultTabId: TFS_Agile.TabControlsRegistrationConstants.BACKLOGS_TAB_ID
                                });

                                e.preventDefault();
                            };

                            $(".tfs-new-backlog-level-visibility-not-set-notification").addClass("visible").show()
                                .find("a").click((e) => {
                                    launchCommonSettingsDialog(e);
                                }).keypress((e) => {
                                    if (e.which === $.ui.keyCode.ENTER) {
                                        launchCommonSettingsDialog(e);
                                    }
                                });
                        } else {
                            $(".tfs-new-backlog-level-visibility-not-set-notification").removeClass("visible").hide();
                        }
                    };

                    // Determine the new URL's context.
                    const pageUrlContext: IBacklogPageContext = ProductBacklogUrlHelpers.getUrlContext(state);

                    // Save original level request
                    this._originalLevelRequest = pageUrlContext.level;

                    // Update or default to the MRU setting.
                    let showParents = pageUrlContext.showParents;
                    if (showParents == null) {
                        showParents = ShowParents.getMRUState();
                    } else {
                        ShowParents.setMRUState(showParents);
                    }

                    this._beginGetBacklogPayload(this._originalLevelRequest, showParents, callBack);
                } else {
                    // Default to the backlog action
                    this._setDefaultBacklogActionHistoryPoint(state);
                }
            };

            historySvc.attachNavigate(refresh, true); // attach to all hash changes so we can react correctly to any change
        }
    }

    public getMoveToPositionHelper(): TFS_Agile_ProductBacklog_ContextMenu.MoveToPositionHelper {
        const grid = this.getGrid();
        const itemHeirarchy = this.getItemHierarchy();
        return new TFS_Agile_ProductBacklog_ContextMenu.MoveToPositionHelper(
            grid,
            itemHeirarchy,
            TFS_Agile_ProductBacklog_ContextMenu.ContextMenuContributionUtils.createSelectionFilter(grid, itemHeirarchy));
    }

    protected _setDefaultBacklogActionHistoryPoint(state: any) {
        const historySvc = Navigation_Services.getHistoryService();
        historySvc.replaceHistoryPoint(ProductBacklogConstants.BACKLOG_ACTION, state);
    }

    /** Return value indicating whether backlog has data */
    public hasData(): boolean {
        return this._backlogPayload != null;
    }

    public reparentFromMappingPane(workItemIds: number[], newParentId: number): void {
        const actionArgs: MappingPanel_NOREQUIRE.IMappingPaneReparentArgs = {
            workItemIds,
            newParentId
        };

        this._getMappingPaneHandler().handle(actionArgs);
    }

    /**
     * Gets a value indicating whether there are pending changes in the backlog
     */
    public hasUncommitedChanges(): boolean {
        return this._reorderManager && this._reorderManager.numberOfUncommittedChanges() > 0;
    }

    private _mappingPaneReparentHandler = (actionArgs: MappingPanel_NOREQUIRE.IMappingPaneReparentArgs, next: Function) => {
        this._getMappingPaneHandler().handle(actionArgs, next);
    }

    private _backlogViewChangeHandler = (payload: IBacklogPayload, next: IArgsFunctionR<any>) => {
        // If grid was just populated for the first time, or the filters are not used no need to clear filters as they cause an unneccessary redraw
        if (this._initialPopulationComplete && this._filterManager.isFiltering()) {
            this._filterManager.clearFilters();
        }

        this.refreshProductBacklog(payload);
        next(payload);
    }

    private _backlogNavigateHandler = (actionArgs: TFS_Agile.IBacklogNavigationActionArgs, next: Function) => {
        const level = actionArgs.level;

        // Trigger navigation change to let default navigation handler update the internal state
        Navigation_Services.getHistoryService().addHistoryPoint(null, {
            level: level
        });
    }

    private _setMruPageHandler = (actionArgs: any, next: IArgsFunctionR<any>) => {
        // Extend the action arguments with our custom raw path, and pass responsibility on to the default action worker.
        const rawPath = document.location.pathname + (document.location.hash || document.location.search);
        next($.extend({ rawPath: rawPath }, actionArgs));
    }

    /** Register for global events to be handled by the ProductBacklog */
    private _registerEvents() {
        const eventService = Events_Action.getService();
        eventService.registerActionWorker(TFS_Agile.Actions.MAPPING_PANE_REPARENT, this._mappingPaneReparentHandler);
        eventService.registerActionWorker(TFS_Agile_Controls.BacklogViewControl.EVENT_BACKLOG_VIEW_CHANGE, this._backlogViewChangeHandler, 10);

        if (!this._options.isNewHub) {
            eventService.registerActionWorker(HostUIActions.ACTION_SET_MRU_PAGE, this._setMruPageHandler, 10);
        }

        // Respond to navigation events
        eventService.registerActionWorker(TFS_Agile.Actions.BACKLOG_NAVIGATE, this._backlogNavigateHandler);
    }

    private _unregisterEvents() {
        const eventService = Events_Action.getService();
        eventService.unregisterActionWorker(TFS_Agile.Actions.MAPPING_PANE_REPARENT, this._mappingPaneReparentHandler);
        eventService.unregisterActionWorker(TFS_Agile_Controls.BacklogViewControl.EVENT_BACKLOG_VIEW_CHANGE, this._backlogViewChangeHandler);
        eventService.unregisterActionWorker(TFS_Agile.Actions.BACKLOG_NAVIGATE, this._backlogNavigateHandler);

        if (!this._options.isNewHub) {
            eventService.unregisterActionWorker(HostUIActions.ACTION_SET_MRU_PAGE, this._setMruPageHandler);
        }
    }

    protected _createMembershipEvaluator(dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager) {
        return new ProductBacklogMembershipEvaluator(this._backlogContext.team.id);
    }

    public _getContextMenuCreator(): TFS_Agile_ProductBacklog_ContextMenu.BacklogContextMenuCreator {
        if (!this._backlogContextMenuCreator) {
            this._backlogContextMenuCreator = new TFS_Agile_ProductBacklog_ContextMenu.ProductBacklogContextMenuCreator(
                this._grid, () => this._backlogContext.team, this.getItemHierarchy(), this._gridOptions.behaviors, this._getMessageSuppressor());
        }

        return this._backlogContextMenuCreator;
    }

    /**
     * Retrieves the backlog payload, with 'loading' overlay & error handling.
     * Triggers an EVENT_BACKLOG_VIEW_CHANGE with the retrieved IBacklogPayload if successful.
     * @param levelPluralName
     * @param includeParents
     * @param successCallBack
     */
    private _beginGetBacklogPayload(levelPluralName?: string, includeParents?: boolean, successCallBack?: () => void) {
        this._isRefreshing = true;
        this._showLoadingOverlay();

        if (this._initialPopulationComplete) {
            this._productBacklogPerf = Performance.getScenarioManager().startScenario(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                "ProductBacklog.Refresh");
        }

        const updatePayload = (payload: IBacklogPayload) => {
            if (this._productBacklogPerf) {
                this._productBacklogPerf.addSplitTiming("ProductBacklog.GetPayloadComplete");
            }

            this._onGetBacklogPayloadComplete(payload, successCallBack);
        };

        // Check if backlog data is included in a JSON island before making a round trip
        const payloadData: IBacklogPayload = Utils_Core.parseJsonIsland($(document), ".backlog-payload", true);
        if (payloadData) {
            updatePayload(payloadData);
        } else {
            // Retrieve from server if not included in island
            TFS_Agile.BacklogHelpers.beginGetBacklogPayload(
                this._backlogContext.team.id,
                levelPluralName,
                includeParents,
                updatePayload,
                (error: Error) => this._onGetBacklogPayloadError(error));
        }
    }

    /** Retrieve effort data for forecasting */
    private _beginGetEffortData(workItemIds: number[]): IPromise<IEffortData> {
        Diag.Debug.assertIsArray(workItemIds, "workItemIds");

        const deferred = Q.defer<IEffortData>();

        Ajax.postMSJSON(
            tfsContext.getActionUrl("effortData", "backlog", { area: "api", teamId: this._backlogContext.team.id }),
            {
                workItemIds: workItemIds,
                teamId: this._backlogContext.team.id
            },
            (data: IEffortData) => { deferred.resolve(data); },
            (error: Error) => { deferred.reject(error); });

        return deferred.promise;
    }

    private _onGetBacklogPayloadComplete(payload: IBacklogPayload, successCallBack?: () => void) {
        this._backlogPayload = payload;
        this._isRefreshing = false;

        Events_Action.getService().performAction(TFS_Agile_Controls.BacklogViewControl.EVENT_BACKLOG_VIEW_CHANGE, payload);
        this._eventHelper.fire(TFS_Agile_Controls.ContributableTabConstants.EVENT_BACKLOG_VIEW_CHANGE, this, {
            level: payload.backlogContext.levelName,
            showParents: payload.backlogContext.includeParents,
            workItemTypeNames: payload.backlogContextWorkItemTypeNames
        });

        this._clearLoadingOverlay();

        //Display message if a redirect occurred due to hidden or invalid level
        if (this._originalLevelRequest && Utils_String.localeIgnoreCaseComparer(this._originalLevelRequest, this._backlogContext.level.name)) {
            this.getMessageArea().setMessage(AgileProductBacklogResources.ProductBacklog_LevelRedirectToDefaultLevel, Notifications.MessageAreaType.Info);
        }

        if ($.isFunction(successCallBack)) {
            successCallBack();
        }
        // Handling add/remove of column with text filter.
        $(this._grid).trigger("backlogPayloadFetched");
    }

    private _onGetBacklogPayloadError(error: Error) {
        this._isRefreshing = false;
        this.getMessageArea().setMessage(VSS.getErrorMessage(error));
        this._clearLoadingOverlay();
    }

    private _getIsRefreshing() {
        return this._isRefreshing;
    }

    private _showLoadingOverlay() {
        if (!this._$loadingOverlay) {
            this._$loadingOverlay = $("<div>").addClass("control-busy-overlay backlog-loading-overlay");
        }
        if (!this._statusIndicator) {
            this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(
                StatusIndicator.StatusIndicator,
                this._$loadingOverlay,
                {
                    center: true,
                    imageClass: "big-status-progress",
                    message: VSS_Resources_Platform.Loading,
                    throttleMinTime: 0
                });
        }
        this._statusIndicator.delayStart(ProductBacklog.LOADING_OVERLAY_DELAY);
        this._$loadingOverlay.appendTo(Navigation.TriSplitNavigationView.getInstance().getRightPane());
        this._$loadingOverlay.toggleClass("agile-important-hidden", false);

        if (this.addPanel) {
            this.addPanel.disable();
        }
    }

    private _clearLoadingOverlay() {
        if (this.addPanel) {
            this.addPanel.enable();
        }

        this._$loadingOverlay.toggleClass("agile-important-hidden", true);
        this._$loadingOverlay.detach();
        this._statusIndicator.complete();
    }

    public initialize(backlogPayload?: IBacklogPayload) {
        Diag.Debug.assertParamIsNotUndefined(backlogPayload, "backlogPayload");

        super.initialize();

        this._attachReorderRequestComplete();

        this.createMessageArea();

        this._createToastNotification();

        if (!this._options.isNewHub) {
            this.initializeAddPanel();
            this._refreshToolbarCommandStates();
        }

        this._bindFilters();

        this._setupMembershipEvaluation();

        // Initialize forecasting if
        // - enabled
        // - and visible
        //   - or effort data already sent down from client
        const forecastingEnabled = backlogPayload && backlogPayload.queryResults
            && backlogPayload.queryResults.productBacklogGridOptions
            && backlogPayload.queryResults.productBacklogGridOptions.enableForecast;
        const forecastingVisible = backlogPayload && backlogPayload.forecastSettings
            && backlogPayload.forecastSettings.visibleState === ProductBacklog.FILTER_CONSTANT_ON;
        const effortDataAvailable = backlogPayload && backlogPayload.forecastSettings && !!backlogPayload.forecastSettings.effortData;

        if (forecastingEnabled && (forecastingVisible || effortDataAvailable)) {
            Diag.Debug.assertIsNotNull(backlogPayload.forecastSettings.effortData, "Effort data should be sent if forecasting is turned on");
            this._initializeSprintLines();
        }
    }

    public dispose(): void {
        if (this._dataManagerCreated) {
            super.getGridDataManager().detachMoveItems(this._onGridMoveItems);
        }

        if (this._velocityChartControl) {
            this._velocityChartControl.detachEvents();
        }

        if (this._velocityInputControl) {
            this._velocityInputControl.dispose();
            this._velocityInputControl = null;
        }

        if (this._sprintLineManager) {
            this._sprintLineManager.detachLinesUpdated(this.onSprintLineManagerLinesUpdated);
            this._sprintLineManager.dispose();
            this._sprintLineManager = null;
        }

        if (this._sprintLinesViewManager) {
            this._sprintLinesViewManager.dispose();
            this._sprintLinesViewManager = null;
        }

        this._unregisterEvents();

        if (this._dataManagerCreated) {
            const manager = super.getGridDataManager();
            manager.detachMoveItems(this._onGridMoveItems);
        }

        this._backlogContextMenuCreator = null;
        this._mappingPaneHandler = null;
        this._backlogsPanelPivotFilterManager = null;
        this._backlogPayload = null;

        super.dispose();
    }

    /**
     * OVERRIDE: Create Backlog Grid
     */
    public createGrid(options?: any) {
        const gridOptions: TFS_Agile_ProductBacklog_Grid.ProductBacklogGridOptions = this.getGridOptions();

        if (options) {
            $.extend(gridOptions, options.queryResults);
        }

        // Setup grid behaviors
        this._addChildBehavior = this._getAddChildTaskGridBehavior(gridOptions);
        gridOptions.behaviors = [this._addChildBehavior];

        gridOptions.requiredColumnsReferenceNames = this.getRequiredColumns();

        // Add a reference to the reorder manager
        gridOptions.reorderManager = this._reorderManager;
        gridOptions.datasourceName = ProductBacklog.DATASOURCE_NAME;

        // Allow the base class to create the grid.
        const grid = super.createGrid(gridOptions);

        this.createGridReorderBehavior();

        Diag.logTracePoint("ProductBacklog.createGrid.complete");

        return grid;
    }

    public createGridReorderBehavior() {
        this._grid.setGridReorderBehavior(this._createGridReorderBehavior());
    }

    /** Get list of columns required in page data for product backlog operations */
    public getRequiredColumns(): string[] {
        return [WITConstants.CoreFieldRefNames.Id, WITConstants.CoreFieldRefNames.WorkItemType, this._teamSettings.teamFieldName, WITConstants.CoreFieldRefNames.State];
    }

    private _createGridReorderBehavior(): TFS_Agile_ProductBacklog_Grid.IGridReorderBehavior {
        const itemHierarchy = this.getItemHierarchy();
        const topLevel = this._backlogContext.includeParents ? BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels()[0] : this._backlogContext.level;
        return new GridReorderBehavior(
            this._grid,
            this.getSelectionFilter(),
            new TFS_Agile_WorkItemChanges.LocationEnumerator(itemHierarchy),
            new TFS_Agile_WorkItemChanges.LocationValidator(topLevel, itemHierarchy),
            new TFS_Agile_WorkItemChanges.LocationSelector(itemHierarchy),
            this._getBacklogLevelHelper()
        );
    }

    private _setPageTitle(pageTitle: string) {
        Diag.Debug.assertParamIsString(pageTitle, "pageTitle");

        const $titleHeader = $("#backlog-page-title-header");

        $titleHeader.text(pageTitle);
        RichContentTooltip.addIfOverflow(pageTitle, $titleHeader);

        document.title = pageTitle;
    }

    private _createVelocityChart($chartContainer: JQuery, velocityChartOptions: IVelocityChartSettings) {
        this._$velocityChartDiv = $("<div>").addClass("velocity-chart small-chart-container").prependTo($chartContainer);

        const options = {
            ...velocityChartOptions,
            teamId: this._backlogContext.team.id
        };

        this._velocityChartControl = <TFS_Agile_Controls.VelocityChartControl>Controls.Enhancement.enhance(TFS_Agile_Controls.VelocityChartControl, this._$velocityChartDiv, options);
    }

    private _configureCharts(velocityChartOptions: IVelocityChartSettings, cumulativeFlowDiagramChartOptions: TFS_Agile_Controls.ICumulativeFlowSettings) {
        const $chartContainer = $(".small-chart-group-container");

        if (!this._initialPopulationComplete) { // Create charts
            $chartContainer.empty();

            if (velocityChartOptions && this._isRequirementBacklog) {
                this._createVelocityChart($chartContainer, velocityChartOptions);
            }

            const $cfdDiv = $("<div>").addClass("cumulative-flow-chart small-chart-container").appendTo($chartContainer);
            this._cfdChartControl = <TFS_Agile_Controls.CumulativeFlowChartControl>Controls.Enhancement.enhance(TFS_Agile_Controls.CumulativeFlowChartControl, $cfdDiv, cumulativeFlowDiagramChartOptions);
        } else { // Update charts
            const $cfdDiv = $(".cumulative-flow-chart", $chartContainer);

            // NOTE: We are detaching (and later re-attaching) the individual chart elements from the DOM because of a bug in Chrome that doesn't redraw the floating divs properly.
            if (this._$velocityChartDiv) {
                this._$velocityChartDiv.detach();
                this._velocityChartControl.detachEvents();
            }
            $cfdDiv.detach();

            if (velocityChartOptions && this._isRequirementBacklog) {
                if (!this._velocityChartControl) {
                    this._createVelocityChart($chartContainer, velocityChartOptions);
                } else {
                    // Re-attach (see comment above)
                    this._$velocityChartDiv.appendTo($chartContainer);
                    this._velocityChartControl.attachEvents();
                }

                this._velocityChartControl.setIterationsNumber(velocityChartOptions.iterationsNumber);
                this._velocityChartControl.refresh();
            }

            // Re-attach (see comment above)
            $cfdDiv.appendTo($chartContainer);

            this._cfdChartControl.setBacklogLevelId(cumulativeFlowDiagramChartOptions.backlogLevelId);
            const showIncoming = !cumulativeFlowDiagramChartOptions.hideIncoming;
            this._cfdChartControl.setShowIncoming(showIncoming);
            this._cfdChartControl.refresh();
        }
    }

    private _configurePivotViews() {
        if (!this._backlogPivotView) {
            const $backlogPivotView = $(".productbacklog-view-tabs");
            $backlogPivotView.toggleClass("agile-important-hidden", false);

            this._backlogPivotView = TFS_Agile_ContributableTabsUtils.PivotViewHelper.enhanceBacklogPivotView("productbacklog-view-tabs",
                this._backlogContext.level.name, this._backlogContext.includeParents.toString(),
                TFS_Agile_Controls.BacklogViewControlModel.backlogPivot, {
                    level: this._backlogContext.level.name,
                    workItemTypes: this._backlogContext.level.workItemTypes
                });
        }

        // Set up the links for each of the pivot views according to the current backlog context
        const contextData = { level: this._backlogContext.level.name, showParents: this._backlogContext.includeParents };
        const backlogPageActionUrl = TFS_Agile.LinkHelpers.getAsyncBacklogLink(TFS_Agile_Controls.BacklogViewControlModel.backlogPageAction, contextData);
        const boardPageActionUrl = TFS_Agile.LinkHelpers.generateBacklogLink(TFS_Agile_Controls.BacklogViewControlModel.boardPageAction);

        this._backlogPivotView.setViewLink(
            TFS_Agile_Controls.BacklogViewControlModel.backlogPageAction,
            backlogPageActionUrl);

        this._backlogPivotView.setViewLink(
            TFS_Agile_Controls.BacklogViewControlModel.boardPageAction,
            boardPageActionUrl);
    }

    private _areAdvancedBacklogFeaturesEnabledForCurrentHubContext(): boolean {
        return TFS_Agile.areAdvancedBacklogFeaturesEnabled(this._isRequirementBacklog);
    }

    private _configureBacklogsPanelPivotFilters(backlogPayload: IBacklogPayload) {
        // Ensure grid is created before we enhance pivot filters
        if (!this._backlogsPanelPivotFilterManager) {
            const selectedWorkItemIds = (): Events.IBacklogGridItem[] => {
                return this._grid.getSelectedWorkItemIds().map(id => {
                    return {
                        workItemId: id,
                        workItemType: this._grid.getWorkItemTypeNameById(id)
                    };
                });
            };
            this._backlogsPanelPivotFilterManager = new ProductBacklogsPanelPivotFilterManager(backlogPayload.isRootBacklog, this._mappingPaneOptions, selectedWorkItemIds, this._eventHelper);
        } else {
            this._backlogsPanelPivotFilterManager.refreshPivotFilters(backlogPayload.isRootBacklog, this._mappingPaneOptions);
        }
    }

    private _configurePivotFilters(backlogPayload: IBacklogPayload) {
        const $showForecastFilterDiv = $(ProductBacklog.SHOW_FORECAST_FILTER_CLASS);
        if ($showForecastFilterDiv.length > 0) {
            if (backlogPayload.forecastSettings) {
                if (!this._showForecastFilter) {
                    this._showForecastFilter = <Navigation.PivotFilter>Controls.Enhancement.enhance(Navigation.PivotFilter, $showForecastFilterDiv);
                }
                this._showForecastFilter.setSelectedItem((backlogPayload.forecastSettings.visibleState || ProductBacklog.FILTER_CONSTANT_OFF) as Navigation.IPivotFilterItem);
                $showForecastFilterDiv.removeClass("agile-important-hidden");
            } else {
                $showForecastFilterDiv.addClass("agile-important-hidden");
            }
        }

        const $showInProgressFilterDiv = $(ProductBacklog.SHOW_INPROGRESS_FILTER_CLASS);
        if ($showInProgressFilterDiv.length > 0) {
            if (!this._showInProgressFilter) {
                this._showInProgressFilter = <Navigation.PivotFilter>Controls.Enhancement.enhance(Navigation.PivotFilter, $showInProgressFilterDiv);
            }

            // Update tooltip to include mapped in progress states for the current backlog
            const tooltip = Utils_String.format(AgileProductBacklogResources.Tooltip_Backlog_InProgress, this._backlogContext.level.name, backlogPayload.inProgressStates);
            const items: Navigation.IPivotFilterItem[] = this._showInProgressFilter.getItems();
            $.each(items, (index, item) => { item.title = tooltip });
            this._showInProgressFilter.updateItems(items);

            this._showInProgressFilter.setSelectedItem((backlogPayload.backlogContext.showInProgress
                ? ProductBacklog.FILTER_CONSTANT_ON : ProductBacklog.FILTER_CONSTANT_OFF) as Navigation.IPivotFilterItem);

            $showInProgressFilterDiv.removeClass("agile-important-hidden");
        }

        // Set up the 'Show Parents' filter if we're on a non-root backlog.
        const $showParentsFilterDiv = $(ProductBacklog.SHOW_PARENTS_FILTER_CLASS);
        if (!backlogPayload.isRootBacklog) {
            if (!this._showParentsFilter) {
                this._showParentsFilter = <Navigation.PivotFilter>Controls.Enhancement.enhance(Navigation.PivotFilter, $showParentsFilterDiv);
            }

            // Ensure the UI state matches the backlog payload state.
            this._showParentsFilter.setSelectedItem((backlogPayload.backlogContext.includeParents ? ProductBacklog.FILTER_CONSTANT_ON : ProductBacklog.FILTER_CONSTANT_OFF) as Navigation.IPivotFilterItem, /*fireChange*/ false);

            // Set the tooltips.   // TODO: CONSIDER A HELPER IN THE PIVOTFILTER ITSELF TO HELP THINGS LIKE THIS?
            const tooltip = Utils_String.format(AgileProductBacklogResources.Tooltip_Backlog_Parents, this._backlogContext.level.name, this._backlogContext.team.name);
            const items: Navigation.IPivotFilterItem[] = this._showParentsFilter.getItems();
            $.each(items, (index, item) => { item.title = tooltip; });
            this._showParentsFilter.updateItems(items);

            $showParentsFilterDiv.removeClass("agile-important-hidden");

        } else {
            $showParentsFilterDiv.addClass("agile-important-hidden");
        }
    }

    private _configureAgilePortfolioManagementNotification(backlogPayload: IBacklogPayload) {
        const notificationSettings = backlogPayload.agilePortfolioManagementNotificationSettings;
        const $notificationDiv = $(".agile-portfolio-management-notification");

        if (!notificationSettings) {
            $notificationDiv.toggleClass("agile-important-hidden", true);
        } else {
            if (!this._agilePortfolioManagementNotification) {
                this._agilePortfolioManagementNotification = <TFS_UI_Controls_Common.DismissableMessageAreaControl>Controls.Enhancement.enhance(TFS_UI_Controls_Common.DismissableMessageAreaControl, $notificationDiv, notificationSettings);
            } else {
                this._agilePortfolioManagementNotification.reconfigure(notificationSettings);
            }
            $notificationDiv.toggleClass("agile-important-hidden", false);
            this._registerMessageAreaClearing();
        }
    }

    private _configureToolbar() {
        if (!this._toolbar) {
            $(".hub-pivot-toolbar").toggleClass("agile-important-hidden", false);
        } else {
            this._refreshToolbarItems();
        }
    }

    private _configureLeftHandSideViewControls(backlogPayload: any) {
        if (!this._backlogViewControl && !this._sprintViewControl) {
            // Backlog & Sprint View Controls
            const options = {
                isRefreshingDelegate: Utils_Core.delegate(this, this._getIsRefreshing),
                isWorkQueuedDelegate: () => this._reorderManager.numberOfUncommittedChanges(),
                getMessageAreaDelegate: Utils_Core.delegate(this, this.getMessageArea)
            };

            $.extend(options, this.getSprintViewOptions());

            this.setBacklogViewControl(<TFS_Agile_Controls.BacklogViewControl>Controls.Enhancement.enhance(TFS_Agile_Controls.BacklogViewControl, ".team-backlog-view", options));
            this.setSprintViewControl(<TFS_Agile_Controls.SprintViewControl>Controls.Enhancement.enhance(TFS_Agile_Controls.SprintViewControl, ".team-iteration-view", options));
        } else {
            const droppable = this.getSprintViewOptions().droppable;
            this._backlogViewControl.setDroppable(droppable);
            this._sprintViewControl.setDroppable(droppable);
        }
        // TODO: Replace "backlog" with actual values when we have more
        // information on how actionName and currentPageAction are different.
        this._backlogViewControl.reconfigure("backlog", "backlog");
        this._sprintViewControl.reconfigure();
    }

    protected _updateForecastData(backlogPayload: IBacklogPayload) {
        if (!backlogPayload.queryResults.productBacklogGridOptions.enableForecast
            || !backlogPayload.forecastSettings || !backlogPayload.forecastSettings.effortData) {
            if (this._sprintLineManager) {
                // Forecasting was enabled, but is not allowed (anymore), disable
                this._sprintLineManager.setEnabled(false);
                this._sprintLineManager.updateLines(true);
            }

            // If forecasting is not enabled or not data is available, do nothing
            return;
        }

        if (!this._sprintLinesInitialized) {
            this._initializeSprintLines();
        }

        const forecastSettings = backlogPayload.forecastSettings;
        if (forecastSettings && forecastSettings.effortData) {
            this._sprintLineManager.reconfigure(forecastSettings.effortData);
            this._sprintLineManager.updateLines(true);
        }
    }

    /**
     * Refreshes the backlog view
     * @param backlogPayload Backlog payload data
     */
    public refreshProductBacklog(backlogPayload: IBacklogPayload) {
        const backlogContext = TFS_Agile.BacklogContext.getInstance();
        const levelChanged: boolean = (backlogContext.level) && (backlogContext.level.name !== backlogPayload.backlogContext.levelName);

        // Update the stored backlog context.
        backlogContext.setBacklogContextData(backlogPayload.backlogContext);
        this._backlogContext = backlogContext;

        TFS_Agile.BacklogSettings.setBacklogContextWorkItemTypeNames(backlogPayload.backlogContextWorkItemTypeNames);

        // retrieve whether or not this is a requirement backlog for special cased functionality
        this._isRequirementBacklog = backlogContext.isRequirement;

        if (!this._options.isNewHub) {
            // Make sure the URL reflects the incoming backlog context.
            ProductBacklogUrlHelpers.ensureUrlContext(backlogContext);

            this._configureLeftHandSideViewControls(backlogPayload);

            // Cache add panel settings for when it gets created
            this.addPanelSettings = backlogPayload.addPanelSettings;
            this.readAddPanelVisibleSetting();

            this._mappingPaneOptions = backlogPayload.mappingPanel;

            this._setPageTitle(backlogPayload.pageTitle);

            this._configurePivotViews();

            this._configurePivotFilters(backlogPayload);

            this._configureCharts(backlogPayload.velocityChartSettings, backlogPayload.cumulativeFlowDiagramSettings);

            this._configureAgilePortfolioManagementNotification(backlogPayload);

            this._configureToolbar();
        }

        const queryResults: IProductBacklogQueryResult = backlogPayload.queryResults;
        const productBacklogGridOptions = queryResults.productBacklogGridOptions;

        // Add the Order column if applicable
        TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.updatePayloadColumns(productBacklogGridOptions.showOrderColumn, queryResults.columns);

        // Add custom rows to query results if applicable
        $.extend(backlogPayload.queryResults, ProductBacklog._addCustomRows(backlogPayload.queryResults));

        if (!this._initialPopulationComplete) {
            if (this._options.isNewHub) {
                this._backlogPayload = backlogPayload;
            }

            this.createGrid(backlogPayload);
            this._initializeFilter();
            this.initialize(backlogPayload);
        } else {
            if (levelChanged) {
                this._grid.clearPreservedExpandStates();
                this._grid.clearPreservedSelectedWorkItemIds();

                this._detachCommonConfigurationRegistration();
            } else {
                this._grid.preserveExpandStates();
                this._grid.preserveSelectedWorkItemIds();
            }

            // Recreate quick expand behavior
            this.createQuickExpandCollapseBehavior();

            this.getMessageArea().clear();

            // Set up the grid options and data model so that we can update
            // the sprint lines (which depend on the grid), but defer drawing
            // the grid until after we've finished refreshing all the controls

            this._updateGridOptions(backlogPayload);

            this._grid.setReorderState(productBacklogGridOptions.enableReorder);
            this._grid.setReparentState(productBacklogGridOptions.enableReparent);

            this._createBacklogLevelHelper();
            this._createAddPanelBehavior();

            // Recreate reorder behavior
            this.createGridReorderBehavior();

            // Refresh grid behaviors (e.g. apm decomposition)
            const gridOptions = this.getGridOptions();
            if (gridOptions.behaviors) {
                $.each(gridOptions.behaviors, (index: number, behavior: TFS_Agile_ProductBacklog_Grid.IGridBehavior) => {
                    behavior.onPrepareColumns(queryResults.columns, productBacklogGridOptions);
                });
            }

            // Refresh work items displayed in the grid
            this._gridDataManager.setTreeData({
                sourceIds: queryResults.sourceIds.slice(0),
                targetIds: queryResults.targetIds.slice(0),
                linkIds: queryResults.linkIds.slice(0),
                ownedIds: queryResults.ownedIds ? queryResults.ownedIds.slice(0) : null
            });

            this._updateForecastData(backlogPayload);

            // Refresh and draw the grid
            this._grid.updateDataModel(queryResults);

            // Refresh the addpanel
            // This should happen after data manager and grid have been updated
            this._refreshAddPanel(backlogPayload.addPanelSettings);
        }

        if (!this._options.isNewHub) {
            this._configureBacklogsPanelPivotFilters(backlogPayload);
        }

        if (queryResults.querySizeLimitExceeded) {
            const areaSettingsUrl = tfsContext.getActionUrl("", "work", { area: "admin", team: this._backlogContext.team.name, _a: "areas" } as TFS_Host_TfsContext.IRouteData);
            const reduceOwnershipLink = Utils_String.format("<a href='{0}' target='_blank' rel='noopener noreferrer'>{1}</a>", areaSettingsUrl, AgileProductBacklogResources.ReduceAreaOfOwnershipLinkText);
            this.getMessageArea().setMessage($("<span>").html(Utils_String.format(AgileProductBacklogResources.TooManyItemsOnBacklog, reduceOwnershipLink)), Notifications.MessageAreaType.Info);
        }

        // Update forecast state, this has to happen after the data model has been updated, since the forecasting column might be injected
        const showForecast = backlogPayload && backlogPayload.forecastSettings && backlogPayload.forecastSettings.visibleState === ProductBacklog.FILTER_CONSTANT_ON;
        this.toggleShowForecast(showForecast && ProductBacklog.FILTER_CONSTANT_ON || ProductBacklog.FILTER_CONSTANT_OFF);

        // enable or disable drag drop UI.
        if (TFS_Agile.areAdvancedBacklogFeaturesEnabled(this._isRequirementBacklog)) {
            this._grid.enableDragDrop();
        } else {
            this._grid.disableDragDrop();
        }

        // Try to restore selection
        this._grid.restorePreservedSelectedWorkItemIds();

        this._focusBacklogGrid();

        // Show a warning if Bugs are enabled on the backlog and no states are mapped
        // to the Proposed state for the BugWorkItems category
        this._missingProposedStateForBugsWarning();

        // End either refresh or open product backlog
        const perfData = {
            pivot: backlogContext.level.name,
            numberOfWorkItems: this.getGridDataManager().getTreeData().targetIds.length
        };

        if (this._productBacklogPerf) {
            // Backlog refresh
            this._productBacklogPerf.addData(perfData);
            this._productBacklogPerf.end();
            this._productBacklogPerf = null;
        } else {
            const telemetryHelper = PerformanceTelemetryHelper.getInstance(BacklogsHubConstants.HUB_NAME);
            // For new backlogs hub we will have an active perf scenario
            // For legacy Backlogs Hub we start a new one under the old area
            if (!telemetryHelper.isActive() && Performance.getScenarioManager().isPageLoadScenarioActive()) {
                Performance.getScenarioManager().recordPageLoadScenario(
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                    "ProductBacklog.Open",
                    perfData);
            }
        }

        this._initialPopulationComplete = true;
    }

    /* Protected */
    public _updateGridOptions(options: IBacklogPayload) {
        Diag.Debug.assertIsObject(this._gridOptions, "Should not call update before _gridOptions are initialized");

        // TODO: We need to make this more sensible. We shouldn't be relying on both options on the grid and cached version of those on the ProductBacklog.
        $.extend(this._gridOptions, options.queryResults);
        $.extend(this._grid._options, options.queryResults);
    }

    protected _detachCommonConfigurationRegistration() {
        Events_Action.getService().unregisterActionWorker(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, this._onLaunchCommonConfiguration);
        this._commonConfigurationRegistered = false;
    }

    protected _attachCommonConfigurationRegistration() {
        Events_Action.getService().registerActionWorker(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, this._onLaunchCommonConfiguration);
    }

    private _onLaunchCommonConfiguration = (actionArgs, next: Function): void => {
        Service.getService(TeamServices.TeamPermissionService).beginGetTeamPermissions(tfsContext.navigation.projectId, this._backlogContext.team.id)
            .then((permissions: TeamServices.ITeamPermissions) => {
                VSS.using([
                    "Presentation/Scripts/TFS/TFS.Configurations",
                    "Agile/Scripts/Card/CardCustomizationStyle",
                    "Agile/Scripts/Settings/CommonSettingsConfiguration"], (
                        Configuration: typeof Configurations_NO_REQUIRE,
                        StyleCustomization: typeof StyleCustomization_NO_REQUIRE,
                        Agile_Utils_CSC: typeof Agile_Utils_CSC_NO_REQUIRE
                    ) => {
                        const perfScenario = TFS_Agile_Controls.CommonSettingsConfigurationControl.createPerfScenario(TFS_Agile.AgileCustomerIntelligenceConstants.PRODUCT_BACKLOG_VIEW, !this._commonConfigurationRegistered);

                        if (!this._commonConfigurationRegistered) {
                            Configuration.TabControlsRegistration.clearRegistrations(TFS_Agile.TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID);
                            const boardOptions: Board_Settings_Controls_NO_REQUIRE.IBoardSettingTabOptions = {
                                team: this._backlogContext.team,
                                boardIdentity: this._backlogContext.level.name,
                                requireRefreshOnSave: false,
                                isEditable: permissions.currentUserHasTeamAdminPermission
                            };

                            Agile_Utils_CSC.CommonSettingsConfigurationUtils.registerBacklogSettingsForBacklogLevel(this._backlogContext.team.id, boardOptions, permissions);

                            this._commonConfigurationRegistered = true;
                        }

                        actionArgs = $.extend({
                            perfScenario: perfScenario
                        }, actionArgs);
                        next(actionArgs);
                    });
            });
    }

    /**
     * Set a reference to the BacklogViewControl for the current backlog.
     * @param control The BacklogViewControl for the current backlog.
     */
    public setBacklogViewControl(control: TFS_Agile_Controls.BacklogViewControl) {
        this._backlogViewControl = control;
    }

    /**
     * Set a reference to the SprintViewControl for the current backlog.
     * @param control The BacklogViewControl for the current backlog.
     */
    public setSprintViewControl(control: TFS_Agile_Controls.SprintViewControl) {
        this._sprintViewControl = control;
    }

    private _refreshAddPanel(addPanelSettings: any) {
        if (this.addPanel) {
            // need an add panel, we have one so reconfigure it
            this.addPanel.reconfigure(addPanelSettings);
            this.addPanel.render();
            this.addPanel.enable();
            if (this.addPanelVisible) {
                this.addPanel.show(this._grid.getTotalRows() !== 0);
            } else {
                this.addPanel.hide();
            }
        } else {
            // need an add panel, we don't have one so create and enable/show it
            this.initializeAddPanel();
        }
    }

    private _getAddChildTaskGridBehavior(options) {
        const getSupportedBacklogLevel = (workItemType: string): IBacklogLevelConfiguration => {
            // Return the work item category that holds work items that can be children of the specified work item type.
            // Return undefined if:
            //  - the grid is filtering by tags or text
            //  - the grid is showing the sort order column
            //  - the work item does not have a child category

            // check tag/text filtering
            if (this._grid && this._grid.isFiltered()) {
                return;
            }

            if (!this._backlogPayload || !this._backlogPayload.queryResults || this._backlogPayload.queryResults.querySizeLimitExceeded) {
                return;
            }

            return TFS_Agile_Utils.BacklogLevelUtils.getDescendentBacklogLevelConfigurationForWorkItemType(workItemType);
        };

        // Check if the user has advanced backlog features for filtering
        // User needs to have "advanced management" to perform
        // child/parent breakdown and drag/drop re-parent/reorder in a filtered view
        return new AddChildTaskGridBehavior(
            getSupportedBacklogLevel,
            () => this._backlogContext.team.id,
            this._eventHelper,
            this._getParentOptionFields(this._backlogContext.team.id),
            (error: Error) => this.getMessageArea().setError(Utils_String.format(AgileProductBacklogResources.Add_WorkItems_Error, error.message)),
            () => this._areAdvancedBacklogFeaturesEnabledForCurrentHubContext(),
            (workItem: WITOM.WorkItem, parentId: number) => this._initializeNewWorkItem(workItem, parentId)
        );
    }

    protected _initializeNewWorkItem(workItem: WITOM.WorkItem, parentId: number) {
        const isOwned = this._gridDataManager.isOwnedItem(parentId);

        // if parent is unowned, set team and iteration fields to the team defaults
        if (!isOwned) {
            workItem.getField(this._teamSettings.teamFieldName).setValue(this._teamSettings.teamFieldDefaultValue);
            workItem.getField(WITConstants.CoreField.IterationPath).setValue(this._teamSettings.backlogIteration.friendlyPath);
        }

        // clear out the order field
        const orderFieldName = BacklogConfigurationService.getBacklogFieldName(BacklogFieldTypes.Order);
        const field = workItem.getField(orderFieldName);
        if (field) {
            field.setValue("");
        }
    }

    /**
     * OVERRIDE: Ensures that the child view data set is setup in the grid data manager when it is returned.
     * @return
     */
    public getGridDataManager(): TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager {
        const gridDataManager = super.getGridDataManager();

        if (!this._dataManagerCreated) {
            this._dataManagerCreated = true;

            // Setup handler so we get notified when a work item is moved.
            gridDataManager.attachMoveItems(this._onGridMoveItems);
        }

        return gridDataManager;
    }

    private _onGridMoveItems = (source, args) => {
        this._handleMoveWorkItems(args.workItemIds, args.workItemIdsToReparent, args.targetLocation, args.performReorder).then(() => {
            if (args.perfScenario) {
                args.perfScenario.end();
            }
        });

        if (args.performReorder) {
            // TODO: This is a bit cludgy. _postActionCleanup will cause warning messages to be cleared that mapping scenario creates. 
            //        Mapping scenario does not perform a reorder so this covers us.
            this.postActionCleanup();
        }
    }

    /**
     * Persist the column state
     * @param columns List of column definitions
     * @param callback The callback to invoke on completion
     */
    public _saveColumns(columns: Grids.IGridColumn[], callback?: IResultCallback) {
        const columnsJSON = this._serializeGridColumns(columns);
        const gridOptions = this.getGridOptions();

        TFS_OM_Common.ContextUtils.saveTeamUserStringSetting(
            this._backlogContext.team.id, gridOptions.productBacklogGridOptions.columnOptionsKey, columnsJSON, callback);
    }

    /**
     * Persist the column state
     * @param columns List of column definitions
     * @param callback The callback to invoke on completion
     */
    public _saveDialogResultsColumns(columns: IDisplayColumnResult[], callback?: IResultCallback) {

        // Check if dialog results are the same
        if (!super._matchesCurrentColumns(columns)) {
            const columnsJSON = this._serializeGridColumns(columns);
            const gridOptions = this.getGridOptions();

            TFS_OM_Common.ContextUtils.saveTeamUserStringSetting(
                this._backlogContext.team.id, gridOptions.productBacklogGridOptions.columnOptionsKey, columnsJSON, callback);

            //Add telemetry
            TFS_Agile_Utils.TelemetryUtils.recordBoardFieldsUsageChange(CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_PRODUCTBACKLOG_COLUMNSCHANGE, columns);
        }
    }

    /**
     * Refreshes the display
     */
    public _refreshDisplay() {
        // let the dialog finish closing before redirect away to the new URL
        Utils_Core.delay(this, 0, () => {
            const backlogContext = TFS_Agile.BacklogContext.getInstance();

            this._beginGetBacklogPayload(backlogContext.level.name, backlogContext.includeParents);
        });
    }

    private _createToastNotification() {
        // In the old web platform, there is the 'main' container we can use, in the new web platform(2018) we need to use 'body' as there is no 'main'
        const toastNotification = <Notifications.ToastNotification>Controls.BaseControl.createIn(Notifications.ToastNotification, $(".main").length ? $(".main") : $("body"), {
            fadeInTime: ProductBacklog.TOAST_FADE_IN_TIME,
            fadeOutTime: ProductBacklog.TOAST_FADE_OUT_TIME,
            toastTime: ProductBacklog.TOAST_TIME
        });

        Events_Action.getService().registerActionWorker(ProductBacklog.PRODUCT_BACKLOG_TOAST, (args: any) => {
            toastNotification.toast(args.message);
        });
    }

    /** Determine the appropriate Product Backlog toolbar item states (hidden, toggled, enabled, etc.).
     * @override
     */
    protected _getUpdatedToolbarCommandStates(): Menus.ICommand[] {
        return <Menus.ICommand[]>[
            {
                id: Backlog.CMD_TOGGLE_ADD_PANEL,
                toggled: this.addPanelVisible
            },
            {
                id: Backlog.CMD_TOGGLE_FILTER,
                toggled: this._filterManager && this._filterManager.isActive()
            },
            {
                id: Backlog.CMD_EXPAND_ALL,
                disabled: this.isBacklogFiltered()
            },
            {
                id: Backlog.CMD_COLLAPSE_ALL,
                disabled: this.isBacklogFiltered()
            },
            {
                id: Backlog.CMD_EXPAND_ONE_LEVEL,
                disabled: this.isBacklogFiltered()
            },
            {
                id: Backlog.CMD_COLLAPSE_ONE_LEVEL,
                disabled: this.isBacklogFiltered()
            }];
    }

    protected _onFilterChanged() {
        super._onFilterChanged();
        this._refreshShowForecast();
        this._saveAndDisableBacklogComponents();
    }

    /** OVERRIDE: Gets the default backlog query name. */
    public _getBacklogQueryName(): string {
        return TFS_Agile.BacklogQueryManager.getProductBacklogQueryName(
            this._backlogContext,
            this._teamSettings.teamName);
    }

    /**
     * Enables or disables product backlog features based on the state
     * @param states The state of the features
     * @param enableButtons Enable the filter buttons
     */
    public changeComponentStates(states: any, enableButtons: boolean) {
        Diag.Debug.assertParamIsObject(states, "states");
        Diag.Debug.assertParamIsBool(enableButtons, "enableButtons");

        // Toggle the features based on the states
        if (states.forecast) {
            this.toggleShowForecast(states.forecast);
        }
        if (states.reorder) {
            this._grid.setReorderState(states.reorder);
        }

        // Remove or show the filter buttons
        if (enableButtons) {
            $(ProductBacklog.SHOW_FORECAST_FILTER_CLASS).show();
        } else {
            $(ProductBacklog.SHOW_FORECAST_FILTER_CLASS).hide();
        }
    }

    /**
     * Filters and serializes the grid columns in preparation for server persistence
     * 
     * @return JSON string containing column information
     */
    private _serializeGridColumns(columns: Grids.IGridColumn[]): string {
        Diag.Debug.assertParamIsArray(columns, "columns");

        columns = $.map(columns, (column: Grids.IGridColumn): Grids.IGridColumn => {
            switch (column.name) {
                case TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.FORECAST_FIELD_NAME:
                case TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.ORDER_FIELD_NAME:
                case TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.NEW_WORKITEM_FIELD_NAME:
                case BacklogBehaviorConstants.BACKLOG_BUTTONS_COLUMN_NAME:
                    return null;
                default:
                    return column;
            }
        });

        return Utils_Core.stringifyMSJSON(columns);
    }

    /** Updates the add panel state (shown, enabled, etc.) to reflect any changes to the backlog UI (like filtering). */
    protected _updateAddPanelDisabledState = () => {
        if (this.addPanel && this.addPanelVisible) {
            if (this.isBacklogFiltered()) {
                this.addPanel.disable(AgileProductBacklogResources.AddPanel_TitleDisabledWhileFiltering);
            } else {
                this.addPanel.enable();
            }
        }
    }

    /** Re-populate the Product Backlog toolbar items. */
    private _refreshToolbarItems() {
        this._toolbar.updateItems(this._buildToolbarItems());
    }

    /**
     * Hooks up page filter events
     */
    private _bindFilters() {
        const recordTelemetry = (feature: string, settingValue: string): void => {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                feature, { Setting: settingValue }));
        };

        $(ProductBacklog.SHOW_FORECAST_FILTER_CLASS).bind("changed", <any>((sender, item) => {
            const setting = item.value;
            TFS_OM_Common.ContextUtils.saveTeamUserStringSetting(
                this._backlogContext.team.id, BacklogConstants.ShowForecastFilter, setting);
            this.toggleShowForecast(setting);
            recordTelemetry(CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_BACKLOGS_TOOLBAR_FORECASTING, setting);
        }));

        const $showInProgressFilterElement = $(ProductBacklog.SHOW_INPROGRESS_FILTER_CLASS);
        if ($showInProgressFilterElement.length > 0) {
            $showInProgressFilterElement.bind("changed", <any>((sender, item) => {
                this._inProgressFilterChanged(sender, item);
                recordTelemetry(CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_BACKLOGS_TOOLBAR_INPROGRESS, item.value);
            }));
        }

        const $showParentsFilterElement = $(ProductBacklog.SHOW_PARENTS_FILTER_CLASS);
        if ($showParentsFilterElement.length > 0) {
            $showParentsFilterElement.bind("changed", <any>((sender, item) => {
                this._setShowParents(item.value);
                recordTelemetry(CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_BACKLOGS_TOOLBAR_SHOWPARENTS, item.value);
            }));
        }
    }

    /**
     * Send new in progress setting to server and refresh the page
     * @param sender
     * @param item
     */
    protected _inProgressFilterChanged(sender: any, item: any): void {
        // Check for unsaved changes before page refresh
        if (this._reorderManager.numberOfUncommittedChanges() > 0) {
            // Revert selection
            const selectedItem = this._showInProgressFilter.getSelectedItem();
            if (selectedItem.value === ProductBacklog.FILTER_CONSTANT_ON) {
                this._showInProgressFilter.setSelectedItem(ProductBacklog.FILTER_CONSTANT_OFF as Navigation.IPivotFilterItem);
            } else {
                this._showInProgressFilter.setSelectedItem(ProductBacklog.FILTER_CONSTANT_ON as Navigation.IPivotFilterItem);
            }

            this.getMessageArea().setMessage(AgileProductBacklogResources.ProductBacklog_Error_UnsavedChanges);

            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.PRODUCTBACKLOG,
                CustomerIntelligenceConstants.PROPERTYNAME_SWITCH,
                "InProgressFilterWithUnsavedWork"));

            return;
        }
        // Set in progress setting and refresh page
        this._showLoadingOverlay();
        TFS_OM_Common.ContextUtils.saveTeamUserStringSetting(
            this._backlogContext.team.id, this._getInProgressFilterRegKey(), item.value, Utils_Core.delegate(this, this._refreshDisplay));
    }

    /**
     *     Shows a dismissable warning when hiding In Progress items on the requirement backlog with showBugCategoryWorkItem enabled
     *     and there being no states mapped to the Proposed metastate for the BugWorkItems category.
     *     The warning is shown because now any newly created Bugs will disappear from the backlog on a refresh.
     */
    private _missingProposedStateForBugsWarning() {
        const isRequirementBacklkogWithBugCategory = this._isRequirementBacklog && this._teamSettings.showBugCategoryWorkItem === true && !this._bugWorkItemsContainsProposedState();

        if (this._options.isNewHub) {
            const messageId = "tfs-missing-proposed-state-mapping-for-bugs-notification";
            const showInProgressOff = !TFS_Agile.BacklogContext.getInstance().showInProgress;
            if (isRequirementBacklkogWithBugCategory && showInProgressOff) {
                this._options.addMessage({
                    id: messageId,
                    message: AgileProductBacklogResources.MissingProposedStateMapping,
                    messageType: MessageBarType.info,
                    closeable: true,
                    persistDismissal: true
                });
            } else {
                this._options.removeMessage(messageId);
            }
        } else {
            const selectedItem = this._showInProgressFilter.getSelectedItem();
            const showInProgressOff = selectedItem && selectedItem.value === ProductBacklog.FILTER_CONSTANT_OFF;

            if (isRequirementBacklkogWithBugCategory &&
                !TFS_UI_Controls_Common.DismissableMessageAreaControl.isDismissedOnClient(TFS_Agile.NotificationGuids.ProposedStateNotMappedForBugsWarning, TFS_WebSettingsService.WebSettingsScope.User) &&
                showInProgressOff) {
                $(".tfs-missing-proposed-state-mapping-for-bugs-notification").addClass("visible").show();
            } else {
                $(".tfs-missing-proposed-state-mapping-for-bugs-notification").removeClass("visible").hide();
            }
        }
    }

    /**
     *     This function returns true if there is atleast one state mapped to the Proposed metastate for the BugWorkItems category
     *     and false otherwise.
     */
    private _bugWorkItemsContainsProposedState(): boolean {
        // TODO
        //let proposedStatesPresent: boolean = false;

        //if (!processSettings.bugWorkItems || !processSettings.bugWorkItems.states) {
        //    return true;    // If the category itself does not exist the warning would be unnecessary
        //}

        //for (i = 0; i < processSettings.bugWorkItems.states.length; i++) {
        //    if (processSettings.bugWorkItems.states[i].type === TFS_AgileCommon.ProjectProcessConfiguration.StateCategory.Proposed) {
        //        proposedStatesPresent = true;
        //        break;
        //    }
        //}

        //return proposedStatesPresent;

        return false;
    }

    /**
     *     Gets the registry key for the backlog filter setting. IMPORTANT: Make sure the logic here stays in sync with
     *     BacklogControllerHelper.cs::GetInProgressFilterRegKey()
     */
    private _getInProgressFilterRegKey(): string {
        return BacklogConstants.ShowInProgressFilter;
    }

    /** Setup the sprint lines manager and view. */
    protected _initializeSprintLines() {
        if (this._sprintLinesInitialized) {
            return;
        }

        this._sprintLinesInitialized = true;

        const forecastSettings = this._backlogPayload.forecastSettings;
        Diag.Debug.assertParamIsObject(forecastSettings, "forecastSettings");

        // Create sprint line manager
        const teamAwareness = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<TFS_TeamAwarenessService.TeamAwarenessService>(TFS_TeamAwarenessService.TeamAwarenessService);
        this._sprintLineManager = SprintLineManager.createSprintLineManager(
            this.getGridDataManager(),
            teamAwareness.getTeamSettings(this._backlogContext.team.id),
            forecastSettings.effortData,
            (id: number) => {
                return this._isWorkItemIdInRequirementsBacklog(id);
            }
        );
        this._sprintLinesViewManager = new SprintLinesViewManager(this.getGridElement(), this._getSprintLinesManager());

        // Initialize the forecast filter.  This is done first so that the enabled state of the
        // sprint lines manager is set before the lines are updated.
        Controls.Enhancement.getInstance(Navigation.PivotFilter, $(ProductBacklog.SHOW_FORECAST_FILTER_CLASS));

        // If errors occur during updating of sprint lines, ensure the error is surfaced in the message area.
        // NOTE: This is done before creating the input control because we want any errors generated during the initial
        //       sprint lines calculation to be displayed.
        this._sprintLineManager.attachLinesUpdated(this.onSprintLineManagerLinesUpdated);

        // Create the input control.  Doing this will cause the initial velocity to be set.
        this._velocityInputControl = new VelocityInputControl(
            $(".forecasting-input-container"), this._backlogContext.team.id, this._sprintLineManager, forecastSettings ? forecastSettings.velocity : null);
    }

    private onSprintLineManagerLinesUpdated = (sender, args) => {
        if (args.errorMessage) {
            this.getMessageArea().setError(args.errorMessage);
        }
    }

    /**
     * Gets the sprint line manager
     */
    private _getSprintLinesManager(): SprintLineManager {
        if (!this._sprintLineManager) {
            Diag.Debug.fail("SprintLineManager hasn't been created yet");
        }

        return this._sprintLineManager;
    }

    protected _getMappingPaneHandler(): IProductBacklogMappingPaneHandler {
        if (!this._mappingPaneHandler) {
            this._mappingPaneHandler = new ProductBacklogMappingHandlerMultipleItems(
                this.getGridDataManager(),
                this._grid.getRowSavingManager(),
                this._grid,
                this,
                this.getSelectionFilter());
        }

        return this._mappingPaneHandler;
    }

    /** Handles toggling of the 'Show Parents' pivot filter.
     *  @param  value  The new pivot item's value. 
     */
    public toggleShowParents() {
        const currentValue = this._showParentsFilter.getSelectedItem().value;
        const newValue = (currentValue === ProductBacklog.FILTER_CONSTANT_ON) ? ProductBacklog.FILTER_CONSTANT_OFF : ProductBacklog.FILTER_CONSTANT_ON;
        this._setShowParents(newValue);
    }

    /** Handles setting of the 'Show Parents' pivot filter.
     *  @param  value  The new pivot item's value.
     */
    private _setShowParents(value: string) {
        // Prevent toggling if there are uncommitted reordering changes.
        if (this._reorderManager.numberOfUncommittedChanges() > 0) {
            const prevValue = (value === ProductBacklog.FILTER_CONSTANT_ON) ? ProductBacklog.FILTER_CONSTANT_OFF : ProductBacklog.FILTER_CONSTANT_ON;
            this._showParentsFilter.setSelectedItem(prevValue as Navigation.IPivotFilterItem, false);

            this.getMessageArea().setMessage(AgileProductBacklogResources.ProductBacklog_Error_UnsavedChanges);

            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.PRODUCTBACKLOG,
                CustomerIntelligenceConstants.PROPERTYNAME_SWITCH,
                "ShowParentsFilterWithUnsavedWork"));

            return;
        }

        this._showLoadingOverlay();

        let newState = {
            level: this._backlogContext.level.name,
            showParents: (value === ProductBacklog.FILTER_CONSTANT_ON)
        };

        if (Navigation.FullScreenHelper.getFullScreen()) {
            newState = $.extend(newState, Navigation.FullScreenHelper.getUrlData());
        }

        // Navigate; the URL navigation handler will update the MRU setting.
        Navigation_Services.getHistoryService().addHistoryPoint(ProductBacklogConstants.BACKLOG_ACTION, newState);
    }

    /**
     * Switch the current view to show/hide the forecast lines.
     * 
     * @param value The current "behind-the-scenes" value for the show forecast filter
     */
    public toggleShowForecast(value: string) {
        // If Forecast isn't enabled, return;
        if (!this.getGridOptions().productBacklogGridOptions
            || !this.getGridOptions().productBacklogGridOptions.enableForecast
            || !this._backlogPayload.forecastSettings) {
            if (this._velocityInputControl) {
                this._velocityInputControl.getElement().toggleClass("hidden", true);
            }

            return;
        }

        if (value === ProductBacklog.FILTER_CONSTANT_ON
            && !this._backlogPayload.forecastSettings.effortData) {
            // No data for forecasting available, retrieve data for owned items of the requirement level
            const ownedIds = this._getOwnedIdsOfRequirementLevel();
            // Get forecast data
            const forecastPromise = this._beginGetEffortData(ownedIds).then((effortData: IEffortData) => {
                this._backlogPayload.forecastSettings.effortData = effortData;
                this._updateForecastData(this._backlogPayload);

                //.. and show again
                this.toggleShowForecast(value);
            });

            // Accessible loading experience
            ProgressAnnouncer.forPromise(forecastPromise, {
                announceStartMessage: AgileProductBacklogResources.ProductBacklogLoading_ForecastStart,
                announceEndMessage: AgileProductBacklogResources.ProductBacklogLoading_ForecastEnd,
                announceErrorMessage: AgileProductBacklogResources.ProductBacklogLoading_ForecastError
            });

            return;
        }

        if (value === ProductBacklog.FILTER_CONSTANT_OFF && !this._sprintLinesInitialized) {
            return;
        }

        Diag.logTracePoint("ProductBacklog.forecastToggleElement.start");

        const $forecastInputContainer = this._velocityInputControl.getElement();
        const sprintLineManager = this._getSprintLinesManager();

        this.postActionCleanup();

        switch (value) {
            case ProductBacklog.FILTER_CONSTANT_ON:
                $forecastInputContainer.toggleClass("hidden", false);

                // show as disabled if we're currently filtering
                if (this.isBacklogFiltered()) {
                    $forecastInputContainer.toggleClass("disabled", true);
                    sprintLineManager.setEnabled(false);
                } else {
                    // Inject any required columns into the current grid instance
                    this._sprintLinesViewManager.updateGridColumns(this.getGrid(), this._backlogPayload.forecastSettings);

                    sprintLineManager.setEnabled(true);
                    $forecastInputContainer.toggleClass("disabled", false);
                    // Call updateLines here to ensure the error checking is done. Otherwise we could turn on sprint lines and not see any valid errors such as
                    // "No backlog items" or "Velocity is too small to draw sprint lines"
                    sprintLineManager.updateLines(true);
                }
                break;

            case ProductBacklog.FILTER_CONSTANT_OFF:
                // Turn off forecast lines.
                sprintLineManager.setEnabled(false);
                $forecastInputContainer.toggleClass("hidden", true);
                break;

            default:
                Diag.Debug.assert(false, "Forecast filter should only have 'on' and 'off' values");
                break;
        }

        // If the grid has been drawn then we want to resize it to ensure it takes the velocity input control into account.
        const grid = this.getGrid();
        if (grid) {
            grid.resize();
        }

        Diag.logTracePoint("ProductBacklog.forecastToggleElement.complete");
    }

    protected _getOwnedIdsOfRequirementLevel(): number[] {
        let ownedIds = this.getGridDataManager().getOwnedWorkItemIds();

        const requirementLevel = this._getBacklogLevelHelper().getRequirementLevel();
        ownedIds = ownedIds.filter(id => {
            const workItemType = this.getGrid().getWorkItemTypeNameById(id);
            return this._getBacklogLevelHelper().getLevel(workItemType) === requirementLevel;
        });

        return ownedIds;
    }

    /**
     * Updates the Sprint Forecast state.
     */
    protected _refreshShowForecast() {
        const filter = <Navigation.PivotFilter>Controls.Enhancement.getInstance(Navigation.PivotFilter, $(ProductBacklog.SHOW_FORECAST_FILTER_CLASS));
        const filterItemValue = filter && filter.getSelectedItem().value || ProductBacklog.FILTER_CONSTANT_OFF;

        this.toggleShowForecast(filterItemValue);
    }

    protected _getRecycleBinOptions(): IRecycleBinOptions {
        return {
            sourceAreaName: RecycleBinTelemetryConstants.BACKLOG_SOURCE,
            dragDropScope: TFS_Agile.DragDropScopes.WorkItem,
            dataKey: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DATA_WORK_ITEM_IDS,
            notifyPageRefreshRequired: (itemIds: number[]) => {
                return itemIds.some(id => !this.getGridDataManager().isLeafNode(id));
            }
        };
    }

    /**
     * Disables the backlog components (add panel, forecast, drag + drop, expand/collapse all)
     */
    private _saveAndDisableBacklogComponents() {

        if (!this._componentsDisabled) {
            // Disable the features
            this.changeComponentStates({}, true);

            this._componentsDisabled = true;
        }
    }
}

/** Logic to handle reparent events triggered by the mapping pane */
export class ProductBacklogMappingHandlerMultipleItems implements IProductBacklogMappingPaneHandler {
    protected _productBacklog: ProductBacklog;
    protected _dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager;
    protected _rowSavingManager: TFS_RowSavingManager.RowSavingManager;
    protected _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid;
    protected _beginReparentTime: number;
    protected _selectionFilter: TFS_Agile_WorkItemChanges.ISelectionFilter;

    constructor(
        dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager,
        rowSavingManager: TFS_RowSavingManager.RowSavingManager,
        grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid,
        productBacklog: ProductBacklog,
        selectionFilter: TFS_Agile_WorkItemChanges.ISelectionFilter) {
        this._dataManager = dataManager;
        this._rowSavingManager = rowSavingManager;
        this._grid = grid;
        this._productBacklog = productBacklog;
        this._selectionFilter = selectionFilter;
    }

    /**
     * Handle reparenting event
     * @param actionArgs Arguments
     * @param next Function to execute after current handler is finished
     */
    public handle(actionArgs: MappingPanel_NOREQUIRE.IMappingPaneReparentArgs, next?: Function) {
        this._beginReparentTime = Date.now();

        if (!next) {
            next = () => { };
        }

        let workItemIds = actionArgs.workItemIds.filter(id => OrphanGroup.getGroupRow(id) === null);
        workItemIds = this._selectionFilter.filter(workItemIds);

        const newParentId = actionArgs.newParentId;

        if (workItemIds.every(id => this._dataManager.getParentIdFromWorkItemId(id) === newParentId)) {
            // No-op, parent has not changed
            if (next) {
                next();
            }
            return;
        }

        this._markRowsAsSaving(workItemIds);

        if (!this._getBacklogContext().includeParents && !actionArgs.forceRefresh) {
            // No parents are displayed, grid does not need to be updated
            this._reparentItemsAndComplete(workItemIds, newParentId, next);
            return;
        }

        // Is parent already in grid?
        if (this._dataManager.getWorkItemTreeIndex(newParentId) >= 0) {
            // New parent is already in grid, just reparent and update
            this._reparentItemsAndComplete(workItemIds, newParentId, next, () => {
                this._updateGridAfterReparenting(workItemIds, newParentId);
            });
            return;
        }

        // New parent is not in grid, run query to get parents hierarchy from new parent up
        this._beginGetParentHierarchy(
            newParentId,
            (parentQueryResult) => {
                const workItemTypeIndex = ProductBacklog.findColumnIndex(parentQueryResult.payload.columns, WITConstants.CoreFieldRefNames.WorkItemType);

                // Some levels of the retrieved parent hierarchy might be hidden or not in the grid. If the new parent
                // is in one of those levels, do not add anything new to the grid, just reparent.
                const rootItemLevel = this._getRootItemLevel();

                // Check starting from the highest node whether one of them is already
                // in the tree so that we can add unter it.
                let hierarchyParentId: number = null;
                let insertParentIndex: number = null;
                for (let i = 0; i < parentQueryResult.targetIds.length; ++i) {
                    const newParentItemType = parentQueryResult.payload.rows[i][workItemTypeIndex];
                    const newParentLevel = this._getLevelForType(newParentItemType);

                    if (rootItemLevel > newParentLevel) {
                        // Item cannot be added to current grid, skip item and and new item under root
                        hierarchyParentId = 0;
                        insertParentIndex = i + 1;
                    }

                    const itemId = parentQueryResult.targetIds[i];
                    if (typeof this._dataManager.getWorkItemTreeIndex(itemId) !== "undefined") {
                        // Item is in tree start inserting at the next item
                        insertParentIndex = i + 1;
                    }
                }

                if (insertParentIndex === null) {
                    // The parent hierarchy cannot be added to any existing item in the tree. It can either be added to the root, or
                    // we might need to find/insert 'unparented' nodes
                    const rootParentItemType = parentQueryResult.payload.rows[0][workItemTypeIndex];
                    const rootParentItemLevel = this._getLevelForType(rootParentItemType);

                    if (rootParentItemLevel !== rootItemLevel) {
                        // Parent hierarchy cannot be added to the grid at root level, try to find appropriate unparented node
                        // for the level of the root
                        this._getOrAddUnparentedRow(rootParentItemLevel);
                    }

                    insertParentIndex = 0;
                }

                // Iterate over parents in order, adding them one by one to the grid
                let itemAddedToGrid: boolean = false;
                let parentId = hierarchyParentId !== null ? hierarchyParentId : parentQueryResult.sourceIds[insertParentIndex];
                for (let i = insertParentIndex; i < parentQueryResult.targetIds.length; ++i) {
                    const itemId = parentQueryResult.targetIds[i];
                    const newOrder = this._dataManager.getMaxOrder() + 1;

                    // Add work item to the data manager and also insert the page data to the grid
                    this._dataManager.addWorkItem(itemId, newOrder, null, parentId, false /* Do not refresh grid */);
                    this._addWorkItemPageDataToGrid(itemId, parentQueryResult.pageColumns, parentQueryResult.payload.rows[i]);

                    itemAddedToGrid = true;

                    parentId = itemId;
                }

                // The new parent is now added to the grid, get its position and move the children under it
                this._reparentItemsAndComplete(
                    workItemIds, newParentId, next, () => {
                        if (itemAddedToGrid) {
                            this._updateGridAfterReparenting(workItemIds, newParentId);
                        }
                    });
            });
    }

    private _updateGridAfterReparenting(workItemIds: number[], newParentId: number): void {
        // Some workitems may have been removed by ownership rules after save
        const visibleWorkItems = Utils_Array.intersect(this._dataManager.getWorkItemIds(), workItemIds);
        if (visibleWorkItems.length > 0) {
            this._grid.performActionWithPreserveSelection(() => this._dataManager.reparentWorkItems(visibleWorkItems, newParentId, true, false /* don't reorder */));
        }
    }

    /** Run a query to get the (visible) parent hierarhchy */
    protected _beginGetParentHierarchy(parentId: number, callback: (queryResult: IQueryResult) => void) {
        const query = this._buildParentHierarchyQuery(parentId);

        this._getWorkItemStore().beginGetProject(
            tfsContext.navigation.projectId,
            (project: WITOM.Project) => {
                project.beginQuery(
                    query,
                    callback,
                    this._errorHandler,
                    {
                        runQuery: true,
                        includePayload: true
                    });
            },
            this._errorHandler);
    }

    /** Reparent work items and clear any saving indicators */
    protected _reparentItemsAndComplete(workItemIds: number[], newParentId: number, next?: Function, callback?: () => void) {
        this._beginReparentWorkItems(workItemIds, newParentId).then((savedWorkItemIds: number[]) => {
            if ($.isFunction(callback)) {
                callback();
            }

            this._clearRowsSaving(savedWorkItemIds);

            this._showMappingToast(workItemIds, newParentId);

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                workItemIds.length > 1 ?
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_MULTISELECT_MAPPINGPANEREPARENT :
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_MAPPINGPANEREPARENT,
                {
                    NewParentWorkItemType: this._grid.getWorkItemTypeNameById(newParentId),
                    NumberOfSelectedItems: workItemIds.length
                },
                this._beginReparentTime));

            this._beginReparentTime = null;  // For safety, to ensure we never mix up timestamps.

            if ($.isFunction(next)) {
                next();
            }
        }, this._errorHandler);
    }

    /** Raise backlog error message */
    protected _errorHandler() {
        Events_Action.getService().performAction(TFS_Agile.Actions.BACKLOG_SHOW_ERROR_MESSAGE, {
            message: AgileProductBacklogResources.ProductBacklog_MappingPane_Error
        });
    }

    /** Show toast, afer a workitem has been mapped */
    protected _showMappingToast(workItemIds: number[], newParentId: number) {
        Diag.Debug.assertIsArray(workItemIds, "workItemIds");
        Diag.Debug.assertIsNumber(newParentId, "newParentId");

        const workItemManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore));
        let title: string;
        let parentTitle: string;

        const sync = () => {
            if (workItemIds.length === 1 && title && parentTitle) {
                Events_Action.getService().performAction(ProductBacklog.PRODUCT_BACKLOG_TOAST, {
                    message: ProductBacklog.createReparentToast(parentTitle, title)
                });
            } else if (workItemIds.length > 1 && parentTitle) {
                Events_Action.getService().performAction(ProductBacklog.PRODUCT_BACKLOG_TOAST, {
                    message: ProductBacklog.createReparentToast(parentTitle, workItemIds.length)
                });
            }
        }

        // If there is only a single work item being reparented, show its title in toast, otherwise display a generic message
        if (workItemIds && workItemIds.length === 1) {
            // Get the child (99% of the time this will be synchronous)
            workItemManager.beginGetWorkItem(workItemIds[0], (workItem) => {
                title = workItem.getFieldValue(WITConstants.CoreFieldRefNames.Title);
                sync();
            });
        }

        // Get the parent (99% of the time this will be synchronous)
        workItemManager.beginGetWorkItem(newParentId, (workItem) => {
            parentTitle = workItem.getFieldValue(WITConstants.CoreFieldRefNames.Title);
            sync();
        });
    }

    /** Reparent work items to a new parent */
    protected _beginReparentWorkItems(workItemIds: number[], newParentId: number): IPromise<number[]> {
        const deferred = Q.defer<number[]>();

        const workItemManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore));

        const handleError = (message: string) => {
            // Display the error message in the status area.
            this._productBacklog.getMessageArea().setError(message, () => {
                window.location.reload();
            });

            this._clearRowsSaving(workItemIds);
        };

        // Open each work item, and change the parent link to the new parent
        workItemManager.beginGetWorkItems(workItemIds,
            (workItems) => {
                // Change parent link for each workitem
                for (let workItem of workItems) {
                    WorkItemUtils.reparentWorkItem(workItem, newParentId);
                }

                workItemManager.store.beginSaveWorkItemsBatch(workItems, (result: WITOM.IWorkItemsBulkSaveSuccessResult) => {
                    deferred.resolve(result.workItems.map(x => x.id));
                }, (error) => {
                    // Raise error event?
                    handleError(Utils_String.format(AgileProductBacklogResources.StatusMessage_FatalError, error.message));

                    deferred.reject(error);
                });
            },
            (error) => {
                handleError(Utils_String.format(AgileProductBacklogResources.StatusMessage_FatalError, error.message));

                deferred.reject(error);
            });

        return deferred.promise;
    }

    /** Return a query to retrieve the parent hierarchy for an item, including the current grid's page columns */
    protected _buildParentHierarchyQuery(workItemId: number) {
        const columns = Utils_Array.unique(this._productBacklog.getRequiredColumns().concat(this._grid.getPageColumns()));

        // Get valid work item types in current hierarchy
        let workItemTypes: string[] = [];

        BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels().forEach(backlogLevelConfig => {
            workItemTypes = workItemTypes.concat(backlogLevelConfig.workItemTypes);
        });

        return Utils_String.format("SELECT {0} FROM WorkItemLinks WHERE [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward' AND [Source].[System.WorkItemType] IN ({1}) AND [Target].[System.Id] = {2} MODE(Recursive, ReturnMatchingChildren)",
            $.map(columns, columnName => "[" + columnName + "]").join(","),
            Utils_Array.unique(workItemTypes, Utils_String.localeIgnoreCaseComparer).map(x => "'" + x + "'").join(","),
            workItemId);
    }

    protected _addWorkItemPageDataToGrid(workItemId: number, pageColumns: string[], pageData: any[]) {
        this._grid.addWorkItemPageData(workItemId, pageColumns, pageData);
    }

    protected _getWorkItemStore(): WITOM.WorkItemStore {
        const workItemManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore));

        return workItemManager.store;
    }

    protected _getOrAddUnparentedRow(level: number): number {
        return this._productBacklog.getOrAddUnparentedRow(level);
    }

    protected _markRowsAsSaving(workItemIds: number[]) {
        for (let workItemId of workItemIds) {
            this._rowSavingManager.markRowAsSaving(workItemId);
        }
    }

    protected _clearRowsSaving(workItemIds: number[]) {
        for (let workItemId of workItemIds) {
            this._rowSavingManager.clearRowSaving(workItemId);
        }
    }

    protected _getBacklogContext(): TFS_Agile.BacklogContext {
        return TFS_Agile.BacklogContext.getInstance();
    }

    /** Return the backlog level of the first item in the product backlog grid */
    protected _getRootItemLevel(): number {
        const rootItemType = this._grid.getWorkItemTypeNameByIndex(0);
        return this._getLevelForType(rootItemType);
    }

    protected _getLevelForType(workItemType: string): number {
        const backlogLevelHelper = new TFS_Agile_WorkItemChanges.BacklogLevelHelper();
        return backlogLevelHelper.getLevel(workItemType);
    }
}

VSS.initClassPrototype(ProductBacklog, {
    _addPanel: null,
    _backlogSearchControl: null,
    _dataManagerCreated: false,
    _sprintLineManager: null,
    _sprintLinesViewManager: null,
    _reorderOperationQueue: null
});