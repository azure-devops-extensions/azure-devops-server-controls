import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import Serialization = require("VSS/Serialization");
import Contribution_Services = require("VSS/Contributions/Services");
import VSS_Service = require("VSS/Service");
import { DashboardPageDataProviderKeys, DashboardRouteIds } from "Dashboards/Scripts/Generated/Constants";

interface WrappedValue{
    value: number;
}

/**
 *  Gets data from the page. Takes in a property name for the contributed data provider and falls back to a json island when available.
 * @param propertyName
 * @param fallbackJsonIslandName
 */
export function getFromPage<T>(propertyName: string, fallbackJsonIslandName?: string): T {
    let webPageDataSvc = VSS_Service.getService(Contribution_Services.WebPageDataService);
    let contentContainer = webPageDataSvc.getPageData<WrappedValue>(TFS_Dashboards_Constants.DashboardProviderPropertyBagNames.DashboardsContent);
    let data: T;

    //Note: Page state can be empty if we use dashboard Client APIs outside the dashboard page.
    if (contentContainer && contentContainer.value) {
        data = contentContainer.value[propertyName];
    }

    if (!data && fallbackJsonIslandName) {
        data = Serialization.deserializeJsonIsland<T>($("." + fallbackJsonIslandName), null);
    }

    return data;
}

/**
 * Checks whether the environment allows for opening a new tab/window and asynchronously reassigning the URL later.
 */
export function isEmbeddedPage(): boolean {
    let routeId = getFromPage(DashboardPageDataProviderKeys.RouteId);
    return routeId === DashboardRouteIds.NewExperienceEmbedded;
}