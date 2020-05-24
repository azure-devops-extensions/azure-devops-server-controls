import VSS = require("VSS/VSS");
import WebApi_RestClient = require("VSS/WebApi/RestClient");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");

export class AdminHttpClient extends WebApi_RestClient.VssHttpClient {

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public beginPutDeploymentEnvironment(data: AdminCommon.DeploymentEnvironmentApiData): IPromise<AdminCommon.DeploymentEnvironmentMetadata> {
        return this._beginRequest<AdminCommon.DeploymentEnvironmentMetadata>(
            {
                httpMethod: "PUT",
                area: AdminCommon.BuildResourceIds.AreaName,
                locationId: AdminCommon.BuildResourceIds.AzureDeploymentEnvironments,
                responseIsCollection: false,
                data: data,
                routeValues: {
                    project: data.projectName
                }
            });
    }

    public beginGetDeploymentEnvironments(project: string, serviceName: string): IPromise<AdminCommon.DeploymentEnvironmentMetadata[]> {
        return this._beginRequest<AdminCommon.DeploymentEnvironmentMetadata[]>(
            {
                area: AdminCommon.BuildResourceIds.AreaName,
                locationId: AdminCommon.BuildResourceIds.AzureDeploymentEnvironments,
                responseIsCollection: true,
                routeValues: {
                    project: project,
                    serviceName: serviceName
                }
            });
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.WebApi", exports);
