import * as Actions from "DistributedTaskControls/Actions/TaskGroupDialogActions";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { TaskGroupPropertiesActionCreator } from "DistributedTaskControls/Actions/TaskGroupPropertiesActionCreator";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";

import { empty as emptyString } from "VSS/Utils/String";

export class TaskGroupDialogActionsCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.TaskGroupDialogActionsCreator;
    }

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<Actions.TaskGroupDialogActions>(Actions.TaskGroupDialogActions);
        this._taskGroupPropertiesActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupPropertiesActionCreator>(TaskGroupPropertiesActionCreator);
    }

    public showTaskGroupSaveDialog(): void {
        this._taskGroupPropertiesActionCreator.initializeTaskGroupProperties(emptyString, emptyString, emptyString);
        this._actions.ShowTaskGroupSaveDialog.invoke(null);
    }

    public hideTaskGroupSaveDialog(): void {
        this._actions.HideTaskGroupSaveDialog.invoke(null);
    }

    public createMetaTaskGroup(onMetaTaskCreated: (taskGroupId: string, taskGroupName: string) => void): void {
        this._actions.CreateMetaTaskGroup.invoke({ onMetaTaskCreated });
    }

    public dismissErrorMessage(): void {
        this._actions.DismissErrorMessage.invoke(null);
    }

    private _taskGroupPropertiesActionCreator: TaskGroupPropertiesActionCreator;
    private _actions: Actions.TaskGroupDialogActions;
}