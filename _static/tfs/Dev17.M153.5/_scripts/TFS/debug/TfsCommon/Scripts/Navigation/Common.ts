
import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/Common";

import Context = require("VSS/Context");
import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import Utils_Url = require("VSS/Utils/Url");

export interface HeaderItemAction {
    text?: string;
    commandId?: string;
    url?: string;
    cta?: boolean;
    separator?: boolean;
    targetSelf?: boolean;
    icon?: string;
}

export interface HeaderItemContext {
    available?: boolean;
    actions?: any;
    properties?: any;
}

export interface HeaderRightMenuContext {
    userSettings?: HeaderItemContext;
    adminSettings?: HeaderItemContext;
    extensions?: HeaderItemContext;
    help?: HeaderItemContext;
    rightMenuBar?: HeaderItemContext;
}

export interface HeaderContext {
    rightMenu?: HeaderRightMenuContext;
}

export interface HeaderOptions extends Controls.EnhancementOptions {
    headerContext?: HeaderContext;
}

/**
 * Gets options including headerContext from the specified context data.
 *
 * @param context Context.
 */
export function getHeaderOptions<TOptions extends HeaderOptions>(context: SDK_Shim.InternalContentContextData): TOptions {
    let options: HeaderOptions = {
        headerContext: context.options.headerContext
    };

    return <TOptions>options;
}

/**
 * Gets the item context from header context.

 * @param headerContext Header context.
 * @param key Key of the right menu item.
 */
export function getRightMenuItem<TContext extends HeaderItemContext>(headerContext: HeaderContext, key: string): TContext {
    let context: TContext = null;
    if (!headerContext) {
        let webPageDataService = Service.getService(Contributions_Services.WebPageDataService);
        headerContext = webPageDataService.getPageData(Constants.HeaderContextContributionId);
    }

    if (headerContext && headerContext.rightMenu) {
        context = headerContext.rightMenu[key];
    }

    return context;
}

/**
 * Gets the action for the specified header context item.

 * @param headerContext Header context.
 * @param key Key of the right menu item.
 */
export function getRightMenuItemAction<TContext extends HeaderItemContext>(headerContext: HeaderContext, key: string): any {
    let action: any = null;
    let context = getRightMenuItem<TContext>(headerContext, key);
    return context ? context.actions : null;
}

/**
 * Converts the specified header actions to menu item.
 *
 * @param actions Actions to convert
 * @returns Menu items
 */

export function actionsToMenuItem(actions: HeaderItemAction[]): Menus.IMenuItemSpec[] {
    // Convert actions to menu items
    return actions.filter(a=> Boolean(a)).map(a=> {
        if (!a.separator) {
            let menuItem: Menus.IMenuItemSpec = {
                text: a.text,
                setDefaultTitle: false,
                noIcon: !a.icon,
                icon: a.icon
            };

            if (a.cta === true) {
                menuItem.cssClass = "cta";
            }

            if (a.commandId) {
                menuItem.id = a.commandId;
            } else if (a.url) {
                (<any>menuItem).action = "navigate";
                menuItem.arguments = { url: a.url };
                if (!a.targetSelf) {
                    menuItem.arguments.target = "_blank";
                }
            }

            return menuItem;
        }
        else {
            return <Menus.IMenuItemSpec>{ separator: true };
        }
    });
}

let extensionId = "ms.vss-tfs-web";

export module Constants {
    export var HeaderElementContributionType = "ms.vss-web.header-element";
    export var HubsProviderContributionType = "ms.vss-web.hubs-provider";
    export var L1HubSelectorContributionId = `${extensionId}.header-level1-hub-selector`;
    export var L1HubGroupActionType = `${extensionId}.hub-group-action`;
    export var L2HubsContributionId = `${extensionId}.header-level2-hubs`;
    export var L2HubActionsContributionId = `${extensionId}.header-level2-hub-actions`;
    export var L2CustomHubGroupActionType = `${extensionId}.custom-hub-group-action`;
    export var L2CustomHubActionType = `${extensionId}.custom-hub-action`;
    export var L2HubActionType = `${extensionId}.hub-action-provider`;
    export var L2BarContributionId = `${extensionId}.header-level2-bar`;
    export var HubGroupActionContributionType = `${extensionId}.hub-group-action`;
    export var HeaderContextContributionId = `${extensionId}.navigation-context-data-provider`;
}

export module PageEventConstants {
    export var HubSelectorReady = "hub-selector-ready";
    export var ProjectSelectorReady = "project-selector-ready";
}

export function getDefaultHub<T extends Hub>(name?: string, id?: string): T {
    return <T>{
        builtIn: false,
        groupId: null,
        id: id || null,
        isSelected: false,
        name: name || null,
        uri: null,
        order: 0
    };
}

export function isLevel1Hubs(contributionId: string): boolean {
    return Utils_String.ignoreCaseComparer(contributionId, Constants.L1HubSelectorContributionId) === 0;
}

export function isLevel2Hubs(contributionId: string): boolean {
    return Utils_String.ignoreCaseComparer(contributionId, Constants.L2HubsContributionId) === 0;
}
