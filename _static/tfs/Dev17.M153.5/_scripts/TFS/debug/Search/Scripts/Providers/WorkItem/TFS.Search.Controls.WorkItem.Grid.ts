"use strict"

import Culture = require("VSS/Utils/Culture");
import Controls = require("VSS/Controls");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Grids = require("VSS/Controls/Grids");
import Performance = require("Search/Scripts/Common/TFS.Search.Performance");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import TFS_UI = require("VSS/Utils/UI");
import TFS_UI_Tags = require("WorkItemTracking/Scripts/TFS.UI.Tags");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import WorkItemContracts = require("Search/Scripts/Contracts/TFS.Search.WorkItem.Contracts");

import * as Models from "Search/Scripts/React/Models";
import { renderWorkItemTypeIcon } from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { WorkItemConstants } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import { WorkItemCommon, Utils } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Common";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { ISortOption } from "Search/Scripts/React/Models";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import domElem = TFS_UI.domElem;
export const GRID_PREFERENCE_KEY: string = "WorkitemSearch/GridPreferences";

export interface IUserPreferenceRestorable {
    restorePreference: Function;
}

export class WorkItemGrid extends Grids.GridO<any> implements IUserPreferenceRestorable {
    private _witTypeColorsMap: IDictionaryStringTo<string>;
    private _localSettingsService: Settings.LocalSettingsService;
    private _actionCreator: ActionCreator;
    private _dtf: Culture.IDateTimeFormatSettings;
    private _previousSelectedId: number
    private _source: Array<any>;
    private _sortOptions: Array<ISortOption>;
    private _storesHub: StoresHub;

    constructor(options?) {
        super(options);
        this._dtf = Culture.getCurrentCulture().dateTimeFormat;
        this._witTypeColorsMap = this._options.witTypeColorsMap;
        this._localSettingsService = this._options.localSettingsService || Service.getLocalService(Settings.LocalSettingsService);
        this._source = this._options.source;
        this._sortOptions = this._options.sortOptions || [];
        this._actionCreator = this._options.actionCreator;
        this._previousSelectedId = -1;
        this._storesHub = this._options.storesHub;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            gutter: {
                contextMenu: false,
            },
            autoSort: !options.isServerSortEnabled,
        }, options));
    }

    public initialize() {
        this.initializeColumns();
        super.initialize();
        this._bind("columnresize", Utils_Core.delegate(this, this.onColumnResize));
        this._bind("selectionchanged", Utils_Core.delegate(this, this._onSelectionChanged));
    }

    /**
     * Initializes the columns in the grid
     */
    public initializeColumns(cols?): void {
        this._options.columns = cols
            ? this._getColumns(cols)
            : this._getColumns(this._options.columns);
    }

    public set witTypeColorsMap(colorsMap: any) {
        this._witTypeColorsMap = colorsMap;
    }

    public set source(source: Array<any>) {
        this._source = source;
    }

    public set sortOptions(sortOptions: Array<any>) {
        this._sortOptions = sortOptions;
    }

    /**
     * Initializes the data source of the grids with an array which is sorted on some field.
     */
    public initializeDataSource(supressRedraw?: boolean): void {
        super.initializeDataSource(supressRedraw);
        // Compute the sort order so as to sort the grid as per the intitial values in the sort control.
        let sortOrders: Array<Grids.IGridSortOrder> = [];

        if (this._options.isGridClientSortEnabled || this._options.isServerSortEnabled) {
            (this._options.columns as Array<Grids.IGridColumn>).forEach((value, index) => {
                this._sortOptions.forEach((sortOption, indexOfSortOption) => {
                    if (Utils_String.ignoreCaseComparer(value.name, sortOption.field) === 0) {
                        sortOrders.push({
                            index: index,
                            order: sortOption.sortOrder
                        });
                    }
                })
            });
        }

        // Case 1. When client side sort is enabled - SortOrders would be populated and grid would be instantiated in autoSort mode
        // hence setting data source with sortOrder would sort the results(grid handles it internally);
        // Case 2. When server side sort is enabled - SortOrders would be populated and grid would be instantiated in non-autoSort mode
        // setting data source will just set the sort icons in corresponding columns, without actually sorting the data set. It serves our purpose as
        // the data set in response is already sorted from server.
        this.setDataSource(this._source, null, null, sortOrders);
    }

    public _dispose() {
        // Add code to dispose if necessary.
        this._unbind("columnresize");
        this._unbind(window.document, "mousemove mouseup");
        super._dispose();
    }

    /**
     * Method called when the grid columns are clicked. sortColumns is null when called exlicitly from any other methods within this class.
     * It is populated whenever the method is called on click actions on grid columns headers.
     * @param sortOrder
     * @param sortColumns
     */
    public onSort(sortOrder: any, sortColumns?: any): any {
        let numOfColumns = sortOrder.length,
            sortOptions: ISortOption[];

        // We want changeSortCriteria action for the following scenarios
        // 1. When only one column is clicked and client side sort is enabled to sort on the single column so that both grid and sort control are in sync.
        // 2. When server side sort is enabled. Because we want to issue new search request to obtained new set of sorted result set from server.
        if (sortColumns &&
            (this._options.isServerSortEnabled ||
                (this._options.isGridClientSortEnabled && numOfColumns === 1))) {
            sortOptions = sortOrder.map((v, i) => {
                let field = sortColumns[i].name;
                return {
                    field: field,
                    sortOrder: v.order,
                } as ISortOption
            });

            // Create work item search results sort criteria action. 
            // This action notifies both sort control in results info view and the grid instance to update results set sort order.
            let supressNavigate = this._storesHub.searchResultsStore.totalResultsCount
                <= Search_Constants.SearchConstants.WorkItemSearchTakeResults;

            this._actionCreator
                .changeSearchResultsSortCriteria(
                sortOptions,
                this._options.isServerSortEnabled,
                Models.SearchProvider.workItem,
                supressNavigate, false);

            this._logSortColumns(sortColumns);
        }
        else {
            this._performSorting(sortOrder, sortColumns);
        }

        return false;
    }

    /**
     * Method to update the sortOrder as per GridO's contract given the refernce name of the column and the sorting order(asc or desc)
     * Method is invoked whenver the grid's header is clicked or when the sort criteria is modified in the sort control.
     * @param fieldReferenceName
     * @param order
     */
    public setSortOrder(sortOptions: ISortOption[]): Array<any> {
        let sortOrder: Grids.IGridSortOrder[] = [];
        (this._options.columns as Array<Grids.IGridColumn>).forEach((value, index) => {
            sortOptions.forEach((sortOption, indexOfSortOption) => {
                // find the index of the column in the grid currently drawn
                if (value.name && Utils_String.ignoreCaseComparer(value.name, sortOption.field) === 0) {
                    sortOrder.push({
                        index: index,
                        order: sortOption.sortOrder
                    });
                }
            });
        });

        if (sortOrder) {
            this._performSorting(sortOrder);
        }

        return this._dataSource;
    }

    /**
     * onOpenRowDetail is a function supported by GridO which binds the grid row to double click event.
     * Overriding the function to open the modal dialog when the work item is clicked in the list view.
     * @param eventArgs
     */
    public onOpenRowDetail(eventArgs): any {
        if (eventArgs.dataIndex < this._dataSource.length) {
            this._actionCreator.invokeActiveRow(
                this._dataSource[eventArgs.dataIndex],
                eventArgs.dataIndex,
                this);
        }
    }

    /**
     * Restore grid preferences such as sort order, column widths which were set implicitly on user actions.
     */
    public restorePreference(): void {
        var gridPreference = this._localSettingsService.read(GRID_PREFERENCE_KEY, null, Settings.LocalSettingsScope.Global);
        if (gridPreference &&
            gridPreference.listViewPreferences) {
            if (gridPreference.listViewPreferences.sortOrder &&
                !this._options.isGridClientSortEnabled &&
                !this._options.isServerSortEnabled) {
                // TODO: retrieve sort order (with column id's) and map accordingly to current index and then sort on them.
                super.onSort(gridPreference.listViewPreferences.sortOrder);
                this.setSelectedRowIndex(0);
            }

            if (gridPreference.listViewPreferences.columnWidth) {
                (gridPreference.listViewPreferences.columnWidth as Array<any>).forEach((value, index) => {
                    this.setColumnOptions(value.name, {
                        width: value.width
                    });
                });

                this.redraw();
                this.setSelectedRowIndex(0);
            }
        }

        return gridPreference;
    }

    /**
     * set preferences e.g sort order and column width on user explicit actions.
     * @param sortOrder
     * @param columnWidth
     */
    public setPreferences(
        sortOrder: any,
        columnWidth?: any): any {
        let gridPreference: any = this._localSettingsService.read(GRID_PREFERENCE_KEY, null, Settings.LocalSettingsScope.Global) || {};

        if (!gridPreference.listViewPreferences) {
            gridPreference.listViewPreferences = {};
            gridPreference.listViewPreferences.sortOrder = [];
            gridPreference.listViewPreferences.columnWidth = [];
        }

        if (sortOrder) {
            gridPreference.listViewPreferences.sortOrder = sortOrder;
        }

        if (columnWidth) {
            gridPreference.listViewPreferences.columnWidth = columnWidth;
        }

        // store user preferences
        // TODO: store sort order using column names not just ids'(may have to rework here in case add columns feature is implemented)
        this._localSettingsService.write(GRID_PREFERENCE_KEY, gridPreference, Settings.LocalSettingsScope.Global);
        return gridPreference;
    }

    /**
     * Invoked on column resize event. The method sets the column width of the affected column in order to restore the same setting
     * on further queries.
     * @param e
     * @param column
     */
    public onColumnResize(e, column: any): void {
        let gridPreference: any = this._localSettingsService.read(GRID_PREFERENCE_KEY, null, Settings.LocalSettingsScope.Global) || {};
        var columnWidth = [];

        if (gridPreference.listViewPreferences && gridPreference.listViewPreferences.columnWidth) {
            // replace existing width preference.
            columnWidth = (gridPreference.listViewPreferences.columnWidth as Array<any>).map((value, index) => {
                if (Utils_String.ignoreCaseComparer(column.name, value.name) === 0) {
                    value.width = column.width;
                }

                return value;
            });
        }

        // concat new preference if not found
        let isColumnPresent = columnWidth.map((value, index) => {
            return Utils_String.ignoreCaseComparer(value.name, column.name) === 0;
        }).indexOf(true) !== -1;

        if (!isColumnPresent) {
            columnWidth = columnWidth.concat([{
                name: column.name,
                width: column.width
            }]);
        }

        return this.setPreferences(null, columnWidth);
    }

    private _getTagCellRenderer(): Function {
        return (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {
            return TFS_UI_Tags.TagUtilities.renderTagCellContents(this, dataIndex, column, columnOrder);
        };
    }

    private _getTypeCellColorRenderer(): Function {
        return (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {
            let $gridCell = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder),
                $colorOrIconCell = this._getColorOrIconCell(this._dataSource, dataIndex);
            $colorOrIconCell.prependTo($gridCell);

            return $gridCell;
        };
    }

    private _getColumnValueDelegate(columns: any) {
        let cols = $.extend({}, columns),
            colsArray = $.map(cols, function (value, index) {
                return [value];
            });
        return (dataIndex, columnIndex, columnOrder) => {
            let _dataSource: Array<WorkItemContracts.WorkItemResult> = this._dataSource as Array<WorkItemContracts.WorkItemResult>;
            if (columnIndex < colsArray.length && dataIndex < _dataSource.length) {
                let key = colsArray[columnIndex].name,
                    flattenFields = _dataSource[dataIndex].flattenFields,
                    value: string = flattenFields && flattenFields[key] ? flattenFields[key].value : "";

                if (value) {
                    let isDateTimeColum = Utils_String.ignoreCaseComparer("system.createddate", key) === 0 ||
                        Utils_String.ignoreCaseComparer("system.changeddate", key) === 0,
                        isAssigedToColum = Utils_String.ignoreCaseComparer("system.assignedto", key) === 0;
                    let content: string = !isAssigedToColum
                        ? (isDateTimeColum
                            ? Utils_Date
                                .localeFormat(
                                new Date(value),
                                this._dtf.ShortDatePattern + " " + this._dtf.ShortTimePattern)
                            : value)
                        : value.replace(/(<[\/<>\w\.]+@[\/<>\w\.]+>)/g, ""); // remove email from alias.
                    return content;
                }

                return value;
            }
        };
    }

    private _getColorOrIconCell(dataSource: WorkItemContracts.WorkItemResult[], dataIndex: number): JQuery {
        let workItemName:string = dataSource[dataIndex].flattenFields["system.workitemtype"].value,
            projectName:string = dataSource[dataIndex].project,
            $iconOrColorElement:JQuery = $("<span/>").addClass("search-work-item-icon-color");
   
            renderWorkItemTypeIcon($iconOrColorElement[0], workItemName, projectName);

        return $iconOrColorElement;
    }

    private _getColumns(cols: Array<any>): Array<any> {
        var tagCellRenderer, typeColorCellRenderer, identityCellRenderer, idRenderer, displayColumns = new Array<any>();
        if (cols && $.isArray(cols)) {
            for (var i = 0, l = cols.length; i < l; i++) {
                // Clone the column for grid, so that modifications do not affect
                // queryResultsModel. This is important for column move.
                let column = $.extend({}, cols[i]),
                    previewOrientation = this._options.previewPaneOrientation && this._options.previewPaneOrientation !== "right" ? "bottom" : "right";
                column.index = i;
                column.text = WorkItemCommon.FIELD_METADATA[column.name].displayName;
                column.canSortBy = WorkItemCommon.FIELD_METADATA[column.name].canSortBy;
                column.comparer = WorkItemCommon.FIELD_METADATA[column.name].comparer;
                column.hidden = this._isColumnHidden(column.name, previewOrientation);
                column.width = WorkItemCommon.FIELD_METADATA[column.name].width;

                if (Utils_String.ignoreCaseComparer(column.name, "system.tags") === 0) {
                    column.getCellContents = this._getTagCellRenderer();
                }
                else if (Utils_String.ignoreCaseComparer(column.name, "system.title") === 0) {
                    column.getCellContents = this._getTypeCellColorRenderer();
                }

                column.getColumnValue = this._getColumnValueDelegate(cols);
                displayColumns.push(column);
            }
        }

        return displayColumns;
    }

    private _isColumnHidden(columnName: string, orientation): boolean {
        let isColumnDateField = (Utils_String.ignoreCaseComparer(columnName, "system.createddate") === 0 ||
            Utils_String.ignoreCaseComparer(columnName, "system.changeddate") === 0);
        // If column is a date field and the client sort feature and server sort feature are disabled then hide the fields.
        if (isColumnDateField &&
            !this._options.isGridClientSortEnabled &&
            !this._options.isServerSortEnabled) {
            return true;
        }
        else {
            return WorkItemCommon.FIELD_METADATA[columnName].hidden[orientation];
        }
    }

    private _onSelectionChanged(event, args): void {
        this.delayExecute("WorkItemSearchResultsGridActiveRowChanged", 300, true, Utils_Core.delegate(this, () => {
            let selectedIndex = args.selectedIndex;
            if (selectedIndex >= 0 &&
                selectedIndex < this._dataSource.length &&
                this._dataSource[selectedIndex]) {
                let workItemIdValue = this._dataSource[selectedIndex].flattenFields["system.id"].value,
                    workItemId = workItemIdValue ? parseInt(workItemIdValue) : -1;

                if (this._previousSelectedId !== workItemId) {
                    this._previousSelectedId = workItemId;
                    this._actionCreator.changeActiveRow(this._dataSource[selectedIndex], selectedIndex, this);
                }
            }
        }));
    }

    private _performSorting(sortOrder: any, sortColumns?: any): void {
        // Set the sort order. This is the only API exposed to set the sort order.
        this.setDataSource(this._dataSource, null, null, sortOrder, null, true);
        // Perform sort. Since auto sort is disabled we have to explicitly call trySorting otherwise setDataSource sorts the source as well.
        this._trySorting(sortOrder, sortColumns);

        // Call layout as the grid isn't redrawn yet since setDataSource was called with "supressRedraw" as true.
        this.layout();

        // Not saving user preferences related to sort order when server side sorting is enabled as it's already populated in the url
        if (!this._options.isServerSortEnabled) {
            this.setPreferences(sortOrder);
        }

        if (sortColumns) {
            this._logSortColumns(sortColumns);
        }

        this.setSelectedRowIndex(0);
    }

    private _logSortColumns(sortColumns: any): void {
        let columnNames = (sortColumns as Array<Grids.IGridColumn>).map((value, index) => {
            return value.name;
        }).join(",");

        TelemetryHelper.TelemetryHelper.traceLog({
            "WorkItemSearchResultsGridViewSortColumns": columnNames
        });
    }
}

export class WorkItemGridControl extends Controls.BaseControl {
    private _resultsGrid: WorkItemGrid;
    private _config: any;
    private _localSettingsService: Settings.LocalSettingsService;
    private _storesHub: StoresHub;

    constructor(options?) {
        super(options);
        this._localSettingsService = Service.getLocalService(Settings.LocalSettingsService);
        this._storesHub = this._config.storesHub;
        if (this._storesHub) {
            if (this._options.isGridClientSortEnabled ||
                this._options.isServerSortEnabled) {
                this._storesHub.sortCriteriaStore.addChangedListener(Utils_Core.delegate(this, this._onSortCriteriaChanged));
            }

            this._storesHub.searchResultsStore.addChangedListener(Utils_Core.delegate(this, this._onSearchResultsChanged));
            this._storesHub.resultsViewStore.addChangedListener(Utils_Core.delegate(this, this._onResultsViewModeChanged));
        }
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(options);
        // store the snipped grid view configuration.
        this._config = $.extend({}, options);
    }

    public initialize() {
        super.initialize();
        this._element.hide();
        this._resultsGrid = <WorkItemGrid>Controls.BaseControl.createIn(WorkItemGrid, this._element, $.extend(this._config, {
            header: true,
            source: [],
            columns: [],
            sharedMeasurements: false,
            localSettingsService: this._localSettingsService,
            cssClass: Search_Constants.SearchConstants.WorkItemGridCssClass,
            witTypeColorsMap: {}
        }));
    }

    private _onSortCriteriaChanged(): void {
        let mode = this._storesHub.resultsViewStore.viewMode;
        // sort the results only iff the current view mode is list view, and the total number of results for query is <= 1000.
        // Since for queries having > 1000, sorting results will issue a new search request.
        if (mode === "list" && this._shouldSortOnClient() && !this._isSortByRelevanceInServerSort()) {
            let sortedItems = this._resultsGrid.setSortOrder(this._storesHub.sortCriteriaStore.sortOptions);
            // update store to contain the sorted results
            this._storesHub.searchResultsStore.items = sortedItems;
        }
    }

    private _onSearchResultsChanged(): void {
        let mode = this._storesHub.resultsViewStore.viewMode,
            totalResults = this._storesHub.searchResultsStore.totalResultsCount;
        if (mode === "list" &&
            totalResults > 0) {
            this._updateGrid();
            this._element.show();
        }
        else {
            // hide the control as there are no results to show.
            // In research scenario we clear the result store state in which case we should clear the results pane,
            // essentially meaning we hide the control.
            this._element.hide();
        }
    }

    private _onResultsViewModeChanged(): void {
        let mode = this._storesHub.resultsViewStore.viewMode;
        if (mode === "list") {
            this._updateGrid();
            this._element.show();
        }
        else {
            this._element.hide();
        }
    }

    private _updateGrid(): void {
        let values = this._storesHub.searchResultsStore.items,
            columns = WorkItemGridControl.getGridColums(values[0] ? values[0].flattenFields : []),
            sortOptions = this._options.isGridClientSortEnabled ||
                this._options.isServerSortEnabled ? this._storesHub.sortCriteriaStore.sortOptions : [],
            colorData = this._storesHub.tfsDataStore.state.data;

        this._resultsGrid.initializeColumns(columns);
        this._resultsGrid.source = values;
        this._resultsGrid.witTypeColorsMap = colorData.typeColorMap;
        this._resultsGrid.sortOptions = sortOptions;
        this._resultsGrid.initializeDataSource();
        (this._resultsGrid as IUserPreferenceRestorable).restorePreference();
        this._resultsGrid.setSelectedRowIndex(0);
    }

    private _disposeGrid(): void {
        if (this._resultsGrid) {
            this._resultsGrid.dispose();
            this._resultsGrid = null;
        }
    }

    private _shouldSortOnClient(): boolean {
        return (this._options.isGridClientSortEnabled ||
            (this._options.isServerSortEnabled &&
                (this._storesHub.searchResultsStore.totalResultsCount <=
                    Search_Constants.SearchConstants.WorkItemSearchTakeResults)));
    }

    private _isSortByRelevanceInServerSort(): boolean {
        let sortOptions = this._storesHub.sortCriteriaStore.sortOptions;
        return !this._options.isGridClientSortEnabled &&
            this._options.isServerSortEnabled &&
            sortOptions.map((v, i) => {
                return Utils_String.ignoreCaseComparer(v.field, "relevance") === 0;
            }).indexOf(true) >= 0;
    }

    public static getGridColums(row: any): Array<any> {
        let columns: Array<any> = [];
        for (let key in row) {
            if (row.hasOwnProperty(key)) {
                columns.push({
                    name: key
                });
            }
        }

        // concat the "relevance" column which will not be visible but is required for the purpose of sorting.
        columns = columns.concat([{ "name": "relevance" }]);

        return columns;
    }
}