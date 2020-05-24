import VSS = require("VSS/VSS");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Menus = require("VSS/Controls/Menus");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Array = require("VSS/Utils/Array");
import WITControlsAccessories = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Accessories");
import WITQueryResultGrid = require("WorkItemTracking/Scripts/Controls/Query/QueryResultGrid");
import WidgetHostZIndexModifier = require("Widgets/Scripts/Shared/WidgetHostZIndexModifier");
import TFS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITWorkItemsProvider = require("WorkItemTracking/Scripts/Controls/WorkItemsProvider");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import Grids = require("VSS/Controls/Grids");
import Service = require("VSS/Service");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");

import Events_Services = require("VSS/Events/Services");
import WITControlsRecycleBin = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin");
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var eventService = Service.getLocalService(Events_Services.EventService);


/**
* Extend Grids option to support widget behavior
*/
export interface IWidgetGridsOptions extends Grids.IGridOptions {
    /* The widget itself so the Z-Index would work properly on right click context menu*/
    widgetControl: TFS_Control_BaseWidget.BaseWidgetControl<any>;

    /* The width of the widget in px*/
    widgetWidth: number;

    /* The height of the widget in px*/
    widgetHeight: number;

    /* The widgetTypeId */
    /* Useful for the control for firing the telementry event*/
    widgetTypeId?: string;

    /* The spacing from the top of the widget to the grid*/
    gridTopPadding: number;

    /* The spacing from either side of the grid to the widget container*/
    gridSidePadding: number;

    /* Grid would could have different behavior when in light box mode*/
    lightboxMode?: boolean;
}

/**
 * This implementation is intended to modify the QueryResultGrid so it would work within dashboard widget
 *  - Set the width, height of the widget so the grid can adjust to fit within the grid
 *  - Handle the z index on contenxt menu so it would show on the top of the widget.
 *       When open/close the context menu, we would invoke WidgetHostZIndexModifier helper to handler the z-index
 */
export class WidgetQueryResultGrid extends WITQueryResultGrid.QueryResultGrid {

    /**
    * Opening context menu requires bumping the z-index of the widgetHost to avoid being overlapped by neighbouring widgets.
    * This functionality is handled by WidgetHostZIndexModifier.
    */
    private _zIndexModifier: WidgetHostZIndexModifier.IWidgetHostZIndexModifier;
    private _widgetControl: TFS_Control_BaseWidget.BaseWidgetControl<any>;

    // Default width in px for the widget (2 columns)
    public static DEFAULT_WIDGET_CANVAS_WIDTH = 474;
    // Default max-size for item show within grid.
    public static DEFAULT_GRID_MAX_Item = 21;
    // Default item height;
    public static RESULT_ITEM_HEIGHT = 30;
    // The mimimun width for a given column
    private static MIN_COLUMN_WIDTH = 15;

    // the width to used to determine the space the grid and be draw on.
    private _canvasMaxWidth = WidgetQueryResultGrid.DEFAULT_WIDGET_CANVAS_WIDTH;
    private _maxVisibleRow = 0;
    private _gridTopPadding = 0;
    private _gridSidePadding = 0;

    // Used to record initial proportions of columns to the right of a column being resized
    private _initialRightColumnProportions: number[] = null;

    constructor(options) {
        super(options);
        this._widgetControl = options.widgetControl;
        this._gridTopPadding = options.gridTopPadding;
        this._gridSidePadding = options.gridSidePadding;

        super.setBeforeOpenWorkItemCallback(() => WITDialogShim.prefetchFormModules());
    }

    public initializeOptions(options?: IWidgetGridsOptions) {
        super.initializeOptions($.extend({
            gutter: {},
            extendViewportBy: WidgetQueryResultGrid.DEFAULT_GRID_MAX_Item, // Grid options to indicate the initial Viewport for drawing grid
            useLegacyStyle: true,
            coreCssClass: "wiql-query-result-grid grid"
        }, options));
    }

    public initialize() {
        super.initialize();

        // Expand all hierarchical rows and redraw the grid when query results grid finishes loading
        this.queryResultsComplete = () => {
            this.expandAll();
        }

        this.getElement().focusout(() => {
            if (this.getElement().has(":focus").length === 0) {
                var delay = new Utils_Core.DelayedFunction(this, 250, "delayGridLayout", () => {
                    if (this.getElement().find(".grid-row-hover").length === 0) {
                        if (this.getElement().has(":focus").length === 0) {
                            this._active = false;
                            this.layout();
                        }
                    }
                });
                delay.start();
            }
        });
    }

    // Override parent drawRows to limit the number of row we show based on the widget height
    public _drawRows(visibleRange: any, includeNonDirtyRows): void {
        if (!this._options.lightboxMode && visibleRange.length > this.getMaxVisibleRowCount()) {
            visibleRange = visibleRange.slice(0, this.getMaxVisibleRowCount());
        }
        super._drawRows(visibleRange, includeNonDirtyRows);
    }

    // Override parent on key down selection because we are limiting the item we show, we need to limit user's row navigation based on available item in widget
    public _onDownKey(e?: JQueryKeyEventObject, bounds?) {
        // If we are not in lightbox mode, we limit the item we shown in the widget, so we need to update the boundary of the grid so the down key selection would work correclty.
        if (!this._options.lightboxMode) {
            let totalWorkItems = this.getWorkItemIds().length;
            let maxVisibleRows = this.getMaxVisibleRowCount();
            bounds.hi = Math.min(totalWorkItems, maxVisibleRows) - 1;
        }
        super._onDownKey(e, bounds);
    }    

    public setCanvasMaxWidth(maxWidth: number): void {
        this._canvasMaxWidth = maxWidth;
    }

    public getCanvasMaxWidth(): number {
        return this._canvasMaxWidth;
    }

    /**
     * Get the maximum visible row that would fit within the current Widget dimension
     */
    public getMaxVisibleRowCount(): number {
        return this._maxVisibleRow;
    }

    /**
     * Default implementation checks for existance of the gutter.
     * We got rid of the gutter but we still want to keep the context menu.
     */
    public _shouldAttachContextMenuEvents() {
        return true;
    }

    /**
     * Default implementation sets the pinElemenet to gutterRow. Since we don't have gutter,
     * we're changing it to the row that context menu was invoked from.
     */
    public getPinAndFocusElementForContextMenu(eventArgs: any) {
        return { pinElement: eventArgs.rowInfo.row, focusElement: this._canvas };
    };

    public _onRowClick(e: JQueryEventObject): boolean {
        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAgileBacklogOneClickOpen)) {
            // we want to simulate the behaviour to open the work item. Depending on the state of the one click behaviour introduced, this is automatically managed by the base control. 
            this._onRowDoubleClick(e);
            return false;
        }
        return super._onRowClick(e);
    }

    /**
    * During widget configuration experience, a copy of the widget that's used as a preview gets disposed.
    * Since QueryResultGrid shares the _store among instances, we can not let it dispose itself.
    */
    public _dispose() {
        return;
    }

    /**
    * We need to overwrite this method to disable team actions on the context menu.
    */
    public _createContextMenu(rowInfo: any, menuOptions: Menus.PopupMenuOptions): Menus.PopupMenu {
        WITControlsAccessories.CommonContextMenuItems.contributeQueryResultGrid(menuOptions, {
            tfsContext: this._options.tfsContext,
            enableTeamActions: false,
            container: this._element
        });

        if (menuOptions.contextInfo) {
            menuOptions.contextInfo.item = { "workItemId": menuOptions.contextInfo.item };
        }

        /**
        * Override the contextMenu onHide method so we can handle the ZindexModifier properly.
        */
        menuOptions.onHide = () => { this._onMenuHide(); }
        return this._createContextPopupMenuControl(menuOptions);
    }

    public _showContextMenu(args) {
        //initialize the z-index modifier before showing menu.
        this._zIndexModifier = WidgetHostZIndexModifier.WidgetHostZIndexModifier.create(this._widgetControl);
        super._showContextMenu(args);

        // Note: We don't bump before showing menu as there exists a race condition with bumping Z-index immediately 
        // before showing the context menu, which causes pre-mature blur dismissal on menu entry, with IE.
        // An alternative solution would be to allow a small delay after bump, before showing menu.
        // Testing with delayed menu creation mitigates the z-order race, but is user observable.
        
        //If the modifier exists, bump. If it doesn't, a hide cycle has already been performed.
        if (this._zIndexModifier) {
            this._zIndexModifier.bump();
        }
    }

    /**
     * Revert the z-index modification for the context menu when we close it. 
     */
    public _onMenuHide() {
        if (this._zIndexModifier) {
            //It is possible for a dismissal to have occurred before bump is applied. 
            //In this case, perform the bump and reset. This will prevent bump after reset.
            if (!this._zIndexModifier.isBumped()) {
                this._zIndexModifier.bump();
            }
            this._zIndexModifier.reset();

            // With the modifier reset, the cycle is complete - clear the reference to it.
            this._zIndexModifier = null;
        }
    }


    /**
     * Overwrite. Only apply row selection style if the grid is active (not in edit mode, light box and preview mode),
     * otherwise remove all stylings.
     */
    public _updateRowSelectionStyle(rowInfo, selectedRows, focusIndex) {
        if (this._active) {
            super._updateRowSelectionStyle(rowInfo, selectedRows, focusIndex);
        }
        return;
    }

    public setCanvasSize(height: number, width: number): void {
        this._canvasWidth = width;
        this._canvasHeight = height;
        this._canvasMaxWidth = this._canvasWidth;
        this.updateMaxDisplayRecord();
    }

    public updateMaxDisplayRecord() {
        // minus one to have room for the grid column header
        this._maxVisibleRow = Math.ceil(((this._canvasHeight - this._gridTopPadding) / WidgetQueryResultGrid.RESULT_ITEM_HEIGHT)) - 1;
    }

    /**
     * Called as the column is being resized
     * @param columnIndex {number} index of the column being resized
     * @param initialWidth {number} width of the column before resize started
     * @param finish {boolean} true if this is the last call to the method
     *                         Detailed rundown: finish is false on initial call (i.e., mouse down / start of resize) and subsequent
     *                         calls (i.e., mouse move / resize in progress) but is then true for the last call (i.e., mouse up / end of resize).
     */
    public _applyColumnSizing(columnIndex: number, initialWidth = -1, finish = false) {
        var column = this._columns[columnIndex];
        
        // Find the total width of an array of columns
        var sumColumnWidths = (columns: Grids.IGridColumn[]): number => {
            return columns.reduce((sum, c) => sum + c.width, 0);
        };

        // Return visible columns only
        var filterColumns = (columns: Grids.IGridColumn[]): Grids.IGridColumn[] => {
            return columns.filter((c) => !c.hidden && c.width > 0);
        };
        
        // Get columns either side of the current one
        var columnsToTheLeft = filterColumns(this._columns.slice(0, columnIndex));
        var columnsToTheRight = filterColumns(this._columns.slice(columnIndex + 1));

        // Calculate column sizes
        var leftWidth = sumColumnWidths(columnsToTheLeft);
        var rightWidth = sumColumnWidths(columnsToTheRight);
        var newTotalWidth = leftWidth + column.width + rightWidth;
        
        // If this is the first call, set the existing column ratios for right hand columns (since we want to maintain their original proportions as they are resized)
        if (this._initialRightColumnProportions === null) {
            this._initialRightColumnProportions = columnsToTheRight.map((c) => c.width / rightWidth);
        }
        
        // We always want columns to add up to the max width
        if (newTotalWidth != this.getCanvasMaxWidth()) {
            // Re-calculate what the ideal width of the right hand side should be if we scale it to fit within the canvas max width
            var targetRightWidth = this.getCanvasMaxWidth() - column.width - leftWidth;

            if (columnsToTheRight.length > 0) {
                // Resize columns to the right so that they all maintain their original proportion to one another, but scaled to the new right-hand width
                columnsToTheRight.forEach((c, i) => c.width = Math.max(this._initialRightColumnProportions[i] * targetRightWidth, WidgetQueryResultGrid.MIN_COLUMN_WIDTH));

                // Update right width since it may be different from the target right width (some of the resized columns could have hit their minimum size)
                rightWidth = sumColumnWidths(columnsToTheRight);
            }
            
            // Update column with adjusted width if we weren't able to resolve the situation by resizing the right hand side (or there are no columns on the right)
            if (rightWidth !== targetRightWidth) {
                column.width = this.getCanvasMaxWidth() - leftWidth - rightWidth;
            }
        }

        // Update DOM
        var domColumnIndex = columnIndex + 1;
        $(".grid-header-column:nth-child(" + domColumnIndex + ")", this._headerCanvas).width(column.width);
        this.layout();

        // Finish up if this is the final call
        if (finish === true) {
            this._initialRightColumnProportions = null;
            // update the rest of the columns, so when we do sort it would reflect the new size
            this.getColumns().forEach((c) => this._onColumnResize(c));
        }
    }
}

/*
* Interface to allow deal with context menu
*/
export interface IQueryWidgetContextMenuHelper{
    /* update the widget with the ids it removed*/
    updateViewOnDelete(workItemIds: number[]): void;

    /* update the widget title to reflect the count*/
    updateWidgetTitleCount(count: number): void;

    /* set widget to zero result view*/
    setZeroResultView(): void;

    /* get the grid */
    getGrid(): WidgetQueryResultGrid;
}

/**
 * Helper method to deal with the widget context menu operation
 */
export class QueryWidgetContextMenuHelper 
{
    private queryResultWidget: IQueryWidgetContextMenuHelper;
    private _deleteItemEventStartDelegate: Function;

    constructor(queryResultWidget: IQueryWidgetContextMenuHelper) {
        this.queryResultWidget = queryResultWidget;
        this.setupDeleteEventDelegate();
    }

    public dispose() {
        if (this._deleteItemEventStartDelegate) {
            eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._deleteItemEventStartDelegate);
        }
    }

    /**
     * Setup up event handler when a right click delete is happening
     */
    private setupDeleteEventDelegate(): void {
        this._deleteItemEventStartDelegate = (startedArguments: WITControlsRecycleBin.IDeleteEventArguments) => {
            this.handleEventObj(startedArguments);
        };
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._deleteItemEventStartDelegate);
    }

    /**
     * Move this handleEventObject out for testing purpose
     * It would be too much work to mock around with the eventService queue
     * @param startedArguments
     */
    public handleEventObj(startedArguments: WITControlsRecycleBin.IDeleteEventArguments): void{
        if (startedArguments) {
            var grid = this.queryResultWidget.getGrid();
            var total = grid.getUnfilteredWorkItemIds().length;
            var workItemIds = startedArguments.workItemIds;
            if (workItemIds && workItemIds.length > 0) {
                // Filter the list based on the know id list. If the ids in the list then we would invoke the method
                var target = grid.getUnfilteredWorkItemIds().filter((value) => {
                    if (Utils_Array.contains(workItemIds, value)) {
                        return true;
                    }
                });
                // Now we would update the widget Title with the new count
                if (target.length > 0) {
                    grid.removeWorkItems(target);
                    // Dealing with link workItem type
                    var newTotal = grid.getUnfilteredWorkItemIds().length;
                    this.queryResultWidget.updateWidgetTitleCount(newTotal);
                    if (newTotal == 0) {
                        // Set the widget to zero Result view
                        this.queryResultWidget.setZeroResultView();
                    }
                }
                // finally, we would pass the id we removed from the option to the widget
                this.queryResultWidget.updateViewOnDelete(target);
            }
        }
    }
}





