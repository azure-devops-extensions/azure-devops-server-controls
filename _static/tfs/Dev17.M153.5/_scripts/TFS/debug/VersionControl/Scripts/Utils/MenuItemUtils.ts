import { IMenuItemSpec } from "VSS/Controls/Menus";

/*
 * Compares two arrays of menu items and returns true if both the arrays are equal.
 */
export function areMenuItemsArraysEqual(menuItemList: IMenuItemSpec[], otherMenuItemList: IMenuItemSpec[]): boolean {
    let areMenuItemsArraysEqual: boolean;

    if (!menuItemList && !otherMenuItemList) {
        areMenuItemsArraysEqual = true;
    } else {
        areMenuItemsArraysEqual = !!menuItemList
            && !!otherMenuItemList
            && menuItemList.length === otherMenuItemList.length
            && menuItemList.every((menuItem, index) => (menuItem.id === otherMenuItemList[index].id
                && menuItem.icon === otherMenuItemList[index].icon))
    }

    return areMenuItemsArraysEqual;
}