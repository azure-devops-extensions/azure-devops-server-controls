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

import PackagingShared_Contracts = require("Package/Scripts/Protocols/Common/WebApi/PackagingShared.Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

/**
 * Data required to unlist or relist multiple package versions. Pass this while performing NuGetBatchOperationTypes.List batch operation.
 */
export interface BatchListData {
    /**
     * The desired listed status for the package versions.
     */
    listed: boolean;
}

/**
 * Describes NuGet batch operation types.
 */
export enum NuGetBatchOperationType {
    /**
     * Promote package versions to a release view. If constructing a NuGetPackagesBatchRequest object with this type, use BatchPromoteData for its Data property. Not supported in the Recycle Bin.
     */
    Promote = 0,
    /**
     * Unlist or relist package versions. Not supported in the Recycle Bin.
     */
    List = 1,
    /**
     * Move package versions to the feed's Recycle Bin. Not supported in the Recycle Bin.
     */
    Delete = 2,
    /**
     * Permanently delete package versions. Only supported in the Recycle Bin.
     */
    PermanentDelete = 3,
    /**
     * Restore deleted package versions to the feed. Only supported in the Recycle Bin.
     */
    RestoreToFeed = 4
}

/**
 * A batch of operations to apply to package versions.
 */
export interface NuGetPackagesBatchRequest {
    /**
     * Data required to perform the operation. This is optional based on the type of the operation. Use BatchPromoteData if performing a promote operation.
     */
    data: any;
    /**
     * Type of operation that needs to be performed on packages.
     */
    operation: NuGetBatchOperationType;
    /**
     * The packages onto which the operation will be performed.
     */
    packages: PackagingShared_Contracts.MinimalPackageDetails[];
}

/**
 * Deletion state of a NuGet package.
 */
export interface NuGetPackageVersionDeletionState {
    /**
     * Utc date the package was deleted.
     */
    deletedDate: Date;
    /**
     * Name of the package.
     */
    name: string;
    /**
     * Version of the package.
     */
    version: string;
}

export interface NuGetRecycleBinPackageVersionDetails {
    /**
     * Setting to false will undo earlier deletion and restore the package to feed.
     */
    deleted: boolean;
}

/**
 * Package version metadata for a NuGet package
 */
export interface Package {
    /**
     * Related REST links.
     */
    _links: any;
    /**
     * If and when the package was deleted.
     */
    deletedDate: Date;
    /**
     * Package Id.
     */
    id: string;
    /**
     * The display name of the package.
     */
    name: string;
    /**
     * If and when the package was permanently deleted.
     */
    permanentlyDeletedDate: Date;
    /**
     * The history of upstream sources for this package. The first source in the list is the immediate source from which this package was saved.
     */
    sourceChain: PackagingShared_Contracts.UpstreamSourceInfo[];
    /**
     * The version of the package.
     */
    version: string;
}

export interface PackageVersionDetails {
    /**
     * Indicates the listing state of a package
     */
    listed: boolean;
    /**
     * The view to which the package version will be added
     */
    views: VSS_Common_Contracts.JsonPatchOperation;
}

export var TypeInfo = {
    NuGetBatchOperationType: {
        enumValues: {
            "promote": 0,
            "list": 1,
            "delete": 2,
            "permanentDelete": 3,
            "restoreToFeed": 4
        }
    },
    NuGetPackagesBatchRequest: <any>{
    },
    NuGetPackageVersionDeletionState: <any>{
    },
    Package: <any>{
    },
    PackageVersionDetails: <any>{
    },
};

TypeInfo.NuGetPackagesBatchRequest.fields = {
    operation: {
        enumType: TypeInfo.NuGetBatchOperationType
    }
};

TypeInfo.NuGetPackageVersionDeletionState.fields = {
    deletedDate: {
        isDate: true,
    }
};

TypeInfo.Package.fields = {
    deletedDate: {
        isDate: true,
    },
    permanentlyDeletedDate: {
        isDate: true,
    },
    sourceChain: {
        isArray: true,
        typeInfo: PackagingShared_Contracts.TypeInfo.UpstreamSourceInfo
    }
};

TypeInfo.PackageVersionDetails.fields = {
    views: {
        typeInfo: VSS_Common_Contracts.TypeInfo.JsonPatchOperation
    }
};
