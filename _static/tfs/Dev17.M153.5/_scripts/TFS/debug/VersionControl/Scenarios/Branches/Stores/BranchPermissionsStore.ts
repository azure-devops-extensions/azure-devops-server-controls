import { FavoritesPermissions } from "VersionControl/Scenarios/Shared/Permissions/FavoritesPermissionsSource";
import { GitRepositoryPermissionSet, getCanViewMyBranches } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

export interface BranchPermissions {
    createBranch: boolean;
    createPullRequest: boolean;
    deleteBranch: boolean;
    lockBranch: boolean;
    setCompareBranch: boolean;
    setUpBuild: boolean;
    updateFavorites: boolean;
    viewBranchPolicies: boolean;
    viewBranchSecurity: boolean;
    viewFavorites: boolean;
    viewMyBranches: boolean;
}

export interface BranchPermissionSet {
    repositoryPermissionSet: GitRepositoryPermissionSet;
    favoritesPermissions: FavoritesPermissions;
    settingsPermissions: SettingsPermissions;
}

export function evaluatePermissions(permissionSet: BranchPermissionSet): BranchPermissions {
    if (!permissionSet ||
        !permissionSet.repositoryPermissionSet ||
        !permissionSet.favoritesPermissions) {
        return null;
    }

    const repositoryPermissions = permissionSet.repositoryPermissionSet.repository;
    const { favoritesPermissions, settingsPermissions } = permissionSet;
    const { isUserMember } = permissionSet.repositoryPermissionSet;

    return {
        createBranch: repositoryPermissions.CreateBranch,
        createPullRequest: repositoryPermissions.PullRequestContribute,
        deleteBranch: isUserMember,
        lockBranch: isUserMember,
        setCompareBranch: settingsPermissions.Write,
        setUpBuild: repositoryPermissions.GenericContribute,
        updateFavorites: favoritesPermissions.Write,
        viewFavorites: favoritesPermissions.Read,
        viewBranchPolicies: isUserMember,
        viewBranchSecurity: isUserMember,
        viewMyBranches: getCanViewMyBranches(permissionSet.repositoryPermissionSet),
    };
}
