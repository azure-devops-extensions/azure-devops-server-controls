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

import Contracts = require("VSS/Telemetry/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected eventsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.CustomerIntelligenceEvent[]} events
     * @return IPromise<void>
     */
    public publishEvents(
        events: Contracts.CustomerIntelligenceEvent[]
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "customerintelligence",
            locationId: "b5cc35c2-ff2b-491d-a085-24b6e9f396fd",
            resource: "Events",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.eventsApiVersion,
            data: events
        });
    }
}

/**
 * @exemptedapi
 */
export class CustomerIntelligenceHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class CustomerIntelligenceHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class CustomerIntelligenceHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class CustomerIntelligenceHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class CustomerIntelligenceHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class CustomerIntelligenceHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class CustomerIntelligenceHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class CustomerIntelligenceHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class CustomerIntelligenceHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class CustomerIntelligenceHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "2.0-preview.1";
    }
}

export class CustomerIntelligenceHttpClient extends CustomerIntelligenceHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": CustomerIntelligenceHttpClient5,
    "4.1": CustomerIntelligenceHttpClient4_1,
    "4.0": CustomerIntelligenceHttpClient4,
    "3.2": CustomerIntelligenceHttpClient3_2,
    "3.1": CustomerIntelligenceHttpClient3_1,
    "3.0": CustomerIntelligenceHttpClient3,
    "2.3": CustomerIntelligenceHttpClient2_3,
    "2.2": CustomerIntelligenceHttpClient2_2,
    "2.1": CustomerIntelligenceHttpClient2_1,
    "2.0": CustomerIntelligenceHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return CustomerIntelligenceHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): CustomerIntelligenceHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<CustomerIntelligenceHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<CustomerIntelligenceHttpClient5>(CustomerIntelligenceHttpClient5, undefined, undefined, undefined, options);
    }
}
