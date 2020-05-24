import { InputIndexPayload, IDropdownRowIndexPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/Payloads";
import { PullRequestTriggerActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/PullRequestTriggerActions";
import { IBooleanPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { ActionCreatorKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";

export class PullRequestTriggerActionsCreator extends ActionCreatorBase {
    private _actions: PullRequestTriggerActions;

    public static getKey(): string {
        return ActionCreatorKeys.PullRequestTrigger_ActionCreator;
    }

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<PullRequestTriggerActions>(PullRequestTriggerActions);
    }

    public toggleEnabled(enabled: boolean): void {
        this._actions.ToggleEnabled.invoke(enabled);
    }

    public toggleExpanded(expanded: boolean): void {
        this._actions.ToggleExpanded.invoke(expanded);
    }

    public addBranchFilter(branch: string): void {
        this._actions.AddBranchFilter.invoke(branch);
    }

    public changeBranchFilter(payload: InputIndexPayload): void {
        this._actions.ChangeBranchFilter.invoke(payload);
    }

    public changeBranchFilterOption(payload: IDropdownRowIndexPayload): void {
        this._actions.ChangeBranchFilterOption.invoke(payload);
    }

    public changeSettingsSourceOption(settingsSourceType: number): void {
        this._actions.ChangeSettingsSourceOption.invoke(settingsSourceType);
    }

    public removeBranchFilter(rowIndex: number): void {
        this._actions.RemoveBranchFilter.invoke(rowIndex);
    }

    public addPathFilter(path: string): void {
        this._actions.AddPathFilter.invoke(path);
    }

    public changePathFilter(payload: InputIndexPayload): void {
        this._actions.ChangePathFilter.invoke(payload);
    }

    public changePathFilterOption(payload: IDropdownRowIndexPayload): void {
        this._actions.ChangePathFilterOption.invoke(payload);
    }

    public removePathFilter(rowIndex: number): void {
        this._actions.RemovePathFilter.invoke(rowIndex);
    }

    public toggleBuildingForks(isChecked: IBooleanPayload): void {
        this._actions.ToggleBuildingForks.invoke(isChecked);
    }
    
    public toggleAllowSecretsForForks(isChecked: IBooleanPayload): void {
        this._actions.ToggleAllowSecretsForForks.invoke(isChecked);
    }

    public toggleIsCommentRequiredForPullRequest(isChecked: IBooleanPayload): void {
        this._actions.ToggleIsCommentRequiredForPullRequest.invoke(isChecked);
    }
 }
