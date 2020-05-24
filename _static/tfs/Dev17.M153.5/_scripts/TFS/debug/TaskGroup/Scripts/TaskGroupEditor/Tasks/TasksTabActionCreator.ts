import * as DTContracts from "TFS/DistributedTask/Contracts";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Item } from "DistributedTaskControls/Common/Item";
import { TaskListActions } from "DistributedTaskControls/Actions/TaskListActions";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";

import { ActionCreatorKeys, TabInstanceIds } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { TaskGroupPropertiesItemActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemActionCreator";
import { TabActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabActionCreator";
import { TasksTabActionsHub } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TasksTabActionsHub";
import { getITaskArrayFromTaskGroup } from "TaskGroup/Scripts/Utils/TaskGroupUtils";

export class TasksTabActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.TaskGroupTasksTabActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._taskListActions = ActionsHubManager.GetActionsHub<TaskListActions>(TaskListActions, instanceId);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, instanceId);
        this._tasksTabActionsHub = ActionsHubManager.GetActionsHub<TasksTabActionsHub>(TasksTabActionsHub, instanceId);
        this._tabActionCreator = ActionCreatorManager.GetActionCreator<TabActionCreator>(TabActionCreator, TabInstanceIds.Tasks);
        this._taskGroupPropertiesItemActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupPropertiesItemActionCreator>(TaskGroupPropertiesItemActionCreator, instanceId);
    }

    /**
     * Update the task group hosted in the editor
     * @param taskGroup
     * @param forceUpdate should be true if the task group being shown is modified, like version change
              In case of save, etc, which involves modification in the same task group, set this to false
     */
    public updateTaskGroup(taskGroup: DTContracts.TaskGroup, forceUpdate: boolean): void {
        this._tasksTabActionsHub.updateTaskGroup.invoke({
            taskGroup: taskGroup
        });

        this._taskListActions.updateTasks.invoke({
            forceUpdate: forceUpdate,
            tasks: getITaskArrayFromTaskGroup(taskGroup)
        });

        this._taskGroupPropertiesItemActionCreator.updateTaskGroup(taskGroup);

        if (forceUpdate) {
            this._itemSelectorActions.updateSelection.invoke([]);
        }
    }

    public updateErrorMessage(errorMessage: string): void {
        this._tabActionCreator.updateErrorMessage(errorMessage);
    }

    private _taskListActions: TaskListActions;
    private _itemSelectorActions: ItemSelectorActions;
    private _tasksTabActionsHub: TasksTabActionsHub;
    private _tabActionCreator: TabActionCreator;
    private _taskGroupPropertiesItemActionCreator: TaskGroupPropertiesItemActionCreator;
}