/// <reference types="react" />

import * as React from "react";

import { IDialogInputs, IDialogProps } from "DistributedTaskControls/Components/AddNewEndpoint";
import { ConnectionDialogBase, IState as IConnectionDialogState } from "DistributedTaskControls/Components/ConnectionDialogBase";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface ISubversionDialogInputs extends IDialogInputs {
    realmName: string;
    acceptUntrustedCerts: boolean;
}

export interface ISubversionDialogProps extends IDialogProps {
    defaultConnectionName: string;
    onAuthorized: (svnConnectionInputs: ISubversionDialogInputs) => void;
    getConnectionName: (currentName: string, defaultName: string) => string;
}

export class SubversionConnectionDialog extends ConnectionDialogBase<ISubversionDialogProps, IConnectionDialogState> {
    public render(): JSX.Element {
        let connectionServerUrlClassName: string = "connection-dialog-server-url";

        let subversionRepositoryUrlInfoProps: IInfoProps = {
            calloutContentProps: this._getCallOutContent(Resources.SvnServerUrlHelpText)
        };
        let realmNameInfoProps: IInfoProps = {
            calloutContentProps: this._getCallOutContent(Resources.SvnRealmNameHelpText)
        };
        let acceptUntrustedCertsInfoProps: IInfoProps = {
            calloutContentProps: this._getCallOutContent(Resources.SvnAcceptUntrustedCertsHelpText)
        };

        return (
            <Dialog
                hidden={!this.props.showDialog}
                dialogContentProps={{
                    type: DialogType.close,
                    className: "add-connection-dialog-content"
                }}
                modalProps={{
                    className: "bowtie-fabric",
                    containerClassName: "add-connection-dialog"
                }}
                title={Resources.SubversionDialogTitle}
                onDismiss={this.props.onCloseDialog}
                firstFocusableSelector={connectionServerUrlClassName}
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
                    inputClassName={connectionServerUrlClassName}
                    required={true}
                    label={Resources.SubversionRepositoryUrl}
                    onValueChanged={this._onServerUrlChanged.bind(this)}
                    deferredValidationTime={this.textFieldValidationTimeout}
                    getErrorMessage={this._getErrorMessageForUrlField}
                    infoProps={subversionRepositoryUrlInfoProps}
                />

                <BooleanInputComponent
                    label={Resources.AcceptUntrustedCerts}
                    key="svn-untrusted-cert"
                    onValueChanged={this._onAcceptUntrustedCertsChanged.bind(this)}
                    infoProps={acceptUntrustedCertsInfoProps} />

                <StringInputComponent
                    label={Resources.RealmName}
                    onValueChanged={this._onRealmNameChanged.bind(this)}
                    infoProps={realmNameInfoProps}
                />

                <StringInputComponent
                    label={Resources.UserName}
                    onValueChanged={this._onUserNameChanged.bind(this)}
                />

                <StringInputComponent
                    label={Resources.PasswordLabel}
                    type="password"
                    onValueChanged={this._onAccessTokenChanged}
                />

                <DialogFooter>
                    <PrimaryButton
                        className={css("fabric-style-overrides")}
                        disabled={!!this.state.isOkDisabled}
                        onClick={this._onAuthorizeClick.bind(this, this._accessToken)}
                        ariaLabel={Resources.Confirm}
                        aria-disabled={!!this.state.isOkDisabled}>
                        {Resources.Confirm}
                    </PrimaryButton>
                    <DefaultButton
                        onClick={this.props.onCloseDialog}
                        ariaLabel={Resources.CancelButtonText}>
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

    private _onRealmNameChanged = (newValue: string) => {
        this._realmName = newValue;
    }

    private _onUserNameChanged = (newValue: string) => {
        this._userName = newValue;
    }

    private _onAccessTokenChanged = (newValue: string) => {
        this._accessToken = newValue;
    }

    private _onAcceptUntrustedCertsChanged = (ev: React.FormEvent<HTMLInputElement>, isChecked: boolean) => {
        this._acceptUntrustedCerts = isChecked;
    }

    private _onAuthorizeClick = () => {
        if (this.props.onAuthorized) {
            this.props.onAuthorized({
                connectionName: this._connectionName || this.props.defaultConnectionName,
                serverUrl: this._serverUrl,
                userName: this._userName,
                accessToken: this._accessToken,
                acceptUntrustedCerts: this._acceptUntrustedCerts,
                realmName: this._realmName
            } as ISubversionDialogInputs);
        }
    }

    private _getCallOutContent(markdownText: string): ICalloutContentProps {
        let callOutProps: ICalloutContentProps = {
            calloutMarkdown: markdownText
        };
        return callOutProps;
    }

    private _connectionName: string;
    private _serverUrl: string;
    private _userName: string;
    private _accessToken: string;
    private _realmName: string = "";
    private _acceptUntrustedCerts: boolean;
}