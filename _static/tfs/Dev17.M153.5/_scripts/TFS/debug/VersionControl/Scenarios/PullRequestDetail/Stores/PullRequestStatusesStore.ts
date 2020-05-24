import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";

import { GitPullRequestStatus, GitStatusState } from "TFS/VersionControl/Contracts";
import { PullRequestPolicyEvaluation, StatusPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Contracts/PullRequestPolicyEvaluation";
import { PullRequestPolicyTypeIds } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

export interface PullRequestStatusesStoreState {
    statusPolicyMap: IDictionaryStringTo<StatusPolicyEvaluation>;
    statuses: GitPullRequestStatus[];
    lastIterationId: number;
    filteredStatuses: GitPullRequestStatus[];
}

export class PullRequestStatusesStore extends RemoteStore {

    public state: PullRequestStatusesStoreState;

    constructor() {
        super();
        this.state = {
            statuses: null,
            lastIterationId: -1,
            statusPolicyMap: null,
            filteredStatuses: [],
        };
    }

    @autobind
    public onPullRequestStatusesUpdated(payload: Actions.IPullRequestStatusUpdatedPayload): void {
        this.state = {
            ...this.state,
            statuses: payload.pullRequestStatuses.map(s => s.status),
        };

        this._tryComputeFilteredStatuses();
    }

    @autobind
    public onPolicyEvaluationsUpdated(pullRequestPolicyEvaluations: PullRequestPolicyEvaluation[], isPartialUpdate: boolean): void {
        this.state = {
            ...this.state,
            statusPolicyMap: this._getStatusPolicyMap(pullRequestPolicyEvaluations, isPartialUpdate),
        };

        this._tryComputeFilteredStatuses();
    }

    @autobind
    public onIterationsUpdated(payload: Actions.IIterationsUpdatedPayload): void {
        const lastIterationId = payload.iterations && payload.iterations.length > 0
            ? payload.iterations[payload.iterations.length - 1].id
            : -1;

        this.state = {
            ...this.state,
            lastIterationId,
        };

        this._tryComputeFilteredStatuses();
    }

    private _tryComputeFilteredStatuses() {
        if (this.state && this.state.statuses && this.state.statusPolicyMap && this.state.lastIterationId > 0) {
            // this.state.statuses contains latests statuses grouped by genre, name, and iteration

            // filter out all policy statuses because they will be shown in Policies section
            let filteredStatuses = this.state.statuses.filter(s => !this.state.statusPolicyMap[this._getKey(s)]);

            // filter out statuses posted on previous iterations, prefer iteration status over PR status
            const statusesMap: IDictionaryStringTo<GitPullRequestStatus> = {};
            filteredStatuses.forEach(s => {
                if (!s.iterationId || s.iterationId === this.state.lastIterationId) {
                    const key = this._getKey(s);
                    // not seen status or previous status didn't have iteration - replace
                    if (!statusesMap[key] || !statusesMap[key].iterationId) {
                        statusesMap[key] = s;
                    }
                }
            });
            filteredStatuses = Object.keys(statusesMap).map(key => statusesMap[key]);

            // filter out notApplicable statuses
            filteredStatuses = filteredStatuses.filter(s => s.state !== GitStatusState.NotApplicable);

            this.state = {
                ...this.state,
                filteredStatuses,
            };
            this._loading = false;

            this.emitChanged();
        }
    }

    private _getStatusPolicyMap(policyEvaluations: PullRequestPolicyEvaluation[], isPartial: boolean = false): IDictionaryStringTo<StatusPolicyEvaluation> {
        const statusPolicyMap = isPartial ? { ...this.state.statusPolicyMap } : {};

        policyEvaluations
            .filter(pe => pe.policyType.id === PullRequestPolicyTypeIds.StatusPolicy)
            .map(pe => pe as StatusPolicyEvaluation)
            .forEach(sp => statusPolicyMap[this._getKey(sp.latestStatus)] = sp);

        return statusPolicyMap;
    }

    private _getKey(status: GitPullRequestStatus): string {
        return `${status.context.genre}/${status.context.name}`;
    }
}