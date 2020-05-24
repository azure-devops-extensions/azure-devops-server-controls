import Utils_String = require("VSS/Utils/String");

import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RemoteStore } from "VSS/Flux/Store";

// contracts
import VCContracts = require("TFS/VersionControl/Contracts");

/**
 * Conflicts for this pull request's merge.
 *
 * The current design pulls in only the first 51 conflict records, even if there are thousands. The UI only
 * displays up to 50 records and bails out if there are too many. This is because sometimes wacky merges will
 * have thousands of conflicts (or even more).
 */

export class ConflictStore extends RemoteStore {

    private _conflictsLoading: boolean = true;
    private _pullRequestLoading: boolean = true;

    private _lastMergeSourceCommitId: string;
    private _lastMergeTargetCommitId: string;
    private _pullRequestHasConflicts: boolean = false;
    private _conflicts: VCContracts.GitConflict[] = [];
    private _overflow: boolean = false;
    private _excludeResolved: boolean = false;
    private _onlyResolved: boolean = false;

    public onConflictsUpdated = (payload: Actions.IConflictsUpdatedPayload): void => {
        this._lastMergeSourceCommitId = payload.lastMergeSourceCommit.commitId;
        this._lastMergeTargetCommitId = payload.lastMergeTargetCommit.commitId;
        this._conflicts = payload.conflicts;
        this._overflow = payload.overflow;
        this._excludeResolved = payload.excludeResolved;
        this._onlyResolved = payload.onlyResolved;

        this._conflictsLoading = false;
        this._loading = this._pullRequestLoading;

        this.emitChanged();
    }

    public onPullRequestUpdated = (payload: Actions.IPullRequestUpdatedPayload) => {
        const hasConflicts = !!(
            payload.pullRequest
            && (payload.pullRequest.mergeStatus == VCContracts.PullRequestAsyncStatus.Conflicts)
        );

        this._pullRequestHasConflicts = hasConflicts;

        this._pullRequestLoading = false;
        this._loading = this._conflictsLoading;

        this.emitChanged();
    }

    public getConflicts(): VCContracts.GitConflict[] {
        return this._conflicts;
    }

    public getOverflow(): boolean {
        return this._overflow;
    }

    public has2ndOrderConlicts(): boolean {
        return this._pullRequestHasConflicts && !this._overflow && this._conflicts.length < 1;
    }

    // When PR details are reloaded, decide whether the conflict records also need to be reloaded
    public shouldReloadConflicts(pullRequest: VCContracts.GitPullRequest): boolean {
        if (pullRequest
            && pullRequest.mergeStatus === VCContracts.PullRequestAsyncStatus.Conflicts
            && pullRequest.lastMergeSourceCommit
            && pullRequest.lastMergeTargetCommit
        ) {
            if (pullRequest.lastMergeSourceCommit.commitId !== this._lastMergeSourceCommitId
                || pullRequest.lastMergeTargetCommit.commitId !== this._lastMergeTargetCommitId
            ) {
                return true;
            }
        }

        return false;
    }
}
