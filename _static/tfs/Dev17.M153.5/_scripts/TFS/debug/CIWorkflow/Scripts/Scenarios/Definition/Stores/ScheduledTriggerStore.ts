import { SourceProvider, SourceProviderCapabilities } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { SourcesSelectionActionsCreator, IChangeSourcesSelectionPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";
import { DayTimePickerDefaults } from "DistributedTaskControls/Components/DayTimePicker";

import { BuildDefinition, BuildTrigger, DefinitionTriggerType, ScheduleTrigger, Schedule, ScheduleDays, SupportedTrigger, SupportLevel } from "TFS/Build/Contracts";

import * as Context from "VSS/Context";
import * as Diag from "VSS/Diag";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IScheduledTriggerState {
    isScheduledIntegrationEnabled: boolean;
    isConfigureScheduleEnabled: boolean[];
    isBranchFilterSupported: boolean;
    schedules: Schedule[];
}

export namespace ScheduledTriggerDefaults{
    export const scheduleOnlyWithChanges: boolean = true;
}

export class ScheduledTriggerStore extends Store {
    private _triggersState: IScheduledTriggerState;
    private _originalTriggersState: IScheduledTriggerState;
    private _buildDefinitionActions: BuildDefinitionActions;
    private _scheduledTriggerActions: Actions.TriggersActions;
    private _sourceProvidersStore: SourceProvidersStore;
    private _sourceSelectionActionCreator: SourcesSelectionActionsCreator;
    private _selectedRepositoryType: string;

    constructor() {
        super();

        // Initialize the triggers states

        this._triggersState = {
            schedules: []
        } as IScheduledTriggerState;

        this._originalTriggersState = {
            schedules: []
        } as IScheduledTriggerState;

        this._initializeTriggersState(this._triggersState);
        this._initializeTriggersState(this._originalTriggersState);

        this._selectedRepositoryType = Utils_String.empty;
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_ScheduledTriggerStore;
    }

    public initialize(): void {
        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);

        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._handleUpdateBuildDefinition);

        this._sourceSelectionActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._sourceSelectionActionCreator.SelectSourceTab.addListener(this._handleChangeSelectedRepositoryType);
        this._sourceSelectionActionCreator.TfSourceRepositoryChanged.addListener(this._handleTfSourcesChanged);

        this._scheduledTriggerActions = ActionsHubManager.GetActionsHub<Actions.TriggersActions>(Actions.TriggersActions);
        this._scheduledTriggerActions.ToggleScheduleIntegration.addListener(this._handleToggleScheduledIntegration);
        this._scheduledTriggerActions.UpdateSchedulesAction.addListener(this._handleUpdateSchedules);
        this._scheduledTriggerActions.ChangeScheduleOnlyWithChangesAction.addListener(this._handleScheduleOnlyWithChangesChanged);
        this._scheduledTriggerActions.ToggleConfigureScheduleView.addListener(this._handleToggleConfigureSchedules);
        this._scheduledTriggerActions.AddSchedule.addListener(this._handleAddSchedule);
        this._scheduledTriggerActions.RemoveSchedule.addListener(this._handleRemoveSchedule);
        this._scheduledTriggerActions.ChangeSIBranchFilterOption.addListener(this._handleChangeSIBranchFilteOption);
        this._scheduledTriggerActions.ChangeSIBranchFilter.addListener(this._handleChangeSIBranchFilter);
        this._scheduledTriggerActions.RemoveSIBranchFilter.addListener(this._handleRemoveSIBranchFilter);
        this._scheduledTriggerActions.AddSIBranchFilter.addListener(this._handleAddSIBranchFilter);
    }

    protected disposeInternal(): void {
        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._handleUpdateBuildDefinition);

        this._sourceSelectionActionCreator.SelectSourceTab.removeListener(this._handleChangeSelectedRepositoryType);
        this._sourceSelectionActionCreator.TfSourceRepositoryChanged.removeListener(this._handleTfSourcesChanged);

        this._scheduledTriggerActions.ToggleScheduleIntegration.removeListener(this._handleToggleScheduledIntegration);
        this._scheduledTriggerActions.UpdateSchedulesAction.removeListener(this._handleUpdateSchedules);
        this._scheduledTriggerActions.ChangeScheduleOnlyWithChangesAction.removeListener(this._handleScheduleOnlyWithChangesChanged);
        this._scheduledTriggerActions.ToggleConfigureScheduleView.removeListener(this._handleToggleConfigureSchedules);
        this._scheduledTriggerActions.AddSchedule.removeListener(this._handleAddSchedule);
        this._scheduledTriggerActions.RemoveSchedule.removeListener(this._handleRemoveSchedule);
        this._scheduledTriggerActions.ChangeSIBranchFilterOption.removeListener(this._handleChangeSIBranchFilteOption);
        this._scheduledTriggerActions.ChangeSIBranchFilter.removeListener(this._handleChangeSIBranchFilter);
        this._scheduledTriggerActions.RemoveSIBranchFilter.removeListener(this._handleRemoveSIBranchFilter);
        this._scheduledTriggerActions.AddSIBranchFilter.removeListener(this._handleAddSIBranchFilter);
    }

    public isDirty(): boolean {
        return (this._triggersState.isScheduledIntegrationEnabled !== this._originalTriggersState.isScheduledIntegrationEnabled ||
            !this._areSchedulesEqual(this._triggersState.schedules, this._originalTriggersState.schedules));
    }

    public isValid(): boolean {
        if (this._triggersState.isScheduledIntegrationEnabled) {
            return (this._isScheduledTriggerOptionsValid(this._triggersState));
        }
        else {
            return true;
        }
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        if (!buildDefinition.triggers || (buildDefinition.triggers.length === 0) || !Utils_Array.first(buildDefinition.triggers, (trigger: BuildTrigger) => trigger.triggerType === DefinitionTriggerType.Schedule)) {
            if (!buildDefinition.triggers || buildDefinition.triggers.length === 0) {
                buildDefinition.triggers = [];
            }

            if (this._triggersState.isScheduledIntegrationEnabled) {
                let scheduledTrigger: ScheduleTrigger = {
                    schedules: this.getState().schedules,
                    triggerType: DefinitionTriggerType.Schedule
                };
                buildDefinition.triggers.push(scheduledTrigger);
            }
        }
        else {
            let index: number = Utils_Array.findIndex(buildDefinition.triggers, (trigger: BuildTrigger) => trigger.triggerType === DefinitionTriggerType.Schedule);
            if (index !== null && index >= 0) {
                if (this._triggersState.isScheduledIntegrationEnabled) {
                    let scheduledTrigger: ScheduleTrigger = {
                        schedules: this._triggersState.schedules,
                        triggerType: DefinitionTriggerType.Schedule
                    };
                    buildDefinition.triggers[index] = scheduledTrigger;
                }
                else {
                    buildDefinition.triggers.splice(index, 1);
                }
            }
        }
        return buildDefinition;
    }

    public getState(): IScheduledTriggerState {
        return this._triggersState;
    }

    public showBranchFilterError(schedule: Schedule): boolean {
        let showError: boolean = false;
        if (this._triggersState.isBranchFilterSupported && schedule.branchFilters.length === 0) {
            showError = true;
        }
        return showError;
    }

    public showNoDaySelectedError(schedule: Schedule): boolean {
        let showError: boolean = false;
        if (schedule.daysToBuild === ScheduleDays.None) {
            showError = true;
        }
        return showError;
    }

    public noScheduleExists(): boolean {
        let noSchedule: boolean = false;
        if (this._triggersState.schedules.length === 0) {
            noSchedule = true;
        }
        return noSchedule;
    }

    private _isScheduledTriggerOptionsValid(state: IScheduledTriggerState): boolean {
        let isValid: boolean = true;

        if (state.schedules.length === 0) {
            isValid = false;
        }
        else {
            state.schedules.forEach((schedule) => {
                if ((state.isBranchFilterSupported && !schedule.branchFilters || schedule.branchFilters.length === 0) || schedule.daysToBuild === 0) {
                    isValid = false;
                }
                else {
                    isValid = isValid && this._noBranchFilterIsEmpty(schedule);
                }
            });
        }

        return isValid;
    }

    private _isBranchFilterSupported(repositoryType: string): boolean {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(repositoryType);
        return !!(provider && provider.isBranchFilterSupported(DefinitionTriggerType.Schedule));
    }

    private _handleChangeSelectedRepositoryType = (payload: IChangeSourcesSelectionPayload): void => {
        if (this._triggersState.isScheduledIntegrationEnabled) {
            if (payload.selectedStoreKey && !Utils_String.equals(payload.selectedStoreKey, this._selectedRepositoryType, true)) {
                this._selectedRepositoryType = payload.selectedStoreKey;
                this._triggersState.isBranchFilterSupported = this._isBranchFilterSupported(payload.selectedStoreKey);
            }
        }

        this.emitChanged();
    }

    private _handleTfSourcesChanged = (selectedRepositoryType: string) => {
        if (selectedRepositoryType) {
            this._selectedRepositoryType = selectedRepositoryType;
            this._triggersState.isBranchFilterSupported = this._isBranchFilterSupported(selectedRepositoryType);
        }

        this.emitChanged();
    }

    private _noBranchFilterIsEmpty(schedule: Schedule): boolean {

        // to be valid build definition branch filter should have length greater than 1
        return schedule.branchFilters.every((branchFilter) => {
            if (branchFilter) {
                branchFilter = branchFilter.trim();
                return branchFilter.length > 1;
            }
            return false;
        });
    }

    private _updateTriggerStateToOriginalState(): void {
        this._triggersState.schedules = [];
        this._originalTriggersState.schedules.forEach((schedule, index) => {
            let sch: Schedule = {
                branchFilters: Utils_Array.clone(schedule.branchFilters),
                daysToBuild: schedule.daysToBuild,
                startHours: schedule.startHours,
                startMinutes: schedule.startMinutes,
                scheduleJobId: schedule.scheduleJobId,
                timeZoneId: schedule.timeZoneId,
                scheduleOnlyWithChanges: schedule.scheduleOnlyWithChanges
            };
            this._triggersState.schedules.push(sch);
        });
    }

    private _clearState(state: IScheduledTriggerState) {
        state.isScheduledIntegrationEnabled = false;
        state.isConfigureScheduleEnabled = [true];
        state.schedules = [{
            branchFilters: [],
            daysToBuild: DayTimePickerDefaults.days,
            startHours: DayTimePickerDefaults.startHours,
            startMinutes: DayTimePickerDefaults.startMinutes,
            scheduleJobId: null,
            timeZoneId: Context.getPageContext().globalization.timeZoneId,
            scheduleOnlyWithChanges: ScheduledTriggerDefaults.scheduleOnlyWithChanges,
        }];
    }

    private _updateStateFromBuildDefinition(buildDefinition: BuildDefinition) {

        if (buildDefinition && buildDefinition.repository) {
            this._selectedRepositoryType = buildDefinition.repository.type || Utils_String.empty;
        }

        if (!buildDefinition.triggers) {
            this._clearState(this._triggersState);
            this._clearState(this._originalTriggersState);
        }

        let siTrigger = Utils_Array.first(buildDefinition.triggers,
            (trigger: BuildTrigger) =>
                (trigger.triggerType === DefinitionTriggerType.Schedule)) as ScheduleTrigger;
        if (siTrigger) {
            this._updateStateWithSIMetaData(siTrigger.schedules, this._triggersState);
            this._updateStateWithSIMetaData(siTrigger.schedules, this._originalTriggersState);
        }
        else {
            this._clearState(this._triggersState);
            this._clearState(this._originalTriggersState);
        }
    }

    private _updateStateWithSIMetaData(schedules: Schedule[], state: IScheduledTriggerState) {
        state.isScheduledIntegrationEnabled = true;
        state.isBranchFilterSupported = this._isBranchFilterSupported(this._selectedRepositoryType);
        state.schedules = [];
        for (let i = 0, len = schedules.length; i < len; i++) {
            if (!state.isConfigureScheduleEnabled[i]) {
                state.isConfigureScheduleEnabled[i] = false;
            }
            state.schedules[i] = {
                branchFilters: Utils_Array.clone(schedules[i].branchFilters),
                daysToBuild: this._convertDaysEnumToNumber(schedules[i].daysToBuild),
                scheduleJobId: schedules[i].scheduleJobId,
                startHours: schedules[i].startHours,
                startMinutes: schedules[i].startMinutes,
                timeZoneId: schedules[i].timeZoneId,
                scheduleOnlyWithChanges: schedules[i].scheduleOnlyWithChanges
            };
        }
    }

    // handles a single day being scheduled, in which case the enum is passed from the server as a string
    private _convertDaysEnumToNumber(days: ScheduleDays): number {
        if (!days) {
            return days;
        }

        switch (days.toString().toLowerCase()) {
            case "none":
                return 0;
            case "monday":
                return 1;
            case "tuesday":
                return 2;
            case "wednesday":
                return 4;
            case "thursday":
                return 8;
            case "friday":
                return 16;
            case "saturday":
                return 32;
            case "sunday":
                return 64;
            case "all":
                return 127;
            default:
                return days;
        }
    }

    private _initializeTriggersState(triggersState: IScheduledTriggerState): void {
        triggersState.isScheduledIntegrationEnabled = false;
        triggersState.isConfigureScheduleEnabled = [false];
        triggersState.schedules = [{
            branchFilters: [],
            daysToBuild: DayTimePickerDefaults.days,
            scheduleJobId: null,
            timeZoneId: Context.getPageContext().globalization.timeZoneId,
            startHours: DayTimePickerDefaults.startHours,
            startMinutes: DayTimePickerDefaults.startMinutes,
            scheduleOnlyWithChanges: ScheduledTriggerDefaults.scheduleOnlyWithChanges
        }];
    }

    private _areSchedulesEqual(originalArray: Schedule[], modifiedArray: Schedule[]): boolean {
        if (originalArray.length !== modifiedArray.length) {
            return false;
        }
        for (let iterator: number = 0; iterator < originalArray.length; iterator++) {
            if (!Utils_Array.arrayEquals(originalArray[iterator].branchFilters, modifiedArray[iterator].branchFilters, (s, t) => s === t) || (originalArray[iterator].daysToBuild !== modifiedArray[iterator].daysToBuild)
                || (originalArray[iterator].scheduleJobId !== modifiedArray[iterator].scheduleJobId)
                || (originalArray[iterator].startHours !== modifiedArray[iterator].startHours)
                || (originalArray[iterator].startMinutes !== modifiedArray[iterator].startMinutes)
                || (originalArray[iterator].timeZoneId !== modifiedArray[iterator].timeZoneId)
                || (originalArray[iterator].scheduleOnlyWithChanges !== modifiedArray[iterator].scheduleOnlyWithChanges)) {
                return false;
            }
        }
        return true;
    }

    private _handleUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._updateStateFromBuildDefinition(definition);
        this.emitChanged();
    }

    private _handleToggleScheduledIntegration = (option: Actions.IToggleBranchPayload) => {
        this._triggersState.isScheduledIntegrationEnabled = option.toggleValue;
        this._triggersState.isBranchFilterSupported = this._isBranchFilterSupported(option.repositoryType);

        if (!option.toggleValue) {
            this._updateTriggerStateToOriginalState();
        }
        if (option.toggleValue && this._triggersState.schedules.length === 1) {
            this._triggersState.isConfigureScheduleEnabled[0] = true;
        }
        if (option.toggleValue && this._triggersState.schedules[option.scheduleIndex].branchFilters.length === 0) {
            this._triggersState.schedules[option.scheduleIndex].branchFilters.push("+" + option.defaultBranchFilter);
        }
        this.emitChanged();
    }

    private _handleUpdateSchedules = (options: IScheduleTriggerOptions) => {
        if (options.day >= 0) {
            this._triggersState.schedules[options.id].daysToBuild = options.day;
        }

        if (options.hour >= 0) {
            this._triggersState.schedules[options.id].startHours = (options.hour === 24) ? 0 : options.hour;
        }

        if (options.minute >= 0) {
            this._triggersState.schedules[options.id].startMinutes = options.minute;
        }

        if (options.timeZoneId) {
            this._triggersState.schedules[options.id].timeZoneId = options.timeZoneId;
        }

        this.emitChanged();
    }

    private _handleScheduleOnlyWithChangesChanged = (payload: Actions.IBooleanTraceablePayload) => {
        if (payload) {
            this._triggersState.schedules[payload.id].scheduleOnlyWithChanges = payload.value;
            this.emitChanged();
        }
    }

    private _handleToggleConfigureSchedules = (payload: Actions.IScheduleActionPayload) => {
        this._triggersState.isConfigureScheduleEnabled[payload.index] = !this._triggersState.isConfigureScheduleEnabled[payload.index];
        this.emitChanged();
    }

    private _handleAddSchedule = (schedule: Actions.IScheduleIndexBranchPayload) => {
        // In order to distribute scheduled build load, default start hour will be randomized
        // between the 0th and 6th hour of the day
        let randomizedStartHour: number = Math.floor(Math.random() * 7);

        let sch: Schedule;
        let branchFilter: string = "+" + schedule.defaultBranch;
        sch = {
            branchFilters: new Array<string>(branchFilter),
            daysToBuild: DayTimePickerDefaults.days,
            startHours: randomizedStartHour,
            startMinutes: DayTimePickerDefaults.startMinutes,
            scheduleJobId: null,
            timeZoneId: Context.getPageContext().globalization.timeZoneId,
            scheduleOnlyWithChanges: ScheduledTriggerDefaults.scheduleOnlyWithChanges
        };
        if (!this._triggersState.schedules) {
            this._triggersState.schedules = [sch];
            this._triggersState.isConfigureScheduleEnabled = [true];
        }
        else {
            this._triggersState.schedules.push(sch);
            this._triggersState.isConfigureScheduleEnabled.push(true);
        }
        this.emitChanged();
    }

    private _handleRemoveSchedule = (schedule: Actions.IScheduleActionPayload) => {
        if (this._triggersState.schedules && this._triggersState.schedules[schedule.index]) {
            this._triggersState.schedules.splice(schedule.index, 1);
            this._triggersState.isConfigureScheduleEnabled.splice(schedule.index, 1);
        }
        else {
            Diag.logWarning(Utils_String.format("Schedule with index {0} does not exist", schedule.index));
        }
        this.emitChanged();
    }

    private _handleChangeSIBranchFilteOption = (dropdownIndexRowPair: Actions.IDropdownIndexRowPair) => {
        let dropdownString: string = (dropdownIndexRowPair.dropdownIndex === 0 ? "+" : "-");
        let newBranchFilter: string = dropdownString + this._triggersState.schedules[dropdownIndexRowPair.scheduleIndex].branchFilters[dropdownIndexRowPair.rowIndex].substring(1);
        this._triggersState.schedules[dropdownIndexRowPair.scheduleIndex].branchFilters[dropdownIndexRowPair.rowIndex] = newBranchFilter;
        this.emitChanged();
    }

    private _handleChangeSIBranchFilter = (branchIndexPair: Actions.InputIndexPair) => {
        let branchFilterString: string = this._triggersState.schedules[branchIndexPair.scheduleIndex].branchFilters[branchIndexPair.index][0] + branchIndexPair.input;
        this._triggersState.schedules[branchIndexPair.scheduleIndex].branchFilters[branchIndexPair.index] = branchFilterString;
        this.emitChanged();
    }

    private _handleRemoveSIBranchFilter = (numberIndexPair: Actions.IScheduleNumberIndexPair) => {
        this._triggersState.schedules[numberIndexPair.index].branchFilters.splice(numberIndexPair.input, 1);
        this.emitChanged();
    }

    private _handleAddSIBranchFilter = (branchIndexPair: Actions.IScheduleStringIndexPair) => {
        this._triggersState.schedules[branchIndexPair.index].branchFilters.push("+" + branchIndexPair.input);
        this.emitChanged();
    }
}
