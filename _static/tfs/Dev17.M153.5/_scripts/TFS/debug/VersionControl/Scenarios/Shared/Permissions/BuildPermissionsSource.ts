import { PermissionsSource, PermissionsResult } from "VersionControl/Scenarios/Shared/Permissions/PermissionsSource";

/**
 * Build permissions relative to the current page.
 */
export enum BuildPermissionSet {
    EditBuildDefinition = 2048,
}
export type BuildPermissions = { [K in keyof typeof BuildPermissionSet] : boolean; };

export class BuildPermissionsSource extends PermissionsSource<BuildPermissions, string> {
    constructor() {
        super(BuildPermissionSet);
    }

    /**
     * Query for build permissions from the server. Force refresh will make a server call to refresh permissions.
     */
    public queryBuildPermissionsAsync(forceRefresh: boolean = false): IPromise<BuildPermissions> {
        return super.queryPermissionsAsync(["build"], forceRefresh).then(getBuildPermissions);
    }

    protected serializeKey(permissionsKey: string): string {
        return "build";
    }
}

/**
 * Convert the result of a permissions query into a permission set that can be easily consumed.
 */
export function getBuildPermissions(results: PermissionsResult<BuildPermissions, string>[]): BuildPermissions {
    return {
        EditBuildDefinition: results[0].permissions.EditBuildDefinition
    };
}
