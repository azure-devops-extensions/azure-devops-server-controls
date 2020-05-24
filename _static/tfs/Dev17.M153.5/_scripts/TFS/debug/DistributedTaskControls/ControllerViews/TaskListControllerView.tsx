/// <reference types="react" />

import * as React from "react";

import { Actions as ItemSelectorActions, ItemInformation } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { TaskListActionsCreator } from "DistributedTaskControls/Actions/TaskListActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { TASK_DEFINITION_DATA_KEY, TASK_ITEM_PREFIX } from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { DragDropManager } from "DistributedTaskControls/Common/DragDropManager";
import { Item, ItemOverviewAriaProps } from "DistributedTaskControls/Common/Item";
import { KeyCodes } from "DistributedTaskControls/Common/ShortKeys";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Properties, Source, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { IInsertListItemData, IUpdateProcessParameterReferencePayload } from "DistributedTaskControls/Common/Types";
import { TaskActionCreator } from "DistributedTaskControls/Components/Task/TaskActionsCreator";
import { ITaskItemOverviewOptions, TaskItem } from "DistributedTaskControls/Components/Task/TaskItem";
import { ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { ITaskListState, TaskListStore } from "DistributedTaskControls/Stores/TaskListStore";

import { TaskGroupType } from "DistributedTasksCommon/TFS.Tasks.Types";

import { List } from "OfficeFabric/List";

import * as Diag from "VSS/Diag";
import { announce } from "VSS/Utils/Accessibility";
import * as ArrayUtils from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

export interface ITaskListControllerViewProps extends ComponentBase.IProps {
    onRemove: () => void;
    taskListStoreInstanceId: string;
    taskGroupType?: TaskGroupType;
    treeLevel?: number;
}

/**
 * Encapsulates the controller view for task list.
 */
export class TaskListControllerView extends ComponentBase.Component<ITaskListControllerViewProps, ITaskListState> {

    public componentWillMount() {
        this._store = StoreManager.GetStore<TaskListStore>(TaskListStore, this.props.taskListStoreInstanceId);
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<TaskListActionsCreator>(TaskListActionsCreator, this.props.taskListStoreInstanceId);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, this.props.instanceId);
        this._processManagementStore = StoreManager.GetStore<ProcessManagementStore>(ProcessManagementStore, this._store.getProcessInstanceId());

        DragDropManager.instance().registerInsertCallback(this.props.taskListStoreInstanceId, this._insertTask);
        DragDropManager.instance().registerRemoveCallback(this.props.taskListStoreInstanceId, this._removeTask);

        this._store.removeTaskCallDelegate = this._onRemoveTaskCallDelegate; // Initialize the callback for remove task

        this.setState(this._store.getState());
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        DragDropManager.instance().unregisterInsertCallback(this.props.taskListStoreInstanceId);
        DragDropManager.instance().unregisterRemoveCallback(this.props.taskListStoreInstanceId);

        this._store.removeChangedListener(this._onChange);

        if (this._addTaskAnimationTimeoutHandle) {
            this._addTaskAnimationTimeoutHandle.cancel();
        }
    }

    public render(): JSX.Element {
        return (
            <div className="task-list-container"
                onKeyDown={this._handleKeyDown} >
                <List
                    role="group"
                    items={ArrayUtils.clone(this.state.taskItemList)}
                    onRenderCell={this._onRenderItem}>
                </List>
            </div>
        );
    }

    public componentDidUpdate(): void {
        // Check if list changed and selection has gone obselete
        // If yes, then update the selection
        if (this._store.isSelectionObsolete()) {
            // Reset selection is done async to break the ActionInvoke loop.
            // Also, selection is orthogonal to change in Task list, this should be fine
            Utils_Core.delay(this, 10, () => {
                this._resetSelections();
            });
        }

        if (this._store.getAdditionInProgressTaskInstanceId()) {
            this._addTaskAnimationTimeoutHandle = Utils_Core.delay(this, 500, () => {
                this._addTaskAnimationTimeoutHandle = null;
                this._actionCreator.completeTaskAddition();
            });
        }
    }

    private _onRenderItem = (taskItem: TaskItem, index: number) => {

        const taskItemOverviewOptions: ITaskItemOverviewOptions = {
            instanceId: this.props.instanceId,
            taskListKeys: this._store.getTaskKeys(),
            taskGroupType: this.props.taskGroupType,
            isTaskAdditionInProgress: this._store.isTaskAdditionInProgress(taskItem.getKey()),
            onRemoveTaskAnimationComplete: this._onTaskRemove,
            ariaProps: {
                level: this.props.treeLevel,
                setSize: this.state.taskItemList ? this.state.taskItemList.length : 0,
                positionInSet: index + 1,
                role: "treeitem"
            } as ItemOverviewAriaProps
        };

        return taskItem.getOverview(taskItemOverviewOptions);
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (this._processManagementStore.canEditTasks()) {
            if (e.keyCode === KeyCode.DELETE) {
                //If delete is pressed remove all selected tasks
                this._removeSelectedTasks();
            }
            else if (e && e.ctrlKey && e.altKey) {
                switch (e.keyCode) {
                    case KeyCodes.MoveSelectedItemUp:
                        this._shiftSelectedTask(-1);
                        break;
                    case KeyCodes.MoveSelectedItemDown:
                        this._shiftSelectedTask(1);
                        break;
                }
            }
        }
    }

    private _removeSelectedTasks(): void {
        let selectedItems: ItemInformation[] = this._itemSelectionStore.getState().selectedItems.filter((item) => {
            return (Utils_String.caseInsensitiveContains(item.data.getKey(), TASK_ITEM_PREFIX));
        });

        if (selectedItems) {
            let selectedTasks: Item[] = selectedItems.map((item) => {
                return item.data;
            });

            selectedTasks.forEach((item: Item) => {
                (item as TaskItem).removeTask();
            });

            let tasksRemovedText: string = selectedTasks.length === 1 ? Resources.TaskRemoved : Resources.TasksRemoved;
            announce(tasksRemovedText, true);

            // Update item list of selection store.
            this._itemSelectorActions.updateItemList.invoke(this.state.taskItemList);
            this._publishTelemetryForRemoveTask(selectedTasks.length);
        }
    }

    private _publishTelemetryForRemoveTask(itemLength: number) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.SelectedTasksLength] = itemLength;

        Telemetry.instance().publishEvent(Feature.RemoveTask, eventProperties, Source.Keyboard);
    }

    private _onTaskRemove = (taskComponentId: string) => {
        let taskItem = this._store.getState().taskItemList.filter((item: TaskItem) => {
            return (taskComponentId === item.getKey());
        })[0];

        let procParamReferencePayload = this._createReferenceCountPayload(taskItem, false);

        this._actionCreator.removeTask(taskComponentId, true, procParamReferencePayload);

        let nextItem = this._store.getNextItemToBeSelected();

        this._itemSelectorActions.deselectItem.invoke({ data: taskItem, canParticipateInMultiSelect: true });

        // Update item list of selection store.
        this._itemSelectorActions.updateItemList.invoke(this.state.taskItemList);

        if (!!nextItem) {
            this._itemSelectorActions.selectItem.invoke({ data: nextItem, canParticipateInMultiSelect: true });
        }
        else if (!!this.props.onRemove) {
            // since there are no more items left in the list, Remove the task list from Phase
            this.props.onRemove();
        }
        else {
            Diag.logError("[TaskListControllerView._onTaskRemove]: onRemove method has not been initialized.");
        }
    }

    private _onRemoveTaskCallDelegate = (taskComponentId: string) => {
        let taskActionCreator = ActionCreatorManager.GetActionCreator<TaskActionCreator>(TaskActionCreator, taskComponentId);
        taskActionCreator.markTaskAsDeleting();
    }

    private _createReferenceCountPayload(taskItem: TaskItem, shouldReferencesIncrease: boolean): IUpdateProcessParameterReferencePayload {
        let payload: IUpdateProcessParameterReferencePayload = {} as IUpdateProcessParameterReferencePayload;

        payload.processParameterReferencePayload = {
            processParameterReferenceData: taskItem ? taskItem.getProcessParameterNameToReferenceCount() : [],
            shouldReferencesIncrease: shouldReferencesIncrease
        };

        payload.processInstanceId = this._store.getProcessInstanceId();

        return payload;
    }

    private _insertTask = (insertData: IInsertListItemData) => {
        const isCopyAction = DragDropManager.instance().isCopyAction();

        let processParameterReferencePayload = Utils_String.equals(insertData.sourceItem.key, TASK_DEFINITION_DATA_KEY) ?
            null :
            this._createReferenceCountPayload(insertData.sourceItem.data, true);

        this._actionCreator.insertTask(insertData, isCopyAction, processParameterReferencePayload);

        let nextItem = this._store.getNextItemToBeSelected();

        if (!!nextItem) {
            this._itemSelectorActions.selectItem.invoke({ data: nextItem, canParticipateInMultiSelect: true });
        }
    }

    private _removeTask = (item: TaskItem) => {
        this._actionCreator.removeTask(item.getKey(), false);
    }

    /**
     * @brief Fetches the next item to be selected from store and resets the selection.
     */
    private _resetSelections(): void {
        this._itemSelectorActions.selectItem.invoke({
            data: this._store.getNextItemToBeSelected(),
            canParticipateInMultiSelect: true
        });
    }

    private _shiftSelectedTask(shiftBy: number) {
        let selectedItems: ItemInformation[] = this._itemSelectionStore.getState().selectedItems.filter((item) => {
            return (Utils_String.caseInsensitiveContains(item.data.getKey(), TASK_ITEM_PREFIX));
        });
        if (selectedItems && selectedItems.length === 1 && selectedItems[0]) {
            let selectedItem = selectedItems[0];
            let selectedItemKey = selectedItem.data.getKey();
            this._actionCreator.shiftTask(selectedItemKey, shiftBy);
            Telemetry.instance().publishEvent(Feature.MoveTask, {}, Source.Keyboard);
            // Update item list of selection store.
            this._itemSelectorActions.updateItemList.invoke(this.state.taskItemList);
        }
    }

    private _store: TaskListStore;
    private _itemSelectionStore: ItemSelectionStore;
    private _actionCreator: TaskListActionsCreator;
    private _itemSelectorActions: ItemSelectorActions;
    private _processManagementStore: ProcessManagementStore;
    private _addTaskAnimationTimeoutHandle: Utils_Core.DelayedFunction;

}
