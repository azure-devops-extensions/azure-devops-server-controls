import { UrlConstants, ContributionIds } from "Dashboards/Components/Constants";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { DashboardPageExtension } from "Dashboards/Scripts/Common";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export class NavigationActionCreator {
    private static NewWebPlatFeatureFlag = "WebAccess.Dashboards.NewWebPlatformDirectory";

    public removeDefaultTeamForUrl(): void {
        const navHistoryService = getNavigationHistoryService();
        const state = navHistoryService.getState();
        state[UrlConstants.TeamIdRouteKey] = null;
        navHistoryService.pushState(state);
    }

    public getUrlForDashboard(team: string, dashboardId: string): string {
        const navHistoryService = getNavigationHistoryService();
        const state = this.getDashboardContentViewState(team, dashboardId);
        state[UrlConstants.NameKey] = null;
        return navHistoryService.generateUrlForRoute(ContributionIds.DashboardsNewExperienceRouteId, state);
    }

    public navigateToDirectoryFromDashboard(): void {
        const navHistoryService = getNavigationHistoryService();
        const state = navHistoryService.getState();

        state[UrlConstants.TeamRouteKey] = null;
        state[UrlConstants.TeamNameRouteKey] = null;
        state[UrlConstants.DashboardView] = null;
        state[UrlConstants.IdRouteKey] = null;
        state[DashboardPageExtension.FragmentID] = null;
        state[UrlConstants.TeamIdRouteKey] = null;
        state[UrlConstants.NameKey] = UrlConstants.DirectoryView;
        state[UrlConstants.ViewNameKey] = null;

        let targetRoute = ContributionIds.DashboardsLegacyDirectoryRouteId;
        if (FeatureAvailabilityService.isFeatureEnabled(NavigationActionCreator.NewWebPlatFeatureFlag, false)) {
            targetRoute = ContributionIds.DashboardsDirectoryRouteId;
        }

        this.navigateToUrl(navHistoryService.generateUrlForRoute(targetRoute, state));
    }

    public navigateToDashboard(team: string, dashboardId: string, queryParameters?: IDictionaryStringTo<string>): void {
        const navHistoryService = getNavigationHistoryService();
        const getUpdatedState = this.getDashboardContentViewState(team, dashboardId, queryParameters);
        this.navigateToUrl(navHistoryService.generateUrlForRoute(ContributionIds.DashboardsNewExperienceRouteId, getUpdatedState));
    }

    private getDashboardContentViewState(team: string, dashboardId: string, queryParameters?: IDictionaryStringTo<string>): { [key: string]: string } {
        const navHistoryService = getNavigationHistoryService();
        const state = navHistoryService.getState();

        state[UrlConstants.TeamRouteKey] = team;
        state[UrlConstants.IdRouteKey] = dashboardId;
        state[DashboardPageExtension.FragmentID] = null;

        if (queryParameters) {
            Object.keys(queryParameters).forEach((key: string) => {
                state[key] = queryParameters[key];
            });
        }

        return state;
    }

    private navigateToUrl(url: string, isXhr?: boolean): void {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessDashboardsUseFpsNavigation, false)) {
            Service.getLocalService(HubsService).navigateToHub(ContributionIds.DashboardHubId, url)
        }
        else {
            window.location.href = url;
        }
    }
}