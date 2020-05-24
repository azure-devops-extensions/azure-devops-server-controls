/// <reference types="react" />

import * as React from "react";

import { TaskGroupType } from "DistributedTasksCommon/TFS.Tasks.Types";

import { Item } from "DistributedTaskControls/Common/Item";
import { TaskListControllerView } from "DistributedTaskControls/ControllerViews/TaskListControllerView";

/**
 * Encapsulates a task list. 
 */
export class TaskList implements Item {

    constructor(private _removeDelegate: () => void,
        private _taskListStoreInstanceId: string,
        private _taskGroupType?: TaskGroupType,
        private _treeLevel?: number) {
        this._details = null;
    }

    public getOverview(instanceId?: string): JSX.Element {
        if (!this._overView) {
            this._overView = <TaskListControllerView
                instanceId={instanceId}
                onRemove={this._removeDelegate}
                taskListStoreInstanceId={this._taskListStoreInstanceId}
                taskGroupType={this._taskGroupType}
                treeLevel={this._treeLevel} />;
        }

        return this._overView;
    }

    public getDetails(): JSX.Element {
        return this._details;
    }

    public getKey(): string {
        return "common.tasklist";
    }

    private _overView: JSX.Element;
    private _details: JSX.Element;
}
