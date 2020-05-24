import { GitPermissionSet, getRepositoryPermissions, GitPermissions } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { PermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/PermissionsStore";

export interface VCAdminPermissions {
    editPolicies: boolean;
}

export interface VCAdminPermissionSet {
    permissionSet: GitPermissionSet;
    repositoryId: string;
}

export class VCAdminPermissionsStore extends PermissionsStore<VCAdminPermissions, VCAdminPermissionSet> {
    protected evaluatePermissions(perms: VCAdminPermissionSet): VCAdminPermissions {
        let targetPermissions: GitPermissions = null;

        if (perms.repositoryId) {
            targetPermissions = getRepositoryPermissions(perms.permissionSet, perms.repositoryId);
        } else {
            targetPermissions = perms.permissionSet.project.permissions;
        }

        return { editPolicies: targetPermissions.EditPolicies };
    }
}
