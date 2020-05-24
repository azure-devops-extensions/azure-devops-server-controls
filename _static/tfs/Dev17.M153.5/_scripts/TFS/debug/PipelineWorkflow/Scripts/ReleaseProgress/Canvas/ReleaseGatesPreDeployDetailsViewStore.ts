import { IReleaseApprovalsData } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import { ReleaseGatesDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesDetailsViewStore";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseEnvironmentHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";
import { IReleaseEnvironmentGatesData } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";

import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

export class ReleaseGatesPreDeployDetailsViewStore extends ReleaseGatesDetailsViewStore {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseEnvironmentPreDeployGatesViewStore;
    }

    protected getGatesData(releaseEnv: ReleaseEnvironment, projectId: string): IReleaseEnvironmentGatesData {
        let envhelper = new ReleaseEnvironmentHelper(releaseEnv, projectId);

        return envhelper.getReleasePreGatesData();
    }
}