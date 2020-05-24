import { VariablesActionCreatorBase } from "DistributedTaskControls/Variables/Common/Actions/VariablesActionCreatorBase";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { RuntimeVariablesActions } from "DistributedTaskControls/Variables/RuntimeVariables/Actions/Actions";
import { VariableActionCreatorKeys } from "DistributedTaskControls/Variables/Common/Constants";

export class RuntimeVariablesActionCreator extends VariablesActionCreatorBase {

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<RuntimeVariablesActions>(RuntimeVariablesActions);
    }

    public static getKey(): string {
        return VariableActionCreatorKeys.RuntimeVariables_ActionCreator;
    }

    protected getActionsHub(): RuntimeVariablesActions {
        return this._actions;
    }

    private _actions: RuntimeVariablesActions;
}
