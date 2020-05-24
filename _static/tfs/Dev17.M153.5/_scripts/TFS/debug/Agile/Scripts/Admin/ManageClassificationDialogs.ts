import "VSS/LoaderPlugins/Css!Site";
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import CoreDialogs = require("VSS/Controls/Dialogs");
import Diag = require("VSS/Diag");
import Events_Document = require("VSS/Events/Document");
import VSS = require("VSS/VSS");

import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");

import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

import TFS_Admin_Security_NO_REQUIRE = require("Admin/Scripts/TFS.Admin.Security");

import { Enhancement } from "VSS/Controls";
import { SimpleFieldControl } from "Presentation/Scripts/TFS/FeatureRef/SimpleFieldControl";
import { Combo } from "VSS/Controls/Combos";
import { MessageAreaControl } from "VSS/Controls/Notifications";
import { ClassificationMode, CssNode, StructureType } from "Agile/Scripts/Admin/AreaIterations.DataModels";
import { IterationDateUtil } from "Agile/Scripts/Common/IterationDateUtil";
import { domElem } from "VSS/Utils/UI";
import { FieldDataProvider } from "Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

var tfsContext = TfsContext.getDefault();
var delegate = Utils_Core.delegate;

function getDateFormatErrorMessage() {
    /// <summary>Helper function to format message strings for dates</summary>
    var format = AgileResources.EditIterationInvalidDateFormat,
        expectedFormat = Utils_Date.localeFormat(new Date(new Date().getFullYear(), 11, 31), "d");

    return Utils_String.format(format, expectedFormat);
}

export interface ManageClassificationNodeDialogOptions extends CoreDialogs.IModalDialogOptions {
    actionName?: string;
    cssNode?: any;
    syncWorkItemTracking?: boolean;
    operationCompleteCallback?: Function;
    mode?: number;
    defaultDates?: any;
    createNode?: boolean;
    disableLocationEdit?: boolean;
    fieldDataProvider?: any;
    payload?: any;
}

export abstract class ManageClassificationNodeDialog extends CoreDialogs.ModalDialogO<ManageClassificationNodeDialogOptions> {

    public static AreaResources: any = {
        addDialogTitle: AgileResources.CreateAreaDialogTitle,
        editDialogTitle: AgileResources.EditAreaDialogTitle,
        deleteDialogTitle: AgileResources.DeleteAreaDialogTitle,
        nameLabel: AgileResources.AreaNameField,
        pathLabel: AgileResources.Location,
        editDialogNameRequiredMessage: AgileResources.EditAreaNameRequired,
        editDialogInvalidNameTitle: AgileResources.EditAreaInvalidNameTitle,
        editDialogInvalidCharactersDesc: AgileResources.EditAreaInvalidCharactersDesc
    };
    public static IterationResources: any = {
        addDialogTitle: AgileResources.CreateIterationDialogTitle,
        editDialogTitle: AgileResources.EditIterationDialogTitle,
        deleteDialogTitle: AgileResources.DeleteIterationDialogTitle,
        nameLabel: AgileResources.IterationNameField,
        pathLabel: AgileResources.Location,
        editDialogNameRequiredMessage: AgileResources.EditIterationNameRequired,
        editDialogInvalidNameTitle: AgileResources.EditIterationInvalidNameTitle,
        editDialogInvalidCharactersDesc: AgileResources.EditIterationInvalidCharactersDesc
    };

    public static getResources(mode: number): any {
        /// <summary>Gets an object containing the resource strings for the appropriate flavour of the dialog (area vs iterations).
        /// The object contains string for dialog titles and labels.</summary>
        /// <param name="mode" type="Number">The mode (area or iterations)</param>
        /// <returns type="Object" />
        switch (mode) {
            case ClassificationMode.MODE_AREAS:
                return ManageClassificationNodeDialog.AreaResources;
            case ClassificationMode.MODE_ITERATIONS:
                return ManageClassificationNodeDialog.IterationResources;
            default:
                Diag.Debug.fail("Unexpected mode: " + mode);
                return null;
        }
    }

    private _validator: FormFieldsManager;
    private _errorPane: any;
    private _$nodeName: any;
    private _isDirty: boolean;
    private _runningDocumentEntry: any;
    private _requestContext: any;
    private _dataProvider: any;

    constructor(options?: any) {
        /// <summary>Base class for all classification node management dialogs</summary>
        /// <param name="options" type="Object">Options for the dialog.</param>

        super(options);

        Diag.Debug.assertParamIsObject(options, "options");

        this._validator = new FormFieldsManager({ onError: delegate(this, this._displayError) });
        this._dataProvider = options.fieldDataProvider;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        var dialogHeight = options.mode === ClassificationMode.MODE_AREAS ? 330 : 460;

        super.initializeOptions($.extend({
            resizable: true,
            width: 450,
            height: dialogHeight,
            bowtieVersion: 2,
            minWidth: 450,
            minHeight: dialogHeight,
            defaultButton: "action",
            buttons: {
                "action": {
                    id: "action",
                    text: options.actionButtonName,
                    click: delegate(this, this._onActionButtonClicked)
                },
                "cancel": {
                    id: "cancel",
                    text: VSS_Resources_Platform.ModalDialogCancelButton,
                    click: delegate(this, this.onCancelClick) // This callback is reused from VSS.UI.Controls.ModalDialog
                }
            },
            beforeClose: delegate(this, this.beforeClose),
            syncWorkItemTracking: false
        }, options));
    }

    public initialize() {
        /// <summary>OVERRIDE: Initializes the dialog fields</summary>
        var $dialogContent = $(domElem('div', 'admin-dialog')),
            $errorPane = this._createErrorPane(),
            $nodeName = this._createNodeName(this._options.cssNode.getText());

        super.initialize();

        // Create the layout for the dialog.</summary>
        $dialogContent.append($errorPane)
            .append($nodeName)
            .appendTo(this._element);

        this._createLayout($dialogContent);


        this._validator.validate();
        this._$setFormFocus();
        this._runningDocumentEntry = Events_Document.getRunningDocumentsTable().add("ManageClassificationsDialog", this);
    }

    public _attachDirtyHandler($field) {
        /// <summary>Capture the current value of the field and attaches a handler which checks
        /// if the value has changed in order to mark the dialog as dirty or not.</summary>
        Diag.Debug.assertParamIsObject($field, "$field");

        var that = this,
            val = $field.val(),  // capture current value
            checkForDirty = function () {
                // compare current value against captured value - mark dirty if different.
                if ($field.val() !== val) {
                    that.isDirty(true);
                }
            };

        $field.change(checkForDirty)
            .keyup(checkForDirty);
    }

    public _$getValidator() {
        /// <summary>Get the form validator</summary>
        return this._validator;
    }

    public _displayError(field: any, message: string, options?: any) {
        /// <summary>Displays a validation error message</summary>
        /// <param name="field" type="DOM">The field (DOM element) being validated. Currently not used.</param>
        /// <param name="message" type="String">The validation error message</param>
        /// <param name="options" type="Object">Options for adding extra details to the error pane beyond the specified simple message.</param>

        Diag.Debug.assertParamIsStringNotEmpty(message, "message");

        this._errorPane.setError({
            header: message,
            content: options && options.errorDetails
        });
    }

    public _$enableButtons(active, cancel: boolean) {
        /// <summary>Set the enabled/disabled state of the dialog's buttons</summary>
        /// <param name="action" type="Bool">Enabled state of the active button</param>
        /// <param name="cancel" type="Bool">Enabled state of the cancel button</param>
        Diag.Debug.assertParamIsBool(active, "active");
        Diag.Debug.assertParamIsBool(cancel, "cancel");

        this._updateButton("action", active);
        this._updateButton("cancel", cancel);
    }

    public setNodeName(name?: string) {
        /// <summary>Set the name of the node</summary>
        /// <param name="name" type="String" optional="true">(Optional) The name of the node</param>
        if (name) {
            Diag.Debug.assertParamIsString(name, "name");
        }

        name = (name || "").trim();

        if (name) {
            this._$nodeName.text(name);
        }
        else {
            this._$nodeName.html("&nbsp");
        }
    }

    public beforeClose(e?, ui?) {
        // don't close if there's a pending server request
        if (this._requestContext && !this._requestContext.isComplete) {
            return false;
        }

        // if dirty, ask the user if they want to continue
        return (!this._isDirty || window.confirm(AgileResources.UnsavedChangesPrompt));
    }

    public onClose(e?) {
        /// <summary>OVERRIDE: Cleanup on the dialog - unregister from the RunningDocuments table</summary>
        Events_Document.getRunningDocumentsTable().remove(this._runningDocumentEntry);

        super.onClose(e);
    }

    public isDirty(dirty?: boolean): boolean {
        /// <summary>Gets or sets whether the dialog is dirty for use by the RunningDocuments table</summary>
        /// <param name="dirty" type="Boolean">If passed in, then sets the dirty value (called by sub-classes).
        /// If the parameter is undefined then returns the current dirty value.</param>
        /// <returns type="Boolean" />
        if (typeof dirty === "undefined") {
            return this._isDirty;
        }
        else {
            this._isDirty = dirty;
        }
    }

    public _createLayout($dialogContent: JQuery) {
        /// <summary>Creates the layout content for the dialog. Subclasses should override this method and append
        /// their contents to the jQuery object passed in.</summary>
        /// <param name="$dialogContent" type="jQuery">A jQuery object that is the container for the dialog's contents.</param>
        Diag.Debug.assertParamIsObject($dialogContent, "$dialogContent");
    }

    private _createErrorPane(): JQuery {
        /// <summary>Add the error pane element to the parent element</summary>
        /// <returns type="jQuery">The element containing the message area</returns>
        var $errorPaneDiv = $(domElem('div'));

        this._errorPane = <MessageAreaControl>Enhancement.enhance(MessageAreaControl, $errorPaneDiv, {}, {
            ariaAttributes: {
                live: "polite"
            }
        });

        return $errorPaneDiv;
    }

    private _createNodeName(text: string) {
        /// <summary>Create the DOM element which holds the node's name</summary>
        /// <param name="text" type="String">The text for the node</param>
        Diag.Debug.assertParamIsString(text, "text");

        this._$nodeName = $(domElem('div', 'dialog-header'));
        this.setNodeName(text);

        return this._$nodeName;
    }

    private _onActionButtonClicked() {
        /// <summary>Invoked when the dialog's action button clicked</summary>

        Diag.logTracePoint('ManageClassificationNodeDialog._onActionButtonClicked.start');

        var operationData,
            actionUrl;

        if (this._validator.validate()) {
            operationData = this._$getOperationData();

            // NOTE: Using "Areas" controller to get the action URL because the actions used on the dialog are part of the base controller used by both Areas and Iterations.
            actionUrl = tfsContext.getActionUrl(
                this._options.actionName,
                "Areas",
                {
                    area: "admin",
                    team: "",
                    includeVersion: true,
                    useApiUrl: true
                });

            // Don't do anything if the operation data came back as null. This means that the dialog is not ready to execute the action
            // (potentially same fields are not valid). Hitting this condition means that something is wrong with fields validation logic.
            if (operationData === null) {
                Diag.Debug.fail("Dialog action button was enabled when the dialog is not ready to execute its action!");
                return;
            }

            this._requestContext = Ajax.postMSJSON(
                actionUrl,
                {
                    operationData: Utils_Core.stringifyMSJSON(operationData),
                    syncWorkItemTracking: this._options.syncWorkItemTracking
                },
                delegate(this, this._onActionComplete),
                delegate(this, this._onActionFail),
                {
                    wait: {
                        image: tfsContext.configuration.getResourcesFile('big-progress.gif'),
                        message: Utils_String.htmlEncode(AgileResources.ProgressPleaseWait),
                        target: this._element
                    }
                }
            );

            this._startActionInProgressIndication();
        }
    }

    private _$setFormFocus() {
        /// <summary>Sets focus on the first enabled input element in the dialog. Can be overridden by derived classes to set focus differently</summary>
        var that = this,
            $firstInput = $('input:not([disabled])', that._element).eq(0);

        this.setFormFocusDelayed($firstInput);
    }

    public _$getFormFields(): any[] {
        /// <summary>Get descriptors for this forms fields.</summary>
        /// <returns type="Array">Returns array of objects containing label text for a field and field's element.</returns>

        Diag.Debug.fail("Derived classes MUST override _$getFormFields");

        return null;
    }

    public _$getOperationData(): any {
        /// <summary>Get data object for the action.</summary>
        /// <returns type="Object"/>

        Diag.Debug.fail("Derived classes MUST override _$getOperationData");
    }

    private _startActionInProgressIndication() {
        /// <summary>Puts dialog into "operation in progress" mode</summary>

        // Enable RunningDocumentTable support for the duration of the call
        this.isDirty(true);
        this._$enableButtons(false, false);
    }

    private _stopActionInProgressIndication() {
        /// <summary>Quits "operation in progress" mode</summary>
        this._$enableButtons(true, true);
    }

    private _updateButton(button: string, enabled: boolean) {
        /// <summary>Updates button's status</summary>
        /// <param name="button" type="String">Button ID</param>
        /// <param name="enabled" type="Boolean">True if the button needs to be enabled</param>
        this._element.trigger(CoreDialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button: button, enabled: enabled });
    }

    private _onActionComplete(completeResult: any) {
        /// <summary>Invoked when the request was completed</summary>
        /// <param name="completeResult" type="object">Provides result of a competed request. Properties:
        ///     success (Boolean): true if the operation was completed successfully.
        ///     message (String): any error message coming from the controller
        /// </param>

        Diag.Debug.assertParamIsObject(completeResult, "completeResult");

        var cssNode: CssNode;

        this._stopActionInProgressIndication();

        if (completeResult.success) {

            // we've had a successful response so the data in the dialog is no longer dirty
            this.isDirty(false);

            // update any interested callback with the operations result data
            Diag.Debug.assert(completeResult.message === "", "Successful result cannot contain any error message");
            if ($.isFunction(this._options.operationCompleteCallback)) {

                if (completeResult.node) {
                    cssNode = CssNode.create(completeResult.node, this._dataProvider);
                }

                this._options.operationCompleteCallback(cssNode);
            }

            this.close();
            Diag.logTracePoint('TFS.Admin.AreaIterations.ManageClassificationNodeDialog.inherit._onActionComplete.complete');
        }
        else {
            this._displayError(null, AgileResources.UnexpectedErrorChangesNotSaved, { errorDetails: completeResult.message });
        }
    }

    private _onActionFail(error: any) {
        /// <summary>Invoked when the request failed</summary>
        /// <param name="error" type="object">Provides more details about failed request.</param>
        Diag.Debug.assertParamIsObject(error, "error");

        this._stopActionInProgressIndication();
        this._displayError(null, AgileResources.UnexpectedErrorChangesNotSaved, { errorDetails: error.message });
    }
}

/**
 * The dialog to create or edit an area or iteration node.
 */
export class CreateEditIterationDialog extends ManageClassificationNodeDialog {

    private _$nameField: any;
    private _$startDateField: any;
    private _$endDateField: any;
    private _$pathField: any;
    private _fieldControl: any;
    private _parentId: any;
    private _resources: any;

    constructor(options?: any) {
        /// <summary>Constructs edit/create iteration dialog</summary>
        /// <param name="options" type="Object">Options for the dialog.
        /// {
        ///     "mode" type="Number", The dialog mode - areas or iterations
        ///     "createNode": type="Boolean", True if the new iteration needs to be created
        ///     "cssNode": The css node created from DataModels.CssNode
        ///     "operationCompleteCallback" type="Function" mayBeNull="true", The callback is invoked when the save operation has been successfully completed
        ///     "close" type=Function" mayBeNull="true", The callback is invoked whenever the dialog is closed.
        ///     "syncWorkItemTracking" type=Boolean, Indicates whether we should run initiate a sync for work item tracking after the CSS change is saved
        ///     "defaultDates": optional - an object that holds default dates for "start" and "end" of the sprint
        /// }
        /// </param>
        /*jslint regexp: false*/

        super(options);

        Diag.Debug.assertParamIsObject(options, "options");

        this._resources = ManageClassificationNodeDialog.getResources(options.mode);
        this.setTitle(options.createNode ? this._resources.addDialogTitle : this._resources.editDialogTitle);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            cssClass: "edit-classification-host",
            actionName: options.createNode ? "CreateClassificationNode" : "UpdateClassificationNode",
            actionButtonName: AgileResources.SaveAndCloseButtonName,
            open: (event, ui) => {
                if (!options.createNode) {
                    this._checkNodePermission(options.cssNode);
                }
            }
        }, options));
    }

    public initialize() {
        /// <summary>OVERRIDE: Initializes the dialog fields</summary>
        var validCssNodeNameCharacters = /^[^\\\/$?*:"&<>#%|\+]*$/, // regular expression to check for valid characters
            illegalCssNames = /^(prn|com1|com2|com3|com4|com5|com6|com7|com8|com9|com10|lpt1|lpt2|lpt3|lpt4|lpt5|lpt6|lpt7|lpt8|lpt9|nul|con|aux|\.|\.\.)$/, // regular expression to check for invalid css names
            options = this._options,
            parent = options.cssNode.getParent(),
            validator,
            propagateNameChange = delegate(this, this._propagateNameChange);

        this._$nameField = $("<input type='text' class='requiredInfoLight' id='fieldName'/>")
            .val(options.cssNode.getText())
            .attr("aria-required", "true");
        if (!parent) {
            this._$nameField.attr("disabled", true);
        }
        this._$startDateField = $("<input type='text' id='fieldStartDate' />").val(this._formatDateValue(options.cssNode.getStartDate())).attr("aria-required", "true");
        this._$endDateField = $("<input type='text' id='fieldEndDate' />").val(this._formatDateValue(options.cssNode.getEndDate())).attr("aria-required", "true");
        this._$pathField = this._setupLocationField(parent, 'fieldLocation').attr("aria-required", "true");

        // Setup validation
        validator = this._$getValidator();
        validator.addRequiredValidation(this._$nameField[0], this._resources.editDialogNameRequiredMessage);
        validator.addRegexValidation(this._$nameField[0], AgileResources.EditIterationInvalidCharactersTitle, validCssNodeNameCharacters, {
            errorDetails: $("<span>").html(this._resources.editDialogInvalidCharactersDesc) // Must be added as jQuery object or html will be escaped when rendered
        });

        validator.addRegexValidation(this._$nameField[0], AgileResources.EditIterationInvalidNameLength, /^.{1,255}$/);
        validator.addValidation(this._$nameField[0], function (value, options) { return !illegalCssNames.test(value.toLowerCase()); }, this._resources.editDialogInvalidNameTitle, {
            errorDetails: $("<span>").html(AgileResources.EditIterationInvalidNameDesc) // Must be added as jQuery object or html will be escaped when rendered
        });

        if (options.mode === ClassificationMode.MODE_ITERATIONS) {
            validator.addTypeValidation(this._$startDateField[0], getDateFormatErrorMessage(), Date);
            validator.addTypeValidation(this._$endDateField[0], getDateFormatErrorMessage(), Date);
        }

        this._$nameField.change(propagateNameChange)
            .blur(propagateNameChange)
            .keyup(propagateNameChange);

        super.initialize();

        // do initial name propagation to set the classification path
        propagateNameChange();
    }

    public beginHasWritePermissions(nodeId: string, callback: IResultCallback, errorCallback?: IErrorCallback): any {
        /// <summary>Check whether the current user has the specified permissions on the CSS node</summary>
        /// <param name="nodeId" type="String">GUID for the iteration node we're checking for permissions</param>
        /// <param name="callback" type="IResultCallback">The function to call with the permission check result</param>
        /// <param name="errorCallback" type="IErrorCallback">The function to call when there's an error checking permissions</param>
        /// <returns type="object">The request context</returns>
        Diag.Debug.assertParamIsStringNotEmpty(nodeId, "nodeId");
        if (callback) {
            Diag.Debug.assertParamIsFunction(callback, "callback");
        }
        if (errorCallback) {
            Diag.Debug.assertParamIsFunction(errorCallback, "errorCallback");
        }

        var actionUrl = tfsContext.getActionUrl("HasPermissions", "classification", {
            area: "api",
            useApiUrl: true
        });

        return Ajax.getMSJSON(
            actionUrl,
            {
                nodeId: nodeId,
                genericWriteAccess: true
            },
            function (data) {
                callback(data);
            },
            errorCallback,
            {
                wait: {
                    image: tfsContext.configuration.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(AgileResources.ProgressVerifyingPermissions),
                    target: this._element,
                    showDelay: 500
                }
            }
        );
    }

    public _createLayout($dialogContent) {
        /// <summary>OVERRIDE: Create the Edit dialog's content by appending it to $dialogContent</summary>
        var that = this,
            i, l,
            $editControl,
            $fieldsContainer,
            $row,
            fields,
            labelName,
            field,
            fieldId,
            startCombo,
            endCombo;

        $editControl = $(domElem('div', 'areas-iterations-edit-control'));
        $fieldsContainer = $("<div>").appendTo($editControl);

        function convertUtcToLocal(utc) {
            // TODO: We should really take advantage of the functionality in the VSS.Agile.Utils_Core.dateUtil class
            // That needs to be merged with the VSS.Admin.AreaIterations.DataModels.IterationDateUtil class into
            // some framework utility that is consumed by all.
            return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
        }

        function getDefaultEndDate() {
            /// <summary>Default the date to the start date (either the one entered, or the default start date, or today)
            /// plus the default offset (if set). i.e.
            /// (enteredStartDate || defaultStartDate) + (offset || 0).</summary>
            /// <returns type="Date" />

            var defaults = that._options.defaultDates,
                offset = (defaults && defaults.offset) || 0,
                start = startCombo.getBehavior().getSelectedDate(),
                end;

            if (!start && defaults && defaults.start) {
                start = convertUtcToLocal(defaults.start);
            }

            if (start) {
                end = new Date(start.getTime());
                if (offset) {
                    end.setDate(end.getDate() + offset);
                }
            }

            return end;
        }

        // Populate fields container with fields. The form fields array contain pairs of field label and field element itself.
        fields = this._$getFormFields();
        for (i = 0, l = fields.length; i < l; i += 1) {
            labelName = fields[i][0];
            field = fields[i][1];

            $row = $("<div>").addClass("form-section");

            fieldId = field.attr("id") || $("input", field).attr("id");
            Diag.Debug.assertIsStringNotEmpty(fieldId, "Expected fieldId to be non-empty for use as id");
            $(domElem("label")).attr("for", fieldId).text(labelName).appendTo($row);

            field.appendTo($row);

            if (!field.attr('readonly')) {
                this._attachDirtyHandler(field);
            }

            $row.appendTo($fieldsContainer);
        }

        $dialogContent.append($editControl);

        // I used the body here to prevent the date panel from inheriting the style of 100% width and prevent it of being trimmed on IE9
        startCombo = <Combo>Enhancement.enhance(Combo, this._$startDateField, {
            type: "date-time",
            dropOptions: {
                host: $(document.body)
            },
            dropHide: function () {
                // when the calendar controls closes, set the end date. Note that we're deliberately,
                // not doing this on all value changes - just when selected through the pop-up calendar.
                if (!endCombo.getText() && that._options.defaultDates) {
                    endCombo.getBehavior().setSelectedDate(getDefaultEndDate());
                }
                return true; // true = dispose/close the calendar control
            },
            getInitialDate: function (combo) {
                return that._options.defaultDates ? convertUtcToLocal(that._options.defaultDates.start) : null;
            },
            setTitleOnlyOnOverflow: true
        });
        endCombo = <Combo>Enhancement.enhance(Combo, this._$endDateField, {
            type: "date-time",
            dropOptions: {
                host: $(document.body)
            },
            getInitialDate: function (combo) {
                return getDefaultEndDate();
            },
            setTitleOnlyOnOverflow: true
        });
    }

    private _setupLocationField(parent: CssNode, id): JQuery {
        /// <summary>Setup the field for editing or displaying the location/parent path.
        /// As a side-effect, this function also sets the _parentId property.
        /// The function returns the DOM element for the field</summary>
        /// <param name="parent" type="DataModels.CssNode">The CssNode for the parent location (or null if the node is the root and has no parent)</param>
        /// <returns type="jQuery" />
        Diag.Debug.assertParamIsStringNotEmpty(id, "id");

        var that = this,
            options = this._options,
            parentDataProvider,
            $field,
            disableLocationEdit = !parent || options.createNode || options.disableLocationEdit;

        // setup the control that displays the parent field
        if (disableLocationEdit) {
            // when we're editing the top-level node or adding a new node the location is
            // displayed as a disabled text box
            $field = $("<input type='text' class='requiredInfoLight' disabled='true' />").attr("id", id);

            if (parent) {
                $field.val(parent.getPath());
                this._parentId = parent.getId();
            }
        }
        else {
            // when editing an existing (non-root) node the location is displayed as
            // a drop-down combo
            $field = $("<div>").addClass("field-control");

            parentDataProvider = new FieldDataProvider(options.fieldDataProvider.cloneSource());
            // We don't want to show the current node in the list since the list contains the new parent.
            parentDataProvider.removeNode(this._options.cssNode.getId());

            this._fieldControl = new SimpleFieldControl($field, parentDataProvider, { allowEdit: false, id: id });
            // Setup the default selection in the field control.
            this._fieldControl.setSelectedNodeById(this._options.cssNode.getParentId());
            this._fieldControl.attachFieldChanged(function (source, args) {
                that._parentId = args.node.id;
            });

            this._parentId = parent.getId();
        }

        return $field;
    }

    public _$getFormFields(): any[] {
        /// <summary>OVERRIDE: Get descriptors for this forms fields.</summary>
        /// <returns type="Array">Returns array of objects containing label text for a field and field's element.</returns>

        var fields = [];

        fields.push([this._resources.nameLabel, this._$nameField]);
        if (this._options.mode === ClassificationMode.MODE_ITERATIONS) {
            fields.push([AgileResources.StartDateField, this._$startDateField]);
            fields.push([AgileResources.EndDateField, this._$endDateField]);
        }
        fields.push([this._resources.pathLabel, this._$pathField]);

        return fields;
    }

    private _propagateNameChange() {
        /// <summary>Apply any name changes to the Path and Node name fields in the dialog. This is called when then node name changes</summary>
        var name = this._$nameField.val();

        this.setNodeName(name);
    }

    private _formatDateValue(date: Date): string {
        /// <summary>Formats Date value to how it should be presented on the form</summary>
        /// <param name="date" type="Date" mayBeNull="true">The value to format</param>
        /// <returns type="string"/>
        Diag.Debug.assert(date === null || (date instanceof Date), "date parameter can be either null or an an instance of Date");
        if (!date) {
            return "";
        }
        let utcDate = Utils_Date.shiftToUTC(date);
        return Utils_Date.localeFormat(utcDate, "d", /*ignoreTimeZone*/ true);
    }

    private _parseDateValue(date: string): Date {
        /// <summary>Attempts to parse the given string into a date value</summary>
        /// <param name="date" type="string">The value to format</param>
        /// <returns type="Date" mayBeNull="true">Returns the parsed date value or null if the input parameter doesn't represent a valid date.<returns/>
        Diag.Debug.assertParamIsString(date, "date");

        var result = null;

        if (date !== "") {
            try {
                // Parse the date string as though it were a UTC value (not the current timezone) but using the user's local date format.
                // The date string should be considered a date in the UTC timezone, but formatted with the user's current locale.
                result = IterationDateUtil.parseLocaleUTC(date, "d");
            }
            catch (e) {
                Diag.Debug.fail("Failed to parse iteration date");
            }
        }

        return result;
    }

    public _$getOperationData(): any {
        /// <summary>OVERRIDE: Get data object for update/create node operation.</summary>
        /// <returns type="Object"/>

        return {
            NodeId: this._options.cssNode.getId(), // true = return null ID as empty GUID string,
            NodeName: this._$nameField.val(),
            IterationStartDate: this._parseDateValue(this._$startDateField.val()),
            IterationEndDate: this._parseDateValue(this._$endDateField.val()),
            ParentId: this._parentId
        };
    }

    private _checkNodePermission(cssNode: CssNode) {
        /// <summary>Check that the user has edit permissions for the code being edited</summary>
        /// <param name="cssNode" type="DataModels.CssNode">The CSS Node</param>
        Diag.Debug.assertParamIsObject(cssNode, "cssNode");

        var that = this,
            nodeId = cssNode.getId();

        this._$enableButtons(false, false);
        this.beginHasWritePermissions(nodeId,
            function (result) {
                if (!that.getElement()) {
                    // dialog was closed before we completed.
                    return;
                }
                if (!result.hasPermission) {
                    that._displayError(null, AgileResources.CssNodeNoEditPermissions, { errorDetails: result.errorMessage });
                }
                that._$enableButtons(result.hasPermission, true);
            },
            function (error) {
                if (that.getElement()) { // check that the dialog is till open.
                    that._displayError(null, AgileResources.UnexpectedServerError, { errorDetails: error.message });
                    that._$enableButtons(false, true);
                }
            }
        );
    }
}

/**
 * The dialog to delete an area or iteration node.
 */
export class DeleteClassificationNodeDialog extends ManageClassificationNodeDialog {

    private _fieldProvider: any;
    private _fieldControl: any;
    private _$iterationPicker: any;
    private _resources: any;

    constructor(options?) {
        /// <summary>Creates a new instance of the DeleteClassificationNodeDialog object and passes it the specified options.</summary>
        /// <param name="options">Setup and initialization options used to configure the object.</param>

        super(options);

        Diag.Debug.assertParamIsObject(options, "options");

        this._resources = ManageClassificationNodeDialog.getResources(options.mode);
        this.setTitle(this._resources.deleteDialogTitle);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            actionName: "DeleteClassificationNode",
            actionButtonName: AgileResources.DeleteButtonName
        }, options));
    }

    public initialize() {
        /// <summary>Initializes the dialog, creating the new field control and updating the payload to exclude
        /// the node being removed.</summary>

        var comboOptions = {
            allowEdit: false
        };

        super.initialize();

        this._fieldProvider = new FieldDataProvider(this._options.payload);
        this._fieldControl = new SimpleFieldControl(this._$iterationPicker, this._fieldProvider, comboOptions);

        // Setup the default selection in the field control.
        this._fieldControl.setSelectedNodeById(this._options.cssNode.getParentId());

        // We don't want to show the current node in the list since the list contains the new parent.
        this._fieldProvider.removeNode(this._options.cssNode.getId());
    }

    public _createLayout($dialogContent) {
        /// <summary>OVERRIDE: Create the Delete dialog's content by appending it to $dialogContent</summary>
        $("<p/>").text(AgileResources.ConfirmDeleteAreaIteration)
            .appendTo($dialogContent);

        $(domElem("div", "delete-iterations-field-label"))
            .text(AgileResources.DeleteIterationsSelectNewPathLabel)
            .appendTo($dialogContent);

        this._$iterationPicker = $(domElem("div", "field-control admin-iterations-container"));
        this._$iterationPicker.appendTo($dialogContent);
    }

    public _$getOperationData(): any {
        /// <summary>OVERRIDE: Get data object for update/create node operation.</summary>
        /// <returns type="Object"/>

        return {
            NodeId: this._options.cssNode.getId(),
            ParentId: this._fieldControl.getSelectedNode().id
        };
    }
}

/**
 * Contains the validation logic for the ManageClassificationNodeDialog.
 * Public for unit testing
 */
export class FormFieldsManager {

    /**
     * Validator that ensures a field value has been supplied
     * 
     * @return 
     */
    public static requiredValidator(value): boolean {
        return Boolean($.trim(value));
    }

    /**
     * Validator that checks the value against a regular expression
     * 
     * @param value The value to check
     * @param options Object with a "regex" property that defines the regular expression
     * @return 
     */
    public static regexValidator(value: string, options?: any): boolean {
        Diag.Debug.assertIsString(value, "value");
        Diag.Debug.assertParamIsObject(options, "options");
        Diag.Debug.assertParamIsNotUndefined(options.regex, "options.regex");

        var regex;

        // empty value is always valid - add a required validator if you don't want empty values
        if (value === "") {
            return true;
        }

        regex = options.regex;
        if (typeof regex === "string") {
            regex = new RegExp(regex);
        }
        Diag.Debug.assert(regex instanceof RegExp, "Expected regex to be a regular expression");

        return regex.test(value);
    }

    /**
     * Validator that checks the value is of a specified type (currently only Date)
     * 
     * @param value The value to check
     * @param options Object with a "type" property that defines the type to check against, and an optional "format" property
     * @return 
     */
    public static typeValidator(value: string, options?: any): boolean {
        Diag.Debug.assertIsString(value, "value");
        Diag.Debug.assertParamIsObject(options, "options");
        Diag.Debug.assertParamIsFunction(options.type, "options.type");

        var type = options.type,
            format;

        // empty value is always valid - add a required validator if you don't want empty values
        if (value === "") {
            return true;
        }

        if (type === Date) {
            format = options.format || "d";
            return Utils_Date.parseLocale(value, format) !== null;
        }
        else {
            Diag.Debug.fail("Type checking not implemented: " + type.toString());
            return false;
        }
    }

    private _fields: any;
    private _options: any;

    /**
     * Manages validation for a set of fields
     */
    constructor(options?) {

        this._fields = [];
        this._options = $.extend({
            failureCss: "validation-failure",
            onError: function (field, message) { window.alert(message); }
        }, options);
    }

    /**
     * Add a field for validation, binds the validator to the field and returns the handle for the validator
     * 
     * @param field DOM Element to bind to
     * @param validate Function(value, options), The function which will perform the validation.
     *    It is passed the value to validate and the options provided when the validator was registered.
     *    this is set to the field (DOM element) being validated
     * @param message The message to raise if validation fails
     * @param options Options that are passed to the validator 
     * @return 
     */
    public addValidation(field: any, validate: Function, message: string, options?: any): any {
        Diag.Debug.assertParamIsObject(field, "field");
        Diag.Debug.assertParamIsFunction(validate, "validate");
        Diag.Debug.assertParamIsString(message, "message");

        var that = this,
            defaultEvents = {
                blur: {},
                change: {}
            },
            handleEvent,
            event,
            $field = $(field),
            events,
            validationEntry,
            validators;

        options = $.extend({}, { events: defaultEvents }, options);
        events = options.events;
        validationEntry = {
            validate: validate,
            message: message,
            options: options
        };

        // bind validator to field events
        handleEvent = function (event) {
            that._executeValidator(field, validationEntry, event);
            return true; // return true because we don't want to stop the event's actions just because the value is invalid
        };

        for (event in events) {
            if (events.hasOwnProperty(event)) {
                $field.bind(event, events[event], handleEvent);
            }
        }

        // store the field validation details for use by validate()
        validators = this._getFieldValidators(field);
        validators.push(validationEntry);

        return handleEvent;
    }

    /**
     * Add a required field validator for a field
     * 
     * @param field The DOM element to check for required values
     * @param message The message to raise if validation fails
     * @param options OPTIONAL: The options to use when validating the field.
     */
    public addRequiredValidation(field: any, message: string, options?: any) {

        Diag.Debug.assertParamIsObject(field, "field");
        Diag.Debug.assertParamIsString(message, "message");

        return this.addValidation(field, FormFieldsManager.requiredValidator, message, options);
    }

    /**
     * Add a required field validator for a field
     * 
     * @param field The DOM element to check for required values
     * @param message The message to raise if validation fails
     * @param regex The regular expression to use for validation. This can be a RegExp object or a regular expression string
     * @param options OPTIONAL: The options to use when validating the field.
     */
    public addRegexValidation(field: any, message: string, regex: string, options?: any) {

        Diag.Debug.assertParamIsObject(field, "field");
        Diag.Debug.assertParamIsString(message, "message");
        Diag.Debug.assertParamIsNotUndefined(regex, "regex"); // Chrome thinks a RegExp is a function, IE thinks it's an object, so won't test for anything other than undefined

        options = $.extend({ regex: regex }, options);

        return this.addValidation(field, FormFieldsManager.regexValidator, message, options);
    }

    /**
     * Add a type validator for a field
     * 
     * @param field The DOM element to check for required values
     * @param message The message to raise if validation fails
     * @param type The type to validate against
     * @param format (optional) Format string. For Dates this is the format date string
     */
    public addTypeValidation(field: any, message: string, type: any, format?: string) {
        Diag.Debug.assertParamIsObject(field, "field");
        Diag.Debug.assertParamIsString(message, "message");
        Diag.Debug.assertParamIsFunction(type, "type");

        if (!format) {
            if (type === Date) {
                format = "d";
            }
        }

        return this.addValidation(field, FormFieldsManager.typeValidator, message, { type: type, format: format });
    }

    /**
     * Executes all validators and returns a value indicating whether all fields are valid
     * 
     * @return 
     */
    public validate(): boolean {
        var i, l,
            fields = this._fields,
            isValid = true;

        // iterate across fields and validate each
        for (i = 0, l = fields.length; i < l; i += 1) {
            isValid = this._validateField(fields[i].field, fields[i].validators) && isValid;
        }

        return isValid;
    }

    /**
     * Validate a field using a list of validators and return true if all the validators are valid
     * 
     * @param field The field (DOM Element) to validate
     * @param validators The array of validators to execute on the field
     * @return 
     */
    private _validateField(field: any, validators: any[]): boolean {
        var i, l,
            isValid = true;

        // iterate across registered validators for the field
        for (i = 0, l = validators.length; i < l; i += 1) {
            isValid = this._executeValidator(field, validators[i]) && isValid;
        }

        return isValid;
    }

    /**
     * Validate a field
     * 
     * @param field The field to validate
     * @param validationEntry The field validation details
     * @param event The event that triggered the validation
     * @return true if the field is valid, false otherwise
     */
    private _executeValidator(field: any, validationEntry: any, event?: any): boolean {

        Diag.Debug.assertParamIsObject(field, "field");
        Diag.Debug.assertParamIsObject(validationEntry, "validationEntry");

        var localOptions,
            failureCss = this._options.failureCss,
            isValid = true,
            $field = $(field),
            value = $field.val(),
            hasClass = $field.hasClass(failureCss);

        localOptions = $.extend({}, this._options, validationEntry.options);

        if (!validationEntry.validate.call(field, value, localOptions, event)) {
            isValid = false;
            localOptions.onError.call(this, field, Utils_String.format(validationEntry.message, value), localOptions);
        }

        if (!isValid && !hasClass) {
            // add the message and mark up the element
            $field.addClass(failureCss);
        }
        else if (isValid && hasClass) {
            // remove any validation class
            $field.removeClass(failureCss);
        }

        return isValid;
    }

    /**
     * Get an array of the registered validators for a field
     * 
     * @param field The field (DOM Element) to get validators for
     */
    private _getFieldValidators(field: any) {
        var i, l,
            fields = this._fields,
            fieldEntry;

        // look for an existing entry
        for (i = 0, l = fields.length; i < l; i += 1) {
            fieldEntry = fields[i];

            if (fieldEntry.field === field) {
                return fieldEntry.validators;
            }
        }

        // didn't find field so create a new entry
        fieldEntry = {
            field: field,
            validators: []
        };
        fields.push(fieldEntry);

        return fieldEntry.validators;
    }
}

/**
 * Module, used to launch dialogs which manage classification nodes.
 */
export module ClassificationDialogs {
    export function showEditClassificationDialog(cssNode: CssNode, saved: Function, options?: any): CreateEditIterationDialog {
        /// <summary>Displays a dialog to add or edit classification nodes (iterations or areas)</summary>
        /// <param name="cssNode" type="DataModels.CssNode">The node to operate on</param>
        /// <param name="saved" type="Function">Callback which is called with the save node details</param>
        /// <param name="options" type="Object">Options for controlling the dialog behavior:
        /// Options:
        ///   close: type="Function"; call back when dialog is closed, regardless of whether it was saved or not; Default: undefined
        ///   createNode: type="Boolean" Should the dialog be creating a new node; Default: false
        ///   disableLocationEdit: type="Boolean"; Should editing of the location combo be disabled? Default: false
        ///   syncWorkItemTracking: type="Boolean"; Indicates whether we should run initiate a sync for work item tracking after the CSS change is saved; Default: false
        ///   previousIteration: type="DataModels.CssNode"; The previous node (if there is one),
        ///   weekends: type="number[]"; The days of the week (0-6) that are considered weekend days
        /// </param>
        Diag.Debug.assertParamIsObject(cssNode, "cssNode");
        Diag.Debug.assertParamIsFunction(saved, "saved");

        var isIterationNode = cssNode.getStructureType() === StructureType.Iterations,
            previousIteration = options.previousIteration,
            defaults = {
                fieldDataProvider: cssNode.dataAdapter,
                mode: isIterationNode ? ClassificationMode.MODE_ITERATIONS : ClassificationMode.MODE_AREAS
            },
            overrides = {
                cssNode: cssNode,
                operationCompleteCallback: saved
            };

        options = $.extend(defaults, options, overrides);

        if (isIterationNode && previousIteration && previousIteration.getStartDate() && previousIteration.getEndDate()) {
            const {
                suggestedStartDate,
                workingDaysOffset
            } = IterationDateUtil.getIterationDateDefaultInformation(previousIteration.getStartDate(), previousIteration.getEndDate(), options.weekends);

            $.extend(options, {
                defaultDates: {
                    start: suggestedStartDate,
                    offset: workingDaysOffset
                }
            });
        }

        return CoreDialogs.Dialog.show(CreateEditIterationDialog, options);
    }

    export function showDeleteClassificationDialog(options?: any): DeleteClassificationNodeDialog {
        /// <summary>Displays the areas page in a dialog.</summary>
        /// <param name="options" type="object" optional="true">OPTIONAL: Options used in displaying the dialog.</param>
        /// <returns type="AreaIterationsDialog" />

        return CoreDialogs.show(DeleteClassificationNodeDialog, options);
    }

    export function showSecureClassificationDialog(options: TFS_Admin_Security_NO_REQUIRE.SecurityDialogOptions) {
        VSS.using(["Admin/Scripts/TFS.Admin.Security"], (TFS_Admin_Security: typeof TFS_Admin_Security_NO_REQUIRE) => {
            CoreDialogs.show(TFS_Admin_Security.SecurityDialog, options);
        });
    }
}
