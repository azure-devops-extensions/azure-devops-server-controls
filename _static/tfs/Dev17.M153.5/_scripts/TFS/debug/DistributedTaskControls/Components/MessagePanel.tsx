import * as React from "react";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/MessagePanel";

export enum MessagePanelType {
    Warning,
    Info
}

export interface IMessagePanelProps {
    type: MessagePanelType;
    messages: string[];
    headerText?: string;
    className?: string;
}

/**
 * @brief Creates a message panel based on message type, also makes sure screen readers will hear about this by making it a live region. 
 *        This also allows to composite more components using <MessagePanel ..> <MyAwesomeComponentHere /> <MessagePanel />
 */
export class MessagePanel extends React.Component<IMessagePanelProps, {}> {

    public render(): JSX.Element {
        const messages = this.props.messages || [];
        const panelClassName = this._getMessagePanelClass(this.props.type);
        if (messages.length > 0) {
            return <div className={css(panelClassName, this.props.className, "dt-message-panel")} aria-live="polite" aria-relevant="all">
                <MessageHeader text={this.props.headerText} />
                {
                    <ul>
                        {
                            this.props.messages.map((message, index) => {
                                return <li key={index}>{message}</li>;
                            })
                        }
                    </ul>
                }
                {this.props.children}
            </div>;
        }

        return null;
    }

    private _getMessagePanelClass(type: MessagePanelType): string {
        let className = "";
        switch (type) {
            case MessagePanelType.Warning:
                className = "warning";
                break;
            case MessagePanelType.Info:
                className = "info";
                break;
        }

        return className;
    }
}

const MessageHeader = ({ text }) => (
    text ? <h4 className="header">{text}</h4> : null
);
