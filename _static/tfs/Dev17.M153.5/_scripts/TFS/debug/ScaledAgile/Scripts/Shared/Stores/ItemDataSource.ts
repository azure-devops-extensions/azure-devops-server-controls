import * as EventsServices from "VSS/Events/Services";
import { uniqueSort } from "VSS/Utils/Array";
import { equals, localeIgnoreCaseComparer } from "VSS/Utils/String";

import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { FilterManager, IFilterDataSource, FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { TextFilterProvider, TextFilterProviderWithUnassigned } from "WorkItemTracking/Scripts/Filtering/TextFilterProvider";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { TagsFilterProvider } from "WorkItemTracking/Scripts/Filtering/TagsFilterProvider";
import { AssignedToFilterProvider } from "WorkItemTracking/Scripts/Filtering/AssignedToFilterProvider";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";

import { IItemStoreData, ItemStoreEvents } from "ScaledAgile/Scripts/Shared/Stores/ItemStoreInterface";
import { IItem, IItemsUpdatePayload, UpdateMode, IFilterUpdateData } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { FeatureEnablement } from "ScaledAgile/Scripts/Shared/Utils/FeatureEnablement";
import { ScaledAgileTelemetry } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";

/**
 * Items datasource for Plan.
 */
export class ItemDataSource implements IFilterDataSource {
    private _filterManager: FilterManager;
    private _visibleFields: string[] = [];

    constructor(private _dataSource: IItemStoreData) {
        this._initializeFilterManager();
    }
    
    /**
     * Bind the item data source
     * @param data The item store data
     */
    public bind(data: IItemStoreData) {
        this._dataSource = data;
    }

    /**
     * @returns Returns the item data source
     */
    public getData(): IItemStoreData {
        return this._dataSource;
    }

    /**
     * @returns Returns name of the datasource, used in Telemetry.
     */
    public getDataSourceName = () => ScaledAgileTelemetry.Area;

    /**
     * @returns Returns the total number of items
     */
    public getItemCount(): number {
        return Object.keys(this._dataSource.itemMap).length;
    }

    /**
     * @returns Returns the set of ids used to index the data
     */
    public getIds(): number[] {
        return Object.keys(this._dataSource.itemMap).map(v => parseInt(v, 10));
    }

    /**
     * Retrieves data for a given work item id on the given field
     * @param id Id of item
     * @param fieldName Fieldname to get value for
     * @returns Returns data for a given work item id on the given field
     */
    public getValue(id: number, fieldName: string): any {
        const item = this._dataSource.itemMap[id];
        return item ? item.fieldValues[fieldName] : null;
    }

    /**
     * Get all unique values from all items for a given field name
     * @param fieldName Field to get values for
     * @returns Returns all unique values from all items for a given field name
     */
    public getUniqueValues(fieldName: string): string[] {
        const res = [];
        const isTagField = equals(fieldName, CoreFieldRefNames.Tags, true);
        const idsKey = this.getIds();

        for (let id of idsKey) {
            const item = this._dataSource.itemMap[id];
            const fieldValue = item.fieldValues[fieldName];
            if (fieldValue) {
                if (isTagField) {
                    // If the field is tag, then we need to expand and dedupe
                    const tags = TagUtils.splitAndTrimTags(fieldValue);
                    tags.forEach((tag: string) => res.push(tag));
                }
                else {
                    res.push(fieldValue);
                }
            }
        }
        return uniqueSort(res, localeIgnoreCaseComparer);
    }

    /**
     * @returns Returns the set of visible fields
     */
    public getVisibleColumns(): string[] {
        return this._visibleFields;
    }

    /**
     * Update the set of visible fields
     */
    public updateVisibleFields(refNames: string[]) {
        this._visibleFields = refNames;
    }

    /**
     * @returns Returns true if the data has filter applied
     */
    public isFiltering(): boolean {
        return this._filterManager ? this._filterManager.isFiltering() : false;
    }

    /**
     * @param id The item id to retrieve
     * @returns Returns the item of the given id. Returns null if the item id does not exist
     */
    public getItem(id: number): IItem {
        return this._dataSource.itemMap[id];
    }

    /**
     * Adds the items
     * @param addedItems The items to be added
     * @returns Returns true if items are added successfully
     */
    public addItems(addedItems: IItem[]): boolean {
        if (addedItems && addedItems.length > 0) {
            const witIdToItem = this._dataSource.itemMap;
            for (let i = 0, len = addedItems.length; i < len; i++) {
                const item = addedItems[i];
                if (item && item.id) {
                    witIdToItem[item.id] = item;
                }
            }
            this._fireItemsChangeEvent();
            return true;
        }
        return false;
    }

    /**
     * Updates all items items
     * @param data The items to be added/updated
     * @returns Return true if items are updated successfully
     */
    public updateItems(data: IItemsUpdatePayload): boolean {
        let isItemsUpdated = false;
        if (this._dataSource) {
            switch (data.updateMode) {
                case UpdateMode.FullItemOverride:
                    // Note: Since Item itself is not plain object, $.extend will override the existing item with updated item directly, instead of recursive merge (aka deep copy).
                    this._dataSource.itemMap = $.extend(true, {}, this._dataSource.itemMap, data.itemMap);
                    isItemsUpdated = true;
                    break;
                case UpdateMode.FieldUpdate:
                    for (var key in data.itemMap) {
                        if (data.itemMap.hasOwnProperty(key)) {
                            const item = this._dataSource.itemMap[key];
                            if (item) {
                                let newItem = item.setFieldValues(data.itemMap[key].fieldValues);
                                this._dataSource.itemMap[key] = newItem;
                            }
                        }
                    }
                    isItemsUpdated = true;
                    break;
            }
        }
        
        if (isItemsUpdated) {
            this._fireItemsChangeEvent();
        }

        return isItemsUpdated;
    }

    /**
     * If the item already exist, then the item will be updated. Otherwise, the item will be added
     * @param itemToUpdate The item to update
     * @returns Returns the object containing updated item and flag indicating whether it was an update and add operation
     */
    public updateItem(itemToUpdate: IItem): {
            updatedItem: IItem,
            isItemAlreadyExist: boolean
        }
    {
        const item = this._dataSource.itemMap[itemToUpdate.id];
        let updatedItem: IItem;
        let isItemAlreadyExist = false;
        if (item) {
            updatedItem = item.merge(itemToUpdate);
            isItemAlreadyExist = true;
        } else {
            updatedItem = itemToUpdate.clone();
        }
        this._dataSource.itemMap[itemToUpdate.id] = updatedItem;
        this._fireItemsChangeEvent();

        return {
            updatedItem,
            isItemAlreadyExist
        };
    }

    /**
     * Delete an item
     * @param id The item id
     * @returns Returns true if the item exist and has been deleted successfully
     */
    public deleteItem(id: number): boolean {
        const item = this._dataSource.itemMap[id];
        if (item) {
            delete this._dataSource.itemMap[id];
            return true;
        }
        return false;
    }

    /**
     * Apply filter and update items visibility
     * @param filter The updated filter
     */
    public updateFilter(filter: IFilterUpdateData) {
        if (this._filterManager) {
            this._filterManager.setFilters(filter.filter);
            this._updateVisibleItems();
        }
    }

    private _updateVisibleItems() {
        if (this._filterManager) {
            const visibleIds = this._filterManager.filter();
            const allIds = this.getIds();
            for (const id of allIds) {
                const item = this._dataSource.itemMap[id];
                if (item) {
                    let updatedItem: IItem;
                    if (visibleIds.indexOf(id) > -1) {
                        updatedItem = item.setIsHidden(false);
                    }
                    else {
                        updatedItem = item.setIsHidden(true);
                    }
                    this._dataSource.itemMap[id] = updatedItem;
                }
            }
        }
    }

    private _fireItemsChangeEvent() {
        if (this._filterManager) {
            if (this._filterManager.isFiltering()) {
                this._updateVisibleItems();
            }
            // update filter manager cache
            this._filterManager.dataUpdated();
        }
        // fire items update event for the filter control to clear out its cache
        EventsServices.getService().fire(ItemStoreEvents.ITEM_DATA_SOURCE_CHANGED, this);
    }

    private _initializeFilterManager() {
        if (FeatureEnablement.isDeliveryTimelineFilterEnabled()) {
            this._filterManager = new FilterManager(this);
            this._filterManager.clearFilterProviders();
            this._filterManager.registerFilterProvider(TextFilterProvider.PROVIDER_TYPE, new TextFilterProviderWithUnassigned());
            this._filterManager.registerFilterProvider(CoreFieldRefNames.WorkItemType, new FieldFilterProvider(CoreFieldRefNames.WorkItemType));
            this._filterManager.registerFilterProvider(CoreFieldRefNames.State, new FieldFilterProvider(CoreFieldRefNames.State));
            this._filterManager.registerFilterProvider(CoreFieldRefNames.AssignedTo, new AssignedToFilterProvider());
            this._filterManager.registerFilterProvider(CoreFieldRefNames.Tags, new TagsFilterProvider());
            this._filterManager.activate();
        }
    }
}
