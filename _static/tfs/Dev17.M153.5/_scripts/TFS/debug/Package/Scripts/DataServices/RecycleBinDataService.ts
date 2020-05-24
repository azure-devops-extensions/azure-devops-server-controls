import { WebPageDataService } from "VSS/Contributions/Services";
import * as Service from "VSS/Service";

import { DataProviderConstants } from "Feed/Common/Constants/Constants";
import { PackageDetailsResult, PackagesResult, WebPageData } from "Package/Scripts/Types/WebPage.Contracts";
import { Package, RecycleBinPackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { FeedHttpClient } from "Package/Scripts/WebApi/VSS.Feed.WebApi";

export class RecycleBinDataService extends Service.VssService {
    // todo: check why these are here, should be in webpagedataservice
    public getInitialPackagesResult(): PackagesResult {
        return this.getPackageHubData().recycleBinPackagesResult;
    }

    public getInitialPackageDetailsResult(): PackageDetailsResult {
        return this.getPackageHubData().packageDetailsResult;
    }

    /**
     * Should not be used directly other than PackageHubDataService which filters packages by enabled protocol
     */
    public getPackagesAsync(
        feedId: string,
        protocolType: string,
        top: number,
        skip: number,
        packageNameQuery: string = null,
        includeAllVersions: boolean = false
    ): IPromise<Package[]> {
        if (packageNameQuery === "") {
            packageNameQuery = null;
        }

        const feedHttpClient = Service.getClient(FeedHttpClient);
        return feedHttpClient.getRecycleBinPackages(
            feedId,
            protocolType, // ProtocolType
            packageNameQuery,
            null, // IncludeUrls,
            top,
            skip,
            includeAllVersions
        );
    }

    // todo: this method is not anywhere
    public getPackageAsync(feedId: string, packageId: string): IPromise<Package> {
        const feedHttpClient = Service.getClient(FeedHttpClient);
        return feedHttpClient.getRecycleBinPackage(feedId, packageId, null);
    }

    public getPackageVersionAsync(
        feedId: string,
        packageId: string,
        versionId: string
    ): IPromise<RecycleBinPackageVersion> {
        const feedHttpClient = Service.getClient(FeedHttpClient);
        return feedHttpClient.getRecycleBinPackageVersion(feedId, packageId, versionId, null);
    }

    public getPackageVersionsAsync(feedId: string, packageId: string): IPromise<RecycleBinPackageVersion[]> {
        const feedHttpClient = Service.getClient(FeedHttpClient);
        return feedHttpClient.getRecycleBinPackageVersions(feedId, packageId, null);
    }

    private getPackageHubData(): WebPageData {
        const webPageDataService = Service.getService(WebPageDataService);
        return webPageDataService.getPageData<WebPageData>(DataProviderConstants.PackageDataProvider);
    }
}
