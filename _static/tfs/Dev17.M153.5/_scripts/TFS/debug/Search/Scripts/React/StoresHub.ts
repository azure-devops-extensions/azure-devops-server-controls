import { SearchResultsStore, SearchResultsErrorStore } from "Search/Scripts/React/Stores/SearchResultsStore";
import { SortCriteriaStore } from "Search/Scripts/React/Stores/SortCriteriaStore";
import { ResultsViewStore } from "Search/Scripts/React/Stores/ResultsViewStore";
import { PreviewOrientationStore } from "Search/Scripts/React/Stores/PreviewOrientationStore";
import { SearchResultsActionStore } from "Search/Scripts/React/Stores/SearchResultsActionStore";
import { TfsDataStore } from "Search/Scripts/React/Stores/TfsDataStore";
import { SearchProvidersStore, SEARCH_PROVIDER_TO_ENTITY_ID} from "Search/Scripts/React/Stores/SearchProvidersStore";
import { FilterStore } from "Search/Scripts/React/Stores/FilterStore";
import { RequestUrlStore } from "Search/Scripts/React/Stores/RequestUrlStore";
import { SearchActionStore} from "Search/Scripts/React/Stores/SearchActionStore";
import { PathStore } from "Search/Scripts/React/Stores/PathStore";
import { AccountsStore } from "Search/Scripts/React/Stores/AccountsStore";
import {
    ActionsHub,
    IResultsSortCriteriaPayload,
    IResultsObtainedPayLoad,
    IResultsViewChangedPayLoad,
    IPreviewOrientationChangedPayload,
    IResultsPaneRowSelectionChangedPayload,
    IResultPaneRowInvokedPayload,
    IShowMoreActivatedPayload,
    ITfsDataChangedPayload,
    ISearchResultContextMenuKeyPressedPayload,
    IResultsErrorPayload,
    ISearchProvidersPayload,
    events
} from  "Search/Scripts/React/ActionsHub";

export class StoresHub {
    private static instance: StoresHub;
    public searchResultsStore: SearchResultsStore;
    public sortCriteriaStore: SortCriteriaStore;
    public resultsViewStore: ResultsViewStore;
    public previewOrientationStore: PreviewOrientationStore;
    public searchResultsActionStore: SearchResultsActionStore;
    public tfsDataStore: TfsDataStore;
    public searchResultsErrorStore: SearchResultsErrorStore;
    public searchProvidersStore: SearchProvidersStore;
    public filterStore: FilterStore;
    public requestUrlStore: RequestUrlStore;
    public searchActionStore: SearchActionStore;
    public pathStore: PathStore;
    public accountsStore: AccountsStore;

    constructor(actionsHub: ActionsHub) {
        this.searchResultsStore = new SearchResultsStore();
        this.sortCriteriaStore = new SortCriteriaStore();
        this.resultsViewStore = new ResultsViewStore();
        this.previewOrientationStore = new PreviewOrientationStore();
        this.searchResultsActionStore = new SearchResultsActionStore();
        this.tfsDataStore = new TfsDataStore();
        this.searchResultsErrorStore = new SearchResultsErrorStore();
        this.searchProvidersStore = new SearchProvidersStore();
        this.filterStore = new FilterStore();
        this.searchActionStore = new SearchActionStore();
        this.requestUrlStore = new RequestUrlStore();
        this.pathStore = new PathStore();
        this.accountsStore = new AccountsStore();

        actionsHub.searchResultsSortCriteriaChanged.addListener((payload: IResultsSortCriteriaPayload) => {
            this.sortCriteriaStore.changeResultsSortCriteria(payload.sortOptions, payload.searchProvider);
        });
        
        actionsHub.resultsObtained.addListener((payload: IResultsObtainedPayLoad) => {
            this.searchResultsStore.resultsObtained(payload.searchResponse, payload.activityId, payload.indexUnderFocus, payload.availableWidth, payload.entity);
        });

        actionsHub.workItemResultsViewChanged.addListener((payload: IResultsViewChangedPayLoad) => {
            this.resultsViewStore.updateSearchResultsViewMode(payload.resultsViewMode);
        });

        actionsHub.previewOrientationChanged.addListener((payload: IPreviewOrientationChangedPayload) => {
            this.previewOrientationStore.updatePreviewOrientationMode(payload.orientation);
        });

        actionsHub.resultsPaneRowSelectionChanged.addListener((payload: IResultsPaneRowSelectionChangedPayload) => {
            this.searchResultsActionStore.updateActiveItemRow(payload.item, payload.index, payload.sender);
        });

        actionsHub.resultsPaneRowInvoked.addListener((payload: IResultPaneRowInvokedPayload) => {
            this.searchResultsActionStore.invokeItemRow(payload.item, payload.index, payload.sender);
        });

        actionsHub.showMoreActivated.addListener((payload: IShowMoreActivatedPayload) => {
            this.searchResultsActionStore.fireShowMoreEvent(payload.sender);
        });

        actionsHub.tfsDataChanged.addListener((payload: ITfsDataChangedPayload) => {
            this.tfsDataStore.updateTfsData(payload.data);
        });

        actionsHub.resetSearch.addListener((payload: any) => {
            this.searchResultsStore.reset();
        });

        actionsHub.searchResultContextMenuKeyPressed.addListener((payload: ISearchResultContextMenuKeyPressedPayload) => {
            this.searchResultsActionStore.toggleSearchContextMenuStateForItem(
                payload.item, payload.rowIndex, payload.sender);
        });

        actionsHub.searchErrorOccurred.addListener((payload: IResultsErrorPayload) => {
            this.searchResultsErrorStore.resultsObtained(
                payload.response,
                payload.errors,
                payload.activityId,
                payload.showMoreResults);
        });

        actionsHub.searchProvidersUpdated.addListener((payload: ISearchProvidersPayload) => {
            this.searchProvidersStore.updateSearchProviders(payload);
            this.sortCriteriaStore.initialize(payload.currentProvider);
        });

        actionsHub.filtersUpdated.addListener((filters: any[]) => {
            this.filterStore.updateFilters(filters);
        });

        actionsHub.filtersVisibilityToggled.addListener(() => {
            this.filterStore.toggleFiltersVisibility();
        });

        actionsHub.accountsUpdated.addListener((accounts: any[]) => {
            this.accountsStore.update(accounts);
        });

        actionsHub.searchInitiated.addListener((executing: boolean) => {
            this.searchActionStore.updateSearchState(executing);
        });

        actionsHub.pathsLoaded.addListener((payload: any) => {
            this.pathStore.updatePaths(payload.pathType, payload.items, payload.loadingState);
        });
    }

    public static getInstance(): StoresHub {
        if (!StoresHub.instance) {
            let actionsHub = ActionsHub.getInstance();
            StoresHub.instance = new StoresHub(actionsHub);
        }

        return StoresHub.instance;
    }
}