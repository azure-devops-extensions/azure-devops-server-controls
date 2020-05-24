import *  as React from "react";

import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { ReviewerUtils } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";
import { ActivityCardSubduedTemplate } from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTemplate";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";
import * as InlineIdentity from "Presentation/Scripts/TFS/Components/InlineIdentity";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";

export interface IIsDraftStateUpdatedCardProps extends React.ClassAttributes<any> {
    tfsContext: TfsContext;
    thread: DiscussionThread;
    isNew?: boolean;
}

/**
 * A component that displays a discussion card for setting / clearing the IsDraft state on a Pull Request.
 */
export class IsDraftStateUpdatedCard extends React.Component<IIsDraftStateUpdatedCardProps> {
    public render(): JSX.Element {
        const updater: IdentityRef = ReviewerUtils.getIdentityRef(
            this.props.thread, 
            CodeReviewDiscussionIdentityConstants.CodeReviewIsDraftUpdatedByIdentity,
            CodeReviewDiscussionConstants.CodeReviewIsDraftUpdatedByTfId,
            CodeReviewDiscussionConstants.CodeReviewIsDraftUpdatedByDisplayName);
            
        const wasClearedNowSet: boolean = ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewIsDraftNowSet) === "1";

        const format: string = (wasClearedNowSet && VCResources.PullRequest_IsDraft_Set) || VCResources.PullRequest_IsDraft_Cleared;

        return (
            <ActivityCardSubduedTemplate createdDate={this.props.thread.publishedDate} isNew={this.props.isNew}>
                <FormattedComponent format={format}>
                    <InlineIdentity.Component identity={updater} tfsContext={this.props.tfsContext} />
                </FormattedComponent>
            </ActivityCardSubduedTemplate>
        );
    }
}
