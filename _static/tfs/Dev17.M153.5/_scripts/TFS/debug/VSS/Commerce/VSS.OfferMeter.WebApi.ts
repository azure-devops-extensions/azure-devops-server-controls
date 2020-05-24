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
    protected offerMeterApiVersion: string;
    protected offerMeterPriceApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Commerce_Contracts.OfferMeterPrice[]} offerMeterPricing
     * @param {string} galleryId
     * @return IPromise<void>
     */
    public updateOfferMeterPrice(
        offerMeterPricing: VSS_Commerce_Contracts.OfferMeterPrice[],
        galleryId: string
        ): IPromise<void> {

        const queryValues: any = {
            galleryId: galleryId
        };

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "OfferMeter",
            locationId: "d7197e00-dddf-4029-9f9b-21b935a6cf9f",
            resource: "OfferMeterPrice",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            queryParams: queryValues,
            apiVersion: this.offerMeterPriceApiVersion,
            data: offerMeterPricing
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} galleryId
     * @return IPromise<VSS_Commerce_Contracts.OfferMeterPrice[]>
     */
    public getOfferMeterPrice(
        galleryId: string
        ): IPromise<VSS_Commerce_Contracts.OfferMeterPrice[]> {

        const queryValues: any = {
            galleryId: galleryId
        };

        return this._beginRequest<VSS_Commerce_Contracts.OfferMeterPrice[]>({
            httpMethod: "GET",
            area: "OfferMeter",
            locationId: "d7197e00-dddf-4029-9f9b-21b935a6cf9f",
            resource: "OfferMeterPrice",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.offerMeterPriceApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} resourceName
     * @param {string} resourceNameResolveMethod
     * @param {string} subscriptionId
     * @param {boolean} includeMeterPricing
     * @param {string} offerCode
     * @param {string} tenantId
     * @param {string} objectId
     * @return IPromise<VSS_Commerce_Contracts.PurchasableOfferMeter>
     */
    public getPurchasableOfferMeter(
        resourceName: string,
        resourceNameResolveMethod: string,
        subscriptionId: string,
        includeMeterPricing: boolean,
        offerCode?: string,
        tenantId?: string,
        objectId?: string
        ): IPromise<VSS_Commerce_Contracts.PurchasableOfferMeter> {

        const queryValues: any = {
            resourceNameResolveMethod: resourceNameResolveMethod,
            subscriptionId: subscriptionId,
            includeMeterPricing: includeMeterPricing,
            offerCode: offerCode,
            tenantId: tenantId,
            objectId: objectId
        };

        return this._beginRequest<VSS_Commerce_Contracts.PurchasableOfferMeter>({
            httpMethod: "GET",
            area: "OfferMeter",
            locationId: "81e37548-a9e0-49f9-8905-650a7260a440",
            resource: "OfferMeter",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: VSS_Commerce_Contracts.TypeInfo.PurchasableOfferMeter,
            routeValues: {
                resourceName: resourceName
            },
            queryParams: queryValues,
            apiVersion: this.offerMeterApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @return IPromise<VSS_Commerce_Contracts.OfferMeter[]>
     */
    public getOfferMeters(): IPromise<VSS_Commerce_Contracts.OfferMeter[]> {

        return this._beginRequest<VSS_Commerce_Contracts.OfferMeter[]>({
            httpMethod: "GET",
            area: "OfferMeter",
            locationId: "81e37548-a9e0-49f9-8905-650a7260a440",
            resource: "OfferMeter",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: VSS_Commerce_Contracts.TypeInfo.OfferMeter,
            responseIsCollection: true,
            apiVersion: this.offerMeterApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} resourceName
     * @param {string} resourceNameResolveMethod
     * @return IPromise<VSS_Commerce_Contracts.OfferMeter>
     */
    public getOfferMeter(
        resourceName: string,
        resourceNameResolveMethod: string
        ): IPromise<VSS_Commerce_Contracts.OfferMeter> {

        const queryValues: any = {
            resourceNameResolveMethod: resourceNameResolveMethod
        };

        return this._beginRequest<VSS_Commerce_Contracts.OfferMeter>({
            httpMethod: "GET",
            area: "OfferMeter",
            locationId: "81e37548-a9e0-49f9-8905-650a7260a440",
            resource: "OfferMeter",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: VSS_Commerce_Contracts.TypeInfo.OfferMeter,
            routeValues: {
                resourceName: resourceName
            },
            queryParams: queryValues,
            apiVersion: this.offerMeterApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Commerce_Contracts.OfferMeter} offerConfig
     * @return IPromise<void>
     */
    public createOfferMeterDefinition(
        offerConfig: VSS_Commerce_Contracts.OfferMeter
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "OfferMeter",
            locationId: "81e37548-a9e0-49f9-8905-650a7260a440",
            resource: "OfferMeter",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            requestType: VSS_Commerce_Contracts.TypeInfo.OfferMeter,
            apiVersion: this.offerMeterApiVersion,
            data: offerConfig
        });
    }
}

/**
 * @exemptedapi
 */
export class OfferMeterHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class OfferMeterHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion = "4.1-preview.1";
    }
}

export class OfferMeterHttpClient extends OfferMeterHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": OfferMeterHttpClient5,
    "4.1": OfferMeterHttpClient4_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return OfferMeterHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): OfferMeterHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<OfferMeterHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<OfferMeterHttpClient5>(OfferMeterHttpClient5, undefined, undefined, undefined, options);
    }
}
