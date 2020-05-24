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

import Contracts = require("VSS/ClientTrace/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods4_1To5 extends VSS_WebApi.VssHttpClient {
    protected eventsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ClientTraceEvent[]} events
     * @return IPromise<void>
     */
    public publishEvents(
        events: Contracts.ClientTraceEvent[]
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "ClientTrace",
            locationId: "06bcc74a-1491-4eb8-a0eb-704778f9d041",
            resource: "Events",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: Contracts.TypeInfo.ClientTraceEvent,
            apiVersion: this.eventsApiVersion,
            data: events
        });
    }
}

/**
 * @exemptedapi
 */
export class ClientTraceHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ClientTraceHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.eventsApiVersion = "4.1-preview.1";
    }
}

export class ClientTraceHttpClient extends ClientTraceHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": ClientTraceHttpClient5,
    "4.1": ClientTraceHttpClient4_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return ClientTraceHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): ClientTraceHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<ClientTraceHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<ClientTraceHttpClient5>(ClientTraceHttpClient5, undefined, undefined, undefined, options);
    }
}
