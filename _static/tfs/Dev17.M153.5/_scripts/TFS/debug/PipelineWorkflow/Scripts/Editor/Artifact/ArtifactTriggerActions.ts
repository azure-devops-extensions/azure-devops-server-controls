// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";

/**
 *  Actions for Artifact Triggers 
 */
export class ArtifactTriggerActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_ArtifactTriggerActionHub;
    }

    public initialize(): void {
        this._toggleChanged = new ActionBase.Action<boolean>();
        this._resetToggleState = new ActionBase.Action<boolean>();
        this._updateCreateReleaseOnBuildTagging = new ActionBase.Action<boolean>();
        this._resetCreateReleaseOnBuildTagging = new ActionBase.Action<boolean>();
    }

    public get toggleChanged(): ActionBase.Action<boolean> {
        return this._toggleChanged;
    }

    public get resetToggleState(): ActionBase.Action<boolean> {
        return this._resetToggleState;
    }

    public get updateCreateReleaseOnBuildTagging(): ActionBase.Action<boolean> {
        return this._updateCreateReleaseOnBuildTagging;
    }

    public get resetCreateReleaseOnBuildTagging(): ActionBase.Action<boolean> {
        return this._resetCreateReleaseOnBuildTagging;
    }

    private _toggleChanged: ActionBase.Action<boolean>;
    private _resetToggleState: ActionBase.Action<boolean>;
    private _updateCreateReleaseOnBuildTagging: ActionBase.Action<boolean>;
    private _resetCreateReleaseOnBuildTagging: ActionBase.Action<boolean>;
}