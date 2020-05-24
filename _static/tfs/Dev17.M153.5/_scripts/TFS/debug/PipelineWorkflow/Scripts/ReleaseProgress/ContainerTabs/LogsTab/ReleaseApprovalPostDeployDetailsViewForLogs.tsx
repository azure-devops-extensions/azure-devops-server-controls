/// <reference types="react" />
import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ReleaseApprovalPostDeployDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalPostDeployDetailsViewStore";
import { ReleaseApprovalDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalDetailsViewStore";
import { ReleaseApprovalDeployDetailsViewForLogs } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleaseApprovalDeployDetailsViewForLogs";
import { ReleaseApprovalPostDeployDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalPostDeployDetailsView";
import { ActionTelemetrySource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";

export class ReleaseApprovalPostDeployDetailsViewForLogs extends ReleaseApprovalDeployDetailsViewForLogs {

    protected getViewStore(): ReleaseApprovalDetailsViewStore {
        return StoreManager.GetStore<ReleaseApprovalPostDeployDetailsViewStore>(ReleaseApprovalPostDeployDetailsViewStore, this.props.instanceId);
    }

    protected getApprovalDetailsView(): JSX.Element {
        return <ReleaseApprovalPostDeployDetailsView instanceId={this.props.instanceId} environmentName={this.props.environmentName} telemetrySource={ActionTelemetrySource.LogsTab} onApprovalActionCallback={this.props.onApprovalActionCallback} />;
    }
}