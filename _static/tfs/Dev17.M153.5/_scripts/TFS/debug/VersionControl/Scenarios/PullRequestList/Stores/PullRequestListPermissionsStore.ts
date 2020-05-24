import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";

import { GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { PermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/PermissionsStore";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

/**
 * Enumerate what the current user is allowed to do on the pull request list.
 * This contract may be defined on the server instead in the future.
 */
export interface PullRequestListPermissions {
    createPullRequest: boolean;
    loadArtifactStats: boolean;
    createCustomSection: boolean;
}

export interface PullRequestListPermissionsSet {
    gitRepositoryPermissionSet: GitRepositoryPermissionSet;
    settingsPermissions: SettingsPermissions;
}

export class PullRequestListPermissionsStore extends PermissionsStore<PullRequestListPermissions, PullRequestListPermissionsSet> {

    protected evaluatePermissions(permissionSet: PullRequestListPermissionsSet): PullRequestListPermissions {
        if (!permissionSet
            || !permissionSet.gitRepositoryPermissionSet
            || !permissionSet.settingsPermissions) {
            return null;
        }

        return {
            createPullRequest: permissionSet.gitRepositoryPermissionSet.repository.PullRequestContribute,
            loadArtifactStats: permissionSet.gitRepositoryPermissionSet.repository.PullRequestContribute,
            createCustomSection: permissionSet.settingsPermissions.Write,
        };
    }
}
