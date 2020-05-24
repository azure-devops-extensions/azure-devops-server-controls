import * as React from "react";
import * as ReactDOM from "react-dom";

import { format, localeFormat, empty as emptyString } from "VSS/Utils/String";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { DialogWithMultiLineTextInput } from "DistributedTaskControls/Components/DialogWithMultiLineTextInput";

import { PublishDraftTaskGroupDialogActionCreator } from "TaskGroup/Scripts/Common/PublishDraftTaskGroupDialog/PublishDraftTaskGroupDialogActionCreator";
import { PublishDraftTaskGroupDialogStore, IPublishDraftTaskGroupDialogState } from "TaskGroup/Scripts/Common/PublishDraftTaskGroupDialog/PublishDraftTaskGroupDialogStore";
import { PublishDraftTaskGroupDialogContent } from "TaskGroup/Scripts/Common/PublishDraftTaskGroupDialog/PublishDraftTaskGroupDialogContent";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/Common/PublishDraftTaskGroupDialog/PublishDraftTaskGroupDialog";

interface IPublishDraftTaskGroupDialogProps extends IProps {
    taskGroupName: string;
    onPublishClick?: (comment: string, isPreview: boolean) => void;
    onClose: () => void;
}

class PublishDraftTaskGroupDialog extends Component<IPublishDraftTaskGroupDialogProps, IPublishDraftTaskGroupDialogState>{

    constructor(props: IPublishDraftTaskGroupDialogProps) {
        super(props);
        this._publishDraftTaskGroupDialogStore = StoreManager.GetStore<PublishDraftTaskGroupDialogStore>(PublishDraftTaskGroupDialogStore);
        this._publishDraftTaskGroupDialogActionCreator = ActionCreatorManager.GetActionCreator<PublishDraftTaskGroupDialogActionCreator>(PublishDraftTaskGroupDialogActionCreator);
    }

    public render(): JSX.Element {
        return (
            <DialogWithMultiLineTextInput
                showDialog={true}
                titleText={localeFormat(Resources.PublishDraftTaskGroupDialogTitleFormat, this.props.taskGroupName)}
                okButtonText={Resources.PublishDialogButtonText}
                additionalCssClass={"tg-publish-draft-dialog"}
                multiLineInputLabel={Resources.CommentBoxLabel}
                onOkButtonClick={this._onPublishButtonClick}
                onCancelButtonClick={this._cleanupAndClose}
                okDisabled={this.state.publishInProgress}
            >

                <PublishDraftTaskGroupDialogContent
                    isPreview={this.state.isPreview}
                    taskGroupName={this.props.taskGroupName}
                    onPreviewValueChanged={this._onIsPreviewChanged}
                />

            </DialogWithMultiLineTextInput>);
    }

    public componentDidMount() {
        this.setState(this._publishDraftTaskGroupDialogStore.getState());
        this._publishDraftTaskGroupDialogStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount() {
        this._publishDraftTaskGroupDialogStore.removeChangedListener(this._onStoreChange);
    }

    private _onPublishButtonClick = (comment: string): void => {
        this._publishDraftTaskGroupDialogActionCreator.clearError();
        this.props.onPublishClick(comment, this.state.isPreview);
    }

    private _cleanupAndClose = (): void => {
        this._publishDraftTaskGroupDialogActionCreator.clearError();
        StoreManager.DeleteStore(PublishDraftTaskGroupDialogStore);
        ActionCreatorManager.DeleteActionCreator(PublishDraftTaskGroupDialogActionCreator);
        this.props.onClose();
    }

    private _onIsPreviewChanged = (value: boolean) => {
        this._publishDraftTaskGroupDialogActionCreator.updateIsPreviewFlag(value);
    }

    private _onStoreChange = () => {
        const state = this._publishDraftTaskGroupDialogStore.getState();

        if (state.publishComplete) {
            // Add timeout in this case, because we are inside the flow of an action, 
            // And we shouldn't invoke anything that might use another action
            setTimeout(() => {
                this._cleanupAndClose();
            }, 10);
        }
        else {
            this.setState(state);
        }
    }

    private _publishDraftTaskGroupDialogStore: PublishDraftTaskGroupDialogStore;
    private _publishDraftTaskGroupDialogActionCreator: PublishDraftTaskGroupDialogActionCreator;
}

export const renderPublishDraftTaskGroupDialog = (taskGroupName: string, onPublishClick: (comment: string, isPreview: boolean) => void): void => {
    const dialogContainer = document.createElement("div");
    ReactDOM.render(<PublishDraftTaskGroupDialog
        taskGroupName={taskGroupName}
        onPublishClick={onPublishClick}
        onClose={() => { ReactDOM.unmountComponentAtNode(dialogContainer); }}
    />, dialogContainer);
};