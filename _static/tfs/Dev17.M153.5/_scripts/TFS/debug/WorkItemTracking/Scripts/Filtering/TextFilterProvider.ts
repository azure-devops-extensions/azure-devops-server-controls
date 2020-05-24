import { Debug } from "VSS/Diag";
import { SearchCore, SearchStrategy, IndexedSearchStrategy, SearchAdapter, SearchableObject } from "VSS/Search";
import { contains, intersectPrimitives } from "VSS/Utils/Array";
import { convertValueToDisplayString } from "VSS/Utils/Core";
import { IFilterProvider, IFilterDataSource, IFilter } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { isWorkItemIdentityRef, isIdentityRef } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export const SearchStrategySpecialCharacters: string[] = ["{", "(", "[", "!", "@", "#", "$", "%", "^", "&", "*", "~", "`", "'", "\""];

export abstract class BaseTextFilterProvider implements IFilterProvider {
    public static PROVIDER_TYPE = "text";

    private _searchValues: string[];
    private _searchCore: SearchCore<number>;
    private _searchAdapter: TextSearchAdapter;
    private _dataProvider: IFilterDataSource;
    private _updateRequired: boolean;

    constructor() {
        // Create a search strategy and bind it to the provider
        this._searchAdapter = this.getSearchAdapter();
        this._searchCore = new SearchCore<number>(this._createSearchStrategy(), this._searchAdapter);
        this._updateRequired = true;
    }

    /**
     * Return the search adapter to be used.
     */
    protected abstract getSearchAdapter(): TextSearchAdapter;

    public bind(provider: IFilterDataSource) {
        this._dataProvider = provider;
    }

    public setFilter(filter: IFilter) {
        this._searchValues = [];

        if (filter && filter.values && filter.values.length) {
            Debug.assert((filter.values as string[]).every(value => typeof (value) === "string"), "Text filter only supports strings");

            this._searchValues = filter.values as string[];
        }
    }

    public getFilter(): IFilter {
        return { values: this._searchValues || [] };
    }

    public clearFilters() {
        this._searchValues = null;
    }

    public dataUpdated() {
        // Set update required so on the next search we will re-index the data.
        this._updateRequired = true;
    }

    public getMatchingItems(ids: number[]): number[] {
        Debug.assert(this.isFiltering(), "must be filtering before calling getMatchingWorkItems");

        if (this._updateRequired) {
            this._searchAdapter.setDataSource(this._dataProvider);
            this._searchCore.clearStrategyStore();
            this._searchCore.addItems(this._searchAdapter.createSearchableObjects());
            this._updateRequired = false;
        }

        let results = this._searchCore.beginSearch(this._searchValues.join(" "));

        // Trim the results down to the intersection of the specified set and the full set that was found.
        // If no initial set is of work items is specified, return the full set of matched items.
        if (results && ids) {
            results = intersectPrimitives(ids, results);
        }

        return results;
    }

    public isFiltering(): boolean {
        return !!this._searchValues && this._searchValues.some(value => value !== "");
    }

    private _createSearchStrategy(): SearchStrategy<number> {
        return new IndexedSearchStrategy<number>(
            null,
            {
                specialCharacters: SearchStrategySpecialCharacters,
                delimiter: /[\s\\/\.]/,
                comparer: (a: number, b: number) => {
                    return a - b;
                }
            });
    }
}


export class TextFilterProvider extends BaseTextFilterProvider {

    protected getSearchAdapter(): TextSearchAdapter {
        return new TextSearchAdapter();
    }
}

export interface ITextSearchAdapter {
    /**
     * Set the data source for search.
     */
    setDataSource(dataSource: IFilterDataSource);
    /**
     * Return the data source.
     */
    getDataSource(): IFilterDataSource;
}

export class TextSearchAdapter extends SearchAdapter<number> implements ITextSearchAdapter {
    private _dataSource: IFilterDataSource;

    public setDataSource(dataSource: IFilterDataSource) {
        this._dataSource = dataSource;
    }

    public getDataSource(): IFilterDataSource {
        return this._dataSource;
    }

    public createSearchableObjects(): SearchableObject<number>[] {
        const searchableObjects: SearchableObject<number>[] = [];

        const ids = this._dataSource.getIds();
        for (const id of ids) {
            const searchableObject = this.createSearchableObject(id);

            if (searchableObject) {
                searchableObjects.push(searchableObject);
            }
        }

        return searchableObjects;
    }

    public createSearchableObject(workItemId: number): SearchableObject<number> {
        Debug.assertParamIsNumber(workItemId, "workItemId");

        // Build the searchable object.
        const searchableObject = new SearchableObject(workItemId, []);

        const fields = this._dataSource.getVisibleColumns();
        for (const fieldName of fields) {
            const pagedFieldValue = this._dataSource.getValue(workItemId, fieldName);

            // Only index the data if it's not null and it's part of the visible set of fields.
            const type = typeof (pagedFieldValue);

            if (type === "string") {
                searchableObject.addTerm(pagedFieldValue);
            } else if (type === "number") {
                searchableObject.addTerm(pagedFieldValue + "");
            } else if (pagedFieldValue && isWorkItemIdentityRef(pagedFieldValue)
                && pagedFieldValue.identityRef && pagedFieldValue.identityRef.displayName) {
                searchableObject.addTerm(pagedFieldValue.identityRef.displayName);
            } else if (pagedFieldValue && isIdentityRef(pagedFieldValue) && pagedFieldValue.displayName) {
                searchableObject.addTerm(pagedFieldValue.displayName);
            } else {
                const text = convertValueToDisplayString(pagedFieldValue);
                if (text) {
                    searchableObject.addTerm(text);
                }
            }
        }

        return searchableObject;
    }

    public handleResults(results: number[], finished: boolean, query?: string) {
    }

    public handleError(message: string) {
        Debug.fail("handleError for TextSearchAdapter called");
    }

    public handleClear() {
    }

    public isDataSetComplete(): boolean {
        return true;
    }

    public addMoreItems(addItemsCallback: (items: SearchableObject<number>[]) => void, searchCallback: () => void) {
        Debug.fail("addMoreItems should never be called");
    }
}

/**
 * This text filter provider override the empty value of Assigned To field value to match 'Unassigned' resource.
 */
export class TextFilterProviderWithUnassigned extends BaseTextFilterProvider {

    protected getSearchAdapter(): TextSearchAdapter {
        return new TextSearchAdapterTextFilterProviderWithUnassigned();
    }
}

class TextSearchAdapterTextFilterProviderWithUnassigned extends TextSearchAdapter {
    private _containsAssignedToMeColumn = false;

    public createSearchableObjects(): SearchableObject<number>[] {
        const datasource = this.getDataSource();
        this._containsAssignedToMeColumn = contains(datasource.getVisibleColumns(), CoreFieldRefNames.AssignedTo);
        return super.createSearchableObjects();
    }

    public createSearchableObject(workItemId: number): SearchableObject<number> {
        const searchableObject = super.createSearchableObject(workItemId);
        const dataSource = this.getDataSource();
        if (this._containsAssignedToMeColumn && !dataSource.getValue(workItemId, CoreFieldRefNames.AssignedTo)) {
            searchableObject.addTerm(WorkItemTrackingResources.AssignedToEmptyText);
        }

        return searchableObject;
    }
}
