import { IdentityRef } from "VSS/WebApi/Contracts";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { ActionsHubBase, Action, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { ActionKeys } from "TaskGroup/Scripts/TaskGroups/Constants";

export interface ITaskGroupsPayload {
    taskGroups: DTContracts.TaskGroup[];
}

export interface ITaskGroupNameFilterPayload {
    filterString: string;
}

export interface IResolvedOwnerIdentitiesPayload {
    identities: IdentityRef[];
}

export class TaskGroupsActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return ActionKeys.TaskGroupsActionHub;
    }

    public initialize(): void {
        this._initializeTaskGroups = new Action<ITaskGroupsPayload>();
        this._filterTaskGroups = new Action<ITaskGroupNameFilterPayload>();
        this._updateResolvedOwnerIdentities = new Action<IResolvedOwnerIdentitiesPayload>();
        this._taskGroupNameHeaderClicked = new Action<IEmptyActionPayload>();
        this._taskGroupModifiedByHeaderClicked = new Action<IEmptyActionPayload>();
        this._taskGroupModifiedOnHeaderClicked = new Action<IEmptyActionPayload>();
    }

    public get initializeTaskGroups(): Action<ITaskGroupsPayload> {
        return this._initializeTaskGroups;
    }

    public get filterTaskGroups(): Action<ITaskGroupNameFilterPayload> {
        return this._filterTaskGroups;
    }

    public get updateResolvedOwnerIdentities(): Action<IResolvedOwnerIdentitiesPayload> {
        return this._updateResolvedOwnerIdentities;
    }

    public get taskGroupNameHeaderClicked(): Action<IEmptyActionPayload> {
        return this._taskGroupNameHeaderClicked;
    }

    public get taskGroupModifiedByHeaderClicked(): Action<IEmptyActionPayload> {
        return this._taskGroupModifiedByHeaderClicked;
    }
    public get taskGroupModifiedOnHeaderClicked(): Action<IEmptyActionPayload> {
        return this._taskGroupModifiedOnHeaderClicked;
    }

    private _filterTaskGroups: Action<ITaskGroupNameFilterPayload>;
    private _initializeTaskGroups: Action<ITaskGroupsPayload>;
    private _updateResolvedOwnerIdentities: Action<IResolvedOwnerIdentitiesPayload>;
    private _taskGroupNameHeaderClicked: Action<IEmptyActionPayload>;
    private _taskGroupModifiedByHeaderClicked: Action<IEmptyActionPayload>;
    private _taskGroupModifiedOnHeaderClicked: Action<IEmptyActionPayload>;
}