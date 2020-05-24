import Service = require("VSS/Service");
import Platform_Contracts = require("VSS/Common/Contracts/Platform");
import VssContext = require("VSS/Context");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

import TaskAgentClient = require("TFS/DistributedTask/TaskAgentRestClient");
import ServiceEndpointClient = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");

export class DistributedTaskAgentClient {

    public static getCollectionTaskAgentClient(): TaskAgentClient.TaskAgentHttpClient {
        if (!DistributedTaskAgentClient._collectionDistributedTaskClient) {
            var collectionConnection = new Service.VssConnection(VssContext.getDefaultWebContext(), Platform_Contracts.ContextHostType.ProjectCollection);
            DistributedTaskAgentClient._collectionDistributedTaskClient = collectionConnection.getHttpClient(TaskAgentClient.TaskAgentHttpClient, VSS_WebApi_Constants.ServiceInstanceTypes.TFS);
        }

        return DistributedTaskAgentClient._collectionDistributedTaskClient;
    }

    private static _collectionDistributedTaskClient: TaskAgentClient.TaskAgentHttpClient;
}

export class DistributedTaskServiceEndpointClient {

    public static getCollectionServiceEndpointClient(): ServiceEndpointClient.ServiceEndpointHttpClient {
        if (!DistributedTaskServiceEndpointClient._collectionServiceEndpointClient) {
            var collectionConnection = new Service.VssConnection(VssContext.getDefaultWebContext(), Platform_Contracts.ContextHostType.ProjectCollection);
            DistributedTaskServiceEndpointClient._collectionServiceEndpointClient = collectionConnection.getHttpClient(ServiceEndpointClient.ServiceEndpointHttpClient, VSS_WebApi_Constants.ServiceInstanceTypes.TFS);
        }

        return DistributedTaskServiceEndpointClient._collectionServiceEndpointClient;
    }

    private static _collectionServiceEndpointClient: ServiceEndpointClient.ServiceEndpointHttpClient;
}