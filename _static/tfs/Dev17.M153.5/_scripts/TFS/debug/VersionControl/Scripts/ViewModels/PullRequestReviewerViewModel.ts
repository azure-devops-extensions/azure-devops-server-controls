import Utils_String = require("VSS/Utils/String");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");

import VCContracts = require("TFS/VersionControl/Contracts");
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import VCViewModel = require("VersionControl/Scripts/TFS.VersionControl.ViewModel");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { PullRequestVoteStatus } from "VersionControl/Scripts/PullRequestTypes";

export class ReviewerViewModel extends VCViewModel.VersionControlViewModel {
    public reviewer: VCContracts.IdentityRefWithVote;
    public delegateReviewers: ReviewerList;

    public isApproved: boolean = false;
    public isRejected: boolean = false;
    public isAwaitingResponse: boolean = false;
    public isApproveWithComment: boolean = false;
    public isNotReady: boolean = false;

    public voteText: string = "";

    public approve: () => void;
    public reject: () => void;

    public isCurrentUser: boolean;
    public isDelegateReviewer: boolean;
    public isImplicitReviewer: boolean;
    public isRequiredReviewer: boolean;
    public hasDelegateReviewers: boolean;

    public displayName: string;
    public delegateReviewersDisplayName: string;

    public requiredReviewerText = VCResources.PullRequest_Required;
    public pullRequestApproveText = VCResources.PullRequest_Approve;
    public pullRequestApproveWithCommentText = VCResources.PullRequest_ApproveWithComment;
    public pullRequestNotReadyText = VCResources.PullRequest_NotReady;
    public pullRequestRejectText = VCResources.PullRequest_Reject;
    public pullRequestReviewerFeedbackAwaitingResponseText = VCResources.PullRequest_ReviewerFeedback_AwaitingResponse;
    public pullRequestReviewerFeedbackNoResponseText = VCResources.PullRequest_ReviewerFeedback_NoResponse;
    public pullRequestDelegateReviewerViaText = VCResources.PullRequest_DelegateReviewerVia;

    constructor(repositoryContext: RepositoryContext, parent: VCViewModel.VersionControlViewModel, options?) {
        super(repositoryContext, parent, options);

        this.reviewer = options.reviewer;

        this.delegateReviewers = new ReviewerList(repositoryContext, parent, options.delegateReviewers);
        this.delegateReviewersDisplayName = "";

        if (options.delegateReviewers) {
            // Sort decending based on vote so that the lowest vote appears first.
            this.delegateReviewers.reviewers.sort((a, b) => { return a.reviewer.vote - b.reviewer.vote });
            this.delegateReviewersDisplayName = this.getDelegateReviewersDisplayName();
        }

        this.isImplicitReviewer = options.isImplicitReviewer || false;
        this.isDelegateReviewer = options.isDelegateReviewer || false;
        this.isRequiredReviewer = this.reviewer.isRequired || false;
        this.hasDelegateReviewers = this.delegateReviewers.reviewers.length > 0;

        this.isCurrentUser = this._computeIsCurrentUser();
        this.displayName = ReviewerViewModel.getDisplayName(this.reviewer);

        if (this.reviewer.vote) {
            switch (this.reviewer.vote) {
                case PullRequestVoteStatus.APPROVE:
                    this.isApproved = true;
                    this.voteText = VCResources.PullRequest_Approve;
                    break;
                case PullRequestVoteStatus.APPROVE_WITH_COMMENT:
                    this.isApproveWithComment = true;
                    this.voteText = VCResources.PullRequest_ApproveWithComment;
                    break;
                case PullRequestVoteStatus.NONE:
                    this.isAwaitingResponse = true;
                    break;
                case PullRequestVoteStatus.NOT_READY:
                    this.isNotReady = true;
                    this.voteText = VCResources.PullRequest_NotReady;
                    break;
                case PullRequestVoteStatus.REJECT:
                    this.isRejected = true;
                    this.voteText = VCResources.PullRequest_Reject;
                    break;

            }
        }
    }

    public static getDisplayName(reviewer: VCContracts.IdentityRefWithVote): string {
        if (reviewer.isContainer) {
            let lastBackSlash = reviewer.displayName.lastIndexOf('\\');
            if (lastBackSlash < 0) {
                lastBackSlash = reviewer.displayName.lastIndexOf('/');
            }

            if (lastBackSlash >= 0 && reviewer.displayName.length > lastBackSlash) {
                return reviewer.displayName.substring(lastBackSlash + 1);
            }
        }

        return reviewer.displayName;
    }

    private getDelegateReviewersDisplayName(): string {
        if (!this.delegateReviewers || this.delegateReviewers.reviewers.length === 0) {
            return;
        }

        if (this.delegateReviewers.reviewers.length === 1) {
            return this.delegateReviewers.reviewers[0].displayName;
        } else if (this.delegateReviewers.reviewers.length === 2) {
            return Utils_String.format(VCResources.PullRequest_DelegateReviewerTwoPeople, this.delegateReviewers.reviewers[0].displayName);
        } else if (this.delegateReviewers.reviewers.length > 2) {
            return Utils_String.format(VCResources.PullRequest_DelegateReviewerThreePlusPeople, this.delegateReviewers.reviewers[0].displayName, this.delegateReviewers.reviewers.length - 1);
        }

        return "";
    }

    private _computeIsAproved(): boolean {
        if (this.reviewer.vote && this.reviewer.vote > 0) {
            return true;
        }

        return false;
    }

    private _computeIsAwaitingResponse(): boolean {
        if (!this.reviewer.vote) {
            return true;
        }

        return false;
    }

    private _computeIsCurrentUser(): boolean {
        if (Utils_String.localeIgnoreCaseComparer(this.reviewer.id, this.repositoryContext.getTfsContext().currentIdentity.id) === 0) {
            return true;
        }

        return false;
    }
}

export class ReviewerList {
    public reviewers: ReviewerViewModel[];

    constructor(repositoryContext: RepositoryContext, parent: VCViewModel.VersionControlViewModel, reviewerList) {
        this.reviewers = new Array<ReviewerViewModel>();

        if (reviewerList) {
            $.each(reviewerList, (index, reviewer: VCContracts.IdentityRefWithVote) => {
                this.reviewers.push(new ReviewerViewModel(repositoryContext, parent, { reviewer: reviewer, isDelegateReviewer: true }));
            });
        }
    }

    private afterRender(element, data: ReviewerViewModel) {
        //Add reviewer identity picture
        let picContainer = $(element).find(".vc-pullrequest-reviewer-entry-user-image");
        IdentityImage.identityImageElement(data.repositoryContext.getTfsContext(), data.reviewer.id, null, 'small').appendTo(picContainer);
    }
}