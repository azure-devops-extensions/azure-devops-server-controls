import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IDefinitionVariableGroup, IScope, IVariableGroupReference } from "DistributedTaskControls/Variables/Common/Types";
import { VariableGroupActions, IUpdateVariableGroupsPayload, IStatus,
        Status, ICloneScopedVariableGroupsPayload, IAddScopedVariableGroupsPayload, 
        IToggleVariableGroupsEditModePayload } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { VariableGroupUtility } from "DistributedTaskControls/Variables/VariableGroup/VariableGroupUtility";
import { ChangeTrackerStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { IUpdateScopePermissionsActionPayload } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";

import { VariableGroup } from "TFS/DistributedTask/Contracts";

import * as Diag from "VSS/Diag";
import * as Utils_Array from "VSS/Utils/Array";

export interface IVariableGroupState {
    status: IStatus;
    variableGroups: IDefinitionVariableGroup[];
    scopes?: IScope[];
    variableGroupsDisabledMode?: boolean;
}

export class VariableGroupDataStore extends ChangeTrackerStoreBase {

    constructor() {
        super();

        this._originalState = { variableGroups: [], status: { status: Status.UnKnown } };
        this._currentState = { variableGroups: [], status: { status: Status.UnKnown } };

        this._lastVariableGroupDeletedIndex = -1;
    }

    public initialize(instanceId: string) {
        this._actionsHub = ActionsHubManager.GetActionsHub<VariableGroupActions>(VariableGroupActions, instanceId);
        this._actionsHub.initializeVariableGroups.addListener(this._handleInitializeVariableGroups);
        this._actionsHub.updateVariableGroups.addListener(this._handleUpdateVariableGroups);
        this._actionsHub.addVariableGroups.addListener(this._handleAddVariableGroups);
        this._actionsHub.updateVariableGroup.addListener(this._handleupdateVariableGroup);
        this._actionsHub.deleteVariableGroup.addListener(this._handleDeleteVariableGroup);
        this._actionsHub.updateInitializeVariableGroupsStatus.addListener(this._handleupdateInitializeVariableGroupsStatus);
        this._actionsHub.deleteScope.addListener(this._handleDeleteScope);
        this._actionsHub.updateScope.addListener(this._handleUpdateScope);
        this._actionsHub.addScopedVariableGroups.addListener(this._handleAddScopedVariableGroups);
        this._actionsHub.cloneScopedVariableGroups.addListener(this._handleCloneScopedVariableGroups);
        this._actionsHub.updateScopePermissions.addListener(this._handleUpdateScopePermissions);
        this._actionsHub.toggleEditMode.addListener(this._handleToggleEditMode);
    }

    public static getKey(): string {
        return StoreKeys.VariableGroupDataStore;
    }

    public getState(): IVariableGroupState {
        return this._currentState;
    }

    public getVariableGroupIds(): number[] {
        const groups = this._currentState.variableGroups || [];
        return groups.map((variableGroup: IDefinitionVariableGroup) => {
            return variableGroup.id;
        });
    }

    public getVariableGroupReferences(): IVariableGroupReference[] {
        const groups = this._currentState.variableGroups || [];
        return groups.map((variableGroup: IDefinitionVariableGroup) => {
            const scopes = variableGroup.scopes || [];
            return scopes.map((scope: IScope) => {
                return { groupId: variableGroup.id, scope: scope} as IVariableGroupReference;
            });
        }).reduce((result: IVariableGroupReference[], next: IVariableGroupReference[]) => {
            return result.concat(next);
        }, []);
    }

    public getLastVariableGroupDeletedIndex(): number {
        return this._lastVariableGroupDeletedIndex;
    }

    public getScopePermissionsPayload(): IUpdateScopePermissionsActionPayload {
        return this._scopePermissionsPayload;
    }

    protected disposeInternal(): void {
        this._actionsHub.initializeVariableGroups.removeListener(this._handleInitializeVariableGroups);
        this._actionsHub.updateVariableGroups.removeListener(this._handleUpdateVariableGroups);
        this._actionsHub.addVariableGroups.removeListener(this._handleAddVariableGroups);
        this._actionsHub.updateVariableGroup.removeListener(this._handleupdateVariableGroup);
        this._actionsHub.deleteVariableGroup.removeListener(this._handleDeleteVariableGroup);
        this._actionsHub.updateInitializeVariableGroupsStatus.removeListener(this._handleupdateInitializeVariableGroupsStatus);
        this._actionsHub.deleteScope.removeListener(this._handleDeleteScope);
        this._actionsHub.updateScope.removeListener(this._handleUpdateScope);
        this._actionsHub.addScopedVariableGroups.removeListener(this._handleAddScopedVariableGroups);
        this._actionsHub.cloneScopedVariableGroups.removeListener(this._handleCloneScopedVariableGroups);
        this._actionsHub.updateScopePermissions.removeListener(this._handleUpdateScopePermissions);
        this._actionsHub.toggleEditMode.removeListener(this._handleToggleEditMode);
    }

    private _handleInitializeVariableGroups = (variableGroupsPayload: IUpdateVariableGroupsPayload) => {
        this._lastVariableGroupDeletedIndex = -1;
        this._handleInitializeOrUpdateVariableGroups(variableGroupsPayload);
        this.emitChanged();
    }

    private _handleToggleEditMode = (payload: IToggleVariableGroupsEditModePayload): void => {
        // By default everything will be non-editable
        // Will remove this in edit of variables
        payload.editMode = false;

        this._originalState.variableGroupsDisabledMode = !payload.editMode;
        this._currentState.variableGroupsDisabledMode = !payload.editMode;

        this.emitChanged();
    }

    private _handleUpdateVariableGroups = (variableGroupsPayload: IUpdateVariableGroupsPayload) => {
        this._lastVariableGroupDeletedIndex = -1;
        this._handleInitializeOrUpdateVariableGroups(variableGroupsPayload);
        this.emitChanged();
    }

    private _handleAddVariableGroups = (variableGroups: IDefinitionVariableGroup[]) => {
        this._lastVariableGroupDeletedIndex = -1;
        this._currentState.variableGroups.push(...variableGroups);
        this.emitChanged();
    }

    private _handleDeleteVariableGroup = (variableGroupId: number) => {

        let variableGroups = this._currentState.variableGroups;

        // find the variable group with the given variableGroupId
        let filteredVariableGroups = variableGroups.filter((variableGroup: IDefinitionVariableGroup) => {
            return variableGroup.id === variableGroupId;
        });

        if (filteredVariableGroups && filteredVariableGroups.length === 1) {

            // find the index of the variable group to delete
            let index = variableGroups.indexOf(filteredVariableGroups[0]);
            if (index > -1) {

                this._lastVariableGroupDeletedIndex = index;

                // remove the variable group object from the array
                variableGroups.splice(index, 1);
                this.emitChanged();
            }
            else {
                Diag.logError("[VariableGroupDataStore._handleDeleteVariableGroup] could not find index of variable group to delete, something went wrong!");
            }
        }
        else {
            Diag.logError("[VariableGroupDataStore._handleDeleteVariableGroup] delete variableGroup called for multiple or non existent variable group with id: " + variableGroupId);
        }
    }

    private _handleInitializeOrUpdateVariableGroups(variableGroupsPayload: IUpdateVariableGroupsPayload) {
        let groupReferences = variableGroupsPayload.groupReferences || [];
        let groupIds = groupReferences.map((groupReference: IVariableGroupReference) => { return groupReference.groupId; }) || [];
        
        let distinctGroupIds = groupIds.filter((groupId: number, index: number) => {
            return groupIds.indexOf(groupId) === index;
        }) || [];

        let variableGroups: IDefinitionVariableGroup[] = variableGroupsPayload.result.map((result: VariableGroup) => {
            return {scopes: [], ...result};
        }) || [];

        variableGroups = VariableGroupUtility.addVariableGroupsForMissingEntries(distinctGroupIds, variableGroups);
        variableGroups = VariableGroupUtility.preserveVariableGroupsOrder(variableGroups, distinctGroupIds);
        this._addScopesToVariableGroups(variableGroups, groupReferences);

        this._originalState.variableGroups = this._cloneVariableGroups(variableGroups);
        this._currentState.variableGroups = this._cloneVariableGroups(variableGroups);
        this._currentState.scopes = variableGroupsPayload.scopes;
    }

    private _handleupdateInitializeVariableGroupsStatus = (status: IStatus): void => {
        this._lastVariableGroupDeletedIndex = -1;
        this._currentState.status = status;
        this.emitChanged();
    }

    private _handleDeleteScope = (scopeToDelete: IScope): void => {
        const variableGroups = this._currentState.variableGroups || [];
        this._currentState.variableGroups = variableGroups.reduce<IDefinitionVariableGroup[]>(
            (result: IDefinitionVariableGroup[], currentVariableGroup: IDefinitionVariableGroup) => {
                if (!!currentVariableGroup.scopes && (currentVariableGroup.scopes.length !== 1 || currentVariableGroup.scopes[0].key !== scopeToDelete.key)) {
                    currentVariableGroup.scopes = currentVariableGroup.scopes.filter((scope: IScope) => { return scope.key !== scopeToDelete.key; });
                    result.push(currentVariableGroup);
                }

                return result;
            },
            []
        );

        const scopes = this._currentState.scopes || [];
        this._currentState.scopes = scopes.filter((scope: IScope) => { return scope.key !== scopeToDelete.key; });
        this.emitChanged();
    }

    private _handleUpdateScope = (scopeToUpdate: IScope): void => {
        const variableGroups = this._currentState.variableGroups || [];
        variableGroups.forEach((variableGroup: IDefinitionVariableGroup) => {
            this._findAndUpdateScope(variableGroup.scopes, scopeToUpdate);
        });

        this._findAndUpdateScope(this._currentState.scopes, scopeToUpdate);
        this.emitChanged();
    }

    private _handleAddScopedVariableGroups = (payload: IAddScopedVariableGroupsPayload): void => {
        let variableGroups: IDefinitionVariableGroup[] = payload.result.map((result: VariableGroup) => {
            return {scopes: [], ...result};
        }) || [];

        let currentVariableGroups: IDefinitionVariableGroup[] = this._currentState.variableGroups || [];

        variableGroups = VariableGroupUtility.addVariableGroupsForMissingEntries(payload.groupIds, variableGroups);

        variableGroups.forEach((variableGroup: IDefinitionVariableGroup) => {
            let existingGroup = Utils_Array.first(currentVariableGroups, (currentVariableGroup: IDefinitionVariableGroup) => {
                return currentVariableGroup.id === variableGroup.id;
            });

            // if the variable group already exisits just add the new scope to it, otherwise add the variable group
            if (!!existingGroup) {
                existingGroup.scopes.push(payload.scope);
            }
            else {
                variableGroup.scopes.push(payload.scope);
                currentVariableGroups.push(variableGroup);
            }
        });

        this._currentState.variableGroups = currentVariableGroups;
        this._currentState.scopes.push(payload.scope);
        this.emitChanged();
    }

    private _handleCloneScopedVariableGroups = (payload: ICloneScopedVariableGroupsPayload): void => {
        const variableGroups: VariableGroup[] = this._currentState.variableGroups || [];
        variableGroups.forEach((variableGroup: IDefinitionVariableGroup) => {
            const scopes = variableGroup.scopes || [];
            if (scopes.some(s => s.key === payload.sourceScopeKey)) {
                variableGroup.scopes.push(payload.targetScope);
            }
        });

        this._currentState.scopes.push(payload.targetScope);
        this.emitChanged();
    }

    private _handleupdateVariableGroup = (variableGroup: IDefinitionVariableGroup): void => {
        const variableGroups: VariableGroup[] = this._currentState.variableGroups || [];
        variableGroups.forEach((currentVariableGroup: IDefinitionVariableGroup) => {
            if (currentVariableGroup.id === variableGroup.id) {
                currentVariableGroup.scopes = Utils_Array.clone(variableGroup.scopes);
            }
        });

        this.emitChanged();
    }

    private _handleUpdateScopePermissions = (payload: IUpdateScopePermissionsActionPayload): void => {
        this._scopePermissionsPayload = payload;
    }

    public isDirty(): boolean {
        return !Utils_Array.arrayEquals(this._currentState.variableGroups, this._originalState.variableGroups, (a: IDefinitionVariableGroup, b: IDefinitionVariableGroup) => {
            if (a.id !== b.id) {
                return false;
            }

            let aScopeIdsSorted = a.scopes.map((scope: IScope) => { return scope.key; }).sort();
            let bScopeIdsSorted = b.scopes.map((scope: IScope) => { return scope.key; }).sort();
            if (aScopeIdsSorted.length !== bScopeIdsSorted.length) {
                return false;
            }

            return aScopeIdsSorted.every((scopeId: number, index: number) => {
                return scopeId === bScopeIdsSorted[index];
            });
        });
    }

    public isValid(): boolean {
        return !this._currentState.variableGroups.some((vg: IDefinitionVariableGroup) => { return VariableGroupUtility.isDeleted(vg); });
    }

    private _addScopesToVariableGroups(variableGroups: IDefinitionVariableGroup[], variableGroupReferences: IVariableGroupReference[]): void {
        variableGroups.forEach((variableGroup: IDefinitionVariableGroup) => {
            if (!variableGroup.scopes) {
                variableGroup.scopes = [];
            }

            variableGroupReferences.forEach((variableGroupreference: IVariableGroupReference) => {
                if (variableGroupreference.groupId === variableGroup.id && !!variableGroupreference.scope) {
                    variableGroup.scopes.push(variableGroupreference.scope);
                }
            });
        });
    }

    private _findAndUpdateScope(scopes: IScope[], scopeToUpdate: IScope) {
        const allScopes = scopes || [];
        let matchingScope = Utils_Array.first(allScopes, (scope: IScope) => {
            return scope.key === scopeToUpdate.key;
        });

        if (!!matchingScope) {
            matchingScope.value = scopeToUpdate.value;
        }
    }

    private _cloneVariableGroups(variableGroups: IDefinitionVariableGroup[]): IDefinitionVariableGroup[] {
        return variableGroups.map((variableGroup: IDefinitionVariableGroup) => {
            // deep clone
            return jQuery.extend(true, {}, variableGroup) as IDefinitionVariableGroup;
        });
    }

    private _actionsHub: VariableGroupActions;
    private _originalState: IVariableGroupState;
    private _currentState: IVariableGroupState;
    private _lastVariableGroupDeletedIndex: number;
    private _scopePermissionsPayload: IUpdateScopePermissionsActionPayload;
}