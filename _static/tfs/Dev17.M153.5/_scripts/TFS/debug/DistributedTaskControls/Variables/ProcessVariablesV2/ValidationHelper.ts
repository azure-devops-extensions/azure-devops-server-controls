import { IVariable, IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariableConstants } from "DistributedTaskControls/Variables/Common/Constants";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as Utils_String from "VSS/Utils/String";

export enum ValidState {
    Valid,
    Invalid
}

export interface IValidationState {
    state: ValidState;
    message: string;
}


export class ValidationHelper {

    /**
     * Gets the validation state based on the variable properites and
     * duplicate map to check for duplicates
     * 
     * @static
     * @returns {IValidationState} 
     * 
     * @memberOf ValidationHelper
     */
    public static getNameValidationState(variable: IVariable, duplicateVariableNamesMap: IDictionaryStringTo<number>): IValidationState {

        // If variable is secret then variable name empty is negative scenario
        if (variable.isSecret && variable.name.trim() === Utils_String.empty) {
            return ValidationHelper._getInvalidValidationState(Resources.VariableNameRequiredMessage);

            // If both the variable name and value are empty we don't want to bring it as error case
        } else if (variable.name.trim() === Utils_String.empty &&
            (!variable.value || variable.value.trim() === Utils_String.empty)) {
            return ValidationHelper._getValidValidationState();

            // If the variable name alone is empty
        } else if (variable.name.trim() === Utils_String.empty) {
            return ValidationHelper._getInvalidValidationState(Resources.VariableNameRequiredMessage);

            // If the variable name is occuring more than once
        } else if (duplicateVariableNamesMap[variable.name.trim().toLocaleLowerCase()] > 1) {
            if (variable.scope) {
                return ValidationHelper._getInvalidValidationState(Utils_String.format(Resources.VariableNameDuplicateMessage, variable.name, variable.scope.value));
            } else {
                return ValidationHelper._getInvalidValidationState(Utils_String.format(Resources.VariableNameDuplicateMessageNoScope, variable.name));
            }
        }

        return ValidationHelper._getValidValidationState();
    }

    /**
     * Get validation state for the variable value
     * 
     * @static
     * @param {IVariable} variable 
     * @returns {IValidationState} 
     * @memberof ValidationHelper
     */
    public static getValueValidationState(variable: IVariable): IValidationState {

        // If variable is secret and it's value has been reset while import/clone operation and user has even once updated any of it's properties
        if (!!variable.isSecret &&
            !!variable.hasSecretValueBeenReset &&
            !variable.hasVariableBeenUpdatedByUser) {
            return ValidationHelper._getInvalidValidationState(Resources.SecretVariableValueResetMessage);
        }

        return ValidationHelper._getValidValidationState();
    }

    /**
     * Create variable to count mapping
     * 
     * It maintains a [scope][variable][count] dictionary
     * If variable doesn't have a scope, we take the default scope
     * 
     * @private
     * @param {IVariable[]} variablesArray
     * @returns {IDictionaryStringTo<number>}
     * 
     * @memberOf ProcessVariablesControllerView
     */
    public static getDuplicateVariableNamesMap(variablesArray: IVariable[], defaultScopeKey: number): IDictionaryStringTo<IDictionaryStringTo<number>> {

        variablesArray = variablesArray || [];

        let duplicateVariableNamesMap: IDictionaryStringTo<IDictionaryStringTo<number>> = {};

        if (!variablesArray) {
            return duplicateVariableNamesMap;
        }

        variablesArray.forEach((variable: IVariable, index: number) => {

            let variableName: string = variable.name.trim().toLocaleLowerCase();
            let scopeKey = (variable.scope ? variable.scope.key : defaultScopeKey).toString(10);

            if (duplicateVariableNamesMap.hasOwnProperty(scopeKey)) {

                if (!duplicateVariableNamesMap[scopeKey].hasOwnProperty(variableName)) {
                    duplicateVariableNamesMap[scopeKey][variableName] = 1;
                } else {
                    duplicateVariableNamesMap[scopeKey][variableName]++;
                }
            } else {
                duplicateVariableNamesMap[scopeKey] = {};
                duplicateVariableNamesMap[scopeKey][variableName] = 1;
            }
        });

        return duplicateVariableNamesMap;
    }

    public static getUniqueInvalidScopeKeys(variables: IVariable[]): number[] {
        let invalidScopeKeys: number[] = [];
        let currentVariables = variables || [];
        let countOfCurrentVariables = currentVariables.length;
        let defaultScopeKey = VariableConstants.DefaultScopeKey;

        // create a map of variable  that contains the count of its occurence group by scope and name. 
        let duplicateVariableNamesMap = ValidationHelper.getDuplicateVariableNamesMap(currentVariables, defaultScopeKey);

        for (let i = 0; i < countOfCurrentVariables; i++) {

            let variable: IVariable = currentVariables[i];

            //  Check if the variable is invalid and if so, push the scope to invalid scopes array
            if (!ValidationHelper.isVariableValid(duplicateVariableNamesMap, variable)) {
                if (!variable.scope) {
                    //  This means that variable has no scope. So pushing default scope
                    invalidScopeKeys.push(defaultScopeKey);
                }
                else {
                    //  Scope present so pushing the variable defined scope
                    invalidScopeKeys.push(variable.scope.key);
                }
            }
        }

        //  Return only the unique scope keys
        return ValidationHelper._getUniqueScopeKeys(invalidScopeKeys);
    }

    private static _getUniqueScopeKeys(invalidScopeKeys: number[]): number[] {
        if (invalidScopeKeys && invalidScopeKeys.length > 0) {
            return invalidScopeKeys.filter((val: number, index: number, keys: number[]) => keys.indexOf(val) === index);
        }
        else {
            return [];
        }

    }

    private static isVariableValid(duplicateVariableNamesMap: IDictionaryStringTo<IDictionaryStringTo<number>>, variable: IVariable): boolean {
        // get map for the scope of the variable
        let scope_key = (variable.scope ? variable.scope.key : VariableConstants.DefaultScopeKey).toString(10);
        let scopedDuplicateVariableNamesMap = duplicateVariableNamesMap[scope_key];

        let valueValidationState = ValidationHelper.getValueValidationState(variable);
        if (valueValidationState.state === ValidState.Invalid) {
            return false;
        }

        let nameValidationState = ValidationHelper.getNameValidationState(variable, scopedDuplicateVariableNamesMap);
        if (nameValidationState.state === ValidState.Invalid) {
            return false;
        }

        return true;
    }

    /**
     * Gets the Valid validation state
     * 
     * @private
     * @static
     * @returns {IValidationState} 
     * 
     * @memberOf ValidationHelper
     */
    private static _getValidValidationState(): IValidationState {
        return {
            state: ValidState.Valid,
            message: Utils_String.empty
        };
    }

    /**
     * Gets the InValid state with the message
     * 
     * @private
     * @static
     * @param {string} message 
     * @returns 
     * 
     * @memberOf ValidationHelper
     */
    private static _getInvalidValidationState(message: string) {
        return {
            state: ValidState.Invalid,
            message: message
        };
    }
}