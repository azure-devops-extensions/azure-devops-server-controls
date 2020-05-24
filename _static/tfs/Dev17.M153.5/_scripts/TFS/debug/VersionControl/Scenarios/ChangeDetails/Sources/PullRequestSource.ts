import * as Q from "q";
import { CommitDiffSummaryControlFailedToGetCommits } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { GitPullRequest, GitPullRequestQuery, GitPullRequestQueryType, GitVersionType, GitVersionOptions } from "TFS/VersionControl/Contracts";
import { GitHistoryDataProviderArguments } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import * as GitCommitExtendedContracts from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { VssConnection } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

/**
 * A source of data for pull request information related to a commit.
 */
export class PullRequestSource {
    constructor(
        private _repositoryContext: RepositoryContext,
        private _httpClient?: GitHttpClient,
        private _historySource?: HistoryCommitsSource) {
    }

    /**
     * Fetches pull pequest data with respect to a commit and returns associated pull request data.
     */
    public getPullRequests(commitId: string): IPromise<GitPullRequest[]> {
        const deferred = Q.defer<GitPullRequest[]>();

        this._getPullRequestQuery(commitId).then((queryResults: GitPullRequestQuery) => {
            // This commit could either be a merge commit (via squash) or a regular commit
            // If its a merge commit, then we want to add the pull request that created it also to list of PRs we want to show
            // Ideally there should be either one or zero PRs in mergePrArray as any given commit could be created only once at max ;)

            const mergePrArray = (queryResults.results[0] || {})[commitId];
            const commitPrArray = (queryResults.results[1] || {})[commitId];

            if (mergePrArray && mergePrArray.length > 0) {
                mergePrArray.sort((pr1, pr2) => {
                    return pr2.creationDate.valueOf() - pr1.creationDate.valueOf();
                });
            }

            if (commitPrArray && commitPrArray.length > 0) {
                commitPrArray.sort((pr1, pr2) => {
                    return pr2.creationDate.valueOf() - pr1.creationDate.valueOf();
                });
            }
            let allPullRequests: GitPullRequest[];

            if (mergePrArray && mergePrArray.length > 0) {
                if (commitPrArray && commitPrArray.length > 0) {
                    allPullRequests = mergePrArray.concat(commitPrArray);
                } else {
                    allPullRequests = mergePrArray;
                }
            } else if (commitPrArray && commitPrArray.length > 0) {
                allPullRequests = commitPrArray;
            }

            if (allPullRequests && allPullRequests.length > 0) {
                deferred.resolve(allPullRequests);
            } else {
                deferred.resolve({} as GitPullRequest[]);
            }
        }, (error: Error) => {
            deferred.reject(Utils_String.format(CommitDiffSummaryControlFailedToGetCommits, (error ? error.message || "" : "")));
        });

        return deferred.promise;
    }

    public fetchDefaultBranchPullRequest(commitId: string): IPromise<GitPullRequest> {
        const defaultBranch: string = this._repositoryContext.getRepository().defaultBranch;
        let deferred = Q.defer<GitPullRequest>();
        const dataProviderArgs: GitHistoryDataProviderArguments = {
            gitCommitLookupArguments: null,
            gitHistoryQueryArguments: null,
            gitArtifactsQueryArguments: {
                fetchBuildStatuses: false,
                fetchPullRequests: true,
                fetchTags: false,
                startFromVersion: {
                    versionType: GitVersionType.Branch,
                    version: GitRefUtility.getRefFriendlyName(defaultBranch),
                    versionOptions: GitVersionOptions.None
                },
                commitIds: [commitId]
            },
            gitGraphQueryArguments: null,
        }
        this.historySource.getCommitsFromDataProvider(dataProviderArgs).then(
            (fetchedData: GitCommitExtendedContracts.GitCommitSearchResultsExtended) => {
                const defaultBranchPullRequest: GitPullRequest = (fetchedData.pullRequests && fetchedData.pullRequests[commitId]) ? fetchedData.pullRequests[commitId] : undefined;
                deferred.resolve(defaultBranchPullRequest);
            },
            (error: Error) => {
                deferred.reject(error);
            });
        return deferred.promise;
    }

    private get httpClient(): GitHttpClient {
        if (!this._httpClient) {
            const connection = new VssConnection(this._repositoryContext.getTfsContext().contextData);
            this._httpClient = connection.getHttpClient(GitHttpClient);
        }
        return this._httpClient;

    }

    private get historySource(): HistoryCommitsSource {
        if (!this._historySource) {
            this._historySource = new HistoryCommitsSource(this._repositoryContext as GitRepositoryContext);
        }
        return this._historySource;
    }

    private _getPullRequestQuery(commitId: string): IPromise<GitPullRequestQuery> {
        const search = <GitPullRequestQuery>{
            queries: [{
                type: GitPullRequestQueryType.LastMergeCommit,
                items: [commitId]
            }, {
                type: GitPullRequestQueryType.Commit,
                items: [commitId]
            }]
        };

        return this.httpClient.getPullRequestQuery(search, this._repositoryContext.getRepositoryId(), this._repositoryContext.getProjectId());
    }
}
