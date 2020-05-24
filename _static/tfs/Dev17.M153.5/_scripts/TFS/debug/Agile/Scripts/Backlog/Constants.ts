import { IGridColumn } from "VSS/Controls/Grids";

export namespace BacklogAddPanelConsts {
    export const CSSCLASS_ADD_PANEL_INPUT = "add-panel-input";
}

export namespace GroupedProgressControlConstants {
    export const CSSCLASS_PROGRESS_CONTROL = "capacity-pane-progress-control";
}

export namespace CapacityPanelConstants {
    export const ASSIGNED_TO_GROUPED_PROGRESS_CONTAINER = "assigned-to-grouped-progress-control";
}

export namespace BacklogBehaviorConstants {
    export const BACKLOG_BUTTONS_COLUMN_NAME = "backlog-buttons-column";

    export const BACKLOG_BUTTONS_COLUMN_DEFAULTS: Readonly<IGridColumn> = {
        canSortBy: false,
        canMove: false,
        fieldId: null,
        fixed: true,
        name: BACKLOG_BUTTONS_COLUMN_NAME,
        text: "",
        width: 40
    };
}