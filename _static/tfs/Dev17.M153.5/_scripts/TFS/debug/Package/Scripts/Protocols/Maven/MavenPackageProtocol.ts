import * as React from "react";

import * as Diag from "VSS/Diag";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import { ProtocolCommands } from "Package/Scripts/Common/ProtocolCommands";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import * as PermissionHelper from "Package/Scripts/Helpers/PermissionHelper";
import { resolveUri } from "Package/Scripts/Helpers/UrlHelper";
import {
    BatchException,
    BatchExecutor,
    BatchGenerator,
    IBatchIterator,
    TransformingBatchGenerator
} from "Package/Scripts/Protocols/Common/BatchHandling";
import { DeleteCommandHelper } from "Package/Scripts/Protocols/Common/DeleteCommandHelper";
import { EndpointProvider } from "Package/Scripts/Protocols/Common/EndpointProvider";
import { IPackageDetailsProps } from "Package/Scripts/Protocols/Common/IPackageDetailsProps";
import { IPackageProtocol, IPackageProtocolClient, isPackage } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import { MinimalPackageDetails } from "Package/Scripts/Protocols/Common/WebApi/PackagingShared.Contracts";
import { MavenKey } from "Package/Scripts/Protocols/Maven/Constants/MavenConstants";
import { GradleClientTool } from "Package/Scripts/Protocols/Maven/GradleClientTool";
import { MavenClientTool } from "Package/Scripts/Protocols/Maven/MavenClientTool";
import * as MavenInstallTextHelper from "Package/Scripts/Protocols/Maven/MavenInstallTextHelper";
import { MavenOverviewAttributesPanel } from "Package/Scripts/Protocols/Maven/MavenOverviewAttributesPanel";
import { IMavenPackageDetailsProps, MavenOverviewContentPanel } from "Package/Scripts/Protocols/Maven/MavenOverviewContentPanel";
import * as MavenContracts from "Package/Scripts/Protocols/Maven/WebApi/VSS.Maven.Contracts";
import { MavenHttpClient } from "Package/Scripts/Protocols/Maven/WebApi/VSS.Maven.CustomWebApi";
import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { FeedRole, FeedView, Package, PackageMetrics, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";
import { BowtieIconProps } from "Feed/Common/Utils/Icons";

import { MavenDataService } from "./MavenDataService";

export class MavenPackageProtocol implements IPackageProtocol {
    private static readonly _icon = new BowtieIconProps("brand-maven");

    public readonly name = "Maven";
    public readonly key = MavenKey;
    get vssIconProps() {
        return MavenPackageProtocol._icon;
    }
    public supportedCommandsMask: ProtocolCommands = ProtocolCommands.Delete;
    public readonly clients: IPackageProtocolClient[] = [];

    private _endpointProvider: EndpointProvider;
    private _dataService: MavenDataService;

    constructor() {
        this._endpointProvider = this.initializeEndpointUrlProvider();
        this.clients.push(new MavenClientTool(this._endpointProvider), new GradleClientTool(this._endpointProvider));
    }

    get MavenDataService() {
        if (!this._dataService) {
            this._dataService = Service.getLocalService(MavenDataService);
        }
        return this._dataService;
    }

    public getPackageMessage(packageSummary: Package, packageVersion: PackageVersion): string {
        if (packageVersion && packageVersion.isDeleted) {
            return Utils_String.format(
                PackageResources.PackageDeletedMessage,
                packageVersion.version,
                packageSummary.name
            );
        }
    }

    public getOverviewAttributesPanel(
        feed: Feed,
        packageSummary: Package,
        packageVersion: PackageVersion,
        packageMetrics: PackageMetrics,
        isSmartDependenciesEnabled: boolean,
        isProvenanceEnabled: boolean
    ): React.ReactNode {
        return React.createElement(MavenOverviewAttributesPanel, {
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
        return React.createElement(MavenOverviewContentPanel, {
            feed,
            feedViews,
            packageSummary,
            packageVersion,
            protocol: this,
            endpointProvider: this._endpointProvider,
            minimumSnapshotInstanceCount: this.getMinimumSnapshotInstanceCount()
        } as IMavenPackageDetailsProps);
    }

    public getMultiSelectPackageCommands(
        feed: Feed,
        selectedPackages?: Package[],
        selectedVersions?: PackageVersion[]
    ): IPackageCommand[] {
        return null;
    }

    // get a list of available package commands for this protocol based on the user's role
    public getPackageCommands(
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        viaPackageList: boolean = false
    ): IPackageCommand[] {
        let packageCommands: IPackageCommand[] = [];

        if (packageVersion.isDeleted) {
            return packageCommands;
        }

        const role: FeedRole = PermissionHelper.getUsersRoleForFromFeed(feed);

        const webPageDataService: HubWebPageDataService = Service.getService(HubWebPageDataService);

        if (PermissionHelper.isAdministratorFromRole(role) === false || !webPageDataService.isMavenDeleteUIEnabled()) {
            return packageCommands;
        }

        if (viaPackageList) {
            packageCommands = DeleteCommandHelper.addDeleteCommands(
                MavenKey,
                [packageSummary],
                null,
                false,
                packageSummary.name
            );
        } else {
            // Include packageSummary as well to be able to read protocolType
            packageCommands = DeleteCommandHelper.addDeleteCommands(
                MavenKey,
                [packageSummary],
                [packageVersion],
                false,
                packageSummary.name
            );
        }

        return packageCommands;
    }

    public supportsUpstreams(feed?: Feed): boolean {
        return false;
    }

    public async deleteLatestVersions(feed: Feed, pkgs: Package[]): Promise<void> {
        try {
            Diag.Debug.assertParamIsObject(feed, "feed");
            Diag.Debug.assertParamIsArray(pkgs, "pkg");

            const batches = new BatchGenerator(pkgs, 1);
            await BatchExecutor.executeInParallel(batches, async (batchOfSinglePackage: Package[]) => {
                const pkg = batchOfSinglePackage[0];
                const pomGav = this.toPomGav({ id: pkg.name, version: pkg.versions[0].normalizedVersion });
                await this.MavenDataService.deletePackageVersion(
                    feed.id,
                    pomGav.groupId,
                    pomGav.artifactId,
                    pomGav.version
                );
            });
        } catch (error) {
            const batchError = error as BatchException<void>;
            if (batchError.errorResults && batchError.errorResults.length) {
                throw batchError.errorResults[0];
            } else {
                throw new Error(this.name);
            }
        }
    }

    public async deletePackageVersions(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void> {
        try {
            Diag.Debug.assertParamIsObject(feed, "feed");
            Diag.Debug.assertParamIsObject(pkg, "pkg");
            Diag.Debug.assertParamIsObject(versions, "versions");

            const iterator = new TransformingBatchGenerator(versions, 1, packageVersion => {
                const { groupId, artifactId, version } = this.toPomGav({
                    id: pkg.name,
                    version: packageVersion.normalizedVersion
                });
                return <MavenContracts.MavenMinimalPackageDetails>{
                    group: groupId,
                    artifact: artifactId,
                    version
                };
            });

            await BatchExecutor.executeInParallel(iterator, async minPackageDetailsArray => {
                const packageDetails = minPackageDetailsArray[0];
                await this.MavenDataService.deletePackageVersion(
                    feed.id,
                    packageDetails.group,
                    packageDetails.artifact,
                    packageDetails.version
                );
            });
        } catch (error) {
            const batchError = error as BatchException<void>;
            if (batchError.errorResults && batchError.errorResults.length) {
                throw batchError.errorResults[0];
            } else {
                throw new Error(this.name);
            }
        }
    }

    public async restorePackageVersionsToFeed(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void> {
        Diag.Debug.assertParamIsObject(feed, "feed");
        Diag.Debug.assertParamIsObject(pkg, "pkg");
        Diag.Debug.assertParamIsObject(versions, "versions");

        const iterator = new TransformingBatchGenerator(versions, this.MavenDataService.batchSize, packageVersion => {
            const { groupId, artifactId, version } = this.toPomGav({
                id: pkg.name,
                version: packageVersion.normalizedVersion
            });
            return <MavenContracts.MavenMinimalPackageDetails>{
                group: groupId,
                artifact: artifactId,
                version
            };
        });

        await this.MavenDataService.batchRestoreToFeed(feed.id, iterator);
    }

    public async permanentlyDeletePackageVersions(feed: Feed, pkg: Package, versions: PackageVersion[]): Promise<void>;
    public async permanentlyDeletePackageVersions(feed: Feed, packageVersions: MinimalPackageDetails[]): Promise<void>;
    public async permanentlyDeletePackageVersions(
        feed: Feed,
        pkgOrDetails: Package | MinimalPackageDetails[],
        versions?: PackageVersion[]
    ) {
        let iterator: IBatchIterator<MavenContracts.MavenMinimalPackageDetails[]>;
        if (isPackage(pkgOrDetails)) {
            const pkg = pkgOrDetails;
            iterator = new TransformingBatchGenerator(versions, this.MavenDataService.batchSize, packageVersion => {
                const { groupId, artifactId, version } = this.toPomGav({
                    id: pkg.name,
                    version: packageVersion.normalizedVersion
                });
                return <MavenContracts.MavenMinimalPackageDetails>{
                    group: groupId,
                    artifact: artifactId,
                    version
                };
            });
        } else {
            const packageVersions = pkgOrDetails;
            iterator = new TransformingBatchGenerator(
                packageVersions,
                this.MavenDataService.batchSize,
                packageVersion => {
                    const { groupId, artifactId, version } = this.toPomGav(packageVersion);
                    return <MavenContracts.MavenMinimalPackageDetails>{
                        group: groupId,
                        artifact: artifactId,
                        version
                    };
                }
            );
        }

        await this.MavenDataService.batchPermanentlyDelete(feed.id, iterator);
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
    public promotePackageVersions(
        feed: Feed,
        feedView: FeedView,
        pkgOrDetails: Package | MinimalPackageDetails[],
        versions?: PackageVersion[]
    ): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public getCopyInstallCommand(feedName: string, pkgName: string, version: string, separator?: string): string {
        return MavenInstallTextHelper.getMavenPackageInstallText(version, pkgName);
    }

    private initializeEndpointUrlProvider(): EndpointProvider {
        const replacementString: string = "__FeedName__";
        const mavenHttpClient: MavenHttpClient = Service.getClient<MavenHttpClient>(MavenHttpClient);
        const endpointProvider = Service.getLocalService(EndpointProvider);
        endpointProvider.addEndpoint(
            () => mavenHttpClient.getEndpointUrl(replacementString).then(resolveUri),
            MavenKey,
            replacementString
        );
        return endpointProvider;
    }

    private getMinimumSnapshotInstanceCount(): number {
        const webPageDataService: HubWebPageDataService = Service.getService(HubWebPageDataService);
        return webPageDataService.minimumSnapshotInstanceCount();
    }

    private toPomGav(packageDetails: MinimalPackageDetails): MavenContracts.MavenPomGav {
        Diag.Debug.assertParamIsObject(packageDetails, "packageVersion");

        // Maven packages are of the form groupId:artifactId. Anything other than that are rejected.
        const nameParts = (packageDetails.id || "").split(":");
        if (nameParts.length !== 2) {
            throw new Error(PackageResources.MavenOverview_InvalidPackageError);
        }

        return <MavenContracts.MavenPomGav>{
            groupId: nameParts[0],
            artifactId: nameParts[1],
            version: packageDetails.version
        };
    }
}
