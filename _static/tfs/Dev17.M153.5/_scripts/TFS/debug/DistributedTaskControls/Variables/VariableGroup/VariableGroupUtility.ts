import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { IDefinitionVariableGroup, IScope } from "DistributedTaskControls/Variables/Common/Types";

import { VariableGroup } from "TFS/DistributedTask/Contracts";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as Utils_String from "VSS/Utils/String";

export class VariableGroupUtility {

    // Incase a variable group linked in a definition gets deleted, getVariableGroupsByIds call will not return an entry corresponding to that Variable group.
    // In order to handle that scenario, we look up for the missing entries explicitly.
    // If one such entry exists, we add a variableGroup with only id of it set.
    // In the current UI we show this entry as disabled along with a message to the user that it needs to be deleted.

    /**
     * Add empty variable groups for missing entries in the returnedVariableGroups
     * @param requestedVariableGroupIds
     * @param returnedVariableGroups
     */
    public static addVariableGroupsForMissingEntries(requestedVariableGroupIds: number[], returnedVariableGroups: IDefinitionVariableGroup[]): IDefinitionVariableGroup[] {

        requestedVariableGroupIds = requestedVariableGroupIds || [];

        // If there are no variable groups for the requested Ids, return empty variable group for each
        if (!returnedVariableGroups) {
            return VariableGroupUtility.createVariableGroupsForGivenIds(requestedVariableGroupIds);
        }

        // Create map of the returnedVariableGroups
        let returnedVariableGroupsMap: IDictionaryNumberTo<IDefinitionVariableGroup> = {};
        returnedVariableGroups.forEach((variableGroup: IDefinitionVariableGroup) => {

            if (variableGroup.id) {
                returnedVariableGroupsMap[variableGroup.id] = variableGroup;
            }
        });

        // Get the missing Ids
        let missingIds: number[] = [];
        requestedVariableGroupIds.forEach((id: number) => {

            if (!returnedVariableGroupsMap[id]) {
                missingIds.push(id);
            }
        });

        // Create empty variables for the missing Ids and concatenate both the groups
        let missingVariables = VariableGroupUtility.createVariableGroupsForGivenIds(missingIds);
        return returnedVariableGroups.concat(missingVariables);
    }

    /**
     * @brief create empty variable group for the given Ids
     * @param ids
     */
    public static createVariableGroupsForGivenIds(ids: number[]): IDefinitionVariableGroup[] {
        if (ids) {
            let variableGroups: IDefinitionVariableGroup[] = ids.map((id) => {
                return <IDefinitionVariableGroup>{ id: id };
            });

            return variableGroups;
        }

        return [];
    }

    /**
     * @brief return the variable groups in order of Ids
     * @param variableGroups
     * @param groupIdsInOrder
     */
    public static preserveVariableGroupsOrder(variableGroups: IDefinitionVariableGroup[], groupIdsInOrder: number[]): IDefinitionVariableGroup[] {
        return groupIdsInOrder.map((groupId: number) => {
            return variableGroups.filter((variableGroup: IDefinitionVariableGroup) => {
                return variableGroup.id === groupId;
            })[0];
        }).filter((variableGroup: IDefinitionVariableGroup) => {

            // filter out undefined/null entries
            return !!variableGroup;
        });
    }

    /**
     * Get the link to view the variable group in library hub
     * 
     * @param {VariableGroup} variableGroup 
     * @returns 
     * @memberof VariableGroupUtility
     */
    public static getLibraryHubLink(variableGroup: VariableGroup) {
        return DtcUtils.getUrlForExtension(VariableGroupUtility.LIBRARY_HUB, null,
            { itemType: "VariableGroups", view: "VariableGroupView", variableGroupId: String(variableGroup.id) });
    }

    /**
     * Check whether variable groups is deleted or not
     * 
     * We check the existence of object and name of variables
     * If any of them is not defined, we treat the variable group as deleted.
     * 
     * @private
     * @param {VariableGroup} variableGroup 
     * @returns {boolean} 
     * @memberof VariableGroupUtility
     */
    public static isDeleted(variableGroup: VariableGroup): boolean {

        if (!variableGroup || !variableGroup.name) {
            return true;
        }

        return false;
    }

     /**
     * Check whether user have permission on variable group.
     * 
     * We check if variable group exist or not. If yes it should have  
     * atleast one variable.
     * 
     * @private
     * @param {VariableGroup} variableGroup 
     * @returns {boolean} 
     * @memberof VariableGroupUtility
     */
    public static isAccessToVariableGroupNotAllowed(variableGroup: VariableGroup): boolean {

        if (!variableGroup || !variableGroup.variables || Object.keys(variableGroup.variables).length === 0 ) {
            return true;
        }

        return false;
    }

    public static getFullScopeString(scopes: IScope[]): string {
        return Resources.ScopesText + scopes.map((scope: IScope) => scope.value).join(Resources.Comma);
    }

    public static getShortScopeString(scopes: IScope[]): string {
        let scopesToShow = Math.min(scopes.length, VariableGroupUtility.MAX_SCOPES_TO_SHOW);
        let scopeString = Resources.ScopesText;
        let maxLengthPerScope = VariableGroupUtility.MAX_SHORT_SCOPE_STRING_LENGTH / scopesToShow;
        for (let index = 0; index < scopesToShow; index++) {
            const scope = scopes[index];
            let scopeValueToDisplay = Utils_String.empty;
            
            if (scope.value.length > maxLengthPerScope) {
                scopeValueToDisplay = Utils_String.format("{0}...", scope.value.slice(0, maxLengthPerScope - 3));
            }
            else {
                scopeValueToDisplay = scope.value;
            }
            
            scopeString = Utils_String.format(
                            "{0}{1}{2}",
                            scopeString,
                            index !== 0 ? Resources.Comma : Utils_String.empty,
                            scopeValueToDisplay
                        );
        }

        let extraScopesCount = scopes.length - scopesToShow;

        if (extraScopesCount > 0) {
            scopeString = Utils_String.format("{0} +{1}", scopeString, extraScopesCount);
        }

        return scopeString;
    }

    public static readonly MAX_SCOPES_TO_SHOW = 5;
    public static readonly MAX_SHORT_SCOPE_STRING_LENGTH = 100;
    public static readonly LIBRARY_HUB = "ms.vss-distributed-task.hub-library";
    public static readonly VARIABLE_GROUPS_LEARN_MORE_LINK = "https://go.microsoft.com/fwlink/?LinkId=832652";
}