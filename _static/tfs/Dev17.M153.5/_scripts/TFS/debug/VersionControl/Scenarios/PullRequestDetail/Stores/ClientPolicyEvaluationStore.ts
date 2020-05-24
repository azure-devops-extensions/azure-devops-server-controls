import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";

import { PolicyEvaluationStatus } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { GitPullRequest } from "TFS/VersionControl/Contracts";
import { PullRequestPolicyEvaluation, MergeStrategyPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Contracts/PullRequestPolicyEvaluation";
import { ClientPolicyEvaluation, PullRequestPolicyTypeIds } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import { ClientPolicyEvaluationAdapter } from "VersionControl/Scenarios/PullRequestDetail/Policy/PolicyEvaluationAdapters";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Utils_String from "VSS/Utils/String";

export interface ISquashPolicySetting {
    isEnabled: boolean;
    useSquashMerge: boolean;
    reason: string;
}

export interface ClientPolicyEvaluationStoreState {
    clientPolicyEvaluations: ClientPolicyEvaluation[];
    mergePolicySetting: ISquashPolicySetting;
    hasRejectedBlockingPolicies: boolean;
    pullRequestPolicyEvaluations: PullRequestPolicyEvaluation[];
    pullRequest: GitPullRequest;
    updateFailedMessage?: string;
}

export class ClientPolicyEvaluationStore extends RemoteStore {
    public state: ClientPolicyEvaluationStoreState;

    private _policyEvaluationAdapter: ClientPolicyEvaluationAdapter;

    constructor() {
        super();

        this.state = {
            pullRequestPolicyEvaluations: null,
            pullRequest: null,
            hasRejectedBlockingPolicies: null,
            clientPolicyEvaluations: [],
            mergePolicySetting: {
                isEnabled: false,
                useSquashMerge: null,
                reason: null,
            }
        };

        this._policyEvaluationAdapter = new ClientPolicyEvaluationAdapter();
    }

    @autobind
    public onPolicyEvaluationsUpdated(pullRequestPolicyEvaluations: PullRequestPolicyEvaluation[]): void {
        this.state = {
            ...this.state,
            pullRequestPolicyEvaluations,
        };
        this.tryUpdateClientPolicies();
    }

    @autobind
    public onPolicyEvaluationsPartiallyUpdated(updatedPolicyEvaluations: PullRequestPolicyEvaluation[]): void {
        const updatedEvaluations = this.state.pullRequestPolicyEvaluations
            .filter(pe => !updatedPolicyEvaluations.some(up => up.evaluationId === pe.evaluationId));

        updatedEvaluations.push(...updatedPolicyEvaluations);

        this.state = {
            ...this.state,
            pullRequestPolicyEvaluations: updatedEvaluations,
        };
        this.tryUpdateClientPolicies();
    }

    @autobind
    public onPullRequestUpdated(pullRequest: GitPullRequest): void {
        this.state = {
            ...this.state,
            pullRequest,
        };
        this.tryUpdateClientPolicies();
    }

    @autobind
    public onDynamicPolicyEvaluation(): void {
        if (!this.isLoading()) {
            const updatedPolicyEvaluations = this._policyEvaluationAdapter.dynamicUpdate(this.state.clientPolicyEvaluations);
            const hasRejectedBlockingPolicies = updatedPolicyEvaluations
                .some(p => p.policyEvaluation.isBlocking && p.policyEvaluation.status !== PolicyEvaluationStatus.Approved);

            this.state = {
                ...this.state,
                clientPolicyEvaluations: updatedPolicyEvaluations,
                hasRejectedBlockingPolicies,
            };

            this.emitChanged();
        }
    }

    public onPolicyEvaluationsUpdateFailed = (error: Error): void => {
        this.state.updateFailedMessage = error && error.message;
        this._loading = false;
        this.emitChanged();
    }

    @autobind
    public onPullRequestTargetChanged(): void {
        // if the pr target changed, we need to restart the policy eval store
        // clear out all existing evaluations and put the store back into a loading state until evaluations are updated
        this.state = {
            ...this.state,
            pullRequestPolicyEvaluations: [],
        };
        this._loading = true;
        this.emitChanged();
    }

    private tryUpdateClientPolicies(): void {
        if (this.state.pullRequest && this.state.pullRequestPolicyEvaluations) {

            let clientPolicyEvaluations = this._policyEvaluationAdapter.adapt(
                this.state.pullRequestPolicyEvaluations,
                {
                    pullRequest: this.state.pullRequest,
                });

            clientPolicyEvaluations = clientPolicyEvaluations.sort((a, b) => {
                // Sort by priority, then by displayName for equal priorities
                return (b.displayPriority - a.displayPriority)
                    || Utils_String.localeIgnoreCaseComparer(
                        a.policyEvaluation.policyType.displayName,
                        b.policyEvaluation.policyType.displayName);
            });

            const mergePolicySetting = this._getMergePolicySettings(clientPolicyEvaluations);
            clientPolicyEvaluations = clientPolicyEvaluations.filter(p => p.isVisible);
            const hasRejectedBlockingPolicies = clientPolicyEvaluations
                .some(p => p.policyEvaluation.isBlocking && p.policyEvaluation.status !== PolicyEvaluationStatus.Approved);

            this.state = {
                ...this.state,
                clientPolicyEvaluations,
                hasRejectedBlockingPolicies,
                mergePolicySetting,
            };

            this._loading = false;
            this.emitChanged();
        }
    }

    private _getMergePolicySettings(clientPolicyEvaluations: ClientPolicyEvaluation[]): ISquashPolicySetting {
        const mergeSettings: ISquashPolicySetting = {
            isEnabled: false,
            reason: null,
            useSquashMerge: null,
        };

        const mergePolicyEvaluations = clientPolicyEvaluations
            .filter(evaluation => evaluation.policyEvaluation.policyType.id === PullRequestPolicyTypeIds.MergeStrategyPolicy);

        if (mergePolicyEvaluations.length > 0) {
            const mergePolicyEvaluation = mergePolicyEvaluations[0].policyEvaluation as MergeStrategyPolicyEvaluation;
            mergeSettings.isEnabled = true;
            mergeSettings.useSquashMerge = mergePolicyEvaluation.useSquashMerge;
            mergeSettings.reason = mergePolicyEvaluation.useSquashMerge
                ? VCResources.PullRequest_PolicyMergeStrategySquashRequired
                : VCResources.PullRequest_PolicyMergeStrategySquashForbidden;
        }

        return mergeSettings;
    }
}
