/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Common/Components/ConfirmationDialog";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType, IDialogContentProps } from "OfficeFabric/Dialog";
import { IModalProps } from "OfficeFabric/Modal";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as ComponentBase from "VSS/Flux/Component";

export enum ConfirmationDialogType{
    Alert,
    Confirm
}

export interface IProps extends ComponentBase.Props {
    title?: string;
    message: string;
    type: ConfirmationDialogType;
    onConfirm?: () => void;
    onCancel?: () => void;
}

export function openConfirmationDialog(message: string, onConfirm: () => void, onCancel?: () => void) {
    // Render Dialog
    let container = document.createElement("div");

    let props: IProps = {
        title: Resources.ConfirmText,
        message: message,
        type: ConfirmationDialogType.Confirm,
        onConfirm: onConfirm,
        onCancel: () => {
            ReactDOM.unmountComponentAtNode(container);
            if (onCancel) {
                onCancel();
            }
        }
    };
    ReactDOM.render(React.createElement(ConfirmationDialog, props), container);
}

export function openAlertDialog(message: string, onCancel ?: () => void) {
    // Render Dialog
    let container = document.createElement("div");

    let props: IProps = {
        message: message,
        type: ConfirmationDialogType.Alert,
        onCancel: () => {
            ReactDOM.unmountComponentAtNode(container);
            if (onCancel) {
                onCancel();
            }
        }
    };
    ReactDOM.render(React.createElement(ConfirmationDialog, props), container);
}

export class ConfirmationDialog extends ComponentBase.Component<IProps, ComponentBase.State> {

    public render(): JSX.Element {

        let confirmButtonClassName: string = "tcm-confirm";
        let dialogcontentProps: IDialogContentProps = {
            title: this.props.title,
            closeButtonAriaLabel: Resources.CloseText,
            type: DialogType.close
        };
        let modalProps: IModalProps = {
            className: "tcm-confirm-dialog bowtie-fabric",
            containerClassName: "confirm-discard-dialog",
            isBlocking: true
        };
        return (<Dialog
            dialogContentProps={dialogcontentProps}
            modalProps={modalProps}
            hidden={false}
            onDismiss={this._closeDialog}
            firstFocusableSelector={confirmButtonClassName}>
            <div>
                {this.props.message}
            </div>
            <DialogFooter>
                <PrimaryButton
                    className={confirmButtonClassName}
                    onClick={this._onConfirmClick}
                    ariaLabel={Resources.OkText}>
                    {Resources.OkText}
                </PrimaryButton>
                {
                    this.props.type === ConfirmationDialogType.Confirm ?
                        <DefaultButton
                            className={"tcm-cancel"}
                            onClick={this._closeDialog}
                            ariaLabel={Resources.CancelText}>
                            {Resources.CancelText}
                        </DefaultButton>
                        :
                        null
                }
            </DialogFooter>

        </Dialog>);
    }


    private _onConfirmClick = () => {
        if (this.props.onConfirm) {
            this.props.onConfirm();
        }
        this._closeDialog();
    }

    private _closeDialog = () => {
        if (this.props.onCancel) {
            this.props.onCancel();
        }
    }
}

