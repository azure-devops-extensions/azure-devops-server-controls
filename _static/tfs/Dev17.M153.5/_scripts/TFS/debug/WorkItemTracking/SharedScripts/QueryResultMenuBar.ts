import * as Menus from "VSS/Controls/Menus";

const toggleFilterId = "toggle-filter";

/**
 * Customized menu bar class used by QueryResultToolbar to make filterbar items appear after contributed toolbar items
 */
export class QueryResultMenuBar extends Menus.MenuBar {
    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    protected _updateItemsWithContributions(items: any, contributedMenuItems: IContributedMenuItem[]) {
        if (!items) {
            items = [];
        }

        // Finding the childItems of the ellipsis toolbar to append the extension menu items
        if (items instanceof Array) {
            if (contributedMenuItems && contributedMenuItems.length > 0) {
                const toggleFilterItem = items.filter((item) => {
                    return item.id === toggleFilterId;
                });
                const menuItems = items.filter((item) => {
                    return item.id !== toggleFilterId;
                });

                if (menuItems) {
                    items = menuItems.concat(contributedMenuItems).concat(toggleFilterItem);
                }
            }
        }

        this._contributedItems = contributedMenuItems;
        this._updateCombinedSource(items);
        this._fire(Menus.Menu.CONTRIBUTION_ITEMS_UPDATED_EVENT, { source: this, existingItems: items, contributedItems: contributedMenuItems });
    }
}