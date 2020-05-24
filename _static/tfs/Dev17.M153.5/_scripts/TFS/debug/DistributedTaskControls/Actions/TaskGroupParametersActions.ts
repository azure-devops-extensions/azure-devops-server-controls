
import { ActionsHubBase, IEmptyActionPayload, Action } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import { DataSourceBinding } from "TFS/ServiceEndpoint/Contracts";

export interface IMetaTaskPayload {
    metaTaskInputs: DistributedTaskContracts.TaskInputDefinition[];
    tasks: DistributedTaskContracts.TaskGroupStep[];
    dataSourceBindings: DataSourceBinding[];
    groups: DistributedTaskContracts.TaskGroupDefinition[];
    runsOns: string[];
}

export interface IStringInputValuePayload {
    index: number;
    value: string;
}

export interface IInputHelpMarkdownPayload {
    index: number;
    value: string;
}

export interface IEndpointOptionsPayload {
    index: number;
    value: IDictionaryStringTo<string>;
}

export class TaskGroupParametersActions extends ActionsHubBase {

    public initialize(): void {
        this._setMetaTaskInput = new Action<IMetaTaskPayload>();
        this._changeTaskGroupMetaInputValue = new Action<IStringInputValuePayload>();
        this._changeTaskGroupMetaInputHelpMarkDown = new Action<IInputHelpMarkdownPayload>();
        this._changeTaskGroupEndpointInputOptions = new Action<IEndpointOptionsPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.TaskGroupParametersActions;
    }

    public get SetMetaTaskInput(): Action<IMetaTaskPayload> {
        return this._setMetaTaskInput;
    }

    public get ChangeTaskGroupMetaInputValue(): Action<IStringInputValuePayload> {
        return this._changeTaskGroupMetaInputValue;
    }

    public get ChangeTaskGroupMetaInputHelpMarkDown(): Action<IInputHelpMarkdownPayload> {
        return this._changeTaskGroupMetaInputHelpMarkDown;
    }

    public get ChangeTaskGroupEndpointInputOptions(): Action<IEndpointOptionsPayload> {
        return this._changeTaskGroupEndpointInputOptions;
    }

    private _setMetaTaskInput: Action<IMetaTaskPayload>;
    private _changeTaskGroupMetaInputValue: Action<IStringInputValuePayload>;
    private _changeTaskGroupMetaInputHelpMarkDown: Action<IInputHelpMarkdownPayload>;
    private _changeTaskGroupEndpointInputOptions: Action<IEndpointOptionsPayload>;
}