import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RemoteStore } from "VSS/Flux/Store";
import VCContracts = require("TFS/VersionControl/Contracts");

/**
 * Iterations of a Pull Request
 */
export class PullRequestIterationsStore extends RemoteStore {

    private _iterations: VCContracts.GitPullRequestIteration[] = [];

    private _isUpdating: boolean = false;
    private _pullRequestId: number = -1;

    public onIterationsUpdated = (payload: Actions.IIterationsUpdatedPayload): void => {
        this._iterations = payload.iterations;
        this._isUpdating = false;
        this._loading = false;
        this.emitChanged();
    }

    public onIterationsUpdating = (payload: Actions.IIterationsUpdatingPayload): void => {
        this._pullRequestId = payload.pullRequestId;
        this._isUpdating = true;
        this.emitChanged();
    }

    public getIterations(): VCContracts.GitPullRequestIteration[] {
        return this._iterations;
    }

    public isUpdating(): boolean {
        return this._isUpdating;
    }

    public getPullRequestId(): number {
        return this._pullRequestId;
    }
}
