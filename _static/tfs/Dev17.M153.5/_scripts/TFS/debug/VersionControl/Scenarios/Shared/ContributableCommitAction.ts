import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { CommonCommitActionMenuProps } from "Scenarios/ChangeDetails/Components/CommitActionMenu";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface ICommitForContributedAction {
    commitId: string;
    comment: string;
    commentTruncated: boolean;
    repositoryId: string;
}

/**
 * Parameters passed into contributed actions applicable to commits.
 * @param {string} serviceBaseUrl: The base Url for the organization
 * @param {ICommitForContributedAction} commit: The details of the commit
 * @param {string} path: The path (if any) in context while exploring the current commit.
 */
export interface IContributableCommitActionParams {
    serviceBaseUrl: string;
    commit: ICommitForContributedAction;
    path?: string;
}

export function getContributableCommitActionContext(
    repoContext: RepositoryContext,
    commitProps: CommonCommitActionMenuProps,
    path?: string) : IContributableCommitActionParams {

        const tfsContext = repoContext.getTfsContext();
        return { 
            serviceBaseUrl: tfsContext.getHostUrl() + tfsContext.getServiceHostUrl(),
            commit: getCommitFromProps(repoContext, commitProps),
            path: path };
}

function getCommitFromProps( 
    repoContext: RepositoryContext,
    commitProps: CommonCommitActionMenuProps) : ICommitForContributedAction {
        return {
            commitId: commitProps.commitId.full,
            comment: commitProps.comment,
            // when the commit has NOT been truncated, commitProps.commentTruncated is undefined, so force a value
            commentTruncated: commitProps.commentTruncated || false, 
            repositoryId: repoContext.getRepositoryId() };
}
