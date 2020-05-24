import VSS_Authentication_Contracts = require("VSS/Authentication/Contracts");
import VSS_Identities_Contracts = require("VSS/Identities/Contracts");

import Package_Scripts_WebApi_VSS_Feed_Contracts = require("Package/Scripts/WebApi/VSS.Feed.Contracts");


//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.VisualStudio.Services.Feed.Server.Plugins
//----------------------------------------------------------

export enum UnfollowResultStatus {
    unfollowFailed = 0,
    unfollowSuccess = 1,
}

export module WebPageConstants {
    export var DirectUpstreamSourceIdForThisFeedFilter = "00000000-0000-0000-0000-000000000000";
}

export interface FeedMessage {
    id: string;
    linkText: string;
    linkUrl: string;
    message: string;
}

export enum FeedRetrievalResult {
    Error = 0,
    NotFound = 1,
    NoFeeds = 2,
    Success = 3,
}

export interface FeedsResult {
    errorMessage: string;
    feeds: Package_Scripts_WebApi_VSS_Feed_Contracts.Feed[];
    feedViews: Package_Scripts_WebApi_VSS_Feed_Contracts.FeedView[];
    result: FeedRetrievalResult;
    selectedFeed: Package_Scripts_WebApi_VSS_Feed_Contracts.Feed;
}

export interface PackageDetailsResult {
    errorMessage: string;
    package: Package_Scripts_WebApi_VSS_Feed_Contracts.Package;
    packageMetrics: Package_Scripts_WebApi_VSS_Feed_Contracts.PackageMetrics;
    packageVersion: Package_Scripts_WebApi_VSS_Feed_Contracts.PackageVersion;
    result: PackageDetailsRetrievalResult;
}

export enum PackageDetailsRetrievalResult {
    Error = 0,
    NotFound = 1,
    Success = 2,
    NotFoundWithSamePackageCase = 3,
    NotFoundWithSameVersionCase = 4,
}

export interface PackagesResult {
    errorMessage: string;
    packages: Package_Scripts_WebApi_VSS_Feed_Contracts.Package[];
    requestedPackageCount: number;
    result: PackagesRetrievalResult;
}

export enum PackagesRetrievalResult {
    Error = 0,
    NoPackages = 1,
    Success = 2,
}

export interface WebPageData {
    batchOperationPageSize: number;
    collectionBuildIdentity: VSS_Identities_Contracts.Identity;
    collectionUpstreamsFeatureFlag: boolean;
    currentUserDescriptor: string;
    daysLeftOfTrial: number;
    defaultPublicUpstreamSources: Package_Scripts_WebApi_VSS_Feed_Contracts.UpstreamSource[];
    enterpriseName: string;
    enterpriseUrl: string;
    everyoneGroup: VSS_Identities_Contracts.IdentityDescriptor;
    feedsResult: FeedsResult;
    isCustomPublicUpstreamsFeatureEnabled: boolean;
    isIvyUIEnabled: boolean;
    isManualUpgradeEnabled: boolean;
    isMavenDeleteUIEnabled: boolean;
    isMultiDomainAuthTokensFeatureFlagEnabled: boolean;
    isNpmAllowUpstreamNameConflict: boolean;
    isPackageMetricsEnabled: boolean;
    isProvenanceEnabled: boolean;
    isPyPiUIEnabled: boolean;
    isPyPiUpstreamEnabled: boolean;
    isRetentionPoliciesFeatureEnabled: boolean;
    isSmartDependenciesEnabled: boolean;
    isUPackUIEnabled: boolean;
    legacyPkgUrl: string;
    minimumSnapshotInstanceCount: number;
    nuGetInternalUpstreamsFeatureFlag: boolean;
    organizationSessionToken: VSS_Authentication_Contracts.WebSessionToken;
    organizationUpstreamsFeatureFlag: boolean;
    packageDetailsResult: PackageDetailsResult;
    packagesResult: PackagesResult;
    pageSize: number;
    projectBuildIdentity: VSS_Identities_Contracts.Identity;
    projectCollectionAdminGroupId: string;
    publicAccessMapping: string;
    recycleBinPackagesResult: PackagesResult;
    retentionPolicyMaximumCountLimit: number;
    retentionPolicyMinimumCountLimit: number;
    upstreamSourceLimit: number;
    userCanAdministerFeeds: boolean;
    userCanCreateFeed: boolean;
}

export var TypeInfo = {
    FeedRetrievalResult: {
        enumValues: {
            "error": 0,
            "notFound": 1,
            "noFeeds": 2,
            "success": 3,
        }
    },
    FeedsResult: {
        fields: <any>null
    },
    PackageDetailsResult: {
        fields: <any>null
    },
    PackageDetailsRetrievalResult: {
        enumValues: {
            "error": 0,
            "notFound": 1,
            "success": 2,
            "notFoundWithSamePackageCase": 3,
            "notFoundWithSameVersionCase": 4,
        }
    },
    PackagesResult: {
        fields: <any>null
    },
    PackagesRetrievalResult: {
        enumValues: {
            "error": 0,
            "noPackages": 1,
            "success": 2,
        }
    },
    WebPageData: {
        fields: <any>null
    }
}

TypeInfo.FeedsResult.fields = {
    feeds: {
        isArray: true,
        typeInfo: Package_Scripts_WebApi_VSS_Feed_Contracts.TypeInfo.Feed
    },
    selectedFeed: {
        typeInfo: Package_Scripts_WebApi_VSS_Feed_Contracts.TypeInfo.Feed
    },
    feedViews: {
        isArray: true,
        typeInfo: Package_Scripts_WebApi_VSS_Feed_Contracts.TypeInfo.FeedView
    },
    result: {
        enumType: TypeInfo.FeedRetrievalResult
    }
}
TypeInfo.PackageDetailsResult.fields = {
    package: {
        typeInfo: Package_Scripts_WebApi_VSS_Feed_Contracts.TypeInfo.Package
    },
    packageVersion: {
        typeInfo: Package_Scripts_WebApi_VSS_Feed_Contracts.TypeInfo.PackageVersion
    },
    packageMetrics: {
        typeInfo: Package_Scripts_WebApi_VSS_Feed_Contracts.TypeInfo.PackageMetrics
    },
    result: {
        enumType: TypeInfo.PackageDetailsRetrievalResult
    }
}
TypeInfo.PackagesResult.fields = {
    packages: {
        isArray: true,
        typeInfo: Package_Scripts_WebApi_VSS_Feed_Contracts.TypeInfo.Package
    },
    result: {
        enumType: TypeInfo.PackagesRetrievalResult
    }
}
TypeInfo.WebPageData.fields = {
    feedsResult: {
        typeInfo: TypeInfo.FeedsResult
    },
    packagesResult: {
        typeInfo: TypeInfo.PackagesResult
    },
    packageDetailsResult: {
        typeInfo: TypeInfo.PackageDetailsResult
    },
    recycleBinPackagesResult: {
        typeInfo: TypeInfo.PackagesResult
    },
    defaultPublicUpstreamSources: {
        isArray: true,
        typeInfo: Package_Scripts_WebApi_VSS_Feed_Contracts.TypeInfo.UpstreamSource
    },
    organizationSessionToken: {
        typeInfo: VSS_Authentication_Contracts.TypeInfo.WebSessionToken
    }
}


