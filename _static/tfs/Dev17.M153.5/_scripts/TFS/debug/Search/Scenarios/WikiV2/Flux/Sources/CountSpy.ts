import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHubV2";
import * as EventsServices from "VSS/Events/Services";
import * as SearchEvents from "Search/Scenarios/Shared/Events";
import { ActionsHub } from "Search/Scenarios/WikiV2/Flux/ActionsHub";
import { StoresHub } from "Search/Scenarios/WikiV2/Flux/StoresHub";
import { WikiSearchResponse, WikiSearchRequest, WikiResult } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";

/**
 * Creates event to update results count on pivots based on actions in wiki search page.
 */
export class CountSpy {

    constructor(
        private actionsHub: ActionsHub,
        private storesHub: StoresHub,
        private project: string) {
        this.registerActionsHubHandlers();
    }

    public dispose = (): void => {
        this.disposeActionsHubHandlers();
    }

    private registerActionsHubHandlers = (): void => {
        this.actionsHub.resultsLoaded.addListener(this.onResultsLoaded);
        this.actionsHub.searchFailed.addListener(this.onSearchFailed);
        this.actionsHub.searchStarted.addListener(this.onSearchStarted);
        this.actionsHub.pageInitializationStarted.addListener(this.onPageInitializationStarted);
    }

    private disposeActionsHubHandlers = (): void => {
        this.actionsHub.resultsLoaded.removeListener(this.onResultsLoaded);
        this.actionsHub.searchFailed.removeListener(this.onSearchFailed);
        this.actionsHub.searchStarted.removeListener(this.onSearchStarted);
        this.actionsHub.pageInitializationStarted.removeListener(this.onPageInitializationStarted);
    }

    private onResultsLoaded = (payload: BaseActionsHub.ResultsLoadedPayload<WikiSearchRequest, WikiSearchResponse, WikiResult>): void => {
        const resultsCount = payload.response.count;
        const query = this.storesHub.getAggregatedState().searchStoreState.request;
        EventsServices.getService().fire(SearchEvents.ENTITY_SEARCH_COMPLETED, this, {
            resultsCount,
            searchFilters: query.filters,
            searchText: query.searchText,
        } as SearchEvents.ISearchResultsPayload);
    }

    private onSearchFailed = (payload: BaseActionsHub.SearchFailedPayload): void => {
        const query = this.storesHub.getAggregatedState().searchStoreState.request;
        EventsServices.getService().fire(SearchEvents.ENTITY_SEARCH_FAILED, this, {
            searchFilters: query.filters,
            searchText: query.searchText,
        } as SearchEvents.ISearchResultsPayload);
    }

    private onSearchStarted = (payload: BaseActionsHub.SearchStartedPayload<WikiSearchRequest>): void => {
        const query = this.storesHub.getAggregatedState().searchStoreState.request;
        
        // Need to clean this up once Project scoped API for Count APIs are introduced
        // add project filter in project context
        const searchFilters: {[key: string]: string[]} = {};
        if (this.project) {
            searchFilters[SearchConstants.ProjectFilterNew] = [this.project];
        }

        EventsServices.getService().fire(SearchEvents.ENTITY_SEARCH_STARTED, this, {
            searchFilters: searchFilters,
            searchText: query.searchText,
        } as SearchEvents.ISearchStartedPayload);
    }

    private onPageInitializationStarted = (payload: BaseActionsHub.PageInitializationStartedPayload<WikiSearchRequest>): void => {
        if(payload && !payload.isLandingPage) {
            this.onSearchStarted(payload);
        }
    }
}
