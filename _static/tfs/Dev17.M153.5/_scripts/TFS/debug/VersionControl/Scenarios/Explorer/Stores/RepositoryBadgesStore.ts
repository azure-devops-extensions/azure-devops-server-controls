import * as VSSStore from  "VSS/Flux/Store";
import { GitRepositoryStats } from "TFS/VersionControl/Contracts";
import { CurrentRepositoryChangedPayload } from  "VersionControl/Scenarios/Explorer/ActionsHub";

export interface RepositoryBadgesState {
    omitStats: boolean;
    pullRequestsCount: number;
    branchesCount: number;
    commitsCount: number;
    pullRequestsUrl: string;
    branchesUrl: string;
    commitsUrl: string;
}

/**
 * A store containing the state of the repository stats.
 */
export class RepositoryBadgesStore extends VSSStore.Store {
    public state = {} as RepositoryBadgesState;

    public changeRepository = (payload: CurrentRepositoryChangedPayload): void => {
        this.state = {
            pullRequestsUrl: payload.pullRequestsUrl,
            branchesUrl: payload.branchesUrl,
            commitsUrl: payload.historyUrl,
            omitStats: true,
        } as RepositoryBadgesState;

        this.emitChanged();
    }

    public loadStats = (stats: GitRepositoryStats): void => {
        if (stats) {
            this.state.omitStats = false;

            this.state.commitsCount = stats.commitsCount;
            this.state.branchesCount = stats.branchesCount;
            this.state.pullRequestsCount = stats.activePullRequestsCount;
        } else {
            this.state.omitStats = true;
        }

        this.emitChanged();
    }
}
