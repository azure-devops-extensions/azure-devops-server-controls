/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { TaskItemListControllerView } from "DistributedTaskControls/ControllerViews/TaskItemListControllerView";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { TaskGroupType } from "DistributedTasksCommon/TFS.Tasks.Types";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/AddTaskItem";

export interface IAddTaskItemDetails {
    visibilityFilter: string[];
    taskListStoreInstanceId: string;
    hideOverview?: boolean;
    taskGroupType?: TaskGroupType; // corresponding to phase type
}

export class AddTaskItem implements Item {

    constructor(private _itemDetails: IAddTaskItemDetails) {
    }

    public getOverview(instanceId?: string): JSX.Element {

        if (this._itemDetails.hideOverview) {
            return null;
        }

        if (!this._overView) {

            let overviewProps = {
                title: Resources.AddTask,
                view: null,
                item: this,
                instanceId: instanceId,
                iconClassName: "bowtie-icon bowtie-math-plus add-task-icon",
                overviewClassName: "add-task-item-overview-body"
            } as ITwoPanelOverviewProps;

            this._overView = (
                <div className="addtask-item-overview">
                    <TwoPanelOverviewComponent {...overviewProps} />
                </div>);
        }

        return this._overView;
    }

    public getDetails(): JSX.Element {

        if (!this._details) {
            this._details = (
                <TaskItemListControllerView
                    key={this.getKey()}
                    taskListStoreInstanceId={this._itemDetails.taskListStoreInstanceId}
                    visibilityFilter={this._itemDetails.visibilityFilter}
                    taskGroupType={this._itemDetails.taskGroupType} />
            );
        }

        return this._details;
    }

    public getAddTaskItemDetails(): IAddTaskItemDetails {
        return this._itemDetails;
    }

    public getKey(): string {
        // todo: evaluate if we can reuse same component across the environment based on phase type
        return "common.addtaskitem" + this._itemDetails.taskListStoreInstanceId;
    }

    private _overView: JSX.Element;
    private _details: JSX.Element;
}
