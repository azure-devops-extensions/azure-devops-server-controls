import * as Service from "VSS/Service";

import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { RecycleBinDataService } from "Package/Scripts/DataServices/RecycleBinDataService";
import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { ProtocolProvider } from "Package/Scripts/Protocols/ProtocolProvider";
import {
    PackageDetailsResult,
    PackageDetailsRetrievalResult,
    PackagesResult,
    PackagesRetrievalResult
} from "Package/Scripts/Types/WebPage.Contracts";
import { Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class FilterByEnabledProtocolDataService extends Service.VssService {
    public getPackagesResult(): PackagesResult {
        const webPageDataService = Service.getLocalService(HubWebPageDataService);
        const packagesResult = webPageDataService.getInitialPackagesResult();
        if (packagesResult.result === PackagesRetrievalResult.NoPackages) {
            return packagesResult;
        }
        packagesResult.packages = this.filterByEnabledProtocol(packagesResult.packages);
        return packagesResult;
    }

    public getRecycleBinPackagesResult(): PackagesResult {
        const recycleBinDataService = Service.getLocalService(RecycleBinDataService);
        const packagesResult = recycleBinDataService.getInitialPackagesResult();
        if (packagesResult.result === PackagesRetrievalResult.NoPackages) {
            return packagesResult;
        }
        packagesResult.packages = this.filterByEnabledProtocol(packagesResult.packages);
        return packagesResult;
    }

    public getPackageDetailsResult(): PackageDetailsResult {
        const webPageDataService = Service.getLocalService(HubWebPageDataService);
        const packageDetailsResult = webPageDataService.getInitialPackageDetailsResult();

        if (!packageDetailsResult) {
            return packageDetailsResult;
        }

        if (packageDetailsResult.result !== PackageDetailsRetrievalResult.Success) {
            return packageDetailsResult;
        }

        // check if specified protocol is disabled, feed service doesn't filter packages based on disabled protocol
        if (ProtocolProvider.get(packageDetailsResult.package.protocolType) !== null) {
            return packageDetailsResult;
        } else {
            packageDetailsResult.result = PackageDetailsRetrievalResult.NotFound;
            packageDetailsResult.package = null;
            return packageDetailsResult;
        }
    }

    public getRecycleBinPackageDetailsResult(): PackageDetailsResult {
        const recycleBinDataService = Service.getLocalService(RecycleBinDataService);
        const packageDetailsResult = recycleBinDataService.getInitialPackageDetailsResult();

        if (!packageDetailsResult) {
            return packageDetailsResult;
        }

        if (packageDetailsResult.result !== PackageDetailsRetrievalResult.Success) {
            return packageDetailsResult;
        }

        // check if specified protocol is disabled, feed service doesn't filter packages based on disabled protocol
        if (ProtocolProvider.get(packageDetailsResult.package.protocolType) !== null) {
            return packageDetailsResult;
        } else {
            packageDetailsResult.result = PackageDetailsRetrievalResult.NotFound;
            packageDetailsResult.package = null;
            return packageDetailsResult;
        }
    }

    public getRecycleBinPackagesAsync(
        feedId: string,
        top: number,
        skip: number,
        packageNameQuery: string = null,
        protocolType?: string,
        includeAllVersions: boolean = false
    ): IPromise<Package[]> {
        const recycleBinDataService = Service.getLocalService(RecycleBinDataService);
        return recycleBinDataService
            .getPackagesAsync(feedId, protocolType, top, skip, packageNameQuery, includeAllVersions)
            .then((packages: Package[]) => {
                return this.filterByEnabledProtocol(packages);
            });
    }

    public getPackagesAsync(
        feedId: string,
        top: number,
        skip: number,
        includeDeleted: boolean,
        isListed: boolean,
        packageNameQuery: string = null,
        includeDescription: boolean = false,
        directUpstreamId?: string
    ): IPromise<Package[]> {
        const feedsDataService = Service.getLocalService(FeedsDataService);
        return feedsDataService
            .getPackagesAsync(
                feedId,
                null, // protocolType
                top,
                skip,
                includeDeleted,
                isListed,
                packageNameQuery,
                includeDescription,
                directUpstreamId
            )
            .then((packages: Package[]) => {
                return this.filterByEnabledProtocol(packages);
            });
    }

    private filterByEnabledProtocol(packages: Package[]): Package[] {
        if (packages == null) {
            return;
        }

        const webPageDataService: HubWebPageDataService = Service.getLocalService(HubWebPageDataService);
        // If protocol is not disabled, just return all the packages
        if (webPageDataService && webPageDataService.isIvyUIEnabled()) {
            return packages;
        }

        return packages.filter(pkg => {
            return ProtocolProvider.get(pkg.protocolType) !== null;
        });
    }
}
