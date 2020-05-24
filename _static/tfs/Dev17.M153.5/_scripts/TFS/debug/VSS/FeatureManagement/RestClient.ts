/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   extensionmanagement\client\webapi\httpclients\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("VSS/FeatureManagement/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods3To5 extends VSS_WebApi.VssHttpClient {
    protected featuresApiVersion: string;
    protected featureStatesApiVersion: string;
    protected featureStatesApiVersion_98911314: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Set the state of a feature at a specific scope
     *
     * @param {Contracts.ContributedFeatureState} feature - Posted feature state object. Should specify the effective value.
     * @param {string} featureId - Contribution id of the feature
     * @param {string} userScope - User-Scope at which to set the value. Should be "me" for the current user or "host" for all users.
     * @param {string} scopeName - Scope at which to get the feature setting for (e.g. "project" or "team")
     * @param {string} scopeValue - Value of the scope (e.g. the project or team id)
     * @param {string} reason - Reason for changing the state
     * @param {string} reasonCode - Short reason code
     * @return IPromise<Contracts.ContributedFeatureState>
     */
    public setFeatureStateForScope(
        feature: Contracts.ContributedFeatureState,
        featureId: string,
        userScope: string,
        scopeName: string,
        scopeValue: string,
        reason?: string,
        reasonCode?: string
        ): IPromise<Contracts.ContributedFeatureState> {

        const queryValues: any = {
            reason: reason,
            reasonCode: reasonCode
        };

        return this._beginRequest<Contracts.ContributedFeatureState>({
            httpMethod: "PATCH",
            area: "FeatureManagement",
            locationId: "dd291e43-aa9f-4cee-8465-a93c78e414a4",
            resource: "FeatureStates",
            routeTemplate: "_apis/{area}/{resource}/{userScope}/{scopeName}/{scopeValue}/{featureId}",
            requestType: Contracts.TypeInfo.ContributedFeatureState,
            responseType: Contracts.TypeInfo.ContributedFeatureState,
            routeValues: {
                featureId: featureId,
                userScope: userScope,
                scopeName: scopeName,
                scopeValue: scopeValue
            },
            queryParams: queryValues,
            apiVersion: this.featureStatesApiVersion,
            data: feature
        });
    }

    /**
     * [Preview API] Get the state of the specified feature for the given named scope
     *
     * @param {string} featureId - Contribution id of the feature
     * @param {string} userScope - User-Scope at which to get the value. Should be "me" for the current user or "host" for all users.
     * @param {string} scopeName - Scope at which to get the feature setting for (e.g. "project" or "team")
     * @param {string} scopeValue - Value of the scope (e.g. the project or team id)
     * @return IPromise<Contracts.ContributedFeatureState>
     */
    public getFeatureStateForScope(
        featureId: string,
        userScope: string,
        scopeName: string,
        scopeValue: string
        ): IPromise<Contracts.ContributedFeatureState> {

        return this._beginRequest<Contracts.ContributedFeatureState>({
            httpMethod: "GET",
            area: "FeatureManagement",
            locationId: "dd291e43-aa9f-4cee-8465-a93c78e414a4",
            resource: "FeatureStates",
            routeTemplate: "_apis/{area}/{resource}/{userScope}/{scopeName}/{scopeValue}/{featureId}",
            responseType: Contracts.TypeInfo.ContributedFeatureState,
            routeValues: {
                featureId: featureId,
                userScope: userScope,
                scopeName: scopeName,
                scopeValue: scopeValue
            },
            apiVersion: this.featureStatesApiVersion
        });
    }

    /**
     * [Preview API] Set the state of a feature
     *
     * @param {Contracts.ContributedFeatureState} feature - Posted feature state object. Should specify the effective value.
     * @param {string} featureId - Contribution id of the feature
     * @param {string} userScope - User-Scope at which to set the value. Should be "me" for the current user or "host" for all users.
     * @param {string} reason - Reason for changing the state
     * @param {string} reasonCode - Short reason code
     * @return IPromise<Contracts.ContributedFeatureState>
     */
    public setFeatureState(
        feature: Contracts.ContributedFeatureState,
        featureId: string,
        userScope: string,
        reason?: string,
        reasonCode?: string
        ): IPromise<Contracts.ContributedFeatureState> {

        const queryValues: any = {
            reason: reason,
            reasonCode: reasonCode
        };

        return this._beginRequest<Contracts.ContributedFeatureState>({
            httpMethod: "PATCH",
            area: "FeatureManagement",
            locationId: "98911314-3f9b-4eaf-80e8-83900d8e85d9",
            resource: "FeatureStates",
            routeTemplate: "_apis/{area}/{resource}/{userScope}/{featureId}",
            requestType: Contracts.TypeInfo.ContributedFeatureState,
            responseType: Contracts.TypeInfo.ContributedFeatureState,
            routeValues: {
                featureId: featureId,
                userScope: userScope
            },
            queryParams: queryValues,
            apiVersion: this.featureStatesApiVersion_98911314,
            data: feature
        });
    }

    /**
     * [Preview API] Get the state of the specified feature for the given user/all-users scope
     *
     * @param {string} featureId - Contribution id of the feature
     * @param {string} userScope - User-Scope at which to get the value. Should be "me" for the current user or "host" for all users.
     * @return IPromise<Contracts.ContributedFeatureState>
     */
    public getFeatureState(
        featureId: string,
        userScope: string
        ): IPromise<Contracts.ContributedFeatureState> {

        return this._beginRequest<Contracts.ContributedFeatureState>({
            httpMethod: "GET",
            area: "FeatureManagement",
            locationId: "98911314-3f9b-4eaf-80e8-83900d8e85d9",
            resource: "FeatureStates",
            routeTemplate: "_apis/{area}/{resource}/{userScope}/{featureId}",
            responseType: Contracts.TypeInfo.ContributedFeatureState,
            routeValues: {
                featureId: featureId,
                userScope: userScope
            },
            apiVersion: this.featureStatesApiVersion_98911314
        });
    }

    /**
     * [Preview API] Get a list of all defined features
     *
     * @param {string} targetContributionId - Optional target contribution. If null/empty, return all features. If specified include the features that target the specified contribution.
     * @return IPromise<Contracts.ContributedFeature[]>
     */
    public getFeatures(
        targetContributionId?: string
        ): IPromise<Contracts.ContributedFeature[]> {

        const queryValues: any = {
            targetContributionId: targetContributionId
        };

        return this._beginRequest<Contracts.ContributedFeature[]>({
            httpMethod: "GET",
            area: "FeatureManagement",
            locationId: "c4209f25-7a27-41dd-9f04-06080c7b6afd",
            resource: "Features",
            routeTemplate: "_apis/{area}/{resource}/{featureId}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.featuresApiVersion
        });
    }

    /**
     * [Preview API] Get a specific feature by its id
     *
     * @param {string} featureId - The contribution id of the feature
     * @return IPromise<Contracts.ContributedFeature>
     */
    public getFeature(
        featureId: string
        ): IPromise<Contracts.ContributedFeature> {

        return this._beginRequest<Contracts.ContributedFeature>({
            httpMethod: "GET",
            area: "FeatureManagement",
            locationId: "c4209f25-7a27-41dd-9f04-06080c7b6afd",
            resource: "Features",
            routeTemplate: "_apis/{area}/{resource}/{featureId}",
            routeValues: {
                featureId: featureId
            },
            apiVersion: this.featuresApiVersion
        });
    }
}

export class CommonMethods3_1To5 extends CommonMethods3To5 {
    protected featureStatesQueryApiVersion: string;
    protected featureStatesQueryApiVersion_2b4486ad: string;
    protected featureStatesQueryApiVersion_3f810f28: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Get the states of the specified features for the specific named scope
     *
     * @param {Contracts.ContributedFeatureStateQuery} query - Query describing the features to query.
     * @param {string} userScope
     * @param {string} scopeName
     * @param {string} scopeValue
     * @return IPromise<Contracts.ContributedFeatureStateQuery>
     */
    public queryFeatureStatesForNamedScope(
        query: Contracts.ContributedFeatureStateQuery,
        userScope: string,
        scopeName: string,
        scopeValue: string
        ): IPromise<Contracts.ContributedFeatureStateQuery> {

        return this._beginRequest<Contracts.ContributedFeatureStateQuery>({
            httpMethod: "POST",
            area: "FeatureManagement",
            locationId: "f29e997b-c2da-4d15-8380-765788a1a74c",
            resource: "FeatureStatesQuery",
            routeTemplate: "_apis/{area}/{resource}/{userScope}/{scopeName}/{scopeValue}",
            requestType: Contracts.TypeInfo.ContributedFeatureStateQuery,
            responseType: Contracts.TypeInfo.ContributedFeatureStateQuery,
            routeValues: {
                userScope: userScope,
                scopeName: scopeName,
                scopeValue: scopeValue
            },
            apiVersion: this.featureStatesQueryApiVersion,
            data: query
        });
    }

    /**
     * [Preview API] Get the states of the specified features for the default scope
     *
     * @param {Contracts.ContributedFeatureStateQuery} query - Query describing the features to query.
     * @param {string} userScope
     * @return IPromise<Contracts.ContributedFeatureStateQuery>
     */
    public queryFeatureStatesForDefaultScope(
        query: Contracts.ContributedFeatureStateQuery,
        userScope: string
        ): IPromise<Contracts.ContributedFeatureStateQuery> {

        return this._beginRequest<Contracts.ContributedFeatureStateQuery>({
            httpMethod: "POST",
            area: "FeatureManagement",
            locationId: "3f810f28-03e2-4239-b0bc-788add3005e5",
            resource: "FeatureStatesQuery",
            routeTemplate: "_apis/{area}/{resource}/{userScope}",
            requestType: Contracts.TypeInfo.ContributedFeatureStateQuery,
            responseType: Contracts.TypeInfo.ContributedFeatureStateQuery,
            routeValues: {
                userScope: userScope
            },
            apiVersion: this.featureStatesQueryApiVersion_3f810f28,
            data: query
        });
    }

    /**
     * [Preview API] Get the effective state for a list of feature ids
     *
     * @param {Contracts.ContributedFeatureStateQuery} query - Features to query along with current scope values
     * @return IPromise<Contracts.ContributedFeatureStateQuery>
     */
    public queryFeatureStates(
        query: Contracts.ContributedFeatureStateQuery
        ): IPromise<Contracts.ContributedFeatureStateQuery> {

        return this._beginRequest<Contracts.ContributedFeatureStateQuery>({
            httpMethod: "POST",
            area: "FeatureManagement",
            locationId: "2b4486ad-122b-400c-ae65-17b6672c1f9d",
            resource: "FeatureStatesQuery",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: Contracts.TypeInfo.ContributedFeatureStateQuery,
            responseType: Contracts.TypeInfo.ContributedFeatureStateQuery,
            apiVersion: this.featureStatesQueryApiVersion_2b4486ad,
            data: query
        });
    }
}

/**
 * @exemptedapi
 */
export class FeatureManagementHttpClient5 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featuresApiVersion =
        this.featureStatesApiVersion =
        this.featureStatesApiVersion_98911314 =
        this.featureStatesQueryApiVersion =
        this.featureStatesQueryApiVersion_3f810f28 =
        this.featureStatesQueryApiVersion_2b4486ad = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureManagementHttpClient4_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featuresApiVersion =
        this.featureStatesApiVersion =
        this.featureStatesApiVersion_98911314 =
        this.featureStatesQueryApiVersion =
        this.featureStatesQueryApiVersion_3f810f28 =
        this.featureStatesQueryApiVersion_2b4486ad = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureManagementHttpClient4 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featuresApiVersion =
        this.featureStatesApiVersion =
        this.featureStatesApiVersion_98911314 =
        this.featureStatesQueryApiVersion =
        this.featureStatesQueryApiVersion_3f810f28 =
        this.featureStatesQueryApiVersion_2b4486ad = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureManagementHttpClient3_2 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featuresApiVersion =
        this.featureStatesApiVersion =
        this.featureStatesApiVersion_98911314 =
        this.featureStatesQueryApiVersion =
        this.featureStatesQueryApiVersion_3f810f28 =
        this.featureStatesQueryApiVersion_2b4486ad = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureManagementHttpClient3_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featuresApiVersion =
        this.featureStatesApiVersion =
        this.featureStatesApiVersion_98911314 =
        this.featureStatesQueryApiVersion =
        this.featureStatesQueryApiVersion_3f810f28 =
        this.featureStatesQueryApiVersion_2b4486ad = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeatureManagementHttpClient3 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.featuresApiVersion =
        this.featureStatesApiVersion =
        this.featureStatesApiVersion_98911314 = "3.0-preview.1";
    }
}

export class FeatureManagementHttpClient extends FeatureManagementHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": FeatureManagementHttpClient5,
    "4.1": FeatureManagementHttpClient4_1,
    "4.0": FeatureManagementHttpClient4,
    "3.2": FeatureManagementHttpClient3_2,
    "3.1": FeatureManagementHttpClient3_1,
    "3.0": FeatureManagementHttpClient3
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return FeatureManagementHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): FeatureManagementHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<FeatureManagementHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<FeatureManagementHttpClient5>(FeatureManagementHttpClient5, undefined, undefined, undefined, options);
    }
}
