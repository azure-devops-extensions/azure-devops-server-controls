import * as React from "react";
import * as MessageBar from "OfficeFabric/MessageBar";

export interface MessageBarWrapperProps extends MessageBar.IMessageBarProps {
    message: JSX.Element | string;

    onDidMount?: () => void;
}

export class MessageBarWrapper extends React.PureComponent<MessageBarWrapperProps, {}> {
    public render(): JSX.Element {
        const messageBarType = typeof this.props.messageBarType != "undefined" ? this.props.messageBarType : MessageBar.MessageBarType.error;

        return (
            <MessageBar.MessageBar
                messageBarType={messageBarType}
                isMultiline={this.props.isMultiline}
                onDismiss={this.props.onDismiss} >
                {this.props.message}
            </MessageBar.MessageBar>
        );
    }

    public componentDidMount(): void {
        const { onDidMount } = this.props;
        if (onDidMount) {
            onDidMount();
        }
    }
}