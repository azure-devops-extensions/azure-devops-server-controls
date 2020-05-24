/// <reference types="jquery" />
import Q = require("q");

import TFS_Agile_ProductBacklog_Grid = require("Agile/Scripts/Backlog/ProductBacklogGrid");
import Agile = require("Agile/Scripts/Common/Agile");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import AgileProductBacklogResources = require("Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog");
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import CoreAjax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Splitter = require("VSS/Controls/Splitter");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Telemetry = require("VSS/Telemetry/Services");
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import QueryResultGrid = require("WorkItemTracking/Scripts/Controls/Query/QueryResultGrid");
import WorkItemsProvider = require("WorkItemTracking/Scripts/Controls/WorkItemsProvider");
import WITInterfaces_NO_REQUIRE = require("WorkItemTracking/Scripts/OM/QueryInterfaces");
import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");


// Important: Only use type information from the imports. 
// Otherwise it will be a real dependency and break the async loading.
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var delegate = Utils_Core.delegate;

var __mappingPanel: ProductBacklogMappingPanel;

/**
 * Create or refresh mapping panel
 * 
 * @param options Mapping panel options
 */
export function createOrRefreshMappingPanel(options: IMappingPanelOptions) {
    if (!__mappingPanel) {
        __mappingPanel = <ProductBacklogMappingPanel>Controls.Enhancement.enhance(ProductBacklogMappingPanel, $(".backlogs-default-tool-panel-container"), options);
    }
    else {
        __mappingPanel.refresh(options);
    }
}

/**
 * Options used by the mapping panel.
 */
export interface IMappingPanelOptions {
    /** Name of category the mapping pane should show */
    categoryPluralName: string;
    setFocus: boolean;
    /** ScopedEventsHelper for dispose */
    eventHelper: ScopedEventHelper;

    /** Announcer for accessible loading experience */
    announcer?: ProgressAnnouncer;
}

/** Event arguments for the MAPPING_PANE_REPARENT event */
export interface IMappingPaneReparentArgs {
    /** Ids of work items to reparent */
    workItemIds: number[];

    /** New parent to map the work item(s) identified by childId(s) to */
    newParentId: number;

    /** This will force the grid to refresh. Otherwise the changes take effect only when showParents is enabled */
    forceRefresh?: boolean;
}

export class ProductBacklogMappingPanel extends Controls.BaseControl {

    // Constants
    public static CSS_CLASS = "product-backlog-mapping-panel";
    public static CSS_PIVOT_FILTER: string = "team-filter";
    public static CSS_GRID: string = "query-result-grid";
    public static CSS_SELECTOR_STATUS_INDICATOR = ".product-backlog-mapping-panel-status-indicator";
    public static MAPPING_PANE_INITIALIZED_EVENT = "mapping-pane-initialized-event";
    public static CMD_REFRESH = "refresh";

    public static enhancementTypeName = "tfs.Agile.ProductBacklog.MappingPanel";
    private static BROWSE_ALL_ID = -1;
    private static MRU_SIZE = 5;
    private static SPLITTER_MIN_WIDTH = 210;

    // Fields
    private _mappingOptions: IMappingPanelOptions;
    private _grid: QueryResultGrid.QueryResultGrid;
    private _dropdown: Navigation.PivotFilter;
    private _selectedTeam: Agile.ITeamMruEntry;
    private _teamsMru: Agile.ITeamMruEntry[];
    private _panelInitialized: boolean;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _eventHelper: ScopedEventHelper;
    private _initializationStartTime: number;

    constructor(options?) {
        super(options);
        this._eventHelper = options.eventHelper
    }

    public initialize() {
        super.initialize();

        this._panelInitialized = false;

        this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.Enhancement.enhance(
            StatusIndicator.StatusIndicator,
            $(ProductBacklogMappingPanel.CSS_SELECTOR_STATUS_INDICATOR, this.getElement()),
            {
                center: true,
                imageClass: "big-status-progress"
            });

        this._mappingOptions = <IMappingPanelOptions>this._options;

        this._initializeInternal();
    }

    /**
     * Refresh the mapping panel with the provided options
     */
    public refresh(options: IMappingPanelOptions) {
        if (this._options) {
            this._options.setFocus = options.setFocus;
            this._options.announcer = options.announcer;
        }

        this._setTitle(options.categoryPluralName);
        this._grid.refresh();
        this._initializeInternal(options);
    }

    private _initializeInternal(options?: IMappingPanelOptions) {
        // The mapping pane content can be initialized in 2 ways. 
        //      1. The page loaded with the mapping pane turned on and the registerEnhancement at the bottom of this page runs. In
        //         this case options.isVisible will be true and we will enter this function.
        //      2. The mapping pane was not turned on with page load and a manual pivot filter change triggered the display. In this case
        //         we use the _panelInitialized flag to ensure we dont attempt initialization more than once.
        if (this._panelInitialized) {
            return;
        }

        // Record & publish the full initialization time.
        this._initializationStartTime = Date.now();
        this._eventHelper.attachEvent(ProductBacklogMappingPanel.MAPPING_PANE_INITIALIZED_EVENT, this._publishTelemetry);

        if (Agile.IsWebAccessAsyncEnabled()) {
            if (options) {
                this._mappingOptions = options;
            }

            this._setTitle(options ? options.categoryPluralName : this._mappingOptions.categoryPluralName);
        }

        this._setSplitterMinWidth();

        this._grid = <QueryResultGrid.QueryResultGrid>Controls.Enhancement.ensureEnhancement(QueryResultGrid.QueryResultGrid, $(".query-result-grid", this.getElement()));
        this._grid.setBeforeOpenWorkItemCallback(() => WITDialogShim.prefetchFormModules());

        this._createToolbar();

        this._setupGrid();
        this._panelInitialized = true;

        //register the shortcuts for the grid
        new QueryResultGrid.QueryResultGridShortcutGroup(AgileProductBacklogResources.KeyboardShortcutGroup_Backlog, this._grid);
    }

    private _publishTelemetry = (): void => {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_MAPPINGPANEL_INITIALIZED,
                {}, this._initializationStartTime));
    }

    private _setTitle(title: string) {
        var $titleDiv = $(".mapping-pane-title", this.getElement());
        $titleDiv.text(title);
        RichContentTooltip.addIfOverflow(title, $titleDiv);
    }

    /**
     * Set splitter's min width
     */
    private _setSplitterMinWidth() {
        var splitter = <Splitter.Splitter>Controls.Enhancement.ensureEnhancement(Splitter.Splitter, $(".right-hub-splitter"));

        if (Boolean(splitter)) {
            splitter.setMinWidth(ProductBacklogMappingPanel.SPLITTER_MIN_WIDTH);
        }
    }

    /**
     * Creates the toolbar
     */
    private _createToolbar() {
        Controls.BaseControl.createIn(Menus.MenuBar, $(".toolbar", this.getElement()), {
            items: this._createToolbarItems(),
            executeAction: delegate(this, this._onToolbarItemClick)
        });
    }

    /**
     * Handler for common toolbar menu item click
     * 
     * @param e Event args
     */
    protected _onToolbarItemClick(e?: any) {
        Diag.Debug.assertParamIsObject(e, "e");

        var command = e.get_commandName();

        if (command === ProductBacklogMappingPanel.CMD_REFRESH) {
            this._grid.refresh();
        }
    }

    /**
     * Creates the toolbar items
     */
    private _createToolbarItems(): Menus.IMenuItemSpec[] {

        return [
            { id: ProductBacklogMappingPanel.CMD_REFRESH, showText: false, icon: "bowtie-icon bowtie-navigate-refresh", title: AgileProductBacklogResources.MappingPane_Refresh }
        ];
    }

    private _setupDropdown(options: IMappingPanelResultOptions) {

        // translate the teamsMru from the server to ITeamMruEntry[]
        this._teamsMru = $.map(options.teamsMru, (item) => {
            return {
                selected: false,
                text: item.teamName,
                title: item.teamName,
                value: item.teamId
            };
        });

        this._updateDropdown();

        // setup selection handler
        this._dropdown.getElement().bind("changed.VSS.Agile", delegate(this, this._onDropdownChanged));
    }

    private _setupGrid() {
        this._setupGridOptions();
        this._setupDataProvider();

        this._fixGridHeight();
        this._bind(window, "resize", delegate(this, this._fixGridHeight));
    }

    private _setupGridOptions() {
        var droppableOptions = {
            hoverClass: "mapping-panel-portfolio-row-drop-active", // override default grid hoverClass,
            scope: Agile.DragDropScopes.ProductBacklog,
            tolerance: "pointer",
            accept: delegate(this, this._dropAcceptHandler),
            drop: delegate(this, this._drop)
        };

        this._grid.setupDragDrop(undefined, droppableOptions);
    }

    /**
     * Calculate the grid height
     */
    private _fixGridHeight() {

        var $gridElement = this._grid.getElement(),
            $contentElement = $gridElement.parent(),
            totalHeight = $contentElement.height(),
            siblingsHeight = 0;

        // remove the height of the siblings
        $gridElement.siblings(":visible").not(".status-indicator").each(function () {
            var $element = $(this);
            siblingsHeight += $element.outerHeight(true);
        });

        $gridElement.height(totalHeight - siblingsHeight);
    }

    /** Public for unit testing purposes */
    public _updateOptions(options: IMappingPanelResultOptions) {
        // Default to default team
        Diag.Debug.assert(options.teamsMru && options.teamsMru.length > 0, "Expected at least one team");
        if (options.teamsMru && options.teamsMru.length > 0) {
            var defaultTeam = options.teamsMru[0];
            this._selectedTeam = {
                selected: true,
                text: defaultTeam.teamName,
                title: defaultTeam.teamName,
                value: defaultTeam.teamId
            };

            if (!this._dropdown) {
                this._dropdown = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(".team-filter", this.getElement()));
                this._setupDropdown(options);
                this._dropdown.getElement().removeClass("agile-important-hidden");
            }
        }
    }

    private _setupDataProvider() {
        var dataProvider = new MappingDataProvider(
            () => { // Delegate to get selected team
                if (this._selectedTeam) {
                    return this._selectedTeam.value;
                }
                return null;
            },
            () => { // Executes before attempting to retrieve query results
                this._grid.getElement().hide();
                this._statusIndicator.delayStart(500);
                if (this._options && this._options.setFocus) {
                    this._grid.focus(0);
                }
            },
            (options?: IMappingPanelResultOptions) => { // Executes after retrieving query results
                if (options) {
                    this._updateOptions(options);
                    if (this._options && this._options.setFocus) {
                        this._grid.focus(0);
                    }
                }

                this._statusIndicator.complete();
                this._grid.getElement().show();

                if (this._options.announcer) {
                    this._options.announcer.announceCompleted();
                }

                this._eventHelper.fire(ProductBacklogMappingPanel.MAPPING_PANE_INITIALIZED_EVENT);
            });

        this._grid.beginShowResults(dataProvider as any);
    }

    /**
     * Determines if the items being dragged can be dropped on the row.
     * 
     * @param $element Element being dropped.
     */
    private _dropAcceptHandler($element: JQuery) {
        Diag.Debug.assertParamIsObject($element, "$element");

        var dragWorkItemTypes = this._getDraggingWorkItemTypes($element),
            backlogWorkItemTypes = Agile.BacklogSettings.getBacklogContextWorkItemTypeNames();

        return dragWorkItemTypes && dragWorkItemTypes.length &&
            dragWorkItemTypes.every(dragWorkItemType => Utils_Array.contains(backlogWorkItemTypes, dragWorkItemType, Utils_String.localeIgnoreCaseComparer));
    }

    /**
     * Gets the work item types of the items currently being dragged.
     * 
     * @param $element Element from in the grid
     *
     * @returns
     */
    private _getDraggingWorkItemTypes($element: JQuery): string[] {
        Diag.Debug.assertParamIsObject($element, "$element");

        var draggingGrid = <TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid>Controls.Enhancement.getInstance(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid, $element.parents(".grid:first"));

        if (draggingGrid) {
            var selectedWorkItemIds = draggingGrid.getSelectedWorkItemIds();

            var filteredWorkItemIds = <number[]>Events_Action.getService().performAction(Agile.Actions.BACKLOG_FILTER_SELECTION, <Agile.IBacklogFilterWorkItemsActionArgs>{
                selectedWorkItemIds: selectedWorkItemIds
            });

            return (filteredWorkItemIds || selectedWorkItemIds).map(id => draggingGrid.getWorkItemTypeNameById(id));
        }

        return null;
    }

    /**
     * Invoked when items are dropped on the mapping grid.  Will update the parent link of the dropped item.
     * 
     * @param $element Element being dropped.
     */
    private _drop(event: any, ui: any) {
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(ui, "ui");

        // Indicate that the drop was successful
        ui.helper.data(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DROP_SUCCESSFUL, true);

        var workItemIds = ui.helper.data(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DATA_WORK_ITEM_IDS);

        // Get id of new parent from local grid
        var dropWorkItemId = this._grid.getRowData(ui.droppingRowInfo.dataIndex);

        Events_Action.getService().performAction(
            Agile.Actions.MAPPING_PANE_REPARENT,
            <IMappingPaneReparentArgs>{ workItemIds: workItemIds, newParentId: dropWorkItemId });
    }

    /**
     * Updates the items in the dropdown
     * 
     * @param selectedTeam The team to be selected
     */
    private _updateDropdown(selectedTeam?: Agile.ITeamMruEntry) {
        var values = [],
            map = {};

        if (selectedTeam) {
            values.push(selectedTeam);
            map[selectedTeam.value.toUpperCase()] = true;
        }

        $.each(this._teamsMru, (index: number, item: Agile.ITeamMruEntry) => {
            if (!map[item.value.toUpperCase()]) {
                map[item.value.toUpperCase()] = true;
                item.selected = false;
                values.push(item);
            }
        });

        // prune the list to allowed size
        while (values.length > ProductBacklogMappingPanel.MRU_SIZE) {
            values.pop();
        }

        // store the new list order
        this._teamsMru = values.slice(0);

        values.push({ separator: true });

        // add the Browse all button
        values.push({
            selected: false,
            text: VSS_Resources_Common.BrowseAllTeams,
            title: VSS_Resources_Common.BrowseAllTeams,
            value: ProductBacklogMappingPanel.BROWSE_ALL_ID
        });

        this._dropdown.updateItems(values);
        this._selectedTeam = <Agile.ITeamMruEntry>this._dropdown.getSelectedItem();
    }

    private _onDropdownChanged() {
        if (this._dropdown.getSelectedItem().value === ProductBacklogMappingPanel.BROWSE_ALL_ID) {
            // Revert the selection back to the previously selected team.
            // In the event that the user cancels/dismisses the dialog, we do nothing.

            this._dropdown.setSelectedItem(this._selectedTeam, false);
            VSS.using(['Admin/Scripts/TFS.Admin.Dialogs', 'Admin/Scripts/TFS.Admin.Controls'], (AdminDialogs, AdminControls) => {
                Dialogs.show(AdminDialogs.TeamPickerDialog, {
                    okCallback: (team) => {
                        var selectedTeam = {
                            text: team.name,
                            value: team.tfid,
                            selected: false,
                            title: team.name
                        };
                        this._updateDropdown(selectedTeam);
                        this._grid.refresh();
                    },
                    selectedTeam: this._selectedTeam.text
                });
            });
        }
        else {

            // Store the new selected team, and update the drop down order.
            this._selectedTeam = <Agile.ITeamMruEntry>this._dropdown.getSelectedItem();
            this._updateDropdown(this._selectedTeam);
            this._grid.refresh();
        }
    }
}

export interface IMappingPanelResultOptions {
    /** MRU team list */
    teamsMru: Agile.ITeamMruItem[];
}

export interface IMappingPaneResultModel extends WITInterfaces_NO_REQUIRE.IQueryResult, IMappingPanelResultOptions {
}

export interface IMappingPanelRequestParams {
    backlogTeamId: string;
    childBacklogLevelId: string;
}

export class MappingDataProvider extends WorkItemsProvider.WorkItemsProvider {

    private _getSelectedTeam: () => string;
    private _onBeforeGetResults: () => void;
    private _onAfterGetResults: (options?: IMappingPanelResultOptions) => void;
    private _backlogContext: Agile.BacklogContext;

    constructor(getSelectedTeam: () => string, onBeforeGetResults?: () => void, onAfterGetResults?: (options?: IMappingPanelResultOptions) => void) {
        Diag.Debug.assertParamIsNotNull(getSelectedTeam, "getSelectedTeam");

        super();
        this._backlogContext = Agile.BacklogContext.getInstance();
        this._getSelectedTeam = getSelectedTeam;
        this._onBeforeGetResults = onBeforeGetResults;
        this._onAfterGetResults = onAfterGetResults;
    }

    public beginGetResults(callback: IResultCallback, errorCallback?: IErrorCallback) {
        if ($.isFunction(this._onBeforeGetResults)) {
            this._onBeforeGetResults();
        }

        const handleComplete = (options?: IMappingPanelResultOptions) => {
            if ($.isFunction(this._onAfterGetResults)) {
                this._onAfterGetResults(options);
            }
        };

        const params: IMappingPanelRequestParams = {
            childBacklogLevelId: this._backlogContext.level.id,
            backlogTeamId: this._getSelectedTeam() || undefined
        };

        MappingDataProvider.getMappingPaneQueryResults(this._backlogContext.team.id,  params).then(
            (data: IMappingPaneResultModel) => {
                callback.call(this, data);
                handleComplete(data);
            },
            (error: Error) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(error);
                }

                handleComplete();

                // Broadcast the error so it can be displayed.
                Events_Action.getService().performAction(Agile.Actions.BACKLOG_ERROR, error);
            }
        );
    }

    public static getMappingPaneQueryResults(teamId: string, params: IMappingPanelRequestParams): IPromise<IMappingPaneResultModel> {
        const deferred = Q.defer<IMappingPaneResultModel>();

        CoreAjax.getMSJSON(
            tfsContext.getActionUrl('mappingPaneQueryResultModel', 'backlog', { area: 'api', teamId } as TFS_Host_TfsContext.IRouteData),
            params,
            deferred.resolve,
            deferred.reject
        );

        return deferred.promise;
    }
}