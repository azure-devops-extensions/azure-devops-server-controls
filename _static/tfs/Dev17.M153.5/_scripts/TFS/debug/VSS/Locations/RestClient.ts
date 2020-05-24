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

import Contracts = require("VSS/Locations/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

export class CommonMethods2To3_1 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = VSS_WebApi_Constants.ServiceInstanceTypes.SPS;
    protected connectionDataApiVersion: string;
    protected serviceDefinitionsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Common_Contracts.VssJsonCollectionWrapperV<Contracts.ServiceDefinition[]>} serviceDefinitions
     * @return IPromise<void>
     */
    public updateServiceDefinitions(
        serviceDefinitions: VSS_Common_Contracts.VssJsonCollectionWrapperV<Contracts.ServiceDefinition[]>
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Location",
            locationId: "d810a47d-f4f4-4a62-a03f-fa1860585c4c",
            resource: "ServiceDefinitions",
            routeTemplate: "_apis/{resource}/{serviceType}/{identifier}",
            apiVersion: this.serviceDefinitionsApiVersion,
            data: serviceDefinitions
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} serviceType
     * @return IPromise<Contracts.ServiceDefinition[]>
     */
    public getServiceDefinitions(
        serviceType?: string
        ): IPromise<Contracts.ServiceDefinition[]> {

        return this._beginRequest<Contracts.ServiceDefinition[]>({
            httpMethod: "GET",
            area: "Location",
            locationId: "d810a47d-f4f4-4a62-a03f-fa1860585c4c",
            resource: "ServiceDefinitions",
            routeTemplate: "_apis/{resource}/{serviceType}/{identifier}",
            responseType: Contracts.TypeInfo.ServiceDefinition,
            responseIsCollection: true,
            routeValues: {
                serviceType: serviceType
            },
            apiVersion: this.serviceDefinitionsApiVersion
        });
    }

    /**
     * [Preview API] Finds a given service definition.
     *
     * @param {string} serviceType
     * @param {string} identifier
     * @param {boolean} allowFaultIn - If true, we will attempt to fault in a host instance mapping if in SPS.
     * @param {boolean} previewFaultIn - If true, we will calculate and return a host instance mapping, but not persist it.
     * @return IPromise<Contracts.ServiceDefinition>
     */
    public getServiceDefinition(
        serviceType: string,
        identifier: string,
        allowFaultIn?: boolean,
        previewFaultIn?: boolean
        ): IPromise<Contracts.ServiceDefinition> {

        const queryValues: any = {
            allowFaultIn: allowFaultIn,
            previewFaultIn: previewFaultIn
        };

        return this._beginRequest<Contracts.ServiceDefinition>({
            httpMethod: "GET",
            area: "Location",
            locationId: "d810a47d-f4f4-4a62-a03f-fa1860585c4c",
            resource: "ServiceDefinitions",
            routeTemplate: "_apis/{resource}/{serviceType}/{identifier}",
            responseType: Contracts.TypeInfo.ServiceDefinition,
            routeValues: {
                serviceType: serviceType,
                identifier: identifier
            },
            queryParams: queryValues,
            apiVersion: this.serviceDefinitionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} serviceType
     * @param {string} identifier
     * @return IPromise<void>
     */
    public deleteServiceDefinition(
        serviceType: string,
        identifier: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Location",
            locationId: "d810a47d-f4f4-4a62-a03f-fa1860585c4c",
            resource: "ServiceDefinitions",
            routeTemplate: "_apis/{resource}/{serviceType}/{identifier}",
            routeValues: {
                serviceType: serviceType,
                identifier: identifier
            },
            apiVersion: this.serviceDefinitionsApiVersion
        });
    }

    /**
     * [Preview API] This was copied and adapted from TeamFoundationConnectionService.Connect()
     *
     * @param {VSS_Common_Contracts.ConnectOptions} connectOptions
     * @param {number} lastChangeId - Obsolete 32-bit LastChangeId
     * @param {number} lastChangeId64 - Non-truncated 64-bit LastChangeId
     * @return IPromise<Contracts.ConnectionData>
     */
    public getConnectionData(
        connectOptions?: VSS_Common_Contracts.ConnectOptions,
        lastChangeId?: number,
        lastChangeId64?: number
        ): IPromise<Contracts.ConnectionData> {

        const queryValues: any = {
            connectOptions: connectOptions,
            lastChangeId: lastChangeId,
            lastChangeId64: lastChangeId64
        };

        return this._beginRequest<Contracts.ConnectionData>({
            httpMethod: "GET",
            area: "Location",
            locationId: "00d9565f-ed9c-4a06-9a50-00e7896ccab4",
            resource: "ConnectionData",
            routeTemplate: "_apis/{resource}",
            responseType: Contracts.TypeInfo.ConnectionData,
            queryParams: queryValues,
            apiVersion: this.connectionDataApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class LocationsHttpClient3_1 extends CommonMethods2To3_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.connectionDataApiVersion =
        this.serviceDefinitionsApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LocationsHttpClient3 extends CommonMethods2To3_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.connectionDataApiVersion =
        this.serviceDefinitionsApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LocationsHttpClient2_3 extends CommonMethods2To3_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.connectionDataApiVersion =
        this.serviceDefinitionsApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LocationsHttpClient2_2 extends CommonMethods2To3_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.connectionDataApiVersion =
        this.serviceDefinitionsApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LocationsHttpClient2_1 extends CommonMethods2To3_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.connectionDataApiVersion =
        this.serviceDefinitionsApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LocationsHttpClient2 extends CommonMethods2To3_1 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.connectionDataApiVersion =
        this.serviceDefinitionsApiVersion = "2.0-preview.1";
    }
}

export class LocationsHttpClient extends LocationsHttpClient3_1 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}
