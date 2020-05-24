// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentArtifactTriggerActions } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerActions";
import { PipelineArtifact } from "PipelineWorkflow/Scripts/Common/Types";
import { IArtifactTriggerContainer } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerStore";

/**
 * Raises actions related to EnvironmentArtifactTriggerActions
 */
export class EnvironmentArtifactTriggerActionsCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_EnvironmentArtifactTriggerActionCreator;
    }

    public initialize(instanceId: string): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<EnvironmentArtifactTriggerActions>(EnvironmentArtifactTriggerActions, instanceId);
    }

    public addArtifactTrigger(item: PipelineArtifact) {
        this._actionsHub.addArtifactTrigger.invoke(item);
    }

    public deleteArtifactTrigger(index: number) {
        this._actionsHub.deleteArtifactTrigger.invoke(index);
    }

    public updateToggleState(isToggleEnabled: boolean) {
        this._actionsHub.updateToggleState.invoke(isToggleEnabled);
    }

    public resetToggleState(resetToggleState: boolean) {
        this._actionsHub.resetToggleState.invoke(resetToggleState);
    }

    public updateArtifactTriggers(artifactTriggerContainers: IArtifactTriggerContainer[]) {
        this._actionsHub.updateArtifactTriggers.invoke(artifactTriggerContainers);
    }

    private _actionsHub: EnvironmentArtifactTriggerActions;
}