// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ProcessVariablesActions } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";
import { VariableGroupActions } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";

import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentNameActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentNameActionsHub";

/**
 * Raises actions related to environment properties
 */
export class EnvironmentNameActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_EnvironmentNameActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._instanceId = instanceId;
        this._environmentPropertiesActionsHub = ActionsHubManager.GetActionsHub<EnvironmentNameActionsHub>(EnvironmentNameActionsHub, instanceId);
        this._processVariablesActionsHub = ActionsHubManager.GetActionsHub<ProcessVariablesActions>(ProcessVariablesActions);
        this._variableGroupActionsHub = ActionsHubManager.GetActionsHub<VariableGroupActions>(VariableGroupActions);
    }

    /**
     * Triggers an action to update environment name
     */
    public updateEnvironmentName(environmentName: string, environmentId: number) {
        this._environmentPropertiesActionsHub.updateEnvironmentName.invoke(environmentName);
        this._processVariablesActionsHub.updateScope.invoke({ key: environmentId, value: environmentName } as IScope);
        this._variableGroupActionsHub.updateScope.invoke({ key: environmentId, value: environmentName } as IScope);
    }

    public updateEnvironmentNameFromService(environmentName: string) {
        this._environmentPropertiesActionsHub.updateEnvironmentNameFromService.invoke(environmentName);
    }

    private _environmentPropertiesActionsHub: EnvironmentNameActionsHub;
    private _processVariablesActionsHub: ProcessVariablesActions;
    private _variableGroupActionsHub: VariableGroupActions;
    private _instanceId: string;
}


