import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";

import * as InlineIdentity from "Presentation/Scripts/TFS/Components/InlineIdentity";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as VCContracts from "TFS/VersionControl/Contracts";
import { IterationLink } from "VersionControl/Scenarios/PullRequestDetail/Components/IterationLink";
import { ActivityCardTimestamp } from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTimestamp";
import * as ActivityCardContainer from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityFeedBox";
import { CommitsList } from "VersionControl/Scripts/Components/PullRequestReview/CommitsList";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Format from "VersionControl/Scripts/Utils/Format";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as Navigation_Services from "VSS/Navigation/Services";
import { getRefFriendlyName } from "VersionControl/Scripts/GitRefUtility";
import { Link } from "OfficeFabric/Link";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";


export interface Props extends React.ClassAttributes<any> {
    sourceRepositoryContext: RepositoryContext;
    targetRepositoryContext: RepositoryContext;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    iteration: VCContracts.GitPullRequestIteration;
    sourceBranchName: string;
    targetBranchName: string;
    pullRequestId: number;
    showNewBase?: boolean;
    isNew?: boolean;
    headerIdSuffix?: string;
    headingLevel?: number;
}

export class Component extends React.Component<Props, {}> {
    private static MAX_COMMITS_TO_SHOW = 10;

    public render(): JSX.Element {
        const commitsToShow = this.props.iteration.commits;
        let header = null;
        if (this.props.iteration.reason & VCContracts.IterationReason.Retarget) {
            header = this._retargetHeader();
        }
        else {
            let headerFormatString = commitsToShow.length === 1 ? VCResources.PullRequest_ActivityFeed_Iteration_Singular_Title : VCResources.PullRequest_ActivityFeed_Iteration_Title;
            if (this.props.iteration.reason & VCContracts.IterationReason.ForcePush) {
                const headerFormatString = commitsToShow.length === 1 ? VCResources.PullRequest_ActivityFeed_ForcePush_Singular_Title : VCResources.PullRequest_activityFeed_ForcePush_Title;
            }

            header =
            <Format.FormattedComponent format = {headerFormatString}>
                <InlineIdentity.Component
                    identity = {this.props.iteration.author}
                    tfsContext = {this.props.tfsContext} />
                {commitsToShow.length.toString()}
                <IterationLink iterationId={this.props.iteration.id} repoContext={this.props.targetRepositoryContext} pullRequestId={this.props.pullRequestId} />
            </Format.FormattedComponent>;
        }
        
        let footer = null;
        if (commitsToShow.length > Component.MAX_COMMITS_TO_SHOW) {
            // the first "iteration" of a pull request is comprised of all the commits
            // from the common commit with the target ref
            // up to the tip source commit at the time the pull request was created
            // so the footer will link to the commit history of the tip source commit
            let pushURL = VersionControlUrls.getCommitHistoryUrl(this.props.targetRepositoryContext as GitRepositoryContext, this.props.iteration.sourceRefCommit.commitId);
            let footerLabel = VCResources.PullRequest_IterationTruncated_ViewCommitHistory;
            if (this.props.iteration.push) {
                // pull request iterations created after the first iteration directly correlate with new pushes to the source branch
                // so the footer will link to the push commits directly
                pushURL = VersionControlUrls.getPushCommitsUrl(this.props.targetRepositoryContext as GitRepositoryContext, this.props.iteration.push.pushId);
                footerLabel = VCResources.PullRequest_IterationTruncated_ViewFullIteration;
            }
            footer = <div className="vc-pullRequest-iterations-card-footer">
                <a href={pushURL}>{footerLabel}</a>
            </div>;
        }

        const headerIdSuffix = this.props.headerIdSuffix || "overview";
        const headerId = "activity-card-header-iteration-" + this.props.iteration.id + "-" + headerIdSuffix;
        const headingLevel = this.props.headingLevel || 3;

        return <ActivityCardContainer.Component
            cssClass={"overview-iteration" + (this.props.showNewBase ? " new-base-iteration" : "")}
            useSubduedStyle={false}
            timelineBadgeNumber={this.props.iteration.id}
            isNew={this.props.isNew}
            ariaLabelledBy={headerId}>
            <div id={headerId} className="vc-pullrequest-activity-header" role="heading" aria-level={headingLevel}>
                {header}
                <ActivityCardTimestamp date={this.props.iteration.createdDate} />
            </div>
            { commitsToShow.length > 0 &&
             <div className="vc-pullrequest-activity-body">
                <CommitsList
                    commits={commitsToShow}
                    sourceCommitId={this.props.iteration.sourceRefCommit.commitId}
                    repositoryContext={this.props.targetRepositoryContext}
                    tfsContext={this.props.tfsContext}
                    maxToShow={Component.MAX_COMMITS_TO_SHOW}
                    />
                {footer}
            </div> }
        </ActivityCardContainer.Component>
    }

    public shouldComponentUpdate(nextProps: Props): boolean {
        if (this.props.tfsContext !== nextProps.tfsContext
            || this.props.targetRepositoryContext !== nextProps.targetRepositoryContext
            || this.props.sourceRepositoryContext !== nextProps.sourceRepositoryContext
            || this.props.iteration !== nextProps.iteration
            || this.props.sourceBranchName !== nextProps.sourceBranchName
            || this.props.isNew !== nextProps.isNew
            || this.props.showNewBase !== nextProps.showNewBase) {
            return true;
        }

        return false;
    }

    private _retargetHeader(): JSX.Element {
        const haveOldBranch = Boolean(this.props.iteration.oldTargetRefName);
        const headerFormatString = haveOldBranch ? VCResources.PullRequest_ActivityFeed_TargetRenameIterationWithOldBranch_Title : VCResources.PullRequest_ActivityFeed_TargetRenameIteration_Title;
        const newBranchName = getRefFriendlyName(this.props.iteration.newTargetRefName);
        const oldBranchName = haveOldBranch ? getRefFriendlyName(this.props.iteration.oldTargetRefName) : null;
        const newBranchUrl = VersionControlUrls.getExplorerUrl(this.props.targetRepositoryContext,
            null, // path
            null, // action
            { version: new GitBranchVersionSpec(newBranchName).toVersionString() },
            { project: this.props.targetRepositoryContext.getRepository().project.name});
        const oldBranchUrl = haveOldBranch ? VersionControlUrls.getExplorerUrl(this.props.targetRepositoryContext,
            null, // path
            null, // action
            { version: new GitBranchVersionSpec(oldBranchName).toVersionString() },
            { project: this.props.targetRepositoryContext.getRepository().project.name}) : null;
    
        let childElements = [];
        childElements.push(<InlineIdentity.Component key={"identity"} identity = {this.props.iteration.author} tfsContext = {this.props.tfsContext} />);
        if (haveOldBranch) {
            childElements.push(<span key={"oldBranchIcon"} className={"bowtie-icon bowtie-tfvc-branch"} role="img" aria-label={VCResources.RelatedArtifactRepositoryTitle}/>);
            childElements.push(<Link key={"oldBranchLink"} className={"old-branch-link"} href={oldBranchUrl}>{oldBranchName}</Link>);
        }
        childElements.push(<span key={"newBranchIcon"} className={"bowtie-icon bowtie-tfvc-branch"} role="img" aria-label={VCResources.RelatedArtifactRepositoryTitle}/>);
        childElements.push(<Link key={"newBranchLink"} href={newBranchUrl}>{newBranchName}</Link>);
        childElements.push(<IterationLink key={"updateLink"} iterationId={this.props.iteration.id} repoContext={this.props.targetRepositoryContext} pullRequestId={this.props.pullRequestId} />);
            
        return <Format.FormattedComponent format = {headerFormatString}>
                {childElements}
            </Format.FormattedComponent>;
    }
}