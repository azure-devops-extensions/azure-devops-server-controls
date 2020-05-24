import React = require("react");
import CommitIdHelper = require("VersionControl/Scripts/CommitIdHelper");
import Utils_String = require("VSS/Utils/String");
import VCContracts = require("TFS/VersionControl/Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Iteration = require("VersionControl/Scripts/Components/PullRequestReview/Activities/IterationCard");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

export interface IUpdateProps extends React.Props<void> {
    iterations: VCContracts.GitPullRequestIteration[];
    targetRepositoryContext: GitRepositoryContext;
    sourceRepositoryContext: GitRepositoryContext;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    sourceBranchName: string;
    targetBranchName: string;
    pullRequestId: number;
    lastVisit?: Date;
}

export class IterationsList extends React.Component<IUpdateProps, {}> {
    public render(): JSX.Element {
        const iterationCards = [];

        for (let i = this.props.iterations.length - 1; i >= 0; i--) {
            const currentIteration: VCContracts.GitPullRequestIteration = this.props.iterations[i];
            // If this is a new PR or a rebase we need to show a new base
            let showNewBase = ((currentIteration.reason & VCContracts.IterationReason.Create) !== 0 || (currentIteration.reason & VCContracts.IterationReason.Rebase) !== 0);
            // Alternatively, if the common base ref has changed (for example, target was merged into source), show a new base
            showNewBase = showNewBase ||  (i > 0 && currentIteration.commonRefCommit.commitId !== this.props.iterations[i-1].commonRefCommit.commitId);

            // if we received a last visit date, see if this card is new based on its created date (and whether
            // or not the iteration was pushed by the current user)
            const authorIsNotCurrentUser: boolean =
                (this.props.tfsContext.currentIdentity.id !== currentIteration.author.id);

            const cardIsNew: boolean =
                authorIsNotCurrentUser && !!this.props.lastVisit && (this.props.lastVisit < currentIteration.createdDate);
            const timeLineIconClass = cardIsNew ? " new" : "";

            iterationCards.push(<Iteration.Component
                key={"updateCard_" + currentIteration.id}
                iteration={currentIteration}
                tfsContext={this.props.tfsContext}
                sourceBranchName={this.props.sourceBranchName}
                targetBranchName={this.props.targetBranchName}
                targetRepositoryContext={this.props.targetRepositoryContext}
                sourceRepositoryContext={this.props.sourceRepositoryContext}
                pullRequestId={this.props.pullRequestId}
                showNewBase={showNewBase}
                isNew={cardIsNew}
                headingLevel={2}
                headerIdSuffix={"updates"}
            />);

            if (showNewBase) {
                iterationCards.push(
                    <div key={"updateCardBase_" + currentIteration.id} className={"iteration-new-base-indicator vc-pullrequest-activity-box subdued"}>
                        <div className="timeline-break">
                            <div className={"timeline-icon-line" + timeLineIconClass} />
                            <i className={"timeline-icon-dot" + timeLineIconClass}><div className="visually-hidden">{VCResources.PullRequest_RecentUpdate}</div></i>
                        </div>
                        <span>{Utils_String.format(VCResources.PullRequest_UpdatesTab_NewBaseLabel, CommitIdHelper.getShortCommitId(currentIteration.commonRefCommit.commitId)) }</span>
                    </div>
                );
            }
        }

        return <div>
            {iterationCards}
        </div>;
    }
}