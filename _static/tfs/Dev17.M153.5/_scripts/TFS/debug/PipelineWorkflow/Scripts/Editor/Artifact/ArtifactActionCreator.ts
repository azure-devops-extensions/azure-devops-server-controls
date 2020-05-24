import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { ArtifactActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactActions";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";

import * as Utils_String from "VSS/Utils/String";

export class ArtifactActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_ArtifactActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._artifactActions = ActionsHubManager.GetActionsHub<ArtifactActions>(ArtifactActions);
    }

    /**
     * @brief raise action required for updating alias
     */
    public updateArtifactAlias(artifactId: string, alias: string) {
        if (!artifactId || alias === undefined || alias === null) {
            return;
        }

        this._artifactActions.updateAlias.invoke({
            artifactId: artifactId,
            alias: alias
        });

        this._artifactActions.refreshArtifacts.invoke({});
    }

    /**
     * @brief raise action required to mark artifact as primary
     */
    public setArtifactPrimary(artifactId: string) {
        this._artifactActions.setPrimaryArtifact.invoke(artifactId);        
    }

    public updateTemporaryArtifact(instanceId: string): void {
        this._artifactActions.updateTemporaryArtifact.invoke(instanceId);
    }

    public markingArtifactIsDeleting(artifactId: string): void {
        this._artifactActions.markingArtifactIsDeleting.invoke(artifactId);
    }

    private _artifactActions: ArtifactActions;
}


