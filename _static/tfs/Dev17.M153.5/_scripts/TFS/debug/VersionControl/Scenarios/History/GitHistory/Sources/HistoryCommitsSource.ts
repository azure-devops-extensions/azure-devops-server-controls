import * as Q from "q";
import { WebPageDataService } from "VSS/Contributions/Services";
import { DataProviderQuery } from "VSS/Contributions/Contracts";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { ContractSerializer } from "VSS/Serialization";
import * as Performance from "VSS/Performance";
import * as VSS_Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { TypeInfo, GitStatus, GitQueryCommitsCriteria, ChangeListSearchCriteria } from "TFS/VersionControl/Contracts";
import { ChangeList, GitHistoryQueryResults, GitObjectType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import { GitCommitSearchResults } from "VersionControl/Scripts/TFS.VersionControl.WebApi";
import { convertArtifactUriToPublicUrl } from "VersionControl/Scripts/Utils/Build";
import { getPullRequestUrl } from "VersionControl/Scripts/VersionControlUrls";
import { GitHistoryDataProviderArguments } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import * as GitCommitExtendedContracts from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";

const historyDataProvider: string = "ms.vss-code-web.git-history-view-commits-data-provider";

/**
* Initialize the History Commits scenario.
*/
export interface IPageDataService {
    getPageData<T>(key: string, contractMetadata?: any);
}

export class HistoryCommitsSource {
    private _gitClient: GitClientService = null;
    private _webPageDataService: IPageDataService = VSS_Service.getService(WebPageDataService) as IPageDataService;
    private _perfScenarioManager = Performance.getScenarioManager() as Performance.IScenarioManager;
    private _initialized = false;
    private _contributionClient: ContributionsHttpClient = null;
    private _latestRequestKey: string = null;

    constructor(private repositoryContext: GitRepositoryContext) {
        this._gitClient = repositoryContext.getClient() as GitClientService;
    }

    public getCommitsFromJsonIsland(): GitCommitExtendedContracts.GitCommitSearchResultsExtended {
        const scenario = this._perfScenarioManager.startScenario("VersionControl", "HistoryCommitsDataProvider.getCommitsFromJsonIsland");
        const commitDetails: GitCommitExtendedContracts.GitCommitSearchResultsExtended =
            this._webPageDataService.getPageData<any>(historyDataProvider);
        this._getDeserializedCommits(commitDetails);
        scenario.end();
        return commitDetails;
    }

    public getCommitsFromDataProvider(gitDataProviderArguments: GitHistoryDataProviderArguments): IPromise<GitCommitExtendedContracts.GitCommitSearchResultsExtended> {
        const scenario = this._perfScenarioManager.startScenario("VersionControl", "HistoryCommitsDataProvider.getCommitHistoryFromDataProviderCall");
        const contributionsClient = this._getContributionClient();
        const deferred = Q.defer<GitCommitExtendedContracts.GitCommitSearchResultsExtended>();

        if (contributionsClient === null || this.repositoryContext === null) {
            deferred.resolve(null);
        }
        else {
            const query: DataProviderQuery = this._getDataProviderQuery(gitDataProviderArguments);
            const requestKey = (this._isArtifactCall(gitDataProviderArguments) ? null : Utils_String.generateUID());
            const projectId = this.repositoryContext.getProjectId();
            const scope = projectId && "project";
            this._latestRequestKey = requestKey;

            contributionsClient.queryDataProviders(query, scope, projectId).then<void>((contributionDataResult: DataProviderResult) => {
                scenario.end();
                this._getDataProvidersResult(contributionDataResult).then((commitSearchResults: GitCommitExtendedContracts.GitCommitSearchResultsExtended) => {
                    commitSearchResults.searchCancelled = !this._acceptResponse(requestKey);
                    deferred.resolve(commitSearchResults);
                }, (error: Error) => {
                    // Error is received from the server
                    deferred.reject(error);
                });
            }, (error: Error) => {
                scenario.end();
                // Error occurred suring fetch, network call or browser issue
                deferred.reject(error);
            });
        }
        return deferred.promise;
    }

    public getHistoryQueryResults(commitSearchResults: GitCommitSearchResults): GitHistoryQueryResults {
        return this._gitClient.getHistoryQueryResults(commitSearchResults);
    }

    public getChangeList(version: string): IPromise<ChangeList> {
        return Q.Promise(resolve =>
            this._gitClient.beginGetChangeList(this.repositoryContext, version, 0, resolve));
    }

    public convertArtifactUriToPublicUrl(statuses: GitStatus[]): GitStatus[] {
        return convertArtifactUriToPublicUrl(statuses, this.repositoryContext);
    }

    public getPullRequestUrl(pullRequestId: number): string {
        return getPullRequestUrl(this.repositoryContext, pullRequestId);
    }

    public getQueryCriteria(querySearchCriteria: ChangeListSearchCriteria): GitQueryCommitsCriteria {
        if (this.repositoryContext.getRepositoryType() === RepositoryType.Git) {
            return this._gitClient.getQueryCriteria(querySearchCriteria);
        }
    }

    /**
     * Overriding the values for testing purpose
     * @param pageDataService
     * @param contributionClient
     */
    public testSetDataProviderParameters(pageDataService: IPageDataService, contributionClient?: ContributionsHttpClient) {
        this._webPageDataService = pageDataService;
        this._contributionClient = contributionClient;

        //Reset Testing State
        this._initialized = false;
    }

    private _acceptResponse(queryRequestKey: string): boolean {
        // Artifact call
        if (queryRequestKey === null) {
            return true;
        }
        // One of history, showmore, showrename call.
        else if (queryRequestKey === this._latestRequestKey) {
            this._latestRequestKey = null;
            return true;
        }
        // One of history, showmore, showrename that is no longer valid.
        return false;
    }

    private _getDataProvidersResult(contributionDataResult: DataProviderResult): IPromise<GitCommitExtendedContracts.GitCommitSearchResultsExtended> {
        const pageData = contributionDataResult.data[historyDataProvider] || {};
        const deferred = Q.defer<GitCommitExtendedContracts.GitCommitSearchResultsExtended>();
        if (Object.keys(pageData).length > 0) {
            const commitSearchResults: GitCommitExtendedContracts.GitCommitSearchResultsExtended = <GitCommitExtendedContracts.GitCommitSearchResultsExtended>pageData;
            this._getDeserializedCommits(commitSearchResults);
            deferred.resolve(commitSearchResults);
        }
        else {
            const fetchError: Error = this._getFetchErrorIfAny(contributionDataResult);
            if (!!fetchError) {
                deferred.reject(fetchError);
            }
            else {
                // Empty state returned from server
                deferred.resolve(<GitCommitExtendedContracts.GitCommitSearchResultsExtended>{});
            }
        }
        return deferred.promise;
    }

    private _isArtifactCall(gitDataProviderArguments: GitHistoryDataProviderArguments): boolean {
        return (gitDataProviderArguments.gitArtifactsQueryArguments !== null);
    }

    private _getFetchErrorIfAny(contributionDataResult: DataProviderResult): Error {
        let fetchError: Error = null;
        const providersArray = contributionDataResult.resolvedProviders;
        if (!!providersArray) {
            $.each(providersArray, (index: number, provider: ResolvedDataProvider) => {
                if (!!provider.error) {
                    fetchError = new Error();
                    fetchError.message = provider.error;
                    return;
                }
            });
        }
        return fetchError;
    }

    private _getContributionClient(): ContributionsHttpClient {
        if (!this._contributionClient && this.repositoryContext) {
            this._contributionClient = ProjectCollection.getConnection(this.repositoryContext.getTfsContext()).getHttpClient(ContributionsHttpClient);
        }

        return this._contributionClient;
    }

    private _getDeserializedCommits(queryData: GitCommitExtendedContracts.GitCommitSearchResultsExtended): void {
        if (queryData) {
            if (queryData.commits) {
                queryData.commits = ContractSerializer.deserialize(queryData.commits, TypeInfo.GitCommitRef);
            }

            if (queryData.pullRequests) {
                queryData.pullRequests = ContractSerializer.deserialize(queryData.pullRequests, TypeInfo.GitPullRequest);
            }

            if (queryData.tags) {
                for (let key in queryData.tags) {
                    queryData.tags[key] = ContractSerializer.deserialize(queryData.tags[key], GitCommitExtendedContracts.TypeInfo.GitTag);
                }
            }

            if (queryData.resultsObjectType) {
                queryData.resultsObjectType = (<any>GitObjectType)[queryData.resultsObjectType];
            }

            if (queryData.graphRows) {
                queryData.graphRows.forEach((row, index) => {
                    row.commit = ContractSerializer.deserialize(row.commit, TypeInfo.GitCommitRef);
                })
            }
        }
    }

    private _getDataProviderQuery(searchCriteria: GitHistoryDataProviderArguments): DataProviderQuery {
        const query: DataProviderQuery = {
            context: {
                properties: {
                    "repositoryId": this.repositoryContext.getRepository().id,
                    "searchCriteria": searchCriteria
                }
            },
            contributionIds: [historyDataProvider]
        };

        return query;
    }
}
