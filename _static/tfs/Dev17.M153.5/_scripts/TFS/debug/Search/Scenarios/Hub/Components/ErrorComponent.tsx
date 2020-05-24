import * as React from "react";
import * as MessageBar from "OfficeFabric/MessageBar";

export interface ErrorComponentProps {
    message: string;
}

export const ErrorComponent: React.StatelessComponent<ErrorComponentProps> = (props: ErrorComponentProps) => {
    return (
        <MessageBar.MessageBar
            messageBarType={MessageBar.MessageBarType.error}
            isMultiline={true} >
            {props.message}
        </MessageBar.MessageBar>
    );
}