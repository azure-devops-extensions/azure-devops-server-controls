// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactsPickerActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsPickerActions";
import { IArtifactItem } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsPickerStore";

/**
 * Raises actions related to artifacts picker
 */
export class ArtifactsPickerActionsCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_ArtifactsPickerActionCreator;
    }

    public initialize(instanceId: string): void {
        this._artifactsPickerActionsHub = ActionsHubManager.GetActionsHub<ArtifactsPickerActions>(ArtifactsPickerActions, instanceId);
    }

    public selectArtifactList(newValue: string) {
        this._artifactsPickerActionsHub.selectArtifactList.invoke(newValue);
    }

    public selectArtifact(artifactName: string) {
        this._artifactsPickerActionsHub.selectArtifact.invoke(artifactName);
    }

    public unSelectArtifact(artifactName: string) {
        this._artifactsPickerActionsHub.unSelectArtifact.invoke(artifactName);
    }

    public setSelectAll(isSelectAll: boolean) {
        this._artifactsPickerActionsHub.setSelectAll.invoke(isSelectAll);
    }

    public toggleArtifact() {
        this._artifactsPickerActionsHub.toggleArtifact.invoke({});
    }

    public toggleArtifactItem(artifactItem: IArtifactItem) {
        this._artifactsPickerActionsHub.toggleArtifactItem.invoke(artifactItem);
    }

    private _artifactsPickerActionsHub: ArtifactsPickerActions;
}