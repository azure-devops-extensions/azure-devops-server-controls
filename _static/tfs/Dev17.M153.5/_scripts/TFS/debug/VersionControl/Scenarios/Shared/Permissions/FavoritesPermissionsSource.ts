import { canUseFavorites } from "Favorites/FavoritesService";
import { PermissionsSource, PermissionsResult } from "VersionControl/Scenarios/Shared/Permissions/PermissionsSource";

/**
 * Favorites permissions relative to the current page.
 */
export enum FavoritesPermissionSet {
    Read = 1,
    Write = 2,
}
export type FavoritesPermissions = { [K in keyof typeof FavoritesPermissionSet] : boolean; };

export class FavoritesPermissionsSource extends PermissionsSource<FavoritesPermissions, string> {
    constructor() {
        super(FavoritesPermissionSet);
    }

    /**
     * Query for favorites permissions from the server. Force refresh will make a server call to refresh permissions.
     */
    public queryFavoritesPermissionsAsync(forceRefresh: boolean = false): IPromise<FavoritesPermissions> {
        return super.queryPermissionsAsync(["favorites"], forceRefresh).then(getFavoritesPermissions);
    }

    protected serializeKey(permissionsKey: string): string {
        return "favorites";
    }
}

/**
 * Convert the result of a permissions query into a permission set that can be easily consumed.
 */
export function getFavoritesPermissions(results: PermissionsResult<FavoritesPermissions, string>[]): FavoritesPermissions {
    // for now we are using the favorites service client side check instead of checking data provider permissions since the token is changing:
    // #1191196 Clean up favorites permission usages
    const userCanUseFavorites = canUseFavorites();
    return {
        Read: userCanUseFavorites,
        Write: userCanUseFavorites,
    };
}

export function getDefaultFavoritesPermissions(): FavoritesPermissions {
    return {} as FavoritesPermissions;
}

