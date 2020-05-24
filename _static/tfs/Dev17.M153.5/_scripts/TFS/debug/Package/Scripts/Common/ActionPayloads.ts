import { MinimalPackageDetails } from "Package/Scripts/Protocols/Common/WebApi/PackagingShared.Contracts";
import { Feed as FeedUx } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedRetentionPolicy, FeedView, Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { IDependency } from "Feed/Common/Types/IDependency";

export interface IPackagePayload {
    packageSummary: Package;
    packageVersion: PackageVersion;
}

export interface IMultiCommandPackageDetails extends MinimalPackageDetails {
    protocolType: string;
}

export interface IPackagePromotedPayload {
    promotedView: FeedView;
    minimalPackageDetails: IMultiCommandPackageDetails[];
}

export interface IPackageListedStatusChangedPayload {
    packageId: string;
    isListed: boolean;
    isDeleted?: boolean;
}

export interface IPromotePanelPayload {
    selectedPackages?: Package[];
}

export interface IPackageSelectionChangedPayload {
    selectedPackages: Package[];
}

export interface IMultiCommandPayload {
    /**
     * Provide selectedPackages in the package list
     */
    selectedPackages?: Package[];
    /**
     * Provide selectedVersions in the version list
     */
    selectedVersions?: PackageVersion[];
}

export interface IPackageListedPayload extends IMultiCommandPayload {
    /**
     * Indicates whether to unlist or relist
     */
    isListed: boolean;
}

export interface IPackageDeletedPayload extends IMultiCommandPayload {
    /**
     * Provide with selectedVersions
     */
    protocolType?: string;
}

export interface IPackageDeprecatedPayload extends IMultiCommandPayload {
    /**
     * Deprecation message. Null undepredates.
     */
    message?: string;
    /**
     * Provide selectedVersion for the single dialog handling
     */
    selectedVersion?: PackageVersion;
}

export interface IPackageVersionSelectedPayload {
    /**
     * Selected version.
     */
    version: PackageVersion;
    /**
     * Selected view filter.
     */
    viewName?: string;
}

export interface INewFeedCreatedPayload {
    /**
     * Feed which was created
     */
    createdFeed: FeedUx;
}

export interface IFeedRetentionPolicyUpdatedPayload {
    /**
     * Id of the feed whos policy was updated
     */
    feedId: string;
    /**
     * The updated policy
     */
    retentionPolicy: FeedRetentionPolicy;
}

export interface IPackageDependencySelectedPayload {
    /**
     * Selected dependency.
     */
    dependency: IDependency;
    /**
     * Package that user is navigating from.
     */
    originPackage: Package;
}
