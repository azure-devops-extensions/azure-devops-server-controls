/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("VSS/Authentication/Contracts");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected sessionTokenApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.WebSessionToken} sessionToken
     * @return IPromise<Contracts.WebSessionToken>
     */
    public createSessionToken(
        sessionToken: Contracts.WebSessionToken
        ): IPromise<Contracts.WebSessionToken> {

        return this._beginRequest<Contracts.WebSessionToken>({
            httpMethod: "POST",
            area: "WebPlatformAuth",
            locationId: "11420b6b-3324-490a-848d-b8aafdb906ba",
            resource: "SessionToken",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: Contracts.TypeInfo.WebSessionToken,
            responseType: Contracts.TypeInfo.WebSessionToken,
            apiVersion: this.sessionTokenApiVersion,
            data: sessionToken
        });
    }
}

/**
 * @exemptedapi
 */
export class AuthenticationHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokenApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class AuthenticationHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokenApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class AuthenticationHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokenApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class AuthenticationHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokenApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class AuthenticationHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokenApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class AuthenticationHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokenApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class AuthenticationHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokenApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class AuthenticationHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokenApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class AuthenticationHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokenApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class AuthenticationHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.sessionTokenApiVersion = "2.0-preview.1";
    }
}

export class AuthenticationHttpClient extends AuthenticationHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}
