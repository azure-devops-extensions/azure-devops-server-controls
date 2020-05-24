import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHub";
import { ActionsHub } from "Search/Scenarios/Code/Flux/ActionsHub";
import { StoresHub } from "Search/Scenarios/Code/Flux/StoresHub";
import { getService } from "VSS/Service";
import { IPivotStateService, PivotStateService, ICountState } from "Search/Scenarios/Shared/Base/PivotStateService";
import { serializeFilters } from "Search/Scenarios/Shared/Utils";
import { SearchQuery, CodeResult, CodeQueryResponse } from "Search/Scenarios/WebApi/Code.Contracts";

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
        this.actionsHub.searchStarted.addListener(this.storeCurrentFilters);
        this.actionsHub.pageInitializationStarted.addListener(this.storeCurrentFilters);
        this.actionsHub.filterReset.addListener(this.resetFilters);
        this.actionsHub.resultsLoaded.addListener(this.storeCurrentResultsCount);
    }

    private disposeActionsHubHandlers = (): void => {
        this.actionsHub.resultsLoaded.removeListener(this.storeCurrentResultsCount);
        this.actionsHub.searchStarted.removeListener(this.storeCurrentFilters);
        this.actionsHub.pageInitializationStarted.removeListener(this.storeCurrentFilters);
        this.actionsHub.filterReset.removeListener(this.resetFilters);
    }

    private storeCurrentFilters = (payload: BaseActionsHub.SearchStartedPayload<SearchQuery>): void => {
        this.tabStateProviderService.updateState(
            this.providerContributionId,
            serializeFilters(payload.query.searchFilters));
    }

    private storeCurrentResultsCount = (payload: BaseActionsHub.ResultsLoadedPayload<CodeQueryResponse, CodeResult>): void => {
        const count = payload.response.results.count;
        const query = this.storesHub.getAggregatedState().searchStoreState.query;
        this.tabStateProviderService.updateState(this.providerContributionId, undefined, undefined, { searchtext: query.searchText, count });
    }

    private resetFilters = (): void => {
        this.tabStateProviderService.resetFilters(this.providerContributionId);
    }
}