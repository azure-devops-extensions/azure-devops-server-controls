import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariableGroupActions, IStatus, Status, IUpdateScopeSelectionPayload, IInitializeScopeSelectionPayload } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { IUpdateScopePermissionsActionPayload } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";
import { VariableConstants } from "DistributedTaskControls/Variables/Common/Constants";

import { VariableGroup } from "TFS/DistributedTask/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Diag from "VSS/Diag";

export interface IScopePickerState {
    scopes: IScope[];
    isDefaultSelected: boolean;
    selectedScopes: IScope[];
}

export class ScopePickerStore extends StoreBase {

    constructor() {
        super();
        this._currentState = { isDefaultSelected: false, selectedScopes: [], scopes: []};
        this._originalState = this._cloneState(this._currentState);
        this._defaultScope = null;
        this._backupSelectedScopes = [];
    }

    public initialize() {
        this._actionsHub = ActionsHubManager.GetActionsHub<VariableGroupActions>(VariableGroupActions);
        this._actionsHub.updateScopeSelection.addListener(this._handleScopeSelectionUpdate);
        this._actionsHub.initializeScopeSelection.addListener(this._hanbdleInitializeScopeSelection);
    }

    public static getKey(): string {
        return StoreKeys.ScopePickerStore;
    }

    public getState(): IScopePickerState {
        return this._currentState;
    }

    public getDefaultScope(): IScope {
        return this._defaultScope;
    }

    public getSelectedScopes(): IScope[] {
        return [ ...this._currentState.selectedScopes ];
    }

    public shouldDisable(scopeKey: number): boolean {
        if (scopeKey !== VariableConstants.DefaultScopeKey && this._scopeKeyToPermissionsMap[scopeKey] !== undefined) {
            return this._hasEditDefinitionPermission && !this._scopeKeyToPermissionsMap[scopeKey];
        }
        else {
            return false;
        }
    }

    public getPermissionWarningMessage(): string {
        return this._permissionWarningMessage;
    }

    public isDirty(): boolean {
        if (this._originalState.selectedScopes.length !== this._currentState.selectedScopes.length) {
            return true;
        }

        let original = this._originalState.selectedScopes.map((scope: IScope) => { return scope.key; }).sort();
        let current = this._currentState.selectedScopes.map((scope: IScope) => { return scope.key; }).sort();

        return original.some((scopeId: number, index: number) => {
            return scopeId !== current[index];
        });
    }

    protected disposeInternal(): void {
        this._actionsHub.updateScopeSelection.removeListener(this._handleScopeSelectionUpdate);
        this._actionsHub.initializeScopeSelection.removeListener(this._hanbdleInitializeScopeSelection);
    }

    private _handleScopeSelectionUpdate = (updateData: IUpdateScopeSelectionPayload) => {
        let selectedScopes = updateData.selectedScopes || [];

        // radio button is changed from default to other option
        if (updateData.restore) {
            this._currentState.selectedScopes = this._backupSelectedScopes;
            this._currentState.isDefaultSelected = false;
        }
        // radio button is changed to default option
        else if (selectedScopes.length === 1 && selectedScopes[0].isDefault) {
            this._currentState.selectedScopes = selectedScopes;
            this._currentState.isDefaultSelected = true;
        }
        // update in other options (checkboxes)
        else {
            this._currentState.selectedScopes = selectedScopes;
            this._backupSelectedScopes = selectedScopes;
            this._currentState.isDefaultSelected = false;
        }
        
        this.emitChanged();
    }

    private _hanbdleInitializeScopeSelection = (initializeData: IInitializeScopeSelectionPayload) => {
        let scopes = initializeData.scopes || [];
        this._currentState.scopes = Utils_Array.clone(scopes);
        this._defaultScope = Utils_Array.first(this._currentState.scopes, (scope: IScope) => scope.isDefault);
        if (!this._defaultScope && scopes.length !== 0) {
            Diag.logError("defaultScope should be present if IInitializeScopeSelectionPayload.scopes is not empty");
        }

        this._backupSelectedScopes = [];
        if (!!initializeData.selectedScopes && initializeData.selectedScopes.length !== 0) {
            this._currentState.selectedScopes = Utils_Array.clone(initializeData.selectedScopes);
            this._currentState.isDefaultSelected = this._currentState.selectedScopes.some((scope: IScope) => scope.key === this._defaultScope.key);
            if (!this._currentState.isDefaultSelected) {
                this._backupSelectedScopes = this._currentState.selectedScopes;
            }
        }
        else if (!!this._defaultScope) {
            this._currentState.selectedScopes = [ this._defaultScope ];
            this._currentState.isDefaultSelected = true;
        }
        else {
            this._currentState.selectedScopes = [];
            this._currentState.isDefaultSelected = false;
        }

        this._originalState = this._cloneState(this._currentState);

        // case when selectedScopes is empty but we select defaultScope for the user. original selectedScopes should be empty
        if (!initializeData.selectedScopes || initializeData.selectedScopes.length === 0) {
            this._originalState.selectedScopes = [];
            this._originalState.isDefaultSelected = false;
        }

        let scopePermissionsPayload = initializeData.scopePermissionsPayload || {} as IUpdateScopePermissionsActionPayload;
        if (scopePermissionsPayload.scopePermissions) {
            for (const scopePermission of scopePermissionsPayload.scopePermissions) {
                this._scopeKeyToPermissionsMap[scopePermission.scopeKey] = scopePermission.hasPermission;
            }
            this._hasEditDefinitionPermission = scopePermissionsPayload.hasDefinitionEditPermission;
            this._permissionWarningMessage = scopePermissionsPayload.permissionWarningMessage;
        }
        
        this.emitChanged();
    }

    private _cloneState(state: IScopePickerState): IScopePickerState {
        return {
            scopes: Utils_Array.clone(state.scopes),
            selectedScopes: Utils_Array.clone(state.selectedScopes),
            isDefaultSelected: state.isDefaultSelected
        };
    }

    private _backupSelectedScopes: IScope[];
    private _defaultScope: IScope;
    private _actionsHub: VariableGroupActions;
    private _currentState: IScopePickerState;
    private _originalState: IScopePickerState;
    private _scopeKeyToPermissionsMap: IDictionaryNumberTo<boolean> = {};
    private _hasEditDefinitionPermission: boolean;
    private _permissionWarningMessage: string;
}

