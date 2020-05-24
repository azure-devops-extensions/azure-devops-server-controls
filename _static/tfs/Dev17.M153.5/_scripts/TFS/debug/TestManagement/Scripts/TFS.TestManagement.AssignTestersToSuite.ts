/// <reference types="jquery" />

import TfsSendMail = require("Admin/Scripts/TFS.Admin.SendMail");

import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import TestManagementResources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import Notifications = require("VSS/Controls/Notifications");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");

let TemplateEngine = Utils_Html.TemplateEngine;

// Class takes care of the workflow for assigning/removing testers to suite
export class AssignTestersToSuite {

    constructor() {
        Diag.logTracePoint("[AssignTestersToSuite.contructor]: method called");
    }

    public AssignTesters(planId: number, suite: TestsOM.ITestSuiteModel, dialogClosedCallBack: () => void, showErrorCallBack: (string) => void): void {
        Diag.logTracePoint("[AssignTestersToSuite.AssignTesters]: method called");

        if (!suite) {
            Diag.logWarning("[AssignTestersToSuite.AssignTesters]: suite object is NULL");
            return;
        }

        Diag.logVerbose(Utils_String.format("[AssignTestersToSuiteDialog.AssignTesters]: Assigning Testers to suiteId:{0} suiteTitle{1}", suite.id, suite.title));

        let that = this;

        this._planId = planId;
        this._suite = suite;
        this._showErrorCallBack = showErrorCallBack;
        this._dialogClosedCallBack = dialogClosedCallBack;
        this._currentUserDisplayName = TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.displayName;

        let options = $.extend({
            subject: this._getEmailSubjectText(),
            useIdentityPickerForTo: true,
            planId: planId,
            suite: this._suite,
            readOnlyBody: this._getEmailBodyText()
        });

        this._selectTesterDialogModel = new SelectTestersDialogModel(options);

        // makes sure the wait control is always bound to the current dialog's _element
        this._longRunningOperation = new StatusIndicator.LongRunningOperation(this, { showDelay: 0 });

        // Kick off the model async initialization, e.g. the mail body may be rendered
        // by the result of an async call to server-side api.
        this._longRunningOperation.beginOperation(function () {
            that._selectTesterDialogModel.beginInitialize(Utils_Core.delegate(that, that._launchDialog), Utils_Core.delegate(that, that._handleError));
        });
    }

    // Private section
    // Private member methods
    private _getEmailSubjectText(): string {
        return Utils_String.format(TestManagementResources.SelectTestersForSuiteEmailSubjectText, this._suite.title, this._currentUserDisplayName);
    }

    private _getEmailBodyText(): string {
        let resultHtml,
            template = TestManagementResources.AssignTestersToSuiteEmailTemplate,
            displayName = this._currentUserDisplayName,
            data = {
                TestManagementResources: TestManagementResources,
                Name: displayName,
                ViewTests: this._getViewTestLink()
            };

        Diag.logVerbose("Generating email body");
        resultHtml = TemplateEngine.tmpl(template, data);
        return $(resultHtml).html();
    }

    private _getViewTestLink(): string {
        return TMUtils.UrlHelper.getActionUrlForSuite(TestsOM.TestViewActions.FilterByTester, this._planId, this._suite.id, true);
    }

    private _launchDialog(): void {
        Diag.logTracePoint("[AssignTestersToSuite.LaunchDialogue]: method called");
        this._longRunningOperation.endOperation();
        Dialogs.show(SelectTestersDialog, $.extend({
            model: this._selectTesterDialogModel,
            width: SelectTestersDialog.DIALOG_WIDTH,
            height: SelectTestersDialog.DIALOG_HEIGHT,
            resizable: false,
            title: this._selectTesterDialogModel.getTitle(),
            dialogueClosed: this._dialogClosedCallBack
        }, { cssClass: "assign-tester-to-suite-dialogue" }));
    }

    private _handleError(error?: any): void {
        Diag.logTracePoint("[AssignTestersToSuite._handleError]: method called");
        this._longRunningOperation.endOperation();
        if (this._showErrorCallBack && $.isFunction(this._showErrorCallBack)) {
            this._showErrorCallBack(error.message);
        }
    }

    // Private member variables
    private _planId: number;
    private _showErrorCallBack: (string) => void;
    private _longRunningOperation: StatusIndicator.LongRunningOperation;
    private _dialogClosedCallBack: any;
    private _currentUserDisplayName: string;
    private _suite: TestsOM.ITestSuiteModel;
    private _selectTesterDialogModel: SelectTestersDialogModel;
}

interface SelectTestersDialogOptions extends Dialogs.IModalDialogOptions {
    dialogueClosed?: Function;
}

class SelectTestersDialog extends Dialogs.ModalDialogO<SelectTestersDialogOptions> {
    public static DIALOG_WIDTH: number = 780;
    public static DIALOG_HEIGHT: number = 450;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        Diag.logTracePoint("[SelectTestersDialog.initializeOptions]: method called");
        this._options = options;
        super.initializeOptions($.extend({
           buttons: {
                "ok": {
                    id: "ok-button",
                    text: TestManagementResources.OkText,
                    click: Utils_Core.delegate(this, this._onOkButtonClicked)
                },
                "cancel": {
                    id: "cancel-button",
                    text: TestManagementResources.CancelText,
                    click: Utils_Core.delegate(this, this._onCancelButtonClicked)
                }
            }
        }, options));
        this._model = options.model;
    }

    public initialize(): void {
        Diag.logTracePoint("[SelectTestersDialog.initialize]: method called");
        TMUtils.CommonIdentityPickerHelper.getFeatureFlagState();
        super.initialize();
        this._shouldSendEmail = false;
        this._longRunningOperation = new StatusIndicator.LongRunningOperation(this, { showDelay: 0 });
        this._addForm();
        this._onNotifyCheckBoxChecked(false);
    }

    public onClose(event?: any) {
        Diag.logTracePoint("[SelectTestersDialog.onClose]: method called");
        super.onClose(event);
        if ($.isFunction(this._options.dialogueClosed)) {
            this._options.dialogueClosed();
        }
    }


    // Private Section

    // Private member methods
    private _onOkButtonClicked(): void {
        Diag.logTracePoint("[SelectTestersDialog._onOkButtonClicked]: method called");

        let successCallBack = Utils_Core.delegate(this, this._onAddingTestersToSuiteSuccessOnServer),
            errorCallBack = (e?: string) => {
                Diag.logError("[SelectTestersDialog._onOkButtonClicked]: error Adding Testers to suite at server");
                this._handleError(e, AssignTesterErrorCodes.INVALID_TESTER);
            };

        if (TMUtils.CommonIdentityPickerHelper.featureFlagEnabled) {
            let identities = this._selectTesterForm.getSelectedIdentities();
            let invalidIdentities = this._selectTesterForm.getInvalidIdentities();
            this._model.updateSelectedTestersInServer2(identities, invalidIdentities, successCallBack, errorCallBack);
        }
        else {
            this._model.updateSelectedTestersInServer(successCallBack, errorCallBack);  // Donot close the dialogue until result callback is received
        }
    }

    private _onCancelButtonClicked(): void {
        Diag.logTracePoint("[SelectTestersDialog._onCancelButtonClicked]: method called");
        this.close();
    }

    private _onAddingTestersToSuiteSuccessOnServer() {
        Diag.logTracePoint("[SelectTestersDialog._onAddingTestersToSuiteSuccessOnServer]: method called");
        Diag.logInfo("[SelectTestersDialog._onAddingTestersToSuiteSuccessOnServer]: successfully added testers to suite at server");

        // Need to call Send Mail method
        if (this._shouldSendEmail) {
            Diag.logInfo("[SelectTestersDialog._onAddingTestersToSuiteSuccessOnServer]: sending mail to selected testers");
            if (TMUtils.CommonIdentityPickerHelper.featureFlagEnabled) {
                this._beginSend();
            }
            else {
                this._selectTesterForm.checkName(() => { this._beginSend(); });
            }
        }
        this.close();
    }

    private _addForm(): void {
        Diag.logTracePoint("[SelectTestersDialog._addForm]: method called");

        this._$dialogBoxContainer = this.getElement();
        this._$dialogBoxContainer.css("height", SelectTestersDialog.DIALOG_HEIGHT - 100);
        this._$dialogBoxContainer.parent().css("top", "75px");
        this._addHeadingSection(); // Heading Section
        Diag.logVerbose("[SelectTestersDialog._addForm]: Heading section added");
        this._addDialogueBodySection(); // Body section
        Diag.logVerbose("[SelectTestersDialog._addForm]: Body section added");
    }

    private _addHeadingSection(): void {
        Diag.logTracePoint("[SelectTestersDialog._addHeadingSection]: method called");
        // Description statement
        let $selectTestersSummaryDiv = $("<div class='select-testers-summary' />")
            .attr("style", "padding: 0 10px;"),
            $selectTestersHeadingDiv = $("<div class='select-testers-heading' />")
                .attr("style", "font-weight: bold; padding: 0 10px;"),
            $selectTestersDiscriptionDiv = $("<div class='select-testers-desciption' />")
                .attr("style", "padding: 0 10px;"),
            $messageAreaContainer = $("<div>").addClass("messagearea-container");

        this._messagePane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $messageAreaContainer);
        this._messagePane._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, (e) => {
            this._resetOnErrorClear();
         });

        $selectTestersSummaryDiv.text(TestManagementResources.SelectTestersSummaryText);
        $selectTestersHeadingDiv.text(TestManagementResources.SelectTesterHeadingText);
        $selectTestersDiscriptionDiv.text(TestManagementResources.SelectTesterDescriptionText);

        this._$dialogBoxContainer.append($messageAreaContainer).append($selectTestersSummaryDiv).append($selectTestersHeadingDiv).append($selectTestersDiscriptionDiv);
    }

    private _addDialogueBodySection(): void {
        Diag.logTracePoint("[SelectTestersDialog._addDialogueBodySection]: method called");

        let that = this,
            $formContainer = $("<div class='assign-tester-message-form-container'/>");
        this._setSelectTesterForm($formContainer);
        this._$dialogBoxContainer.append($formContainer);

        this._selectTesterForm.addNotifyCheckBox();
    }

    private _setSelectTesterForm($formContainer: any): any {
        let that = this;
        let options = $.extend({
            subject: this._model._option.subject,
            useIdentityPickerForTo: this._model.useIdentityPickerForTo,
            defaultTo: this._model.getCurrentAssignedTesters(),
            height: "100%",
            fireOnEveryChange: false,
            change: Utils_Core.delegate(that, that._handleChange),
            onError: Utils_Core.delegate(that, that._handleError),
            onNotifyCheckBoxChecked: Utils_Core.delegate(that, that._onNotifyCheckBoxChecked),
            items: this._model.getCurrentAssignedTestersNames(),
            useCommonIdentityPicker: TMUtils.CommonIdentityPickerHelper.featureFlagEnabled,
            readOnlyBody: this._model._option.readOnlyBody
        });

        this._selectTesterForm = Controls.Control.create(SelectTestersForSuiteForm, $formContainer, options);
    }

    private _handleChange(event?: any): void {
        // Handles changes made to the fields in the email contol.
        // NOTE: The body of the email uses the RichEditor control which re-hosts a document window
        // in an IFrame.  Because of this, change notifications don't surface the same way as other
        // controls.
        if (event.target) {
            switch (event.target.id) {
                case SelectTestersForSuiteForm.ID_TO:
                    this._model.setValue(TfsSendMail.SendMailDialogModel.TO_FIELD, event.target.value);
                    this._checkForMinimumTesters(event.fieldValue.existingUsers, event.fieldValue.newUsers);
                    break;
                case SelectTestersForSuiteForm.ID_SUBJECT:
                    this._model.setValue(TfsSendMail.SendMailDialogModel.SUBJECT_FIELD, event.target.value);
                    break;
                default:
                    Diag.Debug.fail("Unknown email input element");
            }
        }
        else if (event.fieldId === SelectTestersForSuiteForm.ID_BODY) {
            this._model.setValue(TfsSendMail.SendMailDialogModel.BODY_FIELD, event.fieldValue);
        }
        else if (event.fieldId === SelectTestersForSuiteForm.ID_TO) {
            this._model.setValue(TfsSendMail.SendMailDialogModel.IDENTITIES_FIELD, event.fieldValue);
            this._checkForMinimumTesters(event.fieldValue.existingUsers, event.fieldValue.newUsers);
        }
    }

    private _checkForMinimumTesters(field: any[], newUsers: any[]) {
        let length = field.length,
            newUsersLength = newUsers.length,
            error: any,
            errorCode: AssignTesterErrorCodes;

        if (length === 0 && newUsersLength === 0) {
            error = { message: TestManagementResources.SelectTestersMinTestersErrorText };
            errorCode = AssignTesterErrorCodes.INVALID_TESTER;
        }
        else {
            error = null;
            errorCode = null;
        }

        this._handleError(error, errorCode);
    }

    private _handleError(error: any, errorCode?: AssignTesterErrorCodes) {
        Diag.logTracePoint("[SelectTestersDialog._handleError]: method called");

        if (errorCode) {
            this._errorCode |= errorCode;
        }

        if (error && error.message) {
            this._messagePane.setError({
                header: error.message
            });
            this._updateOkButton(false);
        }
        else {
            this._clearErrors();
        }
    }

    private _clearErrors() {
        /// <summary>Clears all the displayed errors.</summary>
        this._resetOnErrorClear();
        this._messagePane.clear();
        this._errorCode = 0;
    }

    private _resetOnErrorClear() {
            this._updateOkButton(true);

        if (this._errorCode & AssignTesterErrorCodes.EMAIL_NOT_ENABLED_ON_SERVER) {
            this._selectTesterForm.updateCheckBox(false);
            this._errorCode &= ~(AssignTesterErrorCodes.EMAIL_NOT_ENABLED_ON_SERVER);
        }
    }

    private _beginSend() {
        /// <summary>Handler of the send button clicked event.</summary>
        let that = this, url, msg;

        msg = this._model.getMessage();

        if (!msg.subject) {
            if (!confirm(VSS_Resources_Common.SendMailNoSubjectWarning)) {
                return;
            }
        }

        if (msg.body !== undefined && msg.body !== null && msg.body.length > 1024) {
            msg.body = msg.body.substring(0, 1024);
        }
        url = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("sendMail", "testManagement", { area: "api", planId: this._model.planId, suiteId: this._model._suite.id } as TFS_Host_TfsContext.IRouteData);

        // Start sending the email in a long running operation
        // so that we can "lock" the dialog with rolling wheel
        // to prevent users from editing the email content, particularly
        // when the Ajax call takes a bit time to finish on low-speed network.
        this._longRunningOperation.beginOperation(function () {
            TFS_Core_Ajax.postMSJSON(url, { message: Utils_Core.stringifyMSJSON(msg) },
                (result) => {
                    // Sending mail succeeded, closing the dialog
                    that._longRunningOperation.endOperation();

                    that._sendingSucceeded = true;
                    that._sendingInProgress = false;
                    that._model.setDirty(false);

                    if ((result.sendMailWarning) && (result.sendMailWarning.length > 0)) {
                        window.alert(result.sendMailWarning);
                    }

                    that._selectTesterForm._handleSendMailSuccess();

                    that.close();

                    Diag.logTracePoint("SendMailDialog.SendCompleted");
                },
                (error) => {
                    // Sending mail failed, displaying error message.
                    that._longRunningOperation.endOperation();
                    that._handleError(VSS_Resources_Common.ErrorSendEmail, AssignTesterErrorCodes.SEND_EMAIL_ERROR);

                    that._sendingInProgress = false;

                    that._updateOkButton(true);
                    that._updateCancelButton(true);
                });
        });

        this._sendingInProgress = true;

        // Note: We don't have a good framework support to cancel an async rest api call.
        //   We choose to disable the Cancel button to prevent users from running into such situation.
        this._updateOkButton(false);
        this._updateCancelButton(false);
    }

    private _updateOkButton(enabled: boolean) {
        /// <summary>Updates the status of the send button.</summary>
        /// <param name="enabled" type="Bool"><c>true</c> to enable the button; otherwise, <c>false</c>.</param>
        this._element.trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button: "ok-button", enabled: enabled });
    }

    private _updateCancelButton(enabled: boolean) {
        /// <summary>Updates the status of the cancel button.</summary>
        /// <param name="enabled" type="Bool"><c>true</c> to enable the button; otherwise, <c>false</c>.</param>
        this._element.trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button: "cancel-button", enabled: enabled });
    }

    private _onNotifyCheckBoxChecked(state: boolean): boolean {
        let that = this;
        
        if (state) {
            this._model.superBeginInitialize(
                () => {
                    // Large size
                    this._element[0].style.height = "550px";
                },
                (error) => {
                    state = false;
                    that._handleError(error, AssignTesterErrorCodes.EMAIL_NOT_ENABLED_ON_SERVER);
                });
        }
        else {
            // small size
            this._element[0].style.height = "325px";
            this._clearErrors();
        }
        this._shouldSendEmail = state;
        return state;
    }

    // private member variables
    private _suite: TestsOM.ITestSuiteModel;
    private _buttons: any[];
    private _errorCode: number;
    private _suiteName: string;
    private _sendingSucceeded: boolean;
    private _sendingInProgress: boolean;
    private _$dialogBoxContainer: JQuery;
    private _shouldSendEmail: boolean;
    private _model: SelectTestersDialogModel;
    private _messagePane: Notifications.MessageAreaControl;
    private _longRunningOperation: StatusIndicator.LongRunningOperation;
    private _selectTesterForm: SelectTestersForSuiteForm;
}

class SelectTestersForSuiteForm extends TfsSendMail.MessageForm {

    public initialize(options?: any) {
        Diag.logTracePoint("[SelectTestersForSuiteForm.initialize]: method called");
        super.initialize();

        this._element.find(".email-input-to-label").text("Testers");
        this._$emailToRowLabel = this._element.find(".email-to-row label");
        this._$emailIdentityPickerInput = this._element.find("input#email-input-to");
        this._$emailToRow = this._element.find(".email-to-row");
        this._$emailToRowLabel.hide();
        if (!this._$emailIdentityPickerInput.attr("aria-label")) {
            // since default label is being hidden, make sure to transfer its value as aria-label to the input
            this._$emailIdentityPickerInput.attr("aria-label", this._$emailToRowLabel.text());
        }

        this._$emailSubjectRow = this._element.find(".email-subject-row");
        this._$emailBodyRow = this._element.find(".email-body-row");

        this._isCheckBoxChecked = false;    // checkBox false by default
        this._resetLayout();
    }

    private _resetLayout() {
        Diag.logTracePoint("[SelectTestersForSuiteForm._resetLayout]: method called");
        this._$emailSubjectRow.hide();
        this._$emailBodyRow.hide();

        // Add Testers Removal info
        this._$emailTesterRemoveInfoRow = $("<div class='email-remove-tester-info-row' />");
        this._$emailTesterRemoveInfoDiv = $("<div class='email-remove-tester-info' />");
        this._$emailTesterRemoveInfoDiv.text(TestManagementResources.SelectTestersRemovalInfoText);
        this._$emailTesterRemoveInfoRow.append(this._$emailTesterRemoveInfoDiv);

        this._$emailTesterRemoveInfoRow.insertAfter(this._$emailToRow);
    }

    // Private section
    public addNotifyCheckBox(): void {
        Diag.logTracePoint("[SelectTestersForSuiteForm._addNotifyCheckBox]: method called");
        let $checkBoxRow = $("<tr class='notify-testers-checkbox-row' />");
        let $checkBoxDiv = $("<div class='notify-testers-checkbox' />");
        let $checkBoxLabel = $("<label />", { "for": "notify-testers-checkbox", text: TestManagementResources.NotifyTestersLabelText }).attr("id", "notify-testers-checkbox-label");
        this._checkBoxItem = $("<input />", { id: "notify-testers-checkbox", type: "checkbox", role: "checkbox" }).attr("aria-labelledby", "notify-testers-checkbox-label");

        this._checkBoxItem.attr("aria-checked", "false");
        $checkBoxDiv.append(this._checkBoxItem).append($checkBoxLabel);
        $checkBoxRow.append($("<td colspan='2' />").append($checkBoxDiv));

        let $sendMailHeadingRow = $("<tr class='send-email-row' />");
        let $sendMailHeadingDiv = $("<div class='send-email' />").attr("style", "font-weight: bold;");

        $sendMailHeadingDiv.text(TestManagementResources.SelectTestersSendMailText);
        $sendMailHeadingRow.append($("<td colspan='2' />").append($sendMailHeadingDiv));

        $checkBoxRow.insertBefore(this._$emailSubjectRow);
        $sendMailHeadingRow.insertBefore($checkBoxRow);
        this._bindCheckBoxChangeEvent(this._checkBoxItem);
    }

    public updateCheckBox(checked: boolean): void {
        this._checkBoxItem.prop("checked", checked);
        this._checkBoxItem.attr("aria-checked", checked.toString());
    }

    private _updateLayoutBasedOnCheckBox(state: boolean) {
        if (state) {
            // Show section
            this._$emailSubjectRow.show();
            this._$emailBodyRow.show();
        }
        else {
            // Hide section
            this._$emailSubjectRow.hide();
            this._$emailBodyRow.hide();
        }
    }

    private _bindCheckBoxChangeEvent($checkBoxItem: JQuery): void {
        Diag.logTracePoint("[SelectTestersDialog._bindCheckBoxChangeEvent]: method called");
        $checkBoxItem.change(this, function (e) {
            let that = e.data,
                checked: boolean;

            checked = $(this).is(":checked") ? true : false;
            $(this).attr("aria-checked", checked.toString());

            that._isCheckBoxChecked = checked;
            checked = that._options.onNotifyCheckBoxChecked(checked);
            that._updateLayoutBasedOnCheckBox(checked);
        });
    }

    // private member variables
    private _checkBoxItem: JQuery;
    private _$emailToRow: JQuery;
    private _$emailToRowLabel: JQuery;
    private _$emailIdentityPickerInput: JQuery;
    private _$emailBodyRow: JQuery;
    private _$emailSubjectRow: JQuery;
    private _isCheckBoxChecked: boolean;
    private _$emailNotifyCheckBoxRow: JQuery;
    private _$emailTesterRemoveInfoDiv: JQuery;
    private _$emailTesterRemoveInfoRow: JQuery;
}

class SelectTestersDialogModel extends TfsSendMail.SendMailDialogModel {

    constructor(options?: any) {
        Diag.logTracePoint("[SelectTestersDialogModel.constructor]: method called");
        super(options);
        this._option = options;
        this._suite = options.suite;
        this.planId = options.planId;
    }

    public updateSelectedTestersInServer(successCallback: IResultCallback, errorCallback?: IErrorCallback): void {
        let identities: any;

        identities = this.getIdentitiesField();
        Diag.logVerbose(Utils_String.format("[SelectTestersDialogModel.updateSelectedTestersInServer]: Number of testers selected: {0}", identities.tfIds.length));

        if (identities.tfIds.length === 0) {
            if ($.isFunction(errorCallback)) {
                errorCallback({ message: TestManagementResources.SelectTestersMinTestersErrorText });
                return;
            }
        }

        TMUtils.getTestPlanManager().assignTestersToSuite(this._suite.id, identities.tfIds, successCallback, errorCallback);
    }

    public getEndPoint(): string {
        return ""; // unused.
    }

    public getTitle(): string {
        Diag.logTracePoint("[SelectTestersDialogModel.GetTitle]: method called");
        return Utils_String.format(TestManagementResources.SelectTestersForSuiteDialogBoxText, this._suite.title);
    }

    public updateSelectedTestersInServer2(identities: Identities_RestClient.IEntity[], unresolvedIdentities: string[], successCallback: IResultCallback, errorCallback?: IErrorCallback): void {
        Diag.logVerbose(Utils_String.format("[SelectTestersDialogModel.updateSelectedTestersInServer]: Number of testers selected: {0}", identities.length));

        if (!(identities) || identities.length === 0) {
            if ($.isFunction(errorCallback)) {
                errorCallback({ message: TestManagementResources.SelectTestersMinTestersErrorText });
                return;
            }
        }

        if (unresolvedIdentities && unresolvedIdentities.length > 0) {
            let errorMessage = Utils_String.format(VSS_Resources_Common.InvalidEmailAddressFormat, unresolvedIdentities.join(";"));

            if ($.isFunction(errorCallback)) {
                errorCallback({ message: errorMessage });
                return;
            }
        }

        let tfids = [];
        let newUsers = [];
        for (let i = 0; i < identities.length; i++) {
            if (identities[i].localId) {
                tfids.push(identities[i].localId);
            }
            else {
                newUsers.push(identities[i].signInAddress);
            }
        }

        let newUsersJson = Utils_Core.stringifyMSJSON(newUsers);

        TMUtils.getTestPlanManager().assignTestersToSuiteWithAad(this._suite.id, tfids, newUsersJson, successCallback, errorCallback);
    }

    public getCurrentAssignedTesters(): TesterIdentity[] {
        return this._currentAssignedTesters;
    }

    public getCurrentAssignedTestersNames(): string {
        let testerNames = "";
        for (let i = 0, len = this._currentAssignedTesters.length; i < len; i++) {
            testerNames = testerNames + this._currentAssignedTesters[i].entityId + ";";
        }

        return testerNames;
    }

    public beginInitialize(successCallback: Function, errorCallback?: Function) {
        this._currentAssignedTesters = new Array<TesterIdentity>();
        TMUtils.getTestPlanManager().getTestersAssignedToSuite(this._suite.id, (testersList: any[]) => {
            for (let i = 0, len = testersList.length; i < len; i++) {
                this._currentAssignedTesters.push({
                    displayName: testersList[i].displayName,
                    tfid: testersList[i].id,
                    uniqueName: testersList[i].uniqueName,
                    entityId: testersList[i].entityId
                });
            }
            // Begin initialize super post getting the list of assigned Testers
            //super.beginInitialize(successCallback, errorCallback);
            if ($.isFunction(successCallback)) {
                successCallback();
            }
        }, (error?: any) => { errorCallback(error); });
    }

    public superBeginInitialize(successCallback: Function, errorCallback?: Function) {
        super.beginInitialize(successCallback, errorCallback);
    }

    public _option: any;
    // Private section

    // Private member varibales
    private _currentAssignedTesters: TesterIdentity[];
    public _suite: TestsOM.ITestSuiteModel;
    public planId: number;
}

class TesterIdentity {
    public displayName: string;
    public tfid: string;
    public uniqueName: string;
    public entityId: string;
}

// These are bitmasks, hence the values
enum AssignTesterErrorCodes {
    NO_ERROR = 0,
    INVALID_TESTER = 1,
    EMAIL_NOT_ENABLED_ON_SERVER = 2,
    SEND_EMAIL_ERROR = 4
}
