import Context = require("VSS/Context");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import Navigation_HubsProvider = require("VSS/Navigation/HubsProvider");
import Navigation_Services = require("VSS/Navigation/Services");
import Q = require("q");
import SDK_Shim = require("VSS/SDK/Shim");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_UserPermissionsHelper = require("Dashboards/Scripts/Common.UserPermissionsHelper");
import VSS_Locations = require("VSS/Locations");
import VSS = require("VSS/VSS");
import * as Utils_String from "VSS/Utils/String";

import TFS_Dashboards_L2Menu_Async = require("Dashboards/Scripts/L2Menu");
import Dialogs_Async = require("VSS/Controls/Dialogs");

interface IDashboardNavigationEntry {
    name: string;
    id: string;
    position: number;
}

let l2MenuPromise: IPromise<TFS_Dashboards_L2Menu_Async.L2Menu>;
function getLegacyL2Menu(): IPromise<TFS_Dashboards_L2Menu_Async.L2Menu> {
    if (!l2MenuPromise) {
        let deferred = Q.defer<TFS_Dashboards_L2Menu_Async.L2Menu>();
        VSS.using(["Dashboards/Scripts/L2Menu"], (TFS_Dashboards_L2Menu: typeof TFS_Dashboards_L2Menu_Async) => {
            let l2Menu = <any>TFS_Dashboards_L2Menu.L2Menu.createIn(TFS_Dashboards_L2Menu.L2Menu, $("<div />").addClass("hidden").appendTo(document.body),
                {
                    distributionAlgo: null,
                    Hub: null,
                    refreshPageOnChange: true
                });

            deferred.resolve(l2Menu);
        });

        l2MenuPromise = deferred.promise;
    }

    return l2MenuPromise;
}

class HubsProvider extends Navigation_HubsProvider.HubsProvider {

    constructor() {
        super(true);
    }

    protected getRootContributedHub(context: IHubsProviderContext): IContributedHub {

        let dashboardEntries = this.getCachedPageData<IDashboardNavigationEntry[]>(
            TFS_Dashboards_Constants.DashboardProviderPropertyBagNames.DashboardsNavigation,
            TFS_Dashboards_Constants.DashboardProviderPropertyBagNames.Dashboards,
            true) || [];

        let pageContext = Context.getPageContext();

        let isDashboardExperience: boolean = (
            pageContext.navigation.currentController === "home"
            || pageContext.navigation.currentController === "dashboards") &&
            pageContext.navigation.currentAction === "index";

        let isProjectLevel: boolean = pageContext.webContext.project &&
            !pageContext.navigation.area;

        let onDashboardPage = isProjectLevel && isDashboardExperience;

        // From a dashboard page, use a hash navigation link rather than the dashboard url.
        let urlRoot = (onDashboardPage ? "#" : (VSS_Locations.urlHelper.getMvcUrl({ controller: "dashboards" }) + "?")) +
            TFS_Dashboards_Constants.DashboardUrlParams.ActiveDashboardId + "=";

        // Find the selected dashboard id
        let selectedId: string;
        if (onDashboardPage) {
            var currentState: any = Navigation_Services.getHistoryService().getCurrentState();
            selectedId = currentState["activeDashboardId"];
            if (!selectedId && dashboardEntries.length > 0) {
                let selectedEntry = dashboardEntries[0];
                for (var i = 1, l = dashboardEntries.length; i < l; i++) {
                    if (dashboardEntries[i].position < selectedEntry.position) {
                        selectedEntry = dashboardEntries[i];
                    }
                }
                selectedId = selectedEntry.id;
            }
        }

        // Convert dashboards to hubs
        let containerHub = Navigation_Common.getDefaultHub<IContributedHub>(TFS_Dashboards_Resources.Dashboards_Title);
        containerHub.beforeSeparator = false;
        containerHub.afterSeparator = true;
        containerHub.order = 1;
        const children = dashboardEntries.map(d => {
            return <IContributedHub>{
                id: d.id,
                name: d.name,
                ariaLabel: Utils_String.format(TFS_Dashboards_Resources.DashboardNameForPageTitle, d.name),
                uri: urlRoot + d.id,
                isSelected: d.id === selectedId,
                order: d.position,
                icon: "bowtie-icon bowtie-dashboard"
            };
        });
        if (Navigation_Common.isLevel1Hubs(context.contributionId)) {
            const defaultItem = <IContributedHub>{
                id: "dashboards",
                name: TFS_Dashboards_Resources.Dashboards_Title,
                uri:  "",
                isSelected: false,
                order: 0
            };
            defaultItem.hidden = true;

            children.unshift(defaultItem);
        }
        containerHub.children = children;

        return containerHub;
    }
}

var hubsProvider = new HubsProvider();

SDK_Shim.VSS.register("dashboards.navigation", () => {
    return hubsProvider;
});

class DashboardsHubActionSource implements IContributedMenuSource {
    private promise: IPromise<IContributedMenuItem[]>;

    public getMenuItems(context: any): IPromise<IContributedMenuItem[]> {
        if (!this.promise) {
            let deferred = Q.defer<IContributedMenuItem[]>();
            this.promise = deferred.promise;

            let allowSettings = TFS_Dashboards_UserPermissionsHelper.CanReadDashboards
            if (allowSettings) {
                let items: IContributedMenuItem[] = [];

                if (this.canShowManageButton()) {
                    items.push({
                        id: "manage-dashboards",
                        title: TFS_Dashboards_Resources.ManageDashboardTooltip,
                        icon: "css://bowtie-icon bowtie-settings-wrench",
                        action: (actionContext: any) => {
                            getLegacyL2Menu().then((l2Menu: TFS_Dashboards_L2Menu_Async.L2Menu) => {
                                l2Menu.getDashboardsRightPanel().showManagementDialog();
                            });
                        }
                    });

                    items.push({ separator: true });
                }

                if (TFS_Dashboards_UserPermissionsHelper.CanCreateDashboards()) {
                    items.push({
                        id: "new-dashboard",
                        text: TFS_Dashboards_Resources.Navigation_NewDashboardActionText,
                        title: TFS_Dashboards_Resources.MenuAddNewDashboard,
                        icon: "css://bowtie-icon bowtie-math-plus",
                        action: (actionContext: any) => {
                            VSS.using(["VSS/Controls/Dialogs", "Dashboards/Scripts/L2Menu"], (
                                Dialogs: typeof Dialogs_Async,
                                TFS_Dashboards_L2Menu: typeof TFS_Dashboards_L2Menu_Async
                            ) => {
                                getLegacyL2Menu().then((l2Menu: TFS_Dashboards_L2Menu_Async.L2Menu) => {
                                    Dialogs.show(TFS_Dashboards_L2Menu.DashboardsInlineEditorDialog, l2Menu.getInlineEditorOptions());
                                });
                            });
                        }
                    });
                }
                deferred.resolve(items);
            }
            else {
                deferred.resolve(null);
            }
        }

        return this.promise;
    }

    private canShowManageButton(): boolean {
        return TFS_Dashboards_UserPermissionsHelper.CanReadDashboards()
    }
}

var dashboardsHubActions = new DashboardsHubActionSource();

SDK_Shim.VSS.register("ms.vss-dashboards-web.dashboards-hub-actions", () => {
    return dashboardsHubActions;
});


SDK_Shim.VSS.register("dashboards.auto-update", (context) => {
    getLegacyL2Menu().then((l2Menu: TFS_Dashboards_L2Menu_Async.L2Menu) => {
        // Append refresh timer control to l2 custom action section for now
        if (l2Menu.refreshTimer) {
            l2Menu.refreshTimer.getElement().appendTo(context.$container);
        }
    });
});
