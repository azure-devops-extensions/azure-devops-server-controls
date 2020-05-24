/// <reference types="react" />
import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ReleaseApprovalPreDeployDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalPreDeployDetailsViewStore";
import { ReleaseApprovalDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalDetailsViewStore";
import { ReleaseApprovalDeployDetailsViewForLogs } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleaseApprovalDeployDetailsViewForLogs";
import { ReleaseApprovalPreDeployDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalPreDeployDetailsView";
import { ActionTelemetrySource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";

export class ReleaseApprovalPreDeployDetailsViewForLogs extends ReleaseApprovalDeployDetailsViewForLogs {

    protected getViewStore(): ReleaseApprovalDetailsViewStore {
        return StoreManager.GetStore<ReleaseApprovalPreDeployDetailsViewStore>(ReleaseApprovalPreDeployDetailsViewStore, this.props.instanceId);
    }

    protected getApprovalDetailsView(): JSX.Element {
        return <ReleaseApprovalPreDeployDetailsView instanceId={this.props.instanceId} telemetrySource={ActionTelemetrySource.LogsTab} environmentName={this.props.environmentName} onApprovalActionCallback={this.props.onApprovalActionCallback} />;
    }
}
