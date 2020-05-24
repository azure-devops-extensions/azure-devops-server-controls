import * as Performance from "VSS/Performance";
import * as CommonCIConstants from "Search/Scenarios/Shared/CustomerIntelligenceConstants";
import { SearchPerfTelemetryAdditionalData } from "Search/Scenarios/Shared/Base/Telemetry";

/**
 * Scenario to track sub-sequent searches once the page is already loaded.
 */
export class SubsequentScenario {
    private scenario: Performance.IScenarioDescriptor;

    constructor(private scenarioName: string) { }

    /**
    * Create a new scenario, abort if previous scenario is already active.
    * Since on researches we only care about the response for latest search text
    */
    public notifySearchStarted = (): void => {
        if (this.scenario && this.scenario.isActive()) {
            this.scenario.abort();
        }

        this.scenario =
            Performance
                .getScenarioManager()
                .startScenario(CommonCIConstants.SEARCH_AREA, this.scenarioName);

        this.scenario.addSplitTiming("searchStarted");
    }

    /**
    * Abort current active scenario if search query failed.
    */
    public notifySearchFailed = (): void => {
        // We don't want to track scenarios for which search ended up failing, therefore abort.
        if (this.scenario) {
            this.scenario.abort();
        }
    }

    /**
    * Complete the scenario once the results have finished rendering.
    * Also pass on addition data to make telemetry correlation easier
    */
    public notifyResultsRendered = (data: SearchPerfTelemetryAdditionalData): void => {
        if (this.scenario && this.scenario.isActive()) {
            this.scenario.addSplitTiming("resultsRendered");
            this.scenario.addData(data);
            this.scenario.end();
        }
    }

    public dispose = (): void => {
        // this.scenario could be unintialized if without searching again on the current entity one decides to switch to a different entity.
        if (this.scenario) {
            this.scenario.abort();
            this.scenario = null;
        }
    }
}