/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   sps\clients\genclient.json
 */

"use strict";

import Contracts = require("VSS/Commerce/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = VSS_WebApi_Constants.ServiceInstanceTypes.SPS;
    protected metersApiVersion: string;
    protected offerMeterApiVersion: string;
    protected offerMeterPriceApiVersion: string;
    protected offerSubscriptionApiVersion: string;
    protected regionsApiVersion: string;
    protected subscriptionApiVersion: string;
    protected usageEventsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.UsageEvent} usageEvent
     * @return IPromise<void>
     */
    public reportUsage(
        usageEvent: Contracts.UsageEvent
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "eed7d28a-12a9-47ed-9a85-91a76c63e74b",
            resource: "UsageEvents",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            requestType: Contracts.TypeInfo.UsageEvent,
            apiVersion: this.usageEventsApiVersion,
            data: usageEvent
        });
    }

    /**
     * [Preview API]
     *
     * @param {Date} startTime
     * @param {Date} endTime
     * @param {any} timeSpan
     * @return IPromise<Contracts.IUsageEventAggregate[]>
     */
    public getUsage(
        startTime: Date,
        endTime: Date,
        timeSpan: any
        ): IPromise<Contracts.IUsageEventAggregate[]> {

        const queryValues: any = {
            startTime: startTime,
            endTime: endTime,
            timeSpan: timeSpan
        };

        return this._beginRequest<Contracts.IUsageEventAggregate[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "eed7d28a-12a9-47ed-9a85-91a76c63e74b",
            resource: "UsageEvents",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.IUsageEventAggregate,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.usageEventsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} subscriptionId
     * @param {Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} accountId
     * @param {string} ownerId
     * @return IPromise<void>
     */
    public unlinkAccount(
        subscriptionId: string,
        providerNamespaceId: Contracts.AccountProviderNamespace,
        accountId: string,
        ownerId: string
        ): IPromise<void> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId,
            accountId: accountId,
            ownerId: ownerId
        };

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            routeValues: {
                subscriptionId: subscriptionId
            },
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} subscriptionId
     * @param {Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} accountId
     * @param {string} ownerId
     * @param {boolean} hydrate
     * @return IPromise<void>
     */
    public linkAccount(
        subscriptionId: string,
        providerNamespaceId: Contracts.AccountProviderNamespace,
        accountId: string,
        ownerId: string,
        hydrate?: boolean
        ): IPromise<void> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId,
            accountId: accountId,
            ownerId: ownerId,
            hydrate: hydrate
        };

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            routeValues: {
                subscriptionId: subscriptionId
            },
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} accountId
     * @return IPromise<boolean>
     */
    public isAssignmentBillingEnabled(
        accountId: string
        ): IPromise<boolean> {

        const queryValues: any = {
            accountId: accountId
        };

        return this._beginRequest<boolean>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} subscriptionId
     * @param {Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} accountName
     * @param {string[]} serviceOwners
     * @return IPromise<Contracts.SubscriptionAccount>
     */
    public getSubscriptionAccountByName(
        subscriptionId: string,
        providerNamespaceId: Contracts.AccountProviderNamespace,
        accountName: string,
        serviceOwners: string[]
        ): IPromise<Contracts.SubscriptionAccount> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId,
            accountName: accountName,
            serviceOwners: serviceOwners
        };

        return this._beginRequest<Contracts.SubscriptionAccount>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: Contracts.TypeInfo.SubscriptionAccount,
            routeValues: {
                subscriptionId: subscriptionId
            },
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} accountId
     * @return IPromise<Contracts.ISubscriptionAccount>
     */
    public getSubscriptionAccount(
        providerNamespaceId: Contracts.AccountProviderNamespace,
        accountId: string
        ): IPromise<Contracts.ISubscriptionAccount> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId,
            accountId: accountId
        };

        return this._beginRequest<Contracts.ISubscriptionAccount>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: Contracts.TypeInfo.ISubscriptionAccount,
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string[]} ids
     * @param {Contracts.AccountProviderNamespace} providerNamespaceId
     * @return IPromise<Contracts.IAzureSubscription[]>
     */
    public getAzureSubscriptions(
        ids: string[],
        providerNamespaceId: Contracts.AccountProviderNamespace
        ): IPromise<Contracts.IAzureSubscription[]> {

        const queryValues: any = {
            ids: ids,
            providerNamespaceId: providerNamespaceId
        };

        return this._beginRequest<Contracts.IAzureSubscription[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: Contracts.TypeInfo.IAzureSubscription,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} subscriptionId
     * @param {boolean} queryAcrossTenants
     * @return IPromise<Contracts.ISubscriptionAccount[]>
     */
    public getAzureSubscriptionForUser(
        subscriptionId?: string,
        queryAcrossTenants?: boolean
        ): IPromise<Contracts.ISubscriptionAccount[]> {

        const queryValues: any = {
            queryAcrossTenants: queryAcrossTenants
        };

        return this._beginRequest<Contracts.ISubscriptionAccount[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: Contracts.TypeInfo.ISubscriptionAccount,
            responseIsCollection: true,
            routeValues: {
                subscriptionId: subscriptionId
            },
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} subscriptionId
     * @param {string} galleryItemId
     * @param {string} accountId
     * @return IPromise<Contracts.ISubscriptionAccount>
     */
    public getAzureSubscriptionForPurchase(
        subscriptionId: string,
        galleryItemId: string,
        accountId?: string
        ): IPromise<Contracts.ISubscriptionAccount> {

        const queryValues: any = {
            galleryItemId: galleryItemId,
            accountId: accountId
        };

        return this._beginRequest<Contracts.ISubscriptionAccount>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: Contracts.TypeInfo.ISubscriptionAccount,
            routeValues: {
                subscriptionId: subscriptionId
            },
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} memberId
     * @param {boolean} queryOnlyOwnerAccounts
     * @param {boolean} inlcudeDisabledAccounts
     * @param {boolean} includeMSAAccounts
     * @param {string[]} serviceOwners
     * @param {string} galleryId
     * @param {boolean} addUnlinkedSubscription
     * @param {boolean} queryAccountsByUpn
     * @return IPromise<Contracts.ISubscriptionAccount[]>
     */
    public getAccountsByIdentityForOfferId(
        providerNamespaceId: Contracts.AccountProviderNamespace,
        memberId: string,
        queryOnlyOwnerAccounts: boolean,
        inlcudeDisabledAccounts: boolean,
        includeMSAAccounts: boolean,
        serviceOwners: string[],
        galleryId: string,
        addUnlinkedSubscription?: boolean,
        queryAccountsByUpn?: boolean
        ): IPromise<Contracts.ISubscriptionAccount[]> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId,
            memberId: memberId,
            queryOnlyOwnerAccounts: queryOnlyOwnerAccounts,
            inlcudeDisabledAccounts: inlcudeDisabledAccounts,
            includeMSAAccounts: includeMSAAccounts,
            serviceOwners: serviceOwners,
            galleryId: galleryId,
            addUnlinkedSubscription: addUnlinkedSubscription,
            queryAccountsByUpn: queryAccountsByUpn
        };

        return this._beginRequest<Contracts.ISubscriptionAccount[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: Contracts.TypeInfo.ISubscriptionAccount,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} memberId
     * @param {boolean} queryOnlyOwnerAccounts
     * @param {boolean} inlcudeDisabledAccounts
     * @param {boolean} includeMSAAccounts
     * @param {string[]} serviceOwners
     * @return IPromise<Contracts.ISubscriptionAccount[]>
     */
    public getAccountsByIdentity(
        providerNamespaceId: Contracts.AccountProviderNamespace,
        memberId: string,
        queryOnlyOwnerAccounts: boolean,
        inlcudeDisabledAccounts: boolean,
        includeMSAAccounts: boolean,
        serviceOwners: string[]
        ): IPromise<Contracts.ISubscriptionAccount[]> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId,
            memberId: memberId,
            queryOnlyOwnerAccounts: queryOnlyOwnerAccounts,
            inlcudeDisabledAccounts: inlcudeDisabledAccounts,
            includeMSAAccounts: includeMSAAccounts,
            serviceOwners: serviceOwners
        };

        return this._beginRequest<Contracts.ISubscriptionAccount[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: Contracts.TypeInfo.ISubscriptionAccount,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} subscriptionId
     * @param {Contracts.AccountProviderNamespace} providerNamespaceId
     * @return IPromise<Contracts.SubscriptionAccount[]>
     */
    public getAccounts(
        subscriptionId: string,
        providerNamespaceId: Contracts.AccountProviderNamespace
        ): IPromise<Contracts.SubscriptionAccount[]> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId
        };

        return this._beginRequest<Contracts.SubscriptionAccount[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: Contracts.TypeInfo.SubscriptionAccount,
            responseIsCollection: true,
            routeValues: {
                subscriptionId: subscriptionId
            },
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} subscriptionId
     * @param {Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} accountId
     * @param {boolean} hydrate
     * @return IPromise<void>
     */
    public changeSubscriptionAccount(
        subscriptionId: string,
        providerNamespaceId: Contracts.AccountProviderNamespace,
        accountId: string,
        hydrate?: boolean
        ): IPromise<void> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId,
            accountId: accountId,
            hydrate: hydrate
        };

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "64485509-d692-4b70-b440-d02b3b809820",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            routeValues: {
                subscriptionId: subscriptionId
            },
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @return IPromise<Contracts.AzureRegion[]>
     */
    public getAccountRegions(): IPromise<Contracts.AzureRegion[]> {

        return this._beginRequest<Contracts.AzureRegion[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "9527c79d-9f3e-465d-8178-069106c39457",
            resource: "Regions",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseIsCollection: true,
            apiVersion: this.regionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.OfferSubscription} offerSubscription
     * @return IPromise<void>
     */
    public updateOfferSubscription(
        offerSubscription: Contracts.OfferSubscription
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            requestType: Contracts.TypeInfo.OfferSubscription,
            apiVersion: this.offerSubscriptionApiVersion,
            data: offerSubscription
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} offerMeterName
     * @param {Contracts.ResourceRenewalGroup} meterRenewalGroup
     * @param {number} newIncludedQuantity
     * @param {number} newMaximumQuantity
     * @return IPromise<void>
     */
    public setAccountQuantity(
        offerMeterName: string,
        meterRenewalGroup: Contracts.ResourceRenewalGroup,
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
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
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
     * @return IPromise<Contracts.IOfferSubscription[]>
     */
    public getOfferSubscriptionsForGalleryItem(
        galleryItemId: string,
        azureSubscriptionId: string,
        nextBillingPeriod?: boolean
        ): IPromise<Contracts.IOfferSubscription[]> {

        const queryValues: any = {
            galleryItemId: galleryItemId,
            azureSubscriptionId: azureSubscriptionId,
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<Contracts.IOfferSubscription[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.IOfferSubscription,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {boolean} nextBillingPeriod
     * @return IPromise<Contracts.IOfferSubscription[]>
     */
    public getOfferSubscriptions(
        nextBillingPeriod?: boolean
        ): IPromise<Contracts.IOfferSubscription[]> {

        const queryValues: any = {
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<Contracts.IOfferSubscription[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.IOfferSubscription,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} galleryId
     * @param {Contracts.ResourceRenewalGroup} renewalGroup
     * @param {boolean} nextBillingPeriod
     * @return IPromise<Contracts.IOfferSubscription>
     */
    public getOfferSubscriptionForRenewalGroup(
        galleryId: string,
        renewalGroup: Contracts.ResourceRenewalGroup,
        nextBillingPeriod?: boolean
        ): IPromise<Contracts.IOfferSubscription> {

        const queryValues: any = {
            galleryId: galleryId,
            renewalGroup: renewalGroup,
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<Contracts.IOfferSubscription>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.IOfferSubscription,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} galleryId
     * @param {boolean} nextBillingPeriod
     * @return IPromise<Contracts.IOfferSubscription>
     */
    public getOfferSubscription(
        galleryId: string,
        nextBillingPeriod?: boolean
        ): IPromise<Contracts.IOfferSubscription> {

        const queryValues: any = {
            galleryId: galleryId,
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<Contracts.IOfferSubscription>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.IOfferSubscription,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {boolean} validateAzuresubscription
     * @param {boolean} nextBillingPeriod
     * @return IPromise<Contracts.IOfferSubscription[]>
     */
    public getAllOfferSubscriptionsForUser(
        validateAzuresubscription: boolean,
        nextBillingPeriod: boolean
        ): IPromise<Contracts.IOfferSubscription[]> {

        const queryValues: any = {
            validateAzuresubscription: validateAzuresubscription,
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<Contracts.IOfferSubscription[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.IOfferSubscription,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} offerMeterName
     * @param {Contracts.ResourceRenewalGroup} renewalGroup
     * @return IPromise<void>
     */
    public enableTrialOrPreviewOfferSubscription(
        offerMeterName: string,
        renewalGroup: Contracts.ResourceRenewalGroup
        ): IPromise<void> {

        const queryValues: any = {
            offerMeterName: offerMeterName,
            renewalGroup: renewalGroup
        };

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
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
     * @param {Contracts.ResourceRenewalGroup} renewalGroup
     * @param {Date} endDate
     * @return IPromise<void>
     */
    public enableTrialOfferSubscriptionExtension(
        offerMeterName: string,
        renewalGroup: Contracts.ResourceRenewalGroup,
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
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
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
     * @param {Contracts.ResourceRenewalGroup} renewalGroup
     * @param {number} quantity
     * @param {boolean} shouldBeImmediate
     * @param {string} azureSubscriptionId
     * @return IPromise<void>
     */
    public decreaseResourceQuantity(
        offerMeterName: string,
        renewalGroup: Contracts.ResourceRenewalGroup,
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
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.OfferSubscription} offerSubscription
     * @param {string} offerCode
     * @param {string} tenantId
     * @param {string} objectId
     * @param {string} billingTarget
     * @return IPromise<void>
     */
    public createOfferSubscription(
        offerSubscription: Contracts.OfferSubscription,
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
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            requestType: Contracts.TypeInfo.OfferSubscription,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion,
            data: offerSubscription
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.OfferSubscription} offerSubscription
     * @param {string} cancelReason
     * @param {string} billingTarget
     * @param {boolean} immediate
     * @return IPromise<void>
     */
    public cancelOfferSubscription(
        offerSubscription: Contracts.OfferSubscription,
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
            area: "Commerce",
            locationId: "e8950ce5-80bc-421f-b093-033c18fd3d79",
            resource: "OfferSubscription",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            requestType: Contracts.TypeInfo.OfferSubscription,
            queryParams: queryValues,
            apiVersion: this.offerSubscriptionApiVersion,
            data: offerSubscription
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.OfferMeterPrice[]} offerMeterPricing
     * @param {string} galleryId
     * @return IPromise<void>
     */
    public updateOfferMeterPrice(
        offerMeterPricing: Contracts.OfferMeterPrice[],
        galleryId: string
        ): IPromise<void> {

        const queryValues: any = {
            galleryId: galleryId
        };

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "1c67c343-2269-4608-bc53-fe62daa8e32b",
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
     * @return IPromise<Contracts.OfferMeterPrice[]>
     */
    public getOfferMeterPrice(
        galleryId: string
        ): IPromise<Contracts.OfferMeterPrice[]> {

        const queryValues: any = {
            galleryId: galleryId
        };

        return this._beginRequest<Contracts.OfferMeterPrice[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "1c67c343-2269-4608-bc53-fe62daa8e32b",
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
     * @return IPromise<Contracts.PurchasableOfferMeter>
     */
    public getPurchasableOfferMeter(
        resourceName: string,
        resourceNameResolveMethod: string,
        subscriptionId: string,
        includeMeterPricing: boolean,
        offerCode?: string,
        tenantId?: string,
        objectId?: string
        ): IPromise<Contracts.PurchasableOfferMeter> {

        const queryValues: any = {
            resourceNameResolveMethod: resourceNameResolveMethod,
            subscriptionId: subscriptionId,
            includeMeterPricing: includeMeterPricing,
            offerCode: offerCode,
            tenantId: tenantId,
            objectId: objectId
        };

        return this._beginRequest<Contracts.PurchasableOfferMeter>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "8b79e1fb-777b-4d0a-9d2e-6a4b2b8761b9",
            resource: "OfferMeter",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.PurchasableOfferMeter,
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
     * @return IPromise<Contracts.OfferMeter[]>
     */
    public getOfferMeters(): IPromise<Contracts.OfferMeter[]> {

        return this._beginRequest<Contracts.OfferMeter[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "8b79e1fb-777b-4d0a-9d2e-6a4b2b8761b9",
            resource: "OfferMeter",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.OfferMeter,
            responseIsCollection: true,
            apiVersion: this.offerMeterApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} resourceName
     * @param {string} resourceNameResolveMethod
     * @return IPromise<Contracts.OfferMeter>
     */
    public getOfferMeter(
        resourceName: string,
        resourceNameResolveMethod: string
        ): IPromise<Contracts.OfferMeter> {

        const queryValues: any = {
            resourceNameResolveMethod: resourceNameResolveMethod
        };

        return this._beginRequest<Contracts.OfferMeter>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "8b79e1fb-777b-4d0a-9d2e-6a4b2b8761b9",
            resource: "OfferMeter",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.OfferMeter,
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
     * @param {Contracts.OfferMeter} offerConfig
     * @return IPromise<void>
     */
    public createOfferMeterDefinition(
        offerConfig: Contracts.OfferMeter
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "8b79e1fb-777b-4d0a-9d2e-6a4b2b8761b9",
            resource: "OfferMeter",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            requestType: Contracts.TypeInfo.OfferMeter,
            apiVersion: this.offerMeterApiVersion,
            data: offerConfig
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.SubscriptionResource} meter
     * @return IPromise<void>
     */
    public updateMeter(
        meter: Contracts.SubscriptionResource
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "afb09d56-7740-4eb0-867f-792021fab7c9",
            resource: "Meters",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            requestType: Contracts.TypeInfo.SubscriptionResource,
            apiVersion: this.metersApiVersion,
            data: meter
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ResourceName} resourceName
     * @param {boolean} nextBillingPeriod
     * @return IPromise<Contracts.ISubscriptionResource>
     */
    public getResourceStatusByResourceName(
        resourceName: Contracts.ResourceName,
        nextBillingPeriod?: boolean
        ): IPromise<Contracts.ISubscriptionResource> {

        const queryValues: any = {
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<Contracts.ISubscriptionResource>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "afb09d56-7740-4eb0-867f-792021fab7c9",
            resource: "Meters",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.ISubscriptionResource,
            routeValues: {
                resourceName: Contracts.ResourceName[resourceName]
            },
            queryParams: queryValues,
            apiVersion: this.metersApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {boolean} nextBillingPeriod
     * @return IPromise<Contracts.ISubscriptionResource[]>
     */
    public getResourceStatus(
        nextBillingPeriod?: boolean
        ): IPromise<Contracts.ISubscriptionResource[]> {

        const queryValues: any = {
            nextBillingPeriod: nextBillingPeriod
        };

        return this._beginRequest<Contracts.ISubscriptionResource[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "afb09d56-7740-4eb0-867f-792021fab7c9",
            resource: "Meters",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.ISubscriptionResource,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.metersApiVersion
        });
    }
}

export class CommonMethods3To5 extends CommonMethods2To5 {
    protected commercePackageApiVersion: string;
    protected connectedServerApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ConnectedServer} connectedServer
     * @return IPromise<Contracts.ConnectedServer>
     */
    public createConnectedServer(
        connectedServer: Contracts.ConnectedServer
        ): IPromise<Contracts.ConnectedServer> {

        return this._beginRequest<Contracts.ConnectedServer>({
            httpMethod: "POST",
            area: "Commerce",
            locationId: "c9928a7a-8102-4061-bdce-b090068c0d2b",
            resource: "ConnectedServer",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.connectedServerApiVersion,
            data: connectedServer
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} version
     * @return IPromise<Contracts.ICommercePackage>
     */
    public getCommercePackage(
        version?: string
        ): IPromise<Contracts.ICommercePackage> {

        const queryValues: any = {
            version: version
        };

        return this._beginRequest<Contracts.ICommercePackage>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "e8135f49-a1dc-4135-80f4-120bbfc2acf0",
            resource: "CommercePackage",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseType: Contracts.TypeInfo.ICommercePackage,
            queryParams: queryValues,
            apiVersion: this.commercePackageApiVersion
        });
    }
}

export class CommonMethods3_2To5 extends CommonMethods3To5 {
    protected reportingEventsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} viewName
     * @param {string} resourceName
     * @param {Date} startTime
     * @param {Date} endTime
     * @param {string} filter
     * @return IPromise<Contracts.ICommerceEvent[]>
     */
    public getReportingEvents(
        viewName: string,
        resourceName: string,
        startTime: Date,
        endTime: Date,
        filter?: string
        ): IPromise<Contracts.ICommerceEvent[]> {

        const queryValues: any = {
            startTime: startTime,
            endTime: endTime,
            filter: filter
        };

        return this._beginRequest<Contracts.ICommerceEvent[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "e3296a33-647f-4a09-85c6-64b9259dadb8",
            resource: "ReportingEvents",
            routeTemplate: "_apis/{area}/{resource}/{viewName}/{resourceName}",
            responseType: Contracts.TypeInfo.ICommerceEvent,
            responseIsCollection: true,
            routeValues: {
                viewName: viewName,
                resourceName: resourceName
            },
            queryParams: queryValues,
            apiVersion: this.reportingEventsApiVersion
        });
    }
}

export class CommonMethods4To5 extends CommonMethods3_2To5 {
    protected purchaseRequestApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.PurchaseRequest} request
     * @return IPromise<void>
     */
    public updatePurchaseRequest(
        request: Contracts.PurchaseRequest
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "a349b796-bddb-459e-8921-e1967672be86",
            resource: "PurchaseRequest",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: Contracts.TypeInfo.PurchaseRequest,
            apiVersion: this.purchaseRequestApiVersion,
            data: request
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.PurchaseRequest} request
     * @return IPromise<void>
     */
    public createPurchaseRequest(
        request: Contracts.PurchaseRequest
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "Commerce",
            locationId: "a349b796-bddb-459e-8921-e1967672be86",
            resource: "PurchaseRequest",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: Contracts.TypeInfo.PurchaseRequest,
            apiVersion: this.purchaseRequestApiVersion,
            data: request
        });
    }
}

export class CommonMethods4_1To5 extends CommonMethods4To5 {
    protected commerceHostHelperResourceApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Updates collection owner, bypassing bind pending identity owner check
     *
     * @param {string} newOwnerId
     * @param {string} ownerDomain
     * @return IPromise<boolean>
     */
    public updateCollectionOwner(
        newOwnerId: string,
        ownerDomain: string
        ): IPromise<boolean> {

        const queryValues: any = {
            newOwnerId: newOwnerId,
            ownerDomain: ownerDomain
        };

        return this._beginRequest<boolean>({
            httpMethod: "PUT",
            area: "Commerce",
            locationId: "8b4c702a-7449-4feb-9b23-add4288dda1a",
            resource: "CommerceHostHelperResource",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            queryParams: queryValues,
            apiVersion: this.commerceHostHelperResourceApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} propertyKind
     * @param {string[]} properties
     * @return IPromise<string[]>
     */
    public getInfrastructureOrganizationProperties(
        propertyKind: string,
        properties: string[]
        ): IPromise<string[]> {

        const queryValues: any = {
            propertyKind: propertyKind,
            properties: properties
        };

        return this._beginRequest<string[]>({
            httpMethod: "GET",
            area: "Commerce",
            locationId: "8b4c702a-7449-4feb-9b23-add4288dda1a",
            resource: "CommerceHostHelperResource",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.commerceHostHelperResourceApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} resourceName
     * @param {string} collectionHostName
     * @param {string} hostRegion
     * @param {string} tags
     * @return IPromise<string>
     */
    public createInfrastructureOrganization(
        resourceName: string,
        collectionHostName: string,
        hostRegion: string,
        tags: string
        ): IPromise<string> {

        const queryValues: any = {
            collectionHostName: collectionHostName,
            hostRegion: hostRegion,
            tags: tags
        };

        return this._beginRequest<string>({
            httpMethod: "PUT",
            area: "Commerce",
            locationId: "8b4c702a-7449-4feb-9b23-add4288dda1a",
            resource: "CommerceHostHelperResource",
            routeTemplate: "_apis/{area}/{resource}/{resourceName}",
            routeValues: {
                resourceName: resourceName
            },
            queryParams: queryValues,
            apiVersion: this.commerceHostHelperResourceApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class CommerceHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.commerceHostHelperResourceApiVersion =
        this.commercePackageApiVersion =
        this.connectedServerApiVersion =
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion =
        this.offerSubscriptionApiVersion =
        this.purchaseRequestApiVersion =
        this.regionsApiVersion =
        this.reportingEventsApiVersion =
        this.subscriptionApiVersion =
        this.usageEventsApiVersion = "5.0-preview.1";
        this.metersApiVersion = "5.0-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class CommerceHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.commerceHostHelperResourceApiVersion =
        this.commercePackageApiVersion =
        this.connectedServerApiVersion =
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion =
        this.offerSubscriptionApiVersion =
        this.purchaseRequestApiVersion =
        this.regionsApiVersion =
        this.reportingEventsApiVersion =
        this.subscriptionApiVersion =
        this.usageEventsApiVersion = "4.1-preview.1";
        this.metersApiVersion = "4.1-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class CommerceHttpClient4 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.commercePackageApiVersion =
        this.connectedServerApiVersion =
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion =
        this.offerSubscriptionApiVersion =
        this.purchaseRequestApiVersion =
        this.regionsApiVersion =
        this.reportingEventsApiVersion =
        this.subscriptionApiVersion =
        this.usageEventsApiVersion = "4.0-preview.1";
        this.metersApiVersion = "4.0-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class CommerceHttpClient3_2 extends CommonMethods3_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.commercePackageApiVersion =
        this.connectedServerApiVersion =
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion =
        this.offerSubscriptionApiVersion =
        this.regionsApiVersion =
        this.reportingEventsApiVersion =
        this.subscriptionApiVersion =
        this.usageEventsApiVersion = "3.2-preview.1";
        this.metersApiVersion = "3.2-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class CommerceHttpClient3_1 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.commercePackageApiVersion =
        this.connectedServerApiVersion =
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion =
        this.offerSubscriptionApiVersion =
        this.regionsApiVersion =
        this.subscriptionApiVersion =
        this.usageEventsApiVersion = "3.1-preview.1";
        this.metersApiVersion = "3.1-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class CommerceHttpClient3 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.commercePackageApiVersion =
        this.connectedServerApiVersion =
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion =
        this.offerSubscriptionApiVersion =
        this.regionsApiVersion =
        this.subscriptionApiVersion =
        this.usageEventsApiVersion = "3.0-preview.1";
        this.metersApiVersion = "3.0-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class CommerceHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion =
        this.offerSubscriptionApiVersion =
        this.regionsApiVersion =
        this.subscriptionApiVersion =
        this.usageEventsApiVersion = "2.3-preview.1";
        this.metersApiVersion = "2.3-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class CommerceHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion =
        this.offerSubscriptionApiVersion =
        this.regionsApiVersion =
        this.subscriptionApiVersion =
        this.usageEventsApiVersion = "2.2-preview.1";
        this.metersApiVersion = "2.2-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class CommerceHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion =
        this.offerSubscriptionApiVersion =
        this.regionsApiVersion =
        this.subscriptionApiVersion =
        this.usageEventsApiVersion = "2.1-preview.1";
        this.metersApiVersion = "2.1-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class CommerceHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.offerMeterApiVersion =
        this.offerMeterPriceApiVersion =
        this.offerSubscriptionApiVersion =
        this.regionsApiVersion =
        this.subscriptionApiVersion =
        this.usageEventsApiVersion = "2.0-preview.1";
        this.metersApiVersion = "2.0-preview.2";
    }
}

export class CommerceHttpClient extends CommerceHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": CommerceHttpClient5,
    "4.1": CommerceHttpClient4_1,
    "4.0": CommerceHttpClient4,
    "3.2": CommerceHttpClient3_2,
    "3.1": CommerceHttpClient3_1,
    "3.0": CommerceHttpClient3,
    "2.3": CommerceHttpClient2_3,
    "2.2": CommerceHttpClient2_2,
    "2.1": CommerceHttpClient2_1,
    "2.0": CommerceHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return CommerceHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): CommerceHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<CommerceHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<CommerceHttpClient5>(CommerceHttpClient5, undefined, undefined, undefined, options);
    }
}
