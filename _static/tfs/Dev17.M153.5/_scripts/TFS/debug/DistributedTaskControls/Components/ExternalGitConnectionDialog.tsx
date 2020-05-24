/// <reference types="react" />

import * as React from "react";

import { IDialogInputs, IDialogProps } from "DistributedTaskControls/Components/AddNewEndpoint";
import { ConnectionDialogBase, IState as IConnectionDialogState } from "DistributedTaskControls/Components/ConnectionDialogBase";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IExternalGitConnectionDialogProps extends IDialogProps {
    defaultConnectionName: string;
    onAuthorized: (gitConnectionInputs: IDialogInputs) => void;
    getConnectionName: (currentName: string, defaultName: string) => string;
}

export class ExternalGitConnectionDialog extends ConnectionDialogBase<IExternalGitConnectionDialogProps, IConnectionDialogState> {
    public render(): JSX.Element {
        let connectionServerUrlClassName: string = "connection-dialog-server-url";
        return (
            <Dialog
                hidden={!this.props.showDialog}
                dialogContentProps={{
                    type: DialogType.close,
                    className: "add-connection-dialog-content"
                }}
                title={Resources.ExternalGitDialogTitle}
                onDismiss={this.props.onCloseDialog}
                firstFocusableSelector={connectionServerUrlClassName}
                modalProps={{
                    className: "bowtie-fabric",
                    containerClassName: "add-connection-dialog"
                }}
                closeButtonAriaLabel={Resources.CloseButtonText}>
                {
                    this.props.errorMessage &&
                    <MessageBar
                        messageBarType={MessageBarType.error}
                        onDismiss={this.props.onDismissErrorMessage}
                        dismissButtonAriaLabel={Resources.CloseButtonText}>
                        {this.props.errorMessage}
                    </MessageBar>
                }
                <StringInputComponent
                    required={true}
                    label={Resources.ConnectionName}
                    value={this.props.getConnectionName(this._connectionName, this.props.defaultConnectionName)}
                    onValueChanged={this._onconnectionNameChanged.bind(this)}
                    deferredValidationTime={this.textFieldValidationTimeout}
                    getErrorMessage={this._getErrorMessageForConnectionName}
                />

                <StringInputComponent
                    required={true}
                    label={Resources.GitRepositoryUrl}
                    inputClassName={connectionServerUrlClassName}
                    onValueChanged={this._onServerUrlChanged.bind(this)}
                    deferredValidationTime={this.textFieldValidationTimeout}
                    getErrorMessage={this._getErrorMessageForUrlField}
                />

                <StringInputComponent
                    label={Resources.UserName}
                    inputClassName="connection-dialog-username"
                    onValueChanged={this._onUserNameChanged.bind(this)}
                />

                <StringInputComponent
                    label={Resources.PasswordKey}
                    type="password"
                    inputClassName="connection-dialog-password"
                    onValueChanged={this._onAccessTokenChanged}
                />

                <DialogFooter>
                    <PrimaryButton
                        className={css("fabric-style-overrides")}
                        disabled={!!this.state.isOkDisabled}
                        onClick={this._onAuthorizeClick.bind(this, this._accessToken)}
                        ariaLabel={Resources.OK}
                        aria-disabled={!!this.state.isOkDisabled}>
                        {Resources.OK}
                    </PrimaryButton>
                    <DefaultButton
                        onClick={this.props.onCloseDialog} ariaLabel={Resources.CancelButtonText}>
                        {Resources.CancelButtonText}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _onconnectionNameChanged = (newValue: string) => {
        this._connectionName = newValue;
    }

    private _onServerUrlChanged = (newValue: string) => {
        this._serverUrl = newValue;
    }

    private _onUserNameChanged = (newValue: string) => {
        this._userName = newValue;
    }

    private _onAccessTokenChanged = (newValue: string) => {
        this._accessToken = newValue;
    }

    private _onAuthorizeClick = () => {
        if (this.props.onAuthorized) {
            this.props.onAuthorized({
                connectionName: this._connectionName || this.props.defaultConnectionName,
                serverUrl: this._serverUrl,
                userName: this._userName,
                accessToken: this._accessToken
            } as IDialogInputs);
        }
    }

    private _connectionName: string;
    private _serverUrl: string;
    private _userName: string;
    private _accessToken: string;
}