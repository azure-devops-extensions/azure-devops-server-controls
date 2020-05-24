import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";

import { Action } from "VSS/Flux/Action";

export interface IDropdownIndexRowPair {
    dropdownIndex: number;
    rowIndex: number;
    scheduleIndex?: number;
}

export interface InputIndexPair {
    input: string;
    index: number;
    scheduleIndex?: number;
    branches?: string[];
}

export interface IFilterRowIndex {
    index: number;
}

export interface IContinuousConcurrentBuildPayload {
    maxConcurrentBuildPerBranch: string;
}

export interface IPollingIntervalPayload {
    pollingInterval: string;
}

export interface IBooleanPayload {
    value: boolean;
}

export interface IBooleanTraceablePayload {
    value: boolean;
    id: number;
}

export interface IToggleBranchPayload {
    toggleValue: boolean;
    repositoryType: string;
    defaultBranchFilter?: string;
    defaultPathFilter?: string;
    scheduleIndex?: number;
}

export interface IScheduleNumberIndexPair {
    input: number;
    index: number;
}

export interface IScheduleIndexBranchPayload {
    scheduleIndex: number;
    defaultBranch: string;
}

export interface IScheduleStringIndexPair {
    input: string;
    index: number;
}

export interface IScheduleActionPayload extends IEmptyActionPayload {
    index: number;
}

export interface ISettingsSourceOptionPayload {
    settingsSourceType: number;
}

export interface IToggleGatedCheckInPayload {
    toggleValue: boolean;
    defaultPath: string;
}

export interface IUpdateGatedCheckInPayload {
    runContinuousIntegration?: boolean;
    useWorkSpaceMapping?: boolean;
}

export interface IUpdateBuildCompletionBranchFilter {
    triggerId: number;
    filterIndex?: number;
    branchFilter?: string;
}

export interface IUpdateBuildCompletionDefinition {
    triggerId: number;
    definition: string;
}

export interface IAddBuildCompletionTrigger {
    definitionId?: number;
}

export interface IRemoveBuildCompletionTrigger {
    triggerId: number;
}

export class TriggersActions extends ActionsHubBase {
    private _toggleContinuousIntegration: Action<IToggleBranchPayload>;
    private _toggleScheduleIntegration: Action<IToggleBranchPayload>;
    private _updateSchedulesAction: Action<IScheduleTriggerOptions>;
    private _changeScheduleOnlyWithChangesAction: Action<IBooleanTraceablePayload>;
    private _showAdvancedContinuousIntegrationOptions: Action<IBooleanPayload>;
    private _changeSettingsSourceOption: Action<ISettingsSourceOptionPayload>;
    private _batchCheckbox: Action<IBooleanPayload>;
    private _changeSIBranchFilterOption: Action<IDropdownIndexRowPair>;
    private _changeBranchFilterOption: Action<IDropdownIndexRowPair>;
    private _changePathFilterOption: Action<IDropdownIndexRowPair>;
    private _changeSIBranchFilter: Action<InputIndexPair>;
    private _changeBranchFilter: Action<InputIndexPair>;
    private _changePathFilter: Action<InputIndexPair>;
    private _removeSIBranchFilter: Action<IScheduleNumberIndexPair>;
    private _removeBranchFilter: Action<IFilterRowIndex>;
    private _removePathFilter: Action<IFilterRowIndex>;
    private _addSIBranchFilter: Action<IScheduleActionPayload>;
    private _addBranchFilter: Action<string>;
    private _addPathFilter: Action<string>;
    private _toggleConfigureScheduleView: Action<IScheduleActionPayload>;
    private _addSchedule: Action<IScheduleIndexBranchPayload>;
    private _removeSchedule: Action<IScheduleActionPayload>;
    private _changeMaxConcurrentBuildPerBranch: Action<IContinuousConcurrentBuildPayload>;
    private _changePollingInterval: Action<IPollingIntervalPayload>;
    private _toggleGatedCheckIn: Action<IToggleGatedCheckInPayload>;
    private _runContinuousIntegration: Action<IUpdateGatedCheckInPayload>;
    private _useWorkSpaceMapping: Action<IUpdateGatedCheckInPayload>;
    private _addGatedPathFilter: Action<string>;
    private _changeGatedPathFilterOption: Action<IDropdownIndexRowPair>;
    private _changeGatedPathFilter: Action<InputIndexPair>;
    private _removeGatedPathFilter: Action<IFilterRowIndex>;
    private _toggleBuildCompletion: Action<IBooleanPayload>;
    private _addBuildCompletionBranchFilter: Action<IUpdateBuildCompletionBranchFilter>;
    private _removeBuildCompletionBranchFilter: Action<IUpdateBuildCompletionBranchFilter>;
    private _updateBuildCompletionDefinition: Action<IUpdateBuildCompletionDefinition>;
    private _changeBuildCompletionBranchFilterOption: Action<IUpdateBuildCompletionBranchFilter>;
    private _changeBuildCompletionBranchFilter: Action<IUpdateBuildCompletionBranchFilter>;
    private _addBuildCompletionTrigger: Action<IAddBuildCompletionTrigger>;
    private _removeBuildCompletionTrigger: Action<IRemoveBuildCompletionTrigger>;

    public initialize(): void {
        this._toggleContinuousIntegration = new Action<IToggleBranchPayload>();
        this._toggleScheduleIntegration = new Action<IToggleBranchPayload>();
        this._updateSchedulesAction = new Action<IScheduleTriggerOptions>();
        this._changeScheduleOnlyWithChangesAction = new Action<IBooleanTraceablePayload>();
        this._showAdvancedContinuousIntegrationOptions = new Action<IBooleanPayload>();
        this._changeSettingsSourceOption = new Action<ISettingsSourceOptionPayload>();
        this._batchCheckbox = new Action<IBooleanPayload>();
        this._changeBranchFilterOption = new Action<IDropdownIndexRowPair>();
        this._changeSIBranchFilterOption = new Action<IDropdownIndexRowPair>();
        this._changePathFilterOption = new Action<IDropdownIndexRowPair>();
        this._changeBranchFilter = new Action<InputIndexPair>();
        this._changeSIBranchFilter = new Action<InputIndexPair>();
        this._changePathFilter = new Action<InputIndexPair>();
        this._removeSIBranchFilter = new Action<IScheduleNumberIndexPair>();
        this._removeBranchFilter = new Action<IFilterRowIndex>();
        this._removePathFilter = new Action<IFilterRowIndex>();
        this._addSIBranchFilter = new Action<IScheduleActionPayload>();
        this._addBranchFilter = new Action<string>();
        this._addPathFilter = new Action<string>();
        this._toggleConfigureScheduleView = new Action<IScheduleActionPayload>();
        this._addSchedule = new Action<IScheduleIndexBranchPayload>();
        this._removeSchedule = new Action<IScheduleActionPayload>();
        this._changeMaxConcurrentBuildPerBranch = new Action<IContinuousConcurrentBuildPayload>();
        this._changePollingInterval = new Action<IPollingIntervalPayload>();
        this._toggleGatedCheckIn = new Action<IToggleGatedCheckInPayload>();
        this._useWorkSpaceMapping = new Action<IUpdateGatedCheckInPayload>();
        this._runContinuousIntegration = new Action<IUpdateGatedCheckInPayload>();
        this._removeGatedPathFilter = new Action<IFilterRowIndex>();
        this._changeGatedPathFilterOption = new Action<IDropdownIndexRowPair>();
        this._addGatedPathFilter = new Action<string>();
        this._changeGatedPathFilter = new Action<InputIndexPair>();
        this._toggleBuildCompletion = new Action<IBooleanPayload>();
        this._changeBuildCompletionBranchFilterOption = new Action<IUpdateBuildCompletionBranchFilter>();
        this._changeBuildCompletionBranchFilter = new Action<IUpdateBuildCompletionBranchFilter>();
        this._addBuildCompletionBranchFilter = new Action<IUpdateBuildCompletionBranchFilter>();
        this._removeBuildCompletionBranchFilter = new Action<IUpdateBuildCompletionBranchFilter>();
        this._updateBuildCompletionDefinition = new Action<IUpdateBuildCompletionDefinition>();
        this._addBuildCompletionTrigger = new Action<IAddBuildCompletionTrigger>();
        this._removeBuildCompletionTrigger = new Action<IRemoveBuildCompletionTrigger>();
    }

    public static getKey(): string {
        return "CI.TriggerActions";
    }

    public get ToggleContinuousIntegration(): Action<IToggleBranchPayload> {
        return this._toggleContinuousIntegration;
    }

    public get ShowAdvancedContinuousIntegrationOptions(): Action<IBooleanPayload> {
        return this._showAdvancedContinuousIntegrationOptions;
    }

    public get ChangeSettingsSourceOption(): Action<ISettingsSourceOptionPayload> {
        return this._changeSettingsSourceOption;
    }

    public get BatchCheckbox(): Action<IBooleanPayload> {
        return this._batchCheckbox;
    }

    public get ChangeSIBranchFilterOption(): Action<IDropdownIndexRowPair> {
        return this._changeSIBranchFilterOption;
    }

    public get ChangeBranchFilterOption(): Action<IDropdownIndexRowPair> {
        return this._changeBranchFilterOption;
    }

    public get ChangePathFilterOption(): Action<IDropdownIndexRowPair> {
        return this._changePathFilterOption;
    }

    public get ChangeSIBranchFilter(): Action<InputIndexPair> {
        return this._changeSIBranchFilter;
    }

    public get ChangeBranchFilter(): Action<InputIndexPair> {
        return this._changeBranchFilter;
    }

    public get ChangePathFilter(): Action<InputIndexPair> {
        return this._changePathFilter;
    }

    public get RemoveSIBranchFilter(): Action<IScheduleNumberIndexPair> {
        return this._removeSIBranchFilter;
    }

    public get RemoveBranchFilter(): Action<IFilterRowIndex> {
        return this._removeBranchFilter;
    }

    public get RemovePathFilter(): Action<IFilterRowIndex> {
        return this._removePathFilter;
    }

    public get AddBranchFilter(): Action<string> {
        return this._addBranchFilter;
    }

    public get AddSIBranchFilter(): Action<IScheduleActionPayload> {
        return this._addSIBranchFilter;
    }

    public get AddPathFilter(): Action<string> {
        return this._addPathFilter;
    }

    public get ToggleScheduleIntegration(): Action<IToggleBranchPayload> {
        return this._toggleScheduleIntegration;
    }
    
    public get UpdateSchedulesAction(): Action<IScheduleTriggerOptions> {
        return this._updateSchedulesAction;
    }

    public get ChangeScheduleOnlyWithChangesAction(): Action<IBooleanTraceablePayload> {
        return this._changeScheduleOnlyWithChangesAction;
    }

    public get ToggleConfigureScheduleView(): Action<IScheduleActionPayload> {
        return this._toggleConfigureScheduleView;
    }

    public get AddSchedule(): Action<IScheduleIndexBranchPayload> {
        return this._addSchedule;
    }

    public get RemoveSchedule(): Action<IScheduleActionPayload> {
        return this._removeSchedule;
    }

    public get ChangeMaxConcurrentBuildPerBranch(): Action<IContinuousConcurrentBuildPayload> {
        return this._changeMaxConcurrentBuildPerBranch;
    }

    public get ChangePollingInterval(): Action<IPollingIntervalPayload> {
        return this._changePollingInterval;
    }

    public get ToggleGatedCheckIn(): Action<IToggleGatedCheckInPayload> {
        return this._toggleGatedCheckIn;
    }

    public get RunContinuousIntegration(): Action<IUpdateGatedCheckInPayload> {
        return this._runContinuousIntegration;
    }

    public get UseWorkSpaceMapping(): Action<IUpdateGatedCheckInPayload> {
        return this._useWorkSpaceMapping;
    }

    public get AddGatedPathFilter(): Action<string> {
        return this._addGatedPathFilter;
    }

    public get RemoveGatedPathFilter(): Action<IFilterRowIndex> {
        return this._removeGatedPathFilter;
    }

    public get ChangeGatedPathFilterOption(): Action<IDropdownIndexRowPair> {
        return this._changeGatedPathFilterOption;
    }

    public get ChangeGatedPathFilter(): Action<InputIndexPair> {
        return this._changeGatedPathFilter;
    }

    public get ChangeBuildCompletionBranchFilterOption(): Action<IUpdateBuildCompletionBranchFilter> {
        return this._changeBuildCompletionBranchFilterOption;
    }

    public get ChangeBuildCompletionBranchFilter(): Action<IUpdateBuildCompletionBranchFilter> {
        return this._changeBuildCompletionBranchFilter;
    }

    public get AddBuildCompletionBranchFilter(): Action<IUpdateBuildCompletionBranchFilter> {
        return this._addBuildCompletionBranchFilter;
    }

    public get RemoveBuildCompletionBranchFilter(): Action<IUpdateBuildCompletionBranchFilter> {
        return this._removeBuildCompletionBranchFilter;
    }

    public get UpdateBuildCompletionDefinition(): Action<IUpdateBuildCompletionDefinition> {
        return this._updateBuildCompletionDefinition;
    }

    public get AddBuildCompletionTrigger(): Action<IAddBuildCompletionTrigger> {
        return this._addBuildCompletionTrigger;
    }

    public get RemoveBuildCompletionTrigger(): Action<IRemoveBuildCompletionTrigger> {
        return this._removeBuildCompletionTrigger;
    }
}