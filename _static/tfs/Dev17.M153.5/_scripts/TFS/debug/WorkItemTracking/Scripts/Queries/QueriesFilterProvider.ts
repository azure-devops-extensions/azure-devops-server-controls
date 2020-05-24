import { SearchableObject, IndexedSearchStrategy } from "VSS/Search";
import { IQueryHierarchyItemDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyItemStore";
import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import { RenamedQueryItem, QueryFavorite } from "WorkItemTracking/Scripts/Queries/Models/Models";
export abstract class QueriesFilterProvider {
    private _searchStrategy: IndexedSearchStrategy<string>;
    private _filterText: string;
    private _matchedItemIds: string[]

    constructor() {
        this._searchStrategy = new IndexedSearchStrategy<string>(
            null,
            {
                specialCharacters: [],
                delimiter: /[\s\\/]/
            });

        this._matchedItemIds = [];
        this.setItems([]);
    }

    /**
     * Set the filter
     * @param filterText the input search term
     */
    public setFilterText(filterText: string): void {
        this._filterText = filterText && filterText.trim() || "";
        this.search();
    }

    /**
     * do the search with current filterText
     */
    public search(): void {
        if (this.isFiltering()) {
            this._matchedItemIds = this._searchStrategy.search(this._filterText);
        }
    }

    /**
     * Determines if the provider has active search text
     */
    public isFiltering(): boolean {
        return !!this._filterText;
    }

    /**
     * Gets the set of item ids returned by the search
     */
    public getMatchedItemIds() {
        return this._matchedItemIds;
    }

    /**
     * Remove all items from the search strategy
     */
    public clearDataProvider() {
        this._searchStrategy.clearStrategyStore();
    }

    public setItems(items: QueryHierarchyItem[] | RenamedQueryItem[] | QueryFavorite[]) {
        this._searchStrategy.processItems(this.createSearchableObjects(items));
    }

    protected abstract createSearchableObjects(items: QueryHierarchyItem[] | RenamedQueryItem[] | QueryFavorite[]): SearchableObject<string>[];
}
