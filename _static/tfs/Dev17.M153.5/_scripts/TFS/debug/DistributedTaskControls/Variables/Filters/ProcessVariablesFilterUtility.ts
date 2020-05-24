import { IVariable, IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";
import { ProcessVariablesFilterKeys } from "DistributedTaskControls/Variables/Common/Constants";

import * as Utils_String from "VSS/Utils/String";
import { Filter, IFilterState } from "VSSUI/Utilities/Filter";

export class ProcessVariablesFilterUtility {

    /**
     * Filter the given set of variables as per the filter
     * return the indexes of the variables from array for the which the filter condition is met
     * 
     * @static
     * @param {IVariable[]} variables 
     * @param {Filter} filter 
     * @returns {number[]} 
     * @memberof ProcessVariablesFilterUtility
     */
    public static filterVariables(variables: IVariable[], filter: Filter): number[] {

        let filteredIndexes: number[];

        // filter by scope
        let scopes = ProcessVariablesFilterUtility.getScopes(filter);
        filteredIndexes = this.filterByScope(variables, scopes);

        // filter by keyword
        let keyword = ProcessVariablesFilterUtility.getKeyword(filter);
        filteredIndexes = this._filterByKeyword(variables, filteredIndexes, keyword);

        return filteredIndexes;
    }

    /**
     * This Utility works with the assumption that default scopes for Variables are either 0 (Pipeline/Editor scenario) or 2 (per scope {scope +Release} )
     * @param currentScopes Current scopes are those which are set when user changes the default scopes
     * @param defaultScopes Default Scopes are those which are set by the system by default
     */
    public static areDefaultScopesChanged(currentScopes: IScope[], defaultScopes: IScope[]): boolean {
        currentScopes = currentScopes || [];
        defaultScopes = defaultScopes || [];

        if (currentScopes.length !== defaultScopes.length) {
            return true;
        }
        else {
            // Maintain a dictionary for unique scope keys
            let scopeDictionary: IDictionaryNumberTo<String> = {};

            for (let scope of currentScopes) {
                scopeDictionary[scope.key] = scope.value;
            }

            for (let scope of defaultScopes) {
                scopeDictionary[scope.key] = scope.value;
            }

            // Return false if default scopes length is 0 as no scopes filter will be present for PipelineView by default
            // Return false if default scopes length is 2 and currentScopes and defaultScopes are exactly same.
            // This will be case in environmentView where by default Release scope and specific environment scope will be selected.
            // Else return true
            if ((defaultScopes.length === 0) || (defaultScopes.length === 2 && Object.keys(scopeDictionary).length === 2)) {
                return false;
            }
            else {
                return true;
            }
        }
    }


    /**
     * Filters the variables by scope
     * return the indexes of the variables from array for the which variable scope is one of the given scopes
     * 
     * @static
     * @param {IVariable[]} variables 
     * @param {IScope[]} scopes 
     * @returns {number[]} 
     * @memberof ProcessVariablesFilterUtility
     */
    public static filterByScope(variables: IVariable[], scopes: IScope[]): number[] {

        // If scopes are not defined or scopes length is zero, it means scope filter 
        // is not set or clear filters has been set, in that case we return all the variables are match
        if (!(scopes && scopes.length > 0)) {
            return this._getIndexes(variables);
        }

        let indexes: number[] = [];
        for (let index = 0, length = variables.length; index < length; index++) {

            for (const scope of scopes) {

                if (VariablesUtils.isScopeEqual(scope, variables[index].scope)) {
                    indexes.push(index);
                }
            }
        }

        return indexes;
    }

    /**
     * Validate if filter condition is met for the variable
     * 
     * @static
     * @param {IVariable} variable 
     * @param {Filter} filter 
     * @returns 
     * @memberof ProcessVariablesFilterUtility
     */
    public static doesVariableMatchFilter(variable: IVariable, filter: Filter) {
        let keyword = ProcessVariablesFilterUtility.getKeyword(filter);
        let scopes = ProcessVariablesFilterUtility.getScopes(filter);

        return ProcessVariablesFilterUtility._doesVariableMatchKeyword(variable, keyword) &&
            ProcessVariablesFilterUtility._doesVariableMatchScopes(variable, scopes);
    }

    /**
     * Get the scopes in the filter (It relates to selected scopes)
     * 
     * @static
     * @param {Filter} filter 
     * @returns {IScope[]} 
     * @memberof ProcessVariablesFilterUtility
     */
    public static getScopes(filter: Filter): IScope[] {
        let filterState: IFilterState = filter && filter.getState();
        let scopes: IScope[] = filterState && filterState[ProcessVariablesFilterKeys.Scope] ?
            filterState[ProcessVariablesFilterKeys.Scope].value : null;

        return scopes;
    }

    /**
     * Get the keyword set in the filter
     * 
     * @static
     * @param {Filter} filter 
     * @returns {string} 
     * @memberof ProcessVariablesFilterUtility
     */
    public static getKeyword(filter: Filter): string {
        let filterState: IFilterState = filter && filter.getState();
        let keyword = filterState && filterState[ProcessVariablesFilterKeys.Keyword] ?
            filterState[ProcessVariablesFilterKeys.Keyword].value :
            Utils_String.empty;

        return keyword;
    }

    /**
     * Validate if the variable value meets the keyword filter criteria
     * 
     * @static
     * @param {IVariable} variable 
     * @param {string} keyword 
     * @returns {boolean} 
     * @memberof ProcessVariablesFilterUtility
     */
    public static doesValueMatchKeyword(variable: IVariable, keyword: string): boolean {
        return (!variable.isSecret) && Utils_String.caseInsensitiveContains(variable.value, keyword);
    }

    /**
     * Validate if the variable meets the keyword filter criteria
     * 
     * @private
     * @static
     * @param {IVariable} variable 
     * @param {string} keyword 
     * @returns {boolean} 
     * @memberof ProcessVariablesFilterUtility
     */
    private static _doesVariableMatchKeyword(variable: IVariable, keyword: string): boolean {
        return ProcessVariablesFilterUtility._doesNameMatchKeyword(variable, keyword) ||
            ProcessVariablesFilterUtility.doesValueMatchKeyword(variable, keyword) ||
            ProcessVariablesFilterUtility._doesScopeMatchKeyword(variable, keyword);
    }

    /**
     * Filters the variables as per the keyword
     * It takes the interestedIndexes i.e. indexes from the variables array on which the keyword filter is then applied
     * 
     * @private
     * @static
     * @param {IVariable[]} variables 
     * @param {number[]} interestedIndexes 
     * @param {string} keyword 
     * @returns {number[]} 
     * @memberof ProcessVariablesFilterUtility
     */
    private static _filterByKeyword(variables: IVariable[], interestedIndexes: number[], keyword: string): number[] {

        let filteredIndexes: number[] = [];

        for (const index of interestedIndexes) {

            if (ProcessVariablesFilterUtility._doesVariableMatchKeyword(variables[index], keyword)) {
                filteredIndexes.push(index);
            }
        }

        return filteredIndexes;
    }

    /**
     * Gets the array indexes for the variables ( starts from 0 to variables length )
     * 
     * @private
     * @static
     * @param {IVariable[]} variables 
     * @returns 
     * @memberof ProcessVariablesFilterUtility
     */
    private static _getIndexes(variables: IVariable[]) {

        let indexes: number[] = [];

        for (let index = 0, length = variables.length; index < length; index++) {
            indexes.push(index);
        }

        return indexes;
    }

    /**
     * Validate if the variable name meets the keyword filter criteria
     * 
     * @private
     * @static
     * @param {IVariable} variable 
     * @param {string} keyword 
     * @returns {boolean} 
     * @memberof ProcessVariablesFilterUtility
     */
    private static _doesNameMatchKeyword(variable: IVariable, keyword: string): boolean {
        return Utils_String.caseInsensitiveContains(variable.name, keyword);
    }

    /**
     * Validate if the variable scope meets the keyword filter criteria
     * 
     * @private
     * @static
     * @param {IVariable} variable 
     * @param {string} keyword 
     * @returns {boolean} 
     * @memberof ProcessVariablesFilterUtility
     */
    private static _doesScopeMatchKeyword(variable: IVariable, keyword: string): boolean {
        return Utils_String.caseInsensitiveContains(variable.scope.value, keyword);
    }

    /**
     * Validate if variable scope is one of the given scopes
     * 
     * @private
     * @static
     * @param {IVariable} variable 
     * @param {IScope[]} scopes 
     * @returns {boolean} 
     * @memberof ProcessVariablesFilterUtility
     */
    private static _doesVariableMatchScopes(variable: IVariable, scopes: IScope[]): boolean {

        // If no scope is set, then we treat it as match
        if (!scopes || scopes.length === 0) {
            return true;
        }

        for (const scope of scopes) {
            if (VariablesUtils.isScopeEqual(scope, variable.scope)) {
                return true;
            }
        }
        return false;
    }
}