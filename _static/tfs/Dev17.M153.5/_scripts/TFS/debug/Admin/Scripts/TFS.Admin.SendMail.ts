/// <reference types="jquery" />
import "VSS/LoaderPlugins/Css!SendMail";
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import CoreDialogs = require("VSS/Controls/Dialogs");
import Notifications = require("VSS/Controls/Notifications");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Controls = require("VSS/Controls");
import RichEditor = require("VSS/Controls/RichEditor");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import Events_Document = require("VSS/Events/Document");
import Events_Handlers = require("VSS/Events/Handlers");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Controls = require("VSS/Identities/Picker/Controls");

var delegate = Utils_Core.delegate;
var TfsContext = TFS_Host_TfsContext.TfsContext;

export interface ISendMailDialogModelOptions {
    /**
     *   The editable part of the message body (default => "").
     */
    body?: string;
    /**
     *   The body appendix text field which appears under the body area (default => null).
     */
    bodyAppendixText?: string;
    /**
     *   Additional css class for the dialog model
     */
    cssClass?: string;
    /**
     *   Indicate whether to copy sender on CC (default => true).
     */
    ccSender?: boolean;
    /**
     *  Sets the default to address.  This can be an array of tuple(displayName, tfid, uniqueName) or a single displayName, email Address (or semi colon delimited list of recipients when using defaultToStringAllowsMultipleRecipients: true).
     */
    defaultTo?: Array<{ displayName: string, tfid: string, uniqueName: string }> | string;
    /**
     * while set to true and the defaultTo contains a semi colon delimitted list of recipients, the defaultTo will parse/validate and set those names.
     */
    defaultToStringAllowsMultipleRecipients?: boolean;
    /**
     *   The message id (optional).
     */
    messageId?: string;
    /**
     * When true, the identity picker will include groups (default => false)
     */
    includeGroups?: boolean;
    /**
     *   The in-reply-to header value (optional).
     */
    inReplyTo?: string;
    /**
     *   The read only part of the message body (default => "").
     */
    readOnlyBody?: string;
    /**
     * The label of read only section
     */
    readOnlyBodyLabel?: string;
    /**
     *   Indicate whether to make sender as "Reply-To" address (default => true).
     */
    replyToSender?: boolean;
    /**
     *   The to field of message (default => "").
     */
    to?: string;
    /**
     *   The message subject (default => "").
     */
    subject?: string;
    /**
     * Sets subject field is visible or not (default => true).
     */
    subjectVisible?: boolean;
    /**
     * The registry path for saved email recipients.
     */
    savedEmailRecipientsRegistryPath?: string;
    /**
     *   The title of the dialog (default => "Send Mail").
     */
    title?: string;
    /**
     *   The tfsContext (optional).
     */
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    /**
     *   Indicate whether to use the identity picker for the To field (default => false).
     */
    useIdentityPickerForTo?: boolean;
    /**
     *   Additional options to use with the identity picker when useIdentityPickerForTo is true
     */
    identityPickerOptions?: any;
    /**
     * Indicate whether to use the commonIdentityPicker.
     */
    useCommonIdentityPicker?: boolean;
    /**
     * Indicate whether the dialog should have resize handlers.
     */
    resizable?: boolean;
    /**
     * Indicate whether the dialog should resize automatically when content is loaded.
     */
    preventAutoResize?: boolean;
}

export interface IMessageObject {
    /**
     *   The message body.
     */
    body?: string;
    /**
     *   Indicate CC field value (optional).
     */
    cc?: IDictionaryStringTo<string[]>;
    /**
     *   The message id (optional).
     */
    messageId?: string;
    /**
     *   The in-reply-to header value (optional).
     */
    inReplyTo?: string;
    /**
     *   The reply-to header value (optional).
     */
    replyTo?: IDictionaryStringTo<string[]>;
    /**
     *   The message subject.
     */
    subject: string;
    /**
     *   The to field of message.
     */
    to: any;
}

export interface IEmailRecipients {
    /**
     *   The tfIds for existing users
     */
    tfIds: string[];
    /**
     *   The email address for new users
     */
    emailAddresses: string[];
    /**
     *   The unresolved entity ids for AAD users
     */
    unresolvedEntityIds: string[];
}

export abstract class SendMailDialogModel {

    public static EVENT_MODEL_VALIDATED: string = "model-validated";
    public static TO_FIELD: string = "VSS.SendMail.To";
    public static SUBJECT_FIELD: string = "VSS.SendMail.Subject";
    public static BODY_FIELD: string = "VSS.SendMail.Body";
    public static BODY_FIELD_TRUNCATED: string = "VSS.SendMail.BodyTruncated";
    public static READ_ONLY_BODY_FIELD: string = "VSS.SendMail.ReadOnlyBody";
    public static IDENTITIES_FIELD: string = "VSS.SendMail.Identitites";

    private _options: ISendMailDialogModelOptions;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _fieldValues: IDictionaryStringTo<any>;
    private _isValid: boolean;
    private _isDirty: boolean;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    public _trackDirtyState: boolean;

    constructor(options?: ISendMailDialogModelOptions) {
        /// <summary>SendMailDialogModel constructor.</summary>
        /// <param name="options" type="SendMailDialogModelOptions"/>
        /// <remarks>This is the default/base model for the SendMailDialog. You may override
        /// the "virtual" methods in your child class implementation to customize the dialog behavior.
        /// </remarks>
        this._options = $.extend({
            title: AdminResources.SendMailTitle,
            to: "",
            subject: "",
            body: "",
            readOnlyBody: "",
            useIdentityPickerForTo: false,
            identityPickerOptions: null,
            ccSender: true,
            replyToSender: true,
            bodyAppendixText: null
        }, options);

        this._initialize();
    }

    public ciOnCancel() {
        //stub to be overriden in subclass
    }

    public ciOnSend() {
        //stub to be overridden in subclass
    }

    public beginInitialize(successCallback: Function, errorCallback?: Function) {
        /// <summary>Begin initialize the model.</summary>
        /// <param name="successCallback" type="Function">The success callback function.</param>
        /// <param name="errorCallback" type="Function">[optional]The error callback function.</param>
        Diag.Debug.assertParamIsFunction(successCallback, "successCallback");

        var options = this._options;
        var mailSettings = this._tfsContext.configuration.getMailSettings();

        if (!mailSettings || !mailSettings.enabled) {
            if ($.isFunction(errorCallback)) {
                errorCallback({ message: VSS_Resources_Common.SendMailNotEnabled });
                return;
            }
        }

        // Note: we don't want to trigger unnecessary model validation before
        //   all fields are initialized. Thus, only setting the last field in
        //   the model, i.e. body, is required to trigger validation.

        if (!options.useIdentityPickerForTo) {
            this.setValue(SendMailDialogModel.TO_FIELD, options.to, true);
        }
        this.setValue(SendMailDialogModel.SUBJECT_FIELD, options.subject, true);
        this.setValue(SendMailDialogModel.BODY_FIELD, options.body);
        this.setValue(SendMailDialogModel.READ_ONLY_BODY_FIELD, options.readOnlyBody);
        this.initializeModelData(successCallback, errorCallback);
    }

    public initializeModelData(successCallback: Function, errorCallback?: Function) {
        /// <summary>Initialize the model.</summary>
        /// <param name="successCallback" type="Function">The success callback function.</param>
        /// <param name="errorCallback" type="Function" optional="true">The error callback function.</param>
        /// <remarks>Override this method if a custom model has different initialization logic.</remarks>
        if ($.isFunction(successCallback)) {
            successCallback();
        }

        // Only start tracking dirty state when we are fully initialized.
        this._trackDirtyState = true;
    }

    public setValue(fieldName, value, suppressValidation?: boolean) {
        /// <summary>Sets the value of the specified fieldName to the specified value.</summary>
        /// <param name="fieldName">The reference name of the field value to set.</param>
        /// <param name="value">The new value of the field.</param>
        /// <param name="suppressValidation" type="Bool" optional="true"><c>true</c> to suppress model validation; otherwise, <c>false</c>.</param>
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        var oldValue = this._fieldValues[fieldName];

        if (this._compareValues(oldValue, value)) {
            return false;
        }

        this._fieldValues[fieldName] = value;

        // Only the subject and body fields are considered to be the content and tracked with dirty state.
        switch (fieldName) {
            case SendMailDialogModel.SUBJECT_FIELD:
            case SendMailDialogModel.BODY_FIELD:
                this.setDirty(true);
                break;
        }

        if (!suppressValidation) {
            this.validate();
        }
        return true;
    }

    public getValue(fieldName) {
        /// <summary>Gets the value of the specified field name or undefined if not found.</summary>
        /// <param name="fieldName">The reference name of the field value to get.</param>
        Diag.Debug.assertParamIsString(fieldName, "fieldName");
        return this._fieldValues[fieldName];
    }

    public isDirty(): boolean {
        /// <summary>Checks if the model is dirty.</summary>
        /// <returns type="Boolean" />
        return this._isDirty;
    }

    public getTitle(): string {
        /// <summary>Gets the title/caption of the dialog</summary>
        /// <returns type="String" />
        return this._options.title;
    }

    public getBodyAppendixText(): string {
        /// <summary>Gets optional message that appears after the body field</summary>
        return this._options.bodyAppendixText;
    }

    public getSubject(): string {
        /// <summary>Gets the subject of the email</summary>
        return this._options.subject;
    }

    public setSubject(subject: string) {
        /// <summary>Sets the subject of the email</summary>
        this._options.subject = subject;
    }

    //default implementation, can be replaced by subclass
    public sendMessage(successFunction, errorFunction) {
        TFS_Core_Ajax.postMSJSON(this.getEndPoint(), this.getMessageParams(), successFunction, errorFunction);
    }

    public abstract getEndPoint();

    public getMessageParams() {
        return { message: Utils_Core.stringifyMSJSON(this.getMessage()) };
    }

    public useIdentityPickerForTo(): boolean {
        /// <summary>Gets whether to use identity picker for the to field.</summary>
        return this._options.useIdentityPickerForTo;
    }

    public identityPickerOptions() {
        return this._options.identityPickerOptions;
    }

    public validate() {
        /// <summary>Validates the model.</summary>
        var errors = [],
            hasToIdentities = false,
            identityListValues: AdminCommon.IdentityListValues;

        this._isValid = false;

        if (!this._options.useIdentityPickerForTo) {
            hasToIdentities = TFS_Core_Utils.parseEmailAddressesStringToArray(this.getValue(SendMailDialogModel.TO_FIELD)).length > 0;
        }
        else {
            identityListValues = this.getValue(SendMailDialogModel.IDENTITIES_FIELD);
            if (identityListValues) {
                hasToIdentities = identityListValues.newUsers.length > 0 || identityListValues.existingUsers.length > 0 || identityListValues.unresolvedEntityIds.length > 0;
            }
        }
        if (!hasToIdentities) {
            errors.push({});
        }

        if (this.getValue(SendMailDialogModel.BODY_FIELD_TRUNCATED)) {
            errors.push({});
        }

        this._isValid = (errors.length === 0);

        this._raiseModelValidated(errors);
    }

    public modelValidated(handler: Function) {
        /// <summary>The model validated event.</summary>
        /// <param name="handler" type="Function">The handler of the model validated event.</param>
        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._events.subscribe(SendMailDialogModel.EVENT_MODEL_VALIDATED, <any>handler);
    }

    public getMessage(): IMessageObject {
        /// <summary>Gets the message object constructed using current values of the model.</summary>
        /// <returns type="IMessageObject" />
        var myId = this._tfsContext.currentIdentity.id,
            message: IMessageObject = {
                to: this._jsonifyEmailRecipients(),
                subject: this.getValue(SendMailDialogModel.SUBJECT_FIELD),
                body: this.getValue(SendMailDialogModel.BODY_FIELD)
            };

        if (this._options.ccSender) {
            message.cc = { tfids: [myId] };
        }

        if (this._options.replyToSender) {
            message.replyTo = { tfids: [myId] };
        }

        if (this._options.inReplyTo) {
            message.inReplyTo = this._options.inReplyTo;
        }

        if (this._options.messageId) {
            message.messageId = this._options.messageId;
        }

        return message;
    }

    public getOptions(): ISendMailDialogModelOptions {
        return this._options;
    }

    public setDefaultToState() {
        Diag.logError("abstractMethod not implemented");
    }

    public setDirty(isDirty: boolean) {
        /// <summary>Sets the model to be dirty</summary>
        /// <param name="isDirty" type="Boolean"><c>true<c> if the model is dirty.</param>
        Diag.Debug.assertParamIsBool(isDirty, "isDirty");

        if (this._trackDirtyState) {
            this._isDirty = isDirty;
        }
    }

    private _initialize() {
        /// <summary>Initializes the view model.</summary>
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._events = new Events_Handlers.NamedEventCollection();
        this._fieldValues = {};
    }

    public getIdentitiesField(): IEmailRecipients {
        /// <summary>Gets all the email recipients tfids or emails and returns them as an object</summary>
        let tfIds = [];
        let emailAddresses = [];
        let unresolvedEntityIds = [];

        if (this._options.useIdentityPickerForTo) {
            let identityListValues = this.getValue(SendMailDialogModel.IDENTITIES_FIELD);
            if (identityListValues) {
                tfIds = identityListValues.existingUsers;
                emailAddresses = identityListValues.newUsers;
                unresolvedEntityIds = identityListValues.unresolvedEntityIds;
                return { tfIds: tfIds, emailAddresses: emailAddresses, unresolvedEntityIds: unresolvedEntityIds };
            }
        }

        return null;
    }

    public setDefaultSendToList(defaultTo: string) {
        this._options.defaultTo = defaultTo;
    }

    private _jsonifyEmailRecipients(): IEmailRecipients {
        let emailAddresses: string[] = [];
        let tfIds: string[] = [];
        let unresolvedEntityIds: string[];

        if (this._options.useIdentityPickerForTo) {
            let identityListValues = this.getValue(SendMailDialogModel.IDENTITIES_FIELD);
            if (identityListValues) {
                tfIds = identityListValues.existingUsers;
                emailAddresses = identityListValues.newUsers;
                unresolvedEntityIds = identityListValues.unresolvedEntityIds;
            }
        }
        else {
            let toFieldValue = this.getValue(SendMailDialogModel.TO_FIELD);
            emailAddresses = TFS_Core_Utils.parseEmailAddressesStringToArray(toFieldValue);
        }

        return { tfIds: tfIds, emailAddresses: emailAddresses, unresolvedEntityIds: unresolvedEntityIds };
    }

    private _raiseModelValidated(errors: any[]) {
        /// <summary>Notifies listeners that the model has been validated.</summary>
        /// <param name="errors" type="Array">All validation errors.</param>
        Diag.Debug.assertParamIsArray(errors, "errors");

        this._events.invokeHandlers(SendMailDialogModel.EVENT_MODEL_VALIDATED, errors);
    }

    private _compareValues(value1: any, value2: any) {
        /// <summary>Compares two values.</summary>
        /// <param name="value1" type="Object">The first value to compare.</param>
        /// <param name="value2" type="Object">The second value to compare.</param>
        if (!value1) {
            return value2 ? false : true;
        }
        else if (!value2) {
            return false;
        }
        else {
            if (typeof value1 === "string" && typeof value2 === "string") {
                return Utils_String.localeComparer(value1, value2) === 0;
            }
            else {
                return value1 === value2;
            }
        }
    }
}

export class SendMailIdentityPicker extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.SendMail.IdentityPicker";

    public static IDENTITY_DATA_KEY: string = "idData";
    public static CONTROL_ROOT: string = "identity-picker";
    public static CONTROL_ROOT_SELECTOR: string = ".identity-picker";
    public static CONTROL_INPUT_SELECTOR: string = ".identity-input";
    public static VALIDATION_FIELD_IDENTITIES_ID: string = "validation-field-identities";
    public static EVENT_IDENTITIES_CHANGED: string = "event-identities-changed";
    public static ERROR_IDENTITY_RESOLUTION_FAILED: string = "error-identity-resolution-failed";
    public static ERROR_UNKNOWN: string = "error-unknown";

    private _adminPickerControl: AdminCommon.IdentityPickerControl;
    private _events: Events_Handlers.NamedEventCollection<any, any>;

    constructor(options?: any) {
        /// <summary>
        /// Defines a UI control that consumes Admin user picker control to interactively pick TFS identities.
        /// </summary>

        super(options);
        this._events = new Events_Handlers.NamedEventCollection();
    }

    public initialize() {
        /// <summary>
        /// Overridden to initialize this custom control.
        /// </summary>
        super.initialize();

        var $rootElem: JQuery = this._element,
            $adminPickerElement: JQuery = $("<div>"),
            controlOptions;

        $rootElem.addClass(SendMailIdentityPicker.CONTROL_ROOT)
            .append($adminPickerElement);

        controlOptions = {
            allowArbitraryEmailAddresses: this._options.allowArbitraryEmailAddresses,
            allowFreeType: true,
            setFocusOnInitializeList: false,
            errorHandler: delegate(this, this._errorHandlerWrapper),
            constrainToTfsUsersOnly: true,
            errorOptions: { errorFieldId: SendMailIdentityPicker.VALIDATION_FIELD_IDENTITIES_ID }
        };

        this._adminPickerControl = <AdminCommon.IdentityPickerControl>Controls.BaseControl.createIn(AdminCommon.IdentityPickerControl, $adminPickerElement, controlOptions);

        this._registerEventHandlers();
    }

    public getDefaultInput() {
        /// <summary>Gets the default input control</summary>
        return this._adminPickerControl.getDefaultInput();
    }

    public attachIdentitiesChanged(handler: Function) {
        /// <summary>Attach a handler for the EVENT_IDENTITIES_CHANGED event</summary>
        /// <param name="handler" type="function">The handler to attach</param>
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(SendMailIdentityPicker.EVENT_IDENTITIES_CHANGED, <any>handler);
    }

    public detachIdentitiesChanged(handler: Function) {
        /// <summary>Remove a handler for the EVENT_IDENTITIES_CHANGED event</summary>
        /// <param name="handler" type="Function">The handler to remove</param>
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(SendMailIdentityPicker.EVENT_IDENTITIES_CHANGED, <any>handler);
    }

    public getSelectedIdentities() {
        /// <summary>
        /// Returns an array of identities (GUIDs) currently selected in this picker control.
        /// </summary>
        /// <returns>An array of selected Team Foundation identities.</returns>
        return this._adminPickerControl.getPendingChanges();
    }

    public getPendingUserInput() {
        /// <summary>
        /// Returns a string the user has currently provided in input.
        /// </summary>
        /// <returns>A string for incomplete userId.</returns>
        return $.trim(this._adminPickerControl.getPendingUserInput());
    }

    public getSelectedUserDisplayNames() {
        /// <summary>
        /// Returns an array of display names for users currently selected in this picker control.
        /// </summary>
        /// <returns>An array of selected display names.</returns>
        return this._adminPickerControl.getDisplayNames();
    }

    public setInvalid() {
        /// <summary>Sets the control to be invalid.</summary>
        var $inputControl: JQuery = $(SendMailIdentityPicker.CONTROL_INPUT_SELECTOR, this._element);
        $inputControl.addClass("invalid");
    }

    public setValid() {
        /// <summary>Sets the control to be valid.</summary>
        var $inputControl: JQuery = $(SendMailIdentityPicker.CONTROL_INPUT_SELECTOR, this._element);
        $inputControl.removeClass("invalid");
    }

    private _errorHandlerWrapper(error: any) {
        /// <summary>The actual error handler passed to the identity picker control.</summary>
        /// <param name="error" type="Object">The error message.</param>
        if (error && $.isFunction(this._options.errorHandler)) {
            this._options.errorHandler(error);
        }
    }

    private _registerEventHandlers() {
        /// <summary>Registers event handler</summary>
        /// <returns>void</returns>
        Diag.Debug.assertIsObject(this._element);

        this._element.bind('identityListChanged', delegate(this, function () {
            this._raiseIdentitiesChanged(SendMailIdentityPicker.EVENT_IDENTITIES_CHANGED);
        }));
    }

    private _raiseIdentitiesChanged() {
        /// <summary>Raise the settings changed event</summary>

        this._events.invokeHandlers(SendMailIdentityPicker.EVENT_IDENTITIES_CHANGED);
    }

    public saveEmailRecipientsToRegistry(registryKey: string) {
        var values = [],
            identityValues = this._adminPickerControl.getPendingChanges(true);

        $.each(identityValues.existingUsers, (index: number, value: any) => {
            values.push(value);
        });
        $.each(identityValues.newUsers, (index: number, value: any) => {
            values.push({ name: value });
        });
        $.each(identityValues.unresolvedEntityIds, (index: number, value: any) => {
            values.push({ name: value });
        });

        if (values.length > 0) {
            TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService).beginWriteSetting(registryKey, JSON.stringify(values));
        }
    }

    public readEmailRecipientsFromRegistry(registryKey: string) {
        TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService).beginReadSetting(registryKey, TFS_WebSettingsService.WebSettingsScope.User, (setting) => {
            var deserializedValues = [];
            if (setting.value) {
                try {
                    deserializedValues = JSON.parse(setting.value);
                }
                catch (ex) {
                    // Reading previous email recipients is best-effort. Ignore errors reading registry values.
                }
                if ($.isArray(deserializedValues)) {
                    $.each(deserializedValues, (index: number, value: any) => {
                        if (value && value.name) {
                            this._adminPickerControl.addResolvedIdentity(value.name, value.name, value.tfid);
                        }
                    });
                }
            }
        }, (error) => {
            // Reading previous email recipients is best-effort. Ignore errors reading registry values.
        });
    }

    public checkName(successCallback?: () => void) {
        this._adminPickerControl.onCheckName(successCallback);
    }

    public addDefaultName(displayName: string, suppressErrors: boolean = true, callback?: () => void) {
        this._adminPickerControl.addRecipientByName(displayName, suppressErrors, callback);
    }

    public addDefaultIdentities(identities: any[]) {
        $.each(identities, (i, identity) => {
            if (identity.displayName && identity.tfid) {
                this._adminPickerControl.addResolvedIdentity(identity.displayName, identity.displayName, identity.tfid);
            }
        });
    }
}

export interface ISendMailCommonIdentityPickerOptions extends Identities_Controls.IIdentityPickerSearchOptions {
    /**
     *   The control container.
     */
    container?: JQuery;
    /**
     *   The actual error handler passed to the identity picker control.
     */
    errorHandler?: Function;
}

export class SendMailCommonIdentityPicker extends Controls.Control<ISendMailCommonIdentityPickerOptions> {
    public static enhancementTypeName: string = "tfs.SendMail.CommonIdentityPicker";
    public static CONTROL_ROOT: string = "select-tester-identity-picker";
    public static CONTROL_INPUT_SELECTOR: string = ".identity-input";

    private _identityPickerControl: Identities_Controls.IdentityPickerSearchControl;
    private _validChangeHandler: Function;
    private _invalidChangeHanlder: Function;

    /**
     * Overridden to initialize this custom control.
     */
    public initialize() {
        super.initialize();
        var $rootElem: JQuery = this.getElement();
        $rootElem.addClass(SendMailCommonIdentityPicker.CONTROL_ROOT);

        var $adminPickerElement: JQuery;
        if (this._options.container) {
            $adminPickerElement = this._options.container;
            $rootElem.append($adminPickerElement);
        }
        else {
            $adminPickerElement = $rootElem;
        }

        this._identityPickerControl = Controls.create(Identities_Controls.IdentityPickerSearchControl, $adminPickerElement, <Identities_Controls.IIdentityPickerSearchOptions>{
            items: this._options.items || [],
            identityType: this._options.identityType || { User: true },
            loadOnCreate: true,
            multiIdentitySearch: this._options.multiIdentitySearch == null ? true : this._options.multiIdentitySearch,
            operationScope: this._options.operationScope || { IMS: true, Source: true },
            showMru: this._options.showMru || false,
            consumerId: this._options.consumerId || AdminCommon.AdminUIHelper.SENDMAIL_CONSUMER_ID,
            showContactCard: this._options.showContactCard == null ? true : this._options.showContactCard,
            elementId: this._options.elementId,
            excludeAriaLabel: this._options.excludeAriaLabel,
            callbacks: {
                onInputBlur: () => {
                    if (!this._validateName() && $.isFunction(this._options.errorHandler)) {
                        var errorMsg = "";
                        if (this.getInvalidIdentities().length > 0) {
                            errorMsg = AdminResources.InvalidToFieldInput;
                        }
                        this._options.errorHandler(errorMsg);
                    }
                }
            }
        });
    }

    /**
     * Returns an array of identities (GUIDs) currently selected in this picker control.
     */
    public getSelectedIdentities(): { existingUsers: string[], newUsers: string[], unresolvedEntityIds: string[] } {
        let resolvedEntities = this._identityPickerControl.getIdentitySearchResult().resolvedEntities;
        let selectedIdentities = [];
        let unresolvedEntityIds = [];

        if (resolvedEntities && resolvedEntities.length > 0) {
            resolvedEntities.forEach((identity: Identities_RestClient.IEntity, index: number, array: Identities_RestClient.IEntity[]) => {
                if (identity.localId) {
                    selectedIdentities.push(identity.localId);
                }
                else if (identity.originId) {
                    unresolvedEntityIds.push(identity.originId);
                }
            });
        }

        return {
            existingUsers: selectedIdentities,
            newUsers: [],
            unresolvedEntityIds: unresolvedEntityIds
        };
    }

    /**
     * Returns an array of resolved entities.
     */
    public getSelectedEntities(): Identities_RestClient.IEntity[] {
        return this._identityPickerControl.getIdentitySearchResult().resolvedEntities || [];
    }

    /**
     * Returns an array of unresolved entities.
     */
    public getInvalidIdentities(): string[] {
        var input = $('input', this.getElement()).val().trim();
        return this._identityPickerControl.getIdentitySearchResult().unresolvedQueryTokens.concat(input ? input : []);
    }

    /**
     * Attach a handler for the control input event
     * @param handler The handler to attach
     */
    public attachIdentitiesChanged(handler: Function) {
        Diag.Debug.assertParamIsFunction(handler, "handler");
        this._validChangeHandler = handler;
        this._bind(Identities_Controls.IdentityPickerSearchControl.VALID_INPUT_EVENT, this._validChangeHandler);
        if ($.isFunction(this._options.errorHandler)) {
            this._invalidChangeHanlder = () => {
                if (!this._validateName() && $.isFunction(this._options.errorHandler)) {
                    this._options.errorHandler();
                }
            };
            this._bind(Identities_Controls.IdentityPickerSearchControl.INVALID_INPUT_EVENT, this._invalidChangeHanlder);
        }
    }

    /**
     * Sets the control to be invalid.
     */
    public setInvalid() {
        var $inputControl: JQuery = $(SendMailIdentityPicker.CONTROL_INPUT_SELECTOR, this._element);
        $inputControl.addClass("invalid");
    }

    /**
     * Sets the control to be valid.
     */
    public setValid() {
        var $inputControl: JQuery = $(SendMailIdentityPicker.CONTROL_INPUT_SELECTOR, this._element);
        $inputControl.removeClass("invalid");
    }

    /**
     * Save the email recipients to the registry with the passed in registryKey.
     */
    public saveEmailRecipientsToRegistry(registryKey: string) {
        var identityValues = this.getSelectedEntities();
        if (identityValues && identityValues.length > 0) {
            var values: string[] = [];
            $.each(identityValues, (index: number, identity: Identities_RestClient.IEntity) => {
                values.push(identity.signInAddress);
            });
            var webSettingsService = this._getWebSettingsService();
            if (webSettingsService) {
                webSettingsService.beginWriteSetting(registryKey, JSON.stringify(values));
            }
        }
    }

    /**
     * Try the best to read the email recipients from the registry with the passed in registryKey.
     */
    public readEmailRecipientsFromRegistry(registryKey: string) {
        var webSettingsService = this._getWebSettingsService();
        if (webSettingsService) {
            webSettingsService.beginReadSetting(registryKey, TFS_WebSettingsService.WebSettingsScope.User, (setting) => {
                if (setting.value) {
                    try {
                        var deserializedValues = JSON.parse(setting.value);
                        if ($.isArray(deserializedValues)) {
                            this._identityPickerControl.setEntities(null, deserializedValues);
                        }
                    }
                    catch (ex) {
                        // Reading previous email recipients is best-effort. Ignore errors reading registry values.
                    }
                }
            });
        }

    }

    public addDefaultName(name: string, suppressErrors: boolean = true, callback?: () => void) {
        try {
            this._identityPickerControl.setEntities(null, [name]);
            if ($.isFunction(callback)) {
                callback();
            }
        }
        catch (error) {
            if (!suppressErrors && $.isFunction(this._options.errorHandler)) {
                this._options.errorHandler(AdminResources.InvalidToFieldInput);
            }
        }
    }

    /**
     * Set default entites to the control.
     */
    public addDefaultIdentities(identities: { displayName: string, tfid: string, uniqueName: string }[]) {
        var ids: string[] = [];
        $.each(identities, (i, identity) => {
            if (identity.tfid) {
                ids.push(identity.tfid);
            }
        });
        this._identityPickerControl.setEntities([], ids);
    }

    public dispose() {
        if (this._validChangeHandler) {
            this._unbind(Identities_Controls.IdentityPickerSearchControl.VALID_INPUT_EVENT, this._validChangeHandler);

        }
        if (this._invalidChangeHanlder) {
            this._unbind(Identities_Controls.IdentityPickerSearchControl.INVALID_INPUT_EVENT, this._invalidChangeHanlder);
        }
        this._identityPickerControl.dispose();
        super.dispose();
    }

    /**
     * The actual error handler passed to the identity picker control.
     */
    private _errorHandlerWrapper(error: any) {
        if (error && $.isFunction(this._options.errorHandler)) {
            this._options.errorHandler(error);
        }
    }

    private _getWebSettingsService(): TFS_WebSettingsService.WebSettingsService {
        var connection = TFS_OM_Common.ProjectCollection.getDefaultConnection();
        return connection.getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
    }

    private _validateName(): boolean {
        return this.getInvalidIdentities().length === 0 && this.getSelectedEntities().length > 0;
    }
}

export interface IMessageFormOptions {
    /**
     * Sets body field (default => "").
     */
    body?: string;
    /**
     * Gets the text to display after the body field. If not specified nothing is shown.
     */
    bodyAppendixText?: string;
    /**
     * Callback handler of form changed event.
     */
    change?: Function;
    /**
     * A function that is called right after checking the name.
     */
    setDefaultToState?: () => void;
    /**
     * Css class of the control (optional).
     */
    coreCssClass?: string;
    /**
     * Sets the default to address.  This can be an array of tuple(displayName, tfid, uniqueName) or a single displayName, email Address (or semi colon delimited list of recipients when using defaultToStringAllowsMultipleRecipients: true).
     */
    defaultTo?: Array<{ displayName: string, tfid: string, uniqueName: string }> | string;
    /**
     * while set to true and the defaultTo contains a semi colon delimitted list of recipients, the defaultTo will parse/validate and set those names.
     */
    defaultToStringAllowsMultipleRecipients?: boolean;
    /**
     * The editor option, if true it fires event on every change.
     */
    fireOnEveryChange?: boolean;
    /**
     * The editor height (default => 250).
     */
    height?: number;
    /**
     * When true, the identity picker will include groups (default => false)
     */
    includeGroups?: boolean;
    /**
     *   default identities for commonIdentityPicker to initialise the dropdown with - if you are constructing the IEntity objects, their identifiers (such as entityId, localId etc.) have to be valid;
     *   alternatively the input can be a semi-colon separated sequence of unique identifiers (such as sign-in addresses or aliases)
     */
    items?: string | Identities_RestClient.IEntity[];
    /**
     * The callback function when there is an error.
     */
    onError?: Function;
    /**
     * Sets read only body field (default => "").
     */
    readOnlyBody?: string;
    /**
     * The label of read only section
     */
    readOnlyBodyLabel?: string;
    /**
     * Sets subject field (default => "").
     */
    subject?: string;
    /**
     * Sets subject field is visible or not (default => true).
     */
    subjectVisible?: boolean;
    /**
     * The editor option, if true it fires event on every change.
     */
    savedEmailRecipientsRegistryPath?: string;
    /**
     * Sets to field (default => "").
     */
    to?: string;
    /**
     * Sets to field is enabled or not (default => true).
     */
    toEnabled?: boolean;
    /**
     * Sets to field is visible or not (default => true).
     */
    toVisible?: boolean;
    /**
    *   The tfsContext (optional).
    */
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    /**
     * Indicate whether to use the commonIdentityPicker.
     */
    useCommonIdentityPicker?: boolean;
    /**
     * Use SendMailIdentityPicker or SendMailCommonIdentityPicker for to field (Note that this discards inputs in "to" option).
     */
    useIdentityPickerForTo: boolean;
    /**
     * Options for the SendMailIdentityPicker or SendMailCommonIdentityPicker for the to field
     */
    identityPickerOptions: any;
}

export interface IMessageBodyOption {
    /**
     * The editable part of message body.
     */
    editableBody: string;
    /**
     * The read only part of the message body.
     */
    readOnlyBody: string;
    /**
     * Gets the text to display after the body field. If not specified nothing is shown.
     */
    bodyAppendixText?: string;
    /**
     * Handling the message body changed event.
     */
    onBodyChanged?: Function;
    /**
     * The label of read only section
     */
    readOnlyBodyLabel?: string;
}

export class MessageBody extends Controls.Control<IMessageBodyOption> {
    public static ID_EDITABLE_BODY: string = "email-editable-body";
    public static ID_READ_ONLY_BODY: string = "email-read-only-body";
    public static READ_ONLY_CONTENT: string = "email-read-only-content";
    public static EMAIL_NOTE_LABEL: string = "email-note-label";
    public static EMAIL_NOTE_CLASS: string = "email-note-class";
    public static EMAIL_READ_ONLY_LABEL: string = "email-read-only-label";
    public static CHARACTERS_COUNT_CLASS: string = "email-characters-count";
    public static CHARACTERS_COUNT_ERROR_CLASS: string = "email-count-error";
    public static NEW_EMAIL_NOTE_LABEL: string = "email-new-note-label";
    public static EMAIL_NOTE_CONTAINER: string = "email-note-container";
    public static MAX_CHARACTERS_COUNT: number = 1024;
    public static CHARACTERS_REMAINING_THRESHOLD: number = 20;

    private _$readyOnlyBody: JQuery;
    private _$editableBody: JQuery;
    private _$charactersCount: JQuery;
    private _$characterUsage: JQuery;
    private _messageChangeThrottledDelegate: Function;
    private _characterUsageDescription: string = Utils_String.format(AdminResources.SendMailRemainingCharactersUsage, MessageBody.MAX_CHARACTERS_COUNT, MessageBody.MAX_CHARACTERS_COUNT);

    public initialize() {
        super.initialize();
        this._decorate();
    }

    private _decorate() {
        var $element: JQuery = this.getElement().addClass(MessageBody.EMAIL_NOTE_CONTAINER);
        var $note: JQuery;
        var $noteLabel: JQuery;

        const characterCountDescriptionId = "characterCountDescription" + this.getId();
        // Create editable section

        $note = $("<div>")
            .addClass(MessageForm.FORM_SECTION)
            .addClass(MessageBody.EMAIL_NOTE_CLASS);
        $noteLabel = $("<label />")
            .text(AdminResources.SendMailNote)
            .addClass(MessageBody.NEW_EMAIL_NOTE_LABEL)
            .prop("for", MessageBody.ID_EDITABLE_BODY)
            .appendTo($note);
        this._$charactersCount = $("<label />")
            .addClass(MessageBody.CHARACTERS_COUNT_CLASS)
            .html(Utils_String.format(AdminResources.SendMailCharactersCount, 0, MessageBody.MAX_CHARACTERS_COUNT))
            .attr("aria-describedby", characterCountDescriptionId)
            .appendTo($note);
        this._$characterUsage = $("<div />")
            .addClass("visually-hidden")
            .attr("id", characterCountDescriptionId)
            .attr("aria-live", "polite")
            .attr("aria-atomic", "false")
            .appendTo($note);            
        this._$editableBody = $("<textarea>")
            .prop({"id": MessageBody.ID_EDITABLE_BODY})
            .attr("aria-invalid", "false")
        this.setEditableContent(this._options.editableBody);
        $note.append(this._$editableBody);

        $element.append($note);
        // Create read only section
        var $readOnlyBodyContainer: JQuery = $("<div>").addClass(MessageForm.FORM_SECTION);
        this._$readyOnlyBody = $("<div>").addClass(MessageBody.ID_READ_ONLY_BODY);
        if (this._options.readOnlyBodyLabel && this._options.readOnlyBodyLabel.length > 0) {
            var $readOnlyLabel: JQuery = $("<label />").text(this._options.readOnlyBodyLabel);
            $readOnlyBodyContainer.append($readOnlyLabel);
        }
        $readOnlyBodyContainer.append(this._$readyOnlyBody);
        this.setReadyOnlyContent(this._options.readOnlyBody);
        $element.append($readOnlyBodyContainer);
    }

    public getReadyOnlyBody(): JQuery {
        return this._$readyOnlyBody;
    }

    public getEditableBody(): JQuery {
        return this._$editableBody;
    }

    public getReadyOnlyContent(): string {
        if (this._$readyOnlyBody && this._$readyOnlyBody.find("." + (MessageBody.READ_ONLY_CONTENT)).length > 0) {
            return this._$readyOnlyBody.find("." + (MessageBody.READ_ONLY_CONTENT)).html();
        }
        return "";
    }

    /**
     * Get the the editable message content. will be called by data model.
     */
    public getValue(): string {
        return this._$editableBody.val().substring(0, MessageBody.MAX_CHARACTERS_COUNT);
    }

    public isTruncated(): boolean {
        return this._$editableBody.val().length > MessageBody.MAX_CHARACTERS_COUNT;
    }

    public setReadyOnlyContent(content: string) {
        if (content) {
            Diag.Debug.assertIsString(content, "expected readly only content to be string type");
            // Set content
            var $readOnlyContainer: JQuery = $("<div>").addClass(MessageBody.READ_ONLY_CONTENT);
            $readOnlyContainer[0].innerHTML = content;

            // Give the root table a name for screen reader to refer to
            $("table:first", $readOnlyContainer).attr("aria-label", this._options.readOnlyBodyLabel);

            // Prevent tab key stop on link and input
            $("a, input", $readOnlyContainer).each((index: number, elem: Element) => {
                // if the server explicitly set tabindex, don't override it with -1
                const $elem = $(elem);
                if ($elem.attr('tabindex') == null) {
                    $elem.prop("tabindex", -1);
                }
            });
            this._$readyOnlyBody.append($readOnlyContainer);
        }
    }

    public setEditableContent(content: string) {
        // Add label
        if (content) {
            Diag.Debug.assertIsString(content, "expected editable message to be string type");
            this._$editableBody.val(content);
            this._setCharactersCount(content);
        }
        // Attach change event
        this._messageChangeThrottledDelegate = Utils_Core.throttledDelegate(this, 30, this._messageChangeHandler);
        this._bind(this._$editableBody, "change keyup paste", this._messageChangeThrottledDelegate);
    }

    public dispose() {
        if (this._messageChangeThrottledDelegate) {
            this._unbind(this._$editableBody, "change keyup paste");
        }
        super.dispose();
    }

    private _messageChangeHandler() {
        this._setCharactersCount(this._$editableBody.val());
        if ($.isFunction(this._options.onBodyChanged)) {
            this._options.onBodyChanged();
        }
    }

    private _setCharactersCount(content: string) {
        const textLength = content.length;
        const availableCharacters = MessageBody.MAX_CHARACTERS_COUNT - textLength;

        if (availableCharacters <= MessageBody.CHARACTERS_REMAINING_THRESHOLD) {
            this._characterUsageDescription = availableCharacters === 1 
                ? Utils_String.format(AdminResources.SendMailRemainingCharacterUsage, MessageBody.MAX_CHARACTERS_COUNT)
                : Utils_String.format(AdminResources.SendMailRemainingCharactersUsage, availableCharacters, MessageBody.MAX_CHARACTERS_COUNT);
            this._$characterUsage.text(this._characterUsageDescription);
            this._$characterUsage.attr("aria-atomic", "true");

            if (availableCharacters < 0) {
                this._characterUsageDescription = Utils_String.format(AdminResources.SendMailExceedingMaxCharacters, MessageBody.MAX_CHARACTERS_COUNT, Math.abs(availableCharacters));
                this._$characterUsage.text(this._characterUsageDescription);
                this._$charactersCount.addClass(MessageBody.CHARACTERS_COUNT_ERROR_CLASS);
                this._$editableBody.attr("aria-invalid", "true");
            }
            else {
                this._$charactersCount.removeClass(MessageBody.CHARACTERS_COUNT_ERROR_CLASS);
                this._$editableBody.attr("aria-invalid", "false");
            }
        }
        else {
            this._$characterUsage.text("");
            this._$charactersCount.removeClass(MessageBody.CHARACTERS_COUNT_ERROR_CLASS);
            this._$editableBody.attr("aria-invalid", "false");
            this._$characterUsage.attr("aria-atomic", "false");
        }

       this._$charactersCount.html(Utils_String.format(AdminResources.SendMailCharactersCount, textLength, MessageBody.MAX_CHARACTERS_COUNT));
    }
}

export class MessageForm extends Controls.Control<IMessageFormOptions> {

    public static ID_TO: string = "email-input-to";
    public static ID_TO_LABEL: string = "email-input-to-label";
    public static ID_FROM: string = "email-input-from";
    public static ID_SUBJECT: string = "email-input-subject";
    public static ID_BODY: string = "email-input-body";
    public static SUBJECT_MAX_LENGTH: number = 256;
    public static EMAIL_TO_INPUT_CLASS = "email-input-to";
    public static EMAIL_TO_ROW = "email-to-row";
    public static EMAIL_SUBJECT_ROW = "email-subject-row";
    public static EMAIL_BODY_ROW = "email-body-row";
    public static EMAIL_TO_INPUT_FOCUSED_CLASS = "email-input-to-focused";
    public static FORM_SECTION = "form-section";

    private _$defaultFocusField: JQuery;
    private _$to: JQuery;
    private _identityPickerControl: SendMailCommonIdentityPicker | SendMailIdentityPicker;
    private _$subject: JQuery;
    private _$subjectLabel: JQuery;
    private _$msgBodyContainer: JQuery;
    private _body: MessageBody;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor(options?: IMessageFormOptions) {
        /// <summary>Displays a form for a mail message. Use getMessage() function to get the message object constructed using current values of the form.</summary>
        super(options);
    }

    public initializeOptions(options?: IMessageFormOptions) {
        super.initializeOptions($.extend({
            coreCssClass: options.coreCssClass || "message-form"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._decorate();
    }

    public getDefaultFocusField() {
        return this._$defaultFocusField;
    }

    public setMessageFields(message: IMessageObject) {
        /// <summary>sets the UI fields in the message from based on the passed in message object</summary>
        /// <param name="message" type="object">A message object</param>
        Diag.Debug.assertParamIsObject(message, "message");

        var options = this._options;

        // Setting to field if visible
        if (options.toVisible !== false) {
            trimAndSetValue(this._$to, message.to);
        }

        // Setting subject if visible
        if (options.subjectVisible !== false) {
            trimAndSetValue(this._$subject, message.subject);
        }
    }

    public checkName(successCallback?: () => void) {
        if (!this._options.useCommonIdentityPicker) {
            (<SendMailIdentityPicker>this._identityPickerControl).checkName(successCallback);
        }
        else {
            if ($.isFunction(successCallback)) {
                successCallback();
            }
        }
    }

    public getSelectedIdentities() {
        if (this._options.useCommonIdentityPicker) {
            return (<SendMailCommonIdentityPicker>this._identityPickerControl).getSelectedEntities();
        }
    }

    public getInvalidIdentities() {
        if (this._options.useCommonIdentityPicker) {
            return (<SendMailCommonIdentityPicker>this._identityPickerControl).getInvalidIdentities();
        }
    }
    /**
     * For test purpose.
     */
    public getBody() {
        return this._body;
    }

    /**
     * For test purpose.
     */
    public getIdentityControl() {
        return this._identityPickerControl;
    }

    public dispose() {
        super.dispose();
        this._identityPickerControl.dispose();
        this._body.dispose();
    }

    private _decorate() {
        var options = this._options;

        var $container = this._element;
        this._createToRow($container, options);
        this._createSubjectRow($container, options);
        this._createBodyRow($container, options);

        // Create body appendix text row if needed
        if (options.bodyAppendixText && options.bodyAppendixText.length > 0) {
            $("<label />").text("* " + options.bodyAppendixText).appendTo($container);
        }
    }

    private _createToRow($container: JQuery, options: IMessageFormOptions) {
        // Creating To row (if it's visible)
        if (options.toVisible !== false) {

            var $row = $("<div />")
                .addClass(MessageForm.FORM_SECTION)
                .addClass(MessageForm.EMAIL_TO_ROW)
                .appendTo($container);
            var $toLabel = $("<label />")
                .text(AdminResources.SendMailTo)
                .appendTo($row);
            var $toContainer = $row;

            // Note: We could try remove useIdentityPickerForTo option and always require a identity picker for the 'To' field now
            // to prevent users from abusing the TFS send email feature。
            if (!options.useIdentityPickerForTo) {
                this._$to = $("<input />")
                    .prop({
                        "id": MessageForm.ID_TO,
                        "type": "text",
                        "spellcheck": "false"
                    })
                    .val(options.to || "")
                    .appendTo($toContainer)
                    .focus();
                this._hookupChangeEvent(this._$to);
                if (options.toEnabled === false) {
                    this._$to.prop("disabled", true);
                    this._$to.addClass("disabled");
                }
                else {
                    this._$defaultFocusField = this._$to;
                }

                $toLabel.prop("for", MessageForm.ID_TO);
            }
            else {
                this._createUserPicker($toLabel).appendTo($toContainer);
                this._$defaultFocusField = this._element.find('input:not([disabled]).watermark');

                if (!this._options.useCommonIdentityPicker) {
                    var $identityInput: JQuery = (<SendMailIdentityPicker>this._identityPickerControl).getDefaultInput();
                    if ($identityInput) {
                        $identityInput.prop("id", MessageForm.ID_TO);
                        $toLabel.prop({ "for": MessageForm.ID_TO, "id": MessageForm.ID_TO_LABEL });
                    }
                }
            }
        }
    }

    private _createSubjectRow($container: JQuery, options: IMessageFormOptions) {
        //Always add the div for alignment of surrounding elements
        var $row = $("<div />")
            .addClass(MessageForm.FORM_SECTION)
            .addClass(MessageForm.EMAIL_SUBJECT_ROW)
            .appendTo($container);

        if (options.subjectVisible !== false) {
            this._$subjectLabel = $("<label />")
                .text(AdminResources.SendMailSubject).appendTo($row)
                .prop("for", MessageForm.ID_SUBJECT);
            this._$subject = $("<input />")
                .prop({
                    "type": "text",
                    "id": MessageForm.ID_SUBJECT,
                    "maxlength": MessageForm.SUBJECT_MAX_LENGTH
                })
                .val(options.subject || "")
                .appendTo($row)
                .addClass(MessageForm.ID_SUBJECT);

            this._hookupChangeEvent(this._$subject);
            if (!this._$defaultFocusField) {
                this._$defaultFocusField = this._$subject;
            }
        }
    }

    private _createBodyRow($container: JQuery, options: IMessageFormOptions) {
        // Construct body container.
        var $bodyContainer: JQuery = $("<div />").addClass(MessageForm.EMAIL_BODY_ROW);
        this._body = Controls.Control.create(MessageBody, $bodyContainer, {
            readOnlyBody: this._options.readOnlyBody,
            readOnlyBodyLabel: this._options.readOnlyBodyLabel,
            editableBody: this._options.body,
            bodyAppendixText: this._options.bodyAppendixText,
            onBodyChanged: delegate(this, this._onBodyChanged)
        });

        $container.append($bodyContainer);
    }

    private _onBodyChanged() {
        /// <summary>Handling the message body changed event.</summary>
        this._raiseMessageBodyChangedEvent();
    }

    private _createUserPicker($label: JQuery): JQuery {
        /// <summary>Creates a tr that contains the input for "To" users.</summary>
        /// <returns type="jQuery" />
        var $userContainer: JQuery = $("<div>");
        this._setIdentityControl($userContainer, $label);


        if (this._options.savedEmailRecipientsRegistryPath) {
            this._identityPickerControl.readEmailRecipientsFromRegistry(this._options.savedEmailRecipientsRegistryPath);
        }

        if (this._options.defaultTo) {
            if ($.isArray(this._options.defaultTo)) {
                (this._identityPickerControl.addDefaultIdentities as (defaultTo: { displayName: string, tfid: string, uniqueName: string }[]) => void)(<{ displayName: string, tfid: string, uniqueName: string }[]>this._options.defaultTo);
            }
            else if (typeof this._options.defaultTo === 'string') {
                // If the options are set to allow multiple email addresses
                if (this._options.defaultToStringAllowsMultipleRecipients === true) {
                    // split the recipients by semi colon
                    var recipients = (<string>this._options.defaultTo).split(';');
                    // Add each recipient in the list
                    recipients.forEach(x => this._identityPickerControl.addDefaultName(x, false, this._options.setDefaultToState));
                } else {
                    this._identityPickerControl.addDefaultName(<string>this._options.defaultTo, true, this._options.setDefaultToState);
                }
            }
        }
        return $userContainer;
    }

    private _setIdentityControl($userContainer: JQuery, $label: JQuery) {
        if (this._options.useCommonIdentityPicker) {
            $userContainer.addClass(MessageForm.EMAIL_TO_INPUT_CLASS);
            this._identityPickerControl = Controls.Control.create(SendMailCommonIdentityPicker, $userContainer, $.extend({
                showMru: true,
                errorHandler: delegate(this, this._handleError),
                identityType: { User: true, Group: this._options.includeGroups },
                excludeAriaLabel: true, // use our <label for=".."> instead of the default label
                elementId: MessageForm.ID_TO,
                consumerId: AdminCommon.AdminUIHelper.SENDMAIL_CONSUMER_ID
            } as ISendMailCommonIdentityPickerOptions,
                this._options.identityPickerOptions));
            $label.prop("for", MessageForm.ID_TO);

            $userContainer.find(".identity-picker-input").focus((e: JQueryEventObject) => {
                $userContainer.addClass(MessageForm.EMAIL_TO_INPUT_FOCUSED_CLASS);
            }).blur((e: JQueryEventObject) => {
                $userContainer.removeClass(MessageForm.EMAIL_TO_INPUT_FOCUSED_CLASS);
            });

            this._identityPickerControl.attachIdentitiesChanged(Utils_Core.throttledDelegate(this, 20, this._raiseToIdentitiesChangedEvent));
        }
        else {
            this._identityPickerControl = <SendMailIdentityPicker>Controls.Control.create(SendMailIdentityPicker, $userContainer, $.extend({
                errorHandler: delegate(this, this._handleError),
                allowArbitraryEmailAddresses: !this._tfsContext.isHosted
            }, this._options.identityPickerOptions));
            $userContainer.find(".dropdown-input-text.dropdown-input-name").focus((e: JQueryEventObject) => {
                var $focusContainer = $userContainer.find(".identity-input");
                $focusContainer.addClass(MessageForm.EMAIL_TO_INPUT_FOCUSED_CLASS);
            }).blur((e: JQueryEventObject) => {
                var $focusContainer = $userContainer.find(".identity-input");
                $focusContainer.removeClass(MessageForm.EMAIL_TO_INPUT_FOCUSED_CLASS);
            });
            this._identityPickerControl.attachIdentitiesChanged(Utils_Core.throttledDelegate(this, 20, this._raiseToIdentitiesChangedEvent));
        }
    }

    public _handleSendMailSuccess() {
        if (this._identityPickerControl && this._options.savedEmailRecipientsRegistryPath) {
            this._identityPickerControl.saveEmailRecipientsToRegistry(this._options.savedEmailRecipientsRegistryPath);
        }
    }

    private _raiseMessageBodyChangedEvent() {
        /// <summary>Notify listeners that the message body has changed.</summary>
        if (this._options && $.isFunction(this._options.change)) {
            this._options.change({
                fieldId: MessageForm.ID_BODY,
                fieldValue: this._body.getValue(),
                isTruncated: this._body.isTruncated()
            });
        }
    }

    private _raiseToIdentitiesChangedEvent() {
        /// <summary>Notify listeners that the to field identities have changed.</summary>
        if (this._options && $.isFunction(this._options.change)) {
            this._options.change({
                fieldId: MessageForm.ID_TO,
                fieldValue: this._identityPickerControl.getSelectedIdentities()
            });
        }
    }

    private _handleError(error: any) {
        /// <summary>Error handler.</summary>
        /// <param name="error" type="Object">The error message.</param>
        if (this._options && $.isFunction(this._options.onError)) {
            if (typeof error === 'string') {
                // Note: normalizing the error format is needed,
                //   because errors may be raised by other controls in
                //   the system, e.g. the Identity Picker.
                error = { message: error };
            }
            this._options.onError(error);
        }
    }

    private _hookupChangeEvent($element: any) {
        /// <summary>Binds to the key up/change event if the caller has provided a change callback.</summary>
        /// <param name="$element" type="object">A JQuery DOM element to bind.</param>

        Diag.Debug.assertParamIsObject($element, "$element");

        if ($.isFunction(this._options.change)) {
            if (this._options.fireOnEveryChange) {
                $element.bind("keyup", delegate(this, this._options.change));
            }
            else {
                $element.bind("change", delegate(this, this._options.change));
            }
        }
    }
}

VSS.classExtend(MessageForm, TfsContext.ControlExtensions);


function trimAndSetValue(field: any, fieldValue: string) {
    /// <summary>sets the value to input field after trimming and checking for null</summary>
    /// <param name="field" type="object">input field to set</param>
    /// <param name="fieldValue" type="string">string value to set</param>
    var trimmedValue = $.trim(fieldValue);
    field.val(trimmedValue || "");
}

interface SendMailDialogOptions extends CoreDialogs.IModalDialogOptions {
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    model?: SendMailDialogModel;
}

class SendMailDialog extends CoreDialogs.ModalDialogO<SendMailDialogOptions> {

    private _messagePane: Notifications.MessageAreaControl;
    private _messageForm: MessageForm;
    private _model: SendMailDialogModel;
    private _longRunningOperation: StatusIndicator.LongRunningOperation;
    private _skipConfirmCloseDialog: boolean;
    private _disposing: boolean;
    private _sendingInProgress: boolean;
    private _sendingSucceeded: boolean;
    private _runningDocumentEntry: Events_Document.RunningDocumentsTableEntry;
    private _initializationSucceeded: boolean;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        super.initializeOptions($.extend({
            width: (options.model._options.width) ? options.model._options.width : 800,
            minWidth: 600,
            height: (options.model._options.height) ? options.model._options.height : 600,
            minHeight: 400,
            resizable: options.model._options.resizable === undefined ? true : options.model._options.resizable,
            buttons: this._getButtons(),
            defaultButton: "send-button",
            title: options.model.getTitle(),
            preventAutoResize: options.model._options.preventAutoResize,
            beforeClose: delegate(this, this._beforeClose)
        }, options));
    }

    public initialize() {
        /// <summary>OVERRIDE: control initialization.</summary>
        super.initialize();

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();

        Diag.Debug.assertIsObject(this._options.model, "options.model is not present");
        this._model = this._options.model;
        this._registerEvents();

        this._decorate();
    }

    public onClose(e?) {
        /// <summary>OVERRIDE: Cleanup on the dialog - unregister from the RunningDocuments table</summary>
        if (this._runningDocumentEntry) {
            Events_Document.getRunningDocumentsTable().remove(this._runningDocumentEntry);
        }

        super.onClose(e);
    }

    public isDirty(): boolean {
        /// <summary>Needed by the RunningDocumentTable to control the handling of dirty state.</summary>

        // Note:
        //   Instead of tracking the email edit status, we always want to warn users of navigating away
        // from a page when the send mail dialog is shown. Hence, we always mark this open doc dirty.
        return true;
    }

    public dispose() {
        if (this._messageForm) {
            this._messageForm.dispose();
        }
        super.dispose();
    }

    private _decorate() {
        /// <summary>OVERRIDE: UI decoration.</summary>
        var that = this,
            $container = this.getElement(),
            $messageAreaContainer = $("<div>").addClass("messagearea-container");

        //Done to prevent excess styling rules from being applyed
        $container.removeClass("modal-dialog");
        $container.addClass("send-mail-dialog bowtie-style");
        var modelClass = this._model.getOptions().cssClass;
        if (modelClass && modelClass.length > 0) {
            $container.addClass(modelClass);
        }

        this._updateSendButton(false);

        this._messagePane = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, {});
        $container.append($messageAreaContainer);

        // makes sure the wait control is always bound to the current dialog's _element
        this._longRunningOperation = new StatusIndicator.LongRunningOperation(this, { showDelay: 0 });

        // Kick off the model async initialization, e.g. the mail body may be rendered
        // by the result of an async call to server-side api.
        this._longRunningOperation.beginOperation(function () {
            that._model.beginInitialize(delegate(that, that._modelInitialized), delegate(that, that._handleError));
        });
    }

    private _modelInitialized() {
        /// <summary>Success callback when model is properly initialized.</summary>
        Diag.Debug.assertIsNotNull(this._longRunningOperation, "_longRunningOperation");

        var $container, $messageFormContainer;

        if (this._disposing) {
            // In rare cases, e.g. user hit Exit while the long running operation of
            // beginInitialize is still going on, the dialog may be disposed before
            // this callback is invoked. In those cases, we should just return.
            return;
        }

        this._longRunningOperation.endOperation();

        $container = this.getElement();
        $messageFormContainer = $("<div class='message-form-container'/>");

        var modelOptions = this._model.getOptions();
        this._model.setSubject(this._model.getValue(SendMailDialogModel.SUBJECT_FIELD));
        this._messageForm = Controls.Control.create(MessageForm, $messageFormContainer, {
            coreCssClass: "message-form new-form",
            subject: <string>this._model.getValue(SendMailDialogModel.SUBJECT_FIELD),
            body: <string>this._model.getValue(SendMailDialogModel.BODY_FIELD),
            readOnlyBody: <string>this._model.getValue(SendMailDialogModel.READ_ONLY_BODY_FIELD),
            useIdentityPickerForTo: this._model.useIdentityPickerForTo(),
            identityPickerOptions: this._model.identityPickerOptions(),
            defaultTo: modelOptions.defaultTo,
            defaultToStringAllowsMultipleRecipients: modelOptions.defaultToStringAllowsMultipleRecipients,
            height: 395,
            includeGroups: modelOptions.includeGroups,
            bodyAppendixText: this._model.getBodyAppendixText(),
            fireOnEveryChange: false,
            savedEmailRecipientsRegistryPath: modelOptions.savedEmailRecipientsRegistryPath,
            setDefaultToState: () => { this._model.setDefaultToState(); },
            subjectVisible: modelOptions.subjectVisible,
            change: (event) => {
                // Handles changes made to the fields in the email contol.
                // NOTE: The body of the email uses the RichEditor control which re-hosts a document window
                // in an IFrame.  Because of this, change notifications don't surface the same way as other
                // controls.
                if (event.target) {
                    switch (event.target.id) {
                        case MessageForm.ID_TO:
                            this._model.setValue(SendMailDialogModel.TO_FIELD, event.target.value);
                            break;
                        case MessageForm.ID_SUBJECT:
                            this._model.setValue(SendMailDialogModel.SUBJECT_FIELD, event.target.value);
                            break;
                        default:
                            Diag.Debug.fail("Unknown email input element");
                    }
                }
                else if (event.fieldId === MessageForm.ID_BODY) {
                    this._model.setValue(SendMailDialogModel.BODY_FIELD, event.fieldValue, true);
                    this._model.setValue(SendMailDialogModel.BODY_FIELD_TRUNCATED, event.isTruncated);
                }
                else if (event.fieldId === MessageForm.ID_TO) {
                    this._model.setValue(SendMailDialogModel.IDENTITIES_FIELD, event.fieldValue);
                }
            },
            onError: delegate(this, this._handleError),
            readOnlyBodyLabel: modelOptions.readOnlyBodyLabel,
            useCommonIdentityPicker: modelOptions.useCommonIdentityPicker
        });

        $container.append($messageFormContainer);

        // Note:
        //   We only update the RDT after we successfully initialize the dialog with preview.
        // In other cases, e.g. errors being reported during initialization, we do not want to
        // ask users for confirmation if they choose to navigate away.
        this._runningDocumentEntry = Events_Document.getRunningDocumentsTable().add("SendMailDialog", this);
        this._initializationSucceeded = true;

        this.setFormFocusDelayed(this._messageForm.getDefaultFocusField());
    }

    private _beforeClose(): boolean {
        /// <summary>Invoked by JQueryUI before the dialog close request is processed as a means to abort the close request.</summary>
        /// <returns type="Boolean"><c>true</c> if the dialog can be closed; otherwise, <c>false</c>.</returns>
        var canClose = true;

        if (this._sendingInProgress) {
            // We want to keep the dialog alive while sending is still in progress.
            // In case the sending fails, we will show errors and allow users to retry.
            canClose = false;
        }
        else if (!this._initializationSucceeded || this._sendingSucceeded || !this._model.isDirty()) {
            // Don't warn users on exit if the dialog isn't initialized, we successfully sent the Email, or the model isn't dirty.
            canClose = true;
        }
        else if (this._skipConfirmCloseDialog) {
            canClose = true;
        }
        else {
            CoreDialogs.MessageDialog.showMessageDialog(AdminResources.ConfirmToDiscardEditedEmail,
                {
                    title: AdminResources.ConfirmCancelTitle
                }).then(() => {
                    this._skipConfirmCloseDialog = true;
                    this.close();
                });
            canClose = false;
        }

        this._disposing = canClose;

        return canClose;
    }

    private _handleError(error: { message: string }) {
        /// <summary>Error handler.</summary>
        Diag.Debug.assertIsNotNull(this._longRunningOperation, "_longRunningOperation");

        if (this._disposing) {
            // In rare cases, e.g. user hit Exit while the long running operation of
            // beginInitialize is still going on, the dialog may be disposed before
            // this callback is invoked. In those cases, we should just return.
            return;
        }

        this._longRunningOperation.endOperation();

        this._updateSendButton(false);

        if (error && error.message) {
            this._messagePane.setError(error.message);
        }
    }

    private _clearErrors() {
        /// <summary>Clears all the displayed errors.</summary>
        this._messagePane.clear();
    }

    private _registerEvents() {
        /// <summary>Register to the model events.</summary>
        this._model.modelValidated(delegate(this, this._onModelValidated));
    }

    private _onModelValidated(errors: any[]) {
        /// <summary>Handler for the model validated event.</summary>
        /// <param name="errors" type="Array">Array of validation errors.</param>
        Diag.Debug.assertParamIsArray(errors, "errors");
        if (errors.length > 0) {
            this._handleError(errors[0]);
            this._updateSendButton(false);
        }
        else {
            this._clearErrors();
            this._updateSendButton(true);
        }
    }

    private _getButtons() {
        /// <summary>Gets the buttons of the dialog.</summary>
        return {
            "send-button": {
                id: "send-button",
                text: AdminResources.SendMailSendButton,
                click: delegate(this, this._onSendClicked)
            }, "cancel-button": {
                id: "cancel-button",
                text: VSS_Resources_Common.CancelText,
                click: delegate(this, this._onCancelClicked)
            }
        };
    }

    private _onCancelClicked() {
        /// <summary>Handler of the cancel button clicked event.</summary>
        this.close();

        //Only send CI Data if the user confirms cancel
        if (this._disposing) {
            this._model.ciOnCancel();
        }
    }

    private _onSendClicked() {
        Diag.logTracePoint("SendMailDialog.SendButtonClicked");

        this._messageForm.checkName((errorMsg?: string) => {
            if (errorMsg) {
                this._updateSendButton(false);
            }
            else {
                this._checkSubjectAndBeginSend();
            }
        });
    }

    private _checkSubjectAndBeginSend() {
        var msg = this._model.getMessage();

        if (!msg.subject) {
            CoreDialogs.MessageDialog.showMessageDialog(VSS_Resources_Common.SendMailNoSubjectWarning,
                {
                    title: VSS_Resources_Common.SendMailNoSubjectWarningTitle
                }).then(() => {
                    this._beginSend();
                });
        }
        else {
            this._beginSend();
        }
    }

    private _beginSend() {
        /// <summary>Handler of the send button clicked event.</summary>
        var that = this, url;

        // Start sending the email in a long running operation
        // so that we can "lock" the dialog with rolling wheel
        // to prevent users from editing the email content, particularly
        // when the Ajax call takes a bit time to finish on low-speed network.
        this._longRunningOperation.beginOperation(() => {
            this._model.sendMessage(
                function (result) {
                    // Sending mail succeeded, closing the dialog
                    that._longRunningOperation.endOperation();

                    that._sendingSucceeded = true;
                    that._sendingInProgress = false;
                    that._model.setDirty(false);

                    if ((result.sendMailWarning) && (result.sendMailWarning.length > 0)) {
                        window.alert(result.sendMailWarning);
                    }

                    that._messageForm._handleSendMailSuccess();

                    that.close();

                    Diag.logTracePoint("SendMailDialog.SendCompleted");
                },
                function (error) {
                    // Sending mail failed, displaying error message.
                    that._longRunningOperation.endOperation();
                    if (error && error.message && error.message.length > 0) {
                        that._handleError({ message: error.message });
                    }
                    else {
                        that._handleError({ message: VSS_Resources_Common.ErrorSendEmail });
                    }

                    that._sendingInProgress = false;

                    that._updateSendButton(false);
                    that._updateCancelButton(true);
                });
        });

        this._sendingInProgress = true;

        // Note: We don't have a good framework support to cancel an async rest api call.
        //   We choose to disable the Cancel button to prevent users from running into such situation.
        this._updateSendButton(false);
        this._updateCancelButton(false);
        this._model.ciOnSend();
    }

    private _updateSendButton(enabled: boolean) {
        /// <summary>Updates the status of the send button.</summary>
        /// <param name="enabled" type="Bool"><c>true</c> to enable the button; otherwise, <c>false</c>.</param>
        this._element.trigger(CoreDialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button: "send-button", enabled: enabled });
    }

    private _updateCancelButton(enabled: boolean) {
        /// <summary>Updates the status of the cancel button.</summary>
        /// <param name="enabled" type="Bool"><c>true</c> to enable the button; otherwise, <c>false</c>.</param>
        this._element.trigger(CoreDialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button: "cancel-button", enabled: enabled });
    }
}

export class Dialogs {

    public static sendMail(model: SendMailDialogModel, options?: any) {
        /// <summary>Displays send mail dialog to send an email using the settings specified for TFS</summary>
        /// <param name="model" type="SendMailDialogModel">The model for the send mail dialog.</param>
        /// <remarks>
        /// Sample Usage:
        //  AdminSendMail.Dialogs.sendMail(new VSS.Host.UI.Common.SendMailDialogModel({
        //      title: "Test Send Mail Title",
        //      subject: "Test Send Mail Subject",
        //      body: "Test Send Mail Body",
        //      useIdentityPickerForTo: true
        //  }));
        /// </remarks>

        Diag.Debug.assertParamIsType(model, SendMailDialogModel, "model");
        CoreDialogs.show(SendMailDialog, $.extend({
            model: model,
            bowtieVersion: 2
        }, options));
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.SendMail", exports);
