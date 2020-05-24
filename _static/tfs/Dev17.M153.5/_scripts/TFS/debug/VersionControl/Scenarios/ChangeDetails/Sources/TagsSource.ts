import * as Q from "q";
import { GitHistoryDataProviderArguments } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import * as GitCommitExtendedContracts from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export class TagsSource {
    private _historySource: HistoryCommitsSource;
    constructor(private _repositoryContext: GitRepositoryContext) {
        this._historySource = new HistoryCommitsSource(this._repositoryContext);
    }

    public fetchTags(commitId: string): IPromise<GitCommitExtendedContracts.GitTag[]> {
        const deferred = Q.defer<GitCommitExtendedContracts.GitTag[]>();
        const dataProviderArgs: GitHistoryDataProviderArguments = {
            gitCommitLookupArguments: null,
            gitHistoryQueryArguments: null,
            gitArtifactsQueryArguments: {
                fetchBuildStatuses: false,
                fetchPullRequests: false,
                fetchTags: true,
                startFromVersion: null,
                commitIds: [commitId]
            },
            gitGraphQueryArguments: null,
        };

        this._historySource.getCommitsFromDataProvider(dataProviderArgs).then(
            (fetchedData: GitCommitExtendedContracts.GitCommitSearchResultsExtended) => {
                const fetchedTags = (fetchedData.tags && fetchedData.tags[commitId]) ? fetchedData.tags[commitId] : [];
                deferred.resolve(fetchedTags);
            },
            (error: Error) => {
                deferred.reject(error);
            });
        return deferred.promise;
    }
}
