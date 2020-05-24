/// <reference types="react" />

import * as React from "react";

import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";

import RMContracts = require("ReleaseManagement/Core/Contracts");

export class RetentionPolicyActionsHub extends ActionsBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_RetentionPolicyActionHub;
    }

    public initialize(): void {
        this._updateDaysToKeepAction = new ActionsBase.Action<string>();
        this._updateReleasesToKeepAction = new ActionsBase.Action<string>();
        this._updateRetainBuildAction = new ActionsBase.Action<boolean>();
        this._updateRetainPolicyAction = new ActionsBase.Action<RMContracts.RetentionPolicy>();
    }

    public get updateDaysToKeepAction(): ActionsBase.Action<string> {
        return this._updateDaysToKeepAction;
    }

    public get updateReleasesToKeepAction(): ActionsBase.Action<string> {
        return this._updateReleasesToKeepAction;
    }

    public get updateRetainBuildAction(): ActionsBase.Action<boolean> {
        return this._updateRetainBuildAction;
    }

    public get updateRetentionPolicy(): ActionsBase.Action<RMContracts.RetentionPolicy> {
        return this._updateRetainPolicyAction;
    }

    private _updateDaysToKeepAction: ActionsBase.Action<string>;
    private _updateReleasesToKeepAction: ActionsBase.Action<string>;
    private _updateRetainBuildAction: ActionsBase.Action<boolean>;
    private _updateRetainPolicyAction: ActionsBase.Action<RMContracts.RetentionPolicy>;
}
