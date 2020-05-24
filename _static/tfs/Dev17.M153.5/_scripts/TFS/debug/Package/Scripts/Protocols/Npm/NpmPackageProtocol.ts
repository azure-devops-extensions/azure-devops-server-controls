import * as React from "react";

import * as Diag from "VSS/Diag";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import * as Actions from "Package/Scripts/Actions/Actions";
import { ProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";
import { PackageCommandIds } from "Feed/Common/Constants/Constants";
import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { isV2Feed } from "Package/Scripts/Helpers/FeedCapabilityHelper";
import * as PermissionHelper from "Package/Scripts/Helpers/PermissionHelper";
import { resolveUri } from "Package/Scripts/Helpers/UrlHelper";
import { BatchGenerator, IBatchIterator, TransformingBatchGenerator } from "Package/Scripts/Protocols/Common/BatchHandling";
import { DeleteCommandHelper } from "Package/Scripts/Protocols/Common/DeleteCommandHelper";
import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IPackageDetailsProps } from "Package/Scripts/Protocols/Common/IPackageDetailsProps";
import { IPackageProtocol, IPackageProtocolClient, isPackage } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import {
    DownloadPackageCommand,
    PromotePackageCommand,
    PromotePackagesCommand
} from "Package/Scripts/Protocols/Common/PackageCommands";
import { MinimalPackageDetails } from "Package/Scripts/Protocols/Common/WebApi/PackagingShared.Contracts";
import { DeprecatePackageCommand, DeprecatePackagesCommand } from "Package/Scripts/Protocols/Npm/Commands/NpmDeprecateCommand";
import { IndexIds, NpmKey } from "Package/Scripts/Protocols/Npm/Constants/NpmConstants";
import { NpmClientTool } from "Package/Scripts/Protocols/Npm/NpmClientTool";
import { NpmDataService } from "Package/Scripts/Protocols/Npm/NpmDataService";
import { NpmOverviewAttributesPanel } from "Package/Scripts/Protocols/Npm/NpmOverviewAttributesPanel";
import { NpmOverviewContentPanel } from "Package/Scripts/Protocols/Npm/NpmOverviewContentPanel";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedRole, FeedView, Package, PackageMetrics, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";
import { BowtieIconProps } from "Feed/Common/Utils/Icons";
import { getFullyQualifiedFeedId } from "Package/Scripts/Helpers/FeedNameResolver";

export class NpmPackageProtocol implements IPackageProtocol {
    private static readonly _icon = new BowtieIconProps("brand-npm");

    public readonly name = NpmKey;
    public readonly key = "Npm";
    get vssIconProps() {
        return NpmPackageProtocol._icon;
    }
    public supportedCommandsMask: ProtocolCommands =
        // tslint:disable-next-line:no-bitwise
        ProtocolCommands.Promote |
        ProtocolCommands.Delete |
        ProtocolCommands.Download |
        ProtocolCommands.Deprecate |
        ProtocolCommands.Undeprecate;

    public readonly clients: IPackageProtocolClient[] = [];
    private _dataService: NpmDataService;

    constructor() {
        const endpointProvider = this.initializeEndpointUrlProvider();
        this.clients.push(new NpmClientTool(endpointProvider));
    }

    get NpmDataService(): NpmDataService {
        if (!this._dataService) {
            this._dataService = Service.getLocalService(NpmDataService);
        }
        return this._dataService;
    }

    public getPackageMessage(packageSummary: Package, packageVersion: PackageVersion): string {
        if (packageVersion) {
            if (packageVersion.isDeleted) {
                return Utils_String.format(
                    PackageResources.PackageUnpublishedMessage,
                    packageVersion.version,
                    packageSummary.name
                );
            } else if (
                packageVersion.protocolMetadata &&
                packageVersion.protocolMetadata.data.deprecated &&
                packageVersion.protocolMetadata.data.deprecated.toLowerCase().trim() !== "false" &&
                packageVersion.protocolMetadata.data.deprecated.trim().length > 0
            ) {
                return Utils_String.format(
                    PackageResources.PackageDeprecatedMessage,
                    packageVersion.version,
                    packageSummary.name,
                    packageVersion.protocolMetadata.data.deprecated
                );
            }
        }
        return null;
    }

    public getOverviewAttributesPanel(
        feed: Feed,
        packageSummary: Package,
        packageVersion: PackageVersion,
        packageMetrics: PackageMetrics,
        isSmartDependenciesEnabled: boolean,
        isProvenanceEnabled: boolean
    ): React.ReactNode {
        return React.createElement(NpmOverviewAttributesPanel, {
            feed,
            packageSummary,
            packageVersion,
            protocol: this,
            isSmartDependenciesEnabled,
            packageMetrics,
            isProvenanceEnabled
        } as IPackageDetailsProps);
    }

    public getOverviewContentPanel(
        feed: Feed,
        feedViews: FeedView[],
        packageSummary: Package,
        packageVersion: PackageVersion
    ): React.ReactNode {
        return React.createElement(NpmOverviewContentPanel, {
            feed,
            feedViews,
            packageSummary,
            packageVersion,
            protocol: this
        } as IPackageDetailsProps);
    }

    public getMultiSelectPackageCommands(
        feed: Feed,
        selectedPackages?: Package[],
        selectedVersions?: PackageVersion[]
    ): IPackageCommand[] {
        const packageCommands: IPackageCommand[] = [];
        let cachedPackagesIncluded: boolean = false;

        const role: FeedRole = PermissionHelper.getUsersRoleForFromFeed(feed);
        if (role === FeedRole.None || role === FeedRole.Reader) {
            return packageCommands;
        }

        // Trim out cached packages for V1 feeds.
        if (!isV2Feed(feed)) {
            if (selectedPackages != null) {
                const selectedPackagesWithoutCached: Package[] = selectedPackages.filter(
                    (pkg: Package) => pkg.isCached !== true && pkg.versions[0].isCachedVersion !== true
                );
                if (selectedPackagesWithoutCached.length < selectedPackages.length) {
                    cachedPackagesIncluded = true;
                    selectedPackages = selectedPackagesWithoutCached;
                }
            }
            if (selectedVersions != null) {
                const selectedVersionsWithoutCached: PackageVersion[] = selectedVersions.filter(
                    (version: PackageVersion) => version.isCachedVersion !== true
                );
                if (selectedVersionsWithoutCached.length < selectedVersions.length) {
                    cachedPackagesIncluded = true;
                    selectedVersions = selectedVersionsWithoutCached;
                }
            }
        }

        if (selectedPackages && selectedPackages.length > 0) {
            // Promote
            // Only add Promote button on package list for v1
            packageCommands.push(new PromotePackagesCommand(selectedPackages));
        }

        if (selectedVersions && selectedVersions.length > 0) {
            // Deprecate selected versions
            const dialogProps = this._getDeprecateDialogProps(
                cachedPackagesIncluded,
                Utils_String.format(PackageResources.DeprecateDialog_HeaderText_VersionsList, selectedVersions.length),
                PackageResources.DeprecateDialog_ConfirmText_VersionsList,
                null,
                null,
                selectedVersions
            );
            packageCommands.push(
                new DeprecatePackagesCommand(
                    PackageCommandIds.Deprecate,
                    PackageResources.PackageCommands_Deprecate,
                    dialogProps
                )
            );
        } else if (selectedPackages && selectedPackages.length > 0) {
            // Deprecate latest version
            const dialogPropsLatest = this._getDeprecateDialogProps(
                cachedPackagesIncluded,
                PackageResources.DeprecateDialog_HeaderText_LatestVersion,
                PackageResources.DeprecateDialog_ConfirmText_PackageList,
                selectedPackages
            );
            packageCommands.push(
                new DeprecatePackagesCommand(
                    PackageCommandIds.DeprecateLatest,
                    PackageResources.PackageCommands_DeprecatePackage_Latest,
                    dialogPropsLatest
                )
            );
        }

        if (
            PermissionHelper.isAdministratorFromRole(role) &&
            ((selectedVersions && selectedVersions.length > 0) || (selectedPackages && selectedPackages.length > 0))
        ) {
            // Unpublish
            const unpublishCommands = DeleteCommandHelper.addDeleteCommands(
                NpmKey,
                selectedPackages,
                selectedVersions,
                true,
                null,
                cachedPackagesIncluded
            );
            packageCommands.push(...unpublishCommands);
        }

        return packageCommands;
    }

    // Get a list of available package commands for this protocol based on the user's role
    public getPackageCommands(
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        viaPackageList: boolean = false
    ): IPackageCommand[] {
        const packageCommands: IPackageCommand[] = [];
        if (packageVersion.isDeleted) {
            return packageCommands;
        }

        // Download
        const npmDataService: NpmDataService = Service.getLocalService(NpmDataService);
        const feedId = getFullyQualifiedFeedId(feed);
        const getDownloadContentUrl = () =>
            npmDataService.getDownloadContentUrl(feedId, packageSummary.normalizedName, packageVersion.version);
        const downloadPackageCommand = new DownloadPackageCommand(
            DownloadPackageCommand.onDownloadPackage,
            getDownloadContentUrl,
            packageSummary,
            packageVersion,
            feed,
            viaPackageList
        );
        packageCommands.push(downloadPackageCommand);

        const role: FeedRole = PermissionHelper.getUsersRoleForFromFeed(feed);
        if (
            role === FeedRole.Reader ||
            role === FeedRole.None ||
            (isV2Feed(feed) === false &&
                (packageSummary.isCached === true || packageSummary.versions[0].isCachedVersion === true))
        ) {
            return packageCommands;
        }

        // Promote
        packageCommands.push(
            new PromotePackageCommand(
                feed,
                packageSummary,
                packageVersion,
                PackageResources.PackageCommands_Protocol_Npm,
                viaPackageList
            )
        );

        // Deprecate
        packageCommands.push(new DeprecatePackageCommand(packageSummary, packageVersion, feed, viaPackageList));

        if (!PermissionHelper.isAdministratorFromRole(role)) {
            return packageCommands;
        }

        // Unpublish commands
        const selectedPackages: Package[] = viaPackageList ? [packageSummary] : null;
        const selectedVersions: PackageVersion[] = viaPackageList ? null : [packageVersion];
        const deleteCommands = DeleteCommandHelper.addDeleteCommands(
            NpmKey,
            selectedPackages,
            selectedVersions,
            true,
            packageSummary.name
        );
        packageCommands.push(...deleteCommands);

        return packageCommands;
    }

    public supportsUpstreams(feed?: Feed): boolean {
        return true;
    }

    public async deleteLatestVersions(feed: Feed, pkgs: Package[]): Promise<void> {
        try {
            const iterator = new TransformingBatchGenerator(pkgs, this.NpmDataService.batchSize, (pkg: Package) => {
                return {
                    id: pkg.name,
                    version: pkg.versions[0].normalizedVersion
                };
            });
            await this.NpmDataService.batchDelete(feed.id, iterator);
        } catch (error) {
            throw new Error(this.key);
        }
    }

    public async deletePackageVersions(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void> {
        Diag.Debug.assertParamIsObject(feed, "feed");
        Diag.Debug.assertParamIsObject(pkg, "pkg");
        Diag.Debug.assertParamIsObject(versions, "versions");

        const iterator = new TransformingBatchGenerator(
            versions,
            this.NpmDataService.batchSize,
            (packageVersion: PackageVersion) => {
                return {
                    id: pkg.name,
                    version: packageVersion.normalizedVersion
                };
            }
        );

        await this.NpmDataService.batchDelete(feed.id, iterator);
    }

    public async restorePackageVersionsToFeed(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void> {
        Diag.Debug.assertParamIsObject(feed, "feed");
        Diag.Debug.assertParamIsObject(pkg, "pkg");
        Diag.Debug.assertParamIsObject(versions, "versions");

        const iterator = new TransformingBatchGenerator(
            versions,
            this.NpmDataService.batchSize,
            (packageVersion: PackageVersion) => {
                return {
                    id: pkg.name,
                    version: packageVersion.normalizedVersion
                };
            }
        );

        await this.NpmDataService.batchRestoreToFeed(feed.id, iterator);
    }

    public async permanentlyDeletePackageVersions(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void>;
    public async permanentlyDeletePackageVersions(feed: Feed, packageVersions: MinimalPackageDetails[]): Promise<void>;
    public async permanentlyDeletePackageVersions(
        feed: Feed,
        pkgOrDetails: Package | MinimalPackageDetails[],
        versions?: PackageVersion[]
    ) {
        let iterator: IBatchIterator<MinimalPackageDetails[]>;
        if (isPackage(pkgOrDetails)) {
            const pkgName = pkgOrDetails.name;
            iterator = new TransformingBatchGenerator(
                versions,
                this.NpmDataService.batchSize,
                packageVersion => <MinimalPackageDetails>{ id: pkgName, version: packageVersion.normalizedVersion }
            );
        } else {
            iterator = new BatchGenerator(pkgOrDetails, this.NpmDataService.batchSize);
        }

        await this.NpmDataService.batchPermanentlyDelete(feed.id, iterator);
    }

    public promotePackageVersions(
        feed: Feed,
        feedView: FeedView,
        pkg: Package,
        versions: PackageVersion[]
    ): Promise<void>;
    public promotePackageVersions(
        feed: Feed,
        feedView: FeedView,
        packageVersions: MinimalPackageDetails[]
    ): Promise<void>;
    public async promotePackageVersions(
        feed: Feed,
        feedView: FeedView,
        pkgOrDetails: Package | MinimalPackageDetails[],
        versions?: PackageVersion[]
    ): Promise<void> {
        let iterator: IBatchIterator<MinimalPackageDetails[]>;
        if (isPackage(pkgOrDetails)) {
            const pkgName = pkgOrDetails.name;
            iterator = new TransformingBatchGenerator(
                versions,
                this.NpmDataService.batchSize,
                packageVersion => <MinimalPackageDetails>{ id: pkgName, version: packageVersion.normalizedVersion }
            );
        } else {
            iterator = new BatchGenerator(pkgOrDetails, this.NpmDataService.batchSize);
        }

        await this.NpmDataService.batchPromotePackages(feed.id, feedView.id, iterator);
    }

    private _getDeprecateDialogProps(
        cachedPackagesIncluded: boolean,
        headerText: string,
        confirmText: string,
        selectedPackages: Package[],
        allVersions?: boolean,
        selectedVersions?: PackageVersion[]
    ): IGeneralDialogProps {
        let defaultValue: string;
        if (selectedPackages) {
            const version = selectedPackages[0].versions[0] as PackageVersion;
            defaultValue =
                selectedPackages.length === 1 && version.protocolMetadata && version.protocolMetadata.data
                    ? version.protocolMetadata.data.deprecated
                    : null;
        } else if (selectedVersions) {
            defaultValue =
                selectedVersions.length === 1 &&
                    selectedVersions[0].protocolMetadata &&
                    selectedVersions[0].protocolMetadata.data
                    ? selectedVersions[0].protocolMetadata.data.deprecated
                    : null;
        }

        const dialogProps: IGeneralDialogProps = {
            headerText,
            confirmText,
            saveButtonText: PackageResources.PackageCommands_Deprecate,
            confirmTextLearnMoreLink: "https://docs.microsoft.com/en-us/vsts/package/npm/deprecate-unpublish",
            textField: true,
            textFieldDefaultValue: defaultValue,
            textFieldLabel: PackageResources.DeprecatePackageDialogMessage,
            textFieldPlaceholder: PackageResources.DeprecatePackageDialogPlaceholderMessage,
            onSavePrimaryButtonText: PackageResources.PackageCommands_Deprecate_Deprecating,
            onSaveCallback: (message: string) =>
                Actions.PackageVersionDeprecated.invoke({
                    message,
                    selectedPackages,
                    selectedVersions
                }),
            onDismissCallback: () => Actions.DialogOpenChanged.invoke(null),
            messageBarMessage: cachedPackagesIncluded
                ? PackageResources.DeprecateDialog_CannotDeprecateV1CachedPackages
                : null
        };

        return dialogProps;
    }

    public getCopyInstallCommand(feedName: string, pkgName: string, version: string, separator?: string): string {
        return `npm install ${pkgName}@${version}`;
    }

    private initializeEndpointUrlProvider(): EndpointProvider {
        const replacementString = "__FeedName__";
        const npmDataService = Service.getLocalService(NpmDataService);
        const endpointProvider = Service.getLocalService(EndpointProvider);
        endpointProvider.addEndpoint(
            () =>
                npmDataService
                    .getEndpointUrl(replacementString, IndexIds.NpmRegistryIndexId)
                    .then(resolveUri)
                    .then(this._appendSlashIfMissing),
            "registry",
            replacementString
        );

        if (npmDataService.requireMultipleTokenEndpoints()) {
            endpointProvider.addEndpoint(
                () =>
                    npmDataService
                        .getLegacyUrl(replacementString, IndexIds.NpmRegistryIndexId)
                        .then(resolveUri)
                        .then(this._appendSlashIfMissing),
                "legacyRegistry",
                replacementString
            );
        }

        endpointProvider.addEndpoint(
            () => npmDataService.getEndpointUrl(replacementString, IndexIds.NpmAreaIndexId).then(resolveUri),
            "area",
            replacementString
        );
        return endpointProvider;
    }

    private _appendSlashIfMissing(uri: string): string {
        if (uri && uri.length > 0) {
            if (uri.charAt(uri.length - 1) !== "/") {
                return uri + "/";
            }
        }
        return uri;
    }
}
