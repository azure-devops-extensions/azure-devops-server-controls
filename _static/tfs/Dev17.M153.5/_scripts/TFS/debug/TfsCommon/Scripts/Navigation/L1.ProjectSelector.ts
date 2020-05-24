
import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/L1.ProjectSelector";

import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Events_Page = require("VSS/Events/Page");
import Menus = require("VSS/Controls/Menus");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");
import VSS = require("VSS/VSS");

import ProjectsMru_Async = require("TfsCommon/Scripts/Navigation/TFS.Projects.Mru");

export interface ProjectSelectorOptions extends Menus.MenuBarOptions, ProjectsMru_Async.IProjectsMruOptions {
    mainMenuDropDown?: boolean;
}

export class ProjectSelector extends Menus.MenuBar {
    initializeOptions(options?: ProjectSelectorOptions) {
        super.initializeOptions($.extend({
            cssClass: "project-selector-nav-menu" // This class name is necessary for global hotkeys
        }, options));
    }

    private getOptions(): ProjectSelectorOptions {
        return <ProjectSelectorOptions>this._options;
    }

    private getVisibleMenuItem(): Menus.MenuItem {
        return this.getItem("teams");
    }

    initialize(): void {
        super.initialize();

        const this_projectSelector = this;

        // Populate child items when sub menu opened
        this.getVisibleMenuItem().updateItems(function (contextInfo: any, callback: IResultCallback, errorCallback?: IErrorCallback) {
            // Purposefully not a => function, 'this' is the calling Menu
            const popup: Menus.Menu<Menus.MenuOptions> = this;

            VSS.using(["TfsCommon/Scripts/Navigation/TFS.Projects.Mru"], (Projects_Mru: typeof ProjectsMru_Async) => {
                let options = this_projectSelector.getOptions();
                Projects_Mru.projectsMru.getMruTeamMenuItems(options).then(
                    (items: Menus.IMenuItemSpec[]) => {
                        callback(items);

                        const projectSelectorWidth = this_projectSelector._element.width();
                        const popupWidth = popup._element.width();
                        // Match popup with to project selector if it's narrower
                        if (popupWidth < projectSelectorWidth) {
                            popup._element.width(projectSelectorWidth);
                        }

                    }, errorCallback);
            });
        });

        Events_Page.getService().fire(Navigation_Common.PageEventConstants.ProjectSelectorReady);
    }

    public resetMru(): void {
        this.getVisibleMenuItem()._clear();
    }

    public _getMenuItemType(): any {
        return ProjectSelectorMenuItem;
    }

    public updateSettings(settings: ProjectSelectorOptions): void {
        this.openSubMenuOnHover = settings.mainMenuDropDown !== false;
    }
}

/**
 * This menu item is used to intercept showing/hiding popup so that, project selected indicator can be changed (confusing with account selector popup)
 */
export class ProjectSelectorMenuItem extends Menus.MenuItem {
    private static s_projectHubGroupId = "ms-vss-tfs-web-project-team-hub-group";
    private _projectSelected: boolean;

    public initializeOptions(options?: any) {
        super.initializeOptions({ ariaLabel: Resources.ProjectSelectorLabel, ...options });
    }

    public _decorate() {
        super._decorate();
        this._element.children("a").attr("tabindex", "-1");
    }

    showSubMenu(options?: any): void {
        super.showSubMenu(options);

        const $projectHubGroup = $(`.menu-item.${ProjectSelectorMenuItem.s_projectHubGroupId}`);
        this._projectSelected = $projectHubGroup.hasClass("selected");
        if (this._projectSelected) {
            $projectHubGroup.removeClass("selected");
        }
    }

    hideSubMenu(options?: any): void {
        super.hideSubMenu(options);

        if (this._projectSelected) {
            $(`.menu-item.${ProjectSelectorMenuItem.s_projectHubGroupId}`).addClass("selected");
        }
    }
}

export function getPageDataOverrides(): ProjectSelectorOptions {
    // See any data provider wants to override the default settings
    let webPageDataService = Service.getService(Contributions_Services.WebPageDataService);
    let settings = webPageDataService.getPageDataByDataType("navigation-settings");
    let overridenSettings: ProjectSelectorOptions = {};
    if (settings) {
        for (let key in settings) {
            if (settings.hasOwnProperty(key)) {
                // Use settings coming from page data
                overridenSettings = $.extend(overridenSettings, settings[key]);
            }
        }
    }

    return overridenSettings;
}

SDK_Shim.registerContent("navbar.level1.projectSelector", (context) => {
});
