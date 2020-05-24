import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IVariable, VariableList, IDefinitionVariableReference } from "DistributedTaskControls/Variables/Common/Types";
import { VariableConstants } from "DistributedTaskControls/Variables/Common/Constants";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";

import * as Utils_String from "VSS/Utils/String";

export interface IVariablesState extends Base.IState {
    variablesArray: IVariable[];
    variablesDisabledMode?: boolean;
}

/**
 * @brief Store class for Variables section under Variables tab
 */
export abstract class VariablesStoreBase extends StoreCommonBase.ChangeTrackerStoreBase {

    constructor() {
        super();
        this._currentVariablesArray = [];
    }

    protected disposeInternal(): void {
        this._currentVariablesArray = null;
    }

    /**
     * @brief Returns the list of user defined variables.
     */
    public getVariableList(): VariableList {
        let variableList: VariableList = [];

        if (this._currentVariablesArray) {
            this._currentVariablesArray.forEach((variable: IVariable) => {

                // Check and skip system variables
                if (!variable.isSystemVariable) {

                    let variableReference: IDefinitionVariableReference = {
                        name: variable.name.trim(),
                        variable: {
                            allowOverride: variable.allowOverride,
                            isSecret: variable.isSecret,
                            value: VariablesUtils.getVariableValue(variable)
                        }
                    };

                if (variable.scope) {
                    variableReference.variable.scope = variable.scope;
                }

                    variableList.push(variableReference);
                }
            });
        }

        return variableList;
    }

    public getState(): IVariablesState {
        return {
            variablesArray: this._currentVariablesArray
        };
    }

    public getCurrentVariablesArray(): IVariable[] {
        return this._currentVariablesArray;
    }

    public setCurrentVariablesArray(variableArray: IVariable[]): void {
        this._currentVariablesArray = variableArray;
    }

    public isValid(): boolean {
        let returnValue: boolean = true;
        let variableNameMap: IDictionaryNumberTo<IDictionaryStringTo<string>> = {};
        let defaultScopeKey = VariableConstants.DefaultScopeKey;

        this.getCurrentVariablesArray().forEach((variable: IVariable) => {

            // return false if variable is in error state
            if (this._isVariableInErrorState(variable)) {
                returnValue = false;
                return false;
            }

            // check for duplicates
            let variableName: string = variable.name.trim().toLocaleLowerCase();

            let scope_key = (variable.scope ? variable.scope.key : defaultScopeKey).toString(10);
            if (variableNameMap.hasOwnProperty(scope_key)) {
                if (variableNameMap[scope_key].hasOwnProperty(variableName)) {
                    returnValue = false;
                    return false;
                } else {
                    variableNameMap[scope_key][variableName] = variable.value;
                }
            } else {
                variableNameMap[scope_key] = {};
                variableNameMap[scope_key][variableName] = variable.value;
            }
        });

        return returnValue;
    }

    protected _updateVariableName(name: string, index: number): void {
        this._currentVariablesArray[index].hasVariableBeenUpdatedByUser = true;
        this._currentVariablesArray[index].name = name;
    }

    protected _updateVariableValueText(variableText: string, index: number): void {
        if (variableText !== null && variableText !== undefined) {
            this._currentVariablesArray[index].hasVariableBeenUpdatedByUser = true;
            this._currentVariablesArray[index].value = variableText;
        }
    }

    protected _updateIsSecret(isSecret: boolean, index: number): void {
        if (isSecret !== null && isSecret !== undefined) {
            this._currentVariablesArray[index].hasVariableBeenUpdatedByUser = true;
            this._currentVariablesArray[index].isSecret = isSecret;

            // Fix for bug#868004
            // In case of password strings we get null value from the server
            // hence it is important to set it to empty string if value is unlocked from secret
            if (isSecret === false) {
                this._currentVariablesArray[index].value = this._currentVariablesArray[index].value || Utils_String.empty;
            }
        }
    }

    protected _updateDisableSecretConversion(disableSecretConversion: boolean, index: number): void {
        if (disableSecretConversion !== null && disableSecretConversion !== undefined) {
            this._currentVariablesArray[index].disableSecretConversion = disableSecretConversion;
        }
    }

    protected _updateAllowOverride(allowOverride: boolean, index: number): void {
        if (allowOverride !== null && allowOverride !== undefined) {
            this._currentVariablesArray[index].allowOverride = allowOverride;
        }
    }

    protected _appendVariable(variable: IVariable): void {
        this._currentVariablesArray.push(variable);
    }

    protected _appendVariables(variables: IVariable[]): void {
        this._currentVariablesArray.push(...variables);
    }

    protected _removeVariable(index: number): void {
        this._currentVariablesArray.splice(index, 1);
    }

    private _isVariableInErrorState(variable: IVariable) {

        if (!variable.name) {
            return true;
        }

        let variableName: string = variable.name.trim().toLowerCase();
        return variableName === Utils_String.empty;
    }

    private _currentVariablesArray: IVariable[];
}


