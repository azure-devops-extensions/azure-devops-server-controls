import { IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariableActionHubKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { ActionsBase } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import {
    IProcessVariableActionPayload,
    ISortOptions,
    ICloneScopedProcessVariablesPayload,
    IScopedProcessVariables,
} from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { Action } from "VSS/Flux/Action";

export class ProcessVariablesViewActions extends ActionsBase {

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._createProcessVariables = new Action<IProcessVariableActionPayload>();
        this._updateProcessVariables = new Action<IProcessVariableActionPayload>();
        this._sort = new Action<ISortOptions>();
        this._addScopedProcessVariables = new Action<IScopedProcessVariables>();
        this._cloneScopedProcessVariables = new Action<ICloneScopedProcessVariablesPayload>();
        this._updateScope = new Action<IScope>();
        this._deleteScope = new Action<IScope>();
        this._resetViewIndexToDataIndexMap = new Action<IEmptyActionPayload>();
        this._setAutoFocusInFlatViewTable = new Action<boolean>();
    }

    public static getKey(): string {
        return VariableActionHubKeys.VariablesSection_ViewActionsHub;
    }

    public get createProcessVariables(): Action<IProcessVariableActionPayload> {
        return this._createProcessVariables;
    }

    public get updateProcessVariables(): Action<IProcessVariableActionPayload> {
        return this._updateProcessVariables;
    }

    public get sort(): Action<ISortOptions> {
        return this._sort;
    }

    public get addScopedProcessVariables(): Action<IScopedProcessVariables> {
        return this._addScopedProcessVariables;
    }

    public get cloneScopedProcessVariables(): Action<ICloneScopedProcessVariablesPayload> {
        return this._cloneScopedProcessVariables;
    }

    public get updateScope(): Action<IScope> {
        return this._updateScope;
    }

    public get deleteScope(): Action<IScope> {
        return this._deleteScope;
    }

    public get resetViewIndexToDataIndexMap(): Action<IEmptyActionPayload> {
        return this._resetViewIndexToDataIndexMap;
    }

    public get setAutoFocusInFlatViewTable(): Action<boolean> {
        return this._setAutoFocusInFlatViewTable;
    }

    private _createProcessVariables: Action<IProcessVariableActionPayload>;
    private _updateProcessVariables: Action<IProcessVariableActionPayload>;
    private _sort: Action<ISortOptions>;
    private _addScopedProcessVariables: Action<IScopedProcessVariables>;
    private _cloneScopedProcessVariables: Action<ICloneScopedProcessVariablesPayload>;
    private _updateScope: Action<IScope>;
    private _deleteScope: Action<IScope>;
    private _resetViewIndexToDataIndexMap: Action<IEmptyActionPayload>;
    private _setAutoFocusInFlatViewTable: Action<boolean>;
}