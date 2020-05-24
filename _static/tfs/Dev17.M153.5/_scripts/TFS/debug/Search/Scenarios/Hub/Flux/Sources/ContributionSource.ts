import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Service from "VSS/Service";
import * as SDK_Shim from "VSS/SDK/Shim";
import { ExtensionService } from "VSS/Contributions/Services";
import { ContributedSearchTab } from "Search/Scenarios/Shared/Base/ContributedSearchTab";
import { contributionIdToProviderContributionIdMap } from "Search/Scenarios/Hub/Contributions";

const orderProperty = "order";

export class ProvidersContributionSource {
    public getProviderService(
        providerContributionId: string,
        tabSwitch: boolean,
        isProjectContext: boolean,
        pageContext: Object,
        onFullScreen?: (isFullScreen: boolean) => void): IPromise<ContributedSearchTab> {
        const providerServiceContributionId = contributionIdToProviderContributionIdMap[providerContributionId];
        return new Promise((resolve, reject) => {
            SDK_Shim
                .VSS
                .getService<ContributedSearchTab>(
                    providerServiceContributionId,
                    {
                        tabSwitch,
                        isProjectContext, 
                        onFullScreen,
                        pageContext,
                        providerContributionId
                    })
                .then(serviceInstance => {
                    resolve(serviceInstance);
                },
                reject);
        });
    }

    public getSearchProviders(): IPromise<Contributions_Contracts.Contribution[]> {
        const extensionService = Service.getService(ExtensionService);

        return extensionService
            .getLoadedContributionsOfType("ms.vss-search-platform.entity-type")
            .then(contributions => {
                // Falling back to getContributionsForTarget to not break compat on upgrade
                // As there is a gap between TFS binary updates and config db updates. It is during config update
                // Extension are updated. Till extension is updated "contributions" will be an empty array.
                if (contributions && contributions.length > 0) {
                    return this.sortContributions(contributions);
                }
                else {
                    return extensionService
                        .getContributionsForTarget(
                        "ms.vss-search-platform.entity-type-collection",
                        "ms.vss-search-platform.entity-type").then(contributions => {
                            return this.sortContributions(contributions);
                        });
                };
            });
    }

    private sortContributions = (constributions: Contributions_Contracts.Contribution[]): Contributions_Contracts.Contribution[] => {
        return constributions
            .sort((first, second) => {
                return ((first.properties[orderProperty] as number) - (second.properties[orderProperty] as number));
            });
    }
}