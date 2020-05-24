/// <reference types="react" />

import * as React from "react";
import { KeyCodes, autobind } from 'OfficeFabric/Utilities';
import { Fabric } from "OfficeFabric/Fabric";
import * as Dialog from "OfficeFabric/Dialog";
import * as Button from "OfficeFabric/Button";
import { TextField, ITextField } from "OfficeFabric/TextField";
import { Label } from "OfficeFabric/Label";
import * as Utils_Core from "VSS/Utils/Core";

import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import { ActionsCreator } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/ActionsCreator";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";

/** Properties structure for use with LinkEditCommentDialog */
export interface ILinkEditCommentDialogProps {
    targetLink: ILinkedArtifact;
    actionsCreator: ActionsCreator;
    closeDialog: () => void;
}

export class LinkEditCommentDialog extends React.Component<ILinkEditCommentDialogProps, {}> {
    private textField: ITextField;

    public render(): JSX.Element {
        const dialogProps: Dialog.IDialogProps = {
            hidden: false,
            dialogContentProps: {
                showCloseButton: true
            },
            title: PresentationResources.LinkedArtifacts_EditComment,
            onDismiss: this.props.closeDialog,
            modalProps: {
                className: "edit-link-comment-dialog"
            }
        };

        return (
            <Fabric>
                <Dialog.Dialog {...dialogProps}>
                    <Label>{PresentationResources.LinkedArtifacts_EditCommentDialogLabel}</Label>
                    <TextField resizable={false} value={this.props.targetLink.comment} autoFocus={true} maxLength={255}
                        ariaLabel={PresentationResources.LinkedArtifacts_EditComment} componentRef={this._initTextField} onKeyDown={this._handleTextKeyDown}/>
                    <Dialog.DialogFooter>
                        <Button.PrimaryButton onClick={this._closeAndSubmit}>{PresentationResources.LinkedArtifacts_EditCommentDoneButton}</Button.PrimaryButton>
                        <Button.DefaultButton onClick={this._closeWithoutSubmit}>{PresentationResources.LinkedArtifacts_EditCommentCancelButton}</Button.DefaultButton>
                    </Dialog.DialogFooter>
                </Dialog.Dialog>
            </Fabric>
        );
    }

    public shouldComponentUpdate(nextProps: ILinkEditCommentDialogProps, nextState: {}): boolean {
        return this.props.targetLink.id != nextProps.targetLink.id || this.props.actionsCreator != nextProps.actionsCreator;
    }

    @autobind
    private _handleTextKeyDown(keyboardEvent: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
        if (keyboardEvent.which === KeyCodes.enter) {
            this._closeAndSubmit();
        }
    }

    @autobind
    private _initTextField(textField: ITextField) {
        this.textField = textField;
    }

    public componentDidMount() {
        if (this.textField) {
            this.textField.select();
        }
    }

    @autobind
    private _closeWithoutSubmit() {
        this.props.closeDialog();
    }

    @autobind
    private _closeAndSubmit() {
        const newComment = this.textField.value;
        if (this.props.targetLink.comment !== newComment) {
            this.props.actionsCreator.changeLinkedArtifactComment(this.props.targetLink, newComment);
        }

        this.props.closeDialog();
    }
}