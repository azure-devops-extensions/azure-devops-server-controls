/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   aex\service\user\server\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("Aex/UserAad/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods4_1To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000041-0000-8888-8000-000000000000";
    protected aadMembershipApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {number} max
     * @return IPromise<Contracts.UserAadMembershipData>
     */
    public getUserAadMembership(
        max?: number
        ): IPromise<Contracts.UserAadMembershipData> {

        const queryValues: any = {
            max: max
        };

        return this._beginRequest<Contracts.UserAadMembershipData>({
            httpMethod: "GET",
            area: "UserAad",
            locationId: "a6dd3765-cde6-4278-a12f-527b2d22fc1d",
            resource: "AadMembership",
            routeTemplate: "_apis/{area}/{resource}",
            queryParams: queryValues,
            apiVersion: this.aadMembershipApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class UserAadHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.aadMembershipApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class UserAadHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.aadMembershipApiVersion = "4.1-preview.1";
    }
}

export class UserAadHttpClient extends UserAadHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": UserAadHttpClient5,
    "4.1": UserAadHttpClient4_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return UserAadHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): UserAadHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<UserAadHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<UserAadHttpClient5>(UserAadHttpClient5, undefined, undefined, undefined, options);
    }
}
