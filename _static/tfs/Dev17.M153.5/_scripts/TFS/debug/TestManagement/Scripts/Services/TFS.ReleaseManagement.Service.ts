import Q = require("q");
import ReleaseClient = require("ReleaseManagement/Core/RestClient");
import RMContracts = require("ReleaseManagement/Core/Contracts");

import * as ServiceCommon from "TestManagement/Scripts/Services/Services.Common";

import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");

export interface IReleaseService extends ServiceCommon.IService {
    getReleaseDefinitions(queryOrder?: RMContracts.ReleaseDefinitionQueryOrder): IPromise<RMContracts.ReleaseDefinition[]>;
    createRelease(releaseDefinitionId: number, environments: string[], buildArtifact: RMContracts.ArtifactMetadata): IPromise<RMContracts.Release>;
    startReleaseEnvironment(releaseId: number, environmentId: number): IPromise<RMContracts.ReleaseEnvironment>;
    updateRelease(release: RMContracts.Release): IPromise<RMContracts.Release>;
    getReleaseDefinitionsForBuildDefinition(buildDefinitionId: number): IPromise<RMContracts.ReleaseDefinition[]>;
}


//Added below Wrapper over the ReleaseHttpClient to support ContinuationToken calls
export class ReleaseManagementHttpClient extends ReleaseClient.ReleaseHttpClient {
    public getReleaseDefinitionsWithContinuationToken(
        project: string,
        searchText?: string,
        expand?: RMContracts.ReleaseDefinitionExpands,
        artifactType?: string,
        artifactSourceId?: string,
        top?: number,
        continuationToken?: string,
        queryOrder?: RMContracts.ReleaseDefinitionQueryOrder,
        path?: string,
        isExactNameMatch?: boolean,
        tagFilter?: string[],
        propertyFilters?: string[]
    ): IPromise<RMContracts.ReleaseDefinition[]> {

        let queryValues: any = {
            searchText: searchText,
            "$expand": expand,
            artifactType: artifactType,
            artifactSourceId: artifactSourceId,
            "$top": top,
            continuationToken: continuationToken,
            queryOrder: queryOrder,
            path: path,
            isExactNameMatch: isExactNameMatch,
            tagFilter: tagFilter && tagFilter.join(","),
            propertyFilters: propertyFilters && propertyFilters.join(",")
        };

        let that = this;
        return this._beginRequestWithAjaxResult<RMContracts.ReleaseDefinition[]>({
            httpMethod: "GET",
            area: "Release",
            locationId: "d8f96f24-8ea7-4cb6-baab-2df8fc515665",
            resource: "definitions",
            routeTemplate: "{project}/_apis/{area}/{resource}/{definitionId}",
            responseType: RMContracts.TypeInfo.ReleaseDefinition,
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: this.definitionsApiVersion
        }).spread(
            (definitions: RMContracts.ReleaseDefinition[], textStatus: string, jqXhr: JQueryXHR) => {
                let continuationToken = jqXhr.getResponseHeader("x-ms-continuationtoken");
                if (definitions && continuationToken) {
                    return that.getReleaseDefinitionsWithContinuationToken(project, searchText, expand, artifactType, artifactSourceId, top,
                        continuationToken, queryOrder, path, isExactNameMatch, tagFilter, propertyFilters)
                        .then((result: RMContracts.ReleaseDefinition[]) => {
                            Utils_Array.addRange(definitions, result);
                            return Q(definitions);
                        });
                }
                else {
                    return Q(definitions);
                }
            });
    }
}


export class ReleaseService extends ServiceCommon.BaseService<ReleaseManagementHttpClient> implements IReleaseService {

    public executeCommand(commandName: string, args?: any[]): any {
        let returnValue: any;

        switch (commandName) {
            case ServiceCommon.ReleaseManagementCommand.getReleaseDefinition:
                returnValue = this.getReleaseDefinitions();
                break;
        }

        return returnValue;
    }

    public getHttpClient(tfsConnection: Service.VssConnection): ReleaseManagementHttpClient {
        return tfsConnection.getHttpClient<ReleaseManagementHttpClient>(ReleaseManagementHttpClient);
    }

    public getReleaseDefinition(definitionId: number): IPromise<RMContracts.ReleaseDefinition> {
        return this._httpClient.getReleaseDefinition(this.getProjectName(), definitionId);
    }

    public getReleaseDefinitions(queryOrder?: RMContracts.ReleaseDefinitionQueryOrder): IPromise<RMContracts.ReleaseDefinition[]> {
        return this._httpClient.getReleaseDefinitions(this.getProjectName(), undefined, undefined, undefined, undefined, undefined, undefined, queryOrder);
    }

    public createRelease(releaseDefinitionId: number, environments: string[], buildArtifact: RMContracts.ArtifactMetadata): IPromise<RMContracts.Release> {

        let createReleaseData: RMContracts.ReleaseStartMetadata = {
            artifacts: [],
            definitionId: releaseDefinitionId,
            description: Utils_String.empty,
            isDraft: false,
            manualEnvironments: environments,
            environmentsMetadata:[],
            variables:{},
            properties: {},
            reason: RMContracts.ReleaseReason.Manual
        };
        createReleaseData.artifacts.push(buildArtifact);
        return this._httpClient.createRelease(createReleaseData, this.getProjectName());
    }

    public updateRelease(release: RMContracts.Release): IPromise<RMContracts.Release> {
        return this._httpClient.updateRelease(release, this.getProjectName(), release.id);
    }

    public startReleaseEnvironment(releaseId: number, environmentId: number): IPromise<RMContracts.ReleaseEnvironment> {
        let updateEnvironment: RMContracts.ReleaseEnvironmentUpdateMetadata = {
            status: RMContracts.EnvironmentStatus.InProgress,
        } as RMContracts.ReleaseEnvironmentUpdateMetadata;

        return this._httpClient.updateReleaseEnvironment(updateEnvironment, this.getProjectName(), releaseId, environmentId);
    }

    public getReleaseDefinitionsForBuildDefinition(buildDefinitionId: number, expand?: RMContracts.ReleaseDefinitionExpands): IPromise<RMContracts.ReleaseDefinition[]> {
        let artifactSourceId: string = Utils_String.format("{0}:{1}", this.getWebContext().project.id, buildDefinitionId);
        let artifactsType: string = "build";
        
        return this._httpClient.getReleaseDefinitionsWithContinuationToken(this.getProjectName(), null, expand, artifactsType, artifactSourceId);
    }
}
