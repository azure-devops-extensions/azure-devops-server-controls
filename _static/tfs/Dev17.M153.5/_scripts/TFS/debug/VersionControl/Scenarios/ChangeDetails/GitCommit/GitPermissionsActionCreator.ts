import { ActionsHub } from  "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { GitPermissionsSource, GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

/**
 * Action Creator for Git permissions for change details page
 */
export class GitPermissionsActionCreator {
    constructor(
        private _actionsHub: ActionsHub,
        private _gitRepositoryContext: GitRepositoryContext, 
        private _gitPermissionSource?: GitPermissionsSource) {
    }

    public fetchGitPermissions(): void {
        this.gitPermissionSource.queryDefaultGitRepositoryPermissionsAsync()
            .then((permissionSet: GitRepositoryPermissionSet) => {
                this._actionsHub.permissionsUpdated.invoke(permissionSet.repository);
        });
    }

    private get gitPermissionSource(): GitPermissionsSource {
        if (!this._gitPermissionSource) {
            this._gitPermissionSource = new GitPermissionsSource(
                this._gitRepositoryContext.getProjectId(),
                this._gitRepositoryContext.getRepositoryId(),
            );
        }

        return this._gitPermissionSource;
    }
}