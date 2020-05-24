import * as Q from "q";
import { VssService, getClient, getService, VssConnection } from "VSS/Service";
import { ILayoutUserSettings, IProjectSettings, IProcessSettings, IWorkItemTypeSettings } from "WorkItemTracking/Scripts/Form/Models";
import { IPromise } from "q";
import { FormLayoutType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { first, findIndex } from "VSS/Utils/Array";
import { equals } from "VSS/Utils/String";
import { WebPageDataService } from "VSS/Contributions/Services";
import { processContributedServiceContext, getDefaultWebContext } from "VSS/Context";
import { LayoutUserSettingsUtility } from "WorkItemTracking/Scripts/Utils/LayoutUserSettingsUtility";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Diag from "VSS/Diag";
import { getErrorMessage } from "VSS/VSS";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { getService as getSettingsService, ISettingsService, SettingsUserScope } from "VSS/Settings/Services";

// Type only import, won't be materialized in compiled output
import { WorkItemType } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

type LayoutOperation = (layoutState: ILayoutUserSettings) => void;

interface IWorkItemFormUserLayoutSettingsStorage {
    /**
     * Queue an update to the settings
     */
    queueSettingsOperation(operation: LayoutOperation): IPromise<void>;

    /**
     * Ensure settings are available
     */
    ensureSettingsLoaded(): IPromise<void>;

    /**
     * Layout settings for the signed in user
     */
    layoutSettings: Readonly<ILayoutUserSettings>;

    /**
     * Field chrome border settings for the signed in user
     */
    fieldChromeBorder: boolean;
}

const DEBOUNCE_MS = 500;
const DATAPROVIDER_ID = "ms.vss-work-web.work-item-layout-user-settings-data-provider";

const emptyLayoutSettings: ILayoutUserSettings = {
    processSettings: [],
    projectSettings: [],
    isWitDialogFullScreen: false
};

export class WorkItemFormUserLayoutSettingsService extends VssService {
    private _storage: IWorkItemFormUserLayoutSettingsStorage;

    constructor() {
        super();

        this._storage = new LayoutUserSettingsServerStorage();
    }

    /**
     * Ensure settings are available
     */
    public ensureSettingsAreLoaded(): IPromise<void> {
        return this._storage.ensureSettingsLoaded();
    }

    /**
     * Gets a value indicating whether the work item form dialog should be shown as fullscreen
     */
    public get isDialogFullscreen(): boolean {
        return this._storage.layoutSettings && this._storage.layoutSettings.isWitDialogFullScreen || false;
    }

    /**
     * Field chrome border settings for the signed in user
     */
    public get fieldChromeBorder(): boolean {
        return this._storage.fieldChromeBorder;
    }

    /**
     * Get layout settings for the given work item type
     * @param workItemType WorkItemType to get set settings for
     */
    public getLayoutSettingsForWorkItemType(workItemType: WorkItemType): Readonly<IWorkItemTypeSettings> {
        const layoutSettings = this._storage.layoutSettings;
        return LayoutUserSettingsUtility.getWorkItemTypeSettings(layoutSettings, workItemType);
    }

    /**
     * Set the expansion state for the given work item type and group
     * @param workItemType WorkItemType to set setting for
     * @param groupId Group identifier
     * @param isCollapsed Value indicating whether the group is collapsed
     * @param layoutType Layout type
     */
    public setGroupExpansionState(workItemType: WorkItemType, groupId: string, isCollapsed: boolean, layoutType: FormLayoutType): IPromise<void> {
        return this._storage.queueSettingsOperation((layoutSettings) => {
            if (layoutSettings) {
                LayoutUserSettingsUtility.setGroupExpansionState(layoutSettings, workItemType, groupId, isCollapsed, layoutType);
            }
        });
    }

    /**
     * Sets a value indicating whether the dialog should be shown in fullscreen
     * @param isFullscreen Value indicating whether the dialog should be shown in fullscreen
     */
    public setDialogFullscreenState(isFullscreen: boolean): IPromise<void> {
        return this._storage.queueSettingsOperation((layoutState) => {
            layoutState.isWitDialogFullScreen = isFullscreen;
        });
    }
}

interface IDataProviderData {
    layoutUserSettings: ILayoutUserSettings;

    fieldChromeBorder: boolean;
}

class LayoutUserSettingsServerStorage implements IWorkItemFormUserLayoutSettingsStorage {
    private _processing: boolean = false;

    private _queue: LayoutOperation[] = [];
    private _pendingOperation: IPromise<void>;
    private _waitingOperation: IPromise<void>;

    private _layoutSettings: ILayoutUserSettings;

    private _fieldChromeBorder: boolean;

    constructor() {
        // If we don't have server-side settings, fall back to empty settings
        this._initLayoutSettingsFromPageData();
    }

    public ensureSettingsLoaded(): IPromise<void> {
        if (!this._layoutSettings) {
            // Try to get data from settings service
            return this._updateCurrentLayoutState()
                .then<void>(() => {
                    if (!this._layoutSettings) {
                        // Settings service did not return data, try to resolve from data provider
                        return getService(WebPageDataService)
                            .ensureDataProvidersResolved([{
                                id: DATAPROVIDER_ID,
                                properties: {
                                    serviceInstanceType: ServiceInstanceTypes.TFS
                                }
                            } as Contribution])
                            .then(() => {
                                this._initLayoutSettingsFromPageData();
                            }, error => {
                                publishErrorToTelemetry(error);
                            });
                    }
                });
        }

        return Q<void>(null);
    }

    public get layoutSettings(): Readonly<ILayoutUserSettings> {
        return this._layoutSettings || emptyLayoutSettings;
    }

    public get fieldChromeBorder(): boolean {
        return this._fieldChromeBorder;
    }

    /**
     * Queue up the given layout settings operations. The returned promise will be resolved once the result of the operation
     * is persisted server-side.
     */
    public queueSettingsOperation(operation: LayoutOperation): IPromise<void> {
        this._queue.push(operation);

        return this._processQueue();
    }

    private _initLayoutSettingsFromPageData(): void {
        const pageData: IDataProviderData = getService(WebPageDataService).getPageData(DATAPROVIDER_ID);
        this._layoutSettings = pageData && pageData.layoutUserSettings;
        this._fieldChromeBorder = pageData && pageData.fieldChromeBorder;
    }

    /**
     * Operations are processed in batches. If there is an ongoing operation, we will wait until this is done, queue
     * up all operations the came in the mean time, and then process them as a batch.
     */
    private _processQueue(): IPromise<void> {
        if (!this._processing) {
            // There is no ongoing operation, wait if there there are more incoming ones, then start processing.
            this._pendingOperation = Q.delay(DEBOUNCE_MS)
                .then(() => this._processOperations())
                .then(() => {
                    this._pendingOperation = null;
                    this._processing = false;
                })
                .then(null, error => {
                    publishErrorToTelemetry(error);

                    this._pendingOperation = null;
                    this._processing = false;
                });

            return this._pendingOperation;
        } else {
            // There is an ongoing operation, we have to wait until that is done
            if (!this._waitingOperation) {
                this._waitingOperation = this._pendingOperation.then(() => {
                    this._waitingOperation = null;
                    return this._processQueue();
                });
            }

            return this._waitingOperation;
        }
    }

    private _processOperations(): IPromise<void> {
        this._processing = true;

        if (this._queue && this._queue.length > 0) {
            // Copy from queue to pending
            let pending: LayoutOperation[] = [];

            pending = this._queue.slice(0);
            this._queue = [];

            // Process settings operations
            return this._updateSettings(pending);
        }
    }

    private _updateSettings(pendingOperations: LayoutOperation[]): IPromise<void> {
        return this._updateCurrentLayoutState()
            .then<void>(() => {
                for (const pendingOperation of pendingOperations) {
                    pendingOperation(this._layoutSettings || emptyLayoutSettings);
                }

                const service = this._getService();
                return service.setEntries({
                    "WorkItemTracking/LayoutUserSettings": this._layoutSettings
                }, SettingsUserScope.Me);
            });
    }

    private _getService(): ISettingsService {
        return getSettingsService();
    }

    private _updateCurrentLayoutState(): IPromise<void> {
        const service = this._getService();
        return service.getEntriesAsync("WorkItemTracking", SettingsUserScope.Me).then<void>(data => {
            const workItemSettings: { LayoutUserSettings: ILayoutUserSettings } = data.value;
            this._layoutSettings = workItemSettings && workItemSettings.LayoutUserSettings;
        }).then(null, error => {
            // Publish error and ignore for now, use the data we already have
            publishErrorToTelemetry(error);

            Diag.logError(getErrorMessage(error));
        });
    }
}
