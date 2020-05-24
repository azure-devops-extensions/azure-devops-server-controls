import React = require("react");

import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import {ReviewerUtils, PullRequestVoteStatus} from "VersionControl/Scripts/Utils/ReviewerUtils";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { IdentityRef } from "VSS/WebApi/Contracts";

// Presentational components
import {ActivityCardSubduedTemplate} from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTemplate";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";
import InlineIdentity = require("Presentation/Scripts/TFS/Components/InlineIdentity");

export interface IPRCreatedCardProps extends React.ClassAttributes<any> {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    thread: DiscussionCommon.DiscussionThread;
    isNew?: boolean;
}

export class Component extends React.Component<IPRCreatedCardProps, {}> {
    public render(): JSX.Element {
        const voter: IdentityRef = ReviewerUtils.getIdentityRef(
            this.props.thread, 
            CodeReviewDiscussionIdentityConstants.CodeReviewVotedByIdentity,
            CodeReviewDiscussionConstants.CodeReviewVotedByTfId,
            CodeReviewDiscussionConstants.CodeReviewVotedByDisplayName);

        const initiator: IdentityRef = ReviewerUtils.getIdentityRef(
            this.props.thread, 
            CodeReviewDiscussionIdentityConstants.CodeReviewVotedByInitiatorIdentity,
            CodeReviewDiscussionConstants.CodeReviewVotedByInitiatorTfId,
            CodeReviewDiscussionConstants.CodeReviewVotedByInitiatorDisplayName);
            
        const voteResult: number = parseInt(ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewVoteResult, "0"), 10);
        const voteReason: string = ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewVoteReason);

        let content: React.ReactNode;

        if (!initiator || Utils_String.ignoreCaseComparer(initiator.id, voter.id) === 0) {
            const voteTextFmt = this._getSelfVoteText(voteResult);

            content = (
                <FormattedComponent format={voteTextFmt} className="vote-text">
                    <InlineIdentity.Component identity={voter} tfsContext={this.props.tfsContext} />
                </FormattedComponent>
            );
        }
        else {
            content = (
                <FormattedComponent
                    className="vote-text"
                    format={VCResources.PullRequest_ActivityFeed_VoteResetByOtherUser}
                >
                    <InlineIdentity.Component identity={voter} tfsContext={this.props.tfsContext} />
                    <InlineIdentity.Component identity={initiator} tfsContext={this.props.tfsContext} />
                </FormattedComponent>
            );
        }

        return (
            <ActivityCardSubduedTemplate createdDate={this.props.thread.publishedDate} isNew={this.props.isNew}>
                <i className={this._iconClassForVote(voteResult)}></i>
                {content}
            </ActivityCardSubduedTemplate>
        );
    }

    shouldComponentUpdate(nextProps: IPRCreatedCardProps, nextState: {}): boolean {
        if (this.props.thread !== nextProps.thread ||
            this.props.isNew !== nextProps.isNew) {
            return true
        }
        return false;
    }

    private _iconClassForVote(vote: PullRequestVoteStatus): string {

        let iconClass: string = "";
        switch (vote) {
            case PullRequestVoteStatus.APPROVE:
                iconClass = "vote-action-icon bowtie-icon bowtie-status-success";
                break;
            case PullRequestVoteStatus.APPROVE_WITH_COMMENT:
                iconClass = "vote-action-icon bowtie-icon bowtie-status-success";
                break;
            case PullRequestVoteStatus.NONE:
                iconClass = "vote-action-icon bowtie-icon bowtie-status-waiting bowtie-status-waiting-response";
                break;
            case PullRequestVoteStatus.NOT_READY:
                iconClass = "vote-action-icon bowtie-icon bowtie-status-waiting-fill";
                break;
            case PullRequestVoteStatus.REJECT:
                iconClass = "vote-action-icon bowtie-icon bowtie-status-failure";
                break;
        }

        return iconClass;
    }

    private _getSelfVoteText(voteStatus: PullRequestVoteStatus): string {
        switch (voteStatus) {
            case PullRequestVoteStatus.APPROVE: return VCResources.PullRequest_ActivityFeed_VoteApprove;
            case PullRequestVoteStatus.APPROVE_WITH_COMMENT: return VCResources.PullRequest_ActivityFeed_VoteApproveWithComment;
            case PullRequestVoteStatus.NONE: return VCResources.PullRequest_ActivityFeed_VoteReset;
            case PullRequestVoteStatus.NOT_READY: return VCResources.PullRequest_ActivityFeed_VoteNotReady;
            case PullRequestVoteStatus.REJECT: return VCResources.PullRequest_ActivityFeed_VoteReject;
            default: return VCResources.PullRequest_ActivityFeed_VoteNoResponse;
        }
    }
}
