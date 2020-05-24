import * as CompositeStoresManager from "Search/Scenarios/Shared/Base/Stores/CompositeStoresManager";
import * as _Filter from "SearchUI/Utilities/Filter";
import { FilterStoreState } from "Search/Scenarios/Shared/Base/Stores/FilterStore";
import { OrganizationInfoStore, IOrganizationInfoState } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import { SearchStoreState } from "Search/Scenarios/Shared/Base/Stores/SearchStoreV2";
import { ZeroDataState } from "Search/Scenarios/Shared/Base/Stores/ZeroDataStoreV2";
import { ActionsHub } from "Search/Scenarios/WikiV2/Flux/ActionsHub";
import { FilterStore } from "Search/Scenarios/WikiV2/Flux/Stores/FilterStore";
import { SearchStore } from "Search/Scenarios/WikiV2/Flux/Stores/SearchStore";
import { ZeroDataStore } from "Search/Scenarios/WikiV2/Flux/Stores/ZeroDataStore";
import { WikiSearchRequest, WikiSearchResponse } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { Action } from "VSS/Flux/Action";

export type StoreName =
    "searchStore" |
    "filterStore" |
    "zeroDataStore"|
    "organizationInfoStore";

export interface AggregatedState {
    searchStoreState: SearchStoreState<WikiSearchRequest, WikiSearchResponse>;
    filterStoreState: FilterStoreState;
    zeroDataState: ZeroDataState;
    isProjectContext: boolean;
    organizationInfoState: IOrganizationInfoState;
}

export class StoresHub {
    public searchStore: SearchStore;
    public filterStore: FilterStore;
    public zeroDataStore: ZeroDataStore;
    public organizationInfoStore: OrganizationInfoStore;
    private readonly compositeStoresManager = new CompositeStoresManager.CompositeStoresManager();
    private readonly listener: CompositeStoresManager.ListeningActionsManager;
    private readonly isProjectContext: boolean;

    constructor(
        private readonly actionsHub: ActionsHub,
        filter: _Filter.Filter,
        isProjectContext: boolean,
        projectName: string,
        private readonly onDispatched?: CompositeStoresManager.EmitChangedFunction<any>) {
            this.isProjectContext = isProjectContext;
            this.listener = new CompositeStoresManager.ListeningActionsManager(this.emitChanged);
            this.searchStore = this.createSearchStore(actionsHub);
            this.zeroDataStore = this.createZeroDataStore(actionsHub);
            this.filterStore = this.createFilterStore(actionsHub, filter, isProjectContext, projectName);
            this.organizationInfoStore = this.createOrganizationInfoStore(actionsHub);
    }

    public getAggregatedState = (): AggregatedState => {
        return {
            searchStoreState: this.searchStore.state,
            isProjectContext: this.isProjectContext,
            filterStoreState: this.filterStore.state,
            zeroDataState: this.zeroDataStore.state,
            organizationInfoState: this.organizationInfoStore.state,
        };
    }

    public getCompositeStore(storeNames: StoreName[]): CompositeStoresManager.CompositeStore {
        return this.compositeStoresManager.getOrCreate(storeNames);
    }

    public dispose = (): void => {
        this.listener.dispose();
        this.compositeStoresManager.dispose();
    }

    private createZeroDataStore(actionsHub: ActionsHub): ZeroDataStore {
        const store = new ZeroDataStore();

        this.listener.listen(actionsHub.pageInitializationStarted, "zeroDataStore", (payload) => {
            if (payload.isLandingPage) {
                store.onLandingPage();
            }
        });
        this.listener.listen(actionsHub.resultsLoaded, "zeroDataStore", (payload) => {
            const { searchStoreState } = this.getAggregatedState();
            store.onResultsLoaded(searchStoreState.request, payload);
        });
        this.listener.listen(actionsHub.searchFailed, "zeroDataStore", store.onSearchFailed);
        this.listener.listen(actionsHub.searchStarted, "zeroDataStore", store.reset);

        return store;
    }

    private createSearchStore(actionsHub: ActionsHub): SearchStore {
        const store = new SearchStore();
        this.listener.listen(actionsHub.pageInitializationStarted, "searchStore", (payload) => {
            // On landing page update the query state for an adequate search store state
            payload.isLandingPage ? store.updateQuery(payload) : store.startSearch(payload);
        });
        this.listener.listen(actionsHub.resultsLoaded, "searchStore", store.loadSearchResults);
        this.listener.listen(actionsHub.searchStarted, "searchStore", store.startSearch);
        this.listener.listen(actionsHub.searchFailed, "searchStore", store.failSearch);
        return store;
    }

    private createFilterStore(
        actionsHub: ActionsHub,
        filter: _Filter.Filter,
        isProjectContext: boolean,
        projectName: string): FilterStore {
        const store = new FilterStore(isProjectContext, filter, projectName);

        this.listener.listen(actionsHub.resultsLoaded, "filterStore", (payload) => {
            const { searchStoreState } = this.getAggregatedState();
            const { request } = searchStoreState;
            store.updateFilters(request, payload);
        });

        this.listener.listen(actionsHub.filterPaneVisibilityChanged, "filterStore", store.changeFilterPaneVisibility);

        return store;
    }

    private createOrganizationInfoStore(actionsHub: ActionsHub): OrganizationInfoStore {
        const store = new OrganizationInfoStore();
        this.listener.listen(actionsHub.organizationInfoLoaded, "organizationInfoStore", store.onOrganizationInfoLoaded);
        this.listener.listen(actionsHub.organizationInfoLoadFailed, "organizationInfoStore", store.onOrganizationInfoLoadFailed);
        this.listener.listen(actionsHub.errorNotificationBannerDismissed, "organizationInfoStore", store.onResetOrganizationInfoLoadStatus);
        this.listener.listen(actionsHub.searchStarted, "organizationInfoStore", store.onResetOrganizationInfoLoadStatus);
        return store;
    }

    private emitChanged = (changedStores: string[], action: Action<any>, payload: any): void => {
        this.compositeStoresManager.emitCompositeChanged(changedStores);

        if (this.onDispatched) {
            this.onDispatched(changedStores, action, payload);
        }
    }
}
