import { PolicyEvaluationStatus } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { GitPullRequest } from "TFS/VersionControl/Contracts";
import { PullRequestPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Contracts/PullRequestPolicyEvaluation";
import { ClientPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";

export interface ClientPolicyAdapterContext {
    pullRequest: GitPullRequest;
}

export class BaseClientPolicyAdapter {
    protected _policyType: string;
    protected _isVisible: boolean = false;
    protected _displayPriority: number = 0;

    public get policyTypeId(): string { return this._policyType; }

    public adapt(policyEvaluations: PullRequestPolicyEvaluation[], context: ClientPolicyAdapterContext): ClientPolicyEvaluation[] {
        const evaluations = policyEvaluations.filter(pe => pe.policyType.id === this.policyTypeId && pe.status !== PolicyEvaluationStatus.NotApplicable);
        const summarized = this.summarize(evaluations);
        return summarized ? summarized.map(pe => this.convert(pe, context)) : [];
    }

    public summarize(policyEvaluations: PullRequestPolicyEvaluation[]): PullRequestPolicyEvaluation[] {
        // Prefer blocking policies over non-blocking
        let candidatePolicies = policyEvaluations.filter(pe => pe.isBlocking);

        if (candidatePolicies.length < 1) {
            candidatePolicies = policyEvaluations;
        }

        if (candidatePolicies.length > 0) {
            // Find highest-priority policy and display that one. Prefer "problem" (broken, rejected, waiting, etc) policies to ones which are passing
            const policyToDisplay: PullRequestPolicyEvaluation =
                candidatePolicies.find(pe => pe.status === PolicyEvaluationStatus.Broken)
                || candidatePolicies.find(pe => pe.status === PolicyEvaluationStatus.Rejected)
                || candidatePolicies.find(pe => pe.status === PolicyEvaluationStatus.Running)
                || candidatePolicies.find(pe => pe.status === PolicyEvaluationStatus.Queued)
                || candidatePolicies.find(pe => pe.status === PolicyEvaluationStatus.Approved)
                || candidatePolicies.find(pe => pe.status === PolicyEvaluationStatus.NotApplicable);

            if (policyToDisplay) {
                return [policyToDisplay];
            }
        }

        return [];
    }

    public convert(policyEvaluation: PullRequestPolicyEvaluation, context: ClientPolicyAdapterContext): ClientPolicyEvaluation {
        return {
            policyEvaluation,
            isVisible: this._isVisible,
            displayPriority: this._displayPriority,
        };
    }

    public dynamicUpdate(clientPolicyEvaluation: ClientPolicyEvaluation): ClientPolicyEvaluation {
        return clientPolicyEvaluation;
    }
}
