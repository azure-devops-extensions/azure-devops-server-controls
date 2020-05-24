/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { ITaskGroupDialogState, TaskGroupDialogStore } from "DistributedTaskControls/Stores/TaskGroupDialogStore";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { MessageParentKeyConstants } from "DistributedTaskControls/Common/Common";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TaskGroupDialogActionsCreator } from "DistributedTaskControls/Actions/TaskGroupDialogActionsCreator";
import { TaskGroupPropertiesView } from "DistributedTaskControls/Components/Task/TaskGroupPropertiesView";
import { TaskGroupPropertiesStore } from "DistributedTaskControls/Stores/TaskGroupPropertiesStore";
import { TaskGroupParametersView } from "DistributedTaskControls/Components/Task/TaskGroupParametersView";
import { MetaTaskManager } from "DistributedTaskControls/Components/Task/MetaTaskManager";

import { css } from "OfficeFabric/Utilities";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";

import * as Utils_String from "VSS/Utils/String";
import * as VssContext from "VSS/Context";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskGroupDialog";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export class TaskGroupDialog extends ComponentBase.Component<ComponentBase.IProps, ITaskGroupDialogState>{

    public componentWillMount() {
        this._taskGroupDialogStore = StoreManager.GetStore<TaskGroupDialogStore>(TaskGroupDialogStore);
        this._taskGroupPropertiesStore = StoreManager.GetStore<TaskGroupPropertiesStore>(TaskGroupPropertiesStore);
        this._taskGroupDialogActionsCreator = ActionCreatorManager.GetActionCreator<TaskGroupDialogActionsCreator>(TaskGroupDialogActionsCreator);
        this._messageHandlerActionsCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        this.setState(this._taskGroupDialogStore.getState());

        this._taskGroupPropertiesStore.addChangedListener(this._onTaskGroupPropertiesChange);
        this._taskGroupDialogStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._taskGroupPropertiesStore.removeChangedListener(this._onTaskGroupPropertiesChange);
        this._taskGroupDialogStore.removeChangedListener(this._onChange);
    }

    private _onChange = (): void => {
        this.setState(this._taskGroupDialogStore.getState());
    }

    private _onTaskGroupPropertiesChange = () => {
        this.setState({
            ...this._taskGroupDialogStore.getState(),
            isCreateButtonDisabled: !this._taskGroupPropertiesStore.isValid()
        });
    }

    public render(): JSX.Element {

        return (
            <Dialog
                modalProps={{
                    className: "dtc-meta-task-save-dialog bowtie-fabric",
                    containerClassName: "dtc-meta-task-dialog-container",
                    isBlocking: true
                }}
                hidden={!this.state.isShown}
                dialogContentProps={{
                    type: DialogType.close,
                }}
                title={Resources.CreateTaskGroup}
                onDismiss={this._dismissDialog}
                firstFocusableSelector={TaskGroupPropertiesView.taskGroupNameFieldClass}
                closeButtonAriaLabel={Resources.CloseButtonText}>

                {
                    // Error Message bar when duplicate name is found

                    this.state.isInvalid &&
                    (<MessageBarComponent
                        messageBarType={MessageBarType.error}
                        onDismiss={this._onErrorBarDismiss}
                        errorStatusCode={this.state.errorState.errorStatusCode}>
                        {this.state.errorState.errorMessage}
                    </MessageBarComponent>)
                }

                <TaskGroupPropertiesView />

                { /* Configuration parameters details */}

                <TaskGroupParametersView
                    showEndpointsAsDropdowns={this._isNewTaskGroupHubEnabled}
                />

                { /* Action buttons */}

                <DialogFooter>
                    <PrimaryButton
                        className={css("fabric-style-overrides")}
                        onClick={this._onCreateClick}
                        disabled={this.state.isCreateButtonDisabled || this.state.creatingTaskGroup}
                        ariaLabel={Resources.Create}
                        ariaDescription={Resources.ARIADescriptionTaskGroupDialogCreateDescription}
                        aria-disabled={this.state.isCreateButtonDisabled}>
                        {this.state.creatingTaskGroup ? Resources.CreatingText : Resources.Create}
                    </PrimaryButton>
                    <DefaultButton
                        onClick={this._dismissDialog}
                        ariaLabel={Resources.Cancel}
                        ariaDescription={Resources.ARIADescriptionTaskGroupDialogCancelDescription}>
                        {Resources.Cancel}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _dismissDialog = (): void => {
        this._taskGroupDialogActionsCreator.hideTaskGroupSaveDialog();
    }

    private _onCreateClick = (): void => {
        this._taskGroupDialogActionsCreator.createMetaTaskGroup(this._onCreateTaskGroupCallback);
    }

    private _onCreateTaskGroupCallback = (taskGroupId: string, taskGroupName: string): void => {
        this._messageHandlerActionsCreator.addMessage(MessageParentKeyConstants.MainParentKey, this._getTaskGroupCreatedMessage(taskGroupId, taskGroupName), MessageBarType.success);
    }

    private _getTaskGroupCreatedMessage = (id: string, name: string): JSX.Element => {

        let webContext = VssContext.getDefaultWebContext();

        const taskGroupHubUrlFormat = this._isNewTaskGroupHubEnabled ? TaskGroupDialog._newTaskGroupUrl : TaskGroupDialog._oldTaskGroupUrl;
        let taskGroupUrl = Utils_String.format(taskGroupHubUrlFormat, webContext.collection.uri + webContext.project.name, id);

        return (<span>
            {Resources.TaskGroupCreatedMessagePrefix}
            <SafeLink href={taskGroupUrl} target="_blank">{name}</SafeLink>
            {Resources.TaskGroupCreatedMessageSuffix}
        </span>);
    }

    private _onErrorBarDismiss = (): void => {
        this._taskGroupDialogActionsCreator.dismissErrorMessage();
    }

    private _isNewTaskGroupHubEnabled = MetaTaskManager.isNewTaskGroupHubEnabled();

    private _taskGroupDialogStore: TaskGroupDialogStore;
    private _taskGroupPropertiesStore: TaskGroupPropertiesStore;
    private _taskGroupDialogActionsCreator: TaskGroupDialogActionsCreator;
    private _messageHandlerActionsCreator: MessageHandlerActionsCreator;
    private static readonly _oldTaskGroupUrl = "{0}/_taskgroups?_a=properties&taskGroupId={1}";
    private static readonly _newTaskGroupUrl = "{0}/_taskgroup/{1}";
}