import * as DTContracts from "TFS/DistributedTask/Contracts";

import { Action, ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { ActionKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";


export interface IUpdateTaskGroupPayload {
    taskGroup: DTContracts.TaskGroup;
}

export interface IVersionsListPayload {
    versions: DTContracts.TaskGroup[];
}

export interface ISelectedVersionPayload {
    selectedVersion: DTContracts.TaskGroup;
}

export class TaskGroupVersionsActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return ActionKeys.TaskGroupVersionsActionsHub;
    }

    public initialize(): void {
        this._updateTaskGroup = new Action<IUpdateTaskGroupPayload>();
        this._updateVersionsList = new Action<IVersionsListPayload>();
        this._updateSelectedVersion = new Action<ISelectedVersionPayload>();
    }

    public get updateVersionsList(): Action<IVersionsListPayload> {
        return this._updateVersionsList;
    }

    public get updateSelectedVersion(): Action<ISelectedVersionPayload> {
        return this._updateSelectedVersion;
    }


    public get updateTaskGroup(): Action<IUpdateTaskGroupPayload> {
        return this._updateTaskGroup;
    }

    private _updateTaskGroup: Action<IUpdateTaskGroupPayload>;
    private _updateVersionsList: Action<IVersionsListPayload>;
    private _updateSelectedVersion: Action<ISelectedVersionPayload>;
}