import * as Service from "VSS/Service";

import { NuGetHttpClient } from "Package/Scripts/Protocols/NuGet/WebApi/VSS.NuGet.CustomWebApi";
import { NuGetPackagesBatchRequest } from "Package/Scripts/Protocols/NuGet/WebApi/VSS.NuGet.Contracts";
import * as NuGetPackageDetails from "Package/Scripts/Protocols/NuGet/NuGetPackageDetails";
import * as VSS_NuGet_Contracts from "Package/Scripts/Protocols/NuGet/WebApi/VSS.NuGet.Contracts";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { BatchExecutor, IBatchIterator } from "Package/Scripts/Protocols/Common/BatchHandling";
import { MinimalPackageDetails } from "Package/Scripts/Protocols/Common/WebApi/PackagingShared.Contracts";

export class NuGetDataService {
    private _nuGetHttpClient: NuGetHttpClient = Service.getClient<NuGetHttpClient>(NuGetHttpClient);

    get batchSize() {
        return Service.getLocalService(HubWebPageDataService).getBatchOperationPageSize();
    }

    public updatePackageVersions(nuGetBatchRequest: NuGetPackagesBatchRequest, feedId: string): IPromise<void> {
        return this._nuGetHttpClient.updatePackageVersions(nuGetBatchRequest, feedId);
    }

    public updateRecycleBinPackageVersions(
        nuGetBatchRequest: NuGetPackagesBatchRequest,
        feedId: string
    ): IPromise<void> {
        return this._nuGetHttpClient.updateRecycleBinPackageVersions(nuGetBatchRequest, feedId);
    }

    public updatePackageVersion(
        nugetPackageVersionDetails: NuGetPackageDetails.PackageVersionDetails,
        feedId: string,
        packageName: string,
        packageVersion: string
    ): IPromise<void> {
        return this._nuGetHttpClient.updatePackageVersion(
            nugetPackageVersionDetails,
            feedId,
            packageName,
            packageVersion
        );
    }

    public deletePackageVersion(
        feedId: string,
        packageName: string,
        packageVersion: string
    ): IPromise<VSS_NuGet_Contracts.Package> {
        return this._nuGetHttpClient.deletePackageVersion(feedId, packageName, packageVersion);
    }

    public getDownloadUrl(fileName: string): IPromise<any> {
        return this._nuGetHttpClient.getDownloadUrl(fileName);
    }

    public getDownloadPackageVersionContentUrl(
        feedId: string,
        packageName: string,
        packageVersion: string
    ): IPromise<string> {
        return this._nuGetHttpClient.getDownloadPackageVersionContentUrl(feedId, packageName, packageVersion);
    }

    public getServiceIndexUrl(feedId: string, locationId: string): IPromise<string> {
        return this._nuGetHttpClient.getServiceIndexUrl(feedId, locationId);
    }

    public restorePackageVersion(feedId: string, packageName: string, packageVersion: string): IPromise<void> {
        return this._nuGetHttpClient.restorePackageVersionFromRecycleBin(
            { deleted: false } as VSS_NuGet_Contracts.NuGetRecycleBinPackageVersionDetails,
            feedId,
            packageName,
            packageVersion
        );
    }

    public permanentDeletePackageVersion(feedId: string, packageName: string, packageVersion: string): IPromise<void> {
        return this._nuGetHttpClient.deletePackageVersionFromRecycleBin(feedId, packageName, packageVersion);
    }

    public async batchDelete(feedId: string, iterator: IBatchIterator<MinimalPackageDetails[]>): Promise<void> {
        await BatchExecutor.executeInParallel(iterator, async (packageDetails: MinimalPackageDetails[]) => {
            const batchRequest = <NuGetPackagesBatchRequest>{
                data: null,
                operation: VSS_NuGet_Contracts.NuGetBatchOperationType.Delete,
                packages: packageDetails
            };
            await this._nuGetHttpClient.updatePackageVersions(batchRequest, feedId);
        });
    }

    public async batchRestoreToFeed(feedId: string, iterator: IBatchIterator<MinimalPackageDetails[]>): Promise<void> {
        await BatchExecutor.executeInParallel(iterator, async (packageDetails: MinimalPackageDetails[]) => {
            const batchRequest = <NuGetPackagesBatchRequest>{
                data: null,
                operation: VSS_NuGet_Contracts.NuGetBatchOperationType.RestoreToFeed,
                packages: packageDetails
            };
            await this._nuGetHttpClient.updateRecycleBinPackageVersions(batchRequest, feedId);
        });
    }

    public async batchPermanentlyDelete(
        feedId: string,
        iterator: IBatchIterator<MinimalPackageDetails[]>
    ): Promise<void> {
        await BatchExecutor.executeInParallel(iterator, async (packageDetails: MinimalPackageDetails[]) => {
            const batchRequest = <NuGetPackagesBatchRequest>{
                data: null,
                operation: VSS_NuGet_Contracts.NuGetBatchOperationType.PermanentDelete,
                packages: packageDetails
            };
            await this._nuGetHttpClient.updateRecycleBinPackageVersions(batchRequest, feedId);
        });
    }

    public batchPromotePackages(
        feedId: string,
        viewId: string,
        iterator: IBatchIterator<MinimalPackageDetails[]>
    ): Promise<void[]> {
        return BatchExecutor.executeInParallel(iterator, async (packageDetails: MinimalPackageDetails[]) => {
            const batchRequest = <NuGetPackagesBatchRequest>{
                data: { viewId },
                operation: VSS_NuGet_Contracts.NuGetBatchOperationType.Promote,
                packages: packageDetails
            };
            await this._nuGetHttpClient.updatePackageVersions(batchRequest, feedId);
        });
    }
}
