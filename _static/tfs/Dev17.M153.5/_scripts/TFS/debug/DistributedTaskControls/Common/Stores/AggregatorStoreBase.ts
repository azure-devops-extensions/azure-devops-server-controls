/**
 *  Base store for all container stores
 */

import { StoreBase, ViewStoreBase, DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";

import * as Utils_Array from "VSS/Utils/Array";

/**
 * @brief Base class for all ContainerTab stores
 */
export abstract class AggregatorStoreBase extends StoreBase {

    /**
     * @brief Store cleanup
     */
    protected disposeInternal(): void {
        // Iterates over the store list irrespective of stores that were added with
        // skipAddingChangedListener, removeChangedListener should take care of doing the right thing.
        this.getStores().forEach((store: StoreBase) => {
            store.removeChangedListener(this._handleChange);
        });

        this.clearStores();
    }

    protected addToStoreList(store: StoreBase, skipAddingChangedListener?: boolean): void {
        this.getStores().push(store);

        if (!skipAddingChangedListener) {
            store.addChangedListener(this._handleChange);
        }
    }

    protected removeFromStoreList(store: ViewStoreBase): void {
        let index: number = this.getStores().indexOf(store);

        if (index >= 0) {
            this.getStores().splice(index, 1);
            store.removeChangedListener(this._handleChange);
        }
    }

    protected _handleChange = () => {
        this.emitChanged();
    }

    protected abstract getStores(): StoreBase[];
    protected abstract clearStores(): void;
}

/**
 * @brief Base Aggregator store for View stores. This doesn't have implementation for isDirty() or isValid()
 * since they are concepts of data stores
 */
export abstract class AggregatorViewStoreBase extends AggregatorStoreBase {

    constructor() {
        super();
        this._viewStores = [];
    }

    /**
     * @brief Returns the list of stores present in Aggregator store
     */
    public getViewStoreList(): ViewStoreBase[] {
        return this._viewStores;
    }

    protected getStores(): StoreBase[] {
        return this.getViewStoreList();
    }

    protected clearStores(): void {
        this._viewStores = [];
    }

    private _viewStores: ViewStoreBase[] = [];
}

/**
 * @brief Base Aggregator store for Data stores. It implements isDirty() and isValid() by iterating over
 * the list of data stores.
 */
export abstract class AggregatorDataStoreBase extends AggregatorStoreBase {

    /**
     * @brief Returns the list of stores present in Aggregator store
     */
    public getDataStoreList(): DataStoreBase[] {
        return this._dataStores || [];
    }

    /**
    * @brief Checks the dirty state of all children and returns true/false
    */
    public isDirty(): boolean {
        let returnValue: boolean = false;

        this.getDataStoreList().forEach((store: DataStoreBase) => {
            if (store.isDirty()) {
                returnValue = true;
                return;
            }
        });

        return returnValue;
    }

    /**
     * @brief Checks the validity of all children and returns true/false
     */
    public isValid(): boolean {
        let returnValue: boolean = true;

        this.getDataStoreList().forEach((store: DataStoreBase) => {
            if (!store.isValid()) {
                returnValue = false;
                return;
            }
        });

        return returnValue;
    }

    protected getStores(): StoreBase[] {
        return this.getDataStoreList();
    }

    protected clearStores(): void {
        this._dataStores = [];
    }

    protected initializeDataStores(dataStores: DataStoreBase[]): void {
        this._dataStores = dataStores;
    }

    protected abstract updateVisitor(visitor: any);

    private _dataStores: DataStoreBase[] = [];
}