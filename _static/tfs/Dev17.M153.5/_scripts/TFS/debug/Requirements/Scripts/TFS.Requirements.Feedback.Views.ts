///<amd-dependency path="jQueryUI/button"/>

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import { getPageContext } from "VSS/Context";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import RequirementsUtils = require("Requirements/Scripts/TFS.Requirements.Utils");
import FeedbackResources = require("Requirements/Scripts/Resources/TFS.Resources.RequirementsFeedback");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Dialogs = require("VSS/Controls/Dialogs");
import RichEditor = require("VSS/Controls/RichEditor");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Models = require("Requirements/Scripts/TFS.Requirements.Feedback.Models");
import Controls = require("VSS/Controls");
import Notifications = require("VSS/Controls/Notifications");
import Validation = require("VSS/Controls/Validation");
import Events_Document = require("VSS/Events/Document");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Controls_Common = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import TFS_UI_Controls_Accessories = require("Presentation/Scripts/TFS/TFS.UI.Controls.Accessories");
import AdminSendMail = require("Admin/Scripts/TFS.Admin.SendMail");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import {WorkItemRichTextHelper} from "WorkItemTracking/Scripts/Utils/WorkItemRichTextHelper";

var delegate = Utils_Core.delegate;
var hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration;

class RequestItemsControl {

    public static REQUEST_ITEM_CLASS: string = "request-item";
    public static REQUEST_ITEM_CLASS_PREFIX: string = "request-item-";
    public static REQUEST_ITEM_DETAIL_CLASS_PREFIX: string = "request-item-detail-";
    public static REQUEST_ITEM_SUMMARY_CLASS_PREFIX: string = "request-item-summary-";
    public static REQUEST_ITEM_SUMMARY_TEXT_CLASS_PREFIX: string = "request-item-summary-text-";

    private _model: any;
    private _$addRequestItemsButton: any;
    private _$containerTable: any;
    private _$addLink: any;
    private _options: any;

    constructor ($container, model: any, options?: any) {
        /// <summary>Constructs a RequestItemsControl object. This object fills the
        /// section on the request page that allows user to add request items.</summary>
        /// <param name="container" type="Object">A feedback request view control or other table container.</param>
        /// <param name="model" type="Object">A feedback request view model.</param>
        /// <param name="options" type="Object">The options.</param>
        /// <returns>The control.</returns>
        Diag.Debug.assertParamIsObject($container, "container");
        Diag.Debug.assertParamIsObject(model, "model");

        this._model = model.getRequestItems();
        this._$containerTable = $container;
        this._options = options;

        this._initialize();
    }

    private _initialize() {
        /// <summary>Initialize the request item table with one Request item.</summary>

        this._model.itemAdded(delegate(this, this._itemAdded));
        this._model.itemRemoved(delegate(this, this._itemRemoved));
        this._model.itemChanged(delegate(this, this._itemChanged));
        this._model.attachModelValidated(delegate(this, this._handleErrors));

        this._$addLink = $("<a href='#' class='add-request-item-link' />");
        this._$addLink.append(FeedbackResources.AddFeedbackItemLinkLabel)
            .click(delegate(this, this._addLinkClickHandler));

        this._$addRequestItemsButton = $("<div/>").append($("<span/>")
                                                      .addClass("icon")
                                                      .addClass("action icon-add")
                                                      .attr("title", FeedbackResources.AddFeedbackItemLinkLabel)
                                                      .click(delegate(this, this._addLinkClickHandler))
                                                      .attr("alt", FeedbackResources.AddFeedbackItemLinkLabel))
                                                  .append(this._$addLink);

        this._$containerTable.append(this._$addRequestItemsButton);

        Diag.Debug.assert(this._model.getCount() > 0, "Missing the initial item");
        this._itemAdded(this._model, this._model.getItemId(0));
        this._handleErrors();
    }

    private _itemAdded(model: any, id: any) {
        /// <summary>Reacts to the item being added in the view model.</summary>
        /// <param name="model" type="object">Request item model</parm>
        /// <param name="id" type="object">add item options includes itemId</parm>
        Diag.Debug.assertParamIsString(id, "id");

        this._addItem(id);
        this._validate();
    }

    private _itemRemoved(model: any, id: string) {
        /// <summary>Reacts to the item being removed in the view model.</summary>            
        /// <param name="model" type="object">Request item model</parm>
        /// <param name="id" type="string">Id of the item</parm>
        Diag.Debug.assertParamIsString(id, "id");

        this._removeItem(id);

        this._validate();
    }

    private _itemChanged() {
        /// <summary>Reacts to the item being change in the view model.</summary>
        /// <param name="model" type="object">Request item model</parm>
        /// <param name="args" type="object">change item options includes itemId</parm>

        //TODO: implement item changed in the model
    }

    private _handleErrors() {
        /// <summary>Handles validation errors surfaced from the view model.</summary>

        var i, l,
            fieldSpecificErrors,
            errors = this._model.getErrors();

        Diag.Debug.assertIsObject(errors, "errors");

        // reset all invalid items on the page
        this._$containerTable.find("." + RequestItemsControl.REQUEST_ITEM_CLASS + ".invalid").removeClass("invalid");

        fieldSpecificErrors = errors.getById(Models.RequestItemsViewModel.REQUEST_ITEM_TITLE_FIELD);
        if (fieldSpecificErrors && fieldSpecificErrors.invalidItems && fieldSpecificErrors.invalidItems.length) {
            for (i = 0, l = fieldSpecificErrors.invalidItems.length; i < l; i += 1) {
                $(".feedback-request-item-text-input", this._findItem(fieldSpecificErrors.invalidItems[i])).addClass("invalid");
                $(".request-item-summary-text", this._findItem(fieldSpecificErrors.invalidItems[i])).addClass("invalid");
            }
        }
    }

    private _addItem(itemId: string) {
        /// <summary>Add a new Request item to the page</summary>
        /// <param name="itemId" type="string">itemId of the item to find</parm>

        Diag.Debug.assertParamIsString(itemId, "itemId");

        // Helper for the remove button for this item. Needed to have the right id for
        // buttons on each row.

        var that = this,
            $requestTitleInput: JQuery,
            $requestDetailsEditor,
            itemClass = RequestItemsControl.REQUEST_ITEM_CLASS_PREFIX + itemId,
            $container,
            $contentArea,
            $inputDiv,
            $textareaDiv,
            $swimLaneDiv;

        function removeItem(event) {
            /// <summary>Handles the event when delete request item button is clicked.</summary>                    
            Diag.Debug.assertParamIsObject(event, "event");
            Diag.Debug.assert(that._model.canRemove(), "cannot delete the item");

            that._model.removeItem(itemId);
            event.preventDefault();
        }

        $container = $("<li/>").addClass(itemClass)
                               .insertBefore(this._$addRequestItemsButton);

        $swimLaneDiv = $("<div/>").addClass("section-item-swimlane")
                                  .appendTo($container);

        $("<div/>").addClass("request-item-step-number") // text updating after the item is added
                   .appendTo($swimLaneDiv);

        $("<a/>").attr("href", "#")
                 .addClass("delete-request-item-link")
                 .text(FeedbackResources.FeedbackRequest_DeleteItem_Label)
                 .toggle(this._model.canRemove())
                 .click(removeItem)
                 .appendTo($swimLaneDiv);

        $contentArea = $("<div/>").addClass("section-item-info")
                                  .appendTo($container);
        $inputDiv = $("<div/>").appendTo($contentArea);

        $requestTitleInput = $("<input>").attr("type", "text")
                                         .attr("maxlength", WITOM.WorkItem.MAX_TITLE_LENGTH)
                                         .addClass("combo")
                                         .addClass("feedback-request-item-text-input")
                                         .addClass("align-with-label")
                                         .addClass(RequestItemsControl.REQUEST_ITEM_CLASS)
                                         .bind("keyup", function (event) {
                                             var $summaryControl = $("." + RequestItemsControl.REQUEST_ITEM_SUMMARY_TEXT_CLASS_PREFIX + itemId);

                                             that._model.setValue(itemId, { title: (<any>event.target).value });
                                             $summaryControl.text((<any>event.target).value === "" ? FeedbackResources.MissingTitleError : (<any>event.target).value);
                                         })
                                         .appendTo($inputDiv);

        Utils_UI.Watermark($requestTitleInput, { watermarkText: FeedbackResources.FeedbackItemTitleLabel });

        $textareaDiv = $("<div/>").appendTo($contentArea);

        $requestDetailsEditor = <RichEditor.RichEditor>Controls.BaseControl.createIn(RichEditor.RichEditor, $textareaDiv, {
            pageHtml: WorkItemRichTextHelper.getPageHtml(),
            height: "100px",
            id: "request-item-details-rich-editor-" + itemId,
            waterMark: FeedbackResources.RequestItemDetailsWatermarkLabel,
            fireOnEveryChange: true,
            change: function (event) {
                that._model.setValue(itemId, { details: $requestDetailsEditor.getValue() });
            },
            internal: true
        });

        if (this._options && this._options.scrollableContainerSelector) {
            $(this._options.scrollableContainerSelector).scrollTop($requestTitleInput.position().top);
        }

        //Setting focus to Title after a new feedback request item is added. Doing it here after it is added to DOM. 
        Utils_UI.Watermark($requestTitleInput, 'focus');
    }

    private _toggleItemSummary(id: string) {
        /// <summary>Toggle the visibility of the row and it's summary row</summary>
        /// <param name="id" type="string">Id of the summary row to toggle visibility on</param>
        Diag.Debug.assertParamIsString(id, "id");
        var $summaryRow = $("." + RequestItemsControl.REQUEST_ITEM_SUMMARY_CLASS_PREFIX + id, this._$containerTable),
            $summaryControl = $("." + RequestItemsControl.REQUEST_ITEM_SUMMARY_TEXT_CLASS_PREFIX + id, $summaryRow),
            isHidden = $("." + RequestItemsControl.REQUEST_ITEM_DETAIL_CLASS_PREFIX + id, this._$containerTable).css("display") === "none";

        if ($summaryControl.text() === "" || $summaryControl.text() === FeedbackResources.MissingTitleError) {
            $summaryControl.text(FeedbackResources.MissingTitleError);
            $summaryControl.addClass('invalid');
        }
        else {
            $summaryControl.removeClass('invalid');
        }

        $("." + RequestItemsControl.REQUEST_ITEM_DETAIL_CLASS_PREFIX + id, this._$containerTable).css("display", isHidden ? "" : "none");
        $summaryRow.css("display", isHidden ? "none" : "");
    }

    private _findItem(itemId: string) {
        /// <summary>Helper method to find an item in the request item table by itemId.
        /// <param name="itemId" type="string">itemId of the item to find</parm>
        /// <returns>The item with id as itemId</returns>
        Diag.Debug.assertParamIsString(itemId, "itemId");
        Diag.Debug.assertIsObject(this._$containerTable, "_$containerTable is null");
        return $("." + RequestItemsControl.REQUEST_ITEM_CLASS_PREFIX + itemId, this._$containerTable);
    }

    private _removeItem(itemId: string) {
        /// <summary>Helper method to remove item with id as itemId.</summary>
        /// <param name="itemId" type="string">itemId of the item to remove.</parm>
        Diag.Debug.assertParamIsString(itemId, "itemId");

        var $item = this._findItem(itemId);
        if ($item) {
            $item.remove();
        }
    }

    private _addLinkClickHandler() {
        /// <summary>Handles the event when "Add feedback item" link is clicked.</summary>            
        Diag.Debug.assert(this._model.canAdd(), "cannot add new item");
        this._model.addItem();
        return false;
    }

    private _updateStepNumbers() {
        /// <summary>Updates the step number labels in the control based on the number of elements
        /// on the page. 
        /// </summary>

        var $stepNumberElements = this._$containerTable.find(".request-item-step-number");

        Diag.Debug.assert($stepNumberElements.length === this._model.getCount(), "rendered step list count does not match the number of model elements.");

        $stepNumberElements.each(function (index, element) {
            $(element).text(Utils_String.format(FeedbackResources.FeedbackRequest_StepNumber_Label, index + 1));
        });
    }

    private _validate() {
        /// <summary>Validates the UI depending on the state of the model.</summary>
        this._$addRequestItemsButton.toggle(this._model.canAdd());
        $(".delete-request-item-link").toggle(this._model.canRemove());

        this._updateStepNumbers();
    }
}

VSS.initClassPrototype(RequestItemsControl, {
    _model: null,
    _$addRequestItemsButton: null,
    _$containerTable: null,
    _$addLink: null,
    _options: null
});



class FeedbackRequestControl {

    public static REQUEST_PAGE_LAYOUT_TABLE_COLUMNS: number = 3;
    public static INPUT_CLASS: string = "feedback-request-input";
    public static PRIVACY_STATEMENT_URL: string = "https://go.microsoft.com/fwlink/?LinkID=248251";
    public static PRIVACY_STATEMENT_URL_HOSTED: string = "https://go.microsoft.com/fwlink/?LinkId=264782";

    private _requestView: any;
    private _$applicationLaunchUrlInput: JQuery;
    private _identityPickerControl: any;
    private _launchInstructionEditor: any;
    private _requestItemsControl: any;

    public $rootElement: any;

    constructor (requestView: any) {
        /// <summary>Constructor.</summary>
        /// <param name="requestView" type="Object">The parent request view.</param>
        Diag.Debug.assertParamIsObject(requestView, "requestView");

        this._requestView = requestView;
        this._initialize();
    }

    public activated() {
        /// <summary>Called when the page is activated.</summary>
        var $defaultFocusElement = this.$rootElement.find('input:not([disabled]).watermark');

        Diag.Debug.assertIsObject($defaultFocusElement, "$defaultFocusElement");
        this._requestView.setDefaultFocus($defaultFocusElement);
    }

    public handleErrors(errors: any) {
        /// <summary>Handles validation errors surfaced from the view model.</summary>
        /// <param name="errors" type="object">An ErrorManager object including all errors registered.</param>

        Diag.Debug.assertParamIsObject(errors, "errors");

        // reset all invalid elements on the page
        this.$rootElement.find("." + FeedbackRequestControl.INPUT_CLASS).removeClass("invalid");

        var i, l,
            additionalErrorTextBuilder = new Utils_String.StringBuilder(),
            additionalErrorText,
            error,
            handledError = false;

        for (i = 0, l = errors.getItems().length; i < l; i += 1) {
            error = errors.getItems()[i];

            switch (error.id) {
                case Models.RequestViewModel.IDENTITIES_FIELD:
                    this._identityPickerControl.setInvalid();
                    handledError = true;
                    break;
                case Models.RequestViewModel.APP_LAUNCH_URL_FIELD:
                    this._$applicationLaunchUrlInput.addClass("invalid");
                    handledError = true;
                    break;
                case Models.RequestViewModel.INVALID_IDENTITIES_FIELD:
                    handledError = true;
                    break;
            }

            if (handledError && error.message) {
                additionalErrorTextBuilder.append(error.message);
                additionalErrorTextBuilder.appendNewLine();
            }
        }

        additionalErrorText = additionalErrorTextBuilder.toString();

        if (additionalErrorText) {
            this._requestView.handleError(additionalErrorText);
        }
    }

    public getSelectedIdentities() {
        return this._identityPickerControl.getSelectedEntities();
    }

    public getInvalidIdentities() {
        return this._identityPickerControl.getInvalidIdentities();
    }

    private _initialize() {
        RequirementsUtils.CommonIdentityPickerHelper.getFeatureFlagState();
        var $list = $("<ul/>").addClass("section"),
            privacyStatementUrl = TFS_Host_TfsContext.TfsContext.getDefault().isHosted ? FeedbackRequestControl.PRIVACY_STATEMENT_URL_HOSTED : FeedbackRequestControl.PRIVACY_STATEMENT_URL;

        this.$rootElement = $("<div>")
            .addClass("feedback-request-view")
            .addClass("feedback-dialog-page");

        // Header
        $("<div/>").html(Utils_String.format(FeedbackResources.FeedbackRequest_Introduction_Label, privacyStatementUrl))
                   .appendTo(this.$rootElement);

        this._buildStepOneMarkup($list);
        this._buildStepTwoMarkup($list);
        this._buildStepThreeMarkup($list);

        this.$rootElement.append($list);
    }

    private _buildStepOneMarkup($container) {
        /// <summary>Builds the markup needed for the first step in the request process.</summary>

        Diag.Debug.assertParamIsObject($container, "$container");

        var $listItem = $("<li/>").addClass("section-item")
                                  .appendTo($container),
            $listItemBody;

        $("<div/>").addClass("section-item-tag")
                   .text("1")
                   .appendTo($listItem);

        $listItemBody = $("<div/>").addClass("section-item-info")
                                   .appendTo($listItem);

        $("<div/>").addClass("section-item-header")
                   .text(FeedbackResources.FeedbackRequest_SelectStakeholders_Label)
                   .appendTo($listItemBody);
        $("<div/>").addClass("section-item-instructional-text")
                   .text(FeedbackResources.FeedbackRequest_SelectStackholders_Description)
                   .appendTo($listItemBody);

        this._createUserPicker().appendTo($listItemBody);
    }

    private _buildStepTwoMarkup($container) {
        /// <summary>Builds the markup needed for the second step in the request process.</summary>

        Diag.Debug.assertParamIsObject($container, "$container");

        var $listItem = $("<li/>").addClass("section-item")
                                  .appendTo($container),
            $listItemBody;

        $("<div/>").addClass("section-item-tag")
                   .text("2")
                   .appendTo($listItem);

        $listItemBody = $("<div/>").addClass("section-item-info")
                                   .appendTo($listItem);

        $("<div/>").addClass("section-item-header")
                   .text(FeedbackResources.FeedbackRequest_Application_Label)
                   .appendTo($listItemBody);
        $("<div/>").addClass("section-item-instructional-text")
                   .text(FeedbackResources.FeedbackRequest_Application_Description)
                   .appendTo($listItemBody);

        this._createApplicationTypeRadioButtonGroup().appendTo($listItemBody);
        this._createApplicationLaunchInput().appendTo($listItemBody);
        this._createLaunchInstruction().appendTo($listItemBody);
    }

    private _buildStepThreeMarkup($container) {
        /// <summary>Builds the markup needed for the second step in the request process.</summary>

        Diag.Debug.assertParamIsObject($container, "$container");

        var $listItem = $("<li/>").addClass("section-item")
                                  .appendTo($container),
            $listItemBody;

        $("<div/>").addClass("section-item-tag")
                   .text("3")
                   .appendTo($listItem);

        $listItemBody = $("<div/>").addClass("section-item-info")
                                   .appendTo($listItem);

        $("<div/>").addClass("section-item-header")
                   .text(FeedbackResources.FeedbackRequest_Feedback_Label)
                   .appendTo($listItemBody);
        $("<div/>").addClass("section-item-instructional-text")
                   .text(FeedbackResources.FeedbackRequest_Feedback_Description)
                   .appendTo($listItemBody);

        this._requestItemsControl = new RequestItemsControl($container, this._requestView.model, { scrollableContainerSelector: ".modal-dialog" });
    }

    private _createApplicationLaunchInput(): JQuery {
        /// <summary>Creates a <tr> for the launch instruction row.</summary>
        /// <returns type="jQuery" />
        this._$applicationLaunchUrlInput = $("<input>")
            .attr("type", "text")
            .attr("id", "app-launch-url-text-input")
            .attr("maxlength", WITOM.WorkItem.MAX_TITLE_LENGTH)
            .addClass("combo")
            .addClass(FeedbackRequestControl.INPUT_CLASS)
            .bind("keyup", delegate(this, function (event) {
                this._requestView.model.setValue(Models.RequestViewModel.APP_LAUNCH_URL_FIELD, event.target.value);
            }));

        Utils_UI.Watermark(this._$applicationLaunchUrlInput, { watermarkText: FeedbackResources.WebAppWatermarkLabel });

        return this._$applicationLaunchUrlInput;
    }

    private _createUserPicker(): JQuery {
        /// <summary>Creates a tr that contains the input for "To" users.</summary>
        /// <returns type="jQuery" />
        var $userContainer = $("<div>");

        if (RequirementsUtils.CommonIdentityPickerHelper.featureFlagEnabled) {
            this._identityPickerControl = <AdminSendMail.SendMailCommonIdentityPicker>Controls.BaseControl.createIn(AdminSendMail.SendMailCommonIdentityPicker, $userContainer, {
                errorHandler: delegate(this._requestView, this._requestView.handleError)
            });
        }
        else {
            this._identityPickerControl = <AdminSendMail.SendMailIdentityPicker>Controls.BaseControl.createIn(AdminSendMail.SendMailIdentityPicker, $userContainer, {
                errorHandler: delegate(this._requestView, this._requestView.handleError)
                // TODO [teyang]: do we limit "maxSelectionCount"
            });
            this._identityPickerControl.attachIdentitiesChanged(delegate(this, function () {
                this._requestView.model.setValue(Models.RequestViewModel.IDENTITIES_FIELD, this._identityPickerControl.getSelectedIdentities().existingUsers);
            }));            
        }

        return $userContainer;
    }

    private _createApplicationTypeRadioButton(value: string, label: string, isChecked?: boolean): JQuery {
        /// <summary>Creates a radio button for application type selection.</summary>
        /// <param name= "value" type="String">The value of the radio button.</param>
        /// <param name= "label" type="String">The label of the radio button.</param>
        /// <param name="isChecked" type="Boolean" optional="true">[optional] True if the radio button is checked.</param>
        /// <returns type="jQuery" />
        Diag.Debug.assertParamIsString(value, "value");
        Diag.Debug.assertParamIsString(label, "label");

        var $radioButton = $("<input>")
            .addClass(FeedbackRequestControl.INPUT_CLASS)
            .attr("type", "radio")
            .attr("name", "application_type")
            .attr("value", value)
            .attr("id", "_" + value + "-radio-button");

        if (isChecked) {
            $radioButton.prop("checked", true);
            this._requestView.model.setValue(Models.RequestViewModel.APP_TYPE_FIELD, value);
        }

        $radioButton.bind("change", delegate(this, this._handleApplicationTypeSelectionChange));

        return $("<label>")
            .addClass("radio-button-label")
            .append($radioButton)
            .append(label);
    }

    private _createApplicationTypeRadioButtonGroup(): JQuery {
        /// <summary>Creates app type radio buttons group.</summary>
        /// <returns type="jQuery" />
        var $radioButtonGroup = $("<table>")
            .append($("<tr>")
                .append($("<td>")
                    .append(this._createApplicationTypeRadioButton(Models.RequestViewModel.APP_TYPE_WEB_APP, FeedbackResources.WebAppLabel, true)))
                .append($("<td>")
                    .append(this._createApplicationTypeRadioButton(Models.RequestViewModel.APP_TYPE_REMOTE_MACHINE, FeedbackResources.RemoteMachineLabel)))
                .append($("<td>")
                    .append(this._createApplicationTypeRadioButton(Models.RequestViewModel.APP_TYPE_CLIENT_APP, FeedbackResources.ClientAppLabel))));

        return $radioButtonGroup;
    }

    private _handleApplicationTypeSelectionChange(event: any) {
        /// <summary>Handles the event when application type selection changes.</summary>
        /// <param name="event" type="object">A JQuery event object describing the event in more detail.</param>

        Diag.Debug.assertParamIsObject(event, "event");

        var watermark,
            selectedApplicationType = event.target.value;

        Diag.Debug.assertIsString(selectedApplicationType, "selectedApplicationType");
        Diag.Debug.assertIsObject(this._$applicationLaunchUrlInput, "this._$applicationLaunchUrlInput");

        this._requestView.model.setValue(Models.RequestViewModel.APP_TYPE_FIELD, selectedApplicationType);

        switch (selectedApplicationType) {
            case Models.RequestViewModel.APP_TYPE_WEB_APP:
                watermark = FeedbackResources.WebAppWatermarkLabel;
                break;
            case Models.RequestViewModel.APP_TYPE_REMOTE_MACHINE:
                watermark = FeedbackResources.RemoteAppWatermarkLabel;
                break;
            case Models.RequestViewModel.APP_TYPE_CLIENT_APP:
                watermark = FeedbackResources.ClientAppWatermarkLabel;
                break;
            default:
                Diag.Debug.fail("Unknown application type");
                break;
        }

        Utils_UI.Watermark(this._$applicationLaunchUrlInput, { watermarkText: watermark });
        Utils_UI.Watermark(this._$applicationLaunchUrlInput, 'resetIfEmpty');
    }

    private _createLaunchInstruction(): JQuery {
        /// <summary>Creates a <tr> for the launch instruction input.</summary>
        /// <returns type="jQuery" />
        var $launchInstructionContainer = $("<div>"),
            hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration,
            that = this;

        this._launchInstructionEditor = <RichEditor.RichEditor>Controls.BaseControl.createIn(RichEditor.RichEditor, $launchInstructionContainer, {
            pageHtml: WorkItemRichTextHelper.getPageHtml(),
            height: "100px",
            id: "app-launch-instr-rich-editor",
            waterMark: FeedbackResources.ApplicationLaunchIntructionWatermarkLabel,
            fireOnEveryChange: true,
            change: function (event) {
                that._requestView.model.setValue(Models.RequestViewModel.APP_LAUNCH_INSTR_FIELD, that._launchInstructionEditor.getValue());
            },
            internal: true
        });

        return $launchInstructionContainer;
    }
}

VSS.initClassPrototype(FeedbackRequestControl, {
    $rootElement: null,
    _requestView: null,
    _$applicationLaunchUrlInput: null,
    _identityPickerControl: null,
    _launchInstructionEditor: null,
    _requestItemsControl: null
});



class FeedbackPreviewControl {

    private _requestView: any;
    private _messageForm: any;

    public $rootElement: any;
    public $toInput: any;
    public $subjectInput: any;

    constructor (requestView: any) {
        /// <summary>Constructor.</summary>
        /// <param name="requestView" type="Object">The parent request view.</param>
        Diag.Debug.assertParamIsObject(requestView, "requestView");

        this._requestView = requestView;
        this._initialize();
    }

    public activated() {
        /// <summary>Called by the view indicating that this page has been activated (shown).</summary>

        var model = this._requestView.model,
            longRunningOperation = this._requestView.getLongRunningOperation(),
            that = this,
            identityValidationError;


        // Check for any discrepancy between the input identities and those with actual email addresses.
        // We want to inform the user that there was an issue with some of the input identities.
        identityValidationError = this._requestView.model.getErrors().getById(Models.RequestViewModel.INVALID_IDENTITIES_FIELD);

        if (identityValidationError && identityValidationError.message) {
            this._requestView.handleError(identityValidationError.message);
        }

        longRunningOperation.beginOperation(function () {
            model.beginPrepareRequest(function () {
                var isToReadOnly = model.isReadOnly(Models.RequestViewModel.TO_FIELD);

                longRunningOperation.endOperation();
                // Each time the page is activated, rebuild the page.
                that.setMailData(model.getValue(Models.RequestViewModel.TO_FIELD),
                                 model.getValue(Models.RequestViewModel.SUBJECT_FIELD),
                                 model.getValue(Models.RequestViewModel.BODY_FIELD));

                that._requestView.setDefaultFocus(isToReadOnly ? that.$subjectInput : that.$toInput);

            }, delegate(that._requestView, that._requestView.handleError));
        });
    }

    public handleErrors(errors) {
        /// <summary>Handles validation errors surfaced from the view model.</summary>

        Diag.Debug.assertParamIsObject(errors, "errors");

        var model = this._requestView.model;

        // reset all invalid elements on the page
        this.$rootElement.find("*").removeClass("invalid");

        if (errors.getById(Models.RequestViewModel.TO_FIELD) && !model.isReadOnly(Models.RequestViewModel.TO_FIELD)) {
            this.$toInput.addClass("invalid");
        }
    }

    public setMailData(toAddresses: string, mailSubject: string, mailBody: string) {
        /// <summary>Sets the email's subject and body when loading form</summary>
        /// <param name="toAddresses" type="String">comma-separated list of email addresses
        /// <param name="mailSubject" type="String">generated email subject of format 
        /// "Invitation from Angie: request title"</param>
        /// <param name="mailBody" type="String">formatted email body based on feedback request inputs</param>

        Diag.Debug.assertParamIsString(mailSubject, "mailSubject");
        Diag.Debug.assertParamIsString(mailBody, "mailBody");

        this._messageForm.setMessageFields({
            subject: mailSubject,
            body: mailBody,
            to: toAddresses
        });
    }

    private _initialize() {
        /// <summary>Initializes the Feedback Request Page.</summary>
        var that = this,
            model = this._requestView.model;

        this.$rootElement = $("<div>")
            .addClass("feedback-preview-view")
            .addClass("feedback-dialog-page");

        this._messageForm = <AdminSendMail.MessageForm>Controls.BaseControl.createIn(AdminSendMail.MessageForm, this.$rootElement, {
            toEnabled: !model.isReadOnly(Models.RequestViewModel.TO_FIELD),
            height: 400, // todo: make it expandable after richeditor provides the option
            fireOnEveryChange: true,
            readOnlyBody: model._generateEmailPreview().html(),
            change: function (event) {

                // Handles changes made to the fields in the email contol.
                // NOTE: The body of the email uses the RichEditor control which re-hosts a document window
                // in an IFrame.  Because of this, change notifications don't surface the same way as other
                // controls.

                if (event.target) {
                    switch (event.target.id) {
                        case AdminSendMail.MessageForm.ID_TO:
                            that._requestView.model.setValue(Models.RequestViewModel.TO_FIELD, event.target.value);
                            break;
                        case AdminSendMail.MessageForm.ID_FROM:
                            that._requestView.model.setValue(Models.RequestViewModel.FROM_FIELD, event.target.value);
                            break;
                        case AdminSendMail.MessageForm.ID_SUBJECT:
                            that._requestView.model.setValue(Models.RequestViewModel.SUBJECT_FIELD, event.target.value);
                            break;
                        default:
                            Diag.Debug.fail("Unknown email input element");
                    }
                }
                else if (event.fieldId === AdminSendMail.MessageForm.ID_BODY) {
                    that._requestView.model.setValue(Models.RequestViewModel.BODY_FIELD, event.fieldValue);
                }
            }
        });

        this.$toInput = this.$rootElement.find("#" + AdminSendMail.MessageForm.ID_TO);
        Diag.Debug.assert(this.$toInput, "Can't locate the To field in the email preview control");

        this.$subjectInput = this.$rootElement.find("#" + AdminSendMail.MessageForm.ID_SUBJECT);
        Diag.Debug.assert(this.$subjectInput, "Can't locate the Subject field in the email preview control");
    }
}

VSS.initClassPrototype(FeedbackPreviewControl, {
    $rootElement: null,
    $toInput: null,
    $subjectInput: null,
    _requestView: null,
    _messageForm: null
});



export class RequestView extends Dialogs.ModalDialog {

    private _runningDocumentEntry: any;
    private _messagePane: any;
    private _$previewButton: any;
    private _$backButton: any;
    private _$sendButton: any;
    private _$container: any;
    private _$pageElement: any;
    private _pageControls: any;
    private _longRunningOperation: any;
    private _displayedErrorFieldId: any;

    public model: any;

    constructor (options? ) {
        /// <summary>Creates a new instance of the Feedback Request View with the specified options.</summary>
        /// <param name="options">Additional options.</param>

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: 800,
            minWidth: 800,
            height: 830,
            minHeight: 760,
            dialogClass: "feedback-request-dialog",
            title: FeedbackResources.DialogTitle,
            buttons: this._getDialogButtons(),
            beforeClose: delegate(this, this._beforeClose)
        }, options));
    }

    public initialize() {
        /// <summary>OVERRIDE: Initializes the dialog.</summary>

        super.initialize();

        this._pageControls = [];

        this._$container = this.getElement();
        this._$pageElement = $("<div/>");

        this._$previewButton = $("#preview-button");
        this._$backButton = $("#back-button");
        this._$sendButton = $("#send-button");

        var $messageAreaContainer = $("<div>")
                .addClass("feedback-form-control-container")
                .addClass("messagearea-container");

        this._runningDocumentEntry = Events_Document.getRunningDocumentsTable().add("RequestFeedbackDialog", this);

        this._messagePane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $messageAreaContainer);

        this._$container.append($messageAreaContainer);
        this._$container.append(this._$pageElement);

        this._initializeState();

        Diag.logTracePoint("RequestView.initialize.complete");
    }

    public onClose(e? ) {
        /// <summary>OVERRIDE: Cleanup on the dialog - unregister from the RunningDocuments table</summary>

        Diag.Debug.assert(this._$pageElement, "_$pageElement");
        this._$pageElement.remove();

        Events_Document.getRunningDocumentsTable().remove(this._runningDocumentEntry);
        super.onClose(e);
    }

    public isDirty() {
        /// <summary>Needed by the RunningDocumentTable to control the handling of dirty state.</summary>
        return this.model.isDirty();
    }

    public getLongRunningOperation() {
        /// <summary>Gets the configured long running operation object (typically used by pages when performing long running operations).</summary>
        return this._longRunningOperation;
    }

    public handleError(error, options?: any) {
        /// <summary>Handles synch and asynch errors within the control. </summary>
        /// <param name="options" type="object" optional="true">Options like hyperlink or several error messages.
        /// Following options - All options are optional:
        ///     moreInfo:              <String: More information to show up before the hyperlink.>
        ///     linkText:              <String: The text to display for a hyperlink.>
        ///     linkTarget:            <String: The actual link.>
        ///     failureExceptions: <array: Error message strings to display.>
        ///     errorFieldId: <String: error field ID used in error control>
        /// </param>

        Diag.Debug.assert(this._longRunningOperation, "_longRunningOperation");
        this._longRunningOperation.endOperation();

        var i, l,
            msg = (error.message ? error.message : error),
            moreInfo,
            $container,
            $errorsContainer,
            $msg,
            $link;

        // Disable the "send" button since we have no ability to recover from errors in this capacity.
        this._updateButtonState();

        if (error.isNonFatal) {
            // TODO (bamodio): Is alert the right way to display a warning? Or do we have any jQuery floating dialogs for this?
            window.alert(msg);

            // isNonFatal is a flag we add to errors to indicate that the core operation succeeded, and that we should close
            // the Feedback Request dialog and display a warning instead. E.g. if work items were created, but we failed to do
            // a later step (sending email, updating work item history with email notification), this is non-fatal.
            this.close();
        }
        else {

            if (options && options.linkText && options.linkTarget) {
                $container = $("<div />");

                if (options.moreInfo) {
                    moreInfo = options.moreInfo;

                    $msg = $("<div />").text(moreInfo)
                                       .appendTo($container);
                }

                $link = $("<a />").attr("href", options.linkTarget)
                                  .attr("target", "_blank")
                                  .text(options.linkText)
                                  .appendTo($container);
            }

            if (options && options.failureExceptions) {
                $errorsContainer = $("<div />");
                for (i = 0, l = options.failureExceptions.length; i < l; i += 1) {
                    $msg = $("<div />").text(options.failureExceptions[i])
                                    .appendTo($errorsContainer);
                }

                $container = $("<div />");
                $errorsContainer.appendTo($container);
            }

            this._messagePane.clear();

            if (msg) {
                this._messagePane.setError({
                    header: msg,
                    content: $link
                });
            }

            if (options && options.errorFieldId) {
                this._displayedErrorFieldId = options.errorFieldId;
            }
        }
    }

    public setDefaultFocus($elementToFocus: any) {
        /// <summary>Sets default focus on the current page of the request dialog.</summary>
        /// <param name="$elementToFocus" type="Object">The element to be set with focus.</param>
        Diag.Debug.assertParamIsObject($elementToFocus, "$elementToFocus");
        this.setFormFocusDelayed($elementToFocus);
    }

    private _beforeClose() {
        /// <summary>Invoked by JQueryUI before the dialog close request is processed as a means to abort the close request.</summary>

        var rtnVal = true;

        if (this.model.isInOperation()) {
            rtnVal = false;
        }
        else if (this.isDirty() && !window.confirm(FeedbackResources.FeedbackRequest_Form_Cancel_Confirmation)) {
            rtnVal = false;
        }

        return rtnVal;
    }

    private _clearErrors() {
        /// <summary>Clears any existing visible messages shown in the message control.</summary>
        this._messagePane.clear();
    }

    private _initializeState() {
        /// <summary>Initializes the state for the view and attaches all events needed for interacting
        /// with the view.</summary>

        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        // if there is no team context then we are reading team information from page context's route values
        const pageContext = getPageContext();
        const team = pageContext.navigation.routeValues["teamName"];

        // makes sure the wait control is always bound to the current dialog's _element
        this._longRunningOperation = new StatusIndicator.LongRunningOperation(this);

        this.model = new Models.RequestViewModel({ defaultErrorHandler: delegate(this, this.handleError), team: team });
        this.model.attachPageChanged(delegate(this, this._handlePageChanged));
        this.model.attachFieldChanged(delegate(this, this._handleFieldChanged));
        this.model.attachModelValidated(delegate(this, this._handleErrors));
        this.model.attachBeginOperation(delegate(this, this._handleBeginOperation));

        if (!tfsContext.configuration.getMailSettings().enabled) {
            this.handleError(FeedbackResources.Error_TfsEmailNotConfigured);
            return; // don't bother downloading the payload, we can't continue.
        }

        this._longRunningOperation.beginOperation(() => {
            this.model.beginGetShouldShowAds((showAds) => {
                if (showAds) {
                    this._longRunningOperation.endOperation();
                    var iframe = <TFS_Controls_Common.IFrameControl>Controls.BaseControl.createIn(TFS_Controls_Common.IFrameControl, this._$container, {
                        contentUrl: "https://go.microsoft.com/fwlink/?LinkId=321451"
                    });
                    iframe.getElement().addClass(TFS_Controls_Common.IFrameControl.CORE_CSS_CLASS);
                    this._updateButtonState();
                    return;
                }
                else {

                    this.model.beginGetConfiguration(delegate(this, ()  => {
                        this._longRunningOperation.endOperation();
                        this._setPage(this.model.getPageIndex());
                        this._handleErrors();

                        // Only start tracking the model's dirty state when initialization finishes
                        this.model.setTrackDirtyState(true);
                    }),
                        // TODO (bamodio): In the future, consider using a different error handler that closes the dialog
                        // and shows a prettier jQuery error message box
                        delegate(this, this.handleError));
                }
            });            
        });

    }

    private _getDialogButtons() {
        /// <summary>Get the buttons used for the dialog.</summary>

        return [{
            id: "back-button",
            text: FeedbackResources.BackButtonLabel,
            click: delegate(this, this._buttonHandler)
        }, {
            id: "preview-button",
            text: FeedbackResources.PreviewButtonLabel,
            click: delegate(this, this._buttonHandler)
        }, {
            id: "send-button",
            text: FeedbackResources.SendButtonLabel,
            click: delegate(this, this._buttonHandler)
        }];
    }

    private _handlePageChanged(args? ) {
        /// <summary>Reacts to the active page changing in the view model.</summary>

        // When the page changes, hide the message control since we want the message to remain contextual.
        this._clearErrors();

        // Load the new page.
        this._setPage(this.model.getPageIndex());
    }

    private _handleFieldChanged() {
        /// <summary>Handles changes to fields from the view model.</summary>
    }

    private _handleErrors() {
        /// <summary>Handles validation errors surfaced from the view model.</summary>
        var i, l,
            pageControl,
            errors = this.model.getErrors();

        if (!errors.hasErrors()) {
            this._messagePane.clear();
        }

        // Update the state of the buttons
        this._updateButtonState();

        // tell each page to handle their own validation error(s).
        for (i = 0, l = this._pageControls.length; i < l; i += 1) {
            pageControl = this._pageControls[i];

            if (pageControl && $.isFunction(pageControl.handleErrors)) {
                pageControl.handleErrors.call(pageControl, errors);
            }
        }
    }

    private _handleBeginOperation() {
        /// <summary>Handles the "begin operation" event raised from the view model.</summary>

        this._updateButtonState();
    }

    private _buttonHandler(event) {
        /// <summary>Handles a button click request from the user.</summary>

        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assert(event.currentTarget, "currentTarget");

        var that = this;

        if (RequirementsUtils.CommonIdentityPickerHelper.featureFlagEnabled) {
            var pageIndex = this.model.getPageIndex();

            if (pageIndex === Models.RequestViewModel.PAGE_INDEX_REQUEST) {
                var pageControl = this._pageControls[pageIndex];
                this.model.setValue(Models.RequestViewModel.IDENTITIES_FIELD, pageControl.getSelectedIdentities());
                this.model.setValue(Models.RequestViewModel.INVALID_IDENTITIES_FIELD, pageControl.getInvalidIdentities());
            }
        }

        switch (event.currentTarget.id) {
            case "preview-button":
                this._longRunningOperation.beginOperation(function () {
                    that.model.beginNavigateForward(delegate(that, function () {
					    Diag.logVerbose("Completion callback for Navigate forward");
                        that._longRunningOperation.endOperation();
                    }), delegate(that, that.handleError));
                });
                break;
            case "back-button":
                this.model.navigateBackward();
                break;
            case "send-button":
                if (this.model.canFinish()) {
                    this._longRunningOperation.beginOperation(function () {
                        that.model.beginFinish(delegate(that, function () {
                            that._longRunningOperation.endOperation();
                            that.close();
                        }), delegate(that, that.handleError));
                    });
                }
                break;
            default:
                Diag.Debug.fail("Unknown button ID");
                break;
        }
    }

    private _enableButton($button: JQuery, isEnabled: boolean) {
        /// <summary>Enables or disables the specified button depending on the value of <b>isEnabled</b>.</summary>
        /// <param name="$button" type="jQuery">A JQuery button object to enable or disable.</param>
        /// <param name="isEnabled" type="boolean">True to enable the button, false to disable it.</param>

        Diag.Debug.assertParamIsObject($button, "$button");
        Diag.Debug.assertParamIsBool(isEnabled, "isEnabled");
        $button.button("option", "disabled", !isEnabled);
    }

    private _updateButtonState() {
        /// <summary>Updates the enabled/disabled state of the buttons in the dialog
        /// based on the current state of the model.</summary>

        this._enableButton(this._$previewButton, this.model.canMoveForward());
        this._enableButton(this._$backButton, this.model.canMoveBackward());
        this._enableButton(this._$sendButton, this.model.canFinish());
    }

    private _setPage(pageIndex: number) {
        /// <summary>Sets the page to be displayed.</summary>
        /// <param name="pageIndex" type="Number">The page index.</param>
        Diag.Debug.assertParamIsNumber(pageIndex, "pageIndex");

        var newPageControl = this._pageControls[pageIndex];

        if (!newPageControl) {
            newPageControl = this._createPage(pageIndex);

            if (newPageControl) {
                this._pageControls[pageIndex] = newPageControl;
                this._$pageElement.append(newPageControl.$rootElement);
            }
            else {
                throw FeedbackResources.CannotCreatePage;
            }
        }

        Diag.Debug.assert(this._$pageElement, "Missing page element placeholder");

        // TODO [ryanvog]: Strengthen the contract here.

        // Hide everything
        this._$pageElement.children().hide();

        // Show the new page
        newPageControl.$rootElement.fadeIn('fast');

        // TODO [ryanvog]: eventually these should be handled by the page.
        this._updateButtonState();

        // TODO [ryanvog]: The base page object should handle this
        if ($.isFunction(newPageControl.activated)) {
            newPageControl.activated();
        }
    }

    private _createPage(pageIndex) {
        /// <summary>Creates a new page based on the specified pageIndex.</summary>
        /// <param name="pageIndex">The index of the page to create.</param>

        var pageControl;

        switch (pageIndex) {
            case Models.RequestViewModel.PAGE_INDEX_REQUEST:
                pageControl = new FeedbackRequestControl(this);
                break;
            case Models.RequestViewModel.PAGE_INDEX_PREVIEW:
                pageControl = new FeedbackPreviewControl(this);
                break;
            default:
                Diag.Debug.fail("unknown page");
                break;
        }

        return pageControl;
    }
}

VSS.initClassPrototype(RequestView, {
    model: null,
    _runningDocumentEntry: null,
    _messagePane: null,
    _$previewButton: null,
    _$backButton: null,
    _$sendButton: null,
    _$container: null,
    _$pageElement: null,
    _pageControls: null,
    _longRunningOperation: null,
    _displayedErrorFieldId: null
});


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Requirements.Feedback.Views", exports);
