import * as Diag from "VSS/Diag";
import * as Performance from "VSS/Performance";
import * as VSS from "VSS/VSS";
import { getCookie } from "Presentation/Scripts/TFS/TFS.Core.Utils";

/**
 * Telemetry helper for performance scenarios, switch to use VssPerformanceService once we switch to use new platform.
 */
export class PerformanceTelemetryHelper {
    private static _onPageNavigationScenarioSuffix: string = "FromNavigation";

    public static getInstance(area: string): PerformanceTelemetryHelper {
        area = area.toLowerCase();
        if (!PerformanceTelemetryHelper._telemetryHelpersByArea[area]) {
            PerformanceTelemetryHelper._telemetryHelpersByArea[area] = new PerformanceTelemetryHelper(area);
        }
        return PerformanceTelemetryHelper._telemetryHelpersByArea[area];
    }

    public constructor(private _area: string) {

    }

    /**
     * Starts initial load performance scenario (TTI)
     */
    public startInitialLoad(scenarioName: string): void {
        Diag.Debug.assert(!this.isActive());

        if (!this.isActive()) {
            const name = `${scenarioName}.${PerformanceTelemetryHelper._onPageNavigationScenarioSuffix}`
            this._currentScenario = Performance.getScenarioManager().startScenarioFromNavigation(this._area, name, /** isPageInteractive **/ true);
            this._startMonitorContextSwitch(this._currentScenario);
        }
    }

    /**
     * Starts initial load performance scenario (TTI) for legacy agile hubs
     */
    public startLegacyPageLoad(scenarioName: string): void {
        if (!this.isActive()) {
            this._currentScenario = Performance.getScenarioManager().startScenarioFromNavigation(this._area, scenarioName, /** isPageInteractive **/ true);
        }
    }


    /**
     * Starts 'tab switch' performance scenario, we follow the format like:
     * {HubName}.{NewPivot}Open.PivotSwitch
     * (example: you switch from Capacity to Taskboard)
     */
    public startTabSwitch(hubName: string, newPivot: string): void {
        this.startScenario(`${hubName}.${PerformanceTelemetryHelper._convertPivotToCamelCase(newPivot)}Open.PivotSwitch`);
    }

    /**
     * Starts a scenario
     */
    public startScenario(scenarioName: string): void {
        Diag.Debug.assert(!this.isActive());
        // no-op if there is an active scenario (initial load)
        if (!this.isActive()) {
            this._currentScenario = Performance.getScenarioManager().startScenario(this._area, scenarioName);
        }
    }

    /**
     * End the current performance scenario
     */
    public end(): void {
        if (this.isActive() && this._currentScenario) {
            console.log(`${this._currentScenario.getName()} - ends`);
            this._currentScenario.end(Date.now());
            this._currentScenario = null;
        }
    }

    /**
     * End the current performance scenario
     */
    public abort(): void {
        if (this.isActive()) {
            this._currentScenario.abort();
            this._currentScenario = null;
        }
    }

    /**
    * Is the current scenario active?
    */
    public isActive(): boolean {
        return this._currentScenario && this._currentScenario.isActive();
    }

    /**
     * Add additional data to for the currently active scenario
     * @param data Property bag of additional data
     */
    public addData(data: any): void {
        if (this.isActive()) {
            this._currentScenario.addData(data);
        }
    }

    /**
     * Insert split timing for the currently active scenario
     * @param splitName Name of split timing
     */
    public split(splitName: string): void {
        if (this.isActive()) {
            this._currentScenario.addSplitTiming(splitName);
        }
    }

    private _shouldMonitor() {
        return !!getCookie("monitor_contextswitch");
    }

    private _startMonitorContextSwitch = (scenario: Performance.IScenarioDescriptor) => {
        if (this._shouldMonitor() && scenario.getName() !== "__pageload") {
            console.log(`Start Monitoring TTI scenario : ${scenario.getName()}`);
            const setTimeOutWrapper = setTimeout;
            const clear = this._setupMiddleware(scenario);
            let count = 0;
            const callback = () => {
                count++;
                if (scenario.isActive() && count < 100) {
                    console.log('Context switched: ', count);
                    setTimeOutWrapper(callback, 0);
                } else {
                    clear();
                }
            };

            setTimeOutWrapper(callback, 0);
        }
    }

    private _setupMiddleware(scenario: Performance.IScenarioDescriptor): () => void {
        // Wrap VSS.using
        const originalVssUsing = VSS.using;
        const vssUsingCalls = [];
        const vssUsingWrapper = (moduleNames: string[], callback: Function, errorCallback?: Function) => {
            vssUsingCalls.push(moduleNames);
            return originalVssUsing(moduleNames, (...args) => {
                // Tracks the VSS.using callbacks that resolved before TTI
                if (scenario.isActive()) {
                    console.log('VSS Usings resolved:', moduleNames);
                }
                callback(...args);
            }, errorCallback);
        }
        (VSS.using as any) = vssUsingWrapper;

        const originalPromiseThen = Promise.prototype.then;
        const promiseThenWrapper = function (...args) {
            const callback = originalPromiseThen.bind(this);
            if (scenario.isActive()) {
                console.log("promise resolved.", args[0]);
            }
            return callback(...args);
        }
        Promise.prototype.then = promiseThenWrapper;

        const originalSetTimeout = setTimeout;
        const wrapperSetTimeout = function (func, timeout) {
            const wrappedFunc = function () {
                if (scenario.isActive()) {
                    console.log("setTimeout resolved.", func);
                }
                func();
            };

            originalSetTimeout(wrappedFunc, timeout);
        };
        (setTimeout as any) = wrapperSetTimeout;

        return () => {
            console.log(`End Monitoring TTI scenario : ${scenario.getName()}`);
            (VSS.using as any) = originalVssUsing;
            Promise.prototype.then = originalPromiseThen;
            (setTimeout as any) = originalSetTimeout;
        }
    }

    /**
     * We will construct with the format like:
     * {HubName}.{Pivot}Open
     */
    public static constructNavigationScenarioName(hubName: string, pivot?: string): string {
        return `${hubName}.${PerformanceTelemetryHelper._convertPivotToCamelCase(pivot)}Open`;
    }

    private static _convertPivotToCamelCase(pivot?: string): string {
        if (pivot) {
            const allLower = pivot.toLowerCase();
            return allLower.charAt(0).toUpperCase() + allLower.slice(1);
        }
        return "";
    }

    private _currentScenario: Performance.IScenarioDescriptor = null;
    private static _telemetryHelpersByArea = {}
}