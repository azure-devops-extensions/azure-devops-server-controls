import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RemoteStore } from "VSS/Flux/Store";
import VCContracts = require("TFS/VersionControl/Contracts");

/**
 * Commits included in a Pull Request
 */
export class PullRequestCommitsStore extends RemoteStore {

    private _commits: VCContracts.GitCommitRef[] = [];

    private _isUpdating: boolean = false;
    private _pullRequestId: number = -1;

    public onCommitsUpdated = (payload: Actions.ICommitsUpdatedPayload): void => {
        this._commits = payload.commits;
        this._isUpdating = false;
        this._loading = false;
        this.emitChanged();
    }

    public onCommitsUpdating = (payload: Actions.ICommitsUpdatingPayload): void => {
        this._pullRequestId = payload.pullRequestId;
        this._isUpdating = true;
        this.emitChanged();
    }

    public onPullRequestError = (payload: Actions.IPullRequestUpdateErrorPayload): void => {
        if (this._isUpdating) {
            this._isUpdating = false;
            this._loading = !!this._commits; // if we already have commits then we aren't loading
            this.emitChanged();
        }
    }

    public getCommits(): VCContracts.GitCommitRef[] {
        return this._commits;
    }

    /**
     * We should only populate the store if it is loading and an update has not already started.
     */
    public shouldPopulate(): boolean {
        return this._loading && !this._isUpdating;
    }

    public getPullRequestId(): number {
        return this._pullRequestId;
    }
}
