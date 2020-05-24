import VCContracts = require("TFS/VersionControl/Contracts");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { PullRequestStatusState, PullRequestVoteStatus } from "VersionControl/Scripts/PullRequestTypes";

export interface IPullRequestRollupStatus {
    description: string;
    state: PullRequestStatusState;
    label?: string;
}

export function computeRollupStatus(pullRequest: VCContracts.GitPullRequest): IPullRequestRollupStatus {
    let status: IPullRequestRollupStatus = null;
    
    // Pull request status (completed, abandoned)
    if (pullRequest.status === VCContracts.PullRequestStatus.Completed) {        

        let label: string = null;
        let description: string = VCResources.PullRequest_Status_Completed;

        if (pullRequest.completionOptions && pullRequest.completionOptions.bypassPolicy) {
            label = VCResources.PullRequest_Status_Completed_Bypass;
            description = VCResources.PullRequest_Status_Completed_Bypass_Description;
            
        }
                
        status = {
            description: description,
            state: PullRequestStatusState.Success,
            label: label
        };        
    }
    else if (pullRequest.status === VCContracts.PullRequestStatus.Abandoned) {
        status = {
            description: VCResources.PullRequest_Status_Abandoned,
            state: PullRequestStatusState.Info,
        };
    }

    // merge status
    if (!status) {
        if (pullRequest.mergeStatus === VCContracts.PullRequestAsyncStatus.Conflicts) {
            status = {
                description: VCResources.PullRequest_RollupStatus_MergeConflicts_Description,
                state: PullRequestStatusState.Failure,
                label: VCResources.PullRequest_RollupStatus_MergeConflicts
            };
        }
        else if (pullRequest.mergeStatus === VCContracts.PullRequestAsyncStatus.Failure ||
            pullRequest.mergeStatus === VCContracts.PullRequestAsyncStatus.RejectedByPolicy) {
            status = {
                description: VCResources.PullRequest_RollupStatus_MergeFailure,
                state: PullRequestStatusState.Failure,
            };
        }
    }

    // Reviewer status
    if (!status) {
            
        // Get the minumum vote:
        if (pullRequest.reviewers && pullRequest.reviewers.length > 0) {

            let minVote: PullRequestVoteStatus = PullRequestVoteStatus.NONE;
            let allRequiredApproved: boolean = true;

            for (let i = 0, len = pullRequest.reviewers.length; i < len; i++) {
                const voter = pullRequest.reviewers[i];

                if (voter.isRequired && voter.vote <= 0) {
                    allRequiredApproved = false;
                }

                if (voter.vote !== 0 &&
                    (minVote === PullRequestVoteStatus.NONE || voter.vote < minVote)) {
                    minVote = voter.vote;
                }
            }

            minVote = allRequiredApproved ? minVote : Math.min(minVote, PullRequestVoteStatus.NONE);

            if (minVote === PullRequestVoteStatus.REJECT) {
                status = {
                    description: VCResources.PullRequest_Reviewers_Rejected,
                    state: PullRequestStatusState.Failure,
                };
            }
            else if (minVote === PullRequestVoteStatus.NOT_READY) {
                status = {
                    description: VCResources.PullRequest_Reviewers_Waiting,
                    state: PullRequestStatusState.Waiting,
                };
            }
            else if (minVote === PullRequestVoteStatus.APPROVE_WITH_COMMENT || minVote === PullRequestVoteStatus.APPROVE) {
                status = {
                    description: VCResources.PullRequest_Reviewers_Approved,
                    state: PullRequestStatusState.Success,
                };
            }
        }
    }

    return status;
}

export function rollupStatusToCssClass(rollupStatus: IPullRequestRollupStatus) : string {
    if (rollupStatus) {
        switch (rollupStatus.state) {
            case PullRequestStatusState.Success:
                return "vc-pullrequest-rollupstatus-success-text";
            case PullRequestStatusState.Pending:
                return "vc-pullrequest-rollupstatus-pending-text";
            case PullRequestStatusState.Failure:
                return "vc-pullrequest-rollupstatus-failure-text";
            case PullRequestStatusState.Waiting:
                return "vc-pullrequest-rollupstatus-waiting-text";
            case PullRequestStatusState.Info:
                return "vc-pullrequest-rollupstatus-info-text";
        }
    }

    return null;
}

export function rollupStatusToIconCssClass(rollupStatus: IPullRequestRollupStatus): string {
    if (rollupStatus) {
        switch (rollupStatus.state) {
            case PullRequestStatusState.Success:
                return "bowtie-icon bowtie-status-success vc-pullrequest-rollupstatus-success";
            case PullRequestStatusState.Pending:
                return "bowtie-icon bowtie-math-minus-circle vc-pullrequest-rollupstatus-pending";
            case PullRequestStatusState.Failure:
                return "bowtie-icon bowtie-status-failure vc-pullrequest-rollupstatus-failure";
            case PullRequestStatusState.Waiting:
                return "bowtie-icon bowtie-status-waiting vc-pullrequest-rollupstatus-waiting";
            case PullRequestStatusState.Info:
                return "vc-pr-no-icon";
        }
    }

    return null;
}
