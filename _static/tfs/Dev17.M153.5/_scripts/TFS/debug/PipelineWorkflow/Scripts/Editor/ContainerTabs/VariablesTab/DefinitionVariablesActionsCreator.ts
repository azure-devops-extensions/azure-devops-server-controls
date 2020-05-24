import { IVariablesData } from "PipelineWorkflow/Scripts/Common/Types";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { PermissionTelemetryHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionTelemetryHelper";
import { IScopePermission} from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";

import { DefinitionVariablesUtils } from "PipelineWorkflow/Scripts/Editor/Common/DefinitionVariablesUtils";
import { VariablesActionsCreator } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/VariablesTab/VariablesActionsCreator";

export class DefinitionVariablesActionsCreator extends VariablesActionsCreator {

    /**
     * Invoke actions for scope permissions related to definition
     * 
     * @param variablesData 
     */
    public invokeUpdateDefinitionScopePermissionsActions(variablesData: IVariablesData): IPromise<void> {
        // The first call will cache all permissions. So this does not end up making too many network calls.
        return PermissionHelper.hasEditDefinitionPermission(variablesData.definitionPath, variablesData.definitionId).then((hasEditDefinitionPermission) => {
            let savedEnvironmentIds: number[] = [];
            if (variablesData.environments) {
                for (const env of variablesData.environments) {
                    if (env.definitionId > 0) {
                        savedEnvironmentIds.push(env.definitionId);
                    }
                }
            }

            return DefinitionVariablesUtils.getScopePermissions(variablesData.definitionPath, variablesData.definitionId, savedEnvironmentIds).then((scopePermissions) => {
                this._updateScopePermissions(scopePermissions, hasEditDefinitionPermission);
                this._publishTelemetry(variablesData, scopePermissions, hasEditDefinitionPermission);
            },
                () => {
                    this._updateScopePermissions([], hasEditDefinitionPermission);
                    this._publishTelemetry(variablesData, [], hasEditDefinitionPermission);
                }
            );
        },
            () => {
                this._updateScopePermissions([], true);
                this._publishTelemetry(variablesData, [], true);
            }
        );
    } 

    private _publishTelemetry(variablesdata: IVariablesData, scopePermissions: IScopePermission[], hasDefinitionEditPermission: boolean): void {
        const variableList = DefinitionVariablesUtils.getProcessVariables(variablesdata);

        PermissionTelemetryHelper.publishPermissionIndicatorCountOnVariables(variablesdata.definitionId, hasDefinitionEditPermission, variableList, scopePermissions);
    }
}