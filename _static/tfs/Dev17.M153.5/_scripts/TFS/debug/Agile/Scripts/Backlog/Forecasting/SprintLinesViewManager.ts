import { IEffortData, SprintLineManager, ISprintLineInfo } from "Agile/Scripts/Backlog/Forecasting/SprintLineManager";
import * as TFS_Agile_ProductBacklog_Grid from "Agile/Scripts/Backlog/ProductBacklogGrid";
import * as AgileProductBacklogResources from "Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog";
import * as Controls from "VSS/Controls";
import * as Grids from "VSS/Controls/Grids";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import * as Diag from "VSS/Diag";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

var delegate = Utils_Core.delegate;

/**
 * Interface representing forecast settings, to be kept in sync with ForecastLinesViewModel.cs
 */
export interface IForecastSettings {
    /** Indicates whether forecasting is enabled or not */
    visibleState: string;

    /** Effort data for current backlog */
    effortData?: IEffortData;

    /** Current velocity */
    velocity: number;
}

export class SprintLinesViewManager {

    private _$gridElement: JQuery;
    private _sprintLineManager: SprintLineManager;

    public _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid;

    /**
     * Manages displaying of sprint lines in the grid.
     * 
     * @param $gridElement Element that the grid will be created in.
     * @param sprintLineManager The sprint line manager being used for the page.
     */
    constructor($gridElement: JQuery, sprintLineManager: SprintLineManager) {

        Diag.Debug.assertParamIsObject($gridElement, "$gridElement");
        Diag.Debug.assertParamIsObject(sprintLineManager, "sprintLineManager");

        this._sprintLineManager = sprintLineManager;

        // Save off the grid element so we can use it later to get access to the grid.
        // NOTE: The grid will not have been created when the sprint line manager view is initialized.
        this._$gridElement = $gridElement;

        // Bind to the row updated event so we can draw the sprint lines
        // NOTE: This is done before the grid is created so that the sprint lines can be drawn
        //       as the grid is being rendered.
        $gridElement.bind(Grids.GridO.EVENT_ROW_UPDATED + ".VSS.Agile", this._rowUpdatedHandler as () => any);

        // Update the grid when sprint lines change.
        sprintLineManager.attachLinesUpdated(this._sprintLinesStateChangedHandler);

        // Update the grid when the enabled state changes.
        sprintLineManager.attachEnabledUpdated(this._sprintLinesStateChangedHandler);
    }

    /** Dispose this object */
    public dispose() {
        this._sprintLineManager.detachLinesUpdated(this._sprintLinesStateChangedHandler);
        this._sprintLineManager.detachEnabledUpdated(this._sprintLinesStateChangedHandler);

        if (this._$gridElement) {
            this._$gridElement.unbind(Grids.GridO.EVENT_ROW_UPDATED + ".VSS.Agile", this._rowUpdatedHandler as () => any);
            this._$gridElement = null;
        }
    }

    /**
     * Setup grid columns needed by forecast lines.
     * @param grid ProductBacklogGrid instance
     * @param forecastSettings Current forecast settings
     */
    public updateGridColumns(grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid, forecastSettings: IForecastSettings) {
        Diag.Debug.assertIsObject(grid, "grid");
        Diag.Debug.assertIsObject(forecastSettings, "forecastSettings");
        Diag.Debug.assertIsObject(forecastSettings.effortData, "forecastSettings.effortData");

        const columns = grid.getColumns();

        // If a column containing the "Effort" field is currently visible, find it and customize
        // the drawing.
        const fieldName = forecastSettings.effortData.effortFieldName;
        for (let column of columns) {
            if (Utils_String.ignoreCaseComparer(fieldName, column.name) === 0) {
                column.getCellContents = delegate(this, this._getEffortCellContentsHandler);
                break;
            }
        }

        // Add a virtual column for displaying iterations to the beginning of the columns
        const columnAlreadyExists = columns.some(c =>
            Utils_String.ignoreCaseComparer(c.name, TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.FORECAST_FIELD_NAME) === 0);

        if (!columnAlreadyExists) {
            grid.insertColumn(0, {
                rowCss: "grid-header-text",
                canSortBy: false,
                canMove: false,
                fieldId: null,
                fixed: false,
                hidden: !this._sprintLineManager.getEnabled(),
                name: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.FORECAST_FIELD_NAME,
                text: AgileProductBacklogResources.Forecast_Column_Title,
                width: 100,
                getCellContents: delegate(this, this._getForecastCellContentsHandler)
            });
        }
    }

    /**
     * Gets the grid control instance.
     * NOTE: Can be undefined when the grid instance has not been created yet.
     * 
     * @return 
     */
    private _getGrid(): TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid {

        // If we have not gotten the grid instance yet, look it up.
        if (!this._grid) {
            this._grid = <TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid>Controls.Enhancement.getInstance(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid, this._$gridElement);
        }

        return this._grid;
    }

    /**
     * Generate virtual forecast column. 
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
    private _getForecastCellContentsHandler(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {

        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        let $contents: JQuery;
        const grid = this._getGrid();

        // If sprint lines are enabled, see if we need to add the column for this work item.
        if (this._sprintLineManager.getEnabled()) {
            const workItemId = grid.getWorkItemIdAtDataIndex(dataIndex);

            // If sprint lines are enabled, see if we need to draw forecast column contents for this work item.
            if (workItemId) {
                const sprintInfo = this._sprintLineManager.getSprintLineInfo(workItemId);

                // If there is a sprint line for this work item, then add the sprint name.
                if (sprintInfo && sprintInfo.name) {
                    $contents = $("<div />");

                    const isLastVisibleWorkItemInSprint = this._isLastVisibleWorkItemInSprint(sprintInfo, workItemId, rowInfo.dataIndex);
                    if (isLastVisibleWorkItemInSprint) {
                        $contents.text(sprintInfo.name)
                            .addClass("forecast-column-contents")
                            .attr("aria-label", Utils_String.format(AgileProductBacklogResources.ForecastingSprintEndsWithLabel, sprintInfo.name));
                    }
                    else {
                        $contents.attr("aria-label", Utils_String.format(AgileProductBacklogResources.ForecastingSprintStartsWithLabel, sprintInfo.name));
                    }
                }
            }
        }

        // Have the grid generate the cell as normal.
        const $gridCell = grid._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);

        // If we have contents, clear the default text of the cell and append the contents to the cell.
        // NOTE: This is a temporary workaround until support for "getColumnValue()" column option allowing
        //       contents to be returned directly is finished.  When this work is done this method can be changed
        //       over to be the getColumnValue for the column and updated to just return the contents.
        if ($contents) {
            $gridCell.text("");
            if ($contents) {
                RichContentTooltip.addIfOverflow($contents.text(), $gridCell);
            }
            $gridCell.append($contents);
        }
        else {
            // There were no cell contents, so make sure an empty cell is displayed.
            $gridCell.html("&nbsp;");
        }

        return $gridCell;
    }

    /**
     * Generate the Effort cell content. 
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
    private _getEffortCellContentsHandler(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {

        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        var $gridCell,
            workItemId,
            grid = this._getGrid();

        workItemId = grid.getWorkItemIdAtDataIndex(dataIndex);

        // Have the grid generate the cell as normal.
        $gridCell = grid._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);

        // assign the style if the workitem has children
        if (workItemId != null && workItemId !== 0) {
            if (grid.getDataManager().getDescendantCount(workItemId)
                || this._sprintLineManager.workItemEffortIsExcluded(workItemId)) {
                $gridCell.addClass("backlog-excluded-effort");
            }
        }

        return $gridCell;
    }

    /**
     * Called when a row in the grid is being redrawn.
     * 
     * @param event Information about the event.
     * @param rowInfo Information about the row which has been updated.
     */
    private _rowUpdatedHandler = (event: any, rowInfo: any) => {

        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(rowInfo, "rowInfo");

        const $row = rowInfo.row;

        let rowHasSprintLines = false;

        // If sprint lines are enabled, see if we need to draw the lines for this work item.
        if (this._sprintLineManager.getEnabled()) {

            var workItemId = this._getGrid().getWorkItemIdAtDataIndex(rowInfo.dataIndex);

            // If we have the work item ID for the row, see if it has a sprint line.
            if (workItemId) {
                const sprintLinesInfo = this._sprintLineManager.getSprintLineInfo(workItemId);
                const isLastVisibleWorkItemInSprint = this._isLastVisibleWorkItemInSprint(sprintLinesInfo, workItemId, rowInfo.dataIndex);

                // If this is a row which sprint lines should be drawn on, update the row.
                if (isLastVisibleWorkItemInSprint) {
                    rowHasSprintLines = true;

                    const isLastWorkItem = !!sprintLinesInfo.isLastWorkItemInPlanning;
                    $row.toggleClass(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.SINGLE_SPRINT_LINE_CLASS, !isLastWorkItem);
                    $row.toggleClass(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DOUBLE_SPRINT_LINE_CLASS, isLastWorkItem);
                }
            }
        }

        // If there are no sprint lines associated with the work item, ensure no lines are drawn.
        // Note: It is a lot faster to check hasClass before removeClass when sprint lines are disabled. When sprint lines are enabled it
        // is marginally slower.
        if (!rowHasSprintLines) {
            if ($row.hasClass(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DOUBLE_SPRINT_LINE_CLASS)) {
                $row.removeClass(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DOUBLE_SPRINT_LINE_CLASS);
            }

            if ($row.hasClass(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.SINGLE_SPRINT_LINE_CLASS)) {
                $row.removeClass(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.SINGLE_SPRINT_LINE_CLASS);
            }
        }
    }

    /**
     * Called when sprint lines have been updated or the enabled state has changed.
     * 
     * @param sender Sender of the event.
     * @param args Arguments for the event.
     */
    private _sprintLinesStateChangedHandler = (sender: any, args?: any) => {

        Diag.Debug.assertParamIsObject(sender, "sender");
        Diag.Debug.assertParamIsObject(args, "args");

        var grid = this._getGrid(),
            redraw = args.redraw === undefined ? true : args.redraw;  // Only the updateLines event has the redraw, for all other events it is considered true.

        // Ensure the viewport gets redrawn with the updated sprint lines if there is a grid instance.
        if (grid && redraw) {
            if (args.redraw) {
                $.each(this._sprintLineManager.getSprintLineLookup(), (id, value) => {
                    var workItemDataIndex = this._grid._getWorkItemDataIndex(+id);

                    // At this point the grid and the datasource (which is used for calculating the sprint lines) are out of sync,
                    // if we try to expand a data index which is not yet drawn in the grid, we might end up in an infinite loop. To
                    // workaround, ensure that the grid contains the data index to be expanded (see mseng bug#349217)
                    if (workItemDataIndex >= 0 && this._grid._dataSource[workItemDataIndex] !== undefined) {
                        this._grid.ensureDataIndexExpanded(workItemDataIndex);
                    }
                });
            }

            if (args.enabled !== undefined) {
                grid.setColumnOptions(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.FORECAST_FIELD_NAME, { hidden: !args.enabled });
                grid.layout();
            }
            else {
                grid.redraw();
            }
        }
    }

    private _isLastVisibleWorkItemInSprint = (sprintLinesInfo: ISprintLineInfo, workItemId: number, dataIndex: number): boolean => {
        const grid = this._getGrid();
        const childCount = grid.getDataManager().getDescendantCount(workItemId)
        const isExpanded = grid._isExpanded(dataIndex);
        return sprintLinesInfo && sprintLinesInfo.isLastWorkItemInSprint && (childCount === 0 || !isExpanded)
    }
}
