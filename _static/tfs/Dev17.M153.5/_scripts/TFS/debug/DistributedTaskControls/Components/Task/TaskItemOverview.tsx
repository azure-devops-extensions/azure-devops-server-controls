/// <reference types="react" />

import * as React from "react";
import { CSSTransitionGroup as ReactCSSTransitionGroup } from "react-transition-group";

import { TaskGroupType } from "DistributedTasksCommon/TFS.Tasks.Types";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Item, ItemOverviewProps } from "DistributedTaskControls/Common/Item";
import { TaskItemOverviewContent } from "DistributedTaskControls/Components/Task/TaskItemOverviewContent";
import { ITaskItemOverviewState } from "DistributedTaskControls/Components/Task/TaskStore";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskItemOverview";

const TransitionEnterTime = 500;
const TransitionLeaveTime = 750;

export interface ITaskItemOverviewProps extends ItemOverviewProps {
    controllerInstanceId: string;
    iconUrl: string;
    description: string;
    showLocationLine: boolean;
    taskItemKeys: string[];
    processInstanceId: string;
    parentTaskListInstanceId?: string;
    taskGroupType?: TaskGroupType;
    isTaskAdditionInProgress: boolean;
    onDeletingTask?: () => void;
    onRemoveTaskAnimationComplete?: (taskItemKey: string) => void;
}


export interface ITaskItemOverviewViewState extends ITaskItemOverviewState {
    isMounted: boolean;
}

export class TaskItemOverview extends ComponentBase.Component<ITaskItemOverviewProps, ITaskItemOverviewViewState>{

    public componentDidMount(): void {
        this.setState({ isMounted: true } as ITaskItemOverviewViewState);
    }

    public render(): JSX.Element {

        const transitionEnterRequired: boolean = !!this.props.isTaskAdditionInProgress;

        return (
            <ReactCSSTransitionGroup
                component="div"
                className="task-item-overview-animation-container"
                transitionName="task-add-delete-animation"
                transitionEnter={transitionEnterRequired}
                transitionEnterTimeout={TransitionEnterTime}
                transitionLeave={true}
                transitionLeaveTimeout={TransitionLeaveTime}>
                {
                    this.state.isMounted && !this.state.isDeleting &&
                    <TaskItemOverviewContent key={this.props.item.getKey()} {...this.props} onDeletingTask={this._handleDeleteTask} />
                }
            </ReactCSSTransitionGroup>
        );
    }

    private _handleDeleteTask = () => {
        this.setState({
            isDeleting: true
        } as ITaskItemOverviewViewState);
    }

}
