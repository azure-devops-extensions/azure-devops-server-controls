import * as CompositeStoresManager from "Search/Scenarios/Shared/Base/Stores/CompositeStoresManager";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as _SortOptions from "SearchUI/SortOptions";
import * as _PreviewSetting from "Search/Scenarios/Shared/Components/PreviewSettingsPivot";
import * as _Filter from "SearchUI/Utilities/Filter";
import { Action } from "VSS/Flux/Action";
import { ActionsHub, ColorsDataPayload } from "Search/Scenarios/WorkItem/Flux/ActionsHub";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { SearchStore } from "Search/Scenarios/WorkItem/Flux/Stores/SearchStore";
import { SearchSecurityConstants } from "Search/Scenarios/Shared/Constants";
import { SearchStoreState } from "Search/Scenarios/Shared/Base/Stores/SearchStore";
import { ItemContentStore } from "Search/Scenarios/WorkItem/Flux/Stores/ItemContentStore";
import { FilterStore } from "Search/Scenarios/WorkItem/Flux/Stores/FilterStore";
import { FilterStoreState } from "Search/Scenarios/Shared/Base/Stores/FilterStore";
import { PreviewOrientationStore } from "Search/Scenarios/WorkItem/Flux/Stores/PreviewOrientationStore";
import { PreviewOrientationStoreState } from "Search/Scenarios/Shared/Base/Stores/PreviewOrientationStore";
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { AreaNodeTreeFilterStore } from "Search/Scenarios/WorkItem/Flux/Stores/AreaNodeTreeStore";
import { SparseTreeState, SearchType } from "Search/Scenarios/Shared/Base/Stores/SparseTreeStore";
import { KnownAreaNodeStore, KnownAreaNodeState } from "Search/Scenarios/WorkItem/Flux/Stores/KnownAreaNodeStore";
import { SortOptionsStore } from "Search/Scenarios/WorkItem/Flux/Stores/SortOptionsStore";
import { NotificationStore, NotificationStoreState } from "Search/Scenarios/WorkItem/Flux/Stores/NotificationStore";
import { ColorsDataStore } from "Search/Scenarios/WorkItem/Flux/Stores/ColorsDataStore";
import { SnippetFragmentCache } from "Search/Scenarios/WorkItem/Flux/Stores/SnippetFragmentCache";
import { HelpStore, HelpStoreState } from "Search/Scenarios/WorkItem/Flux/Stores/HelpStore";
import { WorkItemSearchRequest, WorkItemSearchResponse, WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { ZeroDataStore } from "Search/Scenarios/WorkItem/Flux/Stores/ZeroDataStore";
import { ZeroDataState } from "Search/Scenarios/Shared/Base/Stores/ZeroDataStore";
import { OrganizationInfoStore, IOrganizationInfoState } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";

export type StoreName =
    "searchStore" |
    "itemContentStore" |
    "filterStore" |
    "sortOptionsStore" |
    "knownAreaNodeStore" |
    "areaNodeTreeStore" |
    "previewOrientationStore" |
    "colorsDataStore" |
    "notificationStore" |
    "helpStore" |
    "zeroDataStore"|
    "organizationInfoStore";


export interface AggregatedState {
    selectedItem: WorkItemResult;

    availableSortFields: _SortOptions.SortField[];

    appliedEntitySortOption: _SearchSharedContracts.EntitySortOption;

    isSortOptionVisible: boolean;

    isProjectContext: boolean;

    availablePreviewOrientations: _PreviewSetting.PreviewSetting[];

    searchStoreState: SearchStoreState<WorkItemSearchRequest, WorkItemSearchResponse>

    filterStoreState: FilterStoreState;

    areaNodeTreeState: SparseTreeState;

    knownAreaNodeState: KnownAreaNodeState;

    previewOrientationStoreState: PreviewOrientationStoreState;

    colorsData: ColorsDataPayload;

    notificationStoreState: NotificationStoreState;

    helpStoreState: HelpStoreState;

    zeroDataState: ZeroDataState;
    
    organizationInfoState: IOrganizationInfoState;

    areaNodeTreeItemsCount: number;
}

export class StoresHub {
    private readonly compositeStoresManager = new CompositeStoresManager.CompositeStoresManager();
    private readonly listener: CompositeStoresManager.ListeningActionsManager;
    private readonly isProjectContext: boolean;

    public searchStore: SearchStore;
    public itemContentStore: ItemContentStore;
    public sortOptionsStore: SortOptionsStore;
    public filterStore: FilterStore;
    public areaNodeTreeStore: AreaNodeTreeFilterStore;
    public knownAreaNodeStore: KnownAreaNodeStore;
    public previewOrientationStore: PreviewOrientationStore;
    public colorsDataStore: ColorsDataStore;
    public notificationStore: NotificationStore;
    public helpStore: HelpStore;
    public zeroDataStore: ZeroDataStore;
    public snippetFragmentCache: SnippetFragmentCache;
    public organizationInfoStore: OrganizationInfoStore;

    constructor(
        private readonly actionsHub: ActionsHub,
        filter: _Filter.Filter,
        isProjectContext: boolean,
        projectName: string,
        isMember: boolean,
        private readonly onDispatched?: CompositeStoresManager.EmitChangedFunction<any>) {
        this.isProjectContext = isProjectContext;
        this.listener = new CompositeStoresManager.ListeningActionsManager(this.emitChanged);
        this.searchStore = this.createSearchStore(actionsHub);
        this.itemContentStore = this.createItemContentStore(actionsHub);
        this.sortOptionsStore = this.createSortOptionsStore(actionsHub);
        this.filterStore = this.createFilterStore(actionsHub, filter, isProjectContext, projectName, isMember);
        this.areaNodeTreeStore = this.createAreaNodeTreeFilterStore(actionsHub);
        this.knownAreaNodeStore = this.createKnownAreaNodeStore(actionsHub);
        this.previewOrientationStore = this.createPreviewOrientationStore(actionsHub);
        this.colorsDataStore = this.createColorsDataStore(actionsHub);
        this.notificationStore = this.createNotificationStore(actionsHub);
        this.helpStore = this.createHelpStore(actionsHub);
        this.zeroDataStore = this.createZeroDataStore(actionsHub);
        this.snippetFragmentCache = this.createSnippetFragmentCache(actionsHub);
        this.organizationInfoStore = this.createOrganizationInfoStore(actionsHub);
    }

    public getAggregatedState = (): AggregatedState => {
        const { itemHitCount, searchType, visibleItems } = this.areaNodeTreeStore.state;
        const visibleTreeItems = visibleItems();
        const areaNodeTreeItemsCount = searchType !== SearchType.Keyword ? visibleTreeItems.length : itemHitCount;

        return {
            selectedItem: this.itemContentStore.state.selectedItem,
            availableSortFields: this.sortOptionsStore.availableSortFields,
            appliedEntitySortOption: this.sortOptionsStore.state.sortOption,
            isSortOptionVisible: this.sortOptionsStore.state.isVisible,
            isProjectContext: this.isProjectContext,
            searchStoreState: this.searchStore.state,
            filterStoreState: this.filterStore.state,
            previewOrientationStoreState: this.previewOrientationStore.state,
            areaNodeTreeState: this.areaNodeTreeStore.state,
            knownAreaNodeState: this.knownAreaNodeStore.state,
            availablePreviewOrientations: this.previewOrientationStore.availablePreviewOrientations,
            colorsData: this.colorsDataStore.state,
            notificationStoreState: this.notificationStore.state,
            helpStoreState: this.helpStore.state,
            zeroDataState: this.zeroDataStore.state,
            organizationInfoState: this.organizationInfoStore.state,
            areaNodeTreeItemsCount
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
            // On landing page update the query state for an adequate search store state
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

    private createFilterStore(
        actionsHub: ActionsHub,
        filter: _Filter.Filter,
        isProjectContext: boolean,
        projectName: string,
        isMember): FilterStore {

        const isAssignedToFilterEnabled = 
            FeatureAvailabilityService.isFeatureEnabled(SearchSecurityConstants.SearchEnableAssignedToFeatureFlag, false);

        const store = new FilterStore(isProjectContext, isMember, isAssignedToFilterEnabled, filter, projectName);

        this.listener.listen(actionsHub.resultsLoaded, "filterStore", (payload) => {
            const { searchStoreState } = this.getAggregatedState(),
                { query } = searchStoreState;
            store.updateFilters(query, payload.response);
        });

        this.listener.listen(actionsHub.filterPaneVisibilityChanged, "filterStore", store.changeFilterPaneVisibility);

        return store;
    }

    public createSortOptionsStore(actionsHub: ActionsHub): SortOptionsStore {
        const store = new SortOptionsStore();

        this.listener.listen(actionsHub.sortOptionChanged, "sortOptionsStore", store.changeSortOption);
        this.listener.listen(actionsHub.pageInitializationStarted, "sortOptionsStore", (payload) => {
            // On Landing Page scenario sort options are disabled
            payload.isLandingPage ? store.changeSortOptionVisibility(false) : store.updateSortOptionOnSearch(payload);
        });
        this.listener.listen(actionsHub.searchStarted, "sortOptionsStore", store.updateSortOptionOnSearch);
        this.listener.listen(actionsHub.resultsLoaded, "sortOptionsStore", () => { store.changeSortOptionVisibility(true); });

        return store;
    }

    public createColorsDataStore(actionsHub: ActionsHub): ColorsDataStore {
        const store = new ColorsDataStore();

        this.listener.listen(actionsHub.colorsDataRetrieved, "colorsDataStore", store.colorsDataObtained);

        return store;
    }

    public createAreaNodeTreeFilterStore(actionsHub: ActionsHub): AreaNodeTreeFilterStore {
        const adapter = new ActionAdapter();
        const treeStore = new AreaNodeTreeFilterStore(adapter);

        this.listener.listen(actionsHub.areaNodeRetrieved, "areaNodeTreeStore", treeStore.onAreaNodeRetrieved);
        this.listener.listen(actionsHub.knownAreaNodeFetched, "areaNodeTreeStore", treeStore.onAreaNodeRetrieved);
        this.listener.listen(actionsHub.treeItemCollapsed, "areaNodeTreeStore", treeStore.collapse);
        this.listener.listen(actionsHub.treeItemExpanded, "areaNodeTreeStore", treeStore.expanded);
        this.listener.listen(actionsHub.refreshTree, "areaNodeTreeStore", treeStore.resetTree);
        this.listener.listen(actionsHub.updateDefaultAreaPath, "areaNodeTreeStore", treeStore.updateDefaultPath);
        this.listener.listen(actionsHub.treeSearchTextChanged, "areaNodeTeeStore", treeStore.refineTreeItems);
        this.listener.listen(actionsHub.treeDropdownDismissed, "areaNodeTeeStore", treeStore.onTreeDropdownDismissed);
        this.listener.listen(actionsHub.treeDropdownInvoked, "treeStore", treeStore.onTreeDropdownInvoked);        this.listener.listen(actionsHub.areaNodeRetrievalFailed, "areaNodeTeeStore", treeStore.onItemRetrievalFailed);
        return treeStore;
    }

    public createKnownAreaNodeStore(actionsHub: ActionsHub): KnownAreaNodeStore {
        const store = new KnownAreaNodeStore();

        this.listener.listen(actionsHub.areaNodeRetrieved, "knownItems", payload => {
            store.loadItems(payload.areaNode, payload.project);
        });

        return store;
    }

    public createNotificationStore(actionsHub: ActionsHub): NotificationStore {
        const store = new NotificationStore();

        this.listener.listen(actionsHub.showPreviewMessageBanner, "notificationStore", store.showWorkItemPreviewBanner);
        this.listener.listen(actionsHub.dismissPreviewMessageBanner, "notificationStore", store.dismissWorkItemPreviewBanner);
        this.listener.listen(actionsHub.itemChanged, "notificationStore", store.dismissWorkItemPreviewBanner);
        this.listener.listen(actionsHub.resultsLoaded, "notificationStore", store.onSearchResultsLoaded);
        this.listener.listen(actionsHub.searchStarted, "notificationStore", store.reset);

        return store;
    }

    public createHelpStore(actionsHub: ActionsHub): HelpStore {
        const store = new HelpStore();

        this.listener.listen(actionsHub.workItemFieldsRetrieved, "helpStore", store.onWorkItemFieldsRetrieved);
        this.listener.listen(actionsHub.workItemSearchTextChanged, "helpStore", store.onWorkItemSearchTextChanged);
        this.listener.listen(actionsHub.workItemFieldsRetrievalFailed, "helpStore", store.onWorkItemFieldsRetrievalFailed);
        this.listener.listen(actionsHub.helpDropdownVisibilityChanged, "helpStore", store.updateHelpDropdownVisibility);
        this.listener.listen(actionsHub.searchStarted, "helpStore", payload => store.updateHelpDropdownVisibility(false));
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
                { query } = searchStoreState;
            store.onResultsLoaded(query, payload);
        });
        this.listener.listen(actionsHub.searchFailed, "zeroDataStore", (payload) => {
            const { searchStoreState } = this.getAggregatedState();
            store.onSearchFailed(payload, searchStoreState.query);
        });
        this.listener.listen(actionsHub.searchStarted, "zeroDataStore", store.reset);

        return store;
    }

    private createSnippetFragmentCache(actionsHub: ActionsHub): SnippetFragmentCache {
        const snippetFragmentCache = new SnippetFragmentCache();

        this.listener.listen(actionsHub.resultsLoaded, "snippetFragmentCache", snippetFragmentCache.evictCache);
        this.listener.listen(actionsHub.searchFailed, "snippetFragmentCache", snippetFragmentCache.evictCache);

        return snippetFragmentCache;
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
        this.listener.listen(actionsHub.errorNotificationBannerDismissed, "organizationInfoStore", store.onResetOrganizationInfoLoadStatus);
        this.listener.listen(actionsHub.searchStarted, "organizationInfoStore", store.onResetOrganizationInfoLoadStatus);
        return store;
    }
}

export function getDefaultPath(filters: IDictionaryStringTo<string[]>): string {
    return filters[Constants.FilterKeys.AreaPathsFilterKey] ? filters[Constants.FilterKeys.AreaPathsFilterKey][0] : null;
}

export function getOnlyAppliedFilterInCategory(filterCategories: _SearchSharedContracts.FilterCategory[], categoryName): string {
    const onlyAppliedFilter = filterCategories.map((filter) => {
        const selectedFilters = filter.filters.filter(f => f.selected);
        const isOnlyOneFilterSelected = ignoreCaseComparer(filter.name, categoryName) === 0 &&
            selectedFilters.length === 1;

        return isOnlyOneFilterSelected ? selectedFilters[0].name : null;
    }).filter(fc => !!fc);

    return onlyAppliedFilter.length === 1 ? onlyAppliedFilter[0] : null;
}
