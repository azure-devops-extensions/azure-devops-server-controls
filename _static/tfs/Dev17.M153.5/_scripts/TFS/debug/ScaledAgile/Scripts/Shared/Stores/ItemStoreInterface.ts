import { IItem } from "ScaledAgile/Scripts/Shared/Models/IItem";

export namespace ItemStoreEvents {
    /** Item has changed */
    export const ITEM_CHANGED = "ITEM_CHANGED";

    /** Event triggered when an item has been changed */
    export const EXTERNAL_ITEM_CHANGED = "EXTERNAL_ITEM_CHANGED";

    /** Event triggered when an item has been deleted */
    export const EXTERNAL_ITEM_DELETED = "EXTERNAL_ITEM_DELETED";

    /** Item data source has changed */
    export const ITEM_DATA_SOURCE_CHANGED = "ITEM_DATA_SOURCE_CHANGED";
}

export interface IExternalItemChangedArgs {
    /** Updated item */
    item: IItem;
}

export interface IExternalItemDeletedArgs {
    /** Id of item that was deleted */
    id: number;
}

export interface IItemUpdateEventArgs {
    /** Item that was updated */
    item: IItem;

    /** Value indicating whether the item was updated because of an external change */
    isExternal?: boolean;

    /** Indicate if the item is existing on the current plan */
    isItemOnPlan?: boolean;
}

/**
 * Represents the data stored by the ItemStore.
 */
export interface IItemStoreData {
    /**
     *  HashSet to have references of all the items loaded so far, to keep track of items already present
     */
    itemMap: IDictionaryNumberTo<IItem>;
}