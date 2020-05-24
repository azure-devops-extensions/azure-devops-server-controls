import * as Security_Contracts from "VSS/Security/Contracts";
import { SecurityService } from "VSS/Security/Services";
import { getLocalService } from "VSS/Service";

export module RepositoryPermissionConstants {
    // Git Repositories
    export var GitRepositoriesSecurityNameSpace = "2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87";
    export var GitRepoGenericContributePermission = 4;

    // VersionControlItems2
    export var VersionControlItems2SecurityNameSpace = "3c15a8b7-af1a-45c2-aa97-2cb97078332e";
    export var TfvcRepoCheckinPermission = 4;
}

/**
 * This class will return appropriate values, only if data provider populates this data in _sharedData.
 */
export class RepositoryPermissionSource {
    public static hasGitRepoGenericContributePermission(projectId: string, repositoryId: string): boolean {
        const securityService = getLocalService(SecurityService);
        const token = RepositoryPermissionSource.getGitRepoGenericContributeToken(projectId, repositoryId);
        return securityService.hasPermission(token.securityNamespaceId, token.token, token.permissions);
    }

    public static getGitRepoGenericContributeToken(projectId: string, repositoryId: string): Security_Contracts.PermissionEvaluation {
        const securableRoot: string = "repoV2";
        return {
            securityNamespaceId: RepositoryPermissionConstants.GitRepositoriesSecurityNameSpace,
            token: securableRoot + "/" + projectId + "/" + repositoryId + "/",
            permissions: RepositoryPermissionConstants.GitRepoGenericContributePermission,
            value: undefined,
        };
    }

    public static hasTfvcRepoRootCheckinPermission(projectId: string): boolean {
        const securityService = getLocalService(SecurityService);
        const token = RepositoryPermissionSource.getTfvcRepoRootCheckinToken(projectId);
        return securityService.hasPermission(token.securityNamespaceId, token.token, token.permissions);
    }

    public static getTfvcRepoRootCheckinToken(projectId: string): Security_Contracts.PermissionEvaluation {
        const tfvcRoot: string = "$";
        return {
            securityNamespaceId: RepositoryPermissionConstants.VersionControlItems2SecurityNameSpace,
            token: tfvcRoot + "/" + projectId,
            permissions: RepositoryPermissionConstants.TfvcRepoCheckinPermission,
            value: undefined,
        };
    }
}