import * as ItemSelectorActions from "DistributedTaskControls/Actions/ItemSelectorActions";
import * as Actions from "DistributedTaskControls/Actions/TaskListActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { StoreKeys, TASK_DEFINITION_DATA_KEY, TaskConditions } from "DistributedTaskControls/Common/Common";
import { Item } from "DistributedTaskControls/Common/Item";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import {
    IAddTaskPayload,
    IApplicationLayerContext,
    IInsertListItemData,
    IShiftListItemPayload,
    ITaskContext,
    ITaskContextOptions,
    ITaskDefinitionItem
} from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { AddTaskItem } from "DistributedTaskControls/Components/Task/AddTaskItem";
import { TaskItem } from "DistributedTaskControls/Components/Task/TaskItem";

import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface ITaskListState {
    taskItemList: TaskItem[];
}

export interface ITaskListStoreArgs {
    taskList: ITask[];
    appContext: IApplicationLayerContext;
    itemSelectionInstanceId: string;
    taskContextOptions?: ITaskContextOptions;
}

export class TaskListStore extends AggregatorDataStoreBase {

    private taskCounter: number = 0;

    constructor(args: ITaskListStoreArgs) {
        super();
        this._taskList = args.taskList;
        this._appContext = args.appContext;
        this._itemSelectionInstanceId = args.itemSelectionInstanceId;
        this._taskContextOptions = args.taskContextOptions ? args.taskContextOptions : {} as ITaskContextOptions;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this._initializeTaskContext();

        // we need to initialize taskList here as instanceId required for initialization is obtained here
        this._initializeStates();

        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions.Actions>(ItemSelectorActions.Actions, this._itemSelectionInstanceId);
        this._itemSelectorActions.selectItem.addListener(this._handleSelectItem);

        this._taskListActions = ActionsHubManager.GetActionsHub<Actions.TaskListActions>(Actions.TaskListActions, this.getInstanceId());
        this._taskListActions.addTask.addListener(this._handleAddTask);
        this._taskListActions.removeTask.addListener(this._handleRemoveTask);
        this._taskListActions.updateTasks.addListener(this._handleUpdateTasks);
        this._taskListActions.clearAddTaskLocation.addListener(this._handleClearAddTaskLocation);
        this._taskListActions.shiftTask.addListener(this._handleShiftTask);
        this._taskListActions.cloneTasks.addListener(this._handleCloneTask);
        this._taskListActions.metaTaskCreated.addListener(this._handleMetaTaskCreated);
        this._taskListActions.insertTask.addListener(this._handleInsertTask);
        this._taskListActions.completeTaskAddition.addListener(this._handleCompleteTaskAddition);
    }

    protected disposeInternal(): void {
        this._itemSelectorActions.selectItem.removeListener(this._handleSelectItem);

        this._taskListActions.addTask.removeListener(this._handleAddTask);
        this._taskListActions.removeTask.removeListener(this._handleRemoveTask);
        this._taskListActions.updateTasks.removeListener(this._handleUpdateTasks);
        this._taskListActions.clearAddTaskLocation.removeListener(this._handleClearAddTaskLocation);
        this._taskListActions.shiftTask.removeListener(this._handleShiftTask);
        this._taskListActions.cloneTasks.removeListener(this._handleCloneTask);
        this._taskListActions.metaTaskCreated.removeListener(this._handleMetaTaskCreated);
        this._taskListActions.insertTask.removeListener(this._handleInsertTask);
        this._taskListActions.completeTaskAddition.removeListener(this._handleCompleteTaskAddition);
    }

    /**
     * @brief Returns if current selection is obsolete based on itemToBeSelected value
     * @details Currently, only two scenarios that have been implemented may result into obsolete selection
     *      1. Delete item - If the selected item is delete then selection is no longer correct and hence needs to be updated.
     *      2. Create Task group - If a group of selected task is converted to Task Group, then too, selection is no longer valid.
     */
    public isSelectionObsolete(): boolean {
        return (!!this._itemToBeSelected);
    }

    /**
     * @brief Gives the item to be selected if Selection went obsolete. Also, resets the value as part of call.
     */
    public getNextItemToBeSelected(): TaskItem {
        let returnValue = this._itemToBeSelected;
        this._itemToBeSelected = null;

        return returnValue;
    }

    public static getKey(): string {
        return StoreKeys.TaskListStore;
    }

    public getState(): ITaskListState {
        return this._currentState;
    }

    public getTaskList(): ITask[] {
        let taskList: ITask[] = [];
        taskList = this._currentState.taskItemList.map((taskItem) => {
            return taskItem.getTask();
        });
        return taskList;
    }

    public isDirty(): boolean {
        if (this._currentState.taskItemList.length !== this._originalState.taskItemList.length) {
            return true;
        }

        for (let index = 0; index < this._currentState.taskItemList.length; index++) {
            if (this._currentState.taskItemList[index].getKey() !== this._originalState.taskItemList[index].getKey()) {
                return true;
            }
        }

        for (let taskItem of this._currentState.taskItemList) {
            if (taskItem.isDirty()) {
                return true;
            }
        }

        return false;
    }

    public isValid(): boolean {
        if (this._currentState.taskItemList.length === 0) {
            return true;
        }

        for (let taskItem of this._currentState.taskItemList) {
            if (!taskItem.isValid()) {
                return false;
            }
        }

        return true;
    }

    public removeTaskCallDelegate: (taskItemId: string) => void;

    public isActive = (taskItemId: string) => {
        return (this._addTaskLocationItem.getKey() === taskItemId && this._showAddTaskLocation);
    }

    public getTaskKeys(): string[] {
        if (!this._currentState.taskItemList) {
            return [] as string[];
        }

        let keys: string[] = this._currentState.taskItemList.map((taskItem) => {
            return taskItem.getKey();
        });
        return keys;
    }

    public getTaskItemList(): TaskItem[] {
        if (!this._currentState.taskItemList) {
            return [] as TaskItem[];
        }

        return this._currentState.taskItemList;
    }

    public updateVisitor(visitor: ITask[]): void {
        throw new Error("Use getTaskList method instead");
    }

    public getReadOnlyDemands(): any[] {
        let visitedTasks: string[] = [];
        //Using any here as Demands are of type any in Task Definition Contracts
        let demandsMap: IKeyValuePair<any, any>[] = [];

        let alreadySatisfiedDemands: string[] = [];

        //Fetching demands of each Task Item.
        this._currentState.taskItemList.forEach((taskItem: TaskItem) => {
            //Update demands for only enabled tasks, skip demands for disabled tasks
            if (this._isTaskEnabled(taskItem.getTask())) {

                let taskDefRefId: string = taskItem.getTask().task.id.toLowerCase();

                //Check if task is already visited, if yes, then no need to iterate over its demands
                if (visitedTasks.indexOf(taskDefRefId) < 0) {

                    let taskDemands = taskItem.getReadOnlyDemands();
                    if (taskDemands && taskDemands.length > 0) {
                        taskDemands.forEach((demand) => {
                            if (!Utils_Array.contains(alreadySatisfiedDemands, demand.toLowerCase())) {
                                demandsMap[demand] = demand;
                            }
                        });
                    }

                    const taskSatisfies = taskItem.getSatisfies();
                    Utils_Array.addRange(alreadySatisfiedDemands, taskSatisfies.map(name => name.toLowerCase()));

                    //Visiting this task, so pushing it to the visited task array
                    visitedTasks.push(taskDefRefId);
                }
            }
        });

        return Object.keys(demandsMap);
    }

    public getProcessInstanceId(): string {
        let processInstanceId: string = this._appContext ? this._appContext.processInstanceId : null;
        return processInstanceId;
    }

    public isTaskAdditionInProgress(taskInstanceId: string): boolean {
        return (this._additionInProgressTaskId === taskInstanceId);
    }

    public getAdditionInProgressTaskInstanceId(): string {
        return this._additionInProgressTaskId;
    }

    public getCurrentTaskContext(): ITaskContext {
        return this._taskContext;
    }

    private _isTaskEnabled(taskItem: ITask): boolean {
        return taskItem.enabled;
    }

    private _initializeStates(): void {
        let taskItemList: TaskItem[] = [];
        if (this._taskList) {
            taskItemList = this._taskList.map((task) => {
                return this._createTaskItem(task);
            });
        }

        this._currentState = {} as ITaskListState;
        this._originalState = {} as ITaskListState;

        this._updateStates(taskItemList);
    }

    private _addTask(task: ITask): string {
        let indexToAddTask = this._addTaskLocationItem
            ? this._addTaskAfter ? this._currentState.taskItemList.indexOf(this._addTaskLocationItem) + 1 : this._currentState.taskItemList.indexOf(this._addTaskLocationItem)
            : this._currentState.taskItemList.length;
        let newTaskItem = this._createTaskItem(task);
        this._currentState.taskItemList.splice(indexToAddTask, 0, newTaskItem);
        this._addTaskLocationItem = this._currentState.taskItemList[indexToAddTask];
        this._addTaskAfter = true;

        // Show location line after adding task.
        this._showAddTaskLocation = true;

        return newTaskItem.getKey();
    }

    private _createTaskItem(task: ITask): TaskItem {
        // handle the case where a definition was created before condition support was added
        if (task.condition === undefined) {
            if (task.alwaysRun) {
                task.condition = TaskConditions.SucceededOrFailed;
            }
            else {
                task.condition = TaskConditions.Succeeded;
            }
        }

        return TaskItem.createTaskItem(
            task,
            this._taskContext);
    }

    private _shiftTask(itemId: string, shiftBy: number): void {
        if (this._currentState && this._currentState.taskItemList && this._currentState.taskItemList.length > 0) {

            let taskIndex = -1, targetTaskIndex = -1;
            this._currentState.taskItemList.forEach((item: TaskItem, index: number) => {
                if (item && item.getKey() === itemId) {
                    taskIndex = index;
                    return;
                }
            });

            targetTaskIndex = taskIndex + shiftBy;

            if (taskIndex !== -1 && targetTaskIndex !== -1 && targetTaskIndex < this._currentState.taskItemList.length) {
                targetTaskIndex = shiftBy < 0 ? targetTaskIndex : targetTaskIndex + 1;
                this._updateState(this._currentState, Utils_Array.reorder(this._currentState.taskItemList, taskIndex, targetTaskIndex, 1));
            }
        }
    }

    private _updateStates(taskItems: TaskItem[]) {
        this._updateState(this._originalState, taskItems);
        this._updateState(this._currentState, taskItems);
        this._addTaskLocationItem = this._currentState.taskItemList[this._currentState.taskItemList.length - 1];
        this._addTaskAfter = true;
        this._showAddTaskLocation = false;
    }

    private _updateState(state: ITaskListState, taskItems: TaskItem[]): void {
        state.taskItemList = Utils_Array.clone<TaskItem>(taskItems);
    }

    private _handleAddTask = (payload: IAddTaskPayload) => {


        this._additionInProgressTaskId = this._addTask(payload.task);

        this.emitChanged();
    }

    private _handleRemoveTask = (payload: Actions.IRemoveTaskPayload) => {

        let filteredItems = DtcUtils.removeItemFromList(this._currentState.taskItemList, payload.taskItemId);

        this._currentState.taskItemList = filteredItems.items as TaskItem[];
        this._itemToBeSelected = payload.disposeTaskItem ? (filteredItems.nextItem as TaskItem) : null;
        // if the deleted item is reference by _addTaskLocationItem, then we need to update the same.
        // for move/clone/insert selected will set this _addTaskLocationItem to right item, there we are covered.
        this._addTaskLocationItem = this._currentState.taskItemList[this._currentState.taskItemList.length - 1];

        this.emitChanged();

        // Calling object cleanup after emitChanged() so that cleanup doesn't impact view change perf
        if (filteredItems.removedItem && payload.disposeTaskItem) {
            (filteredItems.removedItem as TaskItem).dispose();
        }
    }

    private _handleUpdateTasks = (updateTasksPayload: Actions.IUpdateTaskPayload) => {

        if (!updateTasksPayload) {
            return;
        }

        let tasks: ITask[] = updateTasksPayload.tasks || [];
        let itemsToDispose: TaskItem[];
        let taskItemList: TaskItem[] = [];

        if (updateTasksPayload.forceUpdate || (this._currentState.taskItemList.length === 0 && tasks.length > 0)) {
            this.taskCounter = tasks.length;

            // Represents the case when the store is initialized with model from the server.
            itemsToDispose = this._currentState.taskItemList;
            taskItemList = tasks.map((task) => {
                return this._createTaskItem(task);
            });
            this._updateStates(taskItemList);

            this.emitChanged();
        }
        else if (this._currentState.taskItemList.length === tasks.length) {

            // Represents the case when the store is updated with model from the server.
            this._currentState.taskItemList.forEach((taskItem: TaskItem, index: number) => {
                taskItem.updateTask(tasks[index]);
            });

            this._updateState(this._originalState, this._currentState.taskItemList);
        }

        if (itemsToDispose) {
            itemsToDispose.forEach((item: TaskItem) => {
                item.dispose();
            });
        }
    }

    private _handleSelectItem = (selectedItemInfo: ItemSelectorActions.ItemInformation) => {
        if (selectedItemInfo.data instanceof TaskItem) {
            this._addTaskLocationItem = <TaskItem>selectedItemInfo.data;
            this._showAddTaskLocation = false;
        } else if (selectedItemInfo.data instanceof AddTaskItem) {

            let data = selectedItemInfo.data as AddTaskItem;

            // If current taskListStore is the target, then only show AddTaskLocation
            if (data.getAddTaskItemDetails().taskListStoreInstanceId === this.getInstanceId()) {
                this._showAddTaskLocation = true;
            } else {
                this._showAddTaskLocation = false;
            }

        } else {
            this._addTaskLocationItem = this._currentState.taskItemList[this._currentState.taskItemList.length - 1];
            this._showAddTaskLocation = false;
        }

        // on selection of task, default add task position should be set as after the selected task
        this._addTaskAfter = true;

        this.emitChanged();
    }

    private _handleClearAddTaskLocation = (emptyPayload: IEmptyActionPayload) => {
        // If any location line is visible then clear it and re-enable after drag/drop.
        if (this._showAddTaskLocation) {
            this._showAddTaskLocation = false;
            this.emitChanged();
        }
    }

    private _handleShiftTask = (shiftTaskItemPayload: IShiftListItemPayload) => {
        if (shiftTaskItemPayload) {
            this._shiftTask(shiftTaskItemPayload.itemKey, shiftTaskItemPayload.shiftBy);
            this.emitChanged();
        }
    }

    private _handleCloneTask = (taskItemIdList: string[]) => {

        let selectedTaskList: TaskItem[] = this._getTaskListFromTaskIdSet(taskItemIdList);

        let indexToAdd: number = this.getState().taskItemList.indexOf(selectedTaskList[selectedTaskList.length - 1]) + 1;

        selectedTaskList.forEach((task: TaskItem) => {
            let clonedTask = task.getClonedTask();


            let newTaskItem = this._createTaskItem(clonedTask);
            this.getState().taskItemList.splice(indexToAdd++, 0, newTaskItem);
        });

        this.emitChanged();
    }

    private _handleMetaTaskCreated = (actionPayload: Actions.IMetaTaskCreatedPayload) => {
        let selectedTaskList: TaskItem[] = this._getTaskListFromTaskIdSet(actionPayload.taskItemIdList);
        let taskItemList = this.getState().taskItemList;

        selectedTaskList.forEach((taskItem: TaskItem, index: number) => {
            let indexOfTask: number = taskItemList.indexOf(taskItem);

            // Ideally this shouldn't happen
            if (indexOfTask === -1) {
                return true;
            }

            // Replace the first task with MetaTask and delete the rest
            if (index === 0) {
                let taskGroup = actionPayload.metaTask;

                this._itemToBeSelected = this._createTaskItem(taskGroup);
                taskItemList.splice(indexOfTask, 1, this._itemToBeSelected);
            } else {
                taskItemList.splice(indexOfTask, 1);
            }
        });

        this.emitChanged();

        // Cleanup
        selectedTaskList.forEach((taskItem: TaskItem) => {
            taskItem.dispose();
        });
    }

    private _handleInsertTask = (insertTaskItemData: IInsertListItemData) => {
        if (insertTaskItemData && insertTaskItemData.sourceItem && insertTaskItemData.sourceItem.data) {
            let shouldSelectNewItem = true;
            let sourceTask = insertTaskItemData.sourceItem.data as TaskItem;
            if (Utils_String.equals(insertTaskItemData.sourceItem.key, TASK_DEFINITION_DATA_KEY)) {
                // add new task
                let task = DtcUtils.getTaskFromTaskDefinition(insertTaskItemData.sourceItem.data as ITaskDefinitionItem);

                insertTaskItemData.sourceItem.data = this._createTaskItem(task);
                shouldSelectNewItem = false;

                // Show location line after adding task.
                this._addTaskLocationItem = insertTaskItemData.sourceItem.data;
                this._showAddTaskLocation = true;
            }
            else if (insertTaskItemData.shouldInsertCopy) {
                // insert clone of task
                insertTaskItemData.sourceItem.data = this._createTaskItem(sourceTask.getClonedTask());
            }
            else if (!(sourceTask.getTaskContext().taskListStoreInstanceId === this.getInstanceId())) {
                // moving task across phases
                sourceTask.setTaskContext(this._taskContext);
                insertTaskItemData.sourceItem.data = sourceTask;
            }
            let itemList: TaskItem[] = DtcUtils.insertItemInList(insertTaskItemData, this._currentState.taskItemList)
                .map((item: Item) => { return (item as TaskItem); });
            if (itemList) {
                this._currentState.taskItemList = itemList;
                if (shouldSelectNewItem) {
                    this._itemToBeSelected = insertTaskItemData.sourceItem.data as TaskItem;
                }
                this.emitChanged();
            }
        }
    }

    private _getTaskListFromTaskIdSet(taskItemIdList: string[]): TaskItem[] {
        let keyString: string = Utils_String.empty;

        taskItemIdList.forEach((key: string) => {
            keyString += key + " ";
        });

        return this.getState().taskItemList.filter((taskItem: TaskItem) => {
            return Utils_String.caseInsensitiveContains(keyString, taskItem.getKey());
        });
    }

    private _initializeTaskContext(): void {
        this._taskContext = {
            ...this._taskContextOptions,
            onChangeDelegate: this.emitChanged.bind(this),
            // Calling a delegate from within an arrow method
            // This is being done because in case of CD, removeTaskDelegate is not set initially
            // Hence, null was being send in the taskContext that got added as part of initialize
            // Now, the arrow method will always be defined and by the time remove is triggered,
            // the delegate will get set.
            onRemoveDelegate: (taskItemId: string) => {
                if (!!this.removeTaskCallDelegate) {
                    this.removeTaskCallDelegate(taskItemId);
                }
            },
            processInstanceId: this._appContext.processInstanceId,
            taskListStoreInstanceId: this.getInstanceId(),
            isActiveDelegate: this.isActive,
            isFileSystemBrowsable: this._appContext.isFileSystemBrowsable,
            taskDelegates: this._appContext.taskDelegates,
            processParametersNotSupported: this._appContext.processParametersNotSupported
        };
    }

    private _handleCompleteTaskAddition = (emptyPayload: IEmptyActionPayload) => {
        if (this._additionInProgressTaskId) {
            this._additionInProgressTaskId = Utils_String.empty;
            this.emitChanged();
        }
    }

    private _showAddTaskLocation: boolean;
    private _additionInProgressTaskId: string;
    private _addTaskLocationItem: TaskItem;
    private _addTaskAfter: boolean;
    private _taskContext: ITaskContext;
    private _taskContextOptions: ITaskContextOptions;
    private _itemToBeSelected: TaskItem;
    private _currentState: ITaskListState;
    private _originalState: ITaskListState;
    private _taskList: ITask[];
    private _appContext: IApplicationLayerContext;
    private _itemSelectionInstanceId: string;

    private _taskListActions: Actions.TaskListActions;
    private _itemSelectorActions: ItemSelectorActions.Actions;
}