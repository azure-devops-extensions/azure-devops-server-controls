// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import ProjectConstants = require("Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import WebApi_RestClient = require("VSS/WebApi/RestClient");
import Search_WebApi_Types = require("Search/Scripts/WebApi/TFS.Search.WebApi.Types");
import Q = require("q");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");

interface ProjectQuery { 
    projectId: string
};

export interface CustomProjectData {
    name: string;
    id: string;
    projectName: string;
    projectId: string;
}

export class SearchHttpClient extends WebApi_RestClient.VssHttpClient {

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    /**
     * Gets team projects
     * Copied from Admin/Scripts/TFS.Project.WebApi.ts 
     * Scope of this api is at collection level
     * Returns a Q promise. The promise is resolved with the list of projects(without capabilities) on successful
     * completion of the async call otherwise the promise is rejected with error.
     */
    public beginGetProjects(): Q.Promise<TFS_Core_Contracts.WebApiProject[]> {
        var deferred = Q.defer<TFS_Core_Contracts.WebApiProject[]>();
        var getProjectsPromise = this._beginRequest<TFS_Core_Contracts.WebApiProject[]>({
            area: ProjectConstants.CoreConstants.AreaName,
            locationId: ProjectConstants.CoreConstants.ProjectsLocationId,
            responseIsCollection: true
        });

        getProjectsPromise.then((response: TFS_Core_Contracts.WebApiProject[]) => {
            deferred.resolve(response);
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    /**
     * Get the project details given the project Id.
     * Returns a Q promise, resolved with the response(webApiProject) on successful completion of the async call.
     * otherwise rejected with error.
     */
    public beginGetProject(projectId: string): Q.Promise<TFS_Core_Contracts.WebApiProject> {
        var deferred = Q.defer<TFS_Core_Contracts.WebApiProject>();

        var getProjectPromise = this._beginRequest<TFS_Core_Contracts.WebApiProject>({
            area: ProjectConstants.CoreConstants.AreaName,
            locationId: ProjectConstants.CoreConstants.ProjectsLocationId,
            routeValues: {
                projectId: projectId
            },
            queryParams: {
                includeCapabilities: true
            }
        })

        getProjectPromise.then((response: TFS_Core_Contracts.WebApiProject) => {
            deferred.resolve(response);
        }, (error: any) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }


    public beingGetCustomProjects(): Q.Promise<Array<string>> {
        var actionUrl: string = Context.SearchContext.getActionUrl("getCustomProjects"),
            deferred: Q.Deferred<Array<string>> = Q.defer<Array<string>>(),
            scope: any = Context.SearchContext.getTfsContext().contextData.account.name;

        var ajaxOptions: JQueryAjaxSettings = {};
        Ajax.getMSJSON(
            actionUrl,
            {
                scope: scope
            },
            (jsonResult, statusText, responseHeaders) => {
                deferred.resolve(jsonResult);
            },
            (error) => {
                deferred.reject(error);
            },
            ajaxOptions);

        return deferred.promise;
    }
}
