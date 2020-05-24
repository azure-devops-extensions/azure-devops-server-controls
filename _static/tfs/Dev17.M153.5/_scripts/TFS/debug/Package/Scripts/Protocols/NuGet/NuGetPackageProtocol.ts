import * as React from "react";

import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import * as Actions from "Package/Scripts/Actions/Actions";
import { ProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";
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
import { RelistPackageCommand, RelistPackagesCommand } from "Package/Scripts/Protocols/NuGet/Commands/NuGetRelistCommand";
import { UnlistPackageCommand, UnlistPackagesCommand } from "Package/Scripts/Protocols/NuGet/Commands/NuGetUnlistCommand";
import { IndexIds, NuGetKey } from "Package/Scripts/Protocols/NuGet/Constants/NuGetConstants";
import { NuGetClientTool } from "Package/Scripts/Protocols/NuGet/NuGetClientTool";
import { NuGetDataService } from "Package/Scripts/Protocols/NuGet/NuGetDataService";
import { NuGetOverviewAttributesPanel } from "Package/Scripts/Protocols/NuGet/NuGetOverviewAttributesPanel";
import { NuGetOverviewContentPanel } from "Package/Scripts/Protocols/NuGet/NuGetOverviewContentPanel";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedRole, FeedView, Package, PackageMetrics, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import { PackageCommandIds } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";
import { BowtieIconProps } from "Feed/Common/Utils/Icons";
import { getFullyQualifiedFeedId } from "Package/Scripts/Helpers/FeedNameResolver";

export class NuGetPackageProtocol implements IPackageProtocol {
    private static readonly _icon = new BowtieIconProps("brand-nuget");

    public readonly name = "NuGet";
    public readonly key = "NuGet";
    get vssIconProps() {
        return NuGetPackageProtocol._icon;
    }
    public supportedCommandsMask: ProtocolCommands =
        // tslint:disable-next-line:no-bitwise
        ProtocolCommands.Promote |
        ProtocolCommands.Delete |
        ProtocolCommands.Download |
        ProtocolCommands.Unlist |
        ProtocolCommands.Relist |
        ProtocolCommands.Restore |
        ProtocolCommands.PermanentDelete;
    public readonly clients: IPackageProtocolClient[] = [];

    private _nugetDataService: NuGetDataService;

    constructor() {
        const endpointProvider = this.initializeEndpointUrlProvider();
        this.clients.push(new NuGetClientTool(endpointProvider));
    }

    get NuGetDataService(): NuGetDataService {
        if (!this._nugetDataService) {
            this._nugetDataService = Service.getLocalService(NuGetDataService);
        }
        return this._nugetDataService;
    }

    public getPackageMessage(packageSummary: Package, packageVersion: PackageVersion): string {
        if (packageVersion && !packageVersion.isListed) {
            if (packageVersion.isDeleted) {
                return Utils_String.format(
                    PackageResources.PackageDeletedMessage,
                    packageVersion.version,
                    packageSummary.name
                );
            } else {
                return Utils_String.format(
                    PackageResources.PackageUnlistedMessage,
                    packageVersion.version,
                    packageSummary.name
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
        return React.createElement(NuGetOverviewAttributesPanel, {
            feed,
            packageSummary,
            packageVersion,
            protocol: this,
            packageMetrics,
            isSmartDependenciesEnabled,
            isProvenanceEnabled
        } as IPackageDetailsProps);
    }

    public getOverviewContentPanel(
        feed: Feed,
        feedViews: FeedView[],
        packageSummary: Package,
        packageVersion: PackageVersion
    ): React.ReactNode {
        return React.createElement(NuGetOverviewContentPanel, {
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
        const packageCommands = new Array<IPackageCommand>();
        let cachedPackagesIncluded: boolean = false;

        const role: FeedRole = PermissionHelper.getUsersRoleForFromFeed(feed);
        if (role === FeedRole.None || role === FeedRole.Reader) {
            return packageCommands;
        }

        // Trim out npm cached packages for V1 feeds. (Must do it here as well because there is a chance of mixed protocols)
        if (!isV2Feed(feed)) {
            if (selectedPackages !== null) {
                const selectedPackagesWithoutCached: Package[] = selectedPackages.filter(
                    (pkg: Package) => pkg.isCached !== true && pkg.versions[0].isCachedVersion !== true
                );
                if (selectedPackagesWithoutCached.length < selectedPackages.length) {
                    cachedPackagesIncluded = true;
                    selectedPackages = selectedPackagesWithoutCached;
                }
            } else if (selectedVersions !== null) {
                const selectedVersionsWithoutCached: PackageVersion[] = selectedVersions.filter(
                    (version: PackageVersion) => version.isCachedVersion !== true
                );
                if (selectedVersionsWithoutCached.length < selectedVersions.length) {
                    cachedPackagesIncluded = true;
                    selectedVersions = selectedVersionsWithoutCached;
                }
            }
        }

        let isListed: boolean = false;
        if (selectedPackages && selectedPackages.length > 0) {
            // Promote
            // Only add Promote button on package list for v1
            packageCommands.push(new PromotePackagesCommand(selectedPackages));

            isListed = selectedPackages.some((pkg: Package) => pkg.versions[0].isListed);
        } else if (selectedVersions) {
            isListed = selectedVersions.some((version: PackageVersion) => version.isListed);
        }

        if (!isListed) {
            // Relist
            const relistCommands = this._handleUnlistCommand(false, selectedPackages, selectedVersions);
            packageCommands.push(...relistCommands);
        } else {
            // Unlist
            const unlistCommands = this._handleUnlistCommand(true, selectedPackages, selectedVersions);
            packageCommands.push(...unlistCommands);
        }

        if (PermissionHelper.isAdministratorFromRole(role)) {
            const deleteCommands = DeleteCommandHelper.addDeleteCommands(
                NuGetKey,
                selectedPackages,
                selectedVersions,
                null /*unpublish*/,
                null /*packageName*/,
                cachedPackagesIncluded
            );
            packageCommands.push(...deleteCommands);
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
        const packageCommands = new Array<IPackageCommand>();

        if (packageVersion.isDeleted) {
            return packageCommands;
        }

        // Download
        // If we make the call to get the url after the button is clicked, the browser will block the new window popup.
        // So we get the download url as soon as the package commands show up, this way the promise will already be resolved when the button is clicked.
        const nuGetDataService = Service.getLocalService(NuGetDataService);
        const feedId = getFullyQualifiedFeedId(feed);
        const getDownloadPackageVersionContentUrl = () =>
            nuGetDataService.getDownloadPackageVersionContentUrl(
                feedId,
                packageSummary.normalizedName,
                packageVersion.normalizedVersion
            );

        const downloadPackageCommand = new DownloadPackageCommand(
            DownloadPackageCommand.onDownloadPackage,
            getDownloadPackageVersionContentUrl,
            packageSummary,
            packageVersion,
            feed,
            viaPackageList
        );
        packageCommands.push(downloadPackageCommand);

        const role: FeedRole = PermissionHelper.getUsersRoleForFromFeed(feed);
        if (role === FeedRole.None || role === FeedRole.Reader) {
            return packageCommands;
        }

        // Promote
        packageCommands.push(
            new PromotePackageCommand(
                feed,
                packageSummary,
                packageVersion,
                PackageResources.PackageCommands_Protocol_NuGet,
                viaPackageList
            )
        );

        if (!packageVersion.isListed) {
            // Relist
            packageCommands.push(
                new RelistPackageCommand(
                    RelistPackageCommand.onRelistPackage,
                    packageSummary,
                    packageVersion,
                    feed,
                    viaPackageList
                )
            );
        } else {
            // Unlist
            packageCommands.push(
                new UnlistPackageCommand(
                    UnlistPackageCommand.onUnlistPackage,
                    packageSummary,
                    packageVersion,
                    feed,
                    viaPackageList
                )
            );
        }

        if (PermissionHelper.isAdministratorFromRole(role)) {
            // Delete
            const selectedPackages: Package[] = viaPackageList ? [packageSummary] : null;
            const selectedVersions: PackageVersion[] = viaPackageList ? null : [packageVersion];
            const deleteCommands = DeleteCommandHelper.addDeleteCommands(
                NuGetKey,
                selectedPackages,
                selectedVersions,
                null,
                packageSummary.name
            );
            packageCommands.push(...deleteCommands);
        }

        return packageCommands;
    }

    public supportsUpstreams(feed?: Feed): boolean {
        const validCapability = feed ? isV2Feed(feed) : true;
        return validCapability;
    }

    public async deleteLatestVersions(feed: Feed, pkgs: Package[]): Promise<void> {
        try {
            const iterator = new TransformingBatchGenerator(pkgs, this.NuGetDataService.batchSize, (pkg: Package) => {
                return {
                    id: pkg.name,
                    version: pkg.versions[0].normalizedVersion
                };
            });
            await this.NuGetDataService.batchDelete(feed.id, iterator);
        } catch (error) {
            throw new Error(this.key);
        }
    }

    public deletePackageVersions(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void> {
        const iterator = new TransformingBatchGenerator(
            versions,
            this.NuGetDataService.batchSize,
            (packageVersion: PackageVersion) => {
                return {
                    id: pkg.name,
                    version: packageVersion.normalizedVersion
                };
            }
        );
        return this.NuGetDataService.batchDelete(feed.id, iterator);
    }

    public restorePackageVersionsToFeed(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void> {
        const iterator = new TransformingBatchGenerator(
            versions,
            this.NuGetDataService.batchSize,
            (packageVersion: PackageVersion) => {
                return {
                    id: pkg.name,
                    version: packageVersion.normalizedVersion
                };
            }
        );
        return this.NuGetDataService.batchRestoreToFeed(feed.id, iterator);
    }

    public permanentlyDeletePackageVersions(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void>;
    public permanentlyDeletePackageVersions(feed: Feed, packageVersions: MinimalPackageDetails[]): Promise<void>;
    public permanentlyDeletePackageVersions(
        feed: Feed,
        pkgOrDetails: Package | MinimalPackageDetails[],
        versions?: PackageVersion[]
    ) {
        let iterator: IBatchIterator<MinimalPackageDetails[]>;
        if (isPackage(pkgOrDetails)) {
            const pkgName = pkgOrDetails.name;
            iterator = new TransformingBatchGenerator(
                versions,
                this.NuGetDataService.batchSize,
                packageVersion => <MinimalPackageDetails>{ id: pkgName, version: packageVersion.normalizedVersion }
            );
        } else {
            iterator = new BatchGenerator(pkgOrDetails, this.NuGetDataService.batchSize);
        }

        return this.NuGetDataService.batchPermanentlyDelete(feed.id, iterator);
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
                this.NuGetDataService.batchSize,
                packageVersion => <MinimalPackageDetails>{ id: pkgName, version: packageVersion.normalizedVersion }
            );
        } else {
            iterator = new BatchGenerator(pkgOrDetails, this.NuGetDataService.batchSize);
        }

        await this.NuGetDataService.batchPromotePackages(feed.id, feedView.id, iterator);
    }

    public getCopyInstallCommand(feedName: string, pkgName: string, version: string, separator: string = " "): string {
        return `Install-Package ${pkgName}${separator}-version ${version}`;
    }

    private _getUnlistDialogProps(
        headerText: string,
        confirmText: string,
        saveButtonText: string,
        savingButtonText: string,
        onSaveCallback: () => void,
        onDismissCallback: () => void
    ): IGeneralDialogProps {
        const dialogProps: IGeneralDialogProps = {
            headerText,
            confirmText,
            saveButtonText,
            confirmTextLearnMoreLink: "https://docs.microsoft.com/en-us/vsts/package/nuget/unlist-delete",
            onSavePrimaryButtonText: savingButtonText,
            onSaveCallback,
            onDismissCallback
        };

        return dialogProps;
    }

    private _handleUnlistCommand(
        unlist: boolean,
        selectedPackages?: Package[],
        selectedVersions?: PackageVersion[]
    ): IPackageCommand[] {
        let displayText: string = null;
        const packageCommands: IPackageCommand[] = [];
        const saveButtonText = unlist
            ? PackageResources.PackageCommands_UnlistPackage
            : PackageResources.PackageCommands_RelistPackage;
        const savingButtonText = unlist
            ? PackageResources.PackageCommands_UnlistPackage_Unlisting
            : PackageResources.PackageCommands_RelistPackage_Relisting;
        const onSaveCallback = () =>
            Actions.PackageListedChanged.invoke({
                selectedPackages,
                selectedVersions,
                isListed: unlist ? false : true
            });
        const onDismissCallback = () => Actions.DialogOpenChanged.invoke(null);

        if (selectedVersions) {
            // Unlist/Relist selected versions
            displayText = unlist
                ? PackageResources.PackageCommands_UnlistPackage
                : PackageResources.PackageCommands_RelistPackage;
            const headerText = Utils_String.format(
                unlist
                    ? PackageResources.UnlistDialog_HeaderText_VersionsList
                    : PackageResources.RelistDialog_HeaderText_VersionsList,
                selectedVersions.length
            );
            const confirmText = unlist
                ? PackageResources.UnlistDialog_ConfirmText_VersionsList
                : PackageResources.RelistDialog_ConfirmText_VersionsList;

            const unlistDialogProps = this._getUnlistDialogProps(
                headerText,
                confirmText,
                saveButtonText,
                savingButtonText,
                onSaveCallback,
                onDismissCallback
            );
            packageCommands.push(
                unlist
                    ? new UnlistPackagesCommand(PackageCommandIds.Unlist, displayText, unlistDialogProps)
                    : new RelistPackagesCommand(PackageCommandIds.Relist, displayText, unlistDialogProps)
            );
        } else if (selectedPackages) {
            if (selectedPackages.length > 1) {
                // Unlist latest version
                const unlistLatestDialogProps = this._getUnlistDialogProps(
                    unlist
                        ? PackageResources.UnlistDialog_HeaderText_LatestVersion
                        : PackageResources.RelistDialog_HeaderText_LatestVersion,
                    unlist
                        ? PackageResources.UnlistDialog_ConfirmText_LatestVersion
                        : PackageResources.RelistDialog_ConfirmText_LatestVersion,
                    saveButtonText,
                    savingButtonText,
                    onSaveCallback,
                    onDismissCallback
                );
                displayText = unlist
                    ? PackageResources.PackageCommands_UnlistPackage_Latest
                    : PackageResources.PackageCommands_RelistPackage_Latest;
                packageCommands.push(
                    unlist
                        ? new UnlistPackagesCommand(
                            PackageCommandIds.UnlistLatest,
                            displayText,
                            unlistLatestDialogProps
                        )
                        : new RelistPackagesCommand(
                            PackageCommandIds.RelistLatest,
                            displayText,
                            unlistLatestDialogProps
                        )
                );
            }
        }

        return packageCommands;
    }

    private initializeEndpointUrlProvider(): EndpointProvider {
        const endpointProvider = Service.getLocalService(EndpointProvider);
        const replacementString = "__FeedName__";
        endpointProvider.addEndpoint(
            () => this._getServiceIndexUrl(replacementString, IndexIds.NuGetV2IndexId),
            "V2",
            replacementString
        );
        endpointProvider.addEndpoint(
            () => this._getServiceIndexUrl(replacementString, IndexIds.NuGetV3IndexId),
            "V3",
            replacementString
        );
        return endpointProvider;
    }

    private _getServiceIndexUrl(feedId: string, locationId: string): IPromise<string> {
        const nuGetDataService = Service.getLocalService(NuGetDataService);
        return nuGetDataService.getServiceIndexUrl(feedId, locationId).then(resolveUri);
    }
}
