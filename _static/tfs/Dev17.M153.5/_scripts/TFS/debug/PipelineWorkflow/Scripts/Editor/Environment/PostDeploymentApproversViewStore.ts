import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { EnvironmentApprovalPoliciesStore } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalPoliciesStore";
import { EnvironmentApprovalViewStore } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalViewStore";
import { PostDeploymentApprovalStore } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentApprovalStore";
import { PostApprovalConditionsActionsHub } from "PipelineWorkflow/Scripts/Shared/Environment/PostApprovalConditionsActionsHub";

/**
 * View Store for Post deployment approvals view
 */
export class PostDeploymentApproversViewStore extends EnvironmentApprovalViewStore {
     
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentPostApprovalViewStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        
        this.dataStore = StoreManager.GetStore<PostDeploymentApprovalStore>(PostDeploymentApprovalStore, instanceId);
        this.dataStore.addChangedListener(this.onDataStoreChanged);    
        this.onDataStoreChanged();
    }

}