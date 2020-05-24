import React = require("react");

import Activity = require("VersionControl/Scripts/Components/PullRequestReview/Activities/Activity");
import RequiredReviewerPolicyCard = require("VersionControl/Scripts/Components/PullRequestReview/Activities/RequiredReviewerPolicyCard");
import { PullRequestPolicyTypeIds } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import Utils_Core = require("VSS/Utils/Core");
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { ReviewerUtils } from "VersionControl/Scripts/Utils/ReviewerUtils";

export class Component extends Activity.Component<Activity.IThreadActivityProps, Activity.IActivityState> {
    public render(): JSX.Element {
        const policyType = this.getThreadPropertyValue(CodeReviewDiscussionConstants.CodeReviewPolicyType);
        if (policyType && policyType == PullRequestPolicyTypeIds.RequiredReviewersPolicy) {
            const numFiles = parseInt(this.getThreadPropertyValue(CodeReviewDiscussionConstants.CodeReviewRequiredReviewerNumFilesThatTriggered, "0"), 10);
            const exampleFilePath = this.getThreadPropertyValue(CodeReviewDiscussionConstants.CodeReviewRequiredReviewerExamplePathThatTriggered);

            const exampleIdentities : IdentityRef[] = ReviewerUtils.getExampleIdentities(
                this.props.thread,
                CodeReviewDiscussionIdentityConstants.CodeReviewRequiredReviewerExampleReviewerIdentities,
                CodeReviewDiscussionConstants.CodeReviewRequiredReviewerExampleReviewerId,
                CodeReviewDiscussionConstants.CodeReviewRequiredReviewerExampleReviewerDisplayName);
                
            let numReviewers = parseInt(this.getThreadPropertyValue(CodeReviewDiscussionConstants.CodeReviewRequiredReviewerNumReviewers, "0"), 10);
            numReviewers += exampleIdentities ? exampleIdentities.length : 0;

            const isRequired = this.getThreadPropertyValue(CodeReviewDiscussionConstants.CodeReviewRequiredReviewerIsRequired, "True") !== "False";

            const message = this.getThreadPropertyValue(CodeReviewDiscussionConstants.CodeReviewRequiredReviewerUserConfiguredMessage, null);

            return <RequiredReviewerPolicyCard.Component
                identities={exampleIdentities}
                numReviewers={numReviewers}
                filePath={exampleFilePath}
                numFiles={numFiles}
                areReviewersRequired={isRequired}
                publishDate={this.props.thread.publishedDate}
                tfsContext={this.props.tfsContext}
                isNew={this.props.isNew}
                message={message} />
        }
        return null;
    }

    public shouldComponentUpdate(nextProps: Activity.IThreadActivityProps, nextState: Activity.IActivityState): boolean {
        if (this.props.tfsContext !== nextProps.tfsContext
            || this.props.thread !== nextProps.thread
            || this.props.isNew !== nextProps.isNew
            || this.state !== nextState) {
            return true;
        }

        return false;
    }

    protected _getTimelineIconClass() {
        return "bowtie-policy";
    }
}