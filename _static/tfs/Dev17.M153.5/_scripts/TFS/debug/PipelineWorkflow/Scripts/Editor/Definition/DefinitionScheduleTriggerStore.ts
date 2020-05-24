// Copyright (c) Microsoft Corporation.  All rights reserved.

import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { PipelineDefinition, PipelineReleaseSchedule } from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { IUpdateDefinitionActionPayload, DefinitionActionsHub } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActions";
import { DefinitionScheduleTriggerActionsHub } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionScheduleTriggerActionsHub";
import { ScheduleUtils } from "PipelineWorkflow/Scripts/Editor/Common/ScheduleUtils";

import { ScheduleDays, ReleaseTriggerType } from "ReleaseManagement/Core/Contracts";

import * as Diag from "VSS/Diag";

/**
 * State of Definition schedule trigger
 */
export interface IDefinitionScheduleTriggerState {
    schedules: PipelineReleaseSchedule[];
    isScheduleEnabled: boolean;
    isConfigureScheduleEnabled: boolean[];
}

/**
 * The store contains schedules for release definition.
 */
export class DefinitionScheduleTriggerStore extends DataStoreBase {

    constructor() {
        super();

        this._currentState = {} as IDefinitionScheduleTriggerState;
        this._originalState = {} as IDefinitionScheduleTriggerState;

        this._definitionActionsHub = ActionsHubManager.GetActionsHub<DefinitionActionsHub>(DefinitionActionsHub);
        this._definitionScheduleTriggerActionsHub = ActionsHubManager.GetActionsHub<DefinitionScheduleTriggerActionsHub>(DefinitionScheduleTriggerActionsHub);
    }


    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineDefinitionScheduleTriggerStoreKey;
    }

    public initialize(): void {
        Diag.logVerbose("[DefinitionScheduleTriggerStore.initialize]: store getting initialized.");

        this._definitionActionsHub.createDefinition.addListener(this._handleCreateDefinition);
        this._definitionActionsHub.updateDefinition.addListener(this._handleUpdateDefinition);

        this._definitionScheduleTriggerActionsHub.updateEnableSchedule.addListener(this._handleUpdateToggleSchedule);
        this._definitionScheduleTriggerActionsHub.addSchedule.addListener(this._handleAddSchedule);
        this._definitionScheduleTriggerActionsHub.removeSchedule.addListener(this._handleRemoveSchedule);
        this._definitionScheduleTriggerActionsHub.updateReleaseSchedule.addListener(this._handleUpdateSchedule);
        this._definitionScheduleTriggerActionsHub.toggleConfigureScheduleView.addListener(this._handleToggleConfigureSchedules);
    }

    public disposeInternal(): void {
        Diag.logVerbose("[DefinitionScheduleTriggerStore.disposeInternal]: store getting disposed");

        this._definitionActionsHub.createDefinition.removeListener(this._handleCreateDefinition);
        this._definitionActionsHub.updateDefinition.removeListener(this._handleUpdateDefinition);

        this._definitionScheduleTriggerActionsHub.updateEnableSchedule.removeListener(this._handleUpdateToggleSchedule);
        this._definitionScheduleTriggerActionsHub.addSchedule.removeListener(this._handleAddSchedule);
        this._definitionScheduleTriggerActionsHub.removeSchedule.removeListener(this._handleRemoveSchedule);
        this._definitionScheduleTriggerActionsHub.updateReleaseSchedule.removeListener(this._handleUpdateSchedule);
        this._definitionScheduleTriggerActionsHub.toggleConfigureScheduleView.removeListener(this._handleToggleConfigureSchedules);
    }

    public isDirty(): boolean {
        return (this._currentState.isScheduleEnabled !== this._originalState.isScheduleEnabled ||
            this._areSchedulesDirty());
    }

    public isValid(): boolean {
        let schedules: PipelineReleaseSchedule[] = this._currentState.schedules;
        let isValid: boolean = true;
        if (this._currentState.isScheduleEnabled) {
            if (schedules) {
                schedules.forEach((schedule: PipelineReleaseSchedule) => {
                    if (schedule.daysToRelease === ScheduleDays.None) {
                        isValid = false;
                    }
                });
            } else {
                isValid = false;
            }
        }
        return isValid;
    }

    public updateVisitor(definition: PipelineDefinition): PipelineDefinition {
        let triggers = [];
        if (definition) {
            if (definition.triggers) {
                // we have to use explicit any type here because RM contract
                // does not have schedule as the property. It only has artifactTriggerType
                definition.triggers.forEach((trigger: any, index: number) => {
                    if (trigger.triggerType !== ReleaseTriggerType.Schedule) {
                        triggers.push(trigger);
                    }
                });
            }

            // add currentState schedules
            if (this._currentState.isScheduleEnabled) {
                this._currentState.schedules.forEach((schedule: PipelineReleaseSchedule, index: number) => {
                    triggers.push({
                        triggerType: ReleaseTriggerType.Schedule,
                        schedule: schedule
                    });
                });
            }
            definition.triggers = triggers;
        }

        return definition;
    }

    public getState(): IDefinitionScheduleTriggerState {
        return this._currentState;
    }

    private _areSchedulesDirty(): boolean {
        let isDirty: boolean = false;

        // if schedules are disabled no need to check for schedules
        if (this._currentState.isScheduleEnabled) {
            isDirty = !ScheduleUtils.areSchedulesArrayEqual(this._currentState.schedules, this._originalState.schedules);
        }

        return isDirty;
    }

    private _handleCreateDefinition = (definition: PipelineDefinition) => {
        this._handleCreateOrUpdateDefinition(definition);
        this.emitChanged();
    }

    private _handleUpdateDefinition = (actionPayload: IUpdateDefinitionActionPayload) => {
        this._handleCreateOrUpdateDefinition(actionPayload.definition);
    }

    private _handleCreateOrUpdateDefinition(definition: PipelineDefinition): void {
        this._initializeState(this._currentState, definition);
        this._initializeState(this._originalState, definition);
    }

    private _handleUpdateToggleSchedule = (enableSchedule: boolean): void => {
        this._currentState.isScheduleEnabled = !!enableSchedule;
        if (!!enableSchedule &&
            (!this._currentState.schedules || this._currentState.schedules.length === 0)) {
            // if no schedules are present add one explicitly
            this._addDefaultSchedule();
        }

        this._publishReleaseScheduleTriggerToggleTelemetry(enableSchedule);

        this.emitChanged();
    }

    private _publishReleaseScheduleTriggerToggleTelemetry(state: boolean) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ToggleState] = state;
        Telemetry.instance().publishEvent(Feature.ReleaseScheduleTriggerToggle, eventProperties);
    }

    private _handleAddSchedule = () => {
        this._addDefaultSchedule();
        this.emitChanged();
    }

    private _handleRemoveSchedule = (index: number) => {
        if (index >= 0) {
            this._currentState.schedules.splice(index, 1);
            this._currentState.isConfigureScheduleEnabled.splice(index, 1);
            this.emitChanged();
        }
    }

    private _handleToggleConfigureSchedules = (index: number) => {
        if (index >= 0) {
            this._currentState.isConfigureScheduleEnabled[index] = !this._currentState.isConfigureScheduleEnabled[index];
            this.emitChanged();
        }
    }

    private _handleUpdateSchedule = (scheduleOptions: IScheduleTriggerOptions) => {
        if (scheduleOptions) {
            if (scheduleOptions.day >= 0) {
                this._currentState.schedules[scheduleOptions.id].daysToRelease = scheduleOptions.day;
            }

            if (scheduleOptions.hour >= 0) {
                this._currentState.schedules[scheduleOptions.id].startHours = (scheduleOptions.hour === 24) ? 0 : scheduleOptions.hour;
            }

            if (scheduleOptions.minute >= 0) {
                this._currentState.schedules[scheduleOptions.id].startMinutes = scheduleOptions.minute;
            }

            if (scheduleOptions.timeZoneId) {
                this._currentState.schedules[scheduleOptions.id].timeZoneId = scheduleOptions.timeZoneId;
            }
            this.emitChanged();
        }
    }

    private _addDefaultSchedule(): void {
        this._currentState.schedules.push(ScheduleUtils.getDefaultSchedule());
        this._currentState.isConfigureScheduleEnabled.push(true);
    }

    private _initializeState(state: IDefinitionScheduleTriggerState, definition: PipelineDefinition): void {
        state.schedules = this._getInitialSchedules(definition);
        state.isScheduleEnabled = this._isScheduleEnabled(state.schedules);
        if (!this._currentState.isConfigureScheduleEnabled) {
            //Initialize only once
            state.isConfigureScheduleEnabled = this._getInitialConfigureScheduleState(state.schedules);
        }
    }

    private _getInitialSchedules(definition: PipelineDefinition): PipelineReleaseSchedule[] {
        let schedules: PipelineReleaseSchedule[] = [];
        if (definition && definition.triggers && definition.triggers.length > 0) {
            // we have to use explicit any type here because RM contract
            // does not have schedule as the property. It only has artifactTriggerType
            definition.triggers.forEach((trigger: any, index: number) => {
                if (trigger.triggerType === ReleaseTriggerType.Schedule) {
                    schedules.push(JQueryWrapper.extendDeep({}, trigger.schedule));
                }
            });
        }
        return schedules;
    }

    private _isScheduleEnabled(schedules: PipelineReleaseSchedule[]): boolean {
        let isEnabled: boolean = false;
        if (schedules && schedules.length > 0) {
            isEnabled = true;
        }
        return isEnabled;
    }

    private _getInitialConfigureScheduleState(schedules: PipelineReleaseSchedule[]): boolean[] {
        let configureScheduleState: boolean[] = [];
        if (schedules && schedules.length > 0) {
            for (let i: number = 0; i < schedules.length; i++) {
                configureScheduleState.push(false);
            }
        }
        return configureScheduleState;
    }

    private _currentState: IDefinitionScheduleTriggerState;
    private _originalState: IDefinitionScheduleTriggerState;
    private _definitionActionsHub: DefinitionActionsHub;
    private _definitionScheduleTriggerActionsHub: DefinitionScheduleTriggerActionsHub;
}

