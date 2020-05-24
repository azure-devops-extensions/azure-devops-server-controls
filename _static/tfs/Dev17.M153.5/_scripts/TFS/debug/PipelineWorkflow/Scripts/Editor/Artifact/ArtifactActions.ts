import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";

export interface IUpdateAliasPayload {
    artifactId: string;
    alias: string;
}

export interface IUpdateArtifactPayload {
    artifactId: string;
    artifact: PipelineTypes.PipelineArtifactDefinition;
}

export interface IUpdateArtifactTypePayload {
    artifactType: string;
    instanceId: string;
}

export class ArtifactActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_ArtifactActionHub;
    }

    public initialize(): void {
        this._setPrimaryArtifact = new ActionBase.Action<string>();
        this._updateArtifact = new ActionBase.Action<IUpdateArtifactPayload>();
        this._updateAlias = new ActionBase.Action<IUpdateAliasPayload>();
        this._refreshArtifacts = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
        this._updateArtifacts = new ActionBase.Action<PipelineTypes.IArtifactTriggersMap[]>();
        this._updateTemporaryArtifact = new ActionBase.Action<string>();
        this._changeArtifactType = new ActionBase.Action<IUpdateArtifactTypePayload>();
        this._markingArtifactIsDeleting = new ActionBase.Action<string>();
    }

    public get markingArtifactIsDeleting(): ActionBase.Action<string> {
        return this._markingArtifactIsDeleting;
    }

    public get changeArtifactType(): ActionBase.Action<IUpdateArtifactTypePayload> {
        return this._changeArtifactType;
    }

    public get updateAlias(): ActionBase.Action<IUpdateAliasPayload> {
        return this._updateAlias;
    }

    public get refreshArtifacts(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._refreshArtifacts;
    }

    public get updateArtifact(): ActionBase.Action<IUpdateArtifactPayload> {
        return this._updateArtifact;
    }

    public get setPrimaryArtifact(): ActionBase.Action<string> {
        return this._setPrimaryArtifact;
    }

    public get updateArtifacts(): ActionBase.Action<PipelineTypes.IArtifactTriggersMap[]> {
        return this._updateArtifacts;
    }

    public get updateTemporaryArtifact(): ActionBase.Action<string> {
        return this._updateTemporaryArtifact;
    }

    private _markingArtifactIsDeleting: ActionBase.Action<string>;
    private _changeArtifactType: ActionBase.Action<IUpdateArtifactTypePayload>;
    private _refreshArtifacts: ActionBase.Action<ActionBase.IEmptyActionPayload>;
    private _updateAlias: ActionBase.Action<IUpdateAliasPayload>;
    private _setPrimaryArtifact: ActionBase.Action<string>;
    private _updateArtifact: ActionBase.Action<IUpdateArtifactPayload>;
    private _updateArtifacts: ActionBase.Action<PipelineTypes.IArtifactTriggersMap[]>;
    private _updateTemporaryArtifact: ActionBase.Action<string>;
}