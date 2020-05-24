import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IDefinitionVariableReference } from "DistributedTaskControls/Variables/Common/Types";
import { CounterVariableDataStore, ICounterVariableItem } from "DistributedTaskControls/Variables/CounterVariables/Store/CounterVariableDataStore";
import { ICounterVariable } from "DistributedTaskControls/Variables/CounterVariables/Types";
import { ProcessVariablesV2Store } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";
import { VariableGroupDataStore } from "DistributedTaskControls/Variables/VariableGroup/Store/VariableGroupDataStore";
import { VariablesListBaseStore } from "DistributedTaskControls/Variables/VariablesListBaseStore";

import * as BuildContracts from "TFS/Build/Contracts";
import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Utils_String from "VSS/Utils/String";
import { BuildDefinition } from "../BuildDefinitionView";


export class VariablesListStore extends VariablesListBaseStore {
    private _processVariablesStore: ProcessVariablesV2Store;
    private _variableGroupStore: VariableGroupDataStore;
    private _counterVariablesStore: CounterVariableDataStore;

    /**
     * @brief Initialize the child stores
     * @returns void
     */
    public initialize(): void {
        super.initialize();

        /* CHILD STORES - START */

        this._processVariablesStore = StoreManager.GetStore<ProcessVariablesV2Store>(ProcessVariablesV2Store);
        this.stores.push(this._processVariablesStore);

        this._variableGroupStore = StoreManager.GetStore<VariableGroupDataStore>(VariableGroupDataStore);
        this.stores.push(this._variableGroupStore);

        /* CHILD STORES - END */

        super.initializeChildStoreListeners();
    }

    /**
     * @brief Updates the variables of the Build definition contract
     * @param {BuildDefinition} buildDefinition
     * @returns BuildDefinition
     */
    public updateVisitor(definition: BuildContracts.BuildDefinition): BuildContracts.BuildDefinition {
        definition = this._updateProcessVariablesInDefinition(definition);
        definition = this._updateVariableGroups(definition);

        return definition;
    }

    /**
     * retuns the variable value from the list of variables
     *
     * @param {string} key
     * @returns {string}
     *
     * @memberOf VariablesListStore
     */
    public resolveVariable(variableInput: TaskInputDefinition, scopeInstanceId?: string): void {
        const variableList: IDefinitionVariableReference[] = this._processVariablesStore.getVariableList();
        let variable: IDefinitionVariableReference;

        const filteredVariables = variableList.filter((currentVariable: IDefinitionVariableReference) => {
            return currentVariable.name === variableInput.name;
        });

        if (filteredVariables && filteredVariables.length > 0) {
            variable = filteredVariables[0];
            const newDefaultValue: string = variable.variable.isSecret ? Utils_String.empty : variable.variable.value;
            if (!!newDefaultValue) {
                variableInput.defaultValue = newDefaultValue;
            }
        }
        else {
            variableInput.defaultValue = Utils_String.empty;
        }
    }

    private _updateProcessVariablesInDefinition(definition: BuildContracts.BuildDefinition): BuildContracts.BuildDefinition {

        // Reset the dictionary to populate it again from processVariableStore
        definition.variables = {};

        const definitionVariables = this._processVariablesStore.getVariableList();

        definitionVariables.forEach((variable: IDefinitionVariableReference) => {

            // Ignore any variable where name is not defined
            if (!!variable.name) {
                definition.variables[variable.name] = variable.variable as BuildContracts.BuildDefinitionVariable;
            }
        });

        return definition;
    }

    private _updateVariableGroups(definition: BuildContracts.BuildDefinition): BuildContracts.BuildDefinition {
        definition.variableGroups = this._variableGroupStore.getVariableGroupIds().map((id: number) => {
            return {
                id: id
            } as BuildContracts.VariableGroup;
        });
        return definition;
    }
}
