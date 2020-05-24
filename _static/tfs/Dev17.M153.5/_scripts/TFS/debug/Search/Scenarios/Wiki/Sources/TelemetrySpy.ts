import { autobind } from "OfficeFabric/Utilities";
import { ActionsHub, SearchStartedPayload, SearchResultsLoadedPayload } from "Search/Scenarios/Wiki/ActionsHub";
import { TelemetryWriter } from "Search/Scenarios/Wiki/Sources/TelemetryWriter";
import { WikiSearchTelemetryConstants } from "Search/Scenarios/Wiki/WikiSearchConstants";
import { getScenarioManager, IScenarioDescriptor } from "VSS/Performance";

/**
 * Writes telemetry events based on the Wiki search actions invoked in Flux.
 */
export class TelemetrySpy implements IDisposable {

    private readonly _initialScenario: TTIScenario;

    constructor(
        private _telemetryWriter: TelemetryWriter,
        private _actionsHub: ActionsHub
    ) {
        this._initialScenario = new TTIScenario();
        this._registerActionsHubHandlers();
    }

    public dispose(): void {
        this._disposeActionsHubHandlers();
    }

    private _registerActionsHubHandlers(): void {
        this._actionsHub.searchResultsLoaded.addListener(this._notifyContentRendered);
        this._actionsHub.searchStarted.addListener(this._publishFetchMoreClicked);
    }

    private _disposeActionsHubHandlers(): void {
        this._actionsHub.searchResultsLoaded.removeListener(this._notifyContentRendered);
        this._actionsHub.searchStarted.removeListener(this._publishFetchMoreClicked);
    }

    @autobind
    private _publishFetchMoreClicked(payload: SearchStartedPayload): void {
        if (payload.isLoadMore) {
            this._telemetryWriter.publish(WikiSearchTelemetryConstants.ShowMoreResultsClickedScenario);
        }
    }

    @autobind
    private _notifyContentRendered(): void {
        this._initialScenario.notifyContentRendered(WikiSearchTelemetryConstants.WikiSearchLoadedScenario);
    }
}

class TTIScenario {
    private _performanceScenario: IScenarioDescriptor;

    constructor() {
        this._performanceScenario = getScenarioManager().startScenarioFromNavigation(
                                                WikiSearchTelemetryConstants.AreaName,
                                                WikiSearchTelemetryConstants.WikiSearchPerformanceScenario, true);
        this._performanceScenario.addSplitTiming("startedInitialization");
    }

    public notifyContentRendered = (scenario: string): void => {
        if (this._performanceScenario.isActive()) {
            this._performanceScenario.addSplitTiming(scenario);
            this._performanceScenario.end();
        }
    }
}
