/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { BasicDialog } from "DistributedTaskControls/Components/BasicAuthDialog";
import { DefaultPalette } from "OfficeFabric/Styling";
import { ConnectedServiceActionsCreator } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActionsCreator";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ConnectedServiceAuthHelper, IOAuthLoginInfo } from "DistributedTaskControls/Sources/ConnectedServiceAuthHelper";
import { ConnectedServiceStore, IState as ConnectedServiceState } from "DistributedTaskControls/Stores/ConnectedServiceStore";
import { EndpointAuthorizationSchemes, ServiceEndpointType } from "DistributedTaskControls/Common/Common";
import { INewConnectionStatus } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActions";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";

import { CommandButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { KeyCodes } from "OfficeFabric/Utilities";
import { Label } from "OfficeFabric/Label";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Url from "VSS/Utils/Url";
import { registerLWPComponent } from "VSS/LWP";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/AddNewServiceEndpoint";

export interface IState extends Base.IState {
    connectedServiceState: ConnectedServiceState;
    showPATDialog: boolean;
    showBasicDialog: boolean;
}

export interface IProps extends Base.IProps {
    id: string;
    connectionType: string;
    serverUrl: string;
    allowOauth: boolean;
    allowPAT: boolean;
    allowBasic: boolean;
    allowSetServerUrl: boolean;
    isEnabled: boolean;
    newConnectionName?: string;
    onAdd?: (endpoint: ServiceEndpoint) => void;
    showClose?: boolean;
    onDismiss?: () => void;
    existingConnectionNames?: string[];
    autoGenerateNewConnectionName?: boolean;
    setConnectionNameInFocus?: boolean;
}

export class Component extends Base.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this._actionsCreator = ActionCreatorManager.GetActionCreator<ConnectedServiceActionsCreator>(ConnectedServiceActionsCreator);
    }

    public componentWillMount(): void {
        this._store = StoreManager.GetStore<ConnectedServiceStore>(ConnectedServiceStore, this.props.id);
        this._setDefaultConnectionName();
        this.setState({
            connectedServiceState: this._store.getState()
        } as IState);
    }

    public componentDidMount(): void {
        this._isMounted = true;
        this._store.addChangedListener(this._onStoreChanged);
        if (this.props.setConnectionNameInFocus) {
            this._connectionNameField.setFocus();
        }
    }

    public componentWillUnmount(): void {
        this._isMounted = false;
        this._store.removeChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {
        const connectionClassName = css("dtc-add-new-service-endpoint-container", { "show-close-button": this.props.showClose });
        const endpointClassName = css("dtc-add-new-service-endpoint", { "show-close-button": this.props.showClose });
        return (
            <div className={connectionClassName}>
                {
                    this.props.showClose &&
                    <CommandButton
                        className="close-button"
                        ariaLabel={Resources.CloseButtonText}
                        iconProps={{ iconName: "Cancel", styles: { root: { color: DefaultPalette.themeDark } } }}
                        onClick={this.props.onDismiss}>
                    </CommandButton>
                }
                <div className={endpointClassName}>
                    {
                        !this.state.connectedServiceState.isAuthorized &&
                        <MessageBarComponent
                            className="auth-required auth-item"
                            messageBarType={MessageBarType.warning}>
                            {Resources.AuthRequiredMessage}
                        </MessageBarComponent>
                    }

                        <StringInputComponent
                            ref={(element) => { this._connectionNameField = element; }}
                            required={true}
                            cssClass="connection-name auth-item"
                            label={Resources.ConnectionName}
                            value={this._getConnectionName()}
                            onValueChanged={this._onConnectionNameChanged}
                            getErrorMessage={this._getErrorMessageForConnectionName}
                        />

                    <div className="add-connection auth-item">
                        {
                            this.props.allowSetServerUrl &&
                            <StringInputComponent
                                required={true}
                                label={Resources.ServerUrl}
                                inputClassName="connection-server-url"
                                onValueChanged={this._onServerUrlChanged.bind(this)}
                                deferredValidationTime={500}
                                getErrorMessage={this._getErrorMessageForServerUrl}
                            />
                        }

                        {
                            this.props.allowOauth &&
                            <PrimaryButton
                                onClick={this._onAuthorizeConnectionClick}
                                ariaLabel={Resources.AuthorizeUsingOAuth}>
                                {Resources.AuthorizeUsingOAuth}
                            </PrimaryButton>
                        }

                        {
                            this.props.allowPAT &&
                            <div className={"add-connection-pat-container"}>
                                {
                                    this.props.allowOauth &&
                                    <Label className="choice-label">
                                        {Resources.ChoiceLabel}
                                    </Label>
                                }

                                <a
                                    className="add-connection-pat"
                                    role={"button"}
                                    tabIndex={0}
                                    onKeyDown={this._onKeyDown}
                                    onClick={this._onUsePATClick}>
                                    {Resources.UsePAT}
                                </a>

                                <PATDialog
                                    showDialog={this.state.showPATDialog}
                                    accessToken={this.state.connectedServiceState.connectionInfo.accessToken || Utils_String.empty}
                                    onAuthorized={this._onAuthorizePATClick}
                                    onCloseDialog={this._onClosePATDialog} />
                            </div>
                        }

                        {
                            this.props.allowBasic &&
                            <div className={"add-connection-basic-container"}>
                                <Label className="choice-label">
                                    {Resources.ChoiceLabel}
                                </Label>

                                <a
                                    className="add-connection-basic"
                                    tabIndex={0}
                                    role={"button"}
                                    onKeyDown={this._onKeyDown}
                                    onClick={this._onUseBasicClick}>
                                    {Resources.UseBasic}
                                </a>

                                <BasicDialog
                                    showDialog={this.state.showBasicDialog}
                                    userName={this.state.connectedServiceState.connectionInfo.loginUser || Utils_String.empty}
                                    accessToken={this.state.connectedServiceState.connectionInfo.accessToken || Utils_String.empty}
                                    onAuthorized={this._onAuthorizeBasicClick}
                                    onCloseDialog={this._onCloseBasicDialog} />
                            </div>
                        }
                    </div>

                    {
                        this.state.connectedServiceState.isAuthorized &&
                        !this.state.connectedServiceState.connectionInfo.errorMessage &&
                        <MessageBarComponent
                            className="auth-success auth-item"
                            messageBarType={MessageBarType.success}>
                            {this._getAuthorizationSuccessMessage()}
                        </MessageBarComponent>
                    }

                    {
                        (this.state.connectedServiceState.connectionInfo.errorMessage || this._serverUrlError) &&
                        <MessageBarComponent
                            className="auth-error auth-item"
                            messageBarType={MessageBarType.error}>
                            {this._getErrorMessage()}
                        </MessageBarComponent>
                    }

                </div>
            </div>
        );
    }

    private _onKeyDown = (evt: React.KeyboardEvent<HTMLElement>) => {
        if (evt.keyCode === KeyCodes.enter) {
            if (this.props.allowPAT) {
                this._onUsePATClick();
            }
            else if (this.props.allowBasic) {
                this._onUseBasicClick();
            }
        }
    }

    private _getConnectionName(): string {
        let connectionName: string = this.state.connectedServiceState.connectionInfo ? this.state.connectedServiceState.connectionInfo.connectionName : null;
        if (connectionName === null || connectionName === undefined) {
            return this._defaultConnectionName;
        }

        return connectionName;
    }

    private _setDefaultConnectionName(): void {
        if (this._defaultConnectionName === null || this._defaultConnectionName === undefined) {
            if (this.props.existingConnectionNames && this.props.autoGenerateNewConnectionName) {
                this._defaultConnectionName = this._getDefaultName();
            }
            else if (this.props.newConnectionName) {
                this._defaultConnectionName = this.props.newConnectionName;
            }
            else {
                this._defaultConnectionName = Utils_String.empty;
            }
        }
    }

    private _getDefaultName(): string {
        const format: string = Utils_String.format(Resources.SourcesConnectionNameFormat, this.props.connectionType, "{0}");
        return DtcUtils.getDefaultName(format, this.props.existingConnectionNames);
    }

    private _getErrorMessageForConnectionName = (newValue: string): string => {
        if (!newValue) {
            return Resources.RequiredInputErrorMessage;
        }
        else {
            return Utils_String.empty;
        }
    }

    private _getErrorMessageForServerUrl = (newValue: string): string => {
        if (!newValue) {
            return Resources.RequiredInputErrorMessage;
        }
        else {
            return Utils_String.empty;
        }
    }

    private _getErrorMessage(): string {
        if (this._serverUrlError) {
            return this._serverUrlError;
        }
        else {
            return this.state.connectedServiceState.connectionInfo.errorMessage;
        }
    }

    private _onAddConnection(endpoint: ServiceEndpoint): void {
        if (endpoint && this._isMounted && this.props.onAdd) {
            this.props.onAdd(endpoint);
        }
    }

    private _onConnectionNameChanged = (newValue: string) => {
        this._actionsCreator.updateNewConnectionStatus({
            connectionName: newValue,
            type: this.props.connectionType
        } as INewConnectionStatus);
    }

    private _onServerUrlChanged = (newValue: string) => {
        this._serverUrl = newValue;
    }

    private _onAuthorizeConnectionClick = () => {
        this._actionsCreator.updateNewConnectionStatus({
            connectionName: this.state.connectedServiceState.connectionInfo.connectionName || this._defaultConnectionName,
            scheme: EndpointAuthorizationSchemes.OAuth,
            serverUrl: this._getServeUrl(),
            errorMessage: Utils_String.empty,
            isAuthorizing: false,
            type: this.props.connectionType
        } as INewConnectionStatus);

        this._actionsCreator.createAuthRequest(this.props.connectionType);
    }

    private _onUsePATClick = () => {
        this.setState({
            showPATDialog: true
        } as IState);
    }

    private _onAuthorizePATClick = (accessToken: string): void => {
        if (this.props.allowSetServerUrl && !Utils_Url.isAbsoluteUrl(this._getServeUrl())) {
            this._serverUrlError = Resources.ServerUrlInvalid;
        } else {
            this._serverUrlError = Utils_String.empty;
            this._actionsCreator.updateNewConnectionStatusAndCreateEndpoint({
                connectionName: this.state.connectedServiceState.connectionInfo.connectionName || this._defaultConnectionName,
                scheme: EndpointAuthorizationSchemes.PersonalAccessToken,
                serverUrl: this._getServeUrl(),
                errorMessage: Utils_String.empty,
                accessToken: accessToken.trim(),
                type: this.props.connectionType
            } as INewConnectionStatus, this.props.id).then((endpoint: ServiceEndpoint) => {
                this._onAddConnection(endpoint);
            });
        }

        this._onClosePATDialog();
    }

    private _onClosePATDialog = () => {
        this.setState({
            showPATDialog: false
        } as IState);
    }

    private _onUseBasicClick = () => {
        this._actionsCreator.updateNewConnectionStatus({
            connectionName: this.state.connectedServiceState.connectionInfo.connectionName || this._defaultConnectionName,
            scheme: EndpointAuthorizationSchemes.UsernamePassword,
            serverUrl: this._getServeUrl(),
            errorMessage: Utils_String.empty,
            type: this.props.connectionType
        } as INewConnectionStatus);

        this.setState({
            showBasicDialog: true
        } as IState);
    }

    private _getServeUrl(): string {
        if (this.props.allowSetServerUrl) {
            return this._serverUrl;
        }

        return this.props.serverUrl;
    }

    private _onAuthorizeBasicClick = (userName: string, accessToken: string): void => {
        this._actionsCreator.updateNewConnectionStatusAndCreateEndpoint({
            loginUser: userName,
            accessToken: accessToken,
            type: this.props.connectionType
        } as INewConnectionStatus, this.props.id).then((endpoint: ServiceEndpoint) => {
            this._onAddConnection(endpoint);
        });

        this._onCloseBasicDialog();
    }

    private _onCloseBasicDialog = () => {
        this.setState({
            showBasicDialog: false
        } as IState);
    }

    private _onStoreChanged = () => {
        const state = this._store.getState();
        this.setState({
            connectedServiceState: state
        } as IState);

        if (state.connectionInfo.authRequestUrl && state.connectionInfo.isAuthorizing) {
            this._launchAuthHelper(state.connectionInfo.popupWindow, state.connectionInfo.authRequestUrl);
        }
    }

    private _getAuthorizationSuccessMessage(): string {
        if (this.state.connectedServiceState.connectionInfo.scheme === EndpointAuthorizationSchemes.PersonalAccessToken) {
            return Resources.AuthorizedUsingPAT;
        }
        else {
            return Utils_String.format(Resources.AuthorizedUsingOAuthFormat, this.state.connectedServiceState.connectionInfo.loginUser);
        }
    }

    private _launchAuthHelper(authWindow: Window, authUrl: string): void {
        let authHelper = new ConnectedServiceAuthHelper(
            (loginInfo: IOAuthLoginInfo) => {
                this._actionsCreator.updateNewConnectionStatusAndCreateEndpoint({
                    strongboxKey: loginInfo.strongboxKey,
                    loginUser: loginInfo.loginUser,
                    loginUserAvatarUrl: loginInfo.loginAvatarUrl,
                    isAuthorizing: false,
                    type: this.props.connectionType
                } as INewConnectionStatus, this.props.id).then((endpoint: ServiceEndpoint) => {
                    this._onAddConnection(endpoint);
                });
            },
            (errorMessage: string) => {
                this._actionsCreator.updateNewConnectionStatus({
                    errorMessage: errorMessage,
                    isAuthorizing: false,
                    type: this.props.connectionType
                } as INewConnectionStatus);
            },
            authWindow
        );

        authHelper.LaunchAuthUrl(authUrl);
    }

    private _store: ConnectedServiceStore;
    private _actionsCreator: ConnectedServiceActionsCreator;
    private _connectionNameField: StringInputComponent;
    private _isMounted: boolean;
    private _defaultConnectionName: string;
    private _serverUrl: string;
    private _serverUrlError: string;
}

registerLWPComponent("DistributedTask.AddNewServiceEndpoint", Component);

export interface IPATDialogProps extends Base.IProps {
    showDialog: boolean;
    accessToken: string;
    onCloseDialog: () => void;
    onAuthorized: (accessToken: string) => void;
}

export interface IPATDialogState {
    isAuthorizeDisabled: boolean;
}

export class PATDialog extends Base.Component<IPATDialogProps, IPATDialogState> {

    public componentWillMount(): void {

        this.setState({
            isAuthorizeDisabled: true
        } as IPATDialogState);
    }


    public render(): JSX.Element {

        let patTokenFieldClassName: string = "dtc-pat-token-textfield";

        return (
            <Dialog
                hidden={!this.props.showDialog}
                dialogContentProps={{
                    type: DialogType.close,
                    subText: Resources.UsePATDescription
                }}
                title={Resources.UsePAT}
                onDismiss={this.props.onCloseDialog}
                modalProps={{ className: "bowtie-fabric", containerClassName: "dtc-pat-dialog" }}
                firstFocusableSelector={patTokenFieldClassName}
                closeButtonAriaLabel={Resources.CloseButtonText}>

                <div className={patTokenFieldClassName + "-container"}
                    onKeyDown={this._onKeyDown}>
                    <StringInputComponent
                        label={Resources.Token}
                        type="password"
                        onValueChanged={this._onAccessTokenChanged}
                        inputClassName={patTokenFieldClassName}
                    />
                </div>

                <DialogFooter>
                    <PrimaryButton
                        onClick={this._onAuthorizeClick.bind(this, this._accessToken)}
                        disabled={!!this.state.isAuthorizeDisabled}
                        ariaLabel={Resources.Authorize}
                        aria-disabled={!!this.state.isAuthorizeDisabled}>
                        {Resources.Authorize}
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

    private _onAccessTokenChanged = (newValue: string) => {
        this._accessToken = newValue;
        this.setState({
            isAuthorizeDisabled: !this._accessToken
        } as IPATDialogState);
    }

    private _onAuthorizeClick = () => {
        if (this.props.onAuthorized) {
            this.props.onAuthorized(this._accessToken);
        }
    }

    private _onKeyDown = (evt: React.KeyboardEvent<HTMLElement>) => {
        if (this._accessToken && evt.keyCode === KeyCodes.enter) {
            this._onAuthorizeClick();
        }
    }

    private _accessToken: string;
}
