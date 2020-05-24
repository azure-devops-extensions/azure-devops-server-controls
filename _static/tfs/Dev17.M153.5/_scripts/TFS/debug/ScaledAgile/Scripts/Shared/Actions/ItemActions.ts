import Action_Base = require("VSS/Flux/Action");

import { IItem, IItemStatusChangePayload, IItemsUpdatePayload, IFilterUpdateData } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IItemStoreData } from "ScaledAgile/Scripts/Shared/Stores/ItemStoreInterface";

/**
 * Wit specific actions
 */
export class ItemActions {
    /**
     * Action indicating that the ItemStore is being initialized
     */
    public itemStoreInitialize: Action_Base.Action<IItemStoreData>;

    /**
     * Action indicating that new items to be being added to the ItemStore. Invoked while loading more items.
     */
    public addItemsAction: Action_Base.Action<IItem[]>;

    /**
     * Action indicating that items in the ItemStore are being updated
     */
    public updateItemsAction: Action_Base.Action<IItemsUpdatePayload>;

    /**
     *  Action changing state of an item
     */
    public updateItemStatusAction: Action_Base.Action<IItemStatusChangePayload>;

    /**
     *  Action to update filter
     */
    public updateFilter: Action_Base.Action<IFilterUpdateData>;

    constructor() {
        this.itemStoreInitialize = new Action_Base.Action<IItemStoreData>();
        this.addItemsAction = new Action_Base.Action<IItem[]>();
        this.updateItemsAction = new Action_Base.Action<IItemsUpdatePayload>();
        this.updateItemStatusAction = new Action_Base.Action<IItemStatusChangePayload>();
        this.updateFilter = new Action_Base.Action<IFilterUpdateData>();
    }
}