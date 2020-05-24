///<amd-dependency path="jQueryUI/droppable"/>
///<amd-dependency path="VSS/Utils/Draggable"/>
/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Q = require("q");
import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Menus = require("VSS/Controls/Menus");
import Popup_Content = require("VSS/Controls/PopupContent");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Search = require("VSS/Search");
import Service = require("VSS/Service");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import GenericHtmlTableFormatter = require("VSS/Utils/HtmlTableFormatter");

const log = Diag.log;
const verbose = Diag.LogVerbosity.Verbose;
const delegate = Utils_Core.delegate;
const domElem = Utils_UI.domElem;

/** When resizing columns via keyboard, the number of pixels to resize per keypress. */
const ColumnSizeAdjustDelta = 10;

interface IMeasurements {
    rowHeight?: number;
    cellOffset?: number;
    unitEx?: number;
    gutterWidth?: number;
}

let measurements: IMeasurements;

function expand(index: number, count: number, level: number, states: number[], levels: number[]) {
    var childCount;

    while (index < count) {
        levels[index] = level;
        childCount = Math.abs(states[index++]) + index;
        if (childCount > index) {
            expand(index, childCount, level + 1, states, levels);
            index = childCount;
        }
    }
}

const enum Direction {
    Left,
    Right
}

interface IIntersectPosition {
    pageY?: any;
    pageX?: any
}

/**
 * @publicapi
 */
export interface IGridOptions {
    /**
     * Data source of the grid. It can be array of arrays ([[], [], [], ...]),  array of objects ([{}, {}, {}, ...])
     * @defaultvalue "[]"
     */
    source?: any;

    /**
     * Specifies the expand states of each item in the source. If an item has a total of n descendants; -n makes the item collapsed, n makes the item expanded, 0 means no children and descendants.
     */
    expandStates?: number[];

    /**
     * Determines whether the header is displayed or not
     * @defaultvalue true
     */
    header?: boolean;

    /**
     * Height of the grid in px or %
     */
    height?: string;

    /**
     * Width of the grid in px or %
     */
    width?: string;

    /**
     * Determines whether multiple selection is allowed or not
     * @defaultvalue true
     */
    allowMultiSelect?: boolean;

    /**
     * Determines whether moving columns is allowed or not
     * @defaultvalue true
     */
    allowMoveColumns?: boolean;

    /**
     * Determines whether selecting text is allowed or not
     * @defaultvalue false
     */
    allowTextSelection?: boolean;

    /**
     * Determines whether the last cell should fill remaining content (if exists)
     * @defaultvalue false
     */
    lastCellFillsRemainingContent?: boolean;

    /**
     * List of columns to be displayed in the grid
     * @defaultvalue "[]"
     */
    columns?: IGridColumn[];

    /**
     * Options about the gutter. If specified false, gutter will be invisible
     * @defaultvalue false
     */
    gutter?: IGridGutterOptions;

    /**
     * Options about the context menu displayed when gutter clicked
     */
    contextMenu?: IGridContextMenu;

    /**
     * Initial sort info for the grid
     * @defaultvalue "[]"
     */
    sortOrder?: IGridSortOrder[];

    /**
     * Specifies whether grid should be sorted initially using the sortOrder option
     * @defaultvalue true
     */
    autoSort?: boolean;

    asyncInit?: boolean;
    initialSelection?: boolean;
    sharedMeasurements?: boolean;
    payloadSize?: number;
    extendViewportBy?: number;
    coreCssClass?: string;
    draggable?: any;
    droppable?: any;
    sort?: Function;
    enabledEvents?: any;
    openRowDetail?: any;
    suppressRedraw?: boolean;
    keepSelection?: boolean;

    /**
     * Specifies whether to use the legacy grid style rather than Bowtie.
     * @defaultvalue false
     */
    useLegacyStyle?: boolean;

    /**
     * @privateapi
     * Type of the formatter which is used for retrieving the content from the grid
     * Used in beginTableFormat, called when triggering a copy action
     */
    formatterType?: new (grid: GridO<any>, options?: any) => ITableFormatter;
}

export interface IGridContextMenu {
    /**
     * Menu items to be shown when gutter clicked. Value can be a list of menu items or a function which returns an a list of menu items
     */
    items?: any;

    /**
     * Execute action for the popup menu
     */
    executeAction?: (args: any) => any;

    contributionIds?: string[];

    /**
     * Specifies whether to use the modern bowtie styling (bowtie styles are in preview and subject to change).
     * @defaultvalue false
     */
    useBowtieStyle?: boolean;

    /**
     * Column index for the context menu, if using bowtie styling
     */
    columnIndex?: number | string;

    /**
     * Specifies whether loading of contributions are suppresed at start
     * @defaultvalue false
     */
    suppressInitContributions?: boolean;
}

export interface IGridGutterOptions {
    /**
     * Determines whether a context menu is show in the gutter or not 
     * @defaultValue false
     */
    contextMenu?: boolean;

    checkbox?: boolean;
    icon?: IGridGutterIconOptions;
}

export interface IGridGutterIconOptions {
    /**
     * String or number value to get the icon value from source item corresponding to current row
     */
    index?: any;

    /**
     * String or number value to get the icon tooltip value from source item corresponding to current row
     */
    tooltipIndex?: any;
}

export interface IGridColumn {
    /**
     * Index of the column which can be either number or string. If number specified, each item of the data source is expected to be an array. Then array[index] is displayed in the column. If string specified, each item if the data source is expected to be an object. Then object[index] is displayed in the column.
     * @defaultvalue "index in the columns array"
     */
    index?: any;

    /**
     * Name of the column used for identification purposes
     */
    name?: string;

    /**
     * Determines whether moving this column is enabled or not
     * @defaultvalue true
     */
    canSortBy?: boolean;

    /**
     * Determines whether sorting this column is enabled or not
     * @defaultvalue true
     */
    canMove?: boolean;

    /**
     * Width of the column in pixels
     * @defaultvalue 100
     */
    width?: number;

    /**
     * Css class to be added to the header cell
     */
    headerCss?: string;

    /**
     * Css class to be added to the header cell container
     */
    headerContainerCss?: string;

    /**
     * Css class to be added to the cells under this column
     */
    rowCss?: string;

    /**
     * Display text of the column
     * @defaultvalue ""
     */
    text?: string;

    /**
     * Tooltip text of the column
     * @defaultvalue ""
     */
    tooltip?: string;

    /**
     * Specifies how ordering should be performed ("asc" or "desc")
     * @defaultvalue "asc"
     */
    order?: string; // "asc" or "desc"

    /**
     * Determines whether the column should be hidden or not
     * @defaultvalue false
     */
    hidden?: boolean;

    /**
     * Determines whether column moving effects this column or not
     * @defaultvalue false
     */
    fixed?: boolean;

    /**
    * Prevents the HTML table formatter from HTML encoding
    * @defaultvalue false
    */
    noHtmlEncode?: boolean;

    /**
     * If the value of cell is Date, format is used (like 'mm/dd/yyyy')
     */
    format?: string;

    hrefIndex?: number;
    indentOffset?: number;
    indent?: boolean;
    maxLength?: number;
    fieldId?: any;
    comparer?: (column: IGridColumn, order: number, rowA: any, rowB: any) => number;
    isSearchable?: boolean;

    getCellContents?: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => void;
    getHeaderCellContents?: (IGridColumn) => JQuery;
    getColumnValue?: (dataIndex: number, columnIndex: number | string, columnOrder?: number) => any; // should this be string?

    /**
    * Custom click handler for the column header
    */
    onHeaderClick?: (column: IGridColumn) => void;
}

export interface IGridSortOrder {
    /**
     * Refers to column index
     */
    index: any;

    /**
     * Determines whether to sort ascending (default) or descending
     * @defaultvalue "asc"
     */
    order?: string;
}

export interface IGridRowInfo {
    dataIndex?: number;
    rowIndex?: number;
    row?: JQuery;
    dirty?: boolean;
    gutterRow?: any;
}

/**
 * Base item for a grid source (represents a row)
 */
export interface IGridSourceItem {
    [key: string]: any;
}

/**
 * Contract for the grid source.
 * Implementers should return source and expandStates arrays.
 */
export interface IGridSource {
    /**
     * Grid to update the source
     */
    grid: Grid;

    /**
     * Gets the source which can be consumed by the grid
     */
    getSource(): any[];

    /**
     * Gets the expand states of the source
     */
    getExpandStates(): number[];

    /**
     * Updates the source of the grid
     */
    update(items: IGridSourceItem[]);
}

/**
 * HTMLElement augmented with a data member (post hoc typing of an old hack).
 */
interface HTMLElementWithData extends HTMLElement {
    _data: Object;
}

type GridMode = "grid" | "list" | "treegrid";

/**
 * Default datasource implementation for the grid. It can be used for a flat list.
 */
export class GridDefaultSource implements IGridSource {
    public grid: Grid;
    protected _source: any[];

    constructor(items: IGridSourceItem[]) {
        this.update(items);
    }

    public update(items: IGridSourceItem[]): void {
        this._updateSource(items);
        if (this.grid) {
            this.grid.setDataSource(this);
        }
    }

    public getSource(): any[] {
        return this._source;
    }

    public getExpandStates(): number[] {
        return null;
    }

    protected _updateSource(items: IGridSourceItem[]): void {
        this._source = items || [];
    }
}

/**
 * Item contract for a hierarchical data source. 
 * It can either have its own properties to be shown in the grid or values array can be used.
 * If values used, column.index should correspond to the index in the values.
 */
export interface IGridHierarchyItem extends IGridSourceItem {
    /**
     * Values to be used by grid to display grid content. index: number should be used for columns if values are used.
     */
    values?: any[];

    /**
     * Children of this item
     */
    children?: IGridHierarchyItem[];

    /**
     * Determines whether this item should be displayed collapsed or not
     */
    collapsed?: boolean;
}

/**
 * Hierarchical datasource implementation.
 */
export class GridHierarchySource extends GridDefaultSource implements IGridSource {
    private _expandStates: number[];

    constructor(items: IGridHierarchyItem[]) {
        super(items);
    }

    public getExpandStates(): any[] {
        return this._expandStates;
    }

    protected _updateSource(items: IGridHierarchyItem[]): void {
        this._source = [];
        this._expandStates = [];
        this._prepareItems(items || []);
    }

    private _prepareItems(items: IGridHierarchyItem[]): number {
        var total = 0;
        var expandStates = this._expandStates;
        for (var item of items) {
            // Increase the number of total items first
            total += 1;

            // Add item to source immediately
            this._source.push($.isArray(item.values) ? item.values : item);

            // Keep expandStateIndex to reset later if the item has chilren
            var expandStateIndex = expandStates.length;
            expandStates.push(0);

            // Determine whether this item has children or not
            var hasChildren = $.isArray(item.children) && item.children.length > 0;
            if (hasChildren) {
                // Get child count recursively
                var count = this._prepareItems(item.children);

                // Set correct expand state index
                expandStates[expandStateIndex] = count * (item.collapsed === true ? -1 : 1);

                // Increase total number of items
                total += count;
            }
        }

        return total;
    }
}

interface GridRowTabOrderMap {
    [key: number]: HTMLElement[];
}

interface FocusedGridStateData {
    rowActionList: GridRowTabOrderMap;
    currentActionIndex: number;
}

const enum ContextMenuKeyPressedState {
    Pressed,
    Handling,
    None
}

/**
 * @publicapi
 */
export class GridO<TOptions extends IGridOptions> extends Controls.Control<TOptions> {

    public static enhancementTypeName: string = "tfs.grid";

    public static MAX_COPY_SIZE: number = 1000;
    public static PAYLOAD_SIZE: number = 200;
    public static EVENT_ROW_UPDATED: string = "rowupdated";
    public static EVENT_ROW_TOGGLED: string = "rowtoggled";
    public static EVENT_SELECTED_INDEX_CHANGED: string = "selectedIndexChanged";
    public static DATA_DRAGGING_ROWINFO = "draggingRowInfo";
    public static DATA_DROPPING_ROWINFO = "droppingRowInfo";

    private static TOOLTIP_TARGET_SELECTOR = ".grid-cell, .grid-header-column > .title";

    private _selectionStart: number;
    private _header: JQuery;
    private _gutterHeader: any;
    private _columnSizing: any;
    private _columnMoving: any;
    private _columnMovingElement: any;
    private _columnMovingPinElement: any;
    private _columnInsert: any;
    private _unitEx: any;
    private _sizingElement: any;
    private _ddRowAcceptStatus: any;
    private _ddRowOverStatus: any;
    private _ddDropStarted: boolean;
    private _activeAriaId: any;
    private _copyInProgress: boolean;
    private _previousCanvasHeight: number;
    private _previousCanvasWidth: number;
    private _$popupMenuPinTarget: JQuery;
    private _showingContextMenu: boolean = false;
    private _automaticContextMenuColumn: boolean;
    private _contextMenuKeyPressedState: ContextMenuKeyPressedState = ContextMenuKeyPressedState.None;
    private _lastFocusTime: number;

    /** 
     *  Offset height, that shifts the row boundaries up and determines whether the pointer is over a particular row or not 
     *  e.g. An offset percentage (passed in by the consumer of the grid) of 50 shifts each row boundary up half the row height for the purposes of calculating whether the mouse 
     *  pointer is over the current row or not. The net effect of this is, if the pointer is in the top half of the current row/bottom half of the previous row, 
     *  then the pointer is assumed to interesect with the current row.
     */
    private _rowOffsetHeight: number;
    private _isAboveFirstOrBelowLastRow: boolean = false;

    public _contentSpacer: any;
    public _dataSource: any[];
    /**
     * For a tree grid, the number of children the row has. If the row is not expanded, it's the negative of the number of children it has.
     */
    public _expandStates: number[];
    /**
     * For a tree grid, the nesting level of the row.
     */
    public _indentLevels: number[] | null | undefined;
    public _columns: IGridColumn[];
    public _sortOrder: any[];
    public _visibleRange: any[];
    public _count: number;
    public _expandedCount: number;
    public _selectedIndex: number;
    public _indentIndex: number;
    public _selectionCount: number;
    public _selectedRows: any;
    public _rowHeight: number;
    public _cellOffset: number;
    public _gutterWidth: number;
    public _contentSize: any;
    public _rows: any;

    public _scroller: any;
    public _canvasDroppable: JQuery;
    public _canvas: JQuery;
    public _canvasHeight: number;
    public _canvasWidth: number;
    public _headerCanvas: JQuery;
    public _gutter: JQuery;
    public _popupMenu: Menus.PopupMenu;
    public _resetScroll: boolean;
    public _ignoreScroll: boolean;
    public _scrollTop: number;
    public _scrollLeft: number;
    public _droppable: any;
    public _draggable: any;
    public _draggingRowInfo: any;
    public _cancelable: any;
    public _active: boolean;
    public _cellMinWidth: number;
    private _draggableOverGrid: boolean;

    private _tooltip: Popup_Content.RichContentTooltip;
    private _tooltipMouseOverHandler: (e: JQueryEventObject, ...args: any[]) => any;
    private _tooltipMouseOutHandler: (e: JQueryEventObject, ...args: any[]) => any;

    private _focusStateData: FocusedGridStateData = {
        rowActionList: {},
        currentActionIndex: -1
    };

    private _focusedElement: HTMLElement = null;

    /**
     * Deprecated.  Please use _canvas instead.
     */
    public _focus: JQuery;

    /**
     * Creates new Grid Control
     * 
     * @param options The initialization options for the grid which have the following properties
     * 
     *    "columns" is a required property containing the array of grid column descriptors that have the following structure:
     *    {
     *        index: The index for the
     *        text:      column header text, string, optional, default: "",
     *        width:     width in pixels of the column, number, optional, default: 100,
     *        canSortBy: true if the grid can be sorted by the column, boolean, optional, default: true
     *        canMove: true if this column can be moved (has effect only if allowMoveColumns is set to true for the grid as well), boolean, optional, default: true
     *        getCellContents: function that returns cell contents, function, optional, default: this._drawCell
     *            The function takes the same parameters as _drawCell and should return a jQuery object
     *            that represents the cell's contents. The first element will be appended to the row.
     *            If the function returns null or undefined nothing will be appended for that cell.
     *        getHeaderCellContents: function that returns column header cell contents, function, optional, default: this._drawHeaderCellValue
     *            The function takes the same parameters as _drawHeaderCellValue and should return a jQuery object
     *            that represents the cell's contents. The first element will be appended to the header cell's contents.
     *            If the function returns null or undefined nothing will be appended for that header cell.
     *        getColumnValue: function that returns the value for a cell contents, function, optional, default: this.getColumnValue;
     *            The return value of the function will be converted to a string an added as the cell contents.
     *    }
     *    "enabledEvents" is an optional property containing an object with properties for each of the enabled events.
     *    {
     *        GridO.EVENT_ROW_UPDATED: true
     *    }
     */
    constructor(options?: TOptions) {

        super(options);

        this._rows = {};
        this._columns = [];
        this._sortOrder = [];
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {

        super.initializeOptions(<TOptions>$.extend(<IGridOptions>{
            autoSort: true,
            payloadSize: GridO.PAYLOAD_SIZE, /* Default viewport size, keep in sync with WorkItemManager.PAGE_SIZE */
            extendViewportBy: 3,
            gutter: {
                contextMenu: null,
                icon: false,
                checkbox: false
            },
            header: true,
            allowMoveColumns: true,      // Controls whether columns can be moved in the grid
            draggable: null,             // JQuery UI Draggable options for grid rows.
            droppable: null,              // JQuery UI Droppable options for grid rows.
            asyncInit: true,
            sharedMeasurements: true,
            coreCssClass: "grid"
        }, options));

        if (this._options.contextMenu) {
            this._options.contextMenu.useBowtieStyle = !this._options.useLegacyStyle;
        }
    }

    /**
     * Gets the number of selected items.
     * @returns {number}
     * @publicapi 
     */
    public getSelectionCount(): number {
        return this._selectionCount;
    }

    /**
     * @param element 
     */
    public _enhance(element: JQuery) {

        super._enhance(element);

        this._buildDom();
    }

    public initialize() {
        super.initialize();

        // A grid is considered editable unless otherwise specified. 
        // To make a grid read- only, set the aria- readonly attribute of the grid to true.
        this.getElement().attr("aria-readonly", "true");

        this._contentSize = { width: 300, height: 400 };
        this._takeMeasurements();

        let options = this._options;

        // Attach events later. It takes very long time to execute this function. It prevents work item form to display late
        // if there are multiple links control.
        if (options.asyncInit) {
            Utils_Core.delay(this, 10, function () {
                this._attachEvents();
            });
        }
        else {
            this._attachEvents();
        }

        let contextMenu = options.contextMenu;
        if (contextMenu && typeof contextMenu.columnIndex === "undefined") {
            this._automaticContextMenuColumn = true;
        }

        this.initializeDataSource(options.suppressRedraw);

        if (contextMenu && contextMenu.contributionIds) {
            Service.getService(Contributions_Services.ExtensionService).getContributionsForTargets(contextMenu.contributionIds);
        }

        Diag.logTracePoint('Grid.initialize.complete');
    }

    /**
     * Gets the row information for the item currently being dragged.
     * 
     * @return 
     */
    public getDraggingRowInfo(): any {
        return this._draggingRowInfo;
    }

    /**
     * Get the rows that currently have a draggable item "over" them
     */
    public _getDragOverRows() {
        return this._ddRowOverStatus;
    }

    public _getAcceptStatus(dataIndex: number) {
        if (this._droppable.accept || this._droppable.acceptSelector) {
            return this._ddRowAcceptStatus[dataIndex];
        }

        // If no accept handler or selector specified explicitly, accept the drop
        return true;
    }

    /**
     * Clear the cached row acceptance map
     */
    public _resetRowAcceptStatus() {
        this._ddRowAcceptStatus = {};
    }

    /**
     * See if the row has accepted and activate if it has.
     */
    public _rowDropTryActivate(droppingRowInfo, e?, ui?) {

        var accepted = this._rowDropAccept(droppingRowInfo, ui.draggable);
        if (accepted) {
            this._rowDropActivate(droppingRowInfo, e, ui);
        }

        return accepted;
    }

    public _rowIntersect(draggable, targetRowInfo) {
        var rowInfo = this._rows[targetRowInfo.dataIndex], row;

        if (rowInfo) {
            row = rowInfo.row;
            var offset = row.offset();
            offset.top -= (this._rowOffsetHeight || 0);
            var intersectPosition = this._calculateIntersectPosition(draggable);

            return (<any>$.ui).intersect(draggable, {
                offset: offset,
                proportions: function () {
                    return {
                        width: row[0].offsetWidth,
                        height: row[0].offsetHeight
                    };
                }
            },
                this._droppable.tolerance,
                {
                    pageY: intersectPosition.pageY,
                    pageX: intersectPosition.pageX
                });
        }

        return false;
    }

    private _calculateIntersectPosition(draggable): IIntersectPosition {
        var pageY, pageX;
        if ((draggable.positionAbs || draggable.position) && (draggable.clickOffset || draggable.offset)) {
            pageY = ((draggable.positionAbs || draggable.position.absolute).top + (draggable.clickOffset || draggable.offset.click).top);
            pageX = ((draggable.positionAbs || draggable.position.absolute).left + (draggable.clickOffset || draggable.offset.click).left);
        }

        return {
            pageY: pageY,
            pageX: pageX
        }
    }

    public initializeDataSource(suppressRedraw?: boolean) {
        var canvas;
        if (this._resetScroll) {
            this._ignoreScroll = true;
            try {
                //jQuery ScrollLeft and ScrollTop methods are slow use direct dom
                canvas = this._canvas[0];
                canvas.scrollTop = 0;
                canvas.scrollLeft = 0;
                this._scrollLeft = 0;
                this._scrollTop = 0;
                this._resetScroll = false;
            }
            finally {
                this._ignoreScroll = false;
            }
        }

        this.setDataSource(
            this._options.source,
            this._options.expandStates,
            this._options.columns,
            this._options.sortOrder,
            undefined, // optional selectedIndex
            suppressRedraw);

        if (!suppressRedraw) {
            if (this._expandedCount > 0) {
                if (this._options.keepSelection && this._selectedIndex >= 0) {
                    this._selectRow(Math.min(this._selectedIndex, this._expandedCount - 1));
                }
                else {
                    this.selectInitialRow();
                }

            }
            else {
                this.setSelectedRowIndex(-1);
            }
        }
    }

    /**
     * Sets the initial selected index.    
     */
    public selectInitialRow() {
        this._selectRow(this._options.initialSelection !== false ? 0 : -1);
    }

    /**
     * Sets the source of the grid using GridSource object.
     *
     * @param source GridSource object to set the grid source.
     * @publicapi
     */
    public setDataSource(source: IGridSource): void;
    /**
     * Sets the data source, expands states, columns and sort order of the grid.
     *
     * @param source New source for the grid (See grid options for details).
     * @param expandStates Expand states for the new source. If source is not in hierarchical structure, specify null (See grid options for details).
     * @param columns New columns for the grid (See grid options for details).
     * @param sortOrder New sort order for the grid (See grid options for details).
     * @param selectedIndex Index of the rows to be selected after new data source is set.
     * @param suppressRedraw If true, grid is not redrawn after data source is set.
     * @publicapi
     */
    public setDataSource(source?: any[], expandStates?: number[], columns?: IGridColumn[], sortOrder?: IGridSortOrder[], selectedIndex?: number, suppressRedraw?: boolean);
    public setDataSource(source?: any, expandStates?: number[], columns?: IGridColumn[], sortOrder?: IGridSortOrder[], selectedIndex?: number, suppressRedraw?: boolean) {
        var i: number,
            l: number,
            count: number,
            column: IGridColumn,
            that = this;

        if (source && !$.isArray(source)) {
            // IGridSource specified
            var dataSource = <IGridSource>source;
            dataSource.grid = this;
            source = dataSource.getSource();
            expandStates = dataSource.getExpandStates();
        }

        this._dataSource = source || [];
        this._count = count = this._dataSource.length;

        if (expandStates) {
            this._expandStates = expandStates;
            this._indentLevels = [];
            expand(0, count, 1, expandStates, this._indentLevels);
        }
        else {
            this._indentLevels = null;
            this._expandStates = null;
        }

        this._expandedCount = count;
        this._updateRanges();

        // Set the columns if specified, otherwise keeping existing columns
        if (columns) {
            this._columns = [];
            for (i = 0, l = columns.length; i < l; i++) {
                column = columns[i];
                this._setColumnInfo(column, i);
                this._columns.push(column);
            }
        }

        // Set the sort order if specified, otherwise keeping existing sort order
        if (sortOrder) {
            this._sortOrder = [];
            for (i = 0, l = sortOrder.length; i < l; i++) {
                column = sortOrder[i];
                if (column.order !== "desc") {
                    column.order = "asc";
                }

                this._sortOrder.push(column);
            }
        }

        // If auto-sort and source order specified, sort the data source
        if (this._options.autoSort && this._sortOrder.length > 0) {
            this._trySorting(this._sortOrder);
        }

        this._clearSelection();
        this._determineIndentIndex();

        function layout() {
            if (!that.isDisposed()) {
                that.layout();
                that._ensureSelectedIndex(selectedIndex);
            }
            else {
                Diag.logWarning("Layout called (in setDataSource) after grid was disposed.");
            }
        }
        if (!suppressRedraw) {
            if (this._options.asyncInit) {
                Utils_Core.delay(this, 0, layout);
            }
            else {
                layout();
            }
        }
    }

    public _setColumnInfo(column: IGridColumn, index: number) {

        // Column value default settings
        column.index = typeof (column.index) !== "undefined" ? column.index : index;
        column.canSortBy = column.canSortBy !== false;
        column.canMove = column.canMove !== false;
        column.width = typeof (column.width) !== "undefined" ? column.width : 100;

        // Column drawing default implementations
        column.getCellContents = column.getCellContents || this._drawCell;
        column.getHeaderCellContents = column.getHeaderCellContents || this._drawHeaderCellValue;
        column.getColumnValue = column.getColumnValue || this.getColumnValue;
    }

    /**
     * Gets the information about a row associated with the given data index.
     * 
     * Returns a rowInfo object containing rowIndex, dataIndex and a jQuery wrapper for the actual row.
     * 
     * @param dataIndex The data index for the record to retrieve.
     * @returns {IGridRowInfo}
     * @publicapi
     */
    public getRowInfo(dataIndex: number): IGridRowInfo {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");
        return this._rows[dataIndex];
    }

    /**
     * Gets the data being used to display the row at the provided data index.
     * 
     * @param dataIndex The data index for the record to retrieve.
     * @return {any}
     * @publicapi
     */
    public getRowData(dataIndex: number): any {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        return this._dataSource[dataIndex];
    }

    /**
     * Gets the columns currently being displayed in the grid.
     * @returns {IGridColumn[]}
     * @publicapi
     */
    public getColumns(): IGridColumn[] {

        return this._columns || [];
    }

    /**
     * Gets the current sort order being used in the grid.
     * @returns {IGridSortOrder[]}
     * @publicapi
     */
    public getSortOrder(): IGridSortOrder[] {

        return this._sortOrder || [];
    }

    /**
     * Set new column info for the column associated with the specified column name.
     * 
     * @param columnName Name of the column to change the options.
     * @param options New column options.
     * @publicapi
     */
    public setColumnOptions(columnName: string, options?: IGridColumn): void {

        Diag.Debug.assertParamIsString(columnName, "columnName");
        Diag.Debug.assertParamIsObject(options, "options");

        var i, l,
            columns = this._columns;

        for (i = 0, l = columns.length; i < l; i++) {
            if (columns[i].name === columnName) {
                columns[i] = $.extend(columns[i], options);
                break;
            }
        }
    }

    public _getDataIndex(visibleIndex) {
        var i, l, lastIndex = -1, ranges = this._visibleRange, range;

        if (visibleIndex < 0) {
            return -1;
        }

        for (i = 0, l = ranges.length; i < l; i++) {
            range = ranges[i];
            lastIndex += range[1] - range[0] + 1;

            if (visibleIndex <= lastIndex) {
                return range[1] - lastIndex + visibleIndex;
            }
        }

        return visibleIndex;
    }

    public _getRowIndex(dataIndex) {
        var i, l, result = 0, ranges = this._visibleRange, range;

        for (i = 0, l = ranges.length; i < l; i++) {
            range = ranges[i];
            if (dataIndex >= range[0]) {
                if (dataIndex <= range[1]) {
                    return result + dataIndex - range[0];
                }
            }
            else {
                break;
            }

            result += range[1] - range[0] + 1;
        }

        return -Math.max(0, result - 1);
    }

    public expandNode(dataIndex) {
        var state, row;

        if (this._expandStates) {
            state = this._expandStates[dataIndex];

            if (state < 0) {
                this._expandStates[dataIndex] = -state;
                this._updateRanges();
                row = this._rows[dataIndex];
                if (row) {
                    row.dirty = true;
                }
            }
        }
    }

    public collapseNode(dataIndex) {
        var state, row;

        if (this._expandStates) {
            state = this._expandStates[dataIndex];

            if (state > 0) {
                this._expandStates[dataIndex] = -state;
                this._updateRanges();

                row = this._rows[dataIndex];
                if (row) {
                    row.dirty = true;
                }
            }
        }
    }

    public expandAllNodes() {
        return this._updateExpansionStates(true, Number.MAX_VALUE);
    }

    public collapseAllNodes() {
        return this._updateExpansionStates(false, Number.MAX_VALUE);
    }

    /**
     * Expands all rows of the grid (if source data is hierarchical).
     * @publicapi
     */
    public expandAll() {
        Diag.logTracePoint("Grid.expandAll.start");
        this._updateExpansionStateAndRedraw(true, Number.MAX_VALUE);
        Diag.logTracePoint("Grid.expandAll.complete");
    }

    /**
     * Collapses all rows of the grid (if source data is hierarchical).
     * @publicapi
     */
    public collapseAll() {
        Diag.logTracePoint("Grid.collapseAll.start");
        this._updateExpansionStateAndRedraw(false, Number.MAX_VALUE);
        Diag.logTracePoint("Grid.collapseAll.complete");
    }

    /**
     * Expands all rows at or below specified level (if source data is hierarchical).
     *
     * @param level Level to expand.
     * @publicapi
     */
    public expandByLevel(level: number): void {
        this._updateExpansionStateAndRedraw(true, level);
    }

    /**
     * Collapses all rows at or below specified level (if source data is hierarchical).
     *
     * @param level Level to collapse.
     * @publicapi
     */
    public collapseByLevel(level: number): void {
        this._updateExpansionStateAndRedraw(false, level);
    }

    /**
     * Expand or collapse node(s), and set selection focus at a given target index or at the current selected index as default behavior.
     * 
     * @param expand If true, expands the node, otherwise collapsed.
     * @param applyToAllRows True to expand or collapse all nodes, false to expand or collapse the node at a given target index, or at the current selected index as default behavior.
     * @param targetIndex The node index to be expanded or collapsed, and get selection focus.
     * @returns {boolean}
     * @publicapi
     */
    public tryToggle(expand: boolean, applyToAllRows: boolean, targetIndex?: number): boolean {

        var dataIndex: number;
        var state: number;
        var isExpanded: boolean;

        if (!this._expandStates || this._selectedIndex < 0 || this._expandedCount <= 0) {
            return false;
        }

        if (targetIndex !== undefined && targetIndex > -1) {
            dataIndex = targetIndex;
        } else {
            dataIndex = this._getDataIndex(this._selectedIndex);
        }

        var row = this._rows[dataIndex];

        if (!row) {
            return false;
        }

        if (applyToAllRows) {
            if (expand) {
                isExpanded = true;
                if (!this.expandAllNodes()) {
                    return false;
                }
            }
            else {
                isExpanded = false;
                if (!this.collapseAllNodes()) {
                    return false;
                }
            }

            this._raiseToggleEvent(row, isExpanded);

            this._clearSelection();
            this._addSelection(Math.abs(this._getRowIndex(dataIndex)));
            this._layoutContentSpacer();
            this._redraw();
            return true;
        }
        else {
            state = this._expandStates[dataIndex];

            if (state !== 0) {
                if (expand) {
                    isExpanded = true;

                    if (state < 0) {
                        this.expandNode(dataIndex);
                    }
                    else {
                        return false;
                    }
                }
                else {
                    isExpanded = false;

                    if (state > 0) {
                        this.collapseNode(dataIndex);
                    }
                    else {
                        return false;
                    }
                }

                this._raiseToggleEvent(row, isExpanded);

                this._clearSelection();
                this._addSelection(this._getRowIndex(dataIndex));
                this._layoutContentSpacer();
                this._redraw();
                return true;
            }
        }

        return false;
    }

    public _getVisibleRowIndices() {
        var top = this._scrollTop,
            bottom = top + this._canvasHeight,
            count = this._expandedCount - 1,
            rh = this._rowHeight;

        return {
            first: Math.min(count, Math.max(0, Math.ceil(top / rh))),
            last: Math.min(count, Math.floor(bottom / rh) - 1)
        };
    }

    /**
     * @param rowIndex 
     * @param force 
     * @return 
     */
    public _getRowIntoView(rowIndex: number, force?: boolean): boolean {

        var visibleIndices, firstIndex, lastIndex, count;

        Diag.logTracePoint("TFS.UI.Controls.Grids._getRowIntoView.start");

        if (force) {
            // update view port will be called when scrolling happen
            var scrollTop = Math.max(0, Math.min(rowIndex || 0, this._expandedCount - 1)) * this._rowHeight
            this._canvas[0].scrollTop = scrollTop;
            this._scrollTop = scrollTop;

            return true;
        }

        visibleIndices = this._getVisibleRowIndices();
        firstIndex = visibleIndices.first;
        lastIndex = visibleIndices.last;

        count = lastIndex - firstIndex;

        if (rowIndex < firstIndex || rowIndex > lastIndex) {
            if (this._selectedIndex > firstIndex) {
                //set last visible
                firstIndex = Math.max(rowIndex - count, 0);
            }
            else {
                //set first visible
                firstIndex = Math.max(0, Math.min(rowIndex + count, this._expandedCount - 1) - count);
            }

            // update view port will be called when scrolling happen
            var scrollTop = firstIndex * this._rowHeight
            this._canvas[0].scrollTop = scrollTop;
            this._scrollTop = scrollTop;

            return true;
        }

        return false;
    }

    /**
     * @param force 
     */
    public getSelectedRowIntoView(force?: boolean) {

        return this._getRowIntoView(this._selectedIndex, force);
    }

    public cacheRows(aboveRange, visibleRange, belowRange) {
    }

    public _drawRowsInternal(visibleRange, includeNonDirtyRows) {
        var i, l, array, rows = this._rows,
            row: IGridRowInfo,
            rowIndex, dataIndex, newRows = {},
            states = this._expandStates, expandedState = 0, levels = this._indentLevels, level = 0,
            hasGutter = this._gutter, canvasDom = this._canvas[0], gutterCanvasDom,
            rowDom, gutterRowDom, updateRow, fragment, gutterFragment;
        const mode = this._getMode();
        // add 1 for 1-based indexing, 1 more if there's a header row
        const rowIndexOffset = 1 + (this._options.header ? 1 : 0);

        fragment = document.createDocumentFragment();

        if (hasGutter) {
            gutterCanvasDom = this._gutter[0];
            gutterFragment = document.createDocumentFragment();
        }

        this._rows = newRows;

        function setupHover($row) {
            $row.hover(
                () => {
                    $row.addClass("grid-row-hover");
                },
                () => {
                    $row.removeClass("grid-row-hover");
                });
        }

        for (i = 0, l = visibleRange.length; i < l; i++) {
            array = visibleRange[i];
            rowIndex = array[0];
            dataIndex = array[1];

            row = rows[dataIndex];

            if (row) {
                updateRow = (row.rowIndex !== rowIndex);
                if (updateRow) {
                    row.rowIndex = rowIndex;
                }
                else {
                    updateRow = row.dirty;
                    delete row.dirty;
                }

                if (includeNonDirtyRows) {
                    updateRow = true;
                }

                delete rows[dataIndex];
            }
            else {
                updateRow = true;
                row = { rowIndex: rowIndex, dataIndex: dataIndex };
                rowDom = domElem("div", "grid-row grid-row-normal");
                rowDom.id = "row_" + this.getId() + "_" + dataIndex;
                fragment.appendChild(rowDom);
                var $row = $(rowDom);
                $row.attr("role", this._getRole("row"));
                if (mode === "list") {
                    // We don't want level info read unnecessarily for list mode
                    $row.attr("aria-level", "0");
                }
                if (mode === "treegrid" && states && levels) {
                    const rowLevel = levels[dataIndex];
                    
                    let preceeding = 0; // rows that come before ours at the same level and with the same parent
                    let succeeding = 0; // rows that come after ours at the same level and with the same parent
                    for (let j = dataIndex - 1; j >= 0; j--) {
                        if (levels[j] < rowLevel) {
                            break;
                        }
                        else if (levels[j] === rowLevel) {
                            preceeding++;
                        }
                    }
                    for (let j = dataIndex + 1; j < levels.length; j++) {
                        if (levels[j] < rowLevel) {
                            break;
                        }
                        else if (levels[j] === rowLevel) {
                            succeeding++;
                        }
                    }

                    $row.attr({
                        "aria-level": rowLevel,
                        "aria-posinset": preceeding + 1,
                        "aris-setsize": preceeding + 1 + succeeding,
                    });
                }
                else {
                    $row.attr("aria-rowindex", rowIndex + rowIndexOffset);
                }

                row.row = $row.data("grid-row-info", row);

                let $gutterRow: JQuery = null;
                if (hasGutter) {
                    gutterRowDom = domElem("div", "grid-gutter-row grid-gutter-row-normal");
                    gutterFragment.appendChild(gutterRowDom);

                    $gutterRow = $(gutterRowDom);
                    row.gutterRow = $gutterRow.data("grid-row-info", row);
                }

                // Add hover styling to the row and row gutter.
                if (!this._options.useLegacyStyle && $gutterRow) {
                    this.setupFullRowHover($row);
                    this.setupFullRowHover($gutterRow);
                }
                else {
                    setupHover($row);
                }
            }

            newRows[dataIndex] = row;

            if (updateRow) {
                if (states) {
                    expandedState = states[dataIndex];
                    level = levels[dataIndex];
                }

                this._updateRow(row, rowIndex, dataIndex, expandedState, level);
            }
        }

        for (dataIndex in rows) {
            if (rows.hasOwnProperty(dataIndex)) {
                row = rows[dataIndex];

                row.row.remove();
                if (hasGutter) {
                    row.gutterRow.remove();
                }
            }
        }

        if (this._droppable && this._droppable.rowOffsetPercentage && this._rows[0] && !this._rowOffsetHeight) {
            this._rowOffsetHeight = this._rows[0].row.height() * this._droppable.rowOffsetPercentage / 100;
        }

        return { rowsFragment: fragment, gutterFragment: gutterFragment };
    }

    /**
     * Sets up full-row bowtie styling whether hovering over the main row or the row gutter.
     */
    private setupFullRowHover($row: JQuery) {

        function addHoverStyle($row: JQuery, addStyle: boolean) {
            let row: IGridRowInfo = $row.data("grid-row-info");
            if (row) {
                if (row.row) {
                    row.row.toggleClass("grid-row-hover", addStyle);
                }
                if (row.gutterRow) {
                    row.gutterRow.toggleClass("grid-row-hover", addStyle);
                }
            }
        }

        $row.hover(
            () => {
                addHoverStyle($row, true);
            },
            () => {
                addHoverStyle($row, false);
            });
    }

    public _drawRows(visibleRange, includeNonDirtyRows) {

        // Draw rows internal
        let fragments = this._drawRowsInternal(visibleRange, includeNonDirtyRows);

        // Add fragments to the DOM
        let canvasDom = this._canvas[0];
        canvasDom.appendChild(fragments.rowsFragment);
        if (fragments.gutterFragment) {
            this._gutter[0].appendChild(fragments.gutterFragment);
        }

        // Nothing in the grid should be tabbable - use arrow keys to navigate actionable items.
        // We will discover focusable items during _addSelection.
        $(canvasDom).find(".grid-row .grid-cell :tabbable, .grid-row .grid-cell [data-tabbable=1]").each((i, tabbableElem) => {
            const $tabbable = $(tabbableElem);
            $tabbable.attr("tabindex", "-1");
        });

        if (this._count > 0) {
            canvasDom.classList.remove("no-rows");
        }
        else {
            canvasDom.classList.add("no-rows");
        }
    }

    /**
     * Updates the row identified by the given rowIndex.
     * 
     * @param rowIndex Index of row to be updated
     * @param dataIndex DataIndex of row to be updated
     * @param columnsToUpdate HashSet of column indices. If given,
     * only columns in this set will be updated.
     */
    public updateRow(rowIndex: number, dataIndex?: number, columnsToUpdate?: { [id: number]: boolean }) {

        var rowInfo, expandedState = 0, level = 0;

        if (typeof dataIndex === "undefined" || dataIndex < 0) {
            dataIndex = this._getDataIndex(rowIndex);
        }
        else if (typeof rowIndex === "undefined" || rowIndex < 0) {
            rowIndex = this._getRowIndex(dataIndex);
        }

        rowInfo = this._rows[dataIndex];

        if (rowInfo) {
            if (this._expandStates) {
                expandedState = this._expandStates[dataIndex];
                level = this._indentLevels[dataIndex];
            }

            this._updateRow(rowInfo, rowIndex, dataIndex, expandedState, level, columnsToUpdate);
        }
    }

    public _updateRow(rowInfo, rowIndex, dataIndex, expandedState, level, columnsToUpdate?: { [id: number]: boolean }) {
        var row, rowElem, gutterOptions, gutterRow, gutterRowElem, gutterDropElem,
            gutterIconElem, gutterIconCss, gutterCheckboxCellElem, gutterCheckbox, indentIndex, i, l, cellValue$;

        indentIndex = this._indentIndex;

        if (this._gutter) {
            gutterOptions = this._options.gutter;

            gutterRow = rowInfo.gutterRow;
            gutterRowElem = gutterRow[0];
            gutterRowElem.style.top = (rowIndex * this._rowHeight) + "px";
            gutterRowElem.style.left = "0px";
            gutterRowElem.style.width = (this._gutterWidth) + "px";
            gutterRowElem.style.height = (this._rowHeight) + "px";

            if (gutterOptions.contextMenu) {

                var gutterMenuCss = "grid-gutter-cell grid-gutter-menu";

                // If not using bowtie styles, add a drop icon if the given row has a context menu
                if (this._options.useLegacyStyle && this._rowHasContextMenu(dataIndex)) {
                    gutterMenuCss += " grid-gutter-drop bowtie-icon bowtie-triangle-down";
                }

                gutterDropElem = domElem("div", gutterMenuCss);

                $(gutterDropElem).css('line-height', this._rowHeight + "px");

                gutterRow.append(gutterDropElem);
            }

            if (gutterOptions.checkbox) {
                gutterCheckbox = $(domElem("input", "checkbox " + (gutterOptions.checkbox.cssClass || ""))).attr("type", "checkbox");
                gutterCheckboxCellElem = domElem("div", "grid-gutter-cell grid-gutter-checkbox");
                gutterCheckboxCellElem.appendChild(gutterCheckbox[0]);
                gutterRowElem.appendChild(gutterCheckboxCellElem);
            }

            if (gutterOptions.icon) {
                gutterIconCss = "grid-gutter-cell grid-gutter-icon ";

                if (typeof gutterOptions.icon.cssClass !== "undefined") {
                    gutterIconCss += gutterOptions.icon.cssClass + " ";
                }

                if (typeof gutterOptions.icon.index !== "undefined") {
                    gutterIconCss += (this.getColumnValue(dataIndex, gutterOptions.icon.index, -1) || "") + " ";
                }

                if ($.isFunction(gutterOptions.icon.getIconClass)) {
                    gutterIconCss += (gutterOptions.icon.getIconClass(this._dataSource[dataIndex]) || "") + " ";
                }

                if (gutterOptions.icon.ownerDraw !== false) {
                    gutterIconCss += (this._getGutterIconClass(rowIndex, dataIndex, expandedState, level) || "");
                }

                gutterIconElem = domElem("div", gutterIconCss);

                $(gutterIconElem).css('line-height', this._rowHeight + "px");

                if (gutterOptions.icon.tooltipIndex) {
                    var tooltipText = this.getColumnValue(dataIndex, gutterOptions.icon.tooltipIndex, -1);

                    if ($.isFunction(tooltipText)) {
                        tooltipText = tooltipText();
                    }

                    $(gutterIconElem).attr("title", tooltipText);
                }

                gutterRowElem.appendChild(gutterIconElem);
            }

            this._drawGutterCell(rowInfo, rowIndex, dataIndex, expandedState, level);
        }

        var onlyReplaceUpdatedColumns = !!columnsToUpdate;

        rowElem = this._updateRowSize(rowIndex, rowInfo.row, onlyReplaceUpdatedColumns);

        if (expandedState > 0) {
            $(rowElem).attr("aria-expanded", "true");
        }
        else if (expandedState < 0) {
            $(rowElem).attr("aria-expanded", "false");
        }

        let columns: IGridColumn[] = this._columns;

        var lastVisibleColumn: IGridColumn;
        var lastVisibleCell: JQuery;
        var width = 0;
        for (i = 0, l = columns.length; i < l; ++i) {
            let column: IGridColumn = columns[i];

            if (column.hidden) {
                continue;
            }

            width += (column.width || 20) + this._cellOffset;

            if (onlyReplaceUpdatedColumns && !columnsToUpdate[column.index]) {
                // Column does not need to be updated, ignore
                continue;
            }

            cellValue$ = column.getCellContents.apply(this, [rowInfo, dataIndex, expandedState, level, column, indentIndex, i]);
            if (cellValue$) {
                let cellRole = this._getRole("cell");
                if (cellRole) {
                    cellValue$.attr("role", cellRole);
                }

                if (expandedState > 0) {
                    cellValue$.attr("aria-expanded", "true");
                }
                else if (expandedState < 0) {
                    cellValue$.attr("aria-expanded", "false");
                }

                if (column.width > 0) {
                    lastVisibleColumn = column;
                    lastVisibleCell = cellValue$;
                }

                // If using bowtie styles, add the context menu ellipses to the named column or the first column with a minimal length (implying main content)
                // Mininal width is 120px, or we will put it on the last cell (we also have semi-legal cases where width is expressed as string, such as "90%").
                if (!this._options.useLegacyStyle && this._options.contextMenu) {
                    if (column.index === this._options.contextMenu.columnIndex) {
                        this._addContextMenuContainer(cellValue$, this._rowHasContextMenu(dataIndex));
                    }
                }

                if (onlyReplaceUpdatedColumns) {
                    rowElem.replaceChild(cellValue$[0], rowElem.children[i]);
                } else {
                    rowElem.appendChild(cellValue$[0]);
                }
            }
        }

        width = this._fixColumnsWidth(width);
        var remainingCanvasWidth = this._canvasWidth - width;

        if (this._options.lastCellFillsRemainingContent === true && remainingCanvasWidth > 0 && lastVisibleCell && lastVisibleColumn) {
            lastVisibleCell.outerWidth(lastVisibleColumn.width + remainingCanvasWidth);
        }

        Utils_UI.makeElementUnselectable(rowElem);
        if (this._gutter) {
            Utils_UI.makeElementUnselectable(gutterRowElem);
        }

        this._updateRowSelectionStyle(rowInfo, this._selectedRows, this._selectedIndex);

        // Let any listeners know the row was updated
        if (this._options.enabledEvents && GridO.EVENT_ROW_UPDATED in this._options.enabledEvents) {
            // don't use this._fire because it bubbles events which shouldn't happen in this case.
            this._element.triggerHandler(GridO.EVENT_ROW_UPDATED, [rowInfo]);
        }
    }

    private _rowHasContextMenu(dataIndex: any): boolean {
        return !(this._dataSource && this._dataSource[dataIndex] && this._dataSource[dataIndex].noContextMenu);
    }

    private _addContextMenuContainer($gridCell: JQuery, itemHasMenu: boolean) {
        if (itemHasMenu) {
            let $contextMenu = $(domElem("div", "grid-context-menu-container grid-context-menu"))
                .attr({ title: "", tabindex: "-1", role: "button" })
                .attr("aria-label", Resources_Platform.GridRowActions)
                .on("keydown", Utils_UI.buttonKeydownHandler);
            let $contextMenuIcon = $(domElem("span", "grid-context-menu-icon bowtie-icon bowtie-ellipsis"));
            $contextMenu.append($contextMenuIcon);
            let $cellContents = $(domElem("div", "grid-cell-contents-container")).append($gridCell.contents());
            $gridCell.append($contextMenu);
            $gridCell.append($cellContents);

            // Clone the react variable because this is a dirty hack
            for (const prop in $gridCell[0]) {
                if (prop.substr(0, 23) === "__reactInternalInstance") {
                    $cellContents[prop] = $gridCell[prop];
                    $gridCell[0].removeAttribute(prop);
                    break;
                }
            }

        } else {
            $gridCell.prepend($(domElem("div", "grid-context-menu-container grid-no-context-menu")));
        }
    }

    /**
     * Updates the container element for the row identified by rowIndex
     * 
     * @param rowIndex Index of row to be updated
     * @param keepContent If set, the content of the container element (i.e.,
     * any column data) will not be removed
     * @return Returns DOM row container element
     */
    public _updateRowSize(rowIndex: number, row, keepContent?: boolean) {

        if (!keepContent) {
            row.empty();
        }

        var rowElem = row[0];
        rowElem.style.top = (rowIndex * this._rowHeight) + "px";
        rowElem.style.left = this._gutterWidth + "px";
        rowElem.style.height = (this._rowHeight) + "px";

        // stretching row to the full screen
        if (isNaN(this._contentSize.width)) {
            rowElem.style.width = "";
        }
        else {
            rowElem.style.width = Math.max(this._contentSize.width + 2, this._canvasWidth - this._gutterWidth) + "px";
        }

        return rowElem;
    }

    /**
     * Default implementation for creating the contents of a given cell.
     * 
     * Custom Drawn Columns:
     * If you want a custom drawn column, then the preferred method is to set a "getCellContents" property
     * on the column to a function that takes the same parameters as this function and returns a jQuery
     * object that represents the contents.
     * 
     * @param rowInfo The information about grid row that is being rendered.
     * @param dataIndex The index of the row.
     * @param expandedState Number of children in the tree under this row recursively.
     * @param level The hierarchy level of the row.
     * @param column Information about the column that is being rendered.
     * @param indentIndex Index of the column that is used for the indentation.
     * @param columnOrder The display order of the column.
     * @return Returns jQuery element representing the requested grid cell. The first returned element will be appended
     * to the row (unless the function returns null or undefined).
     */
    public _drawCell(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
        var value,
            treeSign,
            indent,
            cell,
            cellDom,
            width = column.width || 20,
            href;

        cellDom = domElem("div", "grid-cell");
        cellDom.style.width = isNaN(width) ? width : width + "px";
        cell = $(cellDom);

        if (typeof column.hrefIndex !== "undefined") {
            href = this.getColumnValue(dataIndex, column.hrefIndex, -1);
        }

        value = this.getColumnText(dataIndex, column, columnOrder);

        if (href) {
            cell.append($("<a/>").attr("href", href).text(value));
        }
        else {
            if (value) {
                cell.text(value);
            }
            else {
                // add non-breaking whitespace to ensure the cell has the same height as non-empty cells
                cell.html("&nbsp;");
            }
        }

        if (columnOrder === indentIndex && level > 0) {
            indent = ((level * 16) - 13); //TODO: magic numbers?
            column.indentOffset = indent;
            if (expandedState !== 0) {
                treeSign = $(domElem("div", "icon grid-tree-icon")).appendTo(cell).css("left", indent);

                if (expandedState > 0) {
                    treeSign.addClass("bowtie-icon bowtie-chevron-down");
                }
                else {
                    treeSign.addClass("bowtie-icon bowtie-chevron-right");
                }
            }

            cell.css("textIndent", (level * 16) + "px");
        }

        if (column.rowCss) {
            cell.addClass(column.rowCss);
        }

        return cell;
    }

    /**
     * Default implementation for creating the element that represents content of a header cell.
     * 
     * Custom Drawn Column Header:
     * If you want a custom drawn column header, then the preferred method is to set a "getHeaderCellContents" property
     * on the column to a function that takes the same parameters as this function and returns a jQuery
     * object that represents the contents.
     * 
     * @param column Information about the header column that is being rendered.
     * @return Returns jQuery element representing the requested header cell contents.
     */
    public _drawHeaderCellValue(column: any): JQuery {
        const cell = $("<div/>").text(column.text || "").addClass("title");

        if (column.canSortBy && !column.fixed) {
            cell.attr("role", "button");
        }

        if (this._isIndentedHeaderColumn(column) && !((this._indentLevels as any) === "undefined" || this._indentLevels === null)) {
            cell.addClass("indented-title");
        }

        return cell;
    }

    protected _isIndentedHeaderColumn(column: any) {
        return column.index === this._indentIndex;
    }

    public _layoutHeader() {
        const header = this._header;

        if (header && this._headerCanvas.length > 0) {
            if (header[0].scrollLeft !== this._scrollLeft) {
                header[0].scrollLeft = this._scrollLeft;
            }
            this._headerCanvas[0].style.left = this._gutterWidth + "px";
        }

        if (this._gutter && this._gutter.length > 0) {
            this._gutter[0].style.left = this._scrollLeft + "px";
        }
    }

    public layout() {
        Diag.logTracePoint("Grid.layout.start");

        this._setContextMenuColumn();
        this._cleanUpRows();
        this._fixScrollPos();
        this._layoutContentSpacer();
        this._updateViewport();

        this._layoutHeader();
        this._drawHeader();

        this._updateAriaProperties();

        if (this._dataSource.length > 0) {
            this.getFocusElement().attr({ tabIndex: "0" });
        }
        else {
            this.getFocusElement().removeAttr("tabIndex");
        }

        this._fire("Grid.layout.complete");
        Diag.logTracePoint("Grid.layout.complete");
    }

    public redraw() {
        this._fixScrollPos();
        this._redraw(true);
    }

    /**
     * Gets the value for a column. The default use of the return value is to
     * convert it to a string and set it as the cell's text value.
     * 
     * @param dataIndex The index for the row data in the data source
     * @param columnIndex The index of the column's data in the row's data array
     * @param columnOrder The index of the column in the grid's column array. This is the current visible order of the column
     * @return 
     */
    public getColumnValue(dataIndex: number, columnIndex: number | string, columnOrder?: number): any {
        return this._dataSource[dataIndex][<any>columnIndex];
    }

    public getColumnText(dataIndex, column, columnOrder?) {
        var value, text;

        value = column.getColumnValue.call(this, dataIndex, column.index, columnOrder);

        if (typeof value !== "string") {
            text = Utils_Core.convertValueToDisplayString(value, column.format);
        }
        else {
            text = value;
        }

        column.maxLength = Math.max(column.maxLength || 0, text.length);

        return text;
    }

    public _getExpandState(dataIndex) {
        var result = 0;
        if (this._expandStates) {
            if (typeof (this._expandStates[dataIndex]) === "number") {
                result = this._expandStates[dataIndex];
            }
        }
        return result;
    }

    /**
     * @param rowIndex 
     * @param dataIndex 
     * @param options 
     */
    public _selectRow(rowIndex: number, dataIndex?: number, options?: any) {

        var ctrl = options && options.ctrl,
            shift = options && options.shift,
            rightClick = options && options.rightClick;

        if (ctrl) {
            // If ctrl key is pressed, selecting or deselecting only the row at rowIndex
            this._addSelection(rowIndex, dataIndex, { toggle: true });
        }
        else if (shift) {
            // If shift key is pressed, selecting the rows starting from selection start until the row at rowIndex
            this._clearSelection();
            this._addSelectionRange(rowIndex, dataIndex);
        }
        else if (rightClick) {
            if (!this._selectedRows || !((rowIndex + "") in this._selectedRows)) {
                // Right-clicked a previously unselected row, select that row
                this._clearSelection();
                this._addSelection(rowIndex, dataIndex);
            }
            else {
                // Right-clicked a previously selected row. Just update the selection index.
                this._selectedIndex = rowIndex;
                this._updateActiveDescendant();
            }
        }
        else {
            // Just selecting the single row at rowIndex
            this._clearSelection();
            this._addSelection(rowIndex, dataIndex);
        }
    }

    /**
     * @return 
     */
    public getSelectedRowIndex(): number {

        return this._selectedIndex;
    }

    public setSelectedRowIndex(selectedRowIndex) {
        this._clearSelection();
        this._addSelection(selectedRowIndex);
    }

    /**
     * @return 
     */
    public getSelectedDataIndex(): number {

        return this._getDataIndex(this._selectedIndex);
    }

    /** 
     * @return The last data index of the grid
     */
    public getLastRowDataIndex(): number {
        /// <summary>Returns 'data index' of the last row in the grid</summary>
        var len = this._visibleRange.length;

        if (len > 0) {
            return this._visibleRange[len - 1][1];
        }
        return -1;
    }

    /**
     * @return 
     */
    public getSelectedDataIndices(): number[] {

        var index,
            rows = this._selectedRows,
            indices = [];

        if (rows) {
            for (index in rows) {
                if (rows.hasOwnProperty(index)) {
                    indices[indices.length] = rows[index];
                }
            }
        }
        return indices;
    }

    /**
     * Ensures that an item (identified by a data index) has an associated row by
     * expanding any enclosing collapsed rows. Returns the rowIndex of the associated row.
     * 
     * @param dataIndex The data index of the item to ensure is expanded
     * @return 
     */
    public ensureDataIndexExpanded(dataIndex: number): number {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        var rowIndex = this._getRowIndex(dataIndex);
        while (rowIndex < 0 || (dataIndex > 0 && rowIndex === 0)) {
            this.expandNode(this._getDataIndex(-rowIndex));
            rowIndex = this._getRowIndex(dataIndex);
        }
        return rowIndex;
    }

    /**
     * Sets the selected item in the grid by the data index.
     * Optionally ensure that the item is not hidden by collapsed rows.
     * 
     * @param dataIndex The data index of item to show
     * @param expandNodes If true, all containing collapsed nodes will be expanded
     */
    public setSelectedDataIndex(dataIndex: number, expandNodes?: boolean) {
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        var rowIndex = expandNodes ? this.ensureDataIndexExpanded(dataIndex) : this._getRowIndex(dataIndex);
        this.setSelectedRowIndex(rowIndex);
    }

    public selectionChanged(selectedIndex, selectedCount, selectedRows) {
    }

    public selectedIndexChanged(selectedRowIndex, selectedDataIndex) {

    }

    public _updateRowSelectionStyle(rowInfo, selectedRows, focusIndex) {

        const CSS_GRID_ROW_SELECTED = "grid-row-selected";
        const CSS_GRID_ROW_SELECTED_BLUR = "grid-row-selected-blur";
        const CSS_GRID_GUTTER_ROW_SELECTED = "grid-gutter-row-selected";
        const CSS_GRID_GUTTER_ROW_SELECTED_BLUR = "grid-gutter-row-selected-blur";
        const CSS_GRID_ROW_CURRENT = "grid-row-current";
        const CSS_GRID_GUTTER_ROW_CURRENT = "grid-gutter-row-current";
        const CSS_GRID_BLURRED = "grid-blurred";

        var rowIndex = rowInfo.rowIndex;
        var row: JQuery = rowInfo.row;
        var gutterRow: JQuery = rowInfo.gutterRow;
        var active = this._active;

        if (selectedRows && rowIndex in selectedRows) {
            if (gutterRow) {
                gutterRow.find("input.checkbox").prop("checked", true);
            }

            if (active) {
                if (!row.hasClass(CSS_GRID_ROW_SELECTED)) {
                    row.removeClass(CSS_GRID_ROW_SELECTED_BLUR);
                    row.addClass(CSS_GRID_ROW_SELECTED);
                }

                if (gutterRow && !gutterRow.hasClass(CSS_GRID_GUTTER_ROW_SELECTED)) {
                    gutterRow.removeClass(CSS_GRID_GUTTER_ROW_SELECTED_BLUR);
                    gutterRow.addClass(CSS_GRID_GUTTER_ROW_SELECTED);
                }
                this.getElement().removeClass(CSS_GRID_BLURRED);
            }
            else {
                if (!row.hasClass(CSS_GRID_ROW_SELECTED_BLUR)) {
                    row.removeClass(CSS_GRID_ROW_SELECTED);
                    row.addClass(CSS_GRID_ROW_SELECTED_BLUR);
                }

                if (gutterRow && !gutterRow.hasClass(CSS_GRID_GUTTER_ROW_SELECTED_BLUR)) {
                    gutterRow.removeClass(CSS_GRID_GUTTER_ROW_SELECTED);
                    gutterRow.addClass(CSS_GRID_GUTTER_ROW_SELECTED_BLUR);
                }
                this.getElement().addClass(CSS_GRID_BLURRED);
            }

            row.attr("aria-selected", "true");
        }
        else {
            row.removeClass(CSS_GRID_ROW_SELECTED + " " + CSS_GRID_ROW_SELECTED_BLUR + " " + CSS_GRID_ROW_CURRENT);

            if (gutterRow) {
                gutterRow.removeClass(CSS_GRID_GUTTER_ROW_SELECTED + " " + CSS_GRID_GUTTER_ROW_SELECTED_BLUR + " " + CSS_GRID_GUTTER_ROW_CURRENT);
                gutterRow.find("input.checkbox").prop("checked", false);
            }

            row.attr("aria-selected", "false");
        }

        if (rowIndex === focusIndex) {
            row.addClass(CSS_GRID_ROW_CURRENT);

            if (gutterRow) {
                gutterRow.addClass(CSS_GRID_GUTTER_ROW_CURRENT);
            }
        }
        else {
            row.removeClass(CSS_GRID_ROW_CURRENT);

            if (gutterRow) {
                gutterRow.removeClass(CSS_GRID_GUTTER_ROW_CURRENT);
            }
        }
    }

    /**
     * @param timeout 
     */
    public focus(timeout?: number) {
        Utils_UI.tryFocus(this.getFocusElement(), timeout);
    }

    /**
     * Gets info about the row on which context menu is opened.
     *
     * If no context menu is open, returns null.
     *
     * @returns {IGridRowInfo}
     * @publicapi
     */
    public getContextMenuRowInfo(): IGridRowInfo {
        if (this._popupMenu) {
            return <IGridRowInfo>this._popupMenu._options.contextInfo.rowInfo;
        }

        return null;
    }

    /**
     * Creates the context menu options. This function is intended to be overriden by derived objects.
     * 
     * @param rowInfo The information about the row with context
     * @param menuOptions The menu information. See _createContextPopupMenuControl
     * @return 
     */
    public _createContextMenu(rowInfo: any, menuOptions: any): Menus.PopupMenu {
        Diag.Debug.assertParamIsObject(rowInfo, "rowInfo");
        Diag.Debug.assertParamIsObject(menuOptions, "menuOptions");

        return this._createContextPopupMenuControl(menuOptions);
    }

    /**
     *     Creates the PopupMenu control that houses the context menu items for the Grid. Note: this is intentionally
     *     abstracted from _createContextMenu to allow directly calling it from deep derivations and avoiding inheritance
     *     base propagation.
     * 
     * @param menuOptions 
     *     The menu information:
     *     {
     *         contextInfo: { item, rowInfo}
     *         items: the list of menu items
     *     }
     * 
     * @return 
     */
    public _createContextPopupMenuControl(menuOptions: any): Menus.PopupMenu {

        Diag.Debug.assertParamIsObject(menuOptions, "menuOptions");

        var menuItems = $.map(menuOptions.items || [], function (menuItem) {
            return menuItem;
        });

        return <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, this._element, $.extend(
            {
                align: "left-bottom"
            },
            menuOptions,
            {
                items: [{ childItems: Menus.sortMenuItems(menuItems) }]
            }));
    }

    /**
     * @param e 
     * @return 
     */
    public _onContainerResize(e?: JQueryEventObject): any {
        // We need to check for disposal, as this is called as a throttled delegate, so the disposal might happen before the throttle timer expires
        if (!this._disposed) {
            this._measureCanvasSize();

            // Only proceed if our container's size has changed
            // Without this check, IE8 gets stuck in an infinite loop when high contrast is on.
            if (this._canvasHeight !== this._previousCanvasHeight ||
                this._canvasWidth !== this._previousCanvasWidth) {

                this.layout();
            }
        }
    }

    /**
     * @return 
     */
    public _onColumnResize(column): any {

        this._fire("columnresize", [column]);
    }

    /**
     * @return 
     */
    public _onColumnMove(sourceIndex, targetIndex): any {

        this._fire("columnmove", [sourceIndex, targetIndex]);
    }

    /**
     * @param column 
     * @param add 
     */
    public _sortBy(column?: any, add?: boolean) {

        var sortOrder = this._sortOrder.slice(0), i, l, sc, found = false, sortColumns;

        if (column) {
            for (i = 0, l = sortOrder.length; i < l; i++) {
                sc = sortOrder[i];
                if (sc.index === column.index) {
                    sortOrder.splice(i, 1);
                    found = true;
                    break;
                }
            }

            if (found) {
                sc.order = sc.order === "asc" ? "desc" : "asc";
            }
            else {
                sc = { index: column.index, order: "asc" };
            }

            if (add) {
                sortOrder.push(sc);
            }
            else {
                sortOrder = [sc];
            }
        }

        sortColumns = this._getSortColumns(sortOrder);

        this._onSort(sortOrder, sortColumns);
    }

    /**
     * @param sortOrder 
     * @param sortColumns 
     * @return 
     */
    public onSort(sortOrder: any, sortColumns?: any): any {

        if (this._options.autoSort) {
            this._trySorting(sortOrder, sortColumns);
            this._sortOrder = sortOrder;
            this.layout();
        }

        // Refresh UI after the sort
        Diag.logTracePoint('Grid.OnSort.Complete');
    }

    /**
     * @param sortOrder 
     * @param sortColumns 
     * @return 
     */
    public _trySorting(sortOrder: any, sortColumns?: any): any {
        function defaultComparer(column, order, rowA, rowB) {
            var v1 = rowA[column.index],
                v2 = rowB[column.index];

            var typeOfV1 = typeof v1;
            var typeOfV2 = typeof v2;

            if (typeOfV1 === "undefined" || v1 === null) {
                if (typeOfV2 === "undefined" || v2 === null) {
                    return 0;
                }
                else {
                    return -1;
                }
            }

            // Check both number or not
            if (typeOfV1 === "number" && typeOfV2 === "number") {
                return v1 - v2;
            }

            // Check both Date or not
            if (v1 instanceof Date && v2 instanceof Date) {
                return v1.getTime() - v2.getTime();
            }

            // Fallback to string comparison
            return Utils_String.localeIgnoreCaseComparer(v1, v2);
        }

        if (!sortColumns) {
            sortColumns = this._getSortColumns(sortOrder);
        }

        // Combine DataSource and ExpandStates to sort together
        var parents: any[] = [];
        var expandStates = this._expandStates;
        if (expandStates) {
            for (var i = 0; i < expandStates.length; i++) {
                var state = expandStates[i];
                if (state != 0) {
                    for (var j = i + 1; j <= Math.abs(state) + i; j++) {
                        parents[j] = i;
                    }
                }
            }
        }

        var zippedArray: any[] = [];
        var dataSource = this._dataSource;
        var indentLevels = this._indentLevels;
        for (var i = 0; i < dataSource.length; i++) {
            if (expandStates) {
                zippedArray[i] = {
                    dataSource: dataSource[i],
                    expandState: expandStates[i],
                    level: indentLevels[i],
                    parent: zippedArray[parents[i]],
                    index: i
                };
            } else {
                zippedArray[i] = {
                    dataSource: dataSource[i],
                    index: i
                };
            }
        }

        // Sort
        zippedArray.sort((elemA, elemB) => {
            for (let i = 0; i < sortOrder.length; i++) {
                let column = sortColumns[i];
                if (!column) {
                    continue;
                }

                let c = sortOrder[i];
                let comparableElements = [elemA, elemB];
                if (this._expandStates) {
                    comparableElements = this._getComparableAncestors(elemA, elemB);
                    // keep parent row above child
                    if (!comparableElements[0]) {
                        return 1;
                    } else if (!comparableElements[1]) {
                        return -1;
                    }
                }

                let comparer = column.comparer || defaultComparer;
                let result = comparer.call(this, column, c.order, comparableElements[0].dataSource, comparableElements[1].dataSource);

                if (result === 0) {
                    continue;
                }
                else if (c.order === "desc") {
                    return -result;
                }
                else {
                    return result;
                }
            }

            // Keep the order they exist in the data source since it matters for hierarchical structure
            return elemA.index - elemB.index;
        });

        // unzip DataSource and ExpandStates
        for (let i = 0; i < zippedArray.length; i++) {
            let arrayItem = zippedArray[i];
            dataSource[i] = arrayItem.dataSource;
            if (expandStates) {
                expandStates[i] = arrayItem.expandState;
                indentLevels[i] = arrayItem.level;
            }
        }
    }

    /**
     * Finds the closest comparable ancestors of two elements
     * Comparable ancestors are ancestor gridItems which share the same parent gridItem
     * @param zippedArray 
     * @param elemA 
     * @param elemB
     * @return 
     */
    private _getComparableAncestors(elemA: any, elemB: any): any[] {
        if (elemB == elemA.parent) {
            return [null, elemB];
        }

        if (elemA == elemB.parent) {
            return [elemA, null];
        }

        if (elemA.parent == elemB.parent) {
            return [elemA, elemB];
        }

        if (elemA.level > elemB.level) {
            return this._getComparableAncestors(elemA.parent, elemB);
        }

        if (elemA.level < elemB.level) {
            return this._getComparableAncestors(elemA, elemB.parent);
        }

        return this._getComparableAncestors(elemA.parent, elemB.parent);
    }

    /**
     * @param e 
     * @param selector 
     */
    public _getRowInfoFromEvent(e?: JQueryEventObject, selector?: string) {

        return $(e.target).closest(selector).data("grid-row-info");
    }

    /**
     * Handles the row mouse down event
     * @param e 
     * @return 
     */
    public _onRowMouseDown(e?: JQueryEventObject): any {

        var rowInfo = this._getRowInfoFromEvent(e, ".grid-row,.grid-gutter-row");

        if (rowInfo) {
            this._focusStateData.currentActionIndex = -1;
            if ($(e.target).hasClass("grid-tree-icon") && e.which === 1) { // Left mouse button
                this._onToggle(rowInfo);
            }
            else if (e.which !== 2) {
                // Clicking the [...] item should behave the same as a rightclick.
                this._selectRow(rowInfo.rowIndex, rowInfo.dataIndex, {
                    ctrl: e.ctrlKey || e.metaKey,
                    shift: e.shiftKey,
                    rightClick: e.which === 3 || $(e.target).closest(".grid-context-menu-container").length > 0
                });
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    e.preventDefault();
                }
                return this._handleEvent(e, this.onRowMouseDown, "rowmousedown", {
                    row: rowInfo.row,
                    rowInfo: rowInfo,
                    rowIndex: rowInfo.rowIndex,
                    dataIndex: rowInfo.dataIndex
                });
            }
        }
    }

    /**
     * @return 
     */
    public onRowMouseDown(eventArgs): any {
    }

    /**
     * Handles the row mouse up event
     * @param e 
     * @return 
     */
    public _onRowMouseUp(e?: JQueryEventObject): any {
        var rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
        if (rowInfo) {
            return this._handleEvent(e, this.onRowMouseUp, "rowmouseup", {
                row: rowInfo.row,
                rowInfo: rowInfo,
                rowIndex: rowInfo.rowIndex,
                dataIndex: rowInfo.dataIndex
            });
        }
    }

    /**
     * @param eventArgs 
     * @return 
     */
    public onRowMouseUp(eventArgs: JQueryEventObject): any {
    }

    /**
     * @return 
     */
    public onRowClick(eventArgs): any {
        if (!this._options.useLegacyStyle && eventArgs.event && eventArgs.event.target) {
            let $contextMenu = $(eventArgs.event.target).closest(".grid-context-menu");
            if ($contextMenu.length > 0) {
                eventArgs.contextMenu = $contextMenu;
                return this.onContextMenu(eventArgs);
            }
        }
    }

    /**
     * @return 
     */
    public onRowDoubleClick(eventArgs): any {
    }

    /**
     * @return 
     */
    public onGutterClick(eventArgs): any {

        if (this._options.gutter.contextMenu && this._options.useLegacyStyle) {
            this._showContextMenu(eventArgs);
        }
    }

    /**
     * @return 
     */
    public onEnterKey(eventArgs): any {

        if (eventArgs.event.altKey) {
            this._showContextMenu(eventArgs);
            return false;
        }
    }

    /**
     * @return 
     */
    public onDeleteKey(eventArgs): any {
    }

    public _onOpenRowDetail(e?, eventArgs?) {
        var navigateOption, location, target;
        if (this._handleEvent(e, this.onOpenRowDetail, "openRowDetail", eventArgs) !== false) {
            navigateOption = this._options.openRowDetail;
            if (navigateOption) {
                if ($.isFunction(navigateOption)) {
                    navigateOption = navigateOption.call(this, this._selectedIndex);
                }

                // only try to navigate if the function returned a location to navigate to.
                if (navigateOption) {
                    if (typeof (navigateOption) !== "string") {
                        location = this.getColumnValue(this._selectedIndex, navigateOption.hrefIndex, -1);
                        target = navigateOption.target;
                    }
                    else {
                        location = navigateOption;
                    }

                    if (location) {
                        if (target) {
                            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                                url: location,
                                target: target,
                                features: this._options.openRowDetail.targetFeatures
                            });
                        }
                        else {
                            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
                                url: location
                            });
                        }
                    }
                }

                return false;
            }
        }
        else {
            return false;
        }
    }

    /**
     * @return 
     */
    public onOpenRowDetail(eventArgs): any {
    }

    /**
     * @return 
     */
    public onContextMenu(eventArgs): any {
        this._showContextMenu(eventArgs);
    }

    /**
     * @param e 
     * @return 
     */
    public _onBlur(e?: JQueryEventObject): any {

        // Some browsers synchronously call this handler, some do not. 
        // This forces all to be async.
        Utils_Core.delay(this, 0, () => {
            log(verbose, "(grid) focus out");

            // Showing a context menu shouldn't blur the grid, even though
            // the menu actually gets focus. Focusing an element inside the grid
            // such as an action within a cell also shouldn't blur the grid.
            var focusElement = this.getFocusElement();
            if (!this._showingContextMenu && focusElement && !focusElement[0].contains(document.activeElement)) {
                this._active = false;
                this._updateSelectionStyles();
            }
        });
    }

    /**
     * @param e 
     * @return 
     */
    public _onFocus(e?: JQueryEventObject): any {

        log(verbose, "(grid) focus in");

        if (this._selectedIndex < 0 && this._count > 0) {
            this._selectRow(0);
        }

        this._lastFocusTime = Date.now();
        this._active = true;
        this._updateSelectionStyles();
        this._updateActiveDescendant();
    }

    public _onKeyPress(e?: JQueryKeyEventObject): any {
    }

    /**
     * @param e 
     * @return 
     */
    public _onKeyDown(e?: JQueryKeyEventObject): any {

        var bounds = { lo: -1, hi: -1 },
            keyCode = Utils_UI.KeyCode;

        if (e.defaultPrevented) {
            return;
        }

        if (this._header && this._header.length > 0 && this._header[0].contains(e.target)) {
            // don't handle keys when the header has the focus
            return;
        }

        log(verbose, "(grid) key down");

        if (this._copyInProgress) {
            if (e.keyCode === keyCode.ESCAPE) {
                if (this._cancelable) {
                    this._cancelable.cancel();
                }
            }

            //TODO:cancel only our keys
            // Cancelling this key
            return false;
        }

        if (this._count > 0) {
            bounds = { lo: 0, hi: this._expandedCount - 1 };
        }

        if (this._selectedIndex < 0) {
            this._addSelection(bounds.lo);
        }

        let preventDefault = true;

        switch (e.keyCode) {
            case keyCode.A: // A
                if (e.ctrlKey || e.metaKey) {
                    this.selectAll();
                }
                else {
                    return;
                }
                break;

            case keyCode.C: // C
                if (e.ctrlKey || e.metaKey) {
                    this.copySelectedItems();
                }
                else {
                    return;
                }
                break;
            case keyCode.F10: //F10 key
                if (e.shiftKey) {
                    return this._onContextMenu();
                }
                else {
                    return;
                }

            case keyCode.DOWN:
                if (!e.altKey) {
                    this._onDownKey(e, bounds);
                }
                else {
                    return;
                }
                break;

            case keyCode.UP:
                if (!e.altKey) {
                    this._onUpKey(e, bounds);
                }
                else {
                    return;
                }
                break;

            case keyCode.PAGE_DOWN:
            case keyCode.PAGE_UP:
                this._onPageUpPageDownKey(e, bounds);
                break;

            case keyCode.RIGHT:
                if (!e.altKey) {
                    this._onRightKey(e);
                }
                else {
                    return;
                }
                break;

            case keyCode.LEFT:
                if (!e.altKey) {
                    this._onLeftKey(e);
                }
                else {
                    return;
                }
                break;

            case keyCode.ENTER:
                if (!e.isDefaultPrevented()) {
                    let $contextMenu = $(e.target).closest(".grid-context-menu");
                    if ($contextMenu.length > 0) {
                        const row = $(e.target).closest(".grid-row");
                        const rowInfo = row.data("grid-row-info");
                        let eventArgs = {
                            row: rowInfo.row,
                            rowInfo: rowInfo,
                            rowIndex: rowInfo.rowIndex,
                            dataIndex: rowInfo.dataIndex
                        };
                        eventArgs["contextMenu"] = $contextMenu;
                        return this.onContextMenu(eventArgs);
                    }
                    else {
                        if (!Utils_UI.KeyUtils.isModifierKey(e)) {
                            return this._onEnterKey(e, bounds);
                        }
                    }
                }
                break;

            case keyCode.DELETE:
                return this._onDeleteKey(e);

            case keyCode.HOME:
                this._onHomeKey(e, bounds);
                break;

            case keyCode.END:
                this._onEndKey(e, bounds);
                break;

            case keyCode.ESCAPE:
                this._onEscapeKey(e);
                preventDefault = false;
                break;

            case keyCode.TAB:
                this._onTabKey(e);
                return;

            case keyCode.BACKSPACE:
                this._onBackSpaceKey(e);
                return;

            case keyCode.CONTEXT_MENU:
                this._contextMenuKeyPressedState = ContextMenuKeyPressedState.Pressed;
                this._onContextMenu(<JQueryEventObject>e);
                return;

            default:
                return;
        }

        this.getSelectedRowIntoView();
        this._fire("keydown", <any[]>[e.keyCode, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey]);

        if (preventDefault) {
            e.preventDefault();
        }
    }

    public _onBackSpaceKey(e?: JQueryKeyEventObject): void {
    }

    public _onUpKey(e?: JQueryKeyEventObject, bounds?) {
        if (bounds.lo === this._selectedIndex) {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                this._focusHeader();
                return;
            }
        }

        this._clearSelection();
        if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
                this._addSelectionRange(bounds.lo);
            }
            else {
                this._addSelection(bounds.lo);
            }
        }
        else {
            if (e.shiftKey) {
                this._addSelectionRange(Math.max(this._selectedIndex - 1, bounds.lo));
            }
            else {
                this._addSelection(this._selectedIndex - 1);
            }
        }
    }

    public _onDownKey(e?: JQueryKeyEventObject, bounds?) {
        this._clearSelection();
        if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
                this._addSelectionRange(bounds.hi);
            }
            else {
                this._addSelection(bounds.hi);
            }
        }
        else {
            if (e.shiftKey) {
                this._addSelectionRange(Math.min(this._selectedIndex + 1, bounds.hi));
            }
            else {
                this._addSelection(Math.min(this._selectedIndex + 1, bounds.hi));
            }
        }
    }

    public _onRightKey(e?: JQueryKeyEventObject) {
        this._onHorizontalArrowKey(Direction.Right, e);
    }

    public _onLeftKey(e?: JQueryKeyEventObject) {
        this._onHorizontalArrowKey(Direction.Left, e);
    }

    private _onHorizontalArrowKey(direction: Direction, e?: JQueryKeyEventObject) {
        if (this._rows.length === 0) {
            return;
        }
        const selectedRow = this.getSelectedDataIndex();

        this._updateRowActionList(selectedRow);

        const nextActionIndex = Math.min(Math.max(-1, this._focusStateData.currentActionIndex + (direction === Direction.Left ? -1 : 1)), this._focusStateData.rowActionList[selectedRow].length - 1);
        const rowIsSelected = selectedRow >= 0;
        const rowHasActions = this._focusStateData.rowActionList[selectedRow].length > 0;
        const nextActionExists = nextActionIndex !== this._focusStateData.currentActionIndex && nextActionIndex !== -1;

        const expanded = this._focusStateData.currentActionIndex === -1 && direction === Direction.Right && this.tryToggle(true, e.shiftKey);

        if (!expanded) {
            if (rowIsSelected && rowHasActions && nextActionExists) {
                this._focusStateData.currentActionIndex = nextActionIndex;
                const elemToFocus = this._focusStateData.rowActionList[selectedRow][this._focusStateData.currentActionIndex];
                this._setFocusedGridElement(elemToFocus);
            }
            else if (direction === Direction.Left && nextActionIndex === -1 && this._focusStateData.currentActionIndex !== -1) {
                // Un-focus the cell action and go back to the row
                this._setFocusedGridElement(this.getFocusElement()[0]);
                this._focusStateData.currentActionIndex = -1;
            }
            else {
                var canvas = this._canvas;
                if (direction === Direction.Left && !this.tryToggle(false, e.shiftKey) || !expanded) {
                    canvas.scrollLeft(canvas.scrollLeft() + 50 * (direction === Direction.Left ? -1 : 1));
                }
                else {
                    this._clearSelection();
                    this._addSelection(this._selectedIndex);
                }
            }
        }
    }

    public _onPageUpPageDownKey(e?: JQueryKeyEventObject, bounds?) {
        var rowsPerPage = this._getRowsPerPage(e),
            keyCode = Utils_UI.KeyCode;

        this._clearSelection();

        if (e.keyCode === keyCode.PAGE_DOWN) {
            if (e.shiftKey) {
                this._addSelectionRange(Math.min(this._selectedIndex + rowsPerPage, bounds.hi));
            }
            else {
                this._addSelection(Math.min(this._selectedIndex + rowsPerPage, bounds.hi));
            }
        }
        else {
            if (e.shiftKey) {
                this._addSelectionRange(Math.max(this._selectedIndex - rowsPerPage, bounds.lo));
            }
            else {
                this._addSelection(Math.max(this._selectedIndex - rowsPerPage, bounds.lo));
            }
        }
    }

    public _getRowsPerPage(e?: BaseJQueryEventObject): number {
        var span = this._canvas[0].clientHeight,
            rowsPerPage = Math.floor(span / this._rowHeight);

        return rowsPerPage;
    }

    public _onHomeKey(e?: JQueryKeyEventObject, bounds?) {
        this._clearSelection();
        if (e.shiftKey) {
            this._addSelectionRange(bounds.lo);
        }
        else {
            this._addSelection(bounds.lo);
        }
    }

    public _onEndKey(e?: JQueryKeyEventObject, bounds?) {
        this._clearSelection();
        if (e.shiftKey) {
            this._addSelectionRange(bounds.hi);
        }
        else {
            this._addSelection(bounds.hi);
        }
    }

    public _onTabKey(e?: JQueryKeyEventObject) {

    }

    public _onEscapeKey(e?: JQueryKeyEventObject) {
        this._tryFinishColumnMoving(true);

        // Un-focus the cell action and go back to the row
        this._setFocusedGridElement(this.getFocusElement()[0]);
        this._focusStateData.currentActionIndex = -1;
    }

    /**
     * @param e 
     * @return 
     */
    public _onKeyUp(e?: JQueryKeyEventObject): any {

        return;
    }

    private _focusHeader() {
        let sortColumn = this._getFocusableHeaderElement();

        if (sortColumn.length > 0) {
            this._clearSelection();
            this._setFocusedGridElement(sortColumn[0]);
        }
    }

    protected _getFocusableHeaderElement(): JQuery {
        let sortColumn = this._header.find("[aria-sort]");
        if (sortColumn.length === 0) {
            sortColumn = this._getHeaderSortColumn(".grid-header-column");
        }

        return sortColumn;
    }

    protected _getHeaderSortColumn(className: string): JQuery {
        return this._header.find(className).eq(0);
    }

    /**
     * Enables raising the custom event with the provided event name.
     * 
     * @param eventName Name of the event to enable.
     */
    public enableEvent(eventName: string) {

        Diag.Debug.assertParamIsStringNotEmpty(eventName, "eventName");

        var enabledEvents = this._options.enabledEvents;

        if (!enabledEvents) {
            enabledEvents = {};
            this._options.enabledEvents = enabledEvents;
        }

        enabledEvents[eventName] = true;
    }

    /**
     * Disables raising the custom event with the provided event name.
     * 
     * @param eventName Name of the event to disable.
     */
    public disableEvent(eventName: string) {

        Diag.Debug.assertParamIsStringNotEmpty(eventName, "eventName");

        var enabledEvents = this._options.enabledEvents;

        if (enabledEvents) {
            delete enabledEvents[eventName];
        }
    }

    /**
     * Gets the collection of expand states for the grid.
     */
    public getExpandStates() {
        return this._expandStates;
    }

    /**
     * Generates a table of the selected items in the grid.
     * 
     * @param operationCompleteCallback A callback function invoked when the
     * current selection is available to the client for processing.
     * @param errorCallback 
     */
    public beginFormatTable(operationCompleteCallback: IResultCallback, errorCallback?: IErrorCallback, formatterType?: new (grid: GridO<TOptions>, options?: any) => ITableFormatter, options?: any) {

        Diag.Debug.assertParamIsFunction(operationCompleteCallback, "operationCompleteCallback");

        this._beginEnsureSelectionIsAvailable(delegate(this, function () {
            var grid: GridO<TOptions> = this,
                formatter: ITableFormatter,
                selectionText: string;

            if (!(grid._cancelable && grid._cancelable.canceled)) {
                if (!formatterType) {
                    if (grid._options && grid._options.formatterType) {
                        // allow for a way to override the formatter type
                        formatterType = grid._options.formatterType;
                    } else {
                        formatterType = TabDelimitedTableFormatter;
                    }
                }

                formatter = new formatterType(grid, options);
                selectionText = formatter.getTableFromSelectedItems();
            }

            if ($.isFunction(operationCompleteCallback)) {
                operationCompleteCallback(selectionText, formatter);
            }
        }, errorCallback));
    }

    public _createElement() {
        super._createElement();
        this._buildDom();
    }

    protected _addSpacingElements(): void {
        // overriden
    }

    /**
     * Obsolete, unused.
     */
    public _createFocusElement(): JQuery {
        return $(domElem("div", "grid-focus")).attr({ tabindex: "0", role: "grid" });
    }

    private _getMode(): GridMode {
        let gridMode: GridMode = "grid";
        let options = this._options;

        if (options.expandStates) {
            // use treegrid role if we have expandable rows even if there is only one column because it's difficult for our current markup to follow nested list or tree pattern
            gridMode = "treegrid";
        }
        else if (!options.header && (!options.columns || options.columns.length === 1)) {
            gridMode = "list";
        }

        return gridMode;
    }

    private _getRole(elementType: "canvas" | "row" | "cell"): string {
        let gridMode = this._getMode();
        let isList = gridMode === "list";
        if (elementType === "canvas") {
            return gridMode;
        }
        else if (elementType === "row") {
            return isList ? "listitem" : "row";
        }
        else if (elementType === "cell") {
            return isList ? null : "gridcell";
        }
    }

    private _buildDom() {
        var fragment = document.createDocumentFragment(), gutterOptions, gutterVisible;

        gutterOptions = this._options.gutter;

        gutterVisible = gutterOptions && (gutterOptions.contextMenu || gutterOptions.icon || gutterOptions.checkbox);

        const focusElement = this.getFocusElement()[0];
        if (focusElement) {
            // There exist L0 tests that try to enhance JQuery selectors that match nothing. In that 
            // case there is no focusElement.
            focusElement.addEventListener("focus", (e: FocusEvent) => {
                const targetElem = e.target as HTMLElement;
                const handler = Utils_UI.getFocusRingFocusHandler();
                const focusElement = this.getFocusElement()[0];
                if (focusElement.contains(targetElem)
                    && focusElement !== e.target
                    && !targetElem.classList.contains("grid-row")
                    && !targetElem.classList.contains("menu-item")) {
                    handler(e);
                }
            }, true);
        }

        this._contentSpacer = $(domElem("div", "grid-content-spacer")).attr({ role: "presentation" });
        this._canvas = $(domElem("div", "grid-canvas")).attr("role", "presentation");
        this._canvas.append(this._contentSpacer);
        this._addSpacingElements();

        if (this._options.header) {
            this._element.addClass("has-header");
            this._header = $(domElem("div", "grid-header"));

            // Suppress context menu right clicking on the header row
            this._header.bind("contextmenu", function (e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            this._header[0].addEventListener("focus", Utils_UI.getFocusRingFocusHandler(), true);

            this._header.attr({
                role: "row",
                "aria-rowindex": 1,
            });

            this._headerCanvas = $(domElem("div", "grid-header-canvas")).attr({ role: "presentation" });
            this._header.append(this._headerCanvas);

            fragment.appendChild(this._header[0]);
        }

        if (gutterVisible) {
            this._element.addClass("has-gutter");
            this._gutter = $(domElem("div", "grid-gutter"));
            this._canvas.append(this._gutter);

            if (this._header) {
                this._gutterHeader = $(domElem("div", "grid-gutter-header"));

                if (gutterOptions.tooltip) {
                    this._gutterHeader.attr("title", gutterOptions.tooltip);
                }

                this._header.append(this._gutterHeader);
            }

            if (!this._options.useLegacyStyle && !gutterOptions.icon && !gutterOptions.checkbox) {
                this._gutter.addClass("grid-gutter-behind");
            }
        }

        if (this._options.useLegacyStyle) {
            this._element.addClass("grid-legacy");
        }

        fragment.appendChild(this._canvas[0]);

        // When performing drop operations JQuery UI filters out the draggable item and its children
        // as valid drop targets.  The canvasDroppable is used so we have something other than the draggable
        // item (canvas) to serve as a drop target.
        this._canvasDroppable = $(domElem("div", "grid-canvas grid-canvas-droppable"));
        fragment.appendChild(this._canvasDroppable[0]);

        this._element.append(<any>fragment);
    }

    /**
     * Gets the Focus Element for the Grid. 
     *
     * This is the actual element that receives focus and that all the event bindings, like 'keydown', are bound to.
     */
    public getFocusElement(): JQuery {
        return this.getElement();
    }

    public _shouldAttachContextMenuEvents(): boolean {
        return (!this._options.useLegacyStyle && !!this._options.contextMenu && this._options.gutter.contextMenu !== false) ||
            (this._gutter && (this._options.gutter && this._options.gutter.contextMenu));
    }

    public _attachEvents() {
        const that = this;

        const element = this._element;
        const canvas = this._canvas;
        const focus = element;
        const header = this._header;

        Utils_UI.attachResize(element, Utils_Core.throttledDelegate(this, 10, this._onContainerResize));

        this._bind("mousedown", delegate(this, this._onContainerMouseDown));

        this._bind(focus, "keydown", delegate(this, this._onKeyDown));
        this._bind(focus, "keyup", delegate(this, this._onKeyUp));
        this._bind(focus, "keypress", delegate(this, this._onKeyPress));
        this._bind(focus, "focus", delegate(this, this._onFocus));
        focus[0].addEventListener("focus", this._onFocus.bind(this), true);
        focus[0].addEventListener("blur", this._onBlur.bind(this), true);

        if (this._shouldAttachContextMenuEvents()) {
            this._bind("contextmenu", (e: JQueryEventObject) => {
                // If right-click was used, only open the menu if the target was a row/gutter row
                if (this._contextMenuKeyPressedState === ContextMenuKeyPressedState.Handling || $(e.target).closest(".grid-row,.grid-gutter-row").length > 0) {
                    return this._onContextMenu.call(this, e);
                }
            });
        }

        this._bind(canvas, "click", delegate(this, this._onRowClick));
        this._bind(canvas, "dblclick", delegate(this, this._onRowDoubleClick));
        this._bind(canvas, "mousedown", delegate(this, this._onRowMouseDown));
        this._bind(canvas, "mouseup", delegate(this, this._onRowMouseUp));

        const scrollDelegate = Utils_Core.throttledDelegate(this, 10, this._onCanvasScroll);
        this._bind(canvas, "scroll", scrollDelegate);
        this._bind(canvas, "touchmove", scrollDelegate);

        this._bind(canvas, "selectstart", delegate(this, this._onSelectStart));

        if (header) {
            // Binding the necessary events for column move, resize and sort
            this._bind(header, "mousedown", delegate(this, this._onHeaderMouseDown));
            this._bind(header, "mouseup", delegate(this, this._onHeaderMouseUp));
            this._bind(header, "click", delegate(this, this._onHeaderClick));
            this._bind(header, "dblclick", delegate(this, this._onHeaderDblClick));
            this._bind(header, "keydown", this._onHeaderKeyDown.bind(this));
            this._bind(header, "scroll", this._onHeaderScroll.bind(this));
        }

        if (this._gutter) {
            this._bind(this._gutter, "click", delegate(this, this._onGutterClick));

            this._gutter.hover(function (e) {
                $(e.target)
                    .closest(".grid-gutter-row")
                    .addClass("grid-gutter-row-hover");
            }, function (e) {
                $(e.target)
                    .closest(".grid-gutter-row")
                    .removeClass("grid-gutter-row-hover");
            });
        }

        this._setupDragDrop();

        element.parents(".ui-tabs").bind("tabsactivate", function (e) {
            if (that._element.is(":visible")) {
                that.layout();
            }
        });

        this._tooltipMouseOverHandler = (e: JQueryEventObject, ...args: any[]) => {
            this._onMouseOver(e);
        };

        this._tooltipMouseOutHandler = (e: JQueryEventObject, ...args: any[]) => {
            this._onMouseOut(e);
        };

        element.on("mouseover", GridO.TOOLTIP_TARGET_SELECTOR, this._tooltipMouseOverHandler);
        element.on("mouseout", GridO.TOOLTIP_TARGET_SELECTOR, this._tooltipMouseOutHandler);

        Diag.logTracePoint('Grid._attachEvents.complete');
    }

    public _getDraggedRowsInfo(e?: JQueryEventObject) {
        var target = $(e.target), row, rowInfo, draggingRowInfo = null;

        row = target.closest(".grid-row");

        if (row.length) {
            rowInfo = row.data("grid-row-info");
            draggingRowInfo = { dataIndex: +rowInfo.dataIndex, rowIndex: +rowInfo.rowIndex };
        }
        return draggingRowInfo;
    }

    private _setupDragDrop() {
        this.setupDragDrop(this._options.draggable, this._options.droppable);
    }

    /**
     * Setup the provided draggable and droppable options
     */
    public setupDragDrop(draggableOptions, droppableOptions) {

        var draggableDefaults,
            draggingRowInfo;

        var setupUiInfo = (ui) => {
            // Some drag events do not have draggable set, so set the draggable item.
            if (!ui.draggable) {
                ui.draggable = this._canvas;
            }
            ui.draggingRowInfo = draggingRowInfo;
        }

        // If draggableOptions were provided, make grid draggable.
        if (draggableOptions) {
            draggableDefaults = {
                axis: "y",
                helperClass: "grid-row-dragging",
                zIndex: 1000,
                appendTo: this._canvas,
                handle: ".grid-row",
                opacity: 0.7,
                scope: this.getTypeName(),
                cursorAt: { top: this._rowHeight / 2 },
            };

            if (typeof draggableOptions !== "object") {
                draggableOptions = {};
            }

            // Build up the draggable options which will be saved in a field for later
            // use by the event handlers.
            this._draggable = $.extend({}, draggableDefaults, draggableOptions);

            // Build up the draggable options which will be provided to JQuery Ui.
            // These are primarily wrappers around the handlers provided.
            draggableOptions = $.extend(draggableDefaults,
                draggableOptions,
                {
                    helper: (e) => {
                        // Save off the information about the row that is being dragged so
                        // it can be provided to subsequent event handlers.
                        draggingRowInfo = this._getDraggedRowsInfo(e);

                        if (draggingRowInfo) {
                            this._cleanupDragDropState();

                            var ui = this._getDraggable(this._canvas);
                            setupUiInfo(ui);
                            return this._rowDragCreateHelper(draggingRowInfo, e, ui);
                        }
                        else {
                            //it seems user started dragging in an empty grid
                            draggingRowInfo = null;
                            return $("<div />");
                        }
                    },
                    drag: (e, ui) => {
                        setupUiInfo(ui);
                        return this._invokeDragHandler(e, ui, this._draggable.drag);
                    },
                    start: (e, ui) => {
                        if (draggingRowInfo) {
                            setupUiInfo(ui);

                            // The draggable element (canvas) will be provided to accept handlers, so tag it with the dragging
                            // row info so that it can be looked up by the handlers.
                            this._canvas.data(GridO.DATA_DRAGGING_ROWINFO, draggingRowInfo);

                            // When the "ui" instance is passed into the droppable handlers it is not the same
                            // instance as we have here, so any additional data we have set on it here will not
                            // be available to these handlers.  To ensure droppable handlers have access to the
                            // dragging row info, save it off.
                            this._draggingRowInfo = draggingRowInfo;

                            return this._invokeDragHandler(e, ui, this._draggable.start);
                        }
                        else {
                            return false; //stop dragging
                        }
                    },
                    stop: (e, ui) => {
                        setupUiInfo(ui);

                        var result = this._invokeDragHandler(e, ui, this._draggable.stop);

                        // Clear the dragging row info since we are done dragging.
                        this._draggingRowInfo = null;
                        this._canvas.data(GridO.DATA_DRAGGING_ROWINFO, null);

                        return result;
                    }
                });

            this._canvas.draggable(draggableOptions);
        }

        if (droppableOptions) {
            var droppableDefaults = {
                tolerance: "intersect",
                hoverClass: "grid-row-drop-active",
                scope: this.getTypeName(),
            };

            // If the accept handler is not a function, treat it as the acceptSelector.
            if (droppableOptions.accept) {
                if (!$.isFunction(droppableOptions.accept)) {
                    droppableOptions.acceptSelector = droppableOptions.accept;
                }
            }

            // Build the droppable options which will be saved off in a field.  This will
            // later be used to access the original droppable handlers.
            this._droppable = $.extend({}, droppableDefaults, droppableOptions);

            // Build up the droppable options which will be provided to JQuery.  These are
            // mostly wrappers around the provided handlers.
            droppableOptions = $.extend({}, this._droppable, {
                accept: ($element) => {
                    if (!this._ddDropStarted) {
                        // Update the accept statuses' when we are not in the context of performing a drop operation.
                        this._droppableAcceptHandler($element, draggingRowInfo);
                    }

                    // Always accept so we get other drop events which allow us to cleanup
                    // appropriately when the operation is complete (clear accept statuses, etc...)
                    return true;
                },
                activate: (e, ui) => {
                    setupUiInfo(ui);
                    this._droppableActivateHandler(e, ui);
                },
                deactivate: (e, ui) => {
                    setupUiInfo(ui);
                    this._droppableDeactivateHandler(e, ui);
                },
                over: (e, ui) => {
                    setupUiInfo(ui);
                    this._droppableOverHandler(e, ui);
                },
                out: (e, ui) => {
                    setupUiInfo(ui);
                    this._droppableOutHandler(e, ui);
                },
                drop: (e, ui) => {
                    this._ddDropStarted = true;
                    setupUiInfo(ui);
                    this._droppableDropHandler(e, ui);
                }
            });

            // Make the droppable canvas droppable.  It is important that this element not be inside of
            // the draggable element since JQuery will not allow elements which are the same as or children
            // of the draggable item to be dropped by the item being dragged.
            this._canvasDroppable.droppable(droppableOptions);
        }

        // If we are setting up any kind of drag/drop ensure our state is clear.
        if (draggableOptions || droppableOptions) {
            this._cleanupDragDropState();
        }
    }

    public disableDragDrop() {
        var draggableOptions =
            {
                drag: (e, ui) => {
                    return false;
                },
                start: (e, ui) => {
                    return false;
                }
            };

        this._canvas.draggable(draggableOptions);
    }

    public enableDragDrop() {
        this._setupDragDrop();
    }

    /**
     * Delegate out to the row accept handlers to determine if the dragging item will be accepted.
     */
    private _droppableAcceptHandler($element: JQuery, draggingRowInfo) {
        var accept = this._droppable.accept;

        // Do nothing if no accept handler was provided in the options.
        if (accept) {
            var droppingRowInfo;

            $element.data(GridO.DATA_DRAGGING_ROWINFO, draggingRowInfo);

            // Test each row to see if it will be accepted.
            $.each(this._rows, (dataIndex, rowInfo) => {
                droppingRowInfo = {
                    dataIndex: Number(dataIndex),
                    rowIndex: rowInfo.rowIndex
                };

                // Delegate to the individual row accept handler.
                this._rowDropAccept(droppingRowInfo, $element);
            });
        }
    }

    private _droppableDropHandler(e, ui) {
        // <summary>Called when an item is dropped on the grid canvas.</summary>

        Diag.logTracePoint('Grid._drop.start');

        // If there is a drop handler, trigger it.
        var drop = this._droppable.drop;
        if (drop && this._draggableOverGrid) {
            var droppingRowInfo;
            var draggable = this._getDraggable(ui.draggable);

            // Find the row that was being hovered.
            $.each(this._rows, (dataIndex, rowInfo) => {
                var currentRowInfo = {
                    dataIndex: Number(dataIndex),
                    rowIndex: rowInfo.rowIndex
                };

                if (this._rowIntersect(draggable, currentRowInfo)) {
                    droppingRowInfo = currentRowInfo;

                    // Now that we have found a row that intersects, do not check subsequent rows.
                    return false;
                }
            });

            // With the shifted row logic, check if the bottom half of the last row or the top half of the first row coincides with the cursor 
            if (!droppingRowInfo && this._rowOffsetHeight) {
                var index = this._rowOffsetHeight > 0 ? this.getLastRowDataIndex() : 0;
                var rowInfo = this._rows[index];

                if (rowInfo) {
                    droppingRowInfo = { dataIndex: +index, rowIndex: +rowInfo.rowIndex, isAboveFirstOrBelowLast: true };

                    var row = rowInfo.row;
                    var offset = row.offset();
                    if (index !== 0) { // Only shift if we are checking for the bottom half of the last row
                        offset.top += this._rowOffsetHeight;
                    }

                    var intersectPosition = this._calculateIntersectPosition(draggable);

                    if (!(<any>$.ui).intersect(draggable, {
                        offset: offset,
                        proportions: () => {
                            return {
                                width: row[0].offsetWidth,
                                height: row[0].offsetHeight - Math.abs(this._rowOffsetHeight)
                            };
                        }
                    },
                        this._droppable.tolerance,
                        {
                            pageY: intersectPosition.pageY,
                            pageX: intersectPosition.pageX
                        })) {
                        droppingRowInfo = null;
                    }
                }
            }

            // Trigger the drop on the row that was being hovered if it was accepted
            if (droppingRowInfo && this._getAcceptStatus(droppingRowInfo.dataIndex)) {
                ui.droppingRowInfo = droppingRowInfo;
                drop.call(this, e, ui);
            }
        }
    }

    /**
     * Called when an item is being dragged that will be accepted by rows in this grid.
     */
    private _droppableActivateHandler(e, ui) {

        // If we do not have a dragging row, then the drag operation is happening from another source (not this grid).
        // However this grid could contain a row which accepts the item.
        var draggingRowDataIndex = ui.draggingRowInfo ? Number(ui.draggingRowInfo.dataIndex) : -1;

        // Try to activate each row.
        $.each(this._rows, (dataIndex, rowInfo) => {
            if (dataIndex !== draggingRowDataIndex) {
                this._rowDropTryActivate({
                    dataIndex: Number(dataIndex),
                    rowIndex: rowInfo.rowIndex
                }, e, ui);
            }
        });
    }

    /**
     * Called when an item stops being dragged that will be accepted by rows in this grid.
     */
    private _droppableDeactivateHandler(e, ui) {

        // If we do not have a dragging row, then the drag operation is happening from another source (not this grid).
        // However this grid could contain a row which accepts the item.
        var draggingRowDataIndex = ui.draggingRowInfo ? ui.draggingRowInfo.dataIndex : -1;

        // Try to deactivate each row.
        $.each(this._rows, (dataIndex, rowInfo) => {
            if (dataIndex !== draggingRowDataIndex) {
                this._rowDropDeactivate({
                    dataIndex: Number(dataIndex),
                    rowIndex: rowInfo.rowIndex
                }, e, ui);
            }
        });

        this._cleanupDragDropState();
    }

    /**
     * Called when a draggable item is over the grid.
     */
    private _droppableOverHandler(e, ui) {

        // Indicate that the draggable item is over the grid.
        this._draggableOverGrid = true;

        // Register for mouse move since the the draggable is now over this grid.
        // This allows us to delegate the Over and Out to the individual row methods.
        this._bind(window.document, "mousemove", (e) => {
            // Mouse move can be triggered as the mouse moves out of the grid even though the event
            // is unbound during the operation.  Ignore calls to mouse move when out of the grid.
            if (this._draggableOverGrid) {
                this._droppableOverMoveHandler(e, ui);
            }
        });

        // Trigger the first check since the mouse is over the grid now.
        this._droppableOverMoveHandler(e, ui);
    }

    /**
     * Called when a draggable item is no longer over the grid.
     */
    private _droppableOutHandler(e, ui) {

        this._unregisterDragMouseMove();

        // Trigger last move handler now that the mouse is outside of the grid.
        this._droppableOverMoveHandler(e, ui);
    }

    /**
     * Called when the mouse moves while the draggable item is over the grid.
     * 
     * @param outOfGrid Indicates if this move event is being triggered as the mouse is leaving the grid.
     */
    private _droppableOverMoveHandler(e, ui) {

        var overStatus = this._getDragOverRows();
        var draggable = this._getDraggable(ui.draggable);

        // If we do not have a dragging row, then the drag operation is happening from another source (not this grid).
        // However this grid could contain a row which accepts the item.
        var draggingRowDataIndex = ui.draggingRowInfo ? Number(ui.draggingRowInfo.dataIndex) : -1;

        // Test each row to see if the draggable is over it and if not see if it has
        // left it.
        $.each(this._rows, (dataIndex, rowInfo) => {
            var droppingRowInfo;
            if (dataIndex !== draggingRowDataIndex) {
                droppingRowInfo = { dataIndex: +dataIndex, rowIndex: +rowInfo.rowIndex };

                // If the row accepted the draggable, test it.
                if (this._getAcceptStatus(dataIndex)) {
                    if (this._draggableOverGrid && this._rowIntersect(draggable, droppingRowInfo)) {
                        // The draggable is in the grid and intersects the row.

                        // If the draggable was not previously over the row, trigger the over event.
                        if (!overStatus[dataIndex]) {
                            overStatus[dataIndex] = true;
                            this._rowDropOver(droppingRowInfo, e, ui);
                        }
                    }
                    else {
                        // The draggable is out of the grid or does not intersect the row.
                        // If the dragggable was previously over the row, trigger the out event.
                        if (overStatus[dataIndex]) {
                            delete overStatus[dataIndex];
                            delete this._isAboveFirstOrBelowLastRow;
                            this._rowDropOut(droppingRowInfo, e, ui);
                        }

                    }
                }
            }
        });

        // With the shifted row logic, check if the bottom half of the last row or the top half of the first row coincides with the cursor 
        if (this._rowOffsetHeight) {
            var index = this._rowOffsetHeight > 0 ? this.getLastRowDataIndex() : 0;

            var droppingRowInfo;
            var rowInfo = this._rows[index];

            if (rowInfo) {
                droppingRowInfo = { dataIndex: +index, rowIndex: +rowInfo.rowIndex };

                var row = rowInfo.row;
                var offset = row.offset();

                if (index !== 0) { // only shift if checking for bottom half of the last row.
                    offset.top += this._rowOffsetHeight;
                }

                var intersectPosition = this._calculateIntersectPosition(draggable);

                if (this._draggableOverGrid && (<any>$.ui).intersect(draggable, {
                    offset: offset,
                    proportions: () => {
                        return {
                            width: row[0].offsetWidth,
                            height: row[0].offsetHeight - Math.abs(this._rowOffsetHeight)
                        };
                    }
                },
                    this._droppable.tolerance,
                    {
                        pageY: intersectPosition.pageY,
                        pageX: intersectPosition.pageX
                    })) {
                    // The draggable is in the grid and intersects the bottom half of the last row of the grid
                    // If the draggable was not previously over the row, trigger the over event with a special flag to indicate the mouse is out of the shifted grid.
                    $.extend(droppingRowInfo, { isAboveFirstOrBelowLast: true });
                    if (!overStatus[index]) {
                        overStatus[index] = true;
                        this._isAboveFirstOrBelowLastRow = true;
                        this._rowDropOver(droppingRowInfo, e, ui);
                    }
                }
                else {
                    // The draggable is out of the grid or does not intersect the row.
                    // If the dragggable was previously over the row, trigger the out event.
                    if (overStatus[index] && this._isAboveFirstOrBelowLastRow) {
                        delete overStatus[index];
                        delete this._isAboveFirstOrBelowLastRow;
                        this._rowDropOut(droppingRowInfo, e, ui);
                    }
                }
            }
        }
    }

    /**
     * Gets the draggable instance from the element which is being dragged.
     */
    private _getDraggable($draggedElement) {
        return $draggedElement.data("ui-draggable");
    }

    /**
     * Clean up all state stored during drag/drop operations.
     */
    private _cleanupDragDropState() {
        this._resetRowAcceptStatus();
        this._resetRowOverStatus();
        this._unregisterDragMouseMove();

        this._ddDropStarted = false;
    }

    /**
     * Unregister the mouse move event which is setup during drag/drop operations.
     */
    private _unregisterDragMouseMove() {

        // Clear over grid state since not tracking mouse movements anymore.
        this._draggableOverGrid = false;
        this._unbind(window.document, "mousemove");
    }

    /**
     * Clear the record of which rows the draggable objects are "over"
     */
    private _resetRowOverStatus() {
        this._ddRowOverStatus = {};
    }

    private _rowDropAccept(droppingRowInfo, $element: JQuery) {
        var rowInfo = this._rows[droppingRowInfo.dataIndex];
        if (rowInfo) {
            var rowResult = this._ddRowAcceptStatus[droppingRowInfo.dataIndex];

            // If we do not already have a accept status for the row, then get it.
            if (typeof rowResult === "undefined") {
                if ($.isFunction(this._droppable.accept)) {
                    $element.data(GridO.DATA_DROPPING_ROWINFO, droppingRowInfo);
                    rowResult = this._droppable.accept.call(this, $element);
                }
                else if (this._droppable.acceptSelector) {
                    rowResult = rowInfo.row.is(this._droppable.acceptSelector);
                }

                // Cache the status for this row.
                this._ddRowAcceptStatus[droppingRowInfo.dataIndex] = rowResult;
            }

            return rowResult;
        }
        else {
            return false;
        }
    }

    private _rowDropActivate(droppingRowInfo, e?, ui?) {
        var rowInfo = this._rows[droppingRowInfo.dataIndex], activate = this._droppable.activate;

        if (rowInfo) {
            if (this._droppable.activeClass) {
                rowInfo.row.addClass(this._droppable.activeClass);
            }

            if (activate) {
                return activate.call(this, e, $.extend({}, ui, { droppingRowInfo: rowInfo }));
            }
        }
    }

    private _rowDropDeactivate(droppingRowInfo, e?, ui?) {
        var accepted = this._getAcceptStatus(droppingRowInfo.dataIndex);

        if (accepted) {
            var rowInfo = this._rows[droppingRowInfo.dataIndex];
            var deactivate = this._droppable.deactivate;

            if (rowInfo) {
                if (this._droppable.activeClass) {
                    rowInfo.row.removeClass(this._droppable.activeClass);
                }

                if (this._droppable.hoverClass) {
                    rowInfo.row.removeClass(this._droppable.hoverClass);
                }

                if (deactivate) {
                    return deactivate.call(this, e, $.extend({}, ui, { droppingRowInfo: rowInfo }));
                }
            }
        }
    }

    private _rowDropOver(droppingRowInfo, e?, ui?) {
        var rowInfo = this._rows[droppingRowInfo.dataIndex];
        var droppable = this._droppable;
        var over = this._droppable.over;
        var draggable = this._getDraggable(ui.draggable);

        if (rowInfo) {
            draggable.dropped = true;
            if (droppable.hoverClass) {
                rowInfo.row.addClass(droppable.hoverClass);
            }

            if (this._rowOffsetHeight) {
                rowInfo["isAboveFirstOrBelowLast"] = droppingRowInfo.isAboveFirstOrBelowLast;
            }

            if (over) {
                over.call(this, e, $.extend({}, ui, { droppingRowInfo: rowInfo }));
            }
        }
    }

    private _rowDropOut(droppingRowInfo, e?, ui?) {
        var rowInfo = this._rows[droppingRowInfo.dataIndex];
        var droppable = this._droppable;
        var out = this._droppable.out;
        var draggable = this._getDraggable(ui.draggable);

        if (rowInfo) {
            draggable.dropped = false;
            if (droppable.hoverClass) {
                rowInfo.row.removeClass(droppable.hoverClass);
            }

            if (out) {
                out.call(this, e, $.extend({}, ui, { droppingRowInfo: rowInfo }));
            }
        }
    }

    private _rowDrop(droppingRowInfo, draggingRowInfo, e?, ui?) {
        var rowInfo = this._rows[droppingRowInfo.dataIndex], droppable = this._droppable;
        if (rowInfo) {
            if (droppable.hoverClass) {
                rowInfo.row.removeClass(droppable.hoverClass);
            }

            if (droppable.activeClass) {
                rowInfo.row.removeClass(droppable.activeClass);
            }

            if (droppable.drop) {
                droppable.drop.call(this, e, $.extend({}, ui, { droppingRowInfo: rowInfo }));
            }
            // Removed auto-row selection. The responsibility for selecting the updated rows
            // lies with the drop handler.
        }
    }

    private _rowDragCreateHelper(draggingRowInfo, e?, ui?) {
        var helper;

        if ($.isFunction(this._draggable.helper)) {
            return this._draggable.helper.call(this, e, $.extend({}, ui, { draggingRowInfo: draggingRowInfo }));
        }

        helper = this._rows[draggingRowInfo.dataIndex].row.clone();
        helper.removeClass("grid-row-selected grid-row-selected-blur grid-row-current");
        helper.addClass(this._draggable.helperClass);
        helper.css("position", "absolute");

        return helper;
    }

    /**
     * Invokes the provided handler
     */
    private _invokeDragHandler(e, ui, handlerCallback) {
        if (handlerCallback) {
            return handlerCallback.call(this, e, ui);
        }
    }

    private _takeMeasurements() {
        let options = this._options;

        let currentMeasurements: IMeasurements;
        if (options.sharedMeasurements) {
            currentMeasurements = measurements;
        }

        if (!currentMeasurements) {
            currentMeasurements = {};
            let cssClass = options.coreCssClass;

            let enhancementCssClass = this._getEnhancementOption("cssClass");
            if (enhancementCssClass) {
                cssClass += " " + enhancementCssClass;
            }

            let measurementContainer = $(domElem("div", cssClass)).appendTo(document.body)
                .css("position", "absolute")
                .css("left", -5000).css("top", -5000)
                .width(1000).height(500);

            let rowCss = "grid-row grid-row-normal" + (options.useLegacyStyle ? " grid-row-legacy" : "");
            let row = $(domElem("div", rowCss)).appendTo(measurementContainer);
            let cell = $(domElem("div", "grid-cell")).width(100).appendTo(row).text("1");

            currentMeasurements.rowHeight = row.outerHeight();
            currentMeasurements.cellOffset = cell.outerWidth() - 100;

            let textUnit = $(domElem("div")).appendTo(cell)
                .css("overflow", "hidden")
                .css("width", "1em")
                .css("height", "1ex");

            currentMeasurements.unitEx = textUnit.outerHeight();

            let gutter = $(domElem("div", "grid-gutter"));
            gutter.append(domElem("div", "grid-gutter-row grid-gutter-row-selected"));
            gutter.appendTo(measurementContainer);

            currentMeasurements.gutterWidth = gutter[0].clientWidth;
            measurementContainer.remove();

            if (options.sharedMeasurements) {
                measurements = currentMeasurements;
            }
        }

        this._unitEx = currentMeasurements.unitEx;
        this._rowHeight = currentMeasurements.rowHeight;
        this._cellOffset = currentMeasurements.cellOffset;
        this._gutterWidth = this._gutter ? currentMeasurements.gutterWidth : 0;
    }

    /**
     *     Ensures that the selected index is correctly set. That is, it will be a noop if the index doesnt change
     *     and will handle indexes that are out of bounds.
     * 
     * @param index OPTIONAL: The index to select
     */
    private _ensureSelectedIndex(index?: number) {

        var oldSelectedIndex = this._selectedIndex;

        if (typeof index === "number") { // If an index was passed then set it as the selected
            this._selectedIndex = index;
        }

        if (this._selectedIndex >= 0) { // If there is a selected index then do something
            if (this._count <= this._selectedIndex) { // If the selected index is greater than the number of visible rows then set it to the last row
                this._selectedIndex = this._count - 1;
            }

            if (this._selectedIndex !== oldSelectedIndex) { // If the selected index changed then trigger selection changed
                this._addSelection(this._selectedIndex);
            }
        }
    }

    public _determineIndentIndex() {
        var _columns = this._columns, i, l;
        for (i = 0, l = _columns.length; i < l; i++) {
            if (_columns[i].indent) {
                this._indentIndex = i;
                return;
            }
        }
        this._indentIndex = 0;
    }

    private _updateRanges() {
        var i = 0, first = 0, l = this._count, newRanges = [], count = 0, state;

        if (this._expandStates) {
            while (i < l) {
                state = this._expandStates[i];

                if (state < 0) {
                    newRanges[newRanges.length] = [first, i];
                    count += (i - first) + 1;
                    i += 1 - state;
                    first = i;
                }
                else {
                    i++;
                }
            }

            if (first < l) {
                newRanges[newRanges.length] = [first, l - 1];
                count += (l - first);
            }
        }
        else {
            count = l;
            newRanges[newRanges.length] = [0, count];
        }

        this._expandedCount = count;
        this._visibleRange = newRanges;
    }

    private _updateExpansionStates(expand: boolean, level: number): boolean {
        var result = false;
        if (this._expandStates) {

            var states = this._expandStates;
            var state: number;
            var childCount: number;
            var rows = this._rows;
            var currentLevel = 0;
            var levels: number[] = [];

            var markRow = (st: number, i: number) => {
                states[i] = -st;
                result = true;
                var r = rows[i];
                if (r) {
                    r.dirty = true;
                }
            };

            var ind = 0;
            var len = this._count;

            while (ind < len) {
                // Get the state of the row
                state = states[ind];
                if (currentLevel < level) {
                    // Perform expand/collapse for higher level rows
                    if ((state < 0 && expand === true) || (state > 0 && expand === false)) {
                        markRow(state, ind);
                    }
                } else if (currentLevel === level) {
                    // Perform opposite of specified expand/collapse for the target level rows
                    if ((state > 0 && expand === true) || (state < 0 && expand === false)) {
                        markRow(state, ind);
                    }
                }

                var cl = currentLevel;
                // Since we advanced to next row, we need to decrease 1 from previous levels
                for (var i = 0; i < cl; i++) {
                    levels[i] -= 1;
                    if (levels[i] === 0) {
                        // End of current level, decrease current level
                        currentLevel -= 1;
                    }
                }

                // Get the child count of current row
                childCount = Math.abs(state);
                if (childCount > 0) {
                    // Store child count
                    levels[currentLevel] = childCount;
                    // Increase level
                    currentLevel += 1;
                }

                ind++;
            }

            if (result) {
                this._updateRanges();
            }
        }

        return result;
    }

    private _updateExpansionStateAndRedraw(expand: boolean, level: number): void {
        Diag.Debug.assertParamIsBool(expand, "expand");
        Diag.Debug.assertParamIsNumber(level, "level");

        var dataIndex: number;
        var oldSelectedIndex = this._selectedIndex;

        if (oldSelectedIndex >= 0) {
            dataIndex = this._getDataIndex(oldSelectedIndex);
        }

        this._updateExpansionStates(expand, level);

        if (oldSelectedIndex >= 0) {
            this._clearSelection();
            this._addSelection(Math.abs(this._getRowIndex(dataIndex)));
        }

        this._layoutContentSpacer();
        this._redraw();
    }

    /**
     * @param includeNonDirtyRows 
     */
    public _updateViewport(includeNonDirtyRows?: boolean) {
        let options = this._options;
        let above = [], below = [], visible = [];
        let visibleIndices = this._getVisibleRowIndices();
        let maxIndex = this._expandedCount - 1;
        let states = this._expandStates || [];
        let resultCount = this._count;
        let firstIndex = visibleIndices.first;
        let lastIndex = visibleIndices.last;

        // Expand viewport by 3 rows for smooth scrolling
        firstIndex = Math.max(0, firstIndex - options.extendViewportBy);
        lastIndex = Math.min(maxIndex, lastIndex + options.extendViewportBy);

        // Make sure we are using all of our payload size
        let cachingStart = Math.max(0, firstIndex - options.payloadSize);
        let cachingEnd = Math.min(maxIndex, lastIndex + options.payloadSize);

        let dataIndex = this._getDataIndex(cachingStart);
        let lastVisible = firstIndex;

        const canvas = this._canvas[0];
        if (canvas && canvas.scrollLeft !== this._scrollLeft) {
            canvas.scrollLeft = this._scrollLeft;
        }

        for (let i = cachingStart; i <= cachingEnd && dataIndex < resultCount; i++) {
            if (i < firstIndex) {
                above[above.length] = [i, dataIndex];
            }
            else if (i > lastIndex) {
                below[below.length] = [i, dataIndex];
            }
            else {
                visible[visible.length] = [i, dataIndex];
                lastVisible = i;
            }

            let nodeState = states[dataIndex]; //nodeState might be undefined
            if (nodeState < 0) {
                dataIndex += (1 - nodeState);
            }
            else {
                dataIndex++;
            }
        }

        this.cacheRows(above, visible, below);
        this._drawRows(visible, includeNonDirtyRows);
    }

    private _setContextMenuColumn() {
        let contextMenu = this._options.contextMenu;
        if (contextMenu) {
            if (this._automaticContextMenuColumn) {
                contextMenu.columnIndex = undefined;
                const shownColumns = this._columns.filter(c => !c.hidden);
                shownColumns.forEach(c => {
                    if ((contextMenu.columnIndex === undefined) && (c.width > 120)) {
                        contextMenu.columnIndex = c.index;
                    }
                });
                if (typeof contextMenu.columnIndex === "undefined" && shownColumns.length > 0) {
                    contextMenu.columnIndex = shownColumns[shownColumns.length - 1].index;
                }
            }

            // Ensure 32px width minimum.
            let ctxMenuCol = this._columns.filter(c => contextMenu.columnIndex === c.index);
            if (ctxMenuCol.length === 1) {
                ctxMenuCol[0].width = Math.max(32, ctxMenuCol[0].width);
            }
        }
    }

    public _cleanUpRows() {
        var rows = this._rows, dataIndex, hasGutter = this._gutter;

        for (dataIndex in rows) {
            if (rows.hasOwnProperty(dataIndex)) {
                let row = rows[dataIndex];
                row.row.remove();
                if (hasGutter) {
                    row.gutterRow.remove();
                }
            }
        }

        this._rows = {};
    }

    private _getGutterIconClass(rowIndex, dataIndex, expandedState, level) {
        return "";
    }

    private _drawGutterCell(rowInfo, rowIndex, dataIndex, expandedState, level) {
    }

    public _drawHeader() {
        const columns = this._columns;
        const sortOrder = this._sortOrder;

        if (this._header) {
            const fragment = document.createDocumentFragment();

            for (let i = 0, l = columns.length; i < l; i++) {
                const column = columns[i];
                if (column.hidden) {
                    continue;
                }

                const cellDom = <HTMLElementWithData>domElem("div", "grid-header-column");
                cellDom.setAttribute("role", "columnheader");

                // Creating header cell which corresponds to this column
                const columnTooltip = column.tooltip || column.text;
                const cell = $(cellDom);

                if (column.canSortBy && !column.fixed) {
                    cell.addClass("sortable");
                }
                if (column.headerContainerCss) {
                    cell.addClass(column.headerContainerCss);
                }

                cellDom.setAttribute("aria-label", columnTooltip);
                cellDom.setAttribute("tabindex", "-1");
                this._bind(cellDom, "keydown", (e) => {
                    if (e.key === " " || e.key === "Spacebar" || e.key === "Enter") {
                        this._onHeaderClick(e);
                    }
                });

                // Adjusting the width of the column
                cellDom.style.width = (column.width || 20) + "px";
                cellDom._data = { columnIndex: i, header: true }; //jQuery.data accesses  which is slow on IE

                // Creating the separator element for column resize
                const sepDom = <HTMLElementWithData>domElem("div", "separator");
                if (column.fixed) {
                    // Don't show resize cursor for fixed size columns
                    sepDom.style.cursor = "auto";
                }
                const separator = $(sepDom);
                sepDom._data = { columnIndex: i, separator: true }; //jQuery.data accesses DOM which is slow on IE
                cellDom.appendChild(sepDom);
                // Add an element for cell's value
                const cellValue = column.getHeaderCellContents.apply(this, [column]) as JQuery || $(domElem("div"));

                if (column.headerCss) {
                    cellValue.addClass(column.headerCss);
                }

                // Creating the sort element for enabling the sort operation when it's clicked
                const sortDom = domElem("div", "sort-handle");

                for (let j = 0, sortOrderLength = sortOrder.length; j < sortOrderLength; j++) {
                    const sortOrderEntry = sortOrder[j];

                    if (sortOrderEntry.index === column.index) {
                        if (sortOrderEntry.order === "asc") {
                            // Sorted asc
                            cell.addClass("ascending").attr("aria-sort", "ascending");
                            if (this._options.useLegacyStyle) {
                                $(sortDom).removeClass("bowtie-icon bowtie-triangle-down");
                                $(sortDom).addClass("bowtie-icon bowtie-triangle-up");
                            } else {
                                const arrowIcon = domElem("i", "bowtie-icon right bowtie-sort-ascending");
                                cellValue[0].appendChild(arrowIcon);
                            }
                        }
                        else if (sortOrderEntry.order === "desc") {
                            // Sorted desc
                            cell.addClass("descending").attr("aria-sort", "descending");
                            if (this._options.useLegacyStyle) {
                                $(sortDom).removeClass("bowtie-icon bowtie-triangle-up");
                                $(sortDom).addClass("bowtie-icon bowtie-triangle-down");
                            } else {
                                const arrowIcon = domElem("i", "bowtie-icon right bowtie-sort-descending");
                                cellValue[0].appendChild(arrowIcon);
                            }
                        }

                        break;
                    }
                }

                cellDom.appendChild(cellValue[0]);
                cellDom.appendChild(sortDom);

                fragment.appendChild(cellDom);
            }

            this._headerCanvas.empty();
            this._columnMovingElement = null;
            this._headerCanvas[0].appendChild(fragment);

            Utils_UI.makeElementUnselectable(this._header[0]);
        }
    }

    private _fixColumnsWidth(width: number): number {
        // TODO: Magic number 2 here means 1px left border + 1px right border. Come up with a
        // better solution for this. We might set the box model to content-box but borders don't
        // fit very well in this case. If we don't apply this hack, cells don't fit in the row
        // and last cell breaks into next line.
        return width + 2;
    }

    public _layoutContentSpacer() {
        var width = 0, height, i, l, columns = this._columns, scrollTop, scrollLeft;

        for (i = 0, l = columns.length; i < l; i++) {
            if (columns[i].hidden) {
                continue;
            }
            width += (columns[i].width || 20) + this._cellOffset;
        }

        width = this._fixColumnsWidth(width);
        height = Math.max(1, this._expandedCount * this._rowHeight); // we need horizontal scroll bar even if there is no result

        this._contentSpacer.width(width);
        this._contentSpacer.height(height);

        if (this._gutter) {
            this._gutter.height(height);
        }

        this._measureCanvasSize();

        this._ignoreScroll = true;
        try {
            // Chrome uses floating points for height so ceil makes it consistent with the other
            // browsers. Max and min are used to get a consistent scroll value within range.
            scrollTop = Math.ceil(Math.max(0, Math.min(this._scrollTop, this._canvas[0].scrollHeight - this._canvas[0].clientHeight)));

            if (scrollTop !== this._scrollTop) {
                this._scrollTop = scrollTop;
                this._canvas[0].scrollTop = scrollTop;
            }

            scrollLeft = Math.max(0, Math.min(this._scrollLeft, width - this._canvasWidth));

            if (scrollLeft !== this._scrollLeft) {
                this._scrollLeft = scrollLeft;
                this._canvas[0].scrollLeft = scrollLeft;
            }
        } finally {
            this._ignoreScroll = false;
        }

        this._contentSize.width = width;
        this._contentSize.height = height;
    }

    public _fixScrollPos() {
        var oldIgnoreScroll = this._ignoreScroll;
        this._ignoreScroll = true;
        try {
            this._canvas[0].scrollLeft = this._scrollLeft;
            this._canvas[0].scrollTop = this._scrollTop;
        }
        finally {
            this._ignoreScroll = oldIgnoreScroll;
        }
    }

    /**
     * @param includeNonDirtyRows 
     */
    public _redraw(includeNonDirtyRows?: boolean) {
        this._layoutHeader();
        this._updateViewport(includeNonDirtyRows);
    }

    public selectAll() {
        if (this._count > 0 && this._options.allowMultiSelect !== false) {

            this._addSelection(0);

            // Clearing the selection first
            this._clearSelection();
            this._selectionStart = 0;

            // Saving the selected rowIndex
            var prevIndex = Math.max(0, this._selectedIndex);
            this._addSelectionRange(this._expandedCount - 1, undefined, { doNotFireEvent: true });

            // Restoring the selected rowIndex
            this._selectedIndex = prevIndex;

            this._updateSelectionStyles();
            this._selectionChanged();
        }
    }

    /**
     * Clear the selected rows & selection count, but maintain the selected index.
     */
    public _clearSelection() {
        this._selectionCount = 0;
        this._selectedRows = null;
    }

    /**
     * Highlights the row at the specified rowIndex
     * 
     * @param rowIndex Index of the row in the visible source (taking the expand/collapse states into account)
     * @param dataIndex Index of the row in the overall source
     * @param options Specifies options such as:
     *     - keepSelectionStart: Keepd the rowIndex as the basis for range selection
     *     - doNotFireEvent: Prevents firing events
     *     - toggle: Toggles the row in the selection
     */
    public _addSelection(rowIndex: number, dataIndex?: number, options?: any) {

        var add,
            keepSelectionStart = options && options.keepSelectionStart,
            doNotFireEvent = options && options.doNotFireEvent,
            toggle = options && options.toggle;

        if (this._options.allowMultiSelect === false) {
            keepSelectionStart = false;
            this._clearSelection();
        }

        if (!this._selectedRows) {
            this._selectedRows = {};
        }

        if (rowIndex >= 0) {
            add = true;

            if (!((rowIndex + "") in this._selectedRows)) {
                // If not selected before increasing selection count
                this._selectionCount++;
            }
            else if (toggle) {
                // If the row already exists in the selection and toggle is enabled
                // removing it from the selection
                add = false;
                this._selectionCount = Math.max(0, this._selectionCount - 1);
                delete this._selectedRows[rowIndex];
            }

            if (typeof (dataIndex) !== "number") {
                // If the dataIndex is not specified, finding it by using visible rowIndex
                dataIndex = this._getDataIndex(rowIndex);
            }

            if (add) {
                this._selectedRows[rowIndex] = dataIndex;
            }

            this._selectedIndex = rowIndex;
            this._updateActiveDescendant();

            if (this._selectionStart < 0 || !keepSelectionStart) {
                this._selectionStart = rowIndex;
            }
        }
        else {
            dataIndex = -1;
            this._selectedIndex = -1;
            this._focusedElement = null;
            this._focusStateData.currentActionIndex = -1;
        }

        if (!doNotFireEvent) {
            this._updateSelectionStyles();
            this._selectionChanged();
            this._selectedIndexChanged(this._selectedIndex, dataIndex);

            this._updateRowActionList(dataIndex);

            if (this._focusStateData.rowActionList[dataIndex] && this._focusStateData.rowActionList[dataIndex][this._focusStateData.currentActionIndex]) {
                this._setFocusedGridElement(this._focusStateData.rowActionList[dataIndex][this._focusStateData.currentActionIndex]);
            }
            else {
                // Can't find the actionable cell - select the row if focus is somewhere within the grid.
                this._focusStateData.currentActionIndex = -1;
                const element = this.getElement()[0];
                if (element && element.contains(document.activeElement)) {
                    this._setFocusedGridElement(this.getFocusElement()[0]);
                }
            }
        }
    }

    private _updateRowActionList(dataIndex: number) {
        // Nothing in the grid should be tabbable - use arrow keys to navigate actionable items.
        // But we need to remember each row's actionable items so they can be accessed w/ arrow keys.
        const rowElem = this._rows[dataIndex] && this._rows[dataIndex].row;
        if (rowElem) {
            const $row = $(rowElem);
            this._focusStateData.rowActionList[dataIndex] = [];

            $row.find(".grid-cell").each((i, cellElem) => {
                const $cell = $(cellElem);
                let contextMenuElem: HTMLElement = null;
                $cell.find(":focusable:visible,[data-tabbable=1]:visible").each((i, tabbableElem) => {
                    const $tabbable = $(tabbableElem);
                    $tabbable.attr("tabindex", "-1");

                    // The context menu is floated to the right, so we want to save it
                    // to add as the last item for this cell.
                    if ($tabbable.hasClass("grid-context-menu")) {
                        contextMenuElem = tabbableElem as HTMLElement;
                    }
                    else {
                        this._focusStateData.rowActionList[dataIndex].push(tabbableElem as HTMLElement);
                    }
                });
                if (contextMenuElem) {
                    this._focusStateData.rowActionList[dataIndex].push(contextMenuElem);
                }
            });
        }
    }

    private _setFocusedGridElement(elem: HTMLElement) {
        elem.setAttribute("tabindex", "0");
        elem.focus();
        if (this._focusedElement && this._focusedElement !== elem) {
            this._focusedElement.setAttribute("tabindex", "-1");
        }
        this._focusedElement = elem;
    }

    /**
     * Highlights the rows beginning from the selection start until the row at the specified rowIndex
     * 
     * @param rowIndex Index of the row in the visible source (taking the expand/collapse states into account)
     * @param dataIndex Index of the row in the overall source
     */
    private _addSelectionRange(rowIndex: number, dataIndex?: number, options?) {

        var start,
            end,
            i,
            nodeState,
            doNotFireEvent = options && options.doNotFireEvent,
            prevSelectedDataIndex = -1,
            selectedDataIndex;

        if (this._options.allowMultiSelect === false) {
            this._addSelection(rowIndex, dataIndex);
        }
        else {
            if (this._selectedRows) {
                prevSelectedDataIndex = this._selectedRows[this._selectedIndex];
            }

            if (this._selectionStart < 0) {
                this._selectionStart = rowIndex;
            }

            start = Math.min(this._selectionStart, rowIndex);
            end = Math.max(this._selectionStart, rowIndex);

            if (typeof (dataIndex) !== "number" || start !== rowIndex) {
                // If the dataIndex is not specified or rowIndex is different than start,
                // finding it by using visible rowIndex
                dataIndex = this._getDataIndex(start);
            }

            for (i = start; i <= end; i++) {
                this._addSelection(i, dataIndex, { keepSelectionStart: true, doNotFireEvent: true });
                if (i === rowIndex) {
                    selectedDataIndex = dataIndex;
                }
                nodeState = this._getExpandState(dataIndex);
                if (nodeState < 0) {
                    dataIndex += (1 - nodeState);
                }
                else {
                    dataIndex++;
                }
            }

            // Setting selected index to index of last selected row
            this._selectedIndex = rowIndex;
            this._updateActiveDescendant();

            if (!doNotFireEvent) {
                this._updateSelectionStyles();
                this._selectionChanged();

                if (prevSelectedDataIndex !== selectedDataIndex) {
                    this._selectedIndexChanged(this._selectedIndex, selectedDataIndex);
                }
            }
        }
    }

    /**
     * This is especially necessary for screen readers to read each
     * row when the selection changes. 
     */
    private _updateActiveDescendant() {
        const ariaElement = this.getElement();
        // Updating only if the grid is active
        if (this._active) {
            var dataIndex = this._getDataIndex(this._selectedIndex);
            if (dataIndex >= 0) {
                // Getting row info using data index
                var rowInfo = this.getRowInfo(dataIndex);
                if (rowInfo && rowInfo.row) {
                    var id = rowInfo.row.attr("id");
                    if (id !== this._activeAriaId) {
                        // Setting active element attribute
                        ariaElement.attr("aria-activedescendant", id);
                        this._activeAriaId = id;
                    }
                }
            }
        }
    }

    private _updateAriaProperties() {
        const ariaElement = this.getElement();
        const mode = this._getMode();

        ariaElement.attr({ role: this._getRole("canvas") });

        if (this._getMode() !== "list") {
            if (this._columns) {
                let colcount = 0;
                for (const col of this._columns) {
                    if (!col.hidden) {
                        colcount++;
                    }
                }
                ariaElement.attr("aria-colcount", String(colcount));
            }
            ariaElement.attr("aria-rowcount", this._expandedCount + (this._options.header ? 1 : 0));
        }
        else {
            ariaElement.removeAttr("aria-colcount");
            ariaElement.removeAttr("aria-rowcount");
        }
    }

    private _updateSelectionStyles() {
        for (const dataIndex in this._rows) {
            if (this._rows.hasOwnProperty(dataIndex)) {
                this._updateRowSelectionStyle(this._rows[dataIndex], this._selectedRows, this._selectedIndex);
            }
        }
    }

    private _selectionChanged() {
        this.selectionChanged(this._selectedIndex, this._selectionCount, this._selectedRows);

        this._fire("selectionchanged", { selectedIndex: this._selectedIndex, selectedCount: this._selectionCount, selectedRows: this._selectedRows });
    }

    private _selectedIndexChanged(selectedRowIndex, selectedDataIndex) {
        this.selectedIndexChanged(selectedRowIndex, selectedDataIndex);

        this._fire(GridO.EVENT_SELECTED_INDEX_CHANGED, [selectedRowIndex, selectedDataIndex]);
    }

    public _showContextMenu(eventArgs) {
        var item,
            rowInfo: IGridRowInfo = eventArgs ? eventArgs.rowInfo : null,
            pinElement: JQuery,
            pinAndFocusElement,
            focusElement: JQuery,
            menuOptions;

        this._showingContextMenu = true;

        menuOptions = $.extend({}, this._options.contextMenu);

        if (!menuOptions) {
            return;
        }

        if (rowInfo) {
            item = this._dataSource[rowInfo.dataIndex];

            if (item.noContextMenu) {
                return;
            }

            let menuActiveCss = eventArgs.contextMenu ? "context-menu-active context-menu-clicked" : "context-menu-active";
            menuOptions = $.extend({
                onActivate: function () {
                    rowInfo.row.addClass(menuActiveCss);
                },
                onDeactivate: function () {
                    rowInfo.row.removeClass(menuActiveCss);
                },
                onPopupEscaped: function () {
                    rowInfo.row.removeClass(menuActiveCss);
                }
            }, menuOptions, {
                    contextInfo: {
                        rowInfo: rowInfo,
                        item: item
                    },
                    onHide: (() => {
                        // When the context menu is dismissed, fire a blur
                        // event to the canvas. Since the context menu has focus, the
                        // grid would never receive the blur.
                        // Because the context menu doesn't close until some time
                        // (Menus.BLUR_CLOSE_TIMEOUT) after the blur, don't blur if
                        // we were recently focused, because that is probably what
                        // caused the context menu to lose focus and close.
                        if (Date.now() - this._lastFocusTime > Menus.BLUR_CLOSE_TIMEOUT + 10) {
                            this._showingContextMenu = false;
                            this._fire(this._canvas, "blur");
                        }
                    }).bind(this)
                });

            if (!item.root) {
                if (menuOptions.items) {
                    if ($.isFunction(menuOptions.items)) {
                        menuOptions.items = menuOptions.items.call(this, menuOptions.contextInfo);
                    }
                    else {
                        menuOptions.items = menuOptions.items.slice(0); //create a clone
                    }
                }
                else {
                    menuOptions.items = [];
                }

                if (this._popupMenu) {
                    this._popupMenu.dispose();
                    this._popupMenu = null;
                }

                pinAndFocusElement = this.getPinAndFocusElementForContextMenu(eventArgs);

                // For bowtie grids, always align right-click menus to the left-bottom of the mouse cursor, just like any other typical context menu.
                if (pinAndFocusElement.isRightClick) {
                    menuOptions = $.extend(menuOptions, { align: "left-bottom" });
                }

                this._popupMenu = this._createContextMenu(rowInfo, menuOptions);

                if (this._popupMenu && pinAndFocusElement) {
                    pinElement = pinAndFocusElement.pinElement;
                    focusElement = pinAndFocusElement.focusElement[0];
                    // Displaying the popup
                    // Grid set tries to set focus on container mouse down event with a timeout
                    // This behavior causes our popup menu item to close immediately since it loses focus.
                    // Lets popup our menu in another epoch
                    Utils_Core.delay(this, 10, function () {
                        // If we suppress loading at the start, then refresh the contributed items
                        if (menuOptions.suppressInitContributions) {
                            this._popupMenu.refreshContributedItems();
                        }
                        this._popupMenu.popup(focusElement, pinElement);
                    });
                }
            }
        }
    }

    public getPinAndFocusElementForContextMenu(eventArgs): { pinElement: JQuery; focusElement: JQuery; } {
        var $contextMenuPin: JQuery = eventArgs.contextMenu;
        var isRightClick: boolean = false;

        if (this._contextMenuKeyPressedState !== ContextMenuKeyPressedState.Handling && !$contextMenuPin && !this._options.useLegacyStyle) {
            var e: JQueryEventObject = eventArgs.event;

            // With bowtie styling, show the context menu at the location of the cursor on mouse right-click only if it is over a grid row.
            // Otherwise, show the context menu in the selected row's gutter (for example, if the user right-clicks in the empty grid area below all rows).
            if (e && e.pageX && e.pageY && e.target) {
                if ($(e.target).closest(".grid-row").length > 0 || $(e.target).closest(".grid-gutter-row").length > 0) {
                    if (!this._$popupMenuPinTarget) {
                        this._$popupMenuPinTarget = $(domElem("div", "grid-context-menu-popup-pin")).appendTo(document.body);
                    }
                    this._$popupMenuPinTarget.css({
                        top: e.pageY,
                        left: e.pageX
                    });
                    $contextMenuPin = this._$popupMenuPinTarget;
                    isRightClick = true;
                }
            }
        }

        return <any>{
            pinElement: $contextMenuPin || eventArgs.rowInfo.gutterRow || eventArgs.rowInfo.row || this._canvas,
            focusElement: this._focusedElement ? $(this._focusedElement) : this._canvas,
            isRightClick: isRightClick
        };
    }

    /**
     * @param e 
     * @return 
     */
    public _onContainerMouseDown(e?: JQueryEventObject): any {
        // L2 tests use PhantomJS which is old and uses webkitMatchesSelector
        if (!(e.target.matches || e.target.msMatchesSelector || e.target.webkitMatchesSelector).call(e.target, ".menu *")) {
            this.focus(10);
        }
    }

    public _measureCanvasSize() {
        const canvas = this._canvas[0];
        const canvasRect = canvas.getBoundingClientRect();

        // Cache the values for next time
        this._previousCanvasHeight = this._canvasHeight;
        this._previousCanvasWidth = this._canvasWidth;

        // clientHeight/Width round the value. We need the exact value (with decimals) for an accurate measurement
        // Set the exact width value (with decimals), but take into account the difference between offset and client values
        this._canvasHeight = canvasRect.height - (canvas.offsetHeight - canvas.clientHeight);
        this._canvasWidth = canvasRect.width - (canvas.offsetWidth - canvas.clientWidth);
    }

    private _setupDragEvents() {
        this._bind(window.document, "mousemove", delegate(this, this._onDocumentMouseMove), true);
        this._bind(window.document, "mouseup", delegate(this, this._onDocumentMouseUp), true);
    }

    private _clearDragEvents() {
        this._unbind(window.document, "mousemove", null, true);
        this._unbind(window.document, "mouseup", null, true);
    }

    /**
     * @param e 
     * @return 
     */
    private _onDocumentMouseMove(e?: JQueryEventObject): any {

        var delta, column, newWidth,
            columnSizing = this._columnSizing,
            columnMoving = this._columnMoving;

        // Checking whether column sizing has started or not
        if (columnSizing && columnSizing.active === true) {
            delta = e.pageX - columnSizing.origin;
            newWidth = Math.max(this._cellMinWidth, columnSizing.originalWidth + delta);
            column = this._columns[columnSizing.index];
            column.width = newWidth;

            this._applyColumnSizing(columnSizing.index);
            this._moveSizingElement(columnSizing.index);
        }

        if (columnMoving && columnMoving.state > 0) {
            delta = e.pageX - columnMoving.origin;
            if (delta !== 0) {
                columnMoving.state = 2;
                this._moveColumnMovingElement(columnMoving.index, columnMoving.left + delta);
            }
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onDocumentMouseUp(e?: JQueryEventObject): any {

        Utils_Core.delay(this, 0, function () {
            this._tryFinishColumnSizing(false);
            this._tryFinishColumnMoving(false);
            this._clearDragEvents();
        });

        return false;
    }

    /**
     * @param e 
     * @return 
     */
    private _onHeaderMouseDown(e?: JQueryEventObject): any {

        var columnIndex, column, left, i, separator, headerColumn;

        // We should support header operations only for left mouse button
        if (e.which !== 1) {
            return;
        }
        separator = $(e.target).closest(".separator");

        if (separator.length > 0) {
            columnIndex = separator[0]._data.columnIndex;
            column = this._columns[columnIndex];
            if (!column.fixed) {
                this._columnSizing = { active: true, index: columnIndex, originalWidth: column.width, origin: e.pageX };
                this._moveSizingElement(columnIndex);

                this._setupDragEvents();
                return false;
            }
        }
        else {
            headerColumn = $(e.target).closest(".grid-header-column");

            if (headerColumn.length > 0) {
                columnIndex = headerColumn[0]._data.columnIndex;
                column = this._columns[columnIndex];
                if (this._options.allowMoveColumns && !column.fixed && column.canMove) {
                    headerColumn.addClass("moving");
                    this._columnMoving = { state: 1, index: columnIndex, width: column.width, origin: e.pageX, colHeaderElement: headerColumn };
                    left = 0;
                    i = 0;
                    while (i < columnIndex) {
                        column = this._columns[i++];
                        if (!column.hidden) {
                            left += column.width;
                        }
                    }

                    this._columnMoving.left = left;

                    this._setupDragEvents();
                    return false;
                }
            }
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onHeaderMouseUp(e?: JQueryEventObject): any {

        return;
    }

    /**
     * @param e 
     * @return 
     */
    public _onHeaderClick(e?: JQueryEventObject): any {

        var columnIndex, column, headerColumn, separator;

        headerColumn = $(e.target).closest(".grid-header-column");

        if (headerColumn.length > 0) {
            if (!this._columnSizing) {

                separator = $(e.target).closest(".separator");

                if (separator.length > 0) {
                    return false;
                }
                else {
                    columnIndex = headerColumn[0]._data.columnIndex;
                    column = this._columns[columnIndex];

                    if (column.onHeaderClick) {
                        column.onHeaderClick(column);
                    }
                    else if (column.canSortBy && !column.fixed) {
                        this._sortBy(column, e.shiftKey);
                        const setFocusDelegate = () => {
                            this._setFocusedGridElement(this._headerCanvas[0].children[columnIndex] as HTMLElement);
                            Utils_UI.getFocusRing().style.removeProperty("visibility");
                        };
                        if (this._options.asyncInit) {
                            // Delay execute as _sortBy will trigger relayout in Delay 0 if asyncInit
                            Utils_Core.delay(this, 1, setFocusDelegate)
                        }
                        else {
                            setFocusDelegate();
                        }
                        e.preventDefault();
                        e.stopImmediatePropagation();
                    }
                }
            }
        }
    }

    /**
     * @param e 
     * @return 
     */
    public _onHeaderDblClick(e?: JQueryEventObject): any {

        // Determining whether the element is a separator
        var separator, columnIndex, column,
            maxLength, ratio, originalWidth;

        separator = $(e.target).closest(".separator");

        if (separator.length > 0) {

            // Cancel any pending sizing/moving events triggered by the double-clicks first mouse click
            this._tryFinishColumnSizing(true);
            this._tryFinishColumnMoving(true);

            columnIndex = separator[0]._data.columnIndex;
            column = this._columns[columnIndex];

            if (!column.fixed) {
                maxLength = Math.max(column.maxLength || 0, 3);
                ratio = 1.1 + 0.7 * Math.exp(-maxLength / 20);
                originalWidth = column.width;
                column.width = (column.indentOffset || 0) + Math.round(maxLength * ratio * this._unitEx);
                this._applyColumnSizing(columnIndex, originalWidth, true);
            }

            return false;
        }
    }

    protected _onHeaderKeyDown(e?: JQueryEventObject): void {
        const $target = $(e.target);

        if (e.altKey) {
            return;
        }

        if (e.shiftKey) {
            // resize column
            const $column = $(e.target).closest(".grid-header-column");

            if ($column.length > 0) {
                const columnIndex = ($column[0] as any)._data.columnIndex as number;
                const column = this._columns[columnIndex];
                if (!column.fixed) {
                    let newWidth = column.width;
                    if (e.keyCode === Utils_UI.KeyCode.RIGHT) {
                        e.preventDefault();
                        e.stopPropagation();
                        newWidth = column.width + ColumnSizeAdjustDelta;
                    }
                    else if (e.keyCode === Utils_UI.KeyCode.LEFT) {
                        e.preventDefault();
                        e.stopPropagation();
                        newWidth = Math.max(this._cellMinWidth, column.width - ColumnSizeAdjustDelta);
                    }

                    if (newWidth !== column.width) {
                        column.width = newWidth;
                        this._applyColumnSizing(columnIndex, -1, true);

                        // resizing triggers a redraw, restore focus
                        this._setFocusedGridElement(this._headerCanvas[0].children[columnIndex] as HTMLElement);
                    }

                }
            }
        }
        else {
            switch (e.keyCode) {
                case Utils_UI.KeyCode.DOWN:
                    e.preventDefault();
                    if (this._count > 0) {
                        this._selectRow(0);
                    }
                    this._setFocusedGridElement(this.getFocusElement()[0]);
                    break;

                case Utils_UI.KeyCode.RIGHT:
                    e.preventDefault();
                    const $next = this._getNextHeaderElement($target);
                    if ($next.length > 0) {
                        this._setFocusedGridElement($next[0]);
                    }
                    break;

                case Utils_UI.KeyCode.LEFT:
                    e.preventDefault();
                    const $prev = this._getPreviousHeaderElement($target);
                    if ($prev.length > 0) {
                        this._setFocusedGridElement($prev[0]);
                    }
                    break;
            }
        }
    }

    protected _onHeaderScroll(e?: JQueryEventObject): void {
        if (e.target.scrollLeft !== this._scrollLeft) {
            this._scrollLeft = e.target.scrollLeft;
            this._redraw();
        }
    }

    protected _getNextHeaderElement($target: JQuery): JQuery {
        return $target.nextAll(".grid-header-column").eq(0);
    }

    protected _getPreviousHeaderElement($target: JQuery): JQuery {
        return $target.prevAll(".grid-header-column").eq(0);
    }

    private _moveSizingElement(columnIndex) {
        var canvas = this._canvas,
            canvasDom = canvas[0],
            sizingElement = this._sizingElement,
            column, i = 0, left = this._gutterWidth;

        if (!sizingElement) {
            // If there is no sizing element around, creating one
            if (columnIndex < 0) {
                return;
            }

            sizingElement = $(domElem("div", "grid-column-sizing")).appendTo(canvas);
            this._sizingElement = sizingElement;
        }

        sizingElement.height(canvasDom.clientHeight - 1);
        sizingElement.css("top", this._scrollTop);

        if (columnIndex < 0) {
            sizingElement.css("left", -5000).css("top", -5000).height(0);
        }
        else {
            while (i <= columnIndex) {
                column = this._columns[i++];
                if (!column.hidden) {
                    left += column.width;
                }
            }

            sizingElement.css("left", left - 1);
        }
    }

    /**
     *     Given a column index will provide the visible index of this column. That is, it will take in to consideration any
     *     hidden columns and omit them from the index count.
     * 
     * @param columnIndex The 0-based global column index
     * @return The 0-based visible column index
     */
    private _getVisibleColumnIndex(columnIndex: number): number {
        Diag.Debug.assertParamIsNumber(columnIndex, "columnIndex");

        var columnCounter = 0,
            visibleColumnIndex = 0,
            length = this._columns.length;

        Diag.Debug.assert(columnIndex < length, "Index out of array bounds");

        if (this._columns[columnIndex].hidden) {
            return -1; // If the column is hidden then it has no visible index
        }

        while (columnCounter < columnIndex) {
            if (!this._columns[columnCounter].hidden) {
                visibleColumnIndex++;
            }
            columnCounter++;
        }

        return visibleColumnIndex;
    }

    /**
     * @param columnIndex 
     * @param initialWidth 
     * @param finish 
     */
    public _applyColumnSizing(columnIndex: number, initialWidth?: number, finish?: boolean) {

        var domColumnIndex = this._getVisibleColumnIndex(columnIndex) + 1, // Add 1 because DOM nth-child selector use 1-based (not 0-based) indices
            column = this._columns[columnIndex],
            columnSizeChanged = false;

        initialWidth = initialWidth || -1;

        if (column) {
            columnSizeChanged = column.width !== initialWidth;

            $(".grid-header-column:nth-child(" + domColumnIndex + ")", this._headerCanvas).width(column.width);
        }

        if (finish === true) {
            if (columnSizeChanged) {
                this.layout();
            }

            this._onColumnResize(column);
        }
    }

    public _tryFinishColumnSizing(cancel) {
        var columnSizing = this._columnSizing;
        if (columnSizing) {
            if (columnSizing.active === true) {
                if (!cancel) {
                    this._applyColumnSizing(columnSizing.index, columnSizing.originalWidth, true);
                }
                this._moveSizingElement(-1);
            }

            this._columnSizing = null;
        }
    }

    /**
     * @param columnIndex 
     * @param left 
     */
    private _moveColumnMovingElement(columnIndex: number, left?: number) {

        var headerCanvas = this._headerCanvas,
            canvas = this._canvas,
            columnMovingElement = this._columnMovingElement,
            columnMovingPinElement = this._columnMovingPinElement,
            column, len = this._columns.length, lf = this._gutterWidth, i = 0, insertIndex = 0, pos;

        if (!columnMovingElement) {
            if (columnIndex < 0) {
                return;
            }

            columnMovingElement = $(domElem("div", "grid-column-moving")).appendTo(headerCanvas);
            this._columnMovingElement = columnMovingElement;

            columnMovingPinElement = $(domElem("div", "grid-column-moving-placer")).appendTo(canvas)
                .height(4).css("left", -500).css("top", -500);
            this._columnMovingPinElement = columnMovingPinElement;
        }

        if (columnIndex < 0) {
            columnMovingElement.css("left", -500000);
            columnMovingPinElement.css("left", -500).css("top", -500);
        }
        else {
            column = this._columns[columnIndex];
            columnMovingElement.width(column.width)
                .css("left", left)
                .css("top", 0)
                .text(column.text);
            /*jslint bitwise: false*/ /* TODO: Do we really need to use bitwise operation here? */
            pos = left + (column.width >> 1);
            /*jslint bitwise: true*/
            while (i < len) {
                column = this._columns[i];
                if (!column.hidden) {
                    if ((pos - lf) > (column.width / 2)) {
                        insertIndex = i + 1;
                    }
                    else {
                        break;
                    }

                    lf += column.width;
                }
                i++;
            }

            if (insertIndex < columnIndex || insertIndex > (columnIndex + 1)) {
                this._columnInsert = insertIndex;
                columnMovingPinElement.css("left", lf - 4).css("top", this._scrollTop);
            }
            else {
                this._columnInsert = -1;
                columnMovingPinElement.css("left", -500).css("top", -500);
            }
        }
    }

    private _applyColumnMoving(sourceIndex, targetIndex) {
        var sourceColumn, targetColumn,
            columns = this._columns;

        if (targetIndex >= 0) {

            if (targetIndex > sourceIndex) {
                targetIndex--;
            }

            sourceColumn = columns[sourceIndex];
            targetColumn = columns[targetIndex];

            if (this._options.allowMoveColumns && !targetColumn.fixed && targetColumn.canMove) {
                // Moving the column in the columns array
                columns.splice(sourceIndex, 1);
                columns.splice(targetIndex, 0, sourceColumn);

                this._determineIndentIndex();
                // Updating UI so that the header and rows are rendered according to the new column order
                this.layout();
                this._onColumnMove(sourceIndex, targetIndex);
            }
        }
    }

    private _tryFinishColumnMoving(cancel) {
        var columnMoving = this._columnMoving;
        if (columnMoving) {
            if (columnMoving.state > 1) {
                this._moveColumnMovingElement(-1);
                if (!cancel) {
                    this._applyColumnMoving(columnMoving.index, this._columnInsert);
                }
            }

            if (this._columnMoving.colHeaderElement) {
                this._columnMoving.colHeaderElement.removeClass("moving");
            }
            this._columnMoving = null;
        }
    }

    public _getSortColumns(sortOrder) {
        var columns = this._columns, sortedColumn, i, l, sc, sortColumns = [],
            j, columnsLength, column;

        for (i = 0, l = sortOrder.length; i < l; i++) {
            sc = sortOrder[i];

            for (j = 0, columnsLength = columns.length; j < columnsLength; j++) {
                column = columns[j];
                if (column.index === sc.index) {
                    sortedColumn = column;
                    break;
                }
            }

            sortColumns.push(sortedColumn);
        }

        return sortColumns;
    }

    /**
     * @param sortOrder 
     * @param sortColumns 
     * @return 
     */
    private _onSort(sortOrder: any, sortColumns?: any): any {

        if (this.onSort(sortOrder, sortColumns) !== false) {
            this._fire("sort", [{ sortOrder: sortOrder, sortColumns: sortColumns }]);
        }
    }

    /**
     * @param e 
     * @return 
     */
    public _onSelectStart(e?: JQueryEventObject): any {

        // Returns true if allowTextSelectable option is set to true, which makes the text content in the grid cell to be selectable and copyable
        if (this._options.allowTextSelection) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public _onCanvasScroll(e?: JQueryEventObject): any {
        var canvas = this._canvas[0];
        this._resetScroll = true;
        this._scrollLeft = canvas.scrollLeft;
        this._scrollTop = canvas.scrollTop;

        if (!this._ignoreScroll) {
            this._redraw();
        }
        Diag.logTracePoint('TFS.UI.Controls.Grids._onCanvasScroll.complete');

        return false;
    }

    /**
     * @param e 
     * @param handler 
     * @param eventName 
     * @param args 
     */
    private _handleEvent(e?: BaseJQueryEventObject, handler?: Function, eventName?: string, args?: any) {

        var dataIndex, rowIndex = this._selectedIndex, eventArgs;
        dataIndex = this._getDataIndex(rowIndex);

        eventArgs = { rowIndex: rowIndex, dataIndex: dataIndex, rowInfo: this._rows[dataIndex], event: e };

        if (args) {
            $.extend(eventArgs, args);
        }

        if (!handler || handler.call(this, eventArgs) !== false) {
            return this._fire(eventName, eventArgs);
        }
        else {
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public _onRowClick(e?: JQueryEventObject): any {

        var rowInfo = this._getRowInfoFromEvent(e, ".grid-row");

        if (rowInfo) {
            return this._handleEvent(e, this.onRowClick, "rowclicked", {
                row: rowInfo.row,
                rowInfo: rowInfo,
                rowIndex: rowInfo.rowIndex,
                dataIndex: rowInfo.dataIndex
            });
        }
    }

    /**
     * @param e 
     * @return 
     */
    public _onRowDoubleClick(e?: JQueryEventObject): any {

        var rowInfo = this._getRowInfoFromEvent(e, ".grid-row");

        if (rowInfo) {
            if ($(e.target).hasClass("grid-tree-icon")) {
                // Do nothing.  Let _onRowMouseDown handle this.
            }
            else {
                if (this._handleEvent(e, this.onRowDoubleClick, "rowdblclick", {
                    row: rowInfo.row,
                    rowInfo: rowInfo,
                    rowIndex: rowInfo.rowIndex,
                    dataIndex: rowInfo.dataIndex
                }) !== false) {
                    return this._onOpenRowDetail(e, { rowIndex: rowInfo.rowIndex, dataIndex: rowInfo.dataIndex });
                }
                else {
                    return false;
                }
            }
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onGutterClick(e?: JQueryEventObject): any {

        var rowInfo = this._getRowInfoFromEvent(e, ".grid-gutter-row"), target;

        if (rowInfo) {
            if (this._options.gutter.checkbox) {
                target = $(e.target);
                if (target.hasClass("checkbox")) {
                    this._addSelection(rowInfo.rowIndex, rowInfo.dataIndex, { toggle: true });
                }
            }
            else {
                if (!this._selectedRows || typeof (this._selectedRows[rowInfo.rowIndex]) !== "number") {
                    this._selectRow(rowInfo.rowIndex, rowInfo.dataIndex);
                }
            }

            return this._handleEvent(e, this.onGutterClick, "gutterclick", {
                gutterRow: rowInfo.gutterRow,
                rowInfo: rowInfo,
                rowIndex: rowInfo.rowIndex,
                dataIndex: rowInfo.dataIndex
            });
        }
    }

    /**
     * @param e 
     * @return 
     */
    public _onEnterKey(e?: JQueryKeyEventObject, bounds?): any {

        if (this._handleEvent(e, this.onEnterKey, "enterkey") !== false) {
            return this._onOpenRowDetail(e);
        }
        else {
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public _onDeleteKey(e?: JQueryKeyEventObject): any {

        return this._handleEvent(e, this.onDeleteKey, "deletekey");
    }

    /**
     * @param e 
     * @return 
     */
    protected _onContextMenu(e?: JQueryEventObject, args?): any {
        // This method is called in three places:
        //   1. The keydown handler for the context menu key
        //   2. The contextmenu event handler. 
        //   3. The handler for Shift+F10.
        //
        // The contextmenu event is a MouseEvent, and there is no way to 
        // distinguish the event from an actual right-click. Therefore, we won't be able to properly
        // position the context menu because of the target element reported by the Event object. Because
        // of this, we capture the keypress and remember this information for the next time the contextmenu
        // event is fired.
        // 
        // Since the browser doesn't fire contextmenu for Shift+F10, we don't need to worry about the
        // state (it behaves the same as the contextmenu event in this case).
        if (this._contextMenuKeyPressedState === ContextMenuKeyPressedState.Pressed) {
            this._contextMenuKeyPressedState = ContextMenuKeyPressedState.Handling;
            e.preventDefault();
        } else {
            if (this._contextMenuKeyPressedState === ContextMenuKeyPressedState.Handling) {
                this._contextMenuKeyPressedState = ContextMenuKeyPressedState.None;

                //  Resetting event coordinates for case 2 (context menu event handler).
                //  Coordinates reported in the event (pageX and pageY) are for the center of the grid,
                //  not for the selected row.
                //  By clearing the coordinates, we force the handler to use the gutter row element for
                //  for positioning.
                e.pageX = null;
                e.pageY = null;
            }
            this._handleEvent(e, this.onContextMenu, "contextMenu", args);
        }
        return false;
    }

    /**
     * @return 
     */
    private _onToggle(rowInfo): any {

        var state;
        var isExpanded: boolean;

        if (this._expandStates) {
            state = this._expandStates[rowInfo.dataIndex];

            if (state !== 0) {
                if (state > 0) {
                    isExpanded = false;
                    this.collapseNode(rowInfo.dataIndex);
                }
                else if (state < 0) {
                    isExpanded = true;
                    this.expandNode(rowInfo.dataIndex);
                }

                if (this._isAncestorFolderToggled(rowInfo)) {
                    this.ancestorFolderToggled(rowInfo);
                }
                else {
                    this.nonAncestorFolderToggled(rowInfo, (this._selectedRows) ? this._selectedRows[this._selectedIndex] : undefined);
                }

                this._layoutContentSpacer();
                this._redraw();
                this._raiseToggleEvent(rowInfo, isExpanded);
            }
        }

        this.afterOnToggle(rowInfo);
    }

    private _isAncestorFolderToggled(rowInfo) {
        var ancestorIdx: { [id: number]: boolean; } = {};
        if (this._indentLevels && this._selectedIndex && this._selectedRows && this._selectionCount === 1) {
            var currentSelectedDataIndex = this._selectedRows[this._selectedIndex];
            var currentParentIndentLevel = this._indentLevels[currentSelectedDataIndex] - 1;
            for (var i = currentSelectedDataIndex - 1; i >= 0; i--) {
                if (this._indentLevels[i] === currentParentIndentLevel) {
                    ancestorIdx[i] = true;
                    currentParentIndentLevel--;
                }
            }
        }

        return ancestorIdx[rowInfo.dataIndex] === true;
    }

    public ancestorFolderToggled(rowInfo) {
        this._folderToggled(rowInfo);
    }

    public nonAncestorFolderToggled(rowInfo, currSelectedDataIndex) {
        this._folderToggled(rowInfo);
    }

    public afterOnToggle(rowInfo) {
        // This is a no-op for this class.  Subclass should override for desired behavior
    }

    private _folderToggled(rowInfo) {
        this._clearSelection();
        this._addSelection(Math.min(rowInfo.rowIndex, this._expandedCount - 1), rowInfo.dataIndex);
    }

    private _raiseToggleEvent(rowInfo, isExpanded) {
        // Let any listeners know the row was toggled
        if (this._options.enabledEvents && GridO.EVENT_ROW_TOGGLED in this._options.enabledEvents) {
            // don't use this._fire because it bubbles events which shouldn't happen in this case.
            this._element.triggerHandler(GridO.EVENT_ROW_TOGGLED, [rowInfo, isExpanded]);
        }
    }

    public copySelectedItems(formatterType?: new (grid: GridO<TOptions>, options?: any) => ITableFormatter, copyAsHtml?: boolean, options?: any) {
        Diag.logTracePoint('TFS.UI.Controls.Grids.copySelectedItems.start');

        this._copyInProgress = true;

        // PHASE 1: BUILD THE HTML TABLE.
        // This may require a server round-trip to page in the required data, so we wrap this
        // in a long-running operation to present a 'please wait...' overlay until we're ready.
        var longRunningOperation = new StatusIndicator.LongRunningOperation(this.getElement(), {
            cancellable: true,
            message: Resources_Platform.CopyProgressPleaseWait,
        });

        longRunningOperation.beginOperation((cancelable) => {
            this._cancelable = cancelable;
            this.beginFormatTable((table: string, formatter: ITableFormatter) => {
                longRunningOperation.endOperation();

                this._copyInProgress = false;
                Diag.logTracePoint('TFS.UI.Controls.Grids.copySelectedItems.complete'); // Maintaining existing tracepoint behavior.

                // First try to get copyAsHtml value from overrides of this function
                if (typeof copyAsHtml === "undefined") {
                    // If overrides do not specify copyAsHtml value, try to get it from the table formatter
                    if (formatter) {
                        copyAsHtml = formatter.includesHtml === true;
                    }
                }

                // PHASE 2: COPY THE HTML TABLE TO THE CLIPBOARD.
                // Depending on browser support for native clipboard access, this may either synchronously copy
                // the data directly to the clipboard, or present a modal dialog the user can copy the table from.
                if (!this._cancelable || !this._cancelable.canceled) {
                    Utils_Clipboard.copyToClipboard(table, {
                        'copyAsHtml': copyAsHtml
                    });
                }
            }, null, formatterType, options);
        });
    }

    public _ensureRowDrawn(dataIndex): boolean {
        return true;
    }

    private _onMouseOver(e: JQueryEventObject): any {
        let $element = $(e.currentTarget);

        if ($element.data("no-tooltip")) {
            return;
        }

        let tooltipText = $element.attr("title");
        if (tooltipText) {
            // Store any existing title to use with tooltip and then remove it
            $element.removeAttr("title").data("tooltip-text", tooltipText);
        }

        let showOnOverflow = $element.data("tooltip-show-on-overflow");
        // See the cell wants to show the tooltip or not - text and tooltip text may be different (default is show on overflow)
        if (typeof showOnOverflow !== "boolean") {
            showOnOverflow = true;
        }

        let $tooltipElement = $element;
        if (showOnOverflow) {
            $tooltipElement = $(Utils_UI.getOverflowElement(e.currentTarget as HTMLElement, true));
        }

        if ($tooltipElement.length > 0) {
            // Ensure single tooltip
            if (!this._tooltip) {
                this._tooltip = Popup_Content.RichContentTooltip.add("", this.getElement(), { useMousePosition: true });
            }

            let tooltipText = $tooltipElement.data("tooltip-text");
            if (!tooltipText) {
                // Get tooltip text from the text
                tooltipText = $tooltipElement.text();
            }

            let tooltip = this._tooltip;
            tooltip.setTextContent(tooltipText);
            if (tooltipText !== "") {

                tooltip.enable();
            }
        }
    }

    private _onMouseOut(e: JQueryEventObject): any {
        if (this._tooltip) {
            this._tooltip.disable();
        }
    }

    /**
     * Ensures that all data objects in the selection have been downloaded and are available to process.
     * 
     * @param itemsAvailableCallback 
     * @param errorCallback 
     */
    public _beginEnsureSelectionIsAvailable(itemsAvailableCallback?: IResultCallback, errorCallback?: IErrorCallback) {

        Diag.Debug.assertParamIsFunction(itemsAvailableCallback, "itemsAvailableCallback");
        itemsAvailableCallback();
    }

    public _dispose() {
        if (this._tooltip) {
            this._tooltip.dispose();
            this._tooltip = null;
        }

        let element = this._element;
        element.off("mouseover", GridO.TOOLTIP_TARGET_SELECTOR, this._tooltipMouseOverHandler);
        element.off("mouseout", GridO.TOOLTIP_TARGET_SELECTOR, this._tooltipMouseOutHandler);
        this._tooltipMouseOverHandler = null;
        this._tooltipMouseOutHandler = null;

        super._dispose();

        Utils_UI.detachResize(element);
    }
}

export class Grid extends GridO<IGridOptions> { }

VSS.initClassPrototype(GridO, {
    _dataSource: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _expandStates: null,
    _indentLevels: null,
    _columns: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _sortOrder: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _visibleRange: [],
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _count: 0,
    _expandedCount: 0,
    _selectedIndex: -1,
    _indentIndex: 0,
    _selectionStart: -1,
    _selectionCount: 0,
    _selectedRows: null,
    _rowHeight: 20,
    _cellOffset: 0,
    _gutterWidth: 30,
    _contentSize: null,
    _rows: {},
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _focus: null,
    _scroller: null,
    _canvas: null,
    _canvasHeight: 300,
    _canvasWidth: 300,
    _contentSpacer: null,
    _header: null,
    _headerCanvas: null,
    _gutter: null,
    _gutterHeader: null,
    _popupMenu: null,
    _columnSizing: null,
    _columnMoving: null,
    _columnMovingElement: null,
    _columnMovingPinElement: null,
    _columnInsert: null,
    _unitEx: null,
    _sizingElement: null,
    _resetScroll: false,
    _ignoreScroll: false,
    _scrollTop: 0,
    _scrollLeft: 0,
    _ddRowAcceptStatus: null,
    _ddRowOverStatus: null,
    _droppable: null,
    _draggable: null,
    _draggingRowInfo: null,
    _cancelable: null,
    _active: false,
    _activeAriaId: null,
    _cellMinWidth: 15,
    _copyInProgress: false
});

Controls.Enhancement.registerJQueryWidget(Grid, "grid")

export class ListView extends Grid {

    public static enhancementTypeName: string = "tfs.listview";

    constructor(options?) {
        super(options);
    }
}

Controls.Enhancement.registerJQueryWidget(ListView, "listView")

$(function () {
    function applyFix() {
        var mainContainer;

        // We should do this only for main-container for now because if we want
        // to walk up to the DOM tree for each grid, things get complicated if there
        // is more than 1 grid on the page
        mainContainer = $(document.body).children(".main-container")[0];

        function fix() {
            if (mainContainer) {
                // Checking whether scrollbar exists or not.
                // If scrollbar exists, setting container overflow to scroll to get grid working correctly,
                // if not, setting container overflow back to auto to let it decide to show scrollbar or not
                mainContainer.style.overflowX = mainContainer.clientWidth !== mainContainer.scrollWidth ? "scroll" : "auto";
            }
        }

        // Attaching window resize to fix the container overflow
        Utils_UI.attachResize(mainContainer, fix);

        // Initial fixing (in case the initial state of the browser window is too small)
        fix();
    }

    // Applying this work around only for IE
    if (Utils_UI.BrowserCheckUtils.isMsie()) {
        applyFix();
    }
});

export class GridSearchAdapter extends Search.SearchAdapter<any> {

    private _grid: Grid;

    private _gridData: any[];   // The original grid data.
    private _results: any[];    // The results of the search.

    private _searchableColumns: IGridColumn[];  // Columns in the grid which are searchable.

    constructor() {
        super();
    }

    /**
     *     Attaches the Grid to the filter provider to allow for retrieval of paged data.
     *     The grid is loaded asynchronously, so can't be attached on page load when initialized.
     * 
     * @param grid The grid to get data from
     */
    public attachGrid(grid: Grid) {
        Diag.Debug.assertParamIsObject(grid, "grid");

        // Attach the grid if not already attached
        if (!this._grid) {
            this._grid = grid;
        }
    }

    /**
     * Adds additional items to the search strategy
     * 
     * @param addItemsCallback The function which adds items to the search strategy.
     * @param searchCallback The function which searches the newly updated strategy.
     */
    public addMoreItems(addItemsCallback: Function, searchCallback: () => any) {
        Diag.Debug.assertParamIsFunction(addItemsCallback, "addItemsCallback");
        Diag.Debug.assertParamIsFunction(searchCallback, "searchCallback");

        addItemsCallback(this.createSearchableObjects());
        searchCallback();
    }

    /**
     * Creates SearchableObjects for all available work items
     * 
     * @return An array of SearchableObjects.
     */
    public createSearchableObjects(): Search.SearchableObject<any>[] {

        Diag.logVerbose("GridSearchAdapter.createSearchableObjects: Creating searchable objects for grid data.");

        // Store off the grid data source it can be restored when search is cleared.
        var gridData = this._gridData = this._grid._dataSource;
        var columns = this.getSearchableColumns();

        // Create searchable objects for each row in the grid.
        var objects: Search.SearchableObject<any>[] = [];
        var searchableObject: Search.SearchableObject<any>;
        var terms: string[];

        for (let dataIndex in gridData) {
            // build the terms for this data row
            terms = [];
            for (let column of columns) {
                terms.push(this._grid.getColumnText(dataIndex, column));
            }

            // build the searchable object
            searchableObject = new Search.SearchableObject(gridData[dataIndex], terms);
            objects.push(searchableObject);
        }

        return objects;
    }

    /**
     *     Handles the results in the UI by filtering through all available items to the ones
     *     provided in the results array.
     * 
     * @param results An array of items
     * @param finished Represents whether or not the search is finished
     */
    public handleResults(results: any[], finished: boolean) {
        Diag.Debug.assertParamIsArray(results, "results");

        Diag.logVerbose("GridSearchAdapter.handleResults: Updating grid with new results.");

        // Update grid with results.
        this._results = results;
        this._grid.setDataSource(results, this._grid.getExpandStates(), this._grid.getColumns(), this._grid.getSortOrder(), null, false);
    }

    /**
     *     Handles an error being thrown in the search process.
     * 
     * @param message Specific error message if provided.
     */
    public handleError(message: string) {
        VSS.handleError({ name: "", message: message });
    }

    /**
     *     Handles the search results being cleared and the view resetting to normal.
     */
    public handleClear() {

        Diag.logVerbose("GridSearchAdapter.handleClear: Restoring original dataset");

        // If the grid data matches our result data, then restore the original data.
        if (this._results === this._grid._dataSource) {
            // Clear the search results by resetting grid to original data.
            this._grid.setDataSource(this._gridData, this._grid.getExpandStates(), this._grid.getColumns(), this._grid.getSortOrder(), null, false);
        }

        this._results = undefined;
    }

    /**
     *     Returns whether or not there is more data to be loaded.
     * 
     * @return True if no more data needs to be loaded, false otherwise
     */
    public isDataSetComplete(): boolean {

        // If the grid data set is the original data set or our results data set, then we have already loaded all the data.
        var dataSetComplete = this._gridData === this._grid._dataSource || this._results === this._grid._dataSource;

        Diag.logVerbose("GridSearchAdapter.isDataSetComplete: " + dataSetComplete);

        return dataSetComplete;
    }

    /**
     *     Build the list of searchable columns.
     */
    private getSearchableColumns() {

        if (!this._searchableColumns) {
            this._searchableColumns = [];
            var columns: any[] = this._grid.getColumns();

            $.each(columns, (index: number, column: IGridColumn) => {
                // If the column is flagged as searchable, add it.
                if (column.isSearchable) {
                    this._searchableColumns.push(column);
                }
            });
        }

        return this._searchableColumns;
    }
}

export interface ITableFormatter {
    /**
     * Gets the formatted items as string.
     */
    getTableFromSelectedItems(): string;

    /**
     * Determines whether the formatted string includes html or not.
     */
    includesHtml?: boolean;
}

export class TabDelimitedTableFormatter implements ITableFormatter {

    public _options: any;
    public _grid: Grid;

    constructor(grid: Grid, options?: any) {

        Diag.Debug.assertParamIsObject(grid, "grid");

        this._options = options;
        this._grid = grid;
    }

    /**
     * Iterates through the selected rows and builds a table containing the results.
     * 
     * @return A tab-delimited plain-text table containing all rows and all columns in the current selection.
     */
    public getTableFromSelectedItems(): string {

        Diag.logTracePoint('TFS.UI.Controls.Data.TabDelimitedTableFormatter.getTableFromSelectedItems.start');

        var that = this,
            grid = this._grid,
            selectedItems = grid.getSelectedDataIndices(),
            sb = new Utils_String.StringBuilder(),
            columns;

        columns = grid.getColumns();

        if ((selectedItems.length === 0) || (columns.length === 0)) {
            return "";
        }

        // Construct the column headers
        $.each(columns, function (index, column) {
            if (index > 0) {
                sb.append(Utils_String.tab);
            }

            sb.append(column.text);
        });

        sb.appendNewLine();

        $.each(selectedItems, function (index, row) {
            if (index > 0) {
                sb.appendNewLine();
            }

            sb.append($.map(columns, function (column) {
                return that.getFormattedColumnValue(column, grid.getColumnText(row, column));
            }).join(Utils_String.tab));
        });

        Diag.logTracePoint('TFS.UI.Controls.Data.TabDelimitedTableFormatter.getTableFromSelectedItems.complete');

        return sb.toString();
    }

    public getFormattedColumnValue(column: any, value: string): string {
        return value;
    }
}

export class HtmlTableFormatter implements ITableFormatter {
    public _options: any;
    public _grid: Grid;

    public includesHtml = true;

    constructor(grid: Grid, options?: any) {

        Diag.Debug.assertParamIsObject(grid, "grid");

        this._options = options;
        this._grid = grid;
    }

    public processColumns(columns: any[]): any[] {
        return columns;
    }

    public getTableFromSelectedItems(): string {
        Diag.logTracePoint('TFS.UI.Controls.Data.HtmlTableFormatter.getTableFromSelectedItems.start');
        const grid = this._grid;
        const selectedItems: number[] = this._getSelectedDataIndicesFromGrid();

        const extendedHtml = this._options && this._options.extendedText ? this._options.extendedText : undefined;
        const columns: IGridColumn[] = this.processColumns(grid.getColumns());
        const genericColumns = columns.map((c, i) => ({ index: i, name: c.text, isValueHtml: c.noHtmlEncode } as GenericHtmlTableFormatter.IHtmlTableFormatterColumn));
        const rows: string[][] = selectedItems.map(row => columns.map((column) => this.getFormattedColumnValue(column, grid.getColumnText(row, column))));
        const formatter = new GenericHtmlTableFormatter.HtmlTableFormatter(rows, genericColumns, { extendedHtml } as GenericHtmlTableFormatter.ITableFormatterOptions);

        Diag.logTracePoint('TFS.UI.Controls.Data.HtmlTableFormatter.getTableFromSelectedItems.complete');
        return formatter.getHtml();
    }

    public getFormattedColumnValue(column: any, value: string): string {
        return value;
    }

    protected _getSelectedDataIndicesFromGrid(): number[] {
        return this._grid.getSelectedDataIndices();
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.UI.Controls.Grids", exports);
