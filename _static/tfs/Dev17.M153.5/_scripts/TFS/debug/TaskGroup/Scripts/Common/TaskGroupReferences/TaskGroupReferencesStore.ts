import * as DTContracts from "TFS/DistributedTask/Contracts";

import {
    ITaskGroupReference,
    ITaskGroupReferenceGroup
} from "DistributedTask/TaskGroups/ExtensionContracts";

import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import {
    TaskGroupReferencesActionsHub,
    ITaskGroupReferencesPayload,
} from "TaskGroup/Scripts/Common/TaskGroupReferences/TaskGroupReferencesActionsHub";
import { TaskGroupReferencesStoreKeys } from "TaskGroup/Scripts/Common/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface ITaskGroupReferencesState extends IStoreState {
    referenceGroups: ITaskGroupReferenceGroup[];
}

export class TaskGroupReferencesStore extends StoreBase {
    public static getKey(): string {
        return TaskGroupReferencesStoreKeys.TaskGroupReferencesStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._state = {
            referenceGroups: []
        };

        this._taskGroupReferencesActionHub = ActionsHubManager.GetActionsHub<TaskGroupReferencesActionsHub>(TaskGroupReferencesActionsHub);
        this._taskGroupReferencesActionHub.getTaskGroupReferences.addListener(this._onGetTaskGroupReferences);
        this._taskGroupReferencesActionHub.resetAllReferences.addListener(this._onResetAllReferences);
    }

    public disposeInternal(): void {
        this._taskGroupReferencesActionHub.getTaskGroupReferences.removeListener(this._onGetTaskGroupReferences);
        this._taskGroupReferencesActionHub.resetAllReferences.removeListener(this._onResetAllReferences);
    }

    getState(): ITaskGroupReferencesState {
        return this._state;
    }

    private _onGetTaskGroupReferences = (payload: ITaskGroupReferencesPayload) => {
        this._state = { ...payload };
        this.emitChanged();
    }

    private _onResetAllReferences = (payload) => {
        this._state = { referenceGroups: null };
        this.emitChanged();
    }

    private _state: ITaskGroupReferencesState;
    private _taskGroupReferencesActionHub: TaskGroupReferencesActionsHub;
}