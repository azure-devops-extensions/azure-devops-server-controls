/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   commerce\client\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Commerce_Contracts = require("VSS/Commerce/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods4_1To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000047-0000-8888-8000-000000000000";
    protected purchaseRequestApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Commerce_Contracts.PurchaseRequest} request
     * @return IPromise<void>
     */
    public updatePurchaseRequest(
        request: VSS_Commerce_Contracts.PurchaseRequest
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "PurchaseRequest",
            locationId: "6f905b2d-292a-4d30-b38a-2d254eab06b7",
            resource: "PurchaseRequest",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: VSS_Commerce_Contracts.TypeInfo.PurchaseRequest,
            apiVersion: this.purchaseRequestApiVersion,
            data: request
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Commerce_Contracts.PurchaseRequest} request
     * @return IPromise<void>
     */
    public createPurchaseRequest(
        request: VSS_Commerce_Contracts.PurchaseRequest
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "PurchaseRequest",
            locationId: "6f905b2d-292a-4d30-b38a-2d254eab06b7",
            resource: "PurchaseRequest",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: VSS_Commerce_Contracts.TypeInfo.PurchaseRequest,
            apiVersion: this.purchaseRequestApiVersion,
            data: request
        });
    }
}

/**
 * @exemptedapi
 */
export class PurchaseRequestHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.purchaseRequestApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class PurchaseRequestHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.purchaseRequestApiVersion = "4.1-preview.1";
    }
}

export class PurchaseRequestHttpClient extends PurchaseRequestHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": PurchaseRequestHttpClient5,
    "4.1": PurchaseRequestHttpClient4_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return PurchaseRequestHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): PurchaseRequestHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<PurchaseRequestHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<PurchaseRequestHttpClient5>(PurchaseRequestHttpClient5, undefined, undefined, undefined, options);
    }
}
