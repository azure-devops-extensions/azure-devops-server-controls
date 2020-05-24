import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { EnvironmentApprovalPoliciesStore } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalPoliciesStore";
import { EnvironmentApprovalViewStore } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalViewStore";
import { PreDeploymentApprovalStore } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentApprovalStore";
import { PreApprovalConditionsActionsHub } from "PipelineWorkflow/Scripts/Shared/Environment/PreApprovalConditionsActionsHub";

/**
 * View Store for Pre deployment approvals view
 */
export class PreDeploymentApproversViewStore extends EnvironmentApprovalViewStore {
     
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentPreApprovalViewStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        
        this.dataStore = StoreManager.GetStore<PreDeploymentApprovalStore>(PreDeploymentApprovalStore, instanceId);
        this.dataStore.addChangedListener(this.onDataStoreChanged);
        this.onDataStoreChanged();
    }

}