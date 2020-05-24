import * as React from "react";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { AttachmentsControlCIEvents } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";
import { Attachment } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { TextField } from "OfficeFabric/TextField";
import { KeyCode } from "VSS/Utils/UI";

export interface IEditCommentDialogProps {
    hideDialog: boolean;
    attachmentContent: Attachment[];
}

export class EditCommentDialog extends React.Component<
    IEditCommentDialogProps,
    {
        attachmentContent: Attachment[];
        hideDialog: boolean;
    }
    > {
    private _commentInput: string;
    private _dialogTitle: string;

    constructor(props: IEditCommentDialogProps) {
        super(props);
        if (props.attachmentContent && props.attachmentContent.length === 1) {
            this._commentInput = props.attachmentContent[0].getComment() || "";
            this._dialogTitle = WorkItemTrackingResources.EditComment;
        } else {
            this._commentInput = "";
            this._dialogTitle = WorkItemTrackingResources.EditComments;
        }
        this.state = {
            hideDialog: props.hideDialog,
            attachmentContent: props.attachmentContent,
        };

    }

    public render() {
        return (
            <div onKeyDown={(e) => { this._handleKeyDown(e); }} >
                <Dialog
                    className="edit-comment-dialog"
                    hidden={this.state.hideDialog}
                    onDismiss={this._closeDialog}
                    dialogContentProps={{
                        type: DialogType.normal,
                        title: this._dialogTitle
                    }}
                    modalProps={{
                        isBlocking: false,
                    }}
                    firstFocusableSelector={WorkItemTrackingResources.EditCommentDialogLabel}
                >
                    <TextField
                        className={WorkItemTrackingResources.EditCommentDialogLabel}
                        label={WorkItemTrackingResources.EditCommentDialogLabel}
                        value={this._commentInput}
                        onChanged={(newValue) => {
                            this._commentInput = newValue;
                        }}
                        autoFocus={true}
                        maxLength={255} />
                    <DialogFooter>
                        <PrimaryButton
                            onClick={() => { this._setComment(); }}
                            text={WorkItemTrackingResources.DialogSave} />
                        <DefaultButton onClick={this._closeDialog} text={WorkItemTrackingResources.Cancel} />
                    </DialogFooter>
                </Dialog>
            </div>
        );
    }

    public showEditCommentDialog = (attachments: Attachment[]): void => {
        if (attachments && attachments.length === 1) {
            this._commentInput = attachments[0].getComment() || "";
            this._dialogTitle = WorkItemTrackingResources.EditComment;
        } else {
            this._commentInput = "";
            this._dialogTitle = WorkItemTrackingResources.EditComments;
        }

        this.setState({ attachmentContent: attachments, hideDialog: false });
    }

    private _closeDialog = (): void => {
        this.setState({ hideDialog: true });
        this._commentInput = "";
    }

    private _setComment() {
        const comment: string = this._commentInput;

        /** Fire the change event only once even if setting comments on multiple attachments
         * to prevent invalidate being called on the grid for each attachment
         */
        for (let i = 0; i < (this.state.attachmentContent.length); i++) {
            const preventChangeEvent = i !== (this.state.attachmentContent.length - 1);
            this.state.attachmentContent[i].setComment(comment, preventChangeEvent);
            // all the attachments have the same field ID, so firing on the last element is fine
        }

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.ACTIONS_EDIT,
            {
                numOfSelectedAttachments: this.state.attachmentContent.length,
                commentLength: comment.length
            });

        this._closeDialog();

    }

    private _handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        switch (event.keyCode) {
            case KeyCode.ENTER:
                this._setComment();
                break;
            case KeyCode.ESCAPE:
                this._closeDialog();
                break;
            default:
                break;
        }
        event.stopPropagation();
    }
}
