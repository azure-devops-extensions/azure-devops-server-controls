import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { ActionCreatorKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";

export class TriggersActionsCreator extends ActionsBase.ActionCreatorBase {
    private _actions: Actions.TriggersActions;

    public static getKey(): string {
        return ActionCreatorKeys.Triggers_ActionCreator;
    }

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<Actions.TriggersActions>(Actions.TriggersActions);
    }

    public toggleContinuousIntegration(continuousIntegrationToggle: Actions.IToggleBranchPayload): void {
        this._actions.ToggleContinuousIntegration.invoke(continuousIntegrationToggle);
    }

    public showCIRepoAdvanced(isRepoAdvancedShown: Actions.IBooleanPayload): void {
        this._actions.ShowAdvancedContinuousIntegrationOptions.invoke(isRepoAdvancedShown);
    }

    public toggleScheduleIntegration(scheduleIntegrationToggle: Actions.IToggleBranchPayload): void {
        this._actions.ToggleScheduleIntegration.invoke(scheduleIntegrationToggle);
    }

    public changeSettingsSourceOption(settingsSourceOption: Actions.ISettingsSourceOptionPayload): void {
        this._actions.ChangeSettingsSourceOption.invoke(settingsSourceOption);
    }

    public batchCheckbox(isChecked: Actions.IBooleanPayload): void {
        this._actions.BatchCheckbox.invoke(isChecked);
    }

    public changeSIBranchFilterOption(dropdownIndexRowPair: Actions.IDropdownIndexRowPair): void {
        this._actions.ChangeSIBranchFilterOption.invoke(dropdownIndexRowPair);
    }

    public changeBranchFilterOption(dropdownIndexRowPair: Actions.IDropdownIndexRowPair): void {
        this._actions.ChangeBranchFilterOption.invoke(dropdownIndexRowPair);
    }

    public changePathFilterOption(dropdownIndexRowPair: Actions.IDropdownIndexRowPair): void {
        this._actions.ChangePathFilterOption.invoke(dropdownIndexRowPair);
    }

    public changeBranchFilter(branchIndexPair: Actions.InputIndexPair): void {
        this._actions.ChangeBranchFilter.invoke(branchIndexPair);
    }

    public changeSIBranchFilter(branchIndexPair: Actions.InputIndexPair): void {
        this._actions.ChangeSIBranchFilter.invoke(branchIndexPair);
    }

    public changePathFilter(inputIndexPair: Actions.InputIndexPair): void {
        this._actions.ChangePathFilter.invoke(inputIndexPair);
    }

    public removeSIBranchFilter(numberIndexPair: Actions.IScheduleNumberIndexPair): void {
        this._actions.RemoveSIBranchFilter.invoke(numberIndexPair);
    }

    public removeBranchFilter(rowIndex: Actions.IFilterRowIndex): void {
        this._actions.RemoveBranchFilter.invoke(rowIndex);
    }

    public removePathFilter(rowIndex: Actions.IFilterRowIndex): void {
        this._actions.RemovePathFilter.invoke(rowIndex);
    }

    public addBranchFilter(branch: string): void {
        this._actions.AddBranchFilter.invoke(branch);
    }

    public addSIBranchFilter(branchIndexPair: Actions.IScheduleStringIndexPair): void {
        this._actions.AddSIBranchFilter.invoke(branchIndexPair);
    }

    public addPathFilter(path: string): void {
        this._actions.AddPathFilter.invoke(path);
    }

    public updateSchedules(schedules: IScheduleTriggerOptions): void {
        this._actions.UpdateSchedulesAction.invoke(schedules);
    }

    public changeScheduleOnlyWithChanges(scheduleOnlyWithChanges: Actions.IBooleanTraceablePayload): void {
        this._actions.ChangeScheduleOnlyWithChangesAction.invoke(scheduleOnlyWithChanges);
    }

    public toggleConfigureScheduleView(payload: Actions.IScheduleActionPayload): void {
        this._actions.ToggleConfigureScheduleView.invoke(payload);
    }

    public addSchedule(schedule: Actions.IScheduleIndexBranchPayload): void {
        this._actions.AddSchedule.invoke(schedule);
    }

    public removeSchedule(schedule: Actions.IScheduleActionPayload): void {
        this._actions.RemoveSchedule.invoke(schedule);
    }

    public changeMaxConcurrentBuildPerBranch(maxConcurrentBuildPerBranch: Actions.IContinuousConcurrentBuildPayload): void {
        this._actions.ChangeMaxConcurrentBuildPerBranch.invoke(maxConcurrentBuildPerBranch);
    }

    public changePollingInterval(pollingInterval: Actions.IPollingIntervalPayload): void {
        this._actions.ChangePollingInterval.invoke(pollingInterval);
    }

    public toggleGatedCheckIn(toggleGatedCheckInPayload: Actions.IToggleGatedCheckInPayload): void {
        this._actions.ToggleGatedCheckIn.invoke(toggleGatedCheckInPayload);
    }

    public useWorkSpaceMapping(updateGatedCheckInPayload: Actions.IUpdateGatedCheckInPayload): void {
        this._actions.UseWorkSpaceMapping.invoke(updateGatedCheckInPayload);
    }

    public runContinuousIntegration(updateGatedCheckInPayload: Actions.IUpdateGatedCheckInPayload): void {
        this._actions.RunContinuousIntegration.invoke(updateGatedCheckInPayload);
    }

    public addGatedPathFilter(defaultPath: string): void {
        this._actions.AddGatedPathFilter.invoke(defaultPath);
    }

    public changeGatedPathFilterOption(dropdownIndexRowPair: Actions.IDropdownIndexRowPair): void {
        this._actions.ChangeGatedPathFilterOption.invoke(dropdownIndexRowPair);
    }

    public changeGatedPathFilter(inputIndexPair: Actions.InputIndexPair): void {
        this._actions.ChangeGatedPathFilter.invoke(inputIndexPair);
    }

    public removeGatedPathFilter(rowIndex: Actions.IFilterRowIndex): void {
        this._actions.RemoveGatedPathFilter.invoke(rowIndex);
    }

    public addBuildCompletionBranchFilter(triggerId: number, filter: string): void {
        let args : Actions.IUpdateBuildCompletionBranchFilter = {
            triggerId: triggerId,
            branchFilter: filter
        };
        this._actions.AddBuildCompletionBranchFilter.invoke(args);
    }

    public removeBuildCompletionBranchFilter(triggerId: number, index: number): void {
        let args : Actions.IUpdateBuildCompletionBranchFilter = {
            triggerId: triggerId,
            filterIndex: index
        };
        this._actions.RemoveBuildCompletionBranchFilter.invoke(args);
    }

    public changeBuildCompletionBranchFilterOption(branchFilter: Actions.IUpdateBuildCompletionBranchFilter): void {
        this._actions.ChangeBuildCompletionBranchFilterOption.invoke(branchFilter);
    }

    public changeBuildCompletionBranchFilter(branchFilter: Actions.IUpdateBuildCompletionBranchFilter): void {
        this._actions.ChangeBuildCompletionBranchFilter.invoke(branchFilter);
    }

    public updateBuildCompletionDefinition(triggerId: number, definition: string): void {
        let args : Actions.IUpdateBuildCompletionDefinition = {
            triggerId: triggerId,
            definition: definition
        };
        this._actions.UpdateBuildCompletionDefinition.invoke(args);
    }

    public addBuildCompletionTrigger(triggerInfo: Actions.IAddBuildCompletionTrigger): void {
        this._actions.AddBuildCompletionTrigger.invoke(triggerInfo);
    }

    public removeBuildCompletionTrigger(triggerInfo: Actions.IRemoveBuildCompletionTrigger): void {
        this._actions.RemoveBuildCompletionTrigger.invoke(triggerInfo);
    }
}
