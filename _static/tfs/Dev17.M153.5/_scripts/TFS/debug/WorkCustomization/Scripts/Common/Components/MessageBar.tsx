/// <reference types="react" />

import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";
import { MessageStore } from "WorkCustomization/Scripts/Common/Stores/MessageStore";
import * as FabricMessageBar from "OfficeFabric/MessageBar";
import { clearErrorAction, clearMessageAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { autobind } from "OfficeFabric/Utilities";

export interface MessageBarProps extends Props {
    id?: string
}

export class MessageBar extends Component<MessageBarProps, State>
{
    private _store: MessageStore;

    constructor(props: Props) {
        super(props);
    }

    render() {
        // if there is error show only error bar
        let store: MessageStore = this.getStore();

        if (store.error) {
            return <FabricMessageBar.MessageBar messageBarType={FabricMessageBar.MessageBarType.error} onDismiss={this._onDismissError} className={this.props.cssClass}>
                {store.isDangerousHTML ? <span dangerouslySetInnerHTML={{ __html: store.error }} /> : store.error}
            </FabricMessageBar.MessageBar>;
        }

        if (store.message) {
            return <FabricMessageBar.MessageBar messageBarType={FabricMessageBar.MessageBarType.info} onDismiss={this._onDismissMessage} className={this.props.cssClass}>
                {store.isDangerousHTML ? <span dangerouslySetInnerHTML={{ __html: store.message }} /> : store.message}
            </FabricMessageBar.MessageBar>;
        }

        return null;
    }

    public getStore(): MessageStore {
        if (!this._store) {
            this._store = new MessageStore({ id: this.props.id });
        }
        return this._store;
    }

    public getState() {
        return {};
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this._store.dispose();
    }

    @autobind
    private _onDismissMessage(): void {
        clearMessageAction.invoke(null);
    }

    @autobind
    private _onDismissError(): void {
        clearErrorAction.invoke(null);
    }
}