/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";

export interface IBasicDialogProps extends Base.IProps {
    showDialog: boolean;
    userName: string;
    accessToken: string;
    onCloseDialog: () => void;
    onAuthorized: (userName: string, accessToken: string) => void;
}

export interface IBasicDialogState {
    isAuthorizeDisabled: boolean;
}

export class BasicDialog extends Base.Component<IBasicDialogProps, IBasicDialogState> {

    public componentWillMount(): void {

        this.setState({
            isAuthorizeDisabled: true
        } as IBasicDialogState);
    }

    public render(): JSX.Element {

        const basicUsernameFieldClassName: string = "dtc-basic-username-textfield";
        const basicTokenFieldClassName: string = "dtc-basic-token-textfield";

        return (
            <Dialog
                hidden={!this.props.showDialog}
                dialogContentProps={{
                    type: DialogType.close,
                    subText: Resources.UseBasicDescription
                }}
                modalProps={{
                    className: "bowtie-fabric",
                    containerClassName: "dtc-Basic-dialog"
                }}
                title={Resources.UseBasic}
                onDismiss={this.props.onCloseDialog}
                firstFocusableSelector={basicUsernameFieldClassName}
                closeButtonAriaLabel={Resources.CloseButtonText}>

                <StringInputComponent
                    label={Resources.UserName}
                    onValueChanged={this._onUserNameChanged}
                    inputClassName={basicUsernameFieldClassName}
                />

                <StringInputComponent
                    label={Resources.PasswordLabel}
                    type="password"
                    onValueChanged={this._onAccessTokenChanged}
                    inputClassName={basicTokenFieldClassName}
                />

                <DialogFooter>
                    <PrimaryButton
                        onClick={this._onAuthorizeClick}
                        disabled={!!this.state.isAuthorizeDisabled}
                        ariaLabel={Resources.Authorize}
                        aria-disabled={!!this.state.isAuthorizeDisabled}>
                        {Resources.Authorize}
                    </PrimaryButton>
                    <PrimaryButton
                        onClick={this.props.onCloseDialog}
                        ariaLabel={Resources.CancelButtonText}>
                        {Resources.CancelButtonText}
                    </PrimaryButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _onUserNameChanged = (newValue: string) => {
        this._userName = newValue;
        this.setState({
            isAuthorizeDisabled: !this._accessToken || !this._userName
        });
    }

    private _onAccessTokenChanged = (newValue: string) => {
        this._accessToken = newValue;
        this.setState({
            isAuthorizeDisabled: !this._accessToken || !this._userName
        });
    }

    private _onAuthorizeClick = () => {
        if (this.props.onAuthorized) {
            this.props.onAuthorized(this._userName, this._accessToken);
        }
    }

    private _userName: string;
    private _accessToken: string;
}