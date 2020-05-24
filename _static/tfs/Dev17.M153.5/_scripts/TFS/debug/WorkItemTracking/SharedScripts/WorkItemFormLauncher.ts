import VSS = require("VSS/VSS");
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

import * as WITControls_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls";

/** Keep track of required module to allow sub-sequent synchronous calls */
var witControlsModule: typeof WITControls_Async = null;

/**
 * Open the given work item in a dialog
 * @param workItem Work item to open
 * @param options Optional parameters for dialog
 */
export function showWorkItem(workItem: WorkItem, options?: any) {
    ensureModule(() => {
        witControlsModule.WorkItemFormDialog.showWorkItem(workItem, options);
    });   
}

function ensureModule(callback: () => void) {
    if (!witControlsModule) {
        VSS.requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"]).spread((WITControls: typeof WITControls_Async) => {
            witControlsModule = WITControls;

            callback();
        });
    } else {
        callback();
    }
}