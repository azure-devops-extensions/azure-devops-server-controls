import * as CompositeStoresManager from "Search/Scenarios/Shared/Base/Stores/CompositeStoresManager";
import * as _ContributedSearchTab from "Search/Scenarios/Shared/Base/ContributedSearchTab";
import { Action } from "VSS/Flux/Action";
import { ActionsHub } from "Search/Scenarios/Hub/Flux/ActionsHub";
import { ContributedSearchTabsStore, PivotTabInfo } from "Search/Scenarios/Hub/Flux/Stores/ContributedSearchTabsStore";
import { SearchProviderImplementationStore, LoadingState } from "Search/Scenarios/Hub/Flux/Stores/SearchProviderImplementationStore";

export type StoreName = "contributedSearchTabsStore" | "searchProviderImplementationStore";

export interface AggregatedState {
    availableTabs: PivotTabInfo[];

    selectedTabId: string;

    provider: _ContributedSearchTab.ContributedSearchTab;

    fetchStatus: LoadingState;

    providerLoadError: any;
}

export class StoresHub {
    private readonly compositeStoresManager = new CompositeStoresManager.CompositeStoresManager();
    private readonly listener: CompositeStoresManager.ListeningActionsManager;
    
    public contributedSearchTabsStore: ContributedSearchTabsStore;
    public searchProviderImplementationStore: SearchProviderImplementationStore;
    
    constructor(
        private readonly actionsHub: ActionsHub,
        private readonly onDispatched?: CompositeStoresManager.EmitChangedFunction<any>) {
        this.listener = new CompositeStoresManager.ListeningActionsManager(this.emitChanged);
        this.contributedSearchTabsStore = this.createContributedSearchTabsStore(actionsHub);
        this.searchProviderImplementationStore = this.createSearchProviderImplementationStore(actionsHub);
    }

    public dispose = (): void => {
        this.compositeStoresManager.dispose();
        this.listener.dispose();
    }

    public getAggregatedState = (): AggregatedState => {
        return {
            availableTabs: this.contributedSearchTabsStore.state.availableTabs,
            selectedTabId: this.contributedSearchTabsStore.state.selectedTabId,
            provider: this.searchProviderImplementationStore.state.provider,
            fetchStatus: this.searchProviderImplementationStore.state.fetchStatus,
            providerLoadError: this.searchProviderImplementationStore.state.error
        }
    }
    
    public getCompositeStore(storeNames: StoreName[]): CompositeStoresManager.CompositeStore {
        return this.compositeStoresManager.getOrCreate(storeNames);
    }

    private emitChanged = (changedStores: string[], action: Action<any>, payload: any): void => {
        this.compositeStoresManager.emitCompositeChanged(changedStores);

        if (this.onDispatched) {
            this.onDispatched(changedStores, action, payload);
        }
    }

    private createContributedSearchTabsStore(actionsHub: ActionsHub): ContributedSearchTabsStore {
        const store = new ContributedSearchTabsStore();

        this.listener.listen(actionsHub.contributedSearchTabsLoaded, "contributedSearchTabsStore", store.loadContributedSearchTabs);
        this.listener.listen(actionsHub.providerImplementationChangeStarted, "contributedSearchTabsStore", store.changeSelectedTab);
        this.listener.listen(actionsHub.contributedSearchTabsLoadFailed, "contributedSearchTabsStore", store.onLoadFailed);
        this.listener.listen(actionsHub.activeEntityResultsCountReceived, "contributedSearchTabsStore", store.updatePivotCount);
        this.listener.listen(actionsHub.inactiveEntityResultsCountReceived, "contributedSearchTabsStore", store.updatePivotCount);
        this.listener.listen(actionsHub.activeEntityReceiveResultsCountFailed, "contributedSearchTabsStore", store.resetPivotCount);
        this.listener.listen(actionsHub.inactiveEntityReceiveResultsCountFailed, "contributedSearchTabsStore", store.resetPivotCount);

        return store;
    }

    private createSearchProviderImplementationStore(actionsHub: ActionsHub): SearchProviderImplementationStore {
        const store = new SearchProviderImplementationStore();

        this.listener.listen(actionsHub.providerImplementationLoaded, "searchProviderImplementationStore", store.updateProviderImplementation);
        this.listener.listen(actionsHub.providerImplementationChangeStarted, "searchProviderImplementationStore", store.startProviderUpdate);
        this.listener.listen(actionsHub.providerImplementationLoadFailed, "searchProviderImplementationStore", store.onProviderLoadFailed);
        this.listener.listen(actionsHub.contributedSearchTabsLoaded, "searchProviderImplementationStore", store.startProviderUpdate);
        
        return store;
    }
}
