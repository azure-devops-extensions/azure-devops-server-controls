/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ConfirmationDialog";

export interface IProps extends Base.IProps {
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
    subText: string;
    showDialog: boolean;
    focusCancelButton?: boolean;
    okButtonText?: string;
    okDisabled?: boolean;
    skipCloseOnOkClick?: boolean;
}


export class ConfirmationDialog extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {

        let confirmButtonClassName: string = "dtc-confirm";
        let cancelButtonClassName: string = "dtc-cancel";
        let okButtonText: string = this.props.okButtonText || Resources.Confirm;
        return (this.props.showDialog ? <Dialog
            modalProps={{
                className: "cix-confirm-dialog bowtie-fabric",
                containerClassName: "confirm-discard-dialog",
                isBlocking: true
            }}
            hidden={!this.props.showDialog}
            dialogContentProps={{
                type: DialogType.close,
                subText: this.props.subText
            }}
            title={this.props.title}
            onDismiss={this._closeDialog}
            closeButtonAriaLabel={Resources.CloseButtonText}
            firstFocusableSelector={this.props.focusCancelButton ? cancelButtonClassName : confirmButtonClassName}>

            <DialogFooter>
                <PrimaryButton
                    className={confirmButtonClassName}
                    disabled={this.props.okDisabled}
                    onClick={this._onConfirmClick}
                    ariaLabel={okButtonText}>
                    {okButtonText}
                </PrimaryButton>
                <DefaultButton
                    className={cancelButtonClassName}
                    onClick={this._closeDialog}
                    ariaLabel={Resources.CancelButtonText}>
                    {Resources.CancelButtonText}
                </DefaultButton>
            </DialogFooter>

        </Dialog> : null);
    }


    private _onConfirmClick = () => {
        if (this.props.onConfirm) {
            this.props.onConfirm();
        }
        if (!this.props.skipCloseOnOkClick) {
            this._closeDialog();
        }
    }

    private _closeDialog = () => {
        if (this.props.onCancel) {
            this.props.onCancel();
        }
    }
}

