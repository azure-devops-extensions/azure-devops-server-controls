/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   tfs\client\charting\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("Charting/Scripts/DataService/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected chartConfigurationApiVersion: string;
    protected dataServiceCapabilitiesApiVersion: string;
    protected transformQueryApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Runs a request to collect and tabulate data described in the transformOptions for viewing.
     *
     * @param {Contracts.TransformOptions[]} transformOptions - A description of the data to be queried.
     * @param {string} project - Project ID or project name
     * @param {string} scope - The feature scope to be queried.
     * @return IPromise<Contracts.TransformResult[]>
     */
    public runTransformQuery(
        transformOptions: Contracts.TransformOptions[],
        project: string,
        scope: string
        ): IPromise<Contracts.TransformResult[]> {

        return this._beginRequest<Contracts.TransformResult[]>({
            httpMethod: "POST",
            area: "reporting",
            locationId: "087d5ee8-aa33-4cd4-8e76-31fe747eac7e",
            resource: "TransformQuery",
            routeTemplate: "{project}/_apis/{area}/{resource}/{scope}",
            responseIsCollection: true,
            routeValues: {
                project: project,
                scope: scope
            },
            apiVersion: this.transformQueryApiVersion,
            data: transformOptions
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} scope
     * @return IPromise<Contracts.DataServiceCapabilitiesResponse>
     */
    public getDataServiceCapabilities(
        scope: string
        ): IPromise<Contracts.DataServiceCapabilitiesResponse> {

        return this._beginRequest<Contracts.DataServiceCapabilitiesResponse>({
            httpMethod: "GET",
            area: "reporting",
            locationId: "81aa1f62-c70d-4356-ba6b-d8ee4be4379c",
            resource: "DataServiceCapabilities",
            routeTemplate: "_apis/{area}/{resource}/{scope}",
            routeValues: {
                scope: scope
            },
            apiVersion: this.dataServiceCapabilitiesApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ChartConfiguration} chartConfiguration
     * @param {string} project - Project ID or project name
     * @return IPromise<Contracts.ChartConfigurationResponse>
     */
    public replaceChartConfiguration(
        chartConfiguration: Contracts.ChartConfiguration,
        project: string
        ): IPromise<Contracts.ChartConfigurationResponse> {

        return this._beginRequest<Contracts.ChartConfigurationResponse>({
            httpMethod: "PUT",
            area: "reporting",
            locationId: "50fbd84e-398e-41da-8688-9a3a7b0e602b",
            resource: "ChartConfiguration",
            routeTemplate: "{project}/_apis/{area}/{resource}/{id}",
            routeValues: {
                project: project
            },
            apiVersion: this.chartConfigurationApiVersion,
            data: chartConfiguration
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {string} scope
     * @param {string} groupKey
     * @return IPromise<Contracts.ChartConfigurationResponse[]>
     */
    public getChartConfigurations(
        project: string,
        scope: string,
        groupKey: string
        ): IPromise<Contracts.ChartConfigurationResponse[]> {

        const queryValues: any = {
            scope: scope,
            groupKey: groupKey
        };

        return this._beginRequest<Contracts.ChartConfigurationResponse[]>({
            httpMethod: "GET",
            area: "reporting",
            locationId: "50fbd84e-398e-41da-8688-9a3a7b0e602b",
            resource: "ChartConfiguration",
            routeTemplate: "{project}/_apis/{area}/{resource}/{id}",
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: this.chartConfigurationApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {string} id
     * @return IPromise<Contracts.ChartConfigurationResponse>
     */
    public getChartConfiguration(
        project: string,
        id: string
        ): IPromise<Contracts.ChartConfigurationResponse> {

        return this._beginRequest<Contracts.ChartConfigurationResponse>({
            httpMethod: "GET",
            area: "reporting",
            locationId: "50fbd84e-398e-41da-8688-9a3a7b0e602b",
            resource: "ChartConfiguration",
            routeTemplate: "{project}/_apis/{area}/{resource}/{id}",
            routeValues: {
                project: project,
                id: id
            },
            apiVersion: this.chartConfigurationApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} project - Project ID or project name
     * @param {string} id
     * @return IPromise<void>
     */
    public deleteChartConfiguration(
        project: string,
        id: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "reporting",
            locationId: "50fbd84e-398e-41da-8688-9a3a7b0e602b",
            resource: "ChartConfiguration",
            routeTemplate: "{project}/_apis/{area}/{resource}/{id}",
            routeValues: {
                project: project,
                id: id
            },
            apiVersion: this.chartConfigurationApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ChartConfiguration} chartConfiguration
     * @param {string} project - Project ID or project name
     * @return IPromise<Contracts.ChartConfigurationResponse>
     */
    public createChartConfiguration(
        chartConfiguration: Contracts.ChartConfiguration,
        project: string
        ): IPromise<Contracts.ChartConfigurationResponse> {

        return this._beginRequest<Contracts.ChartConfigurationResponse>({
            httpMethod: "POST",
            area: "reporting",
            locationId: "50fbd84e-398e-41da-8688-9a3a7b0e602b",
            resource: "ChartConfiguration",
            routeTemplate: "{project}/_apis/{area}/{resource}/{id}",
            routeValues: {
                project: project
            },
            apiVersion: this.chartConfigurationApiVersion,
            data: chartConfiguration
        });
    }
}

/**
 * @exemptedapi
 */
export class ReportingHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.chartConfigurationApiVersion =
        this.dataServiceCapabilitiesApiVersion =
        this.transformQueryApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ReportingHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.chartConfigurationApiVersion =
        this.dataServiceCapabilitiesApiVersion =
        this.transformQueryApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ReportingHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.chartConfigurationApiVersion =
        this.dataServiceCapabilitiesApiVersion =
        this.transformQueryApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ReportingHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.chartConfigurationApiVersion =
        this.dataServiceCapabilitiesApiVersion =
        this.transformQueryApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ReportingHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.chartConfigurationApiVersion =
        this.dataServiceCapabilitiesApiVersion =
        this.transformQueryApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ReportingHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.chartConfigurationApiVersion =
        this.dataServiceCapabilitiesApiVersion =
        this.transformQueryApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ReportingHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.chartConfigurationApiVersion =
        this.dataServiceCapabilitiesApiVersion =
        this.transformQueryApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ReportingHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.chartConfigurationApiVersion =
        this.dataServiceCapabilitiesApiVersion =
        this.transformQueryApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ReportingHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.chartConfigurationApiVersion =
        this.dataServiceCapabilitiesApiVersion =
        this.transformQueryApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ReportingHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.chartConfigurationApiVersion =
        this.dataServiceCapabilitiesApiVersion =
        this.transformQueryApiVersion = "2.0-preview.1";
    }
}

export class ReportingHttpClient extends ReportingHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": ReportingHttpClient5,
    "4.1": ReportingHttpClient4_1,
    "4.0": ReportingHttpClient4,
    "3.2": ReportingHttpClient3_2,
    "3.1": ReportingHttpClient3_1,
    "3.0": ReportingHttpClient3,
    "2.3": ReportingHttpClient2_3,
    "2.2": ReportingHttpClient2_2,
    "2.1": ReportingHttpClient2_1,
    "2.0": ReportingHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return ReportingHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): ReportingHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<ReportingHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<ReportingHttpClient5>(ReportingHttpClient5, undefined, undefined, undefined, options);
    }
}
