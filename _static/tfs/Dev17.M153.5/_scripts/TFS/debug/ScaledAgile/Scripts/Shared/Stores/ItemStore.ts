import Store_Base = require("VSS/Flux/Store");
import Events_Services = require("VSS/Events/Services");

import { IItem, IItemStatusChangePayload, IItemsUpdatePayload, IFilterUpdateData } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { ItemActions } from "ScaledAgile/Scripts/Shared/Actions/ItemActions";
import { ItemDataSource } from "ScaledAgile/Scripts/Shared/Stores/ItemDataSource";
import { IItemStoreData, ItemStoreEvents, IExternalItemChangedArgs, IExternalItemDeletedArgs, IItemUpdateEventArgs } from "ScaledAgile/Scripts/Shared/Stores/ItemStoreInterface";

/**
 * Represents the data stored by the ItemStore.
 * This store listens to the shared WIT actions and thus helps in keeping the items updated when they are changed by launching the WIT form.
 */
export class ItemStore extends Store_Base.Store {
    private _dataSource: ItemDataSource;

    private _externalItemChangedHandler: IEventHandler;
    private _externalItemDeletedHandler: IEventHandler;

    private _initializeItemsHandler: (data: IItemStoreData) => void;
    private _addItemsHandler: (addedItems: IItem[]) => void;
    private _updateItemsHandler: (data: IItemStoreData) => void;
    private _itemStatusChangeHandler: (payload: IItemStatusChangePayload) => void;
    private _updateFilterHandler: (filter: IFilterUpdateData) => void;
    
    private _actions: ItemActions;
    
    constructor(actions: ItemActions) {
        super();
        this._actions = actions;
        this._addListeners();

        // Default to an empty store
        this._dataSource = new ItemDataSource({
            itemMap: {}
        });
    }

    /**
     * Dispose the store
     */
    public dispose() {
        this._removeListeners();
    }

    /**
     * @returns Returns the current value of the store.
     */
    public getValue(): IItemStoreData {
        return this._dataSource.getData();
    }

    /**
     * @returns Returns item data source
     */
    public getDataSource(): ItemDataSource {
        return this._dataSource;
    }

    /**
     * Initialized the items in the store.
     * @param {IItemStoreData} data The items to be added/updated.
     */
    protected _initializeItems(data: IItemStoreData): void {
        this._dataSource.bind(data);
        this.emitChanged();
    }

    /**
     * @returns Returns true if the data has filter applied
     */
    public isFiltering(): boolean {
        return this._dataSource.isFiltering();
    }

    /**
     * Adds the items to the store. Public only for unit testing.
     * @param {IItem[]} addedItems The items to be added.
     */
    public addItems(addedItems: IItem[]): void {
        if (this._dataSource.addItems(addedItems)) {
            this.emitChanged();
        }
    }

    /**
     * Updates all items items in store. Public only for unit testing.
     * @param {IItemStoreData} data - The items to be added/updated.
     */
    public updateItems(data: IItemsUpdatePayload): void {
        if (this._dataSource.updateItems(data)) {
            this.emitChanged();
        }
    }

    /**
     * Update status of an existing item
     * @param {IItemStatusChangePayload} payload The item status update payload
     */
    private _handleItemStatusChange(payload: IItemStatusChangePayload) {
        const item = this._dataSource.getItem(payload.id);
        if (item) {
            const itemToUpdate = item.setStatus(payload.status, payload.message);
            const updatedData = this._dataSource.updateItem(itemToUpdate);
            if (updatedData && updatedData.updatedItem) {
                this._emitItemChange(updatedData.updatedItem);
            }
        }
    }

    /**
     * Handle an item change that was received from WITOM.
     * If the item already exist, then the item will be updated. Otherwise, the item will be added.
     * @param itemUpdate The updated work item
     */
    protected _externalItemChanged(itemUpdate: IItem) {
        const updatedData = this._dataSource.updateItem(itemUpdate);
        if (updatedData && updatedData.updatedItem) {
            this._emitItemChange(updatedData.updatedItem, true, updatedData.isItemAlreadyExist);
        }
    }

    /**
     * Handle an item delete event that was received from WITOM
     * @param id The work item id to be deleted
     */
    protected _externalItemDeleted(id: number) {
        if (this._dataSource.deleteItem(id)) {
            this.emitChanged();
        }
    }

    private _emitItemChange(item: IItem, isExternal?: boolean, isItemOnPlan?: boolean) {
        this.emit(ItemStoreEvents.ITEM_CHANGED, this, {
            item: item,
            isExternal: isExternal,
            isItemOnPlan: isItemOnPlan
        } as IItemUpdateEventArgs);

        this.emitChanged();
    }

    private _updateFilter(filter: IFilterUpdateData) {
        this._dataSource.updateFilter(filter);
        this.emitChanged();
    }

    /** Listen to external changes */
    private _addListeners() {
        this._externalItemChangedHandler = (sender: any, args: IExternalItemChangedArgs) => this._externalItemChanged(args.item);
        Events_Services.getService().attachEvent(ItemStoreEvents.EXTERNAL_ITEM_CHANGED, this._externalItemChangedHandler);

        this._externalItemDeletedHandler = (sender: any, args: IExternalItemDeletedArgs) => this._externalItemDeleted(args.id);
        Events_Services.getService().attachEvent(ItemStoreEvents.EXTERNAL_ITEM_DELETED, this._externalItemDeletedHandler);

        this._initializeItemsHandler = this._initializeItems.bind(this);
        this._addItemsHandler = this.addItems.bind(this);
        this._updateItemsHandler = this.updateItems.bind(this);
        this._itemStatusChangeHandler = this._handleItemStatusChange.bind(this);
        this._updateFilterHandler = this._updateFilter.bind(this);

        this._actions.itemStoreInitialize.addListener(this._initializeItemsHandler);
        this._actions.addItemsAction.addListener(this._addItemsHandler);
        this._actions.updateItemsAction.addListener(this._updateItemsHandler);
        this._actions.updateItemStatusAction.addListener(this._itemStatusChangeHandler);
        this._actions.updateFilter.addListener(this._updateFilterHandler);
    }

    private _removeListeners() {
        this._actions.itemStoreInitialize.removeListener(this._initializeItemsHandler);
        this._actions.addItemsAction.removeListener(this._addItemsHandler);
        this._actions.updateItemsAction.removeListener(this._updateItemsHandler);
        this._actions.updateItemStatusAction.removeListener(this._itemStatusChangeHandler);
        this._actions.updateFilter.removeListener(this._updateFilterHandler);

        Events_Services.getService().detachEvent(ItemStoreEvents.EXTERNAL_ITEM_CHANGED, this._externalItemChangedHandler);
        Events_Services.getService().detachEvent(ItemStoreEvents.EXTERNAL_ITEM_DELETED, this._externalItemDeletedHandler);

        this._initializeItemsHandler = null;
        this._addItemsHandler = null;
        this._updateItemsHandler = null;
        this._externalItemChangedHandler = null;
        this._itemStatusChangeHandler = null;
        this._updateFilterHandler = null;
    }
}
