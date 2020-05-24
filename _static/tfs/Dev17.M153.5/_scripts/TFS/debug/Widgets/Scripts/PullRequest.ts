import Service = require("VSS/Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_VersionControl_Contracts = require("TFS/VersionControl/Contracts");
import TFS_VersionControl_WebApi = require("TFS/VersionControl/GitRestClient");
import {PullRequestVoteStatus} from "VersionControl/Scripts/PullRequestTypes";
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");

var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

class PullRequestWidgetConstants {
    static DEFAULT_MAX_QUERY_RESULT_COUNT: number = 50;
    static DEFAULT_MAX_QUERY_FILTER: number = 10;
}

export enum SortCriteria {
    CreatedDate = 0
}

export enum QueryType {
    CreatedByMe = 1,
    AssignedToMe = 2,
    AssignedToTeam = 3,
}

export class PullRequestResult {
    Total: number;
    PullRequests: TFS_VersionControl_Contracts.GitPullRequest[];
}

export class PullRequestManager {
    private _gitHttpClient: TFS_VersionControl_WebApi.GitHttpClient;

    constructor() {
        this._gitHttpClient = Service.getClient(
            TFS_VersionControl_WebApi.GitHttpClient,
            tfsContext.contextData,
            undefined,
            undefined,
            { timeout: TFS_Dashboards_Common.ClientConstants.WidgetAjaxTimeoutMs });
    }

    public __test() {
        return {
            tfsContext: tfsContext,
        }
    }

    public getRepository(id: string): IPromise<TFS_VersionControl_Contracts.GitRepository> {
        return this._gitHttpClient.getRepository(id);
    }

    public getPullRequests(repoId: string, queryType?: QueryType, top?: number, sortCriteria?: SortCriteria): JQueryPromise<PullRequestResult> {
        return this._getPullRequestsVersionControl(repoId, queryType, top, sortCriteria);
    }

    private _getPullRequestsVersionControl(repoId: string, queryType?: QueryType, top?: number, sortCriteria?: SortCriteria): JQueryPromise<PullRequestResult> {
        top = top || PullRequestWidgetConstants.DEFAULT_MAX_QUERY_FILTER;
        sortCriteria = sortCriteria || SortCriteria.CreatedDate;
        queryType = queryType || (QueryType.AssignedToMe | QueryType.CreatedByMe);

        var deferred = jQuery.Deferred<PullRequestResult>();
        var deferredResults: JQueryPromise<TFS_VersionControl_Contracts.GitPullRequest[]>;

        var userId = tfsContext.currentIdentity.id;
        var teamId = TFS_Dashboards_Common.getDashboardTeamContext().id;

        switch (queryType) {
        case QueryType.AssignedToTeam:
            deferredResults = this._beginGetPullRequestsVersionControl(repoId, this._getPullRequestSearchCriteria(null, teamId));
            break;

        case QueryType.AssignedToMe:
            deferredResults = this._beginGetPullRequestsVersionControl(repoId, this._getPullRequestSearchCriteria(null, userId));
            break;

        case QueryType.CreatedByMe:
            deferredResults = this._beginGetPullRequestsVersionControl(repoId, this._getPullRequestSearchCriteria(userId, null));
            break;

        default:
            throw new Error("Invalid queryType " + queryType);
        }

        deferredResults.then(
            (pullRequestResults: TFS_VersionControl_Contracts.GitPullRequest[]) => {

                var total = pullRequestResults.length;

                PullRequestManager._sortPullRequests(pullRequestResults, sortCriteria);
                var filtered = pullRequestResults.slice(0, top);

                deferred.resolve(<PullRequestResult>{
                    Total: Math.min(total, PullRequestWidgetConstants.DEFAULT_MAX_QUERY_RESULT_COUNT),
                    PullRequests: filtered
                });
            }, (fail: any) => {
                deferred.reject(fail);
            });

        return deferred.promise();
    }

    private _beginGetPullRequestsVersionControl(repoId: string, searchCriteria: TFS_VersionControl_Contracts.GitPullRequestSearchCriteria): JQueryPromise<TFS_VersionControl_Contracts.GitPullRequest[]> {
        var deferred = jQuery.Deferred<TFS_VersionControl_Contracts.GitPullRequest[]>();

        this._gitHttpClient.getPullRequests(repoId, searchCriteria, null, null, null, PullRequestWidgetConstants.DEFAULT_MAX_QUERY_RESULT_COUNT + 1)
            .then(
            (result: TFS_VersionControl_Contracts.GitPullRequest[]) => {
                deferred.resolve(result);
            },
            (fail: any) => {
                deferred.reject(fail);
            });

        return deferred.promise();
    }

    public static getMinimumVoteStatus(pullRequest: TFS_VersionControl_Contracts.GitPullRequest): PullRequestVoteStatus {
        var minVote = PullRequestVoteStatus.APPROVE;
        var maxVote = PullRequestVoteStatus.REJECT;

        var reviewers = pullRequest.reviewers;
        if (reviewers == null)
            return PullRequestVoteStatus.NONE;

        for (var i = 0, len = reviewers.length; i < len; i++) {
            if (reviewers[i].vote < minVote) {
                minVote = reviewers[i].vote;
            }
            if (reviewers[i].vote > maxVote) {
                maxVote = reviewers[i].vote;
            }
        }

        if (minVote === PullRequestVoteStatus.NONE)
            return maxVote;

        return minVote;
    }

    private _getPullRequestSearchCriteria(creatorId?: string, reviewerId?: string): TFS_VersionControl_Contracts.GitPullRequestSearchCriteria {
        return {
            repositoryId: null,
            includeLinks: false,
            status: TFS_VersionControl_Contracts.PullRequestStatus.Active,
            creatorId: creatorId,
            reviewerId: reviewerId,
            sourceRefName: null,
            targetRefName: null
        } as TFS_VersionControl_Contracts.GitPullRequestSearchCriteria;
    }

    private static _sortPullRequests(pullRequests: TFS_VersionControl_Contracts.GitPullRequest[], sortCriteria: SortCriteria) {
        if (sortCriteria === SortCriteria.CreatedDate) {
            pullRequests.sort((a, b) => b.creationDate.getTime() - a.creationDate.getTime());
            return;
        }

        throw new Error("Invalid sortCriteria");
    }
}