/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   tfs\client\connectedservice\clientgeneratorconfigs\genclient.json
 */

"use strict";

import ConnectedService = require("Admin/Scripts/Generated/ConnectedService");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected authRequestsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * @param {string} project - Project ID or project name
     * @param {string} providerId
     * @param {string} oauthTokenKey
     * @return IPromise<ConnectedService.Installation[]>
     */
    public getAppInstallations(
        project: string,
        providerId: string,
        oauthTokenKey: string
        ): IPromise<ConnectedService.Installation[]> {

        const queryValues: any = {
            oauthTokenKey: oauthTokenKey
        };

        return this._beginRequest<ConnectedService.Installation[]>({
            httpMethod: "POST",
            area: "connectedService",
            locationId: "e921b68f-92d6-44d4-aa88-19c84be1c4c7",
            resource: "authRequests",
            routeTemplate: "{project}/_apis/{area}/providers/{providerId}/{resource}",
            responseIsCollection: true,
            routeValues: {
                project: project,
                providerId: providerId
            },
            queryParams: queryValues,
            apiVersion: this.authRequestsApiVersion
        });
    }

    /**
     * @param {ConnectedService.AuthRequest} authRequest
     * @param {string} project - Project ID or project name
     * @param {string} providerId
     * @param {string} configurationId
     * @param {string} scope
     * @param {string} callbackQueryParams
     * @return IPromise<ConnectedService.AuthRequest>
     */
    public createAuthRequest(
        authRequest: ConnectedService.AuthRequest,
        project: string,
        providerId: string,
        configurationId?: string,
        scope?: string,
        callbackQueryParams?: string
        ): IPromise<ConnectedService.AuthRequest> {

        const queryValues: any = {
            configurationId: configurationId,
            scope: scope,
            callbackQueryParams: callbackQueryParams
        };

        return this._beginRequest<ConnectedService.AuthRequest>({
            httpMethod: "POST",
            area: "connectedService",
            locationId: "e921b68f-92d6-44d4-aa88-19c84be1c4c7",
            resource: "authRequests",
            routeTemplate: "{project}/_apis/{area}/providers/{providerId}/{resource}",
            routeValues: {
                project: project,
                providerId: providerId
            },
            queryParams: queryValues,
            apiVersion: this.authRequestsApiVersion,
            data: authRequest
        });
    }
}

/**
 * @exemptedapi
 */
export class ConnectedServiceHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "5.0";
    }
}

/**
 * @exemptedapi
 */
export class ConnectedServiceHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "4.1";
    }
}

/**
 * @exemptedapi
 */
export class ConnectedServiceHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "4.0";
    }
}

/**
 * @exemptedapi
 */
export class ConnectedServiceHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "3.2";
    }
}

/**
 * @exemptedapi
 */
export class ConnectedServiceHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "3.1";
    }
}

/**
 * @exemptedapi
 */
export class ConnectedServiceHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "3.0";
    }
}

/**
 * @exemptedapi
 */
export class ConnectedServiceHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "2.3";
    }
}

/**
 * @exemptedapi
 */
export class ConnectedServiceHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "2.2";
    }
}

/**
 * @exemptedapi
 */
export class ConnectedServiceHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "2.1";
    }
}

/**
 * @exemptedapi
 */
export class ConnectedServiceHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "2.0";
    }
}

export class ConnectedServiceHttpClient extends ConnectedServiceHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": ConnectedServiceHttpClient5,
    "4.1": ConnectedServiceHttpClient4_1,
    "4.0": ConnectedServiceHttpClient4,
    "3.2": ConnectedServiceHttpClient3_2,
    "3.1": ConnectedServiceHttpClient3_1,
    "3.0": ConnectedServiceHttpClient3,
    "2.3": ConnectedServiceHttpClient2_3,
    "2.2": ConnectedServiceHttpClient2_2,
    "2.1": ConnectedServiceHttpClient2_1,
    "2.0": ConnectedServiceHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return ConnectedServiceHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): ConnectedServiceHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<ConnectedServiceHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<ConnectedServiceHttpClient5>(ConnectedServiceHttpClient5, undefined, undefined, undefined, options);
    }
}
