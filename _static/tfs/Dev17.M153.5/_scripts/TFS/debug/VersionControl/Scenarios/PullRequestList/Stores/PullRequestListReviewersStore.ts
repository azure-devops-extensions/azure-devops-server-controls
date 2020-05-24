import * as VSSStore from "VSS/Flux/Store";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PullRequestSummaryDetails } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import * as VCContracts from "TFS/VersionControl/Contracts";
import { ReviewerUtils, ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { GitPullRequest }from "TFS/VersionControl/Contracts";

export class PullRequestListReviewersStore extends VSSStore.Store {
    private _pullRequestsReviewers: IDictionaryNumberTo<ReviewerItem[]> = {};
    private _tfsContext: TfsContext;

    constructor(tfsContext: TfsContext) {
        super();
        this._tfsContext = tfsContext;
    }

    public onPullRequestsListUpdated(pullRequests: VCContracts.GitPullRequest[]) {
        pullRequests.forEach(pr => {
            this._pullRequestsReviewers[pr.pullRequestId] = 
                this._sortReviewers(pr.reviewers, pr, this._tfsContext.currentIdentity.id);
        });
        this.emitChanged();
    }

    public getSortedReviewers(pullRequestId: number): ReviewerItem[] {
        return this._pullRequestsReviewers[pullRequestId] || null;
    }

    public getStoreState(): IDictionaryNumberTo<ReviewerItem[]> {
        return this._pullRequestsReviewers;
    }

    private _sortReviewers(reviewers: VCContracts.IdentityRefWithVote[], pullRequest: GitPullRequest, currentUserId: string): ReviewerItem[] {
        return ReviewerUtils.getSortedReviewers(pullRequest, (a,b) => this._reviewersComparer(a,b, currentUserId));    
    }

    private _reviewersComparer(a: VCContracts.IdentityRefWithVote, b: VCContracts.IdentityRefWithVote, currentUserId: string): number {
        // current user should be first
        if (a.id == currentUserId && b.id != currentUserId) return -1;
        if (b.id == currentUserId && a.id != currentUserId) return 1;

        // using common reviewers comparer
        return ReviewerUtils.identityRefWithVoteUIComparer(a, b);
    }
}