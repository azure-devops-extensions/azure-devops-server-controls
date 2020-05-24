// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactTriggerActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerActions";

/**
 * Raises actions related to definition schedule trigger
 */
export class ArtifactTriggerActionsCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_ArtifactTriggerActionCreator;
    }

    public initialize(instanceId: string): void {
        this._artifactTriggerActionsHub = ActionsHubManager.GetActionsHub<ArtifactTriggerActions>(ArtifactTriggerActions, instanceId);
    }

    public toggleChanged(checked: boolean) {
        this._artifactTriggerActionsHub.toggleChanged.invoke(checked);
    }

    public resetToggleState(checked: boolean) {
        this._artifactTriggerActionsHub.resetToggleState.invoke(checked);
    }

    public updateCreateReleaseOnBuildTagging(state: boolean) {
        this._artifactTriggerActionsHub.updateCreateReleaseOnBuildTagging.invoke(state);
    }

    public resetCreateReleaseOnBuildTagging(checked: boolean) {
        this._artifactTriggerActionsHub.resetCreateReleaseOnBuildTagging.invoke(checked);
    }

    private _artifactTriggerActionsHub: ArtifactTriggerActions;
}