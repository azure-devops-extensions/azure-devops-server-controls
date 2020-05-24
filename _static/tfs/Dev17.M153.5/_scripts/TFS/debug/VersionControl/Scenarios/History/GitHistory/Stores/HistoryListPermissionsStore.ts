import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";
import * as UserClaimsService from "VSS/User/Services";
import { HistoryPermissionSet } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { GitRepositoryPermissionSet, getDefaultRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { PermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/PermissionsStore";

export class HistoryListPermissionsStore extends PermissionsStore<HistoryPermissionSet, GitRepositoryPermissionSet> {
    /**
     * Given a set of permissions from the server, evaluate and return what the user
     * should be able to do on the commits page.
     */
    protected evaluatePermissions(permissionSet: GitRepositoryPermissionSet): HistoryPermissionSet {
        if (!permissionSet) {
            return null;
        }

        const repositoryPermissions = permissionSet.repository;

        return {
            hasCreateTagPermission: repositoryPermissions.CreateTag,
            hasCreateBranchPermission: repositoryPermissions.CreateBranch,
            isPermissionLoaded: true,
        };
    }
}
