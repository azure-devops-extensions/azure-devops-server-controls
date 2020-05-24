import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export class TelemetryClient {

    public publishOpenInVisualStudioEvent(): void {
        this._publishTelemetryEvent(CustomerIntelligenceConstants.EMPTY_REPO_OPEN_IN_VS, true);
    }

    public publishOpenInOtherIdeEvent(ideType: string): void {
        this._publishTelemetryEvent(`EmptyRepoOpenIn${ideType}Click`, true);
    }

    public publishInitRepoEvent(properties: { [key: string]: any }): void {
        this._publishTelemetryEvent(CustomerIntelligenceConstants.EMPTY_REPO_INIT_REPO, true, properties);
    }

    public publishGitForWindowsDownloadEvent(): void {
        this._publishTelemetryEvent(CustomerIntelligenceConstants.GIT_FOR_WINDOWS_DOWNLOAD);
    }

    public publishManageSshKeysEvent(): void {
        this._publishTelemetryEvent(CustomerIntelligenceConstants.MANAGE_SSH_KEYS_BUTTON);
    }

    private _publishTelemetryEvent(telemetryFeatureName: string, immediate?: boolean, properties?: { [key: string]: any }): void {
        VSS_Telemetry.publishEvent(
            new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, telemetryFeatureName, properties || {}),
            immediate);
    }
}
