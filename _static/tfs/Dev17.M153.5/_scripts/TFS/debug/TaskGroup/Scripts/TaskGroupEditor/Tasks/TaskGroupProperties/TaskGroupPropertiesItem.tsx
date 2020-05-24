import * as React from "react";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { Item } from "DistributedTaskControls/Common/Item";

import { TaskGroupPropertiesItemDetails } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemDetails";
import { TaskGroupPropertiesItemOverview } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemOverview";

export class TaskGroupPropertiesItem implements Item {
    constructor(taskGroup: DTContracts.TaskGroup, addTaskItem: Item) {
        this._taskGroup = taskGroup;
        this._addTaskItem = addTaskItem;
    }

    public getOverview(instanceId?: string): JSX.Element {

        if (!this._overview) {
            this._overview = (<TaskGroupPropertiesItemOverview
                item={this}
                instanceId={instanceId}
                addTaskItem={this._addTaskItem}
            />);
        }

        return this._overview;
    }

    public getDetails(instanceId?: string): JSX.Element {

        if (!this._details) {
            this._details = (<TaskGroupPropertiesItemDetails
                instanceId={instanceId}
            />);
        }

        return this._details;
    }

    public getKey(): string {
        return "task-group-references-panel-left-" + this._taskGroup.id;
    }

    private _taskGroup: DTContracts.TaskGroup;
    private _overview: JSX.Element;
    private _details: JSX.Element;
    private _addTaskItem: Item;
}