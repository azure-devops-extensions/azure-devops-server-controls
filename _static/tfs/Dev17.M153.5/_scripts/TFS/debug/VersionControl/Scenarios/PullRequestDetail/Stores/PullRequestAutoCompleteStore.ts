import { PolicyEvaluationStatus } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { AutoCompleteBlockingPolicy } from "VersionControl/Scenarios/PullRequestDetail/Contracts/AutoCompleteBlockingPolicy";
import { ClientPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RemoteStore } from "VSS/Flux/Store";
import { isEmptyGuid } from "VSS/Utils/String";

import { autobind } from "OfficeFabric/Utilities";

export interface AutoCompleteStoreState {
    blockingPolicies: AutoCompleteBlockingPolicy[];
    isAutoCompleteSet: boolean;
}

export class PullRequestAutoCompleteStore extends RemoteStore {

    private _state: AutoCompleteStoreState;
    public get state(): AutoCompleteStoreState {
        return this._state;
    }

    constructor() {
        super();

        this._state = {
            blockingPolicies: null,
            isAutoCompleteSet: null
        };
    }

    @autobind
    public autoCompleteCriteriaUpdated(payload: Actions.IAutoCompleteCriteriaUpdated) {
        this._state = {
            ...this._state,
            blockingPolicies: payload.blockingPolicies,
        };
        this._loading = this.loading();
        this.emitChanged();
    }

    @autobind
    public onPullRequestUpdated(payload: Actions.IPullRequestUpdatedPayload) {
        this._state = {
            ...this._state,
            isAutoCompleteSet: Boolean(payload.pullRequest.autoCompleteSetBy && !isEmptyGuid(payload.pullRequest.autoCompleteSetBy.id)),
        };

        this._loading = this.loading();
        this.emitChanged();
    }

    public getClientPolicyEvaluationsBlockingAutoComplete(clientPolicyEvaluations: ClientPolicyEvaluation[]): ClientPolicyEvaluation[] {
        if (!clientPolicyEvaluations || this.isLoading()) {
            return null;
        }

        return clientPolicyEvaluations
            // filter out Approved and NotApplicable evaluations to avoid inconsistent UX
            // after policy evaluation finished but autocomplete criteria is not yet reevaluated
            .filter(pe => pe && pe.policyEvaluation)
            .filter(pe => pe.policyEvaluation.status !== PolicyEvaluationStatus.Approved
                && pe.policyEvaluation.status !== PolicyEvaluationStatus.NotApplicable)
            .filter(pe => this.state.blockingPolicies.some(x => x.configurationId === pe.policyEvaluation.configurationId));
    }

    private loading(): boolean {
        return !this.state.blockingPolicies || this.state.isAutoCompleteSet === null;
    }
}
