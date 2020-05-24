import { WITCustomerIntelligenceArea } from "WorkItemTracking/Scripts/CustomerIntelligence";

export namespace RecycleBinConstants {
    export const EVENT_DELETE_STARTED = "recycle-bin-delete-started";
    export const EVENT_DELETE_FAILED = "recycle-bin-delete-failed";
    export const EVENT_DELETE_FAILED_TEXT_ONLY = "recycle-bin-delete-failed-textonly";
    export const EVENT_DELETE_SUCCEEDED = "recycle-bin-delete-succeeded";
    export const EVENT_DESTROY_STARTED = "recycle-bin-destroy-started";
    export const EVENT_DESTROY_FAILED = "recycle-bin-destroy-failed";
    export const EVENT_DESTROY_SUCCEED = "recycle-bin-destroy-succeed";
    export const EVENT_RESTORE_STARTED = "recycle-bin-restore-started";
    export const EVENT_RESTORE_FAILED = "recycle-bin-restore-failed";
    export const EVENT_RESTORE_SUCCEED = "recycle-bin-restore-succeed";
    export const CLEANUP_SETTING_REGISTRYKEY = '/Service/WorkItemTracking/Settings/MaxDaysWorkItemInRecyclebin';
    export const DROPPED_ON_RECYCLE_BIN_DATAKEY = "dropped-on-recycle-bin";
}

export namespace RecycleBinTelemetryConstants {
    // CI Area
    export const CI_AREA = WITCustomerIntelligenceArea.WORK_ITEM_TRACKING;

    // CI features
    export const WORKITEM_DELETE = "WorkItemDelete";
    export const WORKITEM_DELETE_PROMPT = "WorkItemDelete.Prompt";
    export const WORKITEM_RESTORE = "WorkItemRestore";
    export const WORKITEM_DESTROY = "WorkItemDestroy";
    export const WORKITEM_DELETE_CLIENT_DENIED = "WorkItemDeleteClientDenied";

    // Source Areas
    export const KANBAN_SOURCE = "Kanban";
    export const TASK_BOARD_SOURCE = "TaskBoard";
    export const BACKLOG_SOURCE = "Backlog";
    export const ITERATION_BACKLOG_SOURCE = "IterationBacklog";
    export const WORK_ITEMS_VIEW_SOURCE = "WorkItemsView";
    export const WORK_ITEMS_FORM_SOURCE = "WorkItemsForm";
    export const UNKNOWN = "Unknown"; 

    // Source Actions
    export const DRAGDROP = "Dragdrop";
    export const CONTEXT_MENU = "ContextMenu";
    export const TOOLBAR = "Toolbar";
    export const DELETE_KEY = "DeleteKey"; 

}