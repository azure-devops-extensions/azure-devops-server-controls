import * as React from "react";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";

// Presentational components
import { ReviewerImageWithVote } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerImageWithVote";
import { ReviewerList } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerList";

import { TooltipHost, DirectionalHint } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";

export interface IReviewerImageProps extends React.Props<void> {
    tfsContext: TfsContext;
    reviewer: ReviewerItem;
    pullRequestId: number;

    // whether to show profile card on click, default false
    showProfileCardOnClick?: boolean;

    /**
     * Should the component hide the vote icon overlay. Default is to show overlay.
     */
    hideVoteOverlay?: boolean;
}

export interface ReviewerImageState {
    showTooltip: boolean;
}

/**
 * A component that displays an image for a reviewer along with a glyph for
 * how the reviewer voted.
 */
export class ReviewerImage extends React.Component<IReviewerImageProps, ReviewerImageState> {

    public constructor(props: IReviewerImageProps) {
        super(props);
        this.state = { showTooltip: true };
    }

    public render(): JSX.Element {
        return (
            <TooltipHost directionalHint={DirectionalHint.bottomCenter}
                tooltipProps={{ onRenderContent: this._renderContent }}
                calloutProps={{
                    gapSpace: 8,
                    className: css({ hidden: !this.state.showTooltip })
                }} >
                <div className="reviewer-image-with-vote-wrapper"
                    aria-label={this._getAriaLabel()}>
                    <ReviewerImageWithVote
                        reviewer={this.props.reviewer}
                        tfsContext={this.props.tfsContext}
                        hideVoteOverlay={this.props.hideVoteOverlay}
                        onProfileCardToggle={this._onProfileCardToggle}
                        showProfileCardOnClick={this.props.showProfileCardOnClick} />
                </div>
            </TooltipHost>
        );
    }

    @autobind
    private _renderContent(): JSX.Element {
        return <div className="vc-pullrequest-review-callout">
            <div className="vc-pullrequest-review-view">
                <ReviewerList
                    hideTooltips={true}
                    pullRequestId={this.props.pullRequestId}
                    tfsContext={this.props.tfsContext}
                    reviewerItems={[this.props.reviewer]}
                    hasPermissionToUpdateReviewers={false} />
            </div>
        </div>;
    }

    @autobind
    private _onProfileCardToggle(isVisible: boolean): void {
        this.setState({ showTooltip: !isVisible });
    }

    private _getAriaLabel(): string {
        if (this.props.hideVoteOverlay) {
            return this.props.reviewer.identity.displayName;
        }
        return this.props.reviewer.accessibleStatusText;
    }
}
