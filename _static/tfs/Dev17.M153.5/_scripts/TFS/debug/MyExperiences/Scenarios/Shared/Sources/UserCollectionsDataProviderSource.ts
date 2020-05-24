import * as Q from "q";
import { DataProviderResult, DataProviderQuery } from "VSS/Contributions/Contracts";
import { getScenarioManager } from "VSS/Performance";

import { getDataProvidersResult } from "MyExperiences/Scenarios/Shared/ContributionsSourceHelper";
import { ContributionsSource } from "MyExperiences/Scenarios/Shared/Sources/ContributionsSource";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";

export class UserCollectionsDataProviderSource {
    public static DATA_PROVIDER_ID = "ms.vss-tfs-web.user-accessed-collection-ids-data-provider";
    public static PERF_SCENARIO_NAME = "GetCurrentUserCollectionIdsFetchTime";

    constructor(private _contributionsSource?: ContributionsSource) {
    }

    public getCurrentUserCollectionIds(): IPromise<string[]> {
        const perfScenario = getScenarioManager()
            .startScenario(CustomerIntelligenceConstants.AREAS.MyExperiences, UserCollectionsDataProviderSource.PERF_SCENARIO_NAME);
        return this.contributionsSource.getDataWithDefaultQueryForContribution<string[]>(UserCollectionsDataProviderSource.DATA_PROVIDER_ID)
            .then((collectionIds: string[]) => {
                perfScenario.end();
                return collectionIds;
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
