
import TaskTypes = require("DistributedTasksCommon/TFS.Tasks.Types");
import VariablesListViewModel = require("Build/Scripts/VariablesListViewModel");
import BuildDefinitionVariableViewModel = require("Build/Scripts/BuildDefinitionVariableViewModel");
import Utils_Array = require("VSS/Utils/Array");

export class MetaTaskVariableProvider implements TaskTypes.IVariableProvider {

    constructor(variablesList: VariablesListViewModel.VariablesListViewModel) {
        this._variablesList = variablesList;
    }

    public isSystemVariable(variable: string): boolean {
        return false;
    }

    public getVariableValue(variable: string): string {
        var value: string = null;

        if (this._variablesList && this._variablesList.variables.peek()) {
            var variables = this._variablesList.variables.peek();

            var selectedVariable: BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel = Utils_Array.first(variables, (buildVariable: BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel) => {
                return buildVariable.name.peek().toLowerCase() === variable.toLowerCase();
            });

            if (selectedVariable) {
                return selectedVariable.value.peek();
            }
        }

        return value;
    }

    private _variablesList: VariablesListViewModel.VariablesListViewModel;
}
