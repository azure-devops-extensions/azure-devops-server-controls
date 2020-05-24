import * as Menus from "VSS/Controls/Menus";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";

export interface CollapsibleMenuItemSpec extends Menus.IMenuItemSpec {
    /**
     * Determines the order of items to be collapsed/expanded from the More
     * Dropdown when the window is resized. Higher values will be collapsed first.
     */
    collapseOrder?: number;

    /**
     * This item will never collapse into the More menu
     */
    neverCollapse?: boolean;

    /**
     * If true, when this menu item is collapsed, its children will be removed
     * (and restored when it is re-expanded).
     */
    removeChildrenOnCollapse?: boolean;
}

export interface CollapsibleMenuOptions extends Menus.MenuBarOptions {
    /**
     * ID of the item that overflow items will be collapsed to. Will be hidden when
     * it has no children.
     */
    moreItemId: string;

    /**
     * Function that returns the available width that this menu bar must
     * try to accommodate
     */
    getAvailableWidth: () => number;

    /**
     * CSS class to add to the More item when something gets collapsed to it.
     * Useful for adding a visual cue that something was collapsed.
     */
    collapseToMoreAnimationClass?: string;

    /**
     * CSS class to add to the More item when something gets expanded out of it.
     * Useful for adding a visual cue that something was removed from the More menu.
     */
    expandOutOfMoreAnimationClass?: string;

    /**
     * Delegate that is called when a menu item is collapsed. This is the
     * implementer's opportunity to change its properties for suitibility in the more menu.
     */
    collapseTransform?: (item: CollapsibleMenuItemSpec) => void;

    /**
     * Delegate that is called when a menu item is expanded. This is the
     * implementer's opportunity to change its properties for suitibility in the main menu.
     */
    expandTransform?: (item: CollapsibleMenuItemSpec) => void;

    /**
     * If true, don't go through the fitting logic when the control is initialized
     */
    suppressInitialFitting?: boolean;
}

export enum CollapsibleMenuRefitResult {
    /**
     * The menu was unchanged
     */
    Unchanged = 1,

    /**
     * One or more menu items were collapsed to the "more" menu item.
     */
    Collapsed = 2,

    /**
     * One or more menu items were expanded out of the "more" menu item.
     */
    Expanded = 3
}

/**
 * A menubar that is able to collapse menu items into a single dropdown.
 */
export class CollapsibleMenu extends Menus.MenuBarO<CollapsibleMenuOptions> {
    private _menuItemWidths: { [id: string]: number } = { };
    private _orphanedChildItems: { [id: string]: CollapsibleMenuItemSpec[] } = { };
    private _moreMenuItem: CollapsibleMenuItemSpec;
    private _moreItemWidth: number;
    private _stableSorter: Utils_Array.StableSorter<CollapsibleMenuItemSpec>;

    constructor(options?: CollapsibleMenuOptions) {
        super(options);
        this._stableSorter = new Utils_Array.StableSorter<CollapsibleMenuItemSpec>((a, b) => (a.rank || 0) - (b.rank || 0));
    }

    public initialize() {
        let items = this._options.items;
        this._moreMenuItem = items && Utils_Array.first(items, i => i.id === this._options.moreItemId);
        let moreMenuItem = this._moreMenuItem;

        if (!moreMenuItem) {
            throw new Error("Could not find 'more' item.");
        }

        // We need the more item to be visible at first so we can measure its width.
        const wasHidden = moreMenuItem.hidden;
        moreMenuItem.hidden = false;
        moreMenuItem.neverCollapse = true;
        if (!moreMenuItem.childItems) {
            moreMenuItem.childItems = [];
        }

        super.initialize();

        this.measureItems();
        moreMenuItem.hidden = wasHidden;
        this.updateItems(items);
        this.refit();
    }

    /**
     * Expands or collapses menu items as necessary to fit in the allowable space.
     * @param animate (boolean) True to add the necessary animation class to the
     *                more menu item if its contents changes (default: true)
     * @return CollapsibleMenuRefitResult describing the result of calling this method.
     */
    public refit(animate: boolean = true) {
        const initialShownItems = this.getMenuItemSpecs().length;
        const moreMenuItem = this._moreMenuItem;
        const childItems = moreMenuItem.childItems || [];
        const options = this._options;
        const element = this.getElement();
        
        let moveIndex = 0;
        let indicesToMove: number[] = [];
        
        
        // Remove everything from the more menu that might have received the neverCollapse flag
        let initialExpandIndices: number[] = [];
        for (let i = 0; i < childItems.length; ++i) {
            const childItem: CollapsibleMenuItemSpec = childItems[i];
            if (childItem.neverCollapse) {
                initialExpandIndices.push(i);
            }
        }
        this.moveItems(initialExpandIndices, false);

        let spaceAvailable = this._options.getAvailableWidth();
        if (element.width() <= spaceAvailable) {
            do {
                moveIndex = this.getNextMovableItemIndex(childItems as CollapsibleMenuItemSpec[], true, indicesToMove);
                if (moveIndex == null) {
                    break;
                }
                const spec = childItems[moveIndex];
                const idToExpand = spec.id;
                let increasedSize = this._menuItemWidths[idToExpand];
                
                if (!increasedSize) {
                    break;
                }

                if (this.shouldAccountForSeparator(spec)) {
                    increasedSize += 13;
                }

                // If we're showing the more menu but expanding everything, it will now be hidden, so account for its size.
                if (indicesToMove.length + 1 === childItems.length) {
                    increasedSize -= this._moreItemWidth;
                }

                spaceAvailable -= increasedSize;
                indicesToMove.push(moveIndex);
            }
            while (element.width() <= spaceAvailable);
            if (indicesToMove.length > 0 && element.width() > spaceAvailable) {
                indicesToMove.pop();
            }
            this.moveItems(indicesToMove, false);
        }
        else {
            do {
                moveIndex = this.getNextMovableItemIndex(this.getMenuItemSpecs() as CollapsibleMenuItemSpec[] as CollapsibleMenuItemSpec[], false, indicesToMove);
                if (moveIndex == null) {
                    break;
                }
                const spec = this.getMenuItemSpecs()[moveIndex];
                const idToCollapse = spec.id;
                let decreasedSize = this._menuItemWidths[idToCollapse];

                if (!decreasedSize) {
                    break;
                }

                if (this.shouldAccountForSeparator(spec)) {
                    decreasedSize += 13;
                }

                // If we're hiding the more menu, it will now be shown, so account for its size.
                if (moreMenuItem.hidden && indicesToMove.length === 0) {
                    decreasedSize -= this._moreItemWidth
                }

                spaceAvailable += decreasedSize;
                indicesToMove.push(moveIndex);
            }
            while (element.width() > spaceAvailable);
            this.moveItems(indicesToMove, true);
        }
        const finalShownItems = this.getMenuItemSpecs().length;
        if (finalShownItems === initialShownItems) {
            return CollapsibleMenuRefitResult.Unchanged;
        }
        else if (finalShownItems > initialShownItems) {
            if (animate && options.expandOutOfMoreAnimationClass) {
                this.getItem(moreMenuItem.id).getElement().addClass(options.expandOutOfMoreAnimationClass);
            }
            return CollapsibleMenuRefitResult.Expanded;
        }
        else {
            if (animate && options.collapseToMoreAnimationClass) {
                this.getItem(moreMenuItem.id).getElement().addClass(options.collapseToMoreAnimationClass);
            }
            return CollapsibleMenuRefitResult.Collapsed;
        }
    }

    private shouldAccountForSeparator(nextItem: CollapsibleMenuItemSpec) {
        for (let item of this.getMenuItemSpecs()) {
            if (item !== nextItem && item.groupId === nextItem.groupId) {
                return false;
            }
        }
        return true;
    }

    private moveItems(indicesToMove: number[], collapse: boolean = true) {
        if (indicesToMove.length === 0) {
            return;
        }
        const moreItems = this._moreMenuItem.childItems as CollapsibleMenuItemSpec[];
        const items = this.getMenuItemSpecs() as CollapsibleMenuItemSpec[];
        let updateItems: boolean = false;
        for (let i = 0; i < indicesToMove.length; ++i) {
            let index = indicesToMove[i];
            if (collapse) {
                if (typeof this._options.collapseTransform == "function") {
                    this._options.collapseTransform(items[index]);
                }
                if (items[index].removeChildrenOnCollapse) {
                    this._orphanedChildItems[items[index].id] = items[index].childItems;
                    delete items[index].childItems;
                }
                moreItems.push(items[index]);
            } else {
                index = indicesToMove[i];
                if (typeof this._options.expandTransform === "function") {
                    this._options.expandTransform(moreItems[index]);
                }
                if (this._orphanedChildItems[moreItems[index].id]) {
                    moreItems[index].childItems = this._orphanedChildItems[moreItems[index].id];
                }
                items.push(moreItems[index]);
            }
        }
        let removeFrom = (collapse ? items : moreItems);
        Utils_Array.removeAllIndexes(removeFrom, indicesToMove);
        Utils_Array.removeWhere(removeFrom, e => e.isGroupSeparator);
        this.sortItemSpecs(items);
        this._moreMenuItem.hidden = moreItems.length === 0;
        this.updateItems(items);
    }

    private sortItemSpecs(items: CollapsibleMenuItemSpec[]) {
        this._stableSorter.sort(items);
        for (let i of items) {
            if (i.id === this._options.moreItemId && i.childItems && i.childItems.length > 0) {
                this._stableSorter.sort(i.childItems);
            }
        }
    }

    private measureItems() {
        this.getItems().forEach(i => {
            const width = i.getElement().outerWidth(true);
            if (i._item.id === this._options.moreItemId) {
                this._moreItemWidth = width;
            }
            this._menuItemWidths[i._item.id] = width;
        });
    }

    /**
     * Get the index in items of the item that has the highest collapseOrder, ignoring indices in skip
     */
    private getNextMovableItemIndex(items: CollapsibleMenuItemSpec[], expand: boolean, skip: number[] = []) {
        let movableIndex: number;
        let extremeCollapseValue: number;
        for (let i = 0; i < items.length; ++i) {
            if (skip.indexOf(i) >= 0) {
                continue;
            }
            if (items[i].neverCollapse !== true && !items[i].separator && (extremeCollapseValue === undefined ||
                (expand ? extremeCollapseValue >= items[i].collapseOrder : extremeCollapseValue <= items[i].collapseOrder))) {
                extremeCollapseValue = items[i].collapseOrder;
                movableIndex = i;
            }
        }
        return movableIndex == null ? null : movableIndex;
    }
}