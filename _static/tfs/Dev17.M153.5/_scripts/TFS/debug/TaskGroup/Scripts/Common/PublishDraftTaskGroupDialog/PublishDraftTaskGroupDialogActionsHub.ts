import { ActionsHubBase, Action, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { DialogActionKeys } from "TaskGroup/Scripts/Common/Constants";

export interface ICommentUpdatedPayload {
    comment: string;
}

export interface IPreviewFlagPayload {
    isPreview: boolean;
}

export class PublishDraftTaskGroupDialogActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return DialogActionKeys.PublishDraftTaskGroupDialogActionHub;
    }

    public initialize(): void {
        this._notifyPublishComplete = new Action<IEmptyActionPayload>();
        this._updateComment = new Action<ICommentUpdatedPayload>();
        this._updateIsPreview = new Action<IPreviewFlagPayload>();
        this._notifyPublishStarted = new Action<IEmptyActionPayload>();
        this._notifyPublishFailed = new Action<IEmptyActionPayload>();
    }

    public get notifyPublishComplete(): Action<IEmptyActionPayload> {
        return this._notifyPublishComplete;
    }

    public get updateComment(): Action<ICommentUpdatedPayload> {
        return this._updateComment;
    }

    public get updateIsPreview(): Action<IPreviewFlagPayload> {
        return this._updateIsPreview;
    }

    public get notifyPublishFailed(): Action<IEmptyActionPayload> {
        return this._notifyPublishFailed;
    }

    public get notifyPublishStarted(): Action<IEmptyActionPayload> {
        return this._notifyPublishStarted;
    }

    private _notifyPublishComplete: Action<IEmptyActionPayload>;
    private _updateComment: Action<ICommentUpdatedPayload>;
    private _updateIsPreview: Action<IPreviewFlagPayload>;
    private _notifyPublishFailed: Action<IEmptyActionPayload>;
    private _notifyPublishStarted: Action<IEmptyActionPayload>;
}