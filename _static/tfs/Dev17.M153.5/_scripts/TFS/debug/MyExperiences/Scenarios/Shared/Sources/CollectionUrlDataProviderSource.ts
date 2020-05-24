import * as Q from "q";
import { getScenarioManager } from "VSS/Performance";
import { ICollectionUrlItem } from "MyExperiences/Scenarios/Shared/Models";
import { ContributionsSource } from "MyExperiences/Scenarios/Shared/Sources/ContributionsSource";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";

export class CollectionUrlDataProviderSource {
    public static DATA_PROVIDER_ID = "ms.vss-tfs-web.account-switcher-collection-url-data-provider";
    public static PERF_SCENARIO_NAME = "GetCollectionUrlFetchTime";

    constructor(private _contributionsSource?: ContributionsSource) {
    }

    public getCollectionUrl(collectionId: string): IPromise<string> {
        const perfScenario = getScenarioManager()
            .startScenario(CustomerIntelligenceConstants.AREAS.MyExperiences, CollectionUrlDataProviderSource.PERF_SCENARIO_NAME);
        const queryProperties: { collectionId } = {
            collectionId: collectionId
        };

        return this.contributionsSource.getDataForContribution<ICollectionUrlItem>(
            CollectionUrlDataProviderSource.DATA_PROVIDER_ID,
            queryProperties
        ).then((collectionUrlItem: ICollectionUrlItem) => {
            perfScenario.end();
            return collectionUrlItem.url;
        }, (error: Error) => {
            perfScenario.abort();
            throw error;
        });
    }

    private get contributionsSource(): ContributionsSource {
        if (!this._contributionsSource) {
            this._contributionsSource = new ContributionsSource();
        }

        return this._contributionsSource;
    }
}
