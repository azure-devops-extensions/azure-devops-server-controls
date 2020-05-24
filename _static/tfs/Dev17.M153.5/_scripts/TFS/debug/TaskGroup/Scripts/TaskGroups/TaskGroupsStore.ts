import { friendly as friendlyDate, defaultComparer as defaultDateComparer } from "VSS/Utils/Date";
import { replaceUrlParam } from "VSS/Utils/Url";
import {
    localeIgnoreCaseComparer,
    ignoreCaseComparer,
    localeFormat,
    empty as emptyString
} from "VSS/Utils/String";
import { announce } from "VSS/Utils/Accessibility";
import { remove as removeFromArray, first as firstInArray, sortIfNotSorted } from "VSS/Utils/Array";
import { IdentityRef } from "VSS/WebApi/Contracts";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { ContributionIds } from "TaskGroup/Scripts/Common/Constants";
import {
    DeleteTaskGroupDialogActionsHub,
    IDeletedTaskGroupPayload
} from "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialogActionsHub";
import {
    TaskGroupsActionsHub,
    ITaskGroupsPayload,
    ITaskGroupNameFilterPayload,
    IResolvedOwnerIdentitiesPayload
} from "TaskGroup/Scripts/TaskGroups/TaskGroupsActionsHub";
import { getTaskGroupEditorUrl } from "TaskGroup/Scripts/Utils/TaskGroupUrlUtils";
import { getTaskGroupDisplayName } from "TaskGroup/Scripts/Utils/TaskGroupUtils";
import { StoreKeys } from "TaskGroup/Scripts/TaskGroups/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export enum SortedColumnType {
    Name,
    ModifiedBy,
    ModifiedOn
}

export interface ITaskGroupItem {
    id: string;
    name: string;
    ownerId: string;
    owner: string;
    url: string;
    modifiedBy: string;
    description: string;
    modifiedOn: string;
    modifiedOnDate: Date;
    parentDefinitionId: string;
    fromExtension: boolean;
}

export interface ITaskGroupsState extends IStoreState {
    items: ITaskGroupItem[];
    containsAnyTaskGroup: boolean;
    sortedColumn: SortedColumnType;
    sortedDescending: boolean;
}

export class TaskGroupsStore extends StoreBase {
    public static getKey(): string {
        return StoreKeys.TaskGroupsStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._allRows = [];
        this._state = {
            items: [],
            containsAnyTaskGroup: true, // Initially set to true, because task groups have not been fetched yet 
            sortedColumn: SortedColumnType.Name,
            sortedDescending: false
        };
        this._taskGroupActionsHub = ActionsHubManager.GetActionsHub<TaskGroupsActionsHub>(TaskGroupsActionsHub);
        this._deleteTaskGroupDialogActionsHub = ActionsHubManager.GetActionsHub<DeleteTaskGroupDialogActionsHub>(DeleteTaskGroupDialogActionsHub);
        this._taskGroupActionsHub.initializeTaskGroups.addListener(this._onInitializeTaskGroups);
        this._taskGroupActionsHub.filterTaskGroups.addListener(this._onFilterTaskGroups);
        this._taskGroupActionsHub.updateResolvedOwnerIdentities.addListener(this._onOwnersResolved);
        this._taskGroupActionsHub.taskGroupNameHeaderClicked.addListener(this._sortTaskGroupOnName);
        this._taskGroupActionsHub.taskGroupModifiedByHeaderClicked.addListener(this._sortTaskGroupOnModifiedBy);
        this._taskGroupActionsHub.taskGroupModifiedOnHeaderClicked.addListener(this._sortTaskGroupOnModifiedOn);
        this._deleteTaskGroupDialogActionsHub.deleteTaskGroup.addListener(this._onDeleteTaskGroup);
    }

    public disposeInternal(): void {
        this._taskGroupActionsHub.initializeTaskGroups.removeListener(this._onInitializeTaskGroups);
        this._taskGroupActionsHub.filterTaskGroups.removeListener(this._onFilterTaskGroups);
        this._taskGroupActionsHub.updateResolvedOwnerIdentities.removeListener(this._onOwnersResolved);
        this._taskGroupActionsHub.taskGroupNameHeaderClicked.removeListener(this._sortTaskGroupOnName);
        this._taskGroupActionsHub.taskGroupModifiedByHeaderClicked.removeListener(this._sortTaskGroupOnModifiedBy);
        this._taskGroupActionsHub.taskGroupModifiedOnHeaderClicked.removeListener(this._sortTaskGroupOnModifiedOn);
        this._deleteTaskGroupDialogActionsHub.deleteTaskGroup.removeListener(this._onDeleteTaskGroup);
    }

    public getState(): ITaskGroupsState {
        return this._state;
    }

    private _onInitializeTaskGroups = (payload: ITaskGroupsPayload) => {
        this._allRows = [];
        this._state = {
            items: [],
            containsAnyTaskGroup: true, // Initially set to true, because task groups have not been fetched yet
            sortedColumn: SortedColumnType.Name,
            sortedDescending: false
        };
        if (!!payload.taskGroups) {
            const displayedTaskGroups = this._filterTaskGroupsToDisplay(payload.taskGroups);

            displayedTaskGroups.forEach((taskGroup: DTContracts.TaskGroup): void => {
                this._allRows.push({
                    id: taskGroup.id,
                    name: this._getTaskGroupDisplayName(taskGroup.name, !!taskGroup.version && taskGroup.version.isTest, taskGroup.preview),
                    ownerId: taskGroup.owner,
                    owner: null,
                    modifiedBy: taskGroup.modifiedBy && taskGroup.modifiedBy.displayName,
                    description: taskGroup.description,
                    modifiedOn: friendlyDate(taskGroup.modifiedOn),
                    modifiedOnDate: taskGroup.modifiedOn,
                    url: this._getTaskGroupItemUrl(taskGroup.id),
                    parentDefinitionId: taskGroup.parentDefinitionId,
                    fromExtension: ignoreCaseComparer(taskGroup.contributionIdentifier, ContributionIds.TaskGroupContributionIdentifierKey) === 0
                });
            });

            this._allRows = this._allRows.sort((a: ITaskGroupItem, b: ITaskGroupItem) => localeIgnoreCaseComparer(a.name, b.name));
            this._state.containsAnyTaskGroup = this._allRows.length > 0;

            this._state.items = this._allRows;
        }

        this.emitChanged();
    }

    private _onFilterTaskGroups = (payload: ITaskGroupNameFilterPayload): void => {
        this._state.items = this._allRows.filter((item: ITaskGroupItem) => item.name.toLocaleLowerCase().indexOf(payload.filterString.toLocaleLowerCase()) >= 0);
        this.emitChanged();

        const announceMessage = localeFormat(Resources.FilteredTaskGroupsAnnounceMessage, this._state.items.length);
        announce(announceMessage);
    }

    private _onOwnersResolved = (payload: IResolvedOwnerIdentitiesPayload): void => {
        this._allRows.forEach((item: ITaskGroupItem) => {
            if (!item.modifiedBy && !!item.ownerId) {
                item.owner = this._getIdentityDisplayName(payload.identities, item.ownerId);
            }
        });

        this._state.items.forEach((item: ITaskGroupItem) => {
            if (!item.modifiedBy && !!item.ownerId) {
                item.owner = this._getIdentityDisplayName(payload.identities, item.ownerId);
            }
        });

        this.emitChanged();
    }

    private _sortTaskGroupOnName = () => {
        this._handleSorting((item) => item.name, SortedColumnType.Name);
        this.emitChanged();
    }

    private _sortTaskGroupOnModifiedBy = () => {
        this._handleSorting((item) => item.modifiedBy || item.owner, SortedColumnType.ModifiedBy);
        this.emitChanged();
    }

    private _sortTaskGroupOnModifiedOn = () => {
        this._handleSorting((item) => item.modifiedOnDate, SortedColumnType.ModifiedOn, defaultDateComparer);
        this.emitChanged();
    }

    private _onDeleteTaskGroup = (payload: IDeletedTaskGroupPayload): void => {
        const itemInAllRows = firstInArray(this._allRows, (item: ITaskGroupItem) => item.id === payload.taskGroupId);
        if (!!itemInAllRows) {
            removeFromArray(this._allRows, itemInAllRows);
        }

        const itemInState = firstInArray(this._state.items, (item: ITaskGroupItem) => item.id === payload.taskGroupId);
        if (!!itemInState) {
            removeFromArray(this._state.items, itemInState);
        }

        this.emitChanged();
    }

    private _handleSorting<T>(
        getItemToCompare: (item: ITaskGroupItem) => T,
        columnType: SortedColumnType,
        sortFunction?: (f1: T, f2: T) => number) {

        if (!sortFunction) {
            sortFunction = (f1: T, f2: T) => localeIgnoreCaseComparer(f1 as any, f2 as any);
        }

        let ascendingSort = true;
        if (this._state.sortedColumn === columnType && !this._state.sortedDescending) {
            ascendingSort = false;
        }

        this._state.items = this._state.items.sort((a: ITaskGroupItem, b: ITaskGroupItem) => {
            const comparisonResult = sortFunction(
                getItemToCompare(a),
                getItemToCompare(b));
            if (ascendingSort) {
                return comparisonResult;
            }
            else {
                return -comparisonResult;
            }
        });

        this._state.sortedColumn = columnType;
        this._state.sortedDescending = !ascendingSort;
    }

    private _filterTaskGroupsToDisplay(taskGroups: DTContracts.TaskGroup[]): DTContracts.TaskGroup[] {
        let taskGroupsToDisplay: DTContracts.TaskGroup[] = [];
        let idToMajorVersionMap: { [id: string]: DTContracts.TaskGroup } = {};
        taskGroups.forEach((taskGroup: DTContracts.TaskGroup) => {
            if (idToMajorVersionMap.hasOwnProperty(taskGroup.id)
                && idToMajorVersionMap[taskGroup.id].version.major >= taskGroup.version.major) {
                return;
            }

            idToMajorVersionMap[taskGroup.id] = taskGroup;
        });

        Object.keys(idToMajorVersionMap).forEach((key: string) => idToMajorVersionMap.hasOwnProperty(key) && taskGroupsToDisplay.push(idToMajorVersionMap[key]));
        idToMajorVersionMap = {};

        return taskGroupsToDisplay;
    }

    private _getTaskGroupDisplayName(taskGroupName: string, isTest: boolean, isPreview: boolean) {
        return getTaskGroupDisplayName(taskGroupName, isTest, isPreview);
    }

    private _getTaskGroupItemUrl(taskGroupId: string): string {
        return getTaskGroupEditorUrl(taskGroupId);
    }

    private _getIdentityDisplayName(identities: IdentityRef[], identityId: string): string {
        const matchingIdentity = firstInArray(identities, (identity: IdentityRef) => identity.id === identityId);
        return (!!matchingIdentity && matchingIdentity.displayName) || emptyString;
    }

    private _state: ITaskGroupsState;
    private _allRows: ITaskGroupItem[];
    private _oldTaskGroupsHubUrl: string;
    private _taskGroupActionsHub: TaskGroupsActionsHub;
    private _deleteTaskGroupDialogActionsHub: DeleteTaskGroupDialogActionsHub;
}