import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

import { RemoteStore } from "VSS/Flux/Store";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ReviewerUtils, ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";

import { autobind } from "OfficeFabric/Utilities";
import { announce } from "VSS/Utils/Accessibility";
import { format } from "VSS/Utils/String";

import { PullRequestPolicyEvaluation, RequiredReviewersPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Contracts/PullRequestPolicyEvaluation";
import { PolicyEvaluationStatus } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { PullRequestVoteStatus } from "VersionControl/Scripts/PullRequestTypes";
import { PullRequestPolicyTypeIds } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";

/**
 * Reviewers store - responsible for the reviewers of the current pull request.
 * 
 * Note that here is where we annoucne reviewer changes for accessiblity purposes, since this is the one place
 * where we know the changes that happen and the aggregate state of the reviewer data.
 */
export class ReviewersStore extends RemoteStore {

    private _pullRequest: VCContracts.GitPullRequest;
    private _currentUserIdentity: TFS_Host_TfsContext.IContextIdentity;
    private _reviewers: ReviewerItem[] = [];
    private _requiredReviewerIds: { [guid: string]: boolean } = {};
    private _currentUserReviewer: ReviewerItem;
    private _policyEvaluationsLoaded: boolean = false;

    public getReviewers(): ReviewerItem[] {
        return this._reviewers;
    }

    public getSummaryReviewers(): ReviewerItem[] {
        if (!this._pullRequest || !this._reviewers) {
            return [];
        }

        const currentReviewerId = this._currentUserIdentity && this._currentUserIdentity.id || null;

        // Remove the current reviewer from the list of reviewers to show in the summary list
        // but only if this is an active PR
        if (currentReviewerId && this._pullRequest.status === VCContracts.PullRequestStatus.Active) {
            return this._reviewers.filter(reviewer => reviewer.identity.id !== currentReviewerId);
        }

        return this._reviewers;
    }

    public isVotePrimaryAction(): boolean {
        if (!this._pullRequest || !this._reviewers) {
            return false;
        }

        const currentReviewerId = this._currentUserIdentity && this._currentUserIdentity.id || null;

        const createdById = this._pullRequest && this._pullRequest.createdBy && this._pullRequest.createdBy.id || null;
        const isPullRequestCreator: boolean = (currentReviewerId === createdById);

        const hasApproved: boolean = this._reviewers.some(reviewer =>
            reviewer.identity.id === currentReviewerId &&
            reviewer.identity.vote > PullRequestVoteStatus.NONE);

        const hasRejected: boolean = this._reviewers.some(reviewer =>
            reviewer.identity.id === currentReviewerId &&
            reviewer.identity.vote < PullRequestVoteStatus.NONE);

        return (!isPullRequestCreator && !hasApproved) || (isPullRequestCreator && hasRejected);
    }

    /**
     * The ReviewerItem for the current user. If the current user is not a particapant,
     * will return a ReviewerItem with no vote.
     */
    public getCurrentUserWithVote(): ReviewerItem {
        return this._currentUserReviewer;
    }

    public onReviewerRemoved = (payload: Actions.IRemoveReviewerPayload): void => {
        // find the reviewer that was removed
        const deleted = this._reviewers.filter(reviewer => reviewer.identity.id === payload.reviewerLocalId);

        if (deleted.length > 0) {
            // announce the change
            announce(format(
                VCResources.PullRequest_RemovedReviewer,
                deleted[0].displayName));
        }

        // note that we don't emit changed because a PR update will handle the change for us
    }

    public onVoteChanged = (payload: Actions.IReviewerInfoUpdatedPayload): void => {
        this._updateReviewers();

        // announce the change after we update reviewers
        if (this._pullRequest && payload.reviewer) {
            const reviewer = ReviewerItem.from(this._pullRequest, payload.reviewer, []);
            announce(reviewer.accessibleStatusText);
        }
    }

    // Received policy evaluations from source
    public onPolicyEvaluationRecordsUpdated = (payload: Actions.IPolicyEvaluationRecordsUpdatedPayload): void => {
        if (!payload.keepExisting) {
            this._requiredReviewerIds = {};
        }

        const blockingReviewerPolicies = payload.policyEvaluations
            .filter(pe => pe
                && pe.configuration && pe.configuration.type
                && pe.configuration.settings && pe.configuration.settings.requiredReviewerIds
                && pe.configuration.isBlocking
                && pe.status !== PolicyEvaluationStatus.NotApplicable
                && pe.configuration.type.id.toLowerCase() === PullRequestPolicyTypeIds.RequiredReviewersPolicy);

        blockingReviewerPolicies
            .map(p => p.configuration.settings.requiredReviewerIds as string[])
            .forEach(idList =>
                idList.forEach(id => {
                    this._requiredReviewerIds[id] = true;
                }));

        this._policyEvaluationsLoaded = true;

        this._updateReviewers();
    }

    // Received policy evaluations from client policy evaluations
    @autobind
    public onPolicyEvaluationUpdated(policyEvaluations: PullRequestPolicyEvaluation[]): void {
        this._requiredReviewerIds = {};

        const blockingReviewerPolicies = policyEvaluations
            .filter(pe => pe && pe.isBlocking
                && pe.policyType.id.toLowerCase() === PullRequestPolicyTypeIds.RequiredReviewersPolicy)
            .map(pe => pe as RequiredReviewersPolicyEvaluation);

        blockingReviewerPolicies.forEach(policy => {
            if (policy && policy.requiredReviewerIds) {
                policy.requiredReviewerIds.forEach(id => {
                    this._requiredReviewerIds[id] = true;
                });
            }
        });

        this._policyEvaluationsLoaded = true;

        this._updateReviewers();
    }

    public isLoading(): boolean {
        return super.isLoading() || !this._policyEvaluationsLoaded;
    }

    public onContextChanged = (payload: Actions.IContextUpdatedPayload): void => {
        if (payload && payload.tfsContext && payload.tfsContext.currentIdentity) {
            this._currentUserIdentity = payload.tfsContext.currentIdentity;
        }
        else {
            this._currentUserIdentity = null;
        }

        this._updateReviewers();
    }

    public onPullRequestDetailsChanged = (payload: Actions.IPullRequestUpdatedPayload): void => {
        this._loading = false;
        this._pullRequest = payload.pullRequest;

        this._updateReviewers();
    }

    private _updateReviewers() {
        // If we do not have enough information - clear data and
        // return early.
        if (!this._pullRequest) {
            let changed = false;

            if (this._reviewers.length !== 0) {
                this._reviewers = [];
                changed = true;
            }

            if (this._currentUserReviewer !== null) {
                this._currentUserReviewer = null;
                changed = true;
            }

            if (changed) {
                this.emitChanged();
            }

            return;
        }

        this._reviewers = ReviewerUtils.getSortedReviewers(this._pullRequest, ReviewerUtils.identityRefWithVoteUIComparer);

        for (const reviewer of this._reviewers) {
            reviewer.identity.isRequired = !!this._requiredReviewerIds[reviewer.identity.id];
        }

        let updatedUserData: ReviewerItem = null;

        if (this._currentUserIdentity) {
            for (const reviewer of this._reviewers) {
                if (reviewer.identity.id === this._currentUserIdentity.id) {
                    updatedUserData = reviewer;
                    break;
                }
            }

            if (!updatedUserData) {
                updatedUserData = ReviewerItem.NonParticapatingReviewer(this._currentUserIdentity);
            }
        }

        this._currentUserReviewer = updatedUserData;

        this.emitChanged();
    }
}
