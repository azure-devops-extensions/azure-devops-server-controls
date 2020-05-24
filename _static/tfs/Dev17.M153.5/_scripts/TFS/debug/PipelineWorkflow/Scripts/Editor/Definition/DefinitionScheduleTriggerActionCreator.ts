// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";

import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { DefinitionScheduleTriggerActionsHub } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionScheduleTriggerActionsHub";

/**
 * Raises actions related to definition schedule trigger
 */
export class DefinitionScheduleTriggerActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_DefinitionScheduleTriggerActionCreator;
    }

    public initialize(): void {
        this._definitionScheduleTriggerActionsHub = ActionsHubManager.GetActionsHub<DefinitionScheduleTriggerActionsHub>(DefinitionScheduleTriggerActionsHub);
    }

    /**
     * Triggers an action to add definition schedule
     */
    public addSchedule() {
        this._definitionScheduleTriggerActionsHub.addSchedule.invoke({});
    }

    /**
     * Triggers an action to remove definition schedule
     */
    public removeSchedule(index: number) {
        this._definitionScheduleTriggerActionsHub.removeSchedule.invoke(index);
    }

    /**
     * Triggers an action to update schedule for definition release trigger
     */
    public updateDefinitionSchedule(scheduleOption: IScheduleTriggerOptions) {
        this._definitionScheduleTriggerActionsHub.updateReleaseSchedule.invoke(scheduleOption);
    }

    /**
     * Triggers an action to enable/disabled schedule for definition
     */
    public updateEnableEnvironmentSchedule(enableSchedule: boolean) {
        this._definitionScheduleTriggerActionsHub.updateEnableSchedule.invoke(enableSchedule);
    }

    /**
     * Triggers an action update configure schedule option
     */
    public toggleConfigureScheduleView(index: number) {
        this._definitionScheduleTriggerActionsHub.toggleConfigureScheduleView.invoke(index);
    }

    private _definitionScheduleTriggerActionsHub: DefinitionScheduleTriggerActionsHub;
}
