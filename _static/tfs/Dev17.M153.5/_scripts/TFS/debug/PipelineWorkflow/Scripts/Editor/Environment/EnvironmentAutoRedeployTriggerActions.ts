// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { IDuration } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentTrigger } from "ReleaseManagement/Core/Contracts";

export class EnvironmentAutoRedeployTriggerActions extends ActionBase.ActionsHubBase {
    public initialize(): void {
        this._toggleTriggers = new ActionBase.Action<boolean>();
        this._addTriggerEvent = new ActionBase.Action<string>();
        this._removeTriggerEvent = new ActionBase.Action<string>();
        this._changeTriggerEvent = new ActionBase.Action<string>();
        this._changeTriggerAction = new ActionBase.Action<string>();
        this._updateAutoRedeployTriggerData = new ActionBase.Action<EnvironmentTrigger[]>();
    }

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_DeployPipelineAutoRedeployTriggerActionHub;
    }

    public get toggleTriggers(): ActionBase.Action<boolean> {
        return this._toggleTriggers;
    }

    public get addTriggerEvent(): ActionBase.Action<string> {
        return this._addTriggerEvent;
    }

    public get removeTriggerEvent(): ActionBase.Action<string> {
        return this._removeTriggerEvent;
    }

    public get changeTriggerAction(): ActionBase.Action<string> {
        return this._changeTriggerAction;
    }

    public get changeTriggerEvent(): ActionBase.Action<string> {
        return this._changeTriggerEvent;
    }

    public get updateAutoRedeployTriggerData(): ActionBase.Action<EnvironmentTrigger[]> {
        return this._updateAutoRedeployTriggerData;
    }

    private _toggleTriggers: ActionBase.Action<boolean>;
    private _addTriggerEvent: ActionBase.Action<string>;
    private _changeTriggerEvent: ActionBase.Action<string>;
    private _removeTriggerEvent: ActionBase.Action<string>;
    private _changeTriggerAction: ActionBase.Action<string>;
    private _updateAutoRedeployTriggerData: ActionBase.Action<EnvironmentTrigger[]>;
}