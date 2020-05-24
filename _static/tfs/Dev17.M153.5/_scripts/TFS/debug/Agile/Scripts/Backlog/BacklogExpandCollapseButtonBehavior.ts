import { BacklogBehaviorConstants } from "Agile/Scripts/Backlog/Constants";
import { IGridBehavior } from "Agile/Scripts/Backlog/ProductBacklogGrid";
import { ExpandOneLevel, CollapseOneLevel } from "Agile/Scripts/Resources/TFS.Resources.Agile";
import { IGridColumn } from "VSS/Controls/Grids";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import * as Utils_Array from "VSS/Utils/Array";
import { ignoreCaseComparer } from "VSS/Utils/String";

/**
 * A grid-add-in-behavior that extends the grid with expand collapse buttons
 */
export class BacklogExpandCollapseButtonBehavior implements IGridBehavior {

    constructor(
        private _onExpandClicked: () => void,
        private _onCollapseClicked: () => void) {
    }

    /**
     * Add buttons in header of this behavior's column
     *
     * @param columns The collection of grid columns.
     * @param options Any options to pass to the behavior extension.
     */
    public onPrepareColumns(columns: IGridColumn[], options?: any) {
        // Get index to see if column has already been created
        const columnIndex = Utils_Array.findIndex(columns, (column: IGridColumn) => {
            return ignoreCaseComparer(column.name, BacklogBehaviorConstants.BACKLOG_BUTTONS_COLUMN_NAME) === 0;
        });

        const backlogButtonColumn = (columnIndex < 0) ? {...BacklogBehaviorConstants.BACKLOG_BUTTONS_COLUMN_DEFAULTS} : columns[columnIndex];

        // Set values needed for expand collapse behavior
        backlogButtonColumn.headerContainerCss = "expand-collapse-icons-header";
        backlogButtonColumn.getHeaderCellContents = (column: IGridColumn): JQuery => {
            const $cellContainer = $("<div/>");
            const $expand = $("<span>")
                .addClass("expand-icon bowtie-icon bowtie-toggle-expand")
                .click(this._onExpandClicked);
            RichContentTooltip.add(ExpandOneLevel, $expand);
            const $collapse = $("<span/>")
                .addClass("collapse-icon bowtie-icon bowtie-toggle-collapse")
                .click(this._onCollapseClicked);
            RichContentTooltip.add(CollapseOneLevel, $collapse);
            $cellContainer.append($expand).append($collapse);
            return $cellContainer;
        };

        if (columnIndex < 0) {
            columns.splice(0, 0, backlogButtonColumn);
        }
    }

    public setGrid() {
        // No op
    }
}