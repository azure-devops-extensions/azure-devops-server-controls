import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import Work_WebApi = require("TFS/Work/RestClient");
import Work_Contracts = require("TFS/Work/Contracts");

// NOTES: [aacathca] This service could eventually grow to manage and cache the calls to the BoardService.
//                   We are not caching the results on the service since the current consumers maintain their own cache. Could be done in the future though...
export class BoardService extends TFS_Service.TfsService {
    private VALUE_TYPE_COLUMN = "column";
    private VALUE_TYPE_ROW = "row";
    constructor() {
        super();
    }

    /**
     * Gets a scoped set of board column values
     *
     * @param projectId (Guid) If provided will scope the set to the project with this id
     * @param callback 
     * @param errorCallback 
     */
    public beginGetColumnSuggestedValues(projectId: string, callback: IResultCallback, errorCallback: IErrorCallback) {
        this._beginGetSuggestedValues(projectId, callback, errorCallback, this.VALUE_TYPE_COLUMN);
    }

    /**
     * Gets a scoped set of board row values
     *
     * @param projectId (Guid) If provided will scope the set to the project with this id
     * @param callback 
     * @param errorCallback 
     */
    public beginGetRowSuggestedValues(projectId: string, callback: IResultCallback, errorCallback: IErrorCallback) {
        this._beginGetSuggestedValues(projectId, callback, errorCallback, this.VALUE_TYPE_ROW);
    }

    private _beginGetSuggestedValues(projectId: string, callback: IResultCallback, errorCallback: IErrorCallback, suggestedValueType: string) {
        var succeeded = (values: Work_Contracts.BoardSuggestedValue[]) => {
            var names = values.map((value) => { return value.name; });
            callback(names);
        };

        var workHttpClient = this.tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        if (suggestedValueType === this.VALUE_TYPE_COLUMN) {
            workHttpClient.getColumnSuggestedValues(projectId).then(succeeded, errorCallback);
        }
        else {
            workHttpClient.getRowSuggestedValues(projectId).then(succeeded, errorCallback);
        }
    }
}