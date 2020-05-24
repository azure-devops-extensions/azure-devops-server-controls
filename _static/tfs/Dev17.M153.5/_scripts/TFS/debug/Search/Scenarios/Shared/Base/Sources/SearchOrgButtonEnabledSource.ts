import { WebPageDataService } from "VSS/Contributions/Services";
import * as Service from "VSS/Service";

export class SearchOrgButtonEnabledSource {
    public static DATA_PROVIDER_ID = "ms.vss-search-platform.collection-to-org-search-navigation-enabled-data-provider";
    public isSearchOrgButtonEnabled(): boolean {
        const webPageDataService = Service.getService(WebPageDataService);

        const response = webPageDataService.getPageData<boolean>(SearchOrgButtonEnabledSource.DATA_PROVIDER_ID);
        return response;
    }
}
