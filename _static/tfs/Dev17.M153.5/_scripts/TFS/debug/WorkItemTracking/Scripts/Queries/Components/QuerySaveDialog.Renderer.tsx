import { using } from "VSS/VSS";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import * as QuerySaveDialog_Async from "WorkItemTracking/Scripts/Queries/Components/QuerySaveDialog";
import { QueryItem, QuerySaveDialogMode } from "WorkItemTracking/Scripts/Queries/Models/Models";

/**
 * Renders QuerySaveDialog
 * 
 * @context Hub context
 * @dialogMode Dialog mode
 * @queryItem Source query item data
 * @parentPath Default parent path
 * @onSuccess Success callback when the dialog is committed.
 * @isContainerDisposed A delegate to determine whether the container of the dialog already disposed. If the container is disposed, the dialog will not prompt.
 */
export function showDialog(
    context: IQueriesHubContext,
    dialogMode: QuerySaveDialogMode,
    queryItem: QueryItem,
    parentPath: string,
    onSuccess?: (savedItem: QueryItem) => void,
    isContainerDisposed?: () => boolean) {

    using(["WorkItemTracking/Scripts/Queries/Components/QuerySaveDialog"], (querySaveDialog: typeof QuerySaveDialog_Async) => {

        if (isContainerDisposed && isContainerDisposed()) {
            // Stop prompting the dialog if the container is disposed.
            // This happens when user navigates away before ascyn require finishes.
            return;
        }

        querySaveDialog.showDialog(context, dialogMode, queryItem, parentPath, onSuccess);
    });
}
