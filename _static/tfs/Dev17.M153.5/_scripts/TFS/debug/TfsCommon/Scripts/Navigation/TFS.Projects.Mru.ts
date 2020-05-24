/// <reference types="jquery" />

import Ajax = require("VSS/Ajax");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Events_Action = require("VSS/Events/Action");
import Events_Handlers = require("VSS/Events/Handlers");
import Locations = require("VSS/Locations");
import Menus = require("VSS/Controls/Menus");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import Navigation_Utils = require("TfsCommon/Scripts/Navigation/Utils");
import Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import { HubsService } from "VSS/Navigation/HubsService";
import { getLocalService } from "VSS/Service";

export interface IProjectsMruOptions {
    /**
     * Display collection level hubs or not - no matter old or new (default true).
     */
    collectionHubs?: boolean;

    /**
     * Use new collection level hubs or not - Projects, Favorites, Work items, Pull requests (default false).
     */
    useNewCollectionHubs?: boolean;

    /**
     * Display "Browse..." link or not (default false).
     */
    browseLink?: boolean;

    /**
     * Show "New Team..." link or not (default true).
     */
    newTeamLink?: boolean;

    /**
     * Show "New Project..." link or not (default true).
     */
    newProjectLink?: boolean;

    /**
     * Pin current project or not (default false).
     */
    pinCurrentProject?: boolean;

    /**
     * Use project/team icons or not (default false).
     */
    useProjectTeamIcons?: boolean;
}

/**
* Manager for Most-recently-used TFS Projects
*/
export interface IProjectsMru {

    /**
     * 
     */
    setControllerRedirect(controller: string, redirectToController: string): void;

    /**
     * Get menu items for the MRU project entries
     */
    getMruTeamMenuItems(options: IProjectsMruOptions): IPromise<Menus.IMenuItemSpec[]>;
}

interface MruMenuItem extends Menus.IMenuItemSpec {
    hostName?: string;
}

class ProjectsMru implements IProjectsMru {

    private static MaxMruTeamEntries = 5;
    private _controllerRedirects: IDictionaryStringTo<string>;

    /**
     * Sets an entry to redirect from the specified controller name to a different controller when switching projects.
     */
    public setControllerRedirect(controller: string, redirectToController: string): void {
        if (!controller || !redirectToController) {
            return;
        }

        if (!this._controllerRedirects) {
            this._controllerRedirects = {};
        }

        this._controllerRedirects[controller.toLowerCase()] = redirectToController;
    }

    public getMruTeamMenuItems(options: IProjectsMruOptions): IPromise<Menus.IMenuItemSpec[]> {
        options = options || {};
        let pageContext = Context.getPageContext();
        let isOrgLevel = pageContext.navigation.topMostLevel < Contracts_Platform.NavigationContextLevels.Collection;
        // Don't include any collection link at org/server level
        if (isOrgLevel) {
            options.useNewCollectionHubs = false;
        }

        var url = Locations.urlHelper.getMvcUrl({
            action: options.useNewCollectionHubs ? "MruContextsWithAccountHubGroups" : "MruNavigationContexts",
            controller: "common",
            area: "api",
            queryParams: {
                maxCount: "" + ProjectsMru.MaxMruTeamEntries
            }
        });

        return Ajax.issueRequest(url, { type: "GET", dataType: "json" }).then((result: JsonArrayWrapper) => {

            var items: MruMenuItem[] = [];
            var controller: string;
            var action: string;
            var currentController = pageContext.navigation.currentController;
            let area: string;
            let parameters: string;
            let hubContributionId: string;

            let isProjectContext = pageContext.navigation.topMostLevel >= Contracts_Platform.NavigationContextLevels.Project;
            if (currentController && isProjectContext) {
                controller = this._controllerRedirects ? this._controllerRedirects[currentController.toLowerCase()] || currentController : currentController;
                action = pageContext.navigation.currentAction;
                area = pageContext.navigation.area;
                parameters = pageContext.navigation.currentParameters;
                hubContributionId = getLocalService(HubsService).getSelectedHubId();
            }
            else {
                controller = "home";
            }

            let resultArray: any[] = <any>result.__wrappedArray;

            let pinnedProjectExists = options.pinCurrentProject && isProjectContext;
            let currentProject = pinnedProjectExists ? pageContext.webContext.project.name : "";
            if (pinnedProjectExists) {
                // Add current project item to the top of the MRU
                let itemUrl = Locations.urlHelper.getMvcUrl({
                    action: "",
                    controller: "",
                    area: "",
                    level: Contracts_Platform.NavigationContextLevels.Project,
                    project: currentProject,
                    team: ""
                });

                items.push({
                    cssClass: "pinned-project",
                    text: Utils_String.format(Resources.PinnedProjectText, currentProject),
                    icon: "bowtie-icon bowtie-home-fill",
                    setTitleOnlyOnOverflow: true,
                    href: itemUrl,
                    groupId: "pinned-project-org"
                });

                let orgHomeUrlItem = Utils_Array.first(resultArray, item => item.isOrgHomePageUrl === true);

                if (orgHomeUrlItem) {

                    let orgHomeUrl = Navigation_Utils.getUrlWithTrackingData(
                        orgHomeUrlItem.orgHomePageUrl,
                        {
                            "Source": "TfsProjectMruList"
                        });

                    items.push({
                        text: orgHomeUrlItem.title,
                        icon: "bowtie-icon bowtie-city-next",
                        setTitleOnlyOnOverflow: true,
                        href: orgHomeUrl,
                        groupId: "pinned-project-org",
                    });
                }
            }

            let separatorAdded = false;
            let browseGroupId = "pinned-project-org";

            let mruItems = resultArray.filter(item => item.isMru === true);
            let hubGroups = <HubGroup[]>resultArray.filter(item => item.isMru !== true);

            let duplicateNameMap: IDictionaryStringTo<number> = {};
            let isProjectOverviewHub = hubContributionId &&
                Utils_String.localeIgnoreCaseComparer(hubContributionId, "ms.vss-tfs-web.project-overview-hub") === 0;

            $.each(mruItems, (i: number, mruItem: any) => {
                // Skip the project if it is already pinned
                if (pinnedProjectExists && !mruItem.team && Utils_String.equals(currentProject, mruItem.project, true)) {
                    return;
                }

                // Add separator if there are any recent items
                if (!separatorAdded) {
                    separatorAdded = true;
                    browseGroupId = "mru";
                    items.push({
                        cssClass: "project-separator",
                        separator: true,
                        text: Resources.RecentProjectsTeamsLabel,
                        setDefaultTitle: false,
                        groupId: "mru"
                    });
                }

                // the project overview hub can only be switched between projects. In case of teams, such a switch should take to the root (home) which would be dashboards. 
                if (isProjectOverviewHub && mruItem.team) {
                    hubContributionId = null;
                }

                let itemName: string,
                    itemTitle: string,
                    itemUrl: string,
                    itemIcon: string;

                if (!mruItem.project) {
                    itemName = Resources.NavigationContextMenuDefaultLabel;
                    itemTitle = Resources.NavigationContextMenuDefaultLabelTitle;
                }
                else if (!mruItem.team) {
                    itemName = mruItem.project;
                    itemTitle = Utils_String.format(Resources.NavigationContextMenuProjectLabelTitleFormat, mruItem.project);
                    itemIcon = options.useProjectTeamIcons ? "bowtie-icon bowtie-briefcase" : "";
                }
                else {
                    itemName = Utils_String.format(Resources.NavigationContextMenuTeamLabelFormat, mruItem.project, mruItem.team);
                    itemTitle = Utils_String.format(Resources.NavigationContextMenuTeamLabelTitleFormat, mruItem.team, mruItem.project);
                    itemIcon = options.useProjectTeamIcons ? "bowtie-icon bowtie-users" : "";
                }

                let itemNameLower = itemName.toLowerCase();
                if (!duplicateNameMap[itemNameLower]) {
                    duplicateNameMap[itemNameLower] = 1;
                }
                else {
                    duplicateNameMap[itemNameLower] = 2; // there are duplicates, 2 really doesn't matter here as long as the number here is greater than 1
                }

                itemUrl = Locations.urlHelper.getMvcUrl({
                    action: "RedirectMru",
                    controller: "Mru",
                    area: "",
                    level: mruItem.serviceHost ? mruItem.serviceHost.hostType : undefined,
                    webContext: this.convertToWebContext(mruItem.serviceHost, pageContext.webContext),
                    project: mruItem.project,
                    team: mruItem.team,
                    queryParams: {
                        toController: controller,
                        toRouteArea: area,
                        toAction: action,
                        toParameters: parameters,
                        toHubContribution: hubContributionId
                    }
                });


                items.push({
                    hostName: mruItem.serviceHost ? mruItem.serviceHost.name : "",
                    text: itemName,
                    title: itemTitle,
                    icon: itemIcon,
                    setTitleOnlyOnOverflow: true,
                    href: itemUrl,
                    groupId: "mru"
                });
            });

            for (let item of items) {
                let itemNameLower = item.text.toLowerCase();
                if (duplicateNameMap[itemNameLower] > 1 && item.hostName) {
                    item.text = Utils_String.format(Resources.ProjectWithCollectionLabel, item.text, item.hostName);
                }
            }

            if (options.browseLink) {
                let projectsHubGroup = Utils_Array.first(hubGroups, hg => hg.id === "ms.vss-tfs-web.collection-project-hub-group");
                if (isOrgLevel || !projectsHubGroup) {
                    // At org level, show the dialog
                    items.push({
                        cssClass: "browse-all",
                        text: Resources.BrowseAllTeams,
                        setDefaultTitle: false,
                        action: () => {
                            VSS.using(["Admin/Scripts/TFS.Admin.Registration.HostPlugins"], () => {
                                Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs('browseTeams', {}, null));
                            });
                        },
                        groupId: browseGroupId
                    });
                }
                else {
                    items.push({
                        text: Resources.BrowseAllTeams,
                        setDefaultTitle: false,
                        href: projectsHubGroup.uri,
                        groupId: browseGroupId
                    });
                }
            }

            // Add rest of the drop down items only for collection/project/team
            if (pageContext.navigation.topMostLevel >= Contracts_Platform.NavigationContextLevels.Collection) {
                if (options.collectionHubs !== false) {
                    if (hubGroups.length === 0) {
                        // Render "Account/Server Home" item if hub groups are not added individually
                        items.push({
                            text: pageContext.webAccessConfiguration.isHosted ? Resources.NavigationContextMenuHostedBackTo : Resources.NavigationContextMenuOnPremBackTo,
                            setDefaultTitle: false,
                            href: pageContext.webAccessConfiguration.paths.rootPath,
                            groupId: "links"
                        });
                    }
                    else {
                        // Render new collection hubs individually
                        let builtInHubGroups = hubGroups.filter(hg => hg.builtIn);
                        let moreHubGroups = hubGroups.filter(hg => !hg.builtIn);

                        for (let hubGroup of builtInHubGroups) {
                            items.push({
                                text: hubGroup.name,
                                setDefaultTitle: false,
                                href: hubGroup.uri,
                                icon: hubGroup.icon,
                                groupId: "links"
                            });
                        }

                        if (moreHubGroups.length > 0) {
                            let moreItems: MruMenuItem[] = [];
                            items.push({
                                text: Resources.ProjectSelectorMoreItemText,
                                setDefaultTitle: false,
                                groupId: "links",
                                childItems: moreItems,
                                childOptions: { cssClass: "more-items" }
                            });

                            for (let hubGroup of moreHubGroups) {
                                moreItems.push({
                                    text: hubGroup.name,
                                    setDefaultTitle: false,
                                    href: hubGroup.uri
                                });
                            }
                        }
                    }
                }

                // Add new team action when under project/team level
                if (isProjectContext && options.newTeamLink !== false) {
                    items.push({
                        text: Resources.NewTeamText,
                        setDefaultTitle: false,
                        icon: "bowtie-icon bowtie-users",
                        action: () => {
                            VSS.using(["Admin/Scripts/TFS.Admin.Registration.HostPlugins"], () => {
                                Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs('create-team', {}, null));
                            });
                        },
                        groupId: "actions"
                    });
                }

                if (options.newProjectLink !== false) {
                    items.push({
                        text: Resources.NewTeamProjectText,
                        setDefaultTitle: false,
                        icon: "bowtie-icon bowtie-math-plus",
                        action: () => {
                            VSS.using(["Admin/Scripts/TFS.Admin.Registration.HostPlugins"], () => {
                                Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs('create-team-project', {}, null));
                            });
                        },
                        groupId: "actions"
                    });
                }
            }

            return items;
        });
    }

    private convertToWebContext(mruEntry: any, originalContext: Contracts_Platform.WebContext): Contracts_Platform.WebContext {
        var newContext: Contracts_Platform.WebContext = $.extend(true, {}, originalContext);
        newContext.host.hostType = mruEntry.hostType;
        newContext.host.id = mruEntry.instanceId;
        newContext.host.relativeUri = mruEntry.vDir;

        if (mruEntry.hostType >= Contracts_Platform.ContextHostType.ProjectCollection) {
            newContext.collection = newContext.host;
        }
        else {
            newContext.collection = null;
            newContext.account = newContext.host;
        }

        return newContext;
    }
}

/**
 * Most-recently-used Projects helper
 */
export var projectsMru: IProjectsMru = new ProjectsMru();

