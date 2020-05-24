import * as VssStore from "VSS/Flux/Store";

import * as Utils_String from "VSS/Utils/String";

export interface IStoreState {
}

/**
 * @brief Common class for base store
 */
export abstract class StoreBase extends VssStore.Store {

    /**
     * @brief This method returns an unique key for the store. The same will be used in StoreManager to store in the Dictionary
     */
    public static getKey(): string {
        throw new Error("This method needs to be implemented in derived classes");
    }

    /**
     * @brief Initializes the store
     */
    public initialize(instanceId?: string): void {
        this._instanceId = instanceId || Utils_String.empty;
    }

    /**
     * @brief Returns the instanceId
     */
    public getInstanceId(): string {
        return this._instanceId;
    }

    /**
     * @brief Returns the state information preserved in store
     */
    public getState(): IStoreState {
        return {} as IStoreState;
    }

    private __dispose(): void {
        this.disposeInternal();
        this._instanceId = null;
    }

    protected abstract disposeInternal(): void;
    private _instanceId: string;
}

/**
 * @brief Base class to be used for ViewStores
 */
export abstract class ViewStoreBase extends StoreBase {
}

/**
 * @brief Base class to be used for ChangeTrackerStores
 */
export abstract class ChangeTrackerStoreBase extends StoreBase {

    /**
     * @brief Returns the dirty state of the store
     */
    public abstract isDirty(): boolean;

    /**
     * @brief Returns the valid state of the store
     */
    public abstract isValid(): boolean;
}

/**
 * @brief Base class to be used for DataStores
 */
export abstract class DataStoreBase extends ChangeTrackerStoreBase {

    /**
     * @brief Used to update the visitor object with its current data
     * @param visitor
     */
    public abstract updateVisitor(visitor: any): void;
}
