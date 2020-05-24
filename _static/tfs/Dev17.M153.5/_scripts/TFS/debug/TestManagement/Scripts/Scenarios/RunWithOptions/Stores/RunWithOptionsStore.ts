/// <reference types="jquery" />

import { Store } from "VSS/Flux/Store";

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { RunWithOptionsActionsHub } from "TestManagement/Scripts/Scenarios/RunWithOptions/Actions/RunWithOptionsActionsHub";

export interface IRunWithOptionsState {
    showDialog: boolean;
    errorMessage: string;
    disableOkButton: boolean;
}

export class RunWithOptionsStore extends Store {

    constructor(private _actionsHub: RunWithOptionsActionsHub) {
        super();
        this._initialize();
    }

    private _initialize(): void {
        this._state = this._getDefaultState();
        this._actionsHub.closeDialog.addListener(this._closeDialogListener);
        this._actionsHub.onError.addListener(this._onErrorListener);
        this._actionsHub.onErrorMessageClose.addListener(this._onErrorMessageCloseListener);
    }

    public getState(): IRunWithOptionsState {
        return this._state;
    }

    private _closeDialogListener = (): void => {
        this._state = { showDialog: false } as IRunWithOptionsState;
        this.emitChanged();
    }

    private _onErrorListener = (errorMessage: string): void => {
        this._state.errorMessage = errorMessage;
        this.emitChanged();
    }

    private _onErrorMessageCloseListener = (): void => {
        this._state.errorMessage = null;
        this.emitChanged();
    }

    private _getDefaultState(): IRunWithOptionsState {
        return {
            showDialog: true
        } as IRunWithOptionsState;
    }

    private _state: IRunWithOptionsState;
}
