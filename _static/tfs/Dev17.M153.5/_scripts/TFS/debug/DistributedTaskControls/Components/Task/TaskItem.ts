/// <reference types="react" />

import * as React from "react";

import { AppCapability, AppContext } from "DistributedTaskControls/Common/AppContext";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { TASK_ITEM_PREFIX, Workflow } from "DistributedTaskControls/Common/Common";
import { Item, ItemOverviewAriaProps } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IProcessParameterReferenceData, ITaskContext } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TaskActionCreator } from "DistributedTaskControls/Components/Task/TaskActionsCreator";
import { ControllerView as TaskDetailsView, ITaskDetailsViewProps } from "DistributedTaskControls/Components/Task/TaskDetailsView";
import { ITaskItemOverviewProps, TaskItemOverview } from "DistributedTaskControls/Components/Task/TaskItemOverview";
import { ITaskStoreArgs, TaskStore } from "DistributedTaskControls/Components/Task/TaskStore";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import { ITask, TaskGroupType, DefinitionType } from "DistributedTasksCommon/TFS.Tasks.Types";

import { TaskDefinition } from "TFS/DistributedTask/Contracts";

import * as Diag from "VSS/Diag";

export interface ITaskItemOverviewOptions {
    instanceId?: string;
    taskListKeys?: string[];
    taskGroupType?: TaskGroupType;
    isTaskAdditionInProgress?: boolean;
    onRemoveTaskAnimationComplete?: (instanceId: string) => void;
    onRenderOverview?: (props: ITaskItemOverviewProps) => JSX.Element | null;
    ariaProps?: ItemOverviewAriaProps;
}
/**
 * @brief Implements a task item that can be hosted in TwoPanelSelector representing a CI/CD task
 */
export class TaskItem implements Item {

    constructor(taskContext: ITaskContext, taskInstance: ITask) {

        if (!TaskItem._intantiatorLock) {
            throw new Error("Error: Direct instantiation of TaskItem object is not allowed. Please use TaskItem.createTaskItem() method.");
        }

        this._initialize(taskContext, taskInstance);
    }

    public getOverview(args: ITaskItemOverviewOptions): JSX.Element {
        Diag.logVerbose("[TaskItem.getOverview]: Method called");

        const taskDefinition: TaskDefinition = this._store.getTaskDefinition();
        const taskContext: ITaskContext = this._store.getTaskContext();
        const overviewProps: ITaskItemOverviewProps = <ITaskItemOverviewProps>{
            key: this.getKey(),
            controllerInstanceId: this._uniqueTaskInstanceId,
            instanceId: args.instanceId,
            iconUrl: taskDefinition.iconUrl,
            description: taskDefinition.friendlyName,
            item: this,
            taskItemKeys: args.taskListKeys,
            showLocationLine: taskContext.isActiveDelegate(this._uniqueTaskInstanceId),
            parentTaskListInstanceId: taskContext.taskListStoreInstanceId,
            processInstanceId: taskContext.processInstanceId,
            taskGroupType: args.taskGroupType,
            isTaskAdditionInProgress: args.isTaskAdditionInProgress,
            onRemoveTaskAnimationComplete: args.onRemoveTaskAnimationComplete,
            ariaProps: args.ariaProps
        };

        this._overView = args.onRenderOverview
            ? args.onRenderOverview(overviewProps)
            : React.createElement(TaskItemOverview, overviewProps);

        return this._overView;
    }

    public getDetails(): JSX.Element {
        Diag.logVerbose("[TaskItem.getDetails]: Method called");
        let taskDefinition = this._store.getTaskDefinition();
        let taskInstance = this._store.getTaskInstance();
        let taskContext = this._store.getTaskContext();

        if (!this._details) {
            this._details = React.createElement(TaskDetailsView, <ITaskDetailsViewProps>{
                key: this.getKey(),
                processInstanceId: taskContext.processInstanceId,
                controllerInstanceId: this._uniqueTaskInstanceId,
                taskInstance: taskInstance,
                processParametersNotSupported: taskContext.processParametersNotSupported
            });
        }
        return this._details;
    }

    public getKey(): string {
        Diag.logVerbose("[TaskItem.getKey]: Method called");
        return this._uniqueTaskInstanceId;
    }

    public isDirty(): boolean {
        Diag.logVerbose("[TaskItem.isDirty]: Method called");
        return this._store.isDirty();
    }

    public isValid(): boolean {
        Diag.logVerbose("[TaskItem.isValid]: Method called");
        return this._store.isValid();
    }

    public getTask(): ITask {
        return this._store.getTaskPayload();
    }

    public getClonedTask(): ITask {
        return this._store.getClonedTaskInstance();
    }

    public updateTask(task: ITask): void {
        this._store.updateTask(task);
    }

    public getReadOnlyDemands(): any[] {
        if (this._taskDefinition.definitionType === DefinitionType.metaTask && AppContext.instance().isCapabilitySupported(AppCapability.ShowTaskGroupDemands)) {
            let demands = TaskDefinitionSource.instance().getTaskDefinitionDemandsFromTaskId(this._taskDefinition.id);
            if (demands != null && demands.length > 0) {
                return demands;
            } else {
                return this._taskDefinition.demands;
            }
        } else {
            return this._taskDefinition.demands;
        }
    }

    public getSatisfies(): string[] {
        return this._taskDefinition.satisfies || [];
    }

    public getRunsOn(): string[] {
        return this._taskDefinition.runsOn;
    }

    public setTaskContext(taskContext: ITaskContext): void {
        this._store.removeChangedListener(() => {
            // unregister current change listener
            this._store.getTaskContext().onChangeDelegate();
        });
        this._store.setTaskContext(taskContext);
        this._store.addChangedListener(() => {
            taskContext.onChangeDelegate();
        });
    }

    public removeTask(): void {
        let taskContext = this._store.getTaskContext();
        if (taskContext && taskContext.onRemoveDelegate) {
            taskContext.onRemoveDelegate(this._uniqueTaskInstanceId);
        }
    }

    public getViewContext(): Workflow {
        return Workflow.Build;  // TODO: This is a hard-coding done as of now.
    }

    public getProcessParameterNameToReferenceCount(): IProcessParameterReferenceData[] {
        return this._store.getProcessParameterNameToReferenceCount();
    }

    public dispose(): void {
        Diag.logVerbose("[TaskItem.dispose]: Method called");
        StoreManager.DeleteStore<TaskStore>(TaskStore, this._uniqueTaskInstanceId);
        ActionCreatorManager.DeleteActionCreator<TaskActionCreator>(TaskActionCreator, this._uniqueTaskInstanceId);
    }

    /**
     * @brief Added for UT
     */
    public getTaskContext(): ITaskContext {
        return this._store.getTaskContext();
    }

    public static createTaskItem(task: ITask, taskContext: ITaskContext): TaskItem {
        TaskItem._intantiatorLock = true;
        let taskItem = new TaskItem(taskContext, task);
        TaskItem._intantiatorLock = false;

        taskItem._store.addChangedListener(() => {
            taskContext.onChangeDelegate();
        });

        return taskItem;
    }

    /**
     * @brief Strictly for Testing purpose
     */
    protected getStore(): TaskStore {
        return this._store;
    }

    private _initialize(taskContext: ITaskContext, taskInstance: ITask): void {
        // Get unique task instance id
        this._uniqueTaskInstanceId = TASK_ITEM_PREFIX + DtcUtils.getUniqueInstanceId();

        // Instantiate ActionCreator for the task
        this._actionCreator = ActionCreatorManager.GetActionCreator<TaskActionCreator>(TaskActionCreator, this._uniqueTaskInstanceId);

        // Get task versions.
        let taskVersionInfoList = TaskDefinitionSource.instance().getTaskVersionInfoList(taskInstance.task.id);

        // Get relevant task definition.
        this._taskDefinition = TaskDefinitionSource.instance().getTaskDefinition(taskInstance.task.id, taskInstance.task.versionSpec || "*") ||
            // Adding "taskInstance" for CustomerIntelligence telemetry events
            // TODO: ankhokha: remove taskInstance after sufficient telemetry is logged
            TaskDefinitionSource.instance().getEmptyTaskDefinition(taskInstance.displayName, taskInstance.task.definitionType, taskInstance);

        // Instantiate Store for the task
        this._store = StoreManager.CreateStore<TaskStore, ITaskStoreArgs>(TaskStore, this._uniqueTaskInstanceId, {
            taskInstance: taskInstance,
            taskDefinition: this._taskDefinition,
            taskVersionInfoList: taskVersionInfoList,
            taskContext: taskContext
        });
    }

    private static _intantiatorLock: boolean;

    private _taskDefinition: TaskDefinition;
    private _store: TaskStore;
    private _overView: JSX.Element;
    private _details: JSX.Element;
    private _actionCreator: TaskActionCreator;
    private _uniqueTaskInstanceId: string;
}
