
import { Singleton } from "DistributedTaskControls/Common/Factory";

import * as Performance from "VSS/Performance";

/**
 * @brief Utilities for Performance counters
 */
export class PerfUtils extends Singleton {

    public constructor() {
        super();
        this._scenarioManager = Performance.getScenarioManager();
    }

    public static instance(): PerfUtils {
        return super.getInstance<PerfUtils>(PerfUtils);
    }

    /**
     * @brief Ends the scenario if already existing and creates a new scenario
     */
    public startNewScenario(featureArea: string, scenarioName: string): Performance.IScenarioDescriptor {
        this._endExistingScenario(featureArea, scenarioName);
        return this._scenarioManager.startScenario(featureArea, scenarioName);
    }

    /**
     * @brief Splits a scenario
     */
    public splitScenario(splitName: string, featureArea?: string, scenarioName?: string): void {
        
        if (!!featureArea && !!scenarioName && this._scenarioManager.getScenarios(featureArea, scenarioName).length <= 0) {
            this._scenarioManager.startScenario(featureArea, scenarioName);
        }

        this._scenarioManager.split(splitName);
    }

    /**
     * @brief Ends an existing scenario
     */
    public endScenario(featureArea: string, scenarioName: string): void {
        this._scenarioManager.endScenario(featureArea, scenarioName);
    }

    /**
     * @brief Aborts an existing scenario
     */
    public abortScenario(featureArea: string, scenarioName: string): void {
        this._scenarioManager.abortScenario(featureArea, scenarioName);
    }

    /**
     * @brief Ends the scenario if already existing and creates new Page load scenario
     */
    public recordPageLoadScenario(featureArea: string, scenarioName: string): void {
        this._endExistingScenario(featureArea, scenarioName);
        this._scenarioManager.recordPageLoadScenario(featureArea, scenarioName);
    }

    /**
     * @brief ends an existing scenario
     */
    private _endExistingScenario(featureArea: string, scenarioName: string): void {
        let scenarios = this._scenarioManager.getScenarios(featureArea, scenarioName);
        scenarios.forEach((scenario: Performance.IScenarioDescriptor) => {
            scenario.end();
        });
    }

    private _scenarioManager: Performance.IScenarioManager;
}