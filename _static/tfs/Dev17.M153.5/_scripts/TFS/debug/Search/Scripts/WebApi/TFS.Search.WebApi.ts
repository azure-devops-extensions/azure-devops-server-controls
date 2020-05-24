// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Code_Contracts = require("Search/Scripts/Contracts/TFS.Search.Code.Contracts");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Search_WebApi_Types = require("Search/Scripts/WebApi/TFS.Search.WebApi.Types");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Utils = require("VSS/Utils/Core");
import VSS_OM = require("VSS/Service");
import WebApi_RestClient = require("VSS/WebApi/RestClient");

/**
* Http client for search service, exposes direct REST calls
*/
export class SearchHttpClient extends WebApi_RestClient.VssHttpClient {

    public static serviceInstanceId = "00000010-0000-8888-8000-000000000000";

    public beginPostCodeQuery(searchQuery: Code_Contracts.ICodeSearchQuery, activityId: string): IPromise<any> {
        return this._beginRequest({
            area: Search_WebApi_Types.WebApiConstants.Area,
            locationId: Search_WebApi_Types.WebApiConstants.CodeQueryResultsLocationId,
            apiVersion: Search_WebApi_Types.WebApiConstants.SearchApiVersion,
            resource: Search_WebApi_Types.WebApiConstants.CodeQueryResultsApi,
            routeTemplate: "_apis/{area}/{resource}",
            httpMethod: "POST",
            responseType: Search_WebApi_Types.TypeInfo.ICodeSearchQueryResponse,
            data: searchQuery,
            customHeaders: {
                "X-TFS-Session": activityId
            }
        });
    }

    public beginPostTenantCodeQuery(searchQuery: Code_Contracts.ICodeSearchQuery, activityId: string): IPromise<any> {
        return this._beginRequest({
            area: Search_WebApi_Types.WebApiConstants.Area,
            locationId: Search_WebApi_Types.WebApiConstants.TenantCodeQueryResultsLocationId,
            apiVersion: Search_WebApi_Types.WebApiConstants.SearchApiVersion,
            resource: Search_WebApi_Types.WebApiConstants.CodeQueryResultsApi,
            routeTemplate: "_apis/{area}/{resource}",
            httpMethod: "POST",
            responseType: Search_WebApi_Types.TypeInfo.ICodeSearchQueryResponse,
            data: searchQuery,
            customHeaders: {
                "X-TFS-Session": activityId
            }
        });
    }

    public beginPostProjectQuery(searchQuery: Core_Contracts.ISearchQuery, activityId: string): IPromise<any> {
        return this._beginRequest({
            area: Search_WebApi_Types.WebApiConstants.Area,
            locationId: Search_WebApi_Types.WebApiConstants.ProjectQueryResultsLocationId,
            apiVersion: Search_WebApi_Types.WebApiConstants.SearchApiVersion,
            resource: Search_WebApi_Types.WebApiConstants.ProjectQueryResultsApi,
            routeTemplate: "_apis/{area}/{resource}",
            httpMethod: "POST",
            responseType: Search_WebApi_Types.TypeInfo.IProjectSearchQueryResponse,
            data: searchQuery,
            customHeaders: {
                "X-TFS-Session": activityId
            }
        });
    }

    public beginGetCustomFileContent(
        scope: string,
        projectName: string,
        repositoryName: string,
        branchName: string,
        filePath: string): IPromise<any> {
        return this._beginRequest({
            httpMethod: "GET",
            area: Search_WebApi_Types.WebApiConstants.Area,
            locationId: Search_WebApi_Types.WebApiConstants.CodeIndexLocationId ,
            apiVersion: Search_WebApi_Types.WebApiConstants.SearchApiVersion,
            resource: Search_WebApi_Types.WebApiConstants.codeIndexApi,
            routeTemplate: "_apis/{area}/{resource}",
            queryParams: {
                scope: scope,
                projectName: projectName,
                repositoryName: repositoryName,
                branchName: branchName,
                filePath: filePath
            }
        });
    }

    public beginGetSourceDepotFileDownload(
        scope: string,
        projectName: string,
        repositoryName: string,
        branchName: string,
        filePath: string): IPromise<any> {
        return this._beginRequest({
            httpMethod: "GET",
            area: Search_WebApi_Types.WebApiConstants.Area,
            locationId: Search_WebApi_Types.WebApiConstants.CodeIndexLocationId,
            apiVersion: Search_WebApi_Types.WebApiConstants.SearchApiVersion,
            resource: Search_WebApi_Types.WebApiConstants.codeIndexApi,
            routeTemplate: "_apis/{area}/{resource}",
            queryParams: {
                scope: scope,
                projectName: projectName,
                repositoryName: repositoryName,
                branchName: branchName,
                filePath: filePath
            }
        });
    }
}

/**
* Helper class defines methods to get SearchHttpClient or to route requests through TFS search controller
*/
export class SearchClient {

    private static m_isCORSEnabled: boolean = false;
    private static m_searchClient: SearchHttpClient = undefined;

    private static initalize(): void {
        if (Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchCORS)) {
            SearchClient.m_isCORSEnabled = true;
        }

        if (SearchClient.m_isCORSEnabled) {
            if (Context.SearchContext.isAccountContext()) {
                // Cloning the tfsContext and modifying it to behave like ProjectCollection
                var collectionTfsWebContext = Context.SearchContext.createCollectionTfsContext("defaultcollection");
                SearchClient.m_searchClient = VSS_OM.getClient(SearchHttpClient, collectionTfsWebContext.contextData);
            }
            else {
                SearchClient.m_searchClient = VSS_OM.getClient(SearchHttpClient);
            }
        }
        else {
            SearchClient.m_searchClient = null;
        }
    }

    public static getSearchHttpClient(): SearchHttpClient {
        if (SearchClient.m_searchClient === undefined) {
            SearchClient.initalize();
        }

        return SearchClient.m_searchClient;
    }

    public static postMSJSON(action: string, activityId: string, query: string, scope: string,
        filters: Core_Contracts.IFilterCategory[], skip: number, take: number,
        successCallback, errorCallback, sortOptions?: string): void {

        var actionUrl: string = Context.SearchContext.getActionUrl(action);

        // convert list of filters to dictionary since this should be serialized
        // and send to Tfs Controller as expected by the REST API
        var filtersMap = {};
        if (filters) {
            filters.forEach((filter: Core_Contracts.IFilterCategory) => {               
                filtersMap[filter.name] = filter.values;
            });            
        }
        
        var filtersMapJson: string;        
        if (filters) {
            filtersMapJson = Utils.stringifyMSJSON(filtersMap);            
        }

        var ajaxOptions: JQueryAjaxSettings = {};
        ajaxOptions.headers = {
            "X-TFS-Session": activityId  // map doesn't allow keys to be a variable, hence can't use HttpHeaderTfsSessionId here
        };

        Ajax.postMSJSON(
            actionUrl,
            {
                searchText: query,
                scope: scope,
                filters: filtersMapJson,
                skipResults: skip,
                takeResults: take,
                sortOptions: sortOptions
            },
            successCallback,
            errorCallback,
            ajaxOptions);
    }

}
