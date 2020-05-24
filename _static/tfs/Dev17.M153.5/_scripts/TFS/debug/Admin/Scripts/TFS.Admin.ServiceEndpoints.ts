/// <reference types="jquery" />



import * as Q from "q";
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import * as Utils_String from "VSS/Utils/String";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import DistributedTaskAgentClient = require("TFS/DistributedTask/TaskAgentRestClient");
import Contracts = require("TFS/DistributedTask/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import ServiceEndpointClient = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import DefinitionResourceReferenceBuildHttpClient = require("DistributedTasksCommon/DefinitionResourceReferenceBuildHttpClient");
import Build_Contracts = require("TFS/Build/Contracts");
import * as  AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";

import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

export class ServiceEndPointService extends Service.VssService {
    private _taskAgentHttpClient: DistributedTaskAgentClient.TaskAgentHttpClient;
    private _serviceEndpointHttpClient: ServiceEndpointClient.ServiceEndpointHttpClient;
    private _buildClient: DefinitionResourceReferenceBuildHttpClient.DefinitionResourceReferenceBuildHttpClient;
    private _projectId: string;

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);

        if (!this._taskAgentHttpClient) {
            this._taskAgentHttpClient = tfsConnection.getHttpClient(DistributedTaskAgentClient.TaskAgentHttpClient);
        }

        if (!this._serviceEndpointHttpClient) {
            this._serviceEndpointHttpClient = tfsConnection.getHttpClient(ServiceEndpointClient.ServiceEndpointHttpClient);
        }

        if (!this._buildClient) {
            this._buildClient = tfsConnection.getHttpClient(DefinitionResourceReferenceBuildHttpClient.DefinitionResourceReferenceBuildHttpClient);
        }

        this._projectId = TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId;
    }

    public beginGetServiceEndPoints(type?: string, includeFailed?: boolean): IPromise<ServiceEndpointContracts.ServiceEndpoint[]> {
        return this._serviceEndpointHttpClient.getServiceEndpoints(this._projectId, type, null, null, includeFailed);
    }

    public beginGetServiceEndPoint(endpointId: string): IPromise<ServiceEndpointContracts.ServiceEndpoint> {
        return this._serviceEndpointHttpClient.getServiceEndpointDetails(this._projectId, endpointId);
    }

    public beginDisconnect(endpointId: string, deep?: boolean): IPromise<any> {
        if (!(FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.ResourceAuthorizationforVGEndpoint))) {
            return this._serviceEndpointHttpClient.deleteServiceEndpoint(this._projectId, endpointId, deep);
        }
        let endPointPromise = Q.defer<void>();
        //  Creating an endpoint reference to un-authorize for all definitions at time of disconnecting the endpoint
        let endpointReference: Build_Contracts.DefinitionResourceReference = {
            authorized: false,
            id: endpointId,
            name: "",
            type: "endpoint"
        };
        this._buildClient.authorizeProjectResources([endpointReference], this._projectId).then(() => {
            this._serviceEndpointHttpClient.deleteServiceEndpoint(this._projectId, endpointId, deep).then(() => {
                endPointPromise.resolve();
            }, (err) => {
                endPointPromise.reject(new Error(Utils_String.localeFormat(AdminResources.ErrorDeletingEndpoint, "\r\n", err.message || err)));
            });
        }, (err) => {
            endPointPromise.reject(new Error(Utils_String.localeFormat(AdminResources.ErrorDeletingPolicy, "\r\n", err.message || err)));
        });
        return endPointPromise.promise;
    }

    public beginCreateServiceEndpoint(endpoint: ServiceEndpointContracts.ServiceEndpoint): IPromise<ServiceEndpointContracts.ServiceEndpoint> {
        return this._serviceEndpointHttpClient.createServiceEndpoint(endpoint, this._projectId);
    }

    public beginUpdateServiceEndpoint(endpoint: ServiceEndpointContracts.ServiceEndpoint): IPromise<ServiceEndpointContracts.ServiceEndpoint> {
        return this._serviceEndpointHttpClient.updateServiceEndpoint(endpoint, this._projectId, endpoint.id);
    }

    public beginGetServiceEndpointTypes(type?: string, scheme?: string): IPromise<ServiceEndpointContracts.ServiceEndpointType[]> {
        return this._serviceEndpointHttpClient.getServiceEndpointTypes(type, scheme);
    }

    public beginGetAzureSubscriptions(): IPromise<Contracts.AzureSubscriptionQueryResult> {
        return this._taskAgentHttpClient.getAzureSubscriptions();
    }

    public beginExecuteServiceEndpointRequest(serviceEndpointRequest: ServiceEndpointContracts.ServiceEndpointRequest, endpointId: string): IPromise<ServiceEndpointContracts.ServiceEndpointRequestResult> {
        return this._serviceEndpointHttpClient.executeServiceEndpointRequest(serviceEndpointRequest, this._projectId, endpointId);
    }

    public beginCreateOAuthRequest(tenantId: string, redirectUri: string): IPromise<string> {
        return this._taskAgentHttpClient.createAadOAuthRequest(tenantId, redirectUri);
    }

    public beginGetVstsAccountTenantId(): IPromise<string> {
        return this._taskAgentHttpClient.getVstsAadTenantId();
    }

    public beginQuerySharedProjects(endpointId: string): IPromise<Contracts.ProjectReference[]> {
        return this._serviceEndpointHttpClient.querySharedProjects(endpointId, this._projectId);
    }

    public beginShareEndpointWithProject(endpointId: string, sharedProjectId: string): IPromise<any> {
        return this._serviceEndpointHttpClient.shareEndpointWithProject(endpointId, this._projectId, sharedProjectId);
    }

    public beginDisconnectForSharedProject(name: string, sharedProjectId: string, deep?: boolean): IPromise<any> {
        return this._serviceEndpointHttpClient.deleteServiceEndpoint(sharedProjectId, name, deep);
    }
}
// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.ServiceEndpoints", exports);
