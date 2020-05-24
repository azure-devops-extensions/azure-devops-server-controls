import * as CompositeStoresManager from "Search/Scenarios/Shared/Base/Stores/CompositeStoresManager";
import { Action } from "VSS/Flux/Action";
import { ActionsHub } from "Search/Scenarios/ExtensionStatus/Flux/ActionsHub";
import { ExtensionStore, IExtensionStoreState } from "Search/Scenarios/ExtensionStatus/Flux/Stores/ExtensionStore";

export type StoreName =
    "extensionStore";

export interface AggregatedState {
    extensionStoreState: IExtensionStoreState;
}

export class StoresHub {
    private readonly compositeStoresManager = new CompositeStoresManager.CompositeStoresManager();
    private readonly listener: CompositeStoresManager.ListeningActionsManager;	
	public extensionStore: ExtensionStore;

    constructor(private readonly actionsHub: ActionsHub,
        private readonly onDispatched?: CompositeStoresManager.EmitChangedFunction<any>) {
        this.listener = new CompositeStoresManager.ListeningActionsManager(this.emitChanged);   
        this.extensionStore = this.createExtensionStore(actionsHub);
    }
    
    public getAggregatedState = (): AggregatedState => {
        return { extensionStoreState: this.extensionStore.extensionStoreState};
    }

    public getCompositeStore(storeNames: StoreName[]): CompositeStoresManager.CompositeStore {
        return this.compositeStoresManager.getOrCreate(storeNames);
    }

    private createExtensionStore(actionsHub: ActionsHub): ExtensionStore {
        const store = new ExtensionStore();
        this.listener.listen(actionsHub.extensionStateDataLoaded, "extensionStore", store.onLoadExtensionStateData);
        this.listener.listen(actionsHub.extensionStatusRetrievalFailed, "extensionStore", store.onExtensionStatusRetrievalFailed);
        this.listener.listen(actionsHub.extensionStateDataLoadStarted, "extensionStore", store.onStartLoadExtensionStateData);  
        return store;
    }

    private emitChanged = (changedStores: string[], action: Action<any>, payload: any): void => {
        this.compositeStoresManager.emitCompositeChanged(changedStores);

        if (this.onDispatched) {
            this.onDispatched(changedStores, action, payload);
        }
    }

    public dispose = (): void => {
        this.listener.dispose();
        this.compositeStoresManager.dispose();
    }
}
