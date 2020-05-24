
import * as Q from "q";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Actions from "DistributedTaskControls/Actions/TaskListActions";
import { ProcessParameterActions } from "DistributedTaskControls/Actions/ProcessParameterActions";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys, Workflow } from "DistributedTaskControls/Common/Common";
import { IAddTaskPayload, IInsertListItemData, IShiftListItemPayload, IUpdateProcessParameterReferencePayload, IUpdateReferencePayload } from "DistributedTaskControls/Common/Types";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { ITaskDefinitionItem } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import { TaskDefinition, TaskGroup } from "TFS/DistributedTask/Contracts";

export class TaskListActionsCreator extends ActionsBase.ActionCreatorBase {

    constructor() {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.TaskListActionsCreator;
    }

    public initialize(instanceId: string) {
        this._actions = ActionsHubManager.GetActionsHub<Actions.TaskListActions>(Actions.TaskListActions, instanceId);
    }

    public addTask(taskDefinition: ITaskDefinitionItem): void {
        this._actions.addTask.invoke({
            task: DtcUtils.getTaskFromTaskDefinition(taskDefinition)
        } as IAddTaskPayload);        
    }
    
    public removeTask(taskItemId: string, disposeTaskItem: boolean = true, processParamReferencePayload?: IUpdateProcessParameterReferencePayload): void {
        this._actions.removeTask.invoke({
            taskItemId: taskItemId,
            disposeTaskItem: disposeTaskItem
        } as Actions.IRemoveTaskPayload);

        //Check if this is removal action and not just movement
        if (disposeTaskItem && processParamReferencePayload) {
            //Call the update reference count action to update the process parameter reference counts
            this._updateProcessParametersReference(processParamReferencePayload);
        }
    }

    private _updateProcessParametersReference(payload: IUpdateProcessParameterReferencePayload): void {
        let processParametersActions = ActionsHubManager.GetActionsHub<ProcessParameterActions>(ProcessParameterActions, payload.processInstanceId);
        processParametersActions.updateReferenceCount.invoke(payload.processParameterReferencePayload);
    }

    public shiftTask(taskItemKey: string, shiftBy: number): void {
        this._actions.shiftTask.invoke({ itemKey: taskItemKey, shiftBy: shiftBy } as IShiftListItemPayload);
    }

    public clearAddTaskLocation(): void {
        this._actions.clearAddTaskLocation.invoke(null);
    }

    public cloneTasks(taskItemId: string[], processParameterData: IUpdateProcessParameterReferencePayload): void {
        this._actions.cloneTasks.invoke(taskItemId);
        //Call the update reference count action to update the process parameter reference counts
        this._updateProcessParametersReference(processParameterData);
    }

    public createMetaTask(metaTaskDefinition: TaskGroup, taskItemIdList: string[], workflow: Workflow, onMetaTaskCreated: (taskGroupId: string, taskGroupName: string) => void): IPromise<TaskGroup> {
        return TaskDefinitionSource.instance().saveMetaTaskDefinition(metaTaskDefinition, workflow)
            .then((savedTaskDefinition: TaskGroup) => {
                onMetaTaskCreated(savedTaskDefinition.id, savedTaskDefinition.name);
                let metaTask = DtcUtils.getTaskFromTaskDefinition(savedTaskDefinition as ITaskDefinitionItem);
                this._actions.metaTaskCreated.invoke({
                    metaTask: metaTask,
                    taskItemIdList: taskItemIdList
                });

                this._publishCreateTaskGroupTelemetery(savedTaskDefinition);

                return Q.resolve(savedTaskDefinition);
            }, (error) => {
                return Q.reject(error);
            });
    }

    public insertTask(insertData: IInsertListItemData, isCopyAction: boolean, processParamReferencePayload: IUpdateProcessParameterReferencePayload): void {
        this._actions.insertTask.invoke(insertData);

        if (isCopyAction && processParamReferencePayload) {
            this._updateProcessParametersReference(processParamReferencePayload);
        }
    }

    private _publishCreateTaskGroupTelemetery(savedTaskDefinition: TaskGroup) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.TaskCategory] = savedTaskDefinition.category;
        if (savedTaskDefinition.tasks) {
            eventProperties[Properties.SelectedTasksLength] = savedTaskDefinition.tasks.length;
        }

        Telemetry.instance().publishEvent(Feature.CreateTaskGroup, eventProperties);
    }

    public completeTaskAddition(): void {
        this._actions.completeTaskAddition.invoke(null);
    }

    private _processParameterActions: ProcessParameterActions;
    private _actions: Actions.TaskListActions;
}