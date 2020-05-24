
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";
import { ITaskDefinitionItem } from "DistributedTaskControls/Common/Types";

import { Action } from "VSS/Flux/Action";

export interface ITaskItemPayload {
    taskItems?: ITaskDefinitionItem[];
    isTaskFetched: boolean;
} 

export class TaskItemListActions extends ActionsHubBase {

    public initialize(): void {
        this._updateTaskItemList = new Action<ITaskItemPayload>();
        this._filterTaskItemList = new Action<string>();
    }

    public static getKey(): string {
        return ActionsKeys.TaskItemListActions;
    }

    public get updateTaskItemList(): Action<ITaskItemPayload> {
        return this._updateTaskItemList;
    }

    public get filterTaskItemList(): Action<string> {
        return this._filterTaskItemList;
    }

    private _updateTaskItemList: Action<ITaskItemPayload>;
    private _filterTaskItemList: Action<string>;
}