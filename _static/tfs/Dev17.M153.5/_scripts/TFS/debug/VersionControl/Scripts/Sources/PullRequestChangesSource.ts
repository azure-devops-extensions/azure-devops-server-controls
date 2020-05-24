import Q = require("q");

import Git_Client = require("TFS/VersionControl/GitRestClient");
import ReactSource = require("VersionControl/Scripts/Sources/Source");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import VCContracts = require("TFS/VersionControl/Contracts");

export interface IPullRequestChangesSource {
    queryChangesAsync(iterationId: number, baseId: number, top: number, skip: number, skipCache?: boolean): IPromise<VCContracts.GitPullRequestIterationChanges>;
    resetCache(): void;
}

export class PullRequestChangesSource extends ReactSource.CachedSource implements IPullRequestChangesSource {
    private static DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
    private static DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailProvider";

    private _gitRestClient: Git_Client.GitHttpClient;
    private _repositoryId: string;
    private _projectId: string;
    private _pullRequestId: number;

    private _changeMap: {
        [key: string]: VCContracts.GitPullRequestIterationChanges
    };

    constructor(projectId: string, repositoryId: string, pullRequestId: number) {
        super(PullRequestChangesSource.DATA_ISLAND_PROVIDER_ID, PullRequestChangesSource.DATA_ISLAND_CACHE_PREFIX);

        this._changeMap = {};

        this._gitRestClient = TFS_OM_Common.ProjectCollection.getDefaultConnection().getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);
        this._repositoryId = repositoryId;
        this._projectId = projectId;
        this._pullRequestId = pullRequestId;
    }

    /**
     * Query for the list of changes in a given iteartion.
     * @param iterationId
     * @param baseId - parameter for iteration comparison
     * @param top - Note that this is a required parameter, essentially forcing the client to decide on page size.
     * @param skip - Note that this is a required parameter, essentially forcing the client to decide on starting position.
     * @param skipCache - if false, try to use cached data first if available
     */
    public queryChangesAsync(iterationId: number, baseId: number, top: number, skip: number, skipCache?: boolean): IPromise<VCContracts.GitPullRequestIterationChanges> {
        const key: string = iterationId + "|" + baseId + "|" + top + "|" + skip;

        // always read from the data island cache (will clear on read, regardless of cache skip)
        const cached = this.fromCache<VCContracts.GitPullRequestIterationChanges>("PullRequestIterationChanges." + iterationId + "." + baseId + "." + top + "." + skip, VCContracts.TypeInfo.GitPullRequestIterationChanges);
            
        if (!skipCache) {
            // check the cache first
            if (this._changeMap[key]) {
                return Q<VCContracts.GitPullRequestIterationChanges>(this._changeMap[key]);
            }

            // check for cached value from the data island before going to REST
            if (cached) {
                this._changeMap[key] = cached;
                return Q<VCContracts.GitPullRequestIterationChanges>(cached);
            }
        }

        return this._gitRestClient.getPullRequestIterationChanges(this._repositoryId, this._pullRequestId, iterationId, this._projectId, top, skip, baseId)
            .then(changes => {
                this._changeMap[key] = changes;
                return changes;
            });
    }
}
