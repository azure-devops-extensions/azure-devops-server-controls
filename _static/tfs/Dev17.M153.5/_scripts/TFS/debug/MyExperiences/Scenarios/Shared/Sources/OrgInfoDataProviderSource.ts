import * as Q from "q";
import { DataProviderResult, DataProviderQuery } from "VSS/Contributions/Contracts";
import * as Contributions_Services from "VSS/Contributions/Services";
import { getScenarioManager } from "VSS/Performance";
import * as Service from "VSS/Service";

import { IOrganizationInfo } from "MyExperiences/Scenarios/Shared/Models";
import { ContributionsSource } from "MyExperiences/Scenarios/Shared/Sources/ContributionsSource";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";

export class OrgInfoDataProviderSource {
    public static DATA_PROVIDER_ID = "ms.vss-tfs-web.organization-info-data-provider";
    public static PERF_SCENARIO_NAME = "GetOrganizationInfoFetchTime";

    constructor(private _contributionsSource?: ContributionsSource) {
    }

    public getOrganizationInfo(): IPromise<IOrganizationInfo> {
        const perfScenario = getScenarioManager()
            .startScenario(CustomerIntelligenceConstants.AREAS.MyExperiences, OrgInfoDataProviderSource.PERF_SCENARIO_NAME);
        return this.contributionsSource.getDataWithDefaultQueryForContribution<IOrganizationInfo>(OrgInfoDataProviderSource.DATA_PROVIDER_ID)
            .then((organizationInfo: IOrganizationInfo) => {
                perfScenario.end();
                return organizationInfo;
            }, (error: Error) => {
                perfScenario.abort();
                throw error;
            }
        );
    }

    private get contributionsSource(): ContributionsSource {
        if (!this._contributionsSource) {
            this._contributionsSource = new ContributionsSource();
        }

        return this._contributionsSource;
    }
}
