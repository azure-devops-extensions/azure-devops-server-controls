import * as React from "react";

import { IVssIconProps } from "VSSUI/VssIcon";

import { MinimalPackageDetails } from "Package/Scripts/Protocols/Common/WebApi/PackagingShared.Contracts";
import { HubAction } from "Package/Scripts/Types/IHubState";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedView, Package, PackageMetrics, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export interface IPackageProtocol {
    name: string;
    key: string;
    vssIconProps: IVssIconProps;
    supportedCommandsMask: number;
    clients: IPackageProtocolClient[];

    getOverviewAttributesPanel(
        feed: Feed,
        packageSummary: Package,
        packageVersion: PackageVersion,
        packageMetrics: PackageMetrics,
        isSmartDependenciesEnabled: boolean,
        isProvenanceEnabled: boolean
    ): React.ReactNode;

    getOverviewContentPanel(
        feed: Feed,
        feedViews: FeedView[],
        packageSummary: Package,
        packageVersion: PackageVersion
    ): React.ReactNode;

    /**
     * Provide selectedPackages on package list
     * Provide selectedVersions on versions list
     */
    getMultiSelectPackageCommands(
        feed: Feed,
        selectedPackages?: Package[],
        selectedVersions?: PackageVersion[]
    ): IPackageCommand[];

    getPackageCommands(
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        viaPackageList: boolean
    ): IPackageCommand[];

    /**
     * @param packageSummary The selected package to get the message for
     * @param packageVersion The version of the package
     * Note: This method is being skipped for the recycle bin page. This is because
     * for recycle bin we should not show the deleted/deprecated message. If other
     * messages are added that should be on the recycle bin page make sure that the
     * deleted/deprecated messages don't show up.
     */
    getPackageMessage(packageSummary: Package, packageVersion: PackageVersion): string;

    supportsUpstreams(feed?: Feed): boolean;

    /// Delete Operations
    deleteLatestVersions(feed: Feed, pkgs: Package[]): Promise<void>;

    deletePackageVersions(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void>;

    restorePackageVersionsToFeed(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void>;

    permanentlyDeletePackageVersions(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void>;
    permanentlyDeletePackageVersions(feed: Feed, packageVersions: MinimalPackageDetails[]): Promise<void>;

    promotePackageVersions(feed: Feed, feedView: FeedView, pkg: Package, versions: PackageVersion[]): Promise<void>;
    promotePackageVersions(feed: Feed, feedView: FeedView, packageVersions: MinimalPackageDetails[]): Promise<void>;

    getCopyInstallCommand(feedName: string, pkgName: string, version: string, separator?: string): string;
}

export interface IPackageProtocolClient {
    name: string;
    vssIconProps?: IVssIconProps;

    getConnectPanel(feed: Feed, feedViews: FeedView[], hubAction: HubAction): React.ReactNode;
}

export function isPackage(obj: Package | MinimalPackageDetails[]): obj is Package {
    return !Array.isArray(obj);
}
