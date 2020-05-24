import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHub";
import * as EventsServices from "VSS/Events/Services";
import * as SearchEvents from "Search/Scenarios/Shared/Events";
import { ActionsHub } from "Search/Scenarios/WorkItem/Flux/ActionsHub";
import { StoresHub } from "Search/Scenarios/WorkItem/Flux/StoresHub";
import { WorkItemSearchResponse, WorkItemResult, WorkItemSearchRequest } from "Search/Scenarios/WebApi/Workitem.Contracts";

/**
 * Creates event to update results count on pivots based on actions in work item search page.
 */
export class CountSpy {

    constructor(
        private actionsHub: ActionsHub,
        private storesHub: StoresHub) {
            this.registerActionsHubHandlers();
    }

    public dispose = (): void => {
        this.disposeActionsHubHandlers();
    }

    private registerActionsHubHandlers = (): void => {
        this.actionsHub.resultsLoaded.addListener(this.onResultsLoaded);
        this.actionsHub.searchFailed.addListener(this.onSearchFailed);
        this.actionsHub.searchStarted.addListener(this.onSearchStartedNonLandingPage);
        this.actionsHub.pageInitializationStarted.addListener(this.onSearchStartedPageInitialized);
    }

    private disposeActionsHubHandlers = (): void => {
        this.actionsHub.resultsLoaded.removeListener(this.onResultsLoaded);
        this.actionsHub.searchFailed.removeListener(this.onSearchFailed);
        this.actionsHub.searchStarted.removeListener(this.onSearchStartedNonLandingPage);
        this.actionsHub.pageInitializationStarted.removeListener(this.onSearchStartedPageInitialized);
    }

    private onResultsLoaded = (payload: BaseActionsHub.ResultsLoadedPayload<WorkItemSearchResponse, WorkItemResult>): void => {
        const resultsCount = payload.response.results.count;
        const query = this.storesHub.getAggregatedState().searchStoreState.query;
        EventsServices.getService().fire(SearchEvents.ENTITY_SEARCH_COMPLETED, this, {
            resultsCount,
            searchFilters: query.searchFilters,
            searchText: query.searchText,
        } as SearchEvents.ISearchResultsPayload);
    }

    private onSearchFailed = (payload: BaseActionsHub.SearchFailedPayload<WorkItemSearchRequest>): void => {
        const query = this.storesHub.getAggregatedState().searchStoreState.query;
        EventsServices.getService().fire(SearchEvents.ENTITY_SEARCH_FAILED, this, {
            searchFilters: query.searchFilters,
            searchText: query.searchText,
        } as SearchEvents.ISearchResultsPayload);
    }

    private onSearchStarted = (payload: BaseActionsHub.SearchStartedPayload<WorkItemSearchRequest>, isLandingPage: boolean): void => {
        const query = this.storesHub.getAggregatedState().searchStoreState.query;
        EventsServices.getService().fire(SearchEvents.ENTITY_SEARCH_STARTED, this, {
            searchFilters: query.searchFilters,
            searchText: query.searchText,
            isLandingPage,
        } as SearchEvents.ISearchStartedPayload);
    }

    private onSearchStartedNonLandingPage = (payload: BaseActionsHub.SearchStartedPayload<WorkItemSearchRequest>): void => {
        this.onSearchStarted(payload, false);
    }

    private onSearchStartedPageInitialized = (payload: BaseActionsHub.PageInitializationStartedPayload<WorkItemSearchRequest>): void => {
        this.onSearchStarted(payload, payload.isLandingPage)
    }
}
