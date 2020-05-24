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

import Contracts = require("VSS/FileContainer/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected containersApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {number} containerId
     * @param {string} scope
     * @param {string} itemPath
     * @param {boolean} metadata
     * @param {string} format
     * @param {string} downloadFileName
     * @param {boolean} includeDownloadTickets
     * @param {boolean} isShallow
     * @return IPromise<Contracts.FileContainerItem[]>
     */
    public getItems(
        containerId: number,
        scope?: string,
        itemPath?: string,
        metadata?: boolean,
        format?: string,
        downloadFileName?: string,
        includeDownloadTickets?: boolean,
        isShallow?: boolean
        ): IPromise<Contracts.FileContainerItem[]> {

        const queryValues: any = {
            scope: scope,
            itemPath: itemPath,
            metadata: metadata,
            '$format': format,
            downloadFileName: downloadFileName,
            includeDownloadTickets: includeDownloadTickets,
            isShallow: isShallow
        };

        return this._beginRequest<Contracts.FileContainerItem[]>({
            httpMethod: "GET",
            area: "Container",
            locationId: "e4f5c81e-e250-447b-9fef-bd48471bea5e",
            resource: "Containers",
            routeTemplate: "_apis/resources/{resource}/{containerId}/{*itemPath}",
            responseType: Contracts.TypeInfo.FileContainerItem,
            responseIsCollection: true,
            routeValues: {
                containerId: containerId
            },
            queryParams: queryValues,
            apiVersion: this.containersApiVersion
        });
    }

    /**
     * [Preview API] Gets containers filtered by a comma separated list of artifact uris within the same scope, if not specified returns all containers
     *
     * @param {string} scope - A guid representing the scope of the container. This is often the project id.
     * @param {string} artifactUris
     * @return IPromise<Contracts.FileContainer[]>
     */
    public getContainers(
        scope?: string,
        artifactUris?: string
        ): IPromise<Contracts.FileContainer[]> {

        const queryValues: any = {
            scope: scope,
            artifactUris: artifactUris
        };

        return this._beginRequest<Contracts.FileContainer[]>({
            httpMethod: "GET",
            area: "Container",
            locationId: "e4f5c81e-e250-447b-9fef-bd48471bea5e",
            resource: "Containers",
            routeTemplate: "_apis/resources/{resource}/{containerId}/{*itemPath}",
            responseType: Contracts.TypeInfo.FileContainer,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.containersApiVersion
        });
    }

    /**
     * [Preview API] Deletes the specified items in a container.
     *
     * @param {number} containerId - Container Id.
     * @param {string} itemPath - Path to delete.
     * @param {string} scope - A guid representing the scope of the container. This is often the project id.
     * @return IPromise<void>
     */
    public deleteItem(
        containerId: number,
        itemPath: string,
        scope?: string
        ): IPromise<void> {

        const queryValues: any = {
            itemPath: itemPath,
            scope: scope
        };

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Container",
            locationId: "e4f5c81e-e250-447b-9fef-bd48471bea5e",
            resource: "Containers",
            routeTemplate: "_apis/resources/{resource}/{containerId}/{*itemPath}",
            routeValues: {
                containerId: containerId
            },
            queryParams: queryValues,
            apiVersion: this.containersApiVersion
        });
    }

    /**
     * [Preview API] Creates the specified items in in the referenced container.
     *
     * @param {VSS_Common_Contracts.VssJsonCollectionWrapperV<Contracts.FileContainerItem[]>} items
     * @param {number} containerId
     * @param {string} scope - A guid representing the scope of the container. This is often the project id.
     * @return IPromise<Contracts.FileContainerItem[]>
     */
    public createItems(
        items: VSS_Common_Contracts.VssJsonCollectionWrapperV<Contracts.FileContainerItem[]>,
        containerId: number,
        scope?: string
        ): IPromise<Contracts.FileContainerItem[]> {

        const queryValues: any = {
            scope: scope
        };

        return this._beginRequest<Contracts.FileContainerItem[]>({
            httpMethod: "POST",
            area: "Container",
            locationId: "e4f5c81e-e250-447b-9fef-bd48471bea5e",
            resource: "Containers",
            routeTemplate: "_apis/resources/{resource}/{containerId}/{*itemPath}",
            responseType: Contracts.TypeInfo.FileContainerItem,
            responseIsCollection: true,
            routeValues: {
                containerId: containerId
            },
            queryParams: queryValues,
            apiVersion: this.containersApiVersion,
            data: items
        });
    }

    /**
     * [Preview API] Creates the specified item in the container referenced container.
     *
     * @param {string} content - Content to upload
     * @param {number} containerId
     * @param {string} itemPath
     * @param {string} scope - A guid representing the scope of the container. This is often the project id.
     * @return IPromise<Contracts.FileContainerItem>
     */
    public createItem(
        content: string,
        containerId: number,
        itemPath: string,
        scope?: string
        ): IPromise<Contracts.FileContainerItem> {

        const queryValues: any = {
            itemPath: itemPath,
            scope: scope
        };

        return this._beginRequest<Contracts.FileContainerItem>({
            httpMethod: "PUT",
            area: "Container",
            locationId: "e4f5c81e-e250-447b-9fef-bd48471bea5e",
            resource: "Containers",
            routeTemplate: "_apis/resources/{resource}/{containerId}/{*itemPath}",
            responseType: Contracts.TypeInfo.FileContainerItem,
            routeValues: {
                containerId: containerId
            },
            customHeaders: {
                "Content-Type": "application/octet-stream",
            },
            queryParams: queryValues,
            apiVersion: this.containersApiVersion,
            data: content
        });
    }
}

/**
 * @exemptedapi
 */
export class FileContainerHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.containersApiVersion = "5.0-preview.4";
    }
}

/**
 * @exemptedapi
 */
export class FileContainerHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.containersApiVersion = "4.1-preview.4";
    }
}

/**
 * @exemptedapi
 */
export class FileContainerHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.containersApiVersion = "4.0-preview.4";
    }
}

/**
 * @exemptedapi
 */
export class FileContainerHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.containersApiVersion = "3.2-preview.4";
    }
}

/**
 * @exemptedapi
 */
export class FileContainerHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.containersApiVersion = "3.1-preview.4";
    }
}

/**
 * @exemptedapi
 */
export class FileContainerHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.containersApiVersion = "3.0-preview.4";
    }
}

/**
 * @exemptedapi
 */
export class FileContainerHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.containersApiVersion = "2.3-preview.4";
    }
}

/**
 * @exemptedapi
 */
export class FileContainerHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.containersApiVersion = "2.2-preview.4";
    }
}

/**
 * @exemptedapi
 */
export class FileContainerHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.containersApiVersion = "2.1-preview.4";
    }
}

/**
 * @exemptedapi
 */
export class FileContainerHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.containersApiVersion = "2.0-preview.4";
    }
}

export class FileContainerHttpClient extends FileContainerHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": FileContainerHttpClient5,
    "4.1": FileContainerHttpClient4_1,
    "4.0": FileContainerHttpClient4,
    "3.2": FileContainerHttpClient3_2,
    "3.1": FileContainerHttpClient3_1,
    "3.0": FileContainerHttpClient3,
    "2.3": FileContainerHttpClient2_3,
    "2.2": FileContainerHttpClient2_2,
    "2.1": FileContainerHttpClient2_1,
    "2.0": FileContainerHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return FileContainerHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): FileContainerHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<FileContainerHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<FileContainerHttpClient5>(FileContainerHttpClient5, undefined, undefined, undefined, options);
    }
}
