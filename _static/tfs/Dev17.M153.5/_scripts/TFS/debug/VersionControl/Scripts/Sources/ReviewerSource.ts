import Q = require("q");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

export interface IReviewerSource {
    updateVoteAsync(pullRequestId: number, vote: number): IPromise<VCContracts.IdentityRefWithVote>;
    addTfsReviewerAsync(pullRequestId: number, reviewerLocalId: string): IPromise<VCContracts.IdentityRefWithVote>;
    addAadReviewersAsync(pullRequestId: number, reviewers: VSS_Common_Contracts.IdentityRef[]): IPromise<VCContracts.IdentityRefWithVote[]>;
    removeReviewerAsync(pullRequestId: number, reviewerLocalId: string): IPromise<void>;
}

export class ReviewerSource implements IReviewerSource {
    private _repositoryContext: RepositoryContext;

    constructor(repositoryContext: RepositoryContext) {
        this._repositoryContext = repositoryContext;
    }

    /**
    * Update the vote for the current identity
    */
    public updateVoteAsync(pullRequestId: number, vote: number): IPromise<VCContracts.IdentityRefWithVote> {
        return Q.Promise<VCContracts.IdentityRefWithVote>((resolve, reject) => {
            this._repositoryContext.getClient().beginUpdatePullRequestReviewer(
                this._repositoryContext,
                pullRequestId,
                this._repositoryContext.getTfsContext().currentIdentity.id,
                { vote: vote },
                (result) => resolve(result),
                (error) => reject(error)
            );
        });
    }

    /**
    * Add a reviewer to the pull request.
    *
    * @param reviewerLocalId tfsID of the reviewer to add
    */
    public addTfsReviewerAsync(pullRequestId: number, reviewerLocalId: string): IPromise<VCContracts.IdentityRefWithVote> {
        return Q.Promise<VCContracts.IdentityRefWithVote>((resolve, reject) => {
            this._repositoryContext.getClient().beginAddPullRequestTfsReviewer(
                this._repositoryContext,
                pullRequestId,
                reviewerLocalId,
                { vote: 0 },
                (result) => resolve(result),
                (error) => reject(error)
            );
        });
    }

    /**
    * Add reviewers to the pull request.
    */
    public addAadReviewersAsync(pullRequestId: number, reviewers: VSS_Common_Contracts.IdentityRef[]): IPromise<VCContracts.IdentityRefWithVote[]> {
        return Q.Promise<VCContracts.IdentityRefWithVote[]>((resolve, reject) => {
            this._repositoryContext.getClient().beginAddPullRequestAadReviewers(
                this._repositoryContext,
                pullRequestId,
                reviewers,
                (result) => resolve(result),
                (error) => reject(error)
            );
        });
    }

    /**
    * Remove a reviewer from the pull request.
    */
    public removeReviewerAsync(pullRequestId: number, reviewerLocalId: string): IPromise<void> {
        return Q.Promise<void>((resolve, reject) => {
            this._repositoryContext.getClient().beginDeletePullRequestReviewer(
                this._repositoryContext,
                pullRequestId,
                reviewerLocalId,
                (result) => resolve(null),
                (error) => reject(error)
            );
        });
    }
}