import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHub";
import { ActionsHub, ActiveTabChangedPayload } from "Search/Scenarios/Code/Flux/ActionsHub";
import { StoresHub } from "Search/Scenarios/Code/Flux/StoresHub";
import { CodeResult, CodeQueryResponse, SearchQuery } from "Search/Scenarios/WebApi/Code.Contracts";
import { TelemetryWriter } from "Search/Scenarios/Code/Flux/Sources/TelemetryWriter";
import { CustomerIntelligenceConstants } from "Search/Scenarios/Code/Constants";

/**
 * Writes telemetry events based on actions in code search page.
 */
export class TelemetrySpy {
    constructor(
        private telemetryWriter: TelemetryWriter,
        private actionsHub: ActionsHub,
        private storesHub: StoresHub) {
        this.registerActionsHubHandlers();
    }

    public dispose = (): void => {
        this.disposeActionsHubHandlers();
        this.telemetryWriter.dispose();
    }

    private registerActionsHubHandlers = (): void => {
        this.actionsHub.searchStarted.addListener(this.publishSearchStarted);
        this.actionsHub.pageInitializationStarted.addListener(this.publishPageInitializationStarted);
        this.actionsHub.activeTabChanged.addListener(this.publishTabChanged);
        this.actionsHub.resultsLoaded.addListener(this.publishResultsLoaded);
        this.actionsHub.filterPaneVisibilityChanged.addListener(this.publishFilterPaneVisibilityChanged);
        this.actionsHub.nextHitNavigated.addListener(this.publishNextHitNavigated);
        this.actionsHub.prevHitNavigated.addListener(this.publishPrevHitNavigated);
        this.actionsHub.itemChanged.addListener(this.publishItemChanged);
        this.actionsHub.sortOptionChanged.addListener(this.publishSortOptionChanged);
        this.actionsHub.previewOrientationChanged.addListener(this.publishPreviewOrientationChanged);
        this.actionsHub.tenantQueryStarted.addListener(this.publishTenantQueryStarted);
        this.actionsHub.fullScreenToggled.addListener(this.publishFullScreenToggled);
    }

    private disposeActionsHubHandlers = (): void => {
        this.actionsHub.searchStarted.removeListener(this.publishSearchStarted);
        this.actionsHub.pageInitializationStarted.removeListener(this.publishPageInitializationStarted);
        this.actionsHub.activeTabChanged.removeListener(this.publishTabChanged);
        this.actionsHub.resultsLoaded.removeListener(this.publishResultsLoaded);
        this.actionsHub.filterPaneVisibilityChanged.removeListener(this.publishFilterPaneVisibilityChanged);
        this.actionsHub.nextHitNavigated.removeListener(this.publishNextHitNavigated);
        this.actionsHub.prevHitNavigated.removeListener(this.publishPrevHitNavigated);
        this.actionsHub.itemChanged.removeListener(this.publishItemChanged);
        this.actionsHub.sortOptionChanged.removeListener(this.publishSortOptionChanged);
        this.actionsHub.previewOrientationChanged.removeListener(this.publishPreviewOrientationChanged);
        this.actionsHub.tenantQueryStarted.removeListener(this.publishTenantQueryStarted);
        this.actionsHub.fullScreenToggled.removeListener(this.publishFullScreenToggled);
    }

    private publishPageInitializationStarted = (payload: BaseActionsHub.PageInitializationStartedPayload<SearchQuery>): void => {
        this.telemetryWriter.initialScenario.notifySearchStarted();
        this.telemetryWriter.publish(CustomerIntelligenceConstants.SearchStarted, {});

        const { launchPoint } = payload;
        if (launchPoint) {
            this.telemetryWriter.publish(CustomerIntelligenceConstants.LaunchPoint, { launchPoint });
        }
    }

    private publishSearchStarted = (payload: BaseActionsHub.SearchStartedPayload<SearchQuery>): void => {
        this.telemetryWriter.subsequentScenario.notifySearchStarted();
        this.telemetryWriter.publish(CustomerIntelligenceConstants.SearchStarted, {});
        if (payload.fetchMoreScenario) {
            this.telemetryWriter.publish(CustomerIntelligenceConstants.FetchMoreResultsStarted);
        }
    }
    
    private publishResultsLoaded = (payload: BaseActionsHub.ResultsLoadedPayload<CodeQueryResponse, CodeResult>): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.ResultsLoaded, {
            totalCount: payload.response.results.count,
            resultsShown: payload.response.results.values.length
        });
    }

    private publishTabChanged = (payload: ActiveTabChangedPayload): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.TabChanged, { ...payload });
    }

    private publishFilterPaneVisibilityChanged = (payload: boolean): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.FilterPaneVisibilityChanged, {
            isFilterPaneVisible: payload
        });
    }

    private publishNextHitNavigated = (): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.NextHitNavigated);
    }

    private publishPrevHitNavigated = (): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.PrevHitNavigated);
    }

    private publishFullScreenToggled = (isFullScreen: boolean): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.FullScreenToggled, { isFullScreen });
    }

    private publishTenantQueryStarted = (): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.TenantQueryStarted);
    }

    private publishItemChanged = (payload: BaseActionsHub.ItemChangedPayload<CodeResult>): void => {
        const { searchStoreState } = this.storesHub.getAggregatedState(),
            { response } = searchStoreState;
        this.telemetryWriter.publish(CustomerIntelligenceConstants.ItemChanged, {
            index: response.results.values.indexOf(payload.item)
        });
    }

    private publishSortOptionChanged = (payload: BaseActionsHub.SortOptionChangedPayload<CodeResult>): void => {
        const { sortOption } = payload;
        this.telemetryWriter.publish(CustomerIntelligenceConstants.SortOptionChanged, { ...sortOption });
    }

    private publishPreviewOrientationChanged = (payload: BaseActionsHub.PreviewOrientationChangedPayload): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.PreviewOrientationChanged, {
            currentOrientation: payload.previewOrientation.name
        });
    }
}
