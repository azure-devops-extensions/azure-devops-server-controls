// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineArtifact } from "PipelineWorkflow/Scripts/Common/Types";
import { IArtifactTriggerContainer } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerStore";

export class EnvironmentArtifactTriggerActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_EnvironmentArtifactTriggerActionHub;
    }

    public initialize(): void {
        this._addArtifactTrigger = new ActionBase.Action<PipelineArtifact>();
        this._deleteArtifactTrigger = new ActionBase.Action<number>();
        this._updateToggleState = new ActionBase.Action<boolean>();
        this._resetToggleState = new ActionBase.Action<boolean>();
        this._updateArtifactTriggers = new ActionBase.Action<IArtifactTriggerContainer[]>();
    }

    public get addArtifactTrigger(): ActionBase.Action<PipelineArtifact> {
        return this._addArtifactTrigger;
    }

    public get deleteArtifactTrigger(): ActionBase.Action<number> {
        return this._deleteArtifactTrigger;
    }

    public get updateToggleState(): ActionBase.Action<boolean> {
        return this._updateToggleState;
    }

    public get resetToggleState():  ActionBase.Action<boolean> {
        return this._resetToggleState;
    }

    public get updateArtifactTriggers(): ActionBase.Action<IArtifactTriggerContainer[]> {
        return this._updateArtifactTriggers;
    }

    private _addArtifactTrigger: ActionBase.Action<PipelineArtifact>;
    private _deleteArtifactTrigger: ActionBase.Action<number>;
    private _updateToggleState: ActionBase.Action<boolean>;
    private _resetToggleState: ActionBase.Action<boolean>;
    private _updateArtifactTriggers: ActionBase.Action<IArtifactTriggerContainer[]>;
}