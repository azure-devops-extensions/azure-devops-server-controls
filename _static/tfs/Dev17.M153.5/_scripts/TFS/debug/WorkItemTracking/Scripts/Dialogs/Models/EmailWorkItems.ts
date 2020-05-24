import AdminSendMail = require("Admin/Scripts/TFS.Admin.SendMail");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IQueryParams } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WitFormMode = require("WorkItemTracking/Scripts/Utils/WitControlMode");
import Diag = require("VSS/Diag");
import Telemetry = require("VSS/Telemetry/Services");
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import Utils_UI = require("VSS/Utils/UI");
import WITWebConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.WorkItemTracking.Constants");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");

export interface QueryResultsAdapter {
    queryId?: string;
    queryName?: string;
    queryText: string;
    fields?: string[];
    sortFields?: string[];
    project: any;
    workItemStore: WITOM.WorkItemStore;
}

export interface IWorkItemSelectionOptions {
    workItems: number[];
    store: any;
    fields: string[];
    projectId?: string;
    tempQueryId?: string;
    extendedText?: string;
}

export interface IEmailWorkItemsDialogModelOptions extends AdminSendMail.ISendMailDialogModelOptions {
    queryResultsAdapter?: QueryResultsAdapter;
    workItem?: WITOM.WorkItem;
    workItemSelectionOption?: IWorkItemSelectionOptions;
    pageSourceForCI?: string;
}

export interface IWorkItemMessageParams extends IQueryParams {
    ids?: number[];
    tempQueryId?: string;
    projectId?: string;
    format?: number;
}

export interface IGetProjectCallback {
    (project: WITOM.Project): void;
}

export interface IGetProjectWrapper {
    (getProjectCallback: IGetProjectCallback, errorCallback?: IErrorCallback): void;
}

export class EmailWorkItemsDialogModel extends AdminSendMail.SendMailDialogModel {
    private _queryResultsAdapter: QueryResultsAdapter;
    private _workItems: any;
    private _workItemSelectionOption: IWorkItemSelectionOptions;
    private _queryResultCount: number;
    private _maxWorkItemCount: number;
    private _workItem: WITOM.WorkItem;
    private _defaultToState: any;
    private _workItemMessageParams: IWorkItemMessageParams = {};
    private _project: WITOM.Project;

    constructor(options?: IEmailWorkItemsDialogModelOptions) {
        super($.extend({
            cssClass: "mail-work-items",
            readOnlyBodyLabel: WorkItemTrackingResources.SelectedWorkItemsLabel,
            useIdentityPickerForTo: true,
            useCommonIdentityPicker: true,
            resizable: false,
            preventAutoResize: true,
            includeGroups: true,
            height: 660
        } as IEmailWorkItemsDialogModelOptions, options));

        this._queryResultsAdapter = options.queryResultsAdapter;
        this._workItemSelectionOption = options.workItemSelectionOption;
        this._workItem = options.workItem;

        if (this._workItemSelectionOption) {
            Diag.Debug.assertParamIsArray(this._workItemSelectionOption.workItems, "this._workItemSelectionOption.workItems");
            Diag.Debug.assertParamIsArray(this._workItemSelectionOption.fields, "this._workItemSelectionOption.fields");
            Diag.Debug.assertParamIsObject(this._workItemSelectionOption.store, "this._workItemSelectionOption.store");

            if (this.containsNewWorkItems(this._workItemSelectionOption.workItems)) {
                throw new Error(WorkItemTrackingResources.ErrorEmailUnsavedWorkItems);
            }
        }
    }

    public setDefaultToState() {
        /// <summary>Get email recipients and store a copy</summary>
        this._defaultToState = this.getIdentitiesField();
    }

    private _isDefaultToUsed(): boolean {
        /// <summary>Checks if all the email recipients in the stored copy is still in the current list of email recipients</summary>
        var result = true;
        var identityListValues = this.getValue(AdminSendMail.SendMailDialogModel.IDENTITIES_FIELD);

        if (!this._defaultToState || !identityListValues) {
            return false;
        }

        $.each(this._defaultToState, (index, array) => {
            $.each(array, (i, value) => {
                if ($.inArray(value, identityListValues.existingUsers) === -1 && $.inArray(value, identityListValues.newUsers) === -1) {
                    result = false;
                    return false;
                }
            });
            if (!result) {
                return false;
            }
        });

        return result;
    }

    public ciOnCancel() {
        // OVERRIDE
        // Handle Telemetry when user clicks Cancel
        if (this._workItem) {
            var cidata: { [key: string]: any } = {
                "WorkItemDirty": this._workItem.isDirty(true).toString()
            };
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_SEND_EMAIL,
                cidata));
        }
    }

    public ciOnSend() {
        // OVERRIDE
        // Handle Telemetry when user clicks Send
        var cidata;
        const bodyField = this.getValue(AdminSendMail.SendMailDialogModel.BODY_FIELD);
        const characterCount = bodyField ? bodyField.length : 0;
        var defaultSubjectUsed = Utils_String.localeIgnoreCaseComparer(this.getValue(AdminSendMail.SendMailDialogModel.SUBJECT_FIELD), this.getSubject()) === 0;

        if (this._workItem) {
            // clicked from workItemForm
            cidata = {
                "SentFrom": "WorkItemForm",
                "WorkItemType": "[NonEmail: " + this._workItem.workItemType.name + "]",
                "WorkItemDirty": this._workItem.isDirty(true).toString(),
                "DefaultAssignedToUsed": this._isDefaultToUsed().toString(),
                "DefaultSubjectUsed": defaultSubjectUsed,
                "CharacterCount": characterCount
            };
        }
        else {
            const sentFrom = (<IEmailWorkItemsDialogModelOptions>this.getOptions()).pageSourceForCI || "QueryResults";
            cidata = {
                "SentFrom": sentFrom,
                "DefaultSubjectUsed": defaultSubjectUsed,
                "CharacterCount": characterCount
            };
        }
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_SEND_EMAIL,
            cidata));
    }

    public initializeModelData(successCallback: (...args: any[]) => any, errorCallback?: (...args: any[]) => any) {
        /// <summary>OVERRIDE: Initialize the model data.</summary>
        /// <param name="successCallback" type="Function">The success callback function.</param>
        /// <param name="errorCallback" type="Function" optional="true">The error callback function.</param>
        var that = this,
            queryName, queryId, queryText, fields, sortFields, queryParams;
        let witStore: WITOM.WorkItemStore;
        let project: WITOM.Project | IGetProjectWrapper;

        function successCallbackWrapper(queryResult) {
            that._queryResultCount = queryResult.WorkItemCount;
            that._maxWorkItemCount = queryResult.MaxWorkItemCount;
            if (that._workItemSelectionOption && that._workItemSelectionOption.extendedText) {
                queryResult.Html += that._workItemSelectionOption.extendedText;
                that._workItemMessageParams.tempQueryId = that._workItemSelectionOption.tempQueryId;
                that._workItemMessageParams.projectId = that._workItemSelectionOption.projectId;
            }
            that.setValue(AdminSendMail.SendMailDialogModel.READ_ONLY_BODY_FIELD, that._getSelectedWorkItemsContent(queryResult.Html), true);

            if (that._queryResultCount <= 0) {
                // Note:
                //   Today, when query is edited and saved in the web client, the query result
                // is not automatically updated. Hence, the QRG may contain work items that no
                // longer appear in the actual query result. An edge case is when no work item
                // is returned by the updated query. This is what's captured here. Instead of
                // generating an email with no work item in it, we show error.
                if ($.isFunction(errorCallback)) {
                    errorCallback({ message: WorkItemTrackingResources.ErrorEmailEmptyQueryResults });
                }
                return;
            }

            if ($.isFunction(successCallback)) {
                successCallback();
            }

            // Only start tracking dirty state when we are fully initialized.
            that._trackDirtyState = true;
            if (Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE8()) {
                // In IE8, we do not track dirtiness of the message body, set dirty always.
                that.setDirty(true);
            }
            Diag.logTracePoint("SendMailDialog.PopulationCompleted");
        }

        function getProjectSuccessCallback(project: WITOM.Project): void {
            Diag.Debug.assertParamIsObject(project, "project");

            Diag.Debug.assertIsType(witStore, WITOM.WorkItemStore, "witStore");
            Diag.Debug.assertIsString(queryText, "queryText");
            that._project = project;
            witStore.beginQuery(project.guid, queryText, successCallbackWrapper, errorCallback, queryParams);
        }

        if (!this._queryResultsAdapter) {
            if (!this._workItemSelectionOption.workItems || this._workItemSelectionOption.workItems.length === 0) {
                errorCallback(new Error(WorkItemTrackingResources.EmailWorkItems_NoSelection));
                return;
            }

            // send work items
            if (!this.getSubject()) {
                this.setValue(AdminSendMail.SendMailDialogModel.SUBJECT_FIELD, "", true);
            }

            // Note: There are potentially many fields in this get request, in which case the request url will be too long.
            //   To workaround, we will post the request. This is the same pattern applied to other work item api actions.
            this._workItemMessageParams = {
                ids: this._workItemSelectionOption.workItems,
                fields: this._workItemSelectionOption.fields && this._workItemSelectionOption.fields.length ? this._workItemSelectionOption.fields : undefined,
                format: WITWebConstants.QueryResultFormat.Html
            };

            TFS_Core_Ajax.postMSJSON(
                this._workItemSelectionOption.store.getApiLocation("workitems", { project: this._workItemSelectionOption.projectId || "" }),
                this._workItemMessageParams,
                successCallbackWrapper,
                errorCallback);
        }
        else {
            queryName = this._queryResultsAdapter.queryName;
            if (queryName) {
                this.setValue(AdminSendMail.SendMailDialogModel.SUBJECT_FIELD, queryName, true);
            }

            queryId = this._queryResultsAdapter.queryId;
            queryText = this._queryResultsAdapter.queryText;

            fields = this._queryResultsAdapter.fields;
            sortFields = this._queryResultsAdapter.sortFields;

            witStore = this._queryResultsAdapter.workItemStore;

            queryParams = {
                fields: fields && fields.length ? fields : undefined,
                sortFields: sortFields && sortFields.length ? sortFields : undefined,
                runQuery: true,
                persistenceId: queryId,
                format: WITWebConstants.QueryResultFormat.Html,
                workItemIdFilter: []
            };
            this._workItemMessageParams = $.extend({ wiql: this._queryResultsAdapter.queryText }, queryParams);
            project = this._queryResultsAdapter.project;
            Diag.Debug.assertIsNotUndefined(project, "project");
            Diag.Debug.assertIsNotNull(project, "project");

            if (project instanceof WITOM.Project) {
                this._project = project;
                witStore.beginQuery(project.guid, queryText, successCallbackWrapper, errorCallback, queryParams);
            }
            else {
                Diag.Debug.assertIsFunction(project, "project");
                project(getProjectSuccessCallback, errorCallback);
            }
        }

        Diag.logTracePoint("SendMailDialog.Opened");
    }

    public getEndPoint(): string {
        if (this._queryResultsAdapter && this._project) {
            return this._project.getApiLocationIncludingTeam("sendMail");
        }
        if (this._workItemSelectionOption.store) {
            return this._workItemSelectionOption.store.getApiLocation("sendMail");
        }
    }

    public getMessageParams() {
        return $.extend(super.getMessageParams(), this._workItemMessageParams);
    }

    public containsNewWorkItems(workItemIds: number[]): boolean {
        /// <summary>Determines whether the array of work items contains IDs for work items that have not been saved yet.</summary>
        /// <returns type="Boolean">Returns true if the array contains negative numbers</returns>
        var hasNewWorkItems = false;

        if (workItemIds) {
            $.each(workItemIds, (i: number, id: number) => {
                if (id <= 0) {  // new work items have a non-positive ID
                    hasNewWorkItems = true;
                    return false;
                }
            });
        }

        return hasNewWorkItems;
    }

    public getTitle(): string {
        /// <summary>OVERRIDE: Gets the title/caption of the dialog</summary>
        /// <returns type="String" />
        return WorkItemTrackingResources.SendWorkItemsInEmailDialogTitle;
    }

    public getBodyAppendixText(): string {
        /// <summary>OVERRIDE: Gets optional message that appears after the body field</summary>

        if (this._queryResultCount && this._maxWorkItemCount && this._queryResultCount > this._maxWorkItemCount) {
            return Utils_String.format(WorkItemTrackingResources.EmailWorkItemLimit, this._maxWorkItemCount);
        }

        return null;
    }

    private _getSelectedWorkItemsContent(queryResultHtml: string): string {
        // Retrieve table element from server returned content.
        var $queryResult = $("<div>").html(queryResultHtml);
        var $table = $("table", $queryResult);
        return $("<div>").append($table)[0].innerHTML;
    }
}

VSS.initClassPrototype(EmailWorkItemsDialogModel, {
    _queryResultsProvider: null,
    _workItems: null,
    _queryResultCount: null,
    _maxWorkItemCount: null
});