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
    protected offerSubscriptionApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Commerce_Contracts.OfferSubscription} offerSubscription
     * @return IPromise<void>
     */
    public updateOfferSubscription(
        offerSubscription: VSS_Commerce_Contracts.OfferSubscription
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            requestType: VSS_Commerce_Contracts.TypeInfo.OfferSubscription,
            apiVersion: this.offerSubscriptionApiVersion,
            data: offerSubscription
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} offerMeterName
     * @param {VSS_Commerce_Contracts.ResourceRenewalGroup} meterRenewalGroup
     * @param {number} newIncludedQuantity
     * @param {number} newMaximumQuantity
     * @return IPromise<void>
     */
    public setAccountQuantity(
        offerMeterName: string,
        meterRenewalGroup: VSS_Commerce_Contracts.ResourceRenewalGroup,
        newIncludedQuantity: number,
        newMaximumQuantity: number
        ): IPromise<void> {

        const queryValues: any = {
            offerMeterName: offerMeterName,
            meterRenewalGroup: meterRenewalGroup,
            newIncludedQuantity: newIncludedQuantity,
            newMaximumQuantity: newMaximumQuantity
        };

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} galleryItemId
     * @param {string} azureSubscriptionId
     * @param {boolean} nextBillingPeriod
     * @return IPromise<VSS_Commerce_Contracts.IOfferSubscription[]>
     */
    public getOfferSubscriptionsForGalleryItem(
        galleryItemId: string,
        azureSubscriptionId: string,
        nextBillingPeriod?: boolean
        ): IPromise<VSS_Commerce_Contracts.IOfferSubscription[]> {

        const queryValues: any = {
            galleryItemId: galleryItemId,
            azureSubscriptionId: azureSubscriptionId,
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<VSS_Commerce_Contracts.IOfferSubscription[]>({
            httpMethod: "GET",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: VSS_Commerce_Contracts.TypeInfo.IOfferSubscription,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {boolean} nextBillingPeriod
     * @return IPromise<VSS_Commerce_Contracts.IOfferSubscription[]>
     */
    public getOfferSubscriptions(
        nextBillingPeriod?: boolean
        ): IPromise<VSS_Commerce_Contracts.IOfferSubscription[]> {

        const queryValues: any = {
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<VSS_Commerce_Contracts.IOfferSubscription[]>({
            httpMethod: "GET",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: VSS_Commerce_Contracts.TypeInfo.IOfferSubscription,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} galleryId
     * @param {VSS_Commerce_Contracts.ResourceRenewalGroup} renewalGroup
     * @param {boolean} nextBillingPeriod
     * @return IPromise<VSS_Commerce_Contracts.IOfferSubscription>
     */
    public getOfferSubscriptionForRenewalGroup(
        galleryId: string,
        renewalGroup: VSS_Commerce_Contracts.ResourceRenewalGroup,
        nextBillingPeriod?: boolean
        ): IPromise<VSS_Commerce_Contracts.IOfferSubscription> {

        const queryValues: any = {
            galleryId: galleryId,
            renewalGroup: renewalGroup,
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<VSS_Commerce_Contracts.IOfferSubscription>({
            httpMethod: "GET",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: VSS_Commerce_Contracts.TypeInfo.IOfferSubscription,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} galleryId
     * @param {boolean} nextBillingPeriod
     * @return IPromise<VSS_Commerce_Contracts.IOfferSubscription>
     */
    public getOfferSubscription(
        galleryId: string,
        nextBillingPeriod?: boolean
        ): IPromise<VSS_Commerce_Contracts.IOfferSubscription> {

        const queryValues: any = {
            galleryId: galleryId,
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<VSS_Commerce_Contracts.IOfferSubscription>({
            httpMethod: "GET",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: VSS_Commerce_Contracts.TypeInfo.IOfferSubscription,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {boolean} validateAzuresubscription
     * @param {boolean} nextBillingPeriod
     * @return IPromise<VSS_Commerce_Contracts.IOfferSubscription[]>
     */
    public getAllOfferSubscriptionsForUser(
        validateAzuresubscription: boolean,
        nextBillingPeriod: boolean
        ): IPromise<VSS_Commerce_Contracts.IOfferSubscription[]> {

        const queryValues: any = {
            validateAzuresubscription: validateAzuresubscription,
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<VSS_Commerce_Contracts.IOfferSubscription[]>({
            httpMethod: "GET",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: VSS_Commerce_Contracts.TypeInfo.IOfferSubscription,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} offerMeterName
     * @param {VSS_Commerce_Contracts.ResourceRenewalGroup} renewalGroup
     * @return IPromise<void>
     */
    public enableTrialOrPreviewOfferSubscription(
        offerMeterName: string,
        renewalGroup: VSS_Commerce_Contracts.ResourceRenewalGroup
        ): IPromise<void> {

        const queryValues: any = {
            offerMeterName: offerMeterName,
            renewalGroup: renewalGroup
        };

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} offerMeterName
     * @param {VSS_Commerce_Contracts.ResourceRenewalGroup} renewalGroup
     * @param {Date} endDate
     * @return IPromise<void>
     */
    public enableTrialOfferSubscriptionExtension(
        offerMeterName: string,
        renewalGroup: VSS_Commerce_Contracts.ResourceRenewalGroup,
        endDate: Date
        ): IPromise<void> {

        const queryValues: any = {
            offerMeterName: offerMeterName,
            renewalGroup: renewalGroup,
            endDate: endDate
        };

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} offerMeterName
     * @param {VSS_Commerce_Contracts.ResourceRenewalGroup} renewalGroup
     * @param {number} quantity
     * @param {boolean} shouldBeImmediate
     * @param {string} azureSubscriptionId
     * @return IPromise<void>
     */
    public decreaseResourceQuantity(
        offerMeterName: string,
        renewalGroup: VSS_Commerce_Contracts.ResourceRenewalGroup,
        quantity: number,
        shouldBeImmediate: boolean,
        azureSubscriptionId: string
        ): IPromise<void> {

        const queryValues: any = {
            offerMeterName: offerMeterName,
            renewalGroup: renewalGroup,
            quantity: quantity,
            shouldBeImmediate: shouldBeImmediate,
            azureSubscriptionId: azureSubscriptionId
        };

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Commerce_Contracts.OfferSubscription} offerSubscription
     * @param {string} offerCode
     * @param {string} tenantId
     * @param {string} objectId
     * @param {string} billingTarget
     * @return IPromise<void>
     */
    public createOfferSubscription(
        offerSubscription: VSS_Commerce_Contracts.OfferSubscription,
        offerCode?: string,
        tenantId?: string,
        objectId?: string,
        billingTarget?: string
        ): IPromise<void> {

        const queryValues: any = {
            offerCode: offerCode,
            tenantId: tenantId,
            objectId: objectId,
            billingTarget: billingTarget
        };

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            requestType: VSS_Commerce_Contracts.TypeInfo.OfferSubscription,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion,
            data: offerSubscription
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Commerce_Contracts.OfferSubscription} offerSubscription
     * @param {string} cancelReason
     * @param {string} billingTarget
     * @param {boolean} immediate
     * @return IPromise<void>
     */
    public cancelOfferSubscription(
        offerSubscription: VSS_Commerce_Contracts.OfferSubscription,
        cancelReason: string,
        billingTarget?: string,
        immediate?: boolean
        ): IPromise<void> {

        const queryValues: any = {
            cancelReason: cancelReason,
            billingTarget: billingTarget,
            immediate: immediate
        };

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "OfferSubscription",
            locationId: "7c13d166-01c5-4ccd-8a75-e5ad6ab3b0a6",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            requestType: VSS_Commerce_Contracts.TypeInfo.OfferSubscription,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion,
            data: offerSubscription
        });
    }
}

/**
 * @exemptedapi
 */
export class OfferSubscriptionHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.offerSubscriptionApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class OfferSubscriptionHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.offerSubscriptionApiVersion = "4.1-preview.1";
    }
}

export class OfferSubscriptionHttpClient extends OfferSubscriptionHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": OfferSubscriptionHttpClient5,
    "4.1": OfferSubscriptionHttpClient4_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return OfferSubscriptionHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): OfferSubscriptionHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<OfferSubscriptionHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<OfferSubscriptionHttpClient5>(OfferSubscriptionHttpClient5, undefined, undefined, undefined, options);
    }
}
