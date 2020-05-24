// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Context = require("Search/Scripts/Common/TFS.Search.Context");

export interface GitRepository {
    name: string;
    id: string;
    projectName: string;
    projectId: string;
}

export class GitRepositoryClient {
    public beginGetProjectRepositories(projectId: string, activityId: string): JQueryPromise<GitRepository[]> {
        var actionUrl: string = Context.SearchContext.getActionUrl("getProjectRepositories"),
            deferred: JQueryDeferred<GitRepository[]> = jQuery.Deferred();

        var ajaxOptions: JQueryAjaxSettings = {};
        ajaxOptions.headers = {
            "X-TFS-Session": activityId  // map doesn't allow keys to be a variable, hence can't use HttpHeaderTfsSessionId here
        };

        Ajax.getMSJSON(
            actionUrl,
            {
                projectIdentifier: projectId
            },
            (jsonResult, statusText, responseHeaders) => {
                deferred.resolve(this.constructResponse(jsonResult, statusText, responseHeaders));
            },
            (error) => {
                deferred.reject(error);
            },
            ajaxOptions
            );

        return deferred.promise();        
    }

    private constructResponse(response: any, statusText: any, responseHeaders: any): GitRepository[] {
        return response;
    }
}

export class CustomClient
{
    public static beginGetCustomBranch(projectName: string): JQueryPromise<Array<string>> {
        var actionUrl: string = Context.SearchContext.getActionUrl("getCustomBranches"),
            deferred: JQueryDeferred<Array<string>> = jQuery.Deferred(),
            scope: any = Context.SearchContext.getTfsContext().contextData.account.name;

        var ajaxOptions: JQueryAjaxSettings = {};
        Ajax.getMSJSON(
            actionUrl,
            {
                scope: scope,
                projectName: projectName
            },
            (jsonResult, statusText, responseHeaders) => {
                deferred.resolve(jsonResult);
            },
            (error) => {
                deferred.reject(error);
            },
            ajaxOptions);

        return deferred.promise();
    }
}