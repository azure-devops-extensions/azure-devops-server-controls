// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";

import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import {
    EnvironmentTriggerActionsHub, IEnvironmentTriggerSelectionPayload,
    IPostEnvironmentDeploymentTriggerPayload, IEnvironmentPayload
} from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerActionsHub";
import { PipelineEnvironmentTriggerCondition, PipelineReleaseSchedule, PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";

/**
 * Raises actions related to environment trigger
 */
export class EnvironmentTriggerActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_EnvironmentTriggerActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._environmentTriggerActionsHub = ActionsHubManager.GetActionsHub<EnvironmentTriggerActionsHub>(EnvironmentTriggerActionsHub, instanceId);
    }

    /**
     * Triggers an action to select different type of environment trigger options
     * @param payload
     */
    public selectEnvironmentTriggerTab(payload: IEnvironmentTriggerSelectionPayload) {
        this._environmentTriggerActionsHub.selectEnvironmentTriggerTab.invoke(payload);
    }

    /**
     * Triggers an action to update the post environment deployment trigger condition
     * @param payload
     */
    public updateEnvironmentTriggerCondition(payload: IPostEnvironmentDeploymentTriggerPayload) {
        this._environmentTriggerActionsHub.updateEnvironmentTriggerCondition.invoke(payload);
    }

    /**
     * Triggers an action to update if post environment deployment trigger can happen after successful or partially successful deployment
     * @param option
     */
    public updatePartiallySucceededCondition(option: boolean) {
        this._environmentTriggerActionsHub.updatePartiallySucceededCondition.invoke(option);
    }

    /**
     * Triggers an action to update schedule for environment release trigger
     * @param scheduleOption
     */
    public updateEnvironmentSchedule(scheduleOption: IScheduleTriggerOptions) {
        this._environmentTriggerActionsHub.updateEnvironmentSchedule.invoke(scheduleOption);
    }

    /**
     * Triggers an action to enable/disabled schedule for environment
     * @param enableSchedule
     */
    public updateEnableEnvironmentSchedule(enableSchedule: boolean) {
        this._environmentTriggerActionsHub.updateEnableSchedule.invoke(enableSchedule);
    }

    /**
     * Triggers an action when environment name changed
     * @param environmentId Environment Id of the changed environment
     */
    public updateEnvironmentName(environmentPayload: IEnvironmentPayload) {
        this._environmentTriggerActionsHub.updateEnvironmentName.invoke(environmentPayload);
    }

    /*
     * Triggers an action to update trigger for environment
     * @param updateEnvironmentTriggerPayload
     */
    public updateEnvironmentTrigger(environmentId: number, triggerConditions: PipelineEnvironmentTriggerCondition[],
        triggerSchedules: PipelineReleaseSchedule[]) {
        this._environmentTriggerActionsHub.updateEnvironmentTrigger.invoke({
            environmentId: environmentId,
            triggerConditions: triggerConditions,
            triggerSchedules: triggerSchedules
        });
    }

      /*
     * Triggers an action to update trigger for environment
     * @param updateEnvironmentTriggerPayload
     */
    public updatePostEnvironmentTrigger(environmentId: number, triggerConditions: PipelineEnvironmentTriggerCondition[]) {
        this._environmentTriggerActionsHub.updatePostEnvironmentTrigger.invoke({
            environmentId: environmentId,
            triggerConditions: triggerConditions
        });
    }
    /**
     * Triggers an action to add new artifact trigger condition
     */
    public addArtifactCondition() {
        this._environmentTriggerActionsHub.addArtifactCondition.invoke({});
    }

    /**
     * Triggers an action to delete an artifact trigger condition
     * @param index
     */
    public deleteArtifactCondition(index: number) {
        this._environmentTriggerActionsHub.deleteArtifactCondition.invoke(index);
    }

    /**
     * Triggers an action to change the artifact alias
     * @param index
     * @param artifactAlias
     */
    public artifactAliasChange(index: number, artifactAlias: string) {
        this._environmentTriggerActionsHub.artifactAliasChange.invoke({
            index: index,
            artifactAlias: artifactAlias
        });
    }

    /**
     * Triggers an action to change the branch
     * @param index
     * @param branch
     */
    public branchChange(index: number, branchName: string) {
        this._environmentTriggerActionsHub.branchChange.invoke({
            index: index,
            branchName: branchName
        });
    }

    /**
     * Triggers an action to change the tags
     * @param index
     * @param tags
     */
    public tagsChanged(index: number, tags: string[]) {
        this._environmentTriggerActionsHub.tagsChanged.invoke({
            index: index,
            tags: tags
        });
    }

    private _environmentTriggerActionsHub: EnvironmentTriggerActionsHub;
}


