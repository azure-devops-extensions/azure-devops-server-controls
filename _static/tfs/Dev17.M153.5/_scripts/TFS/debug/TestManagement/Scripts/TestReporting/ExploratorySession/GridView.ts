/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import SessionListVM = require("TestManagement/Scripts/TestReporting/ExploratorySession/ListViewModel");
import ManualUtils = require("TestManagement/Scripts/TestReporting/ExploratorySession/Utils");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import UserSettings = require("TestManagement/Scripts/TestReporting/ExploratorySession/UserSettings");
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");

import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;

export interface ISessionGridViewOptions extends Grids.IGridOptions {
    viewModel: SessionListVM.SessionListViewModel;
}

export class SessionGridView extends Grids.GridO<ISessionGridViewOptions> {
    private _viewModel: SessionListVM.SessionListViewModel;
    private _fetchingInProgress: boolean;
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
    private _selectedFilterbyOption: string = ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_All;
    private _selectedGroupbyOption: string = ManualUtils.SessionGridGroupPivots.Group_By_ExploredWorkItems;
    private _sessionGridSortOrder: Grids.IGridSortOrder[];
    private _viewContext: CommonBase.ViewContext;
    private _resultIdentifiersNotCached: IDictionaryStringTo<boolean>;
    private _sortableColumnHeadersClass = ".grid-header-column.sortable";

    public initializeOptions(options: ISessionGridViewOptions) {
        options.columns = this.getColumns();
        options.gutter = {};
        options.asyncInit = false;
        options.payloadSize = 100;
        options.autoSort = false;
        options.allowMultiSelect = false;
        this._viewModel = options.viewModel;
        this._columns = options.columns;

        super.initializeOptions($.extend({
            sortOrder: this._getInitialSortOrder()
        }, options));
    }

    public initialize() {
        super.initialize();
        this._fetchingInProgress = false;
        this._disposalManager.addDisposable(this._viewModel.dataSource.subscribe((dataSource: Grids.IGridSource) => {
            this.setDataSource(dataSource.getSource(), dataSource.getExpandStates(), this.getColumns(), this._sessionGridSortOrder);

            this._setFirstDataRowAsSelected();
        }));
    }

    public dispose(): void {
        if (this._disposalManager) {
            this._disposalManager.dispose();
        }
    }

    public handleCommand(command: string): void {
        Diag.logVerbose("SessionGridView.handleCommand called with command " + command);

        let telemetryFeature: string = null;
        switch (command) {
            case ManualUtils.ExploratorySessionToolbarCommands.ExpandAll:
                this._viewModel.isCollapseEnabled = false;
                this.expandAll();
                telemetryFeature = TelemetryService.featureControlTabInXTSessionsGridView_ExpandAll;
                break;
            case ManualUtils.ExploratorySessionToolbarCommands.CollapseAll:
                this._viewModel.isCollapseEnabled = true;
                this.collapseAll();
                telemetryFeature = TelemetryService.featureControlTabInXTSessionsGridView_CollapseAll;
                break;
            default:
                break;
        }

        TelemetryService.publishEvent(telemetryFeature, TelemetryService.eventClicked, command);
    }

    public handlePivotChanged(command: string, filterType: Common.Filters): void {
        Diag.logVerbose("Session grid pivot changed. Filter: " + filterType + "and command " + command);

        switch (filterType) {
            case Common.Filters.GroupBy:
                this._selectedGroupbyOption = ManualUtils.ExploratorySessionToolbarCommands.mapGroupByCommandToPivot[command];
                this._sessionGridSortOrder = this._getSortOrder();
                if (this._selectedGroupbyOption === ManualUtils.SessionGridGroupPivots.Group_By_UnExploredWorkItems) {
                    $(".filters-section.left").hide();
                } else {
                    $(".filters-section.left").show();
                }
                break;
            case Common.Filters.Outcome:
                this._selectedFilterbyOption = ManualUtils.ExploratorySessionToolbarCommands.mapFilterByCommandToPivot[command];
                break;
        }

        this._viewModel.setDefaultFilters(this._selectedGroupbyOption, this._selectedFilterbyOption);
        this._updateResultsGridSource(this._selectedGroupbyOption, this._selectedFilterbyOption);
    }

    /// <summary>
    /// Called by Grid0 base class to get the column value for a row and column index
    /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
    /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
    /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
    /// <returns type="any" />
    /// </summary>
    public getColumnValue(dataIndex: number, columnIndex: string, columnOrder?: number): any {
        Diag.logVerbose("Getting session grid column value for dataIndex: " + dataIndex + "and columnIndex " + columnIndex);

        let sourceRowData: SessionListVM.IGridItem = this.getRowData(dataIndex);
        if (sourceRowData) {
            let data: ManualUtils.ISessionGridViewModel = this._viewModel.getResultFromCache(sourceRowData.id);
            if (data) {
                switch (columnIndex) {
                    case ManualUtils.ColumnIndices.Title:
                        return data.title;
                    case ManualUtils.ColumnIndices.State:
                        return data.state;
                }
            }

            if (sourceRowData.rowType !== ManualUtils.GridRowType.FlatWorkItem) {
                switch (columnIndex) {
                    case ManualUtils.ColumnIndices.BugCount:
                        return sourceRowData.bugCount > 0 ? sourceRowData.bugCount.toString() : Resources.ExploratorySessionGridCell_ZeroWorkItemCount;
                    case ManualUtils.ColumnIndices.TaskCount:
                        return sourceRowData.taskCount > 0 ? sourceRowData.taskCount.toString() : Resources.ExploratorySessionGridCell_ZeroWorkItemCount;
                    case ManualUtils.ColumnIndices.TestCaseCount:
                        return sourceRowData.testCaseCount > 0 ? sourceRowData.testCaseCount.toString() : Resources.ExploratorySessionGridCell_ZeroWorkItemCount;
                    case ManualUtils.ColumnIndices.StartTime:
                        return new Date(sourceRowData.startTime);
                    case ManualUtils.ColumnIndices.SessionId:
                        return sourceRowData.sessionId.toString();
                    case ManualUtils.ColumnIndices.ItemType:
                        return sourceRowData.workItemType;
                    case ManualUtils.ColumnIndices.Owner:
                        return sourceRowData.owner.displayName;
                }
            } else {
                if (data) {
                    // if rowtype is workitem filed then we are showing type and title on corresponding columns generated through group by option 
                    // groupby on session, Owner: workitemType and StartTIme: title
                    // groupby on session owner, owner: workitemId
                    switch (columnIndex) {
                        case ManualUtils.ColumnIndices.Owner:
                            return sourceRowData.workItemType;
                        case ManualUtils.ColumnIndices.StartTime:
                            return data.title;
                        case ManualUtils.ColumnIndices.ItemType:
                            return data.type;
                    }
                }
            }
        }

        return Utils_String.empty;
    }

    /// <summary>
    /// Called by Grid0 base class to cache the rows above and below the visible view port.
    /// </summary>
    public cacheRows(aboveRange: number[][], visibleRange: number[][], belowRange: number[][]) {
        let itemsNeeded = false;
        //Combined row ids from aboveRange, visibleRange and belowRange from grid source.
        let gridSourceRowIds: number[] = [];

        this._addToSourceRowIds(aboveRange, gridSourceRowIds);
        this._addToSourceRowIds(visibleRange, gridSourceRowIds);
        this._addToSourceRowIds(belowRange, gridSourceRowIds);

        //Clear this dictionary with every call to cacheRows.
        this._resultIdentifiersNotCached = {};

        gridSourceRowIds.forEach((gridSourceRowId) => {
            let gridSourceValue: SessionListVM.IGridItem = this.getRowData(gridSourceRowId);
            if (gridSourceValue.rowType === ManualUtils.GridRowType.WorkItemExplored || gridSourceValue.rowType === ManualUtils.GridRowType.FlatWorkItem) {
                if (!this._viewModel.getResultFromCache(gridSourceValue.id)) {
                    this._resultIdentifiersNotCached[gridSourceValue.id] = true;
                    itemsNeeded = true;
                }
            }
        });

        if (itemsNeeded) {
            Diag.logVerbose("Cache items need to be refreshed. Performing fetch of results");

            //Executes this.fetchResults() after the specified amount of time. Cancels any pending requests with the name 'exploratorySessionGridPagination'. 
            this.delayExecute("exploratorySessionGridPagination", ManualUtils.ExploratorySessionConstant.PAGINATION_DELAY, true, () => {
                this.fetchResults();
            });
        }
    }

    /// <summary>
    /// Called by Grid0 base class whenever sorting option change on column.
    /// </summary>
    public onSort(sortOrder: Grids.IGridSortOrder[], sortColumns?: Grids.IGridColumn[]) {
        if (sortOrder && sortOrder.length > 0) {
            Diag.logVerbose("Sorting option changed. Sort order: " + sortOrder.join(", "));
            this._sessionGridSortOrder = sortOrder;
            this._viewModel.onSortUpdateDataSource(sortOrder[0].index, sortOrder[0].order);

            //telemetry for sorted column
            TelemetryService.publishEvents(TelemetryService.featureXTSessionsGridView_Sort, {
                "ColumnName": sortOrder[0].index,
                "SortingOrder": sortOrder[0].order
            });
        }
    }

    public fetchResults(): void {

        let resultIdentifiersToFetch: number[] = [];

        if (!this._fetchingInProgress) {
            $.each(this.getResultIdentifiersNotCached(), (resultIdentifier) => {
                resultIdentifiersToFetch.push(resultIdentifier);
                //Stop the loop when the resultIdentifiersToFetch exceeds payload size.
                return resultIdentifiersToFetch.length < this.getResultsGridPageSize();
            });

            if (resultIdentifiersToFetch.length > 0) {
                this._fetchingInProgress = true;
                Diag.logVerbose("Fetching results for the grid for identifiers: " + resultIdentifiersToFetch.join(", "));

                this._viewModel.getResultsForGrid(resultIdentifiersToFetch)
                    .then((pagedDataFromServer: ManualUtils.ISessionGridViewModel[]) => {
                        Diag.logVerbose("Fetched results for the grid for identifiers");
                        this._fetchingInProgress = false;
                        this._cacheDataRows(pagedDataFromServer);
                        this.redraw();
                        this.fetchResults();
                    });
            }
        }
    }

    public selectedIndexChanged(selectedRowIndex, selectedDataIndex) {
        Diag.logVerbose("Session grid selected index changed. SelectedRowIndex: " + selectedRowIndex + "and SelectedDataIndex " + selectedDataIndex);
        super.selectedIndexChanged(selectedRowIndex, selectedDataIndex);
        let rowData = this.getRowData(selectedDataIndex);
        if (rowData) {
            this._viewModel.summaryViewWorkItem(rowData);
        }
    }

    public applySettings() {
        let setting = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings();
        this._selectedGroupbyOption = ManualUtils.ExploratorySessionToolbarCommands.mapGroupByCommandToPivot[setting.groupBySetting];
        this._selectedFilterbyOption = ManualUtils.ExploratorySessionToolbarCommands.mapFilterByCommandToPivot[setting.filterBySetting];

    }

    //Getter for unit tests
    public getResultIdentifiersNotCached(): IDictionaryStringTo<boolean> {
        return this._resultIdentifiersNotCached;
    }

    //Getter for unit tests
    public getSelectedFilterByOption(): string {
        return this._selectedFilterbyOption;
    }

    //Getter for unit tests
    public getSelectedGroupByOption(): string {
        return this._selectedGroupbyOption;
    }

    //Getter for unit tests;
    public getResultsGridPageSize(): number {
        return Common.TestResultConstants.PAGE_SIZE;
    }

    // Getter for unit tests
    public getSessionGridSortOrder(): Grids.IGridSortOrder[] {
        return this._sessionGridSortOrder;
    }

    public getColumns(): Grids.IGridColumn[] {
        Diag.logVerbose("Getting session grid columns");

        let columns: Grids.IGridColumn[] = [];
        switch (this._selectedGroupbyOption) {

            case ManualUtils.SessionGridGroupPivots.Group_By_ExploredWorkItems:
                columns.push({
                    index: ManualUtils.ColumnIndices.RowSelector,
                    text: "",
                    width: 20,
                    canSortBy: false,
                    rowCss: "grid-expand-collapse",
                    tooltip: Resources.ExpandOrCollapseHeader
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.Id,
                    text: Resources.ExploratorySessionGridHeader_ID,
                    width: 100,
                    canSortBy: true,
                    getCellContents: delegate(this, this._getWorkItemIdCellContents)
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.ItemType,
                    text: Resources.ExploratorySessionGridHeader_WorkItemType,
                    width: 110,
                    canSortBy: true
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.Title,
                    text: Resources.ExploratorySessionGridHeader_Title,
                    width: 450,
                    canSortBy: false
                });

                break;
            case ManualUtils.SessionGridGroupPivots.Group_By_Sessions:
                columns.push({
                    index: ManualUtils.ColumnIndices.RowSelector,
                    text: "",
                    width: 20,
                    canSortBy: false,
                    rowCss: "grid-expand-collapse",
                    tooltip: Resources.ExpandOrCollapseHeader
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.SessionId,
                    text: Resources.ExploratorySessionGridHeader_ID,
                    width: 100,
                    canSortBy: true,
                    getCellContents: delegate(this, this._getWorkItemIdCellContents)
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.Owner,
                    text: Resources.ExploratorySessionGridHeader_Owner,
                    width: 150,
                    canSortBy: true
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.StartTime,
                    text: Resources.ExploratorySessionGridHeader_StartTime,
                    width: 400,
                    canSortBy: false
                });

                break;
            case ManualUtils.SessionGridGroupPivots.Group_By_SessionOwners:
                columns.push({
                    index: ManualUtils.ColumnIndices.RowSelector,
                    text: "",
                    width: 20,
                    canSortBy: false,
                    rowCss: "grid-expand-collapse",
                    tooltip: Resources.ExpandOrCollapseHeader
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.OwnerName,
                    text: Resources.ExploratorySessionGridHeader_OwnerName,
                    width: 150,
                    canSortBy: true,
                    getCellContents: delegate(this, this._getWorkItemIdCellContents)
                });
                // we are using this column only to show filed workitems without column heading
                columns.push({
                    index: ManualUtils.ColumnIndices.ItemType,
                    text: "",
                    width: 100,
                    canSortBy: false
                });
                // we are using this column only to show filed workitems without column heading
                columns.push({
                    index: ManualUtils.ColumnIndices.Title,
                    text: "",
                    width: 400,
                    canSortBy: false
                });

                break;
            case ManualUtils.SessionGridGroupPivots.Group_By_None:
            case ManualUtils.SessionGridGroupPivots.Group_By_UnExploredWorkItems:
                columns.push({
                    index: ManualUtils.ColumnIndices.RowSelector,
                    text: "",
                    width: 20,
                    canSortBy: false,
                    rowCss: "grid-expand-collapse" ,
                    tooltip: Resources.ExpandOrCollapseHeader
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.Id,
                    text: Resources.ExploratorySessionGridHeader_ID,
                    width: 100,
                    canSortBy: true,
                    getCellContents: delegate(this, this._getWorkItemIdCellContents)
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.ItemType,
                    text: Resources.ExploratorySessionGridHeader_WorkItemType,
                    width: 110,
                    canSortBy: true
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.Title,
                    text: Resources.ExploratorySessionGridHeader_Title,
                    width: 400,
                    canSortBy: false
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.State,
                    text: Resources.ExploratorySessionGridHeader_State,
                    width: 100,
                    canSortBy: false
                });
                columns.push({
                    index: ManualUtils.ColumnIndices.AssignedTo,
                    text: Resources.ExploratorySessionGridHeader_AssignedTo,
                    width: 150,
                    canSortBy: false,
                    getCellContents: delegate(this, this._getAssignedToCellContents)
                });
                break;

        }

        if (this._selectedGroupbyOption !== ManualUtils.SessionGridGroupPivots.Group_By_None &&
            this._selectedGroupbyOption !== ManualUtils.SessionGridGroupPivots.Group_By_UnExploredWorkItems) {
            switch (this._selectedFilterbyOption) {
                case ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_All:
                    columns.push({
                        index: ManualUtils.ColumnIndices.BugCount,
                        text: Resources.ExploratorySessionGridHeader_Bugs,
                        width: 70,
                        canSortBy: true
                    });
                    columns.push({
                        index: ManualUtils.ColumnIndices.TaskCount,
                        text: Resources.ExploratorySessionGridHeader_Tasks,
                        width: 70,
                        canSortBy: true
                    });
                    columns.push({
                        index: ManualUtils.ColumnIndices.TestCaseCount,
                        text: Resources.ExploratorySessionGridHeader_Testcases,
                        width: 70,
                        canSortBy: true
                    });

                    break;
                case ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_Bug:
                    columns.push({
                        index: ManualUtils.ColumnIndices.BugCount,
                        text: Resources.ExploratorySessionGridHeader_Bugs,
                        width: 70,
                        canSortBy: true
                    });

                    break;

                case ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_TestCase:
                    columns.push({
                        index: ManualUtils.ColumnIndices.TestCaseCount,
                        text: Resources.ExploratorySessionGridHeader_Testcases,
                        width: 70,
                        canSortBy: true
                    });

                    break;

                case ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_Task:
                    columns.push({
                        index: ManualUtils.ColumnIndices.TaskCount,
                        text: Resources.ExploratorySessionGridHeader_Tasks,
                        width: 70,
                        canSortBy: true
                    });

                    break;
            }
        }
        return columns;
    }

    protected _getNextHeaderElement($target: JQuery): JQuery{
        return $target.nextAll(this._sortableColumnHeadersClass).eq(0);
    }

    protected _getPreviousHeaderElement($target: JQuery): JQuery{
       return $target.prevAll(this._sortableColumnHeadersClass).eq(0);
    }

    protected _getFocusableHeaderElement(): JQuery{
        return this._getHeaderSortColumn(this._sortableColumnHeadersClass);
    }

    private _getInitialSortOrder() {
        this._sessionGridSortOrder = [
            { index: ManualUtils.ColumnIndices.Id, order: "desc" }
        ];

        return this._sessionGridSortOrder;
    }

    private _getSortOrder(): Grids.IGridSortOrder[] {

        switch (this._selectedGroupbyOption) {

            case ManualUtils.SessionGridGroupPivots.Group_By_ExploredWorkItems:
                this._sessionGridSortOrder = [
                    { index: ManualUtils.ColumnIndices.Id, order: "desc" }
                ];

                break;
            case ManualUtils.SessionGridGroupPivots.Group_By_Sessions:
                this._sessionGridSortOrder = [
                    { index: ManualUtils.ColumnIndices.SessionId, order: "desc" }
                ];

                break;
            case ManualUtils.SessionGridGroupPivots.Group_By_SessionOwners:
                this._sessionGridSortOrder = [
                    { index: ManualUtils.ColumnIndices.OwnerName, order: "asc" }
                ];

                break;
            case ManualUtils.SessionGridGroupPivots.Group_By_None:
            case ManualUtils.SessionGridGroupPivots.Group_By_UnExploredWorkItems:
                this._sessionGridSortOrder = [
                    { index: ManualUtils.ColumnIndices.Id, order: "desc" }
                ];

                break;
        }

        return this._sessionGridSortOrder;
    }

    private _cacheDataRows(dataRows: ManualUtils.ISessionGridViewModel[]) {
        if (dataRows) {
            dataRows.forEach((dataRow: ManualUtils.ISessionGridViewModel) => {
                this._viewModel.addResultToCache(dataRow.id, dataRow);
                delete this._resultIdentifiersNotCached[dataRow.id];
            });
        }
    }

    private _addToSourceRowIds(range: number[][], gridSourceRowIds: number[]): void {
        if (range && gridSourceRowIds) {
            for (let i = 0, len = range.length; i < len; i++) {
                gridSourceRowIds.push(range[i][1]);
            }
        }
    }

    private _updateResultsGridSource(groupBy: string, outcomeFilter: string): void {
        this._viewModel.updateDataSource(groupBy, outcomeFilter);
        this._setFirstDataRowAsSelected();
    }

    private _setFirstDataRowAsSelected(): void {
        this.setSelectedRowIndex(0);
    }

    private _getWorkItemIdCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number): JQuery {
        let cell: JQuery = super._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        let sourceRowData: SessionListVM.IGridItem = this.getRowData(dataIndex);
        if (sourceRowData.rowType === ManualUtils.GridRowType.WorkItemExplored || sourceRowData.rowType === ManualUtils.GridRowType.FlatWorkItem) {
            let data: ManualUtils.ISessionGridViewModel = this._viewModel.getResultFromCache(sourceRowData.id);
            if (data) {
                //removing href attr, because it was causing an issue of hiding header chart section
                let content: JQuery = $("<a />").text(sourceRowData.id.toString()).addClass("workitem-id").attr("href", data.url).attr("target", "_blank").attr("rel", "nofollow noopener noreferrer");
                cell.contents().filter((index: number, elem: Element) => {
                    // nodeType 3 represents textual content in an element or attribute
                    return elem.nodeType === 3;
                }).replaceWith(content);
            }

        } else if (column.index === ManualUtils.ColumnIndices.OwnerName && sourceRowData.rowType === ManualUtils.GridRowType.SessionOwner) {
            return this._getOwnerNameCellContents(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        }

        return cell;
        }

    private _getOwnerNameCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number): JQuery {
        let cell: JQuery = super._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        let sourceRowData: SessionListVM.IGridItem = this.getRowData(dataIndex);

        if (sourceRowData.rowType === ManualUtils.GridRowType.SessionOwner || sourceRowData.rowType === ManualUtils.GridRowType.Session ) {
            let identity: TFS_Host_TfsContext.IContextIdentity = sourceRowData.owner;
            let icon: JQuery = IdentityImage.identityImageElement(TFS_Host_TfsContext.TfsContext.getDefault(), identity.id, null, "small", null, "");
            let displayName: JQuery = $("<div class='display-name' />").text(identity.displayName);
            RichContentTooltip.addIfOverflow(identity.displayName, displayName);
            let content: JQuery = $("<div class='owner-info' />").append(icon).append(displayName);
            cell.contents().filter((index: number, elem: Element) => {
                // nodeType 3 represents textual content in an element or attribute
                return elem.nodeType === 3;
            }).replaceWith(content);
        }
        return cell;
    }

    private _getAssignedToCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
        let cell: JQuery = super._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        let sourceRowData: SessionListVM.IGridItem = this.getRowData(dataIndex);
        let data: ManualUtils.ISessionGridViewModel = this._viewModel.getResultFromCache(sourceRowData.id);
        if (data) {
            let assignedTo: string = data.assignedTo;
            if (assignedTo) {
                assignedTo = assignedTo.substring(0, assignedTo.indexOf("<"));
            } else {
                assignedTo = "";
            }

            let content: JQuery = $("<div />").text(assignedTo);
            RichContentTooltip.addIfOverflow(assignedTo, content);

            cell.contents().filter((index: number, elem: Element) => {
                // nodeType 3 represents textual content in an element or attribute
                return elem.nodeType === 3;
            }).replaceWith(content);
        }

        return cell;
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/GridView", exports);
