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

import PackagingShared_Contracts = require("Package/Scripts/Protocols/Common/WebApi/PackagingShared.Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

/**
 * Data required to deprecate multiple package versions. Pass this while performing NpmBatchOperationTypes.Deprecate batch operation.
 */
export interface BatchDeprecateData {
    /**
     * Deprecate message that will be added to packages
     */
    message: string;
}

/**
 * Describes Npm batch operation types.
 */
export enum NpmBatchOperationType {
    /**
     * Promote package versions to a release view. If constructing a NpmPackagesBatchRequest object with this type, use BatchPromoteData for its Data property. Not supported in the Recycle Bin.
     */
    Promote = 0,
    /**
     * Deprecate or undeprecate package versions. Not supported in the Recycle Bin.
     */
    Deprecate = 1,
    /**
     * Unpublish package versions. Npm-specific alias for the Delete operation. Not supported in the Recycle Bin.
     */
    Unpublish = 2,
    /**
     * Permanently delete package versions. Only supported in the Recycle Bin.
     */
    PermanentDelete = 3,
    /**
     * Restore unpublished package versions to the feed. Only supported in the Recycle Bin.
     */
    RestoreToFeed = 4,
    /**
     * Delete package versions (equivalent to Unpublish). Not supported in the Recycle Bin.
     */
    Delete = 5,
    /**
     * @internal
     */
    UpgradeCachedPackages = 6
}

/**
 * A batch of operations to apply to package versions.
 */
export interface NpmPackagesBatchRequest {
    /**
     * Data required to perform the operation. This is optional based on type of operation. Use BatchPromoteData if performing a promote operation.
     */
    data: any;
    /**
     * Type of operation that needs to be performed on packages.
     */
    operation: NpmBatchOperationType;
    /**
     * The packages onto which the operation will be performed.
     */
    packages: PackagingShared_Contracts.MinimalPackageDetails[];
}

/**
 * Deletion state of an npm package.
 */
export interface NpmPackageVersionDeletionState {
    /**
     * Name of the package.
     */
    name: string;
    /**
     * UTC date the package was unpublished.
     */
    unpublishedDate: Date;
    /**
     * Version of the package.
     */
    version: string;
}

export interface NpmRecycleBinPackageVersionDetails {
    /**
     * Setting to false will undo earlier deletion and restore the package to feed.
     */
    deleted: boolean;
}

/**
 * Package version metadata for an npm package
 */
export interface Package {
    /**
     * Related REST links.
     */
    _links: any;
    /**
     * Deprecated message, if any, for the package.
     */
    deprecateMessage: string;
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
     * If and when the package was deleted.
     */
    unpublishedDate: Date;
    /**
     * The version of the package.
     */
    version: string;
}

export interface PackageVersionDetails {
    /**
     * Indicates the deprecate message of a package version
     */
    deprecateMessage: string;
    /**
     * The view to which the package version will be added
     */
    views: VSS_Common_Contracts.JsonPatchOperation;
}

export var TypeInfo = {
    NpmBatchOperationType: {
        enumValues: {
            "promote": 0,
            "deprecate": 1,
            "unpublish": 2,
            "permanentDelete": 3,
            "restoreToFeed": 4,
            "delete": 5,
            "upgradeCachedPackages": 6
        }
    },
    NpmPackagesBatchRequest: <any>{
    },
    NpmPackageVersionDeletionState: <any>{
    },
    Package: <any>{
    },
    PackageVersionDetails: <any>{
    },
};

TypeInfo.NpmPackagesBatchRequest.fields = {
    operation: {
        enumType: TypeInfo.NpmBatchOperationType
    }
};

TypeInfo.NpmPackageVersionDeletionState.fields = {
    unpublishedDate: {
        isDate: true,
    }
};

TypeInfo.Package.fields = {
    permanentlyDeletedDate: {
        isDate: true,
    },
    sourceChain: {
        isArray: true,
        typeInfo: PackagingShared_Contracts.TypeInfo.UpstreamSourceInfo
    },
    unpublishedDate: {
        isDate: true,
    }
};

TypeInfo.PackageVersionDetails.fields = {
    views: {
        typeInfo: VSS_Common_Contracts.TypeInfo.JsonPatchOperation
    }
};
