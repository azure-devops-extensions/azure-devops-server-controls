/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { TASK_DEFINITION_DATA_KEY } from "DistributedTaskControls/Common/Common";
import { DragDropManager, DropStatus } from "DistributedTaskControls/Common/DragDropManager";
import { ITaskDefinitionItem } from "DistributedTaskControls/Common/Types";
import { ButtonCallout } from "DistributedTaskControls/Components/ButtonCallout";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { InputControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";

import { PrimaryButton } from "OfficeFabric/Button";
import { Image, ImageFit } from "OfficeFabric/Image";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/TaskDefinitionItem";

export interface ITaskDefinitionItemProps extends ComponentBase.IProps {
    task: ITaskDefinitionItem;
    onAddTask: (task: ITaskDefinitionItem) => void;
    posInSet?: number;
    sizeOfSet?: number;
    onSelect?: (taskId: string) => void;
    isSelected?: boolean;
    taskListStoreInstanceId?: string;
    onDragTask: () => void;
    onAddTaskByDragDrop: (id: ITaskDefinitionItem, taskAccepted: boolean) => void;
}

export class TaskDefinitionItem extends ComponentBase.Component<ITaskDefinitionItemProps, ComponentBase.IStateless> {

    public componentWillMount() {
        this._taskNameId = InputControlUtils.getId("TaskDefinition");
    }

    public render(): JSX.Element {

        let learnMoreComponent: JSX.Element;
        if (this.props.task.helpMarkDown) {
            learnMoreComponent = (
                <div className="dtc-task-learn-more">
                    <ButtonCallout
                        iconClassName={"bowtie-icon bowtie-status-info-outline dtc-task-learn-more-info-icon"}
                        buttonClassName={this._learnMoreButtonClassName}
                        buttonText={Resources.TaskLearnMoreText}
                        calloutContent={{ calloutMarkdown: this.props.task.helpMarkDown }}
                        buttonTextAriaLabel={Resources.TaskLearnMoreText}
                        buttonAriaDescription={Utils_String.localeFormat(Resources.TaskLearnMoreDescription, this.props.task.friendlyName)} />
                </div>
            );
        }

        return (
            <div className={css("dtc-task-item", { "is-selected": this.props.isSelected })}
                data-is-focusable={true}
                aria-labelledby={this._taskNameId}
                onFocus={this._onSelect}
                role={"option"}
                aria-posinset={this.props.posInSet}
                aria-setsize={this.props.sizeOfSet}
                aria-selected={this.props.isSelected}
                onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => { this._handleKeyDown(event); }}>
                <FocusZone direction={FocusZoneDirection.horizontal} isCircularNavigation={true}>
                    <div className="dtc-task-details">
                        <div className="dtc-task-draggable"
                            draggable={true}
                            onDragStart={this._onDragStart}
                            onDragEnd={this._onDragEnd}
                            ref={(elem) => this._elementInstance = elem}>
                            <i className="bowtie-icon bowtie-resize-grip left gripper-icon" />
                            <Image className="dtc-task-icon" src={this.props.task.iconUrl} imageFit={ImageFit.contain} alt={Utils_String.empty} />
                            <div className="dtc-task-info">
                                <div className="info-name" id={this._taskNameId}>{this.props.task.friendlyName}</div>
                                <div className="info-description">{this.props.task.description}</div>
                            </div>
                        </div>
                        <PrimaryButton
                            className={this._addTaskButtonClassName}
                            onClick={this._onAddTask}
                            ariaLabel={Resources.AddTaskLinkText}
                            ariaDescription={Utils_String.localeFormat(Resources.AddTaskDescription, this.props.task.friendlyName)}>
                            {Resources.AddTaskLinkText}
                        </PrimaryButton>
                    </div>
                    <div className="dtc-task-footer">
                        <div className="dtc-task-author">{Utils_String.format("{0} {1}", Resources.ByText, this.props.task.author)}</div>
                        {learnMoreComponent}
                    </div>
                </FocusZone>
            </div>
        );
    }

    private _onAddTask = () => {
        if (this.props.onAddTask) {
            this.props.onAddTask(this.props.task);
        }
    }

    private _onSelect = (event: React.FocusEvent<HTMLElement>) => {
        let eventElement = event.nativeEvent.target as Element;
        // if add button or learn more link raise this event,
        // no need to select again since these are visible only when it is already selected
        if (!(eventElement && eventElement.classList
            && (eventElement.classList.contains(this._addTaskButtonClassName)
                || eventElement.classList.contains(this._learnMoreButtonClassName)))) {
            this.props.onSelect(this.props.task.id);
        }
    }

    private _onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        this.props.onDragTask();
        DragDropManager.instance().onDragStart(
            e,
            {
                listId: this.props.taskListStoreInstanceId,
                key: TASK_DEFINITION_DATA_KEY,
                data: this.props.task
            },
            true);
    }

    private _onDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        let addTaskResult = DragDropManager.instance().onDragEnd(e);
        if (addTaskResult === DropStatus.Accepted) {
            this.props.onAddTaskByDragDrop(this.props.task, true);
        }
        else if (addTaskResult === DropStatus.Rejected) {
            this.props.onAddTaskByDragDrop(this.props.task, false);
        }
    }

    private _handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event) {
            let eventElement = event.nativeEvent.target as Element;
            if (eventElement && eventElement.classList
                && (eventElement.classList.contains(this._addTaskButtonClassName)
                    || eventElement.classList.contains(this._learnMoreButtonClassName))) {
                if (event.shiftKey && event.keyCode === KeyCode.TAB) {
                    // if current focus is on add button or learn more link,
                    // the previous tab target should not be the task element
                    event.currentTarget.tabIndex = -1;
                }
            }
            else {
                if (event.keyCode === KeyCode.ENTER && this.props.onAddTask) {
                    // handle enter event only when src is not add button or learn more link
                    this.props.onAddTask(this.props.task);
                }
            }
        }
    }

    private _addTaskButtonClassName = "dtc-task-list-item-buttons";
    private _learnMoreButtonClassName = "dtc-task-learn-more-button";
    private _elementInstance: HTMLElement;
    private _taskNameId: string;
}
