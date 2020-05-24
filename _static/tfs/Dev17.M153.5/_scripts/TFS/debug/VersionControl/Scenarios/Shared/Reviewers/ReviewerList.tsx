import * as React from "react";

// legacy stuff for control rendering
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { format } from "VSS/Utils/String";

// reviewer controls
import { ReviewerActions } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerActions";
import { ReviewerCalloutTooltip } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerCalloutTooltip";
import { ReviewerImageWithVote } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerImageWithVote";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";

import { Link } from "OfficeFabric/Link";
import { TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";
import { getId } from "OfficeFabric/Utilities";

// fabric
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { List } from "OfficeFabric/List";
import { autobind, css } from "OfficeFabric/Utilities";

export interface IReviewerListProps extends React.Props<void> {
    pullRequestId: number;
    hideTooltips?: boolean;
    tfsContext: TfsContext;
    reviewerItems: ReviewerItem[];
    hasPermissionToUpdateReviewers: boolean;
}

export interface IEditableReviewerListProps extends IReviewerListProps {
    canDelete: boolean;
    onDelete?(reviewerId: string): void;
}

export abstract class ReviewerListBase<P extends IReviewerListProps> extends React.Component<P, {}> {
    /**
     * Return the right type of status depeding on the reviewer.
     */
    protected statusComponent(reviewer: ReviewerItem, hideTooltips: boolean): JSX.Element {

        if (reviewer.identity.isContainer) {
            return (
                <GroupReviewerStatus
                    reviewer={reviewer}
                    pullRequestId={this.props.pullRequestId}
                    tfsContext={this.props.tfsContext}
                    hideTooltips={hideTooltips} />);
        }

        return <SingleReviewerStatus reviewer={reviewer} />;
    }

    protected statusClassName(reviewer: ReviewerItem): string {
        return  css(
            "reviewer-name-status-container",
            {
                ["status"]: reviewer.hasVote,
            });
    }

    protected getAriaRowLabel(reviewer: ReviewerItem): string {
        if (reviewer.hasVote) {
            return reviewer.identity.displayName;
        }

        return reviewer.accessibleStatusText;
    }
}

export class ReviewerList extends ReviewerListBase<IReviewerListProps> {
    public render(): JSX.Element {
        // nothing to render
        if (!this.props.reviewerItems
            || this.props.reviewerItems.length === 0) {
            return null;
        }

        const reviewerRows = this.props.reviewerItems.map(this._reviewerRow);

        return (
            <ul className="vc-pullrequest-reviewers-list">
                {(
                    <FocusZone direction={FocusZoneDirection.vertical}>
                        {reviewerRows}
                    </FocusZone>
                )}
            </ul>
        );
    }

    @autobind
    private _reviewerRow(reviewer: ReviewerItem) {
        return (
            <li
                className={"vc-pullrequest-reviewer-row"}
                data-is-focusable={true}
                key={reviewer.identity.id}
                tabIndex={0}
                aria-label={this.getAriaRowLabel(reviewer)}>
                <ReviewerImageWithVote
                    tfsContext={this.props.tfsContext}
                    reviewer={reviewer}
                    hideVoteOverlay={!reviewer.hasVote} />
                <div className={this.statusClassName(reviewer)}>
                    <div className="ellide-overflow">{reviewer.displayName}</div>
                    {this.statusComponent(reviewer, this.props.hideTooltips)}
                </div>
                <div className="vc-pullrequest-review-clear" />
            </li>);
    }
}

export class EditableReviewerList extends ReviewerListBase<IEditableReviewerListProps> {
    public render(): JSX.Element {
        // nothing to render
        if (!this.props.reviewerItems
            || this.props.reviewerItems.length === 0) {
            return null;
        }

        return (
            <div>
                <List
                    className="vc-pullrequest-reviewers-list"
                    items={this.props.reviewerItems}
                    onRenderCell={this._onRenderCell} />
            </div>
        );
    }

    @autobind
    private _onRenderCell(reviewer: ReviewerItem): JSX.Element {
        return (
            <div
                role="listitem"
                className="vc-pullrequest-reviewer-row">
                <ReviewerImageWithVote
                    tfsContext={this.props.tfsContext}
                    reviewer={reviewer}
                    hideVoteOverlay={!reviewer.hasVote}
                    showProfileCardOnClick={true} />
                <div className={this.statusClassName(reviewer)} data-is-focusable={true}>
                    <TooltipHost
                         hostClassName={css("ellide-overflow")}
                         content={reviewer.displayName}
                         directionalHint={DirectionalHint.bottomCenter}
                         overflowMode={TooltipOverflowMode.Self}>
                        <span>{reviewer.displayName}</span>
                    </TooltipHost>
                    {this.statusComponent(reviewer, this.props.hideTooltips)}
                </div>
                <ReviewerActions
                    reviewerId={reviewer.identity.id}
                    reviewerDisplayName={reviewer.displayName}
                    pullRequestId={this.props.pullRequestId}
                    canDelete={this.props.hasPermissionToUpdateReviewers && this.props.canDelete}
                    onDelete={this.props.onDelete}
                />
            </div>
        );
    }
}

interface ISingleReviewerStatusProps extends React.Props<void> {
    reviewer: ReviewerItem;
}

interface IGroupReviewerStatusProps {
    pullRequestId: number;
    tfsContext: TfsContext;
    reviewer: ReviewerItem;
    hideTooltips?: boolean;
}

class SingleReviewerStatus extends React.Component<ISingleReviewerStatusProps, {}> {
    public render(): JSX.Element {
        if (this.props.reviewer.identity.vote === 0) {
            return <span className="visually-hidden">{this.props.reviewer.statusText}</span>;
        }

        return (
            <div className="ellide-overflow vote-status-text">
                <span>{this.props.reviewer.statusText}</span>
            </div>
        );
    }
}

interface GroupReviewerStatusState {
    showCallout: boolean;
    setFocusInside: boolean;
}

class GroupReviewerStatus extends React.Component<IGroupReviewerStatusProps, GroupReviewerStatusState> {
    private _calloutTargetElement: HTMLElement;
    private _toolTipExpandedId: string;

    constructor(props: IGroupReviewerStatusProps) {
        super(props);
        this.state = { showCallout: false, setFocusInside: false };
        this._toolTipExpandedId = getId("tooltip-menu-expanded");
    }

    public render(): JSX.Element {
        if (this.props.reviewer.identity.vote === 0) {
            return <span className="visually-hidden">{this.props.reviewer.statusText}</span>;
        }

        return (
            <div className="ellide-overflow vote-status-text">
                {this.props.hideTooltips ? this._statusText() : this._renderWithRichTooltip()}
            </div>
        );
    }

    private _renderWithRichTooltip() {
        const showCallout = this.state.showCallout;

        return (
            <div className="ellide-overflow vote-status-text" >
                {showCallout && this._renderCallout()}

                <div ref={(elem) => { this._calloutTargetElement = elem; }}>
                    <Link
                        aria-label={VCResources.PullRequest_ReviewerDetails}
                        aria-haspopup={true}
                        aria-expanded={showCallout}
                        aria-controls={showCallout ? this._toolTipExpandedId : null}
                        onMouseOver={this._onHover}
                        onMouseLeave={this._dismissCallount}
                        onFocus={this._onFocus}
                        onClick={this._onClick}
                        className="vc-pullrequest-via-button"
                    >{this._statusText()}</Link>
                </div>
            </div>);
    }

    private _renderCallout(): JSX.Element {
        return (
            <ReviewerCalloutTooltip id={this._toolTipExpandedId}
                hasFocusableElements={true}
                ariaLabel={VCResources.PullRequest_ReviewersDelegateTooltipLabel}
                calloutProps={{
                    target: this._calloutTargetElement,
                    setInitialFocus: this.state.setFocusInside,
                    onDismiss: this._dismissCallount,
                }} >
            <div className="vc-pullrequest-review-view">
                <ReviewerList
                    pullRequestId={this.props.pullRequestId}
                    tfsContext={this.props.tfsContext}
                    reviewerItems={this.props.reviewer.delegateReviewers}
                    hasPermissionToUpdateReviewers={false} />
            </div>
        </ReviewerCalloutTooltip>);
    }

    private _statusText = () => {
        return <span>{format(VCResources.PullRequest_DelegateReviewerViaFormat, this.props.reviewer.delegateReviewersDisplayName)}</span>;
    }

    private _onHover = () => {
        this.setState({ showCallout: true, setFocusInside: false });
    }

    private _onFocus = () => {
        this.setState({ showCallout: true, setFocusInside: false });
    }

    private _onClick = () => {
        this.setState({ showCallout: true, setFocusInside: true });
    }

    private _dismissCallount = () => {
        this.setState({ showCallout: false, setFocusInside: false });
    }
}
