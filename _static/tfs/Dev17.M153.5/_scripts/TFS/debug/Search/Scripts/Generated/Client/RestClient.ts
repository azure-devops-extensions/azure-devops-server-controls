/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://vsowiki.com/index.php?title=Rest_Client_Generation
 *
 * Configuration file:
 *   search\client\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("Search/Scripts/Generated/Contracts");
import Search_Shared_Contracts = require("Search/Scripts/Generated/Search.Shared.Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000010-0000-8888-8000-000000000000";
    protected advancedCodeSearchResultsApiVersion: string;
    protected codeSearchResultsApiVersion: string;
    protected wikiSearchResultsApiVersion: string;
    protected workItemSearchResultsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Provides a set of results for the search text.
     *
     * @param {Contracts.WorkItemSearchRequest} request - The Work Item Search Request.
     * @param {string} project - Project ID or project name
     * @return IPromise<Contracts.WorkItemSearchResponse>
     */
    public fetchWorkItemSearchResults(
        request: Contracts.WorkItemSearchRequest,
        project?: string
        ): IPromise<Contracts.WorkItemSearchResponse> {

        return this._beginRequest<Contracts.WorkItemSearchResponse>({
            httpMethod: "POST",
            area: "search",
            locationId: "73b2c9e2-ff9e-4447-8cda-5f5b21ff7cae",
            resource: "workItemSearchResults",
            routeTemplate: "{project}/_apis/{area}/{resource}",
            routeValues: {
                project: project
            },
            apiVersion: this.workItemSearchResultsApiVersion,
            data: request
        });
    }

    /**
     * [Preview API] Provides a set of results for the search request.
     *
     * @param {Search_Shared_Contracts.WikiSearchRequest} request - The Wiki Search Request.
     * @param {string} project - Project ID or project name
     * @return IPromise<Search_Shared_Contracts.WikiSearchResponse>
     */
    public fetchWikiSearchResults(
        request: Search_Shared_Contracts.WikiSearchRequest,
        project?: string
        ): IPromise<Search_Shared_Contracts.WikiSearchResponse> {

        return this._beginRequest<Search_Shared_Contracts.WikiSearchResponse>({
            httpMethod: "POST",
            area: "search",
            locationId: "e90e7664-7049-4100-9a86-66b161d81080",
            resource: "wikiSearchResults",
            routeTemplate: "{project}/_apis/{area}/{resource}",
            routeValues: {
                project: project
            },
            apiVersion: this.wikiSearchResultsApiVersion,
            data: request
        });
    }

    /**
     * [Preview API] Provides a set of results for the search text.
     *
     * @param {Contracts.CodeSearchRequest} request - The Code Search Request.
     * @param {string} project - Project ID or project name
     * @return IPromise<Contracts.CodeSearchResponse>
     */
    public fetchCodeSearchResults(
        request: Contracts.CodeSearchRequest,
        project?: string
        ): IPromise<Contracts.CodeSearchResponse> {

        return this._beginRequest<Contracts.CodeSearchResponse>({
            httpMethod: "POST",
            area: "search",
            locationId: "e7f29993-5b82-4fca-9386-f5cfe683d524",
            resource: "codeSearchResults",
            routeTemplate: "{project}/_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.CodeSearchResponse,
            routeValues: {
                project: project
            },
            apiVersion: this.codeSearchResultsApiVersion,
            data: request
        });
    }

    /**
     * @internal
     * [Preview API] Provides a set of results for the search text.
     *
     * @param {Contracts.CodeSearchRequest} request - The Code Search Request.
     * @param {string} project - Project ID or project name
     * @return IPromise<Contracts.CodeSearchResponse>
     */
    public fetchAdvancedCodeSearchResults(
        request: Contracts.CodeSearchRequest,
        project?: string
        ): IPromise<Contracts.CodeSearchResponse> {

        return this._beginRequest<Contracts.CodeSearchResponse>({
            httpMethod: "POST",
            area: "search",
            locationId: "6bc8d206-9a7e-4cfb-83e1-c9a81e7bf166",
            resource: "advancedCodeSearchResults",
            routeTemplate: "{project}/_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.CodeSearchResponse,
            routeValues: {
                project: project
            },
            apiVersion: this.advancedCodeSearchResultsApiVersion,
            data: request
        });
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.advancedCodeSearchResultsApiVersion =
        this.codeSearchResultsApiVersion =
        this.wikiSearchResultsApiVersion =
        this.workItemSearchResultsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.advancedCodeSearchResultsApiVersion =
        this.codeSearchResultsApiVersion =
        this.wikiSearchResultsApiVersion =
        this.workItemSearchResultsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.advancedCodeSearchResultsApiVersion =
        this.codeSearchResultsApiVersion =
        this.wikiSearchResultsApiVersion =
        this.workItemSearchResultsApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.advancedCodeSearchResultsApiVersion =
        this.codeSearchResultsApiVersion =
        this.wikiSearchResultsApiVersion =
        this.workItemSearchResultsApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.advancedCodeSearchResultsApiVersion =
        this.codeSearchResultsApiVersion =
        this.wikiSearchResultsApiVersion =
        this.workItemSearchResultsApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.advancedCodeSearchResultsApiVersion =
        this.codeSearchResultsApiVersion =
        this.wikiSearchResultsApiVersion =
        this.workItemSearchResultsApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.advancedCodeSearchResultsApiVersion =
        this.codeSearchResultsApiVersion =
        this.wikiSearchResultsApiVersion =
        this.workItemSearchResultsApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.advancedCodeSearchResultsApiVersion =
        this.codeSearchResultsApiVersion =
        this.wikiSearchResultsApiVersion =
        this.workItemSearchResultsApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.advancedCodeSearchResultsApiVersion =
        this.codeSearchResultsApiVersion =
        this.wikiSearchResultsApiVersion =
        this.workItemSearchResultsApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.advancedCodeSearchResultsApiVersion =
        this.codeSearchResultsApiVersion =
        this.wikiSearchResultsApiVersion =
        this.workItemSearchResultsApiVersion = "2.0-preview.1";
    }
}

export class SearchHttpClient extends SearchHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": SearchHttpClient5,
    "4.1": SearchHttpClient4_1,
    "4.0": SearchHttpClient4,
    "3.2": SearchHttpClient3_2,
    "3.1": SearchHttpClient3_1,
    "3.0": SearchHttpClient3,
    "2.3": SearchHttpClient2_3,
    "2.2": SearchHttpClient2_2,
    "2.1": SearchHttpClient2_1,
    "2.0": SearchHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return SearchHttpClient4_1
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): SearchHttpClient4_1 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<SearchHttpClient4_1>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<SearchHttpClient4_1>(SearchHttpClient4_1, undefined, undefined, undefined, options);
    }
}
