//Auto converted from Admin/Scripts/TFS.Admin.ServiceEndpoints.debug.js

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import TfsClient = require("TFS/Core/RestClient");
import Contracts = require("TFS/Core/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

export class ConnectedServicesManager extends TFS_Service.TfsService {

    constructor () {
        super();
    }

    public getApiLocation(action, params?: any) {
        /// <param name="params" type="Object" optional="true" />
        return this.getTfsContext().getActionUrl(action || "", "services", { area: "api" });
    }

    public beginDisconnect(name, callback, errorCallback? ) {
        TFS_Core_Ajax.postHTML(
            this.getApiLocation('Disconnect'),
            { name: name },
            callback,
            errorCallback
        );
    }

    public beginAccountUrl(connectedServiceName, callback, errorCallback? ) {
        TFS_Core_Ajax.getMSJSON(
            this.getApiLocation('AccountUrl'),
            { connectedServiceName: connectedServiceName },
            callback,
            errorCallback
        );
    }
}

export class ConnectedServicesService extends Service.VssService {
    private _httpClient: TfsClient.CoreHttpClient;
    private _projectId: string;

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);

        if (!this._httpClient) {
            this._httpClient = tfsConnection.getHttpClient(TfsClient.CoreHttpClient);
        }

        this._projectId = TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId;
    }

    public beginGetConnectedServices(type?: string): IPromise<Contracts.WebApiConnectedService[]> {
        return this._httpClient.getConnectedServices(this._projectId, Contracts.ConnectedServiceKind.AzureSubscription);
    }

    public beginGetConnectedService(endpointId: string): IPromise<Contracts.WebApiConnectedServiceDetails> {
        return this._httpClient.getConnectedServiceDetails(this._projectId, endpointId);
    }

    public beginCreateConnectedService(endpoint: Contracts.WebApiConnectedServiceDetails): IPromise<Contracts.WebApiConnectedService> {
        return this._httpClient.createConnectedService(endpoint, this._projectId);
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.ConnectedServices", exports);
