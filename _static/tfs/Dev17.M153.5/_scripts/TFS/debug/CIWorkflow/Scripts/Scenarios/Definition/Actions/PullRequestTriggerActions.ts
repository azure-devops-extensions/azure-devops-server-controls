import { InputIndexPayload, IDropdownRowIndexPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/Payloads";
import { IBooleanPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";

import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { Action } from "VSS/Flux/Action";

export class PullRequestTriggerActions extends ActionsHubBase {
    private _toggleEnabled: Action<boolean>;
    private _toggleExpanded: Action<boolean>;
    private _addBranchFilter: Action<string>;
    private _changeBranchFilter: Action<InputIndexPayload>;
    private _changeBranchFilterOption: Action<IDropdownRowIndexPayload>;
    private _changeSettingsSourceOption: Action<number>;
    private _removeBranchFilter: Action<number>;
    private _addPathFilter: Action<string>;
    private _changePathFilter: Action<InputIndexPayload>;
    private _changePathFilterOption: Action<IDropdownRowIndexPayload>;
    private _removePathFilter: Action<number>;
    private _toggleBuildingForks: Action<IBooleanPayload>;
    private _toggleAllowSecretsForForks: Action<IBooleanPayload>;
    private _toggleIsCommentRequiredForPullRequest: Action<IBooleanPayload>;
    private _toggleSettingsSource: Action<number>;
    
    public static getKey(): string {
        return "PullRequest.TriggerActions";
    }

    public initialize(): void {
        this._toggleEnabled = new Action<boolean>();
        this._toggleExpanded = new Action<boolean>();
        this._addBranchFilter = new Action<string>();
        this._changeBranchFilter = new Action<InputIndexPayload>();
        this._changeBranchFilterOption = new Action<IDropdownRowIndexPayload>();
        this._changeSettingsSourceOption = new Action<number>();
        this._removeBranchFilter = new Action<number>();
        this._addPathFilter = new Action<string>();
        this._changePathFilter = new Action<InputIndexPayload>();
        this._changePathFilterOption = new Action<IDropdownRowIndexPayload>();
        this._removePathFilter = new Action<number>();
        this._toggleBuildingForks = new Action<IBooleanPayload>();
        this._toggleAllowSecretsForForks = new Action<IBooleanPayload>();
        this._toggleIsCommentRequiredForPullRequest = new Action<IBooleanPayload>();
    }

    public get ToggleEnabled(): Action<boolean> {
        return this._toggleEnabled;
    }

    public get ToggleExpanded(): Action<boolean> {
        return this._toggleExpanded;
    }

    public get AddBranchFilter(): Action<string> {
        return this._addBranchFilter;
    }

    public get ChangeBranchFilter(): Action<InputIndexPayload> {
        return this._changeBranchFilter;
    }

    public get ChangeBranchFilterOption(): Action<IDropdownRowIndexPayload> {
        return this._changeBranchFilterOption;
    }

    public get ChangeSettingsSourceOption(): Action<number> {
        return this._changeSettingsSourceOption;
    }

    public get RemoveBranchFilter(): Action<number> {
        return this._removeBranchFilter;
    }

    public get AddPathFilter(): Action<string> {
        return this._addPathFilter;
    }

    public get ChangePathFilter(): Action<InputIndexPayload> {
        return this._changePathFilter;
    }

    public get ChangePathFilterOption(): Action<IDropdownRowIndexPayload> {
        return this._changePathFilterOption;
    }

    public get RemovePathFilter(): Action<number> {
        return this._removePathFilter;
    }

    public get ToggleBuildingForks(): Action<IBooleanPayload> {
        return this._toggleBuildingForks;
    }
    
    public get ToggleAllowSecretsForForks(): Action<IBooleanPayload> {
        return this._toggleAllowSecretsForForks;
    }

    public get ToggleIsCommentRequiredForPullRequest(): Action<IBooleanPayload> {
        return this._toggleIsCommentRequiredForPullRequest;
    }
}