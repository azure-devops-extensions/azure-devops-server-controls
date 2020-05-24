import * as Constants from "Search/Scenarios/WikiV2/Constants";
import * as SharedConstants from "Search/Scenarios/Shared/Constants";
import { EventGroup } from "OfficeFabric/Utilities";
import { deserialize, constructCompleteOrgSearchURL } from "Search/Scenarios/Shared/Utils";
import { ActionsHub } from "Search/Scenarios/WikiV2/Flux/ActionsHub";
import { PageSource } from "Search/Scenarios/WikiV2/Flux/Sources/PageSource";
import { TelemetryWriter } from "Search/Scenarios/WikiV2/Flux/Sources/TelemetryWriter";
import { WikiSearchSource } from "Search/Scenarios/WikiV2/Flux/Sources/WikiSearchSource";
import { OrgInfoDataProviderSource } from "Search/Scenarios/Shared/Base/Sources/OrgInfoDataProviderSource";
import { IOrganizationInfo, OrgSearchUrlLoadState} from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import { AggregatedState } from "Search/Scenarios/WikiV2/Flux/StoresHub";
import { InfoCodes, WikiSearchRequest, WikiSearchResponse } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { Filter, FILTER_CHANGE_EVENT, IFilterState, FILTER_RESET_EVENT } from "SearchUI/Utilities/Filter";

const defaultMaxResults = 50;

export interface Sources {
    searchSource: WikiSearchSource;
    pageSource: PageSource;
    orgInfoDataProviderSource: OrgInfoDataProviderSource;
}

export class ActionCreator {
    private readonly events: EventGroup;

    constructor(
        private readonly actionsHub: ActionsHub,
        private readonly filter: Filter,
        private readonly sources: Sources,
        private readonly getAggregatedState: () => AggregatedState,
        private readonly telemetryWriter?: TelemetryWriter
    ) {
        this.filter.subscribe(this.applyFilter, FILTER_CHANGE_EVENT);
        this.events = new EventGroup(this.filter);
        this.events.on(this.filter, FILTER_RESET_EVENT, this.onFilterResetClick);

    }

    public dispose = (): void => {
        this.events.off(this.filter);
    }

    public loadInitialState = (text: string, filtersString?: string): void => {
        const request = {
            searchText: text,
            $skip: 0,
            $top: defaultMaxResults,
            $orderBy: null,
            filters: filtersString ? deserialize<IDictionaryStringTo<string[]>>(filtersString) : {}
        } as WikiSearchRequest;

        this.actionsHub.pageInitializationStarted.invoke({ request });

        this.sources.searchSource.getWikiSearchResults(request).then(
            results => this._onSearchSucceded(request, results, false),
            error => this._onSearchFailed(error));
    }

    public openSearchInNewTab = (searchText: string): void => {
        const { searchStoreState } = this.getAggregatedState();
        this.sources.pageSource.navigateToNewSearch(searchText, searchStoreState.request.filters);
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.SearchInNewTab);
    }

    public applySearchText = (searchText: string) => {
        const aggregatedState = this.getAggregatedState();
        const { searchStoreState } = aggregatedState;

        this.performSearch(searchText, searchStoreState.request.filters, false);
    }

    public performSearch = (
        searchText: string,
        searchFilters: { [key: string]: string[]; },
        loadMoreResults?: boolean,
    ): void => {
        const { searchStoreState } = this.getAggregatedState();

        searchText = searchText && searchText.trim();
        if (!searchText) {
            return;
        }

        const query = {
            $orderBy: null,
            searchText: searchText,
            $skip: 0,
            $top: defaultMaxResults,
            filters: searchFilters
        } as WikiSearchRequest;

        this._doSearch(query, loadMoreResults);
    }

    public fetchMoreItems = (): void => {
        const searchStoreState = this.getAggregatedState().searchStoreState;

        const skip = searchStoreState && searchStoreState.response && searchStoreState.response.results ? searchStoreState.response.results.length : 0;

        const query = {
            ...searchStoreState.request,
            $skip: skip
        };

        this._doSearch(query, true);
    }

    /**
    *  Send query on landing page scenario to update searchstore to an adequate state
    */
    public showLandingPage = (filter?: string): void => {
        const request = {
            $orderBy: null,
            $skip: 0,
            $top: defaultMaxResults,
            filters: filter ? deserialize<IDictionaryStringTo<string[]>>(filter) : {}
        } as WikiSearchRequest;

        this.actionsHub.pageInitializationStarted.invoke({ request, isLandingPage: true });
    }

    public applyFilter = (filterState: IFilterState): void => {
        const currentFilterState = this.filter.getState();
        const aggregatedState = this.getAggregatedState();
        const { filterStoreState, searchStoreState } = aggregatedState;
        const { filterItems } = filterStoreState;

        const filters: IDictionaryStringTo<string[]> = {};
        Object
            .keys(currentFilterState)
            .forEach((key) => {
                const value = currentFilterState[key].value;
                if (!value) {
                    return;
                }

                if (filterItems[key].enabled) {
                    filters[key] = value;
                }
            });

        // Create a new search query with updated filters.
        const query = {
            ...searchStoreState.request,
            $skip: 0,
            filters: filters
        } as WikiSearchRequest;

        this._doSearch(query);
    }

    /**
    * Method exposed for L0 testing purposes.
    */
    public applyFilters = (filters: IDictionaryStringTo<string[]>): void => {
        const filterState: IFilterState = {};

        Object.keys(filters)
            .forEach(key => {
                filterState[key] = { value: filters[key] };
            });

        this.filter.setState(filterState);
    }

    public onRemoveSearchText = () => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.SearchTextRemoved);
    }

    public notifyResultsRendered = (): void => {
        this.telemetryWriter.initialScenario.notifyResultsRendered();
    }

    public notifyFeedbackMailLinkClicked = (): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FeedbackMailLinkClicked);
    }

    public publishZeroData = (scenarioType: string): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.ZeroData, { scenarioType });
    }

    public clickAccountLink = (): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.AccountLinkClicked);
    }

    public clickAccountButton = (url: string): void => {
        this.sources.pageSource.openUrlInNewtab(url);
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.AccountButtonClicked);
    }

    public onFilterResetClick = (): void => {
        this.actionsHub.filterReset.invoke({});
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FilterResetClicked);
    }

    public publishNotificationBanner = (scenarioType: string): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.NotificationBanner, { scenarioType });
    }

    public errorNotificationBannerDismissed = (): void => {
        this.actionsHub.errorNotificationBannerDismissed.invoke({});
    }

    public handleSearchThisOrgButtonClick = (searchText: string): void => {
        const { orgSearchUrlLoadState } = this.getAggregatedState().organizationInfoState;
        if (orgSearchUrlLoadState === OrgSearchUrlLoadState.OrgSearchUrlLoadSucceed)
        {
            this.navigateToOrgSearchPage(searchText);
        }
        else
        {
            this.loadOrganizationInfoAndNavigateToUrl(searchText);
        }
    }

    private navigateToOrgSearchPage = (searchText: string): void => {
        const url: string = this.getAggregatedState().organizationInfoState.organizationInfo.organizationUrl;
        if (url !== undefined)
        {
            const completeOrgSearchUrl = constructCompleteOrgSearchURL(
                url,
                searchText,
                Constants.CustomerIntelligenceConstants.OrgSearchNavigationFromWikiSearchPageSource,
                SharedConstants.OrgSearchUrlTypeWiki);
            this.sources.pageSource.openUrlInNewtab(completeOrgSearchUrl);
        }
    }

    private loadOrganizationInfoAndNavigateToUrl = (searchText: string): void => {
        this.sources.orgInfoDataProviderSource.getOrganizationInfo().then(
            (organizationInfo: IOrganizationInfo) => {
                if (organizationInfo && organizationInfo.organizationUrl)
                {
                    this.actionsHub.organizationInfoLoaded.invoke(organizationInfo);
                    this.navigateToOrgSearchPage(searchText);
                }
                else
                {
                    this.actionsHub.organizationInfoLoadFailed.invoke({});
                }
            },
            (error: Error) => {
                this.actionsHub.organizationInfoLoadFailed.invoke({});
            }
        );
    }

    private _doSearch(request: WikiSearchRequest, fetchMoreScenario?: boolean): void {
        this.actionsHub.searchStarted.invoke({
            request: request,
            fetchMoreScenario: fetchMoreScenario
        });

        this.sources.searchSource.getWikiSearchResults(request).then(
            results => this._onSearchSucceded(request, results, fetchMoreScenario),
            error => this._onSearchFailed(error));
    }

    private _onSearchSucceded = (request: WikiSearchRequest, response: WikiSearchResponse, fetchMoreScenario: boolean): void => {
        this.actionsHub.resultsLoaded.invoke({
            response: response,
            request: request,
            fetchMoreScenario: fetchMoreScenario
        });
    }

    private _onSearchFailed = (error): void => {
        this.actionsHub.searchFailed.invoke(error);
    }
}
