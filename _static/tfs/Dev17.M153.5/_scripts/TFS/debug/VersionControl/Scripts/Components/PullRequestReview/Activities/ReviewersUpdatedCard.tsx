import React = require("react");

import Activity = require("VersionControl/Scripts/Components/PullRequestReview/Activities/Activity");
import ActivityCardContainer = require("VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityFeedBox");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import {ReviewerUtils} from "VersionControl/Scripts/Utils/ReviewerUtils";
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { IdentityRef } from "VSS/WebApi/Contracts";

// Presentational components
import {ActivityCardSubduedTemplate} from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTemplate";
import Format = require("VersionControl/Scripts/Utils/Format");
import InlineIdentity = require("Presentation/Scripts/TFS/Components/InlineIdentity");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export interface IReviewersUpdatedCardProps extends React.ClassAttributes<any> {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    thread: DiscussionCommon.DiscussionThread;
    isNew?: boolean;
}

export class Component extends React.Component<IReviewersUpdatedCardProps, {}> {

    public render(): JSX.Element {
        const numAdded: number = parseInt(ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewReviewersUpdatedNumAdded, "0"));
        const numRemoved: number = parseInt(ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewReviewersUpdatedNumRemoved, "0"));

        if ((numAdded == 0) && (numRemoved == 0)) {
            return null;
        }

        const updater: IdentityRef = ReviewerUtils.getIdentityRef(
            this.props.thread, 
            CodeReviewDiscussionIdentityConstants.CodeReviewReviewersUpdatedByIdentity,
            CodeReviewDiscussionConstants.CodeReviewReviewersUpdatedByTfId,
            CodeReviewDiscussionConstants.CodeReviewReviewersUpdatedByDisplayname);

        let cardComponent: any = null;

        // There are 3 general groups of formats used below:
        // 1 Added or 1 removed
        //    Did the reviewer add or removed themself
        // 2+ added, 0 removed
        // 0 added, 2+ removed
        // 1+ added and 1+ removed
        if (numAdded + numRemoved === 1) {
            const updatedByComponent = <InlineIdentity.Component identity={updater} tfsContext ={this.props.tfsContext}/>;

            // There was 1 reviewer added or removed. If numAdded is 1, then we know reviewer was added, else a reviewer was removed.
            const wasReviewerAdded: boolean = numAdded === 1;

            const reviewer: IdentityRef = this._getReviewerIdentity(wasReviewerAdded);

            if (reviewer.id === updater.id) {

                const fmtString = wasReviewerAdded ?
                    VCResources.PullRequest_ActivityFeed_Reviewer_Joined :
                    VCResources.PullRequest_ActivityFeed_Reviewer_Declined;

                cardComponent =
                    <Format.FormattedComponent format={fmtString}>
                        {updatedByComponent}
                    </Format.FormattedComponent>;

            } else {
                const fmtString = wasReviewerAdded ?
                    VCResources.PullRequest_ActivityFeed_Reviewers_AddedBy :
                    VCResources.PullRequest_ActivityFeed_Reviewers_RemovedBy;

                cardComponent =
                    <Format.FormattedComponent format={fmtString}>
                        <InlineIdentity.Component identity={reviewer} tfsContext={this.props.tfsContext}/>
                        {updatedByComponent}
                    </Format.FormattedComponent>;
            }
        } else if (numRemoved === 0) {
            // 0 removed, 2+ added
            cardComponent = <span>{Utils_String.format(VCResources.PullRequest_ActivityFeed_Reviewer_Added, updater.displayName, numAdded)}</span>;
        } else if (numAdded === 0) {
            // 2+ removed, 0 added
            cardComponent = <span>{Utils_String.format(VCResources.PullRequest_ActivityFeed_Reviewer_Removed, updater.displayName, numRemoved)}</span>

        } else {
            // 1+ removed and 1+ added
            const text: string = Utils_String.format(
                VCResources.PullRequest_ActivityFeed_Reviewer_AddedRemoved,
                updater.displayName,
                numAdded,
                (numAdded == 1) ? VCResources.PullRequest_ActivityFeed_Reviewer_Reviewer : VCResources.PullRequest_ActivityFeed_Reviewer_Reviewers,
                numRemoved,
                (numRemoved == 1) ? VCResources.PullRequest_ActivityFeed_Reviewer_Reviewer : VCResources.PullRequest_ActivityFeed_Reviewer_Reviewers);

            cardComponent = <span>{text}</span>;
        }

        return (
            <ActivityCardSubduedTemplate createdDate={this.props.thread.publishedDate} isNew={this.props.isNew}>
                {cardComponent}
            </ActivityCardSubduedTemplate>
        );
    }

    shouldComponentUpdate(nextProps: IReviewersUpdatedCardProps, nextState: {}): boolean {
        if (this.props.thread !== nextProps.thread ||
            this.props.isNew !== nextProps.isNew) {
            return true
        }
        return false;
    }

    private _getReviewerIdentity(wasReviewerAdded : boolean) : IdentityRef {
        const identityKeyName = wasReviewerAdded ? 
            CodeReviewDiscussionIdentityConstants.CodeReviewReviewersUpdatedAddedIdentity : 
            CodeReviewDiscussionIdentityConstants.CodeReviewReviewersUpdatedRemovedIdentity;

        if (ReviewerUtils.hasPropertyValue(this.props.thread, identityKeyName)) {                
            const reviewerKey = ReviewerUtils.getPropertyValue(this.props.thread, identityKeyName);
            return this.props.thread.identities[reviewerKey];
        }
        else {
            const reviewerId = wasReviewerAdded ?
                ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewReviewersUpdatedAddedTfId) :
                ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewReviewersUpdatedRemovedTfId);

            const reviewerName = wasReviewerAdded ?
                ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewReviewersUpdatedAddedDisplayName) :
                ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewReviewersUpdatedRemovedDisplayName);
            
            return {
                id: reviewerId,
                displayName: reviewerName
            } as IdentityRef;
        }
    }
}
