import * as SDK_Shim from "VSS/SDK/Shim";
import { IMenuItemSpec } from "VSS/Controls/Menus";
import * as VSS from "VSS/VSS";
import * as Context from "VSS/Context";

import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");

import * as Async_Security from "Admin/Scripts/TFS.Admin.Security";

var contributionHandler = () => {
    return {
        getMenuItems: (context): any => {
            const webContext = Context.getDefaultWebContext();
            let actionMenuItems: IMenuItemSpec[] = [];
            actionMenuItems.push({
                text: TFS_Dashboards_Resources.ViewContextMenu_Security,
                title: TFS_Dashboards_Resources.ViewContextMenu_Security,
                action: (actionContext) => {
                    VSS.using(["Admin/Scripts/TFS.Admin.Security"], (TFS_Admin_Security: typeof Async_Security) => {
                        const viewRow = context.viewRow.analyticsView;
                        const analyticsSecurityNamespaceId = "D34D3680-DFE5-4CC6-A949-7D9C68F73CBA";
                        TFS_Admin_Security.SecurityManager.create(analyticsSecurityNamespaceId).showPermissions(viewRow.id, viewRow.name);
                    });
                },
                icon: "css://bowtie-icon bowtie-security"
            });

            return actionMenuItems;
        }
    };
};

SDK_Shim.VSS.register("ms.vss-analytics.analytics-shared-view-security-menu", contributionHandler());