import { WorkItemPaneMode } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { QueryResultGrid } from "WorkItemTracking/Scripts/Controls/Query/QueryResultGrid";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WorkItemsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { WorkItemsNavigator } from "WorkItemTracking/Scripts/Controls/WorkItemsNavigator";
import { IQueryHierarchyItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.WebApi";

export interface IShowWorkItemFormOptions {
    tfsContext: TfsContext;
    workItemsNavigator: WorkItemsNavigator;
    container: JQuery;
    grid: QueryResultGrid;
    workItemsProvider: WorkItemsProvider;
}


export interface IQueryData extends IQueryHierarchyItem {
    newQueryId?: string;
}