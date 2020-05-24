import Q = require("q");

import { getService } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import Git_Client = require("TFS/VersionControl/GitRestClient");
import ReactSource = require("VersionControl/Scripts/Sources/Source");
import { RefStatus } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { GitPullRequest, GitPullRequestIteration, GitCommit, TypeInfo, GitPullRequestSearchCriteria, PullRequestStatus } from "TFS/VersionControl/Contracts";
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import { FollowsService, ArtifactSubscription } from "Notifications/Services";

import { PersonMentionTranslator } from "VersionControl/Scripts/Utils/DiscussionUtils";

export interface IPullRequestDetailSource {
    queryPullRequestAsync(pullRequestId: number, includeCommits: boolean): IPromise<GitPullRequest>;
    querySourceRefStatusAsync(pullRequest: GitPullRequest): IPromise<RefStatus>;
    queryPullRequestIterationsAsync(pullRequestId: number, includeCommits: boolean): IPromise<GitPullRequestIteration[]>;
    updatePullRequestAsync(pullRequestId: number, updatedPR: GitPullRequest): IPromise<GitPullRequest>;
    queryPullRequestFollowSubscription(artifactId: string): IPromise<ArtifactSubscription>;
    followPullRequest(artifactId: string): IPromise<ArtifactSubscription>;
    unfollowPullRequest(subscription: ArtifactSubscription): IPromise<ArtifactSubscription>;
    getCommit(version: string): IPromise<GitCommit>;
    resetCache(): void;
    sharePullRequest(pullRequestId: number, message: string, recievers: VSS_Common_Contracts.IdentityRef[]): IPromise<void>;
    getExistingPullRequest(targetRepositoryId: string, sourceRepositoryId: string, sourceBranchName: string, targetBranchName: string): IPromise<GitPullRequest>;
}

export class PullRequestDetailSource extends ReactSource.CachedSource implements IPullRequestDetailSource {
    private static DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
    private static DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailProvider";

    private _gitRestClient: Git_Client.GitHttpClient;
    private _followsService: FollowsService;
    private _repositoryId: string;
    private _projectId: string;

    constructor(projectId: string, repositoryId: string) {
        super(PullRequestDetailSource.DATA_ISLAND_PROVIDER_ID, PullRequestDetailSource.DATA_ISLAND_CACHE_PREFIX);

        this._gitRestClient = TFS_OM_Common.ProjectCollection.getDefaultConnection()
            .getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);

        this._followsService = TFS_OM_Common.ProjectCollection.getDefaultConnection()
            .getService<FollowsService>(FollowsService);

        this._repositoryId = repositoryId;
        this._projectId = projectId;
    }

    public queryPullRequestAsync(pullRequestId: number, includeCommits: boolean = false): IPromise<GitPullRequest> {
        // prevent the call if it's an invalid id
        if (pullRequestId <= 0) {
            return Q<GitPullRequest>(null);
        }

        const translateStorageKeyToDisplayNameInDescriptionInPR = (pullRequest: GitPullRequest): IPromise<GitPullRequest> => {
            return PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInText(pullRequest.description)
                .then(translatedDescription => {
                    pullRequest.description = translatedDescription;
                    return pullRequest;
                });
        };

        // check for cached value before going to REST
        const cached = this.fromCacheAsync<GitPullRequest>("PullRequest." + pullRequestId + "." + includeCommits, TypeInfo.GitPullRequest);
        if (cached) {
            return cached.then(cachedPR => translateStorageKeyToDisplayNameInDescriptionInPR(cachedPR));
        }

        return this._gitRestClient.getPullRequest(this._repositoryId, pullRequestId, this._projectId, null, null, null, includeCommits, false)
            .then(resultPR => translateStorageKeyToDisplayNameInDescriptionInPR(resultPR));
    }

    // Query for the state of the current source ref, for determining whether or not it can be deleted
    public querySourceRefStatusAsync(pullRequest: GitPullRequest): IPromise<RefStatus> {
        // check for cached value before going to REST
        const cacheSuffix = "SourceRefStatus." + pullRequest.pullRequestId;
        const cached = this.fromCacheAsync<RefStatus>(cacheSuffix);

        if (cached) {
            return cached;
        }

        const properties = {
            pullRequestId: pullRequest.pullRequestId,
            repositoryId: this._repositoryId,
            mode: "branchStatus",
        };
        const webPageDataService = getService(WebPageDataService);
        return webPageDataService.getDataAsync(PullRequestDetailSource.DATA_ISLAND_PROVIDER_ID, null, properties)
            .then(data => data && data[`${PullRequestDetailSource.DATA_ISLAND_CACHE_PREFIX}.${cacheSuffix}`]);
    }

    /**
     * This returns a promise the resolves to a list of the iterations for a pull request
     * @param pullRequestId: the id of the pull request we want the iterations of
     * @param includeCommits: boolean for if we want the commits of an iteration listed within the iteration object
     */
    public queryPullRequestIterationsAsync(pullRequestId: number, includeCommits: boolean = false): IPromise<GitPullRequestIteration[]> {
        if (pullRequestId <= 0) {
            return Q<GitPullRequestIteration[]>(null);
        }

        // check for cached value before going to REST
        const cached = this.fromCache<GitPullRequestIteration[]>("PullRequestIterations", TypeInfo.GitPullRequestIteration);
        if (cached) {
            return Q<GitPullRequestIteration[]>(cached);
        }

        return this._gitRestClient.getPullRequestIterations(this._repositoryId, pullRequestId, this._projectId, includeCommits);
    }

    public getCommit(version: string): IPromise<GitCommit> {
        return this._gitRestClient.getCommit(version, this._repositoryId);
    }

    public updatePullRequestAsync(pullRequestId: number, updatedPR: GitPullRequest): IPromise<GitPullRequest> {
        updatedPR.description = PersonMentionTranslator.getDefault().translateDisplayNameToStorageKeyInText(updatedPR.description);
        return this._gitRestClient.updatePullRequest(updatedPR, this._repositoryId, pullRequestId)
            .then(pullRequest => {
                return PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInText(pullRequest.description)
                    .then(translatedDescription => {
                        pullRequest.description = translatedDescription;
                        return pullRequest;
                    });
            });
    }

    public queryPullRequestFollowSubscription(artifactId: string): IPromise<ArtifactSubscription> {
        if (!artifactId) {
            return Q<ArtifactSubscription>(null);
        }

        const artifactSubscription = <ArtifactSubscription>{
            artifactId: artifactId,
            artifactType: "PullRequestId"
        };
        return this._followsService.getSubscription(artifactSubscription);
    }

    public followPullRequest(artifactId: string): IPromise<ArtifactSubscription> {
        if (!artifactId) {
            return Q<ArtifactSubscription>(null);
        }

        const artifactSubscription = <ArtifactSubscription>{
            artifactId: artifactId,
            artifactType: "PullRequestId"
        };
        return this._followsService.followArtifact(artifactSubscription);
    }

    public unfollowPullRequest(subscription: ArtifactSubscription): IPromise<ArtifactSubscription> {
        if (!subscription) {
            return Q<ArtifactSubscription>(null);
        }

        return this._followsService.unfollowArtifact(subscription);
    }

    public sharePullRequest(pullRequestId: number, message: string, recievers: VSS_Common_Contracts.IdentityRef[]): IPromise<void> {
        return this._gitRestClient.sharePullRequest({
            message: message,
            receivers: recievers
        },
            this._repositoryId,
            pullRequestId,
            this._projectId);
    }

    public getExistingPullRequest(targetRepositoryId: string, sourceRepositoryId: string, sourceBranchRefName: string, targetBranchRefName: string): IPromise<GitPullRequest> {
        const searchCriteria: GitPullRequestSearchCriteria = {
            repositoryId: targetRepositoryId,
            targetRefName: targetBranchRefName,
            status: PullRequestStatus.Active,
            sourceRepositoryId,
            sourceRefName: sourceBranchRefName,
        } as GitPullRequestSearchCriteria;

        return this._gitRestClient.getPullRequestsByProject(this._projectId, searchCriteria, null, 0, 1).then(prs => {
            return prs[0];
        })
    }
}
