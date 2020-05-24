/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   packaging\client\nuget\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_NuGet_Contracts = require("Package/Scripts/Protocols/NuGet/WebApi/VSS.NuGet.Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000030-0000-8888-8000-000000000000";
    protected contentApiVersion: string;
    protected packagesBatchApiVersion: string;
    protected recycleBinPackagesBatchApiVersion: string;
    protected recycleBinVersionsApiVersion: string;
    protected versionsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Set mutable state on a package version.
     *
     * @param {VSS_NuGet_Contracts.PackageVersionDetails} packageVersionDetails - New state to apply to the referenced package.
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package to update.
     * @param {string} packageVersion - Version of the package to update.
     * @return IPromise<void>
     */
    public updatePackageVersion(
        packageVersionDetails: VSS_NuGet_Contracts.PackageVersionDetails,
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "nuget",
            locationId: "36c9353b-e250-4c57-b040-513c186c3905",
            resource: "Versions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/packages/{packageName}/{resource}/{packageVersion}",
            requestType: VSS_NuGet_Contracts.TypeInfo.PackageVersionDetails,
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            apiVersion: this.versionsApiVersion,
            data: packageVersionDetails
        });
    }

    /**
     * [Preview API] Get information about a package version.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @param {boolean} showDeleted - True to include deleted packages in the response.
     * @return IPromise<VSS_NuGet_Contracts.Package>
     */
    public getPackageVersion(
        feedId: string,
        packageName: string,
        packageVersion: string,
        showDeleted?: boolean
        ): IPromise<VSS_NuGet_Contracts.Package> {

        const queryValues: any = {
            showDeleted: showDeleted
        };

        return this._beginRequest<VSS_NuGet_Contracts.Package>({
            httpMethod: "GET",
            area: "nuget",
            locationId: "36c9353b-e250-4c57-b040-513c186c3905",
            resource: "Versions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/packages/{packageName}/{resource}/{packageVersion}",
            responseType: VSS_NuGet_Contracts.TypeInfo.Package,
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            queryParams: queryValues,
            apiVersion: this.versionsApiVersion
        });
    }

    /**
     * [Preview API] Send a package version from the feed to its paired recycle bin.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package to delete.
     * @param {string} packageVersion - Version of the package to delete.
     * @return IPromise<VSS_NuGet_Contracts.Package>
     */
    public deletePackageVersion(
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<VSS_NuGet_Contracts.Package> {

        return this._beginRequest<VSS_NuGet_Contracts.Package>({
            httpMethod: "DELETE",
            area: "nuget",
            locationId: "36c9353b-e250-4c57-b040-513c186c3905",
            resource: "Versions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/packages/{packageName}/{resource}/{packageVersion}",
            responseType: VSS_NuGet_Contracts.TypeInfo.Package,
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            apiVersion: this.versionsApiVersion
        });
    }

    /**
     * [Preview API] Restore a package version from a feed's recycle bin back into the active feed.
     *
     * @param {VSS_NuGet_Contracts.NuGetRecycleBinPackageVersionDetails} packageVersionDetails - Set the 'Deleted' member to 'false' to apply the restore operation
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<void>
     */
    public restorePackageVersionFromRecycleBin(
        packageVersionDetails: VSS_NuGet_Contracts.NuGetRecycleBinPackageVersionDetails,
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "nuget",
            locationId: "07e88775-e3cb-4408-bbe1-628e036fac8c",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/RecycleBin/packages/{packageName}/versions/{packageVersion}",
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            apiVersion: this.recycleBinVersionsApiVersion,
            data: packageVersionDetails
        });
    }

    /**
     * [Preview API] View a package version's deletion/recycled status
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<VSS_NuGet_Contracts.NuGetPackageVersionDeletionState>
     */
    public getPackageVersionMetadataFromRecycleBin(
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<VSS_NuGet_Contracts.NuGetPackageVersionDeletionState> {

        return this._beginRequest<VSS_NuGet_Contracts.NuGetPackageVersionDeletionState>({
            httpMethod: "GET",
            area: "nuget",
            locationId: "07e88775-e3cb-4408-bbe1-628e036fac8c",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/RecycleBin/packages/{packageName}/versions/{packageVersion}",
            responseType: VSS_NuGet_Contracts.TypeInfo.NuGetPackageVersionDeletionState,
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            apiVersion: this.recycleBinVersionsApiVersion
        });
    }

    /**
     * [Preview API] Delete a package version from a feed's recycle bin.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<void>
     */
    public deletePackageVersionFromRecycleBin(
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "nuget",
            locationId: "07e88775-e3cb-4408-bbe1-628e036fac8c",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/RecycleBin/packages/{packageName}/versions/{packageVersion}",
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            apiVersion: this.recycleBinVersionsApiVersion
        });
    }

    /**
     * @internal
     * [Preview API] Update several packages from a single feed's recycle bin in a single request. The updates to the packages do not happen atomically.
     *
     * @param {VSS_NuGet_Contracts.NuGetPackagesBatchRequest} batchRequest - Information about the packages to update, the operation to perform, and its associated data. <c>Operation</c> must be <c>PermanentDelete</c> or <c>RestoreToFeed</c>
     * @param {string} feedId - Name or ID of the feed.
     * @return IPromise<void>
     */
    public updateRecycleBinPackageVersions(
        batchRequest: VSS_NuGet_Contracts.NuGetPackagesBatchRequest,
        feedId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "nuget",
            locationId: "6479ac16-32f4-40f7-aa96-9414de861352",
            resource: "RecycleBinPackagesBatch",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/RecycleBin/packagesBatch",
            requestType: VSS_NuGet_Contracts.TypeInfo.NuGetPackagesBatchRequest,
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.recycleBinPackagesBatchApiVersion,
            data: batchRequest
        });
    }

    /**
     * [Preview API] Update several packages from a single feed in a single request. The updates to the packages do not happen atomically.
     *
     * @param {VSS_NuGet_Contracts.NuGetPackagesBatchRequest} batchRequest - Information about the packages to update, the operation to perform, and its associated data.
     * @param {string} feedId - Name or ID of the feed.
     * @return IPromise<void>
     */
    public updatePackageVersions(
        batchRequest: VSS_NuGet_Contracts.NuGetPackagesBatchRequest,
        feedId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "nuget",
            locationId: "00c58ea7-d55f-49de-b59f-983533ae11dc",
            resource: "packagesBatch",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/{resource}",
            requestType: VSS_NuGet_Contracts.TypeInfo.NuGetPackagesBatchRequest,
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.packagesBatchApiVersion,
            data: batchRequest
        });
    }

    /**
     * [Preview API] Download a package version directly.  This API is intended for manual UI download options, not for programmatic access and scripting.  You may be heavily throttled if accessing this api for scripting purposes.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @param {string} sourceProtocolVersion - Unused
     * @return IPromise<any>
     */
    public downloadPackage(
        feedId: string,
        packageName: string,
        packageVersion: string,
        sourceProtocolVersion?: string
        ): IPromise<any> {

        const queryValues: any = {
            sourceProtocolVersion: sourceProtocolVersion
        };

        return this._beginRequest<any>({
            httpMethod: "GET",
            area: "nuget",
            locationId: "6ea81b8c-7386-490b-a71f-6cf23c80b388",
            resource: "content",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/packages/{packageName}/versions/{packageVersion}/{resource}",
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            queryParams: queryValues,
            apiVersion: this.contentApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class NuGetHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.packagesBatchApiVersion =
        this.recycleBinPackagesBatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NuGetHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.packagesBatchApiVersion =
        this.recycleBinPackagesBatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NuGetHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.packagesBatchApiVersion =
        this.recycleBinPackagesBatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NuGetHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.packagesBatchApiVersion =
        this.recycleBinPackagesBatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NuGetHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.packagesBatchApiVersion =
        this.recycleBinPackagesBatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NuGetHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.packagesBatchApiVersion =
        this.recycleBinPackagesBatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NuGetHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.packagesBatchApiVersion =
        this.recycleBinPackagesBatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NuGetHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.packagesBatchApiVersion =
        this.recycleBinPackagesBatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NuGetHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.packagesBatchApiVersion =
        this.recycleBinPackagesBatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NuGetHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.packagesBatchApiVersion =
        this.recycleBinPackagesBatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.versionsApiVersion = "2.0-preview.1";
    }
}

export class NuGetHttpClient extends NuGetHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": NuGetHttpClient5,
    "4.1": NuGetHttpClient4_1,
    "4.0": NuGetHttpClient4,
    "3.2": NuGetHttpClient3_2,
    "3.1": NuGetHttpClient3_1,
    "3.0": NuGetHttpClient3,
    "2.3": NuGetHttpClient2_3,
    "2.2": NuGetHttpClient2_2,
    "2.1": NuGetHttpClient2_1,
    "2.0": NuGetHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return NuGetHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): NuGetHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<NuGetHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<NuGetHttpClient5>(NuGetHttpClient5, undefined, undefined, undefined, options);
    }
}
