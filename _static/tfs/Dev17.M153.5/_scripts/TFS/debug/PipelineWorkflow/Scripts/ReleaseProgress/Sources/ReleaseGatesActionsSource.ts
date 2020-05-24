import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import { GateUpdateMetadata, ReleaseGates } from "ReleaseManagement/Core/Contracts";


export class ReleaseGatesActionsSource extends ReleaseManagementSourceBase {

    public static getKey(): string {
        return "ReleaseGatesActionsSource";
    }

    public static instance(): ReleaseGatesActionsSource {
        return SourceManager.getSource(ReleaseGatesActionsSource);
    }

    public ignoreGate(gatesStepId: number, gateUpdateMetadata: GateUpdateMetadata): IPromise<ReleaseGates> {
        return this.getClient().updateGate(gatesStepId, gateUpdateMetadata);
    }
}
