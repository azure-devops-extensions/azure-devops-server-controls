import Q = require("q");

import { IMenuItemSpec } from "VSS/Controls/Menus";
import SDK_Shim = require("VSS/SDK/Shim");
import * as VSS from "VSS/VSS";
import * as Service from "VSS/Service";
import { ExtensionService } from "VSS/Contributions/Services";
import * as Context from "VSS/Context";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as TFS_Dashboards_Constants_Async from "Dashboards/Scripts/Generated/Constants";
import * as TFS_Dashboards_WidgetDataForPinning_Async from "Dashboards/Scripts/Pinning.WidgetDataForPinning";
import * as TFS_Dashboards_PushToDashboard_Async from "Dashboards/Scripts/Pinning.PushToDashboard";
import * as TFS_Dashboards_PushToDashboardInternal_Async from "Dashboards/Scripts/Pinning.PushToDashboardInternal";
import * as TFS_Dashboards_PushToDashboardConstants_Async from "Dashboards/Scripts/Pinning.PushToDashboardConstants";

(function () {
    const menu = {
        getMenuItems
    };

    // Fullqualified path for work item delete menu
    SDK_Shim.VSS.register("ms.vss-work-web.query-push-to-dashboard-menu", menu);
}());

// caching the modules once loaded since the menu pops in later if
// we have to resolve every time which is not ideal.
let modulesLoaded = false;
let WidgetDataForPinning: typeof TFS_Dashboards_WidgetDataForPinning_Async;
let PushToDashboard: typeof TFS_Dashboards_PushToDashboard_Async;
let PushToDashboardInternal: typeof TFS_Dashboards_PushToDashboardInternal_Async;
let PushToDashboardConstants: typeof TFS_Dashboards_PushToDashboardConstants_Async;
let DashboardConstants: typeof TFS_Dashboards_Constants_Async;

export function getMenuItems(context: any): Q.Promise<IMenuItemSpec[]> {
    const deferred = Q.defer<IMenuItemSpec[]>();

    if (!context.query.wiql || !context.query.isPublic) {
        // Do not allow push to dashboard on folder or private query
        deferred.resolve([]);
        return deferred.promise;
    }

    const webContext = Context.getDefaultWebContext();
    if (!webContext.project) {
        // Do not allow push to dashboard if we dont have a project.
        deferred.resolve([]);
        return deferred.promise;
    }

    const createMenu = (
        TFS_Dashboards_WidgetDataForPinning: typeof TFS_Dashboards_WidgetDataForPinning_Async,
        TFS_Dashboards_PushToDashboard: typeof TFS_Dashboards_PushToDashboard_Async,
        TFS_Dashboards_PushToDashboardInternal: typeof TFS_Dashboards_PushToDashboardInternal_Async,
        TFS_Dashboards_PushToDashboardConstants: typeof TFS_Dashboards_PushToDashboardConstants_Async,
        TFS_Dashboards_Constants: typeof TFS_Dashboards_Constants_Async): void => {
        const queryId = context.query.id;
        const queryName = context.query.name;
        const widgetTypeId = TFS_Dashboards_PushToDashboardConstants.QueryScalar_WidgetTypeID;
        const widgetData = new TFS_Dashboards_WidgetDataForPinning.WidgetDataForPinning(queryName, widgetTypeId,
            JSON.stringify({
                queryId: queryId,
                queryName: queryName
            }));

        Service.getService(ExtensionService).getContribution(TFS_Dashboards_Constants.DashboardProviderPropertyBagNames.TeamContextData).then(() => {
            const menuItem = TFS_Dashboards_PushToDashboard.PushToDashboard.createMenu(TfsContext.getDefault().contextData, widgetData, (args: TFS_Dashboards_PushToDashboardInternal_Async.PinArgs) => {});

            if (!menuItem.icon.match(/^css:\/\//)) {
                // For contributions, it is required to use the url format
                menuItem.icon = `css://query-push-to-dashboard-menu-item ${menuItem.icon}`;
            }

            deferred.resolve([menuItem]);
        }, () => {
            deferred.resolve([]);
        });
    }

    if (modulesLoaded) {
        createMenu(WidgetDataForPinning, PushToDashboard, PushToDashboardInternal, PushToDashboardConstants, DashboardConstants);
    } else {
        VSS.requireModules([
            "Dashboards/Scripts/Pinning.WidgetDataForPinning",
            "Dashboards/Scripts/Pinning.PushToDashboard",
            "Dashboards/Scripts/Pinning.PushToDashboardInternal",
            "Dashboards/Scripts/Pinning.PushToDashboardConstants",
            "Dashboards/Scripts/Generated/Constants"])
            .spread((
                TFS_Dashboards_WidgetDataForPinning: typeof TFS_Dashboards_WidgetDataForPinning_Async,
                TFS_Dashboards_PushToDashboard: typeof TFS_Dashboards_PushToDashboard_Async,
                TFS_Dashboards_PushToDashboardInternal: typeof TFS_Dashboards_PushToDashboardInternal_Async,
                TFS_Dashboards_PushToDashboardConstants: typeof TFS_Dashboards_PushToDashboardConstants_Async,
                TFS_Dashboards_Constants: typeof TFS_Dashboards_Constants_Async) => {
                WidgetDataForPinning = TFS_Dashboards_WidgetDataForPinning;
                PushToDashboard = TFS_Dashboards_PushToDashboard;
                PushToDashboardInternal = TFS_Dashboards_PushToDashboardInternal;
                PushToDashboardConstants = TFS_Dashboards_PushToDashboardConstants;
                DashboardConstants = TFS_Dashboards_Constants;
                modulesLoaded = true;
                createMenu(WidgetDataForPinning, PushToDashboard, PushToDashboardInternal, PushToDashboardConstants, DashboardConstants);
            });
    }

    return deferred.promise;
}
