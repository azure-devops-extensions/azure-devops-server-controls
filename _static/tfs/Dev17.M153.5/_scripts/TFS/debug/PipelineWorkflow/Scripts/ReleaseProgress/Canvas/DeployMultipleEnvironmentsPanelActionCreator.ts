import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { PipelineArtifact } from "PipelineWorkflow/Scripts/Common/Types";
import {
    DeployEnvironmentsPanelActionCreator,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActionCreator";
import {
    ReleaseEnvironmentActionsStore
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionsStore";
import {
    ReleaseEnvironmentAction,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

export class DeployMultipleEnvironmentsPanelActionCreator extends DeployEnvironmentsPanelActionCreator {

    public initializeData(releaseDefinitionId: number, currentReleaseId: number, environments: ReleaseEnvironment[], artifacts: PipelineArtifact[]) {
        let deployableEnvironments: ReleaseEnvironment[] = this.getEnvironmentsToDeploy(environments);
        super.initializeData(releaseDefinitionId, currentReleaseId, deployableEnvironments, artifacts);
    }

    public getEnvironmentsToDeploy(environments: ReleaseEnvironment[]): ReleaseEnvironment[]
    {
        let deployableEnvironments: ReleaseEnvironment[] = [];
        for (let environment of environments) {
            const environmentActionsStore = StoreManager.GetStore(ReleaseEnvironmentActionsStore, environment.id.toString());
            if (environmentActionsStore.isActionPermissible([ReleaseEnvironmentAction.Deploy, ReleaseEnvironmentAction.Redeploy])){
                deployableEnvironments.push(environment);
            }
        }        
        return deployableEnvironments;
    }
}