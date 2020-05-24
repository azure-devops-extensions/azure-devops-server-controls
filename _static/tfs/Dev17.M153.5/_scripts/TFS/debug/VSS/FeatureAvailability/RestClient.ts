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

import Contracts = require("VSS/FeatureAvailability/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected featureFlagsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Change the state of an individual feature flag for a name
     *
     * @param {Contracts.FeatureFlagPatch} state - State that should be set
     * @param {string} name - The name of the feature to change
     * @param {string} userEmail
     * @param {boolean} checkFeatureExists - Checks if the feature exists before setting the state
     * @param {boolean} setAtApplicationLevelAlso
     * @return IPromise<Contracts.FeatureFlag>
     */
    public updateFeatureFlag(
        state: Contracts.FeatureFlagPatch,
        name: string,
        userEmail?: string,
        checkFeatureExists?: boolean,
        setAtApplicationLevelAlso?: boolean
        ): IPromise<Contracts.FeatureFlag> {

        const queryValues: any = {
            userEmail: userEmail,
            checkFeatureExists: checkFeatureExists,
            setAtApplicationLevelAlso: setAtApplicationLevelAlso
        };

        return this._beginRequest<Contracts.FeatureFlag>({
            httpMethod: "PATCH",
            area: "FeatureAvailability",
            locationId: "3e2b80f8-9e6f-441e-8393-005610692d9c",
            resource: "FeatureFlags",
            routeTemplate: "_apis/{resource}/{name}",
            routeValues: {
                name: name
            },
            queryParams: queryValues,
            apiVersion: this.featureFlagsApiVersion,
            data: state
        });
    }

    /**
     * [Preview API] Retrieve information on a single feature flag and its current states for a user
     *
     * @param {string} name - The name of the feature to retrieve
     * @param {string} userId - The id of the user to check
     * @param {boolean} checkFeatureExists - Check if feature exists
     * @return IPromise<Contracts.FeatureFlag>
     */
    public getFeatureFlagByNameAndUserId(
        name: string,
        userId: string,
        checkFeatureExists?: boolean
        ): IPromise<Contracts.FeatureFlag> {

        const queryValues: any = {
            userId: userId,
            checkFeatureExists: checkFeatureExists
        };

        return this._beginRequest<Contracts.FeatureFlag>({
            httpMethod: "GET",
            area: "FeatureAvailability",
            locationId: "3e2b80f8-9e6f-441e-8393-005610692d9c",
            resource: "FeatureFlags",
            routeTemplate: "_apis/{resource}/{name}",
            routeValues: {
                name: name
            },
            queryParams: queryValues,
            apiVersion: this.featureFlagsApiVersion
        });
    }

    /**
     * [Preview API] Retrieve information on a single feature flag and its current states for a user
     *
     * @param {string} name - The name of the feature to retrieve
     * @param {string} userEmail - The email of the user to check
     * @param {boolean} checkFeatureExists - Check if feature exists
     * @return IPromise<Contracts.FeatureFlag>
     */
    public getFeatureFlagByNameAndUserEmail(
        name: string,
        userEmail: string,
        checkFeatureExists?: boolean
        ): IPromise<Contracts.FeatureFlag> {

        const queryValues: any = {
            userEmail: userEmail,
            checkFeatureExists: checkFeatureExists
        };

        return this._beginRequest<Contracts.FeatureFlag>({
            httpMethod: "GET",
            area: "FeatureAvailability",
            locationId: "3e2b80f8-9e6f-441e-8393-005610692d9c",
            resource: "FeatureFlags",
            routeTemplate: "_apis/{resource}/{name}",
            routeValues: {
                name: name
            },
            queryParams: queryValues,
            apiVersion: this.featureFlagsApiVersion
        });
    }

    /**
     * [Preview API] Retrieve information on a single feature flag and its current states
     *
     * @param {string} name - The name of the feature to retrieve
     * @param {boolean} checkFeatureExists - Check if feature exists
     * @return IPromise<Contracts.FeatureFlag>
     */
    public getFeatureFlagByName(
        name: string,
        checkFeatureExists?: boolean
        ): IPromise<Contracts.FeatureFlag> {

        const queryValues: any = {
            checkFeatureExists: checkFeatureExists
        };

        return this._beginRequest<Contracts.FeatureFlag>({
            httpMethod: "GET",
            area: "FeatureAvailability",
            locationId: "3e2b80f8-9e6f-441e-8393-005610692d9c",
            resource: "FeatureFlags",
            routeTemplate: "_apis/{resource}/{name}",
            routeValues: {
                name: name
            },
            queryParams: queryValues,
            apiVersion: this.featureFlagsApiVersion
        });
    }

    /**
     * [Preview API] Retrieve a listing of all feature flags and their current states for a user
     *
     * @param {string} userEmail - The email of the user to check
     * @return IPromise<Contracts.FeatureFlag[]>
     */
    public getAllFeatureFlags(
        userEmail?: string
        ): IPromise<Contracts.FeatureFlag[]> {

        const queryValues: any = {
            userEmail: userEmail
        };

        return this._beginRequest<Contracts.FeatureFlag[]>({
            httpMethod: "GET",
            area: "FeatureAvailability",
            locationId: "3e2b80f8-9e6f-441e-8393-005610692d9c",
            resource: "FeatureFlags",
            routeTemplate: "_apis/{resource}/{name}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.featureFlagsApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class FeatureAvailabilityHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featureFlagsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureAvailabilityHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featureFlagsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureAvailabilityHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featureFlagsApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureAvailabilityHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featureFlagsApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureAvailabilityHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featureFlagsApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureAvailabilityHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featureFlagsApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureAvailabilityHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featureFlagsApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureAvailabilityHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featureFlagsApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureAvailabilityHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featureFlagsApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureAvailabilityHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featureFlagsApiVersion = "2.0-preview.1";
    }
}

export class FeatureAvailabilityHttpClient extends FeatureAvailabilityHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": FeatureAvailabilityHttpClient5,
    "4.1": FeatureAvailabilityHttpClient4_1,
    "4.0": FeatureAvailabilityHttpClient4,
    "3.2": FeatureAvailabilityHttpClient3_2,
    "3.1": FeatureAvailabilityHttpClient3_1,
    "3.0": FeatureAvailabilityHttpClient3,
    "2.3": FeatureAvailabilityHttpClient2_3,
    "2.2": FeatureAvailabilityHttpClient2_2,
    "2.1": FeatureAvailabilityHttpClient2_1,
    "2.0": FeatureAvailabilityHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return FeatureAvailabilityHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): FeatureAvailabilityHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<FeatureAvailabilityHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<FeatureAvailabilityHttpClient5>(FeatureAvailabilityHttpClient5, undefined, undefined, undefined, options);
    }
}
