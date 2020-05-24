import * as Context from "VSS/Context";
import * as Contracts_Platform from "VSS/Common/Contracts/Platform";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Locations from "VSS/Locations";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Service from "VSS/Service";

import * as NavigationResources from "Admin/Scripts/Resources/TFS.Resources.Admin.Navigation";

const ADMIN_AREA = "admin";
const ORG_AREA = "org";

class OrganizationAdminGroupActionSource implements IContributedMenuSource {
    private _isOrganizationActivated: boolean;

    constructor(isOrganizationActivated: boolean) {
        this._isOrganizationActivated = isOrganizationActivated;
    }

    public getMenuItems(): IContributedMenuItem[] {
        const pageContext = Context.getPageContext();
        const isOrganizationHubGroup = pageContext.hubsContext.hubGroupsCollectionContributionId == "ms.vss-web.organization-hub-groups-collection";

        const actions: IContributedMenuItem[] = [];
        actions.push({ separator: true });

        let item: IContributedMenuItem;
        if (this._isOrganizationActivated
            && isOrganizationHubGroup
            && pageContext.navigation.topMostLevel === Contracts_Platform.NavigationContextLevels.Collection) {
            // Add collection settings
            item = <IContributedMenuItem>{
                id: "navigate-to-collection-settings",
                text: NavigationResources.AccountSettings,
                noIcon: true,
                href: Locations.urlHelper.getMvcUrl({
                    level: Contracts_Platform.NavigationContextLevels.Collection,
                    area: ADMIN_AREA
                })
            };

            actions.push(item);
        }

        if (this._isOrganizationActivated
            && !isOrganizationHubGroup
            && pageContext.navigation.topMostLevel === Contracts_Platform.NavigationContextLevels.Collection) {
            // Add organization settings
            item = <IContributedMenuItem>{
                id: "navigate-to-organization-settings",
                text: NavigationResources.OrganizationSettings,
                noIcon: true,
                href: Locations.urlHelper.getMvcUrl({
                    level: Contracts_Platform.NavigationContextLevels.Collection,
                    area: ORG_AREA
                })
            };

            actions.push(item);
        }

        return actions;
    }
}

SDK_Shim.VSS.register("ms.vss-admin-web.organization-admin-hub-group-actions", () => {
    let dataSvc = Service.getService(Contribution_Services.WebPageDataService);
    let isOrganizationActivated = dataSvc.getPageData<boolean>("ms.vss-admin-web.organization-admin-navigation-data-provider");

    return new OrganizationAdminGroupActionSource(isOrganizationActivated);
});