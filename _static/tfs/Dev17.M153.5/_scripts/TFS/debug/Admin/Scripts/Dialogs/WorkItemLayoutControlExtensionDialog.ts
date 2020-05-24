
import Q = require("q");

import AddFieldControls = require("Admin/Scripts/TFS.Admin.Controls.AddField");
import Admin = require("Admin/Scripts/TFS.Admin");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import AdminDialogFieldContracts = require("Admin/Scripts/TFS.Admin.Dialogs.FieldContracts");
import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import WorkItemLayoutCommon = require("Admin/Scripts/Common/WorkItemLayout.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");
import Combos = require("VSS/Controls/Combos");
import Contrib_Contracts = require("VSS/Contributions/Contracts");
import Controls = require("VSS/Controls");
import ControlsNotifications = require("VSS/Controls/Notifications");
import Dialogs = require("VSS/Controls/Dialogs");
import FormInput_Contracts = require("VSS/Common/Contracts/FormInput");
import FormInput_Controls = require("VSS/Controls/FormInput");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import { Utils } from "Admin/Scripts/Common/Utils";
import { RichCombo } from "Presentation/Scripts/TFS/RichCombo";

var delegate = Utils_Core.delegate;

/**
 * Requests the users to add a new/existing control extension
 */
export class AddControlExtensionDialog<TOptions extends AdminDialogFieldContracts.AddControlExtensionDialogOptions> extends Dialogs.ModalDialogO<TOptions> {

    public static _validateControlLabel(val: string): string {
        let trimmedValue = AdminCommon.trim(val);
        if (!Utils_String.equals(Utils_String.empty, trimmedValue) &&
            !AdminCommon.AdminUIHelper.isControlLabelValid(trimmedValue)) {
            return AdminResources.LabelIllegalCharacters;
        }

        return null;
    }

    public static _validateGroupName(name: string, usedGroups: string[]): string {
        let trimmedValue = AdminCommon.trim(name);
        if (trimmedValue.length == 0) {
            return AdminResources.GroupNameRequired;
        }

        if ($.isArray(usedGroups) && Utils_Array.contains(usedGroups, trimmedValue, Utils_String.ignoreCaseComparer)) {
            return AdminResources.GroupNameAlreadyAdded;
        }

        if (!AdminCommon.AdminUIHelper.isGroupNameValid(trimmedValue)) {
            return AdminResources.GroupIllegalCharacters;
        }

        return null;
    }

    public static _validateExistingGroup(groupName: string): string {
        let trimmedValue = AdminCommon.trim(groupName);
        if (!trimmedValue) {
            return AdminResources.AddControlExtensionDialog_GroupRequired;
        }

        return null;
    }

    public static _validatePage(val: string): string {
        let trimmedValue = AdminCommon.trim(val);
        if (trimmedValue.length === 0) {
            return AdminResources.AddGroupDialog_PageRequired;
        }
        return null;
    }

    public static DEFINITION_LAYOUT =
        '<div class="control-extension-definition-container">' +
        '<div class="description"><span>${controlExtensionDescriptionText}</span> <a href="${learnExtensionLink}" target="_blank">${learnMore}</a></div>' +
        '<label>${ControlText}</label>' +
        '<div class="control-type-container">' +
        '<div class="control-combo" tabindex="0"></div>' +
        '</div>' +
        '</div>';

    public static LAYOUT_LAYOUT =
        '<div class="field-layout-container">' +
        '<div class="description">${layoutDescriptionText}</div>' +
        '<div class="input-section add-edit-field">' +
        '<div style="display: table" class="input-table">' +
        '<div style="display: table-row-group">' +
        '<div style="display: table-row">' +
        '<label style="display: table-cell">${labelText}</label>' +
        '<div style="display: table-cell">' +
        '<input type="text" class="field-form-name" maxlength="128">' +
        '<div class="field-form-name-error-message error-message"></div>' +
        '</div>' +
        '</div>' +
        '<div style="display: table-row" class="spacer"></div>' +
        '<div style="display: table-row" class="field-group-container">' +
        '<label style="display: table-cell">${pageLabelText}</label>' +
        '<div style="table-cell">' +
        '<div class="page-group"></div>' +
        '<div class="field-form-page-error-message error-message"></div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="control-group-container">' +
        '<div class="group-input-section">' +
        '<input type="radio" class="radio-button group-radio-button" name="groupRadio" value="true" id="existingGroupRadio" checked="">' +
        '<label for="existingGroupRadio" class="radio-label group-radio-label">${useExistingGroupText}</label>' +
        '</div>' +
        '<div class="group-input">' +
        '<div class="group-label-container"><label>${groupText}</label></div>' +
        '<div class="group-combo-container"><div class="field-group"></div>' +
        '<div class="field-form-group-error-message error-message"></div>' +
        '</div>' +
        '</div>' +
        '<div class="group-input-section">' +
        '<input type="radio" class="radio-button group-radio-button" name="groupRadio" value="false" id="newGroupRadio">' +
        '<label for="newGroupRadio" class="radio-label group-radio-label" style="table-cell">${createAGroupText}</label>' +
        '</div>' +
        '<div class="group-input">' +
        '<div class="group-label-container"><label>${groupText}</label></div>' +
        '<div class="group-combo-container">' +
        '<input type="text" class="group-name" maxlength= "128">' +
        '<div class="group-name-error-message error-message"></div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

    public static OPTIONS_LAYOUT =
        '<div class="control-extensions-options-container">' +
        '<div class="description"><span>${controlExtensionInputsDescriptionText}</span></div>' +
        '<div class="control-extensions-inputs-container">' +

        '</div>' +
        '</div>';

    private static DEFINITION_TAB_ERRORID: string = "definition-tab-error";
    private static LAYOUT_TAB_ERRORID: string = "layout-tab-error";
    private static OPTIONS_TAB_ERRORID: string = "options-tab-error";

    // Input Data Constants
    private static INPUT_VALUE_DATA_FIELD_ID: string = "fieldId";

    // Options
    protected _workItemType: ProcessContracts.ProcessWorkItemType;
    protected _processId: string;
    protected _processName: string;
    private _processRefName: string;
    protected _refresh: (pageId?: string, groupId?: string, controlId?: string) => void;
    protected _groupNames: string[] = [];
    private _groupIds: string[] = [];
    private _allProcessFields: AdminProcessContracts.ProcessDefinitionFieldUsageData;
    protected _selectedPage: ProcessContracts.Page;
    private _pages: ProcessContracts.Page[];
    private _onInputsChangeDelegate: () => void;

    // Dialog Layout elements
    private _tabContainerElement: JQuery;
    private _tabContents: JQuery;
    private _controlExtensionDefinitionLayout: JQuery;
    protected _controlExtensionLayoutLayout: JQuery;
    protected _controlExtensionOptionsLayout: JQuery;
    protected _errorPanel: ControlsNotifications.MessageAreaControl;
    private _layoutTabLabelError: JQuery;
    private _layoutTabPageNameError: JQuery;
    private _layoutTabExistingGroupError: JQuery;
    private _layoutTabGroupNameError: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;

    // Input elements
    protected _contributionCombo: RichCombo;
    private _labelInput: JQuery;
    protected _groupNameInput: JQuery;
    private _groupCombo: Combos.Combo;
    protected _pageCombo: Combos.Combo;
    private _inputsTable: FormInput_Controls.FormInputControl;

    // internal data
    protected _controlExtensionData: AdminDialogFieldContracts.IControlExtensionData;
    private _contributions: Contrib_Contracts.Contribution[];
    private _contributionIdToContributionMap: IDictionaryStringTo<Contrib_Contracts.Contribution>;
    protected _hasAnyChanges: boolean;
    protected _isExistingGroup: boolean;
    protected _isEmptyPage: boolean;
    private _bypassValidateInputs: boolean = true;

    // Input view models
    protected _formInputViewModel: FormInput_Controls.FormInputViewModel;
    protected _inputsViewModel: FormInput_Controls.InputsViewModel;
    private _contributionInputLengthValid: boolean;

    public initializeOptions(options?: AdminDialogFieldContracts.AddControlExtensionDialogOptions): void {
        super.initializeOptions($.extend({
            dialogClass: "add-edit-field-dialog",
            buttons: {
                "ok": {
                    id: "ok",
                    text: AdminResources.DialogOkButton,
                    click: () => {
                        this.onOkClick();
                    }
                },
                "close": {
                    id: "close",
                    text: AdminResources.Cancel,
                    click: () => {
                        this.onClose();
                    }
                }
            },
            height: 600,
            minWidth: 650,
            useBowtieStyle: true,
            bowtieVersion: 2,
            title: Utils_String.format(AdminResources.ControlExtensionDialogTitle, options.workItemType.name),
            beforeClose: () => {
                return this.beforeClose();
            },
            resizable: false
        }, options));
    }

    public initialize(): void {
        super.initialize();

        this.initializeData();
        this._onInputsChangeDelegate = Utils_Core.throttledDelegate(this, 200, this._onInputsChange);

        var tabItems = this.initializeTabs();

        var contents = $("<div>").addClass("contents");
        var tabsContainer = <AddFieldControls.AddEditFieldDialogTabs>Controls.BaseControl.createIn(AddFieldControls.AddEditFieldDialogTabs, contents, { source: tabItems });
        this._tabContainerElement = tabsContainer._element;
        this._tabContents = $("<div>").addClass("tab-contents");
        this._errorPanel = <ControlsNotifications.MessageAreaControl>Controls.BaseControl.createIn(ControlsNotifications.MessageAreaControl, this._tabContents);

        this._controlExtensionDefinitionLayout = tabItems[0].contents;
        this._controlExtensionOptionsLayout = tabItems[1].contents;
        this._controlExtensionLayoutLayout = tabItems[2].contents;

        this._tabContents.append(this._controlExtensionDefinitionLayout);
        this._tabContents.append(this._controlExtensionOptionsLayout);
        this._tabContents.append(this._controlExtensionLayoutLayout);

        this._populateDefinitionTab();
        this._populateLayoutTab();

        contents.append(this._tabContents);
        this._element.append(contents);

        this._setInitialValues();
        tabsContainer.selectItem(tabItems[0]);
        this.updateOkButton(true);
    }

    public onOkClick() {
        this._bypassValidateInputs = false;
        this._getExtensionControlData();
        this._addControlExtension();
    }

    public beforeClose(): boolean {
        if (!this._hasAnyChanges) {
            return true;
        }

        return confirm(AdminResources.UnsavedChangesPrompt);
    }

    public showLoading() {
        this.showBusyOverlay();
        if (!this._statusIndicator) {
            this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $(".control-busy-overlay", this._element.parent()), {
                center: true,
                throttleMinTime: 0,
                imageClass: "big-status-progress",
            });
            this._statusIndicator.start();
        }
    }

    protected initializeData(): void {
        this._allProcessFields = this._options.allProcessFields;
        this._processId = this._options.processId;
        this._processName = this._options.processName;
        this._processRefName = this._options.processRefName;
        this._workItemType = this._options.workItemType;
        this._refresh = this._options.refresh;
        // If its a new control added from fields page, getting the first page
        this._selectedPage = this._options.page ? this._options.page : this._workItemType.layout.pages[0];
        this._isEmptyPage = AdminProcessCommon.ProcessLayoutHelpers.isEmptyPage(this._selectedPage, true);
        this._isExistingGroup = !this._isEmptyPage;

        this._controlExtensionData = {
            controlId: this._options.controlId || "",
            inputs: this._options.inputs == null ? {} : $.extend(true, {}, this._options.inputs),
            contributionId: this._options.contributionId || "",
            label: this._options.label || "",
            groupId: this._options.groupId || "",
            groupName: this._options.groupName || ""
        };
    }

    protected initializeTabs(): AdminDialogFieldContracts.AddEditFieldDialogTabItem[] {
        return [
            {
                id: "definition",
                errorId: AddControlExtensionDialog.DEFINITION_TAB_ERRORID,
                label: AdminResources.DefineField,
                callback: () => {
                    this._showDefinitionTab();
                },
                visible: true,
                contents: $(Utils_Html.TemplateEngine.tmpl(AddControlExtensionDialog.DEFINITION_LAYOUT, {
                    controlExtensionDescriptionText: AdminResources.ControlExtensionDescriptionText,
                    ControlText: AdminResources.ControlExtensionControlLabel,
                    learnExtensionLink: AdminResources.LearnExtensionLink,
                    learnMore: AdminResources.LearnMore,
                }))
            },
            {
                id: "options",
                errorId: AddControlExtensionDialog.OPTIONS_TAB_ERRORID,
                label: AdminResources.Options,
                callback: () => {
                    this._showOptionsTab();
                },
                visible: true,
                contents: $(Utils_Html.TemplateEngine.tmpl(AddControlExtensionDialog.OPTIONS_LAYOUT, {
                    controlExtensionInputsDescriptionText: AdminResources.ControlExtensionInputsDescriptionText
                }))
            },
            {
                id: "layout",
                errorId: AddControlExtensionDialog.LAYOUT_TAB_ERRORID,
                label: AdminResources.Layout,
                callback: () => {
                    this._showLayoutTab();
                },
                visible: true,
                contents: $(Utils_Html.TemplateEngine.tmpl(AddControlExtensionDialog.LAYOUT_LAYOUT, {
                    layoutDescriptionText: AdminResources.FieldDetailsLayoutDescription,
                    labelText: AdminResources.Label,
                    groupText: AdminResources.Group,
                    pageLabelText: AdminResources.Page,
                    columnText: AdminResources.SelectColumnForHtmlField,
                    useExistingGroupText: AdminResources.ExistingGroupText,
                    createAGroupText: AdminResources.CreateGroupText
                }))
            }
        ];
    }

    protected getWorkItemType(): ProcessContracts.ProcessWorkItemType {
        return this._workItemType;
    }

    protected getProcessId(): string {
        return this._processId;
    }

    /* 
    * Validate Input functions
    */
    protected validateAndUpdateDefinitionUI(): boolean {
        return AdminCommon.trim(this._contributionCombo.getValue<string>()) !== "";
    }

    protected validateAndUpdateLayoutUI(): boolean {
        var msg: string = AddControlExtensionDialog._validateControlLabel(this._labelInput.val());
        var msgGroup: string = this._isExistingGroup ? AddControlExtensionDialog._validateExistingGroup(this._groupCombo.getText()) : null;
        var msgPage: string = AddControlExtensionDialog._validatePage(this._pageCombo.getText());
        var msgGroupName: string = this._isExistingGroup ? null : AddControlExtensionDialog._validateGroupName(this._groupNameInput.val(), this._getGroups());

        this._updateLayoutTabLabelError(msg == null ? "" : msg);
        this._updateLayoutTabPageError(msgPage == null ? "" : msgPage);
        this._updateLayoutTabExistingGroupError(msgGroup == null ? "" : msgGroup);
        this._updateLayoutTabGroupNameError(msgGroupName == null ? "" : msgGroupName);

        return !msg && !msgGroup && !msgPage && !msgGroupName;
    }

    protected validateAndUpdateOptionsUI(): boolean {
        // validate inputs
        return this._bypassValidateInputs || (this._contributionInputLengthValid && this._inputsViewModel.areValid());
    }

    /* 
    * Tab behavior functions
    */
    protected _showDefinitionTab(): void {
        if (this._controlExtensionDefinitionLayout) {
            this._controlExtensionDefinitionLayout.show();
            this._controlExtensionLayoutLayout.hide();
            this._controlExtensionOptionsLayout.hide();
        }
    }

    protected _showLayoutTab(): void {
        this._controlExtensionDefinitionLayout.hide();
        this._controlExtensionLayoutLayout.show();
        this._controlExtensionOptionsLayout.hide();

        this._controlExtensionLayoutLayout.find(".control-group-container").show();
        this._labelInput.focus();
    }

    protected _showOptionsTab(): void {
        this._controlExtensionDefinitionLayout.hide();
        this._controlExtensionLayoutLayout.hide();
        this._controlExtensionOptionsLayout.show();
    }

    protected _setInitialValues(): void {
        // Set initial values for Layout Tab
        this._pageCombo.setEnabled(true);
        this._pageCombo.setText(this._selectedPage.label, false);
        this._pageCombo.getInput().removeAttr("disabled");
        this._labelInput.removeAttr("disabled");
        this._labelInput.val(this._controlExtensionData.label);
        this._setGroupCombo();
    }

    private _setGroupCombo(): void {
        var group = this._getDefaultGroup(this._selectedPage.id, this._options.groupId);

        if (group) {
            this._groupCombo.setText(group.label);
        }
        else {
            var groups = this._getGroups();

            if (groups && groups.length > 0) {
                this._groupCombo.setSelectedIndex(0, false);
            }
            else {
                this._groupCombo.setText('');
            }
        }
    }

    /* 
    * Populate contents functions
    */
    protected _populateDefinitionTab(): void {
        this._createContributionCombo();

        // We don't have to handle the error case because we block the dialog from being loaded
        // if the control contributions were not loaded.
        this._getControlContributions().then((contributions: Contrib_Contracts.Contribution[]) => {
            this._contributions = Utils_Array.clone(contributions);

            for (let i = 0; i < this._contributions.length; i++) {
                this._contributions[i] = $.extend({}, this._contributions[i]);
                this._contributions[i].properties = $.extend(true, {}, this._contributions[i].properties);

                if (this._contributions[i].properties &&
                    this._contributions[i].properties[WITConstants.WorkItemFormContributionProperties.Inputs]) {

                    let inputs: FormInput_Controls.ExtendedInputDescriptor[] = this._contributions[i].properties[WITConstants.WorkItemFormContributionProperties.Inputs];
                    for (let input of inputs) {
                        let isWorkItemFieldInputType = Utils_String.equals(input.type, WITConstants.WorkItemFormContributionProperties.InputType_WorkItemField, true);
                        if (!input.inputMode) {
                            if (isWorkItemFieldInputType) {
                                // default input type for field is combo
                                input.inputMode = FormInput_Contracts.InputMode.Combo;
                            }
                            else {
                                // default is text
                                input.inputMode = FormInput_Contracts.InputMode.TextBox;
                            }
                        }
                        else {
                            // we're casting to a string since the model expects a number, but we have a string value.
                            input.inputMode = FormInput_Contracts.InputMode[input.inputMode.toString()];
                        }

                        if (input.validation &&
                            input.validation.dataType) {
                            // we're casting to a string since the model expects a number, but we have a string value.
                            input.validation.dataType = FormInput_Contracts.InputDataType[input.validation.dataType.toString()];
                        }
                        else if (!input.validation) {
                            // default validation for workitemfield type
                            input.validation = {
                                dataType: FormInput_Contracts.InputDataType.String,
                                isRequired: true,
                                maxLength: null,
                                minLength: null,
                                maxValue: null,
                                minValue: null,
                                pattern: null,
                                patternMismatchErrorMessage: null,
                                validateFunction: null
                            };
                        }
                        else if (!input.validation.dataType) {
                            input.validation.dataType = FormInput_Contracts.InputDataType.String;
                        }

                        if (isWorkItemFieldInputType) {
                            let inputFieldTypes: string[];
                            if (input.properties && input.properties[WITConstants.WorkItemFormContributionProperties.InputProperties_WorkItemFieldTypes]) {
                                inputFieldTypes = input.properties[WITConstants.WorkItemFormContributionProperties.InputProperties_WorkItemFieldTypes];
                            }

                            input.values = this._buildFieldInputValues(input.id, inputFieldTypes);
                            input.validation.validateFunction = (model: FormInput_Controls.InputViewModel) => {
                                let value = <string>model.getValue();
                                let index = Utils_Array.findIndex(this._allProcessFields.Fields, (field: AdminProcessContracts.ProcessField) => {
                                    return Utils_String.equals(field.Name, value, true);
                                });

                                if (index === -1) {
                                    return {
                                        error: Utils_String.format(AdminResources.FieldNotFound, value),
                                        isValid: false
                                    }
                                }
                                else if (inputFieldTypes && inputFieldTypes.length > 0) {
                                    let field = this._allProcessFields.Fields[index];
                                    if (!Utils_Array.contains(inputFieldTypes, field.Type, Utils_String.ignoreCaseComparer)) {
                                        return {
                                            error: Utils_String.format(AdminResources.ControlExtensionInvalidFieldTypes, field.Name, field.Type, inputFieldTypes.join("; ")),
                                            isValid: false
                                        }
                                    }
                                    else {
                                        return {
                                            error: "",
                                            isValid: true
                                        }
                                    }
                                }
                                else {
                                    return {
                                        error: "",
                                        isValid: true
                                    }
                                }
                            }
                        }
                    }
                }
            }

            this._contributionIdToContributionMap = Utils_Array.toDictionary<Contrib_Contracts.Contribution, Contrib_Contracts.Contribution>(this._contributions, (item: Contrib_Contracts.Contribution) => item.id);

            this._contributionCombo.setSource(this._contributions.map((item: Contrib_Contracts.Contribution) => item.id));
            if (this._controlExtensionData.contributionId) {
                this._contributionCombo.setInputText(this._controlExtensionData.contributionId);
            }
            else {
                this._contributionCombo.setSelectedIndex(0);
            }

            // populate options tab based on selected contribution;
            this._populateOptionsTab();
        });
    }

    private _createContributionCombo(): void {
        this._contributionCombo = <RichCombo>Controls.BaseControl.enhance(RichCombo, $('.control-type-container .control-combo', this._controlExtensionDefinitionLayout), {
            source: [],
            type: "richCombo",
            allowEdit: false,
            maxAutoExpandDropWidth: 400,
            change: () => {
                this._populateOptionsTab();

                // now that we've chosen a new extension control, recalculate the error conditions
                this._updateLayoutTabExistingGroupError
            },
            getItemContents: (contributionId: string) => {
                return this.getContributionItemUI(contributionId);
            },
            getItemTooltip: (contributionId: string) => {
                let contribution = this._contributionIdToContributionMap[contributionId];
                return contribution ? AdminProcessCommon.ProcessContributionHelpers.getContributionLabel(contribution) : contributionId;
            },
            dropOptions: {
                // Renderer for items passed into combo box, use state renderer
                getItemContents: (contributionId: string) => {
                    return this.getContributionItemUI(contributionId);
                },
                emptyRenderer: () => {
                    return $("<div/>").addClass("no-contributions-found").text(AdminResources.NoControlContributionsFound);
                },
                getItemTooltip: (contributionId: string) => {
                    let contribution = this._contributionIdToContributionMap[contributionId];
                    return contribution ? AdminProcessCommon.ProcessContributionHelpers.getContributionLabel(contribution) : contributionId;
                },
            }
        });
    }

    /**
     * Renderer for the control extension rich combo control
     */
    private getContributionItemUI(contributionId: string) {
        if (contributionId) {
            let contribution = this._contributionIdToContributionMap[contributionId];
            let $item = $("<div>").addClass("contribution-combo-item");

            if (!contribution) {
                return $item;
            }

            let contributionName = AdminProcessCommon.ProcessContributionHelpers.getContributionLabel(contribution);
            let contributionDescription = contribution.description || "";

            let $img = $("<img>").appendTo($item).attr("src", AdminProcessCommon.ProcessContributionHelpers.getContributionIconUri(contribution));
            let $textContainer = $("<div>").addClass("contribution-combo-item-text").appendTo($item);
            let $nameContainer = $("<div>").addClass("contribution-combo-item-text-name").text(`${contributionName} (${AdminProcessCommon.ProcessContributionHelpers.getContributionPublisherName(contribution)})`).appendTo($textContainer);
            let $descContainer = $("<div>").addClass("contribution-combo-item-text-desc").text(contributionDescription).attr("title", contributionDescription).appendTo($textContainer);

            return $item;
        }
        else {
            return $("<div>");
        }
    }

    protected _getPages(): string[] {
        this._pages = AdminProcessCommon.ProcessLayoutHelpers.getPages(this._workItemType.layout, false);
        return this._pages.map((page) => { return page.label });
    }

    protected _populateLayoutTab(): void {

        this._pageCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $('.page-group', this._controlExtensionLayoutLayout), {
            source: this._getPages(),
            allowEdit: false,
            maxAutoExpandDropWidth: 300,
            change: () => { this._updatePageData(); }
        });

        this._populateGroups(this._selectedPage);

        this._groupCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $('.field-group', this._controlExtensionLayoutLayout), {
            source: this._getGroups(),
            allowEdit: false,
            maxAutoExpandDropWidth: 300,
            focus: () => {
                this._refreshGroupOptions(true);
            }
        });

        Utils_UI.Watermark($("input", this._groupCombo.getElement()), { watermarkText: AdminResources.NoGroupForSelectedPage });

        this._layoutTabLabelError = $(".field-form-name-error-message", this._controlExtensionLayoutLayout);

        this._layoutTabPageNameError = $(".field-form-page-error-message", this._controlExtensionLayoutLayout);
        this._layoutTabExistingGroupError = $(".field-form-group-error-message", this._controlExtensionLayoutLayout);
        this._layoutTabGroupNameError = $(".group-name-error-message", this._controlExtensionLayoutLayout);

        this._labelInput = $('.field-form-name', this._controlExtensionLayoutLayout).bind("change keyup", () => { this._onLayoutControlLabelChange(); });
        this._groupNameInput = $('.group-name', this._controlExtensionLayoutLayout).bind("change keyup", () => { this._onGroupNameChange(); }).focus(() => this._refreshGroupOptions(false));

        if (this._isEmptyPage) {
            this._refreshGroupOptions(false);
        }
        else {
            this._refreshGroupOptions(true);
        }

        $('input:radio[name=groupRadio]', this._controlExtensionLayoutLayout).change((e: JQueryEventObject) => {
            this._onUseExistingGroupChange(e.currentTarget['value'] === "true");
        });
    }

    protected _populateOptionsTab(): void {
        let container = $(".control-extensions-inputs-container", this._controlExtensionOptionsLayout);
        container.empty();
        if (this._inputsTable) {
            this._inputsTable.dispose();
            this._inputsTable = null;
        }

        this._formInputViewModel = null;
        this._inputsViewModel = null;
        this._contributionInputLengthValid = true;

        var contributionId: string = this._contributionCombo.getValue<string>();
        if (contributionId) {
            let contribution: Contrib_Contracts.Contribution = this._contributionIdToContributionMap[contributionId];
            let inputs: FormInput_Controls.ExtendedInputDescriptor[] = contribution.properties[WITConstants.WorkItemFormContributionProperties.Inputs];

            if (inputs && inputs.length > 0 && inputs.length <= this._options.controlContributionInputLimit) {
                for (let input of inputs) {
                    input.valueChangedCallbacks = [
                        this._onInputsChangeDelegate
                    ];

                    // transform any form inputs from field id to field name
                    // this is a short term workaround to the input control framework which does
                    // not handle display and id values when typeahead is enabled.
                    let isWorkItemFieldInputType = Utils_String.equals(input.type, WITConstants.WorkItemFormContributionProperties.InputType_WorkItemField, true);
                    if (isWorkItemFieldInputType && this._controlExtensionData.inputs[input.id]) {
                        let field = Utils_Array.first(this._allProcessFields.Fields, (field: AdminProcessContracts.ProcessField) => {
                            return Utils_String.equals(field.Id, <string>this._controlExtensionData.inputs[input.id], true);
                        });

                        if (field) {
                            this._controlExtensionData.inputs[input.id] = field.Name;
                        }
                    }
                }

                this._formInputViewModel = new FormInput_Controls.FormInputViewModel(null, null, null, null);
                this._inputsViewModel = new FormInput_Controls.InputsViewModel(this._formInputViewModel, inputs, this._controlExtensionData.inputs, null, null);
                this._inputsTable = FormInput_Controls.FormInputControl.createControl(container, {
                    inputsViewModel: this._inputsViewModel,
                    headerLabel: "",
                    comboControlMap: this._formInputViewModel.mapInputIdToComboControl
                });
            }
            else {
                // Constructing the model since other code assumes it exists, and the view model never should be null.
                this._formInputViewModel = new FormInput_Controls.FormInputViewModel(null, null, null, null);
                this._inputsViewModel = new FormInput_Controls.InputsViewModel(this._formInputViewModel, [], {}, null, null);

                let message: string;
                let messageType: ControlsNotifications.MessageAreaType;
                if (inputs && inputs.length > this._options.controlContributionInputLimit) {
                    this._contributionInputLengthValid = false;
                    message = Utils_String.format(AdminResources.AddControlExtensionDialog_ContributionInputsExceedLimit, inputs.length, this._options.controlContributionInputLimit);
                    messageType = ControlsNotifications.MessageAreaType.Warning;
                }
                else {
                    message = AdminResources.AddControlExtensionDialog_NoContributionInputsInfo;
                    messageType = ControlsNotifications.MessageAreaType.Info;
                }

                <ControlsNotifications.MessageAreaControl>Controls.BaseControl.createIn(ControlsNotifications.MessageAreaControl, container, {
                    message: {
                        type: messageType,
                        content: message
                    },
                    closeable: false,
                    showDetailsLink: false
                });
            }
        }
    }

    private _buildFieldInputValues(inputId: string, inputFieldTypes: string[]): FormInput_Contracts.InputValues {
        let possibleValues: FormInput_Contracts.InputValue[] = $.map(this._allProcessFields.Fields, (processField, index) => {
            if (inputFieldTypes && inputFieldTypes.length > 0 && !Utils_Array.contains(inputFieldTypes, processField.Type, Utils_String.ignoreCaseComparer)) {
                return null;
            }
            return {
                data: {
                    [AddControlExtensionDialog.INPUT_VALUE_DATA_FIELD_ID]: processField.Id
                },
                displayValue: null,
                value: processField.Name,
            }
        });

        return {
            inputId: inputId,
            defaultValue: null,
            error: null,
            isDisabled: false,
            isLimitedToPossibleValues: false,
            isReadOnly: false,
            possibleValues: possibleValues
        };
    }

    private _onInputsChange() {
        this._bypassValidateInputs = true;
        this._updateTabErrors();
    }

    /** Updates state of exclamation mark icon at the right of each tab 
      * Also updates the "Add" Button: the button should be disabled if there are any errors on the page
    */
    private _updateTabErrors(): void {
        var definitionTabHasError: boolean = false;
        var layoutTabHasError: boolean = this._layoutTabHasErrors();
        var optionsTabHasError: boolean = !this.validateAndUpdateOptionsUI();

        var hasErrors = definitionTabHasError || layoutTabHasError || optionsTabHasError;

        this.updateOkButton(!hasErrors);
        $("#" + AddControlExtensionDialog.DEFINITION_TAB_ERRORID, this._tabContainerElement).css("display", definitionTabHasError ? "inline-block" : "none");
        $("#" + AddControlExtensionDialog.LAYOUT_TAB_ERRORID, this._tabContainerElement).css("display", layoutTabHasError ? "inline-block" : "none");
        $("#" + AddControlExtensionDialog.OPTIONS_TAB_ERRORID, this._tabContainerElement).css("display", optionsTabHasError ? "inline-block" : "none");
    }

    private _layoutTabHasErrors(): boolean {
        var groupError = $(".field-form-group-error-message", this._controlExtensionLayoutLayout);
        var pageError = $(".field-form-page-error-message", this._controlExtensionLayoutLayout);
        var groupNameError = $(".group-name-error-message", this._controlExtensionLayoutLayout);
        return this._layoutTabLabelError.text() !== "" || groupError.text() !== "" || pageError.text() !== "" || groupNameError.text() !== "";
    }

    protected _validate(): boolean {
        var fieldDefinitionValid = this.validateAndUpdateDefinitionUI();
        var fieldLayoutValid = this.validateAndUpdateLayoutUI();
        var fieldOptionsValid = this.validateAndUpdateOptionsUI();
        var isValid = fieldDefinitionValid && fieldLayoutValid && fieldOptionsValid;
        this._updateTabErrors();

        return isValid;
    }

    private _getGroups(): string[] {
        return this._groupNames;
    }

    /* 
    * Input Elements Change Event Handlers 
    */

    private _updatePageData(): void {
        var selectedId = this._pageCombo.getSelectedIndex();
        this._selectedPage = this._pages[selectedId];
        this._isEmptyPage = AdminProcessCommon.ProcessLayoutHelpers.isEmptyPage(this._selectedPage, true);
        this._populateGroups(this._selectedPage);
        this._groupCombo.setSource(this._getGroups());
        this._setGroupCombo();
        var isExisting = !this._isEmptyPage;
        this._onUseExistingGroupChange(isExisting);
    }

    protected _getExtensionControlData(): void {
        this._controlExtensionData.label = this._labelInput.val();
        this._controlExtensionData.contributionId = this._contributionCombo.getValue<string>();
        this._controlExtensionData.controlId = this._options.controlId;

        // transform any form inputs from field name to field id
        // this is a short term workaround to the input control framework which does
        // not handle display and id values when typeahead is enabled.
        let inputs = this._inputsViewModel.getInputsAsDictionary();
        if (inputs) {
            for (let inputId in inputs) {
                let inputValue = inputs[inputId];
                let inputDescriptor = this._inputsViewModel.getInputViewModelById(inputId).getInputDescriptor();
                if (inputDescriptor.values && inputDescriptor.values.possibleValues) {
                    for (let possibleValue of inputDescriptor.values.possibleValues) {
                        if (possibleValue.data && Utils_String.equals(inputValue, possibleValue.value, true)) {
                            inputs[inputId] = possibleValue.data[AddControlExtensionDialog.INPUT_VALUE_DATA_FIELD_ID];
                        }
                    }
                }
            }
        }

        this._controlExtensionData.inputs = inputs;

        let isNewGroup = $('input:radio[id=newGroupRadio]', this._controlExtensionLayoutLayout).prop("checked");
        if (isNewGroup) {
            this._controlExtensionData.groupId = "";
            this._controlExtensionData.groupName = this._groupNameInput.val();
        }
        else {
            var selectedGroupIndex = this._groupCombo.getSelectedIndex();
            this._controlExtensionData.groupId = this._groupIds[selectedGroupIndex];
            this._controlExtensionData.groupName = this._groupCombo.getText();
        }
    }

    protected _populateGroups(page: ProcessContracts.Page): void {
        let nonSealedGroups: ProcessContracts.Group[] = AdminProcessCommon.ProcessLayoutHelpers.getGroups(page, false);
        this._groupNames = [];
        this._groupIds = [];

        nonSealedGroups.sort((g1: ProcessContracts.Group, g2: ProcessContracts.Group) => { return Utils_String.localeIgnoreCaseComparer(g1.label, g2.label); })

        $.each(nonSealedGroups, (k, group) => {
            this._groupNames.push(group.label);
            this._groupIds.push(group.id);
        });
    }

    /**
    * Get the default group to use when populating the 'Group' combobox.  This currently
    * retrieves the first group in the first section if the groupId is not passed. Otherwise finds the group that is passed and returns it  
    * Currently only works for 1 custom tab page, will need to be extended when generic tab pages are allowed.
    */
    private _getDefaultGroup(pageId?: string, groupId?: string): ProcessContracts.Group {
        var group: ProcessContracts.Group = null;

        $.each(this.getWorkItemType().layout.pages, (i, page) => {
            if (page.pageType === ProcessContracts.PageType.Custom && (!pageId || pageId === page.id)) {
                if (page.sections) {
                    if (groupId) {
                        $.each(page.sections, (i, section) => {
                            $.each(section.groups, (i, grp) => {
                                if (Utils_String.equals(grp.id, groupId, true)) {
                                    group = grp;
                                    return false;
                                }
                            });
                        });
                    }

                    return false;
                }
            }
        });

        return group;
    }

    private _updateLayoutTabLabelError(errorMsg: string): void {
        if (errorMsg !== "") {
            this._labelInput.addClass('invalid');
        }
        else {
            this._labelInput.removeClass('invalid');
        }

        this._layoutTabLabelError.text(errorMsg);
        this._updateTabErrors();
    }

    private _updateLayoutTabPageError(errorMsg: string): void {
        this._pageCombo.setInvalid(errorMsg !== "");
        this._layoutTabPageNameError.text(errorMsg);
    }

    private _updateLayoutTabExistingGroupError(errorMsg: string): void {
        this._groupCombo.setInvalid(errorMsg !== "");
        this._layoutTabExistingGroupError.text(errorMsg);
    }

    private _updateLayoutTabGroupNameError(errorMsg: string): void {
        if (errorMsg !== "") {
            this._groupNameInput.addClass('invalid');
        }
        else {
            this._groupNameInput.removeClass('invalid');
        }

        this._layoutTabGroupNameError.text(errorMsg);
        this._updateTabErrors();
    }

    private _onGroupNameChange(): void {
        // Removing validation message only if there were any changes
        this._updateLayoutTabGroupNameError("");
    }

    private _onLayoutControlLabelChange(): void {
        // Removing validation message only if there were any changes
        this._updateLayoutTabLabelError("");
    }

    private _refreshGroupOptions(existing: boolean): void {
        this._isExistingGroup = existing;
        if (existing) {
            this._groupCombo.setEnabled(true);
            var fieldComboInput = this._groupCombo.getInput();
            fieldComboInput.removeAttr("disabled").focus().val(fieldComboInput.val());
            $('input:radio[id=existingGroupRadio]', this._controlExtensionLayoutLayout).prop("checked", true);
            $('input:radio[id=newGroupRadio]', this._controlExtensionLayoutLayout).prop("checked", false);
            $('input:radio[id=existingGroupRadio]', this._controlExtensionLayoutLayout).removeAttr("disabled");
        }
        else {
            $('input:radio[id=existingGroupRadio]', this._controlExtensionLayoutLayout).prop("checked", false);
            $('input:radio[id=newGroupRadio]', this._controlExtensionLayoutLayout).prop("checked", true);

            if (this._isEmptyPage) {
                $('input:radio[id=existingGroupRadio]', this._controlExtensionLayoutLayout).attr("disabled", "disabled");
                this._groupCombo.setEnabled(false);
                this._groupCombo.getInput().attr("disabled", "disabled");
                this._groupNameInput.val(AdminResources.DefaultGroupName);
            }
        }
    }

    private _onUseExistingGroupChange(existing: boolean): void {
        this._refreshGroupOptions(existing);
        this._clearLayoutTabGroupErrors();
    }

    private _clearLayoutTabGroupErrors() {
        this._updateLayoutTabPageError("");
        this._updateLayoutTabExistingGroupError("");
        this._updateLayoutTabGroupNameError("");
    }

    private _clearLayoutTabErrors() {
        this._updateLayoutTabLabelError("");
        this._clearLayoutTabGroupErrors();
    }

    /** Create Rest package functions 
    */
    private _buildAddFieldToWorkItemTypePackage(fieldId: string, fieldType: string): ProcessContracts.ProcessWorkItemTypeField {
        let helper = new AdminProcessCommon.ProcessFieldHelper();
        let type: ProcessContracts.FieldType = helper.getFieldTypeFromLabel(fieldType).fieldType;

        var witFieldModel: ProcessContracts.ProcessWorkItemTypeField = {
            defaultValue: null,
            referenceName: fieldId,
            name: null,
            type: null,
            url: null,
            description: null,
            readOnly: false,
            required: false,
            allowGroups: false,
            customization: null
        };

        // for custom boolean fields, required must be true and default must be false
        if (AdminDialogFieldContracts.OtherCoreFields.indexOf(fieldId) === -1 && AdminDialogFieldContracts.CoreFields.indexOf(fieldId) === -1) {
            if (type === ProcessContracts.FieldType.Boolean) {
                witFieldModel.required = true;
                witFieldModel.defaultValue = "false";
            }
        }

        // If the field is already in the work item type, make sure we don't change properties
        const witFieldUsage: AdminProcessContracts.ProcessFieldUsage = this._getCurrentWitFieldUsage(this._workItemType, fieldId);
        if (witFieldUsage && witFieldUsage.Properties) {
            if (witFieldUsage.Properties.Default) {
                witFieldModel.defaultValue = witFieldUsage.Properties.Default.Value;
            }
            witFieldModel.required = witFieldUsage.Properties.IsRequired;
            witFieldModel.readOnly = witFieldUsage.Properties.IsReadOnly;
            witFieldModel.allowGroups = witFieldUsage.Properties.AllowGroups;
        }

        return witFieldModel;
    }

    protected buildAddControlExtensionToLayoutPackage(): ProcessContracts.Control {
        return {
            order: null,
            label: this._controlExtensionData.label,
            readOnly: false,
            visible: true,
            controlType: null,
            id: this._controlExtensionData.controlId,
            metadata: null,
            inherited: null,
            overridden: null,
            watermark: null,
            contribution: {
                contributionId: this._controlExtensionData.contributionId,
                inputs: this._controlExtensionData.inputs,
                height: null,
                showOnDeletedWorkItem: null
            },
            isContribution: true,
            height: null
        }
    }

    private _getCurrentWitFieldUsage(wit: ProcessContracts.ProcessWorkItemType, fieldNameOrRefName: string): AdminProcessContracts.ProcessFieldUsage {
        const [processField] = this._allProcessFields.Fields.filter(f =>
            Utils_String.localeIgnoreCaseComparer(f.Name, fieldNameOrRefName) === 0
            || Utils_String.localeIgnoreCaseComparer(f.Id, fieldNameOrRefName) === 0);

        var witFieldUsages: AdminProcessContracts.ProcessFieldUsage[] = processField.Usages.filter(u => Utils_String.localeIgnoreCaseComparer(u.WorkItemTypeId, wit.referenceName) === 0);
        if (witFieldUsages.length > 0) {
            return witFieldUsages[0];
        }

        var parentWitFieldUsages: AdminProcessContracts.ProcessFieldUsage[] = processField.Usages.filter(u => Utils_String.localeIgnoreCaseComparer(u.WorkItemTypeId, wit.inherits) === 0);
        if (parentWitFieldUsages.length > 0) {
            return parentWitFieldUsages[0];
        }
        else {
            return null;
        }
    }

    /**
     * Creates control extension then adds to process before
     * calling _addControlToLayout
     */
    private _addControlExtension(): void {
        if (!this._validate()) {
            return;
        }

        this.showLoading();
        var addField = (workItemTypeId: string) => {
            let fields = this._getFieldInputValues();
            if (fields.length > 0) {
                let addFieldPromises: IPromise<ProcessContracts.ProcessWorkItemTypeField>[] = [];
                let addFieldFunctions: Function[] = [];
                let promise: IPromise<void>;
                for (let field of fields) {
                    let addFieldFunction = () => {
                        return this._addFieldToWorkItemType(workItemTypeId, field);
                    }
                    if (!promise) {
                        promise = addFieldFunction();
                    }
                    else {
                        promise = promise.then(addFieldFunction, (fieldError) => {
                            this._errorPanel.setMessage(fieldError.message);
                            this.hideBusyOverlay();
                        });
                    }
                }
                if (promise) {
                    promise.then(() => this._addControlToLayout(workItemTypeId), (fieldError) => {
                        this._errorPanel.setMessage(fieldError.message);
                        this.hideBusyOverlay();
                    });
                }
            }
            else {
                this._addControlToLayout(workItemTypeId);
            }
        };

        var doAdd = () => {
            if (this._workItemType.customization !== ProcessContracts.CustomizationType.System) {
                addField(this._workItemType.referenceName);
            }
            else {
                this._createChildWorkItemType(addField);
            }
        };

        doAdd();
    }

    private _getFieldInputValues(): string[] {
        let fieldValues: string[] = [];
        for (let inputViewModel of this._inputsViewModel.getInputViewModels()) {
            let inputDescriptor = inputViewModel.getInputDescriptor();
            if (Utils_String.equals(inputDescriptor.type, WITConstants.WorkItemFormContributionProperties.InputType_WorkItemField, true)) {
                fieldValues.push(<string>this._controlExtensionData.inputs[inputDescriptor.id]);
            }
        }

        return fieldValues;
    }

    protected _getControlContributions(): IPromise<Contrib_Contracts.Contribution[]> {
        return AdminProcessCommon.ProcessContributionHelpers.getControlContributions();
    }

    protected _createChildWorkItemType(callback?: (workItemTypeId: string) => void): void {
        const workItemType: ProcessContracts.CreateProcessWorkItemTypeRequest = {
            color: this._workItemType.color,
            description: this._workItemType.description,
            icon: this._workItemType.icon,
            name: this._workItemType.name,
            inheritsFrom: this._workItemType.referenceName,
            isDisabled: this._workItemType.isDisabled
        }

        Utils.getProcessClient().createProcessWorkItemType(workItemType, this._processId).then(
            (witResponse: ProcessContracts.ProcessWorkItemType) => {
                // store the child work item type in case one of the later REST calls fail
                this._workItemType.referenceName = witResponse.referenceName;
                this._workItemType.name = witResponse.name;
                this._workItemType.description = witResponse.description;
                this._workItemType.inherits = witResponse.inherits;
                this._workItemType.customization = witResponse.customization;
                if ($.isFunction(callback)) {
                    callback(witResponse.referenceName);
                }
            }, (witError) => {
                this._errorPanel.setMessage(witError.message);
                this.hideBusyOverlay();
            });
    }

    protected _addFieldToWorkItemType(workItemTypeId: string, fieldId: string): IPromise<void> {
        let defer = Q.defer<void>();

        let field = Utils_Array.first(this._allProcessFields.Fields, (field: AdminProcessContracts.ProcessField) => {
            return Utils_String.equals(field.Id, fieldId, true);
        });

        // always add the field to work item type to avoid server racing condition
        let addFieldToWorkItemTypePackage = this._buildAddFieldToWorkItemTypePackage(fieldId, field.Type);
        this._options.beginAddFieldToWorkItemType(addFieldToWorkItemTypePackage, this._processId, workItemTypeId).then(() => {
            defer.resolve(null); // we are not going to use the returned field model, so no need to return it
        }, defer.reject);

        return defer.promise;
    }

    protected _addGroupWithControl(controlToLayoutPackage: ProcessContracts.Control[]): void {
        var addGroupPackage: ProcessContracts.Group = {
            controls: controlToLayoutPackage,
            id: null,
            label: this._controlExtensionData.groupName,
            order: null,
            overridden: null,
            inherited: null,
            visible: true,
            height: null,
            isContribution: false,
            contribution: null
        };

        Utils.getProcessClient().addGroup(
            addGroupPackage, this._processId, this._workItemType.referenceName, this._selectedPage.id, WorkItemLayoutCommon.GroupSectionConstants.SECTIONS[0].id).then(
                (group: ProcessContracts.Group) => {
                    this.onClose();
                    this._refresh(this._selectedPage.id, group ? group.id : null, group && group.controls.length === 1 ? group.controls[0].id : null);

                    this._publishTelemetry(Admin.CustomerIntelligenceConstants.Process.EDIT_CONTROLCONTRIBUTION_DIALOG, "editControlContributionLayout");
                },
                (error) => {
                    this._errorPanel.setMessage(error.message);
                    this.hideBusyOverlay();
                });
    }

    protected _addControlToLayout(workItemTypeId: string): void {
        var addControlToLayoutPackage = this.buildAddControlExtensionToLayoutPackage();

        if (this._controlExtensionData.groupId) {
            Utils.getProcessClient().createControlInGroup(addControlToLayoutPackage, this._processId, workItemTypeId, this._controlExtensionData.groupId).then(
                (control: ProcessContracts.Control) => {
                    this.onClose();
                    this._refresh(this._selectedPage.id, this._controlExtensionData.groupId, control ? control.id : null);

                    this._publishTelemetry(Admin.CustomerIntelligenceConstants.Process.EDIT_CONTROLCONTRIBUTION_DIALOG, "editControlContributionLayout");
                },
                (error) => {
                    this._errorPanel.setMessage(error.message);
                    this.hideBusyOverlay();
                });
        }
        // If on new page, group id will be empty. Checking if create new group is selected
        else {
            this._addGroupWithControl([addControlToLayoutPackage]);
        }
    }

    protected _publishTelemetry(feature: string, event: string) {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.AREA,
            feature,
            {
                "event": event,
                "workItemType": this._workItemType.name,
                "contributionId": this._controlExtensionData.contributionId,
                "label": this._controlExtensionData.label
            }));
    }

    public showError(message: string) {
        this._errorPanel.setMessage(message);
    }
}

export class EditControlExtensionDialog extends AddControlExtensionDialog<AdminDialogFieldContracts.AddControlExtensionDialogOptions> {
    private _originalControlExtensionData: AdminDialogFieldContracts.IControlExtensionData;

    public initialize() {
        super.initialize();
    }

    protected initializeData(): void {
        super.initializeData();
        this._originalControlExtensionData = $.extend({}, this._controlExtensionData);
    }

    protected _addControlToLayout(workItemTypeId: string): void {
        let onSave = (pageId: string, groupId: string, controlId: string) => {
            this.onClose();
            this._refresh(pageId, groupId, controlId);

            this._publishTelemetry(Admin.CustomerIntelligenceConstants.Process.EDIT_CONTROLCONTRIBUTION_DIALOG, "editControlContributionLayout");
        };

        let onError = (error) => {
            this.showError(error.message);
            this.hideBusyOverlay();
        };

        let controlPackage = this.buildAddControlExtensionToLayoutPackage();
        if (this._controlExtensionData.groupId) {
            let groupChanged = !Utils_String.equals(this._controlExtensionData.groupId, this._originalControlExtensionData.groupId, true);
            if (groupChanged) {
                Utils.getProcessClient().moveControlToGroup(controlPackage, this.getProcessId(), this.getWorkItemType().referenceName, this._controlExtensionData.groupId, controlPackage.id, this._originalControlExtensionData.groupId)
                    .then(() => {
                        onSave(this._selectedPage.id, this._controlExtensionData.groupId, controlPackage.id);
                    }, onError);
            }
            else {
                Utils.getProcessClient().updateControl(controlPackage, this.getProcessId(), this.getWorkItemType().referenceName, this._controlExtensionData.groupId, controlPackage.id)
                    .then(() => {
                        onSave(this._selectedPage.id, this._controlExtensionData.groupId, controlPackage.id);
                    }, onError);
            }
        }
        else {
            Utils.getProcessClient().removeControlFromGroup(this.getProcessId(), this.getWorkItemType().referenceName, this._originalControlExtensionData.groupId, controlPackage.id).then(() => {
                this._addGroupWithControl([controlPackage]);
            }, onError);
        }
    }
}
