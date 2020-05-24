import { GitRepositoryPermissionSet, getCanViewMyBranches } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { PermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/PermissionsStore";
import { getFullRefNameFromBranch } from "VersionControl/Scripts/GitRefUtility";
import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface ExplorerPermissions {
    createBranch: boolean;
    createOrModifyFiles: boolean;
    createPullRequest: boolean;
    setUpBuild: boolean;
    viewMyBranches: boolean;
}

export function getTfvcExplorerPermissions(): ExplorerPermissionsState {
    return {
        createBranch: true,
        createOrModifyFiles: true,
        createPullRequest: true,
        setUpBuild: true,
        viewMyBranches: true,
        isLoading: false,
    };
}

export interface ExplorerPermissionsState extends ExplorerPermissions {
    isLoading: boolean;
}

export class ExplorerPermissionsStore extends PermissionsStore<ExplorerPermissionsState, GitRepositoryPermissionSet> {
    private currentBranchRefName: string | undefined;

    public setVersion = ({ versionSpec }: { versionSpec: VersionSpec }) => {
        this.currentBranchRefName = versionSpec instanceof GitBranchVersionSpec
            ? getFullRefNameFromBranch(versionSpec.branchName)
            : undefined;

        this.emitChanged();
    }

    public getPermissions(): ExplorerPermissionsState {
        const permissions = super.getPermissions();

        if (permissions.isLoading === null || permissions.isLoading === undefined) {
            permissions.isLoading = super.arePermissionsLoading();
        }

        return permissions;
    }

    protected evaluatePermissions(permissionSet: GitRepositoryPermissionSet): ExplorerPermissionsState {
        if (!permissionSet) {
            return null;
        }

        let canContributeToCurrentBranch = permissionSet.repository.GenericContribute;
        if (this.currentBranchRefName) {
            const currentBranchPermissions = permissionSet.branches[this.currentBranchRefName];
            if (!currentBranchPermissions) {
                // Branch permissions were not loaded yet. Wait
                return null;
            }

            canContributeToCurrentBranch = currentBranchPermissions.GenericContribute;
        }

        return {
            createBranch: permissionSet.repository.CreateBranch,
            createOrModifyFiles: canContributeToCurrentBranch || permissionSet.repository.CreateBranch,
            createPullRequest: permissionSet.repository.PullRequestContribute,
            setUpBuild: permissionSet.repository.GenericContribute,
            viewMyBranches: getCanViewMyBranches(permissionSet),
            isLoading: super.arePermissionsLoading(),
        };
    }
}
