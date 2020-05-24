/// <reference types="jquery" />

import * as VSS from "VSS/VSS";
import * as Diag from "VSS/Diag";
import * as Controls from "VSS/Controls";
import * as Utils_UI from "VSS/Utils/UI";
import * as Grids from "VSS/Controls/Grids";
import * as Menus from "VSS/Controls/Menus";
import * as Performance from "VSS/Performance";
import * as Telemetry from "VSS/Telemetry/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import * as Events_Handlers from "VSS/Events/Handlers";

import * as Events from "Agile/Scripts/Backlog/Events";
import * as TFS_Agile from "Agile/Scripts/Common/Agile";
import * as TFS_Agile_ProductBacklog_DM from "Agile/Scripts/Backlog/ProductBacklogDataManager";
import * as TFS_Agile_WorkItemChanges from "Agile/Scripts/Common/WorkItemChanges";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_RowSavingManager from "Presentation/Scripts/TFS/FeatureRef/RowSavingManager";
import { RecycleBinTelemetryConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WITDialogShim from "WorkItemTracking/SharedScripts/WorkItemDialogShim";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { WorkItemTypeColorAndIcons, WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { QueryAdapter } from "WorkItemTracking/Scripts/OM/QueryAdapter";
import { FilterManager } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import { IQueryDisplayColumn } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import * as QueryResultGrid from "WorkItemTracking/Scripts/Controls/Query/QueryResultGrid";
import { TempQueryUtils } from "WorkItemTracking/Scripts/Utils/TempQueryUtils";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";

QueryResultGrid.registerEnhancements();

// Resources and constants
import AgileProductBacklogResources = require("Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { ITeam } from "Agile/Scripts/Models/Team";

var delegate = Utils_Core.delegate;

function computeDataIndexForRow(isAboveFirstOrBelowLast: boolean, dataIndex: number): number {
    return (isAboveFirstOrBelowLast && dataIndex) ? -dataIndex : dataIndex;
}

export interface IBacklogGridDataProvider {
    getWorkItemTypeNameById: (workItemId: number) => string;
    getReorderState: () => boolean;
    getReparentState: () => boolean;
    getRowIndex: (index: number) => number;
    getDataIndex: (index: number) => number;
    getTotalRows: () => number;
}

export interface IWorkItemPagedEventHandler extends IEventHandler {
    (sender: ProductBacklogGrid, args: {
        workItemId: number;
        pageData: any[];
    }): void;
}

export interface IGridBehavior {
    onPrepareColumns: (columns: Grids.IGridColumn[], options?: any) => void;
    setGrid: (grid: Grids.Grid) => void;
}

export interface IGridReorderBehavior {
    /**
     * Should reordering of requirement-level items be disabled
     */
    isReorderRequirementDisabled: boolean;

    /**
     * Calculate what the effect would be of dropping a workitem(s) onto a target row
     *
     * @param sourceWorkItemIds Array of work item ids 
     * @param targetWorkItemId The work item id of the row being dropped on
     * @param isReparentingGesture true if an unowned item is being moved
     * @param isAboveFirstOrBelowLast  Is the target above the first item in the grid, or below the last item
     *
     * @returns An object indicating the effect of dropping the source item on the target item.
     */
    calculateMoveWorkItemsEffect(sourceWorkItemIds: number[], targetWorkItemId: number, isReparentingGesture?: boolean, isAboveFirstOrBelowLast?: boolean): TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect;

    /**
     * Check if the dropping row should be expanded when an item is dragged over it
     *
     * @param draggingRowType workItemType of the item being dragged
     * @param droppingRowType workItemType of the item at drop location
     *
     * @returns True if the dragging row should be expanded.
     */
    shouldExpandRow(draggingRowType: string, droppingRowType: string): boolean;
}

export interface ProductBacklogGridOptions extends Grids.IGridOptions {
    /** Scoped event helper to assist making backlog disposable */
    eventHelper: ScopedEventHelper;

    /** List of columns always required to be present in page data */
    requiredColumnsReferenceNames?: string[];

    /** List of behaviors to add to the grid */
    behaviors?: IGridBehavior[];

    /** Reorder manager to use for any grid reordering */
    reorderManager?: TFS_Agile.IReorderManager;

    /** Name of the datasource for filtering (used in telemetry) */
    datasourceName?: string;

    /** Does this grid represent an iteration backlog */
    iterationBacklog?: boolean;

    /** Delegate for errors from context menu */
    contextMenuErrorHandler?: (error: TfsError) => void;

    /** Delegate for creating context menu */
    contextMenuCreator?: (menuOptions: IGridMenuOptions, options?: IProductBacklogGridMenuOptions) => void;

    expandIds?: number[];
    ownedIds?: number[];
    realParentIds?: number[];
    initialSelection?: boolean;
    querySizeLimitExceeded?: boolean;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    dataManager?: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager;

    /** Additional options for product backlog specific grid behavior */
    productBacklogGridOptions: IProductBacklogGridOptionsModel;
}

export interface IProductBacklogGridOptionsModel {
    /** Indicates whether the order column should be shown or not */
    showOrderColumn: boolean;

    /** Indicates whether reordering is allowed */
    enableReorder: boolean;

    /** Indicates whether reparenting is allowed */
    enableReparent: boolean;

    /** Indicates whether forecasting can be enabled or not */
    enableForecast: boolean;
    enableDragDropReorder: boolean;
    columnOptionsKey: string;
}

export interface IGridMenuContextInfo {
    /** Item context menu is triggered on */
    item: any;

    /** Info of row context menu is triggered on */
    rowInfo: any;
}

/** 
 * Menu options passed from the base grid to derived classes
 *
 * Note: This should go to the base Grid implementation
 */
export interface IGridMenuOptions extends Grids.IGridContextMenu {
    contextInfo: IGridMenuContextInfo;

    items: Menus.IMenuItemSpec[] | { (): Menus.IMenuItemSpec[] };
}

export interface IProductBacklogGridMenuOptions {
    /** Current TFS context */
    tfsContext: TFS_Host_TfsContext.TfsContext;

    /** Selected work item id */
    workItemId: number;

    /** Selected work item ids */
    workItemIds: number[];

    /** Grid instance */
    grid: ProductBacklogGrid;

    /** Error callback */
    errorHandler: Function;

    team: ITeam;
}



export enum GroupRowType {
    NormalRow = 0,
    OrphanTasks = -1
};

export interface ICustomRowRenderer {
    getTypeColor(): string;
    getCssClass(): string;
    getDisplayFields(): string[];
};

export interface IDragActionCache {
    draggingRowIndex: number;
    droppingRowIndex: number;
    isAboveFirstOrBelowLast: boolean
    dropEffect: TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect;
};

export interface IGridGroupRow {
    // Get the list of child rows that will be grouped under this row. 
    getChildRows(): number[];

    // Get the type of group-row, such as OrphanTasks, OrphanBugs etc., 
    getRowType(): GroupRowType;

    // Get the internal ID (id < 0) corresponding to this group row. 
    getRowId(): number;

    // Builds a virtual hierarchy of rows by : 
    //    (1) changing the parent ID of the specified childRows to be this group row. 
    //    (2) inserting a group row
    // An option rowInfo parameter may be used to provide custom values for the group's columns.
    buildHierarchy(childRows: number[], rowInfo?: { [id: string]: string }): any;

    // Get the list of all column values for the specified group-row as a dictionary. 
    getDefaultRow(): { [id: string]: string };

    // Get the ICustomRowRenderer that controls the display behavior of this custom row. 
    getRowRenderer(rowInfo: any, rowIndex: number, dataIndex: number): ICustomRowRenderer;
}

export interface IGridRowMouseClickEventInfo {
    /** Data index where mouse down is triggered on */
    dataIndex: number;

    /** Is mouse-click event handled */
    isMouseClickHandled: boolean;
}

export class GridGroupRowBase implements IGridGroupRow {
    protected _gridOptions: any;
    protected _preprocessor: (gridOptions: any, childRows: number[], customParent: number) => void;
    protected _id: number;

    // An internal dictionary that maintains a map from workitem IDs to custom group objects.
    static workitemIDMap: { [id: string]: IGridGroupRow } = {};

    /**
     * Get the list of all custom group types supported ; if any new type needs to be supported, add an entry into the array.
     * 
     * @return An array containing the list of all supported custom-group row types
     */
    static getCustomGroupRowTypes(): GroupRowType[] {

        return [GroupRowType.OrphanTasks];
    }

    /**
     * Get the custom-group object corresponding to the specified workitem ID.
     * 
     * @param id 
     * @return Returns ICustomGroupRow object correspoding to the specified workitem ID.
     */
    static getGroupRow(id: number): IGridGroupRow {

        if (id in GridGroupRowBase.workitemIDMap) {
            return GridGroupRowBase.workitemIDMap[id];
        }

        return null;
    }

    constructor(id?: number, options?: any, preprocessor?: any) {
        /// <summary>Construct a ICustomGroup object that aggregates child rows under a custom group row .</summary>
        /// <param name="options" type="Object">The grid options structure that will be used for grid construction. </param>
        /// <param name="preprocessor" type="Callback">A pre-processing callback that a caller may provide. 
        ///. This callback is invoked just before the hierarchy is built. < / param >

        Diag.Debug.assert(!id || id < 0);

        this._gridOptions = options;
        this._preprocessor = preprocessor;

        if (!id) {
            this._id = WITOM.WorkItem.getTempId();
        } else {
            this._id = id;

            // Ensure no workitem is created with this id
            WITOM.WorkItem.reserveTempId(id);
        }
    }

    /**
     * Get the row ID of this custom row.
     * 
     * @return Row ID of type 'number'.
     */
    public getRowId(): number {

        return this._id;
    }

    /**
     * Get the list of all child rows.
     */
    public getChildRows(): number[] {

        return [];
    }

    /**
     * Get the type of the custom group
     * 
     * @return A RowType value indicating the type ; since this is a base class, return NormalRow.
     */
    public getRowType(): GroupRowType {

        return GroupRowType.NormalRow;
    }

    public getDefaultRow(): { [id: string]: string } {
        /// <summary>Gets the fields corresponding to the default row.</summary>
        /// <returns>A dictionary with field names & values ; since this is a base class, return an empty object.</returns>

        return {};
    }

    /**
     * Get the internal grid options object used for constructing the Grid.
     * 
     * @return The options object.
     */
    public getGridOptions(): any {

        return this._gridOptions;
    }

    /**
     * Builds hierarchy of a custom row and child rows under it .
     * 
     * @param childRows An array of indices of child rows
     * @param rowInfo An optional rowInfo object that may contain any additional fields for the default row
     * @return The updated options object.
     */
    public buildHierarchy(childRows: number[], rowInfo?: { [id: string]: string }): any {

        return null;
    }

    /**
     * Get the renderer object used for drawing the row.
     * 
     * @param rowInfo The rowInfo object that contains the jQuery data for the row
     * @param rowIndex The index into the _rows object.
     * @param dataIndex The index into the _workItems array.
     * @return A ICustomRowRenderer object specific to this group ; since this is a base class, return null.
     */
    public getRowRenderer(rowInfo: any, rowIndex: number, dataIndex: number): ICustomRowRenderer {

        return null;
    }
}

export class ProductBacklogGrid extends QueryResultGrid.QueryResultGrid implements IBacklogGridDataProvider {

    public static enhancementTypeName: string = "tfs.agile.productbackloggrid";

    public static ORDER_FIELD_NAME: string = "Backlog.Order";
    public static FORECAST_FIELD_NAME: string = "Backlog.Forecast";
    public static NEW_WORKITEM_FIELD_NAME: string = "Backlog.NewWit";
    public static NEW_WORKITEM_CLASS: string = "new-workitem-row";
    public static EVENT_DRAG_EVENT: string = "event-drag-operation";
    public static DRAG_OPERATION_START: string = "start";
    public static DRAG_OPERATION_STOP: string = "stop";
    public static SINGLE_SPRINT_LINE_CLASS: string = "sprint-line-single";
    public static DOUBLE_SPRINT_LINE_CLASS: string = "sprint-line-double";
    public static DROP_SUCCESSFUL: string = "drop_successful";
    public static CSS_GRID_CONTEXTMENU_CONTAINER = "grid-context-menu-popup-pin";

    public static DATA_WORK_ITEM_IDS: string = "work-item-ids";

    private static DRAG_ACTIVE_CLASS: string = "productbacklog-grid-drag-active";
    private static DRAG_HOVER_CLASS = "grid-row-dragHover";
    private static DRAG_NEW_PARENT_CLASS = "drag-drop-new-parent";
    private static DRAG_INSERT_BEFORE_CLASS = "drag-drop-insert-before";
    private static DRAG_INSERT_AFTER_CLASS = "drag-drop-insert-after";
    private static DRAG_FULL_LINE_CLASS = "full";
    private static DEFAULT_DATASOURCE_NAME = "GenericBacklogGrid";

    public static EVENT_WORKITEM_PAGED: string = "event-workitem-paged";

    private static DRAGHOVER_DELAYED_TIME: number = 500;
    private static ROW_OFFSET_PERCENTAGE_DRAG_DROP: number = -50;

    /**
     * Augments options prior to object creation
     */
    public static initializeEnhancementOptions($element, baseOptions) {
        var allowOrdering = false;

        if (baseOptions && baseOptions.productBacklogGridOptions && baseOptions.productBacklogGridOptions.showOrderColumn) {
            allowOrdering = true;
        }

        this.updatePayloadColumns(allowOrdering, baseOptions && baseOptions.columns);

        return baseOptions;
    }

    /** Updates the options to disable reordering and include the client-generated backlog order column.
     *  @param  allowOrdering  Whether to allow or disable reordering.
     *  @param  options  The grid results payload from the server. */
    public static updatePayloadColumns(allowOrdering: boolean, columns: IQueryDisplayColumn[]) {
        Diag.Debug.assertIsArray(columns, "Expected 'columns' to be a valid array of columns.");
        if (columns) {
            // we don't support sorting on the product backlog grid so let's disable it
            for (var i = 0, l = columns.length; i < l; i++) {
                Diag.Debug.assertIsNotNull(columns[i], "Column with index " + i + " is null.");
                if (columns[i]) {
                    columns[i].canSortBy = false;
                }
            }

            // Insert the generated column header definition in position 0 of the columns array. The
            // columns array indicates which order the columns will be drawn in
            var orderColumn = {
                rowCss: "grid-header-text",
                canSortBy: false,
                canMove: false,
                fieldId: null,
                fixed: true,
                name: ProductBacklogGrid.ORDER_FIELD_NAME,
                text: AgileProductBacklogResources.ProductBacklog_OrderColumnTitle,
                width: 50,   // This width allows word "Order" to fit in all supported browsers without showing ellipsis
                getCellContents: function (this: ProductBacklogGrid, rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                    // "this" is the instance of Product backlog grid
                    let $gridCell = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
                    let noText = false;

                    if (!allowOrdering) {
                        // if ordering is not allowed, then dont show the order of this row. 
                        // We still want to show this column in order to show unowned item icon if any row is not owned by the current team
                        $gridCell.empty();
                        noText = true;
                    }
                    if (!this.isOwnedItem(this._workItems[dataIndex])) {
                        const $infoIcon = $("<span />")
                            .attr("aria-label", AgileProductBacklogResources.UnownedItemTooltip)
                            .addClass("icon bowtie-icon bowtie-status-info-outline");

                        if (noText) {
                            $infoIcon.addClass("no-text");
                        }

                        RichContentTooltip.add(AgileProductBacklogResources.UnownedItemTooltip, $infoIcon, { setAriaDescribedBy: true });

                        $gridCell.append($infoIcon);
                    }

                    return $gridCell;
                }
            };
            columns.splice(0, 0, orderColumn);
        }
    }

    // This options is of type ProductBacklogOptions and IQueryResult 
    public _options: any;
    private _titleColumnIndex: number;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager;
    protected _gridReorderBehavior: IGridReorderBehavior;
    private _enableReorder: boolean;
    private _enableReparent: boolean;
    private _rowSavingManager: TFS_RowSavingManager.RowSavingManager;

    private _contextMenuCreator: (menuOptions: IGridMenuOptions, options?: IProductBacklogGridMenuOptions) => void;
    private _contextMenuErrorHandler: (error: TfsError) => void;

    private _keyboardReorderDataIndex: number;
    private _keyboardReorderDataIndexOverTopRow: boolean;
    private _keyboardReorderDropEffect: TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect;
    private _keyboardReorderDrawDelayedFunc: Utils_Core.DelayedFunction;

    private _dragActionCache: IDragActionCache;
    private _accessoriesInitialized: boolean;
    public _isIterationBacklog: boolean;
    private _expandRowDelayedFunction: Utils_Core.DelayedFunction;
    private _expandStatesById: { [id: number]: number };
    private _preservedExpandStates: boolean;
    private _preservedSelectedWorkItemIds: number[];
    private _preservedFocusedWorkItemId: number;
    private _gridRowMouseClickEventInfo: IGridRowMouseClickEventInfo;

    /** These columns are always required to be present in the page data */
    private _requiredColumnReferenceNames: string[];
    private _isWorkItemFormOpen: boolean;
    private _eventHelper: ScopedEventHelper;

    /**
     * Creates new Product Backlog Grid Control
     */
    constructor(options?: any) {
        super(options);
        Diag.Debug.assertIsObject(options.eventHelper, "Event helper must be passed in");
        this._eventHelper = options.eventHelper;

        // attach behaviors to the grid
        if (options.behaviors) {
            $.each(options.behaviors, (i, behavior) => {
                behavior.setGrid(this);
                behavior.onPrepareColumns(options.columns, options.productBacklogGridOptions);
            });
        }
        this._isIterationBacklog = options.iterationBacklog || false;
        this._options.initialSelection = false;
        this._events = new Events_Handlers.NamedEventCollection();
        this._contextMenuErrorHandler = options.contextMenuErrorHandler;
        this._contextMenuCreator = options.contextMenuCreator;

        this._accessoriesInitialized = false;
        this._expandStatesById = {};
        this._gridRowMouseClickEventInfo = null;

        if (options.productBacklogGridOptions) {
            this.setReorderState(Boolean(options.productBacklogGridOptions.enableReorder));
            this.setReparentState(Boolean(options.productBacklogGridOptions.enableReparent));
        }

        this._requiredColumnReferenceNames = Utils_Array.unique(
            [WITConstants.CoreFieldRefNames.WorkItemType]
                .concat(options.requiredColumnsReferenceNames || []));

        super.setBeforeOpenWorkItemCallback(() => WITDialogShim.prefetchFormModules());
        this.getFilterManager().attachEvent(FilterManager.EVENT_FILTER_CLEARED, delegate(this, this._onFilterCleared));
    }

    /** Return the number of currently expanded items */
    public getExpandedCount(): number {
        return this._expandedCount;
    }

    /**
     * Returns a value indicating whether the backlog is an iteration backlog.
     */
    public isIterationBacklog(): boolean {

        return this._isIterationBacklog;
    }

    /** Return true if reorderRequirement is disabled 
      * @param workItemId Id of workitem
      * @returns true if reordering is disabled for current workItemId
      */
    public isReorderRequirementDisabledForWorkItem(workItemId: number): boolean {
        return this._isReorderRequirementDisabled() && BacklogConfigurationService.getBacklogConfiguration().isWorkItemTypeInRequirementBacklog(this.getWorkItemTypeNameById(workItemId));
    }

    /** Return true if reorderRequirement is disabled */
    public _isReorderRequirementDisabled(): boolean {
        return this._gridReorderBehavior.isReorderRequirementDisabled;
    }

    public isOwnedItem(id: number): boolean {
        if (this.isIterationBacklog() || id < 0) {
            // Return true if id belongs to an unparented row or the view is iterationBacklog 
            return true;
        }

        return this._dataManager.isOwnedItem(id);
    }

    public isRealWorkItem(id: number): boolean {
        //group rows are not real workitem (for example they should not participate in search)
        return GridGroupRowBase.getGroupRow(id) === null;
    }

    /**
     * Override:  Retrieve the name of the filter datasource, used in Telemetry.
     */
    public getDataSourceName(): string {
        return this._options.datasourceName || ProductBacklogGrid.DEFAULT_DATASOURCE_NAME;
    }

    /** @override */
    public getVisibleColumns(): string[] {
        return super.getVisibleColumns().concat([ProductBacklogGrid.ORDER_FIELD_NAME]);
    }

    /**
     * Override:  Retrieves the set of work item ids that have been paged in.  This does NOT include
     * work item ids for work items that are part of the query results but have not been paged, and
     * does not contain grouping rows (which have negative ids) or new unsaved items (which also have
     * negative ids).
     */
    public getIds(): number[] {
        const ids: number[] = [];
        const keys = Object.keys(this.getPageData());

        keys.forEach((idStr: string) => {
            const id = +idStr;

            if (id > 0) {
                ids.push(id);
            }
        });

        return ids;
    }


    /** Insert column at the given index */
    public insertColumn(index: number, column: Grids.IGridColumn) {
        Diag.Debug.assert(index >= 0 && index <= this._columns.length, "Invalid column index");

        // Insert column 
        this._columns.splice(index, 0, column);
        this._setColumnInfo(column, index);

        // Renumber columns
        this._displayColumns = [];
        this._displayColumnsMap = {};
        for (var i = 0; i < this._columns.length; ++i) {
            const column = this._columns[i];

            this._columns[i].index = i;

            // Update query grid specific data structures
            this._displayColumns[i] = {
                name: column.name,
                text: column.text,
                fieldId: column.fieldId,
                canSortBy: column.canSortBy,
                width: column.width
            };
            this._displayColumnsMap[this._columns[i].name] = i;
        }

        // Update any indices dependent on the columns
        this._determineIndentIndex();
    }

    /**
     * Get a workitem page data value for a given work item id
     *
     * @param workItemId Id of workitem
     * @param fieldReferenceName Reference name of work item field
     * @returns Paged data or null
     */
    public getWorkItemPageDataValue(workItemId: number, fieldReferenceName: string): any {
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var workItem = this.getPageData()[workItemId];
        if (!workItem) {
            return null;
        }

        var fieldIndex = this.getColumnMap()[fieldReferenceName];
        if (!fieldIndex) {
            return null;
        }

        return workItem[fieldIndex] || null;
    }

    public setGridReorderBehavior(gridReorderBehavior: IGridReorderBehavior) {
        this._gridReorderBehavior = gridReorderBehavior;
    }

    public getWorkItemTypeNameById(workItemId: number): string {
        return super.getWorkItemTypeNameById(workItemId);
    }

    public getDataIndex(visibleIndex: number): number {
        return this._getDataIndex(visibleIndex);
    }

    public getRowIndex(dataIndex: number): number {
        return this._getRowIndex(dataIndex);
    }

    /**
    * Scrolls the given row into view
    *
    * @param rowIndex Index of row to scroll into view
    */
    public getRowIntoView(rowIndex: number) {
        this._getRowIntoView(rowIndex);
    }

    public getTotalRows() {
        return this._expandedCount;
    }

    /**
     * Copies the selected workItems on the productBacklogGrid.
     * @param formatterType Type of the formatter to use
     * @param copyAsHtml True if consumer wants to copy selected items as html
     * @param options 
     */
    public copySelectedItems(formatterType?: new (grid: Grids.Grid, options?: any) => Grids.ITableFormatter, copyAsHtml?: boolean, options?: any) {
        const selectedWorkItemIds = this.getSelectedWorkItemIds();

        if (selectedWorkItemIds.length === 0) {
            return;
        }

        const columnNames: string[] = $.map(this.getColumns(), function (column, index) {
            if (column.fieldId && !column.hidden) {
                return column.name;
            }
        });
        const tfsContext = this._options.tfsContext;
        const queryAdapter = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<QueryAdapter>(QueryAdapter);

        if (selectedWorkItemIds.length > 1) {
            QueryResultGrid.createTemporaryQueryIdForSelectedWorkItemIds(tfsContext, queryAdapter, selectedWorkItemIds, columnNames, [],
                (tempQueryId: string) => {
                    const queryLink = TempQueryUtils.createTempQueryLink(tfsContext, tempQueryId);
                    super.copySelectedItems(BacklogsHtmlTableFormatter, true, { extendedText: queryLink, tempQueryId: tempQueryId, projectId: tfsContext.navigation.projectId });
                },
                () => {
                    super.copySelectedItems(BacklogsHtmlTableFormatter, true);
                });
        }
        else {
            super.copySelectedItems(BacklogsHtmlTableFormatter, true);
        }
    }

    public filterWorkItems(ids: number[]) {
        this.preserveSelectedWorkItemIds();

        super.filterWorkItems(ids);

        this.restorePreservedSelectedWorkItemIds();

        this._rowSavingManager.updateIdToDataIndex(delegate(this, this._getWorkItemDataIndexInFilteredView));
    }

    /** Returns the grid to its original state */
    public restoreUnfilteredState(suppressRedraw = false) {
        if (!suppressRedraw) {
            // Only need to get this when we're actually going to draw
            this.preserveSelectedWorkItemIds();
        }

        // If we are redrawing ourselves, don't have parent redraw the grid
        super.restoreUnfilteredState(!suppressRedraw);

        if (!suppressRedraw) {
            // When we're supressing redraw we dont want the grid to scroll to the selected workitem
            this.restorePreservedSelectedWorkItemIds(true);
            this.layout();
        }
    }

    protected _getDefaultActionArguments(contextInfo): QueryResultGrid.IQueryResultGridContextMenuArguments {
        return {
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            id: this._workItems[contextInfo.rowInfo.dataIndex],
            selectedWorkItems: this.getSelectedWorkItemIds(),
            selectedWorkItemProjectTypeMapping: this.getSelectedWorkItemProjectTypeMapping()
        };
    }

    private _onFilterCleared() {
        this._rowSavingManager.updateIdToDataIndex(delegate(this, this._getWorkItemDataIndex));
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            draggable: {
                zIndex: 1000,
                cursorAt: { left: 15, bottom: 5 },
                axis: "", // the default will set the axis to y, we need to make the tile move freely
                appendTo: document.body, // append to body to allow for free drag/drop
                scroll: false,
                scrollables: [".grid-canvas", ".capacity-pane-container", ".team-iteration-view", ".team-backlog-view"],  // a list of selectors to identify elements that the tile will scroll while dragging
                scrollablesAxis: "y", // this limits our "scrollables" plugin from scrolling containers along their horizontal axis
                distance: 20, // start the drag if the mouse moved more than 20px, this will prevent accidental drag/drop
                scope: TFS_Agile.DragDropScopes.ProductBacklog, // Override default scope to allow dropping outside of the grids canvas.
                start: this._draggableStart,
                stop: this._draggableStop,
                helper: this._draggableHelper,
                refreshPositions: true,
            },
            droppable: {
                hoverClass: "", // override default grid hoverClass,
                tolerance: "pointer", // show the line when the pointer overlaps with the droppable
                scope: TFS_Agile.DragDropScopes.ProductBacklog, // Override default scope to allow dropping outside of the grids canvas.
                accept: this._droppableAccept,
                deactivate: this._droppableDeactivate,
                over: this._droppableOver,
                out: this._droppableOut,
                drop: this._droppableDrop,
                rowOffsetPercentage: ProductBacklogGrid.ROW_OFFSET_PERCENTAGE_DRAG_DROP
            }
        }, options, {
                asyncInit: false,
                allowMultiSelect: true,
                cssClass: "backlog",
                contextMenu:
                {
                    "arguments": delegate(this, this._getDefaultActionArguments), // Inherited delegate                    
                    items: [], // Empty array here because we will dynamically create the items in _createContextMenu
                    contributionIds: ["ms.vss-work-web.backlog-item-menu", "ms.vss-work-web.work-item-context-menu"]
                },
                readWorkItems: true,
                sourceArea: RecycleBinTelemetryConstants.BACKLOG_SOURCE,
            }));
    }

    /**
     *     OVERRIDE: Initializes the data model for the grid. We override this so that we can
     *     initialize our data manager after the grid has been rendered (we need the expand states
     *     which are only available to us after the grid has been rendered)
     * 
     * @param queryResultsModel The query results model
     */
    public initializeDataModel(queryResultsModel: any) {
        super.initializeDataModel(queryResultsModel);

        if (!this._accessoriesInitialized) {
            this._initializeDataManager();
            this._initializeRowSavingManager();

            this._accessoriesInitialized = true;
        }
    }

    public preserveExpandStates() {
        var expandStates = this.getUnfilteredExpandStates();
        Diag.Debug.assert(expandStates.length === this._dataManager.getItemsCount(), "There should be an expand state for each item in tree");

        $.each(expandStates, (idx, value) => {
            this._expandStatesById[this._dataManager.getWorkItemIdAtTreeIndex(idx)] = value;
        });

        this._preservedExpandStates = true;
    }

    public clearPreservedExpandStates() {
        this._preservedExpandStates = false;
        this._expandStatesById = {};
    }

    /** Preserves the current selection of workItemIds */
    public preserveSelectedWorkItemIds() {
        this._preservedFocusedWorkItemId = this.getSelectedWorkItemId();
        this._preservedSelectedWorkItemIds = this.getSelectedWorkItemIdsWithGroupRows();
    }

    /** Clears the preserved selection of workItemIds. */
    public clearPreservedSelectedWorkItemIds() {
        this._preservedSelectedWorkItemIds = [];
        this._preservedFocusedWorkItemId = null;
    }

    /** Restores the preserved selection of workItemIds */
    public restorePreservedSelectedWorkItemIds(expand = false) {
        this.setSelectedWorkItemIds(this._preservedSelectedWorkItemIds, this._preservedFocusedWorkItemId, expand);
        Utils_Core.delay(this, 0, () => {
            if (!this.isDisposed()) {
                this.getSelectedRowIntoView()
            }
        });
        this.clearPreservedSelectedWorkItemIds();
    }

    protected processExpandedStates(datasource): any {
        var expandIds: { [id: number]: boolean } = {};
        if (datasource.expandIds) {
            $.each(datasource.expandIds, (index, id) => {
                expandIds[id] = true;
            });
        }

        var isRowCollapsedHelper = (id: number): boolean => {
            // NewBacklogNavigation: Collapse all rows except unparented, expandIds and previously expanded rows. 

            if (this._preservedExpandStates && this._expandStatesById[id]) {
                return this._expandStatesById[id] < 0;
            }
            else {
                return !(expandIds[id] || id < 0);
            }
        };
        this._options.expandStates = [];
        return QueryResultGrid.QueryResultGrid.calculateExpandStates(datasource.sourceIds, this.getUnfilteredWorkItemIds(), this._options.expandStates, 0, 0, datasource.sourceIds.length, isRowCollapsedHelper);
    }

    public performActionWithPreserveSelection(action: () => void) {
        var focusedWorkItemId = this.getSelectedWorkItemId();
        var workItemIds = this.getSelectedWorkItemIdsWithGroupRows();

        action();

        if (workItemIds) {
            this.setSelectedWorkItemIds(workItemIds, focusedWorkItemId);
        }
    }

    /**
     * Gets the information about the currently selected row.
     * 
     * Returns a rowInfo object containing rowIndex, dataIndex and a jQuery wrapper for the actual row.
     * 
     * @returns {IGridRowInfo}
     */
    public getSelectedRowInfo(): Grids.IGridRowInfo {
        return this.getRowInfo(this.getSelectedDataIndex());
    }

    /**
     * Override base class method
     *
     * Returns real/actual work item ids, group rows are filtered.
     */
    public getSelectedWorkItemIds(): number[] {
        var ids = super.getSelectedWorkItemIds();

        // Remove unparented rows
        ids = ids.filter(id => GridGroupRowBase.getGroupRow(id) === null)

        return ids;
    }

    protected isUnparentedRow(id: number): boolean {
        return GridGroupRowBase.getGroupRow(id) !== null;
    }

    /**
     * Returns all work item ids, group rows are included.
     */
    public getSelectedWorkItemIdsWithGroupRows() {
        return super.getSelectedWorkItemIds();
    }


    /**
     * Selects the given workItemIds on the grid (Visible items are selected, Collapsed items are optionally ignored).
     *
     * @param workItemIds Array of workItemIds to be selected.
     * @param focusedWorkItemId WorkItem to be focussed after selecting all workItemIds.     
     * @param ensureVisible ensures item is visible and has a row. Expands any ascendants expanded.
     */
    public setSelectedWorkItemIds(workItemIds: number[], focusedWorkItemId?: number, ensureVisible?: boolean) {
        this._clearSelection();
        //Cannot set selection if none were passed in, or no workitems exist to select
        if (!workItemIds || workItemIds.length === 0 || this._workItems.length === 0) {
            this._addSelection(-1);
            return;
        }

        // If filtered, make a map for index searches
        var filteredWorkItemDataIndexMap: number[] = [];
        if (this.isFiltered()) {
            $.each(this._workItems, (index, id) => {
                filteredWorkItemDataIndexMap[id] = index;
            });
        }

        // Process all IDs
        var focusInList = false;
        var selectionsAdded = false;
        for (var index = workItemIds.length - 1; index >= 0; index--) {
            var id = workItemIds[index];
            //If our focus is found, add it after all other values have been added
            if (focusedWorkItemId != null && id === focusedWorkItemId) {
                focusInList = true;
            }
            else {
                // Try to add ID to grid selection
                selectionsAdded = this._setSelectedWorkItemIds_AddSelectionHelper(id, filteredWorkItemDataIndexMap, ensureVisible) || selectionsAdded;
            }
        }

        //If our focus was found in the list, add to selections last to make focus
        if (focusInList) {
            selectionsAdded = this._setSelectedWorkItemIds_AddSelectionHelper(focusedWorkItemId, filteredWorkItemDataIndexMap, ensureVisible) || selectionsAdded;
        }

        // If nothing has been selected remove focus
        if (!selectionsAdded) {
            this._addSelection(-1);
        }
    }

    private _setSelectedWorkItemIds_AddSelectionHelper(id: number, filteredWorkItemDataIndexMap?: number[], ensureVisible?: boolean): boolean {
        var workItemDataIndex: number;
        if (this.isFiltered()) {
            workItemDataIndex = filteredWorkItemDataIndexMap[id];
        }
        else {
            workItemDataIndex = this._getWorkItemDataIndex(id);
        }
        if (workItemDataIndex >= 0) {
            // Make sure selection is visible
            if (ensureVisible) {
                this.ensureDataIndexExpanded(workItemDataIndex);
            }

            var rowIndex = this._getRowIndex(workItemDataIndex);
            if (rowIndex >= 0) {
                this._addSelection(rowIndex);
                //Succesfully added, return true
                return true;
            }
        }
        //We did not add, return false
        return false;
    }

    /**
     * Updates the layout content spacer and redraws the items which are currently visible in the grid.
     */
    public updateLayoutAndRedraw() {
        this._layoutContentSpacer();
        this._redraw(true); // Redraw all rows.
    }

    /**
     * Get the data manager for the grid
     * 
     * @return The data manager for the grid
     */
    public getDataManager(): TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager {
        return this._dataManager;
    }

    /**
     * Get the row saving manager for the grid
     * 
     * @return The row saving manager for the grid
     */
    public getRowSavingManager(): TFS_RowSavingManager.RowSavingManager {
        return this._rowSavingManager;
    }

    /**
     * async pages in all the workitem invovled in a list of locations (if they are not paged in already)
     *
     * @param locations list of locations
     * @param callback to be called when the items are paged, can be called immediatly if nothing needs to be paged.     
     */
    public pageLocations(locations: TFS_Agile_WorkItemChanges.ILocation[], callback: (...args: any[]) => any) {
        Diag.Debug.assertParamIsArray(locations, "locations");
        Diag.Debug.assertParamIsFunction(callback, "callback");

        var workItemIds: { [id: number]: boolean } = {};

        locations.forEach((l: TFS_Agile_WorkItemChanges.ILocation) => {
            var workItemId = l.nextId;
            if (workItemId > 0 && !(workItemId in this.getPageData())) {
                workItemIds[workItemId] = true;
            }
            workItemId = l.previousId;
            if (workItemId > 0 && !(workItemId in this.getPageData())) {
                workItemIds[workItemId] = true;
            }
            workItemId = l.parentId;
            if (workItemId > 0 && !(workItemId in this.getPageData())) {
                workItemIds[workItemId] = true;
            }
        });

        var ids: number[] = Object.keys(workItemIds).map(x => +x);

        if (ids && ids.length > 0) {
            this.pageWorkItems(ids, callback);
        }
        else {
            callback();
        }
    }

    /** Override: Update single row in pageData
    * @param id Id of work item
    * @param row Page data row
    */
    protected _updatePageData(id: number, row: any) {
        super._updatePageData(id, row);

        this._raiseWorkItemPaged(id, row);
    }

    /** Override from base class */
    public _showContextMenu(eventArgs) {
        const workItemIds = this.getSelectedWorkItemIds();
        if (workItemIds && workItemIds.length > 0) {
            // If a workitem is selected, show context menu otherwise do nothing
            super._showContextMenu(eventArgs);
        }
    }

    /** Override from base class */
    public _createContextPopupMenuControl(menuOptions: any): Menus.PopupMenu {
        Diag.Debug.assertParamIsObject(menuOptions, "menuOptions");

        var menuItems = (menuOptions.items || []).slice(0);

        // If there are no menu items to be created, do not show a context menu by passing in null 
        // instead of empty array
        var childItems = menuItems.length > 0 ? Menus.sortMenuItems(menuItems) : null;

        return <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, this._element, $.extend(
            {
                align: "left-bottom"
            },
            menuOptions,
            {
                items: [{ childItems: childItems, ariaLabel: AgileProductBacklogResources.ContextMenu_AriaLabel }]
            }));
    }

    /**
     * OVERRIDE: Creates the context menu. Allows us to dynamically condition context menu items just in time
     * 
     * @param rowInfo The information about the row with context
     * @param menuOptions The menu information. See _createContextPopupMenuControl
     * @return 
     */
    public _createContextMenu(rowInfo: any, menuOptions: IGridMenuOptions): Menus.PopupMenu {

        Diag.Debug.assertParamIsObject(rowInfo, "rowInfo");
        Diag.Debug.assertParamIsObject(menuOptions, "menuOptions");

        var workItemIds = this.getSelectedWorkItemIdsWithGroupRows();

        Diag.Debug.assert(workItemIds.length > 0);

        // Prior to calling the base function we want to augment the menu options with items specified by
        // the context menu creator that is passed from the Backlog derivation. The set of items will differ
        // for IterationBacklog and ProductBacklog.
        this._contextMenuCreator(
            menuOptions,
            {
                tfsContext: this._options.tfsContext,
                workItemId: workItemIds[0],
                workItemIds: workItemIds,
                grid: this,
                errorHandler: this._contextMenuErrorHandler,
                team: this._options.team
            });

        // Note: We derive from QueryResultGrid which adds it's own context menu items in the override of _createContextMenu.
        // Because of this we call the creation of the context menu directly (instead of calling to base) bypassing remaining overrides 
        // between the Grid and any intermediate derivations
        return this._createContextPopupMenuControl(menuOptions);
    }

    public updateDataModel(queryResultsModel) {
        //Reset the title column index whenever the payload columns are updated
        this._resetTitleColumnIndex();
        if (queryResultsModel != null) {
            super.updateDataModel(queryResultsModel);
        }
    }

    public _resetTitleColumnIndex() {
        this._titleColumnIndex = 0;
    }

    /**
     * OVERRIDE: Handles the row mouse down event on the ProductBacklogGrid
     * 
     * @param e Event args
     */
    public _onRowMouseDown(e?: JQueryEventObject) {
        if (TFS_Agile.areAdvancedBacklogFeaturesEnabled()) {
            this.enableDragDrop();
        }

        if (this._keyboardReorderDropEffect) {
            Diag.Debug.assert(this._keyboardReorderDataIndex !== null && this._keyboardReorderDataIndex >= 0, "Expected keyboard row index to be set");

            // Remove the previous drag styling
            this._removeAllDragStyling();
        }

        this._clearKeyboardReorderState();
        this._clearRowMouseDownEventInfo();

        var rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
        if (rowInfo) {
            var isExpandCollapseToggled = $(e.target).hasClass("grid-tree-icon") && e.which === 1; // Left click
            var info: IGridRowMouseClickEventInfo = {
                dataIndex: rowInfo.dataIndex,
                isMouseClickHandled: true
            };

            if (!isExpandCollapseToggled && !e.shiftKey && $.inArray(rowInfo.dataIndex, this.getSelectedDataIndices()) >= 0) {
                // We don't handle the event here if user clicks on an already selected item in multiselection (mainly to differentiate drag and click). 
                // Flag "isMouseClickHandled" is set to false and the event is handled on mouseup depending on user's mouse gesture
                info.isMouseClickHandled = false;
                this._setRowMouseDownEventInfo(info);
            }
            else {
                super._onRowMouseDown(e);
            }
        }
    }

    /**
     * OVERRIDE: Handles the row mouse up event on the ProductBacklogGrid
     * 
     * @param e Event args
     */
    public _onRowMouseUp(e?: JQueryEventObject) {
        var rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
        var mouseClickInfo = this._getRowMouseDownEventInfo();
        if (rowInfo && mouseClickInfo && !mouseClickInfo.isMouseClickHandled && rowInfo.dataIndex === mouseClickInfo.dataIndex) {
            // Clicking the [...] item should behave the same as a rightclick.
            this._selectRow(rowInfo.rowIndex, rowInfo.dataIndex, {
                ctrl: (e.ctrlKey || e.metaKey),
                shift: e.shiftKey,
                rightClick: e.which === 3 || $(e.target).closest(".grid-context-menu-container").length > 0
            });
        }
        this._clearRowMouseDownEventInfo();
    }

    protected _clearRowMouseDownEventInfo() {
        this._gridRowMouseClickEventInfo = null;
    }

    protected _setRowMouseDownEventInfo(info: IGridRowMouseClickEventInfo) {
        this._gridRowMouseClickEventInfo = info;
    }

    protected _getRowMouseDownEventInfo(): IGridRowMouseClickEventInfo {
        return this._gridRowMouseClickEventInfo;
    }

    /**
     * OVERRIDE: Handles the browser keyup event on the ProductBacklogGrid
     * 
     * @param e Event args
     */
    public _onKeyUp(e?: any) {

        // If the keyboard reorder gesture key is released & we were in the process of moving up or down save changes
        if (this._keyboardReorderDataIndex !== null && !this._isKeyboardReorderGestureActive(e)) {
            var sourceDataIndex = this.getSelectedDataIndex();

            if (sourceDataIndex === this._keyboardReorderDataIndex) { // We have landed back on the item we are attempting to move
                return;
            }

            if (this._keyboardReorderDropEffect) { // If there is a valid drop effect persisted
                // Remove the drag line styling
                this._removeAllDragStyling();

                // Move the work item in the grid & save
                this.performActionWithPreserveSelection(() => {
                    // set focusOnFirstMovedItem as to not jump to where dragging started from in case of keyboard drag-drop
                    this.getDataManager().moveWorkItems(<TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect>this._keyboardReorderDropEffect, true, true, true);
                });
            }

            this._clearKeyboardReorderState();
        }

        super._onKeyUp(e);
    }

    /**
     *  Attach a handler for the EVENT_DRAG_EVENT event. 
     * 
     * @param handler The handler to attach. The function will be passed the following arguments:
     *    source: object raising the event
     *    args: Details of the drag operation
     *     {
     *         action: [start|stop],
     *         event: [the browser event]
     *     }
     * 
     */
    public attachDragEvent(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(ProductBacklogGrid.EVENT_DRAG_EVENT, <any>handler);
    }

    /**
     * Remove a handler for the EVENT_DRAG_EVENT event
     * 
     * @param handler The handler to remove
     */
    public detachDragEvent(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(ProductBacklogGrid.EVENT_DRAG_EVENT, <any>handler);
    }

    /** 
     * Attach handler for EVENT_WORKITEM_PAGED event, raised when page data for a workitem is received 
     * @param handler Handler for event
     */
    public attachWorkItemPagedEvent(handler: IWorkItemPagedEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(ProductBacklogGrid.EVENT_WORKITEM_PAGED, handler);
    }

    /** 
     * Detach handler for EVENT_WORKITEM_PAGED event, raised when page data for a workitem is received 
     * @param handler Handler for event
     */
    /**
     * Remove a handler for the EVENT_DRAG_EVENT event
     * 
     * @param handler The handler to remove
     */
    public detachWorkItemPagedEvent(handler: IWorkItemPagedEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(ProductBacklogGrid.EVENT_WORKITEM_PAGED, handler);
    }

    /**
     * Returns 'data index' of the last row in the grid
     */
    public getLastRowDataIndex(): number {
        var len = this._visibleRange.length;

        if (len > 0) {
            return this._visibleRange[len - 1][1];
        }
        return -1;
    }

    /**
     * Indicates whether the last row in the grid has the specified data index
     * 
     * @param dataIndex A data index from the grid
     */
    public isLastRow(dataIndex: number) {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        var len = this._visibleRange.length;

        if (len > 0) {
            // The visibleRange array contains pairs of data indexes (in the form of two element arrays)
            // which indicate the (start, stop) range for each visible/expanded segment of the grid that
            // contains contiguous data indexes. The last row's data index is the second index in the
            // last range.
            return dataIndex === this._visibleRange[len - 1][1];
        }
        else {
            return false;
        }
    }

    /**
     * Determines whether the provided row index is scrolled into view
     * 
     * @return true if row index is in view, false otherwise
     */
    public indexIsInView(rowIndex): boolean {
        Diag.Debug.assertParamIsNumber(rowIndex, "rowIndex");

        var visibleRange = this._getVisibleRowIndices();

        return rowIndex >= visibleRange.first && rowIndex <= visibleRange.last;
    }

    /**
     * Translates an order into a visible index in the grid
     * 
     * @return index into the grid
     */
    public getIndexFromOrder(order: number): number {

        Diag.Debug.assertParamIsNumber(order, "order");

        var workItemId = this.getDataManager().getWorkItemIdAtOrder(order);

        return this._getWorkItemDataIndex(workItemId);
    }

    /**
     * Refresh the view
     * @param args type of IRefreshProductBacklogGridArgs
     */
    public refresh(skipInvalidateResults?: boolean, args?: TFS_Agile_ProductBacklog_DM.IRefreshProductBacklogGridArgs) {

        const options = this.getDataManager().getTreeData();
        const backupExpandStates = this.getUnfilteredExpandStates();
        const lastSelectedDataIndex = this.getSelectedDataIndex();

        this.processDataSource(<any>options, false);

        // if we are refreshing on the same view, then keep the expanded states as is
        // if we are refreshing to a different view then the expanded states lengths won't match

        if (this.getUnfilteredExpandStates().length === backupExpandStates.length) {
            this.setUnfilteredExpandStates(backupExpandStates);
        }

        var selectedRowIndex = this.getSelectedRowIndex();

        // We need to send a copy of the current columns so the grid don't lose any ordering the user did
        this.setDataSource(this._options.source, this._options.expandStates, this._columns.slice(0), null, selectedRowIndex);

        //Selects the work item if provided
        if (args && typeof args.selectedWorkItemId === "number") {
            this.setSelectedWorkItemId(args.selectedWorkItemId);
        }
        else if (lastSelectedDataIndex >= 0) {
            this.setRowSelection(lastSelectedDataIndex);
        }
    }

    /**
     * Return true if the item at data index is expanded
     * 
     * @param index index
     */
    public _isExpanded(index: number) {

        Diag.Debug.assertParamIsNumber(index, "index");
        return !this._expandStates || this._expandStates[index] > 0;
    }

    /**
     * override the get Column Value to allow for getting values of backlog.order column
     * 
     * @param dataIndex The index for the row data in the data source
     * @param columnIndex The index of the column's data in the row's data array
     * @param columnOrder The index of the column in the grid's column array. This is the current visible order of the column
     * @return 
     */
    public getColumnValue(dataIndex: number, columnIndex: number, columnOrder?: number): any {

        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");
        Diag.Debug.assertParamIsNumber(columnIndex, "columnIndex");

        var value = "", // initialize value
            column = this._displayColumns[columnIndex], // get column
            id = this._workItems[dataIndex];

        // If this is for a custom group row, check if this column should be displayed.
        var row = this._rows[dataIndex];
        if (row && row.rowExtn) {
            var fields = row.rowExtn.getDisplayFields();
            if (fields.indexOf(column.name) === -1) {
                return "";
            }
        }

        if (column.name === ProductBacklogGrid.ORDER_FIELD_NAME) {
            var order: number = null;
            order = this.getDataManager().getWorkItemVisibleOrder(id);
            value = order ? order.toString() : value;
        }
        else {
            // else lookup the field regularly
            value = WITOM.Field.convertValueToDisplayString(super.getColumnValue(dataIndex, columnIndex, columnOrder));
        }
        return value;
    }

    /**
     * OVERRIDE: onOpenRowDetail
     * 
     * @param eventArgs event argument
     */
    public onOpenRowDetail(eventArgs: any) {

        var id = this._workItems[eventArgs.dataIndex],
            rowIsCurrentlySaving = this._rowSavingManager.isRowSaving(id); //Check if this row is currently marked as saving

        if (id > 0 && !rowIsCurrentlySaving && !this._isWorkItemFormOpen) { // only pass the event if the id is positive and the row is not currently saving on the grid
            this._isWorkItemFormOpen = true;

            return super.onOpenRowDetail(eventArgs);
        }
    }

    protected isWorkItemSaving(id: number): boolean {
        return this._rowSavingManager.isRowSaving(id);
    }

    protected onOpenWorkItemClosed(): void {
        this._isWorkItemFormOpen = false;
    }

    /**
     * OVERRIDE: onGutterClick event to disable the popup menu if id < -1 
     * 
     * @param eventArgs event argument
     */
    public onGutterClick(eventArgs: any) {

        var id = this._workItems[eventArgs.dataIndex];

        if (!this.getRowSavingManager().isRowSaving(id)) { // only raise the event if the row is not saving
            super.onGutterClick(eventArgs);
        }
    }

    /**
     * OVERRIDE: called when resizing happen
     * 
     * @param e the event sender
     */
    public _onContainerResize(e?: any) {
        super._onContainerResize(e);
    }

    /**
     * resize the grid to fill the remaining height in parent
     */
    public resize() {

        this._onContainerResize(this);
    }

    /**
     * Brings the given Work Item into view
     * 
     * @param workItemId The Work Item to bring into view
     */
    public bringWorkItemIntoView(workItemId: number) {
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var workItemDataIndex = this._getWorkItemDataIndex(workItemId);

        this.setSelectedDataIndex(workItemDataIndex);
        this._getRowIntoView(this.getSelectedRowIndex(), true);
    }

    /**
     * Gets the availability of reorder
     * 
     * @return The reorder availability
     */
    public getReorderState(): boolean {
        return this._enableReorder;
    }

    /**
     * Gets the availability of reparent
     * 
     * @return The reparent availability
     */
    public getReparentState(): boolean {
        return this._enableReparent;
    }

    public setReorderState(state: boolean) {
        /// <summary>Sets the availability of reorder</summary>
        /// <param name="state" type="Boolean">The reorder availability</return>
        Diag.Debug.assertParamIsBool(state, "state");

        this._enableReorder = state;
    }

    public setReparentState(state: boolean) {
        /// <summary>Sets the availability of reparent</summary>
        /// <param name="state" type="Boolean">The reparent availability</return>
        Diag.Debug.assertParamIsBool(state, "state");

        this._enableReparent = state;
    }

    /**
     * Returns the current workitem's according to the datamanager.  This could be different than grid._workItems if the grid hasn't been rendered yet.
     * 
     * @return 
     */
    public getWorkItemIds(): number[] {
        return this._dataManager.getWorkItemIds();
    }

    /**
     * Returns the current workitem's listed in the grid. If filter is applied, only matching items are returned
     */
    public getCurrentWorkItemIds(): number[] {
        return super.getWorkItemIds();
    }

    /**
     * Initializes the Grids data manager and registers for events with it
     */
    private _initializeDataManager() {

        this._dataManager = this._options.dataManager;

        this._dataManager.attachRefresh((source, args) => {
            /// respond to a refresh request
            if (args.workItemId) { // if workitem id specified update one row
                this._updateWorkItemRow(args.workItemId);
            }
            else { // refresh the whole grid
                this.refresh(false, { selectedWorkItemId: args.selectedWorkItemId });
            }
            this.getFilterManager().dataUpdated();
        });

        this._dataManager.attachNewItem((source, args) => {
            // add item to the grid
            this._addWorkItem(args.workItemId, args.workItem);
        });

        this._dataManager.attachMoveItems((source, args) => this._handleMoveWorkItems(args));

        this._dataManager.attachRemovedItem((source, args) => {
            // remove the item
            this._removeWorkItem(args.workItemIndex, args.parentWorkItemIndex, args.treeSize, args.workItemId);
        });

        this._dataManager.attachIdChange((source, args) => {
            // change id of a workitem in grid data structures
            this._changeWorkItemId(args.oldId, args.newId);
        });
    }

    /**
     * Initializes the row saving manager
     */
    private _initializeRowSavingManager() {
        // Attach the saving manager to the grid
        this._rowSavingManager = new TFS_RowSavingManager.RowSavingManager(
            this,
            /**
             * Get the data index the provided work item ID is associated with.
             * 
             * @param workItemId Work Item ID being looked up.
             */
            (workItemId: number) => {
                Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

                return this._dataManager.getWorkItemTreeIndex(workItemId);
            },
            /**
             * Get the id of the node associated with the provided data index.
             * 
             * @param dataIndex Data index of the node being looked up.
             */
            (dataIndex: number) => {
                Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

                return this.getWorkItemIdAtDataIndex(dataIndex);
            });
    }

    /**
     * Mark rows as saving before performing action
     * 
     * @param workItems List of work items that the save attempt will be made on
     */
    public markRowsAsSaving(workItems: WITOM.WorkItem[]) {
        Diag.Debug.assertParamIsArray(workItems, "workItems");

        var rowSavingManager = this.getRowSavingManager();

        for (var workItem of workItems) {
            rowSavingManager.markRowAsSaving(workItem.id);
        }
    }

    /**
     * Clear rows as saving after performing action
     * 
     * @param workItems List of work items that the save attempt was made on
     */
    public clearRowsAsSaving(workItems: WITOM.WorkItem[]) {
        Diag.Debug.assertParamIsArray(workItems, "workItems");

        var rowSavingManager = this.getRowSavingManager();

        for (var workItem of workItems) {
            rowSavingManager.clearRowSaving(workItem.id);
        }
    }

    /**
     * Determines whether this is a valid keyboard movement for reordering purposes
     * 
     * @param dataIndex The data index of the row to move
     * @param keyCode The key code pressed
     * @return 
     */
    private _isValidKeyboardMovement(dataIndex: number, keyCode: number): boolean {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");
        Diag.Debug.assertParamIsNumber(keyCode, "keyCode");

        var rowSaving = this._rowSavingManager.isRowSaving(this.getWorkItemIdAtDataIndex(dataIndex));

        var rowIndex = this.getRowIndex(this._keyboardReorderDataIndex);

        var firstRowMovingUp = (keyCode === Utils_UI.KeyCode.UP) && rowIndex === 0 && (this._keyboardReorderDataIndexOverTopRow || (dataIndex === 0));
        var lastRowMovingDown = rowIndex === this._expandedCount - 1 && keyCode === Utils_UI.KeyCode.DOWN;

        return !rowSaving && !firstRowMovingUp && !lastRowMovingDown;
    }

    /**
     * Clears the state that tracks keyboard reorder state. Essentially killing any in-progress keyboard reorder
     */
    private _clearKeyboardReorderState() {
        this._keyboardReorderDataIndex = null;
        this._keyboardReorderDataIndexOverTopRow = false;
        this._keyboardReorderDropEffect = null;
    }

    private _keyboardReorderIsAtTopOfGrid(): boolean {
        return this._keyboardReorderDataIndex === 0 && this._keyboardReorderDataIndexOverTopRow;
    }

    /**
     * OVERRIDE: Handles the browser keydown event on the ProductBacklogGrid
     * 
     * @param e Event args
     */
    public _onKeyDown(e: JQueryKeyEventObject) {

        if (e.ctrlKey && e.keyCode === Utils_UI.KeyCode.HOME) {
            //Ctrl+Home is used by a shortcut, so do nothing here.
            return;
        }

        if (e.keyCode === Utils_UI.KeyCode.UP || e.keyCode === Utils_UI.KeyCode.DOWN) {

            var sourceDataIndex = this.getSelectedDataIndex();

            if (this._isKeyboardReorderAvailableForCurrentSelection(e)) {
                // If this is the first keyboard reorder key sequence then initialize the state that tracks row index
                if (this._keyboardReorderDataIndex === null) {
                    this._keyboardReorderDataIndex = sourceDataIndex;
                    this._keyboardReorderDataIndexOverTopRow = false;
                }

                if (!this._isValidKeyboardMovement(sourceDataIndex, e.keyCode)) {
                    return;
                }

                // Remove the previous drag styling if it was drawn
                if (this._keyboardReorderDropEffect) {
                    this._removeAllDragStyling();
                }

                // Cancel any outstanding drawing operations
                if (this._keyboardReorderDrawDelayedFunc) {
                    this._keyboardReorderDrawDelayedFunc.cancel();
                    this._keyboardReorderDrawDelayedFunc = null;
                }

                var validDropTarget = false;
                while (!validDropTarget) {
                    // Update row index depending on direction
                    switch (e.keyCode) {
                        case Utils_UI.KeyCode.UP:
                            if (this._keyboardReorderDataIndex === 0) {
                                this._keyboardReorderDataIndexOverTopRow = true;
                            }
                            else {
                                this._keyboardReorderDataIndex = this.getDataIndex(this.getRowIndex(this._keyboardReorderDataIndex) - 1);
                            }
                            break;
                        case Utils_UI.KeyCode.DOWN:
                            if (this._keyboardReorderIsAtTopOfGrid()) {
                                this._keyboardReorderDataIndexOverTopRow = false;
                            }
                            else {
                                this._keyboardReorderDataIndex = this.getDataIndex(this.getRowIndex(this._keyboardReorderDataIndex) + 1);
                            }
                            break;
                        default:
                            Diag.Debug.fail("Unexpected keycode: " + e.keyCode);
                            break;
                    }

                    // If we are "dropping" on the same row then return after incrementing/decrementing of row counter has happened
                    if (sourceDataIndex === this._keyboardReorderDataIndex) {
                        this._getRowIntoView(this.getRowIndex(this._keyboardReorderDataIndex));
                        this._keyboardReorderDropEffect = null;
                        return;
                    }

                    // Calculate the new drop effect
                    this._keyboardReorderDropEffect = this.calculateDropEffect(
                        sourceDataIndex,
                        this._keyboardReorderDataIndex,
                        this._keyboardReorderDataIndexOverTopRow);


                    if (this._keyboardReorderDropEffect && this._keyboardReorderDropEffect.isValid) {
                        this._getRowIntoView(this.getRowIndex(this._keyboardReorderDataIndex) + (e.keyCode === Utils_UI.KeyCode.UP ? -1 : 0));
                        validDropTarget = true;

                        // For some reason lines don't draw every time in every browser unless we postpone drawing
                        this._keyboardReorderDrawDelayedFunc = Utils_Core.delay(this, 0, this._applyKeyboardDragStyling, <any>this._keyboardReorderDataIndex);
                    }
                    else if (this._keyboardReorderIsAtTopOfGrid() ||
                        this._keyboardReorderDataIndex === -1 ||
                        this.getRowIndex(this._keyboardReorderDataIndex) === this._expandedCount - 1) { // Terminate at grid boundaries

                        this._getRowIntoView(this.getRowIndex(this._keyboardReorderDataIndex));
                        this._keyboardReorderDropEffect = null;
                        break;
                    }
                }

                return;
            }
            else if (this._isKeyboardReorderGestureActive(e)) {
                // If the modifier was held but the move is not valid then ignore the event
                return;
            }
        }

        return super._onKeyDown(e);
    }

    /**
     * Determines whether it is possible to start a mouse-driven reorder event
     * 
     * @return true if mouse-driven reorder is valid for current selection
     */
    protected _isMouseReorderAvailableForCurrentSelection(): boolean {
        var selectedWorkItemIds = this.getSelectedWorkItemIds();
        if (selectedWorkItemIds.length > 0) {
            var isAnyRowSaving = selectedWorkItemIds.some(id => this._rowSavingManager.isRowSaving(id));

            // If there is no current keyboard operation and the row is not saving
            return !this._keyboardReorderDropEffect && !isAnyRowSaving;
        }

        // If current selection has only group rows or is empty, don't allow mouse operations on it. 
        return false;
    }

    /**
     * Determines whether we can reorder with the keyboard
     * 
     * @param e Event args
     * @return true if keyboard-driven reorder is valid for current selection
     */
    protected _isKeyboardReorderAvailableForCurrentSelection(e?: JQueryKeyEventObject): boolean {
        Diag.Debug.assertParamIsObject(e, "e");

        var selectedWorkItemIds = this.getSelectedWorkItemIds();
        var isAnyRowSaving = selectedWorkItemIds.some(id => this._rowSavingManager.isRowSaving(id));

        // Keyboard reordering will be disabled if any of the following are true
        //  - there is a drag in process
        //  - reordering is explicitly disabled
        //  - there are no items in the grid
        //  - selectedWorkItemIds is invalid
        //  - the grid is being filtered
        //  - we do not have the appropriate keyboard modifiers in play
        return selectedWorkItemIds.length > 0 && !isAnyRowSaving && !this._dragActionCache && this._enableReorder && this._count > 0 && !this.isFiltered() && this._isKeyboardReorderGestureActive(e);
    }

    /**
     * Determines whether the given event is the gesture to reorder with the keyboard.
     * 
     * @param e Event args
     * @return 
     */
    private _isKeyboardReorderGestureActive(e: JQueryInputEventObject): boolean {
        return e.altKey || e.ctrlKey || e.metaKey;
    }

    /**
     * Applies reorder styling to the grid based specifically for keyboard dragging
     * 
     * @param dataIndex The target data index in the grid
     */
    private _applyKeyboardDragStyling(dataIndex: number) {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        if (this._keyboardReorderDropEffect) {
            this._applyDragStyling2(<TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect>this._keyboardReorderDropEffect, dataIndex);
        }

        this._keyboardReorderDrawDelayedFunc = null;
    }

    /** Raise work item paged event */
    private _raiseWorkItemPaged(workItemId: number, pageData: any) {
        this._events.invokeHandlers(ProductBacklogGrid.EVENT_WORKITEM_PAGED, this, {
            workItemId: workItemId,
            pageData: pageData
        });
    }

    /**
     * Notifies listeners of Drag operation
     * 
     * @param event The browser event that initiated this event
     * @param action The drag event that has occurred: start|stop
     */
    private _raiseDragOperation(event: any, action: string) {

        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsString(action, "action");

        this._events.invokeHandlers(ProductBacklogGrid.EVENT_DRAG_EVENT, this, {
            event: event,
            action: action
        });
    }

    /**
     * Perform startup events for the drag operation
     * 
     * @param event The event which initiated this call
     * @param ui jQuery droppable ui object - enhanced with draggingRowInfo
     */
    private _draggableStart(event: any, ui: any) {
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(ui, "ui");

        this._clearRowMouseDownEventInfo();

        if (!this._isMouseReorderAvailableForCurrentSelection()) {
            return false;
        }

        this._element.addClass(ProductBacklogGrid.DRAG_ACTIVE_CLASS);

        // inform listeners that the drag is starting
        this._raiseDragOperation(event, ProductBacklogGrid.DRAG_OPERATION_START);
    }

    /**
     * Perform events actions when the drag operation stops. This occurs after any drop handler has executed.
     * 
     * @param event The event which initiated this call
     * @param ui UNUSED: Query droppable ui object - enhanced with draggingRowInfo
     */
    private _draggableStop(event: any, ui: any) {
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(ui, "ui");

        this._raiseDragOperation(event, ProductBacklogGrid.DRAG_OPERATION_STOP);

        if (!ui.helper.data(ProductBacklogGrid.DROP_SUCCESSFUL) && !this.isIterationBacklog()) {
            var workItemId = this.getWorkItemIdAtDataIndex(ui.draggingRowInfo.dataIndex);
            var isOwned = this._isIterationBacklog || this.getDataManager().isOwnedItem(workItemId);
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_BACKLOG_REORDER,
                {
                    "Reorder": "Unsuccessful",
                    "FilteredState": this.isFiltered(),
                    "IsOwnedItem": isOwned
                }));
        }

        this._element.removeClass(ProductBacklogGrid.DRAG_ACTIVE_CLASS);
    }

    /**
     * Called to create the draggable helper element
     * 
     * @param event The event which initiated this call
     * @param ui jQuery droppable ui object - enhanced with draggingRowInfo
     */
    protected _draggableHelper(event: any, ui: any) {
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(ui, "ui");

        var $dragTile;

        var draggableItemText, numOfSelectedItems;

        var selectedWorkItemIds = this.getSelectedWorkItemIds();
        var selectedWorkItemTypes = this.getSelectedWorkItemTypes();
        Diag.Debug.assertIsArray(selectedWorkItemIds, "selectedWorkItemIds");
        Diag.Debug.assertIsArray(selectedWorkItemTypes, "selectedWorkItemTypes");
        numOfSelectedItems = selectedWorkItemIds.length;

        $dragTile = $("<div />")
            .addClass("drag-tile");
        // single item
        if (numOfSelectedItems === 1) {
            var dataIndex = this._getWorkItemDataIndex(selectedWorkItemIds[0]);
            $dragTile.text(this.getColumnValue(dataIndex, this._getTitleColumnIndex()) || "");
        }
        // multiple items
        else {
            // multiple types or unpaged items
            if (selectedWorkItemTypes.length > 1 || selectedWorkItemTypes.length === 0) {
                draggableItemText = AgileProductBacklogResources.MultipleItemTypesDragHelperText;
            }
            // single type
            else if (numOfSelectedItems > 1) {
                draggableItemText = selectedWorkItemTypes[0];
            }

            var $dragItemCount = $("<div />")
                .addClass("drag-tile-item-count")
                .text(numOfSelectedItems);

            var $dragItemType = $("<span />")
                .addClass("drag-tile-item-type")
                .text(draggableItemText);

            $dragTile.append($dragItemCount).append($dragItemType);
        }

        // Attach data to the tile to give context information to potential drop targets.
        $dragTile.data(ProductBacklogGrid.DATA_WORK_ITEM_IDS, selectedWorkItemIds);

        // Setup the color of the tile.
        if (selectedWorkItemTypes.length == 1) {
            const colorsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
            $dragTile.css("border-left-color", colorsProvider.getColor(this.getProjectName(), selectedWorkItemTypes[0]));
        }

        return $dragTile;
    }

    /**
     * Determine whether the drag/drop pair of rows is an accepted combination.
     * 
     * @param $draggedElement The element that is being dragged.
     */
    private _droppableAccept($draggedElement: JQuery): boolean {
        Diag.Debug.assertParamIsObject($draggedElement, "$draggedElement");

        // Always Accept drop and then evaluate in the location classes
        return this._isDroppable();
    }

    /**
     * Determine whether drop operation is possible on the ProductBacklogGrid.
     */
    public _isDroppable(): boolean {
        return this._enableReorder && !this.isFiltered();
    }

    /**
     * Called when the dragged row comes over a dropping element
     * 
     * @param event The event which initiated this call
     * @param ui jQuery droppable ui object - enhanced with droppingRowInfo and draggingRowInfo
     */
    private _droppableOver(event: any, ui: any) {
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(ui, "ui");

        var isAboveFirstOrBelowLast = ui.droppingRowInfo.isAboveFirstOrBelowLast,
            draggingIndex = ui.draggingRowInfo.dataIndex,
            droppingIndex = computeDataIndexForRow(isAboveFirstOrBelowLast, ui.droppingRowInfo.dataIndex);

        // check for cached drag action and verify if it's still valid
        if (this._dragActionCache) {
            if (this._dragActionCache.draggingRowIndex !== draggingIndex ||
                this._dragActionCache.droppingRowIndex !== droppingIndex) {
                // clean out old drag action
                this._removeAllDragStyling();
                this._dragActionCache = null;
            }
        }

        // if no current drag action - determine action and apply styles
        if (!this._dragActionCache && this._isDroppable()) {

            this._dragActionCache = {
                draggingRowIndex: draggingIndex,
                droppingRowIndex: droppingIndex,
                isAboveFirstOrBelowLast: isAboveFirstOrBelowLast,
                dropEffect: this.calculateDropEffect(draggingIndex, droppingIndex, ui.droppingRowInfo.isAboveFirstOrBelowLast)
            };

            this._applyDragStyling2(<TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect>this._dragActionCache.dropEffect, droppingIndex);
        }
    }

    /**
     * Called when the dragged come out of a dropping element
     * 
     * @param event The event which initiated this call
     * @param ui jQuery droppable ui object - enhanced with droppingRowInfo and draggingRowInfo
     */
    private _droppableOut(event: any, ui: any) {
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(ui, "ui");

        var cache = this._dragActionCache,
            draggingIndex = ui.draggingRowInfo.dataIndex,
            droppingIndex = ui.droppingRowInfo.dataIndex;

        // check for cached drag action and verify if it's still valid
        if (cache &&
            cache.draggingRowIndex === draggingIndex &&
            cache.droppingRowIndex === droppingIndex) {

            // clean out old drag action
            this._removeAllDragStyling();
            this._dragActionCache = null;
        }
    }

    /**
     * Called when the dragged row is dropped
     * 
     * @param event The event which initiated this call
     * @param ui jQuery droppable ui object - enhanced with droppingRowInfo and draggingRowInfo
     */
    private _droppableDrop(event: any, ui: any) {
        var dataIndex = ui.draggingRowInfo.dataIndex;
        var dropEffect = this.calculateDropEffect(dataIndex, computeDataIndexForRow(ui.droppingRowInfo.isAboveFirstOrBelowLast, ui.droppingRowInfo.dataIndex), ui.droppingRowInfo.isAboveFirstOrBelowLast);
        if (dropEffect && dropEffect.isValid) {
            this.performActionWithPreserveSelection(() => {
                var scenario = Performance.getScenarioManager().startScenario(
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE, "Backlog.ReorderWorkItems");
                scenario.addData({
                    workItemCount: (<TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect>dropEffect).workItemIds.length
                });

                // Attach scenario to effect, to complete when items have been reordered
                (<TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect>dropEffect).perfScenario = scenario;

                // set focusOnFirstMovedItem as to not jump to where dragging started from in case of drag-drop
                this.getDataManager().moveWorkItems(<TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect>dropEffect, true, true, true);
                //TODO: Add telemetry for multiselect dnd
            });

            ui.helper.data(ProductBacklogGrid.DROP_SUCCESSFUL, true);
        }
    }

    /**
     * Deactivate dragging action - remove drag styling
     * 
     * @param event The event which initiated this call
     * @param ui jQuery droppable ui object - enhanced with droppingRowInfo and draggingRowInfo
     */
    private _droppableDeactivate(event: any, ui: any) {
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(ui, "ui");

        var cache = this._dragActionCache;

        if (cache) {
            this._removeAllDragStyling();
            this._dragActionCache = null;
        }
    }

    /**
     * return title column index
     */
    private _getTitleColumnIndex() {

        // If the title index has not been looked up yet, then get it.
        if (!this._titleColumnIndex) {
            var i;
            var l;
            var columns = this._columns;

            for (i = 0, l = columns.length; i < l; i += 1) {
                if (columns[i].name === WITConstants.CoreFieldRefNames.Title) {
                    this._titleColumnIndex = i;
                    break;
                }
            }
        }

        return this._titleColumnIndex;
    }

    /**
     * Adds a new workitem to the page
     * 
     * @param workItemId The id of the work item to add
     * @param workItem workitem object
     */
    private _addWorkItemToPage(workItemId: number, workItem: WITOM.WorkItem) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");
        Diag.Debug.assertParamIsObject(workItem, "workItem");

        this.getPageData()[workItemId] = [];

        for (let fieldId of Object.keys(this.getColumnMap())) {
            let field = workItem.getField(fieldId);
            let fieldValue = field ? field.getDisplayText() : "";
            this._updatePageColumn(workItemId, fieldId, fieldValue);
        }

        // Always set work item type and state even if not included in columns
        if (this._requiredColumnReferenceNames) {
            this._requiredColumnReferenceNames.forEach(referenceName => {
                this._updatePageColumn(workItemId, referenceName, workItem.getFieldValue(referenceName) || "");
            });
        }
    }

    /** 
     * Add page data for a work item
     * @param workItemId Id of work item to set page data for
     * @param pageData Page data for work item. Has to include all of the current grid's page columns
     */
    public addWorkItemPageData(workItemId: number, pageColumns: string[], pageData: any[]) {

        const currentPageData = this.getPageData()

        Diag.Debug.assert(pageColumns.length === pageData.length, "Page column and page data length does not match");
        Diag.Debug.assert(!currentPageData[workItemId], "Page data does already exist");

        currentPageData[workItemId] = [];

        let matchedColumns = 0;
        const columnMap = this.getColumnMap();

        for (var i = 0; i < pageColumns.length; ++i) {
            var pageColumnRefName = pageColumns[i];

            // Ensure that the column exists in the current page columns
            var fieldIdx = columnMap[pageColumnRefName];
            if (typeof fieldIdx === 'undefined') {
                continue;
            }

            this._updatePageColumn(workItemId, pageColumnRefName, pageData[i] || "");

            ++matchedColumns;
        }

        Diag.Debug.assert(this.getPageColumns().length === matchedColumns, "Not all page data columns have been set");

        this._raiseWorkItemPaged(workItemId, currentPageData[workItemId]);
    }

    /**
     * Return true if the page data already exists.
     * 
     * @param workItemId ID of the work item.
     */
    public isWorkItemPaged(workItemId: number): boolean {
        return !!this.getPageData()[workItemId];
    }

    /**
     * Updates the page column with the provided value.
     * 
     * @param workItemId ID of the work item to update the page column for.
     * @param fieldId ID of the field for the column to update the value for.
     * @param value Value to store in the page data.
     */
    private _updatePageColumn(workItemId: number, fieldId: string, value: any) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");
        Diag.Debug.assertParamIsString(fieldId, "fieldId");
        Diag.Debug.assertParamIsNotNull(value, "value");

        var page = this.getPageData()[workItemId],
            fieldIndex = this.getColumnMap()[fieldId];     // Determine the field index in the page data which matches to this column.

        if (fieldIndex !== undefined) {
            page[fieldIndex] = value;
        }
    }

    /**
     * OVERRIDE: update row
     */
    public _updateRow(rowInfo, rowIndex, dataIndex, expandedState, level) {

        var workItemId = this._workItems[dataIndex];
        var $row = rowInfo.row;

        // Check if this is a custom group row; if so, get the row renderer from it
        // and save this is a row-extension object for later use
        if (!rowInfo.rowExtn) {
            var groupRow = GridGroupRowBase.getGroupRow(workItemId);

            if (groupRow) {
                var renderer = groupRow.getRowRenderer(rowInfo, rowIndex, dataIndex);

                rowInfo.rowExtn = renderer;
            }
        }

        super._updateRow(rowInfo, rowIndex, dataIndex, expandedState, level);

        if (workItemId < 0) {
            // Custom row or temporary workItem
            $row.addClass('product-backlog-custom-row');
        }

        if (!rowInfo.rowExtn) {
            if (workItemId < 0) {
                $row.addClass(ProductBacklogGrid.NEW_WORKITEM_CLASS);
            }
            else if ($row.hasClass(ProductBacklogGrid.NEW_WORKITEM_CLASS)) {
                $row.removeClass(ProductBacklogGrid.NEW_WORKITEM_CLASS);
            }
        }
    }

    protected renderWorkItemTypeColorAndIcon($gridCell: JQuery, projectName: string, workItemId: number, workItemTypeName: string, dataIndex: number): void {
        //project name and workitemtype name could be empty when workitem data is not ready,
        //to avoid icon flickering, just not render them (without those names, the icon component will display default icon)
        const isWorkItemTypeAndProjectNameEmpty = !(projectName || workItemTypeName);
        if (this.isUnparentedRow(workItemId)) {
            // Render color and icon for unparented row
            WorkItemTypeIconControl.renderWorkItemTypeIcon(
                $gridCell[0],
                workItemTypeName,
                {
                    color: this._getCustomTypeCellColor(dataIndex),
                    icon: WorkItemTypeColorAndIcons.DEFAULT_UNPARENTED_WORKITEM_BOWTIE_ICON
                },
                {
                    suppressTooltip: true
                } as WorkItemTypeIconControl.IIconAccessibilityOptions);
        }
        else if (!isWorkItemTypeAndProjectNameEmpty) {
            super.renderWorkItemTypeColorAndIcon($gridCell, projectName, workItemId, workItemTypeName, dataIndex);
        }
    }

    private _getCustomTypeCellColor(dataIndex: number) {
        // If this is for a custom group row, get the typeCell color from it, else use defaults. 
        const row = this._rows[dataIndex];
        return row.rowExtn ? row.rowExtn.getTypeColor() : null;
    }

    /** Apply/remove styling/actions to the grid to show the effect of the drag operation.
     *  This will visually highlight the new parent, siblings and insertion point, and will delay-expand a collapsed drop target.
     *  @param  moveEffect  The effect of moving work item(s)
     *  @param  dataIndex The data index of the row being hovered over
     */
    // TODO: Remove _applyDragStyling and rename this to _applyDragStyling after FF removal
    private _applyDragStyling2(moveEffect: TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect, dataIndex: number) {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");
        // If dragging over a collapsed parent, delay-expand it.
        if (this._getExpandState(dataIndex) < 0) {
            this._scheduleDelayExpandRow(dataIndex);
        }

        if (!moveEffect || !moveEffect.isValid) {
            return;
        }

        Diag.Debug.assertParamIsObject(moveEffect, "moveEffect");

        var sourceWorkItemIds: number[] = moveEffect.workItemIds;
        var parentId = moveEffect.targetLocation.parentId;
        var previousId = moveEffect.targetLocation.previousId;
        var nextId = moveEffect.targetLocation.nextId;

        var parentDataIndex, highlightNewParent: boolean = false;

        if (parentId !== 0) { // Non top-level item(s) dragged
            parentDataIndex = this._getWorkItemDataIndex(parentId);
        }

        // If any of the source work items have a different parent than the location, apply the appropriate styling
        var sourceParentIndexes: IDictionaryNumberTo<boolean> = {};
        for (var id of sourceWorkItemIds) {
            let wiDataIndex = this._getWorkItemDataIndex(id);
            sourceParentIndexes[this.getDataManager().getParentIndexFromTreeIndex(wiDataIndex)] = true;
        }

        if (Object.keys(sourceParentIndexes).length > 1 || Object.keys(sourceParentIndexes).length === 1 && +Object.keys(sourceParentIndexes)[0] !== parentDataIndex) {
            // item(s) dragged have different parents
            highlightNewParent = true;
        }

        // some or all items have a new parent. Apply styling to the new parent
        if (this._enableReparent && parentDataIndex !== null && highlightNewParent) {
            var rowInfo = this._rows[parentDataIndex];
            if (rowInfo) {
                rowInfo.row.addClass(ProductBacklogGrid.DRAG_HOVER_CLASS);
            }
        }

        var insertDataIndex, insertBefore: boolean = false;

        insertDataIndex = this._getInsertDataIndex(moveEffect.targetLocation);
        insertBefore = (parentId === 0 && !previousId && nextId) ? true : false; // Move a top level item to the first position. 

        // no parent, so the insertion will be at the root level, so show a "full" line
        if (parentId === 0) {
            rowInfo = this._rows[insertDataIndex];
            if (rowInfo) {
                rowInfo.row.addClass(ProductBacklogGrid.DRAG_FULL_LINE_CLASS);
            }
        }

        // apply styling for insertion point taking into account whether we're inserting
        // above (top row) or below.
        rowInfo = this._rows[insertDataIndex];
        if (rowInfo) {
            rowInfo.row.addClass(insertBefore ? ProductBacklogGrid.DRAG_INSERT_BEFORE_CLASS : ProductBacklogGrid.DRAG_INSERT_AFTER_CLASS);
        }
    }

    /** Removes any styling/effects associated with drag-drop operations. */
    private _removeAllDragStyling() {
        // Cancel any scheduled delayed expansions.
        this._cancelDelayExpandRow();

        // Remove the styles from the grid.
        var stylesToRemove: string = [ProductBacklogGrid.DRAG_HOVER_CLASS,
        ProductBacklogGrid.DRAG_NEW_PARENT_CLASS,
        ProductBacklogGrid.DRAG_INSERT_BEFORE_CLASS,
        ProductBacklogGrid.DRAG_INSERT_AFTER_CLASS,
        ProductBacklogGrid.DRAG_FULL_LINE_CLASS].join(" ");
        $.each(this._rows, (i, rowInfo) => {
            (<JQuery>rowInfo.row).removeClass(stylesToRemove);
        });
    }

    /** Schedule a delayed expansion of the specified grid row.
     *  @param  dataIndex  The data index for the grid row to expand. */
    private _scheduleDelayExpandRow(dataIndex: number) {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        var expandNodeFunction = () => {
            // Grid.tryToggle will automatically set the selection to the toggled item.
            // Explicitly record & restore the original selection.

            let originalSelectedIds = this.getSelectedWorkItemIdsWithGroupRows();
            let filteredDraggingIds = originalSelectedIds.filter(id => GridGroupRowBase.getGroupRow(id) === null);
            let draggingRowType = filteredDraggingIds ? this.getWorkItemTypeNameById(filteredDraggingIds[0]) : null;
            let droppingRowType = this.getWorkItemTypeNameByIndex(dataIndex);

            if (!this._gridReorderBehavior || !draggingRowType ||
                !this._gridReorderBehavior.shouldExpandRow(draggingRowType, droppingRowType)) {
                return;
            }

            this.tryToggle(true, false, dataIndex);
            this._clearSelection();
            if (originalSelectedIds) {
                this.setSelectedWorkItemIds(originalSelectedIds);
            }

            this._removeAllDragStyling();

            if (this._dragActionCache) {
                // Recalculate the dropEffect and reapply drag styling
                var draggingIndex = this._dragActionCache.draggingRowIndex;
                var droppingIndex = this._dragActionCache.droppingRowIndex;

                this._dragActionCache.dropEffect = this.calculateDropEffect(draggingIndex, droppingIndex, this._dragActionCache.isAboveFirstOrBelowLast);
                this._applyDragStyling2(<TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect>this._dragActionCache.dropEffect, droppingIndex);
            }
            else if (this._keyboardReorderDropEffect) {
                // Ensure dropTarget is still valid. If the target is invalid, try dropping the selection as sibling
                var droppingIndex = dataIndex;
                this._keyboardReorderDropEffect = this.calculateDropEffect(
                    null,
                    droppingIndex,
                    this._keyboardReorderDataIndexOverTopRow);
                if (!this._keyboardReorderDropEffect || !this._keyboardReorderDropEffect.isValid) {
                    droppingIndex = dataIndex + this.getVisibleDescendantCount(dataIndex);
                    this._keyboardReorderDropEffect = this.calculateDropEffect(
                        null,
                        droppingIndex,
                        this._keyboardReorderDataIndexOverTopRow);
                }
                this._applyDragStyling2(<TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect>this._keyboardReorderDropEffect, droppingIndex);
            }
        }

        if (!this._expandRowDelayedFunction) {
            this._expandRowDelayedFunction = new Utils_Core.DelayedFunction(this, ProductBacklogGrid.DRAGHOVER_DELAYED_TIME, "dragHoverDelayedFunction", expandNodeFunction);
        } else {
            this._expandRowDelayedFunction.cancel();
            this._expandRowDelayedFunction.setMethod(this, expandNodeFunction);
        }
        this._expandRowDelayedFunction.start();
    }

    /** Cancel any pending delayed expansion of any grid rows. */
    private _cancelDelayExpandRow() {
        if (this._expandRowDelayedFunction) {
            this._expandRowDelayedFunction.cancel();
        }
    }

    /**
     * Get Data Index of a workitem in current grid data
     * 
     * @param workItemId workItem Id
     * @return 
     */
    public _getWorkItemDataIndex(workItemId: number): number {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        // Tree index and data index are matching
        return this.getDataManager().getWorkItemTreeIndex(workItemId);
    }

    public _getWorkItemDataIndexInFilteredView(workItemId: number): number {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");
        Diag.Debug.assertIsNotNull(this._workItems, "this._workItems")

        if (this._workItems) {
            return Utils_Array.indexOf(this._workItems, workItemId);
        }
    }

    // Returns the number of visible descendants including the current item
    // Example
    // 1 
    //   2..3..4[3 and 4 are collapsed]
    //   5  
    // returns 3 (1, 2, and 5 are the visible work item rows) for getVisibleDescendantCountIncludingCurrentItem(dataIndex(1))
    public getVisibleDescendantCount(dataIndex: number): number {

        // this is keyed of dropEffect.previous which could be null in some cases. To safeguard against it, we are returning 0.
        if (typeof dataIndex !== 'number') return 0;

        if (this._expandStates[dataIndex] <= 0) return 0;

        var result = 0;
        var descendantCountAtRootIndex = this._expandStates[dataIndex];
        var startIndex = dataIndex + 1;

        for (var i = startIndex; i < startIndex + descendantCountAtRootIndex; i++) {
            result++;
            var descendantCount = this._expandStates[i];
            if (descendantCount < 0) {
                i = i + Math.abs(descendantCount);
            }
        }
        return result;
    }

    /**
     * update row for a workitem
     * 
     * @param workItemId workItem Id
     */
    private _updateWorkItemRow(workItemId: number) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var index = this._getWorkItemDataIndex(workItemId);

        if (index >= 0 && this._rows[index]) {
            this.updateRow(this._rows[index].rowIndex, index);
        }
    }

    /**
     * Adds a new row in the grid that displays a work item
     * 
     * @param workItemId The id of the work item to add
     * @param workItem Optional workitem object
     */
    private _addWorkItem(workItemId: number, workItem?: WITOM.WorkItem) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var dataManager = this.getDataManager(),
            index = dataManager.getWorkItemTreeIndex(workItemId);

        if (workItem) {
            // Add workitem to page to avoid another roundtrip to get page data
            this._addWorkItemToPage(workItemId, workItem);
        }

        // We need to add zero at the expanded state for the new item.
        this._expandStates.splice(index, 0, 0);

        // Update the expand states for the parents.
        var parentIndex = dataManager.getParentIndexFromTreeIndex(index);
        this._updateExpandStates(parentIndex, 1);
    }

    /**
     * CalculateDropEffect for mouse, keyboard actions
     * 
     * @param sourceDataIndex The data index of the source row (draggable)
     * @param targetDataIndex The data index of the target row (droppable)
     * @return See calculateDropEffect returns
     */
    public calculateDropEffect(sourceDataIndex: number, targetDataIndex: number, isAboveFirstOrBelowLast?: boolean): TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect {

        Diag.Debug.assertParamIsNumber(targetDataIndex, "targetDataIndex");

        // dummy drop effect with isValid flag to false in case of the grid data provider is not attached.
        var result = <TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect>{
            workItemIds: [],
            targetLocation: null,
            isValid: false
        };

        if (this._gridReorderBehavior) {
            var isReparentingGesture: boolean = false;
            var sourceWorkItemIds = this.getSelectedWorkItemIds();
            var targetWorkItemId = this.getWorkItemIdAtDataIndex(targetDataIndex);

            // Default to an explicit reparent if an item is not owned
            isReparentingGesture = sourceWorkItemIds.some((value) => { return !this.getDataManager().isOwnedItem(value) });

            return this._gridReorderBehavior.calculateMoveWorkItemsEffect(
                sourceWorkItemIds,
                targetWorkItemId,
                isReparentingGesture,
                isAboveFirstOrBelowLast);
        } else {
            return result;
        }
    }

    /**
     * Handle move work items event. Updates expansion states for moved and reparented work items.
     * 
     * @eventArgs Move work items event arguments
     */
    protected _handleMoveWorkItems(eventArgs: TFS_Agile_ProductBacklog_DM.Events.IWorkItemsMovedEventArgs) {
        var updateAncestors = (ancestorIndices: number[], treeSize: number, expand: boolean) => {
            for (let ancestorIndex of ancestorIndices) {
                let expandValue = expandStates[ancestorIndex];
                if (expandValue < 0) {
                    // Item is collapsed
                    expandStates[ancestorIndex] -= treeSize;
                }
                else {
                    // Item is expanded
                    expandStates[ancestorIndex] += treeSize;
                }

                if (expand && treeSize > 0) {
                    expandStates[ancestorIndex] = Math.abs(expandStates[ancestorIndex]);
                }
            }
        }

        var expandStates = this.getUnfilteredExpandStates();
        for (let treeChange of eventArgs.treeChanges) {
            // Update old and new ancestors with the new children count
            updateAncestors(treeChange.affectedSourceAncestorIndexes, -1 * treeChange.treeSize, false);
            updateAncestors(treeChange.affectedTargetAncestorIndexes, treeChange.treeSize, true);

            Utils_Array.reorder(expandStates, treeChange.oldTreeIndex, treeChange.newTreeIndex, treeChange.treeSize);
        }

        // both members should point to the same array
        // (In filtered view, this._expandStates is null since filtered view is flat. Changing the expand states
        //  here would result in messy hierachy in the filtered view. So do this only in unfiltered view).
        if (!this.isFiltered()) {
            this._expandStates = expandStates;
        }
    }

    protected _getInsertDataIndex(location: TFS_Agile_WorkItemChanges.ILocation): number {

        var parentId = location.parentId;
        var previousId = location.previousId;
        var nextId = location.nextId;

        var insertDataIndex = null;
        if (previousId) {
            // Display insertion line after previous item (and all its visible descendants)
            var previousDataIndex = this._getWorkItemDataIndex(previousId);
            var previousRowIndex = this._getRowIndex(previousDataIndex);
            var visibleDescendantCount = this.getVisibleDescendantCount(previousDataIndex);

            // get the data index for the row index
            insertDataIndex = this._getDataIndex(previousRowIndex + visibleDescendantCount);
        } else {
            if (!parentId && nextId) {
                // We are moving to the top of the list
                insertDataIndex = 0;
            } else if (parentId) {
                // Parent is given, inserting either as only child or first child
                insertDataIndex = this._getWorkItemDataIndex(parentId);
            }
        }

        return insertDataIndex;
    }

    /**
     * Remove a work item from the grid.
     * 
     * @param workItemIndex Index of the work item in the tree.
     * @param parentWorkItemIndex Index of the parent work item in the tree.
     * @param treeSize The size of the tree for the work item (includes the work item and all children).
     * @param workItemId The id of the workItem being removed.
     */
    private _removeWorkItem(workItemIndex: number, parentWorkItemIndex: number, treeSize: number, workItemId: number) {

        Diag.Debug.assertParamIsNumber(workItemIndex, "workItemIndex");
        Diag.Debug.assertParamIsNumber(parentWorkItemIndex, "parentWorkItemIndex");
        Diag.Debug.assertParamIsNumber(treeSize, "treeSize");

        // Remove the expand states for the removed item and its children.
        this.getUnfilteredExpandStates().splice(workItemIndex, treeSize);

        // Update parents expand states
        this._updateExpandStates(parentWorkItemIndex, -treeSize)
    }

    /**
     * Change workitemId
     * 
     * @param oldId oldId
     * @param newId newId
     */
    private _changeWorkItemId(oldId: number, newId: number) {

        let index = this._getWorkItemDataIndex(oldId);

        const pageData = this.getPageData();
        // Update the page data for the work item now that the ID has been assigned.
        pageData[newId] = pageData[oldId];
        delete pageData[oldId];
        this._workItems[index] = newId; // update workitem

        this._updatePageColumn(newId, WITConstants.CoreFieldRefNames.Id, newId);

        // Ensure the row is redrawn now that the ID is updated.
        this.updateRow(undefined, index);

        this._changeWorkItemIdInLastVisibleRange(oldId, newId);
    }

    /**
     * Updates the expand states to account for changes in the grid data.
     * 
     * @param itemIndex Index of the item to start updating at.
     * @param increment Number of items added or removed.  The expand states will be incremented by this value.
     */
    private _updateExpandStates(itemIndex: number, increment: number) {

        Diag.Debug.assertParamIsNumber(itemIndex, "itemIndex");
        Diag.Debug.assertParamIsNumber(increment, "increment");

        var dataManager = this.getDataManager(),
            workItemIndex = itemIndex,
            expandStates = this.getUnfilteredExpandStates();

        if (itemIndex >= 0) {
            // Walk the expanded state tree and update the item and its parents.
            do {
                if (expandStates[workItemIndex] < 0) { // if collapsed then decrement to add new element to the tree
                    expandStates[workItemIndex] -= increment;
                }
                else {
                    expandStates[workItemIndex] += increment;
                }

                workItemIndex = dataManager.getParentIndexFromTreeIndex(workItemIndex);
            } while (workItemIndex >= 0); // check if it has a parent
        }
    }

    // Override
    public selectedIndexChanged(selectedRowIndex, selectedDataIndex) {
        super.selectedIndexChanged(selectedRowIndex, selectedDataIndex);
        let eventArgs: Events.IBacklogGridSelectionChangedEventArgs = {
            selectedWorkItems: this.getSelectedWorkItemIds().map(id => {
                let gridItem: Events.IBacklogGridItem = {
                    workItemId: id,
                    workItemType: this.getWorkItemTypeNameById(id)
                }
                return gridItem;
            })
        };
        this._eventHelper.fire(Events.BacklogNotifications.BACKLOG_GRID_SELECTION_CHANGED, this, eventArgs);
    }
}

VSS.initClassPrototype(ProductBacklogGrid, {
    _titleColumnIndex: 0,
    _events: null,
    _dataManager: null,
    _enableReorder: false,
    _rowSavingManager: null,
    _contextMenuCreator: null,
    _contextMenuErrorHandler: null,
    _keyboardReorderRowIndex: null,
    _keyboardReorderRowIndexOverTopRow: false,
    _keyboardReorderDropEffect: null,
    _keyboardReorderDrawDelayedFunc: null,
    _dragActionCache: null
});

VSS.classExtend(ProductBacklogGrid, TFS_Host_TfsContext.TfsContext.ControlExtensions);

/** Removes the any custom/hidden columns if exists. */
function filterCustomAndHiddenGridColumns(columns: Grids.IGridColumn[]): Grids.IGridColumn[] {
    return columns.slice(0).filter(column => column.fieldId && !column.hidden);
}

/**
 * BacklogsHtmlTableFormatter extends QueryResultHtmlTableFormatter to support contextMenus (email, copyAsHtml) on product backlog grid.
 */
export class BacklogsHtmlTableFormatter extends QueryResultGrid.QueryResultHtmlTableFormatter {
    public _grid: ProductBacklogGrid;

    constructor(grid: ProductBacklogGrid, options?) {
        super(grid, options);
    }

    public processColumns(columns: Grids.IGridColumn[]): Grids.IGridColumn[] {
        return super.processColumns(filterCustomAndHiddenGridColumns(columns));
    }

    protected _getSelectedDataIndicesFromGrid(): number[] {
        return this._grid.getSelectedDataIndices().filter(
            dataIndex => this._grid.getWorkItemIdAtDataIndex(dataIndex) > 0);
    }
}


