// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentAutoRedeployTriggerActions } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAutoRedeployTriggerActions";
import { EnvironmentTrigger } from "ReleaseManagement/Core/Contracts";

export class EnvironmentAutoRedeployTriggerActionsCreator extends ActionCreatorBase {
    public initialize(instanceId: string): void {
        this._actions = ActionsHubManager.GetActionsHub(EnvironmentAutoRedeployTriggerActions, instanceId);
    }

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_DeployPipelineAutoRedeployTriggerActionCreator;
    }

    public toggleTriggers(isEnabled: boolean): void {
        this._actions.toggleTriggers.invoke(isEnabled);
    }

    public toggleTriggerEvent(eventKey: string, selected: boolean): void {
        if (selected) {
            this._actions.addTriggerEvent.invoke(eventKey);
        }
        else {
            this._actions.removeTriggerEvent.invoke(eventKey);
        }
    }

    public changeTriggerEvent(actionKey: string): void {
        this._actions.changeTriggerEvent.invoke(actionKey);
    }

    public changeTriggerAction(actionKey: string): void {
        this._actions.changeTriggerAction.invoke(actionKey);
    }

    public updateAutoRedeployTriggerData(triggers: EnvironmentTrigger[]): void {
        this._actions.updateAutoRedeployTriggerData.invoke(triggers);
    }

    private _actions: EnvironmentAutoRedeployTriggerActions;
}