import * as React from "react";
import * as ReactDOM from "react-dom";

import { css } from "OfficeFabric/Utilities";

import { PullRequestSummaryDetails, PullRequestUpdatesInfo } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import { PullRequestStatus } from "TFS/VersionControl/Contracts";
import { PullRequestsActions } from "VersionControl/Scripts/Controls/PullRequest";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import * as Utils_String from "VSS/Utils/String";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

// react components
import { PullRequestCard, PullRequestCardProps } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCard";
import { PullRequestCommentsCount } from "VersionControl/Scenarios/PullRequestList/PullRequestCommentsCount";
import { PullRequestUpdates } from "VersionControl/Scenarios/PullRequestList/PullRequestUpdates";
import { ReviewersSection } from "VersionControl/Scenarios/PullRequestList/PullRequestListReviewersSection";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { getRTLSafeKeyCode, KeyCodes, autobind } from "OfficeFabric/Utilities";
import { onNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";

export interface PullRequestRowProps {
    tfsContext: TfsContext;
    onLinkNavigation?: (cidata: IDictionaryStringTo<any>) => void;
    cidata?: IDictionaryStringTo<any>;
    item: PullRequestSummaryDetails;
    showRepositoryDetails: boolean;
    hasInitialFocus?: boolean;
    showLabels?: boolean;
    highlightNewUpdates?: boolean;
}

export interface PullRequestRowState {
    focusLost: boolean;
}

export class PullRequestRow extends React.Component<PullRequestRowProps, PullRequestRowState> {
    private _rowDivElement: HTMLDivElement;

    constructor(props: PullRequestRowProps) {
        super(props);
        this.state = { focusLost: false };
    }

    public componentDidUpdate() {
        if (this.props.hasInitialFocus && !this.state.focusLost && this._rowDivElement) {
            this._rowDivElement.focus();
        }
    }

    public render() {
        const { item, onLinkNavigation, tfsContext } = this.props;
        return (
            <div data-is-focusable={true}
                className="vc-pullRequest-list-row-focusable"
                ref={this.onRef}
                onBlur={this.onBlur}
                aria-label={this._generateAriaLabel()}
                onKeyDown={this.onRowKeyDown}>
                <PullRequestRowContent {...this.props}/>
            </div>);
    }

    private _generateAriaLabel() {
        const { item } = this.props;
        return Utils_String.format(VCResources.PullRequestList_RowAriaLabel,
            item.getId(), item.primaryInfo.gitPullRequest.title, item.primaryInfo.authorDisplayName);
    }

    @autobind
    public onRef(elem: HTMLDivElement) {
        this._rowDivElement = elem
    }

    @autobind
    public onBlur() {
        if (!this.state.focusLost) {
            this.setState({ focusLost: true });
        }
    }

    @autobind
    public onRowKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {

        if (event && event.target === this._rowDivElement
            && (event.keyCode === KeyCodes.enter || event.keyCode === KeyCodes.space)) {

            if (this.props.onLinkNavigation) {
                this.props.onLinkNavigation({component: "PullRequestRow", ...this.props.cidata});
            }

            // when possible onNavigationHandler will make xhr navigation
            const executeDefaultAction = onNavigationHandler(event, CodeHubContributionIds.pullRequestHub, this.props.item.primaryInfo.pullRequestHref);
            if (executeDefaultAction) {
                window.location.href = this.props.item.primaryInfo.pullRequestHref;
            }
        }
    }
}

export interface PullRequestRowContentProps {
    tfsContext: TfsContext;
    onLinkNavigation?: (cidata: IDictionaryStringTo<any>) => void;
    cidata?: IDictionaryStringTo<any>;
    item: PullRequestSummaryDetails;
    showRepositoryDetails: boolean;
    showLabels?: boolean;
    highlightNewUpdates?: boolean;
}

export class PullRequestRowContent extends React.PureComponent<PullRequestRowContentProps, {}> {
    public render() {
        const { item, tfsContext, onLinkNavigation } = this.props;
        return (
            <FocusZone className="vc-pullRequest-list-row" direction={FocusZoneDirection.horizontal}>
                <div className="vc-pullrequest-entry-col-primary">
                    <PullRequestCard
                        primaryInfo={item.primaryInfo}
                        tfsContext={tfsContext}
                        onLinkNavigationCallback={onLinkNavigation}
                        cidata={this.props.cidata}
                        hasCurrentUserApproved={item.hasCurrentUserApproved()}
                        hasNewUpdates={item.hasNewUpdates()}
                        highlightNewUpdates={this.props.highlightNewUpdates}
                        hasNotBeenVisited={item.hasNotBeenVisited()}
                        showRepositoryDetails={this.props.showRepositoryDetails}
                        showLabels={this.props.showLabels}
                        showAuthorProfileCard={true}/>
                </div>
                <div className="vc-pullrequest-entry-col-secondary">
                    <PullRequestSecondarySection
                        primaryInfo={item.primaryInfo}
                        updatesInfo={item.updatesInfo}
                        tfsContext={tfsContext}
                        onLinkNavigation={onLinkNavigation}
                        cidata={this.props.cidata}
                        reviewers={item.sortedReviewers}
                        hasCurrentUserApproved={item.hasCurrentUserApproved()}
                        hasNewUpdates={item.hasNewUpdates()}
                        highlightNewUpdates={this.props.highlightNewUpdates}
                        hasNotBeenVisited={item.hasNotBeenVisited()}
                        showRepositoryDetails={this.props.showRepositoryDetails} />
                </div>
            </FocusZone>);
    }
}

interface PullRequestSecondarySectionProps extends PullRequestCardProps {
    updatesInfo: PullRequestUpdatesInfo;
    reviewers: ReviewerItem[];
    onLinkNavigation?: (cidata: IDictionaryStringTo<any>) => void;
    ciData?: IDictionaryStringTo<any>;
}

class PullRequestSecondarySection extends React.Component<PullRequestSecondarySectionProps, {}> {
    public shouldComponentUpdate(nextProps: PullRequestSecondarySectionProps, nextState): boolean {
        return nextProps.primaryInfo !== this.props.primaryInfo
            || nextProps.updatesInfo !== this.props.updatesInfo
            || nextProps.reviewers !== this.props.reviewers
            || nextProps.hasNewUpdates !== this.props.hasNewUpdates
            || nextProps.hasNotBeenVisited !== this.props.hasNotBeenVisited
            || nextProps.hasCurrentUserApproved !== this.props.hasCurrentUserApproved;
    }

    public render(): JSX.Element {
        const status: PullRequestStatus = this.props.primaryInfo.gitPullRequest.status;
        const updatedDate: Date = (status === PullRequestStatus.Abandoned || status === PullRequestStatus.Completed)
            ? this.props.primaryInfo.gitPullRequest.closedDate
            : this.props.primaryInfo.gitPullRequest.creationDate;

        return (
            <div 
                className={css("secondary", { "isnew": this.props.hasNewUpdates && this.props.highlightNewUpdates }, { "isapproved": this.props.hasCurrentUserApproved })}>
                <ReviewersSection 
                    tfsContext={this.props.tfsContext}
                    reviewers={this.props.reviewers}
                    pullRequestId={this.props.primaryInfo.gitPullRequest.pullRequestId} />
                {
                    this.props.updatesInfo &&
                    <PullRequestCommentsCount
                        pullRequestHref={this.props.primaryInfo.pullRequestHref}
                        artifactStatsInfo={this.props.updatesInfo.artifactStatsInfo}
                        onLinkNavigation={this.props.onLinkNavigation}
                        cidata={this.props.cidata}
                    />
                }
                <PullRequestUpdates
                    updatesInfo={this.props.updatesInfo}
                    status={status}
                    updatedDate={updatedDate}
                    hasNewUpdates={this.props.hasNewUpdates}
                    highlightNewUpdates={this.props.highlightNewUpdates}
                    hasNotBeenVisited={this.props.hasNotBeenVisited} />
            </div>);
    }
}