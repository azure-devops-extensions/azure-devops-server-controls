
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { VariableConstants as DTCVariableConstants } from "DistributedTaskControls/Variables/Common/Constants";
import { IDefinitionVariableReference } from "DistributedTaskControls/Variables/Common/Types";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { PipelineDefinition, PipelineDefinitionEnvironment, PipelineVariable } from "PipelineWorkflow/Scripts/Common/Types";
import { VariablesListStore } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/VariablesTab/VariablesListStore";
import { DefinitionVariablesUtils } from "PipelineWorkflow/Scripts/Editor/Common/DefinitionVariablesUtils";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";

import * as DistributedTask from "TFS/DistributedTask/Contracts";

/**
 * This class is used by Editor variable (CD Editor view)
 */
export class EditorVariablesListStore extends VariablesListStore {

    /**
     * @brief Updates the variables of the PipelineDefinition
     * @param {PipelineDefinition} pipelineDefinition
     * @returns PipelineDefinition
     */
    public updateVisitor(definition: PipelineDefinition): PipelineDefinition {
        definition = this._updateReleaseVariablesInDefinition(definition);
        definition = this._updateEnvironmentVariables(definition);
        return definition;
    }

    /**
 * Log the changes/telemetry data
 * 
 * @param {IDictionaryStringTo<any>} changes 
 * @memberof VariablesListStore
 */
    public getChangeTelemetryData(changes: IDictionaryStringTo<any>) {
        let variables = this._processVariablesStore.getVariableList() || [];

        let emptyVariables = variables.filter((variable: IDefinitionVariableReference) => { return !variable.name; });

        if (emptyVariables && emptyVariables.length > 0) {
            changes[Properties.emptyVariableRows] = emptyVariables.length;
        }
    }

    /**
 * retuns the variable value from the list of variables
 * 
 * @param {TaskInputDefinition} variableInput 
 * @param {string} scopeInstanceId 
 * 
 * @memberOf VariablesListStore
 */
    public resolveVariable(variableInput: DistributedTask.TaskInputDefinition, scopeInstanceId?: string): void {
        const variableList: IDefinitionVariableReference[] = this._processVariablesStore.getVariableList();
        const envStore = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, scopeInstanceId);

        if (envStore) {
            // first search in given environment
            let envId = envStore.getEnvironmentId();
            let scopedVariableList = DefinitionVariablesUtils.getVariablesInScope(variableList, envId);

            if (this._setVariableDefaultValue(scopedVariableList[variableInput.name], variableInput)) {
                return;
            }
        }

        // if variable scoped to env is not found
        // search release variables
        let releaseVariableList = DefinitionVariablesUtils.getVariablesInScope(variableList, DTCVariableConstants.DefaultScopeKey);
        if (this._setVariableDefaultValue(releaseVariableList[variableInput.name], variableInput)) {
            return;
        }
    }

    /**
 * @brief Update the variables for each environment
 * @param {PipelineDefinition} definition 
 * @returns {PipelineDefinition} 
 */
    private _updateEnvironmentVariables(definition: PipelineDefinition): PipelineDefinition {
        if (definition.environments) {
            (definition.environments).forEach((environment: PipelineDefinitionEnvironment) => {
                this._updateEnvironmentVariablesAndVariableGroups(environment);
            });
        }

        return definition;
    }

    private _updateEnvironmentVariablesAndVariableGroups(environment: PipelineDefinitionEnvironment): PipelineDefinitionEnvironment {

        // reset the dictionary to populate it again from variables store
        environment.variables = {};

        environment.variables = this._getEnvironmentVariables(environment.id);

        let variableGroupReferences = this._variableGroupStore.getVariableGroupReferences();
        environment.variableGroups = DefinitionVariablesUtils.getVariableGroupReferencesInScope(variableGroupReferences, environment.id);

        return environment;
    }

    /**
 * @brief set the default value for variable input and return true if success
 * @param {PipelineVariable} variable 
 * @param {DistributedTask.TaskInputDefinition} variableInput 
 * @returns {boolean} 
 */
    private _setVariableDefaultValue(variable: PipelineVariable, variableInput: DistributedTask.TaskInputDefinition): boolean {
        if (variable) {
            let newDefaultValue: string = variable.isSecret ? "" : variable.value;
            if (!!newDefaultValue) {
                variableInput.defaultValue = newDefaultValue;
            }
            return true;
        }
        return false;
    }

    /**
     * @brief Updates the release variables in the pipelineDefinition
     * @param  {PipelineDefinition} definition
     * @returns PipelineDefinition
     */
    private _updateReleaseVariablesInDefinition(definition: PipelineDefinition): PipelineDefinition {

        // reset the dictionary to populate it again from variables store
        definition.variables = {};

        definition.variables = this._getReleaseVariables();

        //  Getting release level variabel groups
        definition = this._updateVariableGroups(definition);

        return definition;
    }

    /**
    * Updates the variable groups for the definition
    * 
    * @private
    * @param {PipelineDefinition} definition 
    * @returns {PipelineDefinition} 
    * @memberof VariablesListStore
    */
    private _updateVariableGroups(definition: PipelineDefinition): PipelineDefinition {

        let variableGroupReferences = this._variableGroupStore.getVariableGroupReferences();
        definition.variableGroups = DefinitionVariablesUtils.getVariableGroupReferencesInScope(variableGroupReferences, DTCVariableConstants.DefaultScopeKey);

        return definition;
    }
}