import * as StoreBase from  "VSS/Flux/Store";
import { IActionAdapter } from "Presentation/Scripts/TFS/Stores/DictionaryStore";

/**
 * The interface for a key/value store.
 */
export interface IValueStore<TValue> {
    /**
     * Stores 1 single value
     */

    get(): TValue;
}

/**
 * Controls the behavior of the KeyValueStore.
 */
export interface IValueOptions<TValue> {
    /**
     * A list of the action adapaters for the store.
     */
    adapters: IActionAdapter<TValue>[];

    /**
     * Compare two objects. This should be as deep as necessary to minimize the
     * number of times the store emits a change event. Should return false any
     * time a subscriber to the store would need to update based on new information.
     */
    isEqual(x: TValue, y: TValue): boolean;

}

/**
 * A store that holds one instance of any type of object.
 */
export class ValueStore<TValue> extends StoreBase.Store implements IValueStore<TValue> {
    private _item: TValue;
    private _options: IValueOptions<TValue>;
    private _adapters: IActionAdapter<TValue>[];

    constructor(options: IValueOptions<TValue>) {
        super();
        this._item = undefined;
        this._options = options;

        this._adapters = options.adapters || [];
        for (const adapter of this._adapters) {
            adapter.itemsAdded.register(this._onAdd, this);
            adapter.itemsRemoved.register(this._onRemove, this);
        }
    }

    public dispose() {
        for (const adapter of this._adapters as any) {
            if (adapter.dispose) {
                adapter.dispose();
            }
            this._options = null;
        }
        this._adapters = null;
    }

    public get(): TValue {
        return this._item;
    }

    private _onAdd(items: TValue): void {
        this._process(items, this._addItem.bind(this));
    }

    private _onRemove(): void {
        this._process(null, this._removeItem.bind(this));
    }

    private _process(items: TValue, functor: (item: TValue) => boolean): void {

        const shouldEmit = functor(items);

        if (shouldEmit) {
            this.emitChanged();
        }

    }

    private _addItem(newItem: TValue): boolean {
        //No-op if equals existing item 
        if (this._item !== undefined && this._options.isEqual(newItem, this._item)) {
            return false;
        }
        this._item = newItem;
        return true;
    }

    /**
    * Right now we don't need to specify an object to remove.  This may need to change based on use cases.
    */
    private _removeItem(): boolean {
        // No-op if no items exist, remove otherwise.
        if (this._item) {
            delete this._item;
            return true;
        }
        return false;
    }
}
