
import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/L1.NavigationText";

import Ajax = require("VSS/Ajax");
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { registerContent, InternalContentContextData } from "VSS/SDK/Shim";
import { MenuBar, IMenuItemSpec } from "VSS/Controls/Menus";
import { Control, Enhancement } from "VSS/Controls";
import { urlHelper } from "VSS/Locations";
import Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import { getService as getEventsService } from "VSS/Events/Services";
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { ProjectSelector, ProjectSelectorOptions, getPageDataOverrides } from "TfsCommon/Scripts/Navigation/L1.ProjectSelector";

class CollectionPicker extends MenuBar {
    initialize(): void {
        super.initialize();

        // Populate child items when sub menu opened
        this.getItem("collection-text").updateItems(function (contextInfo: any, callback: IResultCallback, errorCallback?: IErrorCallback) {
            var getCollectionUrl = urlHelper.getMvcUrl({ action: "GetCollections", controller: "common", area: "api" });

            // Perform an ajax request to get the list of available collections
            Ajax.issueRequest(getCollectionUrl, { type: "GET", dataType: "json" }).then((result: JsonArrayWrapper) => {
                let collections = <HostContext[]><any>result.__wrappedArray;

                let collectionMenuItems: Array<IMenuItemSpec> = [];

                collectionMenuItems.push(
                    <IMenuItemSpec>{
                        separator: true,
                        text: Resources.CollectionsLabel,
                        setDefaultTitle: false
                    }
                );

                collections.forEach(c => {
                    collectionMenuItems.push(<IMenuItemSpec>{
                        text: c.name,
                        href: c.uri,
                        noIcon: true
                    });
                });

                callback(collectionMenuItems);
            }, errorCallback);
        });
    }
}


function convertTextToMenuItem(context: InternalContentContextData, id: string, cssClass: string): IMenuItemSpec {
    let $navigationText = context.$container.find(".l1-navigation-text");
    // We get the navigation text
    let navigationText = $navigationText.text();

    // This is the visible item
    return <IMenuItemSpec>{
        id: id,
        text: navigationText,
        setTitleOnlyOnOverflow: true,
        cssClass: cssClass,
        noIcon: true,
        childItems: [],
        idIsAction: false
    };
}

function loadNavigationTextMenu(context: InternalContentContextData): void {
    let navigationTextClass = "l1-navigation-text";
    let navigationMenuClass = "l1-navigation-menu";
    let collectionPickerClass = "l1-collection-picker";

    let showCollectionPicker = false;
    let $container = context.$container;

    // See any data provider wants to override the default settings
    let webPageDataService = getService(WebPageDataService);
    let settings = webPageDataService.getPageDataByDataType("navigation-settings");
    if (settings) {
        for (let key in settings) {
            if (settings.hasOwnProperty(key)) {
                // Use settings coming from page data
                let overridenSettings: any = settings[key];
                if (typeof overridenSettings.collectionPicker === "boolean") {
                    showCollectionPicker = overridenSettings.collectionPicker;
                }
            }
        }
    }

    if (showCollectionPicker === true) {
        // Convert the text to collection picker
        let $collectionPicker = $container.find(`.${collectionPickerClass}`);
        if ($collectionPicker.length === 0) {
            Control.create(CollectionPicker, $container, {
                useBowtieStyle: true,
                cssClass: collectionPickerClass,
                items: [convertTextToMenuItem(context, "collection-text", navigationTextClass)]
            });
        }

        // Toggle elements according to the settings
        $container.find(`.menu-bar.${collectionPickerClass}`).show();
        $container.find(`span.${navigationTextClass}`).hide();
    }
    else {
        let showDropdown = false;
        let overridenOptions: ProjectSelectorOptions = getPageDataOverrides();
        if (overridenOptions.mainMenuDropDown !== false) {
            let $navigationMenu = $container.find(`.${navigationMenuClass}`);
            if ($navigationMenu.length === 0) {
                // Convert navigation text into project/team context menu
                Control.create(ProjectSelector, $container, <ProjectSelectorOptions>{
                    cssClass: `${navigationMenuClass} project-selector-nav-menu`,
                    useBowtieStyle: true,
                    items: [convertTextToMenuItem(context, "teams", navigationTextClass)],
                    browseLink: true,
                    collectionHubs: false,
                    useNewCollectionHubs: true,
                    useProjectTeamIcons: true,
                    newProjectLink: false,
                    pinCurrentProject: true
                });
            }
            else {
                let navigationMenu = <ProjectSelector>Enhancement.getInstance(ProjectSelector, $navigationMenu);
                navigationMenu.resetMru();
            }

            showDropdown = true;
        }

        // Toggle elements according to the settings
        $container.find(`.menu-bar.${navigationMenuClass}`).toggle(showDropdown);
        $container.find(`span.${navigationTextClass}`).toggle(!showDropdown);
    }
}

registerContent("navbar.level1.navigationText", (context) => {
    loadNavigationTextMenu(context);

    getEventsService().attachEvent(HubEventNames.PostXHRNavigate, (sender: any, args: IHubEventArgs) => {
        loadNavigationTextMenu(context);
    });
});
