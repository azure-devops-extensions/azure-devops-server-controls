import Q = require("q");

import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as ReactSource from "VersionControl/Scripts/Sources/Source";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import { PullRequestListQueryCriteria, CustomizeSectionName } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import * as VCContracts from "TFS/VersionControl/Contracts";
import { WebApiTeam } from "TFS/Core/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitHttpClient3 } from "TFS/VersionControl/GitRestClient";
import { Suggestion, ISuggestionObject } from "VersionControl/Scenarios/Shared/Suggestion";
import { SourceConstants } from "VersionControl/Scenarios/PullRequestList/Sources/SourceConstants";
import { VersionControlUserPreferences } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

export interface PullRequestListResult {
    pullRequests: VCContracts.GitPullRequest[];
    criteria: PullRequestListQueryCriteria;
}

export interface IPullRequestListSource {
    queryPullRequestListAsync(criteria: PullRequestListQueryCriteria, top: number, skip: number): IPromise<PullRequestListResult>;
    getPullRequestById(pullRequestId: number): IPromise<VCContracts.GitPullRequest>;
    getPullRequestSuggestion(): IPromise<ISuggestionObject>;
    dismissCreatePullRequestSuggestion(suggestion: Suggestion);
    getTeamMemberships(): IPromise<WebApiTeam[]>;
    getIsDayZeroExperience(): boolean;
    resetCache(): void;
    saveCustomCriteria(criteria: PullRequestListQueryCriteria): IPromise<void>;
    getCustomCriteria(): PullRequestListQueryCriteria;
}

export class PullRequestListSource extends ReactSource.CachedSource implements IPullRequestListSource {
    private _repositoryContext: GitRepositoryContext;
    private _gitClientService: GitClientService;
    private _gitHttpClient: GitHttpClient3;
    
    constructor(repositoryContext?: GitRepositoryContext) {
        super(SourceConstants.DATA_ISLAND_PROVIDER_ID, SourceConstants.DATA_ISLAND_CACHE_PREFIX);
        this._repositoryContext = repositoryContext;

        this._gitClientService = TFS_OM_Common.ProjectCollection.getDefaultConnection()
            .getService<GitClientService>(GitClientService);
        this._gitHttpClient = TFS_OM_Common.ProjectCollection.getDefaultConnection().getHttpClient<GitHttpClient3>(GitHttpClient3);
    }

    public queryPullRequestListAsync(criteria: PullRequestListQueryCriteria, top: number, skip: number): IPromise<PullRequestListResult>{
        let cacheKey = this._computeCacheKey(criteria, top, skip);

        let cached = this.fromCacheAsync(cacheKey, VCContracts.TypeInfo.GitPullRequest);

        return Q.Promise<PullRequestListResult>((resolve, reject) => {
            if (cached) {
                cached.then(result => resolve({pullRequests: <VCContracts.GitPullRequest[]>result, criteria: criteria }));
                return;
            }

            if(cacheKey === CustomizeSectionName) {
                // never go to the rest api for the custom view
                resolve({pullRequests: [], criteria: criteria});
                return;
            }

            this._gitClientService.beginGetPullRequests(this._repositoryContext,
                VCContracts.PullRequestStatus[criteria.status],
                criteria.authorId,
                criteria.reviewerId,
                null, null,
                top, skip,
                (resultPullRequests: VCContracts.GitPullRequest[], status: any, creatorId: any, reviewerId: any) => {
                    resolve({pullRequests: resultPullRequests, criteria: criteria });
                }, (error: any) => {
                    reject(error);
                });
        });
    }

    public getTeamMemberships(): IPromise<WebApiTeam[]> {
        let cached = this.fromCacheAsync(SourceConstants.TEAM_MEMBERSHIPS_KEY, VCContracts.TypeInfo.GitPullRequest);

        return Q.Promise<WebApiTeam[]>((resolve) => {
            if (cached) {
                cached.then(result => resolve(result as WebApiTeam[]));
            } else {
                resolve([]);
            }
        });
    }

    /**
     * Gets whether or not exist any PR in the current Team Project.
     * It works synchronously with data-island data.
     * Second call will be null (unless resetCache is called).
     */
    public getIsDayZeroExperience(): boolean {
        return this.fromCache("IsDayZeroExperience", VCContracts.TypeInfo.GitPullRequest);
    }

    public getPullRequestById(pullRequestId: number): IPromise<VCContracts.GitPullRequest> {
        return this._gitHttpClient.getPullRequestById(pullRequestId).then(null, error => {
            // We safely assume that an error may be because the user has no permissions, so we retry.
            // Anon & public users cannot search collection-wide, so they have to specify a ProjectId constraint.
            const projectId = this._repositoryContext.getProjectId();
            return this._gitHttpClient.getPullRequestById(pullRequestId, projectId);
        });
    }

    public getPullRequestSuggestion(): IPromise<ISuggestionObject> {
        return Suggestion.beginGetSuggestion(this._repositoryContext as GitRepositoryContext);
    }

    public dismissCreatePullRequestSuggestion(suggestion: Suggestion): void {
        return suggestion.invalidateSuggestion();
    }

    public saveCustomCriteria(criteria: PullRequestListQueryCriteria): IPromise<void> {
        return Q.Promise((resolve, reject) => {
            let serialized = criteria.serializeCustomCriteria();
            this._gitClientService.beginUpdateUserPreferences({pullRequestListCustomCriteria: serialized} as VersionControlUserPreferences, () => {
                resolve();
            }, error => {
                resolve();
            });
        });
    }

    public getCustomCriteria(): PullRequestListQueryCriteria {
        let criteriaString = this.fromCache("UserViewCriteria") as string;
        return PullRequestListQueryCriteria.parseCustomCriteria(criteriaString);
    }

    private _computeCacheKey(criteria: PullRequestListQueryCriteria, top:number, skip:number): string {
        // for the custom user view, we have a constant key instead of a computed one
        if(criteria.key === CustomizeSectionName) {
            return criteria.key;
        }

        // see extension TFS.VersionControl.PullRequestsListProvider for cache key format
        // key is sensitive to null vs undefined. Force null for the string
        return `${top}.${skip}.${VCContracts.PullRequestStatus[criteria.status]}.${((criteria.authorId || null))}.${(criteria.reviewerId || null)}`;
    }
}
