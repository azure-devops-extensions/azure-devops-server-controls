import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { VariableGroupActions, IStatus, Status, IShowEditVariableGroupPanelPayload } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { IScope, IDefinitionVariableGroup } from "DistributedTaskControls/Variables/Common/Types";
import { ScopePickerStore } from "DistributedTaskControls/Variables/VariableGroup/Store/ScopePickerStore";
import { InstanceIds } from "DistributedTaskControls/Variables/Common/Constants";

import { VariableGroup } from "TFS/DistributedTask/Contracts";

 import * as Utils_Array from "VSS/Utils/Array";

export interface IEditVariableGroupPanelState {
    isPanelOpen: boolean;
    variableGroup: IDefinitionVariableGroup;
}

export class EditVariableGroupPanelStore extends StoreBase {

    constructor() {
        super();
        this._state = { isPanelOpen: false, variableGroup: null };
    }

    public initialize() {
        this._actionsHub = ActionsHubManager.GetActionsHub<VariableGroupActions>(VariableGroupActions);
        this._actionsHub.showEditVariableGroupPanel.addListener(this._handleShowPanel);

        this._scopePickerStore = StoreManager.CreateStore<ScopePickerStore, null>(ScopePickerStore, InstanceIds.VariableGroupEditPanelScopePickerInstanceId, null);
        this._scopePickerStore.addChangedListener(this._updateScopes);
    }

    public static getKey(): string {
        return StoreKeys.EditVariableGroupPanelStore;
    }

    public getState(): IEditVariableGroupPanelState {
        return this._state;
    }

    public isDirty(): boolean {
        return this._scopePickerStore.isDirty();
    }

    public isSaveDisabled(): boolean {
        return !this._state.variableGroup || !this._state.variableGroup.scopes || this._state.variableGroup.scopes.length === 0 || !this.isDirty();
    }

    protected disposeInternal(): void {
        this._actionsHub.showEditVariableGroupPanel.removeListener(this._handleShowPanel);
        StoreManager.DeleteStore<ScopePickerStore>(ScopePickerStore, InstanceIds.VariableGroupEditPanelScopePickerInstanceId);
    }

    private _handleShowPanel = (payload: IShowEditVariableGroupPanelPayload) => {
        this._state.isPanelOpen = payload.show;
        if (!!payload.variableGroup) {
            this._state.variableGroup = { ...payload.variableGroup };
        }

        this.emitChanged();
    }

    private _updateScopes = (): void => {
        if (!!this._state.variableGroup) {
            this._state.variableGroup.scopes =  Utils_Array.clone(this._scopePickerStore.getSelectedScopes());
            this.emitChanged();
        }
    }

    private _actionsHub: VariableGroupActions;
    private _state: IEditVariableGroupPanelState;
    private _scopePickerStore: ScopePickerStore;
}

