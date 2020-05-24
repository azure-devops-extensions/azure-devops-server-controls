import { ActionsHub } from  "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { convertArtifactUriToPublicUrl } from "VersionControl/Scripts/Utils/Build";
import { GitStatus } from "TFS/VersionControl/Contracts";
import { BuildStatusSource } from  "VersionControl/Scenarios/ChangeDetails/Sources/BuildStatusSource";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

/**
 * Action creator for build status.
 */
export class BuildStatusActionCreator {
    constructor(private _actionsHub: ActionsHub,
        private _repositoryContext: RepositoryContext,
        private _buildStatusSource?: BuildStatusSource) {
    }

    /**
     * Loads build status of given commit.
     */
    public loadBuildStatus = (commitId: string): void => {
        this.buildStatusSource.getBuildStatusesForCommit(commitId).then(
            (statuses: GitStatus[]) => {
                statuses = convertArtifactUriToPublicUrl(statuses, this._repositoryContext);
                this._actionsHub.buildStatusesLoaded.invoke(statuses);
            },
            (error: Error) => {
                this._actionsHub.errorRaised.invoke(error);
            });
    }

    private get buildStatusSource(): BuildStatusSource {
        if (!this._buildStatusSource) {
            this._buildStatusSource = new BuildStatusSource(this._repositoryContext);
        }

        return this._buildStatusSource;
    }
}
