import { ActionsHub, ProviderImplementationLoadedPayload } from "Search/Scenarios/Hub/Flux/ActionsHub";
import { HubTelemetryWriter } from "Search/Scenarios/Hub/Flux/Sources/TelemetryWriter";

export class TelemetrySpy {
    constructor(private telemetryWriter: HubTelemetryWriter, private actionsHub: ActionsHub) {
        this.registerActionsHubHandlers();
    }

    public dispose = (): void => {
        this.disposeActionsHubHandlers();
        this.telemetryWriter.dispose();
    }

    private registerActionsHubHandlers = (): void => {
        this.actionsHub.contributedSearchTabsLoaded.addListener(this.contributedSearchTabsLoaded);
        this.actionsHub.providerImplementationLoaded.addListener(this.providerImplementationLoaded);
        this.actionsHub.providerImplementationLoadFailed.addListener(this.providerImplementationLoadFailed);
        this.actionsHub.providerImplementationChangeStarted.addListener(this.providerImplementationChangeStarted);
    }

    private disposeActionsHubHandlers = (): void => {
        this.actionsHub.contributedSearchTabsLoaded.removeListener(this.contributedSearchTabsLoaded);
        this.actionsHub.providerImplementationLoaded.removeListener(this.providerImplementationLoaded);
        this.actionsHub.providerImplementationLoadFailed.removeListener(this.providerImplementationLoadFailed);
        this.actionsHub.providerImplementationChangeStarted.removeListener(this.providerImplementationChangeStarted);
    }

    private contributedSearchTabsLoaded = (): void => {
        this.telemetryWriter.hubScenario.notifyContributedTabsLoaded();
    }

    private providerImplementationLoadFailed = (): void => {
        this.telemetryWriter.hubScenario.notifyTabLoadFailed();
    }

    private providerImplementationLoaded = (payload: ProviderImplementationLoadedPayload): void => {
        this.telemetryWriter.hubScenario.notifyTabLoaded(payload.providerId);
    }

    private providerImplementationChangeStarted = (): void => {
        this.telemetryWriter.hubScenario.notifyTabSwitchStarted();
    }
}
