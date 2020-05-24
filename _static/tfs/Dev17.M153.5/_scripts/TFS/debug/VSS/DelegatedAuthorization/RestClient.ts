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

import Contracts = require("VSS/DelegatedAuthorization/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected authorizationsApiVersion: string;
    protected hostAuthorizationApiVersion: string;
    protected registrationApiVersion: string;
    protected registrationSecretApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * @param {string} registrationId
     * @return IPromise<VSS_Common_Contracts.JsonWebToken>
     */
    public getSecret(
        registrationId: string
        ): IPromise<VSS_Common_Contracts.JsonWebToken> {

        return this._beginRequest<VSS_Common_Contracts.JsonWebToken>({
            httpMethod: "GET",
            area: "DelegatedAuth",
            locationId: "f37e5023-dfbe-490e-9e40-7b7fb6b67887",
            resource: "RegistrationSecret",
            routeTemplate: "_apis/{area}/{resource}/{registrationId}",
            routeValues: {
                registrationId: registrationId
            },
            apiVersion: this.registrationSecretApiVersion
        });
    }

    /**
     * @param {Contracts.Registration} registration
     * @param {boolean} includeSecret
     * @return IPromise<Contracts.Registration>
     */
    public updateRegistration(
        registration: Contracts.Registration,
        includeSecret?: boolean
        ): IPromise<Contracts.Registration> {

        const queryValues: any = {
            includeSecret: includeSecret
        };

        return this._beginRequest<Contracts.Registration>({
            httpMethod: "POST",
            area: "DelegatedAuth",
            locationId: "909cd090-3005-480d-a1b4-220b76cb0afe",
            resource: "Registration",
            routeTemplate: "_apis/{area}/{resource}/{registrationId}",
            requestType: Contracts.TypeInfo.Registration,
            responseType: Contracts.TypeInfo.Registration,
            queryParams: queryValues,
            apiVersion: this.registrationApiVersion,
            data: registration
        });
    }

    /**
     * @return IPromise<Contracts.Registration[]>
     */
    public getRegistrations(): IPromise<Contracts.Registration[]> {

        return this._beginRequest<Contracts.Registration[]>({
            httpMethod: "GET",
            area: "DelegatedAuth",
            locationId: "909cd090-3005-480d-a1b4-220b76cb0afe",
            resource: "Registration",
            routeTemplate: "_apis/{area}/{resource}/{registrationId}",
            responseType: Contracts.TypeInfo.Registration,
            responseIsCollection: true,
            apiVersion: this.registrationApiVersion
        });
    }

    /**
     * @param {string} registrationId
     * @param {boolean} includeSecret
     * @return IPromise<Contracts.Registration>
     */
    public getRegistration(
        registrationId: string,
        includeSecret?: boolean
        ): IPromise<Contracts.Registration> {

        const queryValues: any = {
            includeSecret: includeSecret
        };

        return this._beginRequest<Contracts.Registration>({
            httpMethod: "GET",
            area: "DelegatedAuth",
            locationId: "909cd090-3005-480d-a1b4-220b76cb0afe",
            resource: "Registration",
            routeTemplate: "_apis/{area}/{resource}/{registrationId}",
            responseType: Contracts.TypeInfo.Registration,
            routeValues: {
                registrationId: registrationId
            },
            queryParams: queryValues,
            apiVersion: this.registrationApiVersion
        });
    }

    /**
     * @param {string} registrationId
     * @return IPromise<void>
     */
    public deleteRegistration(
        registrationId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "DelegatedAuth",
            locationId: "909cd090-3005-480d-a1b4-220b76cb0afe",
            resource: "Registration",
            routeTemplate: "_apis/{area}/{resource}/{registrationId}",
            routeValues: {
                registrationId: registrationId
            },
            apiVersion: this.registrationApiVersion
        });
    }

    /**
     * @param {Contracts.Registration} registration
     * @param {boolean} includeSecret
     * @return IPromise<Contracts.Registration>
     */
    public createRegistration(
        registration: Contracts.Registration,
        includeSecret?: boolean
        ): IPromise<Contracts.Registration> {

        const queryValues: any = {
            includeSecret: includeSecret
        };

        return this._beginRequest<Contracts.Registration>({
            httpMethod: "PUT",
            area: "DelegatedAuth",
            locationId: "909cd090-3005-480d-a1b4-220b76cb0afe",
            resource: "Registration",
            routeTemplate: "_apis/{area}/{resource}/{registrationId}",
            requestType: Contracts.TypeInfo.Registration,
            responseType: Contracts.TypeInfo.Registration,
            queryParams: queryValues,
            apiVersion: this.registrationApiVersion,
            data: registration
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} clientId
     * @param {string} hostId
     * @return IPromise<void>
     */
    public revokeHostAuthorization(
        clientId: string,
        hostId?: string
        ): IPromise<void> {

        const queryValues: any = {
            clientId: clientId,
            hostId: hostId
        };

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "DelegatedAuth",
            locationId: "7372fdd9-238c-467c-b0f2-995f4bfe0d94",
            resource: "HostAuthorization",
            routeTemplate: "_apis/{area}/{resource}",
            queryParams: queryValues,
            apiVersion: this.hostAuthorizationApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} hostId
     * @return IPromise<Contracts.HostAuthorization[]>
     */
    public getHostAuthorizations(
        hostId: string
        ): IPromise<Contracts.HostAuthorization[]> {

        const queryValues: any = {
            hostId: hostId
        };

        return this._beginRequest<Contracts.HostAuthorization[]>({
            httpMethod: "GET",
            area: "DelegatedAuth",
            locationId: "7372fdd9-238c-467c-b0f2-995f4bfe0d94",
            resource: "HostAuthorization",
            routeTemplate: "_apis/{area}/{resource}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.hostAuthorizationApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} clientId
     * @return IPromise<Contracts.HostAuthorizationDecision>
     */
    public authorizeHost(
        clientId: string
        ): IPromise<Contracts.HostAuthorizationDecision> {

        const queryValues: any = {
            clientId: clientId
        };

        return this._beginRequest<Contracts.HostAuthorizationDecision>({
            httpMethod: "POST",
            area: "DelegatedAuth",
            locationId: "7372fdd9-238c-467c-b0f2-995f4bfe0d94",
            resource: "HostAuthorization",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.HostAuthorizationDecision,
            queryParams: queryValues,
            apiVersion: this.hostAuthorizationApiVersion
        });
    }

    /**
     * @param {string} authorizationId
     * @param {string} userId
     * @return IPromise<void>
     */
    public revokeAuthorization(
        authorizationId: string,
        userId?: string
        ): IPromise<void> {

        const queryValues: any = {
            authorizationId: authorizationId
        };

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "DelegatedAuth",
            locationId: "efbf6e0c-1150-43fd-b869-7e2b04fc0d09",
            resource: "Authorizations",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            routeValues: {
                userId: userId
            },
            queryParams: queryValues,
            apiVersion: this.authorizationsApiVersion
        });
    }

    /**
     * @param {Contracts.ResponseType} responseType
     * @param {string} clientId
     * @param {string} redirectUri
     * @param {string} scopes
     * @param {string} userId
     * @return IPromise<Contracts.AuthorizationDescription>
     */
    public initiateAuthorization(
        responseType: Contracts.ResponseType,
        clientId: string,
        redirectUri: string,
        scopes: string,
        userId?: string
        ): IPromise<Contracts.AuthorizationDescription> {

        const queryValues: any = {
            responseType: responseType,
            clientId: clientId,
            redirectUri: redirectUri,
            scopes: scopes
        };

        return this._beginRequest<Contracts.AuthorizationDescription>({
            httpMethod: "GET",
            area: "DelegatedAuth",
            locationId: "efbf6e0c-1150-43fd-b869-7e2b04fc0d09",
            resource: "Authorizations",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            responseType: Contracts.TypeInfo.AuthorizationDescription,
            routeValues: {
                userId: userId
            },
            queryParams: queryValues,
            apiVersion: this.authorizationsApiVersion
        });
    }

    /**
     * @param {string} userId
     * @return IPromise<Contracts.AuthorizationDetails[]>
     */
    public getAuthorizations(
        userId?: string
        ): IPromise<Contracts.AuthorizationDetails[]> {

        return this._beginRequest<Contracts.AuthorizationDetails[]>({
            httpMethod: "GET",
            area: "DelegatedAuth",
            locationId: "efbf6e0c-1150-43fd-b869-7e2b04fc0d09",
            resource: "Authorizations",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            responseType: Contracts.TypeInfo.AuthorizationDetails,
            responseIsCollection: true,
            routeValues: {
                userId: userId
            },
            apiVersion: this.authorizationsApiVersion
        });
    }

    /**
     * @param {Contracts.ResponseType} responseType
     * @param {string} clientId
     * @param {string} redirectUri
     * @param {string} scopes
     * @param {string} userId
     * @return IPromise<Contracts.AuthorizationDecision>
     */
    public authorize(
        responseType: Contracts.ResponseType,
        clientId: string,
        redirectUri: string,
        scopes: string,
        userId?: string
        ): IPromise<Contracts.AuthorizationDecision> {

        const queryValues: any = {
            responseType: responseType,
            clientId: clientId,
            redirectUri: redirectUri,
            scopes: scopes
        };

        return this._beginRequest<Contracts.AuthorizationDecision>({
            httpMethod: "POST",
            area: "DelegatedAuth",
            locationId: "efbf6e0c-1150-43fd-b869-7e2b04fc0d09",
            resource: "Authorizations",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            responseType: Contracts.TypeInfo.AuthorizationDecision,
            routeValues: {
                userId: userId
            },
            queryParams: queryValues,
            apiVersion: this.authorizationsApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class DelegatedAuthorizationHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authorizationsApiVersion =
        this.registrationApiVersion =
        this.registrationSecretApiVersion = "5.0";
        this.hostAuthorizationApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class DelegatedAuthorizationHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authorizationsApiVersion =
        this.registrationApiVersion =
        this.registrationSecretApiVersion = "4.1";
        this.hostAuthorizationApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class DelegatedAuthorizationHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authorizationsApiVersion =
        this.registrationApiVersion =
        this.registrationSecretApiVersion = "4.0";
        this.hostAuthorizationApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class DelegatedAuthorizationHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authorizationsApiVersion =
        this.registrationApiVersion =
        this.registrationSecretApiVersion = "3.2";
        this.hostAuthorizationApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class DelegatedAuthorizationHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authorizationsApiVersion =
        this.registrationApiVersion =
        this.registrationSecretApiVersion = "3.1";
        this.hostAuthorizationApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class DelegatedAuthorizationHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authorizationsApiVersion =
        this.registrationApiVersion =
        this.registrationSecretApiVersion = "3.0";
        this.hostAuthorizationApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class DelegatedAuthorizationHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authorizationsApiVersion =
        this.registrationApiVersion =
        this.registrationSecretApiVersion = "2.3";
        this.hostAuthorizationApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class DelegatedAuthorizationHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authorizationsApiVersion =
        this.registrationApiVersion =
        this.registrationSecretApiVersion = "2.2";
        this.hostAuthorizationApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class DelegatedAuthorizationHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authorizationsApiVersion =
        this.registrationApiVersion =
        this.registrationSecretApiVersion = "2.1";
        this.hostAuthorizationApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class DelegatedAuthorizationHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authorizationsApiVersion =
        this.registrationApiVersion =
        this.registrationSecretApiVersion = "2.0";
        this.hostAuthorizationApiVersion = "2.0-preview.1";
    }
}

export class DelegatedAuthorizationHttpClient extends DelegatedAuthorizationHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": DelegatedAuthorizationHttpClient5,
    "4.1": DelegatedAuthorizationHttpClient4_1,
    "4.0": DelegatedAuthorizationHttpClient4,
    "3.2": DelegatedAuthorizationHttpClient3_2,
    "3.1": DelegatedAuthorizationHttpClient3_1,
    "3.0": DelegatedAuthorizationHttpClient3,
    "2.3": DelegatedAuthorizationHttpClient2_3,
    "2.2": DelegatedAuthorizationHttpClient2_2,
    "2.1": DelegatedAuthorizationHttpClient2_1,
    "2.0": DelegatedAuthorizationHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return DelegatedAuthorizationHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): DelegatedAuthorizationHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<DelegatedAuthorizationHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<DelegatedAuthorizationHttpClient5>(DelegatedAuthorizationHttpClient5, undefined, undefined, undefined, options);
    }
}
