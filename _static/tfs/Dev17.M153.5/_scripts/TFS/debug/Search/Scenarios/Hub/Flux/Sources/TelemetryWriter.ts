import * as Performance from "VSS/Performance";
import * as CommonCIConstants from "Search/Scenarios/Shared/CustomerIntelligenceConstants";
import { ITelemetryWriter, createTelemetryEventData, publishTelemetryEvent, SearchPerfTelemetryAdditionalData } from "Search/Scenarios/Shared/Base/Telemetry";

const Hub = "SearchHub";
const HubInitialScenarioName = "SearchHubInitialScenario";
const HubTabSwitchScenarioName = "SearchHubTabSwitchScenario";

export interface IHubScenario {
    notifyContributedTabsLoaded: () => void;

    notifyTabSwitchStarted: () => void;

    notifyTabLoadFailed: () => void;

    notifyTabLoaded: (tabName: string) => void;

    dispose: () => void;
}

/**
 * Writes telemetry events for code search page.
 */
export class HubTelemetryWriter implements ITelemetryWriter {
    constructor(public hubScenario: IHubScenario = new HubScenario()) { }

    public publish = (feature: string, extraProperties: IDictionaryStringTo<any> = {}): void => {
        publishTelemetryEvent(createTelemetryEventData(feature, Hub, extraProperties));
    }

    public dispose = (): void => {
        this.hubScenario.dispose();
    }
}

export class HubScenario implements IHubScenario {
    private intialScenario: Performance.IScenarioDescriptor;
    private tabSwitchScenario: Performance.IScenarioDescriptor;

    constructor() {
        this.intialScenario =
            Performance
                .getScenarioManager()
                .startScenarioFromNavigation(CommonCIConstants.SEARCH_AREA, HubInitialScenarioName, false);

        this.intialScenario.addSplitTiming("startedHubInitialization");
    }

    public notifyContributedTabsLoaded = (): void => {
        if (this.intialScenario.isActive()) {
            this.intialScenario.addSplitTiming("contributedTabsLoaded");
            // we start loading the demanded tab once contributed pivots have finished loading.
            this.intialScenario.addSplitTiming("tabLoadStarted");
        }
    }

    public notifyTabSwitchStarted = (): void => {
        // We don't want to track initial scenario if it is interrupted by excplicit tab switch by the user.
        if (this.intialScenario && this.intialScenario.isActive()) {
            this.intialScenario.abort();
        }

        // Abort previous tab switch scenario if it is already in progress as it is now obsolete after the latest explicit tab change.
        if (this.tabSwitchScenario) {
            this.tabSwitchScenario.abort();
        }

        this.tabSwitchScenario =
            Performance
                .getScenarioManager()
                .startScenario(CommonCIConstants.SEARCH_AREA, HubTabSwitchScenarioName);

        this.tabSwitchScenario.addSplitTiming("tabLoadStarted");
    }

    public notifyTabLoadFailed = (): void => {
        if (this.intialScenario) {
            this.intialScenario.abort();
        }

        if (this.tabSwitchScenario) {
            this.tabSwitchScenario.abort();
        }
    }
    
    public notifyTabLoaded = (tabName: string): void => {
        // End initialScenario if active
        if (this.intialScenario.isActive()) {
            this.intialScenario.addSplitTiming("tabLoaded");
            this.intialScenario.addData({ tabName });
            this.intialScenario.end();
        }

        // End tabSwtich scenario if active.
        if (this.tabSwitchScenario && this.tabSwitchScenario.isActive()) {
            this.tabSwitchScenario.addSplitTiming("tabLoaded");
            this.tabSwitchScenario.addData({ tabName });
            this.tabSwitchScenario.end();
        }
    }

    public dispose = (): void => {
        this.intialScenario.abort();
        if (this.tabSwitchScenario) {
            this.tabSwitchScenario.abort();
        }
    }
}