import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHub";
import * as EventsServices from "VSS/Events/Services";
import { ActionsHub } from "Search/Scenarios/WorkItem/Flux/ActionsHub";
import { StoresHub } from "Search/Scenarios/WorkItem/Flux/StoresHub";
import { getService } from "VSS/Service";
import { IPivotStateService, PivotStateService, ICountState } from "Search/Scenarios/Shared/Base/PivotStateService";
import { serializeFilters, serializeSortOptions } from "Search/Scenarios/Shared/Utils";
import { WorkItemSearchResponse, WorkItemResult, WorkItemSearchRequest } from "Search/Scenarios/WebApi/Workitem.Contracts";

export class PivotStateServiceSpy {
    private readonly tabStateProviderService: IPivotStateService;

    constructor(
        private actionsHub: ActionsHub,
        private storesHub: StoresHub,
        private readonly providerContributionId: string) {

        this.tabStateProviderService = getService<PivotStateService>(PivotStateService);
        this.registerActionsHubHandlers();
    }

    public dispose = (): void => {
        this.disposeActionsHubHandlers();
    }

    private registerActionsHubHandlers = (): void => {
        this.actionsHub.searchStarted.addListener(this.storeCurrentFiltersandSortOptions);
        this.actionsHub.pageInitializationStarted.addListener(this.storeCurrentFiltersandSortOptions);
        this.actionsHub.filterReset.addListener(this.resetFilters);
        this.actionsHub.sortOptionChanged.addListener(this.storeSortOptions);
        this.actionsHub.resultsLoaded.addListener(this.storeCurrentResultsCount);
    }

    private disposeActionsHubHandlers = (): void => {
        this.actionsHub.resultsLoaded.removeListener(this.storeCurrentResultsCount);
        this.actionsHub.searchStarted.removeListener(this.storeCurrentFiltersandSortOptions);
        this.actionsHub.pageInitializationStarted.removeListener(this.storeCurrentFiltersandSortOptions);
        this.actionsHub.filterReset.addListener(this.resetFilters);
        this.actionsHub.sortOptionChanged.addListener(this.storeSortOptions);
    }

    private storeCurrentFiltersandSortOptions = (payload: BaseActionsHub.SearchStartedPayload<WorkItemSearchRequest>): void => {
        this.tabStateProviderService.updateState(
            this.providerContributionId,
            serializeFilters(payload.query.searchFilters),
            serializeSortOptions(payload.query.sortOptions));
    }

    private storeCurrentResultsCount = (payload: BaseActionsHub.ResultsLoadedPayload<WorkItemSearchResponse, WorkItemResult>): void => {
        const count = payload.response.results.count;
        const query = this.storesHub.getAggregatedState().searchStoreState.query;
        this.tabStateProviderService.updateState(this.providerContributionId, undefined, undefined, { searchtext: query.searchText, count });
    }

    private storeSortOptions = (payload: BaseActionsHub.SortOptionChangedPayload<WorkItemResult>): void => {
        this.tabStateProviderService.updateState(this.providerContributionId, undefined, serializeSortOptions( [payload.sortOption]));
    }

    private resetFilters = (): void => {
        this.tabStateProviderService.resetFilters(this.providerContributionId);
    }
}