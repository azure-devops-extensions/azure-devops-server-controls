import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariableGroupDataStore } from "DistributedTaskControls/Variables/VariableGroup/Store/VariableGroupDataStore";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { VariableGroupActions, IStatus } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IUpdateScopePermissionsActionPayload } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";

import { IGroup } from "OfficeFabric/DetailsList";

import { VariableValue } from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";

export interface IVariableItem {
    name: string;
    value: string;
    isSecret: boolean;
}

export interface IVariableGroupViewState {
    groupIndexToFocus?: number;
    status: IStatus;
    items: IVariableItem[];
    groups: IGroup[];
    scopes?: IScope[];
    variableGroupsDisabledMode?: boolean;
}

// ViewStore to keep track of UI properties like Expand, Collapse of groups across mount and unmount
export class VariableGroupViewStore extends ViewStoreBase {

    public initialize(): void {

        this._state = {} as IVariableGroupViewState;

        this._actionsHub = ActionsHubManager.GetActionsHub<VariableGroupActions>(VariableGroupActions);
        this._actionsHub.collapseVariableGroup.addListener(this._handleCollapseVariableGroup);
        this._actionsHub.expandVariableGroup.addListener(this._handleExpandVariableGroup);

        this._dataStore = StoreManager.GetStore<VariableGroupDataStore>(VariableGroupDataStore);
        this._dataStore.addChangedListener(this._onDataStoreChanged);

        this._onDataStoreChanged();
    }

    public disposeInternal(): void {
        this._actionsHub.collapseVariableGroup.removeListener(this._handleCollapseVariableGroup);
        this._actionsHub.expandVariableGroup.removeListener(this._handleExpandVariableGroup);

        this._dataStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IVariableGroupViewState {
        return this._state;
    }

    public static getKey(): string {
        return StoreKeys.VariableGroupViewStore;
    }

    public getScopePermissionsPayload(): IUpdateScopePermissionsActionPayload {
        return this._dataStore.getScopePermissionsPayload();
    }

    private _onDataStoreChanged = (): void => {
        this._setNextFocusIfRequired();
        this._updateState();
        this.emitChanged();
    }

    private _updateState() {

        let { variableGroups, status, scopes, variableGroupsDisabledMode } = this._dataStore.getState();

        let groups: IGroup[] = [];
        let items: IVariableItem[] = [];
        let startIndex: number = 0;

        variableGroups = variableGroups || [];
        let permissionsPayload = this.getScopePermissionsPayload();

        for (const variableGroup of variableGroups) {

            let variables = variableGroup.variables;
            let countOfVariables: number;

            if (variables && Object.keys(variables).length > 0) {
                countOfVariables = Object.keys(variables).length;
                items.push(...this._convertVariablesToVariableItems(variables));
            }
            else {
                countOfVariables = 1;
                items.push(...this._getMockVariableItems());
            }

            const groupId = String(variableGroup.id);
            groups.push({
                key: groupId,
                name: variableGroup.name,
                startIndex: startIndex,
                count: countOfVariables,
                data: { variableGroup, scopes, permissionsPayload },
                isCollapsed: this._isGroupCollapsed(groupId)
            });

            startIndex = startIndex + countOfVariables;
        }

        this._state.status = status;
        this._state.groups = groups;
        this._state.items = items;
        this._state.scopes = scopes;
        this._state.variableGroupsDisabledMode = !!variableGroupsDisabledMode;
    }

    private _getMockVariableItems(): IVariableItem[] {
        return [{ name: Utils_String.empty, value: Utils_String.empty } as IVariableItem];
    }

    private _convertVariablesToVariableItems(variables: IDictionaryStringTo<VariableValue>): IVariableItem[] {

        if (!variables) {
            variables = {};
        }

        return Object.keys(variables).map((key: string) => {

            const isSecret = variables[key] ? !!(variables[key].isSecret) : false;
            const value = isSecret ?
                "********" :
                (variables[key] ? variables[key].value : Utils_String.empty);

            return {
                name: key,
                value: value,
                isSecret: isSecret
            } as IVariableItem;
        });
    }

    private _isGroupCollapsed(groupKey: string) {

        let group = this._getGroup(groupKey);
        if (group) {
            return group.isCollapsed;
        }

        return true;
    }

    private _setNextFocusIfRequired(): void {
        this._state.groupIndexToFocus = this._dataStore.getLastVariableGroupDeletedIndex();
    }

    private _handleCollapseVariableGroup = (groupKey: string): void => {
        let group = this._getGroup(groupKey);

        if (group) {
            group.isCollapsed = true;
        }
        else {
            Diag.logError(Utils_String.format("[VariableGroupViewStore._handleCollapseVariableGroup] collpase action called on non existent group with key {0}", groupKey));
        }

        this.emitChanged();
    }

    private _handleExpandVariableGroup = (groupKey: string): void => {
        let group = this._getGroup(groupKey);

        if (group) {
            group.isCollapsed = false;
        }
        else {
            Diag.logError(Utils_String.format("[VariableGroupViewStore._handleCollapseVariableGroup] expand action called on non existent group with key {0}", groupKey));
        }

        this.emitChanged();
    }

    private _getGroup(groupKey: string): IGroup {

        let group: IGroup;
        let matchingGroups = this._state.groups && this._state.groups.filter((group: IGroup) => {
            return group.key === groupKey;
        });

        if (matchingGroups && matchingGroups.length === 1) {
            group = matchingGroups[0];
        }

        return group;
    }

    private _actionsHub: VariableGroupActions;
    private _dataStore: VariableGroupDataStore;
    private _state: IVariableGroupViewState;
}

