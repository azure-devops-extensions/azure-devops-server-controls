
import { IDefinitionVariable } from "DistributedTaskControls/Variables/Common/Types";

import { IEmptyActionPayload, ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { Action } from "VSS/Flux/Action";

export interface IVariableKeyPayload {
    index: number;
    key: string;
}

export interface IVariableValuePayload {
    index: number;
    variable: IDefinitionVariable;
}

export class ActionsBase extends ActionsHubBase {

    public initialize(instanceId?: string): void {
        this._updateVariableKey = new Action<IVariableKeyPayload>();
        this._updateVariableValue = new Action<IVariableValuePayload>();
        this._deleteVariable = new Action<IVariableKeyPayload>();
        this._addVariable = new Action<IEmptyActionPayload>();
    }

    public get updateVariableKey(): Action<IVariableKeyPayload> {
        return this._updateVariableKey;
    }

    public get updateVariableValue(): Action<IVariableValuePayload> {
        return this._updateVariableValue;
    }

    public get deleteVariable(): Action<IVariableKeyPayload> {
        return this._deleteVariable;
    }

    public get addVariable(): Action<IEmptyActionPayload> {
        return this._addVariable;
    }

    private _updateVariableKey: Action<IVariableKeyPayload>;
    private _updateVariableValue: Action<IVariableValuePayload>;
    private _deleteVariable: Action<IVariableKeyPayload>;
    private _addVariable: Action<IEmptyActionPayload>;
}