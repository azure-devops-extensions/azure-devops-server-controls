import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as Context from "VSS/Context";
import { Debug } from "VSS/Diag";
import { findIndex, intersectPrimitives, uniqueSort, toDictionary } from "VSS/Utils/Array";
import { format, equals, localeIgnoreCaseComparer } from "VSS/Utils/String";
import { MentionedTabDataProvider, RecentActivityConstants, WorkItemsHubSettingsHelper } from "WorkItemsHub/Scripts/Generated/Constants";
import { WorkItemsHubData, WorkItemsHubSortOption, WorkItemsHubColumnOption } from "WorkItemsHub/Scripts/Generated/Contracts";
import { FilterState, IFilterDataSource, FilterValue } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { FilterStateManager } from "WorkItemTracking/Scripts/Filtering/FilterStateManager";
import { IPageData } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import * as WorkItemsHubTabUtils from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabUtils";
import { WorkItemsHubTabs } from "WorkItemsHub/Scripts/Generated/Constants";
import { SecuredGenericData } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Contracts";
import { WorkItemIdentityRef } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { getAreaPathLeafNode } from "WorkItemTracking/Scripts/Utils/AreaPathHelper";
import { convertWorkItemIdentityRefFromFieldValue, uniqueSortWorkItemIdentityRefObjects, isWorkItemIdentityRef } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";
import { WorkItemsGridColumnFactory } from "WorkItemsHub/Scripts/Utils/WorkItemsGridColumnFactory";

export enum PageLoadingState {
    Loading,
    Complete
}

export interface IWorkItemsHubFilterDataSource extends IFilterDataSource {
    getVisibleItemsCount(): number;
    getPagedItemsCount(): number;
    getFilteredData(): WorkItemsHubData;
    getFilteredIds(): number[];
    setVisibleIds(ids: number[]);
    resetFilter(save: boolean);
    hideCompletedItems();
    getFilterState(): FilterState;
    hasFilter(): boolean;
    saveFilters(filters: FilterState): void;
    setFilters(filters: FilterState): void;
    generateWiqlForSelectedIds(ids: number[]): string;
    generateWiqlForTab(): string;
    removeWorkItems(ids: number[]): boolean;
    addWorkItems(payload: IPageData): boolean;
    getValue(id: number, fieldName: string): FilterValue;
    getFieldValues(workItemIds: number[], fieldReferenceNames: string[]): any[][];
    getFieldReferenceNames(): string[];
    getDisplayedFieldReferenceNames(): string[];
    getPageableFieldReferenceNames(): string[];
    getNextPageIds(): number[];
    isPagingSupported(): boolean;
    canPageMoreItems(): boolean;
    setPageLoadingState(pageLoadingState: PageLoadingState): void;
    isPagingInProgress(): boolean;
    setCompletedItemsVisibility(isVisible: boolean);
    setSortInfo(sortOptions: WorkItemsHubSortOption[]): void;
    isSortableField(refName: string): boolean;
    hasAreaPath(): boolean;
    shouldShowCompletedItems(): boolean;
    getSortOptions(): WorkItemsHubSortOption[];
    getCurrentColumnOptions(): WorkItemsHubColumnOption[];
    isFeatureSupported(): boolean;
    getCurrentColumnSettingsVersion(): number;
}

export class WorkItemsHubFilterDataSource implements IWorkItemsHubFilterDataSource {
    /**
     * Page size used to load more items
     */
    private static readonly PageSize = 200;

    private static SortValueGetter(value) {
        return isWorkItemIdentityRef(value) ? WorkItemsHubFilterDataSource._getDistinctDisplayName(value) : value;
    };

    /**
     * Column map of field name to column number in the work item data
     */
    private _columnMap: IDictionaryStringTo<number>;

    /**
     * map of work item id to work item row data.
     * format of work item row data is an array of data, where array index represents column index, and the value represents data.
     */
    private _idToWorkItemMap: IDictionaryNumberTo<any[]>;

    /**
     * Store all work item ids.
     */
    private _ids: number[];

    /**
     * Helper to persist the filter state.
     */
    private _filterStateManager: FilterStateManager;

    /**
     * Store current visible work item ids.
     */
    private _visibleIds: number[];

    /**
     * Page loading state when paging is enabled
     */
    private _pageLoadingState: PageLoadingState;

    /**
     * Whether completed items are visible or not
     */
    private _showCompletedItems: boolean;

    /**
     * Sort options
     */
    private _sortOptions: WorkItemsHubSortOption[];

    /**
     * Current column options
     */
    private _columnOptions: WorkItemsHubColumnOption[];

    /**
     * Current column settings version
     */
    private _version: number;

    /**
     * List of field names that are not pageable since they don't exist in WIT
     */
    private static readonly NonPageableFields = [
        RecentActivityConstants.MyActivityDateField,
        RecentActivityConstants.MyActivityDetailsField,
        RecentActivityConstants.RecentlyUpdatedDateField,
        MentionedTabDataProvider.MentionedDateField
    ];

    /**
     * List of field names that are removed from default column list 
     */
    public static readonly ExcludedFieldsFromDefaultColumns = [
        CoreFieldRefNames.WorkItemType,
        RecentActivityConstants.MyActivityDetailsField
    ];

    /**
     * List of field names that are not WIQL-sortable
     */
    private static readonly NonWiqlSortableFields = [
        ...WorkItemsHubFilterDataSource.NonPageableFields,
        CoreFieldRefNames.Tags
    ];

    constructor(private _hubData: WorkItemsHubData, showCompletedItems: boolean) {
        const { userSettings, processSettings } = _hubData;

        let filter: FilterState = undefined;
        let sortOptions = processSettings.defaultSortOptions;
        let columnOptions: WorkItemsHubColumnOption[] = undefined;
        let version: number = WorkItemsHubSettingsHelper.NonexistentCommentCount;

        // Both DisableCommentCount FF and FieldDictionary affect this
        const existsCommentCount: boolean = findIndex(_hubData.processSettings.fieldReferenceNames, (fieldName: string) => equals(fieldName, CoreFieldRefNames.CommentCount, true)) >= 0;

        if (userSettings) {
            filter = userSettings.filter;
            if (userSettings.columnSettings && userSettings.columnSettings.sortOptions && userSettings.columnSettings.sortOptions.length > 0) {
                sortOptions = userSettings.columnSettings.sortOptions;
            }
            if (userSettings.columnSettings && userSettings.columnSettings.columnOptions && userSettings.columnSettings.columnOptions.length > 0) {
                columnOptions = userSettings.columnSettings.columnOptions;
            }
            if (userSettings.columnSettings && userSettings.columnSettings.version) {
                version = userSettings.columnSettings.version;
            }
        }

        if (!columnOptions) {
            if (existsCommentCount) {
                version = WorkItemsHubSettingsHelper.InjectedCommentCount;
            }

            columnOptions = this.getDisplayedFieldReferenceNames().map(fieldName => ({
                fieldReferenceName: fieldName,
                width: WorkItemsGridColumnFactory.getDefaultColumnWidth(fieldName)
            } as WorkItemsHubColumnOption));
        }
        this._columnOptions = columnOptions;
        this._version = version;

        const tfsContext: PageContext = Context.getPageContext();
        const projectId = tfsContext.webContext.project.id;

        this._filterStateManager = new FilterStateManager(projectId, this._getFilterRegistryKey(), filter);

        this._columnMap = this._getColumnMap(_hubData);

        const idColumnIndex = this._columnMap[CoreFieldRefNames.Id];
        Debug.assert(!isNaN(idColumnIndex));

        this._fillIdMaps(_hubData, idColumnIndex);

        this._showCompletedItems = processSettings.tabId === WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyCompleted] || showCompletedItems;

        this.setSortInfo(sortOptions);

        this._visibleIds = this._sortItems(this._ids);
    }

    /**
     * Retrieve the name of the datasource, used in Telemetry.
     */
    public getDataSourceName(): string {
        return `WorkItemHub-${this._hubData.processSettings.tabId}`;
    }

    /**
     * Retrieve the total number of items, including items that are not yet paged.
     */
    public getItemCount(): number {
        const pagedItemsCount = this.getPagedItemsCount();
        const unpagedItemsCount = this._getUnpagedItemsCount();

        return pagedItemsCount + unpagedItemsCount;
    }

    /**
     * Retrieve the number of visible items.
     */
    public getVisibleItemsCount(): number {
        return this._visibleIds.length;
    }

    /**
     * Retrieve the number of paged items.
     */
    public getPagedItemsCount(): number {
        return this._ids.length;
    }

    public getPageLoadingState(): PageLoadingState {
        return this._pageLoadingState;
    }

    public getCurrentColumnSettingsVersion(): number {
        return this._version;
    }

    public setPageLoadingState(pageLoadingState: PageLoadingState): void {
        this._pageLoadingState = pageLoadingState;
    }

    public setCompletedItemsVisibility(isVisible: boolean): void {
        this._showCompletedItems = isVisible;
    }

    public setSortInfo(sortOptions: WorkItemsHubSortOption[]): void {
        // The given fields should always be valid, remove invalid ones
        let savedSortOptions = sortOptions.filter(sortOption => this._columnMap[sortOption.fieldReferenceName] !== undefined);
        // If no fields are valid, fallback to the last field in the list and sort it descending
        if (savedSortOptions.length === 0) {
            const fieldReferenceNames = this.getFieldReferenceNames();
            savedSortOptions = [{
                fieldReferenceName: fieldReferenceNames[fieldReferenceNames.length - 1],
                isAscending: false,
            } as WorkItemsHubSortOption];
        }

        this._sortOptions = savedSortOptions;
    }

    public getCurrentColumnOptions(): WorkItemsHubColumnOption[] {
        return this._columnOptions;
    }

    public isFeatureSupported(): boolean {
        return !this._hubData.processSettings.featureNotSupported;
    }

    public getSortOptions(): WorkItemsHubSortOption[] {
        return this._sortOptions;
    }

    public isSortableField(refName: string): boolean {
        if (this._hubData.processSettings.unsortableFieldReferenceNames && this._hubData.processSettings.unsortableFieldReferenceNames.indexOf(refName) >= 0) {
            return false;
        }
        return true;
    }

    public hasAreaPath(): boolean {
        return this._hubData.processSettings.fieldReferenceNames.indexOf(CoreFieldRefNames.AreaPath) >= 0;
    }

    public shouldShowCompletedItems(): boolean {
        return this._showCompletedItems;
    }

    /**
     * Retrieve the set of ids used to index the data.  This should include only rows that has been paged.
     * When completed items are hidden, this excludes them so that index is built from visible ones.
     */
    public getIds(): number[] {
        let result = this._ids;

        if (!this._showCompletedItems) {
            result = this.getIdsInDoingStates(this._hubData.fieldValues);
        }

        return result;
    }

    private _sortItems(ids: number[]): number[] {
        const idColumnIndex = this._columnMap[CoreFieldRefNames.Id];
        const { fieldValues } = this._hubData;
        const columnKeys: string[] = this._sortOptions.map(column => column.fieldReferenceName);
        let sortedColumnIndexes = columnKeys.map(key => this._columnMap[key]);
        let isAscending = this._sortOptions.map(option => option.isAscending);

        const targetFieldValues = fieldValues.map(r => r.data).filter(fields => ids.indexOf(fields[idColumnIndex]) >= 0);
        targetFieldValues.sort(this._sortFunction.bind(this, sortedColumnIndexes, isAscending));

        return targetFieldValues.map(r => r[idColumnIndex] as number);
    }

    private _sortFunction(sortedColumnIndexes: number[], isAscendingList: boolean[], leftRowData: any[], rightRowData: any[]): number {
        for (let i = 0; i < sortedColumnIndexes.length; i++) {
            const sortedColumnIndex = sortedColumnIndexes[i];
            const isAscending = isAscendingList[i];
            let leftValue = leftRowData[sortedColumnIndex];
            let rightValue = rightRowData[sortedColumnIndex];
            leftValue = leftValue == null ? null : WorkItemsHubFilterDataSource.SortValueGetter(leftValue);
            rightValue = rightValue == null ? null : WorkItemsHubFilterDataSource.SortValueGetter(rightValue);
            if (!isAscending) {
                const temp = leftValue;
                leftValue = rightValue;
                rightValue = temp;
            }

            if (leftValue !== rightValue) {
                // basic handling of empty Assigned To and Tags
                if (leftValue === null) {
                    return 1;
                }
                if (rightValue === null) {
                    return -1;
                }

                if (typeof leftValue === "string" && typeof rightValue === "string") {
                    return localeIgnoreCaseComparer(leftValue, rightValue);
                }

                return leftValue < rightValue ? -1 : 1;
            }
        }

        return 0;
    }

    /**
     * Getter for unit test
     */
    public getIdToWorkItemMap(): IDictionaryNumberTo<any[]> {
        return this._idToWorkItemMap;
    }

    /**
     * Getter for unit test
     */
    public getPageSize(): number {
        return WorkItemsHubFilterDataSource.PageSize;
    }

    public getFieldReferenceNames(): string[] {
        return this._hubData.processSettings.fieldReferenceNames;
    }

    /**
     * Gets field reference names that are dispayed in the grid
     */
    public getDisplayedFieldReferenceNames(): string[] {
        let fieldReferenceNames: string[];

        if (this._hubData.userSettings) {
            const columnSettings = this._hubData.userSettings.columnSettings;
            if (columnSettings && columnSettings.columnOptions && columnSettings.columnOptions.length > 0) {
                fieldReferenceNames = columnSettings.columnOptions.map(option => option.fieldReferenceName);
            }
        }

        if (!fieldReferenceNames) {
            fieldReferenceNames = this._hubData.processSettings.fieldReferenceNames.filter(f => WorkItemsHubFilterDataSource.ExcludedFieldsFromDefaultColumns.indexOf(f) < 0);
        }

        return fieldReferenceNames;
    }

    /**
     * Gets field reference names excluding non-pageable fields
     */
    public getPageableFieldReferenceNames(): string[] {
        return this._hubData.processSettings.fieldReferenceNames.filter(f => WorkItemsHubFilterDataSource.NonPageableFields.indexOf(f) < 0);
    }

    /**
     * Gets next set of work items to page
     */
    public getNextPageIds(): number[] {
        const pageContext = this._hubData.pageContext;
        if (pageContext && pageContext.unpagedWorkItemIds) {
            return pageContext.unpagedWorkItemIds.slice(0, this.getPageSize());
        }

        return [];
    }

    /**
     * Checks if more items can be paged or not
     * @returns Returns true if more items can be paged. False otherwise.
     */
    public canPageMoreItems(): boolean {
        const pageContext = this._hubData.pageContext;
        return pageContext && pageContext.unpagedWorkItemIds && pageContext.unpagedWorkItemIds.length > 0;
    }

    /**
     * Checks if paging is supported or not
     * @returns Returns true if paging is supported. False otherwise.
     */
    public isPagingSupported(): boolean {
        return !!this._hubData.pageContext;
    }

    /**
     * Checks if there is pending 'page work items' request or not
     * @returns Returns true if there is a pending request. False otherwise.
     */
    public isPagingInProgress(): boolean {
        return this._pageLoadingState === PageLoadingState.Loading;
    }

    /**
     * Removes the specified items from the hub data.
     * @param ids ids of the items to be removed
     * @returns Returns true if at least one work item was removed, else false.
     */
    public removeWorkItems(ids: number[]): boolean {
        let hasChanged = false;
        if (ids != null) {
            for (const id of ids) {
                // Removing from _ids and _visibleIds ensures that
                // the "Open in filtered view in Queries" doesn't include this ID in the WIQL generated.
                const idIndex = this._ids.indexOf(id);
                if (idIndex >= 0) {
                    this._ids.splice(idIndex, 1);
                    hasChanged = true;
                }
                const visibleIdIndex = this._visibleIds.indexOf(id);
                if (visibleIdIndex >= 0) {
                    this._visibleIds.splice(visibleIdIndex, 1);
                }
                const idColumnIndex = this._columnMap[CoreFieldRefNames.Id];
                if (this._hubData.fieldValues) {
                    const fieldValues = this._hubData.fieldValues.map(securedData => securedData.data);
                    const rowIndex = findIndex(fieldValues, f => f[idColumnIndex] === id);
                    if (rowIndex >= 0) {
                        this._hubData.fieldValues.splice(rowIndex, 1);
                    }
                }

                delete this._idToWorkItemMap[id];
            }
        }

        return hasChanged;
    }

    private _mergeFieldValues(pagedIds: number[], payload: IPageData) {
        // build row and column dictionaries based on payload
        const idColumnIndex = payload.columns.indexOf(CoreFieldRefNames.Id);
        const rowMap: IDictionaryStringTo<any> = {}; // key: id, value: field values
        const columnMap: IDictionaryStringTo<number> = {}; // key: column name, value: index
        payload.columns.forEach((value: string, index: number) => {
            columnMap[value] = index;
        });
        for (const rowData of payload.rows) {
            const workItemId = rowData[idColumnIndex];
            rowMap[workItemId] = rowData;
        }

        // build dictionary based on pageContext
        const pageContext = this._hubData.pageContext;
        const pageContextRowMap: IDictionaryStringTo<any> = {}; // key: id, value: field values
        const pageContextColumnMap: IDictionaryStringTo<number> = {}; // key: column name, value: index
        pageContext.fieldReferenceNames.forEach((value: string, index: number) => {
            pageContextColumnMap[value] = index;
        });
        for (let i = 0, l = pagedIds.length; i < l; i++) {
            pageContextRowMap[pagedIds[i]] = pageContext.fieldValues[i];
        }

        // Iterate over paged ids since pageWorkItems doesn't guarantee the order of items.
        const fieldReferenceNames = this.getFieldReferenceNames();
        for (const id of pagedIds) {
            if (rowMap.hasOwnProperty(id)) { // payload may not contain 'all requested' work items (work item was deleted for instance)
                // merge fieldValues in the payload to page context
                const newFieldValues = [];
                for (const fieldReferenceName of fieldReferenceNames) {
                    let columnIndex = -1;
                    let fieldValue = undefined;
                    columnIndex = columnMap[fieldReferenceName];
                    if (columnIndex >= 0) {
                        fieldValue = rowMap[id][columnIndex];
                    }
                    else {
                        columnIndex = pageContextColumnMap[fieldReferenceName];
                        if (columnIndex >= 0) {
                            fieldValue = pageContextRowMap[id][columnIndex];
                        }
                    }

                    newFieldValues.push(fieldValue);
                }

                this._ids.push(id);
                this._visibleIds.push(id);
                this._idToWorkItemMap[id] = newFieldValues;
                this._hubData.fieldValues.push({ data: newFieldValues } as SecuredGenericData);
            }
        }
    }

    /**
     * Add paged work items
     * @param payload paged data
     * @returns Returns true if new work items are added. False otherwise.
     */
    public addWorkItems(payload: IPageData): boolean {
        if (payload) {
            const pageContext = this._hubData.pageContext;
            const pageIds = this.getNextPageIds();

            this._mergeFieldValues(pageIds, payload);

            // remove unpaged elements from page context
            const pageSize = this.getPageSize();
            pageContext.unpagedWorkItemIds.splice(0, pageSize);
            pageContext.fieldValues.splice(0, pageSize);

            return true;
        }

        return false;
    }

    /**
     * Retrieves data of the field name of a given work item id
     * @param id Work item id
     * @param fieldName Field name to retrieve data
     * @returns Returns data of the field name of a given work item id
     */
    public getValue(id: number, fieldName: string): FilterValue {
        const columnIndex = this._columnMap[fieldName];

        if (columnIndex >= 0) {
            const workItem = this._idToWorkItemMap[id];
            if (equals(fieldName, CoreFieldRefNames.AreaPath, true)) {
                // Note that we are returning only leaf nodes in getUniqueValues to show only leaf nodes in the drop down
                // However getValue returns original data to support searching sub node with text filter
                // Area path filter provider finds matches based on leaf node value from full area path value
                return workItem && workItem[columnIndex];
            }
            if (equals(fieldName, CoreFieldRefNames.AssignedTo, true)) {
                return workItem && convertWorkItemIdentityRefFromFieldValue(workItem[columnIndex]) as FilterValue;
            }
            return workItem && workItem[columnIndex];
        }

        return null;
    }

    /**
     * Returns visible columns
     * @returns Returns visible columns
     */
    public getVisibleColumns(): string[] {
        return this._hubData.processSettings.fieldReferenceNames;
    }

    /**
     * Get unique field values for all items
     * @param fieldName Field name to get unique values for
     * @returns Returns unique field values for all items
     */
    public getUniqueValues(fieldName: string): FilterValue[] | IPromise<FilterValue[]> {
        const columnIndex = this._columnMap[fieldName];
        if (columnIndex === undefined) {
            return [];
        }

        // get field values and filter out null/undefined value
        const filteredSecuredData: SecuredGenericData[] = this._hubData.fieldValues.filter(securedData => securedData.data[columnIndex]);
        let filteredData = filteredSecuredData.map(securedData => securedData.data);

        // filter out completed items
        if (!this._showCompletedItems) {
            const doneStateNames = this._hubData.processSettings.doneStateNames;
            const stateColumnIndex = this._columnMap[CoreFieldRefNames.State];
            filteredData = filteredData.filter(values => {
                return findIndex(doneStateNames, (state: string) => equals(state, values[stateColumnIndex], true)) < 0;
            });
        }

        if (equals(fieldName, CoreFieldRefNames.AssignedTo, true)) {
            const workItemIdentityRefs = filteredData.map(data => convertWorkItemIdentityRefFromFieldValue(data[columnIndex]));
            return uniqueSortWorkItemIdentityRefObjects(workItemIdentityRefs);
        }

        let fieldValues;
        if (equals(fieldName, CoreFieldRefNames.AreaPath, true)) {
            fieldValues = filteredData.map(data => getAreaPathLeafNode(data[columnIndex]));
        } else {
            fieldValues = filteredData.map(data => data[columnIndex]);
        }

        if (equals(fieldName, CoreFieldRefNames.Tags, true)) {
            // We need to expand and dedupe tags
            const tagFieldValues: IDictionaryStringTo<boolean> = {};

            for (const fieldValue of fieldValues) {
                const tags = TagUtils.splitAndTrimTags(fieldValue);
                for (const tag of tags) {
                    tagFieldValues[tag] = true;
                }
            }
            return uniqueSort(Object.keys(tagFieldValues), localeIgnoreCaseComparer);
        }

        return uniqueSort(fieldValues, localeIgnoreCaseComparer);
    }

    /**
     * Retrieves the work items display data
     * @returns Returns the work items display data
     */
    public getFilteredData(): WorkItemsHubData {
        const hubData = {
            ...this._hubData,
            fieldValues: this._getFieldValuesByIds(this._visibleIds)
        };

        return hubData;
    }

    /**
     * Filter out completed items from visible items
     */
    public hideCompletedItems() {
        const filteredFieldValues = this._getFieldValuesByIds(this._visibleIds);
        this._visibleIds = this.getIdsInDoingStates(filteredFieldValues);
    }

    /**
     * Get ids of work items whose state is in doing state category
     * @param fieldValues field values to filter 
     * @returns Returns ids of work items in doing states
     */
    private getIdsInDoingStates(fieldValues: SecuredGenericData[]): number[] {
        const doneStateNames = this._hubData.processSettings.doneStateNames;
        const stateColumnIndex = this._columnMap[CoreFieldRefNames.State];
        const idColumnIndex = this._columnMap[CoreFieldRefNames.Id];

        const doingIds: number[] = [];

        for (const securedData of fieldValues) {
            const rowData = securedData.data;
            const isDoing = findIndex(doneStateNames, (state: string) => equals(state, rowData[stateColumnIndex], true)) < 0;
            if (isDoing) {
                doingIds.push(rowData[idColumnIndex]);
            }
        }

        return doingIds;
    }

    /**
     * Return the ids of the currently display work items
     * @returns Return the ids of the currently display work items
     */
    public getFilteredIds(): number[] {
        return this._visibleIds;
    }

    /**
     * Set visible ids ids
     * @param ids Ids to filter
     */
    public setVisibleIds(ids: number[]) {
        if (this._ids && ids && this._ids != ids) {
            ids = intersectPrimitives(this._ids, ids);
        }

        this._visibleIds = this._sortItems(ids);
    }

    /**
     * Reset filter
     * @param save True to save; otherwise false.
     */
    public resetFilter(save: boolean) {
        this.setVisibleIds(this._ids);
        if (save) {
            this._filterStateManager.resetFilter();
        }
        else {
            this._filterStateManager.setFilterState({});
        }
    }

    /**
     * Save filter state
     * @param filters Filters state
     */
    public saveFilters(filters: FilterState): void {
        this._filterStateManager.saveFilter(filters);
    }

    /**
     * Set filter state
     * @param filters Filters state
     */
    public setFilters(filters: FilterState): void {
        this._filterStateManager.setFilterState(filters);
    }

    /**
     * Returns filter state
     * @returns Returns filter state
     */
    public getFilterState(): FilterState {
        return this._filterStateManager.getFilterState();
    }

    /**
     * Returns true if filter is applied
     * @returns Returns true if filter is applied
     */
    public hasFilter(): boolean {
        const filters = this.getFilterState();
        return filters && Object.keys(filters).length > 0;
    }

    /**
     * Gets wiql for selected ids
     * @param ids The selected work item ids
     * @returns Returns wiql for selected ids
     */
    public generateWiqlForSelectedIds(ids: number[]): string {
        ids = ids || [];

        if (ids.length === 0) {
            // temporary workaround to avoid wiql parser exception
            ids.push(0);
        }
        const separator = ", ";
        const whereClause = `${CoreFieldRefNames.Id} IN (${ids.join(separator)})`;
        return format(this._hubData.processSettings.wiqlTemplate, whereClause, this._getOrderByClause());
    }

    /**
     * Gets wiql for tab
     * @returns Returns wiql for tab
     */
    public generateWiqlForTab(): string {
        const { wiqlTemplate, defaultWhereClause, doneStateNames } = this._hubData.processSettings;
        let whereClause = defaultWhereClause;

        if (!this._showCompletedItems) {
            whereClause += ` and ${CoreFieldRefNames.State} NOT IN (${doneStateNames.map(s => `"${s}"`).join(",")})`;
        }

        return format(wiqlTemplate, whereClause, this._getOrderByClause());
    }

    /**
     * Gets field values for given work item ids and field reference names
     * @param workItemIds list of work items ids
     * @param fieldReferenceNames list of field reference names
     * @returns array of fields values associated with the ids and reference names
     */
    public getFieldValues(workItemIds: number[], fieldReferenceNames: string[]): any[][] {
        const fieldReferenceNameMap = toDictionary(this._hubData.processSettings.fieldReferenceNames, (fieldReferenceName) => fieldReferenceName, (_, index) => index);
        const result = [];
        workItemIds.forEach((id: number) => {
            if (this._idToWorkItemMap.hasOwnProperty(id.toString())) {
                const fieldValues = this._idToWorkItemMap[id];
                const filteredFieldValues = fieldReferenceNames.map(f => fieldValues[fieldReferenceNameMap[f]]);
                result.push(filteredFieldValues);
            }
        });

        return result;
    }

    private _getOrderByClause() {
        const { defaultOrderByClause } = this._hubData.processSettings;

        let orderByClause = "";
        this._sortOptions.forEach(option => {
            const { fieldReferenceName, isAscending } = option;
            if (WorkItemsHubFilterDataSource.NonWiqlSortableFields.indexOf(fieldReferenceName) < 0) {
                const order = `[${fieldReferenceName}] ${isAscending ? "asc" : "desc"}`;
                orderByClause += orderByClause === "" ? order : `, ${order}`;
            }
        });

        return orderByClause === "" ? defaultOrderByClause : orderByClause;
    }

    private _getFilterRegistryKey(): string {
        return `Filters/WorkItemsHub/${this._hubData.processSettings.tabId}/Filter`;
    }

    private _getColumnMap(hubData: WorkItemsHubData) {
        const columnMap = {};
        hubData.processSettings.fieldReferenceNames.forEach((value: string, index: number) => {
            columnMap[value] = index;
        });
        return columnMap;
    }

    /**
     * Gets an array of row values for provided ids.
     */
    private _getFieldValuesByIds(ids: number[]): SecuredGenericData[] {
        const rows: SecuredGenericData[] = [];
        ids.forEach((id: number) => {
            if (this._idToWorkItemMap.hasOwnProperty(id.toString())) {
                rows.push({ data: this._idToWorkItemMap[id] } as SecuredGenericData);
            }
        });

        return rows;
    }

    /**
     * Fills in ids and id to work item map.
     */
    private _fillIdMaps(_hubData: WorkItemsHubData, idColumnIndex: number) {
        this._ids = [];
        this._idToWorkItemMap = {};

        for (const securedData of _hubData.fieldValues) {
            const values = securedData.data;
            const workItemId = values[idColumnIndex];
            Debug.assert(!isNaN(workItemId));
            this._ids.push(workItemId);
            this._idToWorkItemMap[workItemId] = values;
        }
    }

    private _getUnpagedItemsCount(): number {
        if (this.isPagingSupported()) {
            return this._hubData.pageContext.unpagedWorkItemIds.length;
        }
        else {
            return 0;
        }
    }

    private static _getDistinctDisplayName(value: string | WorkItemIdentityRef): string {
        const witIdentityRef = convertWorkItemIdentityRefFromFieldValue(value);
        return witIdentityRef.distinctDisplayName;
    }
}
