import * as DTContracts from "TFS/DistributedTask/Contracts";

import { Action, ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { ActionKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";

export interface IErrorMessagePayload {
    errorMessage: string;
}

export class TabActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return ActionKeys.TaskGroupEditorTabsActionHub;
    }

    public initialize(): void {
        this._updateErrorMessage = new Action<IErrorMessagePayload>();
    }

    public get updateErrorMessage(): Action<IErrorMessagePayload> {
        return this._updateErrorMessage;
    }

    private _updateErrorMessage: Action<IErrorMessagePayload>;
}