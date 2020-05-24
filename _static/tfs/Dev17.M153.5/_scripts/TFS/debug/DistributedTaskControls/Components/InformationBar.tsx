/// <reference types="react" />

import * as React from "react";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import * as Store from "DistributedTaskControls/Stores/MessageHandlerStore";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { DefaultButton, MessageBarButton } from "OfficeFabric/Button";
import { MessageBarType } from "OfficeFabric/MessageBar";

import "VSS/LoaderPlugins/Css!fabric";

export interface IInformationBarProps extends Base.IProps {
    parentKey: string;
    onMessageBarDisplayToggle?: (toggle: boolean) => void;
    showRetry?: boolean;
    onRetryClick?: () => void;
    hideDismiss?: boolean;
}

export interface IInformationBarState extends Base.IState {
    message: string | JSX.Element;
    type: MessageBarType;
}

export class Component extends Base.Component<IInformationBarProps, IInformationBarState> {

    constructor(props: IInformationBarProps) {
        super(props);

        this._actionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        this._store = StoreManager.GetStore<Store.MessageHandlerStore>(Store.MessageHandlerStore);
        this.state = {
            message: this._store.getMessage(this.props.parentKey),
            type: this._store.getType(this.props.parentKey)
        };
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChange);
    }

    public render() {
        let errorMessage: JSX.Element = null;

        if (this.state.message) {
            errorMessage =
                <MessageBarComponent
                    messageBarType={this.state.type}
                    onDismiss={!this.props.hideDismiss ? this._onMessageDismiss : null}
                    dismissButtonAriaLabel={Resources.CloseButtonText}
                    isMultiline={!this.props.showRetry}
                    actions={
                        this.props.showRetry &&
                        <div>
                            <MessageBarButton
                                text={Resources.Retry}
                                onClick={this.props.onRetryClick}>
                            </MessageBarButton>
                        </div>
                    }>
                    {this.state.message}
                </MessageBarComponent>;
        }

        return (
            <div className={this.props.cssClass || ""}>
                {errorMessage}
            </div>
        );
    }

    private _onStoreChange = () => {
        this.setState({
            message: this._store.getMessage(this.props.parentKey),
            type: this._store.getType(this.props.parentKey)
        });

        if (this.props.onMessageBarDisplayToggle) {
            if (this._store.getMessage(this.props.parentKey)) {
                this.props.onMessageBarDisplayToggle(true);
            }
            else {
                this.props.onMessageBarDisplayToggle(false);
            }
        }
    }

    private _onMessageDismiss = () => {
        this._actionCreator.dismissMessage(this.props.parentKey);
    }

    private _store: Store.MessageHandlerStore;
    private _actionCreator: MessageHandlerActionsCreator;
}
