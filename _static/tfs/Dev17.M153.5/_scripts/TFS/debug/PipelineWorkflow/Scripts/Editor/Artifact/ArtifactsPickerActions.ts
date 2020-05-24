// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { IArtifactItem, IArtifactsPickerPayload } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsPickerStore";

/**
 *  Actions for Artifacts Picker
 */
export class ArtifactsPickerActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_ArtifactsPickerActionHub;
    }

    public initialize(): void {
        this._selectArtifactList = new ActionBase.Action<string>();
        this._selectArtifact = new ActionBase.Action<string>();
        this._unSelectArtifact = new ActionBase.Action<string>();
        this._setSelectAll = new ActionBase.Action<boolean>();
        this._toggleArtifact = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
        this._toggleArtifactItem = new ActionBase.Action<IArtifactItem>();
    }

    public get selectArtifactList(): ActionBase.Action<string> {
        return this._selectArtifactList;
    }

    public get selectArtifact(): ActionBase.Action<string> {
        return this._selectArtifact;
    }

    public get unSelectArtifact(): ActionBase.Action<string> {
        return this._unSelectArtifact;
    }

    public get setSelectAll(): ActionBase.Action<boolean> {
        return this._setSelectAll;
    }

    public get toggleArtifact(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._toggleArtifact;
    }

    public get toggleArtifactItem(): ActionBase.Action<IArtifactItem> {
        return this._toggleArtifactItem;
    }
    
    private _selectArtifactList: ActionBase.Action<string>;
    private _selectArtifact: ActionBase.Action<string>;
    private _unSelectArtifact: ActionBase.Action<string>;
    private _setSelectAll: ActionBase.Action<boolean>;
    private _toggleArtifact: ActionBase.Action<ActionBase.IEmptyActionPayload>;
    private _toggleArtifactItem: ActionBase.Action<IArtifactItem>;
}