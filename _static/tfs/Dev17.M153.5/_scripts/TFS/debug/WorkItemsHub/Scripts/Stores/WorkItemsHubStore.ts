import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { getPageContext } from "VSS/Context";
import { Debug } from "VSS/Diag";
import { Action } from "VSS/Flux/Action";
import * as VSSStore from "VSS/Flux/Store";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { ActionsHub } from "WorkItemsHub/Scripts/Actions/ActionsHub";
import {
    IWorkItemsHubFilterUpdateData,
    IWorkItemsHubPagedWorkItemData,
    IWorkItemsHubRemoveWorkItemData,
    IWorkItemsHubUpdateData,
    IWorkItemsHubShowCompletedItemsData,
    IWorkItemsHubSortItemsData
} from "WorkItemsHub/Scripts/DataContracts/IActionsDataContract";
import { WorkItemsHubTabs } from "WorkItemsHub/Scripts/Generated/Constants";
import { WorkItemsHubData, WorkItemsHubPermissionsData } from "WorkItemsHub/Scripts/Generated/Contracts";
import {
    IWorkItemsHubFilterDataSource,
    PageLoadingState,
    WorkItemsHubFilterDataSource,
} from "WorkItemsHub/Scripts/Stores/WorkItemsHubFilterDataSource";
import * as WorkItemsHubTabUtils from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabUtils";
import {
    AssignedToFilterValueProvider,
    StateFilterValueProvider,
    WorkItemTypeFilterValueProvider
} from "WorkItemTracking/Scripts/Controls/Filters/FilterValueProviders";
import { IWorkItemFilterField, WorkItemFilterFieldType } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { DataSourceFilterValueProvider } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { AssignedToFilterProvider } from "WorkItemTracking/Scripts/Filtering/AssignedToFilterProvider";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { AreaPathFilterProvider } from "WorkItemTracking/Scripts/Filtering/AreaPathFilterProvider";
import { FilterManager } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { TagsFilterProvider } from "WorkItemTracking/Scripts/Filtering/TagsFilterProvider";
import { TextFilterProvider, TextFilterProviderWithUnassigned } from "WorkItemTracking/Scripts/Filtering/TextFilterProvider";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

interface IActionListenerPairs {
    action: Action<{}>;
    listener: IFunctionPR<{}, void>;
}

export class WorkItemsHubStore extends VSSStore.Store {
    private _actionListenerPairs: IActionListenerPairs[] = [];
    private _filterManager: IDictionaryStringTo<FilterManager> = {};
    private _dataSource: IDictionaryStringTo<IWorkItemsHubFilterDataSource> = {};
    private _permission: WorkItemsHubPermissionsData;

    constructor(
        actionsHub: ActionsHub,
        initialTabId: string,
        initialData: WorkItemsHubData,
        additionalHubData?: WorkItemsHubData[],
        showCompletedItemsOverride: boolean = null) {

        super();

        if (initialData) {
            this._setPermissions(initialData.permission);
        }

        this._initializeData(initialTabId, initialData, showCompletedItemsOverride);
        if (additionalHubData) {
            additionalHubData.forEach((data: WorkItemsHubData) => {
                if (data) {
                    this._initializeData(data.processSettings.tabId, data);
                }
            });
        }

        this._addListenerToActionsHub(actionsHub.invalidateAllTabsData, this._invalidateAllTabsData);
        this._addListenerToActionsHub(actionsHub.invalidateTabData, this._invalidateTabData);
        this._addListenerToActionsHub(actionsHub.removeWorkItems, this._removeWorkItems);
        this._addListenerToActionsHub(actionsHub.beginPageWorkItems, this._beginPageWorkItems);
        this._addListenerToActionsHub(actionsHub.endPageWorkItems, this._addWorkItems);
        this._addListenerToActionsHub(actionsHub.endRefreshDataProvider, this._endRefreshDataProvider);
        this._addListenerToActionsHub(actionsHub.endLoadStatesColor, this._endLoadStatesColor);
        this._addListenerToActionsHub(actionsHub.updateFilter, this._onUpdateFilter);
        this._addListenerToActionsHub(actionsHub.setCompletedItemsVisibility, this._setCompletedItemsVisibility);
        this._addListenerToActionsHub(actionsHub.sortItems, this._sortItems);
    }

    /**
     * Returns data source for a specified tab.
     * @param tabId
     */
    public getHubFilterDataSource(tabId: string): IWorkItemsHubFilterDataSource {
        return this._dataSource[tabId];
    }

    /**
     * Returns visible data for a specified tab.
     * @param tabId
     */
    public getHubDisplayData(tabId: string): WorkItemsHubData {
        return this.isHubDataInitialized(tabId) ? this._dataSource[tabId].getFilteredData() : null;
    }

    /**
     * Returns count of visible items for a specified tab.
     * @param tabId
     */
    public getVisibleItemsCount(tabId: string): number {
        return this.isHubDataInitialized(tabId) ? this._dataSource[tabId].getVisibleItemsCount() : 0;
    }

    /**
     * Returns count of total items for a specified tab.
     * @param tabId
     */
    public getTotalItemsCount(tabId: string): number {
        return this.isHubDataInitialized(tabId) ? this._dataSource[tabId].getItemCount() : 0;
    }

    /**
     * Returns true if the data for a specified tab has been initialized. Otherwise return false.
     * @param tabId
     */
    public isHubDataInitialized(tabId: string): boolean {
        return !!this._dataSource[tabId];
    }

    /**
     * Returns true if there was an unexpected error retrieving the data for a specified tab. Otherwise return false.
     * @param tabId
     */
    public isHubDataError(tabId: string): boolean {
        return this._dataSource[tabId] === null;
    }

    /**
     * Returns true if the specified tab is supported for the current user
     * If false, it means the given tab is not supported.
     * For instance, my teams view is not supproted if user is not a member of any team. 
     * Following page is not availble if email is not configured.
     * @param tabId
     */
    public isSupportedFeature(tabId: string): boolean {
        if (!this.isHubDataInitialized(tabId)) {
            return true;
        }

        const dataSource = this._dataSource[tabId];
        return dataSource.isFeatureSupported();
    }

    /**
     * Returns the work items hub permission for the current user
     * @returns work items hub permissions data
     */
    public getWorkItemsHubPermission(): WorkItemsHubPermissionsData {
        return this._permission;
    }

    public getFilterManager(tabId: string): FilterManager {
        return this._filterManager[tabId];
    }

    /**
     * Returns the filter fields for a specified tab.
     * @param tabId
     */
    public getHubFilterFields(tabId: string): IWorkItemFilterField[] {
        const dataSource = this._dataSource[tabId];
        const projectName = getPageContext().webContext.project.name;
        const filterFields: IWorkItemFilterField[] = [
            {
                displayType: WorkItemFilterFieldType.Text,
                fieldName: "text",
                placeholder: WorkItemTrackingResources.FilterByKeyword
            },
            {
                displayType: WorkItemFilterFieldType.CheckboxList,
                fieldName: CoreFieldRefNames.WorkItemType,
                placeholder: WorkItemTrackingResources.FilterByTypes,
                noItemsText: WorkItemTrackingResources.FilterNoTypes,
                valueProvider: new WorkItemTypeFilterValueProvider(projectName, dataSource)
            },
            {
                displayType: WorkItemFilterFieldType.CheckboxList,
                fieldName: CoreFieldRefNames.State,
                placeholder: WorkItemTrackingResources.FilterByStates,
                noItemsText: WorkItemTrackingResources.FilterNoStates,
                valueProvider: new StateFilterValueProvider(projectName, dataSource)
            },
            {
                displayType: WorkItemFilterFieldType.CheckboxList,
                fieldName: CoreFieldRefNames.Tags,
                placeholder: WorkItemTrackingResources.FilterByTags,
                noItemsText: WorkItemTrackingResources.FilterNoTags,
                showOrAndOperators: true,
            }
        ];

        if (dataSource.hasAreaPath()) {
            const areaPathFilter: IWorkItemFilterField[] = [{
                displayType: WorkItemFilterFieldType.CheckboxList,
                fieldName: CoreFieldRefNames.AreaPath,
                placeholder: WorkItemTrackingResources.FilterByAreaPath,
                noItemsText: WorkItemTrackingResources.FilterNoArea,
                valueProvider: new DataSourceFilterValueProvider(CoreFieldRefNames.AreaPath, dataSource)
            }];
            filterFields.splice(3, 0, areaPathFilter[0]);
        }

        if (ignoreCaseComparer(tabId, WorkItemsHubTabs[WorkItemsHubTabs.AssignedToMe]) !== 0) {
            const excludeMeFilter = !this._permission.personalView.hasPermission;
            const assignedToFilter: IWorkItemFilterField[] = [{
                displayType: WorkItemFilterFieldType.CheckboxList,
                fieldName: CoreFieldRefNames.AssignedTo,
                placeholder: WorkItemTrackingResources.FilterByAssignedTo,
                valueProvider: new AssignedToFilterValueProvider(dataSource, excludeMeFilter)
            }];
            filterFields.splice(2, 0, assignedToFilter[0]);
        }

        return filterFields;
    }

    /**
     * Disposes the store.
     */
    public dispose(): void {
        if (this._actionListenerPairs) {
            this._actionListenerPairs.forEach(pair => pair.action.removeListener(pair.listener));
            this._actionListenerPairs = null;
        }
    }

    private _setPermissions(permissionsData: WorkItemsHubPermissionsData): void {
        this._permission = {
            personalView: { hasPermission: false },
            query: { hasPermission: false },
            sendEmail: { hasPermission: false },
            newWorkItem: { hasPermission: false }
        }

        if (permissionsData) {
            this._permission.personalView.hasPermission = permissionsData.personalView ? permissionsData.personalView.hasPermission : false;
            this._permission.query.hasPermission = permissionsData.query ? permissionsData.query.hasPermission : false;
            this._permission.sendEmail.hasPermission = permissionsData.sendEmail ? permissionsData.sendEmail.hasPermission : false;
            this._permission.newWorkItem.hasPermission = permissionsData.newWorkItem ? permissionsData.newWorkItem.hasPermission : false;
        }
    }

    private _invalidateTabData(tabId: string): void {
        this._dataSource[tabId] = undefined;
        this.emitChanged();
    }

    private _removeWorkItems(data: IWorkItemsHubRemoveWorkItemData): void {
        if (!data) {
            return;
        }

        let hasChanged: boolean = false;
        for (const key in this._dataSource) {
            const currentTabDataSource = this._dataSource[key];
            if (!currentTabDataSource) {
                continue;
            }

            if (key === data.tabId) {
                hasChanged = currentTabDataSource.removeWorkItems(data.workItemIds);
            } else {
                this._dataSource[key] = undefined;
                hasChanged = true;
            }
        }

        if (hasChanged) {
            // Update the filter manager only if any of the work items have been removed or a tab's data has been invalidated
            const filterManager = this._filterManager[data.tabId];
            if (filterManager) {
                filterManager.dataUpdated();
            }
            this.emitChanged();
        }
    }

    private _addWorkItems(data: IWorkItemsHubPagedWorkItemData): void {
        const tabData = this._dataSource[data.tabId];
        tabData.setPageLoadingState(PageLoadingState.Complete);

        if (data.pageData) {
            const hasChanged = tabData.addWorkItems(data.pageData);
            if (hasChanged) {
                const filterManager = this._filterManager[data.tabId];
                if (filterManager) {
                    filterManager.dataUpdated();
                    this._updateDisplayData(data.tabId);
                }
            }
        }

        this.emitChanged();
    }

    private _beginPageWorkItems(tabId: string): void {
        const tabData = this._dataSource[tabId];
        tabData.setPageLoadingState(PageLoadingState.Loading);
        this.emitChanged();
    }

    private _invalidateAllTabsData(): void {
        this._dataSource = {};
        this.emitChanged();
    }

    private _endRefreshDataProvider(hubUpdateData: IWorkItemsHubUpdateData): void {
        this._initializeData(hubUpdateData.tabId, hubUpdateData.tabData);
        this.emitChanged();
    }

    private _endLoadStatesColor(): void {
        this.emitChanged(); // tell the store listener that the data is ready to read from WorkItemsGridDataProvider
    }

    private _setCompletedItemsVisibility(payload: IWorkItemsHubShowCompletedItemsData) {
        const { showCompletedItems, tabId } = payload;

        if (tabId !== WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyCompleted]) {
            this._setViewOptions(tabId, (dataSource) => dataSource.setCompletedItemsVisibility(showCompletedItems));
        }
        this.emitChanged();
    }

    private _sortItems(payload: IWorkItemsHubSortItemsData) {
        const { tabId, sortOptions } = payload;
        this._setViewOptions(tabId, (dataSource) => dataSource.setSortInfo(sortOptions));
        this.emitChanged();
    }

    private _setViewOptions(tabId: string, func: IFunctionPR<IWorkItemsHubFilterDataSource, void>) {
        const dataSource = this._dataSource[tabId];
        func(dataSource);

        // Filter values need to be recalculated (by invalidating cache) and
        // mark index is dirty (so that next search will trigger rebuilding index)
        const filterManager = this._filterManager[tabId];
        filterManager.dataUpdated();

        // Update visible ids for each tab
        this._updateDisplayData(tabId);
    }

    private _addListenerToActionsHub(action: Action<{}>, listener: IFunctionPR<{}, void>): void {
        this._actionListenerPairs.push({ action: action, listener: listener, });
        action.addListener(listener, this);
    }

    private _initializeData(tabId: string, data: WorkItemsHubData, showCompletedItemsOverride: boolean = null) {
        if (!data) {
            // _initializeData must be called with actual data object.
            // If it is called with null/undefined - it means error loading data.
            this._dataSource[tabId] = null;
            return;
        }

        Debug.assert(!this._dataSource[tabId], "Should not reinitialized the data for same tab");
        Debug.assert(tabId === data.processSettings.tabId, "Provided tabId must match the tab data");

        let showCompletedItems = true;
        if (showCompletedItemsOverride == null) {
            showCompletedItems = data.userSettings && data.userSettings.showCompleted;
        }
        else {
            showCompletedItems = showCompletedItemsOverride;
        }

        const dataSource = new WorkItemsHubFilterDataSource(data, showCompletedItems);
        this._dataSource[tabId] = dataSource;

        const filterManager = new FilterManager(dataSource);
        this._filterManager[tabId] = filterManager;
        filterManager.clearFilterProviders();
        filterManager.registerFilterProvider(TextFilterProvider.PROVIDER_TYPE, new TextFilterProviderWithUnassigned());
        filterManager.registerFilterProvider(CoreFieldRefNames.WorkItemType, new FieldFilterProvider(CoreFieldRefNames.WorkItemType));
        filterManager.registerFilterProvider(CoreFieldRefNames.State, new FieldFilterProvider(CoreFieldRefNames.State));
        filterManager.registerFilterProvider(CoreFieldRefNames.AssignedTo, new AssignedToFilterProvider());
       
        if (dataSource.hasAreaPath()) {
            filterManager.registerFilterProvider(CoreFieldRefNames.AreaPath, new AreaPathFilterProvider());
        }

        filterManager.registerFilterProvider(CoreFieldRefNames.Tags, new TagsFilterProvider());
        filterManager.activate();

        const updatedFilter = dataSource.getFilterState();
        this._onUpdateFilterInternal({ tabId, updatedFilter }, true);
    }

    private _onUpdateFilter(payload: IWorkItemsHubFilterUpdateData) {
        const isUpdated = this._onUpdateFilterInternal(payload);
        if (isUpdated) {
            this.emitChanged();
        }
    }

    private _onUpdateFilterInternal(payload: IWorkItemsHubFilterUpdateData, isInitializing: boolean = false): boolean {
        const { tabId, updatedFilter } = payload;

        const filterManager = this._filterManager[tabId];
        if (filterManager) {
            const filters = updatedFilter;
            if (isInitializing) {
                // don't unnecessary save the filters when initializing the store/switching tab (we're loading the default/saved user settings from data provider)
                this._dataSource[tabId].setFilters(filters);
            }
            else {
                this._dataSource[tabId].saveFilters(filters);
            }
            filterManager.setFilters(filters);
            this._updateDisplayData(tabId, isInitializing);
            return true;
        }

        return false;
    }

    private _updateDisplayData(tabId: string, isInitializing: boolean = false): void {
        const dataSource = this._dataSource[tabId];
        const filterManager = this._filterManager[tabId];
        if (filterManager) {
            const isFiltering = filterManager.isFiltering();
            if (isFiltering) {
                const ids = filterManager.filter();
                dataSource.setVisibleIds(ids);
            }
            else {
                const save = !isInitializing;
                dataSource.resetFilter(save);
            }
        }

        if (tabId !== WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyCompleted] && !dataSource.shouldShowCompletedItems()) {
            dataSource.hideCompletedItems();
        }
    }
}
