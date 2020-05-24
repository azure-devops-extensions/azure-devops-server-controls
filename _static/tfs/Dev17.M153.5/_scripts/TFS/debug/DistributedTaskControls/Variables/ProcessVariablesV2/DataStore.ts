import { ProcessVariablesStore } from "DistributedTaskControls/Variables/ProcessVariables/DataStore";
import { IVariablesState } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import { IVariableValuePayload } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { ISortOptions, IProcessVariableActionPayload, IUpdateScopePermissionsActionPayload, IToggleProcessVariableEditModePayload, IScopePermission } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";
import { ProcessVariablesUtils } from "DistributedTaskControls/Variables/ProcessVariablesV2/ProcessVariablesUtils";
import { IVariable, IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariableColumnKeys, VariableConstants } from "DistributedTaskControls/Variables/Common/Constants";
import { ValidationHelper } from "DistributedTaskControls/Variables/ProcessVariablesV2/ValidationHelper";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { autobind } from "OfficeFabric/Utilities";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IState extends IVariablesState {
    scopes?: IScope[];
    sortedColumnKey?: string;
    isSortedDescending?: boolean;
    variablesDisabledMode?: boolean;
    hideAddVariables?: boolean;
}

/**
 * @brief Store class for Variables section under Variables tab
 */
export class ProcessVariablesV2Store extends ProcessVariablesStore {

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._sortOptions = {
            columnKey: VariableColumnKeys.NameColumnKey,
            isSortedDescending: false
        };
        this._getActionsHub().sort.addListener(this._sort);
        this._getActionsHub().toggleEditMode.addListener(this._handleToggleEditMode);
    }

    public getState(): IState {
        return {
            scopes: super._getScopes(),
            variablesArray: super.getState().variablesArray,
            isSortedDescending: this._sortOptions && this._sortOptions.isSortedDescending,
            sortedColumnKey: this._sortOptions && this._sortOptions.columnKey,
            variablesDisabledMode: this._variablesDisabledMode,
            hideAddVariables: this._hideAddVariables
        };
    }

    protected disposeInternal(): void {
        this._getActionsHub().sort.removeListener(this._sort);
        this._getActionsHub().toggleEditMode.removeListener(this._handleToggleEditMode);
        super.disposeInternal();
    }

    @autobind
    protected _updateVariableValue(payload: IVariableValuePayload) {
        super._updateVariableValueText(payload.variable.value, payload.index);
        super._updateIsSecret(payload.variable.isSecret, payload.index);
        super._updateAllowOverride(payload.variable.allowOverride, payload.index);

        this._updateScope(payload.variable.scope, payload.index);
        this.emitChanged();
    }

    protected _updateScope(scope: IScope, index: number): void {
        if (scope !== null && scope !== undefined) {
            let variable = this.getCurrentVariablesArray()[index];

            variable.hasVariableBeenUpdatedByUser = true;
            variable.scope = scope;

            // If scope of a secret variable is changed
            if (!!variable.isSecret) {

                // It means variable value is already set at server and we can't copy the value
                if (variable.value === null || variable.value === undefined) {
                    variable.value = Utils_String.empty;
                }
            }
        }
    }

    // This method is called only when variables are in editable mode
    @autobind
    protected _updateScopePermissions(actionPayload: IUpdateScopePermissionsActionPayload): void {
        if (actionPayload.scopePermissions) {
            for (const scopePermission of actionPayload.scopePermissions) {
                this._scopeKeyToPermissionsMap[scopePermission.scopeKey] = scopePermission.hasPermission;
            }
            this._hasDefinitionEditPermission = actionPayload.hasDefinitionEditPermission;
            this._permissionWarningMessage = actionPayload.permissionWarningMessage;

            this._updateVariablesDisability();

            this._updateScopesDisability();

            this.emitChanged();
        }
    }

    private _updateVariablesDisability(): void {
        let variables = this.getState().variablesArray;

        //  Find and disable the variables which do not have scope edit permission
        variables.forEach((variable: IVariable) => {
            variable.disableVariable = false;

            // Disable variable if variables UI is disabled or no edit scope permission 
            variable.disableVariable = (this._scopeKeyToPermissionsMap[variable.scope.key] === false);
        });
    }

    private _updateScopesDisability(): void {
        let scopes = this.getState().scopes;

        scopes.forEach((scope: IScope) => {
            if (this._scopeKeyToPermissionsMap[scope.key] === false) {
                scope.isDisabled = true;
            }
        });
    }

    @autobind
    private _sort(options: ISortOptions) {

        this._sortProcessVariables(options);

        this.emitChanged();
    }

    // Used only for compat handling, Should be removed in sprint 135
    private _handleToggleEditMode = (payload: IToggleProcessVariableEditModePayload): void => {
        // By default everything will be non-editable mode even when user is in edit release mode
        // Will remove this in edit of variables
        payload.editMode = false;

        this.getCurrentVariablesArray().forEach((variable: IVariable) => {
            variable.disableVariable = !payload.editMode;
        });

        this._variablesDisabledMode = !payload.editMode;

        this.emitChanged();
    }

    @autobind
    protected _createProcessVariables(actionPayload: IProcessVariableActionPayload) {
        this._createOrUpdateProcessVariablesListener(actionPayload);
        this._sortProcessVariables({
            columnKey: VariableColumnKeys.NameColumnKey,
            isSortedDescending: false
        });

        this.getCurrentVariablesArray().forEach((variable: IVariable) => {
            variable.disableVariable = !!actionPayload.disabledMode;
        });

        this._variablesDisabledMode = !!actionPayload.disabledMode;
        this._hideAddVariables = !!actionPayload.hideAddVariables;

        this.emitChanged();
    }

    @autobind
    protected _initializeOrUpdateProcessVariables(actionPayload: IProcessVariableActionPayload) {
        this._createOrUpdateProcessVariablesListener(actionPayload);

        this._sortProcessVariables(this._sortOptions);

        // Disable edit secret variable names once saved.
        this.getCurrentVariablesArray().forEach((variable: IVariable) => {
            variable.disableSecretVariableName = variable.isSecret;
            variable.disableVariable = !!actionPayload.disabledMode;
        });

        this._variablesDisabledMode = !!actionPayload.disabledMode;
        this._hideAddVariables = !!actionPayload.hideAddVariables;
        
        // I see multiple reasons forcing to fire emitChange here
        // 1. secret variable once saved comes back as null => We need to update the UI for the same
        // 2. After save local variable ordering and the ordering shown in the UI should match, otherwise 
        // we are not in sync with what is shown in UI and data
        this.emitChanged();
    }

    private _sortProcessVariables(options: ISortOptions) {

        if (!options) {
            return;
        }

        let variables = this.getCurrentVariablesArray().slice();

        switch (options.columnKey) {
            case VariableColumnKeys.NameColumnKey:
                variables.sort((a: IVariable, b: IVariable) => ProcessVariablesUtils.compareByName(a, b, options.isSortedDescending));
                break;

            case VariableColumnKeys.ValueColumnKey:
                variables.sort((a: IVariable, b: IVariable) => ProcessVariablesUtils.compareByValue(a, b, options.isSortedDescending));
                break;

            case VariableColumnKeys.ScopeColumnKey:
                variables.sort((a: IVariable, b: IVariable) => ProcessVariablesUtils.compareByScope(a, b, options.isSortedDescending));
                break;
        }

        this._sortOptions = options;
        this.setCurrentVariablesArray(variables);
    }

    public isValid(): boolean {
        this._invalidUniqueScopeKeys = ValidationHelper.getUniqueInvalidScopeKeys(this.getCurrentVariablesArray());

        //  Check if any invalid scope exists, if so store is invalid, otherwise store is valid
        if (this._invalidUniqueScopeKeys && this._invalidUniqueScopeKeys.length > 0) {
            return false;
        }
        return true;
    }

    public getInvalidUniqueScopeKeys(): number[] {
        return this._invalidUniqueScopeKeys;
    }

    /**
     * Method to get the overview error message for pipeline variables
     */
    public getVariableOverviewErrorMessage(): string {
        if (!this.isValid()) {
            //  Create overview error message if the store is invalid
            const invalidUniqueScopeKeys = this.getInvalidUniqueScopeKeys();
            if (invalidUniqueScopeKeys && invalidUniqueScopeKeys.length > 0) {
                //  Error scenario
                let scopes = this._getScopes();

                if (invalidUniqueScopeKeys.length === 1) {
                    let firstMatchingScopeName = Utils_String.empty;

                    if (scopes && scopes.length > 0) {
                        scopes.forEach((scope: IScope) => {

                            if (scope.key === invalidUniqueScopeKeys[0]) {
                                firstMatchingScopeName = scope.value;
                            }

                        });
                    }

                    //  Errors in 'scope name' variables
                    return Utils_String.localeFormat(Resources.VariablesNeedAttentionSingleScope, firstMatchingScopeName);
                }

                //  Errors across multiple scopes
                return Utils_String.localeFormat(Resources.VariablesNeedAttentionMultipleScopes);

            }
            else {
                //  This means that for some reason, the invalidUniqueScopeKeys array was not populated so, Fallback to "Some variables need your attention".            
                return Resources.VariablesNeedAttention;
            }
        }
        return null;
    }

    public isDirty(): boolean {

        // Sort operations in UI should not make the data dirty as order doesn't matter to us
        // so sort n then compare the data

        let copyOriginal = this.getOriginalVariablesArray().slice();
        let copyCurrent = this.getCurrentVariablesArray().slice();

        copyOriginal.sort((a: IVariable, b: IVariable) => { return ProcessVariablesUtils.compareDeep(a, b); });
        copyCurrent.sort((a: IVariable, b: IVariable) => { return ProcessVariablesUtils.compareDeep(a, b); });

        return !(VariablesUtils.areEqual(copyCurrent, copyOriginal));
    }

    /**
     * @brief Returns default scopes for variables filter
    */
    public getDefaultScopes(scopeKey: number): IScope[] {
        let scopes: IScope[] = super._getScopes();
        let defaultScopes: IScope[] = [];

        let defaultScope: IScope = Utils_Array.first(scopes, (scope) => { return scope.key === VariableConstants.DefaultScopeKey; });
        let selectedScope: IScope = Utils_Array.first(scopes, (scope) => { return scope.key === scopeKey; });

        if (selectedScope && defaultScope) {
            defaultScopes.push(defaultScope);
            defaultScopes.push(selectedScope);
        }

        return defaultScopes;
    }

    private _invalidUniqueScopeKeys: number[];
    private _sortOptions: ISortOptions;
    private _variablesDisabledMode: boolean;
    private _hideAddVariables: boolean;
}
