import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

export interface IState {
    showDialog: boolean;
}

export class SaveDefinitionStore extends StoreBase {
    private _state: IState;
    private _actions: Actions.BuildDefinitionActions;

    constructor() {
        super();
        this._state = {
            showDialog: false
        };
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_SaveDefinitionStore;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<Actions.BuildDefinitionActions>(Actions.BuildDefinitionActions);
        this._actions.showSaveDialog.addListener(this._handleShowDialog);
        this._actions.closeSaveDialog.addListener(this._handleCloseDialog);
    }

    protected disposeInternal(): void {
        this._actions.showSaveDialog.removeListener(this._handleShowDialog);
        this._actions.closeSaveDialog.removeListener(this._handleCloseDialog);
    }

    public getState(): IState {
        return this._state;
    }

    private _handleShowDialog = () => {
        this._state.showDialog = true;
        this.emitChanged();
    }

    private _handleCloseDialog = () => {
        this._state.showDialog = false;
        this.emitChanged();
    }
}
