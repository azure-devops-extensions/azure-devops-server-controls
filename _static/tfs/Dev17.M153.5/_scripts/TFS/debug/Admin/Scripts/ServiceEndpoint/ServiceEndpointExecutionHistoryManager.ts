import  * as Context from "VSS/Context";
import { VssConnection } from "VSS/Service";
import { ServiceEndpointExecutionRecord } from "TFS/ServiceEndpoint/Contracts";
import { ServiceEndpointHttpClient } from "TFS/ServiceEndpoint/ServiceEndpointRestClient";

export class ServiceEndpointExecutionHistoryManager {
    public constructor() {
        let webContext: WebContext = Context.getDefaultWebContext();
        let vssConnection: VssConnection = new VssConnection(webContext);
        this._serviceEndpointClient = vssConnection.getHttpClient(ServiceEndpointHttpClient);
        this._projectId = webContext.project.id;
    }

    public getServiceEndpointExecutionRecords(endpointId: string): IPromise<ServiceEndpointExecutionRecord[]> {
        return this._serviceEndpointClient.getServiceEndpointExecutionRecords(this._projectId, endpointId);
    }

    private _serviceEndpointClient: ServiceEndpointHttpClient;
    private _projectId: string;
}