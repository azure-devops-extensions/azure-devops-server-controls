import { BaseClientPolicyAdapter, ClientPolicyAdapterContext } from "VersionControl/Scenarios/PullRequestDetail/Policy/BaseClientPolicyAdapter";

import { BuildLinks } from "Build.Common/Scripts/Linking";
import { PolicyEvaluationStatus } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { PullRequestAsyncStatus, PullRequestStatus } from "TFS/VersionControl/Contracts";
import { PullRequestPolicyEvaluation, ApproverCountPolicyEvaluation,
    BuildPolicyEvaluation, StatusPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Contracts/PullRequestPolicyEvaluation";
import { ClientPolicyEvaluation, ClientPolicyAction, PullRequestPolicyTypeIds } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import { PolicyActions } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

export class ClientPolicyEvaluationAdapter {
    protected adapters: BaseClientPolicyAdapter[] = [
        new WorkItemPolicyAdapter(),
        new ApproverCountPolicyAdapter(),
        new CommentRequirementsPolicyAdapter(),
        new RequiredReviewersPolicyAdapter(),
        new BuildPolicyAdapter(),
        new StatusPolicyAdapter(),
        new MergeStrategyPolicyAdapter(),
    ];

    public adapt(evaluations: PullRequestPolicyEvaluation[], context: ClientPolicyAdapterContext): ClientPolicyEvaluation[] {
        const clientPolicies = [];
        this.adapters.forEach(adapter => {
            const policies = adapter.adapt(evaluations, context);
            clientPolicies.push(...policies);
        });

        return clientPolicies;
    }

    public dynamicUpdate(clientPolicyEvaluation: ClientPolicyEvaluation[]): ClientPolicyEvaluation[] {
        const clientPolicies = [];

        clientPolicyEvaluation.forEach(clientPolicy => {
            let updatedClientPolicy = clientPolicy;

            if (clientPolicy.hasDynamicStatus) {
                const adapter = this.adapters.find(x => x.policyTypeId === clientPolicy.policyEvaluation.policyType.id);
                if (adapter) {
                    updatedClientPolicy = adapter.dynamicUpdate(clientPolicy);
                }
            }

            clientPolicies.push(updatedClientPolicy);
        });

        return clientPolicies;
    }
}

export class ApproverCountPolicyAdapter extends BaseClientPolicyAdapter {
    constructor() {
        super();
        this._policyType = PullRequestPolicyTypeIds.ApproverCountPolicy;
        this._isVisible = true;
        this._displayPriority = 1000;
    }

    public summarize(policyEvaluations: PullRequestPolicyEvaluation[]): PullRequestPolicyEvaluation[] {
        // Show just the strictest approver count policy. This way the user never thinks "I need one more vote" only to find out
        // they still need 2 more after they get one vote.

        // Policies which are rejected always take precedence over other policies
        let approverCountPolicies = policyEvaluations.filter(pe => pe.status === PolicyEvaluationStatus.Rejected);

        // Policies which are neither approved nor rejected take precedence over passing policies
        if (approverCountPolicies.length < 1) {
            approverCountPolicies = policyEvaluations.filter(pe => pe.status !== PolicyEvaluationStatus.Approved);
        }

        // Passing policies are lowest precedence; this way we only display "approved" status if all policies are passing
        if (approverCountPolicies.length < 1) {
            approverCountPolicies = policyEvaluations.filter(pe => pe.status === PolicyEvaluationStatus.Approved);
        }

        // Define the "strictness" of an Approver policy as follows: (minApprovers - (creatorVoteCounts ? 0.5 : 0)).
        // This means that "4 approvers, creator vote doesn't count" is purely stricter than "4 approvers, creator vote counts",
        // which is purely stricter than "3 approvers, creator vote doesn't count", etc.

        let returnPolicy: PullRequestPolicyEvaluation = null;
        let maxStrictness = -1;

        approverCountPolicies.forEach(policy => {
            const evaluation = policy as ApproverCountPolicyEvaluation;
            const minApprovers: number = evaluation.minimumApproverCount || 0;
            const creatorVoteCounts: boolean = Boolean(evaluation.creatorVoteCounts);

            const strictness = minApprovers - (creatorVoteCounts ? 0.5 : 0);

            if (strictness > maxStrictness) {
                returnPolicy = policy;
                maxStrictness = strictness;
            }
        });

        return returnPolicy ? [returnPolicy] : [];
    }
}

export class BuildPolicyAdapter extends BaseClientPolicyAdapter {
    constructor() {
        super();
        this._policyType = PullRequestPolicyTypeIds.BuildPolicy;
        this._isVisible = true;
    }

    public summarize(policyEvaluations: PullRequestPolicyEvaluation[]): PullRequestPolicyEvaluation[] {
        // display all build policies
        return policyEvaluations;
    }

    public convert(policyEvaluation: PullRequestPolicyEvaluation, context: ClientPolicyAdapterContext): ClientPolicyEvaluation {
        const buildEvaluation = policyEvaluation as BuildPolicyEvaluation;
        const buildUrl = buildEvaluation.buildId > 0 ? BuildLinks.getBuildDetailLink(buildEvaluation.buildId) : null;

        const clientEvaluaiton: ClientPolicyEvaluation = {
            ...super.convert(policyEvaluation, context),
            displayPriority: buildEvaluation.manualQueueOnly ? -1050 : -1000,
            displayUrl: buildUrl,
            displayUrlHubId: CodeHubContributionIds.newBuildEditorContributionId,
            actions: this._getBuildActions(buildEvaluation, context),
        };

        return this._fillInDetails(clientEvaluaiton);
    }

    public dynamicUpdate(clientEvaluaiton: ClientPolicyEvaluation): ClientPolicyEvaluation {
       const updatedClientPolicy = { ...clientEvaluaiton };
       return this._fillInDetails(updatedClientPolicy);
    }

    private _fillInDetails(clientEvaluaiton: ClientPolicyEvaluation): ClientPolicyEvaluation {
        const buildEvaluation = clientEvaluaiton.policyEvaluation as BuildPolicyEvaluation;

        if (buildEvaluation.expirationDate && buildEvaluation.status === PolicyEvaluationStatus.Approved) {
            const expiresInMillisecs = buildEvaluation.expirationDate.getTime() - new Date().getTime();

            clientEvaluaiton.policyEvaluation.displayText = this._getDisplayText(buildEvaluation, expiresInMillisecs);
            clientEvaluaiton.policyEvaluation.status = expiresInMillisecs > 0 ? PolicyEvaluationStatus.Approved : PolicyEvaluationStatus.Rejected;
            clientEvaluaiton.policyEvaluation.displayStatus = expiresInMillisecs > 0 ? PolicyEvaluationStatus.Approved : PolicyEvaluationStatus.Rejected;
        }

        // check if build is expiring
        clientEvaluaiton.hasDynamicStatus = buildEvaluation.expirationDate && clientEvaluaiton.policyEvaluation.displayStatus === PolicyEvaluationStatus.Approved;

        return clientEvaluaiton;
    }

    private _getDisplayText(buildEvaluation: BuildPolicyEvaluation, expiresInMillisecs: number): string {
        // If a valid build exists which is currently counting down towards expiration, tell the user how long they have
        if (expiresInMillisecs > 0) {
            if (expiresInMillisecs >= (2 * Utils_Date.MILLISECONDS_IN_DAY)) {
                // [ >48 hrs ] --> "Build expires in 3 days"
                const days = Math.ceil(expiresInMillisecs / Utils_Date.MILLISECONDS_IN_DAY);
                return Utils_String.format(VCResources.PullRequest_Policy_BuildPolicyExpiresInDays, buildEvaluation.displayName, days);
            }
            else if (expiresInMillisecs >= (10 * Utils_Date.MILLISECONDS_IN_HOUR)) {
                // [ >10 hrs ] --> "Build expires in 14 hours"
                const hrs = Math.ceil(expiresInMillisecs / Utils_Date.MILLISECONDS_IN_HOUR);
                return Utils_String.format(VCResources.PullRequest_Policy_BuildPolicyExpiresInHrs, buildEvaluation.displayName, hrs);
            }
            else if (expiresInMillisecs > (90 * Utils_Date.MILLISECONDS_IN_MINUTE)) {
                // [ >90 mins ] --> "Build expires in 2.6 hours"
                const hrs = Math.ceil((expiresInMillisecs / Utils_Date.MILLISECONDS_IN_HOUR) * 10) / 10;
                return Utils_String.format(VCResources.PullRequest_Policy_BuildPolicyExpiresInHrs, buildEvaluation.displayName, hrs);
            }
            else if (expiresInMillisecs > Utils_Date.MILLISECONDS_IN_MINUTE) {
                // [ >1 min ] --> "Build expires in 34 minutes"
                const mins = Math.ceil(expiresInMillisecs / Utils_Date.MILLISECONDS_IN_MINUTE);
                return Utils_String.format(VCResources.PullRequest_Policy_BuildPolicyExpiresInMins, buildEvaluation.displayName, mins);
            }
            else {
                // "Build expires in 1 minute"
                return Utils_String.format(VCResources.PullRequest_Policy_BuildPolicyExpiresIn1Min, buildEvaluation.displayName);
            }
        }
        else {
            return Utils_String.format(VCResources.PullRequest_Policy_BuildPolicyExpired, buildEvaluation.displayName);
        }
    }

    private _getBuildActions(buildEvaluation: BuildPolicyEvaluation, context: ClientPolicyAdapterContext): ClientPolicyAction[] {
        if (context.pullRequest.status !== PullRequestStatus.Active // Never queue a build for an inactive pull request
            || buildEvaluation.serverWillQueueBuild) { // Never queue a build if we know the build is already queued
            return null;
        }

        const buildId = buildEvaluation.buildId;

        if (buildId > 0 && !buildEvaluation.buildIsExpired) {
            if (buildEvaluation.status === PolicyEvaluationStatus.Running
                || buildEvaluation.status === PolicyEvaluationStatus.Queued) {
                // Build already in queue or running
                return null;
            }
        }

        return [{
            text: VCResources.PullRequest_PolicyActionQueueBuild,
            showText: true,
            icon: "bowtie-icon bowtie-build-queue-new",
            actionId: PolicyActions.POLICY_ACTION_REQUEUE_POLICY,
            actionArg: buildEvaluation.evaluationId,
        }];
    }
}

export class CommentRequirementsPolicyAdapter extends BaseClientPolicyAdapter {
    constructor() {
        super();
        this._policyType = PullRequestPolicyTypeIds.CommentRequirementsPolicy;
        this._isVisible = true;
        this._displayPriority = -500;
    }
}

export class MergeStrategyPolicyAdapter extends BaseClientPolicyAdapter {
    constructor() {
        super();
        this._policyType = PullRequestPolicyTypeIds.MergeStrategyPolicy;
        this._isVisible = false;
    }
}

export class RequiredReviewersPolicyAdapter extends BaseClientPolicyAdapter {
    constructor() {
        super();
        this._policyType = PullRequestPolicyTypeIds.RequiredReviewersPolicy;
        this._displayPriority = 900;
    }

    public convert(policyEvaluation: PullRequestPolicyEvaluation, context: ClientPolicyAdapterContext): ClientPolicyEvaluation {
        return {
            ...super.convert(policyEvaluation, context),
            isVisible: policyEvaluation.isBlocking,
        };
    }

    public summarize(policyEvaluations: PullRequestPolicyEvaluation[]): PullRequestPolicyEvaluation[] {
        // Roll up all Required Reviewer policies and report whether they are all satisfied, or some are not yet passing.
        const policyToDisplay = policyEvaluations
            // Non blocking Required Reviewer Policies are excluded from the UI:
            .filter(pe => pe.isBlocking)
            // If any blocking policies are !Approved, display that. If all are Approved, display one of them.
            .reduce((prev, curr) => (curr.status !== PolicyEvaluationStatus.Approved || !prev) ? curr : prev, null);

        return policyToDisplay ? [policyToDisplay] : [];
    }
}

export class StatusPolicyAdapter extends BaseClientPolicyAdapter {
    constructor() {
        super();
        this._policyType = PullRequestPolicyTypeIds.StatusPolicy;
        this._isVisible = true;
        this._displayPriority = -1500;
    }

    public convert(policyEvaluation: PullRequestPolicyEvaluation, context: ClientPolicyAdapterContext): ClientPolicyEvaluation {
        const statusEvaluation = policyEvaluation as StatusPolicyEvaluation;
        return {
            ...super.convert(policyEvaluation, context),
            displayUrl: statusEvaluation.latestStatus && statusEvaluation.latestStatus.targetUrl,
        };
    }

    public summarize(policyEvaluations: PullRequestPolicyEvaluation[]): PullRequestPolicyEvaluation[] {
        // display all status policies
        return policyEvaluations;
    }
}

export class WorkItemPolicyAdapter extends BaseClientPolicyAdapter {
    constructor() {
        super();
        this._policyType = PullRequestPolicyTypeIds.WorkItemLinkingPolicy;
        this._isVisible = true;
        this._displayPriority = 500;
    }
}
