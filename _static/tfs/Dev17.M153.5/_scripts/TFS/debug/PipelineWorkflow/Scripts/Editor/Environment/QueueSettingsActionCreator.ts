// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { QueueSettingsActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsActionsHub";
import { PipelineEnvironmentExecutionPolicy } from "PipelineWorkflow/Scripts/Common/Types";

/**
 * Raises actions related to environment queue settings
 */
export class QueueSettingsActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_EnvironmentQueueSettingsActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._environmentQueueSettingsActionsHub = ActionsHubManager.GetActionsHub<QueueSettingsActionsHub>(QueueSettingsActionsHub, instanceId);
    }

    /**
     * Triggers an action to update environment parallel deployment type.
     */
    public updateParallelDeploymentType(parallelDeploymentType: string) {
        this._environmentQueueSettingsActionsHub.updateParallelDeploymentType.invoke(parallelDeploymentType);
    }

    /**
     * Triggers an action to update deploy option for an environment.
     */
    public updateDeployOptions(deployOption: string) {
        this._environmentQueueSettingsActionsHub.updateDeployOptions.invoke(deployOption);
    }

    /**
     * Triggers an action to update parallel deployment count of environment
     */
    public updateParallelDeploymentCount(count: string) {
        this._environmentQueueSettingsActionsHub.updateParallelDeploymentCount.invoke(count);
    }

    /**
     * Triggers an action to update queue settings
     */
    public updateQueueSettings(executionPolicy: PipelineEnvironmentExecutionPolicy) {
        this._environmentQueueSettingsActionsHub.updateQueueSettings.invoke({
            executionPolicy: executionPolicy
        });
    }

    private _environmentQueueSettingsActionsHub: QueueSettingsActionsHub;
}


