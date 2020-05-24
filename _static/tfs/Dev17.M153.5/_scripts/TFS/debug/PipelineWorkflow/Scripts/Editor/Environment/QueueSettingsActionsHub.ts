// Copyright (c) Microsoft Corporation.  All rights reserved.

import { Action } from "VSS/Flux/Action";
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineEnvironmentExecutionPolicy } from "PipelineWorkflow/Scripts/Common/Types";

export interface IUpdateQueueSettingPayload {
    executionPolicy: PipelineEnvironmentExecutionPolicy;
}

/**
 *  Actions for environments queue settings.
 */
export class QueueSettingsActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_EnvironmentQueueSettingsActionHub;
    }

    public initialize(): void {
        this._updateParallelDeploymentType = new Action<string>();
        this._updateDeployOptions = new Action<string>();
        this._updateParallelDeploymentCount = new Action<string>();
        this._updateQueueSettings = new Action<IUpdateQueueSettingPayload>();
    }

    /**
     * Action to update parallel deployment type of environment.
     */
    public get updateDeployOptions(): Action<string> {
        return this._updateDeployOptions;
    }

    /**
     * Action to update deploy options for environment.
     */
    public get updateParallelDeploymentType(): Action<string> {
        return this._updateParallelDeploymentType;
    }

    /**
     * Action to update parallel deployment count
     */
    public get updateParallelDeploymentCount(): Action<string> {
        return this._updateParallelDeploymentCount;
    }

    /**
     * Action to update queue settings
     */
    public get updateQueueSettings(): Action<IUpdateQueueSettingPayload> {
        return this._updateQueueSettings;
    }

    private _updateParallelDeploymentType: Action<string>;
    private _updateDeployOptions: Action<string>;
    private _updateParallelDeploymentCount: Action<string>;
    private _updateQueueSettings: Action<IUpdateQueueSettingPayload>;
}