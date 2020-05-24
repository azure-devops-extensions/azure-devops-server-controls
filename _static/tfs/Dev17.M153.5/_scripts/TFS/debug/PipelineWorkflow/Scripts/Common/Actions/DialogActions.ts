import { IEmptyActionPayload, ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { CommonActionHubKeys } from "PipelineWorkflow/Scripts/Common/Constants";

import { Action } from "VSS/Flux/Action";

export class DialogActions extends ActionsHubBase {

    public initialize(): void {
        this._showDialog = new Action<IEmptyActionPayload>();
        this._closeDialog = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return CommonActionHubKeys.ActionHubKey_CommonDialogActionHub;
    }

    public get showDialog(): Action<IEmptyActionPayload> {
        return this._showDialog;
    }

    public get closeDialog(): Action<IEmptyActionPayload> {
        return this._closeDialog;
    }

    private _showDialog: Action<IEmptyActionPayload>;
    private _closeDialog: Action<IEmptyActionPayload>;
}
