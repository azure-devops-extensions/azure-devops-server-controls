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

import Contracts = require("VSS/Operations/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected operationsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * Gets an operation from the the operationId using the given pluginId.
     *
     * @param {string} operationId - The ID for the operation.
     * @param {string} pluginId - The ID for the plugin.
     * @return IPromise<Contracts.Operation>
     */
    public getOperation(
        operationId: string,
        pluginId?: string
        ): IPromise<Contracts.Operation> {

        const queryValues: any = {
            pluginId: pluginId
        };

        return this._beginRequest<Contracts.Operation>({
            httpMethod: "GET",
            area: "operations",
            locationId: "9a1b74b4-2ca8-4a9f-8470-c2f2e6fdc949",
            resource: "operations",
            routeTemplate: "_apis/{resource}/{operationId}",
            responseType: Contracts.TypeInfo.Operation,
            routeValues: {
                operationId: operationId
            },
            queryParams: queryValues,
            apiVersion: this.operationsApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class OperationsHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.operationsApiVersion = "5.0";
    }
}

/**
 * @exemptedapi
 */
export class OperationsHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.operationsApiVersion = "4.1";
    }
}

/**
 * @exemptedapi
 */
export class OperationsHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.operationsApiVersion = "4.0";
    }
}

/**
 * @exemptedapi
 */
export class OperationsHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.operationsApiVersion = "3.2";
    }
}

/**
 * @exemptedapi
 */
export class OperationsHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.operationsApiVersion = "3.1";
    }
}

/**
 * @exemptedapi
 */
export class OperationsHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.operationsApiVersion = "3.0";
    }
}

/**
 * @exemptedapi
 */
export class OperationsHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.operationsApiVersion = "2.3";
    }
}

/**
 * @exemptedapi
 */
export class OperationsHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.operationsApiVersion = "2.2";
    }
}

/**
 * @exemptedapi
 */
export class OperationsHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.operationsApiVersion = "2.1";
    }
}

/**
 * @exemptedapi
 */
export class OperationsHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.operationsApiVersion = "2.0";
    }
}

export class OperationsHttpClient extends OperationsHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": OperationsHttpClient5,
    "4.1": OperationsHttpClient4_1,
    "4.0": OperationsHttpClient4,
    "3.2": OperationsHttpClient3_2,
    "3.1": OperationsHttpClient3_1,
    "3.0": OperationsHttpClient3,
    "2.3": OperationsHttpClient2_3,
    "2.2": OperationsHttpClient2_2,
    "2.1": OperationsHttpClient2_1,
    "2.0": OperationsHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return OperationsHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): OperationsHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<OperationsHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<OperationsHttpClient5>(OperationsHttpClient5, undefined, undefined, undefined, options);
    }
}
