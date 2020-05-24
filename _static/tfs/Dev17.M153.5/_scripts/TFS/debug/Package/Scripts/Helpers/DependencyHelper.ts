import { findIndex } from "OfficeFabric/Utilities";

import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import * as Service from "VSS/Service";

import { DataProviderConstants } from "Feed/Common/Constants/Constants";
import * as Url_Helper from "Package/Scripts/Helpers/UrlHelper";
import { PackageDependency } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { PackageDependencyDetails } from "Package/Scripts/WebApi/VSS.Feed.Internal.Contracts";

import { IDependency, IDependencyGroup } from "Feed/Common/Types/IDependency";

export class DependencyHelper {
    public static async getDependenciesForPackageVersionAsync(
        feedId: string,
        packageId: string,
        packageVersionId: string,
        protocolType: string
    ): Promise<PackageDependencyDetails[]> {
        const extensionService = Service.getService(ExtensionService);
        const webPageDataService = Service.getService(WebPageDataService);
        const properties = {
            feedId: feedId,
            packageId: packageId,
            packageVersionId: packageVersionId,
            protocolType: protocolType
        };

        const contribution = await extensionService.getContribution(
            DataProviderConstants.FeedPackageDependenciesDataProvider
        );
        try {
            await webPageDataService.ensureDataProvidersResolved([contribution], true, properties);
            return webPageDataService.getPageData<PackageDependencyDetails[]>(
                DataProviderConstants.FeedPackageDependenciesDataProvider
            );
        } catch (error) {
            // On error resolving data provider, return null for package dep details
            return null;
        }
    }

    public static groupDependencyDetails(
        dependencies: PackageDependencyDetails[],
        feedName: string,
        protocolType: string
    ): IDependencyGroup[] {
        const dependencyGroups: IDependencyGroup[] = [];

        if (dependencies) {
            for (const dependency of dependencies) {
                const index = findIndex(dependencyGroups, (group: IDependencyGroup) => {
                    return group.group === dependency.group;
                });

                if (index > -1) {
                    dependencyGroups[index].dependencies.push(<IDependency>{
                        name: dependency.packageName,
                        versionRange: dependency.versionRange,
                        link: Url_Helper.getPackageDependencyUrl(feedName, dependency.packageName, protocolType),
                        packageId: dependency.packageId,
                        packageVersionId: dependency.packageVersionId,
                        normalizedPackageName: dependency.normalizedPackageName,
                        protocolType: protocolType
                    });
                } else {
                    dependencyGroups.push(<IDependencyGroup>{
                        dependencies: [
                            {
                                name: dependency.packageName,
                                versionRange: dependency.versionRange,
                                link: Url_Helper.getPackageDependencyUrl(
                                    feedName,
                                    dependency.packageName,
                                    protocolType
                                ),
                                packageId: dependency.packageId,
                                packageVersionId: dependency.packageVersionId,
                                normalizedPackageName: dependency.normalizedPackageName,
                                protocolType: protocolType
                            }
                        ],
                        group: dependency.group
                    });
                }
            }
        }

        return dependencyGroups;
    }

    public static groupDependencies(dependencies: PackageDependency[]): IDependencyGroup[] {
        const dependencyGroups: IDependencyGroup[] = [];

        if (dependencies) {
            for (const dependency of dependencies) {
                const index = findIndex(dependencyGroups, (group: IDependencyGroup) => {
                    return group.group === dependency.group;
                });

                if (index > -1) {
                    dependencyGroups[index].dependencies.push(<IDependency>{
                        name: dependency.packageName,
                        versionRange: dependency.versionRange
                    });
                } else {
                    dependencyGroups.push(<IDependencyGroup>{
                        dependencies: [
                            {
                                name: dependency.packageName,
                                versionRange: dependency.versionRange
                            }
                        ],
                        group: dependency.group
                    });
                }
            }
        }

        return dependencyGroups;
    }
}
