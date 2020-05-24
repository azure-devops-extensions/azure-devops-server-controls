import Grids = require("VSS/Controls/Grids");
import { ViewMode, IColumn, IInternalLinkedArtifactDisplayData, InternalKnownColumns, LinkColumnType } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import * as Diag from "VSS/Diag";

/**
 * Has the logic to determine the column widths and column truncation for the grid inside the LinksControl.
 */
export class ColumnTruncation {
    public static MIN_PRIMARY_COLUMN_WIDTH: number = 150;
    private static DEFAULT_PRIMARY_COLUMN_WIDTH: number = 250;
    private static DEFAULT_COLUMN_WIDTH: number = 75;

    private _columns: IColumn[];
    private _columnWidths: IDictionaryStringTo<number> = {};
    private _numberOfVisibleColumns: number;
    private _minNumOfColumnsToShow: number;
    private _typeToDefaultWidthMap: IDictionaryNumberTo<number> = {};
    private _refNameToDefaultWidthMap: IDictionaryStringTo<number> = {};

    /**
     * Creates a new instance of the truncation logic class.
     * @param columns columns available to be shown, normally read from the LinksControl options.
     * @param minNumOfColumnsToShow specifies the minimum number of columns that should be shown in Grid mode.
     */
    constructor(columns: IColumn[], minNumOfColumnsToShow: number) {
        this._columns = columns;
        this._minNumOfColumnsToShow = minNumOfColumnsToShow;
        this._initializeDefaultWidthMaps();
    }

    private _initializeDefaultWidthMaps(): void {
        this._typeToDefaultWidthMap[LinkColumnType.DateTime.valueOf()] = 120;
        this._typeToDefaultWidthMap[LinkColumnType.Double.valueOf()] = 75;
        this._typeToDefaultWidthMap[LinkColumnType.Identity.valueOf()] = 125;
        this._typeToDefaultWidthMap[LinkColumnType.Integer.valueOf()] = 50;
        this._typeToDefaultWidthMap[LinkColumnType.String.valueOf()] = 75;
        this._typeToDefaultWidthMap[LinkColumnType.TreePath.valueOf()] = 300;

        this._refNameToDefaultWidthMap[InternalKnownColumns.Link.refName] = ColumnTruncation.DEFAULT_PRIMARY_COLUMN_WIDTH;
        this._refNameToDefaultWidthMap["System.Title"] = 450;
        this._refNameToDefaultWidthMap["System.ChangedDate"] = 130;
        this._refNameToDefaultWidthMap["System.Id"] = 70;
        this._refNameToDefaultWidthMap["System.LinkType"] = 80;
        this._refNameToDefaultWidthMap["System.Links.Description"] = 210;
        this._refNameToDefaultWidthMap["System.Links.Image"] = 18;
        this._refNameToDefaultWidthMap["System.Tags"] = 200;
    }

    public columnResized(displayColumn: Grids.IGridColumn): void {
        // displayColumn.index is the refName for that column.
        this._columnWidths[displayColumn.index] = displayColumn.width;
    }

    public prepareDisplayColumns(
        primaryColumnRenderer: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => void,
        additionalColumnRenderer: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => void,
        getColumnValue: (dataIndex: number, columnIndex: string | number, columnOrder?: number) => any
    ): Grids.IGridColumn[] {

        // First colum is always Link column
        var displayColumns: Grids.IGridColumn[] = [{
            text: InternalKnownColumns.Link.name,
            index: InternalKnownColumns.Link.refName,
            name: InternalKnownColumns.Link.refName,
            width: this._columnWidths[InternalKnownColumns.Link.refName] || ColumnTruncation.DEFAULT_PRIMARY_COLUMN_WIDTH,
            getCellContents: primaryColumnRenderer,
            getColumnValue: getColumnValue,
            hidden: false,
            canMove: false,
        }];

        for (let i = 1; i < this._columns.length; i++) {
            let column: IColumn = this._columns[i];

            displayColumns.push({
                text: column.name,
                index: column.refName,
                name: column.refName,
                width: this._columnWidths[column.refName] || ColumnTruncation.DEFAULT_COLUMN_WIDTH,
                hidden: i >= this._numberOfVisibleColumns,
                getCellContents: additionalColumnRenderer,
                getColumnValue: getColumnValue,
                canMove: true
            });
        }

        return displayColumns;
    }

    /**
     * Takes in the display columns from the grid and updates their width and visibility.
     * @param displayColumns display columns from the grid
     */
    public getUpdatedDisplayColumns(displayColumns: Grids.IGridColumn[]): Grids.IGridColumn[] {
        for (var i = 0; i < this._columns.length; i++) {
            displayColumns[i].width = this._columnWidths[this._columns[i].refName];
            displayColumns[i].hidden = i >= this._numberOfVisibleColumns;
        }
        return displayColumns;
    }

    public columnMoved(sourceIndex: number, destinationIndex: number): void {
        var removed = this._columns.splice(sourceIndex, 1);
        this._columns.splice(destinationIndex, 0, removed[0]);
    }

    public getColumnCurrentWidth(refName: string): number {
        if (this._columnWidths[refName]) {
            return this._columnWidths[refName];
        }
        return 0;
    }

    private _getColumnCurrentWidthOrDefault(columnIndex: number): number {
        // if we have the current width for this column lets use it
        var refName = this._columns[columnIndex].refName;
        if (this._columnWidths[refName]) {
            return this._columnWidths[refName];
        }
        // otherwise calculate the default column width and save it
        else {
            var column: IColumn = this._columns[columnIndex];
            var defaultColumnWidth: number = this._getDefaultColumnWidth(column);
            this._columnWidths[refName] = defaultColumnWidth;
            return defaultColumnWidth;
        }
    }

    /**
     * Calculates the widths for each column based on each column's default width and the available width.
     * This assumes that the first column is always the primary Link column.
     * This should be only called if we are in grid mode.
     * @param availableWidth the available width for the grid.
     * @param viewMode the desired view mode for the grid
     * @param transitionToFullGrid this is true if the grid had a view mode other than FullGrid before and the nre viewMode
     * is FullGrid. It is needed, because the first time we transition to FullGrid we want to consume all available space
     * but after that if resize happens we will show either scrollbars or not react to available white space in FullGrid mode.
     * @param cellOffset this is the horizontal spacing that the grid maintains between adjacent cells.
     */
    public calculateColumnWidthsAndVisibility(availableWidth: number, viewMode: ViewMode, transitionToFullGrid: boolean, cellOffset: number): void {
        if (viewMode === ViewMode.List) {
            // exit without changing the previously calculated column widths
            return;
        }

        var numberOfAllColumns: number = this._columns.length;
        // 1st column is always the link column
        var totalConsumedWidth: number = this._getColumnCurrentWidthOrDefault(0) + cellOffset;
        this._calculateNumberOfColumnsToShow(availableWidth, viewMode, cellOffset);
        var totalCellSpacingWidth: number = this._numberOfVisibleColumns * cellOffset;
        for (var i = 1; i < this._numberOfVisibleColumns; i++) {
            totalConsumedWidth += this._getColumnCurrentWidthOrDefault(i) + cellOffset;
        }

        // Scale up or down
        if (totalConsumedWidth - totalCellSpacingWidth > 0) { // this check is for preventing division by zero
            var ratio = (availableWidth - totalCellSpacingWidth) / (totalConsumedWidth - totalCellSpacingWidth);
            // check if we should scale down
            if (totalConsumedWidth > availableWidth && viewMode !== ViewMode.FullGrid) {
                // Scale down the column widths but the Links column should maintain at least a width of ColumnHelper.MIN_PRIMARY_COLUMN_WIDTH
                var primaryColumnWidth = this._columnWidths[InternalKnownColumns.Link.refName];
                var scaledPrimaryColumnWidth = primaryColumnWidth * ratio;
                if (scaledPrimaryColumnWidth < ColumnTruncation.MIN_PRIMARY_COLUMN_WIDTH) {
                    this._columnWidths[InternalKnownColumns.Link.refName] = ColumnTruncation.MIN_PRIMARY_COLUMN_WIDTH;
                    var remainingAvailableWidth = availableWidth - ColumnTruncation.MIN_PRIMARY_COLUMN_WIDTH;
                    var totalConsumedWidthExcludingPrimaryColumn = totalConsumedWidth - primaryColumnWidth;

                    // If all other columns currently consume 0 width, no scaling necessary, just process the case where the remaining columns consume some greater than zero width
                    if (totalConsumedWidthExcludingPrimaryColumn > 0) {
                        var newRatio = remainingAvailableWidth / totalConsumedWidthExcludingPrimaryColumn;
                        this._scaleColumns(1, numberOfAllColumns, newRatio);
                        //Possible Enhancement: at this point we should ensure that all the other columns have at least the width of ColumnHelper.MIN_COLUMN_WIDTH pixels.
                    }
                }
                else {
                    this._scaleColumns(0, numberOfAllColumns, ratio);
                }
            }
            // when we transition to full grid we want to consume all available space, and we do not shrink down the columns.
            else if (totalConsumedWidth < availableWidth && (viewMode !== ViewMode.FullGrid || transitionToFullGrid)) {
                // Scale up the column widths
                this._scaleColumns(0, numberOfAllColumns, ratio);
            }
        }
    }

    private _calculateNumberOfColumnsToShow(availableWidth: number, viewMode: ViewMode, cellOffset: number): void {
        if (viewMode === ViewMode.FullGrid) {
            this._numberOfVisibleColumns = this._columns.length;
            return;
        }

        var totalDefaultConsumedWidth: number = 0;
        // 1st column is always the link column
        totalDefaultConsumedWidth += ColumnTruncation.DEFAULT_PRIMARY_COLUMN_WIDTH + cellOffset;
        var n: number = 1;
        var tryToAddTheNextColumn: boolean = true;
        while (n < this._columns.length && tryToAddTheNextColumn) {
            var defaultColumnWidth: number;
            // what is the column that we show at index n?
            var column: IColumn = this._columns[n];
            defaultColumnWidth = this._getDefaultColumnWidth(column);
            if ((totalDefaultConsumedWidth + defaultColumnWidth + cellOffset <= availableWidth) || n < this._minNumOfColumnsToShow) {
                totalDefaultConsumedWidth += defaultColumnWidth + cellOffset;
                n++;
            }
            else {
                // we are full
                tryToAddTheNextColumn = false;
            }
        }

        this._numberOfVisibleColumns = n;
    }

    private _scaleColumns(startIndex: number, endIndex: number, ratio: number): void {
        for (var i = startIndex; i < endIndex; i++) {
            var column: IColumn = this._columns[i];
            this._columnWidths[column.refName] *= ratio;
        }
    }

    private _getDefaultColumnWidth(column: IColumn): number {
        var width: number = this._refNameToDefaultWidthMap[column.refName];
        if (width) {
            return width;
        }
        width = this._typeToDefaultWidthMap[column.type];
        if (width) {
            return width;
        }
        return ColumnTruncation.DEFAULT_COLUMN_WIDTH;
    }
}