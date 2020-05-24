/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   feed\client\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_Feed_Contracts = require("Package/Scripts/WebApi/VSS.Feed.Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000036-0000-8888-8000-000000000000";
    protected feedChangesApiVersion: string;
    protected feedsApiVersion: string;
    protected globalPermissionsApiVersion: string;
    protected packageChangesApiVersion: string;
    protected packagesApiVersion: string;
    protected permissionsApiVersion: string;
    protected recycleBinPackagesApiVersion: string;
    protected recycleBinVersionsApiVersion: string;
    protected retentionPoliciesApiVersion: string;
    protected versionsApiVersion: string;
    protected viewsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Update a view.
     *
     * @param {VSS_Feed_Contracts.FeedView} view - New settings to apply to the specified view.
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} viewId - Name or Id of the view.
     * @return IPromise<VSS_Feed_Contracts.FeedView>
     */
    public updateFeedView(
        view: VSS_Feed_Contracts.FeedView,
        feedId: string,
        viewId: string
        ): IPromise<VSS_Feed_Contracts.FeedView> {

        return this._beginRequest<VSS_Feed_Contracts.FeedView>({
            httpMethod: "PATCH",
            area: "Packaging",
            locationId: "42a8502a-6785-41bc-8c16-89477d930877",
            resource: "Views",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}/{viewId}",
            requestType: VSS_Feed_Contracts.TypeInfo.FeedView,
            responseType: VSS_Feed_Contracts.TypeInfo.FeedView,
            routeValues: {
                feedId: feedId,
                viewId: viewId
            },
            apiVersion: this.viewsApiVersion,
            data: view
        });
    }

    /**
     * [Preview API] Get all views for a feed.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @return IPromise<VSS_Feed_Contracts.FeedView[]>
     */
    public getFeedViews(
        feedId: string
        ): IPromise<VSS_Feed_Contracts.FeedView[]> {

        return this._beginRequest<VSS_Feed_Contracts.FeedView[]>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "42a8502a-6785-41bc-8c16-89477d930877",
            resource: "Views",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}/{viewId}",
            responseType: VSS_Feed_Contracts.TypeInfo.FeedView,
            responseIsCollection: true,
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.viewsApiVersion
        });
    }

    /**
     * [Preview API] Get a view by Id.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} viewId - Name or Id of the view.
     * @return IPromise<VSS_Feed_Contracts.FeedView>
     */
    public getFeedView(
        feedId: string,
        viewId: string
        ): IPromise<VSS_Feed_Contracts.FeedView> {

        return this._beginRequest<VSS_Feed_Contracts.FeedView>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "42a8502a-6785-41bc-8c16-89477d930877",
            resource: "Views",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}/{viewId}",
            responseType: VSS_Feed_Contracts.TypeInfo.FeedView,
            routeValues: {
                feedId: feedId,
                viewId: viewId
            },
            apiVersion: this.viewsApiVersion
        });
    }

    /**
     * [Preview API] Delete a feed view.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} viewId - Name or Id of the view.
     * @return IPromise<void>
     */
    public deleteFeedView(
        feedId: string,
        viewId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Packaging",
            locationId: "42a8502a-6785-41bc-8c16-89477d930877",
            resource: "Views",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}/{viewId}",
            routeValues: {
                feedId: feedId,
                viewId: viewId
            },
            apiVersion: this.viewsApiVersion
        });
    }

    /**
     * [Preview API] Create a new view on the referenced feed.
     *
     * @param {VSS_Feed_Contracts.FeedView} view - View to be created.
     * @param {string} feedId - Name or Id of the feed.
     * @return IPromise<VSS_Feed_Contracts.FeedView>
     */
    public createFeedView(
        view: VSS_Feed_Contracts.FeedView,
        feedId: string
        ): IPromise<VSS_Feed_Contracts.FeedView> {

        return this._beginRequest<VSS_Feed_Contracts.FeedView>({
            httpMethod: "POST",
            area: "Packaging",
            locationId: "42a8502a-6785-41bc-8c16-89477d930877",
            resource: "Views",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}/{viewId}",
            requestType: VSS_Feed_Contracts.TypeInfo.FeedView,
            responseType: VSS_Feed_Contracts.TypeInfo.FeedView,
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.viewsApiVersion,
            data: view
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} patchJson
     * @param {string} feedId
     * @param {string} packageId
     * @param {string} packageVersionId
     * @return IPromise<void>
     */
    public updatePackageVersion(
        patchJson: VSS_Common_Contracts.JsonPatchDocument,
        feedId: string,
        packageId: string,
        packageVersionId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Packaging",
            locationId: "3b331909-6a86-44cc-b9ec-c1834c35498f",
            resource: "Versions",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/Packages/{packageId}/{resource}/{packageVersionId}",
            routeValues: {
                feedId: feedId,
                packageId: packageId,
                packageVersionId: packageVersionId
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.versionsApiVersion,
            data: patchJson
        });
    }

    /**
     * [Preview API] Get a list of package versions, optionally filtering by state.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} packageId - Id of the package (GUID Id, not name).
     * @param {boolean} includeUrls - True to include urls for each version.  Default is true.
     * @param {boolean} isListed - Only applicable for NuGet packages.  If false, delisted package versions will be returned.
     * @param {boolean} isDeleted - Return deleted or unpublished versions of packages in the response. Default is unset (do not return deleted versions).
     * @return IPromise<VSS_Feed_Contracts.PackageVersion[]>
     */
    public getPackageVersions(
        feedId: string,
        packageId: string,
        includeUrls?: boolean,
        isListed?: boolean,
        isDeleted?: boolean
        ): IPromise<VSS_Feed_Contracts.PackageVersion[]> {

        const queryValues: any = {
            includeUrls: includeUrls,
            isListed: isListed,
            isDeleted: isDeleted
        };

        return this._beginRequest<VSS_Feed_Contracts.PackageVersion[]>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "3b331909-6a86-44cc-b9ec-c1834c35498f",
            resource: "Versions",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/Packages/{packageId}/{resource}/{packageVersionId}",
            responseType: VSS_Feed_Contracts.TypeInfo.PackageVersion,
            responseIsCollection: true,
            routeValues: {
                feedId: feedId,
                packageId: packageId
            },
            queryParams: queryValues,
            apiVersion: this.versionsApiVersion
        });
    }

    /**
     * [Preview API] Get details about a specific package version.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} packageId - Id of the package (GUID Id, not name).
     * @param {string} packageVersionId - Id of the package version (GUID Id, not name).
     * @param {boolean} includeUrls - True to include urls for each version.  Default is true.
     * @param {boolean} isListed - Only applicable for NuGet packages.  If false, delisted package versions will be returned.
     * @param {boolean} isDeleted - Return deleted or unpublished versions of packages in the response. Default is unset (do not return deleted versions).
     * @return IPromise<VSS_Feed_Contracts.PackageVersion>
     */
    public getPackageVersion(
        feedId: string,
        packageId: string,
        packageVersionId: string,
        includeUrls?: boolean,
        isListed?: boolean,
        isDeleted?: boolean
        ): IPromise<VSS_Feed_Contracts.PackageVersion> {

        const queryValues: any = {
            includeUrls: includeUrls,
            isListed: isListed,
            isDeleted: isDeleted
        };

        return this._beginRequest<VSS_Feed_Contracts.PackageVersion>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "3b331909-6a86-44cc-b9ec-c1834c35498f",
            resource: "Versions",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/Packages/{packageId}/{resource}/{packageVersionId}",
            responseType: VSS_Feed_Contracts.TypeInfo.PackageVersion,
            routeValues: {
                feedId: feedId,
                packageId: packageId,
                packageVersionId: packageVersionId
            },
            queryParams: queryValues,
            apiVersion: this.versionsApiVersion
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} feedId
     * @param {string} packageId
     * @param {string} packageVersionId
     * @param {Date} deletedDate
     * @param {Date} scheduledPermanentDeleteDate
     * @return IPromise<void>
     */
    public deletePackageVersion(
        feedId: string,
        packageId: string,
        packageVersionId: string,
        deletedDate?: Date,
        scheduledPermanentDeleteDate?: Date
        ): IPromise<void> {

        const queryValues: any = {
            deletedDate: deletedDate,
            scheduledPermanentDeleteDate: scheduledPermanentDeleteDate
        };

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Packaging",
            locationId: "3b331909-6a86-44cc-b9ec-c1834c35498f",
            resource: "Versions",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/Packages/{packageId}/{resource}/{packageVersionId}",
            routeValues: {
                feedId: feedId,
                packageId: packageId,
                packageVersionId: packageVersionId
            },
            queryParams: queryValues,
            apiVersion: this.versionsApiVersion
        });
    }

    /**
     * [Preview API] Set the retention policy for a feed.
     *
     * @param {VSS_Feed_Contracts.FeedRetentionPolicy} policy - Feed retention policy.
     * @param {string} feedId - Name or ID of the feed.
     * @return IPromise<VSS_Feed_Contracts.FeedRetentionPolicy>
     */
    public setFeedRetentionPolicies(
        policy: VSS_Feed_Contracts.FeedRetentionPolicy,
        feedId: string
        ): IPromise<VSS_Feed_Contracts.FeedRetentionPolicy> {

        return this._beginRequest<VSS_Feed_Contracts.FeedRetentionPolicy>({
            httpMethod: "PUT",
            area: "Packaging",
            locationId: "ed52a011-0112-45b5-9f9e-e14efffb3193",
            resource: "RetentionPolicies",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}",
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.retentionPoliciesApiVersion,
            data: policy
        });
    }

    /**
     * [Preview API] Get the retention policy for a feed.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @return IPromise<VSS_Feed_Contracts.FeedRetentionPolicy>
     */
    public getFeedRetentionPolicies(
        feedId: string
        ): IPromise<VSS_Feed_Contracts.FeedRetentionPolicy> {

        return this._beginRequest<VSS_Feed_Contracts.FeedRetentionPolicy>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "ed52a011-0112-45b5-9f9e-e14efffb3193",
            resource: "RetentionPolicies",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}",
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.retentionPoliciesApiVersion
        });
    }

    /**
     * [Preview API] Delete the retention policy for a feed.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @return IPromise<void>
     */
    public deleteFeedRetentionPolicies(
        feedId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Packaging",
            locationId: "ed52a011-0112-45b5-9f9e-e14efffb3193",
            resource: "RetentionPolicies",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}",
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.retentionPoliciesApiVersion
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} patchJson
     * @param {string} feedId
     * @param {string} packageId
     * @param {string} packageVersionId
     * @return IPromise<void>
     */
    public updateRecycleBinPackageVersion(
        patchJson: VSS_Common_Contracts.JsonPatchDocument,
        feedId: string,
        packageId: string,
        packageVersionId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Packaging",
            locationId: "aceb4be7-8737-4820-834c-4c549e10fdc7",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/RecycleBin/Packages/{packageId}/Versions/{packageVersionId}",
            routeValues: {
                feedId: feedId,
                packageId: packageId,
                packageVersionId: packageVersionId
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.recycleBinVersionsApiVersion,
            data: patchJson
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} feedId
     * @param {string} packageId
     * @param {string} packageVersionId
     * @return IPromise<void>
     */
    public permanentlyDeletePackageVersion(
        feedId: string,
        packageId: string,
        packageVersionId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Packaging",
            locationId: "aceb4be7-8737-4820-834c-4c549e10fdc7",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/RecycleBin/Packages/{packageId}/Versions/{packageVersionId}",
            routeValues: {
                feedId: feedId,
                packageId: packageId,
                packageVersionId: packageVersionId
            },
            apiVersion: this.recycleBinVersionsApiVersion
        });
    }

    /**
     * [Preview API] Get a list of package versions within the recycle bin.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} packageId - The package Id (GUID Id, not the package name).
     * @param {boolean} includeUrls - True to return REST Urls with the response.  Default is True.
     * @return IPromise<VSS_Feed_Contracts.RecycleBinPackageVersion[]>
     */
    public getRecycleBinPackageVersions(
        feedId: string,
        packageId: string,
        includeUrls?: boolean
        ): IPromise<VSS_Feed_Contracts.RecycleBinPackageVersion[]> {

        const queryValues: any = {
            includeUrls: includeUrls
        };

        return this._beginRequest<VSS_Feed_Contracts.RecycleBinPackageVersion[]>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "aceb4be7-8737-4820-834c-4c549e10fdc7",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/RecycleBin/Packages/{packageId}/Versions/{packageVersionId}",
            responseType: VSS_Feed_Contracts.TypeInfo.RecycleBinPackageVersion,
            responseIsCollection: true,
            routeValues: {
                feedId: feedId,
                packageId: packageId
            },
            queryParams: queryValues,
            apiVersion: this.recycleBinVersionsApiVersion
        });
    }

    /**
     * [Preview API] Get information about a package version within the recycle bin.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} packageId - The package Id (GUID Id, not the package name).
     * @param {string} packageVersionId - The package version Id 9guid Id, not the version string).
     * @param {boolean} includeUrls - True to return REST Urls with the response.  Default is True.
     * @return IPromise<VSS_Feed_Contracts.RecycleBinPackageVersion>
     */
    public getRecycleBinPackageVersion(
        feedId: string,
        packageId: string,
        packageVersionId: string,
        includeUrls?: boolean
        ): IPromise<VSS_Feed_Contracts.RecycleBinPackageVersion> {

        const queryValues: any = {
            includeUrls: includeUrls
        };

        return this._beginRequest<VSS_Feed_Contracts.RecycleBinPackageVersion>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "aceb4be7-8737-4820-834c-4c549e10fdc7",
            resource: "RecycleBinVersions",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/RecycleBin/Packages/{packageId}/Versions/{packageVersionId}",
            responseType: VSS_Feed_Contracts.TypeInfo.RecycleBinPackageVersion,
            routeValues: {
                feedId: feedId,
                packageId: packageId,
                packageVersionId: packageVersionId
            },
            queryParams: queryValues,
            apiVersion: this.recycleBinVersionsApiVersion
        });
    }

    /**
     * [Preview API] Query for packages within the recycle bin.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} protocolType - Type of package (e.g. NuGet, npm, ...).
     * @param {string} packageNameQuery - Filter to packages matching this name.
     * @param {boolean} includeUrls - True to return REST Urls with the response.  Default is True.
     * @param {number} top - Get the top N packages.
     * @param {number} skip - Skip the first N packages.
     * @param {boolean} includeAllVersions - True to return all versions of the package in the response.  Default is false (latest version only).
     * @return IPromise<VSS_Feed_Contracts.Package[]>
     */
    public getRecycleBinPackages(
        feedId: string,
        protocolType?: string,
        packageNameQuery?: string,
        includeUrls?: boolean,
        top?: number,
        skip?: number,
        includeAllVersions?: boolean
        ): IPromise<VSS_Feed_Contracts.Package[]> {

        const queryValues: any = {
            protocolType: protocolType,
            packageNameQuery: packageNameQuery,
            includeUrls: includeUrls,
            '$top': top,
            '$skip': skip,
            includeAllVersions: includeAllVersions
        };

        return this._beginRequest<VSS_Feed_Contracts.Package[]>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "2704e72c-f541-4141-99be-2004b50b05fa",
            resource: "RecycleBinPackages",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/RecycleBin/Packages/{packageId}",
            responseType: VSS_Feed_Contracts.TypeInfo.Package,
            responseIsCollection: true,
            routeValues: {
                feedId: feedId
            },
            queryParams: queryValues,
            apiVersion: this.recycleBinPackagesApiVersion
        });
    }

    /**
     * [Preview API] Get information about a package and all its versions within the recycle bin.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} packageId - The package Id (GUID Id, not the package name).
     * @param {boolean} includeUrls - True to return REST Urls with the response.  Default is True.
     * @return IPromise<VSS_Feed_Contracts.Package>
     */
    public getRecycleBinPackage(
        feedId: string,
        packageId: string,
        includeUrls?: boolean
        ): IPromise<VSS_Feed_Contracts.Package> {

        const queryValues: any = {
            includeUrls: includeUrls
        };

        return this._beginRequest<VSS_Feed_Contracts.Package>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "2704e72c-f541-4141-99be-2004b50b05fa",
            resource: "RecycleBinPackages",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/RecycleBin/Packages/{packageId}",
            responseType: VSS_Feed_Contracts.TypeInfo.Package,
            routeValues: {
                feedId: feedId,
                packageId: packageId
            },
            queryParams: queryValues,
            apiVersion: this.recycleBinPackagesApiVersion
        });
    }

    /**
     * [Preview API] Update the permissions on a feed.
     *
     * @param {VSS_Feed_Contracts.FeedPermission[]} feedPermission - Permissions to set.
     * @param {string} feedId - Name or Id of the feed.
     * @return IPromise<VSS_Feed_Contracts.FeedPermission[]>
     */
    public setFeedPermissions(
        feedPermission: VSS_Feed_Contracts.FeedPermission[],
        feedId: string
        ): IPromise<VSS_Feed_Contracts.FeedPermission[]> {

        return this._beginRequest<VSS_Feed_Contracts.FeedPermission[]>({
            httpMethod: "PATCH",
            area: "Packaging",
            locationId: "be8c1476-86a7-44ed-b19d-aec0e9275cd8",
            resource: "Permissions",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}",
            requestType: VSS_Feed_Contracts.TypeInfo.FeedPermission,
            responseType: VSS_Feed_Contracts.TypeInfo.FeedPermission,
            responseIsCollection: true,
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.permissionsApiVersion,
            data: feedPermission
        });
    }

    /**
     * [Preview API] Get the permissions for a feed.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {boolean} includeIds - True to include user Ids in the response.  Default is false.
     * @param {boolean} excludeInheritedPermissions - True to only return explicitly set permissions on the feed.  Default is false.
     * @param {string} identityDescriptor - Filter permissions to the provided identity.
     * @return IPromise<VSS_Feed_Contracts.FeedPermission[]>
     */
    public getFeedPermissions(
        feedId: string,
        includeIds?: boolean,
        excludeInheritedPermissions?: boolean,
        identityDescriptor?: string
        ): IPromise<VSS_Feed_Contracts.FeedPermission[]> {

        const queryValues: any = {
            includeIds: includeIds,
            excludeInheritedPermissions: excludeInheritedPermissions,
            identityDescriptor: identityDescriptor
        };

        return this._beginRequest<VSS_Feed_Contracts.FeedPermission[]>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "be8c1476-86a7-44ed-b19d-aec0e9275cd8",
            resource: "Permissions",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}",
            responseType: VSS_Feed_Contracts.TypeInfo.FeedPermission,
            responseIsCollection: true,
            routeValues: {
                feedId: feedId
            },
            queryParams: queryValues,
            apiVersion: this.permissionsApiVersion
        });
    }

    /**
     * [Preview API] Get details about all of the packages in the feed.  Use the various filters to include or exclude information from the result set.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} protocolType - One of the supported artifact package types.
     * @param {string} packageNameQuery - Filter to packages that contain the provided string.  Characters in the string must conform to the package name constraints.
     * @param {string} normalizedPackageName - [Obsolete] Used for legacy scenarios and may be removed in future versions.
     * @param {boolean} includeUrls - True to return REST Urls with the response.  Default is True.
     * @param {boolean} includeAllVersions - True to return all versions of the package in the response.  Default is false (latest version only).
     * @param {boolean} isListed - Only applicable for NuGet packages, setting it for other package types will result in a 404.  If false, delisted package versions will be returned. Use this to filter the response when includeAllVersions is set to true.  Default is unset (do not return delisted packages).
     * @param {boolean} getTopPackageVersions - Changes the behavior of $top and $skip to return all versions of each package up to $top. Must be used in conjunction with includeAllVersions=true
     * @param {boolean} isRelease - Only applicable for Nuget packages.  Use this to filter the response when includeAllVersions is set to true.  Default is True (only return packages without prerelease versioning).
     * @param {boolean} includeDescription - Return the description for every version of each package in the response.  Default is False.
     * @param {number} top - Get the top N packages (or package versions where getTopPackageVersions=true)
     * @param {number} skip - Skip the first N packages (or package versions where getTopPackageVersions=true)
     * @param {boolean} includeDeleted - Return deleted or unpublished versions of packages in the response. Default is False.
     * @param {boolean} isCached - [Obsolete]  Used for legacy scenarios and may be removed in future versions.
     * @param {string} directUpstreamId - Filter results to return packages from a specific upstream.
     * @return IPromise<VSS_Feed_Contracts.Package[]>
     */
    public getPackages(
        feedId: string,
        protocolType?: string,
        packageNameQuery?: string,
        normalizedPackageName?: string,
        includeUrls?: boolean,
        includeAllVersions?: boolean,
        isListed?: boolean,
        getTopPackageVersions?: boolean,
        isRelease?: boolean,
        includeDescription?: boolean,
        top?: number,
        skip?: number,
        includeDeleted?: boolean,
        isCached?: boolean,
        directUpstreamId?: string
        ): IPromise<VSS_Feed_Contracts.Package[]> {

        const queryValues: any = {
            protocolType: protocolType,
            packageNameQuery: packageNameQuery,
            normalizedPackageName: normalizedPackageName,
            includeUrls: includeUrls,
            includeAllVersions: includeAllVersions,
            isListed: isListed,
            getTopPackageVersions: getTopPackageVersions,
            isRelease: isRelease,
            includeDescription: includeDescription,
            '$top': top,
            '$skip': skip,
            includeDeleted: includeDeleted,
            isCached: isCached,
            directUpstreamId: directUpstreamId
        };

        return this._beginRequest<VSS_Feed_Contracts.Package[]>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "7a20d846-c929-4acc-9ea2-0d5a7df1b197",
            resource: "Packages",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}/{packageId}",
            responseType: VSS_Feed_Contracts.TypeInfo.Package,
            responseIsCollection: true,
            routeValues: {
                feedId: feedId
            },
            queryParams: queryValues,
            apiVersion: this.packagesApiVersion
        });
    }

    /**
     * [Preview API] Get details about a specific package.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} packageId - The package Id (GUID Id, not the package name).
     * @param {boolean} includeAllVersions - True to return all versions of the package in the response.  Default is false (latest version only).
     * @param {boolean} includeUrls - True to return REST Urls with the response.  Default is True.
     * @param {boolean} isListed - Only applicable for NuGet packages, setting it for other package types will result in a 404.  If false, delisted package versions will be returned. Use this to filter the response when includeAllVersions is set to true.  Default is unset (do not return delisted packages).
     * @param {boolean} isRelease - Only applicable for Nuget packages.  Use this to filter the response when includeAllVersions is set to true.  Default is True (only return packages without prerelease versioning).
     * @param {boolean} includeDeleted - Return deleted or unpublished versions of packages in the response. Default is False.
     * @param {boolean} includeDescription - Return the description for every version of each package in the response.  Default is False.
     * @return IPromise<VSS_Feed_Contracts.Package>
     */
    public getPackage(
        feedId: string,
        packageId: string,
        includeAllVersions?: boolean,
        includeUrls?: boolean,
        isListed?: boolean,
        isRelease?: boolean,
        includeDeleted?: boolean,
        includeDescription?: boolean
        ): IPromise<VSS_Feed_Contracts.Package> {

        const queryValues: any = {
            includeAllVersions: includeAllVersions,
            includeUrls: includeUrls,
            isListed: isListed,
            isRelease: isRelease,
            includeDeleted: includeDeleted,
            includeDescription: includeDescription
        };

        return this._beginRequest<VSS_Feed_Contracts.Package>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "7a20d846-c929-4acc-9ea2-0d5a7df1b197",
            resource: "Packages",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}/{packageId}",
            responseType: VSS_Feed_Contracts.TypeInfo.Package,
            routeValues: {
                feedId: feedId,
                packageId: packageId
            },
            queryParams: queryValues,
            apiVersion: this.packagesApiVersion
        });
    }

    /**
     * [Preview API] Get a batch of package changes made to a feed.  The changes returned are 'most recent change' so if an Add is followed by an Update before you begin enumerating, you'll only see one change in the batch.  While consuming batches using the continuation token, you may see changes to the same package version multiple times if they are happening as you enumerate.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {number} continuationToken - A continuation token which acts as a bookmark to a previously retrieved change. This token allows the user to continue retrieving changes in batches, picking up where the previous batch left off. If specified, all the changes that occur strictly after the token will be returned. If not specified or 0, iteration will start with the first change.
     * @param {number} batchSize - Number of package changes to fetch. The default value is 1000. The maximum value is 2000.
     * @return IPromise<VSS_Feed_Contracts.PackageChangesResponse>
     */
    public getPackageChanges(
        feedId: string,
        continuationToken?: number,
        batchSize?: number
        ): IPromise<VSS_Feed_Contracts.PackageChangesResponse> {

        const queryValues: any = {
            continuationToken: continuationToken,
            batchSize: batchSize
        };

        return this._beginRequest<VSS_Feed_Contracts.PackageChangesResponse>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "323a0631-d083-4005-85ae-035114dfb681",
            resource: "PackageChanges",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}",
            responseType: VSS_Feed_Contracts.TypeInfo.PackageChangesResponse,
            routeValues: {
                feedId: feedId
            },
            queryParams: queryValues,
            apiVersion: this.packageChangesApiVersion
        });
    }

    /**
     * [Preview API] Set service-wide permissions that govern feed creation.
     *
     * @param {VSS_Feed_Contracts.GlobalPermission[]} globalPermissions - New permissions for the organization.
     * @return IPromise<VSS_Feed_Contracts.GlobalPermission[]>
     */
    public setGlobalPermissions(
        globalPermissions: VSS_Feed_Contracts.GlobalPermission[]
        ): IPromise<VSS_Feed_Contracts.GlobalPermission[]> {

        return this._beginRequest<VSS_Feed_Contracts.GlobalPermission[]>({
            httpMethod: "PATCH",
            area: "Packaging",
            locationId: "a74419ef-b477-43df-8758-3cd1cd5f56c6",
            resource: "GlobalPermissions",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: VSS_Feed_Contracts.TypeInfo.GlobalPermission,
            responseType: VSS_Feed_Contracts.TypeInfo.GlobalPermission,
            responseIsCollection: true,
            apiVersion: this.globalPermissionsApiVersion,
            data: globalPermissions
        });
    }

    /**
     * [Preview API] Get all service-wide feed creation permissions.
     *
     * @return IPromise<VSS_Feed_Contracts.GlobalPermission[]>
     */
    public getGlobalPermissions(): IPromise<VSS_Feed_Contracts.GlobalPermission[]> {

        return this._beginRequest<VSS_Feed_Contracts.GlobalPermission[]>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "a74419ef-b477-43df-8758-3cd1cd5f56c6",
            resource: "GlobalPermissions",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: VSS_Feed_Contracts.TypeInfo.GlobalPermission,
            responseIsCollection: true,
            apiVersion: this.globalPermissionsApiVersion
        });
    }

    /**
     * [Preview API] Change the attributes of a feed.
     *
     * @param {VSS_Feed_Contracts.FeedUpdate} feed - A JSON object containing the feed settings to be updated.
     * @param {string} feedId - Name or Id of the feed.
     * @return IPromise<VSS_Feed_Contracts.Feed>
     */
    public updateFeed(
        feed: VSS_Feed_Contracts.FeedUpdate,
        feedId: string
        ): IPromise<VSS_Feed_Contracts.Feed> {

        return this._beginRequest<VSS_Feed_Contracts.Feed>({
            httpMethod: "PATCH",
            area: "Packaging",
            locationId: "c65009a7-474a-4ad1-8b42-7d852107ef8c",
            resource: "Feeds",
            routeTemplate: "_apis/{area}/{resource}/{feedId}",
            requestType: VSS_Feed_Contracts.TypeInfo.FeedUpdate,
            responseType: VSS_Feed_Contracts.TypeInfo.Feed,
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.feedsApiVersion,
            data: feed
        });
    }

    /**
     * [Preview API] Get all feeds in an account where you have the provided role access.
     *
     * @param {VSS_Feed_Contracts.FeedRole} feedRole - Filter by this role, either Administrator(4), Contributor(3), or Reader(2) level permissions.
     * @param {boolean} includeDeletedUpstreams - Include upstreams that have been deleted in the response.
     * @return IPromise<VSS_Feed_Contracts.Feed[]>
     */
    public getFeeds(
        feedRole?: VSS_Feed_Contracts.FeedRole,
        includeDeletedUpstreams?: boolean
        ): IPromise<VSS_Feed_Contracts.Feed[]> {

        const queryValues: any = {
            feedRole: feedRole,
            includeDeletedUpstreams: includeDeletedUpstreams
        };

        return this._beginRequest<VSS_Feed_Contracts.Feed[]>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "c65009a7-474a-4ad1-8b42-7d852107ef8c",
            resource: "Feeds",
            routeTemplate: "_apis/{area}/{resource}/{feedId}",
            responseType: VSS_Feed_Contracts.TypeInfo.Feed,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.feedsApiVersion
        });
    }

    /**
     * [Preview API] Get the settings for a specific feed.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {boolean} includeDeletedUpstreams - Include upstreams that have been deleted in the response.
     * @return IPromise<VSS_Feed_Contracts.Feed>
     */
    public getFeed(
        feedId: string,
        includeDeletedUpstreams?: boolean
        ): IPromise<VSS_Feed_Contracts.Feed> {

        const queryValues: any = {
            includeDeletedUpstreams: includeDeletedUpstreams
        };

        return this._beginRequest<VSS_Feed_Contracts.Feed>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "c65009a7-474a-4ad1-8b42-7d852107ef8c",
            resource: "Feeds",
            routeTemplate: "_apis/{area}/{resource}/{feedId}",
            responseType: VSS_Feed_Contracts.TypeInfo.Feed,
            routeValues: {
                feedId: feedId
            },
            queryParams: queryValues,
            apiVersion: this.feedsApiVersion
        });
    }

    /**
     * [Preview API] Remove a feed and all its packages.  The action does not result in packages moving to the RecycleBin and is not reversible.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @return IPromise<void>
     */
    public deleteFeed(
        feedId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Packaging",
            locationId: "c65009a7-474a-4ad1-8b42-7d852107ef8c",
            resource: "Feeds",
            routeTemplate: "_apis/{area}/{resource}/{feedId}",
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.feedsApiVersion
        });
    }

    /**
     * [Preview API] Create a feed, a container for various package types.
     *
     * @param {VSS_Feed_Contracts.Feed} feed - A JSON object containing both required and optional attributes for the feed. Name is the only required value.
     * @return IPromise<VSS_Feed_Contracts.Feed>
     */
    public createFeed(
        feed: VSS_Feed_Contracts.Feed
        ): IPromise<VSS_Feed_Contracts.Feed> {

        return this._beginRequest<VSS_Feed_Contracts.Feed>({
            httpMethod: "POST",
            area: "Packaging",
            locationId: "c65009a7-474a-4ad1-8b42-7d852107ef8c",
            resource: "Feeds",
            routeTemplate: "_apis/{area}/{resource}/{feedId}",
            requestType: VSS_Feed_Contracts.TypeInfo.Feed,
            responseType: VSS_Feed_Contracts.TypeInfo.Feed,
            apiVersion: this.feedsApiVersion,
            data: feed
        });
    }

    /**
     * [Preview API] Query to determine which feeds have changed since the last call, tracked through the provided continuationToken. Only changes to a feed itself are returned and impact the continuationToken, not additions or alterations to packages within the feeds.
     *
     * @param {boolean} includeDeleted - If true, get changes for all feeds including deleted feeds. The default value is false.
     * @param {number} continuationToken - A continuation token which acts as a bookmark to a previously retrieved change. This token allows the user to continue retrieving changes in batches, picking up where the previous batch left off. If specified, all the changes that occur strictly after the token will be returned. If not specified or 0, iteration will start with the first change.
     * @param {number} batchSize - Number of package changes to fetch. The default value is 1000. The maximum value is 2000.
     * @return IPromise<VSS_Feed_Contracts.FeedChangesResponse>
     */
    public getFeedChanges(
        includeDeleted?: boolean,
        continuationToken?: number,
        batchSize?: number
        ): IPromise<VSS_Feed_Contracts.FeedChangesResponse> {

        const queryValues: any = {
            includeDeleted: includeDeleted,
            continuationToken: continuationToken,
            batchSize: batchSize
        };

        return this._beginRequest<VSS_Feed_Contracts.FeedChangesResponse>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "29ba2dad-389a-4661-b5d3-de76397ca05b",
            resource: "FeedChanges",
            routeTemplate: "_apis/{area}/{resource}/{feedId}",
            responseType: VSS_Feed_Contracts.TypeInfo.FeedChangesResponse,
            queryParams: queryValues,
            apiVersion: this.feedChangesApiVersion
        });
    }

    /**
     * [Preview API] Query a feed to determine its current state.
     *
     * @param {string} feedId - Name or ID of the feed.
     * @return IPromise<VSS_Feed_Contracts.FeedChange>
     */
    public getFeedChange(
        feedId: string
        ): IPromise<VSS_Feed_Contracts.FeedChange> {

        return this._beginRequest<VSS_Feed_Contracts.FeedChange>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "29ba2dad-389a-4661-b5d3-de76397ca05b",
            resource: "FeedChanges",
            routeTemplate: "_apis/{area}/{resource}/{feedId}",
            responseType: VSS_Feed_Contracts.TypeInfo.FeedChange,
            routeValues: {
                feedId: feedId
            },
            apiVersion: this.feedChangesApiVersion
        });
    }
}

export class CommonMethods4_1To5 extends CommonMethods2To5 {
    protected badgeApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Generate a SVG badge for the latest version of a package.  The generated SVG is typically used as the image in an HTML link which takes users to the feed containing the package to accelerate discovery and consumption.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} packageId - Id of the package (GUID Id, not name).
     * @return IPromise<string>
     */
    public getBadge(
        feedId: string,
        packageId: string
        ): IPromise<string> {

        return this._beginRequest<string>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "61d885fd-10f3-4a55-82b6-476d866b673f",
            resource: "Badge",
            routeTemplate: "_apis/public/{area}/Feeds/{feedId}/Packages/{packageId}/{resource}",
            routeValues: {
                feedId: feedId,
                packageId: packageId
            },
            apiVersion: this.badgeApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class FeedHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.badgeApiVersion =
        this.feedChangesApiVersion =
        this.feedsApiVersion =
        this.globalPermissionsApiVersion =
        this.packageChangesApiVersion =
        this.packagesApiVersion =
        this.permissionsApiVersion =
        this.recycleBinPackagesApiVersion =
        this.recycleBinVersionsApiVersion =
        this.retentionPoliciesApiVersion =
        this.versionsApiVersion =
        this.viewsApiVersion = "5.0-preview.1";
    }

    /**
     * @internal
     * [Preview API] Get the capabilities for a specific feed.
     *
     * @param {string} feedId - a feed GUID
     * @return IPromise<VSS_Feed_Contracts.FeedCapabilities>
     */
    public getCapabilities(
        feedId: string
        ): IPromise<VSS_Feed_Contracts.FeedCapabilities> {

        return this._beginRequest<VSS_Feed_Contracts.FeedCapabilities>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "2fbf20fd-376a-4d12-95c6-6876b759cd25",
            resource: "Capabilities",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}",
            responseType: VSS_Feed_Contracts.TypeInfo.FeedCapabilities,
            routeValues: {
                feedId: feedId
            },
            apiVersion: "5.0-preview.1"
        });
    }

    /**
     * @internal
     * [Preview API] Use this to change the capabilities of a feed, if possible
     *
     * @param {VSS_Feed_Contracts.FeedCapabilities} capabilities - New capabilities
     * @param {string} feedId - a feed GUID.
     * @return IPromise<void>
     */
    public updateCapability(
        capabilities: VSS_Feed_Contracts.FeedCapabilities,
        feedId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "Packaging",
            locationId: "2fbf20fd-376a-4d12-95c6-6876b759cd25",
            resource: "Capabilities",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}",
            requestType: VSS_Feed_Contracts.TypeInfo.FeedCapabilities,
            routeValues: {
                feedId: feedId
            },
            apiVersion: "5.0-preview.1",
            data: capabilities
        });
    }

    /**
     * @internal
     * [Preview API] Use this to run a batch operation against the given feed
     *
     * @param {VSS_Feed_Contracts.FeedBatchData} data
     * @param {string} feedId - a feed GUID.
     * @return IPromise<void>
     */
    public runBatch(
        data: VSS_Feed_Contracts.FeedBatchData,
        feedId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "Packaging",
            locationId: "858e27b5-e7f3-4237-8feb-730e72821b8a",
            resource: "FeedBatch",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}",
            requestType: VSS_Feed_Contracts.TypeInfo.FeedBatchData,
            routeValues: {
                feedId: feedId
            },
            apiVersion: "5.0-preview.1",
            data: data
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Feed_Contracts.PackageDownloadMetricsQuery} packageIdQuery
     * @param {string} feedId
     * @return IPromise<VSS_Feed_Contracts.PackageIdMetrics[]>
     */
    public queryPackageMetrics(
        packageIdQuery: VSS_Feed_Contracts.PackageDownloadMetricsQuery,
        feedId: string
        ): IPromise<VSS_Feed_Contracts.PackageIdMetrics[]> {

        return this._beginRequest<VSS_Feed_Contracts.PackageIdMetrics[]>({
            httpMethod: "POST",
            area: "Packaging",
            locationId: "bddc9b3c-8a59-4a9f-9b40-ee1dcaa2cc0d",
            resource: "PackageMetricsBatch",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/{resource}",
            responseType: VSS_Feed_Contracts.TypeInfo.PackageIdMetrics,
            responseIsCollection: true,
            routeValues: {
                feedId: feedId
            },
            apiVersion: "5.0-preview.1",
            data: packageIdQuery
        });
    }

    /**
     * [Preview API] Gets provenance for a package version.
     *
     * @param {string} feedId - Name or Id of the feed.
     * @param {string} packageId - Id of the package (GUID Id, not name).
     * @param {string} packageVersionId - Id of the package version (GUID Id, not name).
     * @return IPromise<VSS_Feed_Contracts.PackageVersionProvenance>
     */
    public getPackageVersionProvenance(
        feedId: string,
        packageId: string,
        packageVersionId: string
        ): IPromise<VSS_Feed_Contracts.PackageVersionProvenance> {

        return this._beginRequest<VSS_Feed_Contracts.PackageVersionProvenance>({
            httpMethod: "GET",
            area: "Packaging",
            locationId: "0aaeabd4-85cd-4686-8a77-8d31c15690b8",
            resource: "Provenance",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/Packages/{packageId}/Versions/{packageVersionId}/{resource}",
            routeValues: {
                feedId: feedId,
                packageId: packageId,
                packageVersionId: packageVersionId
            },
            apiVersion: "5.0-preview.1"
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Feed_Contracts.PackageVersionDownloadMetricsQuery} packageVersionIdQuery
     * @param {string} feedId
     * @param {string} packageId
     * @return IPromise<VSS_Feed_Contracts.PackageVersionMetrics[]>
     */
    public queryPackageVersionMetrics(
        packageVersionIdQuery: VSS_Feed_Contracts.PackageVersionDownloadMetricsQuery,
        feedId: string,
        packageId: string
        ): IPromise<VSS_Feed_Contracts.PackageVersionMetrics[]> {

        return this._beginRequest<VSS_Feed_Contracts.PackageVersionMetrics[]>({
            httpMethod: "POST",
            area: "Packaging",
            locationId: "e6ae8caa-b6a8-4809-b840-91b2a42c19ad",
            resource: "VersionMetricsBatch",
            routeTemplate: "_apis/{area}/Feeds/{feedId}/Packages/{packageId}/{resource}",
            responseType: VSS_Feed_Contracts.TypeInfo.PackageVersionMetrics,
            responseIsCollection: true,
            routeValues: {
                feedId: feedId,
                packageId: packageId
            },
            apiVersion: "5.0-preview.1",
            data: packageVersionIdQuery
        });
    }
}

/**
 * @exemptedapi
 */
export class FeedHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.badgeApiVersion =
        this.feedChangesApiVersion =
        this.feedsApiVersion =
        this.globalPermissionsApiVersion =
        this.packageChangesApiVersion =
        this.packagesApiVersion =
        this.permissionsApiVersion =
        this.recycleBinPackagesApiVersion =
        this.recycleBinVersionsApiVersion =
        this.retentionPoliciesApiVersion =
        this.versionsApiVersion =
        this.viewsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.feedChangesApiVersion =
        this.feedsApiVersion =
        this.globalPermissionsApiVersion =
        this.packageChangesApiVersion =
        this.packagesApiVersion =
        this.permissionsApiVersion =
        this.recycleBinPackagesApiVersion =
        this.recycleBinVersionsApiVersion =
        this.retentionPoliciesApiVersion =
        this.versionsApiVersion =
        this.viewsApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.feedChangesApiVersion =
        this.feedsApiVersion =
        this.globalPermissionsApiVersion =
        this.packageChangesApiVersion =
        this.packagesApiVersion =
        this.permissionsApiVersion =
        this.recycleBinPackagesApiVersion =
        this.recycleBinVersionsApiVersion =
        this.retentionPoliciesApiVersion =
        this.versionsApiVersion =
        this.viewsApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.feedChangesApiVersion =
        this.feedsApiVersion =
        this.globalPermissionsApiVersion =
        this.packageChangesApiVersion =
        this.packagesApiVersion =
        this.permissionsApiVersion =
        this.recycleBinPackagesApiVersion =
        this.recycleBinVersionsApiVersion =
        this.retentionPoliciesApiVersion =
        this.versionsApiVersion =
        this.viewsApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.feedChangesApiVersion =
        this.feedsApiVersion =
        this.globalPermissionsApiVersion =
        this.packageChangesApiVersion =
        this.packagesApiVersion =
        this.permissionsApiVersion =
        this.recycleBinPackagesApiVersion =
        this.recycleBinVersionsApiVersion =
        this.retentionPoliciesApiVersion =
        this.versionsApiVersion =
        this.viewsApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.feedChangesApiVersion =
        this.feedsApiVersion =
        this.globalPermissionsApiVersion =
        this.packageChangesApiVersion =
        this.packagesApiVersion =
        this.permissionsApiVersion =
        this.recycleBinPackagesApiVersion =
        this.recycleBinVersionsApiVersion =
        this.retentionPoliciesApiVersion =
        this.versionsApiVersion =
        this.viewsApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.feedChangesApiVersion =
        this.feedsApiVersion =
        this.globalPermissionsApiVersion =
        this.packageChangesApiVersion =
        this.packagesApiVersion =
        this.permissionsApiVersion =
        this.recycleBinPackagesApiVersion =
        this.recycleBinVersionsApiVersion =
        this.retentionPoliciesApiVersion =
        this.versionsApiVersion =
        this.viewsApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.feedChangesApiVersion =
        this.feedsApiVersion =
        this.globalPermissionsApiVersion =
        this.packageChangesApiVersion =
        this.packagesApiVersion =
        this.permissionsApiVersion =
        this.recycleBinPackagesApiVersion =
        this.recycleBinVersionsApiVersion =
        this.retentionPoliciesApiVersion =
        this.versionsApiVersion =
        this.viewsApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class FeedHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.feedChangesApiVersion =
        this.feedsApiVersion =
        this.globalPermissionsApiVersion =
        this.packageChangesApiVersion =
        this.packagesApiVersion =
        this.permissionsApiVersion =
        this.recycleBinPackagesApiVersion =
        this.recycleBinVersionsApiVersion =
        this.retentionPoliciesApiVersion =
        this.versionsApiVersion =
        this.viewsApiVersion = "2.0-preview.1";
    }
}

export class FeedHttpClient extends FeedHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": FeedHttpClient5,
    "4.1": FeedHttpClient4_1,
    "4.0": FeedHttpClient4,
    "3.2": FeedHttpClient3_2,
    "3.1": FeedHttpClient3_1,
    "3.0": FeedHttpClient3,
    "2.3": FeedHttpClient2_3,
    "2.2": FeedHttpClient2_2,
    "2.1": FeedHttpClient2_1,
    "2.0": FeedHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return FeedHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): FeedHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<FeedHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<FeedHttpClient5>(FeedHttpClient5, undefined, undefined, undefined, options);
    }
}
