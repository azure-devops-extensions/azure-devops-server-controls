import VSS = require("VSS/VSS");
import * as WITDialogs_Async from "WorkItemTracking/Scripts/Dialogs/WITDialogs";

export function useWITDialogs(): IPromise<typeof WITDialogs_Async> {
    return VSS.requireModules(["WorkItemTracking/Scripts/Dialogs/WITDialogs"]).spread((WITDialogs: typeof WITDialogs_Async) => {
        return WITDialogs;
    });
}