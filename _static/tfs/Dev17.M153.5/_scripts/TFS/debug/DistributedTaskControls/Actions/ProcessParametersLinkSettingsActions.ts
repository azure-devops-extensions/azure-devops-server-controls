
import { Action } from "VSS/Flux/Action";

import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

export class ProcessParametersLinkSettingsActions extends ActionsHubBase {

    public initialize(): void {
        this._inputSelectionChanged = new Action<TaskInputDefinition>();
        this._procParamNameChanged = new Action<string>();
        this._displayNameChanged = new Action<string>();
        this._valueChanged = new Action<string>();
    }

    public static getKey(): string {
        return ActionsKeys.LinkUnlinkProcParamsDialogViewActions;
    }

    public get inputSelectionChanged(): Action<TaskInputDefinition> {
        return this._inputSelectionChanged;
    }

    public get procParamNameChanged(): Action<string> {
        return this._procParamNameChanged;
    }

    public get displayNameChanged(): Action<string> {
        return this._displayNameChanged;
    }

    public get valueChanged(): Action<string> {
        return this._valueChanged;
    }

    private _procParamNameChanged: Action<string>;
    private _displayNameChanged: Action<string>;
    private _valueChanged: Action<string>;
    private _inputSelectionChanged: Action<TaskInputDefinition>;
}