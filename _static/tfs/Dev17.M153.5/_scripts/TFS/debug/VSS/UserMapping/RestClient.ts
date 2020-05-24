/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\usermapping.genclient.json
 */

"use strict";

import Contracts = require("VSS/UserMapping/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

export class CommonMethods3_1To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = VSS_WebApi_Constants.ServiceInstanceTypes.SPS;
    protected userAccountMappingsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} userId
     * @param {Contracts.UserType} userType
     * @param {boolean} useEqualsCheckForUserTypeMatch
     * @param {boolean} includeDeletedAccounts
     * @return IPromise<string[]>
     */
    public queryAccountIds(
        userId: string,
        userType: Contracts.UserType,
        useEqualsCheckForUserTypeMatch?: boolean,
        includeDeletedAccounts?: boolean
        ): IPromise<string[]> {

        const queryValues: any = {
            userType: userType,
            useEqualsCheckForUserTypeMatch: useEqualsCheckForUserTypeMatch,
            includeDeletedAccounts: includeDeletedAccounts
        };

        return this._beginRequest<string[]>({
            httpMethod: "GET",
            area: "UserMapping",
            locationId: "0dbf02cc-5ec3-4250-a145-5beb580e0086",
            resource: "UserAccountMappings",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            responseIsCollection: true,
            routeValues: {
                userId: userId
            },
            queryParams: queryValues,
            apiVersion: this.userAccountMappingsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} userId
     * @param {string} accountId
     * @param {Contracts.UserType} userType
     * @return IPromise<void>
     */
    public activateUserAccountMapping(
        userId: string,
        accountId: string,
        userType?: Contracts.UserType
        ): IPromise<void> {

        const queryValues: any = {
            accountId: accountId,
            userType: userType
        };

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "UserMapping",
            locationId: "0dbf02cc-5ec3-4250-a145-5beb580e0086",
            resource: "UserAccountMappings",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            routeValues: {
                userId: userId
            },
            queryParams: queryValues,
            apiVersion: this.userAccountMappingsApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class UserMappingHttpClient5 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.userAccountMappingsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class UserMappingHttpClient4_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.userAccountMappingsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class UserMappingHttpClient4 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.userAccountMappingsApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class UserMappingHttpClient3_2 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.userAccountMappingsApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class UserMappingHttpClient3_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.userAccountMappingsApiVersion = "3.1-preview.1";
    }
}

export class UserMappingHttpClient extends UserMappingHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": UserMappingHttpClient5,
    "4.1": UserMappingHttpClient4_1,
    "4.0": UserMappingHttpClient4,
    "3.2": UserMappingHttpClient3_2,
    "3.1": UserMappingHttpClient3_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return UserMappingHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): UserMappingHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<UserMappingHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<UserMappingHttpClient5>(UserMappingHttpClient5, undefined, undefined, undefined, options);
    }
}
