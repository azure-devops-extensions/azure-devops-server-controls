import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { handleError } from "VSS/VSS";
import { IWorkItemsHubFilterDataSource } from "WorkItemsHub/Scripts/Stores/WorkItemsHubFilterDataSource";
import { UsageTelemetryHelper } from "WorkItemsHub/Scripts/Utils/Telemetry";
import * as UrlUtils from "WorkItemsHub/Scripts/Utils/UrlUtils";
import { TempQueryUtils } from "WorkItemTracking/Scripts/Utils/TempQueryUtils";

/**
 * Type alias for open work item handler
 */
export type OnOpenWorkItemHandler = (workItemId: number, ev?: React.MouseEvent<HTMLAnchorElement>) => boolean | void;

/**
 * Opens a new tab and navigates to the Queries hub with temporary query id
 * @param tabId Tab id
 * @param dataSource Work items hub filter data source
 * @param selectionIds ids of the selected items
 */
export function openInQueries(tabId: string, dataSource: IWorkItemsHubFilterDataSource, selectionIds?: number[]): void {
    if (dataSource) {
        const successCallback = (tempQueryId: string) => {
            win.location.href = UrlUtils.getTempQueryUrl(tempQueryId);
        };
        const win = window.open("", "_blank");
        const hasSelection = selectionIds && selectionIds.length > 0;
        const hasFilter = dataSource.hasFilter();
        let query;
        if (hasSelection) {
            query = dataSource.generateWiqlForSelectedIds(selectionIds);
        }
        else if (hasFilter) {
            const filteredIds = dataSource.getFilteredIds();
            query = dataSource.generateWiqlForSelectedIds(filteredIds);
        }
        else {
            query = dataSource.generateWiqlForTab();
        }
        TempQueryUtils.beginCreateTemporaryQueryId(TfsContext.getDefault(), query).then(successCallback, handleError);
        UsageTelemetryHelper.publishOpenInQueriesTelemetry(tabId, hasFilter, hasSelection);
    }
}
