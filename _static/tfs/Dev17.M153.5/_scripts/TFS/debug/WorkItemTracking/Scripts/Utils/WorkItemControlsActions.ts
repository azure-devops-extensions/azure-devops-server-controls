import Diag = require("VSS/Diag");
import Navigation = require("VSS/Controls/Navigation");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";

export namespace WorkItemActions {
    export const ACTION_WORKITEM_OPEN = "open-work-item";
    export const ACTION_WORKITEM_OPEN_DIALOG = "open-work-item-dialog";
    export const ACTION_WORKITEM_OPEN_IN_NEW_TAB = "open-work-item-in-new-tab";
    export const ACTION_WORKITEM_NEW = "work-item-new";
    export const ACTION_WORKITEM_NEW_DIALOG = "work-item-new-dialog";
    export const ACTION_WORKITEM_NEW_LINKED = "work-item-new-linked";
    export const ACTION_WORKITEM_LINK = "work-item-link";
    export const ACTION_WORKITEM_NEW_COPY = "work-item-new-copy";
    export const ACTION_WORKITEM_NEW_CLONE = "work-item-new-clone";
    export const ACTION_WORKITEM_DISCARD_IF_NEW = "work-item-discard-if-new";
    export const ACTION_SHOW_WORKITEM_FORM_BUSY = "show-work-item-form-busy-overlay";
    export const ACTION_HIDE_WORKITEM_FORM_BUSY = "hide-work-item-form-busy-overlay";
    export const WORKITEM_DELETE_ERROR = "work-item-delete-error";
    export const WORKITEM_MAXIMIZE_STATE_CHANGED = "work-item-maximize-state-changed";
}

/** Action worker to open work items in a new tab */
export function openWorkItemInNewTabActionWorker(actionArgs, next) {
    Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
    Diag.Debug.assertParamIsNotNull(actionArgs.id, "actionArgs.id");

    var tfsContext: TFS_Host_TfsContext.TfsContext = actionArgs.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
    var routeData = Navigation.FullScreenHelper.getUrlData(true);
    routeData["parameters"] = actionArgs.id;
    var url = tfsContext.getPublicActionUrl(ActionUrl.ACTION_EDIT, "workitems", routeData);
    window.open(url);

    WIFormCIDataHelper.workItemOpenInNewTabEvent();
}