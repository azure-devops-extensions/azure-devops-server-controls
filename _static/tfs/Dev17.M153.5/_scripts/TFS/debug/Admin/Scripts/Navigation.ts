import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import AdminNavigationResources = require("Admin/Scripts/Resources/TFS.Resources.Admin.Navigation");
import Locations = require("VSS/Locations");
import SDK_Shim = require("VSS/SDK/Shim");

class ProjectAdminGroupActionSource implements IContributedMenuSource {

    public getMenuItems(): IContributedMenuItem[] {
        const adminArea = "admin";
        const pageContext = Context.getPageContext();
        const webContext = Context.getDefaultWebContext();
        const isHosted = pageContext.webAccessConfiguration.isHosted;

        if (pageContext.navigation.topMostLevel === Contracts_Platform.NavigationContextLevels.Project && !(webContext.team && webContext.team.name)) {
            return [];
        }

        const actions: IContributedMenuItem[] = [];
        actions.push({ separator: true });

        let item: IContributedMenuItem;
        if (pageContext.navigation.topMostLevel === Contracts_Platform.NavigationContextLevels.Project) {
            // Add "Team settings" when on project settings
            item = <IContributedMenuItem>{
                id: "navigate-to-project-settings",
                text: AdminNavigationResources.TeamSettings,
                noIcon: true,
                href: Locations.urlHelper.getMvcUrl({
                    level: Contracts_Platform.NavigationContextLevels.Team,
                    area: adminArea,
                    team: webContext.team.name
                })
            };

            actions.push(item);
        }
        else if (pageContext.navigation.topMostLevel === Contracts_Platform.NavigationContextLevels.Team) {
            // Add "Project settings" when on team settings
            item = <IContributedMenuItem>{
                id: "navigate-to-project-settings",
                text: AdminNavigationResources.ProjectSettings,
                noIcon: true,
                href: Locations.urlHelper.getMvcUrl({
                    level: Contracts_Platform.NavigationContextLevels.Project,
                    area: adminArea
                })
            };

            actions.push(item);
        }

        if (pageContext.navigation.topMostLevel > Contracts_Platform.NavigationContextLevels.Collection) {
            // Add account/collection settings
            item = <IContributedMenuItem>{
                id: "navigate-to-collection-settings",
                text: isHosted ? AdminNavigationResources.AccountSettings : AdminNavigationResources.CollectionSettings,
                noIcon: true,
                href: Locations.urlHelper.getMvcUrl({
                    level: Contracts_Platform.NavigationContextLevels.Collection,
                    area: adminArea
                })
            };

            actions.push(item);
        }

        if (!isHosted && pageContext.navigation.topMostLevel > Contracts_Platform.NavigationContextLevels.Application) {
            // Add server settings for on-premises
            item = <IContributedMenuItem>{
                id: "navigate-to-server-settings",
                text: AdminNavigationResources.ServerSettings,
                noIcon: true,
                href: Locations.urlHelper.getMvcUrl({
                    level: Contracts_Platform.NavigationContextLevels.Application,
                    area: adminArea
                })
            };

            actions.push(item);
        }

        return actions;
    }
}

var hubGroupActions = new ProjectAdminGroupActionSource();

SDK_Shim.VSS.register("ms.vss-web.project-admin-hub-group-actions", () => {
    return hubGroupActions;
});
