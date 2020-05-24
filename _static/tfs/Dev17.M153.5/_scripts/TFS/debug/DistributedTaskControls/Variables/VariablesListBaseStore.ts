import { VariablesStoreBase } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { StoreKeys } from "DistributedTaskControls/Common/Common";

import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

export abstract class BaseStore extends StoreCommonBase.StoreBase {

    public abstract isDirty(): boolean;
    public abstract isValid(): boolean;
}

export class VariablesListBaseStore extends BaseStore {

    public initialize() {
        this.stores = [];
    }

    /**
     * @brief Unique key to the store
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return StoreKeys.VariablesListStore;
    }

    /**
     * @brief track the dirty state of the store
     */
    public isDirty(): boolean {
        let isDirty = false;
        this.stores.forEach((store: VariablesStoreBase) => {
            if (store.isDirty()) {
                isDirty = true;
                return;
            }
        });

        return isDirty;
    }

    /**
     * @brief track the valid state of the store
     */
    public isValid(): boolean {
        let isValid = true;
        this.stores.forEach((store: VariablesStoreBase) => {
            if (!store.isValid()) {
                isValid = false;
                return;
            }
        });

        return isValid;
    }

    /**
     * @brief initialize listeners for each child store
     */
    public initializeChildStoreListeners(): void {

        /* onChanged handler for each child store */
        this.stores.forEach((store: VariablesStoreBase) => {
            store.addChangedListener(this._handleChildrenStoreChange);
        });
    }


    /**
     * Resolve the value of the variable input
     * Usage: Example, while creating task group there may be different levels of variables resolution
     * we need to resolve it to the lowest level and return the value
     *
     * @param {TaskInputDefinition} variableInput
     * @param {string} scopeInstanceId
     *
     * @memberOf VariablesListBaseStore
     */
    public resolveVariable(variableInput: TaskInputDefinition, scopeInstanceId?: string): void {
    }

    /**
     * @brief dispose
     */
    protected disposeInternal(): void {

        /* remove onChanged handler for each child store */
        this.stores.forEach((store: VariablesStoreBase) => {
            store.removeChangedListener(this._handleChildrenStoreChange);
        });

        /* make the store list empty */
        this.stores = [];
    }


    /**
     * @brief handle the change in the child stores
     */
    private _handleChildrenStoreChange = () => {
        this.emitChanged();
    }

    public stores: StoreCommonBase.ChangeTrackerStoreBase[];
}
