/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   feed\client\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000036-0000-8888-8000-000000000000";
    protected sessionTokensApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Get a time-limited session token representing the current user, with permissions scoped to the read/write of Artifacts.
     *
     * @param {string} feedName
     * @param {string} tokenType - Type of token to retrieve (e.g. 'SelfDescribing', 'Compact').
     * @return IPromise<any>
     */
    public getPersonalAccessToken(
        feedName?: string,
        tokenType?: string
        ): IPromise<any> {

        const queryValues: any = {
            tokenType: tokenType
        };

        return this._beginRequest<any>({
            httpMethod: "GET",
            area: "FeedToken",
            locationId: "dfdb7ad7-3d8e-4907-911e-19b4a8330550",
            resource: "SessionTokens",
            routeTemplate: "_apis/{area}/{resource}/{feedName}",
            routeValues: {
                feedName: feedName
            },
            queryParams: queryValues,
            apiVersion: this.sessionTokensApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class FeedTokenHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokensApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedTokenHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokensApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedTokenHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokensApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedTokenHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokensApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedTokenHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokensApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedTokenHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokensApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedTokenHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokensApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedTokenHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokensApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedTokenHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokensApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedTokenHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokensApiVersion = "2.0-preview.1";
    }
}

export class FeedTokenHttpClient extends FeedTokenHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": FeedTokenHttpClient5,
    "4.1": FeedTokenHttpClient4_1,
    "4.0": FeedTokenHttpClient4,
    "3.2": FeedTokenHttpClient3_2,
    "3.1": FeedTokenHttpClient3_1,
    "3.0": FeedTokenHttpClient3,
    "2.3": FeedTokenHttpClient2_3,
    "2.2": FeedTokenHttpClient2_2,
    "2.1": FeedTokenHttpClient2_1,
    "2.0": FeedTokenHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return FeedTokenHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): FeedTokenHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<FeedTokenHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<FeedTokenHttpClient5>(FeedTokenHttpClient5, undefined, undefined, undefined, options);
    }
}
