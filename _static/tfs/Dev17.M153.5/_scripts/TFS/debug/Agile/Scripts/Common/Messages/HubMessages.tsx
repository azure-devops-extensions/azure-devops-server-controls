import * as React from "react";

import { IHubMessagesActionsCreator } from "Agile/Scripts/Common/Messages/HubMessagesActionsCreator";
import { IHubMessagesStore } from "Agile/Scripts/Common/Messages/HubMessagesStore";
import { IMessage, Messages } from "Presentation/Scripts/TFS/Components/Messages";

export interface IHubMessagesProps {
    /* The messages actions */
    actionsCreator: IHubMessagesActionsCreator;
    /* The messages store */
    store: IHubMessagesStore;
}

export interface IHubMessagesState {
    /* An array of messages to be displayed */
    messages: IMessage[];
}

export class HubMessages extends React.Component<IHubMessagesProps, IHubMessagesState> {

    constructor(props: IHubMessagesProps) {
        super(props);
        props.store.addChangedListener(this._onStoreChanged);
        this.state = { messages: this.props.store.getMessages() };
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {
        const {
            messages
        } = this.state;

        return (
            <Messages
                messages={messages}
                onCloseMessage={this._onCloseMessage}
            />
        );
    }

    private _onCloseMessage = (id: string, persistDismissal?: boolean) => {
        const {
            actionsCreator
        } = this.props;
        actionsCreator.clearPageMessage(id, persistDismissal);
    }

    private _onStoreChanged = () => {
        this.setState({ messages: this.props.store.getMessages() });
    }
}