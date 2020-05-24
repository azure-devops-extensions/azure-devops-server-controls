/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\hostacquisition.genclient.json
 */

"use strict";

import Contracts = require("VSS/HostAcquisition/Contracts");
import VSS_Organization_Contracts = require("VSS/Organization/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods4To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000041-0000-8888-8000-000000000000";
    protected collectionsApiVersion: string;
    protected nameAvailabilityApiVersion: string;
    protected regionsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @return IPromise<Contracts.Region[]>
     */
    public getRegions(): IPromise<Contracts.Region[]> {

        return this._beginRequest<Contracts.Region[]>({
            httpMethod: "GET",
            area: "HostAcquisition",
            locationId: "776ef918-0dad-4eb1-a614-04988ca3a072",
            resource: "Regions",
            routeTemplate: "_apis/{area}/{resource}",
            responseIsCollection: true,
            apiVersion: this.regionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} name
     * @return IPromise<Contracts.NameAvailability>
     */
    public getNameAvailability(
        name: string
        ): IPromise<Contracts.NameAvailability> {

        return this._beginRequest<Contracts.NameAvailability>({
            httpMethod: "GET",
            area: "HostAcquisition",
            locationId: "01a4cda4-66d1-4f35-918a-212111edc9a4",
            resource: "NameAvailability",
            routeTemplate: "_apis/{area}/{resource}/{name}",
            routeValues: {
                name: name
            },
            apiVersion: this.nameAvailabilityApiVersion
        });
    }

    /**
     * [Preview API] Creates a new collection of the given name in the given region
     *
     * @param {{ [key: string] : string; }} properties
     * @param {string} collectionName
     * @param {string} preferredRegion
     * @param {string} ownerDescriptor
     * @return IPromise<VSS_Organization_Contracts.Collection>
     */
    public createCollection(
        properties: { [key: string] : string; },
        collectionName: string,
        preferredRegion: string,
        ownerDescriptor?: string
        ): IPromise<VSS_Organization_Contracts.Collection> {

        const queryValues: any = {
            collectionName: collectionName,
            preferredRegion: preferredRegion,
            ownerDescriptor: ownerDescriptor
        };

        return this._beginRequest<VSS_Organization_Contracts.Collection>({
            httpMethod: "POST",
            area: "HostAcquisition",
            locationId: "2bbead06-ca34-4dd7-9fe2-148735723a0a",
            resource: "Collections",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: VSS_Organization_Contracts.TypeInfo.Collection,
            queryParams: queryValues,
            apiVersion: this.collectionsApiVersion,
            data: properties
        });
    }
}

/**
 * @exemptedapi
 */
export class HostAcquisitionHttpClient5 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.nameAvailabilityApiVersion =
        this.regionsApiVersion = "5.0-preview.1";
        this.collectionsApiVersion = "5.0-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class HostAcquisitionHttpClient4_1 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.nameAvailabilityApiVersion =
        this.regionsApiVersion = "4.1-preview.1";
        this.collectionsApiVersion = "4.1-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class HostAcquisitionHttpClient4 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.nameAvailabilityApiVersion =
        this.regionsApiVersion = "4.0-preview.1";
        this.collectionsApiVersion = "4.0-preview.2";
    }
}

export class HostAcquisitionHttpClient extends HostAcquisitionHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": HostAcquisitionHttpClient5,
    "4.1": HostAcquisitionHttpClient4_1,
    "4.0": HostAcquisitionHttpClient4
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return HostAcquisitionHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): HostAcquisitionHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<HostAcquisitionHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<HostAcquisitionHttpClient5>(HostAcquisitionHttpClient5, undefined, undefined, undefined, options);
    }
}
