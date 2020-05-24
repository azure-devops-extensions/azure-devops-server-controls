/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   aex\service\profileregions\generatedclients\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Profile_Contracts = require("VSS/Profile/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods4To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000041-0000-8888-8000-000000000000";
    protected geoRegionApiVersion: string;
    protected regionsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @return IPromise<VSS_Profile_Contracts.ProfileRegions>
     */
    public getRegions(): IPromise<VSS_Profile_Contracts.ProfileRegions> {

        return this._beginRequest<VSS_Profile_Contracts.ProfileRegions>({
            httpMethod: "GET",
            area: "Profile",
            locationId: "b129ca90-999d-47bb-ab37-0dcf784ee633",
            resource: "Regions",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.regionsApiVersion
        });
    }

    /**
     * [Preview API] Lookup up country/region based on provided IPv4, null if using the remote IPv4 address.
     *
     * @param {string} ip
     * @return IPromise<VSS_Profile_Contracts.GeoRegion>
     */
    public getGeoRegion(
        ip: string
        ): IPromise<VSS_Profile_Contracts.GeoRegion> {

        const queryValues: any = {
            ip: ip
        };

        return this._beginRequest<VSS_Profile_Contracts.GeoRegion>({
            httpMethod: "GET",
            area: "Profile",
            locationId: "35b3ff1d-ab4c-4d1c-98bb-f6ea21d86bd9",
            resource: "GeoRegion",
            routeTemplate: "_apis/{area}/{resource}",
            queryParams: queryValues,
            apiVersion: this.geoRegionApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class ProfileRegionsHttpClient5 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.geoRegionApiVersion =
        this.regionsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ProfileRegionsHttpClient4_1 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.geoRegionApiVersion =
        this.regionsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ProfileRegionsHttpClient4 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.geoRegionApiVersion =
        this.regionsApiVersion = "4.0-preview.1";
    }
}

export class ProfileRegionsHttpClient extends ProfileRegionsHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": ProfileRegionsHttpClient5,
    "4.1": ProfileRegionsHttpClient4_1,
    "4.0": ProfileRegionsHttpClient4
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return ProfileRegionsHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): ProfileRegionsHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<ProfileRegionsHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<ProfileRegionsHttpClient5>(ProfileRegionsHttpClient5, undefined, undefined, undefined, options);
    }
}
