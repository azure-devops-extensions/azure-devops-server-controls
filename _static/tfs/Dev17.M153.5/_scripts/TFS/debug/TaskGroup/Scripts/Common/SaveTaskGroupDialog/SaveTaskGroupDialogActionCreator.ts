import { MessageBarType } from "OfficeFabric/components/MessageBar/MessageBar.types";

import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";

import {
    SaveTaskGroupDialogActionsHub,
    ISaveCommentUpdatedPayload
} from "TaskGroup/Scripts/Common/SaveTaskGroupDialog/SaveTaskGroupDialogActionsHub";
import { DialogActionCreatorKeys, MessageBarKeys } from "TaskGroup/Scripts/Common/Constants";
import { handleErrorAndDisplayInMessageBar, clearErrorMessage } from "TaskGroup/Scripts/Utils/ErrorUtils";

export class SaveTaskGroupDialogActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return DialogActionCreatorKeys.SaveTaskGroupDialogActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._saveTaskGroupDialogActionsHub = ActionsHubManager.GetActionsHub<SaveTaskGroupDialogActionsHub>(SaveTaskGroupDialogActionsHub);
        this._messageHandlerActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
    }

    public notifySaveStarted(): void {
        this._saveTaskGroupDialogActionsHub.notifySaveStarted.invoke({});
    }

    public notifySaveCompleteSuccessfully(): void {
        this._saveTaskGroupDialogActionsHub.notifySaveComplete.invoke({});
    }

    public notifySaveCompleteWithError(error: any): void {
        this._saveTaskGroupDialogActionsHub.notifySaveFailed.invoke({});
        handleErrorAndDisplayInMessageBar(error, this._messageHandlerActionCreator, MessageBarKeys.SavePublishPreviewTaskGroupDialog);
    }

    public updateCommentString(comment: string): void {
        this._saveTaskGroupDialogActionsHub.updateComment.invoke({ comment: comment } as ISaveCommentUpdatedPayload);
    }

    public clearError(): void {
        clearErrorMessage(MessageBarKeys.SavePublishPreviewTaskGroupDialog, this._messageHandlerActionCreator);
    }

    private _messageHandlerActionCreator: MessageHandlerActionsCreator;
    private _saveTaskGroupDialogActionsHub: SaveTaskGroupDialogActionsHub;
}