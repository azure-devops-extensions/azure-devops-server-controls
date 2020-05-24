// other react components
import * as React from "react";

import { Link } from "OfficeFabric/Link";
import { getId, autobind } from "OfficeFabric/Utilities";
import { ReviewerCalloutTooltip } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerCalloutTooltip";
import { ReviewerImage } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerImage";
import { ReviewerList } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerList";
import { ReviewerItem, PullRequestVoteStatus } from "VersionControl/Scripts/Utils/ReviewerUtils";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Utils_String from "VSS/Utils/String";

// legacy stuff for control rendering
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export interface IReviewerListProps {
    tfsContext: TfsContext;
    reviewerItems: ReviewerItem[];
    pullRequestId: number;
    maxNumReviewersToShow?: number;
    votedOnly?: boolean;
    showProfileCards?: boolean;
}

export interface ReviewerListState {
    // indicator whether toolTip is attached. Delayed toolTip attachment is used for better performance on pullrequests list page
    overflowToolTipAtached: boolean;
    setFocusInside: boolean;
}

const DEFAULT_MAX_NUM_REVIEWERS_TO_SHOW: number = 3;

export class ReviewerSummaryList extends React.Component<IReviewerListProps, ReviewerListState> {
    private readonly _targetElementId: string; 

    constructor(props: IReviewerListProps) {
        super(props);
        this.state = { overflowToolTipAtached: false, setFocusInside: false };
        this._targetElementId = getId("vc-pr-reviewer-ellipses");
    }

    private _onHover = () => {
        this.setState({ overflowToolTipAtached: true, setFocusInside: false });
    }

    private _onFocus = () => {
        this.setState({ overflowToolTipAtached: true, setFocusInside: false });
    }

    private _onClick = () => {
        // keyboard onClick should move focus to the focusable element inside Callout
        this.setState({ overflowToolTipAtached: true, setFocusInside: true });
    }

    private _dismissTooltip = () => {
        this.setState({ overflowToolTipAtached: false, setFocusInside: false });
    }

    public shouldComponentUpdate(nextProps: IReviewerListProps, nextState: ReviewerListState): boolean {
        return this.props !== nextProps
            || this.state.overflowToolTipAtached !== nextState.overflowToolTipAtached
            || this.state.setFocusInside !== nextState.setFocusInside;
    }

    public render(): JSX.Element {

        // nothing to render
        if (!this.props.reviewerItems
            || this.props.reviewerItems.length === 0) {
            return null;
        }

        // filter reviewers        
        const reviewers: ReviewerItem[] = this.props.votedOnly ?
            this._normalizeReviewers(this.props.reviewerItems)
            : this.props.reviewerItems;

        const reviewerItems = reviewers.map((reviewer) => {
            return <ReviewerImage
                key={reviewer.identity.id}
                reviewer={reviewer}
                pullRequestId={this.props.pullRequestId}
                tfsContext={this.props.tfsContext}
                hideVoteOverlay={reviewer.identity.vote === 0}
                showProfileCardOnClick={this.props.showProfileCards} />;
        });

        let overflowComponent = null;
        let displayReviewers = reviewerItems;

        let additionalReviewerText = null;

        const maxReviewerCount = this.props.maxNumReviewersToShow || DEFAULT_MAX_NUM_REVIEWERS_TO_SHOW;
        const showOverflow: boolean = reviewers.length > maxReviewerCount;

        if (showOverflow) {
            displayReviewers = reviewerItems.slice(0, maxReviewerCount - 1);

            const additionalReviewerCount = reviewers.length - (maxReviewerCount - 1);
            additionalReviewerText = additionalReviewerCount <= 99 ? "+" + additionalReviewerCount : "...";
            const overflowReviewersLabel = Utils_String.format(VCResources.PullRequest_ReviewersOverflowCountLabel, additionalReviewerCount);

            const overflowReviewers = reviewers.slice(maxReviewerCount - 1);

            overflowComponent = <div className="vc-pullrequest-reviewer-vote-overflow-tile">
                <Link id={this._targetElementId}
                    className="vc-pr-reviewer-ellipses"
                    // onMouseLeave will buble up from any child element. To compensate this I use onMouseOver instead of onMouseEnter
                    onMouseOver={this._onHover}
                    onMouseOut={this._dismissTooltip}
                    onFocus={this._onFocus}
                    onClick={this._onClick}
                    data-is-focusable="true"
                    tabIndex={0}
                    aria-label={overflowReviewersLabel}
                    aria-haspopup={true}
                    aria-expanded={this.state.overflowToolTipAtached} >
                    {additionalReviewerText}
                </Link>
                {this.state.overflowToolTipAtached && this._renderOverflowCallout(overflowReviewers)}
            </div>;
        }

        return (
            // .vc-pullrequest-reviewers-list is referenced by the quickstart (see PullRequestQuickStart)
            // If this className changes, the quick start will need to be updated
            <div className="vc-pullrequest-reviewers-list">
                {displayReviewers}
                {overflowComponent}
            </div>
        );
    }

    private _renderOverflowCallout(overflowReviewers: ReviewerItem[]): JSX.Element {
        return <ReviewerCalloutTooltip hasFocusableElements={true}
            ariaLabel={VCResources.PullRequest_ReviewersOverflowTooltipLabel}
            calloutProps={{
                target: `#${this._targetElementId}`,
                setInitialFocus: this.state.setFocusInside,
                onDismiss: this._dismissTooltip
            }} >
            <div className="vc-pullrequest-review-view">
                <ReviewerList
                    hideTooltips={true}
                    pullRequestId={0}
                    tfsContext={this.props.tfsContext}
                    reviewerItems={overflowReviewers}
                    hasPermissionToUpdateReviewers={false} />
            </div>
        </ReviewerCalloutTooltip>;
    }

    private _normalizeReviewers(currentReviewers: ReviewerItem[]): ReviewerItem[] {
        // currentReviewers already sorted in correct order
        return currentReviewers.filter(reviewer => reviewer.identity.vote !== PullRequestVoteStatus.NONE);
    }
}
