import { autobind, css } from "OfficeFabric/Utilities";
import { Component as IdentityImage } from "Presentation/Scripts/TFS/Components/IdentityImage";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as React from "react";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";

import "VSS/LoaderPlugins/Css!VersionControl/ReviewerImageWithVote";

export interface IReviewerImageWithVoteProps extends React.Props<void> {
    tfsContext: TfsContext;
    reviewer: ReviewerItem;
    cssClass?: string;
    // whether to show profile card on click, default false
    showProfileCardOnClick?: boolean;

    /**
     * Should the component hide the vote icon overlay? Default is to show overlay.
     */
    hideVoteOverlay?: boolean;
    onProfileCardToggle?(isVisible: boolean): void;
}

export class ReviewerImageWithVote extends React.Component<IReviewerImageWithVoteProps, {}> {
    public render(): JSX.Element {
        const isGroup = this.props.reviewer.identity.isContainer;
        const showProfileCard = this.props.showProfileCardOnClick && !isGroup;

        return (
            <div className={css("reviewer-image-with-vote", this.props.cssClass)}>
                <IdentityImage
                    altText={this.props.reviewer.identity.displayName}
                    size="small"
                    identity={this.props.reviewer.identity}
                    tfsContext={this.props.tfsContext}
                    cssClass={"cursor-hover-card"}
                    showProfileCardOnClick={showProfileCard}
                    isTabStop={this.props.showProfileCardOnClick}
                    onProfileCardToggle={this.props.onProfileCardToggle}
                    dataIsFocusable={this.props.showProfileCardOnClick} />
                {this._voteOverlay()}
            </div>);
    }

    @autobind
    private _voteOverlay(): JSX.Element {
        if (this.props.hideVoteOverlay) {
            return null; // explicitly told not to show the overlay
        }

        return (
            <span
                className={css(
                    this._iconClassForVote(this.props.reviewer.identity.vote),
                    "vote-overlay")}
                aria-label={this.props.reviewer.statusText} />
        );
    }

    @autobind
    private _iconClassForVote(vote: number): string {
        switch (vote) {
            case 10:
                return "bowtie-icon bowtie-status-success";
            case 5:
                return "bowtie-icon bowtie-status-success";
            case 0:
                return "bowtie-icon bowtie-status-waiting bowtie-status-waiting-response";
            case -5:
                return "bowtie-icon bowtie-status-waiting-fill";
            case -10:
                return "bowtie-icon bowtie-status-failure";
            default:
                return "";
        }
    }
}
