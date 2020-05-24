//Auto converted from Diagnostics/Scripts/TFS.Diag.ActivityLog.debug.js

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

var defaultActivitylogManager;


export class ActivityLogColumns {

    public static None: number = 0;
    public static CommandId: number = 1;
    public static Application: number = 2;
    public static Command: number = 3;
    public static Status: number = 4;
    public static StartTime: number = 5;
    public static ExecutionTime: number = 6;
    public static IdentityName: number = 7;
    public static IPAddress: number = 8;
    public static UniqueIdentifier: number = 9;
    public static UserAgent: number = 10;
    public static CommandIdentifier: number = 11;
    public static ExecutionCount: number = 12;
    public static TempCorrelationId: number = 13;
    public static AuthenticationType: number = 14;
    public static ResponseCode: number = 15;

    constructor () {
    }
}



export class ActivityLogInstanceManager {

    public static get(tfsContext) {
        if (!defaultActivitylogManager) {
            defaultActivitylogManager = new ActivityLogInstanceManager(tfsContext);
        }

        return defaultActivitylogManager;
    }

    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor (tfsContext) {
        this._tfsContext = tfsContext;
    }

    public getApiLocation(action?: string) {
        /// <param name="action" type="string" optional="true" />
        return this._tfsContext.getActionUrl(action || "", "diagnostics", { area: "api" });
    }

    public beginGetHosts(accountName, callback, errorCallback? , ajaxOptions? ) {
        TFS_Core_Ajax.getMSJSON(
            this.getApiLocation('GetHosts'),
            { accountName: accountName },
            callback,
            errorCallback,
            ajaxOptions
        );
    }

    public beginGetActivitylog(instanceId, userName, sortColumns, callback, errorCallback? , ajaxOptions? ) {
        TFS_Core_Ajax.getMSJSON(
            this.getApiLocation('GetActivitylog'),
            {
                instanceId: instanceId,
                userName: userName,
                sortFields: sortColumns
            },
            callback,
            errorCallback,
            ajaxOptions
        );
    }

    public beginGetActivitylogEntry(instanceId, commandId, callback, errorCallback? , ajaxOptions? ) {
        TFS_Core_Ajax.getMSJSON(
            this.getApiLocation('GetActivityLogEntry'),
            {
                instanceId: instanceId,
                commandId: commandId
            },
            callback,
            errorCallback,
            ajaxOptions
        );
    }

    public beginPageActivityLogEntries(instanceId, ids, callback, errorCallback? , ajaxOptions? ) {
        var requestParams;

        if (!$.isArray(ids)) {
            throw new Error("Invalid argument type: 'ids' must be an array");
        }

        requestParams = {
            instanceId: instanceId,
            entryIds: ids.join(",")
        };

        TFS_Core_Ajax.postMSJSON(
            this.getApiLocation('PageActivityLogEntries'),
            requestParams,
            callback,
            errorCallback,
            ajaxOptions
        );
    }
}

VSS.initClassPrototype(ActivityLogInstanceManager, {
    _tfsContext: null
});


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Diag.ActivityLog", exports);
