import * as Q from "q";
import { DataProviderResult, DataProviderQuery } from "VSS/Contributions/Contracts";
import { getScenarioManager } from "VSS/Performance";
import { ICollectionItem } from "MyExperiences/Scenarios/Shared/Models";
import { ContributionsSource } from "MyExperiences/Scenarios/Shared/Sources/ContributionsSource";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";

export class OrgCollectionsDataProviderSource {
    public static DATA_PROVIDER_ID = "ms.vss-tfs-web.organization-collections-data-provider";
    public static PERF_SCENARIO_NAME = "GetCollectionsDataFetchTime";

    constructor(private _contributionsSource?: ContributionsSource) {
    }

    public getCollectionsData(): IPromise<ICollectionItem[]> {
        const perfScenario = getScenarioManager()
            .startScenario(CustomerIntelligenceConstants.AREAS.MyExperiences, OrgCollectionsDataProviderSource.PERF_SCENARIO_NAME);
        return this.contributionsSource.getDataWithDefaultQueryForContribution<ICollectionItem[]>(
            OrgCollectionsDataProviderSource.DATA_PROVIDER_ID)
            .then((collectionItems: ICollectionItem[]) => {
                perfScenario.end();
                return collectionItems;
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
