import * as VSSStore from "VSS/Flux/Store";
import { ActionsHub, BranchStats, PullRequestStats } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";

/**
 * A store containing Branch related data associated with a commit
 */
export class BranchStatsStore extends VSSStore.RemoteStore {
    private _state: BranchStats;

    constructor(
        private _actionsHub: ActionsHub) {
        super();

        this._actionsHub.branchStatsLoaded.addListener(this._branchStatsLoaded);
        this._actionsHub.pullRequestForBranchLoaded.addListener(this._pullRequestForBranchLoaded);
    }

    public get state(): BranchStats {
        return this._state;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.branchStatsLoaded.removeListener(this._branchStatsLoaded);
            this._actionsHub.pullRequestForBranchLoaded.removeListener(this._pullRequestForBranchLoaded);
            this._actionsHub = null;
        }

        this._state = null;
    }

    private _branchStatsLoaded = (branchStats: BranchStats): void => {
        if (branchStats) {
            if (!this._state) {
                this._state = branchStats;
            } else {
                this._state.name = branchStats.name;
                this._state.url = branchStats.url;
            }
        }
        this._loading = false;
        this.emitChanged();
    }

    private _pullRequestForBranchLoaded = (prStats: PullRequestStats): void => {
        if (prStats) {
            if (!this._state) {
                this._state = { name: null, url: null, associatedPRStats: prStats } as BranchStats;
            } else {
                this._state.associatedPRStats = prStats;
            }
            this.emitChanged();
        }
    }

}
