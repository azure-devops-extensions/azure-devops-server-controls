import { VariableActionHubKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { ActionsBase } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";

export class RuntimeVariablesActions extends ActionsBase {
    
    public static getKey(): string {
        return VariableActionHubKeys.RuntimeVariables_ActionsHub;
    }
}