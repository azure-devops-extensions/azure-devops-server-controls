import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { getLocalService } from "VSS/Service";
import { HubsService } from "VSS/Navigation/HubsService";
import {
    DirectoryPivotType,
    TestPlanRouteParameters
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import * as Service from "VSS/Service";

export class TestPlanDirectoryUrls {

    public static getNewTestPlanDirectoryUrl(pivot: DirectoryPivotType): string {
        const state = {
            [TestPlanRouteParameters.Pivot]: pivot
        };

        return this.getUrlForRoute("ms.vss-test-web.test-plan-directory-route", state);
    }

    public static navigateToNewTestPlanHubUrl(url: string): void {
        this.navigateToHubUrl(url, TestPlanRouteParameters.NewHubContributionId);
    }

    public static navigateToLiteTestPlanHubUrl(url: string): void {
        this.navigateToHubUrl(url, TestPlanRouteParameters.liteHubContributionId);
    }

    private static getUrlForRoute(routeId: string, state: {
        [key: string]: string;
    }): string {

        return getNavigationHistoryService().generateUrlForRoute(routeId, state);
    }

    private static navigateToHubUrl(url: string, hubId: string) {
        const hubsService = getLocalService(HubsService);
        hubsService.navigateToHub(hubId, url);
    }

}