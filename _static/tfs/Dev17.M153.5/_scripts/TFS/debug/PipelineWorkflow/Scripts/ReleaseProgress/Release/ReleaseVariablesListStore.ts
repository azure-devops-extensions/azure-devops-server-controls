
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { VariableConstants as DTCVariableConstants } from "DistributedTaskControls/Variables/Common/Constants";

import { VariablesListStore } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/VariablesTab/VariablesListStore";

import { Release, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";
import { ReleaseVariablesUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseVariablesUtils";

/**
 * This class is used by Release variable (Progress View)
 */
export class ReleaseVariablesListStore extends VariablesListStore {

    /**
     * @brief Updates the variables of the release object
     * @param {Release} release
     * @returns Release
     */
    public updateVisitor(release: Release): Release {
        release = this._updateReleaseVariables(release);
        release = this._updateReleaseEnvironmentVariables(release);
        return release;
    }

    /**
     * @brief Updates the release variables in the release object
     * @param  {Release} release
     * @returns Release
     */
    private _updateReleaseVariables(release: Release): Release {
        // reset the dictionary to populate it again from variables store
        release.variables = {};

        release.variables = this._getReleaseVariables();

        release.variableGroups = this._getVariableGroups();

        return release;
    }

    /**
     * @brief Update the variables for each environment
     * @param {Release} release 
     * @returns {Release} 
     */
    private _updateReleaseEnvironmentVariables(release: Release): Release {
        if (release.environments) {
            (release.environments).forEach((environment: ReleaseEnvironment) => {
                this._updateReleaseEnvironmentVariablesAndVariableGroups(environment);
            });
        }

        return release;
    }

    private _updateReleaseEnvironmentVariablesAndVariableGroups(environment: ReleaseEnvironment): ReleaseEnvironment {

        // reset the dictionary to populate it again from variables store
        environment.variables = {};

        environment.variables = this._getEnvironmentVariables(environment.id);

        environment.variableGroups = this._getVariableGroups(environment.id);

        return environment;
    }

    //  Gets scoped Variable groups
    private _getVariableGroups(scopeKey: number = DTCVariableConstants.DefaultScopeKey) {
        let variableGroups = this._variableGroupStore.getState().variableGroups;
        return ReleaseVariablesUtils.getVariableGroupInScope(variableGroups, scopeKey);
    }
}