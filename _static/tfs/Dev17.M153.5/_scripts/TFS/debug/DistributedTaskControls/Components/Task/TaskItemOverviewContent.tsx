/// <reference types="react" />

import * as React from "react";

import { TASK_DEFINITION_DATA_KEY, TASK_ITEM_PREFIX } from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { DragDropManager, DropStatus } from "DistributedTaskControls/Common/DragDropManager";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Source, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { IDragDropData } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { StateIndicator, StateIndicatorType } from "DistributedTaskControls/Components/StateIndicator";
import { TaskItem } from "DistributedTaskControls/Components/Task/TaskItem";
import { TaskItemContextMenuHelper } from "DistributedTaskControls/Components/Task/TaskItemContextMenuHelper";
import { ITaskItemOverviewProps } from "DistributedTaskControls/Components/Task/TaskItemOverview";
import { ITaskItemOverviewState, TaskStore } from "DistributedTaskControls/Components/Task/TaskStore";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";

import { css } from "OfficeFabric/Utilities";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

export class TaskItemOverviewContent extends ComponentBase.Component<ITaskItemOverviewProps, ITaskItemOverviewState> {

    public componentWillMount(): void {

        this._store = StoreManager.GetStore<TaskStore>(TaskStore, this.props.controllerInstanceId);
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, this.props.instanceId);
        this._processManagementStore = StoreManager.GetStore<ProcessManagementStore>(ProcessManagementStore, this._store.getTaskContext().processInstanceId);
        this.setState(this._store.getTaskItemOverviewState());
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onChange);
        this._processManagementStore.addChangedListener(this._onProcessManagementStoreChange);
        this._itemSelectionStore.addChangedListener(this._onItemStoreChange);
        if (this.props.isTaskAdditionInProgress && this._elementInstance) {
            this._elementInstance.scrollIntoView(false);
        }
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
        this._processManagementStore.removeChangedListener(this._onProcessManagementStoreChange);
        this._itemSelectionStore.removeChangedListener(this._onItemStoreChange);

        if (this.state.isDeleting) {
            if (this.props.onRemoveTaskAnimationComplete) {
                this.props.onRemoveTaskAnimationComplete(this.props.item.getKey());
            }
        }
    }

    public componentDidUpdate() {
        if (this.state.isDeleting && this._elementInstance) {
            this._elementInstance.setAttribute("style", "height:0px");
        }
    }

    public render(): JSX.Element {
        Diag.logVerbose("[TaskItemOverview.render]: Method called.");

        let overviewProps = {
            ariaProps: this.props.ariaProps,
            title: this.state.name,
            view: this._getView(),
            item: this.props.item,
            instanceId: this.props.instanceId,
            iconClassName: "dtc-task-icon",
            src: this.props.iconUrl,
            isDraggable: this._processManagementStore.canEditTasks(),
            canParticipateInMultiSelect: this._processManagementStore.canEditTasks() || this._processManagementStore.canEditTaskInputs(),
            taskItemKeys: this.props.taskItemKeys,
            getContextMenuItems: () => {
                let items: Item[] = this._itemSelectionStore.getState().selectedItems.filter((item) => {
                    return (Utils_String.caseInsensitiveContains(item.data.getKey(), TASK_ITEM_PREFIX));
                }).map((item) => {
                    return item.data;
                });
                return TaskItemContextMenuHelper.getContextMenuItems(items, this.props.parentTaskListInstanceId, this.props.taskItemKeys, this.props.processInstanceId);
            }
        } as ITwoPanelOverviewProps;

        return (
            <div
                className={
                    css("task-item-overview",
                        { "is-selected": this.state.isSelected },
                        { "is-disabled ms-bgColor-neutralLighter": this.state.isDisabled },
                        { "location-line-bottom": this.props.showLocationLine })}
                draggable={this._processManagementStore.canEditTasks()}
                onDragStart={this._onDragStart}
                onDragEnter={this._onDragOver}
                onDragOver={this._onDragOver}
                onDragLeave={this._onDragLeave}
                onDrop={this._onDrop}
                onDragEnd={this._onDragEnd}
                ref={(elem) => this._elementInstance = elem}
                aria-disabled={this.state.isDisabled} >
                <TwoPanelOverviewComponent {...overviewProps} />

            </div>
        );
    }

    private _getView(): JSX.Element {
        Diag.logVerbose("[TaskItemOverview._getView]: Method called.");
        return this._getDescription();
    }

    private _getDescription(): JSX.Element {
        Diag.logVerbose("[TaskItemOverview._getDescriptionText]: Method called.");
        let badgeElement: JSX.Element = null;

        // We show only a single badge, giving importance to deprecation
        if (this.state.isDeprecated) {
            badgeElement = <span className="task-deprecated-badge">{Resources.DeprecatedText}</span>;
        }
        else if (this.state.isPreview) {
            badgeElement = <span className="task-preview-badge">{Resources.PreviewText}</span>;
        }
        else if (this.state.isTest) {
            badgeElement = <span className="task-test-badge">{Resources.DraftText}</span>;
        }

        if (!this.state.isDefinitionValid) {
            return <StateIndicator type={StateIndicatorType.Error} text={Resources.TaskDeletedMessage} />;
        }
        else if (this.state.isValid) {
            let description = this.props.description;
            if (this.state.isDisabled) {
                description = Utils_String.format("{0}: {1}", Resources.DisabledText, description);
            }
            return (
                <div className="task-description-text">
                    {!this.state.isOnLatestMajorVersion &&
                        <i className="bowtie-icon bowtie-alert task-version-upsell"
                            title={Resources.Task_VersionSelectorHelp} />
                    }
                    {badgeElement}
                    {description}
                </div>
            );
        }
        else {
            return <StateIndicator type={StateIndicatorType.Error} text={Resources.SettingsRequiredMessage} />;
        }
    }

    private _onChange = () => {
        let newState = this._store.getTaskItemOverviewState();
        newState.isSelected = this.state.isSelected;
        if (newState.isDeleting && this._elementInstance) {
            this._elementInstance.setAttribute("style", "height:" + this._elementInstance.clientHeight + "px");
        }
        this.setState(newState);
        if (newState.isDeleting) {
            this.props.onDeletingTask();
        }
    }

    private _onProcessManagementStoreChange = () => {
        // we want the task to re-render on capability change only if it is selected
        if (this.state.isSelected) {
            this._onChange();
        }
    }

    private _onItemStoreChange = () => {
        this.setState({
            isSelected: this.props.item && this._itemSelectionStore.isItemInSelectedGroup(this.props.item)
        });
    }

    private _onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        DragDropManager.instance().onDragStart(e, { listId: this.props.parentTaskListInstanceId, key: this.props.item.getKey(), data: this.props.item });
    }

    private _onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        DragDropManager.instance().onDragOver(e, this._itemAcceptsDropData);
    }

    private _onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        DragDropManager.instance().onDragLeave(e, this._itemAcceptsDropData);
    }

    private _onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        DragDropManager.instance().onDrop(
            e,
            { listId: this.props.parentTaskListInstanceId, key: this.props.item.getKey(), data: this.props.item },
            this._itemAcceptsDropData
        );
    }

    private _onDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        let isCloneOperation = DragDropManager.instance().isCopyAction();
        let dragTaskResult = DragDropManager.instance().onDragEnd(e);
        if (dragTaskResult === DropStatus.Accepted) {
            if (isCloneOperation) {
                // clone scenario
                Telemetry.instance().publishEvent(Feature.CloneTask, {}, Source.DragAndDrop);
            }
            else {
                // move scenario
                Telemetry.instance().publishEvent(Feature.MoveTask, {}, Source.DragAndDrop);
            }
        }
    }

    private _itemAcceptsDropData = (source: IDragDropData, isCopyAction: boolean): boolean => {
        if (!source || !this._processManagementStore.canEditTasks()) {
            return false;
        }

        // task will accept data of type task definition if task list store instance id is same
        if (Utils_String.equals(source.key, TASK_DEFINITION_DATA_KEY)) {
            return (source.listId === this.props.parentTaskListInstanceId);
        }

        // task will accept data of type task when run on is same
        if (source.data.getKey && Utils_String.caseInsensitiveContains(source.data.getKey(), TASK_ITEM_PREFIX)) {
            // if a task group type is defined, make sure that the incoming task supports that
            return this.props.taskGroupType
                ? DtcUtils.isTaskSupportedForTaskGroup(this.props.taskGroupType, (source.data as TaskItem).getRunsOn())
                : true;
        }

        return false;
    }

    private _store: TaskStore;
    private _itemSelectionStore: ItemSelectionStore;
    private _elementInstance: HTMLElement;
    private _processManagementStore: ProcessManagementStore;
}