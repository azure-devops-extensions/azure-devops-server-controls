/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   packaging\client\npm\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Npm_Contracts = require("Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000030-0000-8888-8000-000000000000";
    protected contentApiVersion: string;
    protected contentApiVersion_09a4eafd: string;
    protected readmeApiVersion: string;
    protected readmeApiVersion_6d4db777: string;
    protected recycleBinVersionsApiVersion: string;
    protected recycleBinVersionsApiVersion_220f45eb: string;
    protected versionsApiVersion: string;
    protected versionsApiVersion_e93d9ec3: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Npm_Contracts.PackageVersionDetails} packageVersionDetails
     * @param {string} feedId
     * @param {string} packageName
     * @param {string} packageVersion
     * @return IPromise<VSS_Npm_Contracts.Package>
     */
    public updatePackage(
        packageVersionDetails: VSS_Npm_Contracts.PackageVersionDetails,
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<VSS_Npm_Contracts.Package> {

        return this._beginRequest<VSS_Npm_Contracts.Package>({
            httpMethod: "PATCH",
            area: "npm",
            locationId: "ed579d62-67c9-4271-be66-9b029af5bcf9",
            resource: "Versions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/{packageName}/{resource}/{packageVersion}",
            requestType: VSS_Npm_Contracts.TypeInfo.PackageVersionDetails,
            responseType: VSS_Npm_Contracts.TypeInfo.Package,
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
     * [Preview API] Unpublish an unscoped package version.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<VSS_Npm_Contracts.Package>
     */
    public unpublishPackage(
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<VSS_Npm_Contracts.Package> {

        return this._beginRequest<VSS_Npm_Contracts.Package>({
            httpMethod: "DELETE",
            area: "npm",
            locationId: "ed579d62-67c9-4271-be66-9b029af5bcf9",
            resource: "Versions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/{packageName}/{resource}/{packageVersion}",
            responseType: VSS_Npm_Contracts.TypeInfo.Package,
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            apiVersion: this.versionsApiVersion
        });
    }

    /**
     * [Preview API] Get information about an unscoped package version.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<VSS_Npm_Contracts.Package>
     */
    public getPackageInfo(
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<VSS_Npm_Contracts.Package> {

        return this._beginRequest<VSS_Npm_Contracts.Package>({
            httpMethod: "GET",
            area: "npm",
            locationId: "ed579d62-67c9-4271-be66-9b029af5bcf9",
            resource: "Versions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/{packageName}/{resource}/{packageVersion}",
            responseType: VSS_Npm_Contracts.TypeInfo.Package,
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            apiVersion: this.versionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Npm_Contracts.PackageVersionDetails} packageVersionDetails
     * @param {string} feedId
     * @param {string} packageScope
     * @param {string} unscopedPackageName
     * @param {string} packageVersion
     * @return IPromise<VSS_Npm_Contracts.Package>
     */
    public updateScopedPackage(
        packageVersionDetails: VSS_Npm_Contracts.PackageVersionDetails,
        feedId: string,
        packageScope: string,
        unscopedPackageName: string,
        packageVersion: string
        ): IPromise<VSS_Npm_Contracts.Package> {

        return this._beginRequest<VSS_Npm_Contracts.Package>({
            httpMethod: "PATCH",
            area: "npm",
            locationId: "e93d9ec3-4022-401e-96b0-83ea5d911e09",
            resource: "Versions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/@{packageScope}/{unscopedPackageName}/{resource}/{packageVersion}",
            requestType: VSS_Npm_Contracts.TypeInfo.PackageVersionDetails,
            responseType: VSS_Npm_Contracts.TypeInfo.Package,
            routeValues: {
                feedId: feedId,
                packageScope: packageScope,
                unscopedPackageName: unscopedPackageName,
                packageVersion: packageVersion
            },
            apiVersion: this.versionsApiVersion_e93d9ec3,
            data: packageVersionDetails
        });
    }

    /**
     * [Preview API] Unpublish a scoped package version (such as @scope/name).
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageScope - Scope of the package (the 'scope' part of @scope/name).
     * @param {string} unscopedPackageName - Name of the package (the 'name' part of @scope/name).
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<VSS_Npm_Contracts.Package>
     */
    public unpublishScopedPackage(
        feedId: string,
        packageScope: string,
        unscopedPackageName: string,
        packageVersion: string
        ): IPromise<VSS_Npm_Contracts.Package> {

        return this._beginRequest<VSS_Npm_Contracts.Package>({
            httpMethod: "DELETE",
            area: "npm",
            locationId: "e93d9ec3-4022-401e-96b0-83ea5d911e09",
            resource: "Versions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/@{packageScope}/{unscopedPackageName}/{resource}/{packageVersion}",
            responseType: VSS_Npm_Contracts.TypeInfo.Package,
            routeValues: {
                feedId: feedId,
                packageScope: packageScope,
                unscopedPackageName: unscopedPackageName,
                packageVersion: packageVersion
            },
            apiVersion: this.versionsApiVersion_e93d9ec3
        });
    }

    /**
     * [Preview API] Get information about a scoped package version (such as @scope/name).
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageScope - Scope of the package (the 'scope' part of @scope/name).
     * @param {string} unscopedPackageName - Name of the package (the 'name' part of @scope/name).
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<VSS_Npm_Contracts.Package>
     */
    public getScopedPackageInfo(
        feedId: string,
        packageScope: string,
        unscopedPackageName: string,
        packageVersion: string
        ): IPromise<VSS_Npm_Contracts.Package> {

        return this._beginRequest<VSS_Npm_Contracts.Package>({
            httpMethod: "GET",
            area: "npm",
            locationId: "e93d9ec3-4022-401e-96b0-83ea5d911e09",
            resource: "Versions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/@{packageScope}/{unscopedPackageName}/{resource}/{packageVersion}",
            responseType: VSS_Npm_Contracts.TypeInfo.Package,
            routeValues: {
                feedId: feedId,
                packageScope: packageScope,
                unscopedPackageName: unscopedPackageName,
                packageVersion: packageVersion
            },
            apiVersion: this.versionsApiVersion_e93d9ec3
        });
    }

    /**
     * [Preview API] Restore a package version without an npm scope from the recycle bin to its feed.
     *
     * @param {VSS_Npm_Contracts.NpmRecycleBinPackageVersionDetails} packageVersionDetails
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<void>
     */
    public restorePackageVersionFromRecycleBin(
        packageVersionDetails: VSS_Npm_Contracts.NpmRecycleBinPackageVersionDetails,
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "npm",
            locationId: "63a4f31f-e92b-4ee4-bf92-22d485e73bef",
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
     * [Preview API] Get information about an unscoped package version in the recycle bin.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<VSS_Npm_Contracts.NpmPackageVersionDeletionState>
     */
    public getPackageVersionMetadataFromRecycleBin(
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<VSS_Npm_Contracts.NpmPackageVersionDeletionState> {

        return this._beginRequest<VSS_Npm_Contracts.NpmPackageVersionDeletionState>({
            httpMethod: "GET",
            area: "npm",
            locationId: "63a4f31f-e92b-4ee4-bf92-22d485e73bef",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/RecycleBin/packages/{packageName}/versions/{packageVersion}",
            responseType: VSS_Npm_Contracts.TypeInfo.NpmPackageVersionDeletionState,
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            apiVersion: this.recycleBinVersionsApiVersion
        });
    }

    /**
     * [Preview API] Delete a package version without an npm scope from the recycle bin.
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
            area: "npm",
            locationId: "63a4f31f-e92b-4ee4-bf92-22d485e73bef",
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
     * [Preview API] Restore a package version with an npm scope from the recycle bin to its feed.
     *
     * @param {VSS_Npm_Contracts.NpmRecycleBinPackageVersionDetails} packageVersionDetails
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageScope - Scope of the package (the 'scope' part of @scope/name).
     * @param {string} unscopedPackageName - Name of the package (the 'name' part of @scope/name).
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<void>
     */
    public restoreScopedPackageVersionFromRecycleBin(
        packageVersionDetails: VSS_Npm_Contracts.NpmRecycleBinPackageVersionDetails,
        feedId: string,
        packageScope: string,
        unscopedPackageName: string,
        packageVersion: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "npm",
            locationId: "220f45eb-94a5-432c-902a-5b8c6372e415",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/RecycleBin/packages/@{packageScope}/{unscopedPackageName}/versions/{packageVersion}",
            routeValues: {
                feedId: feedId,
                packageScope: packageScope,
                unscopedPackageName: unscopedPackageName,
                packageVersion: packageVersion
            },
            apiVersion: this.recycleBinVersionsApiVersion_220f45eb,
            data: packageVersionDetails
        });
    }

    /**
     * [Preview API] Get information about a scoped package version in the recycle bin.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageScope - Scope of the package (the 'scope' part of @scope/name)
     * @param {string} unscopedPackageName - Name of the package (the 'name' part of @scope/name).
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<VSS_Npm_Contracts.NpmPackageVersionDeletionState>
     */
    public getScopedPackageVersionMetadataFromRecycleBin(
        feedId: string,
        packageScope: string,
        unscopedPackageName: string,
        packageVersion: string
        ): IPromise<VSS_Npm_Contracts.NpmPackageVersionDeletionState> {

        return this._beginRequest<VSS_Npm_Contracts.NpmPackageVersionDeletionState>({
            httpMethod: "GET",
            area: "npm",
            locationId: "220f45eb-94a5-432c-902a-5b8c6372e415",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/RecycleBin/packages/@{packageScope}/{unscopedPackageName}/versions/{packageVersion}",
            responseType: VSS_Npm_Contracts.TypeInfo.NpmPackageVersionDeletionState,
            routeValues: {
                feedId: feedId,
                packageScope: packageScope,
                unscopedPackageName: unscopedPackageName,
                packageVersion: packageVersion
            },
            apiVersion: this.recycleBinVersionsApiVersion_220f45eb
        });
    }

    /**
     * [Preview API] Delete a package version with an npm scope from the recycle bin.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageScope - Scope of the package (the 'scope' part of @scope/name).
     * @param {string} unscopedPackageName - Name of the package (the 'name' part of @scope/name).
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<void>
     */
    public deleteScopedPackageVersionFromRecycleBin(
        feedId: string,
        packageScope: string,
        unscopedPackageName: string,
        packageVersion: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "npm",
            locationId: "220f45eb-94a5-432c-902a-5b8c6372e415",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/RecycleBin/packages/@{packageScope}/{unscopedPackageName}/versions/{packageVersion}",
            routeValues: {
                feedId: feedId,
                packageScope: packageScope,
                unscopedPackageName: unscopedPackageName,
                packageVersion: packageVersion
            },
            apiVersion: this.recycleBinVersionsApiVersion_220f45eb
        });
    }

    /**
     * [Preview API] Get the Readme for a package version that has no npm scope.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<string>
     */
    public getReadmeUnscopedPackage(
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<string> {

        return this._beginRequest<string>({
            httpMethod: "GET",
            httpResponseType: "text/plain",
            area: "npm",
            locationId: "1099a396-b310-41d4-a4b6-33d134ce3fcf",
            resource: "readme",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/packages/{packageName}/versions/{packageVersion}/{resource}",
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            apiVersion: this.readmeApiVersion
        });
    }

    /**
     * [Preview API] Get the Readme for a package version with an npm scope.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageScope - Scope of the package (the 'scope' part of @scope\name)
     * @param {string} unscopedPackageName - Name of the package (the 'name' part of @scope\name)
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<string>
     */
    public getReadmeScopedPackage(
        feedId: string,
        packageScope: string,
        unscopedPackageName: string,
        packageVersion: string
        ): IPromise<string> {

        return this._beginRequest<string>({
            httpMethod: "GET",
            httpResponseType: "text/plain",
            area: "npm",
            locationId: "6d4db777-7e4a-43b2-afad-779a1d197301",
            resource: "readme",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/packages/@{packageScope}/{unscopedPackageName}/versions/{packageVersion}/{resource}",
            routeValues: {
                feedId: feedId,
                packageScope: packageScope,
                unscopedPackageName: unscopedPackageName,
                packageVersion: packageVersion
            },
            apiVersion: this.readmeApiVersion_6d4db777
        });
    }

    /**
     * [Preview API] Get an unscoped npm package.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @param {string} packageName - Name of the package.
     * @param {string} packageVersion - Version of the package.
     * @return IPromise<ArrayBuffer>
     */
    public getContentUnscopedPackage(
        feedId: string,
        packageName: string,
        packageVersion: string
        ): IPromise<ArrayBuffer> {

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "npm",
            locationId: "75caa482-cb1e-47cd-9f2c-c048a4b7a43e",
            resource: "content",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/packages/{packageName}/versions/{packageVersion}/{resource}",
            routeValues: {
                feedId: feedId,
                packageName: packageName,
                packageVersion: packageVersion
            },
            apiVersion: this.contentApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} feedId
     * @param {string} packageScope
     * @param {string} unscopedPackageName
     * @param {string} packageVersion
     * @return IPromise<ArrayBuffer>
     */
    public getContentScopedPackage(
        feedId: string,
        packageScope: string,
        unscopedPackageName: string,
        packageVersion: string
        ): IPromise<ArrayBuffer> {

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "npm",
            locationId: "09a4eafd-123a-495c-979c-0eda7bdb9a14",
            resource: "content",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/packages/@{packageScope}/{unscopedPackageName}/versions/{packageVersion}/{resource}",
            routeValues: {
                feedId: feedId,
                packageScope: packageScope,
                unscopedPackageName: unscopedPackageName,
                packageVersion: packageVersion
            },
            apiVersion: this.contentApiVersion_09a4eafd
        });
    }
}

export class CommonMethods4To5 extends CommonMethods2To5 {
    protected packagesbatchApiVersion: string;
    protected recyclebinpackagesbatchApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * @internal
     * [Preview API] Update several packages from a single feed's recycle bin in a single request. The updates to the packages do not happen atomically.
     *
     * @param {VSS_Npm_Contracts.NpmPackagesBatchRequest} batchRequest - Information about the packages to update, the operation to perform, and its associated data.
     * @param {string} feedId - Name or ID of the feed.
     * @return IPromise<void>
     */
    public updateRecycleBinPackages(
        batchRequest: VSS_Npm_Contracts.NpmPackagesBatchRequest,
        feedId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "npm",
            locationId: "eefe03ef-a6a2-4a7a-a0ec-2e65a5efd64c",
            resource: "recyclebinpackagesbatch",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/RecycleBin/PackagesBatch",
            requestType: VSS_Npm_Contracts.TypeInfo.NpmPackagesBatchRequest,
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.recyclebinpackagesbatchApiVersion,
            data: batchRequest
        });
    }

    /**
     * [Preview API] Update several packages from a single feed in a single request. The updates to the packages do not happen atomically.
     *
     * @param {VSS_Npm_Contracts.NpmPackagesBatchRequest} batchRequest - Information about the packages to update, the operation to perform, and its associated data.
     * @param {string} feedId - Name or ID of the feed.
     * @return IPromise<void>
     */
    public updatePackages(
        batchRequest: VSS_Npm_Contracts.NpmPackagesBatchRequest,
        feedId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "npm",
            locationId: "06f34005-bbb2-41f4-88f5-23e03a99bb12",
            resource: "packagesbatch",
            routeTemplate: "_apis/packaging/feeds/{feedId}/{area}/{resource}",
            requestType: VSS_Npm_Contracts.TypeInfo.NpmPackagesBatchRequest,
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.packagesbatchApiVersion,
            data: batchRequest
        });
    }
}

/**
 * @exemptedapi
 */
export class NpmHttpClient5 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.contentApiVersion_09a4eafd =
        this.packagesbatchApiVersion =
        this.readmeApiVersion =
        this.readmeApiVersion_6d4db777 =
        this.recyclebinpackagesbatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.recycleBinVersionsApiVersion_220f45eb =
        this.versionsApiVersion =
        this.versionsApiVersion_e93d9ec3 = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NpmHttpClient4_1 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.contentApiVersion_09a4eafd =
        this.packagesbatchApiVersion =
        this.readmeApiVersion =
        this.readmeApiVersion_6d4db777 =
        this.recyclebinpackagesbatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.recycleBinVersionsApiVersion_220f45eb =
        this.versionsApiVersion =
        this.versionsApiVersion_e93d9ec3 = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NpmHttpClient4 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.contentApiVersion_09a4eafd =
        this.packagesbatchApiVersion =
        this.readmeApiVersion =
        this.readmeApiVersion_6d4db777 =
        this.recyclebinpackagesbatchApiVersion =
        this.recycleBinVersionsApiVersion =
        this.recycleBinVersionsApiVersion_220f45eb =
        this.versionsApiVersion =
        this.versionsApiVersion_e93d9ec3 = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NpmHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.contentApiVersion_09a4eafd =
        this.readmeApiVersion =
        this.readmeApiVersion_6d4db777 =
        this.recycleBinVersionsApiVersion =
        this.recycleBinVersionsApiVersion_220f45eb =
        this.versionsApiVersion =
        this.versionsApiVersion_e93d9ec3 = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NpmHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.contentApiVersion_09a4eafd =
        this.readmeApiVersion =
        this.readmeApiVersion_6d4db777 =
        this.recycleBinVersionsApiVersion =
        this.recycleBinVersionsApiVersion_220f45eb =
        this.versionsApiVersion =
        this.versionsApiVersion_e93d9ec3 = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NpmHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.contentApiVersion_09a4eafd =
        this.readmeApiVersion =
        this.readmeApiVersion_6d4db777 =
        this.recycleBinVersionsApiVersion =
        this.recycleBinVersionsApiVersion_220f45eb =
        this.versionsApiVersion =
        this.versionsApiVersion_e93d9ec3 = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NpmHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.contentApiVersion_09a4eafd =
        this.readmeApiVersion =
        this.readmeApiVersion_6d4db777 =
        this.recycleBinVersionsApiVersion =
        this.recycleBinVersionsApiVersion_220f45eb =
        this.versionsApiVersion =
        this.versionsApiVersion_e93d9ec3 = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NpmHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.contentApiVersion_09a4eafd =
        this.readmeApiVersion =
        this.readmeApiVersion_6d4db777 =
        this.recycleBinVersionsApiVersion =
        this.recycleBinVersionsApiVersion_220f45eb =
        this.versionsApiVersion =
        this.versionsApiVersion_e93d9ec3 = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NpmHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.contentApiVersion_09a4eafd =
        this.readmeApiVersion =
        this.readmeApiVersion_6d4db777 =
        this.recycleBinVersionsApiVersion =
        this.recycleBinVersionsApiVersion_220f45eb =
        this.versionsApiVersion =
        this.versionsApiVersion_e93d9ec3 = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class NpmHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.contentApiVersion =
        this.contentApiVersion_09a4eafd =
        this.readmeApiVersion =
        this.readmeApiVersion_6d4db777 =
        this.recycleBinVersionsApiVersion =
        this.recycleBinVersionsApiVersion_220f45eb =
        this.versionsApiVersion =
        this.versionsApiVersion_e93d9ec3 = "2.0-preview.1";
    }
}

export class NpmHttpClient extends NpmHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": NpmHttpClient5,
    "4.1": NpmHttpClient4_1,
    "4.0": NpmHttpClient4,
    "3.2": NpmHttpClient3_2,
    "3.1": NpmHttpClient3_1,
    "3.0": NpmHttpClient3,
    "2.3": NpmHttpClient2_3,
    "2.2": NpmHttpClient2_2,
    "2.1": NpmHttpClient2_1,
    "2.0": NpmHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return NpmHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): NpmHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<NpmHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<NpmHttpClient5>(NpmHttpClient5, undefined, undefined, undefined, options);
    }
}
