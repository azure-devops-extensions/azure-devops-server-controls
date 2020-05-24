import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
//import { ButtonType } from "OfficeFabric/components/Button/Button.Props";
import { Dialog } from "OfficeFabric/Dialog";
import { DialogType } from "OfficeFabric/components/Dialog/DialogContent.types";
import { DialogFooter } from "OfficeFabric/components/Dialog/DialogFooter";
import * as TFS_Resources_Presentation from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

export interface IProps {
    className?: string;
    containerClassName?: string;
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
    showDialog: boolean;
    subText?: string;
}

export interface IConfirmDialogState {
    showDialog: boolean;
}

export class ConfirmationDialog extends React.PureComponent<IProps, IConfirmDialogState> {

    public componentWillReceiveProps(newProps: IProps) {
        this._updateState(newProps.showDialog);
    }

    public render(): JSX.Element {

        let confirmButtonClassName: string = "tfs-confirmation-dialog-primary-button";
        return (<Dialog
            className={this.props.className}
            containerClassName={this.props.containerClassName}
            isOpen={this.props.showDialog}
            type={DialogType.normal}
            title={this.props.title}
            subText={this.props.subText}
            onDismiss={this._closeDialog}
            isBlocking={true}
            closeButtonAriaLabel={TFS_Resources_Presentation.CloseButtonText}
            firstFocusableSelector={confirmButtonClassName}>
            {this.props.children}
            <DialogFooter>
                <PrimaryButton className={confirmButtonClassName} onClick={this._onConfirmClick} ariaLabel={TFS_Resources_Presentation.Confirm}>{TFS_Resources_Presentation.Confirm}</PrimaryButton>
                <DefaultButton onClick={this._closeDialog} ariaLabel={TFS_Resources_Presentation.CancelButtonText}>{TFS_Resources_Presentation.CancelButtonText}</DefaultButton>
            </DialogFooter>
        </Dialog>);
    }

    private _updateState = (showDialog: boolean) => {
        this.setState({ showDialog: showDialog });
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