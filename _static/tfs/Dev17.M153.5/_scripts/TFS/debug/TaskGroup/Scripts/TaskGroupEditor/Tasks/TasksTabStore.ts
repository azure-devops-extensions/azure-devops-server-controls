import {
    localeComparer as localeStringComparer,
    empty as emptyString
} from "VSS/Utils/String";
import { intersect } from "VSS/Utils/Array";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Item } from "DistributedTaskControls/Common/Item";
import { TaskList as TaskListItem } from "DistributedTaskControls/Components/TaskList";
import { IProcessManagementStoreArgs, ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";
import { AddTaskItem } from "DistributedTaskControls/Components/Task/AddTaskItem";
import { TaskListStore, ITaskListStoreArgs } from "DistributedTaskControls/Stores/TaskListStore";
import { ProcessParameterStore, IOptions } from "DistributedTaskControls/Stores/ProcessParameterStore";

import { TaskVisibilityFilter } from "TaskGroup/Scripts/Common/Constants";
import { TasksTabActionsHub, ITaskGroupPayload } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TasksTabActionsHub";
import { TaskGroupPropertiesItemStore } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemStore";
import { TabStore } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabStore";
import { getITaskArrayFromTaskGroup } from "TaskGroup/Scripts/Utils/TaskGroupUtils";
import { StoreKeys, TabInstanceIds } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { TaskGroupPropertiesItem } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItem";
import { getTaskGroupDisplayName } from "TaskGroup/Scripts/Utils/TaskGroupUtils";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface ITasksTabState extends IStoreState {
    name: string;
    items: Item[];
    itemSelectionInstanceId: string;
    errorMessage: string;
}

export class TasksTabStore extends AggregatorDataStoreBase {

    public static getKey(): string {
        return StoreKeys.TaskGroupTasksTabStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._state = {
            name: emptyString,
            items: [],
            itemSelectionInstanceId: emptyString,
            errorMessage: emptyString
        };

        this._taskGroupActionsHub = ActionsHubManager.GetActionsHub<TasksTabActionsHub>(TasksTabActionsHub, instanceId);
        this._taskGroupActionsHub.updateTaskGroup.addListener(this._onUpdateTaskGroup);

        // Initialize tab store
        StoreManager.GetStore<TabStore>(TabStore, TabInstanceIds.Tasks);

        // initialize the process management store
        StoreManager.CreateStore<ProcessManagementStore, IProcessManagementStoreArgs>(ProcessManagementStore, instanceId,
            { processManagementCapabilities: ProcessManagementCapabilities.All } as IProcessManagementStoreArgs);

        // There is a dependency currently on ProcessParameter store, which would be removed later
        StoreManager.CreateStore<ProcessParameterStore, IOptions>(
            ProcessParameterStore,
            instanceId,
            {
                appContext: {},
                phaseList: []
            });

        this._taskListStore = StoreManager.CreateStore<TaskListStore, ITaskListStoreArgs>(TaskListStore, instanceId, this._getTaskListStoreArgs(null, instanceId));

        this.addToStoreList(this._taskListStore);

        this._taskGroupPropertiesItemStore = StoreManager.GetStore<TaskGroupPropertiesItemStore>(TaskGroupPropertiesItemStore, instanceId);
        this.addToStoreList(this._taskGroupPropertiesItemStore);
    }

    public disposeInternal(): void {
        this._taskGroupActionsHub.updateTaskGroup.removeListener(this._onUpdateTaskGroup);

        StoreManager.DeleteStore(TaskListStore, this.getInstanceId());
        super.disposeInternal();
    }

    public updateVisitor(taskGroup: DTContracts.TaskGroup): void {
        this._taskGroupPropertiesItemStore.updateVisitor(taskGroup);

        let taskList = this._taskListStore.getTaskList().map((task: ITask) => {
            return JQueryWrapper.extendDeep({}, task);
        });

        taskGroup.tasks = taskList.map((task: ITask) => {
            return {
                alwaysRun: task.alwaysRun,
                condition: task.condition,
                continueOnError: task.continueOnError,
                displayName: task.displayName,
                enabled: task.enabled,
                inputs: task.inputs,
                task: task.task,
                timeoutInMinutes: task.timeoutInMinutes,
                environment: task.environment
            } as DTContracts.TaskGroupStep;
        });

        let runsOn: string[] = taskGroup.runsOn;
        this._taskListStore.getTaskItemList().forEach((item) => {
            runsOn = intersect(runsOn, item.getRunsOn());
        });

        taskGroup.runsOn = runsOn;
    }

    public getState(): ITasksTabState {
        this._state.name = this._taskGroupPropertiesItemStore.getState().name;
        return this._state;
    }

    private _onUpdateTaskGroup = (payload: ITaskGroupPayload) => {
        this._state = this._getStateFromTaskGroup(payload.taskGroup);
        this.emitChanged();
    }

    private _onUpdateErrorMessage = (payload: string) => {
        this._state.errorMessage = payload;
        this.emitChanged();
    }

    private _getStateFromTaskGroup(taskGroup: DTContracts.TaskGroup): ITasksTabState {
        return {
            name: this._taskGroupPropertiesItemStore.getState().name,
            items: [
                this._getTaskGroupPropertiesItem(taskGroup),
                this._getAddTaskItem(this.getInstanceId()),
                this._getTaskListItem(this.getInstanceId())
            ],
            itemSelectionInstanceId: this.getInstanceId(),
            errorMessage: emptyString
        };
    }

    private _getTaskGroupPropertiesItem(taskGroup: DTContracts.TaskGroup): TaskGroupPropertiesItem {
        if (!this._taskGroupPropertiesItem) {
            this._taskGroupPropertiesItem = new TaskGroupPropertiesItem(taskGroup, this._getAddTaskItem(this.getInstanceId()));
        }

        return this._taskGroupPropertiesItem;
    }

    private _getAddTaskItem(instanceId: string): AddTaskItem {
        if (!this._addTaskItem) {
            this._addTaskItem = new AddTaskItem({
                taskListStoreInstanceId: instanceId,
                hideOverview: true,
                visibilityFilter: [
                    TaskVisibilityFilter.Build,
                    TaskVisibilityFilter.Release
                ]
            });
        }

        return this._addTaskItem;
    }

    private _getTaskListItem(instanceId: string): TaskListItem {
        if (!this._taskListItem) {
            this._taskListItem = new TaskListItem(
                () => { },
                instanceId
            );
        }

        return this._taskListItem;
    }

    private _getTaskListStoreArgs(taskGroup: DTContracts.TaskGroup, instanceId: string): ITaskListStoreArgs {
        return {
            appContext: {
                processParametersNotSupported: true,
                processInstanceId: instanceId
            },
            itemSelectionInstanceId: instanceId,
            taskContextOptions: {
                donotShowOutputVariables: true
            },
            taskList: (!!taskGroup && getITaskArrayFromTaskGroup(taskGroup)) || []
        };
    }

    private _taskListStore: TaskListStore;
    private _taskGroupPropertiesItemStore: TaskGroupPropertiesItemStore;
    private _taskListItem: TaskListItem;
    private _addTaskItem: AddTaskItem;
    private _taskGroupPropertiesItem: TaskGroupPropertiesItem;
    private _state: ITasksTabState;
    private _taskGroupActionsHub: TasksTabActionsHub;
}