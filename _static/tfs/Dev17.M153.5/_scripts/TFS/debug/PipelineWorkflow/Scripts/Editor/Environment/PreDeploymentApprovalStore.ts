import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { ApprovalStore } from "PipelineWorkflow/Scripts/Shared/Environment/ApprovalStore";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineDefinitionEnvironment, PipelineEnvironmentApprovals, ApprovalTypeKeys } from "PipelineWorkflow/Scripts/Common/Types";
import { PreApprovalConditionsActionsHub } from "PipelineWorkflow/Scripts/Shared/Environment/PreApprovalConditionsActionsHub";

export interface IPreDeploymentApprovalStoreArgs {
    approvals: PipelineEnvironmentApprovals;
}

/**
 * Pre deployment approval data store
 */
export class PreDeploymentApprovalStore extends ApprovalStore {

    constructor(args: IPreDeploymentApprovalStoreArgs) {
        super(args.approvals);
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentPreApprovalConditionStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this.actions = ActionsHubManager.GetActionsHub<PreApprovalConditionsActionsHub>(PreApprovalConditionsActionsHub, instanceId);
        this.addActionListeners();
    }

    public updateVisitor(visitor: PipelineDefinitionEnvironment) {
            visitor.preDeployApprovals = JQueryWrapper.extendDeep({}, null);
            this.updateApproval(visitor.preDeployApprovals);
    }

    public publishApprovalTypeTelemetry(approvalType: ApprovalTypeKeys) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ApprovalType] = approvalType;
        Telemetry.instance().publishEvent(Feature.PreDeploymentApprovalType, eventProperties);
    }
}