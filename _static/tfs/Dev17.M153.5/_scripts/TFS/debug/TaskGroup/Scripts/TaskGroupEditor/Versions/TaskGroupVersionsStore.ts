import { empty as emptyString } from "VSS/Utils/String";
import { first as firstInArray, findIndex } from "VSS/Utils/Array";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import {
    IVersionsListPayload,
    ISelectedVersionPayload,
    IUpdateTaskGroupPayload,
    TaskGroupVersionsActionsHub
} from "TaskGroup/Scripts/TaskGroupEditor/Versions/TaskGroupVersionsActionsHub";
import { StoreKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";

export interface ITaskGroupVersionsStoreState extends IStoreState {
    allVersions: DTContracts.TaskGroup[];
    selectedVersion: DTContracts.TaskGroup;
}

export class TaskGroupVersionsStore extends StoreBase {

    public static getKey(): string {
        return StoreKeys.TaskGroupVersionsStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._state = {
            allVersions: [],
            selectedVersion: null
        };

        this._taskGroupVersionsActionsHub = ActionsHubManager.GetActionsHub<TaskGroupVersionsActionsHub>(TaskGroupVersionsActionsHub, instanceId);
        this._taskGroupVersionsActionsHub.updateVersionsList.addListener(this._onUpdateVersionsList);
        this._taskGroupVersionsActionsHub.updateSelectedVersion.addListener(this._onUpdateSelectedVersion);
        this._taskGroupVersionsActionsHub.updateTaskGroup.addListener(this._onUpdateTaskGroup);
    }

    public disposeInternal(): void {
        this._taskGroupVersionsActionsHub.updateVersionsList.removeListener(this._onUpdateVersionsList);
        this._taskGroupVersionsActionsHub.updateSelectedVersion.removeListener(this._onUpdateSelectedVersion);
        this._taskGroupVersionsActionsHub.updateTaskGroup.removeListener(this._onUpdateTaskGroup);
    }

    public getState(): ITaskGroupVersionsStoreState {
        return this._state;
    }

    public getTaskGroupWithMajorVersion(majorVersion: number): DTContracts.TaskGroup {
        return firstInArray(this._state.allVersions, (taskGroup) => taskGroup.version.major === majorVersion);
    }

    private _onUpdateVersionsList = (payload: IVersionsListPayload) => {
        this._state.allVersions = payload.versions;
        this.emitChanged();
    }

    private _onUpdateSelectedVersion = (payload: ISelectedVersionPayload) => {
        this._state.selectedVersion = payload.selectedVersion;
        this.emitChanged();
    }

    private _onUpdateTaskGroup = (payload: IUpdateTaskGroupPayload) => {
        const index = findIndex(
            this._state.allVersions,
            (taskGroup: DTContracts.TaskGroup) => taskGroup.version.major === payload.taskGroup.version.major);

        this._state.allVersions[index] = payload.taskGroup;

        if (this._state.selectedVersion.version.major === payload.taskGroup.version.major) {
            this._state.selectedVersion = payload.taskGroup;
        }

        this.emitChanged();
    }

    private _state: ITaskGroupVersionsStoreState;
    private _taskGroupVersionsActionsHub: TaskGroupVersionsActionsHub;
}