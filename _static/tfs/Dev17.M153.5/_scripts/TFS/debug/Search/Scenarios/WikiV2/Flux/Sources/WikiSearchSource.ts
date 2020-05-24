import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { isEmpty } from "Search/Scenarios/Shared/Utils";
import * as Contracts from "Search/Scenarios/WebApi/WorkItem.Contracts";
import * as SearchClient from "Search/Scripts/Generated/Client/RestClient";
import { WikiSearchResponse, WikiSearchRequest } from "Search/Scripts/Generated/Search.Shared.Contracts";
import * as _SearchSharedLegacy from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";
import * as Telemetry from "VSS/Telemetry/Services";

const WIKI_SEARCH_PAGE_DATAPROVIDER_CONTRIBUTION_ID = "ms.vss-wiki-search.wiki-search-page-viewmodel-data-provider";
const WIKI_SEARCH_ONPREM_PAGE_DATAPROVIDER_CONTRIBUTION_ID = "ms.vss-wiki-searchonprem.wiki-search-page-viewmodel-data-provider";

export class WikiSearchSource {
    private readonly httpClient: SearchClient.SearchHttpClient4;
    private _useDataProvider: boolean; // Used as flag for denoting first time wiki search page load

    constructor() {
        this.httpClient = SearchClient.getClient();
        this._useDataProvider = true;
    }

    public getWikiSearchResults(query: WikiSearchRequest): IPromise<WikiSearchResponse> {
    	if (this._useDataProvider) {

            const startTime = Performance.getTimestamp();
            const dataProviderContributionId = TfsContext.getDefault().isHosted
                ? WIKI_SEARCH_PAGE_DATAPROVIDER_CONTRIBUTION_ID
                : WIKI_SEARCH_ONPREM_PAGE_DATAPROVIDER_CONTRIBUTION_ID;
            const dataService = Service.getService(WebPageDataService);
            const pageData = dataService.getPageData<WikiSearchResponse>(dataProviderContributionId);
            this._useDataProvider = false;

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                "search.V2Page",
                "WikiSearchWebPageDataServiceResolution",
                {
                    E2ETimeInMs: Performance.getTimestamp() - startTime
                }));

            dataService.removePageData(WIKI_SEARCH_PAGE_DATAPROVIDER_CONTRIBUTION_ID);

            const isResponseAvailable: boolean = pageData && !isEmpty(pageData);

            if (isResponseAvailable) {
                return Promise.resolve(pageData);
            }
        }

    	const currentPageContext = TfsContext.getDefault();
    	return this.httpClient.fetchWikiSearchResults(query, currentPageContext.navigation.projectId);
    }
}
