import * as UserClaimsService from "VSS/User/Services";
import { canUseFavorites } from "Favorites/FavoritesService";
import { Dashboard } from "TFS/Dashboards/Contracts";

export class DashboardsPermissionsHelper {

    /**
     * Used for gating the visibility of Favorites centric UI elements.
     */
    public static canUseFavoritesPermission(): boolean {
        return canUseFavorites();
    }

    /**
     * Used for gating Functionality of auto-refresh for public and anon users.
     */
    public static canAutoRefreshDashboard(): boolean {
        // This is a min bar permission check to be used in conjunction with the dashboard autorefresh setting.
        return DashboardsPermissionsHelper.isMemberUser();
    }

    /**
     * Determines if a user has basic permissions available to org members.
     */
    private static isMemberUser(): boolean {
        return UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member);
    }

    /**
     * Determines if a user has basic permissions available to org members.
     */
    public static hideDisabledControls(): boolean {
        return !DashboardsPermissionsHelper.isMemberUser();
    }
    
    /**
     * Determines which warning message to display when there is an error experience or disabled widget
     */
    public static showMemberErrorMessage(): boolean {
        return DashboardsPermissionsHelper.isMemberUser();
    }

    /**
     * Used for gating visibility of new dashboard button for public and anon users.
     */
    public static canWriteToDatabase(): boolean {
        // This is a min bar permission check to determine if a user has the basic permission to write to the database.
        // This permission effectively gates all other permissions that are of a finer granularity.
        return DashboardsPermissionsHelper.isMemberUser();
    }

    /**
     * Used for gating disabled state on dashboard settings dialog.
     */
    public static canUseSettingsDialog(): boolean {
        // This is a min bar permission check to be used for determining UI for non members.
        return DashboardsPermissionsHelper.isMemberUser();
    }

}