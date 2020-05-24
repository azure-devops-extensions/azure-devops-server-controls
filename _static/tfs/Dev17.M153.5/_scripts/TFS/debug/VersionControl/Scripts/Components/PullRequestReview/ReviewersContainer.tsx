import * as React from "react";

// other react components
import { autobind } from "OfficeFabric/Utilities";
import * as IdentityPicker from "VersionControl/Scripts/Components/PullRequestReview/IdentityPicker";
import * as Mixins from "VersionControl/Scripts/Components/PullRequestReview/Mixins";

// legacy stuff for control rendering
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";

// Presentational Components
import { EditableReviewerList } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerList";

// used to fire actions from our UI components
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

import "VSS/LoaderPlugins/Css!VersionControl/ReviewersContainer";

export interface IReviewersContainerProps {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    isActive: boolean;
    pullRequestId: number;
    reviewerItems: ReviewerItem[];
    pullRequest: IPullRequest;
    hasPermissionToUpdateReviewers: boolean;
    hasPermissionToShare: boolean;
}

export interface IReviewersContainerState {
    isSearchVisible: boolean;
}

/**
 * This is defined here because the identity picker width is less
 * than the minimum default size (280px - 2px with current styling vs 300px min)
 */
const IDENTITY_PICKER_DROPDOWN_WIDTH = 278;
// this is a randomly generated guid which is used for telemetry by the common identity picker
const IDENTITY_PICKER_CONSUMER_ID = "d8ffd1f1-8c5c-4464-92c3-6b476d713b52"; 

export class ReviewerContainer extends Mixins.DiagnosticComponent<IReviewersContainerProps, IReviewersContainerState> {
    constructor(props) {
        super(props);
        this.state = {
            isSearchVisible: false, // start out w/o search box
        };
        this._onReviewerDeleted = this._onReviewerDeleted.bind(this);
    }

    public render(): JSX.Element {
        // nothing to render
        if (this.props.pullRequestId <= 0) {
            return null;
        }

        return (
            <div className="reviewers-section">
                <div className="vc-pullrequest-leftpane-section-title">
                    <div className="title-content" role="heading" aria-level={2}>{VCResources.PullRequest_Reviewers}</div>
                    <div className="title-content title-action-container">
                        {this._share()}
                        {this._addReviewer()}
                    </div>
                </div>
                <div className="divider" />
                {this._identityPicker()}
                {this._zeroData()}
                {this._requiredReviewers()}
                {this._optionalReviewers()}
            </div>);
    }

    private _share(): JSX.Element {
        if (!this.props.hasPermissionToShare) {
            return null;
        }

        return (
            <div className="title-content title-action">
                <button aria-label={VCResources.PullRequest_Share} className="link-button" onClick={this._onPingClick}>
                    <span className="bowtie-icon bowtie-mail-message-fill" aria-hidden="true" />
                </button>
            </div>);
    }

    private _addReviewer(): JSX.Element {
        if (!this.props.hasPermissionToUpdateReviewers || !this.props.isActive) {
            return null;
        }

        return (
            <div className="title-content title-action">
                <button aria-label={this._titleText()} className="link-button" onClick={this._onAddClick}>
                    <span className={this._iconStyle()} aria-hidden="true" />
                </button>
            </div>);
    }

    private _onReviewerDeleted(reviewerId: string) {
        Flux.instance().actionCreator.reviewerActionCreator.removeReviewer(this.props.pullRequestId, reviewerId);
    }

    private _zeroData(): JSX.Element {
        if (this.props.reviewerItems.length === 0) {
            return <div className="reviewers-zerodata-text">{VCResources.PullRequest_ZeroReviewers}</div>;
        }

        return null;
    }

    private _requiredReviewers(): JSX.Element {
        const required = this.props.reviewerItems.filter(item => item.identity.isRequired);

        if (required.length > 0) {
            return (
                <div>
                    <div className="vc-pullrequest-leftpane-section-subhead">{VCResources.PullRequest_Required}</div>
                    <EditableReviewerList
                        pullRequestId={this.props.pullRequestId}
                        canDelete={this.props.isActive}
                        onDelete={this._onReviewerDeleted}
                        reviewerItems={required}
                        tfsContext={this.props.tfsContext} 
                        hasPermissionToUpdateReviewers={this.props.hasPermissionToUpdateReviewers}  />
                </div>);
        }

        return null;
    }

    private _optionalReviewers(): JSX.Element {
        const optional = this.props.reviewerItems.filter(item => !item.identity.isRequired);

        if (optional.length > 0) {
            return (
                <div> {
                    (optional.length === this.props.reviewerItems.length) ? null :
                        <div className="vc-pullrequest-leftpane-section-subhead with-margin">{VCResources.PullRequest_Optional}</div>
                }
                    <EditableReviewerList
                        pullRequestId={this.props.pullRequestId}
                        canDelete={this.props.isActive}
                        onDelete={this._onReviewerDeleted}
                        reviewerItems={optional}
                        tfsContext={this.props.tfsContext}
                        hasPermissionToUpdateReviewers={this.props.hasPermissionToUpdateReviewers} />
                </div>);
        }

        return null;
    }

    /**
     * If we are supposed to show the identity picker, then this will return it. Otherwise nothing.
     */
    private _identityPicker(): JSX.Element {
        if (this.state.isSearchVisible
            && this.props.isActive) {
            return <IdentityPicker.IdentityPickerSearchContainer
                    focusOnLoad={true}
                    pullRequestId={this.props.pullRequestId}
                    dropdownWidth={IDENTITY_PICKER_DROPDOWN_WIDTH}
                    consumerId={IDENTITY_PICKER_CONSUMER_ID}
                    addReviewer={(prId, reviewerIdentity) => Flux.instance().actionCreator.reviewerActionCreator.addReviewer(prId, reviewerIdentity)} />
        }

        return null;
    }

    /**
     * Toggle search visiblity depending on user selection.
     */
    private _iconStyle = (): string => {
        return "bowtie-icon " + (this.state.isSearchVisible ? "bowtie-math-minus" : "bowtie-math-plus");
    }

    private _titleText = (): string => {
        return this.state.isSearchVisible ? VCResources.PullRequest_HideReviewerSearch : VCResources.PullRequest_AddReviewer;
    }

    /**
     * Toggle the state of the identity picker visibility.
     */
    @autobind
    private _onAddClick(event: React.MouseEvent<HTMLButtonElement>): void {
        this.setState($.extend({}, this.state, { isSearchVisible: !this.state.isSearchVisible }));
    }

    /**
     * Wiring to fire reviewer ping events from the legacy control.
     */
    @autobind
    private _onPingClick(event: React.MouseEvent<HTMLButtonElement>): void {        
        Flux.instance().actionCreator.sharePullRequestActionCreator.showShareDialog(this.props.reviewerItems);
    }
}
