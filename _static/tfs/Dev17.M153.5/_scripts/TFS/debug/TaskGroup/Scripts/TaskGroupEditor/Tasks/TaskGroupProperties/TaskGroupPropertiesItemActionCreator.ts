import * as DTContracts from "TFS/DistributedTask/Contracts";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { TaskGroupPropertiesActionCreator } from "DistributedTaskControls/Actions/TaskGroupPropertiesActionCreator";
import { TaskGroupParametersActionCreator } from "DistributedTaskControls/Actions/TaskGroupParametersActionCreator";

import { ActionCreatorKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { TaskGroupPropertiesItemActionsHub } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemActionsHub";

export class TaskGroupPropertiesItemActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.TaskGroupPropertiesItemActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._taskGroupPropertiesItemActionsHub = ActionsHubManager.GetActionsHub<TaskGroupPropertiesItemActionsHub>(TaskGroupPropertiesItemActionsHub, instanceId);
        this._taskGroupPropertiesActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupPropertiesActionCreator>(TaskGroupPropertiesActionCreator, instanceId);
        this._taskGroupParametersActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupParametersActionCreator>(TaskGroupParametersActionCreator, instanceId);
   }

    public updateTaskGroup(taskGroup: DTContracts.TaskGroup): void {
        this._taskGroupPropertiesActionCreator.initializeTaskGroupProperties(
            taskGroup.name,
            taskGroup.description,
            taskGroup.category);

        this._taskGroupParametersActionCreator.setMetaTaskInput(
            taskGroup.inputs,
            taskGroup.tasks,
            taskGroup.dataSourceBindings,
            taskGroup.groups,
            taskGroup.runsOn);

        this._taskGroupPropertiesItemActionsHub.updateTaskGroup.invoke({
            taskGroup: taskGroup
        });
    }

    private _taskGroupPropertiesItemActionsHub: TaskGroupPropertiesItemActionsHub;
    private _taskGroupPropertiesActionCreator: TaskGroupPropertiesActionCreator;
    private _taskGroupParametersActionCreator: TaskGroupParametersActionCreator;
}