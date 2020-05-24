import {
    localeComparer as localeStringComparer,
    empty as emptyString
} from "VSS/Utils/String";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { getMajorVersionSpec, getTaskGroupInstanceNameFormat } from "DistributedTasksCommon/TFS.Tasks.Utils";

import { IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { TaskGroupPropertiesStore, ITaskGroupPropertiesState } from "DistributedTaskControls/Stores/TaskGroupPropertiesStore";
import { TaskGroupParametersStore } from "DistributedTaskControls/Stores/TaskGroupParametersStore";

import {
    TaskGroupPropertiesItemActionsHub,
    ITaskGroupPayload
} from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemActionsHub";
import { StoreKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { TaskGroupPropertiesItem } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItem";
import { getTaskGroupDisplayName } from "TaskGroup/Scripts/Utils/TaskGroupUtils";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface ITaskGroupPropertiesItemState extends IStoreState {
    name: string;
    versionString: string;
    hasResolvedParameters: boolean;
}

export class TaskGroupPropertiesItemStore extends AggregatorDataStoreBase {

    public static getKey(): string {
        return StoreKeys.TaskGroupPropertiesItemStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._originalState = {} as ITaskGroupPropertiesItemState;

        this._currentState = {} as ITaskGroupPropertiesItemState;

        this._taskGroupPropertiesItemActionsHub = ActionsHubManager.GetActionsHub<TaskGroupPropertiesItemActionsHub>(TaskGroupPropertiesItemActionsHub, instanceId);
        this._taskGroupPropertiesItemActionsHub.updateTaskGroup.addListener(this._onUpdateTaskGroup);

        this._taskGroupPropertiesStore = StoreManager.GetStore<TaskGroupPropertiesStore>(TaskGroupPropertiesStore, instanceId);
        this.addToStoreList(this._taskGroupPropertiesStore);

        // Make sure the task list store is created before this. One of the child stores depends on the task list store
        this._taskGroupParametersStore = StoreManager.GetStore<TaskGroupParametersStore>(TaskGroupParametersStore, instanceId);
        this.addToStoreList(this._taskGroupParametersStore);
    }

    public disposeInternal(): void {
        this._taskGroupPropertiesItemActionsHub.updateTaskGroup.removeListener(this._onUpdateTaskGroup);
        super.disposeInternal();
    }

    public updateVisitor(taskGroup: DTContracts.TaskGroup): void {
        this.getDataStoreList().forEach((store) => store.updateVisitor(taskGroup));
        taskGroup.instanceNameFormat = getTaskGroupInstanceNameFormat(taskGroup.name, taskGroup.inputs);
    }

    public getState(): ITaskGroupPropertiesItemState {
        const taskGroupPropertiesState = this._taskGroupPropertiesStore.getState();
        this._currentState.name = getTaskGroupDisplayName(taskGroupPropertiesState.name, this._isDraft, this._isPreview);

        const taskGroupParametersState = this._taskGroupParametersStore.getState();
        this._currentState.hasResolvedParameters = !!taskGroupParametersState.metaTaskData.metaTaskInputs && taskGroupParametersState.metaTaskData.metaTaskInputs.length > 0;

        return this._currentState;
    }

    public arePropertiesValid(): boolean {
        return this._taskGroupPropertiesStore.isValid();
    }

    private _onUpdateTaskGroup = (payload: ITaskGroupPayload) => {
        this._isDraft = payload.taskGroup.version.isTest;
        this._isPreview = payload.taskGroup.preview;
        this._originalState = this._getStateFromTaskGroup(payload.taskGroup);
        this._currentState = this._getStateFromTaskGroup(payload.taskGroup);
        this.emitChanged();
    }

    private _getStateFromTaskGroup(taskGroup: DTContracts.TaskGroup): ITaskGroupPropertiesItemState {
        return {
            name: getTaskGroupDisplayName(taskGroup.name, this._isDraft, this._isPreview),
            versionString: getMajorVersionSpec(taskGroup.version),
            hasResolvedParameters: false
        };
    }

    private _isDraft: boolean;
    private _isPreview: boolean;
    private _originalState: ITaskGroupPropertiesItemState;
    private _currentState: ITaskGroupPropertiesItemState;
    private _taskGroupPropertiesItemActionsHub: TaskGroupPropertiesItemActionsHub;
    private _taskGroupPropertiesStore: TaskGroupPropertiesStore;
    private _taskGroupParametersStore: TaskGroupParametersStore;
}