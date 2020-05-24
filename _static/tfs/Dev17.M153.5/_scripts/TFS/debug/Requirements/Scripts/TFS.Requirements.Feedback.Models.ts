//Auto converted from Requirements/Scripts/TFS.Requirements.Feedback.Models.debug.js

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Diag = require("VSS/Diag");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Events_Handlers = require("VSS/Events/Handlers");
import Navigation_Services = require("VSS/Navigation/Services");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import FeedbackResources = require("Requirements/Scripts/Resources/TFS.Resources.RequirementsFeedback");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import TFS_Requirements_Utils = require("Requirements/Scripts/TFS.Requirements.Utils");
import Utils_Html = require("VSS/Utils/Html");
import Service = require("VSS/Service");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Telemetry = require("VSS/Telemetry/Services");

var AlmUriBuilder = TFS_OM_Common.AlmUriBuilder;
var TemplateEngine = Utils_Html.TemplateEngine;
var FeedbackWorkItemCreator = TFS_Requirements_Utils.FeedbackWorkItemCreator;
var delegate = Utils_Core.delegate;
var transformError = TFS_Core_Utils.transformError;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();


export class ErrorManager {

    private _options: any;
    private _errors: any;

    constructor (options?: any) {
        /// <summary>Constructs a new instance of the ErrorManager object.</summary>
        /// <param name="options" type="object" optional="true">

        this._options = options || {};
        this._errors = [];
    }

    
    public hasErrors() {
        /// <summary>Gets a boolean value indicating whether there are errors present.</summary>

        Diag.Debug.assertIsArray(this._errors, "_errors");
        return (this._errors.length > 0);
    }

    public add(error) {
        /// <summary>Adds the specified error to the collection of errors.</summary>
        /// <param name="error">An error object.</param>

        Diag.Debug.assertParamIsObject(error, "error");
        Diag.Debug.assertIsArray(this._errors, "_errors");
        this._errors.push(error);
    }

    public addRange(errors: any[]) {
        /// <summary>Adds the specified array of errors to the collection of errors.</summary>
        /// <param name="errors" type="array">A collection of errors to add.</param>

        Diag.Debug.assertParamIsArray(errors, "errors");
        Diag.Debug.assertIsArray(this._errors, "_errors");
        var that = this;

        $.each(errors, function (index, error) {
            that._errors.push(error);
        });
    }

    public clear() {
        /// <summary>Clears the collection of errors.</summary>

        Diag.Debug.assertIsArray(this._errors, "_errors");
        Utils_Array.clear(this._errors);
    }

    public getById(id) {
        /// <summary>Gets an error from the collection based on the specified error ID.</summary>
        /// <param name="id">The ID of an error to get.</param>

        var i, l;

        Diag.Debug.assertIsArray(this._errors, "_errors");
        for (i = 0, l = this._errors.length; i < l; i += 1) {
            if (this._errors[i].id === id) {
                return this._errors[i];
            }
        }
    }

    public getItems() {
        /// <summary>Gets an array of all errors in the collection.</summary>

        Diag.Debug.assertIsArray(this._errors, "_errors");
        return this._errors;
    }

    public getCount() {
        /// <summary>Gets the count of error in the collection.</summary>

        Diag.Debug.assertIsArray(this._errors, "_errors");
        return this._errors.length;
    }
}

VSS.initClassPrototype(ErrorManager, {
    _options: null,
    _errors: null
});



export class RequestItemsViewModel {

    public static EVENT_ITEM_ADDED: string = "item-added";
    public static EVENT_ITEM_REMOVED: string = "item-removed";
    public static EVENT_ITEM_CHANGED: string = "item-changed";
    public static EVENT_MODEL_VALIDATED: string = "model-validated";
    public static REQUEST_ITEM_TITLE_FIELD: string = "VSS.Requirements.Feedback.RequestItemTitle";
    public static MAXIMUM_REQUEST_ITEMS: number = 5;
    public static MINIMUM_REQUEST_ITEMS: number = 1;

    private _options: any;
    private _events: Events_Handlers.NamedEventCollection<RequestItemsViewModel, any>;
    private _ids: any;
    private _items: any;
    private _idCount: number;
    private _errors: any;

    constructor (options? ) {
        /// <summary>Creates a new instance of the Feedback Request Items view model with the specified options.</summary>
        /// <param name="options">Additional options.</param>

        this._options = options;
        this._initialize();
    }

    public itemAdded(handler) {
        /// <summary>Attaches the specified handler to the "item-added" event.</summary>
        /// <param name="handler">A function invoked when the "item-added" event is fired.</param>

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._events.subscribe(RequestItemsViewModel.EVENT_ITEM_ADDED, handler);
    }

    public itemRemoved(handler) {
        /// <summary>Attaches the specified handler to the "item-removed" event.</summary>
        /// <param name="handler">A function invoked when the "item-removed" event is fired.</param>

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._events.subscribe(RequestItemsViewModel.EVENT_ITEM_REMOVED, handler);
    }

    public itemChanged(handler) {
        /// <summary>Attaches the specified handler to the "item-changed" event.</summary>
        /// <param name="handler">A function invoked when the "item-changed" event is fired.</param>

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._events.subscribe(RequestItemsViewModel.EVENT_ITEM_CHANGED, handler);
    }

    public attachModelValidated(handler) {
        /// <summary>Attaches the specified handler to the "model validated" event.</summary>
        /// <param name="handler">A function invoked when the "model validated" event is fired.</param>

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._events.subscribe(RequestItemsViewModel.EVENT_MODEL_VALIDATED, handler);
    }

    public addItem() {
        /// <summary>Adds new feedback request item.</summary>
        // add to array
        var itemId = this.generateItemId();
        this._items.push({
            title: "",
            details: ""
        });
        this._ids.push(itemId);
        this._raiseFieldChanged(RequestItemsViewModel.EVENT_ITEM_ADDED, itemId);

        this.validateModel();
    }

    public generateItemId() {
        /// <summary>gets id for item based on index</summary>
        this._idCount++;
        return "item" + this._idCount;
    }

    public getItemId(index: number) {
        /// <summary>Gets the item ID for the specified index.</summary>
        /// <param name="index" type="number">The index of the item to retrieve.</param>

        Diag.Debug.assertParamIsNumber(index, "index");
        return this._ids[index];
    }

    public removeItem(itemId) {
        /// <summary>Removes feedback request item.</summary>
        var index = this._findItemIndex(itemId);
        this._ids.splice(index, 1);
        this._items.splice(index, 1);

        this._raiseFieldChanged(RequestItemsViewModel.EVENT_ITEM_REMOVED, itemId);

        this.validateModel();
    }

    public getValue(itemId: string) {
        /// <summary>Gets value of feedback request item.</summary>
        /// <param name="itemId" type="string">itemId of the item to remove.</parm>
        var index = this._findItemIndex(itemId);
        return this._items[index];
    }

    public setValue(itemId, value) {
        /// <summary>Sets value of feedback request item.</summary>
        var index = this._findItemIndex(itemId);
        if (typeof value.title !== 'undefined') {
            this._items[index].title = value.title;
        }
        if (typeof value.details !== 'undefined') {
            this._items[index].details = value.details;
        }
        this._raiseFieldChanged(RequestItemsViewModel.EVENT_ITEM_CHANGED, itemId);

        this.validateModel();
    }

    public getCount() {
        /// <summary>Gets the number of feedback request items.</summary>
        return this._ids.length;
    }

    public getErrors() {
        /// <summary>Gets the validation errors.</summary>
        return this._errors;
    }

    public hasErrors() {
        /// <summary>Checks if the model has validation errors.</summary>
        /// TODO: Fix this to return boolean here
        return (this._errors && this._errors.getById(RequestItemsViewModel.REQUEST_ITEM_TITLE_FIELD));
    }

    public canAdd() {
        /// <summary>Checks if a feedback request item can be added.</summary>
        return this._ids.length < RequestItemsViewModel.MAXIMUM_REQUEST_ITEMS;
    }

    public canRemove() {
        /// <summary>Checks if a feedback request item can be removed.</summary>
        return this._ids.length > RequestItemsViewModel.MINIMUM_REQUEST_ITEMS;
    }

    public getFeedbackRequestItems() {
        /// <summary>Returns all feedback request items data.</summary>
        return this._items;
    }

    private _initialize() {
        /// <summary>Initializes the items view model to its initial state.</summary>

        this._events = new Events_Handlers.NamedEventCollection();
        this._errors = new ErrorManager();
        this._ids = [];
        this._items = [];

        this.addItem();
        this.validateModel();
    }

    private _raiseModelValidated(errors) {
        /// <summary>Notifies listeners that the model has been validated.</summary>

        Diag.Debug.assertParamIsObject(errors, "errors");

        this._events.invokeHandlers(RequestItemsViewModel.EVENT_MODEL_VALIDATED, this, errors);
    }

    private _raiseFieldChanged(event, id) {
        /// <summary>Notifies listeners that a change has been made to a field.</summary>
        this._events.invokeHandlers(event, this, id);
    }

    private _findItemIndex(itemId: string) {
        /// <summary>finds index of feedback request item.</summary>
        /// <param name="itemId" type="string">itemId of the item to remove.</parm>
        Diag.Debug.assertParamIsString(itemId, "itemId");

        var i, l;
        for (i = 0, l = this._ids.length; i < l; i++) {
            if (this._ids[i] === itemId) {
                return i;
            }
        }
    }

    protected validateModel() {
        /// <summary>Validates feedback request items.</summary>
        this._errors.clear();

        var i, l,
            itemId,
            itemTitle,
            titleError;

        for (i = 0, l = this._ids.length; i < l; ++i) {
            itemId = this._ids[i];
            itemTitle = this.getValue(itemId).title;
            if (!itemTitle || itemTitle.length > WITOM.WorkItem.MAX_TITLE_LENGTH) {
                if (!titleError) {
                    titleError = { id: RequestItemsViewModel.REQUEST_ITEM_TITLE_FIELD, invalidItems: [] };
                }

                Diag.Debug.assert(titleError, "titleError");
                titleError.invalidItems.push(itemId);
            }
        }

        if (titleError) {
            this._errors.add(titleError);
        }

        this._raiseModelValidated(this._errors);
    }
}

VSS.initClassPrototype(RequestItemsViewModel, {
    _options: null,
    _events: null,
    _ids: null,
    _items: null,
    _idCount: 0,
    _errors: null
});



export class RequestViewModel {
    public static EVENT_PAGE_CHANGED: string = "page-changed";
    public static EVENT_FIELD_CHANGED: string = "field-changed";
    public static EVENT_VALIDATION_ERRORS: string = "validation-errors";
    public static EVENT_BEGIN_OPERATION: string = "begin-operation";
    public static PAGE_INDEX_REQUEST: number = 1;
    public static PAGE_INDEX_PREVIEW: number = 2;
    public static PAGE_INDEX_MIN: number = 1;
    public static PAGE_INDEX_MAX: number = 2;
    public static IDENTITIES_FIELD: string = "VSS.Requirements.Feedback.Identitites";
    public static VALIDATED_IDENTITIES_FIELD: string = "VSS.Requirements.Feedback.ValidatedIdentities";
    public static INVALID_IDENTITIES_FIELD: string = "VSS.Requirements.Feedback.InvalidIdentities";
    public static APP_TYPE_FIELD: string = "VSS.Requirements.Feedback.AppType";
    public static APP_LAUNCH_INSTR_FIELD: string = "VSS.Requirements.Feedback.AppLaunchInstructions";
    public static APP_LAUNCH_URL_FIELD: string = "VSS.Requirements.Feedback.AppStartInfo";
    public static REQUEST_ITEMS_FIELD: string = "VSS.Requirements.Feedback.RequestItem";
    public static TO_FIELD: string = "VSS.Requirements.Feedback.To";
    public static FROM_FIELD: string = "VSS.Requirements.Feedback.From";
    public static SUBJECT_FIELD: string = "VSS.Requirements.Feedback.Subject";
    public static BODY_FIELD: string = "VSS.Requirements.Feedback.Body";
    public static EMAIL_ADDRESS_SEPARATOR: string = ",";
    public static APP_TYPE_WEB_APP: string = "WebApp";
    public static APP_TYPE_REMOTE_MACHINE: string = "RemoteMachine";
    public static APP_TYPE_CLIENT_APP: string = "ClientApp";
    public static INSTALL_FEEDBACK_TOOL_URL: string = "https://go.microsoft.com/fwlink/?LinkId=230568";
    public static START_SESSION_LINK_ID: string = "start-session-link";
    public static START_SESSION_LINK_URL_ID: string = "start-session-link-url";

    protected _options: any;
    protected _configuration: any;
    protected _errors: any;
    protected _operationInProgress: any;
    protected _team: string;
    private _events: Events_Handlers.NamedEventCollection<RequestViewModel, any>;
    private _requestItemsViewModel: any;
    private _fieldValues: any;
    private _isDirty: any;
    private _isPrepared: any;
    private _trackDirtyState: any;
    private _recipientEmailToTfIdCache: any;
    private _pageIndex: any;
    
    constructor (options? ) {
        /// <summary>Creates a new instance of the Feedback Request view model with the specified options.</summary>
        /// <param name="options">Additional options.</param>

        this._options = $.extend({}, options);
        this._initialize();
    }

    public getPageIndex() {
        /// <summary>Gets the current page index.</summary>
        return this._pageIndex;
    }

    public attachPageChanged(handler) {
        /// <summary>Attaches the specified handler to the "page changed" event.</summary>
        /// <param name="handler">A function invoked when the "page changed" event is fired.</param>

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._events.subscribe(RequestViewModel.EVENT_PAGE_CHANGED, handler);
    }

    public attachFieldChanged(handler) {
        /// <summary>Attaches the specified handler to the "field changed" event.</summary>
        /// <param name="handler">A function invoked when the "field changed" event is fired.</param>

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._events.subscribe(RequestViewModel.EVENT_FIELD_CHANGED, handler);
    }

    public attachModelValidated(handler) {
        /// <summary>Attaches the specified handler to the "validation errors" event.</summary>
        /// <param name="handler">A function invoked when the "validation errors" event is fired.</param>

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._events.subscribe(RequestViewModel.EVENT_VALIDATION_ERRORS, handler);
    }

    public attachBeginOperation(handler) {
        /// <summary>Attaches the specified handler to the "begin operation" event.</summary>
        /// <param name="handler">A function invoked when the "begin operation" event is fired.</param>

        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._events.subscribe(RequestViewModel.EVENT_BEGIN_OPERATION, handler);
    }

    public canMoveForward() {
        /// <summary>Gets a boolean value indicating whether it is possible to move forward in the request process.</summary>
        return (this._pageIndex < RequestViewModel.PAGE_INDEX_MAX) &&
                !this._hasPageSpecificValidationError(this._pageIndex) &&
                !this._operationInProgress;
    }

    public canMoveBackward() {
        /// <summary>Gets a boolean value indicating whether it is possible to move backward in the request process.</summary>
        return (this._pageIndex > RequestViewModel.PAGE_INDEX_MIN &&
                !this._operationInProgress);
    }

    public beginNavigateForward(completionCallback, errorCallback? ) {
        /// <summary>Moves forward one page to the next immediate page if possible.</summary>

        var that = this;

        function completed() {
            if ($.isFunction(completionCallback)) {
                completionCallback.call(that);
            }
        }

        if (this.canMoveForward()) {
            if (this._pageIndex === RequestViewModel.PAGE_INDEX_REQUEST) {
                // TODO [ryanvog]: refactor into a base implementation and a derived implementation.
                this._beginValidateIdentities(function () {
                    if (that.canMoveForward()) {
                        that._incrementPageIndex();
                        completed();
                    }
                }, errorCallback);
            }
            else {
                this._incrementPageIndex();
                completed();
            }
        }
        else {
            completed();
        }
    }

    public navigateBackward() {
        /// <summary>Moves backward one page to the previous immediate page if possible.</summary>

        if (this.canMoveBackward()) {
            this._decrementPageIndex();
        }
    }

    public canFinish() {
        /// <summary>Gets a boolean value indicating whether the wizard can complete.</summary>

        return (!this._hasPageSpecificValidationError(this._pageIndex) &&
                !this._operationInProgress);
    }

    public beginFinish(completionCallback, errorCallback? ) {
        /// <summary>Begins the completion process for the dialog by validating identities if necessary before
        /// submitting the request for feedback.</summary>

        var that = this;

        if (this.canFinish()) {
            if (this._pageIndex === RequestViewModel.PAGE_INDEX_REQUEST) {
                // Identities will be validated before completing the process.
                this._beginValidateIdentities(function () {
                    var initialIdentities = that.getValue(RequestViewModel.IDENTITIES_FIELD),
                        hasNoIdentities = !initialIdentities || (initialIdentities.length === 0);

                    if (that._errors.getById(RequestViewModel.INVALID_IDENTITIES_FIELD) || hasNoIdentities) {
                        that._setPageIndex(RequestViewModel.PAGE_INDEX_PREVIEW);
                    }
                    else {
                        that.beginPrepareRequest(function () {
                            that.beginSendRequest(completionCallback, errorCallback);
                        }, errorCallback);
                    }
                }, errorCallback);
            }
            else {
                this.beginSendRequest(completionCallback, errorCallback);
            }
        }
    }

    public showConfigurationErrorMessage(errorCallback? , isAdmin?: boolean, isInvalid?: boolean) {
        /// <summary>Shows the configuration error message</summary>
        /// <param name="isAdmin" type="boolean">Does the user have administrative privileges?</param>
        /// <param name="isInvalid" type="boolean">Are the project settings invalid?</param>
        Diag.Debug.assertParamIsFunction(errorCallback, "errorCallback");
        Diag.Debug.assertParamIsBool(isAdmin, "isAdmin");
        Diag.Debug.assertParamIsBool(isInvalid, "isInvalid");

        if (isAdmin) {
            if (isInvalid) {
                errorCallback(VSS_Resources_Common.FeatureEnablementSettings_Error_Invalid_Admin,
                    {
                        linkText: VSS_Resources_Common.FeatureEnablementSettings_Error_LinkText_Invalid_Admin,
                        linkTarget: VSS_Resources_Common.FeatureEnablementSettings_Error_Link_Invalid_Admin
                    });
            }
            else {
                errorCallback(VSS_Resources_Common.FeatureEnablementSettings_Error_Missing_Admin,
                    {
                        linkText: VSS_Resources_Common.FeatureEnablementSettings_Error_LinkText_Missing_Admin,
                        linkTarget: this._getEnableFeaturesUrl()
                    });
            }
        }
        else {
            if (isInvalid) {
                errorCallback(VSS_Resources_Common.FeatureEnablementSettings_Error_Invalid);
            }
            else {
                errorCallback(VSS_Resources_Common.FeatureEnablementSettings_Error_Missing);
            }
        }
    }

    public beginGetConfiguration(completionCallback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Begins the process of asynchronously fetching the required portion of the project/team configuration
        /// from the server.</summary>
        /// <param name="completionCallback" type="IResultCallback">A function invoked when the service returns (or a cached result is used).</param>
        /// <param name="errorCallback" type="IErrorCallback">A function invoked if an error is thrown.</param>

        Diag.Debug.assertParamIsFunction(completionCallback, "completionCallback");

        if (!this._configuration) {
            var that = this,
                onGetConfigurationCompleted;

            onGetConfigurationCompleted = function (configuration) {
                Diag.Debug.assertIsObject(configuration, "Configuration was not returned");

                if (configuration.error) {
                    that.showConfigurationErrorMessage(errorCallback, configuration.hasFeatureEnablePermission, configuration.invalidProjectSettings);
                }
                else {
                    that._configuration = configuration;

                    if (!(configuration &&
                    configuration.feedbackRequestWorkItemTypeName &&
                    configuration.applicationTypeFieldName &&
                    configuration.applicationLaunchInstructionsFieldName &&
                    configuration.applicationStartInformationFieldName &&
                    configuration.applicationTypes &&
                    configuration.applicationTypes.webApplication &&
                    configuration.applicationTypes.remoteMachine &&
                    configuration.applicationTypes.clientApplication)) {

                        Diag.Debug.fail("Invalid configuration received from server");

                        if ($.isFunction(errorCallback)) {
                            errorCallback.call(this, new Error(FeedbackResources.ReadFeedbackConfigurationFailed));
                        }
                    }
                    else {
                        completionCallback.call(this);
                    }
                }

                Diag.logTracePoint("RequestViewModel.getConfiguration.completed");
            };

            Ajax.getMSJSON(this._getFeedbackActionUrl("configuration", { teamId: this._team }), {},
                delegate(this, onGetConfigurationCompleted),
                transformError(errorCallback, FeedbackResources.ReadFeedbackConfigurationFailed));
        }
        else {
            completionCallback.call(this);
        }
    }

    public beginGetShouldShowAds(completionCallback: IResultCallback, errorCallback?: IErrorCallback) {
        Ajax.getMSJSON(this._getFeedbackActionUrl("ShouldShowAds"), {},
            completionCallback,
            errorCallback);

    }

    public getRequestItems() {
        /// <summary>Creates a Request items view model</summary>
        /// <returns>A RequestItemsViewModel object.</return>
        return this._requestItemsViewModel;
    }

    public setTrackDirtyState(trackDirtyState: boolean) {
        /// <summary>Sets the model to start tracking dirty state.</summary>
        /// <param name="trackDirtyState" type="Boolean"><c>true<c> if the model shall start tracking.</param>
        Diag.Debug.assertParamIsBool(trackDirtyState, "trackDirtyState");

        this._trackDirtyState = trackDirtyState;
    }

    public beginSendRequest(completionCallback, errorCallback? ) {
        /// <summary>Begins the process of asynchronously building and sending the request for feedback
        /// calling the specified <b>completionCallback</b> upon successful completion or <b>errorCallback</b> upon 
        /// encountering an error.</summary>

        var that = this,
            to,
            text,
            onSendMailCompleted,
            onWorkItemsCreated,
            onLinksCreated,
            onGetConfigurationCompleted,
            workItemCreator,
            workItemData,
            createdWorkItems,
            nonFatalErrorCallback,
            wrappedErrorCallback;

        Diag.logTracePoint("RequestViewModel.beginSendRequest.started");

        wrappedErrorCallback = function (error) {
            that._operationInProgress = false;

            if ($.isFunction(errorCallback)) {
                errorCallback.call(this, error);
            }
        };

        nonFatalErrorCallback = transformError(errorCallback, function (error) {
            that._operationInProgress = false;
            error.isNonFatal = true;
            return error;
        });

        onSendMailCompleted = function () {
            Diag.logTracePoint("RequestViewModel.beginSendMail.completed");
            Diag.logTracePoint("RequestViewModel.beginSendRequest.completed");

            that._operationInProgress = false;

            to = that.getValue(RequestViewModel.TO_FIELD);
            text = Utils_String.format(FeedbackResources.EmailSentTo, to);

            workItemCreator.beginUpdateWorkItemHistory(
                            createdWorkItems,
                            text,
                            delegate(that, completionCallback),
                            delegate(that, nonFatalErrorCallback));

            //send customer intelligence event back
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty("Microsoft.VisualStudio.Service.Account", "TraceAccount", "Action", "RequestFeedbackCompleted"));

        };

        onLinksCreated = function () {
            Diag.logTracePoint("RequestViewModel.beginCreateWorkItems.completed");

            Diag.logTracePoint("RequestViewModel.beginSendMail.started");

            this.beginSendMail(
                createdWorkItems,
                delegate(this, onSendMailCompleted),
                delegate(this, nonFatalErrorCallback));
        };

        onWorkItemsCreated = function (feedbackWorkItems) {
            createdWorkItems = feedbackWorkItems;

            // Now that the process is complete, reset the state of the model
            // The state is reset here instead of later in the process because from here
            // on out, exceptions thrown are non-fatal which will cause the dialog to close.
            this._setDirty(false);

            // TODO [ryanvog]: When Web access shores up support for notifications, 
            // update this call.
            // Notify any listening notification areas that the work items were created.
            var messageElement = this._buildWorkItemsCreatedMessage(createdWorkItems);
            $(window).trigger("message-available", { messageElement: messageElement });

            workItemCreator.beginLinkRelatedWorkItems(
                createdWorkItems,
                delegate(this, onLinksCreated),
                delegate(this, nonFatalErrorCallback));
        };

        onGetConfigurationCompleted = function () {
            Diag.Debug.assertIsObject(this._configuration, "Configuration was not initialized");

            var emailBody = this.getValue(RequestViewModel.BODY_FIELD),
                maxCharsInEmailBody = this._configuration.maxCharsInEmailBody,
                bytesPerChar = this._configuration.bytesPerChar;

            Diag.Debug.assert(typeof emailBody === "string", "email body is not a string");
            Diag.Debug.assert(typeof maxCharsInEmailBody === "number", "maxCharsInEmailBody is not a number");
            Diag.Debug.assert(typeof bytesPerChar === "number", "bytesPerChar is not a number");

            // Early validation of the email body size:
            //     The email body at this stage is still not the final version, but its size is close to the final one's.
            // Trying the size check here so as to avoid unnecessary server calls.
            if (emailBody.length > maxCharsInEmailBody) {
                wrappedErrorCallback(Utils_String.format(VSS_Resources_Common.EmailExceedsMaxBodySizeLimit, maxCharsInEmailBody * bytesPerChar / 1024));
                return;
            }

            workItemCreator = new FeedbackWorkItemCreator(this._configuration);
            workItemData = this._getWorkItemData();

            Diag.logTracePoint("RequestViewModel.beginCreateWorkItems.started");
            workItemCreator.beginCreateWorkItems(
                workItemData,
                delegate(this, onWorkItemsCreated),
                delegate(this, wrappedErrorCallback));
        };

        this._operationInProgress = true;
        this._raiseBeginOperation();

        this.beginGetConfiguration(
            delegate(this, onGetConfigurationCompleted),
            delegate(this, wrappedErrorCallback));
    }

    public beginPrepareRequest(completionCallback, errorCallback? ) {
        /// <summary>Prepares for the submission of a feedback request by gathering all the 
        /// information needed to send mail and create feedback request work item(s).</summary>

        var that = this;

        // Clear out any previously validated identities before re-validating.
        // [TODO: ryanvog] We may want to be more intelligent here and only clear the cache if something changed.
        this.clearPreviewFields();
        this._recipientEmailToTfIdCache = {};

        this._beginReadIdentities(function (validIdentities) {
            that._prepareMail(validIdentities);

            if ($.isFunction(completionCallback)) {
                completionCallback.call(that, validIdentities);
            }
        }, errorCallback);
    }

    public isDirty() {
        /// <summary>Gets a boolean value indicating whether the model is in a dirty state.</summary>
        return this._isDirty;
    }

    public getValue(fieldName) {
        /// <summary>Gets the value of the specified field name or undefined if not found.</summary>
        /// <param name="fieldName">The reference name of the field value to get.</param>
        Diag.Debug.assertParamIsString(fieldName, "fieldName");
        return this._fieldValues[fieldName];
    }

    public setValue(fieldName, value) {
        /// <summary>Sets the value of the specified fieldName to the specified value.</summary>
        /// <param name="fieldName">The reference name of the field value to set.</param>
        /// <param name="value">The new value of the field.</param>

        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        var oldValue = this._fieldValues[fieldName];

        if (WITOM.Field.compareValues(oldValue, value)) {
            return false;
        }

        this._fieldValues[fieldName] = value;
        this._setDirty(true);
        this._raiseFieldChanged(value);

        this.validateModel();

        return true;
    }

    public isReadOnly(fieldName) {
        /// <summary>Gets whether a field should be read-only in the view.</summary>
        /// <param name="fieldName">The reference name of the field value to set.</param>
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        if (fieldName === RequestViewModel.TO_FIELD) {
            return tfsContext.isHosted;
        }
        else {
            return true;
        }
    }

    public clearValue(fieldName) {
        /// <summary>Clears the value of the specified fieldName if it is present.</summary>
        /// <param name="fieldName">The reference name of a field.</param>
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        delete this._fieldValues[fieldName];
    }

    public getErrors() {
        /// <summary>Gets the validation errors.</summary>
        return this._errors;
    }

    public isInOperation() {
        /// <summary>Returns TRUE if the model is currently executing a long running operation, FALSE otherwise.</summary>
        return this._operationInProgress;
    }

    public _generateEmailPreview() {
        /// <summary>Generates the initial email preview based on the currently captured request information</summary>
        /// <returns>A jQuery element for the HTML content of the email preview.</return>

        var resultHtml,
            template = FeedbackResources.FeedbackEmailTemplate,
            displayName = TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.displayName,
            items = this.getRequestItems().getFeedbackRequestItems(),
            data = {
                FeedbackResources: FeedbackResources,
                FeedbackItems: items,
                Name: displayName,
                InstallFeedbackToolUrl: RequestViewModel.INSTALL_FEEDBACK_TOOL_URL,

                // This is a "reasonable" URL to be used at preview time only. The final URL will be auto calculated
                // once work items are created (it requires work item ids in its query string)
                StartFeedbackSessionUrl: RequestViewModel.INSTALL_FEEDBACK_TOOL_URL
            };

        Diag.logVerbose("Generating email preview");
        // Ideally, we'd use jQuery Templates but we don't have support for them yet
        resultHtml = TemplateEngine.tmpl(template, data);
        return $(resultHtml);
    }

    protected beginSendMail(feedbackWorkItems, completionCallback, errorCallback?) {
        /// <summary>Begins sending an email notificaiton to the appropriate stakeholders and feedback requester.</summary>

        var to = this.getValue(RequestViewModel.TO_FIELD),
            subject = this.getValue(RequestViewModel.SUBJECT_FIELD),
            body = this.getValue(RequestViewModel.BODY_FIELD),
            titles = this._getFeedbackTitles(),
            feedbackIds = this._getFeedbackWorkitemIds(feedbackWorkItems),
            actionUrl = this.getRequirementsSendMailUrl(),
            myId = { tfids: [TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.id] },
            parameters,
            recipients;

        // Now that we know the final work items, we have to replace the start session URL with the proper
        // work item ids
        body = this._updateEmailBody(body, feedbackWorkItems);
        if (body !== null && body !== undefined && body.length > 1024) {
            body = body.substring(0, 1024);
        }

        Diag.Debug.assert(to, "To address is required");
        recipients = this._jsonifyRecipients(to);

        parameters = {
            message: Utils_Core.stringifyMSJSON({
                to: recipients,
                cc: myId,
                replyTo: myId,
                subject: subject,
                body: body
            }),
            titles: titles,
            feedbackIds: feedbackIds
        };

        Ajax.postMSJSON(actionUrl, parameters, completionCallback,
            transformError(errorCallback, FeedbackResources.FeedbackRequestEmailFailed));
    }

    protected clearPreviewFields(): void {
        this.clearValue(RequestViewModel.TO_FIELD);
        this.clearValue(RequestViewModel.SUBJECT_FIELD);
        this.clearValue(RequestViewModel.BODY_FIELD);
    }

    protected initializeRequestItems(): void {
        this._requestItemsViewModel = new RequestItemsViewModel();
        this._requestItemsViewModel.attachModelValidated(delegate(this, this._handleRequestItemsValidated));
    }

    protected _raiseModelValidated(errors) {
        /// <summary>Notifies listeners that a validation error has been raised.</summary>

        Diag.Debug.assertParamIsObject(errors, "errors");

        this._events.invokeHandlers(RequestViewModel.EVENT_VALIDATION_ERRORS, this, errors);
    }

    protected _raiseBeginOperation() {
        /// <summary>Notifies listeners that a "begin operation" event has been raised.</summary>

        this._events.invokeHandlers(RequestViewModel.EVENT_BEGIN_OPERATION, this);
    }

    protected hasIndexPageValidationError(): boolean {
        return ((this._errors.getById(RequestViewModel.IDENTITIES_FIELD) ||
            this._errors.getById(RequestViewModel.APP_LAUNCH_URL_FIELD)) ||
            this._requestItemsViewModel.hasErrors());
    }

    protected setDefaultSubject(): void {
        this.setValue(RequestViewModel.SUBJECT_FIELD, Utils_String.format(FeedbackResources.DefaultEmailSubject,
            tfsContext.currentIdentity.displayName,
            tfsContext.navigation.project));
    }

    protected _jsonifyRecipients(toEmailAddresses) {
        /// <summary>Converts a string of email addresses to a JSON object of feedback recipients
        /// in the following format:
        /// {
        ///     tfids: [], // array of tfids of the recipients
        ///     emailAddresses: [] // array of plaintext email addresses
        /// }
        ///
        /// Note: Email addresses matching cached tfs user identity will be replaced with the corresponding tfids.
        /// </summary>
        Diag.Debug.assertParamIsString(toEmailAddresses, "toEmailAddresses");
        var toAddresses = TFS_Core_Utils.parseEmailAddressesStringToArray(toEmailAddresses),
            tfids = [], emailAddresses = [],
            toAddress, i, l, tfid;

        for (i = 0, l = toAddresses.length; i < l; i += 1) {
            toAddress = $.trim(toAddresses[i]);
            tfid = (Boolean)(this._recipientEmailToTfIdCache) ? this._recipientEmailToTfIdCache[toAddress] : null;

            if (tfid) {
                tfids.push(tfid);
            }
            else {
                emailAddresses.push(toAddress);
            }
        }

        return { tfIds: tfids, emailAddresses: emailAddresses };
    }

    protected validateModel() {
        /// <summary>Validates the current model state, generating an ID-ordered list of errors.</summary>

        this._errors.clear();

        var errors = [],
            toAddresses,
            appLaunchUrl,
            requestItemsErrors;

        appLaunchUrl = this.getValue(RequestViewModel.APP_LAUNCH_URL_FIELD);
        if (!appLaunchUrl || appLaunchUrl.length > WITOM.WorkItem.MAX_TITLE_LENGTH) {
            errors.push({ id: RequestViewModel.APP_LAUNCH_URL_FIELD });
        }

        toAddresses = this.getValue(RequestViewModel.TO_FIELD);
        if (!toAddresses) {
            errors.push({ id: RequestViewModel.TO_FIELD });
        }

        var message;
        var invalidIdentities = this.getValue(RequestViewModel.INVALID_IDENTITIES_FIELD) == null ? [] : this.getValue(RequestViewModel.INVALID_IDENTITIES_FIELD);
        if (invalidIdentities.length > 0) {
            if (this.isReadOnly(RequestViewModel.TO_FIELD)) {
                message = Utils_String.format(FeedbackResources.FeedbackRequest_Error_FailedProvidersReselectOnly, invalidIdentities.join(", "));
            }
            else {
                message = Utils_String.format(FeedbackResources.FeedbackRequest_Error_FailedProviders, invalidIdentities.join(", "));
            }

            errors.push({
                id: RequestViewModel.INVALID_IDENTITIES_FIELD,
                message: message
            });
        }

        this._errors.addRange(errors);
        requestItemsErrors = this._requestItemsViewModel.getErrors().getItems();
        this._errors.addRange(requestItemsErrors);
        this._raiseModelValidated(this._errors);
    }

    private _initialize() {
        /// <summary>Initializes the model setting up the default state.</summary>

        this._events = new Events_Handlers.NamedEventCollection();
        this._errors = new ErrorManager();
        this._fieldValues = {};
        this._operationInProgress = false;
        this._trackDirtyState = false;
        this._team = this._options.team;

        this.initializeRequestItems();
        this._setPageIndex(RequestViewModel.PAGE_INDEX_MIN);
        this.validateModel();
    }

    private _raisePageChanged() {
        /// <summary>Notifies listeners that a change has been made to the page index.</summary>

        this._events.invokeHandlers(RequestViewModel.EVENT_PAGE_CHANGED, this, {
            pageIndex: this._pageIndex
        });
    }

    private _raiseFieldChanged(oldValue?: any, newValue?: any) {
        /// <summary>Notifies listeners that a change has been made to a field.</summary>
        /// <param name="oldValue" type="any" optional="true" />
        /// <param name="newValue" type="any" optional="true" />

        this._events.invokeHandlers(RequestViewModel.EVENT_FIELD_CHANGED, this, {
            newValue: newValue
        });
    }

    private _incrementPageIndex() {
        /// <summary>Increments the value of the page index firing a page changed event.</summary>
        this._setPageIndex(this._pageIndex + 1);
    }

    private _decrementPageIndex() {
        /// <summary>Decrements the value of the page index firing a page changed event.</summary>
        this._setPageIndex(this._pageIndex - 1);
    }

    private _setPageIndex(index: number) {
        /// <summary>Sets the page index to the specified index value.</summary>
        /// <param name="index" type="Number">The new page index.</param>

        Diag.Debug.assertParamIsNumber(index, "index");
        Diag.Debug.assert(index >= RequestViewModel.PAGE_INDEX_MIN && index <= RequestViewModel.PAGE_INDEX_MAX, "Page index out of range");

        this._pageIndex = index;
        Diag.logTracePoint("RequestViewModel.pageChanged");
        this._raisePageChanged();
    }

    private _handleRequestItemsValidated(sender, errors) {
        /// <summary>Handles when the request items model is validated.</summary>
        this.validateModel();
    }

    private _convertToApplicationType(uiApplicationType) {
        /// <summary>Converts a UI application type value into the actual field value to be used for work item creation.</summary>
        var appType;

        Diag.Debug.assertParamIsString(uiApplicationType, "uiApplicationType");
        Diag.Debug.assertIsObject(this._configuration, "Configuration was not initialized");

        switch (uiApplicationType) {
            case RequestViewModel.APP_TYPE_WEB_APP:
                appType = this._configuration.applicationTypes.webApplication;
                break;
            case RequestViewModel.APP_TYPE_REMOTE_MACHINE:
                appType = this._configuration.applicationTypes.remoteMachine;
                break;
            case RequestViewModel.APP_TYPE_CLIENT_APP:
                appType = this._configuration.applicationTypes.clientApplication;
                break;
            default:
                Diag.Debug.fail("Unknown app type value");
        }

        Diag.Debug.assert(appType, "Could not map application type");

        return appType;
    }

    private _getWorkItemData() {
        /// <summary>Generates an array of work item data that will be used to create feedback work items and
        /// generated the preview email.</summary>
        Diag.Debug.assertIsObject(this._configuration, "Configuration was not initialized");

        var appStartInfo = this.getValue(RequestViewModel.APP_LAUNCH_URL_FIELD),
            appTypeFieldValue = this.getValue(RequestViewModel.APP_TYPE_FIELD),
            appType = this._convertToApplicationType(appTypeFieldValue),
            appLaunchInstr = this.getValue(RequestViewModel.APP_LAUNCH_INSTR_FIELD),
            items = this.getRequestItems().getFeedbackRequestItems(),
            i, l,
            workItemData = [],
            normalizedTitle;

        for (i = 0, l = items.length; i < l; i += 1) {
            // Note: System.Title is not a long text field and should not conain special chars like such as /[\r\n\t]/.
            //   The following normalization pass is a simple fix to replace those limited invalid chars with space.
            normalizedTitle = WITOM.Field.normalizeStringValue(items[i].title || "");

            workItemData.push({
                title: normalizedTitle,
                applicationType: appType,
                applicationStartInfo: appStartInfo,
                applicationLaunchInstructions: appLaunchInstr,
                description: items[i].details,
                areaPath: this._configuration.teamDefaultAreaPath,
                iterationPath: this._configuration.teamCurrentIterationPath
            });
        }

        return workItemData;
    }

    private _setDirty(isDirty: boolean) {
        /// <summary>Sets the model to be dirty</summary>
        /// <param name="isDirty" type="Boolean"><c>true<c> if the model is dirty.</param>
        Diag.Debug.assertParamIsBool(isDirty, "isDirty");

        if (this._trackDirtyState) {
            this._isDirty = isDirty;
        }
    }

    private _buildWorkItemsCreatedMessage(createdWorkItems) {
        /// <summary>Builds a label including hyperlinks used to post to a notification source to show
        /// new work items created.</summary>
        /// <param name="createdWorkItems">An array of work items created in the request process.</param>
        /// <returns>A JQuery object containing the notification message.</returns>

        Diag.Debug.assertParamIsArray(createdWorkItems, "createdWorkItems");
        Diag.Debug.assert(createdWorkItems.length > 0, "No workItems in input list.  At least one workItem is expected.");

        var $item,
            feedbackItems;

        // TODO [ryanvog]: Remove the <LI> below when Web access adds better support for notifications.
        $item = $("<li class='message'>");

        feedbackItems = $.map(createdWorkItems, function (workItem, index) {
            return Utils_String.format("<a href='{0}' target='_blank'>{1}</a>",
                                 tfsContext.getActionUrl("edit", "workItems", { parameters: [workItem.id] }),
                                 workItem.id);
        }).join(FeedbackResources.WorkItemLinkSeparator);

        $item.html(Utils_String.format(FeedbackResources.FeedbackNotificationFormat, feedbackItems));

        return $item;
    }

    private _updateEmailBody(body: string, feedbackWorkItems: any[]) {
        /// <summary>Updates the initial template email body with the final well known start feedback session URL,
        /// which dependedn</summary>
        /// <param name="body" type="string">The initial email body (HTML).</param>
        /// <param name="feedbackWorkItems" type="array">An array of created feedback work items.</param>
        /// <returns>The updated email body.</returns>

        var workItemIds,
            $tempBody = $("<div/>"),
            startFeedbackSessionUrl,
            $startFeedbackSessionLink,
            $startFeedbackSessionLinkUrl;

        // Wrap the HTML body in a single div for search/replace purposes... This is ignored later.
        $tempBody.html(body);
        $startFeedbackSessionLink = $tempBody.find("a#" + RequestViewModel.START_SESSION_LINK_ID);
        $startFeedbackSessionLinkUrl = $tempBody.find("#" + RequestViewModel.START_SESSION_LINK_URL_ID);

        workItemIds = $.map(feedbackWorkItems, function (workItem, index) {
            return workItem.id;
        });

        startFeedbackSessionUrl = AlmUriBuilder.buildFeedbackClientUri(workItemIds);

        // Now that we know the final work items, we have to replace 
        if ($startFeedbackSessionLink.length > 0) {
            $startFeedbackSessionLink.attr("href", startFeedbackSessionUrl);
        }

        if ($startFeedbackSessionLinkUrl.length > 0) {
            $startFeedbackSessionLinkUrl.text(startFeedbackSessionUrl);
        }

        body = $tempBody.html();

        return body;
    }

    private _getFeedbackTitles() :string[] {
        var titles: string[] = new Array();
        var items = this.getRequestItems().getFeedbackRequestItems()
        var i: number;
        if (items !== undefined && items !== null) {
            for (i = 0; i < items.length; i++) {
                var normalizedTitle = WITOM.Field.normalizeStringValue(items[i].title || "");
                titles.push(normalizedTitle);
            }
        }
        return titles;
    }

    private _getFeedbackWorkitemIds(feedbackWorkItems: WITOM.WorkItem[]) {
        var ids: number[] = new Array();
        var i: number;
        if (feedbackWorkItems !== undefined && feedbackWorkItems !== null) {
            for (i = 0; i < feedbackWorkItems.length; i++) {
                var id = feedbackWorkItems[i].id;
                ids.push(id);
            }
        }
        return ids;
    }

    private _beginReadIdentities(completionCallback, errorCallback? ) {
        /// <summary>Asynchronously validates the set of added identities against the AD.</summary>

        var identities = this.getValue(RequestViewModel.IDENTITIES_FIELD);

        if (!identities || identities.length === 0) {
            if ($.isFunction(completionCallback)) {
                completionCallback.call(this);
            }

            return;
        }

        if (TFS_Requirements_Utils.CommonIdentityPickerHelper.featureFlagEnabled) {
            if ($.isFunction(completionCallback)) {
                completionCallback.call(this, identities);
            }
        }
        else {
            Ajax.postMSJSON(this._getCommonActionUrl("readIdentities"), { ids: identities, includePreferredEmail: true }, completionCallback, errorCallback);
        }
    }

    private _beginValidateIdentities(completionCallback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Validates that the current set of identities all have email addresses, 
        /// but unlike beginReadIdentities(), raises a validation error event if no identities 
        /// have valid email addresses.</summary>
        /// <param name="completionCallback" type="IResultCallback">A function callback invoked upon successful completion of the validation.</param>
        /// <param name="errorCallback" type="IErrorCallback">A function callback invoked upon error.</function>

        var that = this,
            failedIdentityNames = [],
            fatalError = false;

        this._beginReadIdentities(function (validIdentities) {

            var invalidIdentities = [],
                validatedIdentities = [],
                message,
                i, l;

            if (TFS_Requirements_Utils.CommonIdentityPickerHelper.featureFlagEnabled) {
                validatedIdentities = that.getValue(RequestViewModel.IDENTITIES_FIELD) == null ? [] : that.getValue(RequestViewModel.IDENTITIES_FIELD);
                invalidIdentities = that.getValue(RequestViewModel.INVALID_IDENTITIES_FIELD) == null ? [] : that.getValue(RequestViewModel.INVALID_IDENTITIES_FIELD);

                if (invalidIdentities && invalidIdentities.length > 0) {
                    $.each(invalidIdentities, function (index, identity) {
                        failedIdentityNames[failedIdentityNames.length] = identity;
                    });
                }
            }
            else {
                if ($.isArray(validIdentities) && validIdentities.length > 0) {
                    for (i = 0, l = validIdentities.length; i < l; i += 1) {
                        if (!validIdentities[i].preferredEmail) {
                            invalidIdentities.push(validIdentities[i]);
                        }
                        else {
                            validatedIdentities.push(validIdentities[i]);
                        }
                    }
                }

                if (invalidIdentities.length > 0) {
                    $.each(invalidIdentities, function (index, identity) {
                        failedIdentityNames[failedIdentityNames.length] = identity.displayName;
                    });
                }
            }

            if (invalidIdentities.length > 0) {
                if (that.isReadOnly(RequestViewModel.TO_FIELD)) {
                    message = Utils_String.format(FeedbackResources.FeedbackRequest_Error_FailedProvidersReselectOnly, failedIdentityNames.join(", "));
                }
                else {
                    message = Utils_String.format(FeedbackResources.FeedbackRequest_Error_FailedProviders, failedIdentityNames.join(", "));
                }

                that._errors.add({
                    id: RequestViewModel.INVALID_IDENTITIES_FIELD,
                    message: message
                });
            }

            // Record the list of validated identities so we don't have to parse the "TO" field.
            that.setValue(RequestViewModel.VALIDATED_IDENTITIES_FIELD, validatedIdentities);

            if (that._errors.getCount() > 0) {
                that._raiseModelValidated(that._errors);
            }

            if (!fatalError && $.isFunction(completionCallback)) {
                completionCallback.call(this);
            }

        }, errorCallback);
    }

    private _prepareMail(recipientIdentities: any[]) {
        /// <summary>Generates the fields necessary for the requesrt email and updates the model with the generated content.</summary>
        /// <param name="recipientIdentities" type="array">An list of rich identities retrieved from the server.</param>

        var that = this,
            sb = new Utils_String.StringBuilder(),
            firstTime = true,
            toAddresses,
            address,
            i, l;

		Diag.logVerbose("Building the TO list for the email");
        // Build the "To: " list 
        if (recipientIdentities) {
            for (i = 0, l = recipientIdentities.length; i < l; i += 1) {
                if (TFS_Requirements_Utils.CommonIdentityPickerHelper.featureFlagEnabled) {
                    address = recipientIdentities[i].signInAddress;
                }
                else {
                    address = recipientIdentities[i].preferredEmail;                
                }
                if (address) {
                    if (!firstTime) {
                        sb.append(RequestViewModel.EMAIL_ADDRESS_SEPARATOR);
                        sb.append(" ");
                    }

                    sb.append(address);
                    firstTime = false;

                    Diag.Debug.assertIsObject(this._recipientEmailToTfIdCache, "_recipientEmailToTfIdCache");
                    if (TFS_Requirements_Utils.CommonIdentityPickerHelper.featureFlagEnabled) {
                        this._recipientEmailToTfIdCache[address] = recipientIdentities[i].localId;
                    }
                    else {
                        this._recipientEmailToTfIdCache[address] = recipientIdentities[i].id;
                    }
                }
            }
        }

        toAddresses = sb.toString();

        if (toAddresses) {
            that.setValue(RequestViewModel.TO_FIELD, toAddresses);
        }
		
		Diag.logVerbose("Building Subject field");
        // Build the "Subject: " field
        // TODO: create getTFSContext() method that removes duplicated calls to VSS.HOST.TfsContext.getDefault() as well as the module-wide tfsContext variable
        that.setDefaultSubject();

        Diag.logVerbose("Building the body field");
        // Build the email "body" field. Setting the body to single space as if left blank the sendMail throws error and the body gets trimmed on server side so this is fine.
        that.setValue(RequestViewModel.BODY_FIELD, " ");
    }

    private _hasPageSpecificValidationError(pageIndex) {
        /// <summary>Returns true if the specified pageIndex contains a validation error preventing navigation, false if not.</summary>
        var rtnVal = false;

        Diag.Debug.assertParamIsNumber(pageIndex, "pageIndex");

        switch (pageIndex) {
            case RequestViewModel.PAGE_INDEX_REQUEST:
                rtnVal = this.hasIndexPageValidationError();
                break;
            case RequestViewModel.PAGE_INDEX_PREVIEW:
                rtnVal = (this._errors.getById(RequestViewModel.TO_FIELD));
                break;
            default:
                Diag.Debug.fail("Invalid page index");
                break;
        }

        return rtnVal;
    }

    private _getFeedbackActionUrl(action: string, params?: any) {
	    Diag.logVerbose("Getting the Feedback action url");
        /// <summary>Gets the API REST location for the feedback controller and specified action.</summary>
        return tfsContext.getActionUrl(action || "", "feedback", $.extend({ area: "api" }, params));
    }

    private _getEnableFeaturesUrl(): string {
        /// <summary>Gets the launch-anywhere feature enablement URL</summary>
        /// <returns type="String" />
        Diag.Debug.assert(Boolean(tfsContext.navigation.project), "Expected project context to build enable features URL");

        var actionUrl = tfsContext.getActionUrl(null, null, { team: null, area: "admin" });

        return actionUrl + Navigation_Services.getHistoryService().getFragmentActionLink("enableFeatures");
    }

    private _getCommonActionUrl(action) {
        /// <summary>Gets the API REST location for the common controller and specified action.</summary>
        return tfsContext.getActionUrl(action || "", "common", { area: "api" });
    }

    protected getRequirementsSendMailUrl() {
        /// <summary>Gets the MVC API location for the feedback controller to send mail.</summary>
        return tfsContext.getActionUrl("sendMail", "feedback", { area: "api"});
    }
}

VSS.initClassPrototype(RequestViewModel, {
    _options: null,
    _events: null,
    _requestItemsViewModel: null,
    _configuration: null,
    _fieldValues: null,
    _isDirty: null,
    _isPrepared: null,
    _errors: null,
    _operationInProgress: null,
    _trackDirtyState: null,
    _recipientEmailToTfIdCache: null,
    _pageIndex: null
});


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Requirements.Feedback.Models", exports);
