import * as Q from "q";

import * as Security_Contracts from "VSS/Security/Contracts";
import { SecurityService } from 'VSS/Security/Services';
import { getLocalService } from 'VSS/Service';

import { PermissionConstants } from "ProjectOverview/Scripts/Constants";
import { ActivityPaneSecurityConstants, ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";
import { ProjectPermissions } from "ProjectOverview/Scripts/Models";
import { RepositoryPermissionConstants, RepositoryPermissionSource } from "ProjectOverview/Scripts/Shared/Sources/RepositoryPermissionSource";

export class PermissionSource {
    /**
     * Returns the permissions that user has from a given set of permissions
     * @param requestedPermissions - Permission check requested
     * @param projectId - Project ID
     * @param repoId - Repository ID. Considered for EditGitCode permission check only
     */
    public hasPermissions(requestedPermissions: ProjectPermissions, projectId: string,  repoId: string): IPromise<ProjectPermissions> {
        let deferred = Q.defer<ProjectPermissions>();
        const securityOptions: Security_Contracts.PermissionEvaluation[] = this._getSecurityOptions(requestedPermissions, projectId, repoId);
        let allowedPermissions: ProjectPermissions = ProjectPermissions.None;

        if (securityOptions.length) {
            const batchResult: Security_Contracts.PermissionEvaluation[] = this._hasPermissionsBatch(securityOptions);
            if (batchResult) {
                allowedPermissions |= this._setPermissionsFlag(batchResult, requestedPermissions);
            }

            deferred.resolve(allowedPermissions);
        }
        else {
            deferred.resolve(ProjectPermissions.None);
        }

        return deferred.promise;
    }

    private _hasPermissionsBatch(securityOptions: Security_Contracts.PermissionEvaluation[]): Security_Contracts.PermissionEvaluation[] {
        const securityService = getLocalService(SecurityService);
        securityOptions.forEach((permission: Security_Contracts.PermissionEvaluation) => {
            permission.value = securityService.hasPermission(permission.securityNamespaceId, permission.token, permission.permissions);
        });

        return securityOptions;
    }

    private _setPermissionsFlag(
        permissions: Security_Contracts.PermissionEvaluation[],
        requestedPermissions: ProjectPermissions): ProjectPermissions {
        let allowedPermissions: ProjectPermissions = ProjectPermissions.None;

        permissions.forEach((permission: Security_Contracts.PermissionEvaluation) => {
            switch (permission.securityNamespaceId.toLowerCase()) {
                case (PermissionConstants.BuildSecurityNameSpace):
                    if (permission.value) {
                        if (requestedPermissions & ProjectPermissions.EditBuild) {
                            allowedPermissions |= ProjectPermissions.EditBuild;
                        }

                        // for release permissions we can get into scenarios like project not provisioned 
                        // hence the permission could be a false negative
                        // way out is to make other call for release definitions before permission which will provision 
                        // the project if it already isn't. this will have unnecessary perf impact on perf
                        // instead relying on Build permissions for release as well
                        if (requestedPermissions & ProjectPermissions.EditRelease) {
                            allowedPermissions |= ProjectPermissions.EditRelease;
                        }
                    }
                    break;
                case (RepositoryPermissionConstants.GitRepositoriesSecurityNameSpace):
                    if (permission.value) {
                        allowedPermissions |= ProjectPermissions.EditGitCode;
                    }
                    break;
                case (RepositoryPermissionConstants.VersionControlItems2SecurityNameSpace):
                    if (permission.value) {
                        allowedPermissions |= ProjectPermissions.EditTfvcCode;
                    }
                    break;
                case (ActivityPaneSecurityConstants.NamespaceId):
                    if (permission.value) {
                        allowedPermissions |= ProjectPermissions.ViewActivityPane;
                    }
                    break;
            }
        });

        return allowedPermissions;
    }

    /**
     * Get security options for requested permissions.
     * @param requestedPermissions - permission check requested
     * @param projectId - project ID. Used as part of token
     * @param repoId - repository ID. Used only if requesting EditGitCode permission
     */
    private _getSecurityOptions(requestedPermissions: ProjectPermissions, projectId: string, repoId: string): Security_Contracts.PermissionEvaluation[] {
        const securityOptionsArr: Security_Contracts.PermissionEvaluation[] = [];
        if ((requestedPermissions & ProjectPermissions.EditBuild) ||
            (requestedPermissions & ProjectPermissions.EditRelease)) {
            securityOptionsArr.push(<Security_Contracts.PermissionEvaluation>{
                permissions: PermissionConstants.EditBuildDefinitionPermission,
                securityNamespaceId: PermissionConstants.BuildSecurityNameSpace,
                token: projectId
            });
        }

        if ((requestedPermissions & ProjectPermissions.EditGitCode)) {
            securityOptionsArr.push(RepositoryPermissionSource.getGitRepoGenericContributeToken(projectId, repoId));
        }

        if ((requestedPermissions & ProjectPermissions.EditTfvcCode)) {
            securityOptionsArr.push(RepositoryPermissionSource.getTfvcRepoRootCheckinToken(projectId));
        }

        if ((requestedPermissions & ProjectPermissions.ViewActivityPane)) {
            securityOptionsArr.push(<Security_Contracts.PermissionEvaluation>{
                permissions: ActivityPaneSecurityConstants.GenericRead,
                securityNamespaceId: ActivityPaneSecurityConstants.NamespaceId,
                token: ActivityPaneSecurityConstants.Token + "/" + projectId,
            });
        }

        return securityOptionsArr;
    }
}