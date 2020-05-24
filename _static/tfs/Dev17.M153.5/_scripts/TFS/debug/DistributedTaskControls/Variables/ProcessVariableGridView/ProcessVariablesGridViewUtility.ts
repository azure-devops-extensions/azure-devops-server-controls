import { IFlatViewColumn, ICellIndex } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { IScope, IVariable } from "DistributedTaskControls/Variables/Common/Types";
import { ProcessVariablesGridViewColumnKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { ProcessVariablesFilterUtility } from "DistributedTaskControls/Variables/Filters/ProcessVariablesFilterUtility";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";

import * as Utils_String from "VSS/Utils/String";
import { Filter } from "VSSUI/Utilities/Filter";
import * as Diag from "VSS/Diag";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { ColumnActionsMode } from "OfficeFabric/DetailsList";

export interface ILinkedVariable {
    /**
     * variable object
     * 
     * @type {IVariable}
     * @memberof ILinkedVariable
     */
    variable: IVariable;

    /**
     * dataIndex [pointer the variable object in the data store array]
     * 
     * @type {number}
     * @memberof ILinkedVariable
     */
    dataIndex: number;
}

export interface IProcessVariablesGridViewMetadata {
    /**
     * unique variable names sorted alphabetically
     * 
     * @type {string[]}
     * @memberof IProcessVariablesGridViewMetadata
     */
    sortedUniqueVariableNames: string[];

    /**
     * { [name] -> { [scope] -> variable } } dictionary created from variables
     * 
     * @type {IDictionaryStringTo<IDictionaryStringTo<IVariable>>}
     * @memberof IProcessVariablesGridViewMetadata
     */
    variablesGrid: IDictionaryStringTo<IDictionaryStringTo<ILinkedVariable[]>>;
}

export interface IVariablesGridViewState {
    /**
     * column headers for the grid view
     * 
     * @type {IFlatViewColumn[]}
     * @memberof IVariablesGridViewState
     */
    headers: IFlatViewColumn[];

    /**
     * current filter applied to the pipeline variables
     * 
     * @type {Filter}
     * @memberof IVariablesGridViewState
     */
    filter: Filter;

    /**
     * scopes [relates to scope columns]
     * 
     * @type {IScope[]}
     * @memberof IVariablesGridViewState
     */
    scopes: IScope[];

    /**
     * metadata to be used for grid view
     * 
     * @type {IProcessVariablesGridViewMetadata}
     * @memberof IVariablesGridViewState
     */
    gridViewData: IProcessVariablesGridViewMetadata;
}

export class ProcessVariablesGridViewUtility {

    /**
     * Creates column headers for the grid based on the scopes
     * 
     * @static
     * @param {IScope[]} scopes 
     * @returns {IFlatViewColumn[]} 
     * @memberof ProcessVariablesGridViewUtility
     */
    public static getColumnHeaders(scopes: IScope[], filter: Filter): IFlatViewColumn[] {

        // find the scopes 
        scopes = ProcessVariablesGridViewUtility._intersectScopesAndFilter(scopes, filter);

        let columns: IFlatViewColumn[] = [];

        // create empty column header [It's for UI consistency b/w grid and list view]
        columns.push(ProcessVariablesGridViewUtility._getIconColumnHeader());

        // create name column header
        columns.push(ProcessVariablesGridViewUtility._getNameColumnHeader());

        // create headers for rest of the scopes
        for (const scope of scopes) {
            columns.push(ProcessVariablesGridViewUtility._convertScopeToColumnHeader(scope));
        }

        return columns;
    }

    /**
     * Get the metadata for the variables grid view
     * 
     * @static
     * @param {IVariable[]} variables 
     * @param {IScope[]} scopes 
     * @param {Filter} filter 
     * @param {number} editInProgressVariableDataIndex - Variable with dataIndex = editInProgressVariableDataIndex should be shows irrespective of the filter
     * @returns {IProcessVariablesGridViewMetadata} 
     * @memberof ProcessVariablesGridViewUtility
     */
    public static getVariablesGridViewMetaData(variables: IVariable[], scopes: IScope[], filter: Filter, editInProgressVariableDataIndex: number): IProcessVariablesGridViewMetadata {

        variables = variables || [];

        // { [name] -> { [scope] -> linkedVariable } } dictionary
        let variablesGrid: IDictionaryStringTo<IDictionaryStringTo<ILinkedVariable[]>> = {};

        // unique variable names
        let uniqueVariableNames: string[] = [];

        // find the intersection of the scopes present in definition and filter
        let intersectedScopes = ProcessVariablesGridViewUtility._intersectScopesAndFilter(scopes, filter);

        // find the indexes of variables which meet the selected scope criteria
        let filteredIndexes = ProcessVariablesFilterUtility.filterByScope(variables, intersectedScopes);

        for (let index = 0, length = filteredIndexes.length; index < length; index++) {

            // get the dataIndex for the indexes in the filteredIndexes array
            let dataIndex = filteredIndexes[index];

            // get the variable
            const variable = variables[dataIndex];

            // ignore variable if name is empty
            if (!variable.name) {
                continue;
            }

            // check if variable name is key for variablesGrid
            if (!variablesGrid.hasOwnProperty(variable.name)) {

                // if not, add the key to the map
                variablesGrid[variable.name] = {};

                // add the name to list of unique names
                uniqueVariableNames.push(variable.name);
            }

            // use or create the array if it does not exists
            variablesGrid[variable.name][String(variable.scope.key)] = variablesGrid[variable.name][String(variable.scope.key)] || [];

            // update the [scope -> variable] dictionary
            variablesGrid[variable.name][String(variable.scope.key)].push({ variable: variable, dataIndex: dataIndex });
        }

        // sort the names alphabetically
        uniqueVariableNames = uniqueVariableNames.sort(Utils_String.localeIgnoreCaseComparer);

        let data: IProcessVariablesGridViewMetadata = {
            sortedUniqueVariableNames: uniqueVariableNames,
            variablesGrid: variablesGrid
        };

        ProcessVariablesGridViewUtility._filterViewMetaDataByKeyword(filter, intersectedScopes, data, editInProgressVariableDataIndex);

        return data;
    }

    /**
     * Get the key for the scope column
     * 
     * @static
     * @param {IScope} scope 
     * @returns {string} 
     * @memberof ProcessVariablesGridViewUtility
     */
    public static getScopeColumnKey(scope: IScope): string {
        return String(scope.key);
    }

    /**
     * Get the dataIndex for the cell with the given cellIndex
     * 
     * @static
     * @param {ICellIndex} cellIndex 
     * @param {IProcessVariablesGridViewMetadata} data 
     * @returns {number} 
     * @memberof ProcessVariablesGridViewUtility
     */
    public static getDataIndex(cellIndex: ICellIndex, data: IProcessVariablesGridViewMetadata): number {

        let { rowIndex, columnKey } = cellIndex;
        let { sortedUniqueVariableNames, variablesGrid } = data;
        let name = sortedUniqueVariableNames[rowIndex];

        let variablesForScope = variablesGrid[name][columnKey];

        if (variablesForScope && variablesForScope.length === 1) {
            return variablesGrid[name][columnKey][0].dataIndex;
        }
        else {
            Diag.logError("[ProcessVariablesGridViewUtility.getDataIndex] function should not be called for cell where value cannot be determined");
        }
    }

    /**
     * Create column header for a given scope
     * 
     * @private
     * @static
     * @param {IScope} scope 
     * @returns {IFlatViewColumn} 
     * @memberof ProcessVariablesGridViewUtility
     */
    private static _convertScopeToColumnHeader(scope: IScope): IFlatViewColumn {
        const column: IFlatViewColumn = {
            maxWidth: 300,
            minWidth: 100,
            key: ProcessVariablesGridViewUtility.getScopeColumnKey(scope),
            name: scope.value
        };
        return column;
    }

    /**
     * Get Name column header
     * 
     * @private
     * @static
     * @returns {IFlatViewColumn} 
     * @memberof ProcessVariablesGridViewUtility
     */
    private static _getNameColumnHeader(): IFlatViewColumn {
        const column: IFlatViewColumn = {
            maxWidth: 300,
            minWidth: 100,
            key: ProcessVariablesGridViewColumnKeys.NameColumnKey,
            name: Resources.Name
        };
        return column;
    }

    /**
     * Get empty column
     * 
     * @private
     * @static
     * @returns {IFlatViewColumn} 
     * @memberof ProcessVariablesGridViewUtility
     */
    private static _getIconColumnHeader(): IFlatViewColumn {
        const column: IFlatViewColumn = {
            columnActionsMode: ColumnActionsMode.disabled,
            maxWidth: 20,
            minWidth: 20,
            key: ProcessVariablesGridViewColumnKeys.IconColumnKey,
            name: Utils_String.empty
        };
        return column;
    }

    private static _intersectScopesAndFilter(scopes: IScope[], filter: Filter): IScope[] {

        // get the scopes selected by the user via filter
        let filteredScopes = ProcessVariablesFilterUtility.getScopes(filter);

        // if user has selected some scopes, return the specific scopes
        if (filteredScopes && filteredScopes.length > 0) {

            let intersectedScopes: IScope[] = [];
            for (const scope of scopes) {
                for (const filteredScope of filteredScopes) {
                    if (VariablesUtils.isScopeEqual(scope, filteredScope)) {
                        intersectedScopes.push(filteredScope);
                    }
                }
            }

            return intersectedScopes;
        }

        // if no scope is selected or filter is not set for scope, return everything
        else {
            return scopes;
        }
    }

    private static _filterViewMetaDataByKeyword(filter: Filter, interestedScopes: IScope[], data: IProcessVariablesGridViewMetadata, editInProgressVariableDataIndex: number) {

        let { sortedUniqueVariableNames, variablesGrid } = data;
        let keyword = ProcessVariablesFilterUtility.getKeyword(filter);

        let filteredSortedUniqueVariableNames: string[] = [];

        for (const name of sortedUniqueVariableNames) {

            if (Utils_String.caseInsensitiveContains(name, keyword)) {
                filteredSortedUniqueVariableNames.push(name);
            }
            else {

                for (const scope of interestedScopes) {

                    const linkedVariables = variablesGrid[name][ProcessVariablesGridViewUtility.getScopeColumnKey(scope)];

                    // found duplicate variables for scope with same name, will not participate in filtering
                    if (linkedVariables && linkedVariables.length === 1) {

                        const linkedVariable = linkedVariables[0];

                        if (linkedVariable) {
                            const variable = linkedVariable.variable;
                            if (ProcessVariablesFilterUtility.doesValueMatchKeyword(variable, keyword) || linkedVariable.dataIndex === editInProgressVariableDataIndex) {
                                filteredSortedUniqueVariableNames.push(name);
                                break;
                            }
                        }
                    }
                }
            }
        }

        data.sortedUniqueVariableNames = filteredSortedUniqueVariableNames;
    }
}