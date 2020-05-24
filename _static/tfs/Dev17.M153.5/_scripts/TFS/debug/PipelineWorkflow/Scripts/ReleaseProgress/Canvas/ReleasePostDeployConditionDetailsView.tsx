/// <reference types="react" />
import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ReleaseConditionDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseConditionDetailsView";
import { IReleaseConditionDetailsViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseConditionDetailsViewStore";
import { ReleasePostDeployConditionDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePostDeployConditionDetailsViewStore";
import { ReleaseApprovalPostDeployDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalPostDeployDetailsView";
import { ReleaseGatesPostDeployDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesPostDeployDetailsView";
import {
    ReleaseApprovalStatusIndicator,
    ReleaseGatesStatusIndicator
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

export class ReleasePostDeployConditionDetailsView extends ReleaseConditionDetailsView {

    protected getViewStore() {
        return StoreManager.GetStore<ReleasePostDeployConditionDetailsViewStore>(ReleasePostDeployConditionDetailsViewStore, this.props.instanceId);
    }
    
    protected getApprovalContent(): JSX.Element {
        return <ReleaseApprovalPostDeployDetailsView instanceId={this.props.instanceId} onApprovalActionCallback={this._approvalActionCallback} environmentName={this.props.environmentName} />;
    }
    
    protected getGatesContent(): JSX.Element {
        return <ReleaseGatesPostDeployDetailsView instanceId={this.props.instanceId} />;
    }

    protected getApprovalStatus(storeState: IReleaseConditionDetailsViewState): ReleaseApprovalStatusIndicator {
        if (storeState.canShowApprovals) {
            return storeState.statusInfo.postDeploymentConditionsInfo.approvalInfo.statusIndicator;
        }
        return null;
    }

    protected getGateStatus(storeState: IReleaseConditionDetailsViewState): ReleaseGatesStatusIndicator {
        if (storeState.canShowGates) {
            return storeState.statusInfo.postDeploymentConditionsInfo.gatesInfo.statusIndicator;
        }
        return null;
    }
}