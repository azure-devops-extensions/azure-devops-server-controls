/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://vsowiki.com/index.php?title=Rest_Client_Generation
 *
 * Configuration file:
 *   Search\Client\WebApiLegacy\ClientGeneratorConfigs\genclient.json
 */

"use strict";

import Search_Shared_Legacy_Contracts = require("Search/Scripts/Generated/Search.SharedLegacy.Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To4_1 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000010-0000-8888-8000-000000000000";
    protected wikiQueryResultsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Provides set of results which match the posted query.
     *
     * @param {Search_Shared_Legacy_Contracts.WikiSearchQuery} query - The search query.
     * @return IPromise<Search_Shared_Legacy_Contracts.WikiQueryResponse>
     */
    public createWikiQuery(
        query: Search_Shared_Legacy_Contracts.WikiSearchQuery
        ): IPromise<Search_Shared_Legacy_Contracts.WikiQueryResponse> {
        
        return this._beginRequest<Search_Shared_Legacy_Contracts.WikiQueryResponse>({
            httpMethod: "POST",
            area: "search",
            locationId: "ec68b2e5-277d-4026-9da8-bb72dc70d9f8",
            resource: "wikiQueryResults",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Search_Shared_Legacy_Contracts.TypeInfo.WikiQueryResponse,
            apiVersion: this.wikiQueryResultsApiVersion,
            data: query
        });
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient4_1 extends CommonMethods2To4_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.wikiQueryResultsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient4 extends CommonMethods2To4_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.wikiQueryResultsApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient3_2 extends CommonMethods2To4_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.wikiQueryResultsApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient3_1 extends CommonMethods2To4_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.wikiQueryResultsApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient3 extends CommonMethods2To4_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.wikiQueryResultsApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient2_3 extends CommonMethods2To4_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.wikiQueryResultsApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient2_2 extends CommonMethods2To4_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.wikiQueryResultsApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient2_1 extends CommonMethods2To4_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.wikiQueryResultsApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SearchHttpClient2 extends CommonMethods2To4_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.wikiQueryResultsApiVersion = "2.0-preview.1";
    }
}

export class SearchHttpClient extends SearchHttpClient4_1 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
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
 * @return SearchHttpClient4
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): SearchHttpClient4 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<SearchHttpClient4>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<SearchHttpClient4>(SearchHttpClient4, undefined, undefined, undefined, options);
    }
}
