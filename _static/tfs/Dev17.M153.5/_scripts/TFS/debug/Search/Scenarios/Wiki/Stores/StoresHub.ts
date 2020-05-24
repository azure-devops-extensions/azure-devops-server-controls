import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ActionsHub } from "Search/Scenarios/Wiki/ActionsHub";
import { ContextStore } from "Search/Scenarios/Wiki/Stores/ContextStore";
import { ContributedSearchTabsStore, ContributedSearchTabsStoreState } from "Search/Scenarios/Wiki/Stores/ContributedSearchTabsStore";
import { SearchStore, SearchState } from "Search/Scenarios/Wiki/Stores/SearchStore";

export interface AggregateState {
    searchState: SearchState;
    tfsContext: TfsContext;
    contributionsState: ContributedSearchTabsStoreState;
}

export class StoresHub {
    public contextStore: ContextStore;
    public searchStore: SearchStore;
    public contributionsStore: ContributedSearchTabsStore;

    constructor(actionsHub: ActionsHub) {
        this.contextStore = this.createContextStore(actionsHub);
        this.searchStore = this.createSearchStore(actionsHub);
        this.contributionsStore = this.createContributionsStore(actionsHub);
    }

    public getAggregateState = (): AggregateState => {
        return {
            contributionsState: this.contributionsStore.state,
            searchState: this.searchStore.state,
            tfsContext: this.contextStore.getTfsContext()
        };
    }

    private createContextStore(actionsHub: ActionsHub): ContextStore {
        const store = new ContextStore();
        actionsHub.contextUpdated.addListener(store.onContextUpdated);
        return store;
    }

    private createSearchStore(actionsHub: ActionsHub): SearchStore {
        const store = new SearchStore();
        actionsHub.searchFailed.addListener(store.failLoad);
        actionsHub.searchStarted.addListener(store.startSearch);
        actionsHub.searchResultsLoaded.addListener(store.loadSearchResults);
        return store;
    }

    private createContributionsStore(actionsHub: ActionsHub): ContributedSearchTabsStore {
        const store = new ContributedSearchTabsStore();
        actionsHub.tabsLoaded.addListener(store.onContributionsLoaded);
        actionsHub.tabChanged.addListener(store.changeTab);
        actionsHub.resultsCountLoaded.addListener(store.onResultsCountLoaded);
        actionsHub.resultsCountFailed.addListener(store.onResultsCountFailed);
        return store;
    }
}
