import * as React from "react";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { AttachmentsControlCIEvents } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";
import { Attachment } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { KeyCode } from "VSS/Utils/UI";
import { format } from "VSS/Utils/String";

export interface IDeleteAttachmentDialogProps {
    hideDialog: boolean;
    attachmentContent: Attachment[];
}

export class DeleteAttachmentsDialog extends React.Component<
    IDeleteAttachmentDialogProps,
    {
        attachmentContent: Attachment[];
        hideDialog: boolean;
    }
    > {

    constructor(props: IDeleteAttachmentDialogProps) {
        super(props);

        this.state = {
            hideDialog: props.hideDialog,
            attachmentContent: props.attachmentContent,
        };
    }

    public render() {
        return (
            <div onKeyUp={(e) => { this._handleKeyUp(e); }} >
                <Dialog
                    hidden={this.state.hideDialog}
                    onDismiss={this._closeDialog}
                    dialogContentProps={{
                        type: DialogType.normal,
                        title: WorkItemTrackingResources.DeleteAttachmentsDialogTitle
                    }}
                    modalProps={{
                        isBlocking: false,
                    }}
                    firstFocusableSelector="ok-button"
                >
                    {this._getDialogTextContent()}
                    <DialogFooter>
                        <PrimaryButton className="ok-button" onClick={() => {
                            this._deleteAttachments();
                        }} text={WorkItemTrackingResources.OK} />
                        <DefaultButton onClick={this._closeDialog} text={WorkItemTrackingResources.Cancel} />
                    </DialogFooter>
                </Dialog>
            </div>
        );
    }

    public showDeleteAttachmentsDialog = (attachments: Attachment[]): void => {
        this.setState({ attachmentContent: attachments, hideDialog: false });
    }

    private _closeDialog = (): void => {
        this.setState({ hideDialog: true });
    }

    private _getDialogTextContent = (): JSX.Element => {
        let textContent: string;
        if (this.state.attachmentContent.length === 1) {
            textContent = format(WorkItemTrackingResources.DeleteSingleAttachmentDialogConfirmationText, this.state.attachmentContent[0].getName());
            return (<p>{textContent}</p>);
        } else {
            textContent = WorkItemTrackingResources.DeleteAttachmentsDialogConfirmationText;
            const attachmentList = this.state.attachmentContent.map((attachment) => { return (<li>{attachment.getName()}</li>); });
            return (
                <p>
                    {textContent}
                    <ul>{attachmentList}</ul>
                </p>);
        }

    }

    private _deleteAttachments() {

        // fire the change event only once even if multiple attachments are deleted
        // to prevent invalidate being called on the grid for each attachment
        for (let i = 0; i < this.state.attachmentContent.length; i++) {
            const preventEvent: boolean = i !== (this.state.attachmentContent.length - 1);
            this.state.attachmentContent[i].remove([preventEvent] as any);
        }

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.ACTIONS_DELETE,
            {
                numOfSelectedAttachments: this.state.attachmentContent.length
            });

        this._closeDialog();

    }

    private _handleKeyUp = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.keyCode === KeyCode.ESCAPE) {
            this._closeDialog();
        }
    }
}
