import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IState } from "DistributedTaskControls/Common/Components/Base";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { DialogActions } from "PipelineWorkflow/Scripts/Common/Actions/DialogActions";
import { CommonStoreKeys } from "PipelineWorkflow/Scripts/Common/Constants";

export interface IDialogStoreState extends IState {
    showDialog: boolean;
}

export class DialogStore extends StoreBase {

    constructor() {
        super();
        this._state = {
            showDialog: false
        } as IDialogStoreState;
    }

    public static getKey(): string {
        return CommonStoreKeys.StoreKey_CommonDialogStoreKey;
    }

    public initialize(instanceId: string): void {
        this._actions = ActionsHubManager.GetActionsHub<DialogActions>(DialogActions, instanceId);
        this._actions.showDialog.addListener(this._handleShowDialog);
        this._actions.closeDialog.addListener(this._handleCloseDialog);
    }

    public getState(): IDialogStoreState {
        return this._state;
    }

    protected disposeInternal(): void {
        this._actions.showDialog.removeListener(this._handleShowDialog);
        this._actions.closeDialog.removeListener(this._handleCloseDialog);
    }

    private _handleShowDialog = () => {
        this._updateState(this._state.showDialog, true);
    }

    private _handleCloseDialog = () => {
        this._updateState(this._state.showDialog, false);
    }

    private _updateState(originalValue: boolean, newValue: boolean): void {
        // Emit changes only if original value and new value are different.
        if (originalValue !== newValue) {
            this._state.showDialog = newValue;
            this.emitChanged();
        }
    }

    private _state: IDialogStoreState;
    private _actions: DialogActions;
}
