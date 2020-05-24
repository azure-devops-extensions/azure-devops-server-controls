/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { TaskItemUtils } from "DistributedTaskControls/Common/TaskItemUtilities";
import { ITaskDefinitionItem, IExtensionDefinitionItem } from "DistributedTaskControls/Common/Types";
import { ExtensionItemList } from "DistributedTaskControls/Components/ExtensionItemList";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { TaskDefinitionItem } from "DistributedTaskControls/Components/TaskDefinitionItem";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { Collapsible } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";
import { LoadableComponent } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponent";

import { MessageBarType } from "OfficeFabric/MessageBar";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { List } from "OfficeFabric/List";
import { css, getRTLSafeKeyCode, KeyCodes } from "OfficeFabric/Utilities";

import * as ArrayUtils from "VSS/Utils/Array";
import { Positioning } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/TaskItemList";

export interface ITaskListItemProps extends ComponentBase.IProps {
    tasks: ITaskDefinitionItem[];
    deprecatedTasks?: ITaskDefinitionItem[];
    extensions?: IExtensionDefinitionItem[];
    isExtensionFetched?: boolean;
    isTaskFetched: boolean;
    showExtension?: boolean;
    taskListStoreInstanceId: string;
    onAddTask: (id: ITaskDefinitionItem) => void;
    onDragTask: () => void;
    onAddTaskByDragDrop: (id: ITaskDefinitionItem, taskAccepted: boolean) => void;
}

export interface ITaskListItemState extends ComponentBase.IState {
    selectedTask: string;
}

export class TaskItemList extends ComponentBase.Component<ITaskListItemProps, ITaskListItemState> {
    public render(): JSX.Element {
        return (
            <div className={css("dtc-task-list", this.props.cssClass)}>
                <LoadableComponent
                    instanceId={this.props.taskListStoreInstanceId.concat(TaskItemUtils.tasksIdentifierText)}
                    label={Resources.FetchingTasksText} >
                    <div>
                        {!this.props.isTaskFetched && this._getErrorComponent()}
                        {this._getTaskListComponent()}
                    </div>
                </LoadableComponent>
            </div>
        );
    }

    private _getTaskListComponent(): JSX.Element {
        return (
            <FocusZone
                direction={FocusZoneDirection.vertical}
                isInnerZoneKeystroke={(keyEvent: React.KeyboardEvent<HTMLElement>) => (
                    (keyEvent.which === getRTLSafeKeyCode(KeyCodes.right)))}>
                <List
                    items={ArrayUtils.clone(this.props.tasks)}
                    onRenderCell={this._onRenderListItem}
                    role={"listbox"}
                />
                {this.props.showExtension &&
                    <Collapsible
                        label={Resources.Task_MarketplaceCategoryText}
                        initiallyExpanded={true}
                        headingLevel={2}
                        scrollBehavior={Positioning.VerticalScrollBehavior.Top}
                        addSectionHeaderLine={true}>
                        <ExtensionItemList
                            instanceId={this.props.taskListStoreInstanceId}
                            extensions={this.props.extensions}
                            isExtensionFetched={this.props.isExtensionFetched}
                            onItemSelect={this._onSelect}
                            selectedItemId={this.state.selectedTask}
                            className={"dtc-task-extension-list"} />
                    </Collapsible>
                }
                {(this.props.deprecatedTasks || []).length > 0 &&
                    <Collapsible
                        label={Resources.DeprecatedTasksText}
                        initiallyExpanded={false}
                        headingLevel={2}
                        addSeparator={true}
                        scrollBehavior={Positioning.VerticalScrollBehavior.Top}
                        addSectionHeaderLine={true}>
                        <List
                            items={ArrayUtils.clone(this.props.deprecatedTasks)}
                            onRenderCell={this._onRenderListItem}
                            role={"listbox"}
                        />
                    </Collapsible>
                }
            </FocusZone>
        );
    }

    private _getErrorComponent(): JSX.Element {
        return (<MessageBarComponent
            className={"task-error-element"}
            messageBarType={MessageBarType.error} >
            {Resources.TaskCallFailedDisplayErrorMessage}
        </MessageBarComponent>);
    }

    private _onRenderListItem = (task: ITaskDefinitionItem, index: number) => {
        return (
            <TaskDefinitionItem
                key={task.id}
                task={task}
                posInSet={index + 1}
                sizeOfSet={task.deprecated ? this.props.deprecatedTasks.length : this.props.tasks.length}
                onAddTask={this.props.onAddTask}
                onSelect={this._onSelect}
                isSelected={this.state.selectedTask === task.id}
                taskListStoreInstanceId={this.props.taskListStoreInstanceId}
                onDragTask={this.props.onDragTask}
                onAddTaskByDragDrop={this.props.onAddTaskByDragDrop} />
        );
    }

    private _onSelect = (taskId: string) => {
        this.setState({
            selectedTask: taskId
        });
    }
}
