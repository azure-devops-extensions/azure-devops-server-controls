import Service = require("VSS/Service");
import * as PageEvents from "VSS/Events/Page";
import Contributions_Services = require("VSS/Contributions/Services");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import VSSError = require("VSS/Error");
import { ProjectPermission } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Contracts";

var eventSvc = Events_Services.getService();

/**
 * Actions
 */
export module WorkItemPermissionActions {
    export const PERMISSION_DATA_AVAILABLE = "work-item-permission-data-available";
}

/**
 * WorkItem Permission Data
 */
export interface IWorkItemPermissionData {
    workItemDeletePermission: ProjectPermission;
    workItemDestroyPermission: ProjectPermission;
}

/**
 * Helper class to retrieve WorkItem Permission data from the data provider
 */
export class PermissionDataHelper {
    private _loadingDataPromise: IPromise<IWorkItemPermissionData>;
    private _permissionData: IWorkItemPermissionData;

    /**
     * Returns value indicating whether permission data has been populated, yet. 
     * If data is not yet available, an async request to retrieve it will be created.
     * @returns true if the data is already on page, false otherwise
     */
    public isPopulated(): boolean {
        if (!this._isDataAvailable()) {
            if (this._tryGetPermissionDataFromPageService()) {
                return true;
            }

            // Ensure the data is being loaded
            this.initializeWorkItemPermissions();

            return false;
        }

        return true;
    }

    private _isDataAvailable(): boolean {
        return !!this._permissionData;
    }

    /**
     * Get the work item permission data from the page
     * @returns IWorkItemPermissionData is the data is on the page, null otherwise
     */
    public getWorkItemPermissions(): IWorkItemPermissionData {
        Diag.Debug.assert(this._isDataAvailable(), "getWorkItemPermission is called without checking if the permission is populated or not.");

        return this._permissionData;
    }

    /**
     * Fetches work item permission data async from server
     * @returns Promise resolving to permission data
     */
    public beginGetWorkItemPermissions(): IPromise<IWorkItemPermissionData> {
        if (!this._loadingDataPromise) {
            this._loadingDataPromise = Service.getService(Contributions_Services.ExtensionService)
                .getContributions(["ms.vss-work-web.work-item-permissions-data-provider"], true, false, false)
                .then((contributions: IExtensionContribution[]) => {
                    if (this._tryGetPermissionDataFromPageService()) {
                        eventSvc.fire(WorkItemPermissionActions.PERMISSION_DATA_AVAILABLE);
                    }
                    
                    return this._permissionData;
                });
        }

        return this._loadingDataPromise;
    }

    /**
     * Queue a request to get the permission data
     */
    public initializeWorkItemPermissions(): void {
        if (!this._isDataAvailable() && !this._loadingDataPromise) {
            if (this._tryGetPermissionDataFromPageService()) {
                return;
            }

            // Initiate call to get work item permission data
            // We do not automatically retry this call unless we absolutely need it for now, to avoid extra load on service
            this.beginGetWorkItemPermissions().then(null, (reason) => {
                VSSError.publishErrorToTelemetry({
                    name: "UnexpectedExceptionWhenAccessingWorkItemPermissionData",
                    message: reason
                });
            });
        }
    }

    /**
     * Helper method for checking if the user has workItemDeletePermission
     */
    public hasWorkItemDeletePermission(): boolean {
        const permissions = this.getWorkItemPermissions();
        return !!(permissions && permissions.workItemDeletePermission && permissions.workItemDeletePermission.hasPermission);
    }

    /**
     * Helper method for checking if the user has workItemDestroyPermission
     */
    public hasWorkItemDestroyPermission(): boolean {
        const permissions = this.getWorkItemPermissions();
        return !!(permissions && permissions.workItemDestroyPermission && permissions.workItemDestroyPermission.hasPermission);
    }

    private _tryGetPermissionDataFromPageService(): boolean {
        const data = Service.getService(Contributions_Services.WebPageDataService).getPageData<IWorkItemPermissionData>("ms.vss-work-web.work-item-permissions-data-provider");
        if (data) {
            this._permissionData = data;
            return true;
        }

        return false;
    }
}

let __helper = new PermissionDataHelper;

PageEvents.getService().subscribe(PageEvents.CommonPageEvents.PageInteractive, (event: PageEvents.IPageEvent) => {
    // Initialize permissions after TTI, if current page records TTI event
    __helper.initializeWorkItemPermissions();
});

export { __helper as WorkItemPermissionDataHelper };
