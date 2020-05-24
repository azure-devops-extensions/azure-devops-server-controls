import { logError } from "VSS/Diag";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";

import { ActionCreatorKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { TaskGroupVersionsActionsHub } from "TaskGroup/Scripts/TaskGroupEditor/Versions/TaskGroupVersionsActionsHub";
import { TasksTabActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TasksTabActionCreator";

export class TaskGroupVersionsActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.TaskGroupVersionsActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._taskGroupVersionsActionsHub = ActionsHubManager.GetActionsHub<TaskGroupVersionsActionsHub>(TaskGroupVersionsActionsHub, instanceId);
        this._taskGroupTasksTabActionCreator = ActionCreatorManager.GetActionCreator<TasksTabActionCreator>(TasksTabActionCreator, instanceId);
    }

    public updateVersionsList(versions: DTContracts.TaskGroup[]): void {
        this._taskGroupVersionsActionsHub.updateVersionsList.invoke({ versions: versions });
    }

    public updateSelectedVersion(version: DTContracts.TaskGroup): void {
        // Redraw tasks tab
        this._taskGroupTasksTabActionCreator.updateTaskGroup(version, true);

        this._taskGroupVersionsActionsHub.updateSelectedVersion.invoke({ selectedVersion: version });
    }

    public updateTaskGroup(taskGroup: DTContracts.TaskGroup, forceUpdate: boolean): void {
        this._taskGroupVersionsActionsHub.updateTaskGroup.invoke({ taskGroup: taskGroup });

        this._taskGroupTasksTabActionCreator.updateTaskGroup(taskGroup, forceUpdate);
    }

    private _taskGroupVersionsActionsHub: TaskGroupVersionsActionsHub;
    private _taskGroupTasksTabActionCreator: TasksTabActionCreator;
}