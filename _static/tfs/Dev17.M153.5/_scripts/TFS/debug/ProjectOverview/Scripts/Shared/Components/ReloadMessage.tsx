import * as React from "react";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { FormattedMessage, IFormattedMessageLink } from "Presentation/Scripts/TFS/Components/FormattedMessage";
import * as  ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

export interface ReloadMessageProps {
    message: string;
}

export const ReloadMessage = (props: ReloadMessageProps): JSX.Element => {
    const message = props.message + ProjectOverviewResources.Error_RefreshMessageFormat;
    const links: IFormattedMessageLink[] = [
        {
            text: ProjectOverviewResources.Error_RefreshLinkText,
            href: window.location.href,
        },
    ];

    return (
        <MessageBar messageBarType={MessageBarType.error}>
            <FormattedMessage message={message} links={links} />
        </MessageBar>
    );
}
