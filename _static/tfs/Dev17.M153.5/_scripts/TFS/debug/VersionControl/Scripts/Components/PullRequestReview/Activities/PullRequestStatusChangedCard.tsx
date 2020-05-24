import React = require("react");

import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import {ReviewerUtils} from "VersionControl/Scripts/Utils/ReviewerUtils";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { IdentityRef } from "VSS/WebApi/Contracts";

// Presentational components
import {ActivityCardSubduedTemplate} from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTemplate";
import Format = require("VersionControl/Scripts/Utils/Format");
import InlineIdentity = require("Presentation/Scripts/TFS/Components/InlineIdentity");

export interface IPRStatusChangedProps extends React.ClassAttributes<any> {
    thread: DiscussionCommon.DiscussionThread;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    isNew?: boolean;    
}

/**
 * Activity card for the Pull Request Status changed (abandonded / re-opened) discussion entry
 */
export class Component extends React.Component<IPRStatusChangedProps, {}> {
    public render(): JSX.Element {
        const actionString: string = this._actionString();

        if (!actionString) {
            return null;
        }

        const updater: IdentityRef = ReviewerUtils.getIdentityRef(
            this.props.thread, 
            CodeReviewDiscussionIdentityConstants.CodeReviewStatusUpdatedByIdentity,
            CodeReviewDiscussionConstants.CodeReviewStatusUpdatedByTfId,
            CodeReviewDiscussionConstants.CodeReviewStatusUpdatedByDisplayName);
            
        const bypassReason: string = ReviewerUtils.getPropertyValue(this.props.thread, "BypassReason");

        return (
            <ActivityCardSubduedTemplate createdDate={this.props.thread.publishedDate} isNew={this.props.isNew}>
                <Format.FormattedComponent format={actionString}>
                    <InlineIdentity.Component identity={updater} tfsContext={this.props.tfsContext} />
                    <div className="pullrequest-status-change-card-message">
                        {Utils_String.format(VCResources.PullRequest_ActivityFeed_PR_BypassReason, bypassReason)}
                    </div>}
                </Format.FormattedComponent>
            </ActivityCardSubduedTemplate>
        );
    }

    shouldComponentUpdate(nextProps: IPRStatusChangedProps, nextState: {}): boolean {
        if (this.props.thread !== nextProps.thread ||
            this.props.isNew !== nextProps.isNew) {
            return true;
        }
        return false;
    }

    private _actionString(): string {
        const prStatus: string = ReviewerUtils.getPropertyValue(this.props.thread, "CodeReviewStatus");
        if (Utils_String.localeIgnoreCaseComparer(prStatus, "Active") === 0) {
            return VCResources.PullRequest_ActivityFeed_PR_ReactivatedBy;
        }

        if (Utils_String.localeIgnoreCaseComparer(prStatus, "Abandoned") === 0) {
            return VCResources.PullRequest_ActivityFeed_PR_AbandonedBy;
        }

        if (Utils_String.localeIgnoreCaseComparer(prStatus, "Completed") === 0) {
            const bypassPolicyPropValue = ReviewerUtils.getPropertyValue(this.props.thread, "BypassPolicy");
            const bypassPolicy: boolean = (Utils_String.localeIgnoreCaseComparer(bypassPolicyPropValue, "True") === 0)
            const bypassReason: string = ReviewerUtils.getPropertyValue(this.props.thread, "BypassReason");
            if (bypassPolicy && bypassReason && bypassReason.length !== 0) {
                return VCResources.PullRequest_ActivityFeed_PR_CompletedAndBypassedByWithReason;                
            }
            else if (bypassPolicy) {
                return VCResources.PullRequest_ActivityFeed_PR_CompletedAndBypassedBy;
            }
            else {
                return VCResources.PullRequest_ActivityFeed_PR_CompletedBy;
            }                         
        }
    }
}
