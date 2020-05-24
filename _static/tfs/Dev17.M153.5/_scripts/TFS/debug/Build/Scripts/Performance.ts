import React = require("react");

import {BuildCustomerIntelligenceInfo} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as ReactPerf from "VSS/Flux/ReactPerf";
import * as Performance from "VSS/Performance";

export class PageLoadScenarios {
    // definitions scenarios
    public static MyDefinitions: string = "PLT.Definitions.Mine";
    public static AllDefinitions: string = "PLT.Definitions.All";
    public static Queued: string = "PLT.Definitions.Queued";
    public static AllBuilds: string = "PLT.Definitions.AllBuilds";
    public static Xaml: string = "PLT.Definitions.XAML";

    // definition scenarios
    public static DefinitionSummary: string = "PLT.Definition.Summary";
    public static DefinitionHistory: string = "PLT.Definition.History";
    public static DefinitionDeletedHistory: string = "PLT.Definition.Deleted";
    public static DefinitionEditor: string = "PLT.Definition.Editor";

    // view build
    public static BuildDetails: string = "PLT.Build.Details";

    // old explorer tab scenarios
    public static Explorer: string = "PLT.Explorer";
}

export class NavigationScenarios {
    public static MyDefinitions: string = "Nav.Definitions.Mine";
    public static AllDefinitions: string = "Nav.Definitions.All";
    public static AllDefinitions2: string = "Nav.Definitions.All2";
    public static Queued: string = "Nav.Definitions.Queued";
    public static AllBuilds: string = "Nav.Definitions.Queued.AllBuilds";

    public static DefinitionSummary: string = "Nav.Definition.Summary";
    public static DefinitionHistory: string = "Nav.Definition.History";
}

export class DialogScenarios {
    // controller View state scenarios
    public static QueueBuild: string = "Dialog.Build.QueueBuild";
}

export class RenderScenarios {
    // controller View render scenarios
    public static DefinitionSummaryControllerView: string = "R.Definition.Summary.ControllerView";
}

export class StateScenarios {
    // controller View state scenarios
    public static DefinitionSummaryControllerView: string = "S.Definition.Summary.ControllerView";
}

var _pageLoadScenario: NavigationScenario = null;

/**
 * Represents a navigation scenario. If there is a current page-load scenario, this will overlay on top of it.
 */
export class NavigationScenario {
    private _scenarioDescriptor: Performance.IScenarioDescriptor = null;
    private _includeReactPerf: boolean = false;

    constructor(scenarioName: string, isPageLoadScenario: boolean = false, includeReactPerf: boolean = false) {
        this._includeReactPerf = includeReactPerf;

        let scenarioManager = Performance.getScenarioManager();
        this._scenarioDescriptor = isPageLoadScenario ? scenarioManager.startScenarioFromNavigation(BuildCustomerIntelligenceInfo.Area, scenarioName, true) : scenarioManager.startScenario(BuildCustomerIntelligenceInfo.Area, scenarioName);

        if (this._includeReactPerf) {
            ReactPerf.start();
        }
    }

    /**
     * Adds split timing to the scenario.
     * @param name
     * @param elapsedTime
     */
    public addSplitTiming(name: string, elapsedTime?: number): void {
        if (this._scenarioDescriptor) {
            this._scenarioDescriptor.addSplitTiming(name, elapsedTime);
        }
    }

    /**
     * Ends the scenario. If there is a current page-load scenario, this will end that as well.
     */
    public end(): void {
        if (this._scenarioDescriptor) {
            this._scenarioDescriptor.end();

            if (this === _pageLoadScenario) {
                _pageLoadScenario = null;
            }

            this._scenarioDescriptor = null;

            if (this._includeReactPerf) {
                ReactPerf.stop();
                ReactPerf.printWasted(ReactPerf.getLastMeasurements());
            }
        }
    }
}

/**
 * Starts a new page-load scenario, if one is not already active.
 * @param scenarioName
 */
export function startPageLoadScenario(scenarioName: string): NavigationScenario {
    if (!_pageLoadScenario) {
        _pageLoadScenario = new NavigationScenario(scenarioName, true, true);
    }

    return _pageLoadScenario;
}

/**
 * Starts a new navigation scenario, unless a page-load scenario is already active.
 * @param scenarioName
 * @param includeReactPerf
 */
export function startNavigationScenario(scenarioName: string, includeReactPerf: boolean = false): NavigationScenario {
    if (_pageLoadScenario) {
        return _pageLoadScenario;
    }
    else {
        return new NavigationScenario(scenarioName, false, includeReactPerf);
    }
}

/**
 * Adds split timing to the current page-load scenario.
 * @param name
 * @param elapsedTime
 */
export function addPageLoadSplitTiming(name: string, elapsedTime?: number): void {
    if (_pageLoadScenario) {
        _pageLoadScenario.addSplitTiming(name, elapsedTime);
    }
}

/**
 * Ends the current page-load scenario.
 */
export function endPageLoadScenario(): void {
    if (_pageLoadScenario) {
        _pageLoadScenario.end();
        _pageLoadScenario = null;

        ReactPerf.stop();
        ReactPerf.printWasted(ReactPerf.getLastMeasurements());
    }
}