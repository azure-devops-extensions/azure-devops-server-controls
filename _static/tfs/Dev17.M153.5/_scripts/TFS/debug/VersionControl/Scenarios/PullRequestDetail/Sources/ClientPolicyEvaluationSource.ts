import * as Q from "q";

import { PullRequestPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Contracts/PullRequestPolicyEvaluation";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { PolicyClientService } from "Policy/Scripts/TFS.Policy.ClientServices";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

export class ClientPolicyEvaluationSource {

    private _gitClientService: GitClientService;
    private _policyClientService: PolicyClientService;

    constructor(private _repositoryContext: GitRepositoryContext) {
        this._gitClientService = _repositoryContext.getClient() as GitClientService;
        this._policyClientService = ProjectCollection.getDefaultConnection().getService(PolicyClientService);
    }

    public queryPolicyEvaluationsAsync(pullRequestId: number): IPromise<PullRequestPolicyEvaluation[]> {
        return Q.Promise<PullRequestPolicyEvaluation[]>((resolve, reject) =>
            this._gitClientService.beginGetPullRequestPolicyEvaluations(
                this._repositoryContext,
                pullRequestId,
                (policyEvaluations) => this._resolvePolicyEvaluations(policyEvaluations, resolve, reject),
                reject));
    }

    public queryPolicyEvaluationsByIdsAsync(pullRequestId: number, evaluationIds: string[]): IPromise<PullRequestPolicyEvaluation[]> {
        return Q.Promise<PullRequestPolicyEvaluation[]>((resolve, reject) =>
            this._gitClientService.beginGetPullRequestPolicyEvaluationsByIds(
                this._repositoryContext,
                pullRequestId,
                evaluationIds,
                (policyEvaluations) => this._resolvePolicyEvaluations(policyEvaluations, resolve, reject),
                reject));
    }

    public requeuePolicyEvaluation(pullRequestId: number, evaluationId: string): IPromise<PullRequestPolicyEvaluation> {
        return Q.Promise<PullRequestPolicyEvaluation>((resolve, reject) => {
            this._policyClientService.beginRequeuePolicyEvaluation(
                this._repositoryContext.getProjectId(),
                evaluationId,
                null,
                () => this.queryPolicyEvaluationsByIdsAsync(pullRequestId, [evaluationId])
                    .then(evaluations => resolve(evaluations && evaluations[0]))
                    .then(null, reject),
                reject
            );
        });
    }

    private _resolvePolicyEvaluations(
        policyEvaluations: PullRequestPolicyEvaluation[],
        resolve: (policyEvaluations: PullRequestPolicyEvaluation[]) => void,
        reject: (error: Error) => void ) {

        if (policyEvaluations && policyEvaluations instanceof Array) {
            resolve(policyEvaluations);
        }
        else {
            reject(new Error(VCResources.PullRequest_Policy_FailedToLoad));
        }
    }
}
