
import { Action } from "VSS/Flux/Action";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { TaskActionsCreatorBase } from "DistributedTaskControls/Components/Task/TaskActionsCreatorBase";
import {
    ITaskInputError,
    ITaskInputValue,
    ITaskInputOptions,
    ILinkToProcessParameterPayload
} from "DistributedTaskControls/Common/Types";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import { TaskDefinition } from "TFS/DistributedTask/Contracts";

export interface IEnvironmentVariableNamePayload {
    index: number;
    name: string;
}

export interface IEnvironmentVariableValuePayload {
    index: number;
    value: string;
}

/**
 * @brief Action creator to be used between Task overview and details view
 */
export class TaskActionCreator extends TaskActionsCreatorBase {

    public initialize(): void {
        this.renameTaskAction = new Action<string>();
        this.updateTaskRefNameAction = new Action<string>();
        this.updateTaskStateAction = new Action<boolean>();
        this.updateTaskInputErrorAction = new Action<ITaskInputError>();
        this.updateTaskInputValueAction = new Action<ITaskInputValue>();
        this.updateTaskInputOptionsAction = new Action<ITaskInputOptions>();
        this.addTaskEnvironmentVariableAction = new Action<IEmptyActionPayload>();
        this.updateTaskEnvironmentVariableNameAction = new Action<IEnvironmentVariableNamePayload>();
        this.updateTaskEnvironmentVariableValueAction = new Action<IEnvironmentVariableValuePayload>();
        this.deleteTaskEnvironmentVariableAction = new Action<IEnvironmentVariableNamePayload>();
        this.linkToProcessParameterAction = new Action<ILinkToProcessParameterPayload>();
        this.unlinkFromProcessParameterAction = new Action<string>();
        this.updateTaskDefinitionAction = new Action<TaskDefinition>();
        this.markTaskAsDeletingAction = new Action<IEmptyActionPayload>();
    }

    public renameTask(newName: string): void {
        this.renameTaskAction.invoke(newName);
    }

    public updateTaskRefName(newRefName: string): void {
        this.updateTaskRefNameAction.invoke(newRefName);
    }

    public updateTaskState(enabled: boolean): void {
        this.updateTaskStateAction.invoke(enabled);
    }

    public updateTaskInputError(name: string, errorMessage: string, value: string): void {
        this.updateTaskInputErrorAction.invoke({
            name: name,
            message: errorMessage,
            value: value
        } as ITaskInputError);
    }

    public updateTaskInputValue(name: string, value: string): void {
        this.updateTaskInputValueAction.invoke({
            name: name,
            value: value
        } as ITaskInputValue);
    }

    public updateTaskInputOptions(name: string, options: IDictionaryStringTo<string>) {
        this.updateTaskInputOptionsAction.invoke({
            name: name,
            options: options
        } as ITaskInputOptions);
    }

    public addTaskEnvironmentVariable() {
        this.addTaskEnvironmentVariableAction.invoke({});
    }

    public updateTaskEnvironmentVariableName(index: number, name: string) {
        this.updateTaskEnvironmentVariableNameAction.invoke({
            index: index,
            name: name,
        } as IEnvironmentVariableNamePayload);
    }

    public updateTaskEnvironmentVariableValue(index: number, value: string) {
        this.updateTaskEnvironmentVariableValueAction.invoke({
            index: index,
            value: value,
        } as IEnvironmentVariableValuePayload);
    }

    public deleteTaskEnvironmentVariable(index: number, name: string) {
        this.deleteTaskEnvironmentVariableAction.invoke({
            index: index,
            name: name,
        } as IEnvironmentVariableNamePayload);
    }

    public linkToProcessParameter(inputName: string, processParameterName: string): void {
        this.linkToProcessParameterAction.invoke({ inputName: inputName, processParametername: processParameterName } as ILinkToProcessParameterPayload);
    }

    public unlinkFromProcessParameter(inputName: string): void {
        this.unlinkFromProcessParameterAction.invoke(inputName);
    }

    public updateTaskDefinition(taskId: string, version: string): void {
        let taskDefinition = TaskDefinitionSource.instance().getTaskDefinition(taskId, version || "*");
        this.updateTaskDefinitionAction.invoke(taskDefinition);
    }

    public markTaskAsDeleting(): void {
        this.markTaskAsDeletingAction.invoke({});
    }


    public renameTaskAction: Action<string>;
    public updateTaskRefNameAction: Action<string>;
    public updateTaskStateAction: Action<boolean>;
    public updateTaskInputErrorAction: Action<ITaskInputError>;
    public updateTaskInputValueAction: Action<ITaskInputValue>;
    public updateTaskInputOptionsAction: Action<ITaskInputOptions>;
    public addTaskEnvironmentVariableAction: Action<IEmptyActionPayload>;
    public updateTaskEnvironmentVariableNameAction: Action<IEnvironmentVariableNamePayload>;
    public updateTaskEnvironmentVariableValueAction: Action<IEnvironmentVariableValuePayload>;
    public deleteTaskEnvironmentVariableAction: Action<IEnvironmentVariableNamePayload>;
    public linkToProcessParameterAction: Action<ILinkToProcessParameterPayload>;
    public unlinkFromProcessParameterAction: Action<string>;
    public updateTaskDefinitionAction: Action<TaskDefinition>;
    public markTaskAsDeletingAction: Action<IEmptyActionPayload>;
}