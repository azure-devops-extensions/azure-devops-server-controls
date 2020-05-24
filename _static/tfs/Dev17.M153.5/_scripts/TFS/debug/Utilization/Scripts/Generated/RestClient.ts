/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   tfs\client\utilization\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("Utilization/Scripts/Generated/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

export class CommonMethods3To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = VSS_WebApi_Constants.ServiceInstanceTypes.TFS;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

export class CommonMethods4To5 extends CommonMethods3To5 {
    protected usageSummaryApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * Returns the usage summary for the given query criteria.
     *
     * @param {Contracts.UsageSummaryQueryCriteria} queryCriteria - The query criteria specifying the parameters of interest.
     * @return IPromise<Contracts.CommandUsage[]>
     */
    public getUsageSummary(
        queryCriteria: Contracts.UsageSummaryQueryCriteria
        ): IPromise<Contracts.CommandUsage[]> {

        const queryValues: any = {
            queryCriteria: queryCriteria
        };

        return this._beginRequest<Contracts.CommandUsage[]>({
            httpMethod: "GET",
            area: "Utilization",
            locationId: "d3709376-907a-49d8-b7a7-c4ea99ca3772",
            resource: "UsageSummary",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.CommandUsage,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.usageSummaryApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class UtilizationHttpClient5 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.usageSummaryApiVersion = "5.0";
    }
}

/**
 * @exemptedapi
 */
export class UtilizationHttpClient4_1 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.usageSummaryApiVersion = "4.1";
    }
}

/**
 * @exemptedapi
 */
export class UtilizationHttpClient4 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.usageSummaryApiVersion = "4.0";
    }
}

export class UtilizationHttpClient3_2 extends VSS_WebApi.VssHttpClient {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Obsolete] Returns the usage summary for the specified identity.
     *
     * @param {Contracts.UsageSummaryQueryCriteria} queryCriteria - The query criteria for this request
     * @return IPromise<Contracts.CommandUsage[]>
     */
    public getUsageSummary(
        queryCriteria: Contracts.UsageSummaryQueryCriteria
        ): IPromise<Contracts.CommandUsage[]> {

        const queryValues: any = {
            queryCriteria: queryCriteria
        };

        return this._beginRequest<Contracts.CommandUsage[]>({
            httpMethod: "GET",
            area: "Utilization",
            locationId: "d3709376-907a-49d8-b7a7-c4ea99ca3772",
            resource: "UsageSummary",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.CommandUsage,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "3.2"
        });
    }
}

export class UtilizationHttpClient3_1 extends VSS_WebApi.VssHttpClient {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Obsolete] Returns the usage summary for the specified identity.
     *
     * @param {Contracts.UsageSummaryQueryCriteria} queryCriteria - The query criteria for this request
     * @return IPromise<Contracts.CommandUsage[]>
     */
    public getUsageSummary(
        queryCriteria: Contracts.UsageSummaryQueryCriteria
        ): IPromise<Contracts.CommandUsage[]> {

        const queryValues: any = {
            queryCriteria: queryCriteria
        };

        return this._beginRequest<Contracts.CommandUsage[]>({
            httpMethod: "GET",
            area: "Utilization",
            locationId: "d3709376-907a-49d8-b7a7-c4ea99ca3772",
            resource: "UsageSummary",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.CommandUsage,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "3.1"
        });
    }
}

export class UtilizationHttpClient3 extends VSS_WebApi.VssHttpClient {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Obsolete] Returns the usage summary for the specified identity.
     *
     * @param {Contracts.UsageSummaryQueryCriteria} queryCriteria - The query criteria for this request
     * @return IPromise<Contracts.CommandUsage[]>
     */
    public getUsageSummary(
        queryCriteria: Contracts.UsageSummaryQueryCriteria
        ): IPromise<Contracts.CommandUsage[]> {

        const queryValues: any = {
            queryCriteria: queryCriteria
        };

        return this._beginRequest<Contracts.CommandUsage[]>({
            httpMethod: "GET",
            area: "Utilization",
            locationId: "d3709376-907a-49d8-b7a7-c4ea99ca3772",
            resource: "UsageSummary",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.CommandUsage,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "3.0"
        });
    }
}

export class UtilizationHttpClient extends UtilizationHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": UtilizationHttpClient5,
    "4.1": UtilizationHttpClient4_1,
    "4.0": UtilizationHttpClient4,
    "3.2": UtilizationHttpClient3_2,
    "3.1": UtilizationHttpClient3_1,
    "3.0": UtilizationHttpClient3
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return UtilizationHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): UtilizationHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<UtilizationHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<UtilizationHttpClient5>(UtilizationHttpClient5, undefined, undefined, undefined, options);
    }
}
