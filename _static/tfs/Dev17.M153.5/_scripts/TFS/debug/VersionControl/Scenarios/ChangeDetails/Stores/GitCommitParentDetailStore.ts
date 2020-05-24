import { RemoteStore } from "VSS/Flux/Store";
import { GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";

export class GitCommitParentDetailStore extends RemoteStore {
    private _parentGitCommits: GitCommit[];

    constructor(private _actionsHub: ActionsHub) {
        super();

        this._actionsHub.gitCommitParentDetailsLoaded.addListener(this._onGitCommitParentDetailsLoaded);
    }

    /**
     * Returns structures containing metadata (Author, Comment, Dates, etc.) of parent commit ids
     */
    public get parentGitCommits(): GitCommit[] {
        return this._parentGitCommits;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.gitCommitParentDetailsLoaded.removeListener(this._onGitCommitParentDetailsLoaded);
            this._actionsHub = null;
        }

        this._parentGitCommits = null;
    }

    private _onGitCommitParentDetailsLoaded = (parentGitCommits: GitCommit[]): void => {
        this._parentGitCommits = parentGitCommits;

        this._loading = false;
        this.emitChanged();
    }
}
