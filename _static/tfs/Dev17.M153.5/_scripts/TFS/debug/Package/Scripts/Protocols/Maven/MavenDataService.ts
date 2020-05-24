import * as Service from "VSS/Service";

import { MavenHttpClient } from "Package/Scripts/Protocols/Maven/WebApi/VSS.Maven.CustomWebApi";
import * as VSS_Maven_Contracts from "Package/Scripts/Protocols/Maven/WebApi/VSS.Maven.Contracts";
import { BatchExecutor, IBatchIterator } from "Package/Scripts/Protocols/Common/BatchHandling";

export class MavenDataService extends Service.VssService {
    private _mavenHttpClient = Service.getClient<MavenHttpClient>(MavenHttpClient);

    get batchSize() {
        return 10;
    }

    public restorePackageVersion(feedId: string, groupId: string, artifactId: string, version: string): IPromise<void> {
        return this._mavenHttpClient.restorePackageVersionFromRecycleBin(
            { deleted: false } as VSS_Maven_Contracts.MavenRecycleBinPackageVersionDetails,
            feedId,
            groupId,
            artifactId,
            version
        );
    }

    public permanentDeletePackageVersion(
        feedId: string,
        groupId: string,
        artifactId: string,
        version: string
    ): IPromise<void> {
        return this._mavenHttpClient.deletePackageVersionFromRecycleBin(feedId, groupId, artifactId, version);
    }

    public updateRecycleBinPackageVersions(
        mavenBatchRequest: VSS_Maven_Contracts.MavenPackagesBatchRequest,
        feedId: string
    ): IPromise<void> {
        return this._mavenHttpClient.updateRecycleBinPackages(mavenBatchRequest, feedId);
    }

    public deletePackageVersion(feedId: string, groupId: string, artifactId: string, version: string): IPromise<void> {
        return this._mavenHttpClient.packageDelete(feedId, groupId, artifactId, version);
    }

    public async batchRestoreToFeed(
        feedId: string,
        iterator: IBatchIterator<VSS_Maven_Contracts.MavenMinimalPackageDetails[]>
    ): Promise<void> {
        await BatchExecutor.executeInParallel(
            iterator,
            async (packageDetails: VSS_Maven_Contracts.MavenMinimalPackageDetails[]) => {
                const batchRequest = <VSS_Maven_Contracts.MavenPackagesBatchRequest>{
                    data: null,
                    operation: VSS_Maven_Contracts.MavenBatchOperationType.RestoreToFeed,
                    packages: packageDetails
                };
                await this._mavenHttpClient.updateRecycleBinPackages(batchRequest, feedId);
            }
        );
    }

    public async batchPermanentlyDelete(
        feedId: string,
        iterator: IBatchIterator<VSS_Maven_Contracts.MavenMinimalPackageDetails[]>
    ): Promise<void> {
        await BatchExecutor.executeInParallel(
            iterator,
            async (packageDetails: VSS_Maven_Contracts.MavenMinimalPackageDetails[]) => {
                const batchRequest = <VSS_Maven_Contracts.MavenPackagesBatchRequest>{
                    data: null,
                    operation: VSS_Maven_Contracts.MavenBatchOperationType.PermanentDelete,
                    packages: packageDetails
                };
                await this._mavenHttpClient.updateRecycleBinPackages(batchRequest, feedId);
            }
        );
    }
}
