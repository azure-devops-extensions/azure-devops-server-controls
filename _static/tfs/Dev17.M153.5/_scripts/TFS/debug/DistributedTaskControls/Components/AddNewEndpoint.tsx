/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DefaultPalette } from "OfficeFabric/Styling";
import { ConnectedServiceStore, IState as ConnectedServiceState } from "DistributedTaskControls/Stores/ConnectedServiceStore";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { PrimaryButton, CommandButton } from "OfficeFabric/Button";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/AddNewEndpoint";

export interface IState extends Base.IState {
    connectedServiceState: ConnectedServiceState;
}

export interface IProps extends Base.IProps {
    id: string;
    connectionType: string;
    isEnabled: boolean;
    addNewEndpointMessage: string;
    onAddConnectionClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    showClose?: boolean;
    onDismiss?: () => void;
}

export interface IDialogInputs {
    connectionName: string;
    serverUrl: string;
    userName: string;
    accessToken: string;
}

export interface IDialogProps extends Base.IProps {
    showDialog: boolean;
    errorMessage: string;
    onDismissErrorMessage: () => void;
    onCloseDialog: () => void;
    connectionType: string;
}

export class Component extends Base.Component<IProps, IState> {

    public componentWillMount(): void {
        this._store = StoreManager.GetStore<ConnectedServiceStore>(ConnectedServiceStore, this.props.id);

        this.setState({
            connectedServiceState: this._store.getState()
        } as IState);
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
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
                <div className={endpointClassName} key={this.props.connectionType}>
                    {
                        !this.state.connectedServiceState.isAuthorized &&
                        <MessageBar
                            className="auth-required auth-item"
                            messageBarType={MessageBarType.warning}>
                            {this.props.addNewEndpointMessage}
                        </MessageBar>
                    }

                    <div className="add-connection auth-item">

                        <PrimaryButton
                            onClick={this.props.onAddConnectionClick}
                            ariaLabel={Resources.AddConnection}>
                            {Resources.AddConnection}
                        </PrimaryButton>

                        <div>
                            {this.props.children}
                        </div>
                    </div>

                </div>
             </div>
        );
    }

    private _onStoreChanged = () => {
        let state = this._store.getState();
        this.setState({
            connectedServiceState: state
        } as IState);
    }

    private _store: ConnectedServiceStore;
}