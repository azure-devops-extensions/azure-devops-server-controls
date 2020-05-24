import * as Q from "q";
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { BuildLegacyHttpClient } from "DistributedTaskControls/Sources/BuildLegacyHttpClient";
import { ConnectedServiceClient, IAuthRequest } from "DistributedTaskControls/Sources/ConnectedServiceClient";
import { ConnectedServiceMetadata } from "DistributedTasksCommon/TFS.Tasks.Types";
import { DefinitionResourceReferenceBuildHttpClient } from "DistributedTasksCommon/DefinitionResourceReferenceBuildHttpClient";

import { AzureSubscriptionQueryResult, TaskDefinitionEndpoint } from "TFS/DistributedTask/Contracts";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";
import { ServiceEndpoint, ServiceEndpointRequest, ServiceEndpointRequestResult, ServiceEndpointType } from "TFS/ServiceEndpoint/Contracts";
import { ServiceEndpointHttpClient } from "TFS/ServiceEndpoint/ServiceEndpointRestClient";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as VssContext from "VSS/Context";
import { getClient, getCollectionClient } from "VSS/Service";


export class ConnectedServiceEndpointSource extends SourceBase {

    public static getKey(): string {
        return "ConnectedServiceEndpointSource";
    }

    constructor() {
        super();
        this._dtAgentClient = getCollectionClient(TaskAgentHttpClient);
        this._connectedServiceClient = getClient(ConnectedServiceClient);
        this._serviceEndpointHttpClient = getClient(ServiceEndpointHttpClient);
    }

    public createAuthRequest(connectedServiceId: string): IPromise<IAuthRequest> {
        let projectName = VssContext.getDefaultWebContext().project.name;
        return this._connectedServiceClient.createAuthRequest(undefined, projectName, connectedServiceId);
    }
    
    public createServiceEndpoint(serviceEndPoint: ServiceEndpoint): IPromise<ServiceEndpoint> {
        let projectName = VssContext.getDefaultWebContext().project.name;
        return this._serviceEndpointHttpClient.createServiceEndpoint(serviceEndPoint, projectName);
    }

    public updateServiceEndpoint(serviceEndPoint: ServiceEndpoint): IPromise<ServiceEndpoint> {
        let projectName = VssContext.getDefaultWebContext().project.name;
        return this._serviceEndpointHttpClient.updateServiceEndpoint(serviceEndPoint, projectName, serviceEndPoint.id);
    }

    public getServiceEndpoints(connectedServiceType: string, authSchemes?: string[], endpointIds?: string[]): IPromise<ServiceEndpoint[]> {
        let projectName = VssContext.getDefaultWebContext().project.name;
        return this._serviceEndpointHttpClient.getServiceEndpoints(projectName, connectedServiceType, authSchemes, endpointIds);
    }

    public getServiceEndpointTypes(connectedServiceType?: string, scheme?: string): IPromise<ServiceEndpointType[]> {
        return this._serviceEndpointHttpClient.getServiceEndpointTypes(connectedServiceType, scheme);
    }

    public getServiceEndpoint(serviceEndpointId: string): IPromise<ServiceEndpoint> {
        let projectName = VssContext.getDefaultWebContext().project.name;
        return this._serviceEndpointHttpClient.getServiceEndpointDetails(projectName, serviceEndpointId);
    }

    public executeServiceEndpointRequest(serviceEndpointRequest: ServiceEndpointRequest, endpointId: string): IPromise<ServiceEndpointRequestResult> {
        let projectId = VssContext.getDefaultWebContext().project.id;
        return this._serviceEndpointHttpClient.executeServiceEndpointRequest(serviceEndpointRequest, projectId, endpointId);
    }

    public queryEndpoint(taskEndpoint: TaskDefinitionEndpoint): IPromise<string[]> {
        let projectId = VssContext.getDefaultWebContext().project.id;
        taskEndpoint.scope = projectId;
        return this._dtAgentClient.queryEndpoint(taskEndpoint);
    }

    public beginGetAzureSubscriptions(): IPromise<AzureSubscriptionQueryResult> {
        return this._dtAgentClient.getAzureSubscriptions();
    }

    /** 
     * Gets connected services subscriptions for the azureConnection task input type  - This is to keep support for compat scenario : old tasks with new server OM for "Build" hub
     */
    public beginGetSubscriptionNames(): IPromise<ConnectedServiceMetadata[]> {
        let projectName = VssContext.getDefaultWebContext().project.name;
        return this._buildLegacyHttpClient.beginGetSubscriptionNames(projectName);
    }

    public static instance(): ConnectedServiceEndpointSource {
        return SourceManager.getSource(ConnectedServiceEndpointSource);
    }

    private _dtAgentClient: TaskAgentHttpClient;
    private _connectedServiceClient: ConnectedServiceClient;
    private _buildLegacyHttpClient: BuildLegacyHttpClient;
    private _serviceEndpointHttpClient: ServiceEndpointHttpClient;
}