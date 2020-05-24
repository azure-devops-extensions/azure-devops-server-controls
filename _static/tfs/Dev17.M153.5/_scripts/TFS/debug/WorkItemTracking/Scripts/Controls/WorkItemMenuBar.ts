import Menus = require("VSS/Controls/Menus");

// Customized menu bar class used by the new work item form, to make the extension menu items appear inside the ellipsis
export class WorkItemMenuBar extends Menus.MenuBar {
    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions(options);
    }

    protected _updateItemsWithContributions(items: any, contributedMenuItems: IContributedMenuItem[]) {

        if (!items) {
            items = [];
        }

        // check if popup menu was open before this function is called
        var actionsMenu = this.getItem("actions");
        var dropdownVisible = false;
        if (actionsMenu && actionsMenu.hasSubMenu()) {
            dropdownVisible = actionsMenu.getSubMenu()._visible;
        }

        // Finding the childItems of the ellipsis toolbar to append the extension menu items
        if ($.isArray(items)) {
            if (contributedMenuItems && contributedMenuItems.length) {
                var actionMenu = items.filter((item) => {
                    return item.id === "actions";
                });

                if (actionMenu && actionMenu[0] && $.isArray(actionMenu[0].childItems)) {
                    var childItems = actionMenu[0].childItems.filter((menu) => {
                        return !menu.isContribution;
                    });
                    var childItems = Menus.sortMenuItems(childItems.concat(contributedMenuItems));
                    actionMenu[0].childItems = childItems;
                }
            }
        }

        this._contributedItems = contributedMenuItems;
        this._updateCombinedSource(items);

        // if the popup menu was open initially, reopen it
        // we need to get actions menuitem again because the items were redrawn above
        if (dropdownVisible) {
            actionsMenu = this.getItem("actions");
            if (actionsMenu && actionsMenu.hasSubMenu()) {
                actionsMenu.showSubMenu({ immediate: true });
            }
        }
    }

    public getMenuItemAlignment(): string {
        return "right-bottom";
    }
}