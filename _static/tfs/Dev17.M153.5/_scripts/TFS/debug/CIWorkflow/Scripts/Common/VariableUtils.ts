import { VariableList } from "DistributedTaskControls/Variables/Common/Types";

import { BuildDefinitionVariable } from "TFS/Build/Contracts";

export interface IVariableDictionary {
    [key: string]: BuildDefinitionVariable;
}

export class VariableUtils {

    public static convertVariablesDictionaryToArray(variablesDictionary: IVariableDictionary): VariableList {
        let variables: VariableList = [];
        for (let variableName in variablesDictionary) {
            if (variablesDictionary.hasOwnProperty(variableName)) {
                let variable = variablesDictionary[variableName];
                variables.push({
                    name: variableName,
                    variable: {
                        value: variable.value,
                        isSecret: variable.isSecret,
                        allowOverride: variable.allowOverride
                    }
                });
            }
        }
        return variables;
    }
}
