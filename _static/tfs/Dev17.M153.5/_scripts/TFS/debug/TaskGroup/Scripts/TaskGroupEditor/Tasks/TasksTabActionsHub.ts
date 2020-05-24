import * as DTContracts from "TFS/DistributedTask/Contracts";

import { Action, ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { ActionKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";

export interface ITaskGroupPayload {
    taskGroup: DTContracts.TaskGroup;
}

export class TasksTabActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return ActionKeys.TaskGroupTasksTabActionsHub;
    }

    public initialize(): void {
        this._updateTaskGroup = new Action<ITaskGroupPayload>();
    }

    public get updateTaskGroup(): Action<ITaskGroupPayload> {
        return this._updateTaskGroup;
    }

    private _updateTaskGroup: Action<ITaskGroupPayload>;
}