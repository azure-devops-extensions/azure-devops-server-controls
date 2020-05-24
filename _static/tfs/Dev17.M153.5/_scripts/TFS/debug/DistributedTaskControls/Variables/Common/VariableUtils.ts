import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IDefinitionVariableReference, IScope, IVariable, VariableList } from "DistributedTaskControls/Variables/Common/Types";

import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Utility class specific to Variables scenario. Separated out generic methods for testability.
 */
export class VariablesUtils {

    /**
     * Converts definition variable reference to variable interface in model
     *
     * @static
     * @param {IDefinitionVariableReference} variableReference
     * @returns {IVariable}
     * @memberof VariablesUtils
     */
    public static convertDefinitionVariableToModelVariable(variableReference: IDefinitionVariableReference): IVariable {
        const variable = variableReference.variable;

        const copyVariable: IVariable = {
            name: variableReference.name,
            allowOverride: variable.allowOverride,
            disableSecretVariableName: variable.isSecret || false,
            isSecret: variable.isSecret || false,
            value: variable.value,
        };

        if (variable.scope) {
            copyVariable.scope = variable.scope;
        }

        copyVariable.hasSecretValueBeenReset = variable.hasSecretValueBeenReset;
        copyVariable.hasVariableBeenUpdatedByUser = variable.hasVariableBeenUpdatedByUser;

        return copyVariable;
    }

    /**
     * @brief convert variableList to variableArray
     * @param variablesInstance
     */
    public static createVariablesCopy(variableList: VariableList): IVariable[] {
        const variablesArray: IVariable[] = [];

        variableList.forEach((variableReference: IDefinitionVariableReference) => {
            variablesArray.push(VariablesUtils.convertDefinitionVariableToModelVariable(variableReference));
        });

        return variablesArray;
    }

    /**
     * @brief Compares two variables instances and return true/false if they are equal or otherwise
     * @param instance1
     * @param instance2
     */
    public static areEqual(instance1: IVariable[], instance2: IVariable[]): boolean {
        if (instance1.length !== instance2.length) {
            return false;
        }

        let returnValue: boolean = true;

        const length = instance1.length;
        for (let index = 0; index < length; index++) {
            if ((instance1[index].name !== instance2[index].name) ||
                (instance1[index].isSecret !== instance2[index].isSecret) ||
                (VariablesUtils.getVariableValue(instance1[index]) !== VariablesUtils.getVariableValue(instance2[index])) ||
                (!!instance1[index].allowOverride !== !!instance2[index].allowOverride) ||
                (!VariablesUtils.isScopeEqual(instance1[index].scope, instance2[index].scope))) {
                returnValue = false;
                break;
            }
        }

        return returnValue;
    }

    /**
     * Shallow compare of two variable lists based on length
     *
     * @static
     * @param {IVariable[]} instance1
     * @param {IVariable[]} instance2
     * @returns {boolean}
     *
     * @memberof VariablesUtils
     */
    public static areShallowEqual(instance1: IVariable[], instance2: IVariable[]): boolean {

        if (!instance1 && !instance2) {
            return true;
        }

        if (!instance1 || !instance2) {
            return false;
        }

        if (instance1.length !== instance2.length) {
            return false;
        }

        return true;
    }

    /**
     * Get the variables with given key as scopeKey
     *
     * @static
     * @param {IVariable[]} variables
     * @param {number} scopeKey
     * @returns {IVariable[]}
     *
     * @memberof VariablesUtils
     */
    public static getVariablesInScope(variables: IVariable[], scopeKey: number): IVariable[] {
        return variables.filter((variable: IVariable) => {
            return variable.scope.key === scopeKey;
        });
    }

    /**
     * Updates the scope of variables with the updatedScope
     *
     * @static
     * @param {IVariable[]} variables
     * @param {IScope} scope
     *
     * @memberof VariablesUtils
     */
    public static updateScopeOfVariables(variables: IVariable[], updatedScope: IScope) {
        const variablesInScope = VariablesUtils.getVariablesInScope(variables || [], updatedScope.key);

        variablesInScope.forEach((variable: IVariable) => {
            variable.scope = updatedScope;
        });
    }

    /**
     * Clones the given variables by copying the variables data and scope as targetScope
     * [Secret Variable] cloning of secret variable will reset it's value
     *
     * @static
     * @param {IVariable[]} variables
     * @param {IScope} targetScope
     * @returns {IVariable[]}
     *
     * @memberof VariablesUtils
     */
    public static cloneScopedProcessVariables(variables: IVariable[], targetScope: IScope): IVariable[] {
        const clonedVariables: IVariable[] = [];

        const length = variables.length;
        for (let index = 0; index < length; index++) {
            const variable = variables[index];
            const clonedVariable: IVariable = {
                name: variable.name,
                allowOverride: variable.allowOverride,
                hasSecretValueBeenReset: variable.isSecret || false,
                isSecret: variable.isSecret || false,

                // Reset the value if it's a secret
                value: (!!variable.isSecret) ? Utils_String.empty : variable.value
            };
            clonedVariable.scope = targetScope;

            clonedVariables.push(clonedVariable);
        }

        return clonedVariables;
    }

    /**
     * Get aria-label for the variable row
     *
     * @static
     * @param {IVariable | string} variable
     * @returns {string}
     *
     * @memberof VariablesUtils
     */
    public static getVariableRowAriaLabel(variable: IVariable | string): string {
        const variableName = typeof (variable) !== "string" ? variable.name : variable;

        return (!!variableName) ?
            Utils_String.format(Resources.VariableRowAriaLabel, variableName) :
            Resources.EmptyVariableRowAriaLabel;
    }

    /**
     * Get aria-label and title for the delete icon
     *
     * @static
     * @param {IVariable | string} variable
     * @returns {string}
     *
     * @memberof VariablesUtils
     */
    public static getDeleteVariableIconAriaLabel(variable: IVariable | string): string {
        const variableName = typeof (variable) !== "string" ? variable.name : variable;

        return (!!variableName) ?
            Utils_String.format(Resources.DeleteVariableTitleText, variableName) :
            Resources.DeleteVariableTitleTextNoName;
    }

    /**
     * Get aria-label for settable at queue time checkbox
     *
     * @static
     * @param {IVariable | string} variable
     * @returns {string}
     *
     * @memberof VariablesUtils
     */
    public static getSettableAtQueueTimeAriaLabel(variable: IVariable | string): string {
        const variableName = typeof (variable) !== "string" ? variable.name : variable;

        return (!!variableName) ?
            Utils_String.format(Resources.SettableAtQueueTimeTitleText, variableName) :
            Resources.SettableAtQueueTimeTitleTextNoName;
    }

    /**
     * Compare 2 scopes for equality
     *
     * @static
     * @param {IScope} scope1
     * @param {IScope} scope2
     * @returns {boolean}
     *
     * @memberOf VariablesUtils
     */
    public static isScopeEqual(scope1: IScope, scope2: IScope): boolean {

        if (!scope1 && !scope2) {
            return true;
        }

        if (!scope1 || !scope2) {
            return false;
        }

        return (scope1.key === scope2.key);
    }

    /**
     * Get value of a variable
     *
     * @static
     * @param {IVariable} variable
     * @returns {string}
     * @memberof VariablesUtils
     */
    public static getVariableValue(variable: IVariable): string {

        if (!!variable.isSecret && Utils_String.localeIgnoreCaseComparer(variable.value, Utils_String.empty) === 0) {
            return null;
        }

        return variable.value;
    }

    public static readonly ProcessVariablesItem: string = "ProcessVariablesItem";
    public static readonly VariablesGroupItem: string = "VariablesGroupItem";
}
