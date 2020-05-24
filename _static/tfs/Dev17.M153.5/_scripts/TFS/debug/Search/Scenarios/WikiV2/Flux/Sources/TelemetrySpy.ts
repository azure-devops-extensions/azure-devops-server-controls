import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHubV2";
import { ActionsHub } from "Search/Scenarios/WikiV2/Flux/ActionsHub";
import { StoresHub } from "Search/Scenarios/WikiV2/Flux/StoresHub";
import { TelemetryWriter } from "Search/Scenarios/WikiV2/Flux/Sources/TelemetryWriter";
import { CustomerIntelligenceConstants } from "Search/Scenarios/WikiV2/Constants";
import { WikiSearchRequest, WikiSearchResponse, WikiResult } from "Search/Scripts/Generated/Search.Shared.Contracts";

/**
 * Writes telemetry events based on actions in wiki search page.
 */
export class TelemetrySpy {
    constructor(
        private telemetryWriter: TelemetryWriter,
        private actionsHub: ActionsHub,
        private storesHub: StoresHub) {
        this.registerActionsHubHandlers();
    }

    public dispose(): void {
        this.disposeActionsHubHandlers();
        this.telemetryWriter.dispose();
    }

    private registerActionsHubHandlers(): void {
        this.actionsHub.searchStarted.addListener(this.publishSearchStarted);
        this.actionsHub.pageInitializationStarted.addListener(this.publishSearchStarted);
        this.actionsHub.resultsLoaded.addListener(this.publishResultsLoaded);
        this.actionsHub.searchFailed.addListener(this.publishSearchFailed);
    }

    private disposeActionsHubHandlers(): void {
        this.actionsHub.searchStarted.removeListener(this.publishSearchStarted);
        this.actionsHub.pageInitializationStarted.removeListener(this.publishSearchStarted);
        this.actionsHub.resultsLoaded.removeListener(this.publishResultsLoaded);
        this.actionsHub.searchFailed.removeListener(this.publishSearchFailed);
    }

    private publishSearchStarted = (): void => {
        this.telemetryWriter.initialScenario.notifySearchStarted();
        this.telemetryWriter.publish(CustomerIntelligenceConstants.SearchStarted, {});
    }

    private publishResultsLoaded = (payload: BaseActionsHub.ResultsLoadedPayload<WikiSearchRequest, WikiSearchResponse, WikiResult>): void => {
        this.telemetryWriter.publish(CustomerIntelligenceConstants.ResultsLoaded, {
            totalCount: payload.response.count
        });
        this.telemetryWriter.initialScenario.notifyResultsRendered();
    }

    private publishSearchFailed = (): void => {
        this.telemetryWriter.initialScenario.dispose();
    }
}
