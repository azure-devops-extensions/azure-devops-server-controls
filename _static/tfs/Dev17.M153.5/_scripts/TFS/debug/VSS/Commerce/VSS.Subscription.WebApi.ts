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
    protected subscriptionApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} subscriptionId
     * @param {VSS_Commerce_Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} accountId
     * @param {string} ownerId
     * @return IPromise<void>
     */
    public unlinkAccount(
        subscriptionId: string,
        providerNamespaceId: VSS_Commerce_Contracts.AccountProviderNamespace,
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
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
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
     * @param {VSS_Commerce_Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} accountId
     * @param {string} ownerId
     * @param {boolean} hydrate
     * @return IPromise<void>
     */
    public linkAccount(
        subscriptionId: string,
        providerNamespaceId: VSS_Commerce_Contracts.AccountProviderNamespace,
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
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
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
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
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
     * @param {VSS_Commerce_Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} accountName
     * @param {string[]} serviceOwners
     * @return IPromise<VSS_Commerce_Contracts.SubscriptionAccount>
     */
    public getSubscriptionAccountByName(
        subscriptionId: string,
        providerNamespaceId: VSS_Commerce_Contracts.AccountProviderNamespace,
        accountName: string,
        serviceOwners: string[]
        ): IPromise<VSS_Commerce_Contracts.SubscriptionAccount> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId,
            accountName: accountName,
            serviceOwners: serviceOwners
        };

        return this._beginRequest<VSS_Commerce_Contracts.SubscriptionAccount>({
            httpMethod: "GET",
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: VSS_Commerce_Contracts.TypeInfo.SubscriptionAccount,
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
     * @param {VSS_Commerce_Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} accountId
     * @return IPromise<VSS_Commerce_Contracts.SubscriptionAccount>
     */
    public getSubscriptionAccount(
        providerNamespaceId: VSS_Commerce_Contracts.AccountProviderNamespace,
        accountId: string
        ): IPromise<VSS_Commerce_Contracts.SubscriptionAccount> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId,
            accountId: accountId
        };

        return this._beginRequest<VSS_Commerce_Contracts.SubscriptionAccount>({
            httpMethod: "GET",
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: VSS_Commerce_Contracts.TypeInfo.SubscriptionAccount,
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string[]} ids
     * @param {VSS_Commerce_Contracts.AccountProviderNamespace} providerNamespaceId
     * @return IPromise<VSS_Commerce_Contracts.IAzureSubscription[]>
     */
    public getAzureSubscriptions(
        ids: string[],
        providerNamespaceId: VSS_Commerce_Contracts.AccountProviderNamespace
        ): IPromise<VSS_Commerce_Contracts.IAzureSubscription[]> {

        const queryValues: any = {
            ids: ids,
            providerNamespaceId: providerNamespaceId
        };

        return this._beginRequest<VSS_Commerce_Contracts.IAzureSubscription[]>({
            httpMethod: "GET",
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: VSS_Commerce_Contracts.TypeInfo.IAzureSubscription,
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
     * @return IPromise<VSS_Commerce_Contracts.ISubscriptionAccount[]>
     */
    public getAzureSubscriptionForUser(
        subscriptionId?: string,
        queryAcrossTenants?: boolean
        ): IPromise<VSS_Commerce_Contracts.ISubscriptionAccount[]> {

        const queryValues: any = {
            queryAcrossTenants: queryAcrossTenants
        };

        return this._beginRequest<VSS_Commerce_Contracts.ISubscriptionAccount[]>({
            httpMethod: "GET",
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: VSS_Commerce_Contracts.TypeInfo.ISubscriptionAccount,
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
     * @return IPromise<VSS_Commerce_Contracts.ISubscriptionAccount>
     */
    public getAzureSubscriptionForPurchase(
        subscriptionId: string,
        galleryItemId: string,
        accountId?: string
        ): IPromise<VSS_Commerce_Contracts.ISubscriptionAccount> {

        const queryValues: any = {
            galleryItemId: galleryItemId,
            accountId: accountId
        };

        return this._beginRequest<VSS_Commerce_Contracts.ISubscriptionAccount>({
            httpMethod: "GET",
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: VSS_Commerce_Contracts.TypeInfo.ISubscriptionAccount,
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
     * @param {VSS_Commerce_Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} memberId
     * @param {boolean} queryOnlyOwnerAccounts
     * @param {boolean} inlcudeDisabledAccounts
     * @param {boolean} includeMSAAccounts
     * @param {string[]} serviceOwners
     * @param {string} galleryId
     * @param {boolean} addUnlinkedSubscription
     * @param {boolean} queryAccountsByUpn
     * @return IPromise<VSS_Commerce_Contracts.ISubscriptionAccount[]>
     */
    public getAccountsByIdentityForOfferId(
        providerNamespaceId: VSS_Commerce_Contracts.AccountProviderNamespace,
        memberId: string,
        queryOnlyOwnerAccounts: boolean,
        inlcudeDisabledAccounts: boolean,
        includeMSAAccounts: boolean,
        serviceOwners: string[],
        galleryId: string,
        addUnlinkedSubscription?: boolean,
        queryAccountsByUpn?: boolean
        ): IPromise<VSS_Commerce_Contracts.ISubscriptionAccount[]> {

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

        return this._beginRequest<VSS_Commerce_Contracts.ISubscriptionAccount[]>({
            httpMethod: "GET",
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: VSS_Commerce_Contracts.TypeInfo.ISubscriptionAccount,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Commerce_Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} memberId
     * @param {boolean} queryOnlyOwnerAccounts
     * @param {boolean} inlcudeDisabledAccounts
     * @param {boolean} includeMSAAccounts
     * @param {string[]} serviceOwners
     * @return IPromise<VSS_Commerce_Contracts.ISubscriptionAccount[]>
     */
    public getAccountsByIdentity(
        providerNamespaceId: VSS_Commerce_Contracts.AccountProviderNamespace,
        memberId: string,
        queryOnlyOwnerAccounts: boolean,
        inlcudeDisabledAccounts: boolean,
        includeMSAAccounts: boolean,
        serviceOwners: string[]
        ): IPromise<VSS_Commerce_Contracts.ISubscriptionAccount[]> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId,
            memberId: memberId,
            queryOnlyOwnerAccounts: queryOnlyOwnerAccounts,
            inlcudeDisabledAccounts: inlcudeDisabledAccounts,
            includeMSAAccounts: includeMSAAccounts,
            serviceOwners: serviceOwners
        };

        return this._beginRequest<VSS_Commerce_Contracts.ISubscriptionAccount[]>({
            httpMethod: "GET",
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: VSS_Commerce_Contracts.TypeInfo.ISubscriptionAccount,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} subscriptionId
     * @param {VSS_Commerce_Contracts.AccountProviderNamespace} providerNamespaceId
     * @return IPromise<VSS_Commerce_Contracts.ISubscriptionAccount[]>
     */
    public getAccounts(
        subscriptionId: string,
        providerNamespaceId: VSS_Commerce_Contracts.AccountProviderNamespace
        ): IPromise<VSS_Commerce_Contracts.ISubscriptionAccount[]> {

        const queryValues: any = {
            providerNamespaceId: providerNamespaceId
        };

        return this._beginRequest<VSS_Commerce_Contracts.ISubscriptionAccount[]>({
            httpMethod: "GET",
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            responseType: VSS_Commerce_Contracts.TypeInfo.ISubscriptionAccount,
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
     * @param {VSS_Commerce_Contracts.AccountProviderNamespace} providerNamespaceId
     * @param {string} accountId
     * @param {boolean} hydrate
     * @return IPromise<void>
     */
    public changeSubscriptionAccount(
        subscriptionId: string,
        providerNamespaceId: VSS_Commerce_Contracts.AccountProviderNamespace,
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
            area: "Subscription",
            locationId: "94de86a2-03e3-42db-a2e8-1a82bf13a262",
            resource: "Subscription",
            routeTemplate: "_apis/{area}/{resource}/{subscriptionId}",
            routeValues: {
                subscriptionId: subscriptionId
            },
            queryParams: queryValues,
            apiVersion: this.subscriptionApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class SubscriptionHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.subscriptionApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SubscriptionHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.subscriptionApiVersion = "4.1-preview.1";
    }
}

export class SubscriptionHttpClient extends SubscriptionHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": SubscriptionHttpClient5,
    "4.1": SubscriptionHttpClient4_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return SubscriptionHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): SubscriptionHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<SubscriptionHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<SubscriptionHttpClient5>(SubscriptionHttpClient5, undefined, undefined, undefined, options);
    }
}
