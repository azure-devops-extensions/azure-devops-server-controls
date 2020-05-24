import * as Q from "q";
import { GitCommit, ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitCommitVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export class GitCommitSource {

    constructor(private _repositoryContext: GitRepositoryContext) {
    }

    /**
     * This calls "change" REST API for each of the commitIds. This is used to get metadata for parent commits which is mostly two as octopus merges are rare.
     * This method should not be used with more number of commits. In that case, we should batch them.
     * @param commitIds full SHA id of each commit.
     */
    public fetchGitCommitDetails(commitIds: string[]): IPromise<ChangeList[]> {
        const promises = commitIds.map(commitId => {
            return this._repositoryContext.getClient().beginGetChangeListPromise(this._repositoryContext, new GitCommitVersionSpec(commitId).toVersionString(), 0);
        });

        return Q.all<ChangeList>(promises);
    }

    /**
     * Get change list using rest client
     * @param baseVersion base versionSpec
     * @param targetVersion target versionSpec
     * @param maxChangesToInclude maximum number fo changes to fetch
     * @param skipCount number of changes to skip for fetching
     */
    public getCommitFileDiffAsync(
        baseVersion: string,
        targetVersion: string,
        maxChangesToInclude: number,
        skipCount: number
    ): IPromise<GitCommit> {

        const deferred = Q.defer<GitCommit>();

        this._repositoryContext.getGitClient().beginGetCommitFileDiff(this._repositoryContext,
            baseVersion,
            targetVersion,
            maxChangesToInclude,
            skipCount,
            (changeList: GitCommit) => {
                deferred.resolve(changeList);
            },
            (error: Error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }
}
