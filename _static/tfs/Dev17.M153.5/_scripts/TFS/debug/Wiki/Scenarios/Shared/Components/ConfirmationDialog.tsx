import * as React from "react";

import { BaseButton, DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";

import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Shared/Components/ConfirmationDialog";

export interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    confirmButtonText: string;
    onConfirm(): void;
    cancelButtonText: string;
    onCancel(): void;
    onDismiss(): void;
    confirmDialogMessage?: string;
    onRenderContent?(): JSX.Element;
    isWaiting?: boolean;
    waitSpinnerLabel?: string;
    defaultFocusOnConfirmButton?: boolean;
}

export class ConfirmationDialog extends React.PureComponent<ConfirmationDialogProps, {}> {
    private _confirmButton: BaseButton;
    private _cancelButton: BaseButton;
    private _cancelButtonClassName = "wiki-dialog-cancel-button";

    public componentDidUpdate(): void {
        if (this.props.defaultFocusOnConfirmButton && this._confirmButton) {
            this._confirmButton.focus();
        } else if (!this.props.defaultFocusOnConfirmButton && this._cancelButton) {
            this._cancelButton.focus();
        }
    }

    public render(): JSX.Element {
        const dialogContent = this.props.onRenderContent
            ? this.props.onRenderContent()
            : (
                <MessageBar
                    className={"wiki-message-bar"}
                    messageBarType={MessageBarType.warning}>
                    {this.props.confirmDialogMessage}
                </MessageBar>);

        return (
            <Dialog
                hidden={!this.props.isOpen}
                modalProps={{
                    className: "wiki-confirmation-dialog",
                    containerClassName: "container",
                    isBlocking: true,
                    firstFocusableSelector: this._cancelButtonClassName
                }}
                dialogContentProps={{
                    type: DialogType.close,
                    showCloseButton: !this.props.isWaiting,
                    closeButtonAriaLabel: WikiResources.CloseButtonText,
                }}
                title={this.props.title}
                onDismiss={this.props.onDismiss}>
                {dialogContent}
                {
                    this.props.isWaiting
                        ? <Spinner label={this.props.waitSpinnerLabel} />
                        : <DialogFooter>
                            <PrimaryButton
                                componentRef={this._refConfirmButton}
                                onClick={this.props.onConfirm}>
                                {this.props.confirmButtonText}
                            </PrimaryButton>
                            <DefaultButton
                                componentRef={this._refCancelButton}
                                className={this._cancelButtonClassName}
                                onClick={this.props.onCancel}>
                                {this.props.cancelButtonText}
                            </DefaultButton>
                        </DialogFooter>
                }
            </Dialog>
        );
    }

    public componentWillUnmount(): void {
        this._confirmButton = null;
        this._cancelButton = null;
    }

    @autobind
    private _refConfirmButton(ref: BaseButton): void {
        this._confirmButton = ref;
    }

    @autobind
    private _refCancelButton(ref: BaseButton): void {
        this._cancelButton = ref;
    }
}
