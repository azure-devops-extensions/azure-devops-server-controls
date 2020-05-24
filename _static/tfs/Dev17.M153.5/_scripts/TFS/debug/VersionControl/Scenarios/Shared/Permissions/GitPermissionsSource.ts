import { autobind } from "OfficeFabric/Utilities";
import * as User_Services from "VSS/User/Services";

import { PermissionsSource, PermissionsResult } from "VersionControl/Scenarios/Shared/Permissions/PermissionsSource";
import { GitConstants, GitRepositoryPermissions } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";

export type GitRepositoryPermissionsKeys = keyof typeof GitRepositoryPermissions;

/**
 * Git permissions relative to the current page.
 */
export type GitPermissions = { [K in GitRepositoryPermissionsKeys] : boolean; };
export type GitBranchPermissions = IDictionaryStringTo<GitPermissions>;

/**
 * The set of permissions that exist on the specified repositories/branches, including
 * other important permissions data from the provider.
 */
export interface GitPermissionSet {
    repositories: IDictionaryStringTo<GitRepositoryPermissionSet>;
    project: GitProjectPermissionSet;
}

export interface GitProjectPermissionSet {
    isUserMember: boolean;
    permissions: GitPermissions;
}

export interface GitRepositoryPermissionSet {
    repository: GitPermissions;
    branches: GitBranchPermissions;
    isUserMember: boolean;
}

export function getCanViewMyBranches(permissionSet: GitRepositoryPermissionSet): boolean {
    return permissionSet.isUserMember;
}

/**
 * A key to reference security tokens returned from the permissions data provider.
 */
export interface GitPermissionsKey {
    projectId: string;
    repositoryId: string;
    branchRefName: string;
}

export class GitPermissionsSource extends PermissionsSource<GitPermissions, GitPermissionsKey> {
    private _defaultKey: GitPermissionsKey;
    
    constructor(defaultProjectId?: string, defaultRepositoryId?: string) {
        super(GitRepositoryPermissions);
        this._defaultKey = createRepositoryGitPermissionsKey(defaultProjectId, defaultRepositoryId);
    }

    /**
     * Query for GitRepositoryPermissions from the server for the given keys, then convert the returned permissions
     * into a repoId -> repoPermissions mapping so it can be easily consumed. Force refresh will make a server call to refresh permissions.
     */
    public queryGitPermissionsAsync(permissionKeys: GitPermissionsKey[], forceRefresh: boolean = false): IPromise<GitPermissionSet> {
        const isUserMember = User_Services.getService().hasClaim(User_Services.UserClaims.Member);
        return super.queryPermissionsAsync(permissionKeys, forceRefresh)
            .then(this._updateWithAnyCreateBranch)
            .then(results => getPermissionSet(results, isUserMember));
    }

    /**
     * Query for the repository permissions on just the default project/repo. Useful for consumers who only
     * care about one repository and don't want to have to keep track of a repo id for indexing the larger GitPermissionSet results.
     * Force refresh will make a server call to refresh permissions.
     */
    public queryDefaultGitRepositoryPermissionsAsync(forceRefresh: boolean = false): IPromise<GitRepositoryPermissionSet> {
        if (!this._defaultKey.projectId || !this._defaultKey.repositoryId) {
            return Promise.resolve(getDefaultRepositoryPermissionSet());
        }

        return this.queryGitPermissionsAsync([this._defaultKey], forceRefresh)
            .then(permissionsSet => permissionsSet.repositories[this._defaultKey.repositoryId] || getDefaultRepositoryPermissionSet());
    }

    /**
     * Query for the repository permissions on the default project/repo and a current branch name.
     * `forceRefresh` will always make a server call, otherwise we only call if missing the repo or branch permissions.
     */
    public queryDefaultGitRepositoryWithRefNamePermissionsAsync(branchRefName: string, forceRefresh: boolean = false): IPromise<GitRepositoryPermissionSet> {
        const keys = [
            this._defaultKey,
            createBranchGitPermissionsKey(this._defaultKey.projectId, this._defaultKey.repositoryId, branchRefName),
        ];

        if (!this._defaultKey.projectId || !this._defaultKey.repositoryId) {
            return Promise.resolve(getDefaultRepositoryPermissionSet());
        }

        return this.queryGitPermissionsAsync(keys, forceRefresh)
            .then(permissionSet => permissionSet.repositories[this._defaultKey.repositoryId] || getDefaultRepositoryPermissionSet());
    }

    protected serializeKey(permissionsKey: GitPermissionsKey): string {
        let key = `${permissionsKey.projectId}/`;

        if (permissionsKey.repositoryId) {
            key += `${permissionsKey.repositoryId}/`;

            if (permissionsKey.branchRefName) {
                key += `${permissionsKey.branchRefName}`;
            }
        }

        return key;
    }

    @autobind
    private _updateWithAnyCreateBranch(results: PermissionsResult<GitPermissions, GitPermissionsKey>[]): PermissionsResult<GitPermissions, GitPermissionsKey>[] {
        return results.map(result => {
            if (!result.permissions.CreateBranch) {
                const anyCreateBranch = this._getSecurityDataFromPage(this.serializeKey(result.key) + "AnyCreateBranch");
                if (anyCreateBranch) {
                    // Overwrite CreateBranch if it's denied at the repo level but granted for some branch folder (like users/*)
                    // HACK We should not overwrite received permissions but save extra data separately.
                    // That's a bigger change at this point, so we're deferring it.
                    result.permissions.CreateBranch = true;
                }
            }

            return result;
        });
    }
}

/**
 * Convert the result of a permissions query into a permission set that can be easily consumed.
 */
export function getPermissionSet(results: PermissionsResult<GitPermissions, GitPermissionsKey>[], isUserMember: boolean): GitPermissionSet {
    const gitPermissionSet = getDefaultPermissionSet();

    for (const permissionsResult of results) {
        if (!permissionsResult.key || !permissionsResult.key.projectId) {
            continue;
        }

        if (permissionsResult.key.repositoryId) {
            // we're working with repo permissions for this entry

            if (!gitPermissionSet.repositories[permissionsResult.key.repositoryId]) {
                gitPermissionSet.repositories[permissionsResult.key.repositoryId] = getDefaultRepositoryPermissionSet();
            }

            const repoPermissionSet: GitRepositoryPermissionSet = gitPermissionSet.repositories[permissionsResult.key.repositoryId];

            repoPermissionSet.isUserMember = isUserMember;

            if (permissionsResult.key.branchRefName) {
                repoPermissionSet.branches[permissionsResult.key.branchRefName] = (permissionsResult.permissions || {} as GitPermissions);
            }
            else {
                repoPermissionSet.repository = (permissionsResult.permissions || {} as GitPermissions);
            }
        } else {
            // this entry is project-level permissions
            gitPermissionSet.project.permissions = (permissionsResult.permissions || {} as GitPermissions);
            gitPermissionSet.project.isUserMember = isUserMember;
        }
    }

    return gitPermissionSet;
}

/**
 * Get the repository permissions from the full permission set, given the repo id.
 */
export function getRepositoryPermissions(permissionSet: GitPermissionSet, repositoryId: string): GitPermissions {
    const repositoryPermissionSet = (permissionSet && permissionSet.repositories && permissionSet.repositories[repositoryId]) || getDefaultRepositoryPermissionSet();
    return repositoryPermissionSet.repository || {} as GitPermissions;
}

/**
 * Get the branch permissions from the full permission set, given the repo id and branch name.
 */
export function getBranchPermissions(permissionSet: GitPermissionSet, repositoryId: string, branchRefName: string): GitPermissions {
    const repositoryPermissionSet = (permissionSet && permissionSet.repositories && permissionSet.repositories[repositoryId]) || getDefaultRepositoryPermissionSet();
    const branchPermissionSet = repositoryPermissionSet.branches || {} as GitBranchPermissions;
    return branchPermissionSet[branchRefName] || {} as GitPermissions;
}

export function getDefaultPermissionSet(): GitPermissionSet {
    return {
        repositories: {},
        project: getDefaultProjectPermissionSet(),
    };
}

export function getDefaultRepositoryPermissionSet(): GitRepositoryPermissionSet {
    return {
        repository: {} as GitPermissions,
        branches: {} as GitBranchPermissions,
        isUserMember: false,
    };
}

export function getDefaultProjectPermissionSet(): GitProjectPermissionSet {
    return {
        permissions: {} as GitPermissions,
        isUserMember: false,
    };
}

export function createRepositoryGitPermissionsKey(projectId: string, repositoryId: string): GitPermissionsKey {
    return { projectId, repositoryId, branchRefName: null };
}

export function createBranchGitPermissionsKey(projectId: string, repositoryId: string, branchRefName: string): GitPermissionsKey {
    return { projectId, repositoryId, branchRefName };
}