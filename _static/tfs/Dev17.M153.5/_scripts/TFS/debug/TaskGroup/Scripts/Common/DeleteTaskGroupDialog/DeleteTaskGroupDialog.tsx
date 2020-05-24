import * as React from "react";
import * as ReactDOM from "react-dom";

import { format, localeFormat } from "VSS/Utils/String";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { DialogWithMultiLineTextInput } from "DistributedTaskControls/Components/DialogWithMultiLineTextInput";

import { DeleteTaskGroupDialogActionCreator } from "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialogActionCreator";
import { DeleteTaskGroupDialogStore, IDeleteTaskGroupDialogState } from "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialogStore";
import { DeleteTaskGroupDialogContent } from "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialogContent";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialog";

interface IDeleteTaskGroupDialogProps extends IProps {
    taskGroupId: string;
    taskGroupName: string;
    onClose: () => void;
    onDelete?: () => void;
}

class DeleteTaskGroupDialog extends Component<IDeleteTaskGroupDialogProps, IDeleteTaskGroupDialogState>{

    constructor(props: IDeleteTaskGroupDialogProps) {
        super(props);
        this._deleteTaskGroupDialogActionCreator = ActionCreatorManager.GetActionCreator<DeleteTaskGroupDialogActionCreator>(DeleteTaskGroupDialogActionCreator);
        this._deleteTaskGroupDialogStore = StoreManager.GetStore<DeleteTaskGroupDialogStore>(DeleteTaskGroupDialogStore);
    }

    public render(): JSX.Element {
        return (<DialogWithMultiLineTextInput
            showDialog={true}
            titleText={localeFormat(Resources.DeleteTaskGroupDialogTitleFormat, this.props.taskGroupName)}
            okButtonText={Resources.DialogDeleteButtonText}
            additionalCssClass={"tg-delete-dialog"}
            multiLineInputLabel={Resources.CommentBoxLabel}
            onOkButtonClick={this._onDeleteButtonClick}
            onCancelButtonClick={this._cleanupAndClose}
            okDisabled={this.state.deleteInProgress}
        >
            <DeleteTaskGroupDialogContent
                taskGroupId={this.props.taskGroupId}
            />

        </DialogWithMultiLineTextInput>);
    }

    public componentDidMount() {
        this.setState(this._deleteTaskGroupDialogStore.getState());
        this._deleteTaskGroupDialogStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount() {
        this._deleteTaskGroupDialogStore.removeChangedListener(this._onStoreChange);
    }

    private _onDeleteButtonClick = (comment: string): void => {
        this._deleteTaskGroupDialogActionCreator.clearError();
        this._deleteTaskGroupDialogActionCreator.deleteTaskGroup(this.props.taskGroupId, comment);
    }

    private _cleanupAndClose = (): void => {
        this._deleteTaskGroupDialogActionCreator.clearError();
        StoreManager.DeleteStore(DeleteTaskGroupDialogStore);
        ActionCreatorManager.DeleteActionCreator(DeleteTaskGroupDialogActionCreator);
        this.props.onClose();
    }

    private _onStoreChange = () => {
        const state = this._deleteTaskGroupDialogStore.getState();

        if (state.deleteComplete) {
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


    private _deleteTaskGroupDialogStore: DeleteTaskGroupDialogStore;
    private _deleteTaskGroupDialogActionCreator: DeleteTaskGroupDialogActionCreator;
}

export const renderDeleteTaskGroupDialog = (taskGroupId: string, taskGroupName: string) => {
    const dialogContainer = document.createElement("div");
    ReactDOM.render(<DeleteTaskGroupDialog
        taskGroupId={taskGroupId}
        taskGroupName={taskGroupName}
        onClose={() => { ReactDOM.unmountComponentAtNode(dialogContainer); }}
    />, dialogContainer);
};