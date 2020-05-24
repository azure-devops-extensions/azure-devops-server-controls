import { ReleaseDefinition, TypeInfo } from "ReleaseManagement/Core/Contracts";
import { CoreHttpClient } from "TFS/Core/RestClient";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { ReleaseManagementHttpClient } from "ReleasePipeline/Scripts/Clients/ReleaseClient";
import * as Context from "VSS/Context";
import { VssConnection } from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { TeamProjectReference } from "TFS/Core/Contracts";

export class YamlClient {
           
    public constructor() {
        let webContext = Context.getDefaultWebContext();
        let connection = new VssConnection(webContext);
        this._serviceClient = connection.getHttpClient<CoreHttpClient>(CoreHttpClient, ServiceInstanceTypes.TFS);
        this._gitHttpClient = connection.getHttpClient<GitHttpClient>(GitHttpClient, ServiceInstanceTypes.TFS);
        this._releaseHttpClient = connection.getHttpClient<ReleaseManagementHttpClient>(ReleaseManagementHttpClient, ServiceInstanceTypes.TFS);
    }

    public getRepositories(projectId: string): IPromise<GitRepository[]> {
        return this._gitHttpClient.getRepositories(projectId);
    }

    public getProjects(): IPromise<TeamProjectReference[]> {
        return this._serviceClient.getProjects();
    }

    public createYamlPipeline(definition: ReleaseDefinition): IPromise<ReleaseDefinition> {
        let projectId = Context.getPageContext().webContext.project.id;
        return this._releaseHttpClient._beginRequestWithAjaxResult<ReleaseDefinition>({
            httpMethod: "POST",
            area: "Release",
            locationId: "d8f96f24-8ea7-4cb6-baab-2df8fc515665",
            resource: "definitions",
            routeTemplate: "{project}/_apis/{area}/{resource}",
            requestType: TypeInfo.ReleaseDefinition,
            responseType: TypeInfo.ReleaseDefinition,
            routeValues: {
                project: projectId
            },
            apiVersion: "5.0-preview.4",
            data: definition
        }).then(data => {
            return data[0];
        });
    }

    public updateYamlPipeline(definition: ReleaseDefinition): IPromise<ReleaseDefinition> {
        let projectId = Context.getPageContext().webContext.project.id;
        return this._releaseHttpClient._beginRequestWithAjaxResult<ReleaseDefinition>({
            httpMethod: "PUT",
            area: "Release",
            locationId: "d8f96f24-8ea7-4cb6-baab-2df8fc515665",
            resource: "definitions",
            routeTemplate: "{project}/_apis/{area}/{resource}",
            requestType: TypeInfo.ReleaseDefinition,
            responseType: TypeInfo.ReleaseDefinition,
            routeValues: {
                project: projectId
            },
            apiVersion: "5.0-preview.4",
            data: definition
        }).then(data => {
            return data[0];
        });
    }

    public getYamlDefinition(definitionId: number): IPromise<ReleaseDefinition> {
        let projectId = Context.getPageContext().webContext.project.id;
        return this._releaseHttpClient._beginRequestWithAjaxResult<ReleaseDefinition>({
            httpMethod: "GET",
            area: "Release",
            locationId: "d8f96f24-8ea7-4cb6-baab-2df8fc515665",
            resource: "definitions",
            routeTemplate: "{project}/_apis/{area}/{resource}/{definitionId}",
            requestType: TypeInfo.ReleaseDefinition,
            responseType: TypeInfo.ReleaseDefinition,
            routeValues: {
                project: projectId,
                definitionId: definitionId
            },
            apiVersion: "5.0-preview.4",
        }).then(data => {
            return data[0];
        });
    }

    private _serviceClient: CoreHttpClient;
    private _gitHttpClient: GitHttpClient;
    private _releaseHttpClient: ReleaseManagementHttpClient;
}