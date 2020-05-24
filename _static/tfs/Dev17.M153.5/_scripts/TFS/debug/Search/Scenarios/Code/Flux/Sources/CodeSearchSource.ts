import * as Rest_Client from "Search/Scenarios/WebApi/RestClient";
import * as Contracts from "Search/Scenarios/WebApi/Code.Contracts";
import * as Service from "VSS/Service";
import * as _SearchSharedLegacy from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WebPageDataService } from "VSS/Contributions/Services";
import { isEmpty } from "Search/Scenarios/Shared/Utils";
import { SearchSourceResponse, SearchSourceType } from "Search/Scenarios/Shared/Base/ActionsHub";
import { SearchSourceBase } from "Search/Scenarios/Shared/Base/Sources/SearchSource";
import { CustomerIntelligenceConstants } from "Search/Scenarios/Code/Constants";

const CODE_SEARCH_PAGE_DATAPROVIDER_CONTRIBUTION_ID = "ms.vss-code-search.code-search-page-viewmodel-data-provider";
const WHITESPACE_REGEX: RegExp = /\s+/;
const WILDCARD_REGEX: RegExp = /[\*\?]+/;
const SPECIALCHAR_REGEX: RegExp = /[^A-Za-z0-9_\?\*()\[\]:]/;

export class CodeSearchSource extends SearchSourceBase<Contracts.SearchQuery> {
    private _codeSearchRestClient: Rest_Client.SearchHttpClient;
    private _useDataProvider: boolean;

    constructor() {
        super(CustomerIntelligenceConstants.QueryResultScenarioName, CustomerIntelligenceConstants.EntityName);
        this._codeSearchRestClient = Rest_Client.getClient();
        this._useDataProvider = true;
    }

    protected getResults(searchQuery: Contracts.SearchQuery): IPromise<SearchSourceResponse> {
        if (this._useDataProvider) {
            const dataService = Service.getService(WebPageDataService),
                pageData = dataService
                    .getPageData<_SearchSharedLegacy.EntitySearchResponseWithActivityId>(CODE_SEARCH_PAGE_DATAPROVIDER_CONTRIBUTION_ID);

            this._useDataProvider = false;
            dataService.removePageData(CODE_SEARCH_PAGE_DATAPROVIDER_CONTRIBUTION_ID);

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
        return this.isAdvancedCodeQuery(searchQuery.searchText)
            ? this._codeSearchRestClient.postAdvancedCodeQuery(searchQuery, currentPageContext.navigation.projectId)
                .then(response => {
                    return <SearchSourceResponse>{ responseWithActivityId: response, source: SearchSourceType.RestApi };
                }, error => {
                    throw { error, activityId: TfsContext.getDefault().activityId }
                })
            : this._codeSearchRestClient.postCodeQuery(searchQuery, currentPageContext.navigation.projectId)
                .then(response => {
                    return <SearchSourceResponse>{ responseWithActivityId: response, source: SearchSourceType.RestApi };
                }, error => {
                    throw { error, activityId: TfsContext.getDefault().activityId };
                });
    }

    /**
     * Duplicating the routine from QueryHelper.cs to determine the type of code query request.
     * @param queryText
     */
    private isAdvancedCodeQuery(queryText: string): boolean {
        let isAdvanceQuery = false;
        if (!!queryText && queryText !== "") {
            if (WILDCARD_REGEX.test(queryText)) {
                isAdvanceQuery = true;
            }
            else {
                // Query is considered advance if it has more than 2 terms or it is unscoped(no filters applied)
                // or there is atleast one term with special characters other than (, ), [, ], :
                const terms: string[] = queryText.split(WHITESPACE_REGEX).filter(s => s !== "" && !!s);
                const termsCount = terms.length;
                if (termsCount > 2 ||
                    (termsCount === 2 && queryText.indexOf(":") < 0) ||
                    terms.filter(s => SPECIALCHAR_REGEX.test(s)).length > 0) {
                    isAdvanceQuery = true;
                }
            }
        }

        return isAdvanceQuery;
    }
}
