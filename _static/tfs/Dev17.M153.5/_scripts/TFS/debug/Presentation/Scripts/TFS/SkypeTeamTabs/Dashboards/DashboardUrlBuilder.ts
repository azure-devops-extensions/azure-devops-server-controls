import { getNavigationHistoryService, StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";

export class DashboardUrlBuilder {

    public static getFullDashboardUrl(hostUrl: string, projectId: string, teamId: string, dashboardId: string) {
        const relativePath = getNavigationHistoryService().generateUrlForRoute(
            "ms.vss-dashboards-web.dashboards-new-experience-route",
            {
                ["project"]: projectId,
                ["team"]: teamId,
                ["teamName"]: teamId,
                ["id"]: dashboardId
            },
            StateMergeOptions.none
        );

        return `${hostUrl}${relativePath}`;
    }

    public static getEmbeddedDashboardUrl(hostUrl: string, orgUrl: string, projectId: string, dashboardId: string) {
        const relativePath = getNavigationHistoryService().generateUrlForRoute(
            "ms.vss-dashboards-web.dashboards-new-experience-route-embed",
            {
                ["project"]: projectId,
                ["id"]: dashboardId
            },
            StateMergeOptions.none
        );
        
        const dashboardUri = `${hostUrl}${relativePath}`;
        // _integrationredirect/authenticationRedirect is a collection scoped endpoint. So we should stich it with org URL and not host URL
        // Org URL and host URL same in the old world. Not same after the new URL format of https://dev.azure.com/{orgName}
        const authRedirectUri = `${orgUrl}_integrationredirect/authenticationRedirect?&replyto=`;
        return `${authRedirectUri}${encodeURIComponent(dashboardUri)}`;
    }
}