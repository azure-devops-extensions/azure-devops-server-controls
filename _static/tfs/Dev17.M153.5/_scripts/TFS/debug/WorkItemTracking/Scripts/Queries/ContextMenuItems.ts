import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import { IContextualMenuItem, IContextualMenuProps } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";

const ADD_TO_MY_FAVORITES_ACTION: string = "add-to-my-favorites";
const ADD_TO_TEAM_FAVORITES_ACTION: string = "add-to-team-favorites";
const ADD_TO_TEAM_QUERIES_ACTION: string = "add-to-team-queries";
const REMOVE_FROM_MY_FAVORITES_ACTION: string = "remove-from-my-favorites";
const REMOVE_FROM_TEAM_FAVORITES_ACTION: string = "remove-from-team-favorites";
const REMOVE_FROM_TEAM_QUERIES_ACTION: string = "remove-from-team-queries";
const PIN_TO_HOMEPAGE_ACTION: string = "pin-to-homepage";
const UNPIN_FROM_HOMEPAGE_ACTION: string = "unpin-from-homepage";
const ITEM_SECURITY_ACTION: string = "item-security";

export function addToTeamFavorites(teamContextMenus: IContextualMenuItem[], disabled?: boolean): IContextualMenuItem {
    return {
        key: ADD_TO_TEAM_QUERIES_ACTION,
        name: PresentationResources.AddToTeamFavoritesContextMenuItem,
        disabled: disabled == null ? false : disabled,
        groupName: QueriesHubConstants.MinePageAction,
        subMenuProps: {
            items: teamContextMenus
        }
    };
}

export function removeFromTeamFavorites(teamContextMenus: IContextualMenuItem[], disabled?: boolean): IContextualMenuItem {
    return {
        key: REMOVE_FROM_TEAM_QUERIES_ACTION,
        name: PresentationResources.RemoveFromTeamFavoritesContextMenuItem,
        disabled: disabled == null ? false : disabled,
        groupName: QueriesHubConstants.MinePageAction,
        subMenuProps: {
            items: teamContextMenus
        }
    };
}

export function security(): IContextualMenuItem {
    return {
        key: ITEM_SECURITY_ACTION,
        name: PresentationResources.ItemSecurityTitle,
        groupName: "security",
    };
}

export function divider(menuItems: IContextualMenuItem[]): IContextualMenuItem {
    let dividerNum = 1;
    const dividerPrefix = "divider_";
    const dividerName = "-";

    for (var menuItem of menuItems) {
        if (menuItem.key.indexOf(dividerPrefix) === 0) {
            var num = parseInt(menuItem.key.substring(dividerPrefix.length));
            if (!isNaN(num)) {
                dividerNum = num + 1;
            }
        }
    }

    return {
        key: dividerPrefix + dividerNum,
        name: dividerName,
    } as IContextualMenuItem;
}
