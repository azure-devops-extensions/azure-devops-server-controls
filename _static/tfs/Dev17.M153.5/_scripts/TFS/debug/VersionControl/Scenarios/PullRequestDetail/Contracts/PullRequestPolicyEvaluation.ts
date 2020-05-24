import * as PolicyContracts from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import * as VCContracts from "TFS/VersionControl/Contracts";

export interface PullRequestPolicyEvaluation {
    evaluationId: string;
    configurationId: number;
    policyType: PolicyContracts.PolicyTypeRef;
    status?: PolicyContracts.PolicyEvaluationStatus;
    isBlocking: boolean;
    displayName: string;
    displayText: string;
    displayStatus: PolicyContracts.PolicyEvaluationStatus;
}

export interface ApproverCountPolicyEvaluation extends PullRequestPolicyEvaluation {
    minimumApproverCount: number;
    creatorVoteCounts: boolean;
}

export interface RequiredReviewersPolicyEvaluation extends PullRequestPolicyEvaluation {
    requiredReviewerIds: string[];
}

export interface BuildPolicyEvaluation extends PullRequestPolicyEvaluation {
    buildId: number;
    validBuildExists: boolean;
    buildIsExpired: boolean;
    expirationDate: Date;
    serverWillQueueBuild: boolean;
    manualQueueOnly: boolean;
}

export interface StatusPolicyEvaluation extends PullRequestPolicyEvaluation {
    latestStatus: VCContracts.GitPullRequestStatus;
}

export interface MergeStrategyPolicyEvaluation extends PullRequestPolicyEvaluation {
    useSquashMerge: boolean;
}
