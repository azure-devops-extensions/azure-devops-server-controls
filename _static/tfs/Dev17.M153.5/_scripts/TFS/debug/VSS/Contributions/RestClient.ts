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

import VSS_Contributions_Contracts = require("VSS/Contributions/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected installedAppsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string[]} contributionIds
     * @param {boolean} includeDisabledApps
     * @param {string[]} assetTypes
     * @return IPromise<VSS_Contributions_Contracts.InstalledExtension[]>
     */
    public getInstalledExtensions(
        contributionIds?: string[],
        includeDisabledApps?: boolean,
        assetTypes?: string[]
        ): IPromise<VSS_Contributions_Contracts.InstalledExtension[]> {

        const queryValues: any = {
            contributionIds: contributionIds && contributionIds.join(";"),
            includeDisabledApps: includeDisabledApps,
            assetTypes: assetTypes && assetTypes.join(":")
        };

        return this._beginRequest<VSS_Contributions_Contracts.InstalledExtension[]>({
            httpMethod: "GET",
            area: "Contribution",
            locationId: "2648442b-fd63-4b9a-902f-0c913510f139",
            resource: "InstalledApps",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: VSS_Contributions_Contracts.TypeInfo.InstalledExtension,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.installedAppsApiVersion
        });
    }
}

export class CommonMethods2_1To5 extends CommonMethods2To5 {
    protected installedAppsApiVersion_3e2f6668: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string[]} assetTypes
     * @return IPromise<VSS_Contributions_Contracts.InstalledExtension>
     */
    public getInstalledExtensionByName(
        publisherName: string,
        extensionName: string,
        assetTypes?: string[]
        ): IPromise<VSS_Contributions_Contracts.InstalledExtension> {

        const queryValues: any = {
            assetTypes: assetTypes && assetTypes.join(":")
        };

        return this._beginRequest<VSS_Contributions_Contracts.InstalledExtension>({
            httpMethod: "GET",
            area: "Contribution",
            locationId: "3e2f6668-0798-4dcb-b592-bfe2fa57fde2",
            resource: "InstalledApps",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}/{extensionName}",
            responseType: VSS_Contributions_Contracts.TypeInfo.InstalledExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.installedAppsApiVersion_3e2f6668
        });
    }
}

export class CommonMethods2_2To5 extends CommonMethods2_1To5 {
    protected dataProvidersQueryApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Contributions_Contracts.DataProviderQuery} query
     * @param {string} scopeName
     * @param {string} scopeValue
     * @return IPromise<VSS_Contributions_Contracts.DataProviderResult>
     */
    public queryDataProviders(
        query: VSS_Contributions_Contracts.DataProviderQuery,
        scopeName?: string,
        scopeValue?: string
        ): IPromise<VSS_Contributions_Contracts.DataProviderResult> {

        return this._beginRequest<VSS_Contributions_Contracts.DataProviderResult>({
            httpMethod: "POST",
            area: "Contribution",
            locationId: "738368db-35ee-4b85-9f94-77ed34af2b0d",
            resource: "dataProvidersQuery",
            routeTemplate: "_apis/{area}/dataProviders/query/{scopeName}/{scopeValue}",
            routeValues: {
                scopeName: scopeName,
                scopeValue: scopeValue
            },
            apiVersion: this.dataProvidersQueryApiVersion,
            data: query
        });
    }
}

export class CommonMethods3_1To5 extends CommonMethods2_2To5 {
    protected contributionNodeQueryApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Query for contribution nodes and provider details according the parameters in the passed in query object.
     *
     * @param {VSS_Contributions_Contracts.ContributionNodeQuery} query
     * @return IPromise<VSS_Contributions_Contracts.ContributionNodeQueryResult>
     */
    public queryContributionNodes(
        query: VSS_Contributions_Contracts.ContributionNodeQuery
        ): IPromise<VSS_Contributions_Contracts.ContributionNodeQueryResult> {

        return this._beginRequest<VSS_Contributions_Contracts.ContributionNodeQueryResult>({
            httpMethod: "POST",
            area: "Contribution",
            locationId: "db7f2146-2309-4cee-b39c-c767777a1c55",
            resource: "ContributionNodeQuery",
            routeTemplate: "_apis/{area}/nodes/query",
            requestType: VSS_Contributions_Contracts.TypeInfo.ContributionNodeQuery,
            apiVersion: this.contributionNodeQueryApiVersion,
            data: query
        });
    }
}

/**
 * @exemptedapi
 */
export class ContributionsHttpClient5 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contributionNodeQueryApiVersion =
        this.dataProvidersQueryApiVersion =
        this.installedAppsApiVersion =
        this.installedAppsApiVersion_3e2f6668 = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ContributionsHttpClient4_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contributionNodeQueryApiVersion =
        this.dataProvidersQueryApiVersion =
        this.installedAppsApiVersion =
        this.installedAppsApiVersion_3e2f6668 = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ContributionsHttpClient4 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contributionNodeQueryApiVersion =
        this.dataProvidersQueryApiVersion =
        this.installedAppsApiVersion =
        this.installedAppsApiVersion_3e2f6668 = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ContributionsHttpClient3_2 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contributionNodeQueryApiVersion =
        this.dataProvidersQueryApiVersion =
        this.installedAppsApiVersion =
        this.installedAppsApiVersion_3e2f6668 = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ContributionsHttpClient3_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contributionNodeQueryApiVersion =
        this.dataProvidersQueryApiVersion =
        this.installedAppsApiVersion =
        this.installedAppsApiVersion_3e2f6668 = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ContributionsHttpClient3 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.dataProvidersQueryApiVersion =
        this.installedAppsApiVersion =
        this.installedAppsApiVersion_3e2f6668 = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ContributionsHttpClient2_3 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.dataProvidersQueryApiVersion =
        this.installedAppsApiVersion =
        this.installedAppsApiVersion_3e2f6668 = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ContributionsHttpClient2_2 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.dataProvidersQueryApiVersion =
        this.installedAppsApiVersion =
        this.installedAppsApiVersion_3e2f6668 = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ContributionsHttpClient2_1 extends CommonMethods2_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.installedAppsApiVersion =
        this.installedAppsApiVersion_3e2f6668 = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ContributionsHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.installedAppsApiVersion = "2.0-preview.1";
    }
}

export class ContributionsHttpClient extends ContributionsHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": ContributionsHttpClient5,
    "4.1": ContributionsHttpClient4_1,
    "4.0": ContributionsHttpClient4,
    "3.2": ContributionsHttpClient3_2,
    "3.1": ContributionsHttpClient3_1,
    "3.0": ContributionsHttpClient3,
    "2.3": ContributionsHttpClient2_3,
    "2.2": ContributionsHttpClient2_2,
    "2.1": ContributionsHttpClient2_1,
    "2.0": ContributionsHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return ContributionsHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): ContributionsHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<ContributionsHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<ContributionsHttpClient5>(ContributionsHttpClient5, undefined, undefined, undefined, options);
    }
}
