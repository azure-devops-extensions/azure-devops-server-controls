import { ActionsBase } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { VariableActionHubKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { ISortOptions } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";

import { Action } from "VSS/Flux/Action";

export interface IVariableAtIndexUpdate {
    index: number;
    newValue: string;
}

export class CounterVariableActions extends ActionsBase {
    public initialize(): void {
        super.initialize();

        this._setVariables = new Action<any>();
        this._updateVariableName = new Action<IVariableAtIndexUpdate>();
        this._updateVariableSeed = new Action<IVariableAtIndexUpdate>();
        this._resetVariableValue = new Action<number>();
        this._sort = new Action<ISortOptions>();
    }

    public static getKey(): string {
        return VariableActionHubKeys.CounterVariables_ActionHub;
    }

    public get setVariables(): Action<any> {
        return this._setVariables;
    }

    public get updateVariableName(): Action<IVariableAtIndexUpdate> {
        return this._updateVariableName;
    }

    public get updateVariableSeed(): Action<IVariableAtIndexUpdate> {
        return this._updateVariableSeed;
    }

    public get resetVariableValue(): Action<number> {
        return this._resetVariableValue;
    }

    public get sort(): Action<ISortOptions> {
        return this._sort;
    }

    private _setVariables: Action<any>;
    private _updateVariableName: Action<IVariableAtIndexUpdate>;
    private _updateVariableSeed: Action<IVariableAtIndexUpdate>;
    private _resetVariableValue: Action<number>;

    private _sort: Action<ISortOptions>;
}
