import { ICounterVariable } from "../Types";
import { CounterVariableActions } from "./CounterVariableActions";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { VariablesActionCreatorBase } from "DistributedTaskControls/Variables/Common/Actions/VariablesActionCreatorBase";
import { VariableActionCreatorKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { ISortOptions } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";

export class CounterVariableActionsCreator extends VariablesActionCreatorBase {
    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<CounterVariableActions>(CounterVariableActions);
    }

    public static getKey(): string {
        return VariableActionCreatorKeys.CounterVariables_ActionCreator;
    }

    public sort(options: ISortOptions): void {
        this.getActionsHub().sort.invoke(options);
    }

    protected getActionsHub(): CounterVariableActions {
        return this._actions;
    }

    public addVariable(payload: IEmptyActionPayload): void {
        this.getActionsHub().addVariable.invoke(payload);
    }

    public updateVariableName(variableIndex: number, newName: string): void {
        this.getActionsHub().updateVariableName.invoke({ index: variableIndex, newValue: newName });
    }

    public updateVariableSeed(variableIndex: number, newSeed: string): void {
        this.getActionsHub().updateVariableSeed.invoke({ index: variableIndex, newValue: newSeed });
    }

    public resetVariableValue(variableIndex: number): void {
        this.getActionsHub().resetVariableValue.invoke(variableIndex);
    }

    public createCounterVariables(payload: IDictionaryStringTo<ICounterVariable>): void {
        this.getActionsHub().setVariables.invoke(payload);
    }

    public updateCounterVariables(payload: IDictionaryStringTo<ICounterVariable>): void {
        this.getActionsHub().setVariables.invoke(payload);
    }

    private _actions: CounterVariableActions;
}
