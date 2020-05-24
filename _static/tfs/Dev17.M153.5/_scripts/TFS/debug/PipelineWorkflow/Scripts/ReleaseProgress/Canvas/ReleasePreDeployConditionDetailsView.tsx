/// <reference types="react" />
import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ReleaseConditionDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseConditionDetailsView";
import { IReleaseConditionDetailsViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseConditionDetailsViewStore";
import { ReleasePreDeployConditionDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePreDeployConditionDetailsViewStore";
import { ReleaseApprovalPreDeployDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalPreDeployDetailsView";
import { ReleaseGatesPreDeployDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesPreDeployDetailsView";
import {
    ReleaseApprovalStatusIndicator,
    ReleaseGatesStatusIndicator
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

export class ReleasePreDeployConditionDetailsView extends ReleaseConditionDetailsView {

    protected getViewStore() {
        return StoreManager.GetStore<ReleasePreDeployConditionDetailsViewStore>(ReleasePreDeployConditionDetailsViewStore, this.props.instanceId);
    }
    
    protected getApprovalContent(): JSX.Element {
        return <ReleaseApprovalPreDeployDetailsView instanceId={this.props.instanceId} onApprovalActionCallback={this._approvalActionCallback} environmentName= {this.props.environmentName} />;
    }
    
    protected getGatesContent(): JSX.Element {
        return <ReleaseGatesPreDeployDetailsView instanceId={this.props.instanceId} />;
    }

    protected getApprovalStatus(storeState: IReleaseConditionDetailsViewState): ReleaseApprovalStatusIndicator {
        if (storeState.canShowApprovals) {
            return storeState.statusInfo.preDeploymentConditionsInfo.approvalInfo.statusIndicator;
        }
        return null;
    }

    protected getGateStatus(storeState: IReleaseConditionDetailsViewState): ReleaseGatesStatusIndicator {
        if (storeState.canShowGates) {
            return storeState.statusInfo.preDeploymentConditionsInfo.gatesInfo.statusIndicator;
        }
        return null;
    }
}