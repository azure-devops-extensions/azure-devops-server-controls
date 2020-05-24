
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { IVariable, VariableList } from "DistributedTaskControls/Variables/Common/Types";
import { VariablesStoreBase } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";
import { VariableStoreKeys, VariableConstants } from "DistributedTaskControls/Variables/Common/Constants";
import * as Actions from "DistributedTaskControls/Variables/RuntimeVariables/Actions/Actions";
import { IVariableKeyPayload, IVariableValuePayload } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { ValidationHelper } from "DistributedTaskControls/Variables/ProcessVariablesV2/ValidationHelper";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import * as Utils_String from "VSS/Utils/String";

export interface IRuntimeVariablesStoreArgs {
    variables: VariableList;
}

/**
 * @brief Store class for Variables section under Variables tab
 */
export class RuntimeVariablesStore extends VariablesStoreBase {

    constructor(args: IRuntimeVariablesStoreArgs) {
        super();
        this._actionsHub = ActionsHubManager.GetActionsHub<Actions.RuntimeVariablesActions>(Actions.RuntimeVariablesActions);
        let currentVariables = VariablesUtils.createVariablesCopy(args.variables);

        currentVariables.forEach((variable: IVariable) => {

            // Do not let users delete variables that are defined in build definition.
            variable.disableDelete = true;

            if (!variable.allowOverride){
                throw new Error("Only variables that can be over-ridden at runtime are allowed.");
            }

            // Do not allow secret conversion at runtime. Allow converting a secret variable to simple variable. 
            variable.disableSecretConversion = !variable.isSecret;
        });

        this.setCurrentVariablesArray(currentVariables);
    }

    /**
     * @brief returns the key for the store
     */
    public static getKey(): string {
        return VariableStoreKeys.StoreKey_RuntimeVariablesStore;
    }

    /**
     * @breif Initializes the store object
     */
    public initialize(): void {
        this._actionsHub.updateVariableKey.addListener(this._updateVariableKey);
        this._actionsHub.updateVariableValue.addListener(this._updateVariableValue);
        this._actionsHub.deleteVariable.addListener(this._deleteVariable);
        this._actionsHub.addVariable.addListener(this._addVariable);
    }

    /**
     * @brief Cleanup of store footprint
     */
    protected disposeInternal(): void {
        this._actionsHub.updateVariableKey.removeListener(this._updateVariableKey);
        this._actionsHub.updateVariableValue.removeListener(this._updateVariableValue);
        this._actionsHub.deleteVariable.removeListener(this._deleteVariable);
        this._actionsHub.addVariable.removeListener(this._addVariable);
        super.disposeInternal();
    } 

    // isDirty is an abstract method in baseclass, but runtime variables 
    // has no utility for dirty flag
    public isDirty(): boolean {
        return false;
    }

    public getSerializedRuntimeVariables(): string {
        let variables: IDictionaryStringTo<string> = {};
        this.getCurrentVariablesArray().forEach((variable: IVariable) => {
            if (!variable.isSecret && variable.name && variable.name.trim()){
                variables[variable.name] = variable.value;
            }
        });

        return JSON.stringify(variables);
    }

    public getDuplicateVariableNamesMap(): IDictionaryStringTo<IDictionaryStringTo<number>> {
        let variablesArray = this.getCurrentVariablesArray();
        return ValidationHelper.getDuplicateVariableNamesMap(variablesArray, VariableConstants.DefaultScopeKey);
    }

    private _updateVariableValue = (payload: IVariableValuePayload) => {
        this._updateVariableValueText(payload.variable.value, payload.index);
        let variableAtIndex = this.getCurrentVariablesArray()[payload.index];
        if (payload.variable.isSecret === false && variableAtIndex && variableAtIndex.isSecret) {
            this._updateVariableValueText(Utils_String.empty, payload.index);
            this._updateDisableSecretConversion(true, payload.index);
            this._updateIsSecret(false, payload.index);
        }
        else if (payload.variable.isSecret) {
            throw new Error("Runtime variable cannot be converted to secret variable");
        }

        this.emitChanged();
    }

    private _updateVariableKey = (payload: IVariableKeyPayload) => {
        let variableAtIndex = this.getCurrentVariablesArray()[payload.index];
        if (variableAtIndex) {
            if (!variableAtIndex.disableDelete) {
                this._updateVariableName(payload.key, payload.index);
                this.emitChanged();
            }
            else {
                throw new Error("Update not allowed for variable names that are in definition");
            }
        }
    }

    private _addVariable = (payload: IEmptyActionPayload) => {
        this._appendVariable({
            name: Utils_String.empty,
            isSecret: false,
            value: Utils_String.empty,
            allowOverride: false, 
            disableSecretConversion: true // Do not allow secret conversion for newly added variables.
        });

        this.emitChanged();
    }

    private _deleteVariable = (payload: IVariableKeyPayload) => {
        let variableAtIndex = this.getCurrentVariablesArray()[payload.index];
        if (variableAtIndex) {
            if (!variableAtIndex.disableDelete) {
                this._removeVariable(payload.index);
                this.emitChanged();
            }
            else {
                throw new Error("Deletion not allowed for variable names that are in definition");
            }
        }
    }

    private _actionsHub: Actions.RuntimeVariablesActions;
}

