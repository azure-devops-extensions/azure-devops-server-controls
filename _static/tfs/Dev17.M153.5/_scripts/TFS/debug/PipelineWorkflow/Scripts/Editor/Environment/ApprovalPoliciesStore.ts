import { EnvironmentApprovalPoliciesStore } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalPoliciesStore";
import { EnvironmentApprovalPoliciesUtils } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalPoliciesUtils";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

export class ApprovalPoliciesStore extends EnvironmentApprovalPoliciesStore {

    public updateVisitor(environment: ReleaseContracts.ReleaseDefinitionEnvironment): void {
        if (environment) {
            const preDeployApprovals = environment.preDeployApprovals;
            const postDeployApprovals = environment.postDeployApprovals;
            
            if (preDeployApprovals && !EnvironmentApprovalPoliciesUtils.isApprovalAutomated(preDeployApprovals)) {
                environment.preDeployApprovals.approvalOptions = this._updateApprovalOptions(true, preDeployApprovals.approvalOptions);
            }
            
            if (postDeployApprovals && !EnvironmentApprovalPoliciesUtils.isApprovalAutomated(postDeployApprovals)) {
                environment.postDeployApprovals.approvalOptions = this._updateApprovalOptions(false, postDeployApprovals.approvalOptions);
            }
        }
    }
}
