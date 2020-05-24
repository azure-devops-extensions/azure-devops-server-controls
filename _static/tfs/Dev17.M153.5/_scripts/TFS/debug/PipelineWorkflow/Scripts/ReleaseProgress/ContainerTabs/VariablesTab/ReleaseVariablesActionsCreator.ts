import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseEnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";
import { IScopePermission } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";

import { VariablesActionsCreator } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/VariablesTab/VariablesActionsCreator";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

export class ReleaseVariablesActionsCreator extends VariablesActionsCreator {

    /**
     * Invoke actions for scope permissions related to release
     * 
     * @param release 
     */
    public invokeUpdateReleaseScopePermissionsActions(release: ReleaseContracts.Release): void {
        let scopePermissions: IScopePermission[] = [];

        if (release.environments) {
            release.environments.forEach((env: ReleaseContracts.ReleaseEnvironment) => {
                //  Checking if the env is permissible or not
                let hasPermission = ReleaseEnvironmentUtils.isEnvironmentPermissible(env.definitionEnvironmentId, release.releaseDefinition.path, release.releaseDefinition.id, release.projectReference.id, env.status);
                
                scopePermissions.push({
                    scopeKey: env.id, 
                    hasPermission: hasPermission
                });
            });
        }
        
        this._updateScopePermissions(scopePermissions, true, Resources.EditReleaseVariablesPermissionMessage);
    }
}