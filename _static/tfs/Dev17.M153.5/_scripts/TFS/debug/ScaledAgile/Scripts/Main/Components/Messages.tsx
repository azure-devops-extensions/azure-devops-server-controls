/// <reference types="react" />

import * as React from "react";

import { LegacyMessageAreaControl } from "Presentation/Scripts/TFS/Components/LegacyMessageAreaControl";
import { IMessage } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { MessageBar } from "OfficeFabric/MessageBar";
import { Link } from "OfficeFabric/Link";

export interface IMessagesProps {
    /**
     * Array of messages to be displayed in order.
     */
    messages: IMessage[];

    /**
     * Allows a message to dismiss itself by invoking a callback
     */
    onCloseMessage: (id: string) => void;
}

/**
 * Display messages where you put this component.
 */
export class Messages extends React.Component<IMessagesProps, {}> {

    public shouldComponentUpdate(nextProps: IMessagesProps): boolean {
        if (this.props.messages !== nextProps.messages) {
            return true;
        }

        const matchingLengths = this.props.messages.length === nextProps.messages.length;
        if (!matchingLengths) {
            return true;
        }

        return this.props.messages.some((message, index) => message.id !== nextProps.messages[index].id);
    }

    public render(): JSX.Element {
        if (!this.props.messages) {
            return null;
        }

        const elements = this.props.messages.map(message => this._renderMessage(message));
        if (!elements || elements.length === 0) {
            return null;
        }

        return <div className="group-message">{elements}</div>;
    }

    private _renderMessage(message: IMessage): JSX.Element {
        let link: JSX.Element = null;
        if (message.link) {
            link = <span>
                <br/><br/>
                <Link href={message.link.href}>{message.link.text}</Link>
            </span>;
        }

        return <MessageBar
                key={`message-${message.id}`}
                messageBarType={message.messageType}
                isMultiline={!!message.link}
                onDismiss={message.closeable ? () => this.props.onCloseMessage(message.id) : null}>
            {message.message}
            {link}
        </MessageBar>;
    }
}
