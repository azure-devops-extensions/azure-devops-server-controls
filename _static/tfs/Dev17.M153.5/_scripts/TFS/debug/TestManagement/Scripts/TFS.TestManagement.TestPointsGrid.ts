
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Grids = require("VSS/Controls/Grids");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import EventsHandlers_LAZY_LOAD = require("VSS/Events/Handlers");
import Menus_LAZY_LOAD = require("VSS/Controls/Menus");
import FilterBarProvider_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.FilterBarProvider");
import TMUtils_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import AssignTestersHelper_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.AssignTestersHelper");
import WITConstants_LAZY_LOAD = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TeamServices_LAZY_LOAD = require("TfsCommon/Scripts/Team/Services");
import Service_LAZY_LOAD = require("VSS/Service");
import WorkItemManager_LAZY_LOAD = require("WorkItemTracking/Scripts/OM/WorkItemManager");
import Events_Services_LAZY_LOAD = require("VSS/Events/Services");
import WITControls_RecycleBin_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin");
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import WITOM_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

import { MessageAreaControl, MessageAreaType } from "VSS/Controls/Notifications";

import Menus = require("VSS/Controls/Menus");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");

let delegate = Utils_Core.delegate;
let domElem = Utils_UI.domElem;
let tfsContext = TFS_Host_TfsContext.TfsContext;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

export interface ITestPointsGridOptions extends Grids.IGridOptions {
    pagedColumns: TCMLite.ITestPointGridDisplayColumn[];
    onFetchMoreData?: (callback?: () => void) => void;
}

export class TestPointsGrid extends Grids.GridO<ITestPointsGridOptions> {

    public static enhancementTypeName: string = "tfs.testmanager.TestPointsGrid";
    private static _showFilteredItemsLink = "showFilteredItemsLinkId";
    private static _gridHasMessageFlag = "has-grid-message-area";

    public cachedTestPoints: TCMLite.ITestPointModel[];
    public savedColumns: TCMLite.ITestPointGridDisplayColumn[];
    public pagedColumns: TCMLite.ITestPointGridDisplayColumn[];
    public totalTestPoints: number;
    public sortOrder: TCMLite.IColumnSortOrderModel;
    private _workItemChangedDelegate: IEventHandler;
    private _controlKeyPressed: boolean;

    // Maintains all the unsaved changes made to the test points grid
    private _pageData: { [key: number]: any[]; } = {};

    public assignConfigurationEvent: (testCaseAndSuiteList: TCMLite.ITestCaseWithParentSuite[]) => void;
    public assignTesterEvent: (testPointIds: number[], tester: any) => void;
    public canSetOutcomeDelegate: () => void;
    public canResetTestPointsDelegate: () => void;
    public canResumeTestsDelegate: () => void;
    public canRunTestsDelegate: () => void;
    public canRemoveTestsDelegate: () => void;
    public canShowRemoveTestsDelegate: () => boolean;
    public isTestNotApplicableDelegate: () => void;
    public resetFiltersEvent: () => void;
    public refreshTestPointsDelegate: (testPoints: TCMLite.ITestPointModel[]) => void;
    public refreshSuiteOnTestDeletionDelegate: () => void;
    public static hiddenRefNames = ["System.History"];
    private _originalDataSource: any;
    private _workItemIds: number[];
    private _isFilterApplied: boolean = false;
    private _testCaseModified: boolean;
    private _dirtyWorkItems: any[];
    private isTestCaseDialogOpen: boolean = false;
    public identityDelegate: (grid: any, rowInfo: any, dataIndex: number, expandedState: any, level: any, column: any, indentIndex: any, columnOrder: number, showAvatar: boolean) => void;
    public tagProviderDelegate: (grid: any, dataIndex: number, column: any, columnOrder: any) => void;
    private onFetchMoreData: () => void;
    private _rowIndexToScrollAfterFetch: number = -1;
    private _commonContextMenuItemModule: any;
    private _assignTesterHelper: any;
    private _idField: any;
    private _filterMessageArea: MessageAreaControl;
    private _filterBarInitialized: boolean;

    /**
     * Create a new Test case grid
     * @param options
     */
    constructor(options?: ITestPointsGridOptions) {
        super(options);
        this._testCaseModified = false;
        this._dirtyWorkItems = [];
        this._workItemChangedDelegate = delegate(this, this.workItemChanged);
        this.startTrackingWorkItems();
        this.onFetchMoreData = (options && options.onFetchMoreData) ? options.onFetchMoreData : () => { };
        this.initializeIdFieldName();
    }

    /**
     * Attaches the workitem change event
     */
    public startTrackingWorkItems(): void {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Utils", "WorkItemTracking/Scripts/OM/WorkItemManager"],
            (Module: typeof TMUtils_LAZY_LOAD, WorkItemManager: typeof WorkItemManager_LAZY_LOAD) => {
                WorkItemManager.WorkItemManager.get(Module.WorkItemUtils.getWorkItemStore()).attachWorkItemChanged(this._workItemChangedDelegate);
        });
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

    private _isScrolledIntoView($elem: JQuery) {
        let documentTop = $(window).scrollTop(),
            documentBottom = documentTop + $(window).height(),
            elemTop = $elem.offset().top,
            elemBottom = elemTop + $elem.height();
        return ((elemBottom <= documentBottom) && (elemTop >= documentTop));
    }

    public _onMiddleRowVisible(rowIndex: number) {
        this._rowIndexToScrollAfterFetch = rowIndex;
        this.delayExecute("fetchMoreTestPoints", 1, true, () => {
            this.onFetchMoreData();
        });
    }

    /**
     * Detach the workitem change event
     */
    public stopTrackingWorkItems(): void {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Utils", "WorkItemTracking/Scripts/OM/WorkItemManager"],
            (Module: typeof TMUtils_LAZY_LOAD, WorkItemManager: typeof WorkItemManager_LAZY_LOAD) => {
                WorkItemManager.WorkItemManager.get(Module.WorkItemUtils.getWorkItemStore()).detachWorkItemChanged(this._workItemChangedDelegate);
        });
    }

    /**
     * Overides the base mouse down event.
     */
    public _onRowMouseDown(e?: JQueryEventObject): any {

        let rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
        if (!rowInfo) {
            return;
        }
        if ((this._selectedRows && this._selectedIndex === rowInfo.rowIndex && this._selectedRows.hasOwnProperty(rowInfo.rowIndex))
            && !e.ctrlKey && !e.shiftKey) {
        }
        else {
            super._onRowMouseDown(e);
        }
    }

    /**
     * The the dirty items on the test points grid.
     */
    public resetDirtyItems() {
        let i = 0,
            dirtyWorkItems: any[];
        dirtyWorkItems = Utils_Array.clone(this._dirtyWorkItems);

        for (i = 0; i < dirtyWorkItems.length; i++) {
            dirtyWorkItems[i].reset();
        }

        this._dirtyWorkItems = [];
    }

    public initializeOptions(options?: any) {

        let draggableOption: any = false;
        draggableOption = {
            scope: TCMLite.Constants.DropScope,
            scrollables: [".testmanagement-suites-tree"],  // a list of selectors to identify elements that the tile will scroll while dragging
            cursorAt: { left: -20, top: 0 },
            dropBehaviour: false,            // Override default set by base query results grid.  This is needed so droppables get invoked
            axis: "", // the default will set the axis to y, we need to make the tile move freely
            appendTo: document.body, // append to body to allow for free drag/drop
            helper: (event, ui) => { return this._draggableHelper(event, ui); },
        };

        /// <param name="options" type="any" />
        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            keepSelection: true,
            allowMultiSelect: true,
            autoSort: false,
            gutter: {
                contextMenu: true
            },
            cssClass: "testcases-grid",
            initialSelection: false,
            draggable: draggableOption
        }, options));
    }

    /**
     * Initialize the base
     */
    public initialize() {
        super.initialize();
    }

    /**
     * Whenever selected index in the grid changes, it raises selectedTestChanged event.
     */
    public selectedIndexChanged(selectedRowIndex, selectedDataIndex) {
        let testCaseId;
        super.selectedIndexChanged(selectedRowIndex, selectedDataIndex);
        testCaseId = this._dataSource[selectedDataIndex] ? this._dataSource[selectedDataIndex].testCaseId : 0;
        this._fire("selectedTestChanged", [testCaseId || 0]);
    }

    /**
     * Set the source for the grid and slect the first row as default
     * @param rawSource
     * @param columns Visible columns in the UI
     * @param sortOrder
     * @param pagedColumns Columns paged per workitem
     */
    public setSource(rawSource: any, columns: TCMLite.ITestPointGridDisplayColumn[], sortOrder: TCMLite.IColumnSortOrderModel, pagedColumns: TCMLite.ITestPointGridDisplayColumn[]) {
        const options = this._options;
        options.source = rawSource;
        this._originalDataSource = rawSource.slice(0);

        this._customizeColumns(columns);
        options.columns = columns;
        options.pagedColumns = pagedColumns;
        options.sortOrder = TestPointsGrid.getGridSortOrderList(sortOrder);
        const selectedRowIndex = 0;
        this._applyFilter(selectedRowIndex);

        if (!this._isFilterApplied) {
            this.initializeDataSource();
            if (rawSource && rawSource.length > 0) {
                this._selectRow(selectedRowIndex);
            }
        }
    }

    /**
     * Clear the test point grid data source and set grid empty
     */
    public clearGrid() {
        let options = this._options;
        options.source = [];
        this.initializeDataSource();
    }

    public onSort(sortOrder: any, sortColumns?: any): any {

        let sortOrderForIdColumn = [],
            sortColumnsForIdColumn = [];

        super.onSort(sortOrder, sortColumns);

        if (sortOrder && sortOrder.length > 0) {
            this._fire("sortOrderChanged", { index: sortOrder[0].index, order: sortOrder[0].order });
        }
    }

    /**
     * Initializes the delegates for assigning testers to the test points.
     */
    public initializeAssignTesterDelegate(assignTesterEvent: (testPointIds: number[], tester: any) => void) {
        this.assignTesterEvent = assignTesterEvent;

        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.AssignTestersHelper", "TfsCommon/Scripts/Team/Services", "VSS/Service"],
            (Module: typeof AssignTestersHelper_LAZY_LOAD, TeamServices: typeof TeamServices_LAZY_LOAD, Service: typeof Service_LAZY_LOAD) => {
                let context = tfsContext.getDefault();

                this._commonContextMenuItemModule = Module.CommonContextMenuItemsWithSearch.contributeTestPointsGrid;
                this._assignTesterHelper = new Module.AssignTestHelper(this.assignTesterEvent);
            });
    }

    /**
     * Overrides the createContextMenu method in the base.
     * Adds the assign testers context menu option the context menu.
     */
    public _createContextMenu(rowInfo: any, menuOptions: any): Menus.PopupMenu {
        if (this._commonContextMenuItemModule && this._assignTesterHelper && LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            let menuItemCount: number = menuOptions.items.length;

            this._commonContextMenuItemModule(menuOptions, {
                tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
                enableTeamActions: true,
                executeAction: delegate(this, this._assignTesterHelper.assignTester),
                title: Resources.AssignTesterTitle,
                tooltip: Resources.AssignTesterTooltip,
                maxTeamSize: 500
            });

            if (menuItemCount === menuOptions.items.length) {
                menuOptions.items.push({ rank: 13, separator: true });
            }
        }

        menuOptions.getContributionContext = delegate(this, this.getContributionContext);

        return super._createContextMenu(rowInfo, menuOptions);
    }
    
    /**
     * Returns the Ids of the selected test points.
     */
    public getSelectedTestPointIds(): number[] {
        let selectedItems = [],
            rowIndex;

        for (rowIndex in this._selectedRows) {
            if (this._selectedRows.hasOwnProperty(rowIndex)) {
                selectedItems.push(this._dataSource[this._selectedRows[rowIndex]].testPointId);
            }
        }
        return selectedItems;
    }

    /**
     * Returns selected test point
     */
    public getSelectedTestPoint(): any {
        /// <summary>Get the selected test case from the data source</summary>
        /// <returns type="Object">selected test case</returns>
        let selectedDataIndex;
        if (this._selectedIndex >= 0) {
            selectedDataIndex = this._selectedRows[this._selectedIndex];
            return (typeof (selectedDataIndex) === "number") ? this._dataSource[selectedDataIndex] : null;
        }
    }

    /**
     * Clears the test point grid.
     */
    public _clearGrid() {
        let options = this._options;
        options.source = [];
        this.initializeDataSource();
    }

    /**
     * Returns the selected test points.
     */
    public getSelectedTestPoints() {
        let selectedItems = [],
            rowIndex;

        for (rowIndex in this._selectedRows) {
            if (this._selectedRows.hasOwnProperty(rowIndex)) {
                selectedItems.push(this._dataSource[this._selectedRows[rowIndex]]);
            }
        }
        return selectedItems;
    }

    /**
     * Get all the dirty work items present in the test points grid
     */
    public getDirtyTests() {
        return this._dirtyWorkItems;
    }

    public static parseTestCaseFieldsInTestPoints(testPoints: any[]) {
        let i: number,
            key: string,
            value: string;

        testPoints = $.map(testPoints, (item) => {
            if (item.workItemProperties && item.workItemProperties.length > 0) {
                for (i = 0; i < item.workItemProperties.length; i++) {
                    let workItem;
                    if (item.workItemProperties[i].workItem) {
                        workItem = item.workItemProperties[i].workItem;
                    } else {
                        workItem = item.workItemProperties[i];
                    }
                    key = workItem.key;
                    if (!key) {
                        key = workItem.Key;
                    }
                    value = workItem.value;
                    if (!value) {
                        value = workItem.Value;
                    }

                    item[key] = value;
                }
            }
            return item;
        });
    }

    /**
     * Return the list of unique testcaseids
     * @param testPoints 
     */
    public static getTestCaseIdsFromTestPoints(testPoints): number[] {
        if (!testPoints) {
            return [];
        }
        let index: number,
            testCaseList: number[] = [],
            testCaseIdMap = {},
            len: number = testPoints.length;

        for (index = 0; index < len; index++) {
            testCaseIdMap[testPoints[index].testCaseId] = true;
        }

        for (index = 0; index < len; index++) {
            if (testCaseIdMap[testPoints[index].testCaseId]) {
                testCaseList.push(testPoints[index].testCaseId);
                testCaseIdMap[testPoints[index].testCaseId] = false;
            }
        }
        return testCaseList;
    }

    /**
     * Returns the test point ids of all the test points present
     */
    public getTestPointIdsFromDataSource(dataSource: any): number[] {
        let workitemIds: number[] = [];
        for (let i = 0, length = dataSource.length; i < length; i++) {
            workitemIds.push(dataSource[i].testPointId);
        }
        return workitemIds;
    }

    public getVisibleRow(): number {
        let visibleRange = this._getVisibleRowIndices();
        this._getRowIntoView(visibleRange.first);
        return visibleRange.first;
    }

    public onFilterActivated() {
        this._applyFilter(this._selectedIndex);
    }

    public onFilterDeactivated() {
        this._reinstateUnfilteredData();
        this.initializeDataSourceAndSort();
        this._clearFilterMessage();
    }

    /**
     * Filters down the grid to only the specified workitem ids
     * @param ids: Array of workitem ids that can still be shown
     */
    public filterWorkItems(ids: number[]) {
        const dataSource = this._getFilteredTestPointsData(ids);

        // overwrite the testpoints data for the grid
        this._options.source = dataSource;

        this._isFilterApplied = true;

        this.initializeDataSourceAndSort();
        this._updateFilterMessage();
    }

    /**
     * If the sort order was changed by the user, update the the _options.sortOrder for the grid
     */
    public initializeDataSourceAndSort() {
        this.initializeDataSource();
        if (this._options.sortOrder) {
            this.onSort(this._options.sortOrder);
        }
    }

    /**
     * Returns the grid to its unfiltered state.
     */
    public restoreUnfilteredState() {
        if (this._isFilterApplied) {
            this._reinstateUnfilteredData();
            this.cleanUpFilterState();
            this.initializeDataSourceAndSort();
        }

        this._updateFilterMessage();
    }

    /**
     * Clears filter values.
     */
    public cleanUpFilterState() {
        this._isFilterApplied = false;
    }

    /**
     * Open the selected test case in the test point grid
     */
    public openSelectedTestCase(closeCallBack?: any) {
        let handleFailure = (errorMessage: string) => {
            VSS.errorHandler.showError(errorMessage);
        };

        VSS.using(["VSS/Controls/Menus", "VSS/Events/Handlers", "VSS/Events/Services", "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin", "VSS/Service"],
            (Menus: typeof Menus_LAZY_LOAD, Events_Handlers: typeof EventsHandlers_LAZY_LOAD, Events_Services: typeof Events_Services_LAZY_LOAD,
                WITControls_RecycleBin: typeof WITControls_RecycleBin_LAZY_LOAD, Service: typeof Service_LAZY_LOAD) =>
            {
                let eventService = Service.getLocalService(Events_Services.EventService);
                eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this.refreshSuiteOnTestDeletionDelegate);
                eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, handleFailure);

                let testPoint = this.getSelectedTestPoint(),
                    $selectedRow: JQuery = this.getSelectedRow();

                if (this.getSelectionCount() === 1 && testPoint && testPoint.testCaseId) {

                    this.isTestCaseDialogOpen = true;
                    Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
                        id: testPoint.testCaseId,
                        tfsContext: tfsContext.getDefault(),
                        options: {
                            save: (workItem) => {
                                this._testCaseModified = true;
                            },

                            close: (workItem) => {
                                eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this.refreshSuiteOnTestDeletionDelegate);
                                eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, handleFailure);
                                if (closeCallBack) {
                                    closeCallBack();
                                }
                                try {
                                    // Get refresh all test points that have the same test case. 
                                    if (this._testCaseModified) {
                                        this.refreshTestPointsDelegate([testPoint]);
                                    }
                                    //after form closes we want the focus back on the testpoint grid
                                    this.focus(10);
                                    this._testCaseModified = false;
                                }
                                finally {
                                    this._updatePageRow(workItem);
                                    this.isTestCaseDialogOpen = false;
                                    this._updateDirtyStatus(workItem);
                                }
                            }
                        }
                    }, null));
                }
            }
        );
    }

    /**
     * Handles in-memory work item change events
     */
    public workItemChanged(sender: any, args?: any) {
        const workItem = args.workItem;
        const change = args.change;
        const workItemId = workItem.getUniqueId();
        if (workItemId <= 0) {
            // This means the work item has not been created yet.
            return;
        }

        if (this.isTestCaseDialogOpen) {
            // There is no point refreshing the UI when the user is modifying the test case in the dialog.
            // We also do not need to track this because the user can never close the dialog with partially
            // saved test case.
            return;
        }

        Utils_Core.delay(this, 250, () => {
            // TODO: If there are a lot of test points, this may cause a perf hit. If we do not do this,
            // handling multi-config data will be hard.
            const dataRows = this._getDataRowsForWorkItem(workItemId);
            if (dataRows.length > 0) {
                for (let i = 0; i < dataRows.length; i++) {
                    const dataRow = dataRows[i];
                    this._updatePageRow(workItem);
                    this._updateDirtyStatus(workItem);
                    this._updateTestPointRow(dataRow, dataRow.rowIndex, dataRow.dataIndex, workItem);
                }
            }
            else {
                // Handle the case when the test point has been deleted from a different browser and the case when the 
                // the user has scrolled away the work item that is currently selected.
                this._updatePageRow(workItem);
                this._updateDirtyStatus(workItem);
            }

            if (change === "save-completed" || change === "field-change") {
                this._updateFilterData();
            }
        });
    }

    public onColumnsChanged(columns: any[]) {
        this._updatePagedData(columns);
    }

    private _updatePagedData(columns: any[]) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Utils", "WorkItemTracking/Scripts/OM/WorkItemManager", "WorkItemTracking/Scripts/TFS.WorkItemTracking"],
            (Module: typeof TMUtils_LAZY_LOAD, WorkItemManager: typeof WorkItemManager_LAZY_LOAD, WITOM: typeof WITOM_LAZY_LOAD) => {
                let i: number,
                    workItemId, l: number, workItem: any,
                    workItemManager = WorkItemManager.WorkItemManager.get(Module.WorkItemUtils.getWorkItemStore());

                for (workItemId in this._pageData) {
                    if (this._pageData.hasOwnProperty(workItemId)) {
                        workItem = workItemManager.getWorkItem(workItemId);
                        if (workItem && workItem.isDirty()) {
                            this._updatePageRow(workItem, columns);
                        }
                    }
                }
            });
    }

    /**
     * Get information regarding the test case which being dragged.
     */
    public getDraggingRowInfo(e?: any) {
        let testCaseIds = this._getSelectedTestCaseIds();
        if (testCaseIds && testCaseIds.length > 0) {
            return testCaseIds;
        }
        return null;
    }

    private _getSelectedTestCaseIds(): number[] {
        let testPoints = this.getSelectedTestPoints();
        return TestPointsGrid.getTestCaseIdsFromTestPoints(testPoints);
    }

    /**
     * This overrides the base class implementation to set the row style whenever the layout is set
     */
    public _updateRow(rowInfo: any, rowIndex: number, dataIndex: number, expandedState: number, level: number) {
        let workItemId = this._dataSource[dataIndex].testCaseId;
        super._updateRow(rowInfo, rowIndex, dataIndex, null, null);

        // Do this only when we know that this work item is already fetched. Otherwise, this will endup doing a lot of web service calls.
        if (this._pageData[workItemId]) {
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.Utils", "WorkItemTracking/Scripts/OM/WorkItemManager"],
                (Module: typeof TMUtils_LAZY_LOAD, WorkItemManager: typeof WorkItemManager_LAZY_LOAD) => {
                    WorkItemManager.WorkItemManager.get(Module.WorkItemUtils.getWorkItemStore()).beginGetWorkItem(workItemId, (workItem) => {
                        this._updateRowStyle(rowInfo.row, workItem);
                    });
                });
        }

    }

    /**
     * This overrides the base class implementation to show pending changes in the test points grid which were made with the inline work item view
     */
    public getColumnValue(dataIndex: number, columnIndex: any, columnOrder?: number): any {
        let workItemData,
            workitemId,
            columnValue = "";

        workitemId = this._dataSource[dataIndex].testCaseId;
        workItemData = this._pageData[workitemId];

        // Over-ride the base value if there is a work item and it has valid value.
        if (workItemData && workItemData[columnIndex] !== undefined) {
            columnValue = workItemData[columnIndex];
        }
        else {
            columnValue = super.getColumnValue(dataIndex, columnIndex, columnOrder);
        }

        return columnValue;
    }

    /**
     * Returns the data for an unsaved edited work item with the specified id.  If no unsaved edited
     * work item exists with the specified id it will return undefined.
     * @param workItemId Id of the work item to retrieve data for
     */
    public getUpdatedWorkItemData(workItemId: number): any[] {
        return this._pageData[workItemId];
    }

    private _draggableHelper(event: JQueryEventObject, ui: any): JQuery {
        /// <summary>Called to createist the draggable helper element</summary>
        /// <param name="event" type="Object">The event which initiated this call</param>
        /// <param name="ui" type="Object">jQuery droppable ui object - enhanced with draggingRowInfo</param>
        let numWorkItems: number = ui.draggingRowInfo ? ui.draggingRowInfo.length : 0,
            $outerDiv = $("<div/>"),
            $tile: JQuery,
            tileText = Utils_String.format(Resources.DraggedItemText, numWorkItems);

        if (numWorkItems > 1) {
            tileText = Utils_String.format(Resources.DraggedMultipleItemsText, numWorkItems);
        }

        $tile = $("<div />")
            .addClass("drag-testcase-tile drag-droppable")
            .text(tileText);
        $outerDiv.append("<div class='drag-not-droppable-icon bowtie-icon bowtie-status-no-fill'/>").append($tile);
        return $outerDiv;
    }

    private _updateTestPointRow(rowInfo: any, rowIndex: number, dataIndex: number, workItem: any) {
        super._updateRow(rowInfo, rowIndex, dataIndex, null, null);
        this._updateRowStyle(rowInfo.row, workItem);
    }

    private _updateRowStyle(row: any, workItem: any) {
        if (!row) {
            return;
        }

        row.removeClass("dirty-workitem-row invalid-workitem-row");

        if (workItem && workItem.isDirty()) {
            row.addClass("dirty-workitem-row");

            // If the work item is invalid or has an error associated with it, show the work item as invalid.
            if (!workItem.isValid() || workItem.hasError()) {
                row.addClass("invalid-workitem-row");
            }
        }
    }

    private _getDataRowsForWorkItem(workItemId: number) {
        let rows = this._rows,
            dataRowsForWorkItem = [],
            index: string = "",
            row;
        if (rows) {
            for (index in rows) {
                if (rows.hasOwnProperty(index)) {
                    row = rows[index];
                    if (this._dataSource[row.dataIndex].testCaseId === workItemId) {
                        dataRowsForWorkItem.push(row);
                    }
                }
            }
        }
        return dataRowsForWorkItem;
    }

    /**
     * Stores the page data with the current work item information to update the test points grid
     * @param workItem: The work item that we want to update in the grid
     */
    private _updatePageRow(workItem: any, columns?: any[]) {
        let i: number = 0,
            l: number = 0,
            pageColumns: any[] = [],
            field: any,
            workItemId: number = workItem.id,
            row: any,
            currenColumnRefName: string = "";

        if (!this._pageData[workItemId]) {
            this._pageData[workItemId] = [];
        }

        row = this._pageData[workItemId];
        pageColumns = this._columns;
        if (columns) {
            pageColumns = columns;
        }

        for (i = 0, l = pageColumns.length; i < l; i++) {
            currenColumnRefName = pageColumns[i].name;
            field = workItem.getField(currenColumnRefName);

            if (field) {
                if (field.fieldDefinition.id === this._idField) {
                    row[currenColumnRefName] = workItem.getUniqueId();
                }
                else {
                    row[currenColumnRefName] = field.getValue();
                }
            }
            else {
                row[currenColumnRefName] = undefined;
            }
        }
    }

    private initializeIdFieldName() {
        VSS.using(["Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants"], (WITConstants: typeof WITConstants_LAZY_LOAD) => {
            this._idField = WITConstants.CoreField.Id;
        });
    }


    private _updateDirtyStatus(workItem: any) {
        if (workItem) {
            if (workItem.isDirty()) {
                if ($.inArray(workItem, this._dirtyWorkItems) === -1) {
                    this._dirtyWorkItems.push(workItem);
                }
            }
            else {
                this._updateGridDataSourceForWorkItem(workItem.id);

                delete this._pageData[workItem.id];

                if ($.inArray(workItem, this._dirtyWorkItems) !== -1) {
                    Utils_Array.remove(this._dirtyWorkItems, workItem);
                }
            }
            this._fire("dirtytestcaseschanged");
        }
    }

    /**
     * updating the grid datasource once the Workitem is saved so that we have have the updated data in grid's datasource.
     */
    private _updateGridDataSourceForWorkItem(id: number) {
        const dataRows = this._getIndicesInDataSourceForWorkItem(id);
        if (this._pageData.hasOwnProperty(id.toString())) {
            const witData = this._pageData[id];

            for (let i = 0; i < this._columns.length; i++) {
                const column = this._columns[i];
                if (witData[column.index]) {
                    for (let j = 0; j < dataRows.length; j++) {
                        const dataIndex = dataRows[j];
                        this._dataSource[dataIndex][column.index] = witData[column.index];
                    }
                }
            }
        }
    }

    private _getIndicesInDataSourceForWorkItem(workItemId: number): number[] {
        let indices: number[] = [];

        for (let i = 0, len = this._dataSource.length; i < len; i++) {
            if (this._dataSource[i].testCaseId === workItemId) {
                indices.push(i);
            }
        }
        return indices;
    }

    /**
     * Get the selected rows of the test point grid
     */
    public getSelectedRow(): JQuery {
        if (this._rows && this._selectedIndex >= 0 && this._rows[this._selectedIndex]) {
            return this._rows[this._selectedIndex].row;
        }
    }

    /**
     * opens the selected test case on double click
     * returns false to stop event propagation
     */
    public onOpenRowDetail(): boolean {
        this.openSelectedTestCase();
        return false;
    }

    /**
     * Reinstates the unfiltered values that were cached when filters were applied.
     * revert the workitems back to the unfiltered state
     */
    private _reinstateUnfilteredData() {
        this._options.source = this._originalDataSource;
    }

    /**
     * Gets the filtered testPoints data based on the order of the originalIds, maintaining order
     */
    private _getFilteredTestPointsData(filteredIds: number[]): any {

        let sortedTestPointsData: any[] = [];
        const filteredIdsHash: { [index: number]: boolean } = {};
        const unfilteredTestPointIds = this.getTestPointIdsFromDataSource(this._originalDataSource);

        filteredIds = Utils_Array.unique<number>(filteredIds);

        // build lookup table
        $.each(filteredIds, (i, filteredId) => {
            filteredIdsHash[filteredId] = true;
        });

        // Go through the original ids in order and keep them if they are part of the filtered set
        sortedTestPointsData = $.map(unfilteredTestPointIds, (testPointId, i) => {
            if (filteredIdsHash[testPointId]) {
                return this._originalDataSource[i];
            }
        });

        return sortedTestPointsData;
    }

    private _onFetchMoreData(callback?: () => void): void {
        if (typeof this._options.onFetchMoreData === "function") {
            this.delayExecute("pageMore", 1, true, () => {
                this._options.onFetchMoreData(callback);
            });
        }
        else if (callback) {
            callback();
        }
    }

    /**
     * Shows a message indicating current status of text filtering on grid along with a link to trigger search increment.
     * Public for unit testing.
     * @param filteredItems The number of work items on which the text filter has been applied
     * @param totalItems Total number of workitems on which filter can be applied
     * @param nextIncrement The next set of items which will be included in text filtering on triggering search increment
     */
    public _showFilterMessage(filteredItems: number, totalItems: number, nextIncrement: number) {
        if (!this._filterMessageArea) {
            // Create message area
            this._filterMessageArea = <MessageAreaControl>Controls.BaseControl.createIn(MessageAreaControl, this.getElement(), {
                closeable: false,
                message: {
                    type: MessageAreaType.Info
                },
                prepend: true
            });

            // Suppress context menu right clicking on the message area.
            this._filterMessageArea._element.bind("contextmenu", (e: JQueryEventObject) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
        }

        const nextItemsMessage: string = Utils_String.format(Resources.TextFilterNextItemsMessage, nextIncrement);
        // Create the message info.
        const $msgInfoContainer = $(domElem("div", "grid-message-area"));

        const message = "<span>" + Utils_String.format(Resources.TextFilterResultCountMessage, filteredItems, totalItems, "<a id=" + TestPointsGrid._showFilteredItemsLink + " href=#>" + nextItemsMessage + "</a>") + "</span>";
        $(message).appendTo($msgInfoContainer);

        this._filterMessageArea.setMessage({
            header: $msgInfoContainer
        }, MessageAreaType.Info);

        const $link = $("#" + TestPointsGrid._showFilteredItemsLink);
        if (nextIncrement <= 0) {
            $link.hide();
        }

        $link.click((e: JQueryEventObject) => {
            if (e) {
                e.preventDefault();
            }

            this._onFetchMoreData(() => {
                this._applyFilter(this._selectedIndex);
            });
        });

        this.getElement().addClass(TestPointsGrid._gridHasMessageFlag);
    }

    public setFilterBarInitialized() {
        this._filterBarInitialized = true;
    }

    private _applyFilter(selectedRowIndex: number) {
        this._filterBarConditionalExecution((ProviderModule: typeof FilterBarProvider_LAZY_LOAD) => {
            const filterBarProvider = ProviderModule.FilterBarProvider.getInstance();
            if (filterBarProvider) {
                // Tell the provider that the data has been updated so it can re-build its caches.
                filterBarProvider.dataUpdated();

                if (this._isFilterApplied) {
                    this.filterWorkItems(filterBarProvider.getFilterManager().filter());
                    this.onSort(this._options.sortOrder);

                    if (this._dataSource && this._dataSource.length > 0) {
                        this._selectRow(selectedRowIndex);
                    }
                }
                else {
                    this._updateFilterMessage();
                }
            }
        });
    }

    private _updateFilterData() {
        this._filterBarConditionalExecution((ProviderModule: typeof FilterBarProvider_LAZY_LOAD) => {
            const filterBarProvider = ProviderModule.FilterBarProvider.getInstance();
            if (filterBarProvider) {
                // Tell the provider that the data has been updated so it can re-build its caches.
                filterBarProvider.dataUpdated();
            }
        });
    }

    private _filterBarConditionalExecution(callback: (ProviderModule: typeof FilterBarProvider_LAZY_LOAD) => void) {
        if (this._filterBarInitialized) {
            VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.FilterBarProvider"],
                (ProviderModule: typeof FilterBarProvider_LAZY_LOAD) => {
                    callback(ProviderModule);
                });
        }
    }

    private _updateFilterMessage() {
        if (this._isFilterApplied && this.cachedTestPoints) {
            // Get the count of paged in items and the count of available work items.
            const pagedItems = Object.keys(this.cachedTestPoints).length;
            const uniqueItemCount = this.totalTestPoints;
            const nextIncrement = Math.min(TCMLite.Constants.maxPageSize, uniqueItemCount - pagedItems);

            if (nextIncrement > 0) {
                this._showFilterMessage(pagedItems, uniqueItemCount, nextIncrement);
            }
            else {
                this._clearFilterMessage();
            }
        }
        else {
            this._clearFilterMessage();
        }
    }

    private _clearFilterMessage() {
        if (this._filterMessageArea) {
            this._filterMessageArea.clear();
            this.getElement().removeClass(TestPointsGrid._gridHasMessageFlag);
        }
    }

    private _customizeColumns(columns: TCMLite.ITestPointGridDisplayColumn[]) {
        let column, tagCellRenderer, typeColorCellRenderer, $gridCell, colorsProvider,
            typeName: string,
            $colorCell: JQuery,
            color;

        if (columns) {
            // Customize outcome and id because we override these columns.
            $.each(columns, (index: number, item: TCMLite.ITestPointGridDisplayColumn) => {
                if (Utils_String.ignoreCaseComparer(item.name, "TCM.TestPointOutcome") === 0) {
                    item["getCellContents"] = (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                        return this._getOutcomeColumn(dataIndex, column, columnOrder);
                    };
                }
                else if ((Utils_String.ignoreCaseComparer(item.type, "System.Int32") === 0) ||
                    (Utils_String.ignoreCaseComparer(item.type, "System.DateTime") === 0)) {
                    item["comparer"] = function (column, order, item1, item2) {
                        return item1[column.name] - item2[column.name];
                    };
                }
                else if (Utils_String.ignoreCaseComparer(item.name, "System.Tags") === 0) {
                    if (this.tagProviderDelegate) {
                        tagCellRenderer = function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            // "this" is the grid instance
                            return this.tagProviderDelegate(this, dataIndex, column, columnOrder);
                        };

                        item["canSortBy"] = false;
                        item["getCellContents"] = tagCellRenderer;
                    }
                }
                else if (item.isIdentity && this.identityDelegate) {
                    let identityCellRenderer = function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        return this.identityDelegate(this, rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, false);
                    };
                    item["getCellContents"] = identityCellRenderer;
                }
            });
        }
    }

    public _onColumnResize(column) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Utils"], (Module: typeof TMUtils_LAZY_LOAD) => {
            Module.getTestPlanManager().updateColumnOptions([{ refName: column.name, width: Math.round(column.width) }], false);
        });
    }

    private getContributionContext(): any {
        return this.getSelectedTestPoints();
    }

    private _getColumn(columnIndex: string) {
        let i: number,
            columns: any[] = this._columns,
            columnCount: number = this._columns.length;
        for (i = 0; i < columnCount; i++) {
            if (columns[i].index === columnIndex) {
                return columns[i];
            }
        }
    }


    private _getOutcomeColumn(dataIndex: number, column: any, columnOrder: number) {
        let $div: JQuery = $(domElem("div", "grid-cell")),
            $outcomeElement: JQuery,
            outcomeText: string,
            $outcomeTextElement: JQuery,
            width: any = Math.round(column.width) || 20;

        $div.css("width", (isNaN(width) ? width : width + "px"));

        outcomeText = super.getColumnText(dataIndex, column, columnOrder);
        $outcomeTextElement = $(domElem("span", "outcome-text"));
        $outcomeTextElement.text(outcomeText)
            .addClass("test-outcome-column-text")
            .css("max-width", $div.css("width"));

        $outcomeElement = $(domElem("div", "outcome-container"));
        $outcomeElement.addClass("testpoint-outcome-shade icon")
            .addClass(TestPointsGrid.getOutcomeShadeClassNameFromOutcomeText(outcomeText));

        //set the title property to have the tooltip set properly
        $div.attr("title", outcomeText)
            .append($outcomeElement)
            .append($outcomeTextElement);
        return $div;
    }

    public static getGridSortOrderList(sortOrder: TCMLite.IColumnSortOrderModel): Grids.IGridSortOrder[] {
        /// <summary>gets default soring done</summary>
        /// <returns type="Object">list of cloumns to ge sorted by default</returns>
        let sortColumns = [];
        if (sortOrder && sortOrder.index) {
            sortColumns.push(sortOrder as Grids.IGridSortOrder);
        }

        return sortColumns;
    }

    public static getOutcomeShadeClassNameFromOutcomeText(outcomeText: string): string {
        let className: string;

        switch (outcomeText) {
            case Resources.TestOutcome_Blocked:
                className = "bowtie-icon bowtie-math-minus-circle bowtie-icon-small";
                break;
            case Resources.TestOutcome_Passed:
            case Resources.TestPointState_Completed:
                className = "bowtie-icon bowtie-status-success bowtie-icon-small";
                break;
            case Resources.TestOutcome_Failed:
                className = "bowtie-icon bowtie-status-failure bowtie-icon-small";
                break;
            case Resources.TestOutcome_Error:
                className = "bowtie-icon bowtie-status-error bowtie-icon-small";
                break;
            case Resources.TestOutcome_NotExecuted:
                className = "bowtie-icon bowtie-not-executed bowtie-status-run-not-executed bowtie-icon-small";
                break;
            case Resources.TestOutcome_Timeout:
                className = "bowtie-icon bowtie-status-waiting bowtie-icon-small";
                break;
            case Resources.TestOutcome_Warning:
                className = "bowtie-icon bowtie-status-warning bowtie-icon-small";
                break;
            case Resources.TestOutcome_Aborted:
                className = "bowtie-icon bowtie-status-stop bowtie-icon-small";
                break;
            case Resources.TestPointState_Ready:
                className = "bowtie-icon bowtie-dot bowtie-icon-small";
                break;
            case Resources.TestPointState_InProgress:
                className = "bowtie-icon bowtie-status-run bowtie-icon-small";
                break;
            case Resources.TestOutcome_NotApplicable:
                className = "bowtie-icon bowtie-status-no-fill bowtie-no-fill-not-applicable bowtie-icon-small";
                break;
            case Resources.TestOutcome_Inconclusive:
                className = "bowtie-icon bowtie-status-no-fill bowtie-no-fill-not-applicable bowtie-icon-small";
                break;
            case Resources.TestPointState_Paused:
                className = "bowtie-icon bowtie-status-pause bowtie-icon-small";
                break;
            default:
                className = "bowtie-icon bowtie-dot bowtie-icon-small";
                break;
        }
        return className;
    }
}
