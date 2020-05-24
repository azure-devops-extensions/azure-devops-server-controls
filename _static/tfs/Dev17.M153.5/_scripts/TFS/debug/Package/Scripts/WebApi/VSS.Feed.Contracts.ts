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

import VSS_Identities_Contracts = require("VSS/Identities/Contracts");

/**
 * Type of operation last performed.
 */
export enum ChangeType {
    /**
     * A package version was added or updated.
     */
    AddOrUpdate = 1,
    /**
     * A package version was deleted.
     */
    Delete = 2
}

/**
 * A container for artifacts.
 */
export interface Feed extends FeedCore {
    /**
     * Related REST links.
     */
    _links: any;
    /**
     * If set, this feed supports generation of package badges.
     */
    badgesEnabled: boolean;
    /**
     * The view that the feed administrator has indicated is the default experience for readers.
     */
    defaultViewId: string;
    /**
     * The date that this feed was deleted.
     */
    deletedDate: Date;
    /**
     * A description for the feed.  Descriptions must not exceed 255 characters.
     */
    description: string;
    /**
     * If set, the feed will hide all deleted/unpublished versions
     */
    hideDeletedPackageVersions: boolean;
    /**
     * Explicit permissions for the feed.
     */
    permissions: FeedPermission[];
    /**
     * If set, time that the UpstreamEnabled property was changed. Will be null if UpstreamEnabled was never changed after Feed creation.
     */
    upstreamEnabledChangedDate: Date;
    /**
     * The URL of the base feed in GUID form.
     */
    url: string;
}

export interface FeedBatchData {
    data: FeedBatchOperationData;
    operation: FeedBatchOperation;
}

export enum FeedBatchOperation {
    SaveCachedPackages = 0
}

export interface FeedBatchOperationData {
}

/**
 * Capabilites are used to track features that are available to individual feeds. In general, newly created feeds should be given all available capabilities. These flags track breaking changes in behaviour to feeds, or changes that require user reaction.
 */
export enum FeedCapabilities {
    /**
     * No flags exist for this feed
     */
    None = 0,
    /**
     * This feed can serve packages from upstream sources Upstream packages must be manually promoted to views
     */
    UpstreamV2 = 1,
    /**
     * This feed is currently under maintenance and may have reduced functionality
     */
    UnderMaintenance = -2147483648,
    /**
     * The capabilities given to a newly created feed
     */
    DefaultCapabilities = 1
}

/**
 * A container that encapsulates the state of the feed after a create, update, or delete.
 */
export interface FeedChange {
    /**
     * The type of operation.
     */
    changeType: ChangeType;
    /**
     * The state of the feed after a after a create, update, or delete operation completed.
     */
    feed: Feed;
    /**
     * A token that identifies the next change in the log of changes.
     */
    feedContinuationToken: number;
    /**
     * A token that identifies the latest package change for this feed.  This can be used to quickly determine if there have been any changes to packages in a specific feed.
     */
    latestPackageContinuationToken: number;
}

/**
 * A result set containing the feed changes for the range that was requested.
 */
export interface FeedChangesResponse {
    _links: any;
    /**
     * The number of changes in this set.
     */
    count: number;
    /**
     * A container that encapsulates the state of the feed after a create, update, or delete.
     */
    feedChanges: FeedChange[];
    /**
     * When iterating through the log of changes this value indicates the value that should be used for the next continuation token.
     */
    nextFeedContinuationToken: number;
}

/**
 * An object that contains all of the settings for a specific feed.
 */
export interface FeedCore {
    /**
     * OBSOLETE: If set, the feed will allow upload of packages that exist on the upstream
     */
    allowUpstreamNameConflict: boolean;
    /**
     * Supported capabilities of a feed.
     */
    capabilities: FeedCapabilities;
    /**
     * This will either be the feed GUID or the feed GUID and view GUID depending on how the feed was accessed.
     */
    fullyQualifiedId: string;
    /**
     * Full name of the view, in feed@view format.
     */
    fullyQualifiedName: string;
    /**
     * A GUID that uniquely identifies this feed.
     */
    id: string;
    /**
     * If set, all packages in the feed are immutable.  It is important to note that feed views are immutable; therefore, this flag will always be set for views.
     */
    isReadOnly: boolean;
    /**
     * A name for the feed. feed names must follow these rules: <list type="bullet"><item><description> Must not exceed 64 characters </description></item><item><description> Must not contain whitespaces </description></item><item><description> Must not start with an underscore or a period </description></item><item><description> Must not end with a period </description></item><item><description> Must not contain any of the following illegal characters: <![CDATA[ @, ~, ;, {, }, \, +, =, <, >, |, /, \\, ?, :, &, $, *, \", #, [, ] ]]></description></item></list>
     */
    name: string;
    /**
     * OBSOLETE: This should always be true.  Setting to false will override all sources in UpstreamSources.
     */
    upstreamEnabled: boolean;
    /**
     * A list of sources that this feed will fetch packages from.  An empty list indicates that this feed will not search any additional sources for packages.
     */
    upstreamSources: UpstreamSource[];
    /**
     * Definition of the view.
     */
    view: FeedView;
    /**
     * View Id.
     */
    viewId: string;
    /**
     * View name.
     */
    viewName: string;
}

/**
 * Permissions for a feed.
 */
export interface FeedPermission {
    /**
     * Display name for the identity.
     */
    displayName: string;
    /**
     * Identity associated with this role.
     */
    identityDescriptor: VSS_Identities_Contracts.IdentityDescriptor;
    /**
     * Id of the identity associated with this role.
     */
    identityId: string;
    /**
     * The role for this identity on a feed.
     */
    role: FeedRole;
}

/**
 * Retention policy settings.
 */
export interface FeedRetentionPolicy {
    /**
     * Used for legacy scenarios and may be removed in future versions.
     */
    ageLimitInDays: number;
    /**
     * Maximum versions to preserve per package and package type.
     */
    countLimit: number;
}

export enum FeedRole {
    /**
     * Unsupported.
     */
    Custom = 0,
    /**
     * Unsupported.
     */
    None = 1,
    /**
     * Readers can only read packages and view settings.
     */
    Reader = 2,
    /**
     * Contributors can do anything to packages in the feed including adding new packages, but they may not modify feed settings.
     */
    Contributor = 3,
    /**
     * Administrators have total control over the feed.
     */
    Administrator = 4,
    /**
     * Collaborators have the same permissions as readers, but can also ingest packages from configured upstream sources.
     */
    Collaborator = 5
}

/**
 * Update a feed definition with these new values.
 */
export interface FeedUpdate {
    /**
     * If set, the feed will allow upload of packages that exist on the upstream
     */
    allowUpstreamNameConflict: boolean;
    /**
     * If set, this feed supports generation of package badges.
     */
    badgesEnabled: boolean;
    /**
     * The view that the feed administrator has indicated is the default experience for readers.
     */
    defaultViewId: string;
    /**
     * A description for the feed.  Descriptions must not exceed 255 characters.
     */
    description: string;
    /**
     * If set, feed will hide all deleted/unpublished versions
     */
    hideDeletedPackageVersions: boolean;
    /**
     * A GUID that uniquely identifies this feed.
     */
    id: string;
    /**
     * A name for the feed. feed names must follow these rules: <list type="bullet"><item><description> Must not exceed 64 characters </description></item><item><description> Must not contain whitespaces </description></item><item><description> Must not start with an underscore or a period </description></item><item><description> Must not end with a period </description></item><item><description> Must not contain any of the following illegal characters: <![CDATA[ @, ~, ;, {, }, \, +, =, <, >, |, /, \\, ?, :, &, $, *, \", #, [, ] ]]></description></item></list>
     */
    name: string;
    /**
     * OBSOLETE: If set, the feed can proxy packages from an upstream feed
     */
    upstreamEnabled: boolean;
    /**
     * A list of sources that this feed will fetch packages from.  An empty list indicates that this feed will not search any additional sources for packages.
     */
    upstreamSources: UpstreamSource[];
}

/**
 * A view on top of a feed.
 */
export interface FeedView {
    /**
     * Related REST links.
     */
    _links: any;
    /**
     * Id of the view.
     */
    id: string;
    /**
     * Name of the view.
     */
    name: string;
    /**
     * Type of view.
     */
    type: FeedViewType;
    /**
     * Url of the view.
     */
    url: string;
    /**
     * Visibility status of the view.
     */
    visibility: FeedVisibility;
}

/**
 * The type of view, often used to control capabilities and exposure to options such as promote.  Implicit views are internally created only.
 */
export enum FeedViewType {
    /**
     * Default, unspecified view type.
     */
    None = 0,
    /**
     * View used as a promotion destination to classify released artifacts.
     */
    Release = 1,
    /**
     * Internal view type that is automatically created and managed by the system.
     */
    Implicit = 2
}

/**
 * Feed visibility controls the scope in which a certain feed is accessible by a particular user
 */
export enum FeedVisibility {
    /**
     * Only accessible by the permissions explicitly set by the feed administrator.
     */
    Private = 0,
    /**
     * Feed is accessible by all the valid users present in the organization where the feed resides (for example across organization 'myorg' at 'dev.azure.com/myorg')
     */
    Collection = 1,
    /**
     * Feed is accessible by all the valid users present in the enterprise where the feed resides.  Note that legacy naming and back compat leaves the name of this value out of sync with its new meaning.
     */
    Organization = 2
}

/**
 * Permissions for feed service-wide operations such as the creation of new feeds.
 */
export interface GlobalPermission {
    /**
     * Identity of the user with the provided Role.
     */
    identityDescriptor: VSS_Identities_Contracts.IdentityDescriptor;
    /**
     * Role associated with the Identity.
     */
    role: GlobalRole;
}

export enum GlobalRole {
    /**
     * Invalid default value.
     */
    Custom = 0,
    /**
     * Explicit no permissions.
     */
    None = 1,
    /**
     * Ability to create new feeds.
     */
    FeedCreator = 2
}

/**
 * A single metric name and value.
 */
export interface Metric {
    /**
     * Metric type.
     */
    metricType: MetricType;
    /**
     * Metric name.
     */
    name: string;
    /**
     * Metric value.
     */
    value: number;
}

/**
 * The meaning behind a numerical metric.
 */
export enum MetricType {
    /**
     * Download detail.
     */
    DownloadsDetail = 0,
    /**
     * Total download count.
     */
    TotalDownloads = 1,
    /**
     * Total unique user count.
     */
    UniqueUsers = 2
}

/**
 * Core data about any package, including its id and version information and basic state.
 */
export interface MinimalPackageVersion {
    /**
     * Upstream source this package was ingested from.
     */
    directUpstreamSourceId: string;
    /**
     * Id for the package.
     */
    id: string;
    /**
     * [Obsolete] Used for legacy scenarios and may be removed in future versions.
     */
    isCachedVersion: boolean;
    /**
     * True if this package has been deleted.
     */
    isDeleted: boolean;
    /**
     * True if this is the latest version of the package by package type sort order.
     */
    isLatest: boolean;
    /**
     * (NuGet Only) True if this package is listed.
     */
    isListed: boolean;
    /**
     * Normalized version using normalization rules specific to a package type.
     */
    normalizedVersion: string;
    /**
     * Package description.
     */
    packageDescription: string;
    /**
     * UTC Date the package was published to the service.
     */
    publishDate: Date;
    /**
     * Internal storage id.
     */
    storageId: string;
    /**
     * Display version.
     */
    version: string;
    /**
     * List of views containing this package version.
     */
    views: FeedView[];
}

/**
 * A package, which is a container for one or more package versions.
 */
export interface Package {
    /**
     * Related REST links.
     */
    _links: any;
    /**
     * Id of the package.
     */
    id: string;
    /**
     * Used for legacy scenarios and may be removed in future versions.
     */
    isCached: boolean;
    /**
     * The display name of the package.
     */
    name: string;
    /**
     * The normalized name representing the identity of this package within its package type.
     */
    normalizedName: string;
    /**
     * Type of the package.
     */
    protocolType: string;
    /**
     * [Obsolete] - this field is unused and will be removed in a future release.
     */
    starCount: number;
    /**
     * Url for this package.
     */
    url: string;
    /**
     * All versions for this package within its feed.
     */
    versions: MinimalPackageVersion[];
}

/**
 * A single change to a feed's packages.
 */
export interface PackageChange {
    /**
     * Package that was changed.
     */
    package: Package;
    /**
     * Change that was performed on a package version.
     */
    packageVersionChange: PackageVersionChange;
}

/**
 * A set of change operations to a feed's packages.
 */
export interface PackageChangesResponse {
    /**
     * Related REST links.
     */
    _links: any;
    /**
     * Number of changes in this batch.
     */
    count: number;
    /**
     * Token that should be used in future calls for this feed to retrieve new changes.
     */
    nextPackageContinuationToken: number;
    /**
     * List of changes.
     */
    packageChanges: PackageChange[];
}

/**
 * A dependency on another package version.
 */
export interface PackageDependency {
    /**
     * Dependency package group (an optional classification within some package types).
     */
    group: string;
    /**
     * Dependency package name.
     */
    packageName: string;
    /**
     * Dependency package version range.
     */
    versionRange: string;
}

/**
 * Query to get package metrics
 */
export interface PackageDownloadMetricsQuery {
    /**
     * List of package ids
     */
    packageIds: string[];
}

/**
 * A package file for a specific package version, only relevant to package types that contain multiple files per version.
 */
export interface PackageFile {
    /**
     * Hierarchical representation of files.
     */
    children: PackageFile[];
    /**
     * File name.
     */
    name: string;
    /**
     * Extended data unique to a specific package type.
     */
    protocolMetadata: ProtocolMetadata;
}

/**
 * All metrics for a certain package id
 */
export interface PackageIdMetrics {
    /**
     * Total count of downloads per package id.
     */
    downloadCount: number;
    /**
     * Number of downloads per unique user per package id.
     */
    downloadUniqueUsers: number;
    /**
     * UTC date and time when package was last downloaded.
     */
    lastDownloaded: Date;
    /**
     * Package id.
     */
    packageId: string;
}

/**
 * Metrics for a specific package version.
 */
export interface PackageMetrics {
    /**
     * Aggregated metrics, such as the total number of downloads.
     */
    aggregatedMetrics: Metric[];
    /**
     * Package version associated with these metrics.
     */
    packageDescriptor: PackageVersionDescriptor;
    /**
     * Segmented metrics, such as the number of downloads per user.
     */
    segmentedMetrics: SegmentedMetric[];
}

/**
 * A specific version of a package.
 */
export interface PackageVersion extends MinimalPackageVersion {
    /**
     * Related links
     */
    _links: any;
    /**
     * Package version author.
     */
    author: string;
    /**
     * UTC date that this package version was deleted.
     */
    deletedDate: Date;
    /**
     * List of dependencies for this package version.
     */
    dependencies: PackageDependency[];
    /**
     * Package version description.
     */
    description: string;
    /**
     * Files associated with this package version, only relevant for multi-file package types.
     */
    files: PackageFile[];
    /**
     * Other versions of this package.
     */
    otherVersions: MinimalPackageVersion[];
    /**
     * Extended data specific to a package type.
     */
    protocolMetadata: ProtocolMetadata;
    /**
     * List of upstream sources through which a package version moved to land in this feed.
     */
    sourceChain: UpstreamSource[];
    /**
     * Package version summary.
     */
    summary: string;
    /**
     * Package version tags.
     */
    tags: string[];
    /**
     * Package version url.
     */
    url: string;
}

/**
 * A change to a single package version.
 */
export interface PackageVersionChange {
    /**
     * The type of change that was performed.
     */
    changeType: ChangeType;
    /**
     * Token marker for this change, allowing the caller to send this value back to the service and receive changes beyond this one.
     */
    continuationToken: number;
    /**
     * Package version that was changed.
     */
    packageVersion: PackageVersion;
}

/**
 * Query descriptor for a package version.
 */
export interface PackageVersionDescriptor {
    /**
     * Package Id.
     */
    packageId: string;
    /**
     * Package version Id.
     */
    packageVersionId: string;
}

/**
 * Query to get package version metrics
 */
export interface PackageVersionDownloadMetricsQuery {
    /**
     * List of package version ids
     */
    packageVersionIds: string[];
}

/**
 * All metrics for a certain package version id
 */
export interface PackageVersionMetrics {
    /**
     * Total count of downloads per package version id.
     */
    downloadCount: number;
    /**
     * Number of downloads per unique user per package version id.
     */
    downloadUniqueUsers: number;
    /**
     * UTC date and time when package version was last downloaded.
     */
    lastDownloaded: Date;
    /**
     * Package id.
     */
    packageId: string;
    /**
     * Package version id.
     */
    packageVersionId: string;
}

/**
 * Provenance for a published package version
 */
export interface PackageVersionProvenance {
    /**
     * Name or Id of the feed.
     */
    feedId: string;
    /**
     * Id of the package (GUID Id, not name).
     */
    packageId: string;
    /**
     * Id of the package version (GUID Id, not name).
     */
    packageVersionId: string;
    /**
     * Provenance information for this package version.
     */
    provenance: Provenance;
}

/**
 * Extended metadata for a specific package type.
 */
export interface ProtocolMetadata {
    /**
     * Extended metadata for a specific package type, formatted to the associated schema version definition.
     */
    data: any;
    /**
     * Schema version.
     */
    schemaVersion: number;
}

/**
 * Data about the origin of a published package
 */
export interface Provenance {
    /**
     * Other provenance data.
     */
    data: { [key: string] : string; };
    /**
     * Type of provenance source, for example "InternalBuild", "InternalRelease"
     */
    provenanceSource: string;
    /**
     * Identity of user that published the package
     */
    publisherUserIdentity: string;
    /**
     * HTTP User-Agent used when pushing the package.
     */
    userAgent: string;
}

/**
 * A single package version within the recycle bin.
 */
export interface RecycleBinPackageVersion extends PackageVersion {
    /**
     * UTC date on which the package will automatically be removed from the recycle bin and permanently deleted.
     */
    scheduledPermanentDeleteDate: Date;
}

export interface SaveCachedPackagesData extends FeedBatchOperationData {
    normalizedPackageNames: string[];
    viewsForPromotion: string[];
}

/**
 * Metrics grouped by type, such as metrics per user.
 */
export interface SegmentedMetric {
    /**
     * List of metrics grouped by MetricType.
     */
    metrics: Metric[];
    /**
     * Group type for individual metrics.
     */
    metricType: MetricType;
}

/**
 * Upstream source definition, including its Identity, package type, and other associated information.
 */
export interface UpstreamSource {
    /**
     * UTC date that this upstream was deleted.
     */
    deletedDate: Date;
    /**
     * Identity of the upstream source.
     */
    id: string;
    /**
     * For an internal upstream type, track the Azure DevOps organization that contains it.
     */
    internalUpstreamCollectionId: string;
    /**
     * For an internal upstream type, track the feed id being referenced.
     */
    internalUpstreamFeedId: string;
    /**
     * For an internal upstream type, track the view of the feed being referenced.
     */
    internalUpstreamViewId: string;
    /**
     * Locator for connecting to the upstream source.
     */
    location: string;
    /**
     * Display name.
     */
    name: string;
    /**
     * Package type associated with the upstream source.
     */
    protocol: string;
    /**
     * Source type, such as Public or Internal.
     */
    upstreamSourceType: UpstreamSourceType;
}

/**
 * Type of an upstream source, such as Public or Internal.
 */
export enum UpstreamSourceType {
    /**
     * Publicly available source.
     */
    Public = 1,
    /**
     * Azure DevOps upstream source.
     */
    Internal = 2
}

export var TypeInfo = {
    ChangeType: {
        enumValues: {
            "addOrUpdate": 1,
            "delete": 2
        }
    },
    Feed: <any>{
    },
    FeedBatchData: <any>{
    },
    FeedBatchOperation: {
        enumValues: {
            "saveCachedPackages": 0
        }
    },
    FeedCapabilities: {
        enumValues: {
            "none": 0,
            "upstreamV2": 1,
            "underMaintenance": -2147483648,
            "defaultCapabilities": 1
        }
    },
    FeedChange: <any>{
    },
    FeedChangesResponse: <any>{
    },
    FeedCore: <any>{
    },
    FeedPermission: <any>{
    },
    FeedRole: {
        enumValues: {
            "custom": 0,
            "none": 1,
            "reader": 2,
            "contributor": 3,
            "administrator": 4,
            "collaborator": 5
        }
    },
    FeedUpdate: <any>{
    },
    FeedView: <any>{
    },
    FeedViewType: {
        enumValues: {
            "none": 0,
            "release": 1,
            "implicit": 2
        }
    },
    FeedVisibility: {
        enumValues: {
            "private": 0,
            "collection": 1,
            "organization": 2
        }
    },
    GlobalPermission: <any>{
    },
    GlobalRole: {
        enumValues: {
            "custom": 0,
            "none": 1,
            "feedCreator": 2
        }
    },
    Metric: <any>{
    },
    MetricType: {
        enumValues: {
            "downloadsDetail": 0,
            "totalDownloads": 1,
            "uniqueUsers": 2
        }
    },
    MinimalPackageVersion: <any>{
    },
    Package: <any>{
    },
    PackageChange: <any>{
    },
    PackageChangesResponse: <any>{
    },
    PackageIdMetrics: <any>{
    },
    PackageMetrics: <any>{
    },
    PackageVersion: <any>{
    },
    PackageVersionChange: <any>{
    },
    PackageVersionMetrics: <any>{
    },
    RecycleBinPackageVersion: <any>{
    },
    SegmentedMetric: <any>{
    },
    UpstreamSource: <any>{
    },
    UpstreamSourceType: {
        enumValues: {
            "public": 1,
            "internal": 2
        }
    },
};

TypeInfo.Feed.fields = {
    capabilities: {
        enumType: TypeInfo.FeedCapabilities
    },
    deletedDate: {
        isDate: true,
    },
    permissions: {
        isArray: true,
        typeInfo: TypeInfo.FeedPermission
    },
    upstreamEnabledChangedDate: {
        isDate: true,
    },
    upstreamSources: {
        isArray: true,
        typeInfo: TypeInfo.UpstreamSource
    },
    view: {
        typeInfo: TypeInfo.FeedView
    }
};

TypeInfo.FeedBatchData.fields = {
    operation: {
        enumType: TypeInfo.FeedBatchOperation
    }
};

TypeInfo.FeedChange.fields = {
    changeType: {
        enumType: TypeInfo.ChangeType
    },
    feed: {
        typeInfo: TypeInfo.Feed
    }
};

TypeInfo.FeedChangesResponse.fields = {
    feedChanges: {
        isArray: true,
        typeInfo: TypeInfo.FeedChange
    }
};

TypeInfo.FeedCore.fields = {
    capabilities: {
        enumType: TypeInfo.FeedCapabilities
    },
    upstreamSources: {
        isArray: true,
        typeInfo: TypeInfo.UpstreamSource
    },
    view: {
        typeInfo: TypeInfo.FeedView
    }
};

TypeInfo.FeedPermission.fields = {
    role: {
        enumType: TypeInfo.FeedRole
    }
};

TypeInfo.FeedUpdate.fields = {
    upstreamSources: {
        isArray: true,
        typeInfo: TypeInfo.UpstreamSource
    }
};

TypeInfo.FeedView.fields = {
    type: {
        enumType: TypeInfo.FeedViewType
    },
    visibility: {
        enumType: TypeInfo.FeedVisibility
    }
};

TypeInfo.GlobalPermission.fields = {
    role: {
        enumType: TypeInfo.GlobalRole
    }
};

TypeInfo.Metric.fields = {
    metricType: {
        enumType: TypeInfo.MetricType
    }
};

TypeInfo.MinimalPackageVersion.fields = {
    publishDate: {
        isDate: true,
    },
    views: {
        isArray: true,
        typeInfo: TypeInfo.FeedView
    }
};

TypeInfo.Package.fields = {
    versions: {
        isArray: true,
        typeInfo: TypeInfo.MinimalPackageVersion
    }
};

TypeInfo.PackageChange.fields = {
    package: {
        typeInfo: TypeInfo.Package
    },
    packageVersionChange: {
        typeInfo: TypeInfo.PackageVersionChange
    }
};

TypeInfo.PackageChangesResponse.fields = {
    packageChanges: {
        isArray: true,
        typeInfo: TypeInfo.PackageChange
    }
};

TypeInfo.PackageIdMetrics.fields = {
    lastDownloaded: {
        isDate: true,
    }
};

TypeInfo.PackageMetrics.fields = {
    aggregatedMetrics: {
        isArray: true,
        typeInfo: TypeInfo.Metric
    },
    segmentedMetrics: {
        isArray: true,
        typeInfo: TypeInfo.SegmentedMetric
    }
};

TypeInfo.PackageVersion.fields = {
    deletedDate: {
        isDate: true,
    },
    otherVersions: {
        isArray: true,
        typeInfo: TypeInfo.MinimalPackageVersion
    },
    publishDate: {
        isDate: true,
    },
    sourceChain: {
        isArray: true,
        typeInfo: TypeInfo.UpstreamSource
    },
    views: {
        isArray: true,
        typeInfo: TypeInfo.FeedView
    }
};

TypeInfo.PackageVersionChange.fields = {
    changeType: {
        enumType: TypeInfo.ChangeType
    },
    packageVersion: {
        typeInfo: TypeInfo.PackageVersion
    }
};

TypeInfo.PackageVersionMetrics.fields = {
    lastDownloaded: {
        isDate: true,
    }
};

TypeInfo.RecycleBinPackageVersion.fields = {
    deletedDate: {
        isDate: true,
    },
    otherVersions: {
        isArray: true,
        typeInfo: TypeInfo.MinimalPackageVersion
    },
    publishDate: {
        isDate: true,
    },
    scheduledPermanentDeleteDate: {
        isDate: true,
    },
    sourceChain: {
        isArray: true,
        typeInfo: TypeInfo.UpstreamSource
    },
    views: {
        isArray: true,
        typeInfo: TypeInfo.FeedView
    }
};

TypeInfo.SegmentedMetric.fields = {
    metrics: {
        isArray: true,
        typeInfo: TypeInfo.Metric
    },
    metricType: {
        enumType: TypeInfo.MetricType
    }
};

TypeInfo.UpstreamSource.fields = {
    deletedDate: {
        isDate: true,
    },
    upstreamSourceType: {
        enumType: TypeInfo.UpstreamSourceType
    }
};
