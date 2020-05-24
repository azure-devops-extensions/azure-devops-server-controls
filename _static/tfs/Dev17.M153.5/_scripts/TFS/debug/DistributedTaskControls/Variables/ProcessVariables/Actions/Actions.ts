import { VariableList, IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariableActionHubKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { ActionsBase } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";

import { Action } from "VSS/Flux/Action";

export interface IScopePermission {
    scopeKey: number;
    hasPermission: boolean;
}

export interface IProcessVariableActionPayload {
    definitionId: number;
    variableList: VariableList;
    scopes?: IScope[];
    skipSystemVariables?: boolean;
    forceUpdate?: boolean;
    disabledMode?: boolean;
    hideAddVariables?: boolean;
}

export interface IUpdateScopePermissionsActionPayload {

    scopePermissions: IScopePermission[];

    hasDefinitionEditPermission: boolean;

    permissionWarningMessage: string;
}

export interface IToggleProcessVariableEditModePayload {
    editMode: boolean;
}

export interface ISortOptions {
    columnKey: string;
    isSortedDescending: boolean;
}

export interface IScopedProcessVariables {
    variableList: VariableList;
    scope: IScope;
}

export interface ICloneScopedProcessVariablesPayload {
    sourceScopeKey: number;
    targetScope: IScope;
}

export class ProcessVariablesActions extends ActionsBase {

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._createProcessVariables = new Action<IProcessVariableActionPayload>();
        this._updateProcessVariables = new Action<IProcessVariableActionPayload>();
        this._updateScopePermissions = new Action<IUpdateScopePermissionsActionPayload>();
        this._sort = new Action<ISortOptions>();
        this._addScopedProcessVariables = new Action<IScopedProcessVariables>();
        this._cloneScopedProcessVariables = new Action<ICloneScopedProcessVariablesPayload>();
        this._updateScope = new Action<IScope>();
        this._deleteScope = new Action<IScope>();
        this._toggleEditMode = new Action<IToggleProcessVariableEditModePayload>();
    }

    public static getKey(): string {
        return VariableActionHubKeys.VariablesSection_ActionsHub;
    }

    public get createProcessVariables(): Action<IProcessVariableActionPayload> {
        return this._createProcessVariables;
    }

    public get updateProcessVariables(): Action<IProcessVariableActionPayload> {
        return this._updateProcessVariables;
    }

    public get updateScopePermissions(): Action<IUpdateScopePermissionsActionPayload> {
        return this._updateScopePermissions;
    }

    public get sort(): Action<ISortOptions> {
        return this._sort;
    }

    public get toggleEditMode(): Action<IToggleProcessVariableEditModePayload> {
        return this._toggleEditMode;
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

    private _createProcessVariables: Action<IProcessVariableActionPayload>;
    private _updateProcessVariables: Action<IProcessVariableActionPayload>;
    private _updateScopePermissions: Action<IUpdateScopePermissionsActionPayload>;
    private _sort: Action<ISortOptions>;
    private _addScopedProcessVariables: Action<IScopedProcessVariables>;
    private _cloneScopedProcessVariables: Action<ICloneScopedProcessVariablesPayload>;
    private _updateScope: Action<IScope>;
    private _toggleEditMode: Action<IToggleProcessVariableEditModePayload>;
    private _deleteScope: Action<IScope>;
}