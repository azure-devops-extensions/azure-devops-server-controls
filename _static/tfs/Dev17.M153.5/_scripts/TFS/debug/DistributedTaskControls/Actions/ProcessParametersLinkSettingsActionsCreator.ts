
import { ProcessParametersLinkSettingsActions } from "DistributedTaskControls/Actions/ProcessParametersLinkSettingsActions";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";

import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

export class ProcessParametersLinkSettingsActionsCreator extends ActionCreatorBase {
    constructor() {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.LinkUnlinkProcParamsDialogViewActionCreator;
    }

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<ProcessParametersLinkSettingsActions>(ProcessParametersLinkSettingsActions);
    }

    public inputSelectionChanged(selectedInput: TaskInputDefinition) {
        return this._actions.inputSelectionChanged.invoke(selectedInput);
    }

    public procParamNameChanged(newName: string) {
        return this._actions.procParamNameChanged.invoke(newName);
    }

    public displayNameChanged(newName: string) {
        return this._actions.displayNameChanged.invoke(newName);
    }

    public valueChanged(newVal: string) {
        return this._actions.valueChanged.invoke(newVal);
    }

    private _actions: ProcessParametersLinkSettingsActions;
}