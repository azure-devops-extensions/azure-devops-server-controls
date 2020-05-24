// actions
import { PullRequestAutoCompleteActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestAutoCompleteActionCreator";
import { PullRequestClientPoliciesActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestClientPoliciesActionCreator";
import { ActionsHub, ReviewerActionType } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { PullRequestActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/PullRequestActionCreator";
import { PullRequestDetailRefreshOptions } from "VersionControl/Scripts/Actions/PullRequestReview/PullRequestActionCreator";

// sources
import { IReviewerSource } from "VersionControl/Scripts/Sources/ReviewerSource";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";

// contracts
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as VCPullRequest from "VersionControl/Scripts/TFS.VersionControl.PullRequest";
import * as VCContracts from "TFS/VersionControl/Contracts";
import { PullRequestPolicyTypeIds } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import { IdentityRef } from "VSS/WebApi/Contracts";

import { autobind } from "OfficeFabric/Utilities";

export class ReviewerActionCreator {
    private _reviewerSource: IReviewerSource;
    private _pullRequestActionCreator: PullRequestActionCreator;
    private _policyActionCreator: PullRequestClientPoliciesActionCreator;
    private _autoCompleteActionCreator: PullRequestAutoCompleteActionCreator;
    private _actionsHub: ActionsHub;

    constructor(
        pullRequestActionCreator: PullRequestActionCreator,
        policyActionCreator: PullRequestClientPoliciesActionCreator,
        autoCompleteActionCreator: PullRequestAutoCompleteActionCreator,
        actionsHub: ActionsHub,
        sourcesHub: SourcesHub) {
        this._policyActionCreator = policyActionCreator;
        this._pullRequestActionCreator = pullRequestActionCreator;
        this._autoCompleteActionCreator = autoCompleteActionCreator;
        this._reviewerSource = sourcesHub.reviewerSource;
        this._actionsHub = actionsHub;
    }

    /**
      * Update the current user's vote for specified pull request.
      */
    public updateVote(pullRequestId: number, vote: number): void {

        // Update pending
        this._reviewerSource.updateVoteAsync(pullRequestId, vote)
            .then(updatedVoter => {
                this._actionsHub.voteSuccess.invoke({
                    reviewer: updatedVoter,
                    pullRequestId: pullRequestId,
                    action: ReviewerActionType.update
                });
            })
            .then(() => {
                // update policy evaluations after a vote
                this._policyActionCreator.queryPolicyEvaluationsByType(PullRequestPolicyTypeIds.ApproverCountPolicy);
                this._policyActionCreator.queryPolicyEvaluationsByType(PullRequestPolicyTypeIds.RequiredReviewersPolicy);
                // update blocking autocomplete criteria
                this._autoCompleteActionCreator.getBlockingAutoCompletePolicies();
            })
            .then(() => {
                // now re-query pull request detail
                this._pullRequestActionCreator.queryPullRequestDetail(pullRequestId, PullRequestDetailRefreshOptions.Basic);
            })
            .then(undefined, this._raiseError);
    }

    /**
     * Add a reviewer to the specified pull request
     */
    public addReviewer(pullRequestId: number, reviewerIdentity: IdentityRef): void {
        let promise: IPromise<VCContracts.IdentityRefWithVote> = null;

        if (reviewerIdentity.isAadIdentity) {
            promise = this._addAadReviewer(pullRequestId, reviewerIdentity.id, reviewerIdentity.displayName, reviewerIdentity.isContainer);
        }
        else {
            promise = this._addTfsReviewer(pullRequestId, reviewerIdentity.id);
        }

        promise
            .then((reviewer) => {
                // now re-query pull request detail
                this._pullRequestActionCreator.queryPullRequestDetail(pullRequestId, PullRequestDetailRefreshOptions.Basic);
            });
    }

    /**
     * Add a reviewer to the specified pull request
     */
    private _addTfsReviewer(pullRequestId: number, reviewerLocalId: string): IPromise<VCContracts.IdentityRefWithVote> {
        // start the add
        return this._reviewerSource.addTfsReviewerAsync(pullRequestId, reviewerLocalId)
            .then(updatedReviewer => {
                // let us know update was successful
                this._actionsHub.addReviewerSuccess.invoke({
                    reviewer: updatedReviewer,
                    pullRequestId: pullRequestId,
                    action: ReviewerActionType.add
                });

                return updatedReviewer;
            })
            .then<VCContracts.IdentityRefWithVote>(undefined, this._raiseError as any);
    }

    /**
     * Add a reviewer to the specified pull request
     */
    private _addAadReviewer(pullRequestId: number, aadId: string, displayName: string, isGroup: boolean): IPromise<VCContracts.IdentityRefWithVote> {
        // start the add
        const reviewers: IdentityRef[] = [{
            displayName: displayName,
            isAadIdentity: true,
            id: aadId,
            isContainer: isGroup
        } as IdentityRef];

        return this._reviewerSource.addAadReviewersAsync(pullRequestId, reviewers)
            .then(updatedReviewers => {
                // let us know update was successful
                this._actionsHub.addReviewerSuccess.invoke({
                    reviewer: updatedReviewers[0],
                    pullRequestId: pullRequestId,
                    action: ReviewerActionType.add
                });

                return updatedReviewers[0];
            })
            .then<VCContracts.IdentityRefWithVote>(undefined, this._raiseError as any);
    }

    /**
     * Remove a reviewer from the specified pull request
     */
    public removeReviewer(pullRequestId: number, reviewerLocalId: string): void {
        // start the remove
        this._actionsHub.removeReviewerStart.invoke({
            pullRequestId: pullRequestId,
            reviewerLocalId: reviewerLocalId
        });

        this._reviewerSource.removeReviewerAsync(pullRequestId, reviewerLocalId)
            .then(() => {
                // let us know update was successful
                this._actionsHub.removeReviewerSuccess.invoke({
                    reviewerLocalId: reviewerLocalId,
                    pullRequestId: pullRequestId
                });
            })
            .then(() => {
                // now re-query pull request detail
                this._pullRequestActionCreator.queryPullRequestDetail(pullRequestId, PullRequestDetailRefreshOptions.Basic);
            })
            .then(undefined, this._raiseError);
    }

    /**
     * Raise an application error. This could be a typical JS error or some text.
     */
    @autobind
    private _raiseError(error: any): void {
        this._actionsHub.raiseError.invoke(error);
    }
}