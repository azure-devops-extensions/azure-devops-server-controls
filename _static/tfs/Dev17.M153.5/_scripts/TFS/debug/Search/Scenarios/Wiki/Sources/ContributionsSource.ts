
import { ExtensionService } from "VSS/Contributions/Services";
import * as Service from "VSS/Service";

const displayNameProperty = "displayName";
const orderProperty = "order";

export class ContributionsSource {
    public getSearchProviders(): IPromise<string[]> {
        const contributionService = Service.getService(ExtensionService);
        return contributionService.getContributionsForTarget(
            "ms.vss-search-platform.entity-type-collection",
            "ms.vss-search-platform.entity-type")
            .then(contributions => {
                if (contributions.length) {
                    return contributions
                    .map(contribution => {
                        return {
                            name: contribution.properties[displayNameProperty] as string,
                            order: contribution.properties[orderProperty] as number
                        };
                    })
                    .sort((first, second) => {
                        return first.order - second.order;
                    })
                    .map(entity => entity.name);
                }
            });
    }
}
