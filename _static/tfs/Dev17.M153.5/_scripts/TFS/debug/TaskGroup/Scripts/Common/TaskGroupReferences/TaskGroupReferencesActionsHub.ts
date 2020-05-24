import {
    ITaskGroupReferenceGroup
} from "DistributedTask/TaskGroups/ExtensionContracts";

import { ActionsHubBase, Action } from "DistributedTaskControls/Common/Actions/Base";

import { TaskGroupReferencesActionKeys } from "TaskGroup/Scripts/Common/Constants";

export interface ITaskGroupReferencesPayload {
    referenceGroups: ITaskGroupReferenceGroup[];
}

export class TaskGroupReferencesActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return TaskGroupReferencesActionKeys.TaskGroupReferencesActionHub;
    }

    public initialize(): void {
        this._resetAllReferences = new Action<void>();
        this._getTaskGroupReferences = new Action<ITaskGroupReferencesPayload>();
    }

    public get getTaskGroupReferences(): Action<ITaskGroupReferencesPayload> {
        return this._getTaskGroupReferences;
    }

    public get resetAllReferences(): Action<void> {
        return this._resetAllReferences;
    }

    private _resetAllReferences: Action<void>;
    private _getTaskGroupReferences: Action<ITaskGroupReferencesPayload>;
}