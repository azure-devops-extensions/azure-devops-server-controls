import * as CommonVariables from "DistributedTasksCommon/TFS.Tasks.Common.Variables";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { IVariable, IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";
import { VariablesStoreBase } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import { VariableStoreKeys, VariableConstants } from "DistributedTaskControls/Variables/Common/Constants";
import {
    IProcessVariableActionPayload,
    ProcessVariablesActions,
    IScopedProcessVariables,
    ICloneScopedProcessVariablesPayload,
    IUpdateScopePermissionsActionPayload,
    IScopePermission
} from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";
import { IVariableKeyPayload, IVariableValuePayload } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { autobind } from "OfficeFabric/Utilities";

import * as Context from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Store class for Variables section under Variables tab
 */
export class ProcessVariablesStore extends VariablesStoreBase {

    /**
     * @brief Constructor
     * @param _originalVariableList
     */
    constructor() {
        super();
        this._originalVariablesArray = [];
        this._scopes = [];
    }

    /**
     * @brief returns the key for the store
     */
    public static getKey(): string {
        return VariableStoreKeys.StoreKey_ProcessVariablesDataStore;
    }
    
    /**
     * @breif Initializes the store object
     */
    public initialize(instanceId?: string): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<ProcessVariablesActions>(ProcessVariablesActions, instanceId);
        
        this._actionsHub.createProcessVariables.addListener(this._createProcessVariables);
        this._actionsHub.updateProcessVariables.addListener(this._initializeOrUpdateProcessVariables);
        this._actionsHub.updateScopePermissions.addListener(this._updateScopePermissions);
        this._actionsHub.updateVariableKey.addListener(this._updateVariableKey);
        this._actionsHub.updateVariableValue.addListener(this._updateVariableValue);
        this._actionsHub.deleteVariable.addListener(this._deleteVariable);
        this._actionsHub.addVariable.addListener(this._addVariable);
        this._actionsHub.addScopedProcessVariables.addListener(this._addScopedVariables);
        this._actionsHub.cloneScopedProcessVariables.addListener(this._cloneScopedVariables);
        this._actionsHub.updateScope.addListener(this._handleUpdateScope);
        this._actionsHub.deleteScope.addListener(this._handleDeleteScope);
    }

    public shouldShowPermissionWarning(scope: number): boolean {
        if (scope !== VariableConstants.DefaultScopeKey && this._scopeKeyToPermissionsMap[scope] !== undefined) {
            return this._hasDefinitionEditPermission && !this._scopeKeyToPermissionsMap[scope];
        }
        else {
            return false;
        }
    }

    public getPermissionWarningMessage(): string {
        return this._permissionWarningMessage;
    }

    public getDefaultScopes(key: number) {
        return [];
    }

    public getVariableOverviewErrorMessage(): string {
        return Utils_String.empty;
    }

    /**
     * @brief Cleanup of store footprint
     */
    protected disposeInternal(): void {
        this._actionsHub.createProcessVariables.removeListener(this._createProcessVariables);
        this._actionsHub.updateProcessVariables.removeListener(this._initializeOrUpdateProcessVariables);
        this._actionsHub.updateScopePermissions.removeListener(this._updateScopePermissions);
        this._actionsHub.updateVariableKey.removeListener(this._updateVariableKey);
        this._actionsHub.updateVariableValue.removeListener(this._updateVariableValue);
        this._actionsHub.deleteVariable.removeListener(this._deleteVariable);
        this._actionsHub.addVariable.removeListener(this._addVariable);
        this._actionsHub.addScopedProcessVariables.removeListener(this._addScopedVariables);
        this._actionsHub.cloneScopedProcessVariables.removeListener(this._cloneScopedVariables);
        this._actionsHub.updateScope.removeListener(this._handleUpdateScope);
        this._actionsHub.deleteScope.removeListener(this._handleDeleteScope);

        this._originalVariablesArray = null;
        super.disposeInternal();
    }

    @autobind
    protected _updateVariableValue(payload: IVariableValuePayload) {
        super._updateVariableValueText(payload.variable.value, payload.index);
        super._updateIsSecret(payload.variable.isSecret, payload.index);
        super._updateAllowOverride(payload.variable.allowOverride, payload.index);
        this.emitChanged();
    }

    protected _getActionsHub(): ProcessVariablesActions {
        return this._actionsHub;
    }

    protected _getScopes(): IScope[] {
        return this._scopes;
    }

    protected getOriginalVariablesArray(): IVariable[] {
        return this._originalVariablesArray;
    }

    /**
     * @brief Returns if the store is dirty or not compared to original instance
     */
    public isDirty(): boolean {
        return !(VariablesUtils.areEqual(this.getCurrentVariablesArray(), this._originalVariablesArray));
    }

    @autobind
    protected _createProcessVariables(actionPayload: IProcessVariableActionPayload) {
        this._createOrUpdateProcessVariablesListener(actionPayload);
        this.emitChanged();
    }

    @autobind
    protected _updateScopePermissions(actionPayload: IUpdateScopePermissionsActionPayload): void {
        if (actionPayload.scopePermissions) {
            for (const scopePermission of actionPayload.scopePermissions) {
                this._scopeKeyToPermissionsMap[scopePermission.scopeKey] = scopePermission.hasPermission;
            }
            this._hasDefinitionEditPermission = actionPayload.hasDefinitionEditPermission;
            this._permissionWarningMessage = actionPayload.permissionWarningMessage;
            this.emitChanged();
        }
    }

    @autobind
    protected _initializeOrUpdateProcessVariables(actionPayload: IProcessVariableActionPayload) {
        this._createOrUpdateProcessVariablesListener(actionPayload);

        // I see multiple reasons forcing to fire emitChange here
        // 1. secret variable once saved comes back as null => We need to update the UI for the same
        // 2. After save local variable ordering and the ordering shown in the UI should match, otherwise 
        // we are not in sync with what is shown in UI and data
        this.emitChanged();
    }

    protected _createOrUpdateProcessVariablesListener(actionPayload: IProcessVariableActionPayload): void {

        this._originalVariablesArray = VariablesUtils.createVariablesCopy(actionPayload.variableList);
        let variablesList = VariablesUtils.createVariablesCopy(actionPayload.variableList);

        if (!actionPayload.skipSystemVariables) {
            // Fill system variables
            let systemVariables: IDictionaryStringTo<IVariable> = this._getSystemVariables(actionPayload.definitionId);

            Object.keys(systemVariables).reverse().forEach((key: string) => {

                // If system variable is not already present in the list then add it.
                if (!actionPayload.variableList || !actionPayload.variableList.hasOwnProperty(key)) {
                    this._originalVariablesArray.unshift(systemVariables[key]);
                    variablesList.unshift(systemVariables[key]);
                }
            });
        }

        this.setCurrentVariablesArray(variablesList);

        this._scopes = actionPayload.scopes || [];
    }

    @autobind
    private _updateVariableKey(payload: IVariableKeyPayload) {
        this._updateVariableName(payload.key, payload.index);
        this.emitChanged();
    }

    @autobind
    private _addVariable(payload: IEmptyActionPayload) {

        let variable: IVariable = {
            name: Utils_String.empty,
            isSecret: false,
            value: Utils_String.empty,
            allowOverride: false
        };

        if (this._scopes && this._scopes.length > 0) {

            let selectedScope: IScope;
            let filteredScopes = this._scopes.filter((scope: IScope) => { return scope.key === VariableConstants.DefaultScopeKey; });
            if (filteredScopes && filteredScopes.length > 0) {
                selectedScope = filteredScopes[0];
            }

            variable.scope = selectedScope;
        }

        this._appendVariable(variable);
        this.emitChanged();
    }

    @autobind
    private _deleteVariable(payload: IVariableKeyPayload) {
        this._removeVariable(payload.index);
        this.emitChanged();
    }

    @autobind
    private _addScopedVariables(payload: IScopedProcessVariables) {
        this._appendVariables(VariablesUtils.createVariablesCopy(payload.variableList));
        this._scopes.push(payload.scope);
        this.emitChanged();
    }

    @autobind
    private _cloneScopedVariables(payload: ICloneScopedProcessVariablesPayload) {
        let sourceVariables = VariablesUtils.getVariablesInScope(this.getCurrentVariablesArray(), payload.sourceScopeKey);
        let clonedVariables = VariablesUtils.cloneScopedProcessVariables(sourceVariables, payload.targetScope);

        this._appendVariables(clonedVariables);
        this._scopes.push(payload.targetScope);
        this.emitChanged();
    }

    @autobind
    private _handleUpdateScope(scope: IScope): void {
        let scopes = this._getScopes();
        let filteredScopes = scopes && scopes.filter((currentScope: IScope) => {
            return currentScope.key === scope.key;
        });

        if (filteredScopes && filteredScopes.length > 0) {
            filteredScopes[0].value = scope.value;
        }

        VariablesUtils.updateScopeOfVariables(this.getCurrentVariablesArray(), scope);
        this.emitChanged();
    }

    @autobind
    private _handleDeleteScope(scope: IScope): void {
        const remainingVariables = this.getCurrentVariablesArray().filter((v: IVariable) => v.scope.key !== scope.key);
        this.setCurrentVariablesArray(remainingVariables);
        this._scopes = this._getScopes().filter((s: IScope) => s.key !== scope.key);
        delete this._scopeKeyToPermissionsMap[scope.key];
        this.emitChanged();
    }

    private _getSystemVariables(definitionId: number): IDictionaryStringTo<IVariable> {
        let systemVariables: IDictionaryStringTo<IVariable> = {};

        CommonVariables.ImplicitVariables.GetImplicitVariables(Context.getDefaultWebContext())
            .forEach((variable: IVariable) => {
                variable.isSystemVariable = true;
                systemVariables[variable.name] = variable;
            });

        systemVariables[CommonVariables.ImplicitVariableNames.DefinitionId].value =
            (!!definitionId && definitionId >= 0) ? definitionId.toString() : Resources.NoDefinitionIdYetText;

        return systemVariables;
    }

    private _originalVariablesArray: IVariable[];
    private _scopes: IScope[];
    private _actionsHub: ProcessVariablesActions;
    protected _scopeKeyToPermissionsMap: IDictionaryNumberTo<boolean> = {};
    protected _hasDefinitionEditPermission: boolean;
    protected _permissionWarningMessage: string;
}
