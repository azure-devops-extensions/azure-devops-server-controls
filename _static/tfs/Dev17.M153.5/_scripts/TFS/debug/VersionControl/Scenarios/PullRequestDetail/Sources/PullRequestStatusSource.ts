import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCContracts = require("TFS/VersionControl/Contracts");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Git_Client = require("TFS/VersionControl/GitRestClient");
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { CachedSource } from "VersionControl/Scripts/Sources/Source";

import { Contribution } from "VSS/Contributions/Contracts";
import { ContributionQueryOptions, ExtensionService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";

export interface IPullRequestStatusSource {
    queryPolicyStatusesAsync(pullRequestId: number): IPromise<VCContracts.GitPullRequestStatus[]>;
    resetCache(): void;
    queryStatusesContributions(): IPromise<Contribution[]>;
}

const DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
const DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailProvider";
const PullRequestStatusMenuContributionId = "ms.vss-code-web.pull-request-status-menu";

/**
 * PullRequest Statuses is an extension mechanism for third party tools to post their status to PR overview page via the REST API.
 */
export class PullRequestStatusSource extends CachedSource implements IPullRequestStatusSource {
    private _gitRestClient: Git_Client.GitHttpClient;
    private _projectId: string;
    private _repositoryId: string;
    private _extensionService: ExtensionService;

    constructor(projectId: string, repositoryId: string) {
        super(DATA_ISLAND_PROVIDER_ID, DATA_ISLAND_CACHE_PREFIX);

        this._gitRestClient = TFS_OM_Common.ProjectCollection.getDefaultConnection()
            .getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);

        this._extensionService = getService(ExtensionService);

        this._projectId = projectId;
        this._repositoryId = repositoryId;
    }

    public queryPolicyStatusesAsync(pullRequestId: number): IPromise<VCContracts.GitPullRequestStatus[]> {
        // check for cached value before going to REST
        const cached = this.fromCacheAsync<VCContracts.GitPullRequestStatus[]>("Statuses." + pullRequestId, VCContracts.TypeInfo.GitPullRequestStatus);
        if (cached) {
            return cached;
        }

        return this._gitRestClient.getPullRequestStatuses(this._repositoryId, pullRequestId, this._projectId);
    }

    /**
     * Get all contributions to statuses section of the overview page. These contributions are used to contribute menu items for
     * ellipsis menu per status.
     */
    public queryStatusesContributions(): IPromise<Contribution[]> {
        return this._extensionService.queryContributions([PullRequestStatusMenuContributionId], ContributionQueryOptions.IncludeDirectTargets);
    }
}
