/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   sps\clients\identity\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("VSS/Identities/Mru/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected mruIdentitiesApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.MruIdentitiesUpdateData} updateData
     * @param {string} identityId
     * @param {string} containerId
     * @return IPromise<void>
     */
    public updateMruIdentities(
        updateData: Contracts.MruIdentitiesUpdateData,
        identityId: string,
        containerId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Identity",
            locationId: "15d952a1-bb4e-436c-88ca-cfe1e9ff3331",
            resource: "MruIdentities",
            routeTemplate: "_apis/{area}/{resource}/containers/{containerId}/users/{identityId}",
            routeValues: {
                identityId: identityId,
                containerId: containerId
            },
            apiVersion: this.mruIdentitiesApiVersion,
            data: updateData
        });
    }

    /**
     * [Preview API]
     *
     * @param {string[]} identityIds
     * @param {string} identityId
     * @param {string} containerId
     * @return IPromise<void>
     */
    public setMruIdentities(
        identityIds: string[],
        identityId: string,
        containerId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "Identity",
            locationId: "15d952a1-bb4e-436c-88ca-cfe1e9ff3331",
            resource: "MruIdentities",
            routeTemplate: "_apis/{area}/{resource}/containers/{containerId}/users/{identityId}",
            routeValues: {
                identityId: identityId,
                containerId: containerId
            },
            apiVersion: this.mruIdentitiesApiVersion,
            data: identityIds
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} identityId
     * @param {string} containerId
     * @return IPromise<string[]>
     */
    public getMruIdentities(
        identityId: string,
        containerId: string
        ): IPromise<string[]> {

        return this._beginRequest<string[]>({
            httpMethod: "GET",
            area: "Identity",
            locationId: "15d952a1-bb4e-436c-88ca-cfe1e9ff3331",
            resource: "MruIdentities",
            routeTemplate: "_apis/{area}/{resource}/containers/{containerId}/users/{identityId}",
            responseIsCollection: true,
            routeValues: {
                identityId: identityId,
                containerId: containerId
            },
            apiVersion: this.mruIdentitiesApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentityMruHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.mruIdentitiesApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class IdentityMruHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.mruIdentitiesApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class IdentityMruHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.mruIdentitiesApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class IdentityMruHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.mruIdentitiesApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class IdentityMruHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.mruIdentitiesApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class IdentityMruHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.mruIdentitiesApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class IdentityMruHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.mruIdentitiesApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class IdentityMruHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.mruIdentitiesApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class IdentityMruHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.mruIdentitiesApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class IdentityMruHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.mruIdentitiesApiVersion = "2.0-preview.1";
    }
}

export class IdentityMruHttpClient extends IdentityMruHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": IdentityMruHttpClient5,
    "4.1": IdentityMruHttpClient4_1,
    "4.0": IdentityMruHttpClient4,
    "3.2": IdentityMruHttpClient3_2,
    "3.1": IdentityMruHttpClient3_1,
    "3.0": IdentityMruHttpClient3,
    "2.3": IdentityMruHttpClient2_3,
    "2.2": IdentityMruHttpClient2_2,
    "2.1": IdentityMruHttpClient2_1,
    "2.0": IdentityMruHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return IdentityMruHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): IdentityMruHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<IdentityMruHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<IdentityMruHttpClient5>(IdentityMruHttpClient5, undefined, undefined, undefined, options);
    }
}
