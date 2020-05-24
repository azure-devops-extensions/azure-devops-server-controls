import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { ApprovalStore } from "PipelineWorkflow/Scripts/Shared/Environment/ApprovalStore";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineDefinitionEnvironment, PipelineEnvironmentApprovals, ApprovalTypeKeys } from "PipelineWorkflow/Scripts/Common/Types";
import { PostApprovalConditionsActionsHub } from "PipelineWorkflow/Scripts/Shared/Environment/PostApprovalConditionsActionsHub";

export interface IPostDeploymentApprovalStoreArgs {
    approvals: PipelineEnvironmentApprovals;
}

/**
 * Post deployment approval data store
 */
export class PostDeploymentApprovalStore extends ApprovalStore {

    constructor(args: IPostDeploymentApprovalStoreArgs) {
        super(args.approvals);
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentPostApprovalConditionStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this.actions = ActionsHubManager.GetActionsHub<PostApprovalConditionsActionsHub>(PostApprovalConditionsActionsHub, instanceId);
        this.addActionListeners();
    }

    public updateVisitor(visitor: PipelineDefinitionEnvironment) {
        visitor.postDeployApprovals = JQueryWrapper.extendDeep({}, null);
        this.updateApproval(visitor.postDeployApprovals);
    }

    public publishApprovalTypeTelemetry(approvalType: ApprovalTypeKeys) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ApprovalType] = approvalType;
        Telemetry.instance().publishEvent(Feature.PostDeploymentApprovalType, eventProperties);
    }
}