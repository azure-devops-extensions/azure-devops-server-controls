import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import * as StoreBase from "VSS/Flux/Store";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
import { FavoriteQueriesFilterProvider } from "WorkItemTracking/Scripts/Queries/FavoriteQueriesFilterProvider";
import { QueryFavorite, QueryFavoriteGroup, RenamedQueryItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { QueriesConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

/**
 * Query favorite group data provider
 */
export interface IQueryFavoriteGroupDataProvider {
    /**
     * Gets the status of the store.
     *
     * @returns True if items are loaded.
     */
    isLoaded(): boolean;

    /**
     * Gets the query favorite data by the group id.
     *
     * @param key the query artifact id.
     * @returns Query favorite data.
     */
    get(key: string): QueryFavoriteGroup;

    /**
     * Gets all the query favorite groups.
     *
     * @returns Query favorite groups.
     */
    getAll(): QueryFavoriteGroup[];
}

export class QueryFavoriteGroupStore extends StoreBase.Store implements IQueryFavoriteGroupDataProvider {

    private _items: IDictionaryStringTo<QueryFavoriteGroup>;

    constructor(actions: ActionsHub, private filterProvider: FavoriteQueriesFilterProvider) {
        super();

        this._items = null;

        actions.InitializeQueryFavoriteGroups.addListener((items: QueryFavoriteGroup[]) => {
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_STORES_QUERYFAVORITEGROUPSTORE_INITIALIZEQUERYFAVORITEGROUPS, true);
            this._onAdd(items);
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_STORES_QUERYFAVORITEGROUPSTORE_INITIALIZEQUERYFAVORITEGROUPS, false);
        });

        actions.QueryFavoriteGroupUpdated.addListener((item: QueryFavoriteGroup) => {
            this._onAdd(item);
        });

        actions.QueryFavoriteLoadingGroupRemoved.addListener((item: QueryFavoriteGroup) => {
            this._onRemoveLoadingFavoriteGroup(item);
        });

        actions.QueryFavoriteGroupsUpdated.addListener((items: QueryFavoriteGroup[]) => {
            this._onAdd(items);
        });

        actions.QueryFavoriteGroupExpanded.addListener((key: string) => {
            const group = this._items[key];
            group.isExpanded = true;
            this._onAdd(group);
        });

        actions.QueryFavoriteGroupCollapsed.addListener((key: string) => {
            const group = this._items[key];
            group.isExpanded = false;
            this._onAdd(group);
        });

        actions.SearchTextChanged.addListener((searchText) => {
            this.filterProvider.setFilterText(searchText);
            this.emitChanged();
        });

        actions.QueryItemRenamed.addListener(({ id, name }: RenamedQueryItem) => {
            this._onRenamed(id, name);
        });

        actions.QueryFolderDeleted.addListener((item) => {
            if (item.children && item.children.length > 0) {
                this._onRemove(item.children);
            }
        });
    }

    public isLoaded(): boolean {
        if (!this._items) {
            return false;
        }
        const hasLastVisitedItem = !!this._items[QueriesConstants.LastVisitedQueryGroupKey];
        const itemCount = Object.keys(this._items).length;
        return itemCount > 1 || !hasLastVisitedItem;
    }

    public getFiltered(): QueryFavoriteGroup[] {
        return this.isLoaded() ?
            this._getFavoriteGroups(true) :
            [];
    }

    public getTeams(): QueryFavoriteGroup[] {
        return this.getAll().filter((group) => group.id !== QueriesConstants.MyFavoritesGroupKey && group.id !== QueriesConstants.LastVisitedQueryGroupKey);
    }

    public getAll(): QueryFavoriteGroup[] {
        return this.isLoaded() ?
            this._getFavoriteGroups(false) :
            [];
    }

    public get(key: string): QueryFavoriteGroup {
        return this.isLoaded() && this._items[key] || null;
    }

    public isFiltering(): boolean {
        return this.filterProvider.isFiltering();
    }

    private _getFavoriteGroups(allowFiltering: boolean): QueryFavoriteGroup[] {
        const groups = Object.keys(this._items).map(key => this._items[key]);

        if (allowFiltering && this.filterProvider.isFiltering()) {
            const matchedItemIds = this.filterProvider.getMatchedItemIds();
            return this._getMatchedFavoriteGroup(groups, matchedItemIds);
        }
        else {
            return groups;
        }
    }

    private _getMatchedFavoriteGroup(groups: QueryFavoriteGroup[], itemIds: string[]): QueryFavoriteGroup[] {
        const filteredGroups: QueryFavoriteGroup[] = [];

        for (const group of groups) {
            const matchedFavorites = group.favorites.filter((favorite) => Utils_Array.contains(itemIds, favorite.artifactId, Utils_String.ignoreCaseComparer));

            if (matchedFavorites.length > 0) {
                filteredGroups.push({
                    ...group,
                    favorites: matchedFavorites
                });
            }
        }

        return filteredGroups;
    }

    private _onAdd(items: QueryFavoriteGroup | QueryFavoriteGroup[]): void {
        if (!items) {
            return;
        }

        if (!this._items) {
            this._items = {};
        }

        if (Array.isArray(items)) {
            for (let item of items) {
                this._addItem(item);
            }
        }
        else {
            this._addItem(items);
        }

        this.filterProvider.search();

        this.emitChanged();
    }

    private _onRenamed(queryId: string, queryName: string): void {
        // Clear the data to prevent searching on the old name
        this.filterProvider.clearDataProvider();

        for (const groupId of Object.keys(this._items)) {
            const group = this._items[groupId];
            if (group.favorites) {
                const favorites = group.favorites.filter((favorite) => Utils_String.equals(favorite.artifactId, queryId, true));
                if (favorites.length > 0) {
                    for (const item of favorites) {
                        if (Utils_String.equals(queryId, item.artifactId, true)) {
                            item.artifactName = queryName;
                        }
                    }

                    this._sort(group.favorites);
                    this.filterProvider.setItems(group.favorites);
                }
            }
        }

        this.emitChanged();
    }

    private _onRemove(queryItems: QueryHierarchyItem[]): void {
        const itemIds = queryItems.map((item) => item.id);
        // Clear the data to prevent searching on the old name
        this.filterProvider.clearDataProvider();

        for (const groupId of Object.keys(this._items)) {
            const group = this._items[groupId];
            if (group.favorites) {
                group.favorites = group.favorites.filter((favorite) => !Utils_Array.contains(itemIds, favorite.artifactId, Utils_String.ignoreCaseComparer));
                this._sort(group.favorites);
                this.filterProvider.setItems(group.favorites);
            }
        }

        this.emitChanged();
    }

    private _onRemoveLoadingFavoriteGroup(item: QueryFavoriteGroup): void {
        if (item && this._items[item.id]) {
            delete this._items[item.id];
        }
        this.emitChanged();
    }

    protected _addItem(newItem: QueryFavoriteGroup): boolean {
        const key = newItem.id;

        if (newItem.favorites) {
            this._sort(newItem.favorites);
        }

        this._items[key] = newItem;

        // Update search provider
        this.filterProvider.setItems(newItem.favorites);

        return true;
    }

    private _sort(favorites: QueryFavorite[]): void {
        // sort the group.
        // we don't want to make all consumers of this store to be responsible
        // for maintain the order of the favorites, so it's done here.
        favorites.sort((a: QueryFavorite, b: QueryFavorite): number => {
            return Utils_String.ignoreCaseComparer(a.artifactName, b.artifactName);
        });
    }
}
