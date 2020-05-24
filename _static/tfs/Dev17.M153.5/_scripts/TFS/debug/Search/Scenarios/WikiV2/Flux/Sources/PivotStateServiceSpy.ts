import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHubV2";
import { ActionsHub } from "Search/Scenarios/WikiV2/Flux/ActionsHub";
import { StoresHub } from "Search/Scenarios/WikiV2/Flux/StoresHub";
import { getService } from "VSS/Service";
import { IPivotStateService, PivotStateService, ICountState } from "Search/Scenarios/Shared/Base/PivotStateService";
import { serializeFilters } from "Search/Scenarios/Shared/Utils";
import { WikiSearchResponse, WikiSearchRequest, WikiResult } from "Search/Scripts/Generated/Search.Shared.Contracts";

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

    private storeCurrentFilters = (payload: BaseActionsHub.SearchStartedPayload<WikiSearchRequest>): void => {
        this.tabStateProviderService.updateState(
            this.providerContributionId,
            serializeFilters(payload.request.filters));
    }

    private storeCurrentResultsCount = (payload: BaseActionsHub.ResultsLoadedPayload<WikiSearchRequest, WikiSearchResponse, WikiResult>): void => {
        const count = payload.response.count;
        const query = this.storesHub.getAggregatedState().searchStoreState.request;
        this.tabStateProviderService.updateState(this.providerContributionId, undefined, undefined, { searchtext: query.searchText, count });
    }

    private resetFilters = (): void => {
        this.tabStateProviderService.resetFilters(this.providerContributionId);
    }
}