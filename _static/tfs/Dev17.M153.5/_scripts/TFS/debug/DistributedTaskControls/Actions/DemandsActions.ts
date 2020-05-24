
import { Action } from "VSS/Flux/Action";

import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";
import { IDemandData } from "DistributedTaskControls/Stores/DemandsStore";

export interface IDemandsPayload {
    demands: IDemandData[];
    forceUpdate?: boolean;
}

export interface IDemandKeyPayload {
    index: number;
    key: string;
}

export interface IDemandValuePayload {
    index: number;
    value: string;
}

export interface IDemandConditionPayload {
    index: number;
    condition: string;
}

export class DemandsActions extends ActionsHubBase {

    public initialize(): void {
        this._createDemands = new Action<IDemandsPayload>();
        this._updateDemands = new Action<IDemandsPayload>();
        this._updateDemandCondition = new Action<IDemandConditionPayload>();
        this._updateDemandKey = new Action<IDemandKeyPayload>();
        this._updateDemandValue = new Action<IDemandValuePayload>();
        this._deleteDemand = new Action<IDemandKeyPayload>();
        this._addDemand = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.DemandActions;
    }

    public get createDemands(): Action<IDemandsPayload> {
        return this._createDemands;
    }

    public get updateDemands(): Action<IDemandsPayload> {
        return this._updateDemands;
    }

    public get updateDemandCondition(): Action<IDemandConditionPayload> {
        return this._updateDemandCondition;
    }

    public get updateDemandKey(): Action<IDemandKeyPayload>{
        return this._updateDemandKey;
    }

    public get updateDemandValue(): Action<IDemandValuePayload> {
        return this._updateDemandValue;
    }

    public get deleteDemand(): Action<IDemandKeyPayload> {
        return this._deleteDemand;
    }

    public get addDemand(): Action<IEmptyActionPayload> {
        return this._addDemand;
    }

    private _createDemands: Action<IDemandsPayload>;
    private _updateDemands: Action<IDemandsPayload>;
    private _updateDemandCondition: Action<IDemandConditionPayload>;
    private _updateDemandKey: Action<IDemandKeyPayload>;
    private _updateDemandValue: Action<IDemandValuePayload>;
    private _deleteDemand: Action<IDemandKeyPayload>;
    private _addDemand: Action<IEmptyActionPayload>;
}