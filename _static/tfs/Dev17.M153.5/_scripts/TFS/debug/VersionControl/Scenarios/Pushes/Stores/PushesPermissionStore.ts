import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";

import { GitRepositoryPermissionSet, getCanViewMyBranches } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { PermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/PermissionsStore";

export interface PushesPermissions {
    viewMyBranches: boolean;
    isPermissionLoaded: boolean;
}

export class PushesPermissionStore extends PermissionsStore<PushesPermissions, GitRepositoryPermissionSet> {

    protected evaluatePermissions(permissionSet: GitRepositoryPermissionSet): PushesPermissions {
        if (!permissionSet) {
            return null;
        }

        return {
            viewMyBranches: getCanViewMyBranches(permissionSet),
            isPermissionLoaded: true
        };
    }
}
