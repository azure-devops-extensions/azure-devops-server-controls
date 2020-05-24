import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { WorkItemsHubData, WorkItemsHubSortOption } from "WorkItemsHub/Scripts/Generated/Contracts";
import { IPageData } from "WorkItemTracking/Scripts/OM/QueryInterfaces";

export interface IWorkItemsHubFilterUpdateData {
    tabId: string;
    updatedFilter: FilterState;
}

export interface IWorkItemsHubUpdateData {
    tabId: string;
    tabData: WorkItemsHubData;
}

export interface IWorkItemsHubRemoveWorkItemData {
    tabId: string;
    workItemIds: number[];
}

export interface IWorkItemsHubPagedWorkItemData {
    tabId: string;
    pageData: IPageData;
}

export interface IWorkItemsHubShowCompletedItemsData {
    tabId: string;
    showCompletedItems: boolean;
}

export interface IWorkItemsHubSortItemsData {
    tabId: string;
    sortOptions: WorkItemsHubSortOption[];
}