import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { GitCommitRef } from "TFS/VersionControl/Contracts";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import { NotificationArea } from "VersionControl/Scenarios/Shared/Notifications/NotificationArea";
import { Notification } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { DiagnosticComponent } from "VersionControl/Scripts/Components/PullRequestReview/Mixins";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { NotificationSpecialTypes } from "VersionControl/Scripts/Stores/PullRequestReview/NotificationStore";
import { getCommitUrl } from "VersionControl/Scripts/VersionControlUrls";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Utils_String from "VSS/Utils/String";
import { getPullRequestUrlByRepository } from "VersionControl/Scripts/VersionControlUrls";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { FpsLink } from "VersionControl/Scenarios/Shared/FpsLink";
import { PullRequestAlreadyExistsNotificationContent } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

import "VSS/LoaderPlugins/Css!VersionControl/NotificationBarContainer";

function getMapToRenderer(
    repositoryContext: GitRepositoryContext,
): IDictionaryStringTo<(specialContent: any) => JSX.Element> {
    return {
        [NotificationSpecialTypes.restartMergeResult]: specialContent =>
            <RestartMergeBanner
                isNecessary={specialContent.isNecessary}
                lastMergeCommit={specialContent.lastMergeCommit}
                repositoryContext={repositoryContext}
            />,
        [NotificationSpecialTypes.existingPullRequest]: specialContent =>
            <ExistingPullRequest 
                {...specialContent} 
            />
    };
}

export interface INotificationBarContainerState {
    notifications: Notification[];
    repositoryContext: GitRepositoryContext;
}

export class NotificationBarContainer extends DiagnosticComponent<{}, INotificationBarContainerState> {
    constructor(props: {}) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        return <NotificationArea
            className="vc-pullrequest-messagebar"
            notifications={this.state.notifications}
            renderers={getMapToRenderer(this.state.repositoryContext)}
            onDismiss={Flux.instance().actionCreator.dismissNotification}
        />;
    }

    @autobind
    private _onNotificationsChanged(): void {
        this.setState(this._getStateFromStores());
    }

    public componentDidMount(): void {
        super.componentDidMount();

        Flux.instance().storesHub.notificationStore.addChangedListener(this._onNotificationsChanged);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();

        Flux.instance().storesHub.notificationStore.removeChangedListener(this._onNotificationsChanged);
    }

    private _getStateFromStores(): INotificationBarContainerState {
        return {
            notifications: Flux.instance().storesHub.notificationStore.getNotifications(),
            repositoryContext: Flux.instance().storesHub.contextStore.getRepositoryContext() as GitRepositoryContext,
        };
    }
}

interface RestartMergeBannerProps {
    isNecessary: boolean;
    lastMergeCommit: GitCommitRef;
    repositoryContext: GitRepositoryContext;
}

const RestartMergeBanner = (props: RestartMergeBannerProps): JSX.Element =>
    props.isNecessary
    ? <FormatComponent format={VCResources.RestartMergeSuccessful}>
        <Link href={getCommitUrl(props.repositoryContext, props.lastMergeCommit.commitId)}>
            {VCResources.ViewMergeCommit}
        </Link>
    </FormatComponent>
    : <span>{VCResources.RestartMergeUnnecessary}</span>;

const ExistingPullRequest = (props: PullRequestAlreadyExistsNotificationContent): JSX.Element => {
    const linkText = Utils_String.format(VCResources.PullRequest_AnActivePullRequestExistLink, props.pullRequestId);
    const href = getPullRequestUrlByRepository(props.tfsContext, props.repository, props.pullRequestId);
    return <span>
        {VCResources.PullRequest_AnActivePullRequestExisRetargetNotification}
        <FpsLink targetHubId={CodeHubContributionIds.pullRequestHub} href={href}>
            {linkText}
        </FpsLink>
    </span>;
};
