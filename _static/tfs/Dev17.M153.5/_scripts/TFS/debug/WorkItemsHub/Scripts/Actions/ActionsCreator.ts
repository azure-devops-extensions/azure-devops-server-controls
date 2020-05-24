import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { handleError } from "VSS/VSS";
import { ActionsHub } from "WorkItemsHub/Scripts/Actions/ActionsHub";
import { WorkItemsHubDataProvider } from "WorkItemsHub/Scripts/DataProviders/WorkItemsHubDataProvider";
import { WorkItemsHubData, WorkItemsHubSortOption } from "WorkItemsHub/Scripts/Generated/Contracts";
import { IWorkItemsHubFilterDataSource } from "WorkItemsHub/Scripts/Stores/WorkItemsHubFilterDataSource";
import { UsageTelemetryHelper } from "WorkItemsHub/Scripts/Utils/Telemetry";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { IPageData } from "WorkItemTracking/Scripts/OM/QueryInterfaces";

export class ActionsCreator {
    private _actionsHub: ActionsHub;

    constructor(actionsHub: ActionsHub) {
        this._actionsHub = actionsHub;
    }

    /**
     * Invalidates the cached data provider for a specifc tab.
     * @param tabId id of tab
     */
    public invalidateTabData(tabId: string): void {
        this._actionsHub.invalidateTabData.invoke(tabId);
    }

    /**
     * Invalidates the cached data provider asynchronously.
     * @param tabId id of tab to refresh data for
     * @param invalidateAllTabsData If true, invalidates all tabs' data. Otherwise only the current tab data will be invalidated
     */
    public refreshDataProviderAsync(tabId: string, invalidateAllTabsData: boolean = false): void {
        if (invalidateAllTabsData) {
            this._actionsHub.invalidateAllTabsData.invoke(null);
        }

        WorkItemsHubDataProvider.refreshDataAsync(tabId)
            .then((tabData: WorkItemsHubData) => {
                this._actionsHub.endRefreshDataProvider.invoke({ tabId, tabData });
            })
            .then(null, handleError);
    }

    /**
     * Removes the specified items from the current tab and invalidates the cached data provider for other tabs.
     * @param tabId id of tab to refresh data for
     * @param workItemIds ids of the work items to be removed from the view
     */
    public removeWorkItemFromDataProvider(tabId: string, workItemIds: number[]): void {
        this._actionsHub.removeWorkItems.invoke({ tabId, workItemIds });
    }

    /**
     * Pages the specified items for the given tab
     * @param tabId id of tab to page data for
     * @param dataSource data source to page data for
     */
    public pageWorkItems(tabId: string, dataSource: IWorkItemsHubFilterDataSource): void {
        const workItemIds = dataSource.getNextPageIds();
        const fieldReferenceNames = dataSource.getPageableFieldReferenceNames();

        this._actionsHub.beginPageWorkItems.invoke(tabId);

        WorkItemsHubDataProvider.pageWorkItems(workItemIds, fieldReferenceNames)
            .then((pageData: IPageData) => {
                this._actionsHub.endPageWorkItems.invoke({ tabId, pageData });
            })
            .then(null, (error: TfsError) => {
                this._actionsHub.endPageWorkItems.invoke({ tabId, pageData: null });
                handleError(error);
            });

        UsageTelemetryHelper.publishLoadMoreItemsTelemetry(tabId, workItemIds.length);
    }

    /**
     * Loads state colors asynchronously
     * @param projectName name of the project to load state colors
     * @return a promise for when call is complete
     */
    public loadStatesColorAsync(projectName: string): void {
        const stateColorDataProvider = WorkItemStateColorsProvider.getInstance();
        stateColorDataProvider.ensureColorsArePopulated([projectName])
            .then(() => {
                this._actionsHub.endLoadStatesColor.invoke(null);
            })
            .then(null, () => {
                // Ignore error
            });
    }

    /**
     * Updates the specific tab with filter data.
     * @param tabId the tabId to update filter
     * @param filterState new filter state
     */
    public updateFilterState(tabId: string, filterState: FilterState): void {
        this._actionsHub.updateFilter.invoke({
            tabId: tabId,
            updatedFilter: filterState
        });
    }

    /**
     * Sorts the specific tab on a particular column.
     * @param tabId tabId
     * @param sortOptions array of columns to be sorted on
     */
    public sortColumn(tabId: string, sortOptions: WorkItemsHubSortOption[]): void {
        this._actionsHub.sortItems.invoke({ tabId, sortOptions });
    }

    /**
     * Sets the visibility of completed work items.
     * @param tabId tabId
     * @param showCompletedItems if true, completed work items will be shown. otherwise they will be hidden
     */
    public setCompletedItemsVisibility(tabId: string, showCompletedItems: boolean): void {
        this._actionsHub.setCompletedItemsVisibility.invoke({ tabId, showCompletedItems });
    }
}
