
import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";

import { IEmptyActionPayload, IActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { IAddTaskPayload, IInsertListItemData, IShiftListItemPayload } from "DistributedTaskControls/Common/Types";
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { Action } from "VSS/Flux/Action";

export interface IMetaTaskCreatedPayload extends IActionPayload {
    metaTask: ITask;
    taskItemIdList: string[];
}

export interface IUpdateTaskPayload extends IActionPayload {
    tasks: ITask[];
    forceUpdate?: boolean;
}

export interface IRemoveTaskPayload {
    taskItemId: string;
    // should the TaskItem be disposed or not
    disposeTaskItem: boolean;
}

export class TaskListActions extends ActionsHubBase {

    public initialize(): void {
        this._addTask = new Action<IAddTaskPayload>();
        this._removeTask = new Action<IRemoveTaskPayload>();
        this._updateTasks = new Action<IUpdateTaskPayload>();
        this._shiftTask = new Action<IShiftListItemPayload>();
        this._cloneTasks = new Action<string[]>();
        this._metaTaskCreated = new Action<IMetaTaskCreatedPayload>();
        this._clearAddTaskLocation = new Action<IEmptyActionPayload>();
        this._insertTask = new Action<IInsertListItemData>();
        this._completeTaskAddition = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.TaskListActions;
    }

    public get addTask(): Action<IAddTaskPayload> {
        return this._addTask;
    }

    public get removeTask(): Action<IRemoveTaskPayload> {
        return this._removeTask;
    }

    public get updateTasks(): Action<IUpdateTaskPayload> {
        return this._updateTasks;
    }

    public get shiftTask(): Action<IShiftListItemPayload> {
        return this._shiftTask;
    }

    public get clearAddTaskLocation(): Action<IEmptyActionPayload> {
        return this._clearAddTaskLocation;
    }

    public get cloneTasks(): Action<string[]> {
        return this._cloneTasks;
    }

    public get metaTaskCreated(): Action<IMetaTaskCreatedPayload> {
        return this._metaTaskCreated;
    }

    public get insertTask(): Action<IInsertListItemData> {
        return this._insertTask;
    }

    public get completeTaskAddition(): Action<IEmptyActionPayload> {
        return this._completeTaskAddition;
    }

    private _addTask: Action<IAddTaskPayload>;
    private _removeTask: Action<IRemoveTaskPayload>;
    private _updateTasks: Action<IUpdateTaskPayload>;
    private _shiftTask: Action<IShiftListItemPayload>;
    private _cloneTasks: Action<string[]>;   // Array of Task key is the payload
    private _metaTaskCreated: Action<IMetaTaskCreatedPayload>;
    private _clearAddTaskLocation: Action<IEmptyActionPayload>;
    private _insertTask: Action<IInsertListItemData>;
    private _completeTaskAddition: Action<IEmptyActionPayload>;
}