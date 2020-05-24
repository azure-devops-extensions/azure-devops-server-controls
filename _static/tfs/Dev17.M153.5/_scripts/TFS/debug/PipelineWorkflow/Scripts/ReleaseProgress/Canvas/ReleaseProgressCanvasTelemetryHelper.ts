import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { IJobItem, JobStates } from "DistributedTaskUI/Logs/Logs.Types";
import { Telemetry } from "DistributedTaskControls/Common/Telemetry";

export enum ActionTelemetrySource {
    LogsTab = "LogsTab",
    Canvas = "Canvas"
}

export namespace CanvasClickTargets {
    export const environmentNode: string = "environmentNode";
    export const nonEditPreDeploymentNode: string = "nonEditPreDeploymentNode";
    export const nonEditPostDeploymentNode: string = "nonEditPostDeploymentNode";
    export const approvalPanelViewLogsButton: string = "approvalPanelViewLogsButton";
    export const gatesPanelViewLogsButton: string = "gatesPanelViewLogsButton";
    export const overviewPanelViewLogsButton: string = "overviewPanelViewLogsButton";
    export const environmentStatusLink: string = "environmentStatusLink";
}

export namespace ReleaseProgressCanvasTelemetryProperties {

    // Click Action property
    export const clickActionProperty: string = "clickActionProperty";

    // Release summary node properties
    export const artifactCountProperty: string = "artifactCountProperty";
    export const tagsCountProperty: string = "tagsCountProperty";
    export const releaseReasonProperty: string = "releaseReasonProperty";
    export const environmentState: string = "environmentState";
}

export namespace ReleaseProgressCanvasTelemetryFeature {
    export const releaseProgressClickActionTelemetry: string = "releaseProgressClickActionTelemetry";
    export const releaseSummaryNodeTelemetry: string = "releaseSummaryNodeTelemetry";
}

export namespace ReleaseConditionDetailsViewTelemetryFeature {
    export const releaseConditionPanelOpenTelemetry: string = "ApprovalGatesPanelOpenTelemetry";
    export const releaseConditionPivotSwitchTelemetry: string = "ApprovalGatesPanelPivotSwitchTelemetry";
}

export namespace ReleaseConditionDetailsViewTelemetryProperties {
    export const sourceLocation = "sourceLocation";
    export const newSelectedPivot = "newSelectedPivot";
    export const approvalStatus = "approvalStatus";
    export const gateStatus = "gateStatus";
    export const oldSelectedPivot = "oldSelectedPivot";
}

export namespace ReleaseConditionDetailsViewSource {
    export const EnvironmentLink: string = "EnvironmentLink";
    export const PreCapsule: string = "PreCapsule";
    export const PostCapsule: string = "PostCapsule";
}

export class ReleaseProgressCanvasTelemetryHelper {

    public static publishClickActionTelemetry(actionName: string, environmentState?: string): void {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[ReleaseProgressCanvasTelemetryProperties.clickActionProperty] = actionName;
        if (environmentState) {
            eventProperties[ReleaseProgressCanvasTelemetryProperties.environmentState] = environmentState;
        }
        Telemetry.instance().publishEvent(ReleaseProgressCanvasTelemetryFeature.releaseProgressClickActionTelemetry, eventProperties);
    }

    public static publishReleaseSummaryNodeTelemetry(artifactCount: number, tagsCount: number, releaseReason: number): void {
        if (!ReleaseProgressCanvasTelemetryHelper._releaseSummaryNodeTelemetryLogged) {
            ReleaseProgressCanvasTelemetryHelper._releaseSummaryNodeTelemetryLogged = true;
            let eventProperties: IDictionaryStringTo<any> = {};
            eventProperties[ReleaseProgressCanvasTelemetryProperties.artifactCountProperty] = artifactCount;
            eventProperties[ReleaseProgressCanvasTelemetryProperties.tagsCountProperty] = tagsCount;
            eventProperties[ReleaseProgressCanvasTelemetryProperties.releaseReasonProperty] = releaseReason;
            Telemetry.instance().publishEvent(ReleaseProgressCanvasTelemetryFeature.releaseSummaryNodeTelemetry, eventProperties);
        }
    }

    public static publishReleaseConditionDetailsViewTelemetry(featureName: string,
        sourceLocation: string,
        newSelectedPivot: string,
        approvalStatus: string,
        gateStatus: string,
        oldSelectedPivot?: string): void {

        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[ReleaseConditionDetailsViewTelemetryProperties.sourceLocation] = sourceLocation;
        eventProperties[ReleaseConditionDetailsViewTelemetryProperties.newSelectedPivot] = newSelectedPivot;
        eventProperties[ReleaseConditionDetailsViewTelemetryProperties.approvalStatus] = approvalStatus;
        eventProperties[ReleaseConditionDetailsViewTelemetryProperties.gateStatus] = gateStatus;
        eventProperties[ReleaseConditionDetailsViewTelemetryProperties.oldSelectedPivot] = oldSelectedPivot;
        Telemetry.instance().publishEvent(featureName, eventProperties);
    }

    private static _releaseSummaryNodeTelemetryLogged: boolean = false;
}