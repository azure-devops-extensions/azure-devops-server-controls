import * as UserClaimsService from "VSS/User/Services";
import * as PageDataHelper from "Dashboards/Scripts/Common.PageHelpers";

/**
 * A helper class for making link readiness checks for widgets.
 * Some widgets may create links that point to unavailable pages for public or anonymous users.
 * Use permission checks here to gate the display of such links.
 */
export class WidgetLinkHelper {
    /**
     * Checks for user permission to access WIT queries.
     */
    public static canUserAccessWITQueriesPage(): boolean {
        return WidgetLinkHelper.isMemberUser();
    }

    /**
     * Checks for user permission to access TCM queries.
     */
    public static canUserAccessTCMQueriesPage(): boolean {
        return WidgetLinkHelper.isMemberUser();
    }

    /**
     *  Check if the user has permission to see links to advanced features in the product.
     */
    public static canAccessAdvancedFeatures(): boolean {
        return WidgetLinkHelper.isMemberUser();
    }

    private static isMemberUser(): boolean {
        return UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member);
    }

    /**
     * Checks for user permission to open the project in visual studio.
     */
    public static canOpenProjectInVisualStudio(): boolean {
        return WidgetLinkHelper.isMemberUser();
    }

    /**
     * Checks whether the environment requires navigation links to open in a new window instead of navigating the current page.
     */
    public static mustOpenNewWindow(): boolean {
        return PageDataHelper.isEmbeddedPage();
    }

    /**
     * Checks whether the environment allows for opening a new tab/window and asynchronously reassigning the URL later.
     */
    public static canOpenAsyncLink(): boolean {
        return !PageDataHelper.isEmbeddedPage();
    }
}