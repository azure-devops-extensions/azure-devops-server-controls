// Copyright (c) Microsoft Corporation.  All rights reserved.

import Events_Services = require("VSS/Events/Services");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import TFS_UI_Controls_Identities = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

import OrderTestsCommon = require("TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTests.Common");
import OrderTestsMovePosition_LAZY_LOAD = require("TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTests.MovePositionDialog");
import OrderTestsVM = require("TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTestsViewModel");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

let eventSvc = Events_Services.getService();
let delegate = Utils_Core.delegate;

interface Offset {
    left: number;
    top: number;
}

interface DragStartInfo extends Offset {
    dataIndex: number;
    canvasWidth: number;
}

interface DropTargetInfo {
    dataIndex: number;
    below: boolean;
}

export interface IGridRowMouseClickEventInfo {
    /** Data index where mouse down is triggered on */
    dataIndex: number;

    /** Is mouse-click event handled */
    isMouseClickHandled: boolean;
}

export class OrderTestsGrid extends Grids.GridO<any> {
    private static _orderColumn: any = {
        index: OrderTestsCommon.OrderTestsColumnIds.order,
        text: Resources.Order,
        canSortBy: true,
        width: 75,
        isMultiLine: false,
        canEdit: false,
        isRichText: true,
        editOnSelect: false
    };

    private static _idColumn: any = {
        index: OrderTestsCommon.OrderTestsColumnIds.id,
        text: Resources.TestPointGridColumnID,
        canSortBy: true,
        width: 75,
        isMultiLine: false,
        canEdit: false,
        isRichText: true,
        editOnSelect: false
    };

    private static _titleColumn: any = {
        index: OrderTestsCommon.OrderTestsColumnIds.title,
        text: Resources.TestPointGridColumnTitle,
        canSortBy: true,
        width: 300,
        isMultiLine: false,
        canEdit: false,
        editOnSelect: false,
        isRichText: false
    };

    private _parentElement: JQuery;
    private _containerClassName: string;
    private _orderTestsViewModel: OrderTestsVM.OrderTestsViewModel;

    private _moveItemsCompletedDelegate: IArgsFunctionR<void>;
    private onMiddleRowVisible: () => void;

    private _gridCanvas: JQuery;
    private _gridRowHeight: number;
    private _cursorOffset: Offset;
    private _lastDropTarget: JQuery;
    private _dragStartInfo: DragStartInfo;
    private _gridRowMouseClickEventInfo: IGridRowMouseClickEventInfo;
    private _rowIndexToScrollAfterFetch: number = -1;
    private _additionalWitFields: WITOM.FieldDefinition[];
    public isDirty: boolean = false;

    /** Create a new order tests grid */
    constructor(options?) {
        super(options);
        this._moveItemsCompletedDelegate = Utils_Core.delegate(this, this._onMoveItemsCompleted);
        eventSvc.attachEvent(OrderTestsCommon.OrderTestsEvent.ItemUpdated, this._moveItemsCompletedDelegate);
        $(window).bind("beforeunload", Utils_Core.delegate(this, this.getMessage));
    }

    /**
     * Initialize options
     *
     * @param options
     */
    public initializeOptions(options?: any) {
        this._orderTestsViewModel = options.orderTestsViewModel;
        this._parentElement = options.parent;
        this._containerClassName = options.containerClassName;
        this.onMiddleRowVisible = options.onMiddleRowVisible;
        this._additionalWitFields = options.additionalWitFields;
        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            keepSelection: true,
            allowMultiSelect: true,
            autoSort: false,
            cssClass: "order-testcases-grid",
            initialSelection: false,
            columns: this._getColumnsToDisplay(),
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: delegate(this, this._getContextMenuItems),
                updateCommandStates: delegate(this, this._updateContextMenuCommandStates),
                executeAction: delegate(this, this._onContextMenuItemClick)
            },
        }, options));
    }

    /** Initialize the base */
    public initialize() {
        super.initialize();
        this.setupDragDrop(this._getDraggableOptions(), this._getDroppableOptions());
        this._gridCanvas = this.getElement().find(".grid-canvas");
        this._gridRowHeight = this._rowHeight || 1;
    }

    /** Show OrderTestsGrid element */
    public show() {
        this._parentElement.find(this._containerClassName).show();
    }

    /** Hide OrderTestsGrid element */
    public hide() {
        this._parentElement.find(this._containerClassName).hide();
    }

    /** Dispose OrderTestsGrid element */
    public dispose() {
        this._parentElement.find(this._containerClassName).remove();
        this._orderTestsViewModel = null;
        if (this._moveItemsCompletedDelegate) {
            eventSvc.detachEvent(OrderTestsCommon.OrderTestsEvent.ItemUpdated, this._moveItemsCompletedDelegate);
            this._moveItemsCompletedDelegate = null;
        }
        if (this.onMiddleRowVisible) {
            this.onMiddleRowVisible = null;
        }
    }

    /**
     * OVERRIDE: Handles the row mouse up event on the OrderTestsGrid
     * 
     * @param e Event args
     */
    public _onRowMouseUp(e?: JQueryEventObject) {
        let rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
        let mouseClickInfo = this._getRowMouseDownEventInfo();
        if (rowInfo && mouseClickInfo && !mouseClickInfo.isMouseClickHandled && rowInfo.dataIndex === mouseClickInfo.dataIndex) {
            // It will come here when you select row which was already selected as in _onRowMouseDown we set isMouseClickHandled False
            // this way we'll able to deselect multiple selected items by clicking any row
            this._selectRow(rowInfo.rowIndex, rowInfo.dataIndex, {
                ctrl: e.ctrlKey,
                shift: e.shiftKey,
                rightClick: e.which === 3 // Set if it was right click or not
            });
        }
        this._clearRowMouseDownEventInfo();
    }

    /**
     * OVERRIDE: Handles the row mouse down event on the OrderTestsGrid, this is required
     * to handle multiple select and drag selection without using ctrl & shift key
     * 
     * @param e Event args
     */
    public _onRowMouseDown(e?: JQueryEventObject): any {
        this._clearRowMouseDownEventInfo();
        let rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
        if (!rowInfo) {
            return;
        }
        let info: IGridRowMouseClickEventInfo = {
            dataIndex: rowInfo.dataIndex,
            isMouseClickHandled: true
        };
        if (this._selectedRows.hasOwnProperty(rowInfo.rowIndex)) {
            // We don't handle the event here if user clicks on an already selected item in multiselection (mainly to differentiate drag and click). 
            // Flag "isMouseClickHandled" is set to false and the event is handled on _onRowMouseUp depending on user's mouse gesture
            info.isMouseClickHandled = false;
            this._setRowMouseDownEventInfo(info);
        }
        else {
            super._onRowMouseDown(e);
        }
    }

    /**
     * Set the source for the grid and select the first row as default
     * 
     * @param rawSource raw source for the grid
     * @param columns columns which need to be display in the grid
     */
    public setSource(rawSource: any, columns: any[]) {
        let options = this._options;
        options.source = rawSource;
        options.columns = columns;
        this.initializeDataSource();
    }

    /** Populate the OrderTestsGrid, get the payload data from the viewmodel */
    public populateGridData() {
        let i: number, rawSource: any[] = [], columns: any[], payloadData: TestsOM.TestCase[], length: number, row: any;

        payloadData = this._orderTestsViewModel.getDataSource();

        if (payloadData) {
            length = payloadData.length;
        }

        for (i = 0; i < length; i++) {
            row = this._populateOrderTestsGridRow(payloadData[i]);
            row[OrderTestsCommon.OrderTestsColumnIds.order] = i + 1;
            rawSource.push(row);
        }

        this.setSource(rawSource, this._getColumnsToDisplay());
    }

    /** Clear the OrderTestsGrid */
    public clearGrid() {
        let options = this._options;
        options.source = [];
        this.initializeDataSource();
    }

    /** 
    * Get the selected test cases information in the OrderTestsGrid
    * @returns selected test cases information
    */
    public getSelectedTestCases(indices: number[]): TestsOM.TestCase[] {
        let i: number, length: number,
            tests: TestsOM.TestCase[] = [],
            testCases = this._orderTestsViewModel.getDataSource();

        for (i = 0, length = indices.length; i < length; i++) {
            tests.push(testCases[indices[i]]);
        }

        return tests;
    }

    public _onCanvasScroll(e?: JQueryEventObject): any {
        let result = super._onCanvasScroll(e),
            row = this._rows[this._count - this._count / 2],
            lastRow = this._rows[this._count - 1];
        if (lastRow && this._isScrolledIntoView(lastRow.row)) {
            this._onMiddleRowVisible(lastRow.rowIndex);
        } else {
            if ((row && this._isScrolledIntoView(row.row))) {
                this._onMiddleRowVisible(row.rowIndex);
            }
        }
        return result;
    }

    /**
     * Get the columns name
     */
    public getColumnsToDisplayName(): string[] {
        let columnsName: string[] = [];
        let columnsToDisplay = this._getColumnsToDisplay();
        // Starting from 2nd column (hence i = 1) as first column is Order which is custom column and we don't need
        // go to Work item to get the data
        for (let i = 1, length = columnsToDisplay.length; i < length; i++) {
            columnsName.push(columnsToDisplay[i].index);
        }

        return columnsName;
    }

    private _onMiddleRowVisible(rowIndex: number) {
        this._rowIndexToScrollAfterFetch = rowIndex;
        this.delayExecute("fetchMoreTestCases", 1, true, () => {
            if (this.onMiddleRowVisible) {
                this.onMiddleRowVisible();
            }
        });
    }

    private _isScrolledIntoView($elem: JQuery) {
        let documentTop = $(window).scrollTop(),
            documentBottom = documentTop + $(window).height(),
            elemTop = $elem.offset().top,
            elemBottom = elemTop + $elem.height();
        return ((elemBottom <= documentBottom) && (elemTop >= documentTop));
    }

    /**
     * Invoked when selected item dragged to other position, this event get fired from the view model
     * This will repopulate the grid and select the moved items
     * @param sender The source of the event.
     */
    private _onMoveItemsCompleted(sender: any, movedItems: TestsOM.TestCase[]): void {
        this.clearGrid();
        this.populateGridData();
        this._clearSelection();
        let source: TestsOM.TestCase[] = this._orderTestsViewModel.getDataSource();
        for (let i = 0, length = movedItems.length; i < length; i++) {
            let index = source.indexOf(movedItems[i]);
            this._addSelection(index);
        }
    }

    /**
     * gets context menu items list
     */
    private _getContextMenuItems(): Menus.IMenuItemSpec[] {
        let items: Menus.IMenuItemSpec[] = [];

        items.push(
            { rank: 1, id: OrderTestsCommon.Constants.ContextMenuMoveToTopId, text: Resources.MoveToTop, showText: true, groupId: "moveitem" },
            { rank: 2, id: OrderTestsCommon.Constants.ContextMenuMoveToPositionId, text: Resources.MoveToPosition, showText: true, groupId: "moveitem" });

        return items;
    }

    private _updateContextMenuCommandStates(menu: Menus.MenuItem) {
        menu.updateCommandStates([{
            id: OrderTestsCommon.Constants.ContextMenuMoveToTopId,
            disabled: this._isTopRowSelected()
        }]);
    }

    /**
     * Executes upon executing a right click command from the context menu
     * @param e event related info
     */
    private _onContextMenuItemClick(e?: any) {
        let command = e.get_commandName();
        let selectedIndicesBeforeMove = this.getSelectedDataIndices();
        let selectedtestCases: TestsOM.TestCase[] = this.getSelectedTestCases(selectedIndicesBeforeMove);

        if (command === OrderTestsCommon.Constants.ContextMenuMoveToTopId) {
            this._movePosition(0, selectedtestCases, selectedIndicesBeforeMove);
        }
        else if (command === OrderTestsCommon.Constants.ContextMenuMoveToPositionId) {
            VSS.using(["TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTests.MovePositionDialog"], (
                OrderTestsMovePositionModule: typeof OrderTestsMovePosition_LAZY_LOAD) => {
                OrderTestsMovePositionModule.MovePositionDialog.movePositionDialogFunc({
                    totalTestCases: this._orderTestsViewModel.getDataSource().length,
                    moveItemsHandler: (newIndex: number) => {
                        // If move to position is for above indexes then decrease the index by 1 as grid index start with 0
                        // For the below case we don't need to decrease as we are getting one less value when we move item below
                        if (newIndex <= selectedIndicesBeforeMove[selectedtestCases.length - 1]) {
                            newIndex = newIndex - 1;
                        }

                        this._movePosition(newIndex, selectedtestCases, selectedIndicesBeforeMove);
                    }
                });
            });
        }
    }

    private _movePosition(newPosition: number, selectedtestCases: TestsOM.TestCase[], selectedIndicesBeforeMove: number[]) {
        this._orderTestsViewModel.moveItems(selectedtestCases, newPosition);
        this.getSelectedRowIntoView();
        let selectedIndicesAfterMove = this.getSelectedDataIndices();
        this._handleDoneButtonState(selectedIndicesBeforeMove, selectedIndicesAfterMove);
    }

    private _handleDoneButtonState(selectedIndicesBeforeMove: number[], selectedIndicesAfterMove: number[]) {
        let isSame = this._areIndicesSame(selectedIndicesBeforeMove, selectedIndicesAfterMove);
        if (!isSame) {
            this._enableDoneButton();
        }
    }

    private _isTopRowSelected(): boolean {
        let selectedIndices = this.getSelectedDataIndices();
        // Search for top index which is 0
        return selectedIndices.indexOf(0) > -1;
    }

    private _clearRowMouseDownEventInfo() {
        this._gridRowMouseClickEventInfo = null;
    }

    private _setRowMouseDownEventInfo(info: IGridRowMouseClickEventInfo) {
        this._gridRowMouseClickEventInfo = info;
    }

    private _getRowMouseDownEventInfo(): IGridRowMouseClickEventInfo {
        return this._gridRowMouseClickEventInfo;
    }

    private _getDraggableOptions(): any {
        this._cursorOffset = { left: 16, top: 18 };

        return {
            cursorAt: this._cursorOffset,
            axis: "", // the default will set the axis to y, we need to make the tile move freely
            appendTo: document.body, // append to body to allow for free drag/drop
            scroll: false,
            scrollables: [".grid-canvas"], // a list of selectors to identify elements that the tile will scroll while dragging
            scrollablesAxis: "y", // this limits our "scrollables" plugin from scrolling containers along their horizontal axis
            scope: OrderTestsCommon.Constants.OrderTestsDragDropScope,
            containment: OrderTestsCommon.Constants.orderTestsGridSelector, // draggable element will be contained to the bounding box of the first element found by the selector
            distance: OrderTestsCommon.Constants.MouseDragDistance, // start the drag if the mouse moved more than 20px, this will prevent accidental drag/drop
            helper: this._draggableHelper,
            start: (evt: JQueryEventObject, ui: any) => {
                this._dragStartInfo = {
                    top: ui.offset.top,
                    left: ui.offset.left,
                    dataIndex: ui.draggingRowInfo.dataIndex,
                    canvasWidth: this._gridCanvas.width()
                };
            },
            stop: (evt: JQueryEventObject, ui: any) => {
                this._dragStartInfo = null;
                this._resetLastDropTarget();
            },
            drag: (evt: JQueryEventObject, ui: any) => {
                if (this._dragStartInfo) {
                    this._resetLastDropTarget();
                    let dropTargetInfo = this._getRowDataIndex(<Offset>ui.offset, this._dragStartInfo);
                    if (dropTargetInfo) {
                        let rowInfo = this.getRowInfo(dropTargetInfo.dataIndex);
                        if (rowInfo) {
                            this._lastDropTarget = rowInfo.row;
                            this._lastDropTarget.addClass(dropTargetInfo.below ? "lower-drop-guide" : "upper-drop-guide");
                        }
                    }
                }
            }
        };
    }

    private _getDroppableOptions(): any {
        return {
            hoverClass: "",
            tolerance: "pointer",
            scope: OrderTestsCommon.Constants.OrderTestsDragDropScope,
            drop: (evt: JQueryEventObject, ui: any) => {
                let newIndex = <number>ui.droppingRowInfo.dataIndex;

                // This is required to make index value consistent irresptive of whether item dragged from below or above
                // when we dragged item from top to below then index value is 1 less compare to item dragged from below to top
                let dropTargetInfo = this._getRowDataIndex(<Offset>ui.offset, this._dragStartInfo);
                if (dropTargetInfo && dropTargetInfo.below) {
                    newIndex = newIndex + 1;
                }

                // Get what all indices are selected while dragging and dropping, enable done button only
                // when new index to drop is other than selected index for dragged items
                let selectedDraggedIndices = ui.helper.data(OrderTestsCommon.Constants.SelectedIndices);
                let testCases = ui.helper.data(OrderTestsCommon.Constants.DataTestCaseIds);
                let visibleRange = this._getVisibleRowIndices();
                this._orderTestsViewModel.moveItems(testCases, newIndex);
                this._getRowIntoView(visibleRange.last);
                let selectedDroppedIndices = this.getSelectedDataIndices();
                this._handleDoneButtonState(selectedDraggedIndices, selectedDroppedIndices);
            }
        };
    }

    private _enableDoneButton() {
        this.isDirty = true;
        let $doneButton = this._parentElement.find(".order-tests-done-panel-button");
        if ($doneButton) {
            $doneButton.removeAttr("disabled");
        }
    }

    private _areIndicesSame(selectedIndicesBeforeMove: number[], selectedIndicesAfterMove: number[]): boolean {
        // Sort both array for comparison
        selectedIndicesBeforeMove.sort(function (a, b) { return a - b; });
        selectedIndicesAfterMove.sort(function (a, b) { return a - b; });

        return (selectedIndicesBeforeMove.length === selectedIndicesAfterMove.length)
            && selectedIndicesBeforeMove.every(function (element, index) {
                return element === selectedIndicesAfterMove[index];
            });
    }

    private getMessage(): string {
        let message: string;
        if (this.isDirty) {
            message = Resources.ContinueAndLoseChanges;
        }

        return message;
    }

    private _draggableHelper(event: any, ui: any) {
        let selectedIndices = this.getSelectedDataIndices();
        let selectedtestCases: TestsOM.TestCase[] = this.getSelectedTestCases(selectedIndices);
        let numOfSelectedItems: number = selectedtestCases.length;

        let $dragTile = $("<div />")
            .addClass("drag-tile-testcase");
        let $dragItemCount = $("<div />")
            .addClass("drag-tile-item-count")
            .text(numOfSelectedItems);

        let $dragItemType = $("<span />")
            .addClass("drag-tile-item-type")
            .text("Test Case");

        $dragTile.append($dragItemCount).append($dragItemType);

        // Attach data to the tile to give context information to potential drop targets.
        $dragTile.data(OrderTestsCommon.Constants.DataTestCaseIds, selectedtestCases);
        $dragTile.data(OrderTestsCommon.Constants.SelectedIndices, selectedIndices);

        return $dragTile;
    }

    private _getRowDataIndex(offset: Offset, dragStartInfo: DragStartInfo): DropTargetInfo {
        let canvasScrollTop = this._gridCanvas.scrollTop(),
            canvasScrollLeft = this._gridCanvas.scrollLeft(),
            newOffset = <Offset>{
                top: offset.top - dragStartInfo.top + canvasScrollTop + this._cursorOffset.top,
                left: offset.left - dragStartInfo.left + canvasScrollLeft + this._cursorOffset.left
            };

        if (newOffset.left <= 0 || newOffset.left > dragStartInfo.canvasWidth) {
            return null;
        }

        let itemsHeight = this._count * this._gridRowHeight;
        if (newOffset.top <= 0 || newOffset.top > itemsHeight) {
            return null;
        }

        let dataIndex = Math.floor((newOffset.top - 1) / this._gridRowHeight);

        if (dataIndex === dragStartInfo.dataIndex) {
            return null;
        }

        return {
            dataIndex: dataIndex,
            below: dataIndex > dragStartInfo.dataIndex
        };
    }

    private _resetLastDropTarget(): void {
        if (this._lastDropTarget) {
            this._lastDropTarget.removeClass("upper-drop-guide lower-drop-guide");
            this._lastDropTarget = null;
        }
    }

    private _getColumnsToDisplay(): any[] {
        let columnsToDisplay: any[] = [];

        // set the fixed columns
        columnsToDisplay.push(OrderTestsGrid._orderColumn);
        columnsToDisplay.push(OrderTestsGrid._idColumn);
        columnsToDisplay.push(OrderTestsGrid._titleColumn);

        if (this._additionalWitFields) {
            this._appendAdditionalColumns(columnsToDisplay, this._additionalWitFields);
        }

        return columnsToDisplay;
    }

    private _appendAdditionalColumns(columnsToDisplay: any[], fields: any[]) {
        let length = fields.length,
            i: number,
            columnIndex: string,
            fieldName: string,
            isIdentityField: boolean;

        let identityCellRenderer = function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
            // we dont want to show identity avatar in this identity cell. Hence we pass "false" as the last parameter
            return TFS_UI_Controls_Identities.IdentityViewControl.renderIdentityCellContents(this, rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, false);
        };


        for (i = 0; i < length; i++) {
            columnIndex = fields[i].referenceName;
            fieldName = fields[i].name;
            isIdentityField = fields[i].isIdentity;
            if (isIdentityField) {
                columnsToDisplay.push({
                    index: columnIndex,
                    text: fieldName,
                    canSortBy: false,
                    width: 200,
                    canEdit: false,
                    editOnSelect: true,
                    getCellContents: identityCellRenderer
                });
            }
            else {
                columnsToDisplay.push({
                    index: columnIndex,
                    text: fieldName,
                    canSortBy: true,
                    width: 150,
                    isMultiLine: false,
                    canEdit: false,
                    isRichText: true,
                    editOnSelect: false
                });
            }
        }
    }

    private _populateOrderTestsGridRow(testCase: TestsOM.TestCase) {
        let row: any = {};
        let columnsToDisplay = this._getColumnsToDisplay();
        // Starting from 2nd column (hence i = 1) as first column is Order for which data we are calculating on the fly
        for (let i = 1, length = columnsToDisplay.length; i < length; i++) {
            let referenceName = columnsToDisplay[i].index;
            if (referenceName) {
                row[referenceName] = testCase.getProperty(referenceName);
            }
        }

        return row;
    }
}
