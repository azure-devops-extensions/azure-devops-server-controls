import {Action, ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { DialogActionKeys } from "TaskGroup/Scripts/Common/Constants";

export interface IDeletedTaskGroupPayload {
    taskGroupId: string;
}

export class DeleteTaskGroupDialogActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return DialogActionKeys.DeleteTaskGroupDialogActionHub;
    }

    public initialize(): void {
        this._deleteTaskGroup = new Action<IDeletedTaskGroupPayload>();
        this._deleteStarted = new Action<IEmptyActionPayload>();
    }

    public get deleteTaskGroup(): Action<IDeletedTaskGroupPayload> {
        return this._deleteTaskGroup;
    }

    public get deleteStarted(): Action<IEmptyActionPayload> {
        return this._deleteStarted;
    }

    private _deleteTaskGroup: Action<IDeletedTaskGroupPayload>;
    private _deleteStarted: Action<IEmptyActionPayload>;
}