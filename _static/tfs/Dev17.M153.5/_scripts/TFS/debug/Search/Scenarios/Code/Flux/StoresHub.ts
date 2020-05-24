import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as _Filter from "SearchUI/Utilities/Filter";
import * as _SortOptions from "SearchUI/SortOptions";
import * as _PreviewSetting from "Search/Scenarios/Shared/Components/PreviewSettingsPivot";
import * as Constants from "Search/Scenarios/Code/Constants";
import * as CompositeStoresManager from "Search/Scenarios/Shared/Base/Stores/CompositeStoresManager";
import { Action } from "VSS/Flux/Action";
import { ActionsHub, PathSourceParams } from "Search/Scenarios/Code/Flux/ActionsHub";
import { SearchStore } from "Search/Scenarios/Code/Flux/Stores/SearchStore";
import { SearchStoreState } from "Search/Scenarios/Shared/Base/Stores/SearchStore";
import { ItemContentStore } from "Search/Scenarios/Code/Flux/Stores/ItemContentStore";
import { FileContentStore, FileContentState } from "Search/Scenarios/Code/Flux/Stores/FileContentStore";
import { ContextStore, ContextStoreState, RepositoryContextStore, RepositoryContextStoreState } from "Search/Scenarios/Code/Flux/Stores/RepositoryContextStore";
import { FilterStore } from "Search/Scenarios/Code/Flux/Stores/FilterStore";
import { FilterStoreState } from "Search/Scenarios/Shared/Base/Stores/FilterStore";
import { PivotTabsStore, PivotTabsState } from "Search/Scenarios/Code/Flux/Stores/PivotTabStore";
import { SortOptionsStore } from "Search/Scenarios/Code/Flux/Stores/SortOptionsStore";
import { ActionAdapter, IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { ZeroDataStore } from "Search/Scenarios/Code/Flux/Stores/ZeroDataStore";
import { ZeroDataState } from "Search/Scenarios/Shared/Base/Stores/ZeroDataStore";
import { TreeFilterStore } from "Search/Scenarios/Code/Flux/Stores/TreeStore";
import { SparseTreeState, SearchType } from "Search/Scenarios/Shared/Base/Stores/SparseTreeStore";
import { PreviewOrientationStore } from "Search/Scenarios/Code/Flux/Stores/PreviewOrientationStore";
import { PreviewOrientationStoreState } from "Search/Scenarios/Shared/Base/Stores/PreviewOrientationStore";
import { KnownItemsStore, KnownItemsState } from "Search/Scenarios/Code/Flux/Stores/KnownItemsStore";
import { KnownPathsState, KnownPathsStore } from "Search/Scenarios/Code/Flux/Stores/KnownPathsStore";
import { AccountStore, AccountStoreState } from "Search/Scenarios/Code/Flux/Stores/AccountStore";
import { CompareState, CompareStore } from "Search/Scenarios/Code/Flux/Stores/CompareStore";
import { HelpStore, HelpStoreState } from "Search/Scenarios/Code/Flux/Stores/HelpStore";
import { HitNavigationStore, HitNavigationState } from "Search/Scenarios/Code/Flux/Stores/HitNavigationStore";
import { NotificationStore, NotificationStoreState } from "Search/Scenarios/Code/Flux/Stores/NotificationStore";
import { RepositoryContextCache } from "Search/Scenarios/Code/Flux/Stores/RepositoryContextCache";
import { OrganizationInfoStore, IOrganizationInfoState } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import { isGitRepo, isVCType } from "Search/Scenarios/Code/Utils";
import { SearchQuery, CodeQueryResponse, CodeResult, VersionControlType } from "Search/Scenarios/WebApi/Code.Contracts";
import { ignoreCaseComparer } from "VSS/Utils/String";

export type StoreName =
    "searchStore" |
    "itemContentStore" |
    "contextStore" |
    "pathStore" |
    "filterStore" |
    "pivotTabsStore" |
    "sortOptionsStore" |
    "treeStore" |
    "fileContentStore" |
    "hitNavigationStore" |
    "knownItems" |
    "compareStore" |
    "previewOrientationStore" |
    "notificationStore" |
    "knownPathsStore" |
    "helpStore" |
    "accountStore" |
    "repositoryContextStore" |
    "repositoryContextCache" |
    "zeroDataStore" |
    "organizationInfoStore";

export interface AggregatedState {
    selectedItem: CodeResult;

    availableSortFields: _SortOptions.SortField[];

    appliedEntitySortOption: _SearchSharedContracts.EntitySortOption;

    knownRepositories: IDictionaryStringTo<IDictionaryStringTo<_VCRepositoryContext.RepositoryContext>>;

    isSortOptionVisible: boolean;

    isProjectContext: boolean;

    availablePreviewOrientations: _PreviewSetting.PreviewSetting[];

    visibleTreeItems: IItem[];

    treeItemsDisplayCount: number;

    treeState: SparseTreeState;

    knownItemsState: KnownItemsState;

    knownPathsState: KnownPathsState;

    fileContentState: FileContentState;

    hitNavigationState: HitNavigationState;

    compareState: CompareState;

    notificationStoreState: NotificationStoreState;

    helpStoreState: HelpStoreState;

    searchStoreState: SearchStoreState<SearchQuery, CodeQueryResponse>;

    pivotTabsState: PivotTabsState;

    contextStoreState: ContextStoreState;

    filterStoreState: FilterStoreState;

    previewOrientationStoreState: PreviewOrientationStoreState;

    accountStoreState: AccountStoreState;

    zeroDataState: ZeroDataState;

    repositoryContextStoreState: RepositoryContextStoreState;

    organizationInfoState: IOrganizationInfoState;
}

export class StoresHub {
    private readonly compositeStoresManager = new CompositeStoresManager.CompositeStoresManager();
    private readonly listener: CompositeStoresManager.ListeningActionsManager;
    private readonly isProjectContext: boolean;

    public searchStore: SearchStore;
    public itemContentStore: ItemContentStore;
    public contextStore: ContextStore;
    public filterStore: FilterStore;
    public pivotTabsStore: PivotTabsStore;
    public sortOptionsStore: SortOptionsStore;
    public treeStore: TreeFilterStore;
    public knownItemsStore: KnownItemsStore;
    public fileContentStore: FileContentStore;
    public hitNavigationStore: HitNavigationStore;
    public previewOrientationStore: PreviewOrientationStore;
    public compareStore: CompareStore;
    public notificationStore: NotificationStore;
    public knowPathsStore: KnownPathsStore;
    public helpStore: HelpStore;
    public accountStore: AccountStore;
    public zeroDataStore: ZeroDataStore;
    public repositoryContextStore: RepositoryContextStore;
    public repositoryContextCache: RepositoryContextCache;
    public organizationInfoStore: OrganizationInfoStore;

    constructor(
        private readonly actionsHub: ActionsHub,
        filter: _Filter.Filter,
        isProjectContext: boolean,
        projectName: string,
        private readonly onDispatched?: CompositeStoresManager.EmitChangedFunction<any>) {
        this.isProjectContext = isProjectContext;
        this.listener = new CompositeStoresManager.ListeningActionsManager(this.emitChanged);
        this.searchStore = this.createSearchStore(actionsHub);
        this.itemContentStore = this.createItemContentStore(actionsHub);
        this.contextStore = this.createContextStore(actionsHub);
        this.filterStore = this.createFilterStore(actionsHub, filter, isProjectContext, projectName);
        this.pivotTabsStore = this.createPivotTabsStore(actionsHub);
        this.sortOptionsStore = this.createSortOptionsStore(actionsHub);
        this.treeStore = this.createTreeStore(actionsHub);
        this.knownItemsStore = this.createKnownItemsStore(actionsHub);
        this.fileContentStore = this.createFileContentStore(actionsHub);
        this.hitNavigationStore = this.createHitNavigationStore(actionsHub);
        this.previewOrientationStore = this.createPreviewOrientationStore(actionsHub);
        this.compareStore = this.createCompareStore(actionsHub);
        this.notificationStore = this.createNotificationStore(actionsHub);
        this.knowPathsStore = this.createKnownPathsStore(actionsHub);
        this.helpStore = this.createHelpStore(actionsHub);
        this.accountStore = this.createAccountStore(actionsHub);
        this.zeroDataStore = this.createZeroDataStore(actionsHub);
        this.repositoryContextStore = this.createRepositoryContextStore(actionsHub);
        this.repositoryContextCache = this.createRepositoryContextCache(actionsHub);
        this.organizationInfoStore = this.createOrganizationInfoStore(actionsHub);
    }

    public getAggregatedState = (): AggregatedState => {
        const { visibleItems, searchType, itemHitCount } = this.treeStore.state;
        const visibleTreeItems = visibleItems();
        const treeItemsDisplayCount = searchType !== SearchType.Keyword ? visibleTreeItems.length : itemHitCount;
        return {
            selectedItem: this.itemContentStore.state.selectedItem,
            appliedEntitySortOption: this.sortOptionsStore.state.sortOption,
            availableSortFields: this.sortOptionsStore.availableSortFields,
            isSortOptionVisible: this.sortOptionsStore.state.isVisible,
            isProjectContext: this.isProjectContext,
            knownRepositories: this.repositoryContextCache.repositories,
            visibleTreeItems,
            treeItemsDisplayCount,
            availablePreviewOrientations: this.previewOrientationStore.availablePreviewOrientations,
            searchStoreState: this.searchStore.state,
            pivotTabsState: this.pivotTabsStore.state,
            contextStoreState: this.contextStore.state,
            filterStoreState: this.filterStore.state,
            knownItemsState: this.knownItemsStore.state,
            treeState: this.treeStore.state,
            fileContentState: this.fileContentStore.state,
            hitNavigationState: this.hitNavigationStore.state,
            compareState: this.compareStore.state,
            notificationStoreState: this.notificationStore.state,
            knownPathsState: this.knowPathsStore.state,
            helpStoreState: this.helpStore.state,
            previewOrientationStoreState: this.previewOrientationStore.state,
            accountStoreState: this.accountStore.state,
            zeroDataState: this.zeroDataStore.state,
            repositoryContextStoreState: this.repositoryContextStore.state,
            organizationInfoState: this.organizationInfoStore.state
        };
    }

    public getCompositeStore(storeNames: StoreName[]): CompositeStoresManager.CompositeStore {
        return this.compositeStoresManager.getOrCreate(storeNames);
    }

    public dispose = (): void => {
        this.listener.dispose();
        this.compositeStoresManager.dispose();
    }

    private createSearchStore(actionsHub: ActionsHub): SearchStore {
        const store = new SearchStore();

        this.listener.listen(actionsHub.pageInitializationStarted, "searchStore", (payload) => {
            payload.isLandingPage ? store.updateQuery(payload) : store.startSearch(payload);
        });
        this.listener.listen(actionsHub.resultsLoaded, "searchStore", store.loadSearchResults);
        this.listener.listen(actionsHub.searchStarted, "searchStore", store.startSearch);
        this.listener.listen(actionsHub.sortOptionChanged, "searchStore", store.updateItemsOnSort);
        this.listener.listen(actionsHub.searchFailed, "searchStore", store.failSearch);

        return store;
    }

    private createPreviewOrientationStore(actionsHub: ActionsHub): PreviewOrientationStore {
        const store = new PreviewOrientationStore();

        this.listener.listen(actionsHub.previewOrientationChanged, "previewOrientationStore", store.updatePreviewOrientationMode);
        this.listener.listen(actionsHub.resultsLoaded, "previewOrientationStore", (payload) => {
            const settingsPivotVisible: boolean = payload.response.results.values.length > 0;
            store.onResultsObtained(settingsPivotVisible);
        });

        return store;
    }

    private createItemContentStore(actionsHub: ActionsHub): ItemContentStore {
        const store = new ItemContentStore();

        this.listener.listen(actionsHub.itemChanged, "itemContentStore", store.changeActiveItem);
        this.listener.listen(actionsHub.resultsLoaded, "itemContentStore", store.resetActiveItem);
        this.listener.listen(actionsHub.sortOptionChanged, "itemContentStore", store.updateActiveItemOnSort);

        return store;
    }

    private createFileContentStore(actionsHub: ActionsHub): FileContentStore {
        const store = new FileContentStore();
        this.listener.listen(actionsHub.fileContentRetrieved, "fileContentStore", (payload) => {
            const { selectedItem } = this.getAggregatedState();
            store.updateFileContent(payload, selectedItem);
        });
        this.listener.listen(actionsHub.fileContentRetrievalStarted, "fileContentStore", store.onFileContentLoading);
        this.listener.listen(actionsHub.itemChanged, "fileContentStore", store.reset);
        this.listener.listen(actionsHub.sortOptionChanged, "fileContentStore", store.reset);
        this.listener.listen(actionsHub.resultsLoaded, "fileContentStore", store.reset);
        this.listener.listen(actionsHub.fileContentRetrievalFailed, "fileContentStore", store.onLoadFailed);

        return store;
    }

    private createHitNavigationStore(actionsHub: ActionsHub): HitNavigationStore {
        const store = new HitNavigationStore();
        this.listener.listen(actionsHub.fileContentRetrieved, "hitNavigationStore", (payload) => {
            const { searchStoreState, selectedItem } = this.getAggregatedState(), { response } = searchStoreState;
            if (selectedItem === payload.item) {
                const itemIndex = response.results.values.indexOf(selectedItem),
                    resultsCount = response.results.values.length,
                    hits = selectedItem.matches[Constants.ContentHitKey];
                store.updateHitNavigation(payload.fileContent, hits, itemIndex, resultsCount);
            }
        });

        this.listener.listen(actionsHub.nextHitNavigated, "hitNavigationStore", () => {
            const { selectedItem, searchStoreState } = this.getAggregatedState(),
                { response } = searchStoreState,
                itemIndex = response.results.values.indexOf(selectedItem),
                resultsCount = response.results.values.length;
            store.incrementActiveHighlightIndex(itemIndex, resultsCount);
        });

        this.listener.listen(actionsHub.prevHitNavigated, "hitNavigationStore", () => {
            const { selectedItem, searchStoreState } = this.getAggregatedState(),
                { response } = searchStoreState,
                itemIndex = response.results.values.indexOf(selectedItem),
                resultsCount = response.results.values.length;
            store.decrementActiveIndexHighlight(itemIndex, resultsCount);
        });

        this.listener.listen(actionsHub.cursorPositionChanged, "hitNavigationStore", (payload) => {
            const { selectedItem, searchStoreState } = this.getAggregatedState(),
                { response } = searchStoreState,
                itemIndex = response.results.values.indexOf(selectedItem),
                resultsCount = response.results.values.length;
            store.updateCursorPosition(payload, itemIndex, resultsCount);
        });

        this.listener.listen(actionsHub.itemChanged, "hitNavigationStore", (payload) => {
            if (payload.changedOnNavigation) {
                store.setSelectionChangeOnHitNav();
            }

            store.reset();
        });

        this.listener.listen(actionsHub.resultsLoaded, "hitNavigationStore", store.reset);
        this.listener.listen(actionsHub.sortOptionChanged, "hitNavigationStore", store.reset);

        return store;
    }

    private createContextStore(actionsHub: ActionsHub): ContextStore {
        const store = new ContextStore();

        this.listener.listen(actionsHub.contextRetrieved, "contextStore", store.onContextUpdated);
        this.listener.listen(actionsHub.contextRetrievalFailed, "contextStore", store.onContextRetrievalLoadFailed);
        this.listener.listen(actionsHub.contextRetrievalStarted, "contextStore", store.onContextUpdating);
        this.listener.listen(actionsHub.repositoryContextRetrievalFailed, "contextStore", payload => {
            const { selectedItem } = this.getAggregatedState();
            if (selectedItem && isVCType(selectedItem.vcType)) {
                store.onRepositoryContextRetrievalFailed(payload, selectedItem);
            }
        });

        return store;
    }

    private createRepositoryContextStore(actionsHub: ActionsHub): RepositoryContextStore {
        const store = new RepositoryContextStore();

        this.listener.listen(actionsHub.repositoryContextRetrieved, "repositoryContextStore",
            payload => {
                const { query } = this.getAggregatedState().searchStoreState
                store.onRepositoryContextRetrieved(payload.repositoryContext, payload.project, payload.repositoryName, query)
            });

        this.listener.listen(actionsHub.knownRepositoryContextRetrieved, "repositoryContextStore",
            payload => {
                const { query } = this.getAggregatedState().searchStoreState
                store.onRepositoryContextRetrieved(payload.repositoryContext, payload.project, payload.repositoryName, query)
            });

        return store;
    }

    private createFilterStore(actionsHub: ActionsHub, filter: _Filter.Filter, isProjectContext: boolean, projectName: string): FilterStore {
        const store = new FilterStore(filter, isProjectContext, projectName);

        this.listener.listen(actionsHub.resultsLoaded, "filterStore", (payload) => {
            const { searchStoreState } = this.getAggregatedState(),
                { query } = searchStoreState;
            store.updateFilters(query, payload.response);
        });

        this.listener.listen(actionsHub.filterPaneVisibilityChanged, "filterStore", store.changeFilterPaneVisibility);

        return store;
    }

    public createPivotTabsStore(actionsHub: ActionsHub): PivotTabsStore {
        const store = new PivotTabsStore();

        this.listener.listen(actionsHub.itemChanged, "pivotTabsStore", (payload) => { store.updateTabs(payload.item) });
        this.listener.listen(actionsHub.sortOptionChanged, "pivotTabsStore", (payload) => { store.updateTabs(payload.sortedItems[0]) });
        this.listener.listen(actionsHub.activeTabChanged, "pivotTabsStore", store.changeTab);
        this.listener.listen(actionsHub.pageInitializationStarted, "pivotTabsStore", (payload) => { store.onPageInitializationStarted(payload.activeTabKey) });
        this.listener.listen(actionsHub.resultsLoaded, "pivotTabsStore", (payload) => { store.updateTabs(payload.activeItem) });
        this.listener.listen(actionsHub.contextRetrieved, "pivotTabsStore", (payload) => {
            const { selectedItem } = this.getAggregatedState();
            store.updateTabsOnContextRetrieval(selectedItem, payload);
        });
        this.listener.listen(actionsHub.fullScreenToggled, "pivotTabsStore", store.toggleFullScreen);
        this.listener.listen(actionsHub.searchStarted, "pivotTabsStore", () => { store.toggleFullScreen(false) })
        this.listener.listen(actionsHub.contentRendererFetched, "pivotTabStore", (payload) => {
            const { selectedItem } = this.getAggregatedState();
            store.updateTabsOnRendererRetrieval(payload, selectedItem);
        });

        return store;
    }

    public createSortOptionsStore(actionsHub: ActionsHub): SortOptionsStore {
        const store = new SortOptionsStore();

        this.listener.listen(actionsHub.sortOptionChanged, "sortOptionsStore", store.changeSortOption);
        this.listener.listen(actionsHub.pageInitializationStarted, "sortOptionsStore", (payload) => {
            if (payload.isLandingPage) {
                // On Landing Page scenario sort options are disabled
                store.changeSortOptionVisibility(false);
            }
        });
        this.listener.listen(actionsHub.searchStarted, "sortOptionsStore", store.updateSortOptionOnSearch);
        this.listener.listen(actionsHub.resultsLoaded, "sortOptionsStore", () => { store.changeSortOptionVisibility(true) });

        return store;
    }

    private createTreeStore(actionsHub: ActionsHub): TreeFilterStore {
        const adapter = new ActionAdapter();
        const treeStore = new TreeFilterStore(adapter);

        this.listener.listen(actionsHub.initialItemsRetrieved, "treeStore", treeStore.addItems);
        this.listener.listen(actionsHub.itemRetrieved, "treeStore", treeStore.onItemsRetrieved);
        this.listener.listen(actionsHub.knowItemsFetched, "treeStore", treeStore.addItems);
        this.listener.listen(actionsHub.filePathsRetrieved, "treeStore", treeStore.onFilePathFetched);
        this.listener.listen(actionsHub.knownFilePathsFetched, "treeStore", treeStore.onFilePathFetched);
        this.listener.listen(actionsHub.treeItemExpanding, "treeStore", treeStore.startExpand);
        this.listener.listen(actionsHub.treeItemCollapsed, "treeStore", treeStore.collapse);
        this.listener.listen(actionsHub.treeItemExpanded, "treeStore", treeStore.expanded);
        this.listener.listen(actionsHub.treeRefreshed, "treeStore", treeStore.resetTree);
        this.listener.listen(actionsHub.treeDropdownDismissed, "treeStore", treeStore.onTreeDropdownDismissed);
        this.listener.listen(actionsHub.treeDropdownInvoked, "treeStore", treeStore.onTreeDropdownInvoked);
        this.listener.listen(actionsHub.itemRetrievalFailed, "treeStore", treeStore.onItemRetrievalFailed);
        this.listener.listen(actionsHub.treeSearchTextChanged, "treeStore", treeStore.refineTreeItems);
        this.listener.listen(actionsHub.treePathUpdated, "treeStore", treeStore.updateDefaultPath);

        return treeStore;
    }

    private createKnownItemsStore(actionsHub: ActionsHub): KnownItemsStore {
        const store = new KnownItemsStore();

        this.listener.listen(actionsHub.itemRetrieved, "knownItems", payload => {
            store.loadItems(payload.allRetrievedItems, payload.pathSourceParams);
        });

        this.listener.listen(actionsHub.initialItemsRetrieved, "knownItems", payload => {
            store.loadItems(payload.allRetrievedItems, payload.pathSourceParams);
        });
        return store;
    }

    private createCompareStore(actionsHub: ActionsHub): CompareStore {
        const store = new CompareStore();

        this.listener.listen(actionsHub.compareVersionPicked, "compareStore", store.updateCompareVersion);
        this.listener.listen(actionsHub.diffLinesChanged, "compareStore", store.updateDiffLines);
        this.listener.listen(actionsHub.itemChanged, "compareStore", store.resetState);
        this.listener.listen(actionsHub.nextCompareHitNavigated, "compareStore", store.incrementActiveDiffIndex);
        this.listener.listen(actionsHub.prevCompareHitNavigated, "compareStore", store.decrementActiveDiffIndex);
        this.listener.listen(actionsHub.compareViewToggled, "compareStore", store.updateDiffView);
        return store;
    }

    public createNotificationStore(actionsHub: ActionsHub): NotificationStore {
        const store = new NotificationStore();

        this.listener.listen(actionsHub.contextRetrieved, "notificationStore", payload => {
            const { selectedItem } = this.getAggregatedState()
            store.onContextUpdated(selectedItem, payload);
        });
        this.listener.listen(actionsHub.itemChanged, "notificationStore", store.resetFileBannerState);
        this.listener.listen(actionsHub.resultsLoaded, "notificationStore", store.onSearchResultsLoaded);
        this.listener.listen(actionsHub.sortOptionChanged, "notificationStore", store.resetFileBannerState);

        return store;
    }

    public createKnownPathsStore(actionsHub: ActionsHub): KnownPathsStore {
        const store = new KnownPathsStore();
        this.listener.listen(actionsHub.filePathsRetrieved, "knownPathsStore", payload =>
            store.loadItems(payload.paths, payload.pathSourceParams));

        this.listener.listen(actionsHub.filePathsRetrievalFailed, "knownPathsStore", store.addBigRepo);
        return store;
    }

    public createHelpStore(actionsHub: ActionsHub): HelpStore {
        const store = new HelpStore();
        this.listener.listen(actionsHub.helpDropdownVisibilityChanged, "helpStore", store.updateHelpDropdownVisibility);
        this.listener.listen(actionsHub.searchStarted, "helpStore", payload => store.updateHelpDropdownVisibility(false));
        return store;
    }

    public createAccountStore(actionsHub: ActionsHub): AccountStore {
        const store = new AccountStore();
        this.listener.listen(actionsHub.crossAccountMenuDismissed, "accountStore", store.dismissCrossAccountMenu);
        this.listener.listen(actionsHub.crossAccountMenuToggled, "accountStore", store.toggleCrossAccountMenu);
        this.listener.listen(actionsHub.tenantQueryStarted, "accountStore", store.onLoading);
        this.listener.listen(actionsHub.resultsLoaded, "accountStore", store.resetState);
        this.listener.listen(actionsHub.tenantResultsLoaded, "accountStore", store.updateAccounts);
        this.listener.listen(actionsHub.tenantQueryFailed, "accountStore", store.onLoadFailed);
        return store;
    }

    private createZeroDataStore(actionsHub: ActionsHub): ZeroDataStore {
        const store = new ZeroDataStore();

        this.listener.listen(actionsHub.pageInitializationStarted, "zeroDataStore", (payload) => {
            if (payload.isLandingPage) {
                store.onLandingPage();
            }
        });
        this.listener.listen(actionsHub.resultsLoaded, "zeroDataStore", (payload) => {
            const { searchStoreState } = this.getAggregatedState(),
                { query } = searchStoreState,
                fetchMoreScenario = searchStoreState.fetchMoreScenario;
            store.onResultsLoaded(query, payload, fetchMoreScenario);
        });
        this.listener.listen(actionsHub.searchFailed, "zeroDataStore", (payload) => {
            const { searchStoreState } = this.getAggregatedState();
            store.onSearchFailed(payload, searchStoreState.query);
        });
        this.listener.listen(actionsHub.searchStarted, "zeroDataStore", store.reset);

        return store;
    }

    private createRepositoryContextCache(actionHubs: ActionsHub): RepositoryContextCache {
        const cache = new RepositoryContextCache();

        this.listener.listen(
            actionHubs.repositoryContextRetrieved,
            "repositoryContextCache",
            payload =>
                cache.loadRepositoryContext(payload.project, payload.repositoryName, payload.repositoryContext));

        return cache;
    }

    private emitChanged = (changedStores: string[], action: Action<any>, payload: any): void => {
        this.compositeStoresManager.emitCompositeChanged(changedStores);

        if (this.onDispatched) {
            this.onDispatched(changedStores, action, payload);
        }
    }

    private createOrganizationInfoStore(actionsHub: ActionsHub): OrganizationInfoStore {
        const store = new OrganizationInfoStore();
        this.listener.listen(actionsHub.organizationInfoLoaded, "organizationInfoStore", store.onOrganizationInfoLoaded);
        this.listener.listen(actionsHub.organizationInfoLoadFailed, "organizationInfoStore", store.onOrganizationInfoLoadFailed);
        this.listener.listen(actionsHub.searchStarted, "organizationInfoStore", store.onResetOrganizationInfoLoadStatus);
        this.listener.listen(actionsHub.errorNotificationBannerDismissed, "organizationInfoStore", store.onResetOrganizationInfoLoadStatus);
        return store;
    }
}

export function getPathSourceParams(filterCategories: _SearchSharedContracts.FilterCategory[]): PathSourceParams {
    const project = getOnlyAppliedFilterInCategory(filterCategories, Constants.FilterKeys.ProjectFiltersKey);
    const repo = getOnlyAppliedFilterInCategory(filterCategories, Constants.FilterKeys.RepositoryFiltersKey);
    const branch = getOnlyAppliedFilterInCategory(filterCategories, Constants.FilterKeys.BranchFiltersKey);
    let versionString: string;

    if (repo) {
        // Not importing VersionSpec as it brings ~100kb of scripts with it.
        versionString = isGitRepo(repo) ? (!!branch ? `GB${branch}` : "GB") : "T";
    }

    return {
        project: project,
        repositoryName: repo,
        versionString: versionString
    };
}

export function getOnlyAppliedFilterInCategory(filterCategories: _SearchSharedContracts.FilterCategory[], categoryName): string {
    const onlyAppliedFilter = filterCategories.map((filter) => {
        const selectedFilters = filter.filters.filter(f => f.selected);
        const isOnlyOneFilterSelected = ignoreCaseComparer(filter.name, categoryName) === 0 &&
            selectedFilters.length === 1;

        return isOnlyOneFilterSelected ? selectedFilters[0].id : null;
    }).filter(fc => !!fc);

    return onlyAppliedFilter.length === 1 ? onlyAppliedFilter[0] : null;
}

export function getDefaultPath(filters: IDictionaryStringTo<string[]>): string {
    return filters[Constants.FilterKeys.PathFiltersKey] ? filters[Constants.FilterKeys.PathFiltersKey][0] : null;
}