// libs
import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
// contracts
import { IMessage, MessageTarget } from "Policy/Scenarios/AdminPolicies/Stores/MessageStore";
// controls
import { MessageBar } from "OfficeFabric/MessageBar";
// scenario
import { IFlux, StoresHub, Actions, ActionCreationSignatures } from "Policy/Scenarios/AdminPolicies/Flux";
import { Dismiss } from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface MessageListContainerProps {
    flux: IFlux;

    containerClassName?: string;

    // Each message has a target which determines which MessageList it appears on
    messageTarget: MessageTarget;
}

export interface MessageListContainerState {
    // Messages to display
    messages?: IMessage[];
}

export class MessageListContainer extends React.Component<MessageListContainerProps, MessageListContainerState>{

    constructor(props: MessageListContainerProps) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {

        const { messages } = this.state;

        return (
            <div className={this.props.containerClassName}>
                {messages.map((msg) => (
                    <MessageBar
                        key={msg.id}
                        isMultiline={true}
                        onDismiss={() => this._dismissMessage(msg.id)}
                        messageBarType={msg.messageType}
                        dismissButtonAriaLabel={Dismiss}
                    >{msg.content}</MessageBar>
                ))}
            </div>
        );
    }

    @autobind
    protected _dismissMessage(messageId: number): void {
        this.props.flux.actionCreator.dismissMessages(messageId);
    }

    public componentDidMount(): void {
        this.props.flux.storesHub.messageStore.addChangedListener(this._storesOnChanged);
    }

    public componentWillUnmount(): void {
        this.props.flux.storesHub.messageStore.removeChangedListener(this._storesOnChanged);
    }

    @autobind
    private _storesOnChanged(): void {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): MessageListContainerState {
        return {
            messages: this.props.flux.storesHub.messageStore.getMessages(this.props.messageTarget),
        };
    }
}
