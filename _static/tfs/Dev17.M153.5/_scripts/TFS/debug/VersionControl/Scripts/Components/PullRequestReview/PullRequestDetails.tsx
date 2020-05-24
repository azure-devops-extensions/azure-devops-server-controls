import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";

// actions
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

// utils
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

// stores
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";

// contracts
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from  "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import Utils_String = require("VSS/Utils/String");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { PullRequestFollowStatus } from "VersionControl/Scripts/PullRequestFollowStatus";
import { PullRequestVoteStatus } from "VersionControl/Scripts/PullRequestTypes";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

// components
import { InlineRename } from "Presentation/Scripts/TFS/Components/InlineRename";
import { PullRequestBranchDetail } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestBranchDetail";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";
import { ReviewerSummaryList } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerSummaryList";
import { CreatedBySection } from "VersionControl/Scripts/Components/PullRequestReview/CreatedBySection";
import { PullRequestActionMenuContainer } from "VersionControl/Scripts/Components/PullRequestReview/PullRequestActionMenu";
import { ResolvedDiscussionCount } from "VersionControl/Scripts/Components/PullRequestReview/ResolvedDiscussionCount";
import { VoteControl } from "VersionControl/Scripts/Components/PullRequestReview/VoteControl";
import { BranchFavoriteStatus } from "VersionControl/Scripts/Stores/PullRequestReview/RefFavoritesStore";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestDetails";

// pull request details only
export interface IPullRequestProps {
    pullRequest: IPullRequest;
    sourceBranchFavorite?: BranchFavoriteStatus;
    targetBranchFavorite?: BranchFavoriteStatus;
}

// all of the data needed to render the top bar of pull request details
export interface IPullRequestSummaryProps extends IPullRequestProps {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    pullRequestExists: boolean;
}

export interface IPullRequestAllSummaryProps extends IPullRequestSummaryProps {
    summaryReviewers: ReviewerItem[];
    followStatus: PullRequestFollowStatus;
    isVotePrimaryAction: boolean;
    hasPermissionToUpdateTitle: boolean;
    allowRetargeting: boolean;
    retargetInProgress: boolean;
    autoCompleteSet: boolean;
}

export interface IPullRequestSummaryState {
    titlePending: boolean;
}

const MAX_NUM_REVIEWERS_TO_SHOW = 5;

export abstract class PullRequestDetailBase<P extends IPullRequestSummaryProps, T> extends React.Component<P, T> {
    constructor(props: P) {
        super(props);
    }

    public shouldComponentUpdate(nextProps: P, nextState: T) {
        if (this.props.repositoryContext === null && this.props.tfsContext === null) {
            return false;
        }

        return this.props.pullRequest !== nextProps.pullRequest
            || this.props.tfsContext !== nextProps.tfsContext
            || this.props.repositoryContext !== nextProps.repositoryContext;
    }
}

/**
 * Title portion of pull request details middle pane.
 */
export class PullRequestDetails extends PullRequestDetailBase<IPullRequestAllSummaryProps, IPullRequestSummaryState> {
    constructor(props: IPullRequestAllSummaryProps) {
        super(props);
        // this.state may be null, so just the $.extend is not sufficient, the assignment is necessary
        this.state = $.extend(this.state, { titlePending: false });
    }

    public shouldComponentUpdate(nextProps: IPullRequestAllSummaryProps, nextState: IPullRequestSummaryState) {
        return super.shouldComponentUpdate(nextProps, nextState)
            || this.state.titlePending !== nextState.titlePending
            || this.props.summaryReviewers !== nextProps.summaryReviewers
            || this.props.followStatus !== nextProps.followStatus
            || this.props.pullRequestExists !== nextProps.pullRequestExists
            || this.props.hasPermissionToUpdateTitle !== nextProps.hasPermissionToUpdateTitle
            || this.props.allowRetargeting !== nextProps.allowRetargeting
            || this.props.retargetInProgress !== nextProps.retargetInProgress
            || this.props.autoCompleteSet !== nextProps.autoCompleteSet;
    }

    public componentWillReceiveProps(nextProps: IPullRequestSummaryProps): void {
        if (this.state.titlePending && this.props.pullRequest.title != nextProps.pullRequest.title) {
            this.setState({
                titlePending: false,
            });
        }
    }

    public render(): JSX.Element {
        const pullRequest = this.props.pullRequest;

        if (!this.props.pullRequestExists) {
            // jquery hack to hide pivots we don't control
            $(".hub-pivot").hide();

            // if ID was not a number we won't show it
            const notFoundText: string = (pullRequest.pullRequestId == null) ?
                VCResources.PullRequest_NotFound :
                Utils_String.format(VCResources.PullRequest_WithIdNotFound, pullRequest.pullRequestId);

            const listUrl: string = VersionControlUrls.getPullRequestsUrl(this.props.repositoryContext as any);

            return (
                <div className="vc-pullrequest-review-title-component">
                    <div className={"description-row title heading-message"} role="heading" aria-level={1}>{notFoundText}</div>
                    <div className={"description-row"}><a href={listUrl} onClick={this._onLinkClick}>{VCResources.PullRequest_ListPageNavigate}</a></div>
                </div>
            );
        } else {
            // jquery hack to show pivots we don't control
            $(".hub-pivot").css("display", "");
        }

        if (!pullRequest || !pullRequest.pullRequestContract()) {
            return (<div/>);
        }

        return (
            <div className="vc-pullrequest-review-title-component">
                {this._primaryRow()}
                {this._secondaryRow()}
            </div>
        );
    }

    private _onLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, fullPageNavigate?: boolean): void => {
        const url = (event.currentTarget as HTMLAnchorElement).href;
        if (fullPageNavigate) {
            window.location.href = url;
        } else {
            onClickNavigationHandler(event, CodeHubContributionIds.pullRequestHub, url);
        }
    }

    private _primaryRow(): JSX.Element {
        const pageUrl: string = VersionControlUrls.getPullRequestUrl(
            this.props.repositoryContext as any,
            this.props.pullRequest.pullRequestId);

        return (
            <div className={"description-row title"}>
                <PullRequestTitleBadge pullRequest={this.props.pullRequest} />
                <InlineRename
                    ariaLabel={VCResources.PullRequest_PullRequestTitle}
                    className="page-title-text"
                    text={this.props.pullRequest.title}
                    isReadOnly={!this.props.hasPermissionToUpdateTitle || this.props.pullRequest.status !== VCContracts.PullRequestStatus.Active}
                    submit={this._submitTitle}
                    validate={this._validateTitle}
                    placeHolder={VCResources.PullRequest_Title_Edit}
                    pageUrl={pageUrl}
                    id={this.props.pullRequest.pullRequestId.toString()}
                    inputClassName="vc-title-text"
                    type={VCResources.PullRequest_TitleLinkType}/>
            </div>
        );
    }

    private _secondaryRow(): JSX.Element {
        const pullRequestCard = new PullRequestCardInfo(
            this.props.pullRequest.pullRequestContract(),
            null,
            this.props.sourceBranchFavorite,
            this.props.targetBranchFavorite);

        return (
            <div className={"description-row"}>
                <div className="left-group">
                    <CreatedBySection
                        className="row-group"
                        createdBy={this.props.pullRequest.pullRequestContract().createdBy}
                        creationDate={this.props.pullRequest.creationDate}
                        tfsContext={this.props.tfsContext} />
                    <PullRequestBranchDetail
                        className="row-group pull-request-branch-detail"
                        pullRequestInfo={pullRequestCard}
                        onFavoriteBranch={Flux.instance().actionCreator.pullRequestActionCreator.favoriteBranch}
                        onUnfavoriteBranch={Flux.instance().actionCreator.pullRequestActionCreator.unfavoriteBranch}
                        repositoryContext={this.props.repositoryContext as GitRepositoryContext}
                        allowRetargeting={this.props.allowRetargeting}
                        onRetarget={Flux.instance().actionCreator.pullRequestActionCreator.retargetPullRequest}
                        retargetInProgress={this.props.retargetInProgress}
                        autoCompleteSet={this.props.autoCompleteSet}
                    />
                </div>

                <div className="right-group">
                    <ResolvedDiscussionCount />

                    <ReviewerSummaryList
                        reviewerItems={this.props.summaryReviewers}
                        tfsContext={this.props.tfsContext}
                        pullRequestId={this.props.pullRequest.pullRequestId}
                        maxNumReviewersToShow={MAX_NUM_REVIEWERS_TO_SHOW}
                        votedOnly={true} 
                        showProfileCards={true} />

                    {this._shouldDisplayVoteComponent() ?
                        <VoteControl
                            isCTA={this.props.isVotePrimaryAction}
                            pullRequest={this.props.pullRequest}/> : null}

                    <PullRequestActionMenuContainer />
                </div>
            </div>
        );
    }

    private _shouldDisplayVoteComponent(): boolean {
        return this.props.pullRequest.status === VCContracts.PullRequestStatus.Active
            && !this.props.pullRequest.isDraft;
    }

    @autobind
    private _validateTitle(newTitle: string): boolean {
        return newTitle.length > 0 && newTitle.length <= 400;
    }

    @autobind
    private _submitTitle(newTitle: string): void {
        this.setState({
            titlePending: true,
        });

        Flux.instance().actionCreator.pullRequestActionCreator.savePullRequestTitle(this.props.pullRequest.pullRequestId, newTitle);
    }
}

/**
 * One line version of pull request details.
 */
export class ShortPullRequestDetails extends PullRequestDetailBase<IPullRequestSummaryProps, {}> {
    public render(): JSX.Element {
        if (!this.props.pullRequestExists) {
            return (<span className="vc-pullrequest-title">{VCResources.PullRequest_NotFound}</span>);
        } else if (this.props.pullRequest == null || this.props.pullRequest.pullRequestId < 1) {
            return <div />;
        }

        const statusString = this.props.pullRequest.getStatusString();
        const statusBadgeClass = this.props.pullRequest.getStatusClass();

        return (
            <div className="description-row">
                <PullRequestIdSection
                    className="row-group"
                    pullRequestId={this.props.pullRequest.pullRequestId} />

                <div className={statusBadgeClass}>{statusString}</div>
                <span className="vc-pullrequest-title">{this.props.pullRequest.title}</span>
            </div>
        );
    }
}

// -- pull request header section rendering components

interface PullRequestIdSectionProps extends React.Props<void> {
    className: string;
    pullRequestId: number;
}

class PullRequestIdSection extends React.Component<PullRequestIdSectionProps, {}> {
    public render(): JSX.Element {
        return (
            <div className={this.props.className}>
                {/* 
                 * We wrap this is another div (with display: block) because certain browsers (Chrome)
                 * will overselect when double clicking the ID, and can include some the source branch text.
                 */}
                <div>
                    <span className="bowtie-icon bowtie-tfvc-pull-request pr-icon"></span>
                    <span className="pullrequest-id-text">{this.props.pullRequestId}</span>
                </div>
            </div>);
    }
}

interface IPullRequestTitleBadgeProps {
    pullRequest: IPullRequest;
}

/**
 * Title portion of pull request details middle pane.
 */
class PullRequestTitleBadge extends React.Component<IPullRequestTitleBadgeProps, {}> {
    constructor(props: IPullRequestTitleBadgeProps) {
        super(props);
    }

    public render(): JSX.Element {
        const pullRequest = this.props.pullRequest;
        const statusString = this.props.pullRequest.getStatusString();
        const statusBadgeClass = this.props.pullRequest.getStatusClass();

        return (
            <div role="heading" aria-level={1} aria-live="polite">
                <span className="bowtie-icon bowtie-tfvc-pull-request pr-icon" role="img" aria-label={VCResources.PullRequestStatBadgeTitle} />
                <span className="pullrequest-id-text">{this.props.pullRequest.pullRequestId}</span>
                <span className={statusBadgeClass}> {statusString}</span>
            </div>);
    }

    public shouldComponentUpdate(nextProps: IPullRequestTitleBadgeProps, nextState:{}) {
        return this.props.pullRequest.status != nextProps.pullRequest.status ||
            this.props.pullRequest.isDraft != nextProps.pullRequest.isDraft ||
            this.props.pullRequest.isLoading != nextProps.pullRequest.isLoading;
    }
}

// -- end section rendering components
