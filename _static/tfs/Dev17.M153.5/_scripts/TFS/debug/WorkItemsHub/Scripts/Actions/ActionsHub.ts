import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";
import {
    IWorkItemsHubFilterUpdateData,
    IWorkItemsHubRemoveWorkItemData,
    IWorkItemsHubUpdateData,
    IWorkItemsHubPagedWorkItemData,
    IWorkItemsHubShowCompletedItemsData,
    IWorkItemsHubSortItemsData
} from "WorkItemsHub/Scripts/DataContracts/IActionsDataContract";

@registerDiagActions
export class ActionsHub {
    public endRefreshDataProvider = new Action<IWorkItemsHubUpdateData>();
    public endLoadStatesColor = new Action<{}>();
    public invalidateAllTabsData = new Action<{}>();
    public removeWorkItems = new Action<IWorkItemsHubRemoveWorkItemData>();
    public beginPageWorkItems = new Action<string>();
    public endPageWorkItems = new Action<IWorkItemsHubPagedWorkItemData>();
    public invalidateTabData = new Action<string>();
    public updateFilter = new Action<IWorkItemsHubFilterUpdateData>();
    public setCompletedItemsVisibility = new Action<IWorkItemsHubShowCompletedItemsData>();
    public sortItems = new Action<IWorkItemsHubSortItemsData>();
}
