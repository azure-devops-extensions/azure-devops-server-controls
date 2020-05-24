
import { Variable } from "DistributedTask/Scripts/DT.VariableGroup.Model";

import { VariableList, IDefinitionVariableReference } from "DistributedTaskControls/Variables/Common/Types";

export class VariablesConverter {

    public static toProcessVariable(variables: Variable[]): VariableList {

        return variables.map( (variable: Variable) => {
            return {
                name: variable.name,
                variable: {
                    value: variable.value,
                    isSecret: variable.isSecret,
                    hasSecretValueBeenReset: variable.hasSecretValueBeenReset,
                    hasVariableBeenUpdatedByUser: variable.hasVariableBeenUpdatedByUser
                }
            } as IDefinitionVariableReference;
        });
    }

    public static toModelVariable(variableList: VariableList): Variable[] {

        return variableList.map((variable: IDefinitionVariableReference) => {
            return {
                name: variable.name,
                value: variable.variable.value,
                isSecret: variable.variable.isSecret
            } as Variable;
        });
    }
}