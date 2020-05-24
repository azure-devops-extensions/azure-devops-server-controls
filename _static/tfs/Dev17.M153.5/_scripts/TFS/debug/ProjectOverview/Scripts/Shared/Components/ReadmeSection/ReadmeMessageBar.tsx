import * as React from "react";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { CreatePullRequestSuggestionBanner } from "VersionControl/Scenarios/Shared/Notifications/CreatePullRequestSuggestionBanner";

import { ReadmeNotificationState } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";

export interface ReadmeMessageBarProps {
    notificationState: ReadmeNotificationState;
    hideNotification?: boolean;
    errorMessage?: string;
    childMessage?: JSX.Element;
    onNotificationDismiss: () => void;
}

export const ReadmeMessageBar = (props: ReadmeMessageBarProps): JSX.Element => {
    const messageBarType: MessageBarType = props.notificationState.newBranch ? MessageBarType.success : MessageBarType.error;
    const message: string = props.errorMessage || props.notificationState.message;
    const isNotificationAvailable = !!(props.notificationState.newBranch || message) || props.childMessage;

    return isNotificationAvailable
        ? <MessageBar
            messageBarType={messageBarType}
            onDismiss={props.onNotificationDismiss}
            isMultiline={true}>
            {
                props.notificationState.newBranch &&
                <CreatePullRequestSuggestionBanner suggestion={props.notificationState.newBranch} />
            }
            {message && <span>{message}</span>}
            {props.childMessage}
        </MessageBar >
        : null;
};
