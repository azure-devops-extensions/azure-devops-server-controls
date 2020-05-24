import { PlanUserPermissions } from "TFS/Work/Contracts";

export class DeliveryTimelinePermissionUtil {

    public static hasPermission(userPermissions: PlanUserPermissions, requestedPermission: PlanUserPermissions): boolean {
        return (userPermissions & requestedPermission) == requestedPermission;
    }
}