export namespace WorkItemEvents {
    export const BEFORE_BULK_EDIT = "BeforeWorkItemBulkEdit";
    export const AFTER_BULK_EDIT = "AfterWorkItemBulkEdit";    
    export const BULK_EDIT_ERROR = "WorkItemBulkEditError";
}

export namespace FullScreenEvents {
    /**
     * Causes full screen mode to exit when fired.
     */
    export const EXIT_FULL_SCREEN = "wit-exit-fullscreen";

    /**
     * Fired when full screen mode is exited.
     */
    export const FULL_SCREEN_EXITED = "wit-fullscreen-mode-exited";
}

export namespace QueryResultsGridEvents {
    /**
     * Fired when the query results model on the QueryResultGrid is changed
     */
    export const RESULTS_MODEL_CHANGED = "queryResultsModelChanged";
}

export namespace QueryUIEvents {
    export const EVENT_FOLDERTREE_SET_FOCUS_ITEM = "query-folder-set-focus-item";
    export const EVENT_QUERYEDITOR_SET_FOCUS_ON_FIRST_ITEM = "query-editor-set-focus-on-first-item";
    export const EVENT_SOURCE_QUERYFOLDERTREE = "query-event-source-query-folder-tree";
    export const EVENT_SOURCE_TOOLBAR = "query-event-source-toolbar";
}