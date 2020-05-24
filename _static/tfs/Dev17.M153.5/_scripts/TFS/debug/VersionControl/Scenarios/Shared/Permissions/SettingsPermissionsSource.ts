import * as UserClaimsService from "VSS/User/Services";
import { PermissionsSource, PermissionsResult } from "VersionControl/Scenarios/Shared/Permissions/PermissionsSource";

/**
 * Settings permissions relative to the current page.
 */
export enum SettingsPermissionSet {
    Read = 1,
    Write = 2,
}
export type SettingsPermissions = { [K in keyof typeof SettingsPermissionSet] : boolean; };

export class SettingsPermissionsSource extends PermissionsSource<SettingsPermissions, string> {
    constructor() {
        super(SettingsPermissionSet);
    }

    /**
     * Query for settings permissions from the server. Force refresh will make a server call to refresh permissions.
     */
    public querySettingsPermissionsAsync(forceRefresh: boolean = false): IPromise<SettingsPermissions> {
        return super.queryPermissionsAsync(["settings"], forceRefresh).then(getSettingsPermissions);
    }

    protected serializeKey(permissionsKey: string): string {
        return "settings/global";
    }
}

/**
 * Convert the result of a permissions query into a permission set that can be easily consumed.
 */
export function getSettingsPermissions(results: PermissionsResult<SettingsPermissions, string>[]): SettingsPermissions {
    // for now we are only giving members permission to read and write settings, follow-up work is tracked in:
    // #1190368 Use settings service instead of the old VC MVC endpoint for user preferences
    const userIsMember = UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member);
    return {
        Read: userIsMember,
        Write: userIsMember,
    };
}

export function getDefaultSettingsPermissions(): SettingsPermissions {
    return {} as SettingsPermissions;
}

