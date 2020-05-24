import * as AddFieldControls from "Admin/Scripts/TFS.Admin.Controls.AddField";
import * as AdminControlFactory from "Admin/Scripts/Common/ControlFactory";
import * as AdminDialogFieldContracts from "Admin/Scripts/TFS.Admin.Dialogs.FieldContracts";
import * as AdminProcessContracts from "Admin/Scripts/Contracts/TFS.Admin.Process.Contracts";
import * as AdminProcessCommon from "Admin/Scripts/TFS.Admin.Process.Common";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as TFS_Admin_Common from "Admin/Scripts/TFS.Admin.Common";
import * as WorkItemDialogBase from "Admin/Scripts/Dialogs/WorkItemDialogBase";
import * as WorkItemLayoutCommon from "Admin/Scripts/Common/WorkItemLayout.Common";
import {
    createDefinitionLayout,
    createLayoutLayout,
    createOptionsLayout,
} from "Admin/Scripts/Dialogs/AddFieldDialogSections";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";

import * as ProcessContracts from "TFS/WorkItemTracking/ProcessContracts";
import * as ProcessDefinitionsContracts from "TFS/WorkItemTracking/ProcessDefinitionsContracts";
import * as ProcessDefinitionsHttpClient from "TFS/WorkItemTracking/ProcessDefinitionsRestClient";
import * as ProcessHttpClient from "TFS/WorkItemTracking/ProcessRestClient";

import { OpenDropDownOnFocusCombo } from "Presentation/Scripts/TFS/TFS.UI.Controls.OpenDropDownCombo";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_Core_Utils from "Presentation/Scripts/TFS/TFS.Core.Utils";

import * as Combos from "VSS/Controls/Combos";
import * as ControlsNotifications from "VSS/Controls/Notifications";
import * as Controls from "VSS/Controls";
import * as FeatureAvailability_Services from "VSS/FeatureAvailability/Services";
import * as Service from "VSS/Service";
import * as StatusIndicator from "VSS/Controls/StatusIndicator";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
var KeyCode = Utils_UI.KeyCode;
import {
    IdentityPickerSearchControl,
    IIdentityPickerSearchOptions,
    IdentityPickerControlSize,
} from "VSS/Identities/Picker/Controls";
import { ServiceHelpers } from "VSS/Identities/Picker/Services";
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import { Utils } from "Admin/Scripts/Common/Utils";

const delegate = Utils_Core.delegate;

/**
 * Requests the users to add a new/existing field
 */
export class AddFieldDialog<TOptions extends AdminDialogFieldContracts.AddFieldDialogOptions>
    extends WorkItemDialogBase.WorkItemDialogBase<AdminDialogFieldContracts.Field, TOptions> {

    public static isNameAlreadyUsed(name: string, usedFields: AdminProcessContracts.ProcessDefinitionFieldUsageData): boolean {
        let trimmedVal = TFS_Admin_Common.trim(name);
        let result: boolean = false;
        usedFields.Fields.forEach(field => {
            if (Utils_String.localeIgnoreCaseComparer(field.Name, trimmedVal) === 0) {
                result = true;
                return;
            }
        });
        return result;
    }

    public _validateFieldDefinition(name: string,
        usedFields: AdminProcessContracts.ProcessDefinitionFieldUsageData,
        availableFields: { [name: string]: ProcessContracts.FieldModel }): boolean {
        let trimmedVal = TFS_Admin_Common.trim(name);
        const onlyNumeric: RegExp = /^\d+$/; // only numbers

        if (!trimmedVal) {
            this._updateDefinitionTabFieldNameError(AdminResources.AddFieldDialog_NameRequired);
            return false;
        }

        if (AddFieldDialog.isNameAlreadyUsed(trimmedVal, usedFields)) {
            this._updateDefinitionTabFieldNameError(AdminResources.AddFieldDialog_FieldNameAlreadyAddedToWIT);
            return false;
        }

        for (let key in availableFields) {
            if (Utils_String.localeIgnoreCaseComparer(key, trimmedVal) === 0) {
                this._updateDefinitionTabFieldNameError(AdminResources.AddFieldDialog_FieldNameCreated);
                this._setExistingFieldCombo(name);
                return false;
            }
        }

        if (!TFS_Admin_Common.AdminUIHelper.isNameValid(trimmedVal)) {
            this._updateDefinitionTabFieldNameError(AdminResources.IllegalCharacters);
            return false;
        }

        if (onlyNumeric.test(trimmedVal)) {
            this._updateDefinitionTabFieldNameError(AdminResources.FieldNameCannotContainOnlyNumbers);
            return false;
        }


        this._updateDefinitionTabFieldNameError("");
        return true;
    }

    private _validateFieldTypeCombo(): boolean {
        let trimmedVal = TFS_Admin_Common.trim(this._fieldTypeCombo.getText());
        if (trimmedVal.length === 0) {
            this._updateDefinitionTabFieldTypeError(AdminResources.AddFieldDialog_TypeRequired);
            return false;
        }

        if (this._types.indexOf(trimmedVal) == -1) {
            this._updateDefinitionTabFieldTypeError(Utils_String.format(AdminResources.AddFieldDialog_NewFieldTypeInvalid, trimmedVal));
            return false;
        }
        this._updateDefinitionTabFieldTypeError("");
        return true;
    }

    public _validateExistingFieldCombo(val: string, availableFields: { [name: string]: ProcessContracts.FieldModel }): boolean {
        let trimmedVal = TFS_Admin_Common.trim(val);
        if (trimmedVal.length === 0) {
            this._updateDefinitionTabExistingFieldError(AdminResources.AddFieldDialog_NameRequired);
            return false;
        }
        else if (!availableFields[trimmedVal]) {
            this._updateDefinitionTabExistingFieldError(Utils_String.format(AdminResources.AddFieldDialog_ExistingFieldNameInvalid, trimmedVal));
            return false;
        }
        this._updateDefinitionTabExistingFieldError("");
        return true;
    }

    public static _validateFieldLabel(val: string): string {
        let trimmedVal = TFS_Admin_Common.trim(val);
        if (trimmedVal.length === 0) {
            return AdminResources.LabelRequired;
        }

        if (!TFS_Admin_Common.AdminUIHelper.isControlLabelValid(trimmedVal)) {
            return AdminResources.LabelIllegalCharacters;
        }

        return null;
    }

    public static _validateGroupName(name: string,
        usedGroups: string[]): string {
        let trimmedVal = TFS_Admin_Common.trim(name);

        if (trimmedVal.length === 0) {
            return AdminResources.GroupNameRequired;
        }

        if ($.isArray(usedGroups) && Utils_Array.contains(usedGroups, trimmedVal, Utils_String.ignoreCaseComparer)) {
            return AdminResources.GroupNameAlreadyAdded;
        }

        if (!TFS_Admin_Common.AdminUIHelper.isGroupNameValid(trimmedVal)) {
            return AdminResources.GroupIllegalCharacters;
        }

        return null;
    }

    public static _validateFieldDefaultValue(value: string, fieldType: ProcessContracts.FieldType, source?: string[]): string {
        let trimmedValue = TFS_Admin_Common.trim(value);
        if (trimmedValue) {
            let convertedValue;
            if (fieldType === ProcessContracts.FieldType.Double) {
                convertedValue = Utils_Number.parseLocale(trimmedValue);
                if ((typeof convertedValue === "undefined") || isNaN(convertedValue) || !isFinite(convertedValue)) {
                    return AdminResources.AddFieldDialog_InvalidDecimalValue;
                }
            } else if (fieldType === ProcessContracts.FieldType.Integer) {
                if (/^[\-+]?\d+$/.test(trimmedValue)) {
                    convertedValue = Utils_Number.parseLocale(trimmedValue);
                }
                if (!TFS_Admin_Common.isInt32Range(convertedValue)) {
                    return AdminResources.AddFieldDialog_InvalidIntegerValue;
                }
            } else if (fieldType === ProcessContracts.FieldType.DateTime) {
                convertedValue = Utils_Date.parseDateString(trimmedValue);
                if (convertedValue === null || isNaN(convertedValue)) {
                    return AdminResources.AddFieldDialog_InvalidDateValue;
                }
            }
            if (source && source.indexOf(trimmedValue) < 0) {
                return Utils_String.format(AdminResources.AddFieldDialog_InvalidPicklistDefaultValue, trimmedValue);
            }
        }

        return null;
    }

    public static _validateFieldGroup(val: string): string {
        let trimmedValue = TFS_Admin_Common.trim(val);
        if (trimmedValue.length === 0) {
            return AdminResources.AddFieldDialog_GroupRequired;
        }
        return null;
    }

    public static _validatePage(val: string): string {
        let trimmedValue = TFS_Admin_Common.trim(val);
        if (trimmedValue.length === 0) {
            return AdminResources.AddGroupDialog_PageRequired;
        }
        return null;
    }

    private static DEFINITION_TAB_ERRORID: string = "definition-tab-error";
    private static LAYOUT_TAB_ERRORID: string = "layout-tab-error";
    private static OPTIONS_TAB_ERRORID: string = "options-tab-error";

    /*
     * The size of picklist-enabled content area
    */
    private static _picklistViewHeight: number = 680;

    // Options
    protected _workItemType: ProcessContracts.ProcessWorkItemType;
    protected _processId: string;
    protected _processName: string;
    private _processRefName: string;
    protected _refresh: (pageId?: string, groupId?: string, fieldId?: string) => void;
    protected _tfsContext: TFS_Host_TfsContext.TfsContext;
    protected _groupNames: string[] = [];
    private _groupIds: string[] = [];
    protected _allProcessFields: AdminProcessContracts.ProcessDefinitionFieldUsageData;
    protected static _processFieldHelper: AdminProcessCommon.ProcessFieldHelper = new AdminProcessCommon.ProcessFieldHelper();
    protected _selectedPage: ProcessContracts.Page;
    protected _selectedSectionId: string;
    private _pages: ProcessContracts.Page[];

    // From rest
    private _availableFields: { [name: string]: AdminDialogFieldContracts.Field };

    // Dialog Layout elements
    private _tabContainerElement: JQuery;
    private _tabContents: JQuery;
    protected _fieldDefinitionLayout: JQuery;
    protected _fieldLayoutLayout: JQuery;
    protected _fieldOptionsLayout: JQuery;
    protected _errorPanel: ControlsNotifications.MessageAreaControl;
    private _definitionTabFieldNameError: JQuery;
    private _layoutTabFieldNameError: JQuery;
    private _layoutTabPageNameError: JQuery;
    private _layoutTabExistingGroupError: JQuery;
    private _layoutTabGroupNameError: JQuery;
    private _definitionTabExistingFieldError: JQuery;
    private _definitionTabFieldTypeError: JQuery;
    private _optionsTabDefaultValueError: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;

    // Input elements
    private _fieldNameInput: JQuery;
    protected _fieldTypeCombo: OpenDropDownOnFocusCombo;
    private _existingFieldCombo: OpenDropDownOnFocusCombo;
    private _fieldVisibleCheckbox: JQuery;
    private _fieldVisibleLabel: JQuery;
    private _fieldLabelInput: JQuery;
    private _fieldGroupCombo: OpenDropDownOnFocusCombo;
    protected _fieldDescriptionInput: JQuery;
    protected _defaultFieldValueCombo: OpenDropDownOnFocusCombo;
    protected _defaultIdentityValue: IdentityPickerSearchControl;
    protected _requiredFieldCheckbox: JQuery;
    protected _isSuggestedValueCheckbox: JQuery;
    private _isSuggestedOptionContainer: JQuery;
    protected _allowGroupsCheckbox: JQuery;
    private _allowGroupsOptionContainer: JQuery;
    protected _currentDateTimeCheckbox: JQuery;
    private _currentDateTimeOptionContainer: JQuery;
    protected _currentUserOption: JQuery;
    protected _defaultUserOption: JQuery;
    private _identityDefaultsRadioContainer: JQuery;
    protected _pageCombo: OpenDropDownOnFocusCombo;
    protected _groupNameInput: JQuery;

    // internal data
    protected _fieldData: AdminDialogFieldContracts.FieldData;
    protected _picklist: ProcessContracts.PickList;
    protected _types: string[];
    protected _tabsContainer: AddFieldControls.AddEditFieldDialogTabs;
    protected _definitionTab: AdminDialogFieldContracts.AddEditFieldDialogTabItem;
    protected _optionsTab: AdminDialogFieldContracts.AddEditFieldDialogTabItem;
    protected _layoutTab: AdminDialogFieldContracts.AddEditFieldDialogTabItem;

    protected _hasAnyChanges: boolean;
    protected _isExistingGroup: boolean;
    private _isFieldLabelChangedByUser: boolean;
    private _isGroupNameChangedByUser: boolean;
    protected _isEmptyPage: boolean;

    private static MAX_FIELD_LEN = 128;
    private static MAX_REFNAME_LEN = 260;

    public initializeOptions(options?: AdminDialogFieldContracts.AddFieldDialogOptions): void {
        super.initializeOptions($.extend({
            dialogClass: "add-edit-field-dialog",
            buttons: {
                "ok": {
                    id: "ok",
                    text: AdminResources.AddField,
                    click: (target: any) => {
                        if (target.target.id === "new-item-text") { // Do nothing if target is a picklist input field
                            return;
                        }
                        this.onOkClick();
                    }
                },
                "close": {
                    id: "close",
                    text: AdminResources.Cancel,
                    click: () => { this.onClose(); }
                }
            },
            height: AddFieldDialog._picklistViewHeight,
            minHeight: AddFieldDialog._picklistViewHeight,
            minWidth: 650,
            title: Utils_String.format(AdminResources.AddAFieldTo, options.workItemType.name),
            resizable: false
        }, options));

        this._initializeTypes();
    }

    public initialize(): void {
        super.initialize();
        this.initializeData();

        const tabItems = this.initializeTabs();
        this._definitionTab = tabItems[0];
        this._optionsTab = tabItems[1];
        this._layoutTab = tabItems[2];

        const contents = $("<div>").addClass("contents");
        this._tabsContainer = <AddFieldControls.AddEditFieldDialogTabs>Controls.BaseControl.createIn(AddFieldControls.AddEditFieldDialogTabs, contents, { source: tabItems });
        this._tabContainerElement = this._tabsContainer._element;
        this._tabContents = $("<div>").addClass("tab-contents");
        this._errorPanel = <ControlsNotifications.MessageAreaControl>Controls.BaseControl.createIn(ControlsNotifications.MessageAreaControl, this._tabContents);

        this._fieldDefinitionLayout = this._definitionTab.contents;
        this._fieldOptionsLayout = this._optionsTab.contents;
        this._fieldLayoutLayout = this._layoutTab.contents;

        this._tabContents.append(this._fieldDefinitionLayout);
        this._tabContents.append(this._fieldOptionsLayout);
        this._tabContents.append(this._fieldLayoutLayout);

        this._populateFieldDefinitionTab();
        this._populateFieldLayoutTab();
        this._populateFieldOptionsTab();

        contents.append(this._tabContents);
        this._$contentContainerElement.append(contents);

        this._addHelpText();

        // always focus on layout if it is called from layout view
        if (!this._options.hideLayoutTab && this._options.focusLayoutTab) {
            this._tabsContainer.selectItem(this._layoutTab);
        } else {
            this._tabsContainer.selectItem(this._definitionTab);
        }

        this._setInitialValues();

        // This should be only called if the add field called from layout page, since available fields are already populated 
        if (this._options.showRemovedLayoutFields) {
            this._initializeFieldDefinitionControls();
        }

        this._setupTabOrder();
        this._hasAnyChanges = false;
        this.updateOkButton(false);
    }

    protected _addHelpText(): void {
        AdminControlFactory.createLearnMoreLinkBlock(this._fieldDefinitionLayout, AdminResources.LearnAddFieldLink, AdminResources.LearnAddFieldLinkTitle);
    }

    /** Returns true if form values of a is equal to form values of b */
    private _fieldDataEquals(a: AdminDialogFieldContracts.FieldData, b: AdminDialogFieldContracts.FieldData): boolean {
        return a.default && b.default &&
            a.default.Value === b.default.Value &&
            a.default.Vsid === a.default.Vsid &&
            a.description === b.description &&
            a.groupName === b.groupName &&
            a.label === b.label &&
            a.name === b.name &&
            a.type === b.type &&
            a.required === b.required &&
            a.isVisibleOnForm === b.isVisibleOnForm;
    }

    public onOkClick() {
        this._addField();
    }

    public beforeClose() {
        if (!this._hasAnyChanges) {
            return true;
        }
        return confirm(AdminResources.UnsavedChangesPrompt);
    };

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

    public disableLayoutGroup(): void {
        this._fieldGroupCombo.getInput().attr("disabled", "disabled");
        this._fieldGroupCombo.setEnabled(false);
        this._pageCombo.getInput().attr("disabled", "disabled");
        this._pageCombo.setEnabled(false);
        $("input[name=" + WorkItemLayoutCommon.GroupSectionConstants.RADIO_BUTTON_NAME + "]", this._fieldLayoutLayout).prop("disabled", true);
        $("input[name=groupRadio]", this._fieldLayoutLayout).prop("disabled", true);
        this._groupNameInput.attr("disabled", "disabled");
    }

    public enableLayoutGroup(): void {
        this._fieldGroupCombo.setEnabled(true);
        this._fieldGroupCombo.getInput().removeAttr("disabled");
        this._pageCombo.setEnabled(true);
        this._pageCombo.getInput().removeAttr("disabled");
        $("input[name=" + WorkItemLayoutCommon.GroupSectionConstants.RADIO_BUTTON_NAME + "]", this._fieldLayoutLayout).prop("disabled", false);
        $("input[name=groupRadio]", this._fieldLayoutLayout).prop("disabled", false);
        this._groupNameInput.removeAttr("disabled");
    }

    public hideLayoutShowFieldInForm(): void {
        // Disable for all scenarios except for editing the inherited field
        this._fieldVisibleCheckbox.hide();
        this._fieldVisibleLabel.hide();
    }

    protected initializeData(avoidHtmlGroups: boolean = true): void {
        this._allProcessFields = this._options.allProcessFields;
        this._availableFields = {};
        this._tfsContext = this._options.tfsContext;
        this._processId = this._options.processId;
        this._processName = this._options.processName;
        this._processRefName = this._options.processRefName;
        this._workItemType = this._options.workItemType;
        this._refresh = this._options.refresh;
        // If its a new control added from fields page, getting the first page
        this._selectedPage = this._options.page ? this._options.page : this._workItemType.layout.pages[0];
        this._isEmptyPage = AdminProcessCommon.ProcessLayoutHelpers.isEmptyPage(this._selectedPage, avoidHtmlGroups);
        this._selectedSectionId = this._options.sectionId ? this._options.sectionId : WorkItemLayoutCommon.GroupSectionConstants.SECTIONS[0].id;
        this._isExistingGroup = !this._isEmptyPage && !this._options.disablePageAndSectionSelection;
        this._fieldData = {
            name: "",
            type: null,
            description: "",
            label: "",
            groupId: "",
            groupName: "",
            existing: true,
            required: false,
            default: {
                Value: "",
                Vsid: ""
            },
            isVisibleOnForm: true,
            pickListId: null
        };
    }

    protected initializeTabs(): AdminDialogFieldContracts.AddEditFieldDialogTabItem[] {
        return [
            {
                id: "definition",
                errorId: AddFieldDialog.DEFINITION_TAB_ERRORID,
                label: AdminResources.DefineField,
                controls: "field-definition-page",
                callback: () => {
                    this._showFieldDefinitionTab();
                },
                visible: true,
                contents: createDefinitionLayout()
            },
            {
                id: "options",
                errorId: AddFieldDialog.OPTIONS_TAB_ERRORID,
                label: AdminResources.Options,
                controls: "field-options-page",
                callback: () => {
                    this._showFieldOptionsTab();
                },
                visible: this._showOptions(),
                contents: createOptionsLayout()
            },
            {
                id: "layout",
                errorId: AddFieldDialog.LAYOUT_TAB_ERRORID,
                label: AdminResources.Layout,
                controls: "field-layout-page",
                callback: () => {
                    this._showFieldLayoutTab();
                },
                visible: !this._options.hideLayoutTab,
                contents: createLayoutLayout()
            }
        ];
    }

    protected canEditFieldProperties(): boolean {
        if (this._fieldData.existing && this._fieldData.existingField && this._fieldData.existingField.id) {
            const fieldId: string = this._fieldData.existingField.id;
            if (AddFieldDialog._processFieldHelper.isCoreField(fieldId)) {
                // Hide options for system.* fields that aren't Title, AssignedTo, or Description
                return Utils_String.localeIgnoreCaseComparer(fieldId, 'System.Title') === 0
                    || Utils_String.localeIgnoreCaseComparer(fieldId, 'System.AssignedTo') === 0
                    || Utils_String.localeIgnoreCaseComparer(fieldId, 'System.Description') === 0;
            }

            if (this._workItemType) {
                const processField: AdminProcessContracts.ProcessField = this._getProcessField(fieldId);
                return processField && AddFieldDialog._processFieldHelper.canEditFieldProperties(processField, this._workItemType);
            }
        }

        return false;
    }

    private _showOptions(): boolean {
        return this.canEditFieldProperties() || this._fieldData.id == null || AddFieldDialog._processFieldHelper.isCustomField(this._fieldData.id);
    }

    protected editFieldDefinitionEnabled(): boolean {
        return true;
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
    protected validateAndUpdateFieldDefinitionUI(): boolean {
        const useExistingField: boolean = this._isUseExistingFieldChecked();

        if (useExistingField) {
            return this._validateExistingFieldCombo(this._existingFieldCombo.getText(), this._availableFields);
        }

        return this._validateFieldDefinition(this._fieldNameInput.val(), this._allProcessFields, this._availableFields)
            && this._validateFieldTypeCombo();
    }

    private _isUseExistingFieldChecked(): boolean {
        return $("input:radio[name=existing]:checked", this._fieldDefinitionLayout).val() === "true";
    }

    protected validateAndUpdateFieldLayoutUI(): boolean {
        const msg: string = AddFieldDialog._validateFieldLabel(this._fieldLabelInput.val());
        const msgGroup: string = this._fieldData.type != ProcessContracts.FieldType.Html &&
            this._isExistingGroup ? AddFieldDialog._validateFieldGroup(this._fieldGroupCombo.getText()) : null;
        const msgPage: string = AddFieldDialog._validatePage(this._pageCombo.getText());
        const msgGroupName: string = this._isExistingGroup ? null : AddFieldDialog._validateGroupName(this._groupNameInput.val(), this._getGroups());

        if (this._fieldData.isVisibleOnForm) {
            this._updateLayoutTabFieldNameError(msg == null ? "" : msg);

            this._updateLayoutTabPageError(msgPage == null ? "" : msgPage);
            this._updateLayoutTabExistingGroupError(msgGroup == null ? "" : msgGroup);
            this._updateLayoutTabGroupNameError(msgGroupName == null ? "" : msgGroupName);
        } else {
            this._updateLayoutTabFieldNameError("");

            this._updateLayoutTabPageError("");
            this._updateLayoutTabExistingGroupError("");
            this._updateLayoutTabGroupNameError("");
        }

        return (!msg && !msgGroup && !msgPage && !msgGroupName)
            || !this._fieldData.isVisibleOnForm;
    }

    protected validateAndUpdateFieldOptionsUI(source: string[] = null): boolean {
        let msg: string;
        if (this._fieldData.type === ProcessContracts.FieldType.Identity) {
            if (this._defaultIdentityValue.getIdentitySearchResult().resolvedEntities.length === 0
                && !this._currentUserOption.prop("checked")
                && this._defaultIdentityValue.getInputText() !== "") {
                msg = AdminResources.AddFieldDialog_IdentityNotFound;
            }
        } else {
            // Make sure we have the values we need to validate default value
            if (!source) {
                if (this._fieldDataIsPicklist()) {
                    source = this._picklistCtrl && this._picklistCtrl.getPicklistElements();
                }
                else {
                    const processField: AdminProcessContracts.ProcessField = this._fieldData.existing && this._fieldData.id ? this._getProcessField(this._fieldData.id) : this._getProcessField(this._fieldData.name);
                    if (processField && AddFieldDialog._processFieldHelper.isOOBPicklist(processField, this._workItemType)) {
                        source = AddFieldDialog._processFieldHelper.getAllowedValues(processField, this._workItemType);
                    }
                }
                if (!source || source.length === 0) {
                    // fall back on getting values from the combo itself
                    source = this._getValuesFromDefaultFieldValueCombo();
                }
            }

            msg = AddFieldDialog._validateFieldDefaultValue(this._defaultFieldValueCombo.getText(), this._fieldData.type, source);
        }

        if (msg) {
            this._updateOptionsTabDefaultValueError(msg);
            return false;
        } else {
            this._updateOptionsTabDefaultValueError("");
            return true;
        }
    }

    protected validatePicklist(): boolean {
        let values = this._picklistCtrl.getPicklistElements();

        if (!this._fieldData.existing && values.length === 0) {
            this._picklistCtrl.setValidationMessage(AdminResources.PicklistAtLeastOneRequired);
            return false;
        }

        // When editing picklists, we allow empty picklists to be saved, only when the field is not Required or is a suggested value.
        // We only require newly-created picklists from the UI to be non-empty.
        let isSuggestedValue = this._isSuggestedValueCheckbox && this._isSuggestedValueCheckbox.prop("checked");

        if (this._fieldData.existing && this._fieldData.required && !isSuggestedValue && values.length === 0) {
            this._picklistCtrl.setValidationMessage(AdminResources.PicklistAtLeastOneRequired);
            return false;
        }

        if (this._picklistCtrl.getUnsavedPicklistItem() !== "") {
            this._picklistCtrl.setValidationMessage(AdminResources.PicklistItemNotAdded);
            return false;
        }

        this._picklistCtrl.setValidationMessage("");
        return true;
    }

    /* 
    * Tab behavior functions
    */
    protected _showFieldDefinitionTab(): void {
        if (this._fieldDefinitionLayout) {
            this._fieldDefinitionLayout.show();
            this._fieldLayoutLayout.hide();
            this._fieldOptionsLayout.hide();

            const isExisting = $("input:radio[name=existing]", this._fieldDefinitionLayout).prop("checked");
            if (isExisting) {
                const focusableFields = $("input:visible:not([readonly]):not([disabled]), textarea:visible:not([disabled])", this._fieldDefinitionLayout.find(".existing-field-section"));

                if (focusableFields && focusableFields.length > 1) {
                    this._existingFieldCombo.disablePopupOnFocus();
                    focusableFields[1].focus();
                    this._existingFieldCombo.enablePopupOnFocus();
                }
            } else {
                const focusableFields = $("input:visible:not([readonly]):not([disabled]), textarea:visible:not([disabled])", this._fieldDefinitionLayout.find(".new-field-section"));

                if (focusableFields && focusableFields.length > 1) {
                    focusableFields[1].focus();
                }
            }

        }
    }

    protected _showFieldLayoutTab(): void {
        if (this._fieldDefinitionLayout) {
            this._fieldDefinitionLayout.hide();
        }
        this._fieldLayoutLayout.show();
        this._fieldOptionsLayout.hide();

        if (this._fieldData.type === ProcessContracts.FieldType.Html) {
            this._fieldLayoutLayout.find(".control-group-container").hide();
            if (this._options.disablePageAndSectionSelection) {
                // if page and section selection is disabled, then dont show section picker
                this._fieldLayoutLayout.find(".section-info-container").hide();
            } else {
                this._fieldLayoutLayout.find(".section-info-container").show();
            }
        } else {
            this._fieldLayoutLayout.find(".control-group-container").show();
            this._fieldLayoutLayout.find(".section-info-container").hide();
        }
        this._fieldLabelInput.focus();

        // if page and section selection is disabled, then disable page combo and only allow creating a new group
        if (this._options.disablePageAndSectionSelection) {
            this._pageCombo.setEnabled(false);
            if (this._fieldData.type !== ProcessContracts.FieldType.Html) {
                this._refreshGroupOptions(false);
            }
        }
    }

    protected _showFieldOptionsTab(): void {
        if (this._fieldDefinitionLayout) {
            this._fieldDefinitionLayout.hide();
        }
        this._fieldLayoutLayout.hide();
        this._identityDefaultsRadioContainer.hide();

        if (this._fieldData.type === ProcessContracts.FieldType.Boolean) {
            this._defaultFieldValueCombo.hideElement();
            this._getDefaultFieldBooleanRadio().show();

            // We've decided to hide the default option for the boolean type
            // since it introduces a lot of missunderstandings with queries
            // Please see 578124 for details
            // Comment the following line to reenable bool default options
            this._getDefaultValueOptionBlock().hide();
        } else if (this._fieldData.type === ProcessContracts.FieldType.Identity) {
            this._getDefaultValueOptionBlock().show();
            this._getDefaultFieldBooleanRadio().hide();

            this._defaultFieldValueCombo.hideElement();
            this._identityDefaultsRadioContainer.show();
        } else {
            this._defaultFieldValueCombo.showElement();
            this._getDefaultFieldBooleanRadio().hide();
            this._getDefaultValueOptionBlock().show();
        }

        this._fieldOptionsLayout.show();

        const focusableFields = $("input:visible:not([readonly]):not([disabled]), textarea:visible:not([disabled])", this._fieldOptionsLayout);

        if (focusableFields && focusableFields.length > 0) {
            this._defaultFieldValueCombo.disablePopupOnFocus();
            focusableFields[0].focus();
            if (this._fieldDataIsPicklist()) {
                this._defaultFieldValueCombo.enablePopupOnFocus();
            }
        }
    }

    protected _initializeTypes(): void {
        // doing full copy of array to be able to modify set of type (for example disabling the picklist types)
        const types: string[] = AdminProcessCommon.ProcessFieldContracts.FieldTypeLabels.slice(0);
        this._types = types;
    }

    protected _setInitialValues(): void {
        // Set initial values for page combo
        this._pageCombo.setEnabled(true);
        this._pageCombo.setText(this._selectedPage.label, false);
        this._pageCombo.getInput().removeAttr("disabled");

        if (!this._isEmptyPage && !this._options.disablePageAndSectionSelection) {
            if (this._fieldData.groupName) {
                this._fieldGroupCombo.setText(this._fieldData.groupName, false);
            } else {
                this._setGroupCombo();
            }
        }

        this._fieldLabelInput.removeAttr("disabled");
        this._fieldLabelInput.val(this._fieldData.label);

        this._fieldNameInput.val(this._fieldData.name);
        const fieldTypeLabel = AddFieldDialog._processFieldHelper.getFieldTypeLabelFromFieldData(this._fieldData);
        this._fieldTypeCombo.setText(fieldTypeLabel);
        this._fieldDescriptionInput.val(this._fieldData.description);
        this._fieldVisibleCheckbox.prop("checked", this._fieldData.isVisibleOnForm);

        this._updateOptionsTab();
    }

    private _updateOptionsTab(): void {
        this._updateDefaultFieldValueCombo(this._getTypeFromFieldData(this._fieldData));

        const processField: AdminProcessContracts.ProcessField = this._fieldData.existing && this._fieldData.id ? this._getProcessField(this._fieldData.id) : this._getProcessField(this._fieldData.name);
        if (processField && AddFieldDialog._processFieldHelper.isOOBPicklist(processField, this._workItemType)) {
            let allowedValues: string[] = AddFieldDialog._processFieldHelper.getAllowedValues(processField, this._workItemType);

            if (allowedValues) {
                this._populateDefaultComboForPicklist(allowedValues);
            }
        }

        // Setup IsRequired Checkbox
        this._requiredFieldCheckbox.prop("checked", this._fieldData.required);
        if (this._fieldData.existing && this._fieldData.id) {
            if (Utils_String.localeIgnoreCaseComparer(this._fieldData.id, 'System.Title') === 0) {
                // Title field is special because we allow editing default, but not required
                this._requiredFieldCheckbox.prop("checked", true);
                this._requiredFieldCheckbox.prop("disabled", true);
            }
            // For all other non-custom fields, don't allow users to uncheck required if the feature is not enabled
            else if (processField && AddFieldDialog._processFieldHelper.getIsRequiredInParent(processField, this._workItemType)) {
                this._requiredFieldCheckbox.prop("disabled", true);
            }
        }

        if (this._fieldData.existing && this._fieldData.pickListId && this._fieldData.pickListId !== Utils_String.EmptyGuidString) {
            this._isSuggestedOptionContainer.show();

            Utils.getProcessClient().getList(this._fieldData.pickListId)
                .then((data) => {

                    if (this._isSuggestedValueCheckbox) {
                        this._isSuggestedValueCheckbox.prop("checked", data.isSuggested);
                    }

                    // Populate default value first, as _populateDefaultComboForPicklist will validate the value 
                    const defaultValue = this._fieldData.default.Value || "";
                    this._defaultFieldValueCombo.setText(defaultValue);

                    this._populateDefaultComboForPicklist($.map(data.items, function (i) { return i; }));
                });

        } else {
            this._isSuggestedOptionContainer.hide();
            this._identityDefaultsRadioContainer.hide();
            this._allowGroupsOptionContainer.hide();
            this._defaultIdentityValue.enableReadOnlyMode();

            const defaultStringValue: string = this._fieldData.default && this._fieldData.default.Value;

            if (this._fieldData.type === ProcessContracts.FieldType.Boolean) {
                // boolean fields must be required (either true or false, never null)
                this._requiredFieldCheckbox.prop("checked", true);
                this._requiredFieldCheckbox.prop("disabled", true);
                // Boolean default value is a radio button
                if (defaultStringValue === "1" || defaultStringValue.toUpperCase() === "TRUE") {
                    this._getDefaultFieldBooleanRadioTrueButton().prop("checked", true);
                } else {
                    this._getDefaultFieldBooleanRadioFalseButton().prop("checked", true);
                }
            } else if (this._fieldData.type === ProcessContracts.FieldType.DateTime) {
                this._currentDateTimeOptionContainer.show();

                if (defaultStringValue === AdminResources.DateTimeDefaultFromClockToken) {
                    this._currentDateTimeCheckbox.prop("checked", true);
                    this._defaultFieldValueCombo.setEnabled(false);
                } else {
                    this._currentDateTimeCheckbox.prop("checked", false);
                    this._defaultFieldValueCombo.setEnabled(true);
                    this._defaultFieldValueCombo.setText(defaultStringValue, false);
                }
            } else if (this._fieldData.type === ProcessContracts.FieldType.Identity) {
                this._identityDefaultsRadioContainer.show();

                if (AddFieldDialog._processFieldHelper.isCustomField(this._fieldData.id)) {
                    // Only show the allow groups option for custom fields
                    this._allowGroupsOptionContainer.show();
                }

                this._allowGroupsCheckbox.prop("checked", this._fieldData.allowGroups);
                this._updateAllowGroups(this._fieldData.allowGroups);

                if (defaultStringValue === "$currentUser") {
                    this._currentUserOption.attr("checked", "");
                } else if (defaultStringValue) {
                    this._defaultUserOption.prop("checked", true);
                    this._defaultIdentityValue.disableReadOnlyMode();
                    this.setIdPicker(this._fieldData.default);
                }
            } else {
                this._defaultFieldValueCombo.setEnabled(true);
                this._currentDateTimeOptionContainer.hide();
                this._defaultFieldValueCombo.setText(defaultStringValue, false);
            }
        }
    }

    private setIdPicker(_default: AdminProcessContracts.IDefault): void {
        if (_default.Value) {
            const entity = WITIdentityHelpers.parseUniquefiedIdentityName(_default.Value);
            const entityIdentifier = WITIdentityHelpers.getEntityIdentifier(entity);

            // clear the value before setting a new value to avoid any inconsistent data in the control
            this._defaultIdentityValue.clear();

            if (entityIdentifier) {
                this._defaultIdentityValue.setEntities([], [entityIdentifier]);
            }
            else {
                // If the value is a non identity string - we cant ask the control to resolve it
                // So we pass the value as a dummy string entity object
                entity.localId = _default.Vsid;
                this._defaultIdentityValue.setEntities([entity], []);
            }
        }
    }

    private _setGroupCombo(): void {
        const group = this._getDefaultGroup(this._selectedPage.id, this._options.groupId);

        if (group) {
            this._fieldGroupCombo.setText(group.label);
        } else {
            const groups = this._getGroups();

            if (groups && groups.length > 0) {
                this._fieldGroupCombo.setSelectedIndex(0, false);
            } else {
                this._fieldGroupCombo.setText("");
            }
        }
    }

    private _getValuesFromDefaultFieldValueCombo(): string[] {
        if (this._defaultFieldValueCombo) {
            let behavior: Combos.BaseComboBehavior = this._defaultFieldValueCombo.getBehavior();
            if (behavior) {
                let dataSource: Controls.BaseDataSource = behavior.getDataSource();
                if (dataSource) {
                    let items: string[] = dataSource.getItems();
                    if (items) {
                        if (items.length > 0) {
                            return items;
                        }
                    }
                }
            }
        }
        return null;
    }

    /* 
    * Populate contents functions
    */
    protected _populateFieldDefinitionTab(): void {

        this._fieldNameInput = $(".new-field-name", this._fieldDefinitionLayout);

        // Set the max length.  Normally this is 128, but the total reference name of the field must be less than 
        // 260 characters or it isn"t addressable in REST APIs, so the length of the field name + the length of the 
        // process reference name cannot exceed 260.
        let maxLength = AddFieldDialog.MAX_FIELD_LEN;
        if (this._processRefName) {
            // When the refname is constructed it conatenates the process refname + "." to the name provided.
            maxLength = Math.min(maxLength, AddFieldDialog.MAX_REFNAME_LEN - (this._processRefName.length + 1));
        }

        this._fieldNameInput.attr("maxlength", maxLength);

        this._definitionTabFieldNameError = $(".new-field-name-error-message", this._fieldDefinitionLayout);
        this._definitionTabExistingFieldError = $(".existing-field-name-error-message", this._fieldDefinitionLayout);
        this._definitionTabFieldTypeError = $(".field-type-combo-error-message", this._fieldDefinitionLayout);

        this._fieldDescriptionInput = $(".field-description", this._fieldDefinitionLayout);
        Utils_UI.Watermark(this._fieldDescriptionInput, { watermarkText: AdminResources.AddFieldDescriptionWatermark });

        this._fieldTypeCombo = <OpenDropDownOnFocusCombo>Controls.BaseControl.createIn(OpenDropDownOnFocusCombo, $(".field-type-combo-container", this._fieldDefinitionLayout), {
            allowEdit: true,
            width: 316,
            change: delegate(this, this._onFieldTypeChange),
            setTitleOnlyOnOverflow: true,
            disableOpenOnKeyboardFocus: true,
            dropOptions: {
                maxRowCount: 12
            },
        } as Combos.IComboOptions);

        $("#field-type-label", this._fieldDefinitionLayout).attr("for", this._fieldTypeCombo.getInput().uniqueId().attr("id"));

        let changeTimeout: Utils_Core.DelayedFunction = null;

        if (this.editFieldDefinitionEnabled()) {
            this.showLoading();

            this._existingFieldCombo = <OpenDropDownOnFocusCombo>Controls.BaseControl.createIn(OpenDropDownOnFocusCombo, $(".existing-field-combo-container", this._fieldDefinitionLayout), {
                width: 316,
                allowEdit: true,
                change: () => {
                    if (changeTimeout) {
                        changeTimeout.reset();
                        return false;
                    }
                    changeTimeout = Utils_Core.delay(this, 200, () => {
                        this._onExistingFieldChange();
                    });
                },
                setTitleOnlyOnOverflow: true,
                disableOpenOnKeyboardFocus: true
            });

            this._existingFieldCombo.getInput().attr("aria-labelledby", "existing-field-label");
            
            // on pressing enter we need to save this field in the UI see bug 1298952
            // generally on dropdown input elements, browsers do not do auto-submit on pressing enter
            // add an explicit event to handle this situation where a user types enter and we save it
            this._existingFieldCombo.getInput().bind("keydown", (e) => {
                if(e.keyCode == KeyCode.ENTER){
                    this.onOkClick();
                    e.preventDefault();
                }          
            });

            this._populateExistingField(this._options.showRemovedLayoutFields);

        } else {
            // In edit field dialog, only description input is enabled and we need to attach event callbacks
            this._fieldDescriptionInput.bind("change keyup", () => {
                this._updateFieldData();
                this._validate();
            });
            this._fieldTypeCombo.setEnabled(false);
            this._fieldTypeCombo.getInput().attr("aria-labelledby", "field-type-label");
        }
    }

    // Populates existing field combo. 
    // If showRemovedLayoutFields is on, which will be on if fields are created from layout page
    // then including the fields that are removed from the layout but exist in the workitemtype
    // otherwise fields that are unreferenced will be populated
    protected _populateExistingField(showRemovedLayoutFields: boolean): void {

        const allProcessFields: AdminDialogFieldContracts.Field[] = $.map(this._allProcessFields.Fields, (processField: AdminProcessContracts.ProcessField, index) => {
            let pickList: ProcessContracts.PickListMetadata = null;

            if (processField.PickListId) {
                pickList = {
                    id: processField.PickListId,
                    isSuggested: false,
                    name: null,
                    type: processField.Type,
                    url: null
                };
            }

            return {
                id: processField.Id,
                description: processField.Description,
                type: ProcessContracts.FieldType[processField.Type],
                name: processField.Name,
                pickList: pickList,
                isIdentity: ProcessContracts.FieldType[processField.Type] == ProcessContracts.FieldType.Identity,
                url: null
            };
        });

        if (showRemovedLayoutFields) {
            $.each(allProcessFields, (index, field) => {
                // If showRemovedLayoutFields is on, which will be on if fields are created from layout page
                // then including the fields that are removed from the layout but exist in the workitemtype
                if (!AddFieldDialog._processFieldHelper.isNonCustomizableField(field.id)) {
                    this._availableFields[field.name] = field;
                }
            });
        } else {
            Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient4_1).getWorkItemTypeFields(this._processId, this._workItemType.referenceName).then(
                (workItemTypeFields: ProcessContracts.FieldModel[]) => {
                    const workItemTypeFieldsMap: IDictionaryStringTo<ProcessContracts.FieldModel> = {};
                    workItemTypeFields.forEach((field) => {
                        workItemTypeFieldsMap[field.id] = field;
                    });
                    $.each(allProcessFields, (index, field) => {
                        if (!workItemTypeFieldsMap[field.id]) {
                            this._availableFields[field.name] = field;
                        }
                    });

                    this._initializeFieldDefinitionControls();
                }, (reason) => {
                    this.hideBusyOverlay();
                    this._errorPanel.setMessage(reason.message);
                });
        }
    }

    protected _getPages(): string[] {
        this._pages = AdminProcessCommon.ProcessLayoutHelpers.getPages(this._workItemType.layout, false);
        return this._pages.map((page) => { return page.label });
    }

    private _initializeFieldDefinitionControls(): void {
        this.hideBusyOverlay();
        const fieldNames = $.map(this._availableFields, (field: AdminDialogFieldContracts.Field, fieldName: string) => fieldName);
        const existingFieldsSource = fieldNames.sort((a: string, b: string) => {
            return Utils_String.localeIgnoreCaseComparer(a, b);
        });

        this._existingFieldCombo.setSource(existingFieldsSource);
        this._existingFieldCombo.setSelectedIndex(0, false);

        this._fieldNameInput.bind("change keyup", delegate(this, this._onFieldNameChange));
        this._fieldDescriptionInput.bind("change keyup", delegate(this, this._updateFieldData));

        const defaultTypesIndex: number = this._types.indexOf(AdminResources.String);

        this._fieldTypeCombo.setSource(this._types);

        this._fieldTypeCombo.setSelectedIndex(defaultTypesIndex, false);

        $("input:radio[name=existing]", this._fieldDefinitionLayout).change((e: JQueryEventObject) => {
            this._onUseExistingFieldChange(e.currentTarget["value"] === "true");
        });

        this._onUseExistingFieldChange(false);

        this._hasAnyChanges = false;
    }

    /**
     * Update the identity picker for the specified allowGroup value
     * @param allowGroups
     */
    private _updateAllowGroups(allowGroups: boolean): void {
        const placeholder = allowGroups ?
            Resources_Platform.IdentityPicker_PlaceholderTextUserGroup
            : Resources_Platform.IdentityPicker_PlaceholderTextUser;
        $("input", this._defaultIdentityValue.getElement()).attr("placeholder", placeholder).attr("aria-label", placeholder);
        if (!allowGroups) {
            const { resolvedEntities, unresolvedQueryTokens } = this._defaultIdentityValue.getIdentitySearchResult();
            const filteredEntities = resolvedEntities.filter(e =>
                Utils_String.equals(e.entityType, ServiceHelpers.UserEntity, true)
            );
            if (filteredEntities.length < resolvedEntities.length) {
                this._defaultIdentityValue.clear();
            }
        }
    }

    protected _populateFieldLayoutTab(): void {

        this._pageCombo = <OpenDropDownOnFocusCombo>Controls.BaseControl.createIn(OpenDropDownOnFocusCombo, $(".page-group", this._fieldLayoutLayout), {
            source: this._getPages(),
            allowEdit: false,
            maxAutoExpandDropWidth: 300,
            change: () => { this._updatePageFieldData(); },
            setTitleOnlyOnOverflow: true,
            disableOpenOnKeyboardFocus: true
        });
        $("#layout-page", this._fieldLayoutLayout).attr("for", this._pageCombo.getInput().uniqueId().attr("id"));

        this._populateGroups(this._selectedPage);

        this._fieldGroupCombo = <OpenDropDownOnFocusCombo>Controls.BaseControl.createIn(OpenDropDownOnFocusCombo, $(".field-group", this._fieldLayoutLayout), {
            source: this._getGroups(),
            allowEdit: false,
            maxAutoExpandDropWidth: 300,
            change: () => {
                this._updateFieldData();
                this._validate();
            },
            focus: () => {
                this._refreshGroupOptions(true);
            },
            setTitleOnlyOnOverflow: true,
            disableOpenOnKeyboardFocus: true
        });
        $("#layout-existing-group", this._fieldLayoutLayout).attr("for", this._fieldGroupCombo.getInput().uniqueId().attr("id"));

        Utils_UI.Watermark($("input", this._fieldGroupCombo.getElement()), { watermarkText: AdminResources.NoGroupForSelectedPage });

        this._layoutTabFieldNameError = $(".field-form-name-error-message", this._fieldLayoutLayout);

        this._layoutTabPageNameError = $(".field-form-page-error-message", this._fieldLayoutLayout);
        this._layoutTabExistingGroupError = $(".field-form-group-error-message", this._fieldLayoutLayout);
        this._layoutTabGroupNameError = $(".group-name-error-message", this._fieldLayoutLayout);

        this._fieldVisibleCheckbox = $(".is-field-visible", this._fieldLayoutLayout).bind("change", delegate(this, this._onFieldVisibleChange));
        this._fieldVisibleLabel = $(".is-field-visible-label", this._fieldLayoutLayout);

        this._fieldLabelInput = $(".field-form-name", this._fieldLayoutLayout).bind("change keyup", () => { this._onLayoutFieldLabelChange(); });
        this._groupNameInput = $(".group-name", this._fieldLayoutLayout).bind("change keyup", () => { this._onGroupNameChange(); }).focus(() => this._refreshGroupOptions(false));

        if (this._options.hideShowFieldInForm) {
            this.hideLayoutShowFieldInForm();
        }

        WorkItemLayoutCommon.GroupSectionConstants.SECTIONS.forEach((section) => {
            $("#" + section.id, this._fieldLayoutLayout).bind("change", () => this._updateSectionFieldData());
            $("#" + section.imageId, this._fieldLayoutLayout).bind("click", () => this._updateCheckedGroup(section.id));
        });

        if (this._isEmptyPage || this._options.disablePageAndSectionSelection) {
            this._refreshGroupOptions(false);
        } else {
            this._refreshGroupOptions(true);
        }

        $("input:radio[name=groupRadio]", this._fieldLayoutLayout).change((e: JQueryEventObject) => {
            this._onUseExistingGroupChange(e.currentTarget["value"] === "true");
        });

        this._updateSectionRadio(this._selectedSectionId);
    }

    private _createIdentityPicker() {
        const idOptions: IIdentityPickerSearchOptions = {
            size: IdentityPickerControlSize.Large,
            identityType: {
                User: true,
                Group: true,
            },
            showTemporaryDisplayName: true,
            highlightResolved: true,
            callbacks: {
                preDropdownRender: entities =>
                    entities.filter(
                        e => this._allowGroupsCheckbox.prop("checked") ||
                            Utils_String.equals(e.entityType, ServiceHelpers.UserEntity, true)
                    )
            },
            dropdownWidth: 364,
            consumerId: "7785ac51-ed2b-4e10-836a-2a63fbc83693"
        };
        const container = $(".identity-default-value .identity-default", this._fieldOptionsLayout);
        this._defaultIdentityValue = Controls.BaseControl.createIn(
            IdentityPickerSearchControl, container, idOptions) as IdentityPickerSearchControl;
        this._defaultIdentityValue._element.height(32);
        this._defaultIdentityValue._bind(IdentityPickerSearchControl.VALID_INPUT_EVENT, () => this._onDefaultIdentityValidValue());
        this._defaultIdentityValue._bind(IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, () => this._onDefaultIdentityValidValue());
        this._defaultIdentityValue._bind(IdentityPickerSearchControl.INVALID_INPUT_EVENT, () => this._onDefaultIdentityInvalidValue());
        $(".identity-picker-input", this._defaultIdentityValue._element).css({ width: "" }); // The default input width is wrong
        let defaultValueInput = $("input", this._defaultFieldValueCombo._element).attr("maxlength", 255).uniqueId();
        $("#field-default-value", this._fieldOptionsLayout).attr("for", defaultValueInput.attr("id"));
    }

    private _onDefaultIdentityValidValue(): void {
        const { resolvedEntities: ids } = this._defaultIdentityValue.getIdentitySearchResult();
        // only update field data if value has changed
        if (ids.length > 0 && Utils_String.equals(ids[0].localId, this._fieldData.default.Vsid, true)) {
            return;
        }

        this._onFieldRuleChange();
    }

    private _onDefaultIdentityInvalidValue(): void {
        this._validate();
    }

    protected _populateFieldOptionsTab(): void {
        this._defaultFieldValueCombo = Controls.BaseControl.createIn(OpenDropDownOnFocusCombo, $(".field-default-value", this._fieldOptionsLayout), {
            mode: "text",
            change: delegate(this, this._onFieldRuleChange),
            label: AdminResources.DefaultValue,
            width: 431,
            setTitleOnlyOnOverflow: true,
            disableOpenOnKeyboardFocus: true,
            allowEdit: true
        }) as OpenDropDownOnFocusCombo;
        this._createIdentityPicker();

        this._getDefaultFieldBooleanRadioFalseButton().change(delegate(this, this._onFieldRuleChange));
        this._getDefaultFieldBooleanRadioTrueButton().change(delegate(this, this._onFieldRuleChange));

        this._optionsTabDefaultValueError = $(".field-default-value-error-message", this._fieldOptionsLayout);

        this._requiredFieldCheckbox = $("#isRequiredFieldCheckbox", this._fieldOptionsLayout).bind("change", delegate(this, this._onFieldRuleChange));

        this._isSuggestedValueCheckbox = $("#isSuggestedPicklistCheckbox", this._fieldOptionsLayout).bind("change", delegate(this, this._onFieldRuleChange));
        this._isSuggestedOptionContainer = $(".suggested-value-option", this._fieldOptionsLayout);

        this._allowGroupsCheckbox = $("#allowGroupsCheckbox", this._fieldOptionsLayout).bind("change", () => this._onFieldRuleChange());
        this._allowGroupsOptionContainer = $(".allow-groups-option", this._fieldOptionsLayout);

        this._updateAllowGroups(this._allowGroupsCheckbox.prop("checked"));

        this._currentDateTimeCheckbox = $("#currentDateTimeCheckbox", this._fieldOptionsLayout).bind("change", delegate(this, this._onFieldRuleChange));
        this._currentDateTimeOptionContainer = $(".current-datetime-option", this._fieldOptionsLayout);

        this._identityDefaultsRadioContainer = $(".identity-default-value", this._fieldOptionsLayout);
        this._currentUserOption = $(".identity-default-value #currentUser", this._fieldOptionsLayout);
        this._defaultUserOption = $(".identity-default-value #defaultUser", this._fieldOptionsLayout);
        $(".identity-default-value input[type=radio][name=identityDefaultRadio]", this._fieldOptionsLayout).change(() => {
            this._onFieldRuleChange();
        });
    }

    private _setupTabOrder(): void {
        if (!this.editFieldDefinitionEnabled()) {
            return;
        }

        let radio1 = this._element.find("#radio1");
        let radio2 = this._element.find("#radio2");
        let existingFieldCombo = this._existingFieldCombo.getInput();
        let learnMore = this._element.find("#field-definition-page .form-section a");
        let newFieldName = this._element.find("#field-name-input");
        let definitionTab = this._element.find("#add-field-tab-item-definition");
        let descriptionInput = this._element.find("#field-description-textarea");

        existingFieldCombo.on("keydown", (e) => {
            var keyCode = e.keyCode || e.which;

            if (keyCode === KeyCode.TAB) {
                e.preventDefault();

                if (e.shiftKey) {
                    radio1.focus();
                }
                else {
                    radio2.focus();
                }
            }
        });

        radio1.on("keydown", (e) => {
            var keyCode = e.keyCode || e.which;

            if (keyCode === KeyCode.TAB) {
                e.preventDefault();

                if (e.shiftKey) {
                    definitionTab.focus();
                } else {
                    if (this._fieldData.existing) {
                        existingFieldCombo.focus();
                    }
                    else {
                        radio2.focus();
                    }
                }
            }
        });

        radio2.on("keydown", (e) => {
            var keyCode = e.keyCode || e.which;

            if (keyCode === KeyCode.TAB) {
                e.preventDefault();

                if (e.shiftKey) {
                    if (this._fieldData.existing) {
                        existingFieldCombo.focus();
                    }
                    else {
                        radio1.focus();
                    }
                } else {
                    if (this._fieldData.existing) {
                        learnMore.focus();
                    }
                    else {
                        newFieldName.focus();
                    }
                }
            }
        });

        definitionTab.on("keydown", (e) => {
            var keyCode = e.keyCode || e.which;

            if (keyCode === KeyCode.TAB && !e.shiftKey) {
                e.preventDefault();
                radio1.focus();
            }
        });

        learnMore.on("keydown", (e) => {
            var keyCode = e.keyCode || e.which;

            if (keyCode === KeyCode.TAB && e.shiftKey) {
                e.preventDefault();

                if (this._fieldData.existing) {
                    radio2.focus();
                }
                else {
                    descriptionInput.focus();
                }
            }
        });
    }

    /** Updates state of exclamation mark icon at the right of each tab 
     * Also updates the "Add" Button: the button should be disabled if there are any errors on the page
     */
    private _updateTabErrors(): void {
        let definitionTabHasError: boolean = this._definitionTabFieldNameError.text() !== "" || this._definitionTabExistingFieldError.text() !== "" || this._definitionTabFieldTypeError.text() !== "";

        if (this._fieldDataIsPicklist() && this._picklistCtrl.hasValidationMessage()) {
            definitionTabHasError = true;
        }

        const layoutTabHasError: boolean = this._isLayoutTabHasErrors();
        const optionsTabHasError: boolean = this._optionsTabDefaultValueError.text() !== "";

        const hasErrors = definitionTabHasError || layoutTabHasError || optionsTabHasError;

        this.updateOkButton(!hasErrors);
        $("#" + AddFieldDialog.DEFINITION_TAB_ERRORID, this._tabContainerElement).css("display", definitionTabHasError ? "inline-block" : "none");
        $("#" + AddFieldDialog.LAYOUT_TAB_ERRORID, this._tabContainerElement).css("display", layoutTabHasError ? "inline-block" : "none");
        $("#" + AddFieldDialog.OPTIONS_TAB_ERRORID, this._tabContainerElement).css("display", optionsTabHasError ? "inline-block" : "none");

    }

    private _isLayoutTabHasErrors(): boolean {
        const groupError = $(".field-form-group-error-message", this._fieldLayoutLayout);
        const pageError = $(".field-form-page-error-message", this._fieldLayoutLayout);
        const groupNameError = $(".group-name-error-message", this._fieldLayoutLayout);
        return this._layoutTabFieldNameError.text() !== "" || groupError.text() !== "" || pageError.text() !== "" || groupNameError.text() !== "";
    }

    protected _validate(): boolean {
        const fieldDefinitionValid = this.validateAndUpdateFieldDefinitionUI();
        const fieldLayoutValid = this.validateAndUpdateFieldLayoutUI();
        const fieldOptionsValid = this.validateAndUpdateFieldOptionsUI();
        const picklistValid = this._fieldDataIsPicklist() ? this.validatePicklist() : true;
        const isValid = fieldDefinitionValid && fieldLayoutValid && fieldOptionsValid && picklistValid;
        this._updateTabErrors();

        return isValid;
    }

    private _getGroups(): string[] {
        return this._groupNames;
    }

    private _picklistCtrl: AddFieldControls.PicklistControl;
    protected _getPicklistControl(options: any = null): AddFieldControls.PicklistControl {
        if (!this._picklistCtrl) {
            if (options === null) {
                var optionsText: string = $(".picklist-control-options > script.options").text();
                if (optionsText) {
                    options = JSON.parse(optionsText);
                }
            }
            this._picklistCtrl = <AddFieldControls.PicklistControl>Controls.BaseControl.createIn(
                AddFieldControls.PicklistControl,
                $(".picklist-container", this._fieldDefinitionLayout),
                options);
            this._picklistCtrl.onValidationChanged(() => { this._updateTabErrors(); });

            this._picklistCtrl.onInputItemFocusOut(() => {
                if (this._picklistCtrl.getUnsavedPicklistItem() === "") {
                    this._picklistCtrl.setValidationMessage("");
                }
            });
        }
        return this._picklistCtrl;
    }

    protected _getDefaultValueOptionBlock(): JQuery {
        return $("#default-value-option-block", this._fieldOptionsLayout);
    }

    protected _getDefaultFieldBooleanRadio(): JQuery {
        return $(".default-bool-value", this._fieldOptionsLayout);
    }

    protected _getDefaultFieldBooleanRadioFalseButton(): JQuery {
        return $("#defaultBoolValueFalse", this._getDefaultFieldBooleanRadio());
    }

    protected _getDefaultFieldBooleanRadioTrueButton(): JQuery {
        return $("#defaultBoolValueTrue", this._getDefaultFieldBooleanRadio());
    }

    private _showPicklistPane(show: boolean): void {
        const pane: JQuery = $(".picklist-container", this._fieldDefinitionLayout);
        if (show) {
            pane.show();
        } else {
            pane.hide();
        }
    }

    /* 
    * Input Elements Change Event Handlers 
    */

    private _updatePageFieldData(): void {
        const selectedId = this._pageCombo.getSelectedIndex();
        this._selectedPage = this._pages[selectedId];
        this._isEmptyPage = AdminProcessCommon.ProcessLayoutHelpers.isEmptyPage(this._selectedPage, true);
        this._populateGroups(this._selectedPage);
        this._fieldGroupCombo.setSource(this._getGroups());
        this._setGroupCombo();
        const isExisting = !this._isEmptyPage && !this._options.disablePageAndSectionSelection;
        this._onUseExistingGroupChange(isExisting);
        this._updateGroupNameOnEmptyPage();
        this._updateFieldData();
    }

    protected _updateGroupNameOnEmptyPage() {
        this._fieldData.existing = $("input:radio[name=existing]:checked", this._fieldDefinitionLayout).val() === "true";
        const useExistingField: boolean = this._fieldData.existing;
        if ((this._isEmptyPage || this._options.disablePageAndSectionSelection) && this._fieldData.isVisibleOnForm && !this._isGroupNameChangedByUser) {
            const groups = AdminProcessCommon.ProcessLayoutHelpers.getGroups(this._selectedPage, true);
            let count = 1;
            while (true) {
                if (!groups.some((group, index, groups) => {
                    return (count == 1 && Utils_String.localeComparer(group.label, AdminResources.DefaultGroupName) == 0) || Utils_String.localeComparer(group.label, Utils_String.format(AdminResources.DefaultGroupNameWithAppendant, count)) == 0;
                })) {
                    break;
                }
                count++;
            }
            this._groupNameInput.val(count == 1 ? AdminResources.DefaultGroupName : Utils_String.format(AdminResources.DefaultGroupNameWithAppendant, count));
        }
    }

    private _updateSectionFieldData(): void {
        this._selectedSectionId = $("input[name=" + WorkItemLayoutCommon.GroupSectionConstants.RADIO_BUTTON_NAME + "]:checked", this._fieldLayoutLayout).attr("id");
        this._updateTabErrors();
        this._updateFieldData();
    }

    private _updateSectionRadio(sectionId: string): void {
        WorkItemLayoutCommon.GroupSectionConstants.SECTIONS.forEach((section) => {
            $("#" + section.id, this._fieldLayoutLayout).prop("checked", sectionId === section.id);
        });
    }

    private _updateCheckedGroup(sectionId: string): void {
        if (this._options.disableGroup) {
            return;
        }
        this._updateSectionRadio(sectionId);
        this._updateSectionFieldData();
    }

    private _updateFieldData(populateFromExisting: boolean = false): void {
        this._fieldData = this._getCurrentFieldData(populateFromExisting);
        this._hasAnyChanges = true;
    }

    private _getCurrentFieldData(populateFromExisting: boolean = false): AdminDialogFieldContracts.FieldData {
        // Getting current as a base
        const fieldData: AdminDialogFieldContracts.FieldData = jQuery.extend(true, {}, this._fieldData);

        const existingFieldRadio: JQuery = this._existingFieldCombo ? $("input:radio[name=existing]:checked", this._fieldDefinitionLayout) : null;
        fieldData.existing = existingFieldRadio ? existingFieldRadio.val() === "true" : fieldData.existing;
        fieldData.existingField = (fieldData.existing && this._existingFieldCombo) ? this._availableFields[this._existingFieldCombo.getText()] : fieldData.existingField;

        this._populateCommonFieldDataValues(fieldData);

        if (populateFromExisting && fieldData.existing && fieldData.existingField) {
            this._populateFieldDataFromExistingField(fieldData);
        }
        else {
            this._populateFieldDataFromControlValues(fieldData);
        }

        return fieldData;
    }

    private _populateFieldDataFromExistingField(fieldData: AdminDialogFieldContracts.FieldData): void {
        fieldData.pickListId = null;

        const processField: AdminProcessContracts.ProcessField = fieldData.existingField.id && this._getProcessField(fieldData.existingField.id);

        if (processField) {
            fieldData.default = AddFieldDialog._processFieldHelper.getDefaultValue(processField, this._workItemType);
            fieldData.required = AddFieldDialog._processFieldHelper.getIsRequired(processField, this._workItemType);

            if (processField.PickListId !== Utils_String.EmptyGuidString) {
                fieldData.pickListId = processField.PickListId;
            }

            fieldData.description = AddFieldDialog._processFieldHelper.getDescription(processField, this._workItemType);
            fieldData.allowGroups = AddFieldDialog._processFieldHelper.getAllowGroups(processField, this._workItemType)
        }

        if (fieldData.type === ProcessContracts.FieldType.Boolean) {
            // boolean fields must be required (either true or false, never null) and have a default value
            fieldData.required = true;
            fieldData.default.Value = fieldData.default.Value && fieldData.default.Value !== "" ? fieldData.default.Value : "False";
        }
    }

    private _populateFieldDataFromControlValues(fieldData: AdminDialogFieldContracts.FieldData): void {
        fieldData.required = this._requiredFieldCheckbox.prop("checked");

        fieldData.default.Vsid = "";
        fieldData.default.Value = "";
        if (fieldData.type === ProcessContracts.FieldType.Boolean) {
            // boolean fields must be required (either true or false, never null)
            fieldData.required = true;
            // Boolean default value is a radio button
            if (this._getDefaultFieldBooleanRadioTrueButton().prop("checked")) {
                fieldData.default.Value = "1";
            } else {
                fieldData.default.Value = "0";
            }
        } else if (fieldData.type === ProcessContracts.FieldType.DateTime
            && this._currentDateTimeCheckbox.prop("checked")) {
            fieldData.default.Value = AdminResources.DateTimeDefaultFromClockToken;
        } else if (fieldData.type === ProcessContracts.FieldType.Identity) {
            if (this._currentUserOption.prop("checked")) {
                fieldData.default.Value = "$currentUser";
            } else if (this._defaultUserOption.prop("checked")) {
                const ids = this._defaultIdentityValue.getIdentitySearchResult().resolvedEntities;
                if (ids.length > 0) {
                    fieldData.default.Value = ids[0].displayName;
                    fieldData.default.Vsid = ids[0].localId;
                }
            } else {
                fieldData.default.Value = fieldData.default.Vsid = "";
            }
            fieldData.allowGroups = this._allowGroupsCheckbox.prop("checked");
        } else {
            fieldData.default.Value = this._defaultFieldValueCombo.getText();
        }

        if (this.editFieldDefinitionEnabled()) {
            const extendedFieldType: AdminProcessCommon.ExtendedFieldType = this._getFieldTypeFromSelectedLabel();
            if (extendedFieldType.isPicklist) {
                // This value marks the selected field type as a picklist. The actual value will not be used.
                fieldData.pickListId = "NEW PICKLIST";
            } else {
                fieldData.pickListId = null;
            }
        }
    }

    private _populateCommonFieldDataValues(fieldData: AdminDialogFieldContracts.FieldData): void {
        fieldData.id = fieldData.existing ? fieldData.existingField.id : null;
        fieldData.name = fieldData.existing ? fieldData.existingField.name : this._fieldNameInput.val();
        fieldData.type = fieldData.existing ? fieldData.existingField.type : this._getFieldTypeFromSelectedLabel().fieldType;
        fieldData.description = this._fieldDescriptionInput.val();
        fieldData.label = this._fieldLabelInput.val();
        fieldData.isVisibleOnForm = this._fieldVisibleCheckbox.prop("checked");

        // You cannot change group from the field group combo box for html fields.
        if (fieldData.type !== ProcessContracts.FieldType.Html) {
            if (this._isExistingGroup) {
                const selectedId = this._fieldGroupCombo.getSelectedIndex();
                fieldData.groupId = this._groupIds[selectedId];
                fieldData.groupName = this._fieldGroupCombo.getText();
            } else {
                // Clearing the groupId if its a new group
                fieldData.groupId = "";
                fieldData.groupName = this._groupNameInput.val();
            }
        }
    }

    private _getFieldTypeFromSelectedLabel(): AdminProcessCommon.ExtendedFieldType {
        return AddFieldDialog._processFieldHelper.getFieldTypeFromLabel(this._fieldTypeCombo.getText());
    }

    private _convertValue(value: string, fieldType: ProcessContracts.FieldType): string {
        if (value && fieldType === ProcessContracts.FieldType.DateTime) {
            // convert from user date to client date and then to UTC format
            return Utils_Date.convertUserTimeToClientTimeZone(
                Utils_Date.parseDateString(value, /*parseFormat=*/undefined, /*ignoreTimezone=*/true), true)
                .toISOString();
        }
        return value;
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

    protected _setExistingFieldCombo(text: string): void {
        this._existingFieldCombo.setEnabled(true);
        this._existingFieldCombo.setInputText(text, false);
        this._existingFieldCombo.setEnabled(false);
    }

    /**
     * Get the default group to use when populating the "Group" combobox.  This currently
     * retrieves the first group in the first section if the groupId is not passed. Otherwise finds the group that is passed and returns it  
     * Currently only works for 1 custom tab page, will need to be extended when generic tab pages are allowed.
     */
    private _getDefaultGroup(pageId?: string, groupId?: string): ProcessContracts.Group {
        let group: ProcessContracts.Group = null;

        const forHtmlField = this._fieldData.type === ProcessContracts.FieldType.Html;

        $.each(this.getWorkItemType().layout.pages, (i, page) => {
            if (page.pageType === ProcessContracts.PageType.Custom && (!pageId || pageId === page.id)) {
                if (page.sections) {
                    if (forHtmlField && page.sections.length > 0) {
                        group = page.sections[0].groups[0];
                    } else if (!forHtmlField && page.sections.length > 1) {
                        // If groupId is passed, show that as the default one
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
                    }

                    return false;
                }
            }
        });

        return group;
    }

    public _updateDefinitionTabFieldNameError(errorMsg: string): void {
        this._definitionTabFieldNameError.text(errorMsg);
        if (errorMsg) {
            this._fieldNameInput.addClass("invalid");
        } else {
            this._fieldNameInput.removeClass("invalid");
        }

        this._updateTabErrors();
    }

    public _updateDefinitionTabExistingFieldError(errorMsg: string): void {
        this._definitionTabExistingFieldError.text(errorMsg);
        if (errorMsg) {
            this._existingFieldCombo.getInput().addClass("invalid");
        } else {
            this._existingFieldCombo.getInput().removeClass("invalid");
        }

        this._updateTabErrors();
    }

    public _updateDefinitionTabFieldTypeError(errorMsg: string): void {
        this._definitionTabFieldTypeError.text(errorMsg);
        if (errorMsg) {
            this._fieldTypeCombo.getInput().addClass("invalid");
        } else {
            this._fieldTypeCombo.getInput().removeClass("invalid");
        }

        this._updateTabErrors();
    }

    private _updateLayoutTabFieldNameError(errorMsg: string): void {
        if (errorMsg !== "") {
            this._fieldLabelInput.addClass("invalid");
        } else {
            this._fieldLabelInput.removeClass("invalid");
        }

        this._layoutTabFieldNameError.text(errorMsg);
        this._updateTabErrors();
    }

    private _updateLayoutTabPageError(errorMsg: string): void {
        this._pageCombo.setInvalid(errorMsg !== "");
        this._layoutTabPageNameError.text(errorMsg);
    }

    private _updateLayoutTabExistingGroupError(errorMsg: string): void {
        this._fieldGroupCombo.setInvalid(errorMsg !== "");
        this._layoutTabExistingGroupError.text(errorMsg);
    }

    private _updateLayoutTabGroupNameError(errorMsg: string): void {
        if (errorMsg !== "") {
            this._groupNameInput.addClass("invalid");
        } else {
            this._groupNameInput.removeClass("invalid");
        }

        this._layoutTabGroupNameError.text(errorMsg);
        this._updateTabErrors();
    }

    private _updateOptionsTabDefaultValueError(errorMsg: string): void {

        this._defaultFieldValueCombo.setInvalid(errorMsg !== "");

        if (errorMsg) {
            $("input", this._defaultIdentityValue._element).addClass("invalid");
        } else {
            $("input", this._defaultIdentityValue._element).removeClass("invalid");
        }

        this._optionsTabDefaultValueError.text(errorMsg);
        this._updateTabErrors();
    }

    private _onFieldRuleChange(): void {
        const text: string = this._defaultFieldValueCombo.getText();

        // Cleanup the validation message
        this._updateOptionsTabDefaultValueError("");

        if (this._currentDateTimeCheckbox.prop("checked")) {
            this._defaultFieldValueCombo.setText("");
            this._defaultFieldValueCombo.setEnabled(false);
        } else {
            this._defaultFieldValueCombo.setEnabled(true);
        }

        if (this._requiredFieldCheckbox.prop("checked") && !text) {
            this._fieldVisibleCheckbox.prop("checked", true);
            this._onFieldVisibleChange();
        } else {
            this._updateFieldData();
        }

        if (this._defaultUserOption.prop("checked")) {
            this._defaultIdentityValue.disableReadOnlyMode();
        } else {
            this._defaultIdentityValue.enableReadOnlyMode();
        }

        this._updateAllowGroups(this._allowGroupsCheckbox.prop("checked"));

        // Update the picklist default if necessary
        if (this._picklistCtrl) {
            this._setDefaultMark();
        }

        this._validate();
    }

    private _onExistingFieldChange(): void {
        if (this._validateExistingFieldCombo(this._existingFieldCombo.getText(), this._availableFields)) {
            const existingField = this._availableFields[this._existingFieldCombo.getText()];
            this._fieldLabelInput.val(this._existingFieldCombo.getText());
            this._updateDefaultFieldValueCombo(this._getTypeFromFieldModel(existingField));
            this._defaultFieldValueCombo.setText("");
            this._updateGroupNameOnEmptyPage();
            this._updateFieldData(true);
            this._updateOptionsTab();
            this._tabsContainer.setItemIsVisible(this._optionsTab, this._showOptions());
        }
    }

    private _onGroupNameChange(): void {
        // Removing validation message only if there were any changes
        if (!this._fieldDataEquals(this._fieldData, this._getCurrentFieldData())) {
            this._updateLayoutTabGroupNameError("");
            this._isGroupNameChangedByUser = true;
            this._updateFieldData();
        }
    }

    private _onLayoutFieldLabelChange(): void {
        // Removing validation message only if there were any changes
        if (!this._fieldDataEquals(this._fieldData, this._getCurrentFieldData())) {
            this._updateLayoutTabFieldNameError("");
            this._isFieldLabelChangedByUser = true;
            this._updateFieldData();
        }
    }

    private _onFieldNameChange(): void {
        // When field name changes copy value
        if (this._fieldData.isVisibleOnForm) {
            if (!this._isFieldLabelChangedByUser && this._fieldNameInput.val()) {
                this._fieldLabelInput.val(this._fieldNameInput.val());
            }
        }

        // Removing validation message only if there were any changes
        if (!this._fieldDataEquals(this._fieldData, this._getCurrentFieldData())) {
            // cleaning up the validation messages (for the name and layout label, since layout should be populated automatically)
            this._updateDefinitionTabFieldNameError("");
            this._updateLayoutTabFieldNameError("");
            this._updateFieldData();
        }
    }

    private _onFieldVisibleChange(): void {
        if (!this._fieldVisibleCheckbox.prop("checked")) {
            this._fieldLabelInput.attr("disabled", "disabled");
            this.disableLayoutGroup();
        } else {
            this._fieldLabelInput.removeAttr("disabled");
            if (!this._options.disableGroup) {
                this.enableLayoutGroup();
            }
        }

        this._clearLayoutTabErrors();
    }

    /** Sets the (default) mark on the picklist for the element from Options->Default */
    protected _setDefaultMark(): void {
        const defaultText: string = this._defaultFieldValueCombo.getText();
        this._getPicklistControl().setDefaultItem(defaultText);
    }

    protected _updatePicklistControl(fieldType: AdminProcessCommon.ExtendedFieldType): void {
        // Redrawing/reinitializing the picklist only if type is changed
        if (fieldType.isPicklist) {
            this._showPicklistPane(true);

            const picklistCtrl: AddFieldControls.PicklistControl = this._getPicklistControl();
            picklistCtrl.initialize(null, AddFieldDialog._processFieldHelper.isNumericTypeForPicklist(fieldType.fieldType));

            // Adding listener to handle the list updates and update the default combobox
            picklistCtrl.addListChangeListener(() => {
                this._populateDefaultComboForPicklist(picklistCtrl.getPicklistElements());

                // Updating default mark on the picklist
                this._setDefaultMark();
            });

            picklistCtrl.addListItemDeleteListener(() => {
                // Clear the default value if it"s deleted
                this._populateDefaultComboForPicklist(this._getPicklistControl().getPicklistElements(), false);
                this._validate();
            });

        } else {
            this._showPicklistPane(false);
        }
    }

    private _getTypeFromFieldModel(field: ProcessContracts.FieldModel): AdminProcessCommon.ExtendedFieldType {
        return AddFieldDialog._processFieldHelper.getFieldType(field.type, this._isPicklist(field));
    }

    private _getTypeFromFieldData(field: AdminDialogFieldContracts.FieldData): AdminProcessCommon.ExtendedFieldType {
        return AddFieldDialog._processFieldHelper.getFieldType(field.type, (field.pickListId && field.pickListId !== Utils_String.EmptyGuidString));
    }

    private _fieldDataIsPicklist(): boolean {
        return (this._fieldData.pickListId && this._fieldData.pickListId !== Utils_String.EmptyGuidString);
    }

    private _onFieldTypeChange(): void {
        const fieldType = this._getFieldTypeFromSelectedLabel();
        this._updatePicklistControl(fieldType);
        this._updateDefaultFieldValueCombo(fieldType);
        this._defaultFieldValueCombo.setText("");
        if (this._picklistCtrl) {
            this._picklistCtrl.setValidationMessage("");
        }
        this._errorPanel.clear();
        this._updateFieldData();
        this._updateDefinitionTabFieldTypeError(""); // clear any errors
    }

    private _refreshDefinitionOptions(existing: boolean): void {
        let extendedFieldType: AdminProcessCommon.ExtendedFieldType;

        if (existing) {
            this._existingFieldCombo.setEnabled(true);
            this._existingFieldCombo.getInput().removeAttr("disabled");
            this._existingFieldCombo.disablePopupOnFocus();
            this._existingFieldCombo.enablePopupOnFocus();
            this._fieldNameInput.attr("disabled", "disabled");
            this._fieldDescriptionInput.attr("disabled", "disabled");
            this._fieldTypeCombo.setEnabled(false);
            this._fieldTypeCombo.getInput().attr("disabled", "disabled");

            const ifErrorExist = !this._validateExistingFieldCombo(this._existingFieldCombo.getText(), this._availableFields);

            if (ifErrorExist) {
                this._existingFieldCombo.setSelectedIndex(0);
            }

            const existingField: AdminDialogFieldContracts.Field = this._availableFields[this._existingFieldCombo.getText()];
            this._fieldLabelInput.val(this._existingFieldCombo.getText());

            extendedFieldType = AddFieldDialog._processFieldHelper.getFieldType(existingField.type,this._isPicklist(existingField));
        } else {
            this._fieldNameInput.removeAttr("disabled");
            this._existingFieldCombo.setEnabled(false);
            this._existingFieldCombo.getInput().attr("disabled", "disabled");
            this._fieldDescriptionInput.removeAttr("disabled")
            this._fieldTypeCombo.setEnabled(true);
            this._fieldTypeCombo.getInput().removeAttr("disabled");

            // We will kindly copy the field name here if label field is empty when updating with field changes
            if (this._fieldLabelInput.val()) {
                this._fieldLabelInput.val(this._fieldNameInput.val());
            }
            extendedFieldType = this._getFieldTypeFromSelectedLabel();
        }

        // Clear default value and required
        this._defaultFieldValueCombo.setText("", false);
        this._requiredFieldCheckbox.prop("checked", false);
        this._isSuggestedValueCheckbox.prop("checked", false);
        this._currentDateTimeCheckbox.prop("checked", false);

        if (extendedFieldType) {
            this._updatePicklistControl(extendedFieldType);
            this._updateDefaultFieldValueCombo(extendedFieldType);
        }
        this._updateGroupNameOnEmptyPage();
    }

    private _isPicklist(field: ProcessContracts.FieldModel): boolean {
        return field.type == ProcessContracts.FieldType.PicklistDouble 
        || field.type == ProcessContracts.FieldType.PicklistString 
        || field.type == ProcessContracts.FieldType.PicklistInteger
    }

    private _onUseExistingFieldChange(existing: boolean): void {
        this._refreshDefinitionOptions(existing);
        this._updateDefinitionTabFieldNameError("");
        this._updateDefinitionTabExistingFieldError("");
        if (this._picklistCtrl) {
            this._picklistCtrl.setValidationMessage("");
        }
        if (existing) {
            this._existingFieldCombo.setTextSelection(0);
        }

        this._fieldData.existingField = null;
        this._fieldData.pickListId = null;

        this._updateFieldData(true);
        this._updateOptionsTab();
        this._tabsContainer.setItemIsVisible(this._optionsTab, this._showOptions());
        this._tabsContainer.selectItem(this._definitionTab);
    }

    private _refreshGroupOptions(existing: boolean): void {
        this._isExistingGroup = existing && !this._options.disablePageAndSectionSelection;
        if (existing) {
            this._fieldGroupCombo.setEnabled(true);
            this._fieldGroupCombo.getInput().removeAttr("disabled");
            $("input:radio[id=existingGroupRadio]", this._fieldLayoutLayout).prop("checked", true);
            $("input:radio[id=newGroupRadio]", this._fieldLayoutLayout).prop("checked", false);
            $("input:radio[id=existingGroupRadio]", this._fieldLayoutLayout).removeAttr("disabled");
            $("input:text[id=layout-new-group]", this._fieldLayoutLayout).attr("disabled", "disabled");
        } else {
            $("input:radio[id=existingGroupRadio]", this._fieldLayoutLayout).prop("checked", false);
            $("input:radio[id=newGroupRadio]", this._fieldLayoutLayout).prop("checked", true);
            $("input:text[id=layout-new-group]", this._fieldLayoutLayout).removeAttr("disabled");
            this._fieldGroupCombo.setEnabled(false);
            this._fieldGroupCombo.getInput().attr("disabled", "disabled");
            if (this._isEmptyPage || this._options.disablePageAndSectionSelection) {
                $("input:radio[id=existingGroupRadio]", this._fieldLayoutLayout).attr("disabled", "disabled");
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

        this._updateFieldData();
    }

    private _clearLayoutTabErrors() {
        this._updateLayoutTabFieldNameError("");
        this._clearLayoutTabGroupErrors();
    }

    protected _populateDefaultComboForPicklist(values: string[], preserveValue: boolean = true): void {

        const previousDefValue: string = this._defaultFieldValueCombo.getText();

        this._defaultFieldValueCombo.setType("list");
        this._defaultFieldValueCombo.setMode("drop");
        this._defaultFieldValueCombo.setSource(values);

        // Allow edit so that a picklist default value can be cleared.  
        // We will validate the default value both on the client and server.
        this._defaultFieldValueCombo._options.allowEdit = true;

        // If there was a previous default value, and it is not in the list, clear it
        if (previousDefValue) {
            if (preserveValue) {
                this._defaultFieldValueCombo.setText(previousDefValue);
            } else if (!Utils_Array.arrayContains(previousDefValue, values, (a, b) => { return a == b })) {
                this._defaultFieldValueCombo.setText("");
            }

            if (this.validateAndUpdateFieldOptionsUI(values)) {
                this._updateFieldData();
            }
        }
    }

    protected _updateDefaultFieldValueCombo(fieldType: AdminProcessCommon.ExtendedFieldType): void {
        // Unset
        this._isSuggestedOptionContainer.hide();
        this._currentDateTimeCheckbox.prop("checked", false);
        this._currentDateTimeOptionContainer.hide();
        this._defaultFieldValueCombo.setEnabled(true);
        this._defaultFieldValueCombo.setSource(null);
        this._requiredFieldCheckbox.prop("checked", false);
        this._requiredFieldCheckbox.prop("disabled", false);
        this._isSuggestedValueCheckbox.prop("checked", false);
        this._allowGroupsOptionContainer.hide();

        // Set
        if (fieldType.isPicklist) {
            this._populateDefaultComboForPicklist(this._getPicklistControl().getPicklistElements());
            this._isSuggestedOptionContainer.show();
            return;
        }

        switch (fieldType.fieldType) {
            case ProcessContracts.FieldType.Boolean:
                this._requiredFieldCheckbox.prop("checked", true);
                this._requiredFieldCheckbox.prop("disabled", true);
                this._getDefaultFieldBooleanRadioFalseButton().prop("checked", true);
                return;
            case ProcessContracts.FieldType.DateTime:
                this._defaultFieldValueCombo._options.allowEdit = true;
                this._defaultFieldValueCombo.setType("date-time");
                this._defaultFieldValueCombo.setMode("drop");
                this._currentDateTimeOptionContainer.show();
                return;
            case ProcessContracts.FieldType.Identity:
                this._allowGroupsOptionContainer.show();
                return;
            // case "Double":
            // case "Integer":
            // case "PlainText":
            // case "String":
            // case "TreePath":
            // case "History":
            default: // String format
                this._defaultFieldValueCombo._options.allowEdit = true;
                this._defaultFieldValueCombo.setType("list");
                this._defaultFieldValueCombo.setMode("text");
                return;
        }
    }

    /** Create Rest package functions 
    */
    private _buildAddFieldToProcessPackage(): ProcessDefinitionsContracts.FieldModel {
        return {
            id: null,
            url: null,
            description: this._fieldData.description,
            name: this._fieldData.name,
            type: this._getServerFieldType(),
            pickList: this._fieldDataIsPicklist() ? this._picklist : null
        };
    }

    private _buildPicklistPackage(): ProcessContracts.PickList {
        const listItems: string[] = [];
        const picklistCtrlElements = this._getPicklistControl().getPicklistElements();

        for (let i: number = 0; i < picklistCtrlElements.length; i++) {
            listItems.push(picklistCtrlElements[i]);
        }

        return {
            id: null,
            name: "picklist_" + TFS_Core_Utils.GUIDUtils.newGuid(),
            type: ProcessContracts.FieldType[this._getServerFieldType()],
            url: null,
            items: listItems,
            isSuggested: this._isSuggestedValueCheckbox ? this._isSuggestedValueCheckbox.prop("checked") : false
        };
    }

    private _getServerFieldType(): ProcessContracts.FieldType {
        if (this._fieldDataIsPicklist()) {
            // Convert from the picklist subtype back to the String or Integer type the API expects
            if (AddFieldDialog._processFieldHelper.isNumericTypeForPicklist(this._fieldData.type)) {
                return ProcessContracts.FieldType.Integer;
            } else { // Default to string
                return ProcessContracts.FieldType.String;
            }
        }
        return this._fieldData.type;
    }

    private _buildAddFieldToWorkItemTypePackage(fieldId: string): ProcessContracts.AddProcessWorkItemTypeFieldRequest {
        const witFieldModel: ProcessContracts.AddProcessWorkItemTypeFieldRequest = {
            defaultValue: null,
            referenceName: fieldId,
            readOnly: false,
            required: false,
            allowGroups: null,
        };

        // we can't set rules on inherited fields
        const processField: AdminProcessContracts.ProcessField = this._getProcessField(fieldId);
        if (!processField || !AddFieldDialog._processFieldHelper.isInheritedField(processField, this._workItemType) || this.canEditFieldProperties()) {
            // If current field is datetime and it has some default value specified which is not due to use current date checkbox, convert it to UTC date.
            if (this._fieldData.type === ProcessContracts.FieldType.DateTime &&
                this._fieldData.default &&
                !Utils.isStringNullOrEmpty(this._fieldData.default.Value) &&
                !Utils_String.equals(this._fieldData.default.Value, "$currentDateTime")) {
                witFieldModel.defaultValue = Utils_Date.parseLocale(this._fieldData.default.Value).toISOString();
            }
            else {
                witFieldModel.defaultValue = this._fieldData.default.Vsid || this._fieldData.default.Value;
            }

            if (this._fieldData.type === ProcessContracts.FieldType.Identity) {
                witFieldModel.allowGroups = this._fieldData.allowGroups;
            }
            witFieldModel.required = this._fieldData.required;
        }
        else if (!AddFieldDialog._processFieldHelper.isCustomField(fieldId)) {
            // if this is an OOB field that is blocked from editing, make sure field properties are reset
            witFieldModel.required = AddFieldDialog._processFieldHelper.getIsRequired(processField, this._workItemType);
            let defaultValue = AddFieldDialog._processFieldHelper.getDefaultValue(processField, this._workItemType);
            if (defaultValue && defaultValue.Value && defaultValue.Value !== "") {
                witFieldModel.defaultValue = defaultValue.Value;
            }
        }

        return witFieldModel;
    }

    private _getProcessField(fieldNameOrRefName: string): AdminProcessContracts.ProcessField {
        const [processField] = this._allProcessFields.Fields.filter(f =>
            Utils_String.localeIgnoreCaseComparer(f.Name, fieldNameOrRefName) === 0
            || Utils_String.localeIgnoreCaseComparer(f.Id, fieldNameOrRefName) === 0);
        return processField;
    }

    private _buildAddFieldToLayoutPackage(fieldId): ProcessContracts.Control {
        return {
            order: null,
            label: this._fieldData.label,
            readOnly: false,
            visible: true,
            controlType: null,
            id: fieldId,
            metadata: null,
            inherited: null,
            overridden: null,
            watermark: null,
            contribution: null,
            height: null,
            isContribution: false
        }
    }

    /**
     * Creates field then adds to process before
     * calling _addFieldToWorkItemType
     *
     * Creates the picklist for the field if necessary before adding the field
     */
    private _addField(): void {

        if (!this._validate()) {
            return;
        }

        this.showLoading();
        const addField = (workItemTypeId: string) => {
            if (this._fieldData.existingField) {
                this._addFieldToWorkItemType(workItemTypeId, this._fieldData.existingField.id, () => {
                    this._addFieldToLayout(workItemTypeId, this._fieldData.existingField.id);
                });
            } else {
                this._addFieldToProcess(workItemTypeId, (workItemTypeId: string, fieldId: string) => {
                    this._addFieldToWorkItemType(workItemTypeId, fieldId, () => {
                        this._addFieldToLayout(workItemTypeId, fieldId);
                    });
                });
            }
        };

        const doAdd = () => {
            if (this._workItemType.customization !== ProcessContracts.CustomizationType.System) {
                addField(this._workItemType.referenceName);
            } else {
                this._createChildWorkItemType(addField);
            }
        };

        if (!this._fieldData.existing && this._fieldDataIsPicklist()) {
            Utils.getProcessClient().createList(this._buildPicklistPackage()).then(
                (field: ProcessContracts.PickList) => { // Success
                    this._picklist = field;
                    doAdd();
                },
                (witError) => { // Error
                    this._errorPanel.setMessage(witError.message);
                    this.hideBusyOverlay();
                });
        } else {
            doAdd();
        }
    }

    /** Get client in protected method for unit testing */
    protected getProcessDefinitionsClient(): ProcessDefinitionsHttpClient.WorkItemTrackingProcessDefinitionsHttpClient {
        return ProcessDefinitionsHttpClient.getClient();
    }
     

    protected _createChildWorkItemType(callback?: (workItemTypeId: string) => void): void {
        const workItemType: ProcessContracts.CreateProcessWorkItemTypeRequest = {
            name: this._workItemType.name,
            inheritsFrom: this._workItemType.referenceName,
            color: this._workItemType.color,
            description: this._workItemType.description,
            icon: this._workItemType.icon,
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

    private _addFieldToProcess(workItemTypeId: string, callback?: (workItemTypeId: string, fieldId: string) => void): void {
        const addFieldToProcessPackage = this._buildAddFieldToProcessPackage();

        this.getProcessDefinitionsClient().createField(addFieldToProcessPackage, this._processId).then(
            (fieldResponse: ProcessDefinitionsContracts.FieldModel) => {
                this._fieldData.existingField = {
                    id: fieldResponse.id,
                    description: fieldResponse.description,
                    name: fieldResponse.name,
                    type: fieldResponse.type,
                    isIdentity: fieldResponse.type == ProcessContracts.FieldType.Identity,
                    url: fieldResponse.url
                };
                this._fieldData.name = fieldResponse.name;
                this._fieldData.type = fieldResponse.type;
                this._fieldData.description = fieldResponse.description;

                if ($.isFunction(callback)) {
                    callback(workItemTypeId, fieldResponse.id);
                }
            }, (fieldError) => {
                this._errorPanel.setMessage(fieldError.message);
                this.hideBusyOverlay();
            });
    }

    protected _addFieldToWorkItemType(workItemTypeId: string, fieldId: string, callback?: () => void): void {
        const addFieldToWorkItemTypePackage = this._buildAddFieldToWorkItemTypePackage(fieldId);
        this._options.beginAddFieldToWorkItemType(addFieldToWorkItemTypePackage, this._processId, workItemTypeId).then(
            (fieldResponse: ProcessContracts.ProcessWorkItemTypeField) => {
                if ($.isFunction(callback)) {
                    callback();
                }
            }, (fieldError) => {
                this._errorPanel.setMessage(fieldError.message);
                this.hideBusyOverlay();
            });
    }

    protected _addGroupWithControl(fieldToLayoutPackage: ProcessContracts.Control[]): void {
        const addGroupPackage: ProcessContracts.Group = {
            controls: fieldToLayoutPackage,
            id: null,
            label: this._groupNameInput.val(),
            order: null,
            overridden: null,
            inherited: null,
            visible: true,
            height: null,
            contribution: null,
            isContribution: false
        };

        Utils.getProcessClient().addGroup(
            addGroupPackage, this._processId, this._workItemType.referenceName, this._selectedPage.id, this._selectedSectionId).then(
                (group: ProcessContracts.Group) => {
                    this.onClose();
                    this._refresh(this._selectedPage.id, group ? group.id : null, group && group.controls.length === 1 ? group.controls[0].id : null);
                },
                (error) => {
                    this._errorPanel.setMessage(error.message);
                    this.hideBusyOverlay();
                });
    }

    protected _addFieldToLayout(workItemTypeId: string, fieldId: string): void {
        const addFieldToLayoutPackage = this._buildAddFieldToLayoutPackage(fieldId);

        if (this._fieldData.isVisibleOnForm) {
            if (this._fieldData.type === ProcessContracts.FieldType.Html) {
                this._addHtmlFieldGroupToLayout(addFieldToLayoutPackage);
            } else if (this._fieldData.groupId) {
                const fieldToLayout = () => {
                    Utils.getProcessClient().moveControlToGroup(addFieldToLayoutPackage, this._processId, workItemTypeId, this._fieldData.groupId, fieldId).then(
                        () => {
                            this.onClose();
                            this._refresh(this._selectedPage.id, this._fieldData.groupId, fieldId);
                        },
                        (error) => {
                            this._errorPanel.setMessage(error.message);
                            this.hideBusyOverlay();
                        });
                }
                if (this._isExistingGroup) {
                    fieldToLayout();
                } else {
                    this._addGroupWithControl([addFieldToLayoutPackage]);
                }
            }
            // If on new page, group id will be empty. Checking if create new group is selected
            else if (!this._isExistingGroup) {
                this._addGroupWithControl([addFieldToLayoutPackage]);
            } else {
                this.onClose();
                this._refresh(this._selectedPage.id, this._fieldData.groupId, fieldId);
            }
        } else {
            this.onClose();
            this._refresh(this._selectedPage.id, this._fieldData.groupId, fieldId);
        }
    }

    private _addHtmlFieldGroupToLayout(controlPackage: ProcessContracts.Control): void {
        const addGroupPackage = this._getAddHtmlGroupPackage(controlPackage);

        Utils.getProcessClient().addGroup(addGroupPackage, this._processId, this._workItemType.referenceName, this._selectedPage.id, this._selectedSectionId).then(
            (group: ProcessContracts.Group) => {
                this.onClose();
                this._refresh(this._selectedPage.id, group ? group.id : null, group && group.controls.length === 1 ? group.controls[0].id : null);
            },
            (error) => {
                this._errorPanel.setMessage(error.message);
                this.hideBusyOverlay();
            });
    }

    private _getAddHtmlGroupPackage(controlPackage: ProcessContracts.Control): ProcessContracts.Group {
        return {
            controls: [controlPackage],
            id: null,
            label: controlPackage.label,
            order: null,
            inherited: null,
            overridden: null,
            visible: true,
            contribution: null,
            height: null,
            isContribution: false
        };
    }

    public showError(message: string) {
        this._errorPanel.setMessage(message);
    }
}
