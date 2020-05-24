import *  as React from "react";

import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { ReviewerUtils } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { CodeReviewAutoCompleteSet, CodeReviewAutoCompleteCleared } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";
import { ActivityCardSubduedTemplate } from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTemplate";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";
import * as InlineIdentity from "Presentation/Scripts/TFS/Components/InlineIdentity";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";

export interface IAutoCompleteCardProps extends React.ClassAttributes<any> {
    tfsContext: TfsContext;
    thread: DiscussionThread;
    isNew?: boolean;
}

/**
 * A component that displays a discussion card for setting / clearing the autocomplete state on a Pull Request.
 */
export class Component extends React.Component<IAutoCompleteCardProps> {
    public render(): JSX.Element {
        const updater: IdentityRef = ReviewerUtils.getIdentityRef(
            this.props.thread, 
            CodeReviewDiscussionIdentityConstants.CodeReviewAutoCompleteUpdatedByIdentity,
            CodeReviewDiscussionConstants.CodeReviewAutoCompleteUpdatedByTfId,
            CodeReviewDiscussionConstants.CodeReviewAutoCompleteUpdatedByDisplayName,);
            
        const nowSet: boolean = ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewAutoCompleteNowSet) === "1";
        const failedReason: string = ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewAutoCompleteFailedReason);

        // if autocomplete failed, the failure message is the comment content
        // otherwise display a generic string for set/unset
        const message: string = (failedReason && this.props.thread.comments[0].content) || (nowSet && CodeReviewAutoCompleteSet) || CodeReviewAutoCompleteCleared;

        return (
            <ActivityCardSubduedTemplate createdDate={this.props.thread.publishedDate} isNew={this.props.isNew}>
                {failedReason && message}
                {!failedReason &&
                    <FormattedComponent format={message}>
                        <InlineIdentity.Component identity={updater} tfsContext={this.props.tfsContext} />
                    </FormattedComponent>}
            </ActivityCardSubduedTemplate>
        );
    }
}
