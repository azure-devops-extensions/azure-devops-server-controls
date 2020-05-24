import * as Rest_Client from "Search/Scenarios/WebApi/RestClient";
import * as Contracts from "Search/Scenarios/WebApi/WorkItem.Contracts";
import * as Service from "VSS/Service";
import * as _SearchSharedLegacy from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WebPageDataService } from "VSS/Contributions/Services";
import { isEmpty } from "Search/Scenarios/Shared/Utils";
import { SearchSourceResponse, SearchSourceType } from "Search/Scenarios/Shared/Base/ActionsHub";
import { SearchSourceBase } from "Search/Scenarios/Shared/Base/Sources/SearchSource";
import { CustomerIntelligenceConstants } from "Search/Scenarios/WorkItem/Constants";

const WORKITEM_SEARCH_PAGE_DATAPROVIDER_CONTRIBUTION_ID = "ms.vss-workitem-search.workitem-search-page-viewmodel-data-provider";
const WORKITEM_SEARCH_ONPREM_PAGE_DATAPROVIDER_CONTRIBUTION_ID = "ms.vss-workitem-searchonprem.workitem-search-page-viewmodel-data-provider";

export class WorkItemSearchSource extends SearchSourceBase<Contracts.WorkItemSearchRequest> {
    private _workItemSearchRestClient: Rest_Client.SearchHttpClient;
    private _useDataProvider: boolean;

    constructor() {
        super(CustomerIntelligenceConstants.QueryResultScenarioName, CustomerIntelligenceConstants.EntityName)
        this._workItemSearchRestClient = Rest_Client.getClient();
        this._useDataProvider = true;
    }

    protected getResults(searchQuery: Contracts.WorkItemSearchRequest): IPromise<SearchSourceResponse> {
        if (this._useDataProvider) {
            const dataProviderContributionId = TfsContext.getDefault().isHosted
                ? WORKITEM_SEARCH_PAGE_DATAPROVIDER_CONTRIBUTION_ID
                : WORKITEM_SEARCH_ONPREM_PAGE_DATAPROVIDER_CONTRIBUTION_ID;
            const dataService = Service.getService(WebPageDataService),
                pageData = dataService
                    .getPageData<_SearchSharedLegacy.EntitySearchResponseWithActivityId>(dataProviderContributionId);

            this._useDataProvider = false;
            dataService.removePageData(WORKITEM_SEARCH_PAGE_DATAPROVIDER_CONTRIBUTION_ID);

            const responseAvailable: boolean = pageData
                && !isEmpty(pageData)
                && ("response" in pageData ? !!pageData.response : true);
            if (responseAvailable) {
                return Promise.resolve<SearchSourceResponse>(
                    {
                        responseWithActivityId: pageData,
                        source: SearchSourceType.DataProvider
                    });
            }
        }

        const currentPageContext = TfsContext.getDefault();

        // projectid is null at collection context
        return this._workItemSearchRestClient.postWorkItemQuery(searchQuery, currentPageContext.navigation.projectId)
            .then(response => {
                return <SearchSourceResponse>{ responseWithActivityId: response, source: SearchSourceType.RestApi };
            }, error => {
                throw { error, activityId: TfsContext.getDefault().activityId };
            });
    }
}