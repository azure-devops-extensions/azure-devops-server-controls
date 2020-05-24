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

import Contracts = require("VSS/Accounts/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = VSS_WebApi_Constants.ServiceInstanceTypes.SPS;
    protected accountsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * @param {string} accountId
     * @return IPromise<Contracts.Account>
     */
    public getAccount(
        accountId: string
        ): IPromise<Contracts.Account> {

        return this._beginRequest<Contracts.Account>({
            httpMethod: "GET",
            area: "Account",
            locationId: "229a6a53-b428-4ffb-a835-e8f36b5b4b1e",
            resource: "Accounts",
            routeTemplate: "_apis/{resource}/{accountId}",
            responseType: Contracts.TypeInfo.Account,
            routeValues: {
                accountId: accountId
            },
            apiVersion: this.accountsApiVersion
        });
    }

    /**
     * @param {Contracts.AccountCreateInfoInternal} info
     * @param {boolean} usePrecreated
     * @return IPromise<Contracts.Account>
     */
    public createAccount(
        info: Contracts.AccountCreateInfoInternal,
        usePrecreated?: boolean
        ): IPromise<Contracts.Account> {

        const queryValues: any = {
            usePrecreated: usePrecreated
        };

        return this._beginRequest<Contracts.Account>({
            httpMethod: "POST",
            area: "Account",
            locationId: "229a6a53-b428-4ffb-a835-e8f36b5b4b1e",
            resource: "Accounts",
            routeTemplate: "_apis/{resource}/{accountId}",
            responseType: Contracts.TypeInfo.Account,
            queryParams: queryValues,
            apiVersion: this.accountsApiVersion,
            data: info
        });
    }
}

export class CommonMethods3_2To5 extends CommonMethods2To5 {
    protected accountsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * Get a list of accounts for a specific owner or a specific member.
     *
     * @param {string} ownerId - ID for the owner of the accounts.
     * @param {string} memberId - ID for a member of the accounts.
     * @param {string} properties
     * @return IPromise<Contracts.Account[]>
     */
    public getAccounts(
        ownerId?: string,
        memberId?: string,
        properties?: string
        ): IPromise<Contracts.Account[]> {

        const queryValues: any = {
            ownerId: ownerId,
            memberId: memberId,
            properties: properties
        };

        return this._beginRequest<Contracts.Account[]>({
            httpMethod: "GET",
            area: "Account",
            locationId: "229a6a53-b428-4ffb-a835-e8f36b5b4b1e",
            resource: "Accounts",
            routeTemplate: "_apis/{resource}/{accountId}",
            responseType: Contracts.TypeInfo.Account,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.accountsApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class AccountsHttpClient5 extends CommonMethods3_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion = "5.0";
    }
}

/**
 * @exemptedapi
 */
export class AccountsHttpClient4_1 extends CommonMethods3_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion = "4.1";
    }
}

/**
 * @exemptedapi
 */
export class AccountsHttpClient4 extends CommonMethods3_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion = "4.0";
    }
}

/**
 * @exemptedapi
 */
export class AccountsHttpClient3_2 extends CommonMethods3_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion = "3.2";
    }
}

export class AccountsHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion = "3.1";
    }

    /**
     * @param {string} ownerId
     * @param {string} memberId
     * @param {string} properties
     * @return IPromise<Contracts.Account[]>
     */
    public getAccounts(
        ownerId?: string,
        memberId?: string,
        properties?: string
        ): IPromise<Contracts.Account[]> {

        const queryValues: any = {
            ownerId: ownerId,
            memberId: memberId,
            properties: properties
        };

        return this._beginRequest<Contracts.Account[]>({
            httpMethod: "GET",
            area: "Account",
            locationId: "229a6a53-b428-4ffb-a835-e8f36b5b4b1e",
            resource: "Accounts",
            routeTemplate: "_apis/{resource}/{accountId}",
            responseType: Contracts.TypeInfo.Account,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "3.1"
        });
    }
}

export class AccountsHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion = "3.0";
    }

    /**
     * @param {string} ownerId
     * @param {string} memberId
     * @param {string} properties
     * @return IPromise<Contracts.Account[]>
     */
    public getAccounts(
        ownerId?: string,
        memberId?: string,
        properties?: string
        ): IPromise<Contracts.Account[]> {

        const queryValues: any = {
            ownerId: ownerId,
            memberId: memberId,
            properties: properties
        };

        return this._beginRequest<Contracts.Account[]>({
            httpMethod: "GET",
            area: "Account",
            locationId: "229a6a53-b428-4ffb-a835-e8f36b5b4b1e",
            resource: "Accounts",
            routeTemplate: "_apis/{resource}/{accountId}",
            responseType: Contracts.TypeInfo.Account,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "3.0"
        });
    }
}

export class AccountsHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion = "2.3";
    }

    /**
     * @param {string} ownerId
     * @param {string} memberId
     * @param {string} properties
     * @return IPromise<Contracts.Account[]>
     */
    public getAccounts(
        ownerId?: string,
        memberId?: string,
        properties?: string
        ): IPromise<Contracts.Account[]> {

        const queryValues: any = {
            ownerId: ownerId,
            memberId: memberId,
            properties: properties
        };

        return this._beginRequest<Contracts.Account[]>({
            httpMethod: "GET",
            area: "Account",
            locationId: "229a6a53-b428-4ffb-a835-e8f36b5b4b1e",
            resource: "Accounts",
            routeTemplate: "_apis/{resource}/{accountId}",
            responseType: Contracts.TypeInfo.Account,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "2.3"
        });
    }
}

export class AccountsHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion = "2.2";
    }

    /**
     * @param {string} ownerId
     * @param {string} memberId
     * @param {string} properties
     * @return IPromise<Contracts.Account[]>
     */
    public getAccounts(
        ownerId?: string,
        memberId?: string,
        properties?: string
        ): IPromise<Contracts.Account[]> {

        const queryValues: any = {
            ownerId: ownerId,
            memberId: memberId,
            properties: properties
        };

        return this._beginRequest<Contracts.Account[]>({
            httpMethod: "GET",
            area: "Account",
            locationId: "229a6a53-b428-4ffb-a835-e8f36b5b4b1e",
            resource: "Accounts",
            routeTemplate: "_apis/{resource}/{accountId}",
            responseType: Contracts.TypeInfo.Account,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "2.2"
        });
    }
}

export class AccountsHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion = "2.1";
    }

    /**
     * @param {string} ownerId
     * @param {string} memberId
     * @param {string} properties
     * @return IPromise<Contracts.Account[]>
     */
    public getAccounts(
        ownerId?: string,
        memberId?: string,
        properties?: string
        ): IPromise<Contracts.Account[]> {

        const queryValues: any = {
            ownerId: ownerId,
            memberId: memberId,
            properties: properties
        };

        return this._beginRequest<Contracts.Account[]>({
            httpMethod: "GET",
            area: "Account",
            locationId: "229a6a53-b428-4ffb-a835-e8f36b5b4b1e",
            resource: "Accounts",
            routeTemplate: "_apis/{resource}/{accountId}",
            responseType: Contracts.TypeInfo.Account,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "2.1"
        });
    }
}

export class AccountsHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion = "2.0";
    }

    /**
     * @param {string} ownerId
     * @param {string} memberId
     * @param {string} properties
     * @return IPromise<Contracts.Account[]>
     */
    public getAccounts(
        ownerId?: string,
        memberId?: string,
        properties?: string
        ): IPromise<Contracts.Account[]> {

        const queryValues: any = {
            ownerId: ownerId,
            memberId: memberId,
            properties: properties
        };

        return this._beginRequest<Contracts.Account[]>({
            httpMethod: "GET",
            area: "Account",
            locationId: "229a6a53-b428-4ffb-a835-e8f36b5b4b1e",
            resource: "Accounts",
            routeTemplate: "_apis/{resource}/{accountId}",
            responseType: Contracts.TypeInfo.Account,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "2.0"
        });
    }
}

export class AccountsHttpClient extends AccountsHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": AccountsHttpClient5,
    "4.1": AccountsHttpClient4_1,
    "4.0": AccountsHttpClient4,
    "3.2": AccountsHttpClient3_2,
    "3.1": AccountsHttpClient3_1,
    "3.0": AccountsHttpClient3,
    "2.3": AccountsHttpClient2_3,
    "2.2": AccountsHttpClient2_2,
    "2.1": AccountsHttpClient2_1,
    "2.0": AccountsHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return AccountsHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): AccountsHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<AccountsHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<AccountsHttpClient5>(AccountsHttpClient5, undefined, undefined, undefined, options);
    }
}
