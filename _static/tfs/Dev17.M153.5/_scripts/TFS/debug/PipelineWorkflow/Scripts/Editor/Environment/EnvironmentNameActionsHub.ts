// Copyright (c) Microsoft Corporation.  All rights reserved.

import { Action } from "VSS/Flux/Action";
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";


/**
 *  Actions for environments properties.
 */
export class EnvironmentNameActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_EnvironmentNameActionHub;
    }

    public initialize(): void {
        this._updateEnvironmentName = new Action<string>();
        this._updateEnvironmentNameFromService = new Action<string>();
    }

    /**
     * Action to update environment name
     */
    public get updateEnvironmentName(): Action<string> {
        return this._updateEnvironmentName;
    }

    public get updateEnvironmentNameFromService(): Action<string> {
        return this._updateEnvironmentNameFromService;
    }

    private _updateEnvironmentName: Action<string>;
    private _updateEnvironmentNameFromService: Action<string>;
}