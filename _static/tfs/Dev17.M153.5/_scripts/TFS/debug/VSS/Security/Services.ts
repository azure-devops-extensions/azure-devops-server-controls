
import LocalPageData = require("VSS/Contributions/LocalPageData");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");

interface SharedPermissionCollection {
    [namespaceId: string]: SharedPermissionData;
}

interface SharedPermissionData {
    [token: string]: number;
}

const permissionsSharedDataKey = "_permissions";

/**
* Service to manage permission availability data.
*/
export class SecurityService extends Service.VssService {
    public hasPermission(securityNamespaceId: string, securityToken: string, requestedPermission: number): boolean {

        const sharedPermissions = LocalPageData.getSharedData<SharedPermissionCollection>(permissionsSharedDataKey);
        if (!sharedPermissions) {
            return this.handleMissingState(`No shared permissions found`);
        }

        const tokens = sharedPermissions[securityNamespaceId];
        if (!tokens) {
            return this.handleMissingState(`Security namespace with id '${securityNamespaceId}' not found`);
        }

        const effectivePermissions = tokens[securityToken];
        if (effectivePermissions === undefined) {
            return this.handleMissingState(`No permissions found for security namespace '${securityNamespaceId}' and token '${securityToken}'`);
        }

        return (requestedPermission & effectivePermissions) > 0;
    }

    public checkPermission(securityNamespaceId: string, securityToken: string, requestedPermission: number): void {
        if (!this.hasPermission(securityNamespaceId, securityToken, requestedPermission)) {
            throw new Error(`Access denied: Permission ${requestedPermission} is needed for the resource ${securityToken}.`);
        }
    }

    public isPermissionIncluded(securityNamespaceId: string, securityToken: string): boolean {
        const sharedPermissions = LocalPageData.getSharedData<SharedPermissionCollection>(permissionsSharedDataKey);
        if (sharedPermissions) {
            const tokens = sharedPermissions[securityNamespaceId];
            return tokens && (tokens[securityToken] !== undefined);
        }
        else{
            return false;
        }
    }

    private handleMissingState(message: string): boolean {
        Diag.Debug.fail(`${message}. Ensure that the effective permissions are added using IClientSecurityProviderService.AddPermissions.`);
        return false;
    }
}
