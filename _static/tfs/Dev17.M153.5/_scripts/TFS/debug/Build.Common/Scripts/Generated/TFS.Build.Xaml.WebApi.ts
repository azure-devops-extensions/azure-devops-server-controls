/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
* 
* ---------------------------------------------------------
* Generated file, DO NOT EDIT
* ---------------------------------------------------------
*
* See following wiki page for instructions on how to regenerate:
*   https://vsowiki.com/index.php?title=Rest_Client_Generation
*/


"use strict";

import TFS_Build_Contracts = require("Build.Common/Scripts/Generated/TFS.Build.Xaml.Contracts");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

export class BuildHttpClient extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = VSS_WebApi_Constants.ServiceInstanceTypes.TFS;

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    /**
     * Deletes a build
     * 
     * @param {number} buildId
     * @param {string} project - Project ID or project name
     * @return IPromise<void>
     */
    public deleteBuild(
        buildId: number,
        project?: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Build",
            locationId: "0cd358e1-9217-4d94-8269-1c1ee6f93dcf",
            resource: "Builds",
            routeTemplate: "{project}/_apis/build/{resource}/{buildId}",
            routeValues: {
                project: project,
                buildId: buildId,
            },
            apiVersion: "1.0"
        });
    }

    /**
     * Returns a data representation of the requested build object
     * 
     * @param {number} buildId
     * @param {string} project - Project ID or project name
     * @return IPromise<TFS_Build_Contracts.Build>
     */
    public getBuild(
        buildId: number,
        project?: string
        ): IPromise<TFS_Build_Contracts.Build> {

        return this._beginRequest<TFS_Build_Contracts.Build>({
            httpMethod: "GET",
            area: "Build",
            locationId: "0cd358e1-9217-4d94-8269-1c1ee6f93dcf",
            resource: "Builds",
            routeTemplate: "{project}/_apis/build/{resource}/{buildId}",
            responseType: TFS_Build_Contracts.TypeInfo.Build,
            routeValues: {
                project: project,
                buildId: buildId,
            },
            apiVersion: "1.0"
        });
    }

    /**
     * @param {string} project - Project ID or project name
     * @param {string} projectName
     * @param {string} requestedFor
     * @param {string} definition
     * @param {number} maxBuildsPerDefinition
     * @param {number} skip
     * @param {number} top
     * @param {string} ids
     * @param {Date} minFinishTime
     * @param {string} quality
     * @param {TFS_Build_Contracts.BuildStatus} status
     * @return IPromise<TFS_Build_Contracts.Build[]>
     */
    public getBuilds(
        project?: string,
        projectName?: string,
        requestedFor?: string,
        definition?: string,
        maxBuildsPerDefinition?: number,
        skip?: number,
        top?: number,
        ids?: string,
        minFinishTime?: Date,
        quality?: string,
        status?: TFS_Build_Contracts.BuildStatus
        ): IPromise<TFS_Build_Contracts.Build[]> {

        var queryValues: any = {
            projectName: projectName,
            requestedFor: requestedFor,
            definition: definition,
            maxBuildsPerDefinition: maxBuildsPerDefinition,
            '$skip': skip,
            '$top': top,
            ids: ids,
            minFinishTime: minFinishTime,
            quality: quality,
            status: status,
        };

        return this._beginRequest<TFS_Build_Contracts.Build[]>({
            httpMethod: "GET",
            area: "Build",
            locationId: "0cd358e1-9217-4d94-8269-1c1ee6f93dcf",
            resource: "Builds",
            routeTemplate: "{project}/_apis/build/{resource}/{buildId}",
            responseType: TFS_Build_Contracts.TypeInfo.Build,
            responseIsCollection: true,
            routeValues: {
                project: project,
            },
            queryParams: queryValues,
            apiVersion: "1.0"
        });
    }

    /**
     * @param {TFS_Build_Contracts.Build} build
     * @param {number} buildId
     * @param {string} project - Project ID or project name
     * @return IPromise<TFS_Build_Contracts.Build>
     */
    public updateBuild(
        build: TFS_Build_Contracts.Build,
        buildId: number,
        project?: string
        ): IPromise<TFS_Build_Contracts.Build> {

        return this._beginRequest<TFS_Build_Contracts.Build>({
            httpMethod: "PATCH",
            area: "Build",
            locationId: "0cd358e1-9217-4d94-8269-1c1ee6f93dcf",
            resource: "Builds",
            routeTemplate: "{project}/_apis/build/{resource}/{buildId}",
            requestType: TFS_Build_Contracts.TypeInfo.Build,
            responseType: TFS_Build_Contracts.TypeInfo.Build,
            routeValues: {
                project: project,
                buildId: buildId,
            },
            apiVersion: "1.0",
            data: build
        });
    }

    /**
     * Gets the build definition with id definitionId
     * 
     * @param {number} definitionId
     * @param {string} project - Project ID or project name
     * @return IPromise<TFS_Build_Contracts.BuildDefinition>
     */
    public getDefinition(
        definitionId: number,
        project?: string
        ): IPromise<TFS_Build_Contracts.BuildDefinition> {

        return this._beginRequest<TFS_Build_Contracts.BuildDefinition>({
            httpMethod: "GET",
            area: "Build",
            locationId: "dbeaf647-6167-421a-bda9-c9327b25e2e6",
            resource: "Definitions",
            routeTemplate: "{project}/_apis/build/{resource}/{definitionId}",
            responseType: TFS_Build_Contracts.TypeInfo.BuildDefinition,
            routeValues: {
                project: project,
                definitionId: definitionId,
            },
            apiVersion: "1.0"
        });
    }

    /**
     * Gets all build definitions that fit the specific filter params
     * 
     * @param {string} project - Project ID or project name
     * @param {string} projectName
     * @return IPromise<TFS_Build_Contracts.BuildDefinition[]>
     */
    public getDefinitions(
        project?: string,
        projectName?: string
        ): IPromise<TFS_Build_Contracts.BuildDefinition[]> {

        var queryValues: any = {
            projectName: projectName,
        };

        return this._beginRequest<TFS_Build_Contracts.BuildDefinition[]>({
            httpMethod: "GET",
            area: "Build",
            locationId: "dbeaf647-6167-421a-bda9-c9327b25e2e6",
            resource: "Definitions",
            routeTemplate: "{project}/_apis/build/{resource}/{definitionId}",
            responseType: TFS_Build_Contracts.TypeInfo.BuildDefinition,
            responseIsCollection: true,
            routeValues: {
                project: project,
            },
            queryParams: queryValues,
            apiVersion: "1.0"
        });
    }

    /**
     * @param {TFS_Build_Contracts.DeploymentEnvironmentApiData} deploymentEnvironmentApiData
     * @param {string} project - Project ID or project name
     * @return IPromise<TFS_Build_Contracts.DeploymentEnvironmentMetadata>
     */
    public createDeploymentEnvironments(
        deploymentEnvironmentApiData: TFS_Build_Contracts.DeploymentEnvironmentApiData,
        project: string
        ): IPromise<TFS_Build_Contracts.DeploymentEnvironmentMetadata> {

        return this._beginRequest<TFS_Build_Contracts.DeploymentEnvironmentMetadata>({
            httpMethod: "PUT",
            area: "Build",
            locationId: "32696366-f57b-4529-aec4-61673d4c23c6",
            resource: "DeploymentEnvironments",
            routeTemplate: "{project}/_apis/{area}/{resource}/{serviceName}",
            responseType: TFS_Build_Contracts.TypeInfo.DeploymentEnvironmentMetadata,
            routeValues: {
                project: project,
            },
            apiVersion: "1.0",
            data: deploymentEnvironmentApiData
        });
    }

    /**
     * @param {string} project - Project ID or project name
     * @param {string} serviceName
     * @return IPromise<TFS_Build_Contracts.DeploymentEnvironmentMetadata[]>
     */
    public getDeploymentEnvironments(
        project: string,
        serviceName?: string
        ): IPromise<TFS_Build_Contracts.DeploymentEnvironmentMetadata[]> {

        return this._beginRequest<TFS_Build_Contracts.DeploymentEnvironmentMetadata[]>({
            httpMethod: "GET",
            area: "Build",
            locationId: "32696366-f57b-4529-aec4-61673d4c23c6",
            resource: "DeploymentEnvironments",
            routeTemplate: "{project}/_apis/{area}/{resource}/{serviceName}",
            responseType: TFS_Build_Contracts.TypeInfo.DeploymentEnvironmentMetadata,
            responseIsCollection: true,
            routeValues: {
                project: project,
                serviceName: serviceName,
            },
            apiVersion: "1.0"
        });
    }

    /**
     * Retrieves the information nodes associated with a build with id buildId
     *
     * @param {number} buildId
     * @param {string[]} types - Types of information nodes to include
     * @param {string} project - Project ID or project name
     * @param {number} top
     * @param {number} skip
     * @return IPromise<TFS_Build_Contracts.InformationNode[]>
     */
    public getDetails(
        buildId: number,
        types: string[],
        project?: string,
        top?: number,
        skip?: number
    ): IPromise<TFS_Build_Contracts.InformationNode[]> {

        var queryValues: any = {
            types: types,
            '$top': top,
            '$skip': skip,
        };

        return this._beginRequest<TFS_Build_Contracts.InformationNode[]>({
            httpMethod: "GET",
            area: "Build",
            locationId: "9f094d42-b41c-4920-95aa-597581a79821",
            resource: "Details",
            routeTemplate: "{project}/_apis/build/Builds/{buildId}/{resource}",
            responseType: TFS_Build_Contracts.TypeInfo.InformationNode,
            responseIsCollection: true,
            routeValues: {
                project: project,
                buildId: buildId,
            },
            queryParams: queryValues,
            apiVersion: "1.0"
        });
    }

    /**
     * @param {string} quality
     * @param {string} project - Project ID or project name
     * @param {string} projectId
     * @return IPromise<void>
     */
    public createQuality(
        quality: string,
        project?: string,
        projectId?: string
        ): IPromise<void> {

        var queryValues: any = {
            projectId: projectId,
        };

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "Build",
            locationId: "82fba9f8-4198-4ab6-b719-6a363880c19e",
            resource: "Qualities",
            routeTemplate: "{project}/_apis/{area}/{resource}/{quality}",
            routeValues: {
                project: project,
                quality: quality,
            },
            queryParams: queryValues,
            apiVersion: "1.0"
        });
    }

    /**
     * @param {string} quality
     * @param {string} project - Project ID or project name
     * @param {string} projectId
     * @return IPromise<void>
     */
    public deleteQuality(
        quality: string,
        project?: string,
        projectId?: string
        ): IPromise<void> {

        var queryValues: any = {
            projectId: projectId,
        };

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Build",
            locationId: "82fba9f8-4198-4ab6-b719-6a363880c19e",
            resource: "Qualities",
            routeTemplate: "{project}/_apis/{area}/{resource}/{quality}",
            routeValues: {
                project: project,
                quality: quality,
            },
            queryParams: queryValues,
            apiVersion: "1.0"
        });
    }

    /**
     * @param {string} project - Project ID or project name
     * @param {string} projectId
     * @return IPromise<TFS_Build_Contracts.InformationNode[]>
     */
    public getQualities(
        project?: string,
        projectId?: string
        ): IPromise<TFS_Build_Contracts.InformationNode[]> {

        var queryValues: any = {
            projectId: projectId,
        };

        return this._beginRequest<TFS_Build_Contracts.InformationNode[]>({
            httpMethod: "GET",
            area: "Build",
            locationId: "82fba9f8-4198-4ab6-b719-6a363880c19e",
            resource: "Qualities",
            routeTemplate: "{project}/_apis/{area}/{resource}/{quality}",
            responseType: TFS_Build_Contracts.TypeInfo.InformationNode,
            responseIsCollection: true,
            routeValues: {
                project: project,
            },
            queryParams: queryValues,
            apiVersion: "1.0"
        });
    }

    /**
     * Gets a specific build controller
     * 
     * @param {number} controllerId
     * @return IPromise<TFS_Build_Contracts.BuildController>
     */
    public getQueue(
        controllerId: number
        ): IPromise<TFS_Build_Contracts.BuildController> {

        return this._beginRequest<TFS_Build_Contracts.BuildController>({
            httpMethod: "GET",
            area: "Build",
            locationId: "09f2a4b8-08c9-4991-85c3-d698937568be",
            resource: "Queues",
            routeTemplate: "_apis/build/{resource}/{controllerId}",
            responseType: TFS_Build_Contracts.TypeInfo.BuildController,
            routeValues: {
                controllerId: controllerId,
            },
            apiVersion: "1.0"
        });
    }

    /**
     * Gets builds controllers
     * 
     * @param {string} controllerName
     * @param {string} serviceHost
     * @return IPromise<TFS_Build_Contracts.BuildController[]>
     */
    public getQueues(
        controllerName?: string,
        serviceHost?: string
        ): IPromise<TFS_Build_Contracts.BuildController[]> {

        var queryValues: any = {
            controllerName: controllerName,
            serviceHost: serviceHost,
        };

        return this._beginRequest<TFS_Build_Contracts.BuildController[]>({
            httpMethod: "GET",
            area: "Build",
            locationId: "09f2a4b8-08c9-4991-85c3-d698937568be",
            resource: "Queues",
            routeTemplate: "_apis/build/{resource}/{controllerId}",
            responseType: TFS_Build_Contracts.TypeInfo.BuildController,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "1.0"
        });
    }

    /**
     * Queue a new build
     * 
     * @param {TFS_Build_Contracts.BuildRequest} postContract
     * @param {string} project - Project ID or project name
     * @return IPromise<TFS_Build_Contracts.BuildRequest>
     */
    public createRequest(
        postContract: TFS_Build_Contracts.BuildRequest,
        project?: string
        ): IPromise<TFS_Build_Contracts.BuildRequest> {

        return this._beginRequest<TFS_Build_Contracts.BuildRequest>({
            httpMethod: "POST",
            area: "Build",
            locationId: "de3e9770-c7ef-4697-983e-f4b5bab3c016",
            resource: "Requests",
            routeTemplate: "{project}/_apis/build/{resource}/{requestId}",
            requestType: TFS_Build_Contracts.TypeInfo.BuildRequest,
            responseType: TFS_Build_Contracts.TypeInfo.BuildRequest,
            routeValues: {
                project: project,
            },
            apiVersion: "1.0",
            data: postContract
        });
    }

    /**
     * Cancel a build request
     * 
     * @param {number} requestId
     * @param {string} project - Project ID or project name
     * @return IPromise<void>
     */
    public deleteRequest(
        requestId: number,
        project?: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Build",
            locationId: "de3e9770-c7ef-4697-983e-f4b5bab3c016",
            resource: "Requests",
            routeTemplate: "{project}/_apis/build/{resource}/{requestId}",
            routeValues: {
                project: project,
                requestId: requestId,
            },
            apiVersion: "1.0"
        });
    }

    /**
     * @param {number} requestId
     * @param {string} project - Project ID or project name
     * @return IPromise<TFS_Build_Contracts.BuildRequest>
     */
    public getRequest(
        requestId: number,
        project?: string
        ): IPromise<TFS_Build_Contracts.BuildRequest> {

        return this._beginRequest<TFS_Build_Contracts.BuildRequest>({
            httpMethod: "GET",
            area: "Build",
            locationId: "de3e9770-c7ef-4697-983e-f4b5bab3c016",
            resource: "Requests",
            routeTemplate: "{project}/_apis/build/{resource}/{requestId}",
            responseType: TFS_Build_Contracts.TypeInfo.BuildRequest,
            routeValues: {
                project: project,
                requestId: requestId,
            },
            apiVersion: "1.0"
        });
    }

    /**
     * Gets requests according to the filter
     * 
     * @param {string} project - Project ID or project name
     * @param {string} projectName
     * @param {string} requestedFor
     * @param {number} queueId
     * @param {string} controllerName
     * @param {number} definitionId
     * @param {string} definitionName
     * @param {number} skip
     * @param {number} top
     * @param {string} ids
     * @param {number} maxCompletedAge
     * @param {TFS_Build_Contracts.QueueStatus} status
     * @return IPromise<TFS_Build_Contracts.BuildRequest[]>
     */
    public getRequests(
        project?: string,
        projectName?: string,
        requestedFor?: string,
        queueId?: number,
        controllerName?: string,
        definitionId?: number,
        definitionName?: string,
        skip?: number,
        top?: number,
        ids?: string,
        maxCompletedAge?: number,
        status?: TFS_Build_Contracts.QueueStatus
        ): IPromise<TFS_Build_Contracts.BuildRequest[]> {

        var queryValues: any = {
            projectName: projectName,
            requestedFor: requestedFor,
            queueId: queueId,
            controllerName: controllerName,
            definitionId: definitionId,
            definitionName: definitionName,
            '$skip': skip,
            '$top': top,
            ids: ids,
            maxCompletedAge: maxCompletedAge,
            status: status,
        };

        return this._beginRequest<TFS_Build_Contracts.BuildRequest[]>({
            httpMethod: "GET",
            area: "Build",
            locationId: "de3e9770-c7ef-4697-983e-f4b5bab3c016",
            resource: "Requests",
            routeTemplate: "{project}/_apis/build/{resource}/{requestId}",
            responseType: TFS_Build_Contracts.TypeInfo.BuildRequest,
            responseIsCollection: true,
            routeValues: {
                project: project,
            },
            queryParams: queryValues,
            apiVersion: "1.0"
        });
    }

    /**
     * @param {TFS_Build_Contracts.BuildRequest} request
     * @param {number} requestId
     * @param {string} project - Project ID or project name
     * @return IPromise<void>
     */
    public updateRequestStatus(
        request: TFS_Build_Contracts.BuildRequest,
        requestId: number,
        project?: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Build",
            locationId: "de3e9770-c7ef-4697-983e-f4b5bab3c016",
            resource: "Requests",
            routeTemplate: "{project}/_apis/build/{resource}/{requestId}",
            requestType: TFS_Build_Contracts.TypeInfo.BuildRequest,
            routeValues: {
                project: project,
                requestId: requestId,
            },
            apiVersion: "1.0",
            data: request
        });
    }
}
