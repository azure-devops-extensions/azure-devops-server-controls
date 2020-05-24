import * as React from "react";

import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as PullRequestStatusUtils from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusUtils";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

// Presentational components
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Link } from "OfficeFabric/Link";
import { TooltipHost, TooltipDelay } from "VSSUI/Tooltip";

import * as Utils_String from "VSS/Utils/String";

import { IterationLink } from "VersionControl/Scenarios/PullRequestDetail/Components/IterationLink";
import { ActivityCardSubduedTemplate } from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTemplate";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { convertArtifactUriToPublicBuildUrl } from "VersionControl/Scripts/Utils/Build";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestStatusUpdatedCard";

export interface IPullRequestStatusUpdatedCardProps {
    tfsContext: TfsContext;
    repoContext: RepositoryContext;
    pullRequestId: number;
    thread: DiscussionThread;
    isNew?: boolean;
}

export class PullRequestStatusUpdatedCard extends React.PureComponent<IPullRequestStatusUpdatedCardProps, {}> {
    public render(): JSX.Element {
        const card = PullRequestStatusUtils.getPullRequestStatusCard(this.props.thread);

        if (!card.author || !card.displayName) {
            return null;
        }

        const publicUrl = convertArtifactUriToPublicBuildUrl(card.targetUrl, this.props.repoContext);

        const format = card.iterationId ? VCResources.PullRequestStatus_ActivityFeedTextWithIteration
            : VCResources.PullRequestStatus_ActivityFeedText;

        const iterationId = parseInt(card.iterationId);

        return <ActivityCardSubduedTemplate createdDate={this.props.thread.publishedDate} isNew={this.props.isNew}>
            <FormattedComponent format={format} className="status-updated-card">
                <i className={card.statusStateIconCss} aria-label={card.statusStateLabel} />
                <StatusName statusName={card.displayName} targetUrl={publicUrl} contextName={card.statusContext} />
                {card.iterationId && <IterationLink iterationId={iterationId} repoContext={this.props.repoContext} pullRequestId={this.props.pullRequestId} />}
                <span>{card.author.displayName}</span>
            </FormattedComponent>
        </ActivityCardSubduedTemplate>;
    }
}

const StatusName = (props: {statusName: string, targetUrl: string, contextName: string}): JSX.Element => {
    const innerElement = props.targetUrl ?
        <Link href={props.targetUrl}>{props.statusName}</Link>
        : <span>{props.statusName}</span>;

    const tooltipText = props.targetUrl ?
        Utils_String.format(VCResources.PullRequestStatus_ActivityFeedTargetUrlTitle, props.contextName)
        : props.contextName;

    return <TooltipHost content={tooltipText} delay={TooltipDelay.zero} directionalHint={DirectionalHint.bottomCenter}>
        {innerElement}
    </TooltipHost>;
};
