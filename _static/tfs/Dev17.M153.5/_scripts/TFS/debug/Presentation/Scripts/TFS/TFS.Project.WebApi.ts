import WebApi_RestClient = require("VSS/WebApi/RestClient");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import ProjectConstants = require("Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants");

export class ProjectHttpClient extends WebApi_RestClient.VssHttpClient {

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public beginGetProjects(): IPromise<TFS_Core_Contracts.WebApiProject[]> {
        return this._beginRequest<TFS_Core_Contracts.WebApiProject[]>({
            area: ProjectConstants.CoreConstants.AreaName,
            locationId: ProjectConstants.CoreConstants.ProjectsLocationId,
            responseIsCollection: true
        });
    }

    public beginGetProject(projectNameOrId: string): IPromise<TFS_Core_Contracts.WebApiProject> {
        return this._beginRequest<TFS_Core_Contracts.WebApiProject>({
            area: ProjectConstants.CoreConstants.AreaName,
            locationId: ProjectConstants.CoreConstants.ProjectsLocationId,
            responseIsCollection: true,
            routeValues: {
                projectId: projectNameOrId
            }
        });
    }

    public beginUpdateProject(projectId: string, teamProject: TFS_Core_Contracts.WebApiProject): IPromise<any> {
        return this._beginRequest({
            httpMethod: "PATCH",
            area: ProjectConstants.CoreConstants.AreaName,
            locationId: ProjectConstants.CoreConstants.ProjectsLocationId,
            routeValues: {
                projectId: projectId,
            },
            data: teamProject
        });
    }
}
