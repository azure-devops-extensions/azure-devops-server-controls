/// <reference types="react" />

import * as React from "react";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Link, ILinkProps } from "OfficeFabric/Link";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import "VSS/LoaderPlugins/Css!Presentation/Components/Messages";


/**
 * Representation of a message, with the message content and if the message should be dismissable or not
 */
export interface IMessage {
    /**
     * Id of the message (unique identifier to be used to dismiss the message)
     */
    id: string;

    /**
     * Type of message (error, warning, ...)
     */
    messageType: MessageBarType;

    /**
     * Message that will be displayed to the user
     */
    message: string;

    /**
     * The link in the message, it will display as separate line below the message
     */
    link?: IMessageLink;

    /**
     * Optional children to display inside message
     */
    children?: React.ReactNode;

    /**
     * Whether the message is dismissable or not, default is false
     */
    closeable?: boolean;

    /**
     * Weather to persist dismissal of this message (store dimiss state in local storage)
     */
    persistDismissal?: boolean;
}

export interface IMessageLink {
    /**
     * The link text
     */
    text: string;
    /**
     * The link url
     */
    href: string;
    /**
     * Additional link props to be used by officefabric link control
     */
    additionalProps?: ILinkProps;
}

export interface IMessagesProps {
    /**
     * Array of messages to be displayed in order
     */
    messages: IMessage[];

    /**
     * Allows a message to dismiss itself by invoking a callback, will be trigged when message closeable property is set to true
     */
    onCloseMessage: (id: string, persistDismissal?: boolean) => void;
}

/**
 * Display messages where you put this component.
 */
export class Messages extends React.Component<IMessagesProps, {}> {

    public shouldComponentUpdate(nextProps: IMessagesProps): boolean {
        if (this.props.messages !== nextProps.messages) {
            return true;
        }

        const matchingLengths = this.props.messages && nextProps.messages && this.props.messages.length === nextProps.messages.length;
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
        if (message.children) {
            return (<MessageBar
                key={`message-${message.id}`}
                messageBarType={message.messageType}
                isMultiline={!!message.link}
                onDismiss={message.closeable ? () => this.props.onCloseMessage(message.id, message.persistDismissal) : null}>
                {message.children}
            </MessageBar>);
        }

        let link: JSX.Element = null;
        if (message.link) {
            link = (<span>
                <br /><br />
                <Link href={message.link.href}>{message.link.text}</Link>
            </span>);
        }

        return (<MessageBar
            key={`message-${message.id}`}
            messageBarType={message.messageType}
            isMultiline={!!message.link}
            onDismiss={message.closeable ? () => this.props.onCloseMessage(message.id, message.persistDismissal) : null}>
            <div className="group-message-container">
                {message.message}
            </div>
            {link}
        </MessageBar>);
    }
}
