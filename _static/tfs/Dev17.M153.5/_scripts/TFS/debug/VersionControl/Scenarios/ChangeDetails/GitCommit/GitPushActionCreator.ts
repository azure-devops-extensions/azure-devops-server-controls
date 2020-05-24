import { GitPush } from "TFS/VersionControl/Contracts";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { GitPushForCommitSource } from "VersionControl/Scenarios/ChangeDetails/Sources/GitPushForCommitSource";
import { GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

/**
 * Action Creator for Push information for a given commit
 */
export class GitPushActionCreator {

    constructor(
        private _actionsHub: ActionsHub,
        private _repositoryContext: RepositoryContext,
        private _pushSource?: GitPushForCommitSource) {
    }

    public loadPushByCommit(commit: GitCommit): void {
        this.pushSource.fetchGitPushFromId(commit.pushId).then(
            (push: GitPush) => {
                this._actionsHub.pusherLoaded.invoke(push.pushedBy);
            },
            (error: Error) => {
                this._actionsHub.errorRaised.invoke(error);
            });
    }

    private get pushSource(): GitPushForCommitSource {
        if (!this._pushSource) {
            this._pushSource = new GitPushForCommitSource(this._repositoryContext);
        }

        return this._pushSource;
    }
}
