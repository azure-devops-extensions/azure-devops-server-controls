import * as React from "react";
import * as ReactDOM from "react-dom";

import { format, localeFormat, empty as emptyString } from "VSS/Utils/String";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { DialogWithMultiLineTextInput } from "DistributedTaskControls/Components/DialogWithMultiLineTextInput";

import { SaveTaskGroupDialogActionCreator } from "TaskGroup/Scripts/Common/SaveTaskGroupDialog/SaveTaskGroupDialogActionCreator";
import { SaveTaskGroupDialogStore, ISaveTaskGroupDialogState } from "TaskGroup/Scripts/Common/SaveTaskGroupDialog/SaveTaskGroupDialogStore";
import { SaveTaskGroupDialogContent } from "TaskGroup/Scripts/Common/SaveTaskGroupDialog/SaveTaskGroupDialogContent";
import { PublishTaskGroupPreviewDialogContent } from "TaskGroup/Scripts/Common/SaveTaskGroupDialog/PublishTaskGroupPreviewDialogContent";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/Common/SaveTaskGroupDialog/SaveTaskGroupDialog";

enum DialogType {
    saveTaskGroup,
    publishTaskGroupPreview
}

interface ISaveTaskGroupDialogProps extends IProps {
    taskGroupName: string;
    onSaveClick?: (comment: string) => void;
    onClose: () => void;
    dialogType: DialogType;
}

class SaveTaskGroupDialog extends Component<ISaveTaskGroupDialogProps, ISaveTaskGroupDialogState>{

    constructor(props: ISaveTaskGroupDialogProps) {
        super(props);
        this._saveTaskGroupDialogStore = StoreManager.GetStore<SaveTaskGroupDialogStore>(SaveTaskGroupDialogStore);
        this._saveTaskGroupDialogActionCreator = ActionCreatorManager.GetActionCreator<SaveTaskGroupDialogActionCreator>(SaveTaskGroupDialogActionCreator);
    }

    public render(): JSX.Element {
        const titleFormat = this.props.dialogType === DialogType.saveTaskGroup ? Resources.SaveTaskGroupDialogTitleFormat : Resources.PublishTaskGroupPreviewDialogTitleFormat;
        const okButtonText = this.props.dialogType === DialogType.saveTaskGroup ? Resources.SaveDialogButtonName : Resources.PublishDialogButtonText;

        return (
            <DialogWithMultiLineTextInput
                showDialog={true}
                titleText={localeFormat(titleFormat, this.props.taskGroupName)}
                okButtonText={okButtonText}
                additionalCssClass={"tg-save-dialog"}
                multiLineInputLabel={Resources.CommentBoxLabel}
                onOkButtonClick={this._onSaveButtonClick}
                onCancelButtonClick={this._cleanupAndClose}
                okDisabled={this.state.saveInProgress}
            >
                {
                    this.props.dialogType === DialogType.saveTaskGroup ?

                        (<SaveTaskGroupDialogContent
                            taskGroupName={this.props.taskGroupName}
                        />)

                        :

                        (<PublishTaskGroupPreviewDialogContent />)
                }

            </DialogWithMultiLineTextInput>);
    }

    public componentDidMount() {
        this.setState(this._saveTaskGroupDialogStore.getState());
        this._saveTaskGroupDialogStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount() {
        this._saveTaskGroupDialogStore.removeChangedListener(this._onStoreChange);
    }

    private _onSaveButtonClick = (comment: string): void => {
        this._saveTaskGroupDialogActionCreator.clearError();
        this.props.onSaveClick(comment);
    }

    private _cleanupAndClose = (): void => {
        this._saveTaskGroupDialogActionCreator.clearError();
        StoreManager.DeleteStore(SaveTaskGroupDialogStore);
        this.props.onClose();
    }

    private _onStoreChange = () => {
        const state = this._saveTaskGroupDialogStore.getState();

        if (state.saveComplete) {
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

    private _saveTaskGroupDialogStore: SaveTaskGroupDialogStore;
    private _saveTaskGroupDialogActionCreator: SaveTaskGroupDialogActionCreator;
}

export const renderSaveTaskGroupDialog = (taskGroupName: string, onSaveClick: (comment: string) => void): void => {
    const dialogContainer = document.createElement("div");
    ReactDOM.render(<SaveTaskGroupDialog
        taskGroupName={taskGroupName}
        onSaveClick={onSaveClick}
        onClose={() => { ReactDOM.unmountComponentAtNode(dialogContainer); }}
        dialogType={DialogType.saveTaskGroup}
    />, dialogContainer);
};

export const renderPublishTaskGroupPreviewDialog = (taskGroupName: string, onPublishClick: (comment: string) => void): void => {
    const dialogContainer = document.createElement("div");
    ReactDOM.render(<SaveTaskGroupDialog
        taskGroupName={taskGroupName}
        onSaveClick={onPublishClick}
        onClose={() => { ReactDOM.unmountComponentAtNode(dialogContainer); }}
        dialogType={DialogType.publishTaskGroupPreview}
    />, dialogContainer);
};