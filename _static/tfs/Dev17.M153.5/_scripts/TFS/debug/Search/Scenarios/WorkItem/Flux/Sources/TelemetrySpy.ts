import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHub";
import { ActionsHub } from "Search/Scenarios/WorkItem/Flux/ActionsHub";
import { StoresHub } from "Search/Scenarios/WorkItem/Flux/StoresHub";
import { WorkItemSearchRequest, WorkItemSearchResponse, WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { WorkitemPreviewPaneScenario } from "Search/Scenarios/WorkItem/Flux/Stores/NotificationStore";
import { TelemetryWriter } from "Search/Scenarios/WorkItem/Flux/Sources/TelemetryWriter";
import { CustomerIntelligenceConstants } from "Search/Scenarios/WorkItem/Constants";

/**
 * Writes telemetry events based on actions in work item search page.
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
        this.actionsHub.resultsLoaded.addListener(this.publishResultsLoaded);
        this.actionsHub.filterPaneVisibilityChanged.addListener(this.publishFilterPaneVisibilityChanged);
        this.actionsHub.itemChanged.addListener(this.publishItemChanged);
        this.actionsHub.sortOptionChanged.addListener(this.publishSortOptionChanged);
        this.actionsHub.previewOrientationChanged.addListener(this.publishPreviewOrientationChanged);
        this.actionsHub.showPreviewMessageBanner.addListener(this.publishPreviewMessageBanner);
    }

    private disposeActionsHubHandlers = (): void => {
        this.actionsHub.searchStarted.removeListener(this.publishSearchStarted);
        this.actionsHub.pageInitializationStarted.removeListener(this.publishPageInitializationStarted);
        this.actionsHub.resultsLoaded.removeListener(this.publishResultsLoaded);
        this.actionsHub.filterPaneVisibilityChanged.removeListener(this.publishFilterPaneVisibilityChanged);
        this.actionsHub.itemChanged.removeListener(this.publishItemChanged);
        this.actionsHub.sortOptionChanged.removeListener(this.publishSortOptionChanged);
        this.actionsHub.previewOrientationChanged.removeListener(this.publishPreviewOrientationChanged);
        this.actionsHub.showPreviewMessageBanner.removeListener(this.publishPreviewMessageBanner);
    }

    private publishPageInitializationStarted = (payload: BaseActionsHub.PageInitializationStartedPayload<WorkItemSearchRequest>): void => {
        this.telemetryWriter.initialScenario.notifySearchStarted();
        this.telemetryWriter.publish(CustomerIntelligenceConstants.SearchStarted, {});

        const { launchPoint } = payload;
        if (launchPoint) {
            this.telemetryWriter.publish(CustomerIntelligenceConstants.LaunchPoint, { launchPoint });
        }
    }

    private publishSearchStarted = (): void => {
        this.telemetryWriter.subsequentScenario.notifySearchStarted();
        this.telemetryWriter.publish(CustomerIntelligenceConstants.SearchStarted, {});
    }
    
    private publishResultsLoaded = (payload: BaseActionsHub.ResultsLoadedPayload<WorkItemSearchResponse, WorkItemResult>): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.ResultsLoaded, {
            totalCount: payload.response.results.count,
            resultsShown: payload.response.results.values.length
        });
    }

    private publishFilterPaneVisibilityChanged = (payload: boolean): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.FilterPaneVisibilityChanged, {
            isFilterPaneVisible: payload
        });
    }

    private publishItemChanged = (payload: BaseActionsHub.ItemChangedPayload<WorkItemResult>): void => {
        const { searchStoreState } = this.storesHub.getAggregatedState(),
            { response } = searchStoreState;
        this.telemetryWriter.publish(CustomerIntelligenceConstants.ItemChanged, {
            index: response.results.values.indexOf(payload.item)
        });
    }

    private publishSortOptionChanged = (payload: BaseActionsHub.SortOptionChangedPayload<WorkItemResult>): void => {
        const { sortOption } = payload;
        this.telemetryWriter.publish(CustomerIntelligenceConstants.SortOptionChanged, { ...sortOption });
    }

    private publishPreviewOrientationChanged = (payload: BaseActionsHub.PreviewOrientationChangedPayload): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.PreviewOrientationChanged, {
            currentOrientation: payload.previewOrientation.name
        });
    }

    private publishPreviewMessageBanner = (payload: WorkitemPreviewPaneScenario): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.PreviewMessageBanner, {
            scenarioType: WorkitemPreviewPaneScenario[payload]
        });
    }
}
