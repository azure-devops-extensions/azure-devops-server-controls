import * as StoreBase from  "VSS/Flux/Store";

import { Callback } from "Presentation/Scripts/TFS/Stores/Callback";

/**
 * The key-value store can have items added to or removed from it.
 */
export interface IActionAdapter<TValue> {
    /** Invoke when items should be added to the DictionaryStore. */
    itemsAdded: Callback<TValue[] | TValue>;
    /** Invoke when items should be removed from the DictionaryStore. */
    itemsRemoved: Callback<TValue[] | TValue>;
    /** Invoke when all items are removed */
    clearItems: Callback<string>;
}

/**
 * Action adapters for the DictionaryStore should extend this base class.
 */
export class ActionAdapter<TValue> implements IActionAdapter<TValue> {
    public itemsAdded = new Callback<TValue[] | TValue>();
    public itemsRemoved = new Callback<TValue[] | TValue>();
    public clearItems = new Callback<string>();

    public dispose() {
        this.itemsAdded.unregister();
        this.itemsRemoved.unregister();
        this.clearItems.unregister();
    }
}

/**
 * Controls the behavior of the DictionaryStore.
 */
export interface IDictionaryStoreOptions<TValue> {
    /**
     * A list of the action adapaters for the store.
     */
    adapters: IActionAdapter<TValue>[];

    /**
     * Given an object to store, return the key to store it under.
     */
    getKey: (x: TValue) => string | number;

    /**
     * Compare two objects. This should be as deep as necessary to minimize the
     * number of times the store emits a change event. Should return false any
     * time a subscriber to the store would need to update based on new information.
     */
    isEqual: (x: TValue, y: TValue) => boolean;
}

/**
 * The interface for a key/value store.
 */
export interface IDictionaryStore<TValue> {
    /**
     * Given a key (either a string or a number), return the associated value.
     */
    get(key: string | number): TValue;

  /**
   * Return all values in the KeyStore
   */
    getAll(): TValue[];

    /**
     * Remove all items from the cache
     */
    reset();
}

/**
 * A store that holds any type of object. Objects are accessible by their keys, which must be strings or numbers.
 */
export class DictionaryStore<TValue> extends StoreBase.Store implements IDictionaryStore<TValue> {
    protected _items: IDictionaryNumberTo<TValue> | IDictionaryStringTo<TValue>;
    protected _options: IDictionaryStoreOptions<TValue>;
    public _adapters: IActionAdapter<TValue>[];

    constructor(options: IDictionaryStoreOptions<TValue>) {
        super();
        this._items = {};
        this._options = options;

        this._adapters = options.adapters || [];
        for (let adapter of this._adapters) {
            adapter.itemsAdded.register(this._onAdd, this);
            adapter.itemsRemoved.register(this._onRemove, this);
            adapter.clearItems.register(this.reset, this);
        }
    }

    public dispose() {
        for (let adapter of this._adapters as any) {
            if (adapter.dispose) {
                adapter.dispose();
            }
            this._options = null;
        }
        this._adapters = null;
    }

    public get(key: string | number): TValue {
        return this._items.hasOwnProperty(key as string)
            ? this._items[key]
            : undefined;
    }

    public getAll(): TValue[] {
        return Object.keys(this._items).map(key => this._items[key]);
    }

    public reset() {
        this._items = {};
        this.emitChanged();
    }

    private _onAdd(items: TValue | TValue[]): void {
        this._process(items, this._addItem.bind(this));
    }

    private _onRemove(items: TValue | TValue[]): void {
        this._process(items, this._removeItem.bind(this));
    }

    private _process(items: TValue | TValue[], functor: (item: TValue) => boolean): void {
        let shouldEmit = false;

        if (Array.isArray(items)) {
            for (let item of items) {
                shouldEmit = functor(item) || shouldEmit;
            }
        }
        else {
            shouldEmit = functor(items);
        }

        if (shouldEmit) {
            this.emitChanged();
        }
    }

    protected _addItem(newItem: TValue): boolean {
        let key = this._options.getKey(newItem);

        // No-op if the equal item already exists at the key, update otherwise.
        let storeItem = this.get(key);
        if (!storeItem || (storeItem && !this._options.isEqual(newItem, storeItem))) {
            this._items[key] = newItem;
            return true;
        }
        return false;
    }

    private _removeItem(item: TValue): boolean {
        let key = this._options.getKey(item);

        // No-op if the item does not exist, remove otherwise.
        if (this._items.hasOwnProperty(key as string)) {
            delete this._items[key];
            return true;
        }
        return false;
    }
}
