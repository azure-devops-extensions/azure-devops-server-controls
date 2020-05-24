import { throttledDelegate } from "VSS/Utils/Core";
import { Debug } from "VSS/Diag";
import { NamedEventCollection } from "VSS/Events/Handlers";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { WorkItemIdentityRef } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";

/**
 * Defines the options that an individual filter provider may accept.
 */
export interface IFilterOptions {
    /**
     * Whether or not to use the 'and' operator on values in the filter.  Only applicable to a subset of filter providers.
     */
    useAndOperator?: boolean;
}

export type FilterValue = string | number | boolean | WorkItemIdentityRef;

/**
 * Defines a filter for a filter provider.  For example, 'values' may contain 'Active' and 'New' for the state filter.
 */
export interface IFilter {

    /**
     * Set of filter values
     */
    values: FilterValue[];

    /**
     * options, if any.
     */
    options?: IFilterOptions;
}

/** Current state of filters in FilterManager */
export type FilterState = IDictionaryStringTo<IFilter>;

/**
 * Defines the interface which must be implemented by plugins into the filter manager.
 */
export interface IFilterProvider {

    /**
     * Associates the filter provider with the data provider
     */
    bind(dataProvider: IFilterDataSource): void;

    /**
     * Called when the data provided by the IFilterDataProvider is updated
     */
    dataUpdated(): void;

    /**
     * Returns 'true' if this filter provider has a filter applied
     */
    isFiltering(): boolean;

    /**
     * Updates the set of filter values to the provider.  Any existing filters are replaced
     * with the specified set in the filter.  filter may be null, or values may be empty to clear the filter.
     * This is also the way to pass in options to the filter if there are any.
     */
    setFilter(filter: IFilter);

    /**
     * Retrieves the current set of filters
     */
    getFilter(): IFilter;

    /**
     * Removes all filters.
     */
    clearFilters(): void;

    /**
     * Using data from the data provider, applies the filters and returns the set of ids
     * that match the filter.
     * @param ids current set of item ids to filter down.  This may be a subset of the
     * total number of items available to filter.
     * @returns an array of matching ids
     */
    getMatchingItems(ids: number[]): number[];
};

export interface IFilterDataSource {
    /**
     * Retrieve the name of the datasource, used in Telemetry.
     */
    getDataSourceName(): string;

    /**
     * Retrieve the total number of items, including items that are not yet paged.
     */
    getItemCount(): number;

    /**
     * Retrieve the set of ids used to index the data.  This should include only rows that has been paged.
     */
    getIds(): number[];

    /**
     * Retrieves data for a single field from the data provider.
     * @param id Id of item
     * @param fieldName Fieldname to get value for
     */
    getValue(id: number, fieldName: string): any;

    /**
     * Retrieves the set of visible columns
     */
    getVisibleColumns(): string[];

    /**
     * Get all unique values from all items for a given field name
     * @param fieldName Field to get values for
     */
    getUniqueValues(fieldName: string): FilterValue[] | IPromise<FilterValue[]>;
};

/**
 * Manages a set of filter providers and the filter state.
 */
export class FilterManager {
    public static EVENT_FILTER_CHANGED: string = "filter-changed";
    public static EVENT_FILTER_CLEARED: string = "filter-cleared";
    public static EVENT_FILTER_ACTIVATED: string = "filter-activated";
    public static EVENT_FILTER_DEACTIVATED: string = "filter-deactivated";
    public static EVENT_DATA_UPDATED: string = "filter-data-updated";

    private _filterProviders: IDictionaryStringTo<IFilterProvider> = {};
    private _events: NamedEventCollection<FilterManager, any>;
    private _isActive: boolean;
    private _filterTelemetryThrottleDelegate: Function;

    private _dataSource: IFilterDataSource;
    private _lastResultCount: number;
    private _lastDuration: number;

    constructor(dataSource: IFilterDataSource) {
        this._reset();
        this._dataSource = dataSource;
    }

    /**
     * Puts the filter manager in the 'active' state and fires the 'activated' event
     * if the filter manager was not previously active
     */
    public activate() {
        if (!this._isActive) {
            this._isActive = true;
            this._fireEvent(FilterManager.EVENT_FILTER_ACTIVATED);

            this._publishActivatedTelemetry();
        }
    }

    /**
     * Puts the filter manager in the 'inactive' state and fires the 'deactviated' event
     * if the filter manager was previously active
     */
    public deactivate() {
        if (this._isActive) {
            this._isActive = false;
            this._fireEvent(FilterManager.EVENT_FILTER_DEACTIVATED);
        }
    }

    /**
     * Returns 'true' if the filter is active, 'false' otherwise.  Being 'active' does not
     * necessarily mean a filter is applied, use 'isFiltering' to see if the filter manager
     * is active and a filter is applied.
     */
    public isActive() {
        return this._isActive;
    }

    /**
     * Called by the client to indicate that the source data in the datasource has changed
     * and the filter should update its cached data.
     */
    public dataUpdated() {
        // Tell adapters that the data has changed and they should re-index on the next search operation
        for (const provider in this._filterProviders) {
            const filterProvider = this._filterProviders[provider];
            filterProvider.dataUpdated();
        }

        // Fire event so UI knows to re-build
        this._fireEvent(FilterManager.EVENT_DATA_UPDATED);
    }

    /**
     * Returns 'true' if the filter is active and one or more of the filter providers has a filter applied.
     */
    public isFiltering(): boolean {

        if (!this.isActive()) {
            return false;
        }

        let isFiltering = false;

        for (const provider in this._filterProviders) {
            const filterProvider = this._filterProviders[provider];
            isFiltering = isFiltering || filterProvider.isFiltering();
        }

        return isFiltering;
    }

    /**
     * Registers the specified filter provider
     */
    public registerFilterProvider(provider: string, filterProvider: IFilterProvider) {
        Debug.assertParamIsString(provider, "provider");
        Debug.assertParamIsObject(filterProvider, "filterProvider");

        Debug.assert(!this._filterProviders[provider], `FilterProvider for '${provider}' already registered`);

        this._filterProviders[provider] = filterProvider;
        filterProvider.bind(this._dataSource);
    }

    /**
     * Unregisters the specified filter provider
     * @param provider
     */
    public unregisterFilterProvider(provider: string) {
        Debug.assertParamIsString(provider, "provider");

        delete this._filterProviders[provider];
    }

    /**
     * Removes all registered filter providers.
     */
    public clearFilterProviders() {
        this._filterProviders = {};
    }

    /**
     * Get the requested provider
     * @param provider Key of the requested provider
     */
    public getFilterProvider(provider: string): IFilterProvider {
        return this._filterProviders[provider];
    }

    /**
     * Set filters for mulitple providers at one time.  Clears all filters, then sets
     * the specified filters.
     * @param filters
     */
    public setFilters(filters: FilterState) {
        this._clearAllFilters();

        if (filters) {
            for (const provider in filters) {
                const filterProvider = this._filterProviders[provider];

                if (filterProvider) {
                    filterProvider.setFilter(filters[provider]);
                }
            }
        }

        this._fireFilterChanged();
    }

    /**
     * Retrieves a dictionary of all provided filters.
     */
    public getFilters(): FilterState {
        const filters: FilterState = {};

        for (const provider in this._filterProviders) {
            const filterProvider = this._filterProviders[provider];

            if (filterProvider.isFiltering()) {
                const filter = filterProvider.getFilter();

                filters[provider] = filter;
            }
        }

        return filters;
    }

    /**
     * Sets the filter value for a specific provider
     * @param provider - name of the provider to update
     * @param filter - filter to set on the provider
     */
    public setFilter(provider: string, filter: IFilter) {
        const filterProvider: IFilterProvider = this._getFilterProvider(provider);

        if (filterProvider) {
            filterProvider.setFilter(filter);

            this._fireFilterChanged();
        }
    }

    /**
     * Gets the applied filter for the specified filter provider.
     * @param provider
     */
    public getFilter(provider: string): IFilter {
        const filterProvider: IFilterProvider = this._getFilterProvider(provider);

        if (filterProvider) {
            return filterProvider.getFilter();
        }
        return null;
    }

    /**
     * Clears the filters for the specified provider.  If the provider is not specified,
     * clears all filters on all providers.
     * @param provider
     */
    public clearFilters(provider?: string) {

        if (!this.isFiltering()) {
            return;
        }

        if (provider) {
            this._filterProviders[provider].clearFilters();
        }
        else {
            this._clearAllFilters();
        }

        // Fire event so filter UI knows to clear the state
        this._fireFilterChanged();
    }

    /**
     * Filters the datasource using the current set of filters.
     */
    public filter(): number[] {
        Debug.assert(this.isActive(), "Filter not active when 'filter()' is called");

        const startTime = Date.now();

        if (!this.isFiltering()) {
            // If we are not filtering, return all ids
            return this._dataSource.getIds();
        }

        let itemIds: number[] = null;

        for (let key in this._filterProviders) {
            const filterProvider = this._filterProviders[key];

            if (!filterProvider.isFiltering()) {
                continue;
            }

            itemIds = filterProvider.getMatchingItems(itemIds);
        }

        if (!itemIds) {
            itemIds = [];
        }

        this._publishFilterTelemetry(itemIds.length, Date.now() - startTime);

        return itemIds;
    }

    /**
     * Attaches an event handler to the filter manager
     */
    public attachEvent(eventName: string, handler: IEventHandler) {
        if (!this._events) {
            this._events = new NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    /**
     * Detaches an event handler from the filter manager
     */
    public detachEvent(eventName: string, handler: IEventHandler) {
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    public getFilterDataSource(): IFilterDataSource {
        return this._dataSource;
    }

    private _reset() {
        this.clearFilters();
    }

    private _getFilterProvider(provider: string): IFilterProvider {
        return this._filterProviders[provider];
    }

    private _clearAllFilters() {
        for (const provider in this._filterProviders) {
            const filterProvider = this._filterProviders[provider];
            filterProvider.clearFilters();
        }
    }

    private _fireFilterChanged() {

        if (this.isActive()) {
            if (this.isFiltering()) {
                this._fireEvent(FilterManager.EVENT_FILTER_CHANGED);
            }
            else {
                this._fireEvent(FilterManager.EVENT_FILTER_CLEARED);
            }
        }
    }

    private _fireEvent(eventName: string, args?: any): boolean {

        if (this._events) {
            let eventBubbleCancelled: boolean = false;

            this._events.invokeHandlers(eventName, this, args, (result) => {
                if (result === false) {
                    eventBubbleCancelled = true;
                    return true;
                }
            });
            if (eventBubbleCancelled) {
                return false;
            }
        }
    }

    private _publishActivatedTelemetry() {
        publishEvent(
            new TelemetryEventData(
                WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                WITCustomerIntelligenceFeature.RESULT_FILTER,
                {
                    experience: this._dataSource.getDataSourceName(),
                    action: "ActivateFilter",
                    totalCount: this._dataSource.getItemCount(),
                    initialPagedCount: this._dataSource.getIds().length,
                    columnsCount: (this._dataSource.getVisibleColumns() || []).length
                }));
    }

    private _publishFilterTelemetry(resultCount: number, duration: number) {
        this._lastResultCount = resultCount;
        this._lastDuration = duration;

        if (!this._filterTelemetryThrottleDelegate) {
            // Throttle the publishing of this data so we don't get it on every keystroke.
            this._filterTelemetryThrottleDelegate = throttledDelegate(this, 2000, () => {

                if (!this.isFiltering()) {
                    return;
                }

                publishEvent(
                    new TelemetryEventData(
                        WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                        WITCustomerIntelligenceFeature.RESULT_FILTER,
                        {
                            experience: this._dataSource.getDataSourceName(),
                            action: "Filter",
                            totalCount: this._dataSource.getItemCount(),
                            pagedCount: this._dataSource.getIds().length,
                            columnsCount: (this._dataSource.getVisibleColumns() || []).length,
                            resultCount: this._lastResultCount,
                            activeFilterProviders: Object.keys(this.getFilters()),
                            duration: this._lastDuration
                        }));
            });
        }

        this._filterTelemetryThrottleDelegate();
    }
}

/**
 * Returns a value indicating whether the given filterState is empty
 * @param filterState Filter state to check whether it's empty
 */
export function isFilterStateEmpty(filterState: FilterState): boolean {
    return !filterState || !Object.keys(filterState)
        .some(key => {
            const values = filterState[key] && filterState[key].values;
            return values && values.length > 0;
        });
}
