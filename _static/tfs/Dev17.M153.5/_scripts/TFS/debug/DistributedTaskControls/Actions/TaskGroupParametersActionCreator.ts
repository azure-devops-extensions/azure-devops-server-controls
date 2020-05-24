import {
    TaskGroupParametersActions,
    IMetaTaskPayload
} from "DistributedTaskControls/Actions/TaskGroupParametersActions";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import { DataSourceBinding } from "TFS/ServiceEndpoint/Contracts";

import { empty as emptyString } from "VSS/Utils/String";

export class TaskGroupParametersActionCreator extends ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.TaskGroupParametersActionCreator;
    }

    public initialize(instanceId: string) {
        this._taskGroupParametersActions = ActionsHubManager.GetActionsHub<TaskGroupParametersActions>(TaskGroupParametersActions, instanceId);
    }

    public setMetaTaskInput(metaTaskInputs: DistributedTaskContracts.TaskInputDefinition[],
        tasks: DistributedTaskContracts.TaskGroupStep[], dataSourceBindings: DataSourceBinding[],
        groups: DistributedTaskContracts.TaskGroupDefinition[], runsOn: string[]): void {

        let metaTaskPayload = {
            metaTaskInputs: metaTaskInputs,
            tasks: tasks,
            dataSourceBindings: dataSourceBindings,
            groups: groups,
            runsOns: runsOn
        } as IMetaTaskPayload;

        this._taskGroupParametersActions.SetMetaTaskInput.invoke(metaTaskPayload);
    }

    public changeTaskGroupMetaInputValue(value: string, index: number): void {
        this._taskGroupParametersActions.ChangeTaskGroupMetaInputValue.invoke({
            value: value,
            index: index
        });
    }

    public changeTaskGroupMetaInputHelpMarkDown(helpMarkDown: string, index: number): void {
        this._taskGroupParametersActions.ChangeTaskGroupMetaInputHelpMarkDown.invoke({
            value: helpMarkDown,
            index: index
        });
    }

    public changeTaskGroupEndpointInputOptions(options: IDictionaryStringTo<string>, index: number): void {
        this._taskGroupParametersActions.ChangeTaskGroupEndpointInputOptions.invoke({
            value: options,
            index: index
        });
    }

    private _taskGroupParametersActions: TaskGroupParametersActions;
}