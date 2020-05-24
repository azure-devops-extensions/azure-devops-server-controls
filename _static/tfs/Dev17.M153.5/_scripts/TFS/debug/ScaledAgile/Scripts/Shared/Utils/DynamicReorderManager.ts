import * as Q from "q";
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");
import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IReorderOperation, IReorderAjaxResponse } from "Agile/Scripts/Common/Agile";

export interface IDynamicReorderOperation extends IReorderOperation {
    // Information to use in constructing the url for the reorder api if the url should be different from the current tfs context.
    routeData?: IRouteData;
}

export interface IDynamicReorderManager {
    /**
     * Send reorder api server request
     * @param {IDynamicReorderOperation} reorderOperation - the reorder request body
     */
    postRequest(reorderOperation: IDynamicReorderOperation): IPromise<IReorderAjaxResponse>;
}

/**
 * This is a reorder manager that encapsulate concept for sending reorder request to server with an ability to have unique api url location for each request.
 */
export class DynamicReorderManager implements IDynamicReorderManager {
    public static REORDER_ACTION_NAME = "Reorder";
    public static REORDER_CONTROLLER_NAME = "ReorderWorkItems";
    public static REORDER_AREA_NAME = "api";
    
    private _apiLocation: string; // api url location from current tfs context
    
    constructor() {
        this._apiLocation = TfsContext.getDefault().getActionUrl(
            DynamicReorderManager.REORDER_ACTION_NAME,
            DynamicReorderManager.REORDER_CONTROLLER_NAME,
            {
                area: DynamicReorderManager.REORDER_AREA_NAME,
                includeVersion: true
            });
    }
    
    /**
     * See IDynamicReorderManager.postRequest
     */
    public postRequest(reorderOperation: IDynamicReorderOperation): IPromise<IReorderAjaxResponse> {
        let deferred = Q.defer<IReorderAjaxResponse>();
        let apiLocation = this._getDynamicApiLocation(reorderOperation);
        Ajax.postMSJSON(apiLocation,
            {
                operations: Utils_Core.stringifyMSJSON([reorderOperation]),
            },
            (result: IReorderAjaxResponse) => {
                deferred.resolve(result);
            },
            (result: Error) => {
                deferred.reject(result);
            });
        return deferred.promise;
    }

    /**
     * Return api url location
     */
    private _getDynamicApiLocation(reorderOperation: IDynamicReorderOperation): string {
        if (reorderOperation.routeData) {
            let routeData = $.extend(true,
                {
                    area: DynamicReorderManager.REORDER_AREA_NAME,
                    includeVersion: true,
                },
                reorderOperation.routeData);
            return TfsContext.getDefault().getActionUrl(DynamicReorderManager.REORDER_ACTION_NAME, DynamicReorderManager.REORDER_CONTROLLER_NAME, routeData);
        }
        else {
            return this._apiLocation;
        }
    }
}