import { ActionsHubBase, Action, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { DialogActionKeys } from "TaskGroup/Scripts/Common/Constants";

export interface ISaveCommentUpdatedPayload {
    comment: string;
}

export class SaveTaskGroupDialogActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return DialogActionKeys.SaveTaskGroupDialogActionHub;
    }

    public initialize(): void {
        this._notifySaveStarted = new Action<IEmptyActionPayload>();
        this._notifySaveComplete = new Action<IEmptyActionPayload>();
        this._notifySaveFailed = new Action<IEmptyActionPayload>();
        this._updateComment = new Action<ISaveCommentUpdatedPayload>();
    }

    public get notifySaveComplete(): Action<IEmptyActionPayload> {
        return this._notifySaveComplete;
    }

    public get notifySaveFailed(): Action<IEmptyActionPayload> {
        return this._notifySaveFailed;
    }

    public get notifySaveStarted(): Action<IEmptyActionPayload> {
        return this._notifySaveStarted;
    }

    public get updateComment(): Action<ISaveCommentUpdatedPayload> {
        return this._updateComment;
    }

    private _notifySaveFailed: Action<IEmptyActionPayload>;
    private _notifySaveStarted: Action<IEmptyActionPayload>;
    private _notifySaveComplete: Action<IEmptyActionPayload>;
    private _updateComment: Action<ISaveCommentUpdatedPayload>;
}