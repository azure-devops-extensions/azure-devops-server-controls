/// <reference types="react" />

import * as React from "react";

import { TaskGroupDialogActionsCreator } from "DistributedTaskControls/Actions/TaskGroupDialogActionsCreator";
import { TaskListActionsCreator } from "DistributedTaskControls/Actions/TaskListActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Common from "DistributedTaskControls/Common/Common";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Properties, Source, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { IProcessParameterReferenceData, IUpdateProcessParameterReferencePayload } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { MetaTaskManager } from "DistributedTaskControls/Components/Task/MetaTaskManager";
import { TaskActionCreator } from "DistributedTaskControls/Components/Task/TaskActionsCreator";
import { TaskItem } from "DistributedTaskControls/Components/Task/TaskItem";
import { TaskStore } from "DistributedTaskControls/Components/Task/TaskStore";
import { ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { DefinitionType } from "DistributedTasksCommon/TFS.Tasks.Types";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import { announce } from "VSS/Utils/Accessibility";
import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Helper class for Task item context menu items
 */
export class TaskItemContextMenuHelper {

    /**
     * @brief Gives the list of context menu items for Tasks
     * @param itemSelectionStore
     */
    public static getContextMenuItems(items: Item[], taskListInstanceId: string, taskItemKeys: string[], processInstanceId: string): IContextualMenuItem[] {

        const processManagementStore = StoreManager.GetStore<ProcessManagementStore>(ProcessManagementStore, processInstanceId);

        let showTaskGroupOptions: boolean = true;
        let selectedTaskStoreList: TaskStore[] = items.map((item: Item) => {
            const store = StoreManager.GetStore<TaskStore>(TaskStore, item.getKey());
            showTaskGroupOptions = showTaskGroupOptions && store.canShowTaskGroupOptions();
            return store;
        });
        let selectedTaskActionCreators: TaskActionCreator[] = items.map((item: Item) => {
            return ActionCreatorManager.GetActionCreator<TaskActionCreator>(TaskActionCreator, item.getKey());
        });

        let taskListActionCreator = ActionCreatorManager.GetActionCreator<TaskListActionsCreator>(TaskListActionsCreator, taskListInstanceId);
        let taskGroupActionsCreator = ActionCreatorManager.GetActionCreator<TaskGroupDialogActionsCreator>(TaskGroupDialogActionsCreator);

        let contextMenuItems: IContextualMenuItem[] = [];
        let menuHasItems = false;

        // Adding context menus in sequence
        // Currently, the menus are hard-coded.
        // We can implement contribution point based addition when such requirement comes-in
        // Sequence - Enable tasks, Disable tasks, Clone tasks, Create task groups, Manage task groups

        // Context Menu - Enable task(s)

        // component will use item name attribute for aria label as well

        if (processManagementStore.canEditTaskInputs()) {
            contextMenuItems.push({
                key: Common.KEY_ENABLE_TASKS,
                disabled: !(this._getEnableState(Common.KEY_ENABLE_TASKS, selectedTaskStoreList)),
                name: Resources.Tasks_MenuEnableText,
                iconProps: { iconName: "Completed" },
                onClick: () => {
                    selectedTaskActionCreators.forEach((actionCreator: TaskActionCreator) => {
                        actionCreator.updateTaskInputValue(Common.TaskControlOptionsConstants.ControlOptionsInputName_Enabled,
                            "true");
                    });

                    let tasksEnabledText: string = items.length === 1 ? Resources.TaskEnabled : Resources.TasksEnabled;
                    announce(tasksEnabledText, true);
                    this._publishTelemetryForContextMenu(Feature.EnableTask, items.length);
                }
            });

            // Context Menu - Disable task(s)
            contextMenuItems.push({
                key: Common.KEY_DISABLE_TASKS,
                disabled: !(this._getEnableState(Common.KEY_DISABLE_TASKS, selectedTaskStoreList)),
                name: Resources.Tasks_MenuDisableText,
                iconProps: { iconName: "Blocked" },
                onClick: () => {
                    selectedTaskActionCreators.forEach((actionCreator: TaskActionCreator) => {
                        actionCreator.updateTaskInputValue(Common.TaskControlOptionsConstants.ControlOptionsInputName_Enabled,
                            "false");
                    });

                    let tasksDisabledText: string = items.length === 1 ? Resources.TaskDisabled : Resources.TasksDisabled;
                    announce(tasksDisabledText, true);
                    this._publishTelemetryForContextMenu(Feature.DisableTask, items.length);
                }
            });
            menuHasItems = true;
        }

        if (processManagementStore.canEditTasks()) {
            // Context Menu - Remove task(s)
            contextMenuItems.push({
                key: Common.KEY_REMOVE_TASKS,
                disabled: !(this._getEnableState(Common.KEY_REMOVE_TASKS, selectedTaskStoreList)),
                name: Resources.Tasks_MenuRemoveTasks,
                iconProps: { iconName: "Cancel" },
                onClick: () => {
                    if (items) {
                        items.forEach((item: TaskItem) => {
                            item.removeTask();
                        });

                        let tasksRemovedText: string = items.length === 1 ? Resources.TaskRemoved : Resources.TasksRemoved;
                        announce(tasksRemovedText, true);
                        this._publishTelemetryForContextMenu(Feature.RemoveTask, items.length);
                    }
                }
            });

            // Context Menu - Clone task(s)
            contextMenuItems.push({
                key: Common.KEY_CLONE_TASKS,
                disabled: !(this._getEnableState(Common.KEY_CLONE_TASKS, selectedTaskStoreList)),
                name: Resources.Tasks_MenuCloneTasks,
                iconProps: { iconName: "Copy" },
                onClick: () => {
                    let keys: string[] = items.map((item: Item) => {
                        return item.getKey();
                    });

                    taskListActionCreator.cloneTasks(keys, this._getProcessParamPayload(processInstanceId, items));

                    this._publishTelemetryForContextMenu(Feature.CloneTask, items.length);
                }
            });
            menuHasItems = true;
        }

        // task group related options
        if (processManagementStore.canEditTaskGroups() && showTaskGroupOptions) {
            //Divider line  
            if (menuHasItems) {
                contextMenuItems.push({
                    key: "divider_1",
                    name: "-",
                });
            }

            // Context Menu - Create task group
            contextMenuItems.push({
                key: Common.KEY_CREATE_TASK_GROUP,
                disabled: !(this._getEnableState(Common.KEY_CREATE_TASK_GROUP, selectedTaskStoreList)),
                name: Resources.Tasks_MenuCreateMetaTask,
                iconProps: { iconName: "Add" },
                onClick: () => {

                    // Arrange items in same order as in task list
                    let tasksItems: Item[] = TaskItemContextMenuHelper._getTasksInOrderOfTaskList(items, taskItemKeys);

                    MetaTaskManager.instance().createMetaTask(tasksItems as TaskItem[],
                        items[0].getViewContext() as Common.Workflow,
                        taskListInstanceId);

                }
            });

            // Context Menu - Manage task group
            contextMenuItems.push({
                key: Common.KEY_MANAGE_TASK_GROUP,
                disabled: !(this._getEnableState(Common.KEY_MANAGE_TASK_GROUP, selectedTaskStoreList)),
                name: Resources.Tasks_MenuManageMetaTask,
                iconProps: { iconName: "Settings" },
                onClick: () => {
                    let metaTaskStore: TaskStore;

                    selectedTaskStoreList.forEach((store: TaskStore) => {
                        if (store.getTaskDefinition().definitionType === DefinitionType.metaTask) {
                            metaTaskStore = store;
                            return false;
                        }
                    });

                    MetaTaskManager.instance().manageMetaTask(metaTaskStore.getTaskDefinition().id);

                    this._publishTelemetryForContextMenu(Feature.ManageTaskGroup);
                }
            });
        }

        return contextMenuItems;
    }

    private static _getProcessParamPayload(processInstanceId: string, items: Item[]): IUpdateProcessParameterReferencePayload {
        let referenceData: IProcessParameterReferenceData[] = [];

        items.map((taskItem: TaskItem) => {
            //Creating ref data object[]: [process parameter name, reference count]
            let refData = taskItem.getProcessParameterNameToReferenceCount();

            if (refData) {
                refData.forEach((refData: IProcessParameterReferenceData) => {
                    referenceData.push({
                        processParameterName: refData.processParameterName,
                        referenceCount: refData.referenceCount
                    });
                });
            }
        });

        let payload: IUpdateProcessParameterReferencePayload = {
            processParameterReferencePayload: {
                processParameterReferenceData: referenceData,
                shouldReferencesIncrease: true
            },
            processInstanceId: processInstanceId
        };

        return payload;
    }

    private static _publishTelemetryForContextMenu(feature: string, itemLength?: number) {
        let eventProperties: IDictionaryStringTo<any> = {};
        if (itemLength) {
            eventProperties[Properties.SelectedTasksLength] = itemLength;
        }

        Telemetry.instance().publishEvent(feature, eventProperties, Source.ContextMenu);
    }

    /**
     * @brief returs enable state for each context menu item
     * @param key
     * @param selectedtaskStoreList
     */
    private static _getEnableState(key: string, selectedtaskStoreList: TaskStore[]): boolean {

        /**
         *                                          Enable Task(s)  |   Disable Task(s) |   Clone Task(s)   |   Remove Task(s)   |  Create Task Group   |   Manage Task Group
         *
         *  Single simple task (enabled)                OFF                 ON                  ON                    ON                  ON                      OFF
         *  Single simple task (disabled)               ON                  OFF                 ON                    ON                  ON                      OFF
         *  Single task group task (enabled)            OFF                 ON                  ON                    ON                  ON                      ON
         *  Single task group task (disabled)           OFF                 ON                  ON                    ON                  ON                      ON
         *  Single task group task (disabled)           ON                  OFF                 ON                    ON                  ON                      ON
         *  Multiple simple tasks (some enabled)        ON                  ON                  ON                    ON                  ON                      OFF
         *  Multiple simple tasks (all enabled)         OFF                 ON                  ON                    ON                  ON                      OFF
         *  Multiple simple tasks (all disabled)        ON                  OFF                 ON                    ON                  ON                      OFF
         *  Multiple task groups (all enabled)          OFF                 ON                  ON                    ON                  ON                      ON
         *  Multiple task groups (all disabled)         ON                  OFF                 ON                    ON                  ON                      ON
         *  Multiple task groups (some enabled)         ON                  ON                  ON                    ON                  ON                      ON
         *  Multiple tasks (with few task groups)       ON                  ON                  ON                    ON                  ON                      ON
         *
         */

        let enableState: boolean = true;

        switch (key) {
            case Common.KEY_ENABLE_TASKS:
                enableState = selectedtaskStoreList.some((store: TaskStore) => {
                    return store.isDisabled();
                });
                break;
            case Common.KEY_DISABLE_TASKS:
                enableState = selectedtaskStoreList.some((store: TaskStore) => {
                    return !store.isDisabled();
                });
                break;
            case Common.KEY_CLONE_TASKS:
                enableState = this._areSelectedTasksInSameTaskList(selectedtaskStoreList);
                break;
            case Common.KEY_REMOVE_TASKS:
                enableState = true;
                break;
            case Common.KEY_CREATE_TASK_GROUP:
                let areSelectedTasksInSameTaskList = this._areSelectedTasksInSameTaskList(selectedtaskStoreList);
                let areSelectedTasksValid = true;
                if (areSelectedTasksInSameTaskList && selectedtaskStoreList && selectedtaskStoreList.length > 0) {
                    areSelectedTasksValid = !selectedtaskStoreList.some((store: TaskStore) => {
                        return !store.isValid() || !store.isTaskDefinitionValid();
                    });
                }

                enableState = areSelectedTasksValid && areSelectedTasksInSameTaskList;
                break;
            case Common.KEY_MANAGE_TASK_GROUP:
                enableState = selectedtaskStoreList.some((store: TaskStore) => {
                    return (store.getTaskDefinition().definitionType === DefinitionType.metaTask);
                });
                break;
            default:
                Diag.logError("[TaskItemContextMenuHelper._getEnableState]: Invalid key - " + key);
                break;
        }

        return enableState;
    }

    private static _getTasksInOrderOfTaskList(items: Item[], taskItemKeys: string[]): Item[] {
        let keys: string[] = items.map((item: Item) => {
            return item.getKey();
        });
        let taskKeys: string[] = DtcUtils.getTaskInOrder(keys, taskItemKeys);

        let tasksItems: Item[] = [];

        taskKeys.forEach((taskKey, index) => {
            items.forEach((item: TaskItem) => {
                if (!Utils_String.ignoreCaseComparer(item.getKey(), taskKey)) {
                    tasksItems.push(item);
                }
            });
        });

        return tasksItems;
    }

    private static _areSelectedTasksInSameTaskList(selectedtaskStoreList: TaskStore[]): boolean {
        let areTasksInSameTaskList = true;
        if (selectedtaskStoreList && selectedtaskStoreList.length > 0) {
            let firstTaskListStoreInstanceId = selectedtaskStoreList[0].getTaskContext().taskListStoreInstanceId;
            areTasksInSameTaskList = !selectedtaskStoreList.some((store: TaskStore) => {
                return store.getTaskContext().taskListStoreInstanceId !== firstTaskListStoreInstanceId;
            });
        }
        return areTasksInSameTaskList;
    }
}