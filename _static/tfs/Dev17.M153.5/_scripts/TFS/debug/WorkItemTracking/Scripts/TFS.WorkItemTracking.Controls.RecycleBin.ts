///<amd-dependency path="jQueryUI/droppable"/>

import "VSS/LoaderPlugins/Css!WorkItemArea";
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Events_Services = require("VSS/Events/Services");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import TFS_WitBatch_WebApi = require("TFS/WorkItemTracking/BatchRestClient");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Events_Action = require("VSS/Events/Action");
import { HistoryService } from "VSS/Navigation/Services";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_String = require("VSS/Utils/String");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { WorkItemPermissionDataHelper } from "WorkItemTracking/Scripts/Utils/WorkItemPermissionDataHelper";
import { RecycleBinConstants, RecycleBinTelemetryConstants  } from "WorkItemTracking/Scripts/RecycleBinConstants";
import { ActionUrl, ActionParameters } from "WorkItemTracking/Scripts/ActionUrls";

const eventSvc = Events_Services.getService();
export let recyclebinSettings = {};

/**
 * Interface for options in RecycleBin control
 * @interface IRecycleBinOptions
 */
export interface IRecycleBinOptions {
    /**
     *  source area name that will be used in CI data to collect where the items are coming from
     */
    sourceAreaName: string;
    /**
     *  drag drop scope for recycle bin
     */
    dragDropScope: string;
    /**
     *  data key associated with work item id or array of ids in ui.helper object
     */
    dataKey: string;
    /**
     * function to evaluate if refresh is required after deleting dragged items.
     * This value will be passed to the success callback.
     */
    notifyPageRefreshRequired?: (itemIds: number[]) => boolean;
    /**
     * optional tfs context
     */
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    /**
     * indicates whether reading work items are needed or not before deletion. This can be useful if reading work items are needed
     * to update UI. By default it's false.
     *
     */
    readWorkItemsBeforeDeletion?: boolean;
    /**
     * indicates whether a relative path to recycle bin query page should be used or not.
     */
    useRelativePathToRecycleBinPage?: boolean;
}

/**
 * Interface for the arguments to be used in attached to the delete succeeded event
 * @interface IDeleteSucceededArguments
 */
export interface IDeleteEventArguments {
    /**
     * indicates whether a refresh is required for this delete event
     *
     */
    refreshRequired?: boolean;
    /**
     * indicates whether this delete event was triggered from the form
     *
     */
    deleteFromForm?: boolean;
    /**
     * the workitem id's that have been deleted
     *
     */
    workItemIds?: number[];
}

/**
 * This control soft deletes dragged work items. On successful deletion "workitem-changed" event gets fired from WITOM.WorkItem.
 * If deletion failed, RecycleBin.EVENT_DELETE_FAILED event gets fired from this control with exception message.
 * @class RecycleBin
 */
export class RecycleBin extends Controls.Control<IRecycleBinOptions> {
    private static _fwlink = "https://go.microsoft.com/fwlink/?LinkId=723407";
    private static coreCssClass = "recycle-bin";
    private static _hasPermission: boolean;

    constructor(options?: IRecycleBinOptions) {
        super(options);
    }

    /**
     * Initialize the control
     */
    public initialize() {
        super.initialize();
        this._createLayout();
        // Delay the initialize of droppable to improve load performance.
        Utils_Core.delay(this, 0, () => {
            this.getElement().droppable({
                hoverClass: "dragHover",
                scope: this._options.dragDropScope,
                drop: (event: JQueryEventObject, ui: any) => { this._dropHandler(ui); },
                accept: () => {
                    // NOTE: this is WIT specific, must be refactored out if we make a more general purpose recycle bin.
                    if (RecycleBin._hasPermission === undefined) {
                        if (!WorkItemPermissionDataHelper.isPopulated()) {
                            //We allow dropping if the permission data is not populated
                            return true;
                        }

                        RecycleBin._hasPermission = WorkItemPermissionDataHelper.hasWorkItemDeletePermission();
                    }
                    return RecycleBin._hasPermission;
                },
                tolerance: "pointer"
            });
        });
    }

    /**
     * Initialize options
     *
     * @param options IRecycleBinOptions options
     */
    public initializeOptions(options?: IRecycleBinOptions) {
        super.initializeOptions($.extend({
            coreCssClass: RecycleBin.coreCssClass
        }, options));
    }

    private _createLayout() {
        const path = RecycleBin._createRecycleBinPath(this._options.tfsContext, this._options.useRelativePathToRecycleBinPage);
        const $link = $("<a>");
        const $icon = $("<div>").addClass("recycle-bin-icon").appendTo($link);
        const $content = $("<div>").addClass("content").text(WITResources.RecycleBin).appendTo($link);
        this.getElement()
            .append($link)
            .attr("tabindex", "0")
            .attr("role", "button")
            .on("keydown click", (e: JQueryEventObject) => { // click navigation runs through handler instead of href on the div to hide hyperlink text on hover
                switch (e.type) {
                    case "keydown":
                        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                            window.location.href = path;
                        }
                        break;
                    case "click":
                        if (e.ctrlKey === true) {
                            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                                        url: path,
                                        target: "_blank"} );
                        }
                        else {
                            window.location.href = path;
                        }
                        e.stopPropagation();
                        e.preventDefault();
                        break;
                }
            });
    }

    private _dropHandler(ui: any) {
        const data = ui.helper.data(this._options.dataKey);
        let itemIds: number[] = [];
        if (data) {
            if ($.isArray(data)) {
                itemIds = data.slice();
            }
            else {
                itemIds.push(data);
            }

            let refreshRequired = false;
            if ($.isFunction(this._options.notifyPageRefreshRequired)) {
                refreshRequired = this._options.notifyPageRefreshRequired(itemIds);
            }

            RecycleBin.beginDeleteWorkItems(
                RecycleBinTelemetryConstants.DRAGDROP,
                this._options.sourceAreaName,
                this._options.tfsContext,
                itemIds,
                this._options.readWorkItemsBeforeDeletion,
                refreshRequired
            );

            // Associate a dataKey with the helper, so that the consumers can handle the animation as appropriate
            ui.helper.data(RecycleBinConstants.DROPPED_ON_RECYCLE_BIN_DATAKEY, true);
        }
    }

    private static _createRecycleBinPath(tfsContext: TFS_Host_TfsContext.TfsContext, useRelativePath?: boolean): string {
        const state = {
            [ActionUrl.ACTION]: ActionUrl.ACTION_QUERY,
            [ActionParameters.PATH]: WITResources.RecycleBin
        }
        const recycleBinQueryPath = HistoryService.serializeState(state);

        if (useRelativePath) {
            return "#" + recycleBinQueryPath;
        }
        else {
            return tfsContext.getActionUrl(null, "Queries") + "?" + recycleBinQueryPath;
        }
    }

    /**
     * delete given work items
     *
     * @param ciSourceAction source action of how the items being deleted used for CI data.
     * @param ciSourceAreaName source area name where the items are coming from used for CI data.
     * @param tfsContext Tfs context
     * @param workItemIds array of work item ids to delete
     * @param readWorkItemsBeforeDeletion indicates whether reading work items are needed or not before deletion. 
     * @param refreshRequired indicates whether a refresh would be required on completion of this call, passed along as a parameter for the "EVENT_DELETE_SUCCEEDED" event callback. 
     * @param suppressFailureNotification indicates whether the recycle bin failure notification should be suppressed or not. Caller would rely on errorCallback in such a case.
     * @param testWorkItemTypes array of test workItemTypes which we need to ignore while doing deletion
     * @param successCallback function that will be invoked with list of deleted work items upon delete completion
     * @param errorCallback error callback function
     */
    public static beginDeleteWorkItems(
        ciSourceAction: string,
        ciSourceAreaName: string,
        tfsContext: TFS_Host_TfsContext.TfsContext,
        workItemIds: number[],
        readWorkItemsBeforeDeletion?: boolean,
        refreshRequired?: boolean,
        suppressFailureNotification?: boolean,
        testWorkItemTypes?: string[],
        successCallback?: (result: TFS_WitBatch_WebApi.JsonHttpResponse[]) => void,
        errorCallback?: (exception: Error) => void) {
        
        // filter out invalid ids.
        workItemIds = workItemIds.filter(id => id > 0);

        const workItemManager = RecycleBin._getWorkItemManager(tfsContext.contextData);

        const getMessage = (serverMessage: string) => {
            let message = WITResources.WorkItemBulkDeleteError;
            if (workItemIds.length == 1) { // Single delete failure
                message = Utils_String.format(WITResources.WorkItemDeleteError, workItemIds[0], serverMessage);
            }
            return Utils_String.htmlEncode(message);
        };

        const handleSuccess = (deletedWorkItems: TFS_WitBatch_WebApi.JsonHttpResponse[]) => {
            eventSvc.fire(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this, { refreshRequired: refreshRequired, workItemIds: workItemIds, deleteFromForm: suppressFailureNotification });
            RecycleBinTelemetry.publish(RecycleBinTelemetryConstants.WORKITEM_DELETE, ciSourceAction, ciSourceAreaName, deletedWorkItems.length, true);
            if ($.isFunction(successCallback)) {
                successCallback(deletedWorkItems);
            }
        };

        const handleException = (exception: Error) => {
            exception.message = getMessage(exception.message);

            if (!suppressFailureNotification) {
                eventSvc.fire(RecycleBinConstants.EVENT_DELETE_FAILED, RecycleBin._createDeleteErrorMessageDom(exception.message));
                eventSvc.fire(RecycleBinConstants.EVENT_DELETE_FAILED_TEXT_ONLY, exception.message);
            }

            RecycleBinTelemetry.publish(RecycleBinTelemetryConstants.WORKITEM_DELETE, ciSourceAction, ciSourceAreaName, workItemIds.length, false);

            if ($.isFunction(errorCallback)) {
                errorCallback(exception);
            }
        }

        const invokeDeleteWorkItems = () => {
            const successCallbackFn = (result: TFS_WitBatch_WebApi.JsonHttpResponse[]) => {
                this._handleSuccessfulCallback(result, 204, handleSuccess, handleException, refreshRequired);
            };

            workItemManager.store.beginDeleteWorkItemsBatch(workItemIds, successCallbackFn, handleException);
        }

        if (WorkItemPermissionDataHelper.isPopulated()) {
            if (!WorkItemPermissionDataHelper.hasWorkItemDeletePermission()) {
                RecycleBinTelemetry.publish(RecycleBinTelemetryConstants.WORKITEM_DELETE_CLIENT_DENIED, ciSourceAction, ciSourceAreaName, workItemIds.length, false);
                handleException(new Error(WITResources.WorkItemDelete_NoPermission));
                return;
            }
        }

        // notify listeners that delete operation started
        eventSvc.fire(RecycleBinConstants.EVENT_DELETE_STARTED, { workItemIds: workItemIds, deleteFromForm: suppressFailureNotification });

        if (readWorkItemsBeforeDeletion) {
            workItemManager.beginGetWorkItems(workItemIds,
                (workItems: WITOM.WorkItem[]) => {
                    if (testWorkItemTypes) {
                        // When user selected multiple items (including test and non test work items)
                        // we should not block deletion of non test work items but we should block
                        // bulk deletion of test work items as we don't support bulk deletion of test work items
                        // First filter out test work items and then remove test workitem ids from the removal list 
                        // and then throw error
                        const testWorkItemIds = this._filterOutTestWorkItems(workItems, testWorkItemTypes);
                        // If work items has some test work items then show error and filter non test work item ids
                        if (testWorkItemIds.length > 0) {
                            handleException(new Error());
                            workItemIds = workItemIds.filter(id => testWorkItemIds.indexOf(id) < 0);
                        }
                    }

                    invokeDeleteWorkItems();
                },
                handleException);
        }
        else {
            invokeDeleteWorkItems();
        }
    }

    /**
     * Filter out test work items
     * @param workItems All work items
     * @param testWorkItemTypes array of test work items type
     */
    private static _filterOutTestWorkItems(workItems: WITOM.WorkItem[], testWorkItemTypes: string[]): number[] {
        const testWorkItemIds: number[] = [];
        if (workItems) {
            $.each(workItems, (index, workItem) => {
                if (testWorkItemTypes && workItem.workItemType && testWorkItemTypes.indexOf(workItem.workItemType.name) > -1) {
                    testWorkItemIds.push(workItem.id);
                }
            });
        }

        return testWorkItemIds;
    }

    private static _createDeleteErrorMessageDom(deleteErrorMessage: string): JQuery {
        const $div = $("<div>");
        $div.append($("<span>").text(deleteErrorMessage + " " + WITResources.WorkItemDeleteError_MoreInfo + " "))
            .append($("<a>").attr("href", RecycleBin._fwlink).attr("target", "_blank").attr("rel", "noopener noreferrer")
                .text(WITResources.WorkItemDeleteError_ClickHere)
                .click((e) => {
                    e.stopPropagation();
                }));
        return $div;
    }

    /**
     * Restores given work items
     *
     * @param ciSourceAction source action of how the items being deleted used for CI data.
     * @param ciSourceAreaName source area name where the items are coming from used for CI data.
     * @param tfsContext Tfs context
     * @param workItemIds array of work item ids to delete
     * @param successCallback function that will be invoked with list of restored work items upon restore completion
     * @param errorCallback error callback function
     */
    public static beginRestoreWorkItems(
        ciSourceAction: string,
        ciSourceAreaName: string,
        tfsContext: TFS_Host_TfsContext.TfsContext,
        workItemIds: number[],
        successCallback?: (itemIds: TFS_WitBatch_WebApi.JsonHttpResponse[]) => void,
        errorCallback?: (exception: Error) => void) {
        const workItemManager = RecycleBin._getWorkItemManager(tfsContext.contextData);

        const getMessage = (serverMessage: string) => {
            let message = WITResources.WorkItemBulkRestoreError;
            if (workItemIds.length == 1) { // Single restore failure
                message = Utils_String.format(WITResources.WorkItemRestoreError, workItemIds[0], serverMessage);
            }
            return Utils_String.htmlEncode(message);
        };

        const handleSuccess = (restoredWorkItems: TFS_WitBatch_WebApi.JsonHttpResponse[]) => {
            eventSvc.fire(RecycleBinConstants.EVENT_RESTORE_SUCCEED, restoredWorkItems);
            RecycleBinTelemetry.publish(RecycleBinTelemetryConstants.WORKITEM_RESTORE, ciSourceAction, ciSourceAreaName, restoredWorkItems.length, true);
            if ($.isFunction(successCallback)) {
                successCallback(restoredWorkItems);
            }
        };

        const handleException = (exception: Error) => {
            exception.message = getMessage(exception.message);
            eventSvc.fire(RecycleBinConstants.EVENT_RESTORE_FAILED, exception.message);

            RecycleBinTelemetry.publish(RecycleBinTelemetryConstants.WORKITEM_RESTORE, ciSourceAction, ciSourceAreaName, workItemIds.length, false);

            if ($.isFunction(errorCallback)) {
                errorCallback(exception);
            }
        };

        eventSvc.fire(RecycleBinConstants.EVENT_RESTORE_STARTED, { workItemIds: workItemIds });

        workItemManager.store.beginRestoreWorkItemsBatch(workItemIds,
            (results: TFS_WitBatch_WebApi.JsonHttpResponse[]) => {
                this._handleSuccessfulCallback(results, 200, handleSuccess, handleException);
            },
            handleException);
    }

    /**
     * Destroy given work items
     *
     * @param ciSourceAction source action of how the items being deleted used for CI data.
     * @param ciSourceAreaName source area name where the items are coming from used for CI data.
     * @param tfsContext Tfs context
     * @param workItemIds array of work item ids to delete
     * @param successCallback function that will be invoked with list of destroyed work items upon destroy completion
     * @param errorCallback error callback function
     */
    public static beginDestroyWorkItems(
        ciSourceAction: string,
        ciSourceAreaName: string,
        tfsContext: TFS_Host_TfsContext.TfsContext,
        workItemIds: number[],
        successCallback?: (destroyedWorkItems: TFS_WitBatch_WebApi.JsonHttpResponse[]) => void,
        errorCallback?: (exception: Error) => void) {

        const workItemManager = RecycleBin._getWorkItemManager(tfsContext.contextData);

        const getMessage = (serverMessage: string) => {
            let message = WITResources.WorkItemBulkDestroyError;
            if (workItemIds.length == 1) { // Single destroy failure
                message = Utils_String.format(WITResources.WorkItemDestroyError, workItemIds[0], serverMessage);
            }
            return Utils_String.htmlEncode(message);
        };

        const handleSuccess = (destroyedWorkItems: TFS_WitBatch_WebApi.JsonHttpResponse[]) => {
            eventSvc.fire(RecycleBinConstants.EVENT_DESTROY_SUCCEED, destroyedWorkItems);
            RecycleBinTelemetry.publish(RecycleBinTelemetryConstants.WORKITEM_DESTROY, ciSourceAction, ciSourceAreaName, destroyedWorkItems.length, true);
            if ($.isFunction(successCallback)) {
                successCallback(destroyedWorkItems);
            }
        };

        const handleException = (exception: Error) => {
            exception.message = getMessage(exception.message);
            eventSvc.fire(RecycleBinConstants.EVENT_DESTROY_FAILED, exception.message);
            RecycleBinTelemetry.publish(RecycleBinTelemetryConstants.WORKITEM_DESTROY, ciSourceAction, ciSourceAreaName, workItemIds.length, false);
            if ($.isFunction(errorCallback)) {
                errorCallback(exception);
            }
        };

        eventSvc.fire(RecycleBinConstants.EVENT_DESTROY_STARTED, { workItemIds: workItemIds });

        workItemManager.store.beginDestroyWorkItemsBatch(workItemIds,
            (results: TFS_WitBatch_WebApi.JsonHttpResponse[]) => {
                this._handleSuccessfulCallback(results, 204, handleSuccess, handleException);
            },
            handleException);
    }

    private static _getWorkItemManager(webContext: WebContext): WorkItemManager {
        const tfsConnection = Service.VssConnection.getConnection(webContext);
        const store: WITOM.WorkItemStore = tfsConnection.getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        return WorkItemManager.get(store);
    }

    private static _handleSuccessfulCallback(
        result: TFS_WitBatch_WebApi.JsonHttpResponse[],
        successResultCode: number,
        successCallback?: (deletedWorkItems: TFS_WitBatch_WebApi.JsonHttpResponse[]) => void,
        errorCallback?: (exception: Error) => void,
        refreshRequired?: boolean) {

        const processedWorkItems: TFS_WitBatch_WebApi.JsonHttpResponse[] = [];
        const failedWorkItems: TFS_WitBatch_WebApi.JsonHttpResponse[] = [];

        for (let i = 0, length = result.length; i < length; i++) {
            const currentResult = result[i];
            if (currentResult.code === successResultCode) {
                processedWorkItems.push(currentResult);
            }
            else {
                failedWorkItems.push(currentResult);
            }
        }

        if (failedWorkItems.length > 0 && $.isFunction(errorCallback)) {
            // if there was a partial failure, treat the first error message as the server error
            const body: { value: { Message: string } } = $.parseJSON(failedWorkItems[0].body);
            errorCallback(new Error(body.value.Message));
        }

        if (processedWorkItems.length > 0) {
            if ($.isFunction(successCallback)) {
                successCallback(processedWorkItems);
            }
        }
    }

    public static beginGetCleanUpSetting(callback: IResultCallback, errorCallback?: IErrorCallback) {
        const cleanUpSettingSucessCallback = (setting) => {
            let days: number = 0;
            if (setting && setting.value) {
                if (setting.value.match(/^\d+$/i)) {
                    days = parseInt(setting.value, 10);
                }
            }
            callback(days);
        }

        VSS.queueRequest(this, recyclebinSettings, "recyclebinCleanUpSettings", cleanUpSettingSucessCallback, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
            TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService)
                .beginReadSetting(RecycleBinConstants.CLEANUP_SETTING_REGISTRYKEY, TFS_WebSettingsService.WebSettingsScope.Root, succeeded);
        });
    }
}

VSS.classExtend(RecycleBin, TFS_Host_TfsContext.TfsContext.ControlExtensions);

/**
 * options for DeleteConfirmationDialog 
 * @interface IDeleteConfirmationDialogOptions
 */
export interface IDeleteConfirmationDialogOptions extends Dialogs.IConfirmationDialogOptions {
    /**
    * refresh warning message
    */
    refreshWarningMessage?: string;
    /**
    * optional tfs context
    */
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

/**
 * base confirmation dialog
 * @class BaseConfirmationDialog
 */
export class BaseConfirmationDialog<TOption extends Dialogs.IConfirmationDialogOptions> extends Dialogs.ConfirmationDialogO<TOption>{
    constructor(options?: TOption) {
        super(options);
    }
    
    /**
     * Initialize options
     *
     * @param options options
     */
    public initializeOptions(options?: IDeleteConfirmationDialogOptions) {
        super.initializeOptions($.extend({
            width: 500,
            height: "auto",
        }, options));
    }
    
    /**
     * Initialize the control
     */
    public initialize() {
        super.initialize();

        const $container = $("<table>").addClass("recycle-bin-base-dialog-content");
        const $row = $("<tr>");
        const $warningIcon = $("<td>").addClass("bowtie-icon bowtie-status-warning");


        $row.append($warningIcon).append(this.getConfirmationMessage());
        $container.append($row);
        this.getElement().append($container);
    }
    
    /**
     * Create confirmation message
     * @return The confirmation element
     */
    public getConfirmationMessage(): JQuery {
        return null;
    }
    
    /**
     * Gets the current dialog result which will be used when ok button is clicked.
     */
    public getDialogResult() {
        return true;
    }

}

/**
 * confirmation dialog upon work item delete.
 * @class DeleteConfirmationDialog
 */
export class DeleteConfirmationDialog extends BaseConfirmationDialog<IDeleteConfirmationDialogOptions> {
    private static learnMoreLink = "https://go.microsoft.com/fwlink/?LinkId=723407";
    /*
     * Override the base getConfirmationMessage method
     * @return The confirmation element
     */
    public getConfirmationMessage(): JQuery {
        const deleteConfirmationHtml = WITResources.DeleteWorkItemDialogConfirmationText;
        const $confirmationMessage = $("<td>").addClass("delete-warning-message").html(deleteConfirmationHtml);
        $confirmationMessage.append("<br>");

        //place holder for clean up message
        const $cleanUpMessage = $("<div>");
        $confirmationMessage.append($cleanUpMessage);

        if (this._options.refreshWarningMessage) {
            $confirmationMessage.append("<br>");
            $confirmationMessage.append(this._options.refreshWarningMessage);
        }

        const cleanUpSettingSucessCallback = (days: number) => {
            const cleanUpMessageText = days > 0 
                    ? Utils_String.format(WITResources.DeleteWorkItemDialogConfirmationTextWithCleanUpScheduled, this._buildLearnMoreLink())
                    : WITResources.DeleteWorkItemDialogConfirmationTextWithoutCleanUpScheduled;

            $cleanUpMessage.append("<br>");
            $cleanUpMessage.append(cleanUpMessageText);
        }

        RecycleBin.beginGetCleanUpSetting(cleanUpSettingSucessCallback);
        return $confirmationMessage;
    }

    private _buildLearnMoreLink(): string {
        const $div = $("<div>");
        const $a = $("<a>")
            .attr("href", DeleteConfirmationDialog.learnMoreLink)
            .attr("tabindex", "0")
            .attr("target", "_blank")
            .attr("rel", "noopener noreferrer")
            .text(WITResources.DeleteWorkItemDialogConfirmationTextLearnMoreLink);
        $div.append($a);
        return $div.html();
    }


    /**
     * show confirmation dialog
     * @param refreshRequired if true, refresh warning message will show up in the confimation dialog
     * @param callback callback function for ok button
     */
    public static showDialog(refreshRequired: boolean, callback: () => void) {
        let refreshWarningMessage = "";
        if (refreshRequired) {
            refreshWarningMessage = WITResources.DeleteWorkItemDialogRefreshWarningMessage;
        }

        Dialogs.show(DeleteConfirmationDialog, {
            okCallback: () => {
                if ($.isFunction(callback)) {
                    callback();
                }
            },
            title: WITResources.DeleteWorkItemDialogTitle,
            okText: WITResources.DeleteWorkItemDeleteButtonText,
            refreshWarningMessage: refreshWarningMessage
        });
    }
}

VSS.classExtend(DeleteConfirmationDialog, TFS_Host_TfsContext.TfsContext.ControlExtensions);

/**
 * confirmation dialog upon work item restore.
 * @class RestoreConfirmationDialog
 */
export class RestoreConfirmationDialog extends BaseConfirmationDialog<IDeleteConfirmationDialogOptions> {
    /*
     * Override the base getConfirmationMessage method
     * @return The confirmation element
     */
    public getConfirmationMessage(): JQuery {
        const $confirmationMessage = $("<td>").addClass("restore-warning-message").html(WITResources.RestoreWorkItemDialogConfirmationText);
        $confirmationMessage.append("<br>");
        return $confirmationMessage;
    }

    /**
     * show confirmation dialog
     * @param callback callback function for ok button
     */
    public static showDialog(callback: () => void) {
        Dialogs.show(RestoreConfirmationDialog, {
            okCallback: () => {
                if ($.isFunction(callback)) {
                    callback();
                }
            },
            title: WITResources.RestoreWorkItemDialogTitle,
            okText: WITResources.RestoreWorkItemDeleteButtonText
        });
    }
}

/**
 * confirmation dialog upon work item destroy.
 * @class DestroyConfirmationDialog
 */
export class DestroyConfirmationDialog extends BaseConfirmationDialog<IDeleteConfirmationDialogOptions> {
    /*
     * Override the base getConfirmationMessage method
     * @return The confirmation element
     */
    public getConfirmationMessage(): JQuery {
        const $confirmationMessage = $("<td>").addClass("destroy-warning-message").html(WITResources.DestroyWorkItemDialogConfirmationText);
        $confirmationMessage.append("<br>");
        return $confirmationMessage;
    }

    /**
     * show confirmation dialog
     * @param callback callback function for ok button
     */
    public static showDialog(callback: () => void) {
        Dialogs.show(DestroyConfirmationDialog, {
            okCallback: () => {
                if ($.isFunction(callback)) {
                    callback();
                }
            },
            title: WITResources.DestroyWorkItemDialogTitle,
            okText: WITResources.DestroyWorkItemDeleteButtonText
        });
    }
}

/**
  * Recycle Bin Telemetry helper
 */
export class RecycleBinTelemetry {
    /**
    * Publish CI events
    *
    * @param featureName feature name
    * @param sourceAction source action
    * @param sourceName source area name
    * @param itemCount count of items
    * @param succeeded flag to indicate if there was error / success 
    * @param immediate false if events are queued and sent in batch. if true, event will be sent immediately
    */
    public static publish(featureName: string, sourceAction: string, sourceName: string, itemCount?: number, succeeded?: boolean, immediate: boolean = false) {
        const ciData: IDictionaryStringTo<any> = {
            "SourceName": sourceName,
            "SourceAction": sourceAction,
            "ItemCount": itemCount,
            "Success": succeeded
        };

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            RecycleBinTelemetryConstants.CI_AREA,
            featureName,
            ciData), immediate);
    }
}

VSS.tfsModuleLoaded("TFS.WorkItemTracking.Controls.RecycleBin", exports);
