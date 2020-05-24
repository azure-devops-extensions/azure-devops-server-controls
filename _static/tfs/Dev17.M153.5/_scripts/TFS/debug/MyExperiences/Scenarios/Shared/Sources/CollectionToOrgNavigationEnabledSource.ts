import { WebPageDataService } from "VSS/Contributions/Services";
import * as Service from "VSS/Service";

export class CollectionToOrgNavigationEnabledSource {
    public static DATA_PROVIDER_ID = "ms.vss-tfs-web.collection-to-org-navigation-enabled-data-provider";

    public isCollectionToOrgNavigationEnabled(): boolean {
        const webPageDataService = Service.getService(WebPageDataService);

        return webPageDataService.getPageData<boolean>(CollectionToOrgNavigationEnabledSource.DATA_PROVIDER_ID);
    }
}
