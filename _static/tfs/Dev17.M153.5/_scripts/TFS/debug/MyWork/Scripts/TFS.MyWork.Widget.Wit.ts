

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_WorkItemTracking_Contracts = require("TFS/WorkItemTracking/Contracts");
import TFS_WorkItemTracking_WebApi = require("TFS/WorkItemTracking/RestClient");
import Service = require("VSS/Service");

export class WitManager extends Service.VssService {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _witHttpClient: TFS_WorkItemTracking_WebApi.WorkItemTrackingHttpClient;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext) {
        super();

        if (!tfsContext) {
            throw new Error("tfsContext is required");
        }
        this._tfsContext = tfsContext;
        this._witHttpClient = Service.getClient(TFS_WorkItemTracking_WebApi.WorkItemTrackingHttpClient, this._tfsContext.contextData);
    }

    public __test() {
        var that = this;
        return {
            tfsContext: that._tfsContext,
        }
    }

    public getWorkItemsCount(wiqlQuery: string, projectId: string, teamId?: string): JQueryPromise<number> {
        var deferred = jQuery.Deferred<number>();
        this._witHttpClient.queryByWiql({ query: wiqlQuery }, projectId, teamId)
            .then((queryResult: TFS_WorkItemTracking_Contracts.WorkItemQueryResult) => {
                if (queryResult.workItems &&
                    queryResult.workItems.length !== undefined &&
                    queryResult.workItems.length !== null) {

                    deferred.resolve(queryResult.workItems.length)
                    return;
                }

                if (queryResult.workItemRelations &&
                    queryResult.workItemRelations.length !== undefined &&
                    queryResult.workItemRelations.length !== null) {

                    deferred.resolve(queryResult.workItemRelations.length);
                    return;
                }
                deferred.resolve(0);
            }, (failResult: Error) => {
                deferred.reject(failResult);
            });

        return deferred.promise();
    }
}