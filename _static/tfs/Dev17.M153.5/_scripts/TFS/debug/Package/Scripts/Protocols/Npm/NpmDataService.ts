import * as Service from "VSS/Service";

import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { BatchExecutor, IBatchIterator } from "Package/Scripts/Protocols/Common/BatchHandling";
import { MinimalPackageDetails } from "Package/Scripts/Protocols/Common/WebApi/PackagingShared.Contracts";
import * as NpmPackageDetails from "Package/Scripts/Protocols/Npm/NpmPackageDetails";
import { NpmPackagesBatchRequest } from "Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.Contracts";
import * as VSS_Npm_Contracts from "Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.Contracts";
import { NpmHttpClient } from "Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.CustomWebApi";

export interface INpmReadmeContent {
    packageName: string;
    packageVersion: string;
    rawReadmeContent: string;
}

export class NpmDataService extends Service.VssService {
    private _npmHttpClient = Service.getClient<NpmHttpClient>(NpmHttpClient);
    private _npmHttpClientLegacy: NpmHttpClient = null;
    private _npmReadmeContent: INpmReadmeContent = null;

    get batchSize() {
        return Service.getLocalService(HubWebPageDataService).getBatchOperationPageSize();
    }

    get legacyClient() {
        if (this._npmHttpClientLegacy == null) {
            let legacyUrl = Service.getLocalService(HubWebPageDataService).legacyPkgUrl();
            this._npmHttpClientLegacy = new NpmHttpClient(legacyUrl);
        }
        this._npmHttpClientLegacy.authTokenManager = this._npmHttpClient.authTokenManager;
        return this._npmHttpClientLegacy;
    }

    public updatePackages(npmBatchRequest: NpmPackagesBatchRequest, feedId: string): IPromise<void> {
        return this._npmHttpClient.updatePackages(npmBatchRequest, feedId);
    }

    public updateRecycleBinPackages(npmBatchRequest: NpmPackagesBatchRequest, feedId: string): IPromise<void> {
        return this._npmHttpClient.updateRecycleBinPackages(npmBatchRequest, feedId);
    }

    public updatePackage(
        npmPackageVersionDetails: NpmPackageDetails.PackageVersionDetails,
        feedId: string,
        packageName: string,
        packageVersion: string
    ): IPromise<VSS_Npm_Contracts.Package> {
        return this._npmHttpClient.updatePackage(npmPackageVersionDetails, feedId, packageName, packageVersion);
    }

    public unpublishPackage(
        feedId: string,
        packageName: string,
        packageVersion: string
    ): IPromise<VSS_Npm_Contracts.Package> {
        return this._npmHttpClient.unpublishPackage(feedId, packageName, packageVersion);
    }

    public async getReadmeUnscopedPackage(
        feedId: string,
        packageName: string,
        packageVersion: string
    ): Promise<INpmReadmeContent> {
        if (
            this._npmReadmeContent != null &&
            this._npmReadmeContent.packageName === packageName &&
            this._npmReadmeContent.packageVersion === packageVersion
        ) {
            return this._npmReadmeContent;
        }

        return this._npmHttpClient.getReadmeUnscopedPackage(feedId, packageName, packageVersion).then(
            rawReadmeContent => {
                this._npmReadmeContent = {
                    packageName,
                    packageVersion,
                    rawReadmeContent
                };
                return this._npmReadmeContent;
            },
            err => {
                this._npmReadmeContent = {
                    packageName,
                    packageVersion,
                    rawReadmeContent: ""
                };
                return this._npmReadmeContent;
            }
        );
    }

    // if we're looking at this in the new domain, need to provide tokens for old & new domains
    public requireMultipleTokenEndpoints(): boolean {
        const webPageDataService = Service.getService(HubWebPageDataService);

        if (webPageDataService.legacyPkgUrl() == null) {
            return false;
        }

        return (webPageDataService.IsMultiDomainAuthTokensFeatureFlagEnabled());
    }

    public getEndpointUrl(replacementString: string, npmRegistryIndexId: string): IPromise<string> {
        return this._npmHttpClient.getEndpointUrl(replacementString, npmRegistryIndexId);
    }

    public getLegacyUrl(replacementString: string, npmRegistryIndexId: string): IPromise<string> {
        return this.legacyClient.getEndpointUrl(replacementString, npmRegistryIndexId);
    }

    public getDownloadContentUrl(feedId: string, packageName: string, packageVersion: string): IPromise<string> {
        return this._npmHttpClient.getDownloadContentUrl(feedId, packageName, packageVersion);
    }

    public restorePackageVersion(feedId: string, packageName: string, packageVersion: string): IPromise<void> {
        return this._npmHttpClient.restorePackageVersionFromRecycleBin(
            { deleted: false } as VSS_Npm_Contracts.NpmRecycleBinPackageVersionDetails,
            feedId,
            packageName,
            packageVersion
        );
    }

    public permanentDeletePackageVersion(feedId: string, packageName: string, packageVersion: string): IPromise<void> {
        return this._npmHttpClient.deletePackageVersionFromRecycleBin(feedId, packageName, packageVersion);
    }

    public batchDelete(feedId: string, iterator: IBatchIterator<MinimalPackageDetails[]>): Promise<void[]> {
        return BatchExecutor.executeInParallel(iterator, async (packageDetails: MinimalPackageDetails[]) => {
            const batchRequest = <NpmPackagesBatchRequest>{
                data: null,
                operation: VSS_Npm_Contracts.NpmBatchOperationType.Unpublish,
                packages: packageDetails
            };
            await this._npmHttpClient.updatePackages(batchRequest, feedId);
        });
    }

    public batchRestoreToFeed(feedId: string, iterator: IBatchIterator<MinimalPackageDetails[]>): Promise<void[]> {
        return BatchExecutor.executeInParallel(iterator, async (packageDetails: MinimalPackageDetails[]) => {
            const batchRequest = <NpmPackagesBatchRequest>{
                data: null,
                operation: VSS_Npm_Contracts.NpmBatchOperationType.RestoreToFeed,
                packages: packageDetails
            };
            await this._npmHttpClient.updateRecycleBinPackages(batchRequest, feedId);
        });
    }

    public batchPermanentlyDelete(feedId: string, iterator: IBatchIterator<MinimalPackageDetails[]>): Promise<void[]> {
        return BatchExecutor.executeInParallel(iterator, async (packageDetails: MinimalPackageDetails[]) => {
            const batchRequest = <NpmPackagesBatchRequest>{
                data: null,
                operation: VSS_Npm_Contracts.NpmBatchOperationType.PermanentDelete,
                packages: packageDetails
            };
            await this._npmHttpClient.updateRecycleBinPackages(batchRequest, feedId);
        });
    }

    public batchPromotePackages(
        feedId: string,
        viewId: string,
        iterator: IBatchIterator<MinimalPackageDetails[]>
    ): Promise<void[]> {
        return BatchExecutor.executeInParallel(iterator, async (packageDetails: MinimalPackageDetails[]) => {
            const batchRequest = <NpmPackagesBatchRequest>{
                data: { viewId },
                operation: VSS_Npm_Contracts.NpmBatchOperationType.Promote,
                packages: packageDetails
            };
            await this._npmHttpClient.updatePackages(batchRequest, feedId);
        });
    }
}
