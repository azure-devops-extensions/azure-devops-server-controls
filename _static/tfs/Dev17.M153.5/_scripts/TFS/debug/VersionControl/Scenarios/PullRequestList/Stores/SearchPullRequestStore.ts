import * as VSSStore from "VSS/Flux/Store";

import { GitPullRequest } from "TFS/VersionControl/Contracts";

export interface SearchPullRequestState {
    status: "none" | "searching" | "found" | "error";
    pullRequest?: GitPullRequest;
}

export class SearchPullRequestStore extends VSSStore.Store {
    public state = {
        status: "none",
    } as SearchPullRequestState;

    public startSearch = (): void => {
        this.setState({
            status: "searching",
        });
    }

    public findPullRequest = (pullRequest: GitPullRequest): void => {
        this.setState({
            status: "found",
            pullRequest,
        });
    }

    public failSearch = (): void => {
        this.setState({
            status: "error",
        });
    }

    public getState(): Readonly<SearchPullRequestState> {
        return this.state;
    }

    private setState(newState: SearchPullRequestState) {
        this.state = newState;

        this.emitChanged();
    }
}
