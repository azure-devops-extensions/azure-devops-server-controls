/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   packaging\client\maven\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Maven_Contracts = require("Package/Scripts/Protocols/Maven/WebApi/VSS.Maven.Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000030-0000-8888-8000-000000000000";
    protected recycleBinVersionsApiVersion: string;
    protected versionsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Delete a package version from the feed and move it to the feed's recycle bin.
     *
     * @param {string} feed - Name or ID of the feed.
     * @param {string} groupId - Group ID of the package.
     * @param {string} artifactId - Artifact ID of the package.
     * @param {string} version - Version of the package.
     * @return IPromise<void>
     */
    public packageDelete(
        feed: string,
        groupId: string,
        artifactId: string,
        version: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "maven",
            locationId: "180ed967-377a-4112-986b-607adb14ded4",
            resource: "versions",
            routeTemplate: "_apis/packaging/feeds/{feed}/{area}/groups/{groupId}/artifacts/{artifactId}/{resource}/{version}",
            routeValues: {
                feed: feed,
                groupId: groupId,
                artifactId: artifactId,
                version: version
            },
            apiVersion: this.versionsApiVersion
        });
    }

    /**
     * [Preview API] Get information about a package version.
     *
     * @param {string} feed - Name or ID of the feed.
     * @param {string} groupId - Group ID of the package.
     * @param {string} artifactId - Artifact ID of the package.
     * @param {string} version - Version of the package.
     * @param {boolean} showDeleted - True to show information for deleted packages.
     * @return IPromise<VSS_Maven_Contracts.Package>
     */
    public getPackageVersion(
        feed: string,
        groupId: string,
        artifactId: string,
        version: string,
        showDeleted?: boolean
        ): IPromise<VSS_Maven_Contracts.Package> {

        const queryValues: any = {
            showDeleted: showDeleted
        };

        return this._beginRequest<VSS_Maven_Contracts.Package>({
            httpMethod: "GET",
            area: "maven",
            locationId: "180ed967-377a-4112-986b-607adb14ded4",
            resource: "versions",
            routeTemplate: "_apis/packaging/feeds/{feed}/{area}/groups/{groupId}/artifacts/{artifactId}/{resource}/{version}",
            responseType: VSS_Maven_Contracts.TypeInfo.Package,
            routeValues: {
                feed: feed,
                groupId: groupId,
                artifactId: artifactId,
                version: version
            },
            queryParams: queryValues,
            apiVersion: this.versionsApiVersion
        });
    }

    /**
     * [Preview API] Restore a package version from the recycle bin to its associated feed.
     *
     * @param {VSS_Maven_Contracts.MavenRecycleBinPackageVersionDetails} packageVersionDetails - Set the 'Deleted' property to false to restore the package.
     * @param {string} feed - Name or ID of the feed.
     * @param {string} groupId - Group ID of the package.
     * @param {string} artifactId - Artifact ID of the package.
     * @param {string} version - Version of the package.
     * @return IPromise<void>
     */
    public restorePackageVersionFromRecycleBin(
        packageVersionDetails: VSS_Maven_Contracts.MavenRecycleBinPackageVersionDetails,
        feed: string,
        groupId: string,
        artifactId: string,
        version: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "maven",
            locationId: "f67e10eb-1254-4953-add7-d49b83a16c9f",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/packaging/feeds/{feed}/{area}/RecycleBin/groups/{groupId}/artifacts/{artifactId}/versions/{version}",
            routeValues: {
                feed: feed,
                groupId: groupId,
                artifactId: artifactId,
                version: version
            },
            apiVersion: this.recycleBinVersionsApiVersion,
            data: packageVersionDetails
        });
    }

    /**
     * [Preview API] Get information about a package version in the recycle bin.
     *
     * @param {string} feed - Name or ID of the feed.
     * @param {string} groupId - Group ID of the package.
     * @param {string} artifactId - Artifact ID of the package.
     * @param {string} version - Version of the package.
     * @return IPromise<VSS_Maven_Contracts.MavenPackageVersionDeletionState>
     */
    public getPackageVersionMetadataFromRecycleBin(
        feed: string,
        groupId: string,
        artifactId: string,
        version: string
        ): IPromise<VSS_Maven_Contracts.MavenPackageVersionDeletionState> {

        return this._beginRequest<VSS_Maven_Contracts.MavenPackageVersionDeletionState>({
            httpMethod: "GET",
            area: "maven",
            locationId: "f67e10eb-1254-4953-add7-d49b83a16c9f",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/packaging/feeds/{feed}/{area}/RecycleBin/groups/{groupId}/artifacts/{artifactId}/versions/{version}",
            responseType: VSS_Maven_Contracts.TypeInfo.MavenPackageVersionDeletionState,
            routeValues: {
                feed: feed,
                groupId: groupId,
                artifactId: artifactId,
                version: version
            },
            apiVersion: this.recycleBinVersionsApiVersion
        });
    }

    /**
     * [Preview API] Permanently delete a package from a feed's recycle bin.
     *
     * @param {string} feed - Name or ID of the feed.
     * @param {string} groupId - Group ID of the package.
     * @param {string} artifactId - Artifact ID of the package.
     * @param {string} version - Version of the package.
     * @return IPromise<void>
     */
    public deletePackageVersionFromRecycleBin(
        feed: string,
        groupId: string,
        artifactId: string,
        version: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "maven",
            locationId: "f67e10eb-1254-4953-add7-d49b83a16c9f",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/packaging/feeds/{feed}/{area}/RecycleBin/groups/{groupId}/artifacts/{artifactId}/versions/{version}",
            routeValues: {
                feed: feed,
                groupId: groupId,
                artifactId: artifactId,
                version: version
            },
            apiVersion: this.recycleBinVersionsApiVersion
        });
    }
}

export class CommonMethods4To5 extends CommonMethods2To5 {
    protected packagesBatchApiVersion: string;
    protected recyclebinpackagesbatchApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * @internal
     * [Preview API] Update several packages from a single feed in a single request. The updates to the packages do not happen atomically.
     *
     * @param {VSS_Maven_Contracts.MavenPackagesBatchRequest} batchRequest - Information about the packages to update, the operation to perform, and its associated data.
     * @param {string} feed
     * @return IPromise<void>
     */
    public updateRecycleBinPackages(
        batchRequest: VSS_Maven_Contracts.MavenPackagesBatchRequest,
        feed: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "maven",
            locationId: "5dd6f547-c76f-4d9d-b2ec-4720feda641f",
            resource: "recyclebinpackagesbatch",
            routeTemplate: "_apis/packaging/feeds/{feed}/{area}/RecycleBin/packagesBatch",
            requestType: VSS_Maven_Contracts.TypeInfo.MavenPackagesBatchRequest,
            routeValues: {
                feed: feed
            },
            apiVersion: this.recyclebinpackagesbatchApiVersion,
            data: batchRequest
        });
    }

    /**
     * @internal
     * [Preview API] Update several packages from a single feed in a single request. The updates to the packages do not happen atomically.
     *
     * @param {VSS_Maven_Contracts.MavenPackagesBatchRequest} batchRequest - Information about the packages to update, the operation to perform, and its associated data.
     * @param {string} feedId - Feed which contains the packages to update.
     * @return IPromise<void>
     */
    public updatePackageVersions(
        batchRequest: VSS_Maven_Contracts.MavenPackagesBatchRequest,
        feedId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "maven",
            locationId: "b7c586b0-d947-4d35-811a-f1161de80e6c",
            resource: "packagesBatch",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/{resource}",
            requestType: VSS_Maven_Contracts.TypeInfo.MavenPackagesBatchRequest,
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.packagesBatchApiVersion,
            data: batchRequest
        });
    }
}

/**
 * @exemptedapi
 */
export class MavenHttpClient5 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.packagesBatchApiVersion =
        this.recyclebinpackagesbatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MavenHttpClient4_1 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.packagesBatchApiVersion =
        this.recyclebinpackagesbatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MavenHttpClient4 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.packagesBatchApiVersion =
        this.recyclebinpackagesbatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MavenHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MavenHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MavenHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MavenHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MavenHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MavenHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MavenHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "2.0-preview.1";
    }
}

export class MavenHttpClient extends MavenHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": MavenHttpClient5,
    "4.1": MavenHttpClient4_1,
    "4.0": MavenHttpClient4,
    "3.2": MavenHttpClient3_2,
    "3.1": MavenHttpClient3_1,
    "3.0": MavenHttpClient3,
    "2.3": MavenHttpClient2_3,
    "2.2": MavenHttpClient2_2,
    "2.1": MavenHttpClient2_1,
    "2.0": MavenHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return MavenHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): MavenHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<MavenHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<MavenHttpClient5>(MavenHttpClient5, undefined, undefined, undefined, options);
    }
}
