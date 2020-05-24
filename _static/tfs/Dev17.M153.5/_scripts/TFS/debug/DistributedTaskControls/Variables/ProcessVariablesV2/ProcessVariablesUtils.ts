import { IVariable } from "DistributedTaskControls/Variables/Common/Types";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Number from "VSS/Utils/Number";

export class ProcessVariablesUtils {

    /**
     * Name based comparer for variables
     * 
     * @static
     * @param {IVariable} lhs 
     * @param {IVariable} rhs 
     * @param {boolean} sortDescending 
     * @returns 
     * 
     * @memberOf ProcessVariablesUtils
     */
    public static compareByName(lhs: IVariable, rhs: IVariable, sortDescending: boolean) {
        const compareField = Utils_String.localeComparer(lhs.name, rhs.name);
        return ((sortDescending) ? -compareField : compareField);
    }

    /**
     * Value based comparer for variables
     * 
     * @static
     * @param {IVariable} lhs 
     * @param {IVariable} rhs 
     * @param {boolean} sortDescending 
     * @returns 
     * 
     * @memberOf ProcessVariablesUtils
     */
    public static compareByValue(lhs: IVariable, rhs: IVariable, sortDescending: boolean) {
        const compareField = Utils_String.localeComparer(lhs.value, rhs.value);
        return ((sortDescending) ? -compareField : compareField);
    }

    /**
     * Scope value based comparer for variables
     * 
     * @static
     * @param {IVariable} lhs 
     * @param {IVariable} rhs 
     * @param {boolean} sortDescending 
     * @returns 
     * 
     * @memberOf ProcessVariablesUtils
     */
    public static compareByScope(lhs: IVariable, rhs: IVariable, sortDescending: boolean) {
        const compareField = Utils_String.localeComparer(lhs.scope.value, rhs.scope.value);
        return ((sortDescending) ? -compareField : compareField);
    }

    /**
     * Compares Variables by scope key, name and value respectively
     * Used to group variable by scope and then sort
     * 
     * @static
     * @param {IVariable} lhs 
     * @param {IVariable} rhs
     * @returns 
     * 
     * @memberOf ProcessVariablesUtils
     */
    public static compareDeep(lhs: IVariable, rhs: IVariable) {
        const scopeKeyCompareField = (lhs.scope && rhs.scope) ? Utils_Number.defaultComparer(lhs.scope.key, rhs.scope.key) : 0;
        if (scopeKeyCompareField === 0) {
            let nameComparerField = Utils_String.localeComparer(lhs.name, rhs.name);
            if (nameComparerField === 0) {
                return Utils_String.localeComparer(lhs.value, rhs.value);
            }
            else {
                return nameComparerField;
            }
        } else {
            return scopeKeyCompareField;
        }
    }

}