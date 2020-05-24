import { empty as emptyString } from "VSS/Utils/String";

import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import {
    PublishDraftTaskGroupDialogActionsHub,
    ICommentUpdatedPayload,
    IPreviewFlagPayload
} from "TaskGroup/Scripts/Common/PublishDraftTaskGroupDialog/PublishDraftTaskGroupDialogActionsHub";
import { DialogStoreKeys } from "TaskGroup/Scripts/Common/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface IPublishDraftTaskGroupDialogState extends IStoreState {
    publishComplete: boolean;
    publishInProgress: boolean;
    comment: string;
    isPreview: boolean;
}

export class PublishDraftTaskGroupDialogStore extends StoreBase {
    public static getKey(): string {
        return DialogStoreKeys.PublishDraftTaskGroupDialogStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._state = {
            publishComplete: false,
            publishInProgress: false,
            comment: emptyString,
            isPreview: false
        };

        this._publishDraftTaskGroupDialogActionsHub = ActionsHubManager.GetActionsHub<PublishDraftTaskGroupDialogActionsHub>(PublishDraftTaskGroupDialogActionsHub);
        this._publishDraftTaskGroupDialogActionsHub.updateComment.addListener(this._onUpdateComment);
        this._publishDraftTaskGroupDialogActionsHub.notifyPublishComplete.addListener(this._onPublishComplete);
        this._publishDraftTaskGroupDialogActionsHub.updateIsPreview.addListener(this._onIsPreviewChange);
        this._publishDraftTaskGroupDialogActionsHub.notifyPublishStarted.addListener(this._onPublishStarted);
        this._publishDraftTaskGroupDialogActionsHub.notifyPublishFailed.addListener(this._onPublishFailed);
    }

    public disposeInternal(): void {
        this._publishDraftTaskGroupDialogActionsHub.updateComment.removeListener(this._onUpdateComment);
        this._publishDraftTaskGroupDialogActionsHub.notifyPublishComplete.removeListener(this._onPublishComplete);
        this._publishDraftTaskGroupDialogActionsHub.updateIsPreview.removeListener(this._onIsPreviewChange);
        this._publishDraftTaskGroupDialogActionsHub.notifyPublishStarted.removeListener(this._onPublishStarted);
        this._publishDraftTaskGroupDialogActionsHub.notifyPublishFailed.removeListener(this._onPublishFailed);
    }

    public getState(): IPublishDraftTaskGroupDialogState {
        return this._state;
    }

    private _onUpdateComment = (payload: ICommentUpdatedPayload) => {
        this._state.comment = payload.comment;
        this.emitChanged();
    }

    private _onPublishComplete = (payload: {}) => {
        this._state.publishComplete = true;
        this.emitChanged();
    }

    private _onIsPreviewChange = (payload: IPreviewFlagPayload) => {
        this._state.isPreview = payload.isPreview;
        this.emitChanged();
    }

    private _onPublishStarted = (payload: {}) => {
        this._state.publishInProgress = true;
        this.emitChanged();
    }

    private _onPublishFailed = (payload: {}) => {
        this._state.publishInProgress = false;
        this.emitChanged();
    }

    private _state: IPublishDraftTaskGroupDialogState;
    private _publishDraftTaskGroupDialogActionsHub: PublishDraftTaskGroupDialogActionsHub;
}