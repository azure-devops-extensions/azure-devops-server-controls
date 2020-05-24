import { Action } from "VSS/Flux/Action";

import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";
import { IDefinitionVariableGroup, IScope, IVariableGroupReference } from "DistributedTaskControls/Variables/Common/Types";
import { IUpdateScopePermissionsActionPayload } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";
import * as Contracts from "TFS/DistributedTask/Contracts";

export interface IUpdateVariableGroupsPayload {

    // References of the variable groups requested
    groupReferences: IVariableGroupReference[];

    // Incase a variable group linked in a definition gets deleted, result will not contain an entry corresponding to that variable group.
    result: Contracts.VariableGroup[];

    scopes?: IScope[];
}

export enum Status {
    UnKnown,
    Success,
    Failure,
    InProgress
}

export interface IStatus {
    status: Status;
    message?: string;
}

export interface IUpdateScopeSelectionPayload {
    selectedScopes: IScope[];
    restore?: boolean;
}

export interface IInitializeScopeSelectionPayload {
    scopes: IScope[];
    selectedScopes?: IScope[];
    scopePermissionsPayload?: IUpdateScopePermissionsActionPayload;
}

export interface IAddScopedVariableGroupsPayload {
    groupIds: number[];
    result: Contracts.VariableGroup[];
    scope: IScope;
}

export interface IToggleVariableGroupsEditModePayload {
    editMode: boolean;
}

export interface ICloneScopedVariableGroupsPayload {
    sourceScopeKey: number;
    targetScope: IScope;
}

export interface IShowEditVariableGroupPanelPayload {
    show: boolean;
    variableGroup?: IDefinitionVariableGroup;
}

export class VariableGroupActions extends ActionsHubBase {

    public initialize(): void {
        this._initializeVariableGroups = new Action<IUpdateVariableGroupsPayload>();
        this._updateVariableGroups = new Action<IUpdateVariableGroupsPayload>();
        this._collapseVariableGroup = new Action<string>();
        this._expandVariableGroup = new Action<string>();
        this._addVariableGroups = new Action<IDefinitionVariableGroup[]>();
        this._updateVariableGroup = new Action<IDefinitionVariableGroup>();
        this._deleteVariableGroup = new Action<number>();
        this._showLinkVariableGroupPanel = new Action<boolean>();
        this._showEditVariableGroupPanel = new Action<IShowEditVariableGroupPanelPayload>();
        this._fetchLinkableVariableGroups = new Action<Contracts.VariableGroup[]>();
        this._filterVariableGroups = new Action<string>();
        this._refreshVariableGroupStatus = new Action<IStatus>();
        this._refreshLinkableVariableGroupStatus = new Action<IStatus>();
        this._showPanelInfoMessage = new Action<boolean>();
        this._updateScope = new Action<IScope>();
        this._deleteScope = new Action<IScope>();
        this._updateScopeSelection = new Action<IUpdateScopeSelectionPayload>();
        this._initializeScopeSelection = new Action<IInitializeScopeSelectionPayload>();
        this._addScopedVariableGroups = new Action<IAddScopedVariableGroupsPayload>();
        this._cloneScopedVariableGroups = new Action<ICloneScopedVariableGroupsPayload>();
        this._updateScopePermissions = new Action<IUpdateScopePermissionsActionPayload>();
        this._toggleEditMode = new Action<IToggleVariableGroupsEditModePayload>();
    }

    public static getKey(): string {
        return ActionsKeys.VariableGroupActions;
    }

    public get initializeVariableGroups(): Action<IUpdateVariableGroupsPayload> {
        return this._initializeVariableGroups;
    }

    public get toggleEditMode(): Action<IToggleVariableGroupsEditModePayload> {
        return this._toggleEditMode;
    }

    public get updateVariableGroups(): Action<IUpdateVariableGroupsPayload> {
        return this._updateVariableGroups;
    }

    public get addVariableGroups(): Action<IDefinitionVariableGroup[]> {
        return this._addVariableGroups;
    }

    public get updateVariableGroup(): Action<IDefinitionVariableGroup> {
        return this._updateVariableGroup;
    }

    public get deleteVariableGroup(): Action<number> {
        return this._deleteVariableGroup;
    }

    public get fetchLinkableVariableGroups(): Action<Contracts.VariableGroup[]> {
        return this._fetchLinkableVariableGroups;
    }

    public get addScopedVariableGroups(): Action<IAddScopedVariableGroupsPayload> {
        return this._addScopedVariableGroups;
    }

    public get cloneScopedVariableGroups(): Action<ICloneScopedVariableGroupsPayload> {
        return this._cloneScopedVariableGroups;
    }

    public get updateScopePermissions(): Action<IUpdateScopePermissionsActionPayload> {
        return this._updateScopePermissions;
    }

    /* View Store Actions */
    public get showLinkVariableGroupPanel(): Action<boolean> {
        return this._showLinkVariableGroupPanel;
    }

    public get expandVariableGroup(): Action<string> {
        return this._expandVariableGroup;
    }

    public get collapseVariableGroup(): Action<string> {
        return this._collapseVariableGroup;
    }

    public get filterVariableGroups(): Action<string> {
        return this._filterVariableGroups;
    }

    public get updateInitializeVariableGroupsStatus(): Action<IStatus> {
        return this._refreshVariableGroupStatus;
    }

    public get updateFetchLinkableVariableGroupStatus(): Action<IStatus> {
        return this._refreshLinkableVariableGroupStatus;
    }

    /* Scope Actions */
    public get updateScope(): Action<IScope> {
        return this._updateScope;
    }

    public get deleteScope(): Action<IScope> {
        return this._deleteScope;
    }

    public get updateScopeSelection(): Action<IUpdateScopeSelectionPayload> {
        return this._updateScopeSelection;
    }

    public get initializeScopeSelection(): Action<IInitializeScopeSelectionPayload> {
        return this._initializeScopeSelection;
    }

    public get showEditVariableGroupPanel(): Action<IShowEditVariableGroupPanelPayload> {
        return this._showEditVariableGroupPanel;
    }


    private _initializeVariableGroups: Action<IUpdateVariableGroupsPayload>;
    private _updateVariableGroups: Action<IUpdateVariableGroupsPayload>;
    private _expandVariableGroup: Action<string>;
    private _collapseVariableGroup: Action<string>;
    private _addVariableGroups: Action<IDefinitionVariableGroup[]>;
    private _updateVariableGroup: Action<IDefinitionVariableGroup>;
    private _deleteVariableGroup: Action<number>;
    private _showLinkVariableGroupPanel: Action<boolean>;
    private _showEditVariableGroupPanel: Action<IShowEditVariableGroupPanelPayload>;
    private _fetchLinkableVariableGroups: Action<Contracts.VariableGroup[]>;
    private _filterVariableGroups: Action<string>;
    private _refreshVariableGroupStatus: Action<IStatus>;
    private _refreshLinkableVariableGroupStatus: Action<IStatus>;
    private _showPanelInfoMessage: Action<boolean>;
    private _updateScope: Action<IScope>;
    private _toggleEditMode: Action<IToggleVariableGroupsEditModePayload>;
    private _deleteScope: Action<IScope>;
    private _updateScopeSelection: Action<IUpdateScopeSelectionPayload>;
    private _initializeScopeSelection: Action<IInitializeScopeSelectionPayload>;
    private _addScopedVariableGroups: Action<IAddScopedVariableGroupsPayload>;
    private _cloneScopedVariableGroups: Action<ICloneScopedVariableGroupsPayload>;
    private _updateScopePermissions: Action<IUpdateScopePermissionsActionPayload>;
}