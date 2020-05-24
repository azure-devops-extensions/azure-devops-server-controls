import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { IPolicyActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IPolicyActionCreator";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";

export class PullRequestClientPoliciesActionCreator implements IPolicyActionCreator {

    constructor(
        private _actionsHub: ActionsHub,
        private _sourcesHub: SourcesHub,
        private _storesHub: StoresHub,
        private _pullRequestId: number) {
    }

    public queryPolicyEvaluations(): void {
        this._sourcesHub.clientPolicyEvaluationSource.queryPolicyEvaluationsAsync(this._pullRequestId)
            .then(evaluations => {
                if (evaluations) {
                    this._actionsHub.clientPolicyEvaluationsUpdated.invoke(evaluations);
                }
            })
            .then(null, this._raiseError);
    }

    public queryPolicyEvaluationsByType(policyTypeId: string): void {
        if (this._storesHub.clientPolicyEvaluationStore.isLoading()) {
            return;
        }

        const policiesToUpdate = this._storesHub.clientPolicyEvaluationStore.state.pullRequestPolicyEvaluations
            .filter(pe => pe.policyType.id === policyTypeId)
            .map(pe => pe.evaluationId);

        if (policiesToUpdate.length > 0) {
            this._sourcesHub.clientPolicyEvaluationSource.queryPolicyEvaluationsByIdsAsync(this._pullRequestId, policiesToUpdate)
                .then(evaluations => {
                    if (evaluations) {
                        this._actionsHub.clientPolicyEvaluationsPartiallyUpdated.invoke(evaluations);
                    }
                })
                .then(null, this._raiseError);
        }
    }

    public queryPolicyEvaluation(evaluationId: string): void {
        this._sourcesHub.clientPolicyEvaluationSource.queryPolicyEvaluationsByIdsAsync(this._pullRequestId, [evaluationId])
            .then(evaluations => {
                if (evaluations) {
                    this._actionsHub.clientPolicyEvaluationsPartiallyUpdated.invoke(evaluations);
                }
            })
            .then(null, this._raiseError);
    }

    public requeuePolicyEvaluation(evaluationId: string): void {
        this._sourcesHub.clientPolicyEvaluationSource.requeuePolicyEvaluation(this._pullRequestId, evaluationId)
            .then(evaluation => {
                if (evaluation) {
                    this._actionsHub.clientPolicyEvaluationsPartiallyUpdated.invoke([evaluation]);
                }
            })
            .then(null, this._raiseError);
    }

    public updateDynamicPolicies(): void {
        if (this._storesHub.clientPolicyEvaluationStore.isLoading()) {
            return;
        }

        this._actionsHub.dynamicClientPolicyUpdateRequested.invoke(null);
    }

    public dispose() { }

    private _raiseError = (error: Error): void => {
        this._actionsHub.clientPolicyEvaluationsUpdateFailed.invoke(error);
        this._actionsHub.raiseError.invoke(error);
    }
}
