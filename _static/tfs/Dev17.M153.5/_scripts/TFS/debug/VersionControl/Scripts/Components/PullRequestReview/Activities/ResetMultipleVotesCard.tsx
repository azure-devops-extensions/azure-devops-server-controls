import React = require("react");

import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import { ReviewerUtils, PullRequestVoteStatus } from "VersionControl/Scripts/Utils/ReviewerUtils";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { IdentityRef } from "VSS/WebApi/Contracts";

// Presentational components
import { ActivityCardSubduedTemplate } from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTemplate";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";
import InlineIdentity = require("Presentation/Scripts/TFS/Components/InlineIdentity");

export interface IResetMultipleVotesCardProps {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    thread: DiscussionCommon.DiscussionThread;
    isNew?: boolean;
}

export class ResetMultipleVotesCard extends React.Component<IResetMultipleVotesCardProps, {}> {
    
    public shouldComponentUpdate(nextProps: IResetMultipleVotesCardProps, nextState: {}): boolean {
        return (
            this.props.thread !== nextProps.thread
            || this.props.isNew !== nextProps.isNew
        );
    }

    public render(): JSX.Element {
        const initiator: IdentityRef = ReviewerUtils.getIdentityRef(
            this.props.thread, 
            CodeReviewDiscussionIdentityConstants.CodeReviewResetMultipleVotesInitiatorIdentity,
            CodeReviewDiscussionConstants.CodeReviewResetMultipleVotesInitiatorTfId,
            CodeReviewDiscussionConstants.CodeReviewResetMultipleVotesInitiatorDisplayName);

        const hasInitiator: boolean = Boolean(initiator && initiator.id && initiator.displayName);

        const numVotesReset: number = parseInt(ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewResetMultipleVotesNumVoters, "0"), 10);
        const reason: string = ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewResetMultipleVotesReason);

        const initiatorComponent: React.ReactNode = hasInitiator ?
            <InlineIdentity.Component identity={initiator} tfsContext={this.props.tfsContext} key="initiator" />
            : null;

        const identitiesListComponent = <InlineIdentitiesListWithOverflow thread={this.props.thread} tfsContext={this.props.tfsContext} key="overflow" />;

        const format = this.getResetVoteStringFormat(hasInitiator, Boolean(reason), numVotesReset);

        // format arguments should include only not null components
        const formatArgs = [initiatorComponent, identitiesListComponent, reason].filter(c => !!c);

        return (
            <ActivityCardSubduedTemplate createdDate={this.props.thread.publishedDate} isNew={this.props.isNew}>
                <i className="vote-action-icon bowtie-icon bowtie-status-waiting"></i>
                <FormattedComponent format={format} className="vote-text">
                    {formatArgs}
                </FormattedComponent>
            </ActivityCardSubduedTemplate>
        );
    }

    private getResetVoteStringFormat(hasInitiator: boolean, hasReason: boolean, resetCount: number): string {
        if (hasInitiator) {
            return hasReason ? 
                VCResources.PullRequest_ActivityFeed_ResetMultipleVotesWithInitiatorWithReason  // e.g. "{0} reset the vote of {1}: {2}" 
                : VCResources.PullRequest_ActivityFeed_ResetMultipleVotesWithInitiatorNoReason; // e.g. "{0} reset the vote of {1}"
        }
        else {
            if (resetCount > 1) {
                return hasReason ? 
                    VCResources.PullRequest_ActivityFeed_ResetMultipleVotesNoInitiatorMultipleVotesWithReason  // e.g. "Vote of {0} were reset: {1}"
                    : VCResources.PullRequest_ActivityFeed_ResetMultipleVotesNoInitiatorMultipleVotesNoReason; // e.g. "Vote of {0} were reset"
            }
            return hasReason ?
                VCResources.PullRequest_ActivityFeed_ResetMultipleVotesNoInitiatorSingleVoteWithReason  // e.g. "Vote of {0} was reset: {1}"
                : VCResources.PullRequest_ActivityFeed_ResetMultipleVotesNoInitiatorSingleVoteNoReason; // e.g. "Vote of {0} was reset"
        }
    }
}

export interface InlineIdentitiesListWithOverflowProps {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    thread: DiscussionCommon.DiscussionThread;
}

export class InlineIdentitiesListWithOverflow extends React.PureComponent<InlineIdentitiesListWithOverflowProps, {}> {

    public render(): JSX.Element {
        const maxReviewersToShow = 3;

        const exampleReviewerIdentities: IdentityRef[] = ReviewerUtils.getExampleIdentities(
            this.props.thread,
            CodeReviewDiscussionIdentityConstants.CodeReviewResetMultipleVotesExampleVoterIdentities,
            CodeReviewDiscussionConstants.CodeReviewResetMultipleVotesExampleVoterIds,
            CodeReviewDiscussionConstants.CodeReviewResetMultipleVotesExampleVoterDisplayNames);
        const numVotesReset: number = parseInt(ReviewerUtils.getPropertyValue(this.props.thread, CodeReviewDiscussionConstants.CodeReviewResetMultipleVotesNumVoters, "0"), 10);

        const exampleReviewersCount = exampleReviewerIdentities.length;
        const resetIdentities: React.ReactNode[] = [];
        for (var i = 0; i < Math.min(maxReviewersToShow, exampleReviewersCount); ++i) {
            const exampleReviewerIdentity: IdentityRef = exampleReviewerIdentities[i];
            if (exampleReviewerIdentity) {
                resetIdentities.push(
                    <InlineIdentity.Component
                        identity={exampleReviewerIdentity}
                        tfsContext={this.props.tfsContext}
                        key={`reviewer-${i}`} />
                );
            }
        }

        const displayIdentities: React.ReactNode[] = (exampleReviewersCount > maxReviewersToShow) ? resetIdentities.slice(0, maxReviewersToShow - 1) : resetIdentities;
        const overflow = (exampleReviewersCount > maxReviewersToShow) ? numVotesReset - (maxReviewersToShow - 1) : 0;

        const identitiesFormat = this.getIdentitiesStringFormat(exampleReviewersCount);
        if (!identitiesFormat) {
            return null;
        }

        if (overflow > 0) {
            displayIdentities.push(overflow);
        }

        return <FormattedComponent format={identitiesFormat} className="inline-identities">
            {displayIdentities}
        </FormattedComponent>;
    }

    private getIdentitiesStringFormat(resetCount: number): string {
        if (resetCount <= 0) {
            return null;
        }

        switch (resetCount) {
            case 1: return VCResources.PullRequest_ActivityFeed_ResetMultipleVotesOneVote;             // e.g. "Nick"
            case 2: return VCResources.PullRequest_ActivityFeed_ResetMultipleVotesTwoVotes;            // e.g. "Nick and James"
            case 3: return VCResources.PullRequest_ActivityFeed_ResetMultipleVotesThreeVotes;          // e.g. "Nick, James, and Peter"
            default: return VCResources.PullRequest_ActivityFeed_ResetMultipleVotesMoreThanThreeVotes; // e.g. "Nick, James, and 3 others"
        }
    }
}