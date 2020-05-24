import * as Performance from "VSS/Performance";

export module SplitNames {
    export const viewInitializationStarted = "view-initialization-started";
    export const viewInitialized = "view-initialized";
    export const fluxInitializationStarted = "flux-initialization-started";
    export const fluxInitialized = "flux-initialized";
    export const emptyRepositoryLoaded = "tab-loaded-empty-repository";
    export const viewLoaded = "view-loaded";
}

export class PagePerformance {
    private static _ttiPerformance: Performance.IScenarioDescriptor;
    private static _scenarioPerformance: Performance.IScenarioDescriptor;
    private static _isInitialized: boolean = false;

    public static initializePage(featureArea: string, name: string, isInteractive: boolean = true) {
        PagePerformance._ttiPerformance = Performance.getScenarioManager().startScenarioFromNavigation(featureArea, name, isInteractive);
        this._isInitialized = false;
    }

    public static get scenario(): Performance.IScenarioDescriptor {
        return this._isInitialized ? this._scenarioPerformance : this._ttiPerformance;
    }

    public static get isInitialized(): boolean {
        return this._isInitialized;
    }

    public static pageInitialized(splitName?: string) {
        this._isInitialized = true;
        if (splitName) {
            this._ttiPerformance.addSplitTiming(splitName);
        }
    }

    public static startScenario(featureArea: string, name: string) {
        delete this._scenarioPerformance;
        this._scenarioPerformance = Performance.getScenarioManager().startScenario(featureArea, name);
    }
}