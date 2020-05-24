import { Item } from "DistributedTaskControls/Common/Item";

import { autobind } from "OfficeFabric/Utilities";

import { ReleaseDeploymentIndicator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseDeploymentIndicator";
import { ReleasePostDeploymentItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePostDeploymentItem";
import { CanvasClickTargets, ReleaseConditionDetailsViewSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";

export class ReleasePostDeploymentIndicator extends ReleaseDeploymentIndicator {

    @autobind
    protected _getItem(): ReleasePostDeploymentItem {
        return new ReleasePostDeploymentItem({
            instanceId: this.props.instanceId,
            environmentName: this.props.environmentName,
            sourceLocation: ReleaseConditionDetailsViewSource.PostCapsule
        });
    }

    protected _getClickTargetName(): string {
        return CanvasClickTargets.nonEditPostDeploymentNode;
    }
}