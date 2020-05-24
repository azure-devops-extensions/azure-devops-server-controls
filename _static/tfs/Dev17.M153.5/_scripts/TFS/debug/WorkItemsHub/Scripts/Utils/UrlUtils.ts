import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { HistoryService } from "VSS/Navigation/Services";
import { ActionParameters, ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

/**
 * Gets the URL for the workitem hub
 */
export function getWorkItemHubUrl(): string {
    return TfsContext.getDefault().getActionUrl(null, "workitems");
}

/**
 * Gets the URL for the queries hub
 * @param fragment fragment (e.g. #_a=query&id=<guid>)
 */
export function getQueriesHubUrl(fragment: string): string {
    return `${TfsContext.getDefault().getActionUrl(null, "queries")}?${fragment}`;
}

/**
 * Gets the edit URL for the given workitem
 * @param workItemId ID of the workitem for which the edit URL is to be returned
 */
export function getEditWorkItemUrl(workItemId: number): string {
    return `${getWorkItemHubUrl()}/${ActionUrl.ACTION_EDIT}/${workItemId}`;
}

/**
 * Gets the URL to create a workitem of the given type
 * @param workItemType Type the workitem to be created
 */
export function getCreateWorkItemUrl(workItemType: string): string {
    return `${getWorkItemHubUrl()}/${ActionUrl.ACTION_CREATE}/${workItemType}`;
}

/**
 * Gets the URL for the Recycle bin
 */
export function getRecycleBinUrl(): string {
    const state = {
        [ActionUrl.ACTION]: ActionUrl.ACTION_QUERY,
        [ActionParameters.PATH]: WITResources.RecycleBin
    };
    const recycleBinQueryPath = HistoryService.serializeState(state);
    return `${TfsContext.getDefault().getActionUrl(null, "queries")}?${recycleBinQueryPath}`;
}

/**
 * Gets the URL for queries hub with temp query id
 * @param tempQueryId id of temporary query
 */
export function getTempQueryUrl(tempQueryId: string): string {
    const state = {
        [ActionUrl.ACTION]: ActionUrl.ACTION_QUERY,
        [ActionParameters.TEMPQUERYID]: tempQueryId
    };
    const queryParam = HistoryService.serializeState(state);
    return `${TfsContext.getDefault().getActionUrl(null, "queries")}?${queryParam}`;
}
