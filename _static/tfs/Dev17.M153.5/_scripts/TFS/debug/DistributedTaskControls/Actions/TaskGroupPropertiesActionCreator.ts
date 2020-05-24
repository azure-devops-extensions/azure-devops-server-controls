
import * as Actions from "DistributedTaskControls/Actions/TaskGroupPropertiesActions";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";

export class TaskGroupPropertiesActionCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.TaskGroupPropertiesActionCreator;
    }

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<Actions.TaskGroupPropertiesActions>(Actions.TaskGroupPropertiesActions, instanceId);
    }

    public initializeTaskGroupProperties(name: string, description: string, category: string) {
        this._actions.InitializeTaskGroupProperties.invoke({
            name: name,
            description: description,
            category: category
        });
    }

    public changeTaskGroupName(taskGroupName: string): void {
        this._actions.ChangeTaskGroupName.invoke(taskGroupName);
    }

    public changeTaskGroupDescription(taskGroupDescription: string): void {
        this._actions.ChangeTaskGroupDescription.invoke(taskGroupDescription);
    }

    public changeTaskGroupCategory(taskGroupCategory: string): void {
        this._actions.ChangeTaskGroupCategory.invoke(taskGroupCategory);
    }

    private _actions: Actions.TaskGroupPropertiesActions;
}