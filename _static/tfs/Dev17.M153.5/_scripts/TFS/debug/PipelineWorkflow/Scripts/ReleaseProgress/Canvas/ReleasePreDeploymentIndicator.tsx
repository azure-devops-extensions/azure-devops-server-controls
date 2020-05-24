import { Item } from "DistributedTaskControls/Common/Item";

import { autobind } from "OfficeFabric/Utilities";

import { ReleaseDeploymentIndicator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseDeploymentIndicator";
import { ReleasePreDeploymentItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePreDeploymentItem";
import { CanvasClickTargets, ReleaseConditionDetailsViewSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";

export class ReleasePreDeploymentIndicator extends ReleaseDeploymentIndicator {

    @autobind
    protected _getItem(): ReleasePreDeploymentItem {
        return new ReleasePreDeploymentItem({
            instanceId: this.props.instanceId,
            environmentName: this.props.environmentName,
            sourceLocation: ReleaseConditionDetailsViewSource.PreCapsule
        });
    }

    protected _getClickTargetName(): string {
        return CanvasClickTargets.nonEditPreDeploymentNode;
    }
}