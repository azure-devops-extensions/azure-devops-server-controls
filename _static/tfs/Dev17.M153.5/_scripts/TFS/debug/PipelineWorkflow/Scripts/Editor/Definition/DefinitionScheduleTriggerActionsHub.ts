// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";

/**
 *  Actions for Definition schedule trigger
 */
export class DefinitionScheduleTriggerActionsHub extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_DefinitionScheduleTriggerActionHub;
    }

    public initialize(): void {
        this._updateEnableSchedule = new ActionBase.Action<boolean>();
        this._updateReleaseSchedule = new ActionBase.Action<IScheduleTriggerOptions>();
        this._removeSchedule = new ActionBase.Action<number>();
        this._addSchedule = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
        this._toggleConfigureScheduleView = new ActionBase.Action<number>();
    }

    /**
     * Action to add schedule
     */
    public get addSchedule(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._addSchedule;
    }

    /**
     * Action to remove schedule
     */
    public get removeSchedule(): ActionBase.Action<number> {
        return this._removeSchedule;
    }

    /**
     * Action to update schedule for definition release trigger
     */
    public get updateReleaseSchedule(): ActionBase.Action<IScheduleTriggerOptions> {
        return this._updateReleaseSchedule;
    }

    /**
     * Action to update if schedule is enable/disable for definition trigger.
     */
    public get updateEnableSchedule(): ActionBase.Action<boolean> {
        return this._updateEnableSchedule;
    }

    /**
     * Action to update configure state of schedule.
     */
    public get toggleConfigureScheduleView(): ActionBase.Action<number> {
        return this._toggleConfigureScheduleView;
    }

    private _updateEnableSchedule: ActionBase.Action<boolean>;
    private _updateReleaseSchedule: ActionBase.Action<IScheduleTriggerOptions>;
    private _removeSchedule: ActionBase.Action<number>;
    private _addSchedule: ActionBase.Action<ActionBase.IEmptyActionPayload>;
    private _toggleConfigureScheduleView: ActionBase.Action<number>;
}