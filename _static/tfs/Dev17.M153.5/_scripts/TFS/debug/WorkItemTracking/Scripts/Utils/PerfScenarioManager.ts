import * as Diag from "VSS/Diag";
import * as Events_Services from "VSS/Events/Services";
import { IScenarioDescriptor, getScenarioManager } from "VSS/Performance";
import * as Utils_String from "VSS/Utils/String";
import { WITCustomerIntelligenceArea, WITPerformanceScenario, WITPerformanceScenarioEvent } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";

export interface IPerfScenarioStartOptions {
    /** If specified, the scenario time will be measured from the browser's navigationStart event */
    fromPageNavigation?: boolean;

    /** If specified, the scenario will be marked as "isPageInteractive" scenario and show up in the perf bar */
    isPageInteractive?: boolean;
}

export class PerfScenarioManager {
    private static _featureArea: string = WITCustomerIntelligenceArea.WORK_ITEM_TRACKING;
    private static _mobileSuffix: string = ".Mobile";

    /**
     * Starts WIT performance scenario
     *
     * @param scenario WIT scenario
     * @param fromPageNavigation True if scenario measurement starts from page navigation
     * @return Instance of scenario
     */
    public static startScenario(scenario: string, fromPageNavigation: boolean): IScenarioDescriptor {
        return PerfScenarioManager.startScenarioWithOptions(scenario, {
            fromPageNavigation: fromPageNavigation,
            isPageInteractive: fromPageNavigation
        });
    }

    /**
     * Starts a WIT performance scenario
     *
     * @param scenarioName Name of the scenario
     * @param options Optional options
     */
    public static startScenarioWithOptions(scenarioName: string, options?: IPerfScenarioStartOptions): IScenarioDescriptor {
        scenarioName = PerfScenarioManager._appendSuffixIfMobile(scenarioName);

        // We will abort all scenarios (navigation and non-navigation) before start a new one
        PerfScenarioManager.abortScenario(scenarioName);

        const { fromPageNavigation = false, isPageInteractive = false } = options;

        let scenario: IScenarioDescriptor;
        if (fromPageNavigation) {
            scenario = getScenarioManager().startScenarioFromNavigation(PerfScenarioManager._featureArea, scenarioName, isPageInteractive);
        } else {
            scenario = getScenarioManager().startScenario(PerfScenarioManager._featureArea, scenarioName, undefined, isPageInteractive);
        }

        // need a clear start point to identify when we started the scenario since
        // start time is at 0ms and we may not have actually started the
        // scenario until much later.
        PerfScenarioManager.addSplitTiming(scenario.getName(), true);

        return scenario;
    }

    /**
     * Adds split timing to performance scenarios
     *
     * @param splitName Name of the event
     * @param isStartTimeStamp Indicates whether if this is start of the event
     * @param logDiagTimeStamp Choose whether to log diagnostic time stamps. Defaults to true.
     * @param witScenariosOnly Set to true if adds split timing to WIT scenarios only, otherwise it will be added to all scenarios. Defaults to true.
     */
    public static addSplitTiming(splitName: string, isStartTimeStamp: boolean, logDiagTimeStamp: boolean = true, witScenariosOnly: boolean = true): void {
        const name = isStartTimeStamp ? `${splitName}.Start` : `${splitName}.Complete`;
        PerfScenarioManager._addSplitTiming(name, witScenariosOnly);

        if (logDiagTimeStamp) {
            const stampEvent = isStartTimeStamp ? Diag.StampEvent.Enter : Diag.StampEvent.Leave;
            Diag.timeStamp(splitName, stampEvent);
        }
    }

    /**
     * Adds split timing to performance scenarios for one time event
     *
     * @param splitName Name of the event
     * @param logDiagTimeStamp Choose whether to log diagnostic time stamps. Defaults to true.
     * @param witScenariosOnly Set to true if adds split timing to WIT scenarios only, otherwise it will be added to all scenarios. Defaults to true.
     */
    public static addSinglePointSplitTiming(splitName: string, logDiagTimeStamp: boolean = true, witScenariosOnly: boolean = true): void {
        PerfScenarioManager._addSplitTiming(splitName, witScenariosOnly);

        if (logDiagTimeStamp) {
            Diag.timeStamp(splitName, Diag.StampEvent.SinglePoint);
        }
    }

    private static _addSplitTiming(splitName: string, witScenariosOnly: boolean): void {
        if (witScenariosOnly) {
            const scenarioDescriptors = PerfScenarioManager._getWitScenarios();
            for (const scenarioDescriptor of scenarioDescriptors) {
                if (scenarioDescriptor.isActive()) {
                    scenarioDescriptor.addSplitTiming(splitName);
                }
            }
        } else {
            getScenarioManager().split(splitName);
        }
    }

    /**
     * Adds data to wit performance scenarios
     * @param data
     */
    public static addData(data: any) {
        PerfScenarioManager._getWitScenarios().forEach((scenario) => {
            if (scenario.isActive()) {
                scenario.addData(data);
            }
        });
    }

    /**
     * Aborts WIT performance scenario. No matter if the scenario from page navigation or not, it will abort both
     *
     * @param scenario WIT scenario
     */
    public static abortScenario(scenario: string): void {
        const scenarioDescriptors = PerfScenarioManager._getScenarios(scenario);

        for (const scenarioDescriptor of scenarioDescriptors) {
            if (scenarioDescriptor.isActive()) {
                scenarioDescriptor.abort();
            }
        }
    }

    /**
     * Ends WIT performance scenario. No matter if the scenario from page navigation or not, it will end
     *
     * @param scenario WIT scenario
     */
    public static endScenario(scenario: string, data?: any): void {
        const scenarioDescriptors = PerfScenarioManager._getScenarios(scenario);

        for (const scenarioDescriptor of scenarioDescriptors) {
            if (scenarioDescriptor.isActive()) {
                const scenarioName = scenarioDescriptor.getName();

                if (data) {
                    scenarioDescriptor.addData(data);
                }
                PerfScenarioManager.addSplitTiming(scenarioDescriptor.getName(), false);

                scenarioDescriptor.end().then(() => PerfScenarioManager._fireScenarioCompletedEvents(scenarioName));
            }
        }
    }

    /**
     * Checks whether the given performance scenario is currently active
     *
     * @param scenario WIT scenario
     */
    public static isScenarioActive(scenario: string): boolean {
        const scenarioDescriptors = PerfScenarioManager._getScenarios(scenario);
        return scenarioDescriptors && scenarioDescriptors.some(
            (scenarioDescriptor: IScenarioDescriptor) => scenarioDescriptor && scenarioDescriptor.isActive());
    }

    private static _getScenarios(scenario: string): IScenarioDescriptor[] {
        scenario = PerfScenarioManager._appendSuffixIfMobile(scenario);

        let scenarioDescriptors = getScenarioManager().getScenarios(PerfScenarioManager._featureArea, scenario);

        scenarioDescriptors = scenarioDescriptors.concat(
            getScenarioManager().getScenarios(PerfScenarioManager._featureArea, scenario));

        return scenarioDescriptors;
    }

    private static _getWitScenarios(): IScenarioDescriptor[] {
        let scenarioDescriptors: IScenarioDescriptor[] = [];
        for (const propertyName in WITPerformanceScenario) {
            if (WITPerformanceScenario.hasOwnProperty(propertyName)) {
                let scenario: string = WITPerformanceScenario[propertyName];
                scenario = PerfScenarioManager._appendSuffixIfMobile(scenario);

                scenarioDescriptors = scenarioDescriptors.concat(
                    getScenarioManager().getScenarios(PerfScenarioManager._featureArea, scenario));

                scenarioDescriptors = scenarioDescriptors.concat(
                    getScenarioManager().getScenarios(PerfScenarioManager._featureArea, scenario));
            }
        }

        return scenarioDescriptors;
    }

    private static _appendSuffixIfMobile(scenario: string) {
        return WitFormModeUtility.isMobileForm
            ? `${scenario}${PerfScenarioManager._mobileSuffix}`
            : scenario;
    }

    private static _fireScenarioCompletedEvents(scenarioName: string) {
        if (Utils_String.startsWith(scenarioName, WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENQUERYRESULTS)) {
            Events_Services.getService().fire(
                WITPerformanceScenarioEvent.QUERIESHUB_TRIAGEVIEW_OPENQUERYRESULTS_COMPLETE, this);
        } else if (Utils_String.startsWith(scenarioName, WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENWORKITEM)) {
            Events_Services.getService().fire(
                WITPerformanceScenarioEvent.QUERIESHUB_TRIAGEVIEW_OPENWORKITEM_COMPLETE, this);
        }
    }
}
