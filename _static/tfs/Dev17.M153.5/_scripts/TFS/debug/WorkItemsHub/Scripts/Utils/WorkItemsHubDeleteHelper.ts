import { handleError, requireModules } from "VSS/VSS";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WorkItemPermissionDataHelper } from "WorkItemTracking/Scripts/Utils/WorkItemPermissionDataHelper";
import * as DeleteMenuItemHelper from "WorkItemTracking/Scripts/MenuItems/DeleteMenuItemCommonHelper";
import * as WITControlsRecycleBin_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin";
import { ActionsCreator } from "WorkItemsHub/Scripts/Actions/ActionsCreator";
import { IWorkItemsHubFilterDataSource } from "WorkItemsHub/Scripts/Stores/WorkItemsHubFilterDataSource";
import { TelemetryConstants } from "WorkItemsHub/Scripts/Utils/Telemetry";

export class WorkItemsHubDeleteHelper {
    private _testWorkItemTypesMap: IDictionaryStringTo<string> = null;
    private _workItemDeletePermission: boolean = null;

    constructor(private _actionCreator: ActionsCreator) {
        // Don't fetch test work item types unless user has delete permission
        // Note that it calls MVC endpoint (_api/teamprojects) which is not accessible for anonymous/public users
        if (this.hasDeletePermission()) {
            // Queue a request to get test work item types
            this._beginPopulateTestWorkItemTypes();
        }
    }

    /**
     * Checks whether the delete command should be shown for the current selection or not.
     * Following factors impact this choice:
     * 1. User should have WorkItemDelete permissions
     * 2. User should have selected at least 1 work item
     * 3. None of the selected work items should be of types belonging to Test Categories
     * The test artifacts do not support soft delete and thus we don't support deleting those from WorkItems Hub
     * @param dataSource Data source for the current tab
     * @param selectedWorkItemIds Indicates whether it was invoked using keyboard shortcut or not, used for telemetry
     */
    public shouldShowDeleteCommand(dataSource: IWorkItemsHubFilterDataSource, selectedWorkItemIds: number[]): boolean {
        // In the unlikely event of failing to fetch the test work item types, we would never show the delete command.
        // This should still be better than accidentally letting users delete test artifacts permanently.
        if (this.hasDeletePermission()
            && this._testWorkItemTypesMap != null
            && selectedWorkItemIds != null
            && selectedWorkItemIds.length > 0) {
            for (const workItemId of selectedWorkItemIds) {
                const type = dataSource.getValue(workItemId, CoreFieldRefNames.WorkItemType) as string;
                if (this._testWorkItemTypesMap.hasOwnProperty(type)) {
                    return false;
                }
            }
            return true;
        }

        return false;
    }

    /**
     * Deletes the selected work items.
     * @param tabId ID of the current tab
     * @param selectedWorkItemIds Indicates whether it was invoked using keyboard shortcut or not, used for telemetry
     */
    public deleteWorkItems(tabId: string, selectedWorkItemIds: number[]): void {
        if (selectedWorkItemIds == null || selectedWorkItemIds.length === 0) {
            return;
        }

        requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin"]).spread((WITControlsRecycleBin: typeof WITControlsRecycleBin_Async) =>
            WITControlsRecycleBin.DeleteConfirmationDialog.showDialog(false, () => {
                WITControlsRecycleBin.RecycleBin.beginDeleteWorkItems(
                    TelemetryConstants.DeleteCommand,
                    TelemetryConstants.Area,
                    TfsContext.getDefault(),
                    selectedWorkItemIds,
                    false,          // readWorkItemsBeforeDeletion,
                    false,          // refreshRequired,
                    false,          // launchedFromWorkItemForm, // suppressFailureNotification to avoid duplicate errors being shown up on the form as well as the host page
                    null,           // pass to exclude these test work items for deletion
                    null,           // successCallback,
                    handleError);   // errorCallback

                // Optimistically remove the deleted workitems from the view
                this._actionCreator.removeWorkItemFromDataProvider(tabId, selectedWorkItemIds);
            }));
    }

    private _beginPopulateTestWorkItemTypes(): void {
        DeleteMenuItemHelper.WorkItemCategorization.getAllTestWorkItemTypes().then(
            (testWorkItemTypesMap: IDictionaryStringTo<string>) => this._testWorkItemTypesMap = testWorkItemTypesMap,
            handleError);
    }

    public hasDeletePermission(): boolean {
        if (this._workItemDeletePermission == null && WorkItemPermissionDataHelper.isPopulated()) {
            const permissionData = WorkItemPermissionDataHelper.getWorkItemPermissions();
            if (permissionData) {
                this._workItemDeletePermission = WorkItemPermissionDataHelper.hasWorkItemDeletePermission();
            }
        }

        return this._workItemDeletePermission;
    }
}
