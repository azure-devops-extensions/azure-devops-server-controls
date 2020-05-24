import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";

export class ArtifactListActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_ArtifactListActionHub;
    }

    public initialize(): void {
        this._initializeArtifacts = new ActionBase.Action<PipelineTypes.IArtifactTriggersMap[]>();
        this._removeArtifact = new ActionBase.Action<string>();
        this._addArtifact = new ActionBase.Action<PipelineTypes.PipelineArtifactDefinition>();
        this._updateArtifactsList = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
    }

    public get initializeArtifacts(): ActionBase.Action<PipelineTypes.IArtifactTriggersMap[]> {
        return this._initializeArtifacts;
    }

    public get updateArtifactsList(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._updateArtifactsList;
    }

    public get removeArtifact(): ActionBase.Action<string> {
        return this._removeArtifact;
    }

    public get addArtifact(): ActionBase.Action<PipelineTypes.PipelineArtifactDefinition> {
        return this._addArtifact;
    }

    private _updateArtifactsList: ActionBase.Action<ActionBase.IEmptyActionPayload>;
    private _removeArtifact: ActionBase.Action<string>;
    private _addArtifact: ActionBase.Action<PipelineTypes.PipelineArtifactDefinition>;
    private _initializeArtifacts: ActionBase.Action<PipelineTypes.IArtifactTriggersMap[]>;
}