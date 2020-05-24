import { IDefinitionVariableGroup, IScope } from "DistributedTaskControls/Variables/Common/Types";

import { IVariablesData, IEnvironmentVariablesData } from "PipelineWorkflow/Scripts/Common/Types";
import { VariablesUtils } from "PipelineWorkflow/Scripts/Shared/Utils/VariablesUtils";

import { VariableGroup, Release, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

export class ReleaseVariablesUtils extends VariablesUtils {

    public static mapReleaseToVariablesData(release: Release): IVariablesData {

        let variablesData: IVariablesData = {
            definitionId: release.releaseDefinition.id,
            variables: release.variables,
            definitionPath: release.releaseDefinition.path,
            environments: this.getReleaseEnvironmentVariablesData(release.environments)
        };

        return variablesData;
    }
    
    public static getReleaseEnvironmentVariablesData(environments: ReleaseEnvironment[]): IEnvironmentVariablesData[] {
        return (environments || []).map((environment) => {
            return {
                scopeKey: environment.id,
                definitionId: environment.definitionEnvironmentId,
                name: environment.name,
                variables: environment.variables
            };
        });
    }

    /**
     * This method is used to get scoped Variable groups to fill in the release object
     * @param variableGroups 
     * @param scopeKey 
     */
    public static getVariableGroupInScope(variableGroups: IDefinitionVariableGroup[], scopeKey: number): VariableGroup[] {
        let scopedVariableGroups: VariableGroup[] = [];

        variableGroups.forEach((variableGroup: IDefinitionVariableGroup) => {
            variableGroup.scopes.forEach((scope: IScope) => {
                if (scope.key === scopeKey) {
                    //  Means that the variable group belongs to scoping key, so push it to the returning array.
                    scopedVariableGroups.push(variableGroup as VariableGroup);
                }
            });
        });

        return scopedVariableGroups;
    }

    public static getDistinctVariableGroups(release: Release): VariableGroup[] {
        let variableGroups: VariableGroup[] = [];
        let distinctVariableGroups: IDictionaryNumberTo<VariableGroup> = {};

        // Release VariableGroups
        (release.variableGroups || []).forEach((variableGroup: VariableGroup) => {
            distinctVariableGroups[variableGroup.id] = variableGroup;
        });

        // Environment VariableGroups
        (release.environments || []).forEach((environment: ReleaseEnvironment) => {

            (environment.variableGroups || []).forEach((variableGroup: VariableGroup) => {
                if (!distinctVariableGroups[variableGroup.id]) {
                    distinctVariableGroups[variableGroup.id] = variableGroup;
                }
            });

        });

        for (let groupId in distinctVariableGroups) {
            variableGroups.push(distinctVariableGroups[groupId]);
        }

        return variableGroups;
    }

}