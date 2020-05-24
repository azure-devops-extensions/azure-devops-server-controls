import * as Performance from "VSS/Performance";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export class TTIScenario {
    private _performanceScenario: Performance.IScenarioDescriptor;

    constructor(scenarioName: string) {
        this._performanceScenario = Performance.getScenarioManager().startScenarioFromNavigation(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            scenarioName,
            true);
        this._performanceScenario.addSplitTiming("startedInitialization");
    }

    public abortScenario(): void {
        if (this._performanceScenario && this._performanceScenario.isActive()) {
            this._performanceScenario.abort();
        }
    }

    public addSplitTiming = (splitTimingName: string): void => {
        if (this._performanceScenario && this._performanceScenario.isActive()) {
            this._performanceScenario.addSplitTiming(splitTimingName);
        }
    }

    public notifyContentRendered = (splitTimingName: string): void => {
        if (this._performanceScenario && this._performanceScenario.isActive()) {
            this._performanceScenario.addSplitTiming(splitTimingName);
            this._performanceScenario.end();
        }
    }
}