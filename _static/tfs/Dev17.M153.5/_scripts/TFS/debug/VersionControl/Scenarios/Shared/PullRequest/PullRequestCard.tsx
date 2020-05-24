import * as React from "react";

import { Link } from "OfficeFabric/Link";
import { autobind, css } from "OfficeFabric/Utilities";

import { Component as IdentityImage } from "Presentation/Scripts/TFS/Components/IdentityImage";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";
import * as Utils_String from "VSS/Utils/String";

import { BranchDetail } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestBranchDetail";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";
import { PullRequestRollupStatus } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestRollupStatus";

import { PullRequestListLabelsCard } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestListLabelsCard";
import { PRCardSecondLineToolTip } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestCard";

export interface PullRequestCardProps {
    primaryInfo: PullRequestCardInfo;
    tfsContext: TfsContext;
    imageSize?: string;
    showRepositoryDetails: boolean;
    hasNewUpdates?: boolean; // if true, there are new updates for the current user on this pull request
    highlightNewUpdates?: boolean; // if true, highlight new updates if there are any
    hasNotBeenVisited?: boolean;
    hasCurrentUserApproved?: boolean;
    onLinkNavigationCallback?: (cidata: IDictionaryStringTo<any>) => void;
    cidata?: IDictionaryStringTo<any>;
    showCreatedDate?: boolean;
    showSecondLineToolTip?: boolean;
    showLabels?: boolean;
    showAuthorProfileCard?: boolean;
}

export class PullRequestCard extends React.Component<PullRequestCardProps, {}> {
    public shouldComponentUpdate(nextProps: PullRequestCardProps, nextState: {}): boolean {
        return nextProps.primaryInfo !== this.props.primaryInfo
            || nextProps.hasNewUpdates !== this.props.hasNewUpdates
            || nextProps.hasNotBeenVisited !== this.props.hasNotBeenVisited
            || nextProps.hasCurrentUserApproved !== this.props.hasCurrentUserApproved;
    }

    private _onLinkClick(event: React.MouseEvent<HTMLAnchorElement>, hubId: string) {
        onClickNavigationHandler(event, hubId, (event.currentTarget as HTMLAnchorElement).href);
    }

    @autobind
    private _onLinkTelemetry(event: React.MouseEvent<HTMLAnchorElement> ): void {
        // This captures all mouse buttons (left, middle, right) and so technically we will record an event
        // if someone opens the context menu but then does something other than 'open in new window.' But I do want
        // to record RMB->new window and so for this I'd rather get too much data that I can filter on if its noisy than ignore it
        if (this.props.onLinkNavigationCallback) {
            this.props.onLinkNavigationCallback({component: "PullRequestCard", button: event.button, ...this.props.cidata});
        }
    }

    public render(): JSX.Element {
        let primaryClass: string = "primary";
        primaryClass += this.props.hasNewUpdates && this.props.highlightNewUpdates ? " isnew" : "";
        primaryClass += this.props.hasCurrentUserApproved ? " isapproved" : "";

        const createdBy = this.props.primaryInfo.gitPullRequest.createdBy;

        return <div className={primaryClass}>
            { this.props.highlightNewUpdates && this.props.hasNewUpdates && <div className="dot" aria-label={VCResources.PullRequest_NewChangesTitle}/> }
            <IdentityImage
                cssClass={css("vc-pullrequest-entry-author-image", {"cursor-hover-card": this.props.showAuthorProfileCard} )}
                size={this.props.imageSize}
                identity={createdBy}
                altText={Utils_String.format(VCResources.PullRequest_ActivityFeed_PRCreatedCardText, createdBy.displayName)}
                tfsContext={this.props.tfsContext}
                dataIsFocusable
                showProfileCardOnClick={this.props.showAuthorProfileCard} />
            <div className={"card-details"}>
                <div className="primary-line ellide-overflow">
                    <Link className="primary-text"
                        title={this.props.primaryInfo.gitPullRequest.title}
                        href={this.props.primaryInfo.pullRequestHref}
                        onMouseUp={this._onLinkTelemetry} // capture telemetry for both click and middle mouse
                        onClick={(event: React.MouseEvent<HTMLAnchorElement>) => this._onLinkClick(event, CodeHubContributionIds.pullRequestHub)}>
                        <span role="heading" aria-level={3}>{this.props.primaryInfo.gitPullRequest.title}</span>
                    </Link>
                    {this.props.primaryInfo.gitPullRequest.isDraft && this._isDraftBadge()}
                    <PullRequestRollupStatus pullRequest={this.props.primaryInfo.gitPullRequest} />
                    {this.props.showLabels && <PullRequestListLabelsCard
                        pullRequest={this.props.primaryInfo.gitPullRequest}/>}
                </div>
                <div className="secondary-line">
                    {this._secondLine()}
                </div>
            </div>
        </div>;
    }

    private _isDraftBadge(): JSX.Element {
        return <span className="vc-pullrequest-rollupstatus vc-pullrequest-rollupstatus-draft-text">{VCResources.Draft}</span>;
    }

    private _secondLine(): JSX.Element {
        const secondaryItems: JSX.Element[] = [];
        const formatText = this._secondaryRowFormatString();

        secondaryItems.push(<span
            key="authorName" className="vc-pullrequest-author-name">{this.props.primaryInfo.authorDisplayName}</span>);

        secondaryItems.push(<span
            key="pullRequestId">{this.props.primaryInfo.gitPullRequest.pullRequestId}</span>);

        secondaryItems.push(<BranchDetail
            key="branchDetail"
            showRepository={this.props.showRepositoryDetails}
            repositoryUrl={this.props.primaryInfo.targetRepositoryUrl}
            repositoryName={this.props.primaryInfo.targetRepositoryName}
            repositoryClass={this.props.primaryInfo.targetRepositoryContext.getRepositoryClass()}
            repositoryTooltip={this.props.primaryInfo.targetRepositoryToolTip}
            branchExplorerUrl={this.props.primaryInfo.targetBranchExplorerUrl}
            branchName={this.props.primaryInfo.targetBranchName}
            branchLabel={Utils_String.format(VCResources.PullRequest_SuggestionBranchTitle, this.props.primaryInfo.targetBranchName)}
        />);

        if (this.props.showCreatedDate) {
            secondaryItems.push(<span key="createdDate">{this._createdDateString()}</span>);
        }

        const secondLineTooltip = (this.props.showSecondLineToolTip) ?
            Utils_String.format(
                PRCardSecondLineToolTip,
                this.props.primaryInfo.authorDisplayName,
                this.props.primaryInfo.gitPullRequest.pullRequestId,
                this.props.primaryInfo.targetBranchName,
                this.props.showCreatedDate ? this._createdDateString() : null
            )
            : "";

        return (
            <FormattedComponent format={formatText} elementType="div" className="secondary-text ellide-overflow" title={secondLineTooltip}>
                {secondaryItems}
            </FormattedComponent>);
    }

    private _createdDateString(): string {
        const isDateRecent = VCDateUtils.isDateRecent(this.props.primaryInfo.gitPullRequest.creationDate);
        return VCDateUtils.getDateString(this.props.primaryInfo.gitPullRequest.creationDate, isDateRecent);
    }

    private _secondaryRowFormatString(): string {
        const isDateRecent = VCDateUtils.isDateRecent(this.props.primaryInfo.gitPullRequest.creationDate);
        const showDate = this.props.showCreatedDate;
        const showRepository = this.props.showRepositoryDetails;

        if (showDate) {
            if (isDateRecent) {
                return VCResources.PullRequest_CardRequestedStringRecentDate;
            } else {
                return VCResources.PullRequest_CardRequestedStringDate;
            }
        } else {
            return VCResources.PullRequest_CardRequestedString;
        }
    }
}
