import { IReleaseApprovalsData } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import { ReleaseApprovalDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalDetailsViewStore";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseEnvironmentHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

export class ReleaseApprovalPostDeployDetailsViewStore extends ReleaseApprovalDetailsViewStore {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseEnvironmentPostDeployApprovalsViewStore;
    }

    protected getApprovalsData(releaseEnv: RMContracts.ReleaseEnvironment, projectId: string, selectedAttempt?: number): IReleaseApprovalsData {
        let envhelper = new ReleaseEnvironmentHelper(releaseEnv, projectId, selectedAttempt);

        return envhelper.getReleasePostApprovalsData();
    }
}