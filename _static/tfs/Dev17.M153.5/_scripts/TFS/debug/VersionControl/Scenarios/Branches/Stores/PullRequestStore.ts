import {GitPullRequest} from "TFS/VersionControl/Contracts";
import BranchesActions = require("VersionControl/Scenarios/Branches/Actions/BranchesActions");
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/DictionaryStore";

//TODO Add Unit tests to ensure this actually works...

export class PullRequestKeyValueAdapater extends ActionAdapter<GitPullRequest> {
    constructor() {
        super();
        BranchesActions.InitializeGitPullRequest.addListener(this._onInitializeMyBranches);
    }

    private _onInitializeMyBranches = (payload: GitPullRequest[]) => {
        this.itemsAdded.invoke(payload);
    }

    public dispose(): void {
        BranchesActions.InitializeGitPullRequest.removeListener(this._onInitializeMyBranches);
        super.dispose();
    }
}

/**
 * Does a deep comparison on two refs.
 */
export function isEqual(x: GitPullRequest, y: GitPullRequest): boolean {
    return x.pullRequestId == y.pullRequestId;
}
