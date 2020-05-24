import { VssHttpClient } from "VSS/WebApi/RestClient";
import { ConnectedServiceMetadata } from "DistributedTasksCommon/TFS.Tasks.Types";

export class BuildLegacyHttpClient extends VssHttpClient {

    /**
     * @brief: Gets connected services subscriptions for the azureConnection task input type  - This is to keep support for compat scenario : old tasks with new server OM for "Build" hub
     */
    public beginGetSubscriptionNames(project: string): IPromise<ConnectedServiceMetadata[]> {
        return this._beginRequest<ConnectedServiceMetadata[]>(
            {
                area: BuildLegacyHttpClient.AreaName,
                locationId: BuildLegacyHttpClient.AzureDeploymentEnvironmentDetailsResources,
                responseIsCollection: true,
                routeValues: {
                    project: project
                }
            });
    }

    private static AreaName: string = "Build";
    private static AzureDeploymentEnvironmentDetailsResources: string = "0524c91b-a145-413c-89eb-b3342b6826a4";
}