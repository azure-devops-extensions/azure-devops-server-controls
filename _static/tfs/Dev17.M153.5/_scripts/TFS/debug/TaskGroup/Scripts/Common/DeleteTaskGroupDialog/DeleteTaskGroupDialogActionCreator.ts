import { MessageBarType } from "OfficeFabric/components/MessageBar/MessageBar.types";

import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";

import {
    DeleteTaskGroupDialogActionsHub,
    IDeletedTaskGroupPayload
} from "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialogActionsHub";
import { TaskGroupReferencesActionCreator } from "TaskGroup/Scripts/Common/TaskGroupReferences/TaskGroupReferencesActionCreator";
import { TaskGroupSource } from "TaskGroup/Scripts/Common/Sources/TaskGroupSource";
import { handleErrorAndDisplayInMessageBar, clearErrorMessage } from "TaskGroup/Scripts/Utils/ErrorUtils";
import { DialogActionCreatorKeys, MessageBarKeys } from "TaskGroup/Scripts/Common/Constants";

export class DeleteTaskGroupDialogActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return DialogActionCreatorKeys.DeleteTaskGroupDialogActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._deleteTaskGroupDialogActionsHub = ActionsHubManager.GetActionsHub<DeleteTaskGroupDialogActionsHub>(DeleteTaskGroupDialogActionsHub);
        this._taskGroupReferencesActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupReferencesActionCreator>(TaskGroupReferencesActionCreator);
        this._messageHandlerActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
    }

    public deleteTaskGroup(taskGroupId: string, comment: string): void {
        this._deleteTaskGroupDialogActionsHub.deleteStarted.invoke({});
        TaskGroupSource.instance().deleteTaskGroup(taskGroupId, comment)
            .then(() => {
                this._deleteTaskGroupDialogActionsHub.deleteTaskGroup.invoke({ taskGroupId: taskGroupId } as IDeletedTaskGroupPayload);
            },
            (error) => {
                this._deleteTaskGroupDialogActionsHub.deleteTaskGroup.invoke({ taskGroupId: null } as IDeletedTaskGroupPayload);
                handleErrorAndDisplayInMessageBar(error, this._messageHandlerActionCreator, MessageBarKeys.DeleteTaskGroupDialog);
            });
    }

    public getAllTaskGroupReferences(taskGroupId: string): void {
        this._taskGroupReferencesActionCreator.resetAllReferences();
        this._taskGroupReferencesActionCreator.getAllContributedReferences(taskGroupId);
    }

    public clearError(): void {
        clearErrorMessage(MessageBarKeys.DeleteTaskGroupDialog, this._messageHandlerActionCreator);
    }

    private _taskGroupReferencesActionCreator: TaskGroupReferencesActionCreator;
    private _messageHandlerActionCreator: MessageHandlerActionsCreator;
    private _deleteTaskGroupDialogActionsHub: DeleteTaskGroupDialogActionsHub;
}