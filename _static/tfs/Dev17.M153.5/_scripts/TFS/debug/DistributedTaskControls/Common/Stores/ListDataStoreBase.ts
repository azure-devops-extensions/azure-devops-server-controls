

import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export abstract class ListDataStoreBase<T extends DataStoreBase> extends AggregatorDataStoreBase {

    constructor(private _isOrdered: boolean = false) {
        super();
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._originalDataStores = [];
    }

    public getDataStoreList(): T[] {
        return super.getDataStoreList() as T[];
    }

    public isListDirty(): boolean {
        const dataStoreList = this.getDataStoreList();
        if (dataStoreList.length !== this._originalDataStores.length) {
            return true;
        }

        let areInstanceIdsSame = true;

        if (this._isOrdered) {

            const length = dataStoreList.length;
            for (let i = 0; i < length; i++) {
                if (Utils_String.ignoreCaseComparer(dataStoreList[i].getInstanceId(),
                    this._originalDataStores[i].getInstanceId()) !== 0) {
                    areInstanceIdsSame = false;
                    break;
                }
            }
        } else {
            const newInstanceIds: string[] = dataStoreList.map((dataStore: DataStoreBase) => { return dataStore.getInstanceId(); });
            const oldInstanceIds: string[] = this._originalDataStores.map((dataStore: DataStoreBase) => { return dataStore.getInstanceId(); });

            areInstanceIdsSame = Utils_Array.arrayEquals(newInstanceIds, oldInstanceIds, (s1: string, s2: string): boolean => {
                return Utils_String.ignoreCaseComparer(s1, s2) === 0;
            });
        }

        return !areInstanceIdsSame;
    }

    public isDirty(): boolean {
        return this.isListDirty() || super.isDirty();
    }

    protected initializeListDataStore(initialList: T[]): void {
        const currentDataStores = this.getDataStoreList();
        if (currentDataStores.length > 0) {
            for (const dataStore of currentDataStores) {
                dataStore.removeChangedListener(this._handleChange);
            }
        }

        this._originalDataStores = Utils_Array.clone(initialList || []);
        super.initializeDataStores(Utils_Array.clone(initialList || []));
        this._initializeChangeListeners();
    }

    /**
     * @brief Insert a given store to the store list and conditionally adds changeListener. 
     * @param store
     * @param index to insert at
     * @param skipAddingChangedListener - If change listener is to be handled locally, then pass this as true
     */
    protected insertDataStore(store: DataStoreBase, index: number, skipAddingChangedListener?: boolean): void {
        if (index >= 0) {
            if (!skipAddingChangedListener) {
                store.addChangedListener(this._handleChange);
            }

            super.getDataStoreList().splice(index, 0, store);
        }
    }

    /**
     * @brief Removes a store from the store list
     * @details Remove is being kept in this class instead of AggregatorStoreBase
     * because, only in ListDataStores can a store be removed.
     * @param store to be removed
     */
    protected removeFromDataStoreList(store: DataStoreBase): void {
        let index: number = super.getDataStoreList().indexOf(store);

        if (index >= 0) {
            super.getDataStoreList().splice(index, 1);
            store.removeChangedListener(this._handleChange);
        }
    }

    /**
     * @brief Reorders the store list
     * @param instance id store to be moved
     * @param new index of the store
     */
    protected reorderDataStoreList(storeInstanceId: string, targetIndex: number): void {
        let storeIndex = -1;
        storeIndex = Utils_Array.findIndex(super.getDataStoreList(), (store: DataStoreBase) => {
            return (store && (Utils_String.ignoreCaseComparer(store.getInstanceId(), storeInstanceId) === 0));
        });

        super.initializeDataStores(Utils_Array.reorder(super.getDataStoreList(), storeIndex, targetIndex, 1));
    }

    /**
     * @brief This method is used to update the list. This mostly happens as part of Save definition
     */
    protected handleUpdate(stores?: T[], isForceInitialize?: boolean): void {
        if (stores && (stores.length !== super.getDataStoreList().length || isForceInitialize)) {
            this.initializeListDataStore(stores);
        }
        else {
            this._originalDataStores = [];
            this._originalDataStores = Utils_Array.clone(super.getDataStoreList() as T[]);
        }
    }

    protected getDataStoreAndIndex(storeInstanceId: string): { dataStore: T, index: number } {
        const dataStores = this.getDataStoreList();
        let dataStore: T = null;
        let itemIndex = -1;
        for (let i = 0, len = dataStores.length; i < len; i++) {
            if (dataStores[i].getInstanceId() === storeInstanceId) {
                dataStore = dataStores[i];
                itemIndex = i;
                break;
            }
        }

        return { dataStore: dataStore, index: itemIndex};
    }

    protected getNextSelectableStoreAfterDelete(deletionIndex: number): T {
        let nextSelectableStore: T = null;
        const stores = this.getDataStoreList();
        if (deletionIndex < stores.length) {
            // Middle element was deleted
            // ---------------------------
            // Select the element next to element that was deleted. This is nothing but the element
            // at deletionIndex "after" deletion. 
            nextSelectableStore = stores[deletionIndex];
        }
        else if (deletionIndex === stores.length && stores.length !== 0) {
            // Last element was deleted
            // ------------------------
            // Select the last element if the list after deletion is not empty.
            nextSelectableStore = stores[deletionIndex - 1];
        }
        else {
            nextSelectableStore = null;
        }

        return nextSelectableStore;
    }

    protected insertStoreAtTarget(storeToInsert: DataStoreBase, targetStoreInstanceId: string, shouldInsertBefore: boolean): void {
        let stores = this.getDataStoreList();
        let targetIndex = -1;
        if (targetStoreInstanceId) {
            const { dataStore, index } = this.getDataStoreAndIndex(targetStoreInstanceId);
            targetIndex = index;

            if (!shouldInsertBefore) {
                targetIndex = targetIndex + 1;
            }
        }

        if (targetIndex < 0) {
            targetIndex = stores.length;
        }

        this.insertDataStore(storeToInsert, targetIndex);
    }

    protected disposeInternal(): void {
        this._originalDataStores = [];
        super.disposeInternal();
    }

    private _initializeChangeListeners(): void {
        super.getDataStoreList().forEach((dataStore: DataStoreBase) => {
            dataStore.addChangedListener(this._handleChange);
        });
    }

    private _originalDataStores: T[];
}
