import * as Q from "q";
import { VariableGroupSource } from "DistributedTaskControls/Sources/VariableGroupSource";
import { VariableList, IDefinitionVariableReference, IScope, IVariableGroupReference } from "DistributedTaskControls/Variables/Common/Types";
import { IScopedProcessVariables, IScopePermission } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";

import { IVariablesData, IEnvironmentVariablesData, PipelineDefinition, PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { VariablesUtils } from "PipelineWorkflow/Scripts/Shared/Utils/VariablesUtils";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { PermissionService, IPermissionService } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionService";

import { ReleaseManagementSecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import { VariableGroup, ConfigurationVariableValue } from "ReleaseManagement/Core/Contracts";

export class DefinitionVariablesUtils extends VariablesUtils {

    public static mapDefinitionToVariablesData(definition: PipelineDefinition, onlyOverridable: boolean = false): IVariablesData {

        let variablesData: IVariablesData = {
            definitionId: definition.id,
            definitionPath: definition.path,
            variables: !!onlyOverridable ? this._getOverridableVariables(definition.variables) : definition.variables,
            environments: this.getEnvironmentVariablesData(definition.environments, onlyOverridable)
        };

        return variablesData;
    }

    public static beginGetVariableGroups(definition: PipelineDefinition): IPromise<VariableGroup[]> {

        let variableGroupReferences: IVariableGroupReference[] = VariablesUtils.getVariableGroupReferences(definition);
        let groupIds = variableGroupReferences.map((groupreference: IVariableGroupReference) => { return groupreference.groupId; });

        let distinctGroupIds = groupIds.filter((groupId: number, index: number) => {
            return groupIds.indexOf(groupId) === index;
        });

        return VariableGroupSource.instance().beginGetVariableGroupsByIds(distinctGroupIds);
    }

    public static getEnvironmentVariablesData(environments: PipelineDefinitionEnvironment[], onlyOverridable: boolean = false): IEnvironmentVariablesData[] {
        return (environments || []).map((environment) => {
            return {
                name: environment.name,
                scopeKey: environment.id,
                definitionId: environment.id,
                variables: !!onlyOverridable ? this._getOverridableVariables(environment.variables) : environment.variables,
            } as IEnvironmentVariablesData;
        });
    }

    public static getScopedProcessVariables(environment: PipelineDefinitionEnvironment): IScopedProcessVariables {
        let processVariables: VariableList = [];
        let variables = environment.variables || {};

        Object.keys(variables).forEach((name: string) => {

            let variable: IDefinitionVariableReference = {
                name: name,
                variable: {
                    value: variables[name].value,
                    isSecret: variables[name].isSecret,
                    allowOverride: variables[name].allowOverride,
                    scope: {
                        key: environment.id,
                        value: environment.name
                    } as IScope
                }
            };
            processVariables.push(variable);
        });

        let scope: IScope = {
            key: environment.id,
            value: environment.name
        };

        return {
            variableList: processVariables,
            scope: scope
        } as IScopedProcessVariables;
    }

    public static getVariableGroupReferencesInScope(variableGroupreferences: IVariableGroupReference[], scopeKey: number): number[] {
        let references: IVariableGroupReference[] = variableGroupreferences || [];
        return references.reduce<number[]>((groupIdsInScope: number[], groupReference: IVariableGroupReference) => {
            if (!!groupReference.scope && groupReference.scope.key === scopeKey) {
                groupIdsInScope.push(groupReference.groupId);
            }

            return groupIdsInScope;
        }, []);
    }

    public static getScopePermissions(definitionPath: string, definitionId: number, environmentIds: number[], permissionService?: IPermissionService): IPromise<IScopePermission[]> {
        let securityTokens: string[] = [];
        permissionService = permissionService || PermissionService.instance();

        for (const environmentId of environmentIds) {
            if (environmentId > 0) {
                securityTokens.push(PermissionHelper.createEditEnvironmentSecurityProps(definitionPath, definitionId, environmentId).securityToken);
            }
            else {
                throw new Error("Environment id should be > 0 to evaluate its permission");
            }
        }

        return permissionService.listPermissions(securityTokens, ReleaseManagementSecurityPermissions.EditReleaseEnvironment).then((hasPermissions: boolean[]) => {
            if (environmentIds.length === hasPermissions.length) {
                const scopePermissions: IScopePermission[] = hasPermissions.map((hasPermission, index) => {
                    return {
                        scopeKey: environmentIds[index],
                        hasPermission: hasPermission
                    };
                });

                return Q(scopePermissions);
            }
            else {
                return Q([]);
            }
        }, () => Q([]));
    }

    private static _getOverridableVariables(variables: IDictionaryStringTo<ConfigurationVariableValue>): IDictionaryStringTo<ConfigurationVariableValue> {
        if (!variables) {
            return {};
        }

        let overridableVariables = {};
        Object.keys(variables).forEach((key) => {
            if (!!variables[key].allowOverride) {
                overridableVariables[key] = variables[key];
            }
        });

        return overridableVariables;
    }
}