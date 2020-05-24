import { MessageBarType } from "OfficeFabric/components/MessageBar/MessageBar.types";

import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";

import {
    PublishDraftTaskGroupDialogActionsHub,
    ICommentUpdatedPayload
} from "TaskGroup/Scripts/Common/PublishDraftTaskGroupDialog/PublishDraftTaskGroupDialogActionsHub";
import { DialogActionCreatorKeys, MessageBarKeys } from "TaskGroup/Scripts/Common/Constants";
import { handleErrorAndDisplayInMessageBar, clearErrorMessage } from "TaskGroup/Scripts/Utils/ErrorUtils";

export class PublishDraftTaskGroupDialogActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return DialogActionCreatorKeys.PublishDraftTaskGroupDialogActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._publishDraftTaskGroupDialogActionsHub = ActionsHubManager.GetActionsHub<PublishDraftTaskGroupDialogActionsHub>(PublishDraftTaskGroupDialogActionsHub);
        this._messageHandlerActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
    }

    public notifyPublishCompleteSuccessfully(): void {
        this._publishDraftTaskGroupDialogActionsHub.notifyPublishComplete.invoke({});
    }

    public notifyPublishStarted(): void {
        this._publishDraftTaskGroupDialogActionsHub.notifyPublishStarted.invoke({});
    }

    public notifyPublishCompleteWithError(error: any): void {
        this._publishDraftTaskGroupDialogActionsHub.notifyPublishFailed.invoke({});
        handleErrorAndDisplayInMessageBar(error, this._messageHandlerActionCreator, MessageBarKeys.PublishDraftTaskGroupDialog);
    }

    public updateCommentString(comment: string): void {
        this._publishDraftTaskGroupDialogActionsHub.updateComment.invoke({ comment: comment } as ICommentUpdatedPayload);
    }

    public updateIsPreviewFlag(value: boolean): void {
        this._publishDraftTaskGroupDialogActionsHub.updateIsPreview.invoke({ isPreview: value });
    }

    public clearError(): void {
        clearErrorMessage(MessageBarKeys.PublishDraftTaskGroupDialog, this._messageHandlerActionCreator);
    }

    private _messageHandlerActionCreator: MessageHandlerActionsCreator;
    private _publishDraftTaskGroupDialogActionsHub: PublishDraftTaskGroupDialogActionsHub;
}