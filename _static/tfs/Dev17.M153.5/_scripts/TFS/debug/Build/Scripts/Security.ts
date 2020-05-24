import * as TFS_Admin_Security_NOREQUIRE from "Admin/Scripts/TFS.Admin.Security";

import { getPermissionsStore } from "Build/Scripts/Stores/Permissions";

import { BuildSecurity, BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import * as Security from "Build.Common/Scripts/Security";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { Build, DefinitionReference } from "TFS/Build/Contracts";

import { logError } from "VSS/Diag";
import { getLocalService } from "VSS/Service";
import { SecurityService } from "VSS/Security/Services";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { using } from "VSS/VSS";

export namespace DistributedTaskSecurity {
    export const DistributedTaskNamespaceId = "101eae8c-1709-47f9-b228-0e476c35b3ba";
    export const AgentPoolsToken = "AgentPools";
}

export namespace DistributedTaskPermissions {
    export const Manage = 2;
}

export function hasProjectPermission(token: string, permission: number): boolean {
    return hasPermission(token, permission);
}

export function hasDefinitionPermission(definition: DefinitionReference, permission: number): boolean {
    // if there's no path, just return false - the definition isn't really loaded
    if (!definition || !definition.path) {
        return false;
    }

    return hasPermission(getDefinitionSecurityToken(definition), permission);
}

export function canRetainBuild(definition: DefinitionReference): boolean {
    return hasDefinitionPermission(definition, BuildPermissions.RetainIndefinitely) || hasDefinitionPermission(definition, BuildPermissions.UpdateBuildInformation);
}

export function canCancelBuild(userId: string, build: Build): boolean {
    const requestedBy = !!build.requestedBy ? build.requestedBy.id : "";
    const requestedFor = !!build.requestedBy ? build.requestedFor.id : "";

    // cancellation is enabled if the user matches requestedBy or requestedFor, or has StopBuilds on the definition
    return ignoreCaseComparer(userId, requestedBy) === 0 ||
        ignoreCaseComparer(userId, requestedFor) === 0 ||
        hasDefinitionPermission(build.definition, BuildPermissions.StopBuilds);
}

export function hasPoolPermission(permission: number): boolean {
    const securityService = getLocalService(SecurityService);
    return securityService.hasPermission(DistributedTaskSecurity.DistributedTaskNamespaceId, DistributedTaskSecurity.AgentPoolsToken, DistributedTaskPermissions.Manage);
}

export function getDefinitionSecurityToken(definition: DefinitionReference): string {
    return Security.getDefinitionSecurityToken(TfsContext.getDefault().navigation.projectId, definition.path, definition.id);
}

export function getDefinitionFolderSecurityToken(path: string): string {
    path = Security.getSecurityTokenPath(path);
    return TfsContext.getDefault().navigation.projectId + Security.Separator + path + Security.Separator;
}

function showSecurityDialog(permissionSet: string, scope: string, separator: string, token: string, tokenDisplayValue: string): void {
    using(["Admin/Scripts/TFS.Admin.Security"], (_TFS_Admin_Security: typeof TFS_Admin_Security_NOREQUIRE) => {
        const securityManager = _TFS_Admin_Security.SecurityManager.create(permissionSet, {
            scope: scope,
            separator: separator
        });

        securityManager.showPermissions(token, tokenDisplayValue);
    });
}

export function showDefinitionSecurityDialog(definition: DefinitionReference): void {
    let token = definition.id.toString();
    if (definition.path != "\\") {
        // set token per folder. note that this does not use getDefinitionSecurityToken - the dialog appends the scope on its own
        token = Security.getSecurityTokenPath(definition.path) + Security.Separator + definition.id.toString();
    }

    showSecurityDialog(BuildSecurity.BuildNamespaceId, TfsContext.getDefault().navigation.projectId, Security.Separator, token, definition.name);
}

export function showFolderSecurityDialog(path: string): void {
    using(["Admin/Scripts/TFS.Admin.Security"], (_TFS_Admin_Security: typeof TFS_Admin_Security_NOREQUIRE) => {
        if (path) {
            const tfsContext = TfsContext.getDefault();

            const title = (path === Security.RootPath) ? tfsContext.navigation.project : path;
            const token = Security.getSecurityTokenPath(path);
            showSecurityDialog(BuildSecurity.BuildNamespaceId, tfsContext.navigation.projectId, Security.Separator, token, title);
        }
        else {
            logError("path shouldn't be empty");
        }
    });
}

function hasPermission(token: string, permission: number): boolean {
    return getPermissionsStore().hasPermission(token, permission);
}
