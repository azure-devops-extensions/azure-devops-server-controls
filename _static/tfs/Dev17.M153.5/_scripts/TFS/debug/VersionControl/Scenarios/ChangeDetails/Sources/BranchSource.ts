import * as Q from "q";
import { BranchStats } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { CommitDiffSummaryControlFailedToGetCommits } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitQueryCommitsCriteria, GitVersionDescriptor, GitVersionType, GitVersionOptions } from "TFS/VersionControl/Contracts";
import { GitCommitSearchResults } from "VersionControl/Scripts/TFS.VersionControl.WebApi";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as Utils_String from "VSS/Utils/String";

/**
 * A source of data for branch information related to a commit.
 */
export class BranchSource {
    constructor(private _repositoryContext: RepositoryContext) {
    }

    /**
     * Fetches branch related data for a commit and returns branch stats.
     */
    public getCommitInBranch(branch: string, commitId: string): IPromise<BranchStats> {
        const deferred = Q.defer<BranchStats>();
        const gitRepoContext = <GitRepositoryContext>this._repositoryContext;

        const searchCriteria = <GitQueryCommitsCriteria>{
            $top: 1,
            itemVersion: <GitVersionDescriptor>{
                version: branch,
                versionType: GitVersionType.Branch,
                versionOptions: GitVersionOptions.None
            },
            compareVersion: <GitVersionDescriptor>{
                version: commitId,
                versionType: GitVersionType.Commit,
                versionOptions: GitVersionOptions.None
            }
        };

        gitRepoContext.getGitClient().beginGetCommits(this._repositoryContext,
            searchCriteria,
            (result: GitCommitSearchResults) => {
                // Contains list of commits(restricted to only top 1 commit) between the given commit id and common ancestor
                // of commit id and given branch. If there is no commit in the list, the branch contains that commit.
                const isCommitInBranch = result.commits.length === 0;
                if (isCommitInBranch) {
                    const versionString = new GitBranchVersionSpec(branch).toVersionString();
                    const branchUrl = VersionControlUrls.getExplorerUrl(this._repositoryContext, null, null, { version: versionString });

                    deferred.resolve({ name: branch, url: branchUrl } as BranchStats);
                }
                deferred.resolve(<BranchStats>{});
            },
            (error: Error) => {
                deferred.reject(Utils_String.format(CommitDiffSummaryControlFailedToGetCommits, (error ? error.message || "" : "")));
            });

        return deferred.promise;
    }
}
