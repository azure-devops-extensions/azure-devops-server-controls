
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { IInputControllerActions } from "DistributedTaskControls/Common/Types";

export class TaskActionsCreatorBase extends ActionsBase.ActionCreatorBase implements IInputControllerActions {

    public initialize() {
        return;
    }

    public static getKey(): string {
        return ActionCreatorKeys.TaskDetailsActionsCreator;
    }

    public updateTaskInputValue(name: string, value: string): void {
        throw new Error("Error: This should be invoked in derived class.");
    }

    public updateTaskInputError(name: string, errorMessage: string, value: string): void {
        throw new Error("Error: This should be invoked in derived class.");
    }

    public updateTaskInputOptions(name: string, options: IDictionaryStringTo<string>): void {
        throw new Error("Error: This should be invoked in derived class.");
    }
}