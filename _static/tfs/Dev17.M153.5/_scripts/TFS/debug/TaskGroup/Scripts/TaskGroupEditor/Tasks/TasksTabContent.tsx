import * as React from "react";
import * as ReactDOM from "react-dom";

import { empty as emptyString } from "VSS/Utils/String";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TasksTabSharedView } from "DistributedTaskControls/SharedViews/ContainerTabs/TaskTab/TaskTabSharedView";

import { TabContentContainer } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabContentContainer";
import { TasksTabKeys, TabInstanceIds } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { TasksTabStore, ITasksTabState } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TasksTabStore";
import { TasksTabActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TasksTabActionCreator";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/TaskGroupEditor/Tasks/TasksTabContent";

export interface ITasksTabContentProps extends IProps {
    fromExtension: boolean;
}
export class TasksTabContent extends Component<ITasksTabContentProps, ITasksTabState>{
    constructor(props: ITasksTabContentProps) {
        super(props);
        this._tasksTabStore = StoreManager.GetStore<TasksTabStore>(TasksTabStore, props.instanceId);
        this._tasksTabActionCreator = ActionCreatorManager.GetActionCreator<TasksTabActionCreator>(TasksTabActionCreator, props.instanceId);
    }

    public render() {
        const state = this._tasksTabStore.getState();
        return (
            <TabContentContainer
                tabInstanceId={TabInstanceIds.Tasks}
                cssClass={this.props.cssClass}
                fromExtension={this.props.fromExtension}
            >
                {
                    !!this.state.items
                    && this.state.items.length > 0
                    &&
                    <TasksTabSharedView
                        cssClass={"task-group-tasks-tab-content"}
                        items={this.state.items}
                        itemSelectionInstanceId={this.props.instanceId}
                        key={TasksTabKeys.TasksTabSharedViewKey}
                    />
                }

            </TabContentContainer>
        );
    }

    public componentWillMount(): void {
        this.setState(this._tasksTabStore.getState());
        this._tasksTabStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._tasksTabStore.removeChangedListener(this._onStoreChange);
    }

    private _onStoreChange = () => {
        const state = this._tasksTabStore.getState();
        this.setState(state);
    }

    private _onMessageBarDismiss = () => {
        this._tasksTabActionCreator.updateErrorMessage(emptyString);
    }

    private _tasksTabActionCreator: TasksTabActionCreator;
    private _tasksTabStore: TasksTabStore;
}