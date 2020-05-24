import { ReleaseConditionDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseConditionDetailsViewStore";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

import { IReleaseEnvironmentStatusInfo, 
    IDeploymentConditionsInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

export class ReleasePostDeployConditionDetailsViewStore extends ReleaseConditionDetailsViewStore {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleasePostDeployConditionDetailsViewStore;
    }
    
    protected getConditionInfo(statusInfo: IReleaseEnvironmentStatusInfo): IDeploymentConditionsInfo {
        return statusInfo.postDeploymentConditionsInfo;
    }
}