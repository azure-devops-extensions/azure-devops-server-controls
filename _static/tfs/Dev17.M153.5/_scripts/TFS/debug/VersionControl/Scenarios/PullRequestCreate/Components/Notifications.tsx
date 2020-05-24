import * as React from "react";
import { NotificationSpecialType } from  "VersionControl/Scenarios/PullRequestCreate/Actions/PullRequestCreateActionCreator";
import { NotificationStore, NotificationState, Notification } from  "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { NotificationArea } from "VersionControl/Scenarios/Shared/Notifications/NotificationArea";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as Utils_String from "VSS/Utils/String";

import { FpsLink } from "VersionControl/Scenarios/Shared/FpsLink";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";

export interface NotificationsProps {
    notifications: Notification[];
}

export class Notifications extends React.PureComponent<NotificationsProps, {}> {

    public render(): JSX.Element {
        return this.props.notifications.length ? <div className="notification-area-container">
                <NotificationArea
                    notifications={this.props.notifications}
                    renderers={mapToRenderer}
                    onDismiss={()=>{}} />
            </div> : null;
    }
}

const mapToRenderer: IDictionaryStringTo<(specialContent: any) => JSX.Element> = {
    [NotificationSpecialType.existingPullRequest]: specialContent =>
        <ExistingPullRequest {...specialContent} />
};

interface ExistingPullRequestProps {
    pullRequestId: number;
    repository: GitRepository;
    tfsContext: TfsContext;
}

const ExistingPullRequest = (props: ExistingPullRequestProps): JSX.Element => {
    const linkText = Utils_String.format(VCResources.PullRequest_AnActivePullRequestExistLink, props.pullRequestId);
    const href = VersionControlUrls.getPullRequestUrlByRepository(props.tfsContext, props.repository, props.pullRequestId);
    return <span>
        {VCResources.PullRequest_AnActivePullRequestExistNotification}
        <FpsLink targetHubId={CodeHubContributionIds.pullRequestHub} href={href}>
            {linkText}
        </FpsLink>
    </span>;
};
