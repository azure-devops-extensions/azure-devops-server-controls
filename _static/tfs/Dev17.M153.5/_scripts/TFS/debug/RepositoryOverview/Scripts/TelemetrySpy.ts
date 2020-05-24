import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as EditorActionCreator from "ProjectOverview/Scripts/Shared/ReadmeEditorActionCreator";

import { CIConstants } from "RepositoryOverview/Scripts/Constants";

export class TelemetrySpy implements EditorActionCreator.EditorTelemetrySpy {
    public publishCreateReadmeClicked(): void {
        TelemetrySpy.publishTelemetryEvent(CIConstants.CreateReadmeClicked);
    }

    public publishEditReadmeClicked(): void {
        TelemetrySpy.publishTelemetryEvent(CIConstants.EditReadmeClicked);
    }

    public publishReadmeCommitedToNewBranch(): void {
        TelemetrySpy.publishTelemetryEvent(CIConstants.ReadmeCommitedToNewBranch, true);
    }

    public static publishForkClicked(repositoryId: string): void {
        TelemetrySpy.publishTelemetryEvent(CIConstants.ForkClicked, false, { "repoId": repositoryId });
    }

    public static publishFetchLanguagesFailed(): void {
        TelemetrySpy.publishTelemetryEvent(CIConstants.FetchLanguagesFailed);
    }

    private static publishTelemetryEvent(telemetryFeatureName: string, immediate?: boolean, properties?: { [key: string]: any }): void {
        VSS_Telemetry.publishEvent(
            new VSS_Telemetry.TelemetryEventData(CIConstants.Area, telemetryFeatureName, properties || {}),
            immediate);
    }
}