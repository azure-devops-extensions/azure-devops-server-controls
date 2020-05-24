import { SEARCH_AREA } from "Search/Scenarios/Shared/CustomerIntelligenceConstants";
import { IOrganizationInfo } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getScenarioManager } from "VSS/Performance";
import * as Service from "VSS/Service";

export class OrgInfoDataProviderSource {

    public static DATA_PROVIDER_ID = "ms.vss-search-platform.organization-info-data-provider";
    public static PERF_SCENARIO_NAME = "GetOrganizationInfoFetchTime";

    public getOrganizationInfo(): IPromise<IOrganizationInfo> {

        const perfScenario = getScenarioManager()
            .startScenario(SEARCH_AREA, OrgInfoDataProviderSource.PERF_SCENARIO_NAME);

        const webPageDataService = Service.getService(WebPageDataService);

        return webPageDataService.getDataAsync<IOrganizationInfo>(OrgInfoDataProviderSource.DATA_PROVIDER_ID)
            .then((organizationInfo: IOrganizationInfo) => {
                perfScenario.end();
                return organizationInfo;
            },    (error: Error) => {
                perfScenario.abort();
                throw error;
            }
        );
    }
}
