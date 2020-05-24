import { ActionsHub, BranchStats } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { BranchSource } from "VersionControl/Scenarios/ChangeDetails/Sources/BranchSource";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

/**
 * Action Creator for branch information
 */
export class BranchActionCreator {

    constructor(
        private _actionsHub: ActionsHub,
        private _repositoryContext: RepositoryContext,
        private _branchSource?: BranchSource) {
    }

    /**
     * Loads branch information for the commit, and creates an action with BranchStats as payload.
     * @param branch The branch context we are in,
     * @param commitId The git commitId 
     */
    public loadBranchStats = (branch: string, commitId: string): void => {
        this.branchSource.getCommitInBranch(branch, commitId).then(
            (stats: BranchStats) => {
                this._actionsHub.branchStatsLoaded.invoke(stats);
            },
            (error: Error) => {
                this._actionsHub.errorRaised.invoke(error);
            });
    }

    private get branchSource(): BranchSource {
        if (!this._branchSource) {
            this._branchSource = new BranchSource(this._repositoryContext);
        }

        return this._branchSource;
    }

}
