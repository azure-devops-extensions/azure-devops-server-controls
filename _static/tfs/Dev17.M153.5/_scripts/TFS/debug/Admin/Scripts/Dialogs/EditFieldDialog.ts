import * as AddFieldDialog from "Admin/Scripts/Dialogs/AddFieldDialog";
import * as Admin from "Admin/Scripts/TFS.Admin";
import * as AdminControlFactory from "Admin/Scripts/Common/ControlFactory";
import * as AdminDialogs from "Admin/Scripts/TFS.Admin.Dialogs";
import * as AdminDialogFieldContracts from "Admin/Scripts/TFS.Admin.Dialogs.FieldContracts";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import DeleteProcessLayoutNodeConfirmationDialog = require("Admin/Scripts/DeleteProcessLayoutNodeConfirmationDialog");
import * as WorkItemLayoutCommon from "Admin/Scripts/Common/WorkItemLayout.Common";
import * as ProcessDefinitionsContracts from "TFS/WorkItemTracking/ProcessDefinitionsContracts";
import * as ProcessContracts from "TFS/WorkItemTracking/ProcessContracts";
import * as ProcessHttpClient from  "TFS/WorkItemTracking/ProcessRestClient";
import { createEditFieldDefinitionLayout } from "Admin/Scripts/Dialogs/AddFieldDialogSections";
import * as AdminProcessCommon from "Admin/Scripts/TFS.Admin.Process.Common";
import * as AdminProcessContracts from "Admin/Scripts/Contracts/TFS.Admin.Process.Contracts";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as Dialogs from "VSS/Controls/Dialogs";
import * as Telemetry from "VSS/Telemetry/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import { Utils } from "Admin/Scripts/Common/Utils";
/**
 * Requests the users to edit an existing field
 */
export class EditFieldDialog extends AddFieldDialog.AddFieldDialog<AdminDialogFieldContracts.EditFieldDialogOptions> {

    protected _originalGroupId: string;
    protected _originalDescription: string;
    protected _originalLabel: string;
    protected _originalIsVisibleOnForm: boolean;
    protected _originalPickListValues: string[];
    protected _originalIsSuggestedValue: boolean;

    public initializeOptions(options?: AdminDialogFieldContracts.EditFieldDialogOptions): void {
        super.initializeOptions($.extend({
            dialogClass: "add-edit-field-dialog",
            buttons: {
                "ok": {
                    id: "ok",
                    text: AdminResources.Save,
                    click: () => {
                        this.onOkClick();
                    }
                },
                "close": {
                    id: "close",
                    text: AdminResources.Cancel,
                    click: () => { this.onClose(); }
                }
            },
            title: Utils_String.format(AdminResources.EditFieldIn, options.fieldData.name, options.workItemType.name),
            focusLayoutTab: options.isInherited,
            confirmUnsaveChanges: true,
        }, options));
    }

    public initialize() {
        super.initialize();
        // Disabling group combo and show form checkbox if the field is system core/inherited field
        if (this._options.disableGroup) {
            this.disableLayoutGroup();
        }
        if (this._options.isInherited) {
            this._fieldDescriptionInput.attr("disabled", "disabled");
            if (!this._options.hideLayoutTab && this._options.focusLayoutTab) {
                this._showFieldLayoutTab();
            }
        } else if (!AddFieldDialog.AddFieldDialog._processFieldHelper.isCustomField(this._fieldData.id)) {
            // Disable editing description on non-custom fields
            this._fieldDescriptionInput.attr("disabled", "disabled");
            if (!this._fieldData.description) {
                 // Clear the watermark telling users they can edit the value
                 Utils_UI.Watermark(this._fieldDescriptionInput, { watermarkText: "" });
            }
        } else {
            this._fieldDescriptionInput.focus();
        }
        // Limit the dialog size
        $(".ui-dialog-content").css("height", "490px");
    }

    public onOkClick() {
        const okAction: () => void = () => {
            if (!this._validate()) {
                return;
            }

            this.showLoading();
            const editFieldLayout: () => void = () => {
                if (this._fieldData.description && this._originalDescription !== this._fieldData.description) {
                    this._updateField(this.getWorkItemType().referenceName, this._fieldData.existingField.id, () => {
                        this._editFieldLayout(this.getWorkItemType().referenceName, this._fieldData.existingField.id);
                    });
                } else {
                    this._editFieldLayout(this.getWorkItemType().referenceName, this._fieldData.existingField.id);
                }
            };

            const performUpdate: () => void = () => {
                // For inherited field, adding the field to work item type doesn't make sense (since it's always there)
                // and actually causes a weird UI bug (delete shows up in the context menu)
                if (this._options.isInherited && !this.canEditFieldProperties()) {
                    editFieldLayout();
                    return;
                }

                this._addFieldToWorkItemType(this.getWorkItemType().referenceName, this._fieldData.existingField.id, () => {
                    editFieldLayout();
                });
            };

            if (this.getWorkItemType().customization === ProcessContracts.CustomizationType.System) {
                this._createChildWorkItemType(performUpdate);
            } else if (this._editingPicklist() && (!Utils_Array.arrayEquals(this._originalPickListValues || [],
                // Supply comparer (defaults to undefined otherwise)
                this._getPicklistControl().getPicklistElements(), (a, b) => a === b)
                || this._isSuggestedValueCheckbox.prop("checked") !== this._originalIsSuggestedValue)) {
                this._updateList(this._getPicklistControl().getPicklistElements(), performUpdate);
            } else {
                performUpdate();
            }
        };

        if (this._fieldData.isVisibleOnForm ||
            !this._fieldData.required ||
            this._fieldData.default.Value) {
            okAction();
        } else {
            let options: AdminDialogs.IConfirmRemoveDialogOptions;

            if (this._options.isInherited) {
                options = {
                    title: AdminResources.HideFieldFromLayoutDialogTitle,
                    okCallback: okAction,
                    dialogTextStrings: [
                        Utils_String.format(AdminResources.HideFieldFromLayoutDialogText1, this._fieldData.name, this._workItemType.name),
                        AdminResources.RemovingRequiredFieldWarningText],
                    successCallback: null,
                };
            } else {
                options = {
                    title: AdminResources.RemoveFieldFromLayoutDialogTitle,
                    okCallback: okAction,
                    dialogTextStrings: [
                        Utils_String.format(AdminResources.RemoveFieldFromLayoutDialogText1, this._fieldData.name, this._workItemType.name),
                        AdminResources.RemovingRequiredFieldWarningText, AdminResources.RemoveFieldFromLayoutDialogText2],
                    successCallback: null,
                };
            }

            Dialogs.show(DeleteProcessLayoutNodeConfirmationDialog, options);
        }
    }

    protected _addHelpText(): void {
        AdminControlFactory.createLearnMoreLinkBlock(this._fieldDefinitionLayout, AdminResources.LearnEditFieldLink, AdminResources.LearnEditFieldLinkTitle);
    }

    protected initializeData(): void {
        super.initializeData(false);
        this._fieldData = this._options.fieldData;
        this._originalDescription = this._fieldData.description || "";
        this._originalGroupId = this._fieldData.groupId || "";
        this._originalIsVisibleOnForm = this._fieldData.isVisibleOnForm;
        this._originalLabel = this._fieldData.label;
    }

    protected initializeTabs(): AdminDialogFieldContracts.AddEditFieldDialogTabItem[] {
        const tabItems = super.initializeTabs();
        this._definitionTab = tabItems[0];
        this._optionsTab = tabItems[1];
        this._layoutTab = tabItems[2];
        this._definitionTab.controls = "edit-field-definition-page";
        this._definitionTab.contents = createEditFieldDefinitionLayout();
        return tabItems;
    }

    private _editingPicklist(): boolean {
        return this._fieldData.pickListId && this._fieldData.pickListId !== Utils_String.EmptyGuidString;
    }

    protected _populateFieldDefinitionTab(): void {
        super._populateFieldDefinitionTab();

        if (this._editingPicklist()) {
            Utils.getProcessClient().getList(this._fieldData.pickListId).then((data) => {
                // Remember this so that list is only update if there is a change
                this._originalPickListValues = $.map(data.items, i => i);
                this._originalIsSuggestedValue = data.isSuggested;
                if (this._isSuggestedValueCheckbox) {
                    this._isSuggestedValueCheckbox.prop("checked", data.isSuggested);
                }
                const picklistControl = this._getPicklistControl();
                // Startup the picklist control with type and data from rest data

                picklistControl.initialize(data,
                    AddFieldDialog.AddFieldDialog._processFieldHelper.isNumericTypeForPicklist(this._fieldData.type));
                this._populateDefaultComboForPicklist(this._getPicklistControl().getPicklistElements());

                const defaultValue = this._fieldData.default.Value || "";
                picklistControl.setDefaultItem(defaultValue);
                this._defaultFieldValueCombo.setText(defaultValue);

                picklistControl.addListChangeListener(() => {
                    // Update default value dropdown
                    this._populateDefaultComboForPicklist(this._getPicklistControl().getPicklistElements());
                    this._setDefaultMark();
                });

                picklistControl.addListItemDeleteListener(() => {
                    // Clear the default value if it's deleted
                    this._populateDefaultComboForPicklist(this._getPicklistControl().getPicklistElements(), false);
                    this._validate();
                });

                this.updateOkButton(false);
            });
        }
    }

    protected _populateFieldOptionsTab(): void {
        super._populateFieldOptionsTab();

        if (this._options.isRequiredInParent) {
            this._requiredFieldCheckbox.unbind("change").prop("disabled", true);
        }
    }

    protected editFieldDefinitionEnabled(): boolean {
        return false;
    }

    protected validateAndUpdateFieldDefinitionUI(): boolean {
        return true;
    }

    private _updateField(workItemTypeId: string, fieldId: string, callback?: () => void): void {
        const updateFieldData: ProcessDefinitionsContracts.FieldUpdate = {
            id: fieldId,
            description: this._fieldData.description ? this._fieldData.description : this._originalDescription,
        };
        this.getProcessDefinitionsClient().updateField(updateFieldData, this.getProcessId()).then(
            () => {
                if ($.isFunction(callback)) {
                    callback();
                }
            },
            (fieldError) => {
                this.showError(fieldError.message);
                this.hideBusyOverlay();
            });
    }

    protected _editFieldLayout(workItemTypeId: string, fieldId: string): void {
        const onSuccess: () => void = () => {
            this.onClose();
            this._refresh(this._selectedPage.id, this._fieldData.groupId, fieldId);

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.AREA,
                Admin.CustomerIntelligenceConstants.Process.EDIT_FIELD_DIALOG,
                {
                    "event": "editFieldLayout",
                    "fieldName": this._fieldData.name,
                    "isExisting": this._fieldData.existing,
                    "workItemType": this._workItemType.name,
                    "labelChanged": this._fieldData.label !== this._originalLabel,
                    "isVisibleOnFormChanged": this._fieldData.isVisibleOnForm !== this._originalIsVisibleOnForm,
                }));
        };

        const onError: (err: TfsError) => void = error => {
            this.showError(error.message);
            this.hideBusyOverlay();
        };

        // Html fields are special, only one can live in a group, and the group is
        // tied to the field.  So if hiding the field, remove it and the group from
        // the layout, otherwise add the field and a new group to the layout.
        if (this._fieldData.type === ProcessContracts.FieldType.Html &&
            this._originalIsVisibleOnForm && !this._fieldData.isVisibleOnForm) {
            this._removeHtmlFieldGroupFromLayout(this._fieldData.groupId, onSuccess, onError);
        } else if (this._fieldData.type === ProcessContracts.FieldType.Html &&
            !this._originalIsVisibleOnForm && this._fieldData.isVisibleOnForm) {
            this._addFieldToLayout(workItemTypeId, fieldId);
        } else {
            // if the field's orginal group is not equal to the current group we know its a move operation
            // and not just an edit. We mark a flag to indicate if it a move or not so we can later decide to do
            // a patch operation or a put operation.
            // Or if users selects to create a new group then its a move operation
            let isMove = true;
            if (this._originalGroupId && Utils_String.equals(this._fieldData.groupId, this._originalGroupId, true) && this._isExistingGroup) {
                this._originalGroupId = "";
                isMove = false;
            }

            const editFieldLayoutPackage: ProcessContracts.Control = {
                order: null,
                label: this._fieldData.label,
                readOnly: false,
                visible: this._fieldData.isVisibleOnForm,
                controlType: null,
                id: fieldId,
                metadata: null,
                overridden: null,
                inherited: null,
                watermark: null,
                height: null,
                contribution: null,
                isContribution: false,
            };

            const moveFieldToNewGroup = (groupId) => {
                Utils.getProcessClient().removeControlFromGroup(
                    this.getProcessId(),
                    workItemTypeId,
                    groupId, fieldId).then(
                    () => {
                        this._addGroupWithControl([editFieldLayoutPackage]);
                    },
                    onError);
            };

            if (this._fieldData.groupId) {
                if (editFieldLayoutPackage.visible || this._options.isInherited) {
                    if (isMove) {
                        const moveFieldToGroup = () => {
                            Utils.getProcessClient().moveControlToGroup(
                                editFieldLayoutPackage,
                                this.getProcessId(),
                                workItemTypeId,
                                this._fieldData.groupId,
                                fieldId,
                                this._originalGroupId).then(
                                () => {
                                    this._onControlAddEdit(onSuccess, onError);
                                },
                                onError);
                        };
                        if (this._isExistingGroup) {
                            moveFieldToGroup();
                        } else {
                            moveFieldToNewGroup(this._fieldData.groupId);
                        }
                    } else {
                        Utils.getProcessClient().updateControl(editFieldLayoutPackage, this.getProcessId(),
                            workItemTypeId, this._fieldData.groupId, fieldId).then(() => {
                                this._onControlAddEdit(onSuccess, onError);
                            }, onError);
                    }
                } else {
                    Utils.getProcessClient().removeControlFromGroup(this.getProcessId(), workItemTypeId, this._fieldData.groupId, fieldId).then(onSuccess, onError);
                }
            } else if (this._originalGroupId && !this._isExistingGroup) {
                // When moving a field to empty page
                moveFieldToNewGroup(this._originalGroupId);
            }
            // At this stage, this is not a move operation. The field is edited from fields view and added to layout
            else if (!this._isExistingGroup) {
                this._addGroupWithControl([editFieldLayoutPackage]);
            } else {
                this.onClose();
                this._options.refresh(this._selectedPage.id, this._fieldData.groupId, fieldId);
            }
        }
    }

    private _onControlAddEdit(onSuccess: () => void, onError: (error) => void): void {
        if (this._fieldData.type === ProcessContracts.FieldType.Html) {
            let editGroupPackage: ProcessContracts.Group = {
                controls: null,
                id: this._fieldData.groupId,
                label: this._fieldData.groupName,
                order: null,
                overridden: null,
                inherited: null,
                visible: true,
                contribution: null,
                isContribution: false,
                height: null,
            };
            // move group if we are moving html field to a different page
            if (this._options.page.id != this._selectedPage.id) {
                Utils.getProcessClient().moveGroupToPage(
                    editGroupPackage,
                    this._processId,
                    this._workItemType.referenceName,
                    this._selectedPage.id,
                    this._selectedSectionId,
                    this._fieldData.groupId,
                    this._options.page.id,
                    this._options.sectionId).then(
                    onSuccess, onError);
            } else if (this._options.sectionId != this._selectedSectionId) {
                Utils.getProcessClient().moveGroupToSection(
                    editGroupPackage,
                    this._processId,
                    this._workItemType.referenceName,
                    this._selectedPage.id,
                    this._selectedSectionId,
                    this._fieldData.groupId,
                    this._options.sectionId).then(
                    onSuccess, onError);
            } else {
                onSuccess();
            }
        } else {
            onSuccess();
        }
    }

    private _removeHtmlFieldGroupFromLayout(groupId: string, onSuccess: () => void, onError: (error) => void): void {
        Utils.getProcessClient().removeGroup(
            this._processId, this._workItemType.referenceName, this._selectedPage.id, WorkItemLayoutCommon.GroupSectionConstants.SECTIONS[0].id, groupId).then(
            onSuccess,
            onError);
    }

    protected _updateList(values: string[], callback: () => void): void {
        // Check that the current default value is valid before attempting to save
        if (this._fieldData.default.Value && !Utils_Array.arrayContains(this._fieldData.default.Value, values, (a, b) => { return a == b })) {
            this.showError(Utils_String.format(AdminResources.AddFieldDialog_InvalidPicklistDefaultValue, this._fieldData.default.Value));
            this.hideBusyOverlay();
            return;
        }

        const payload: ProcessContracts.PickList = {
            id: this._fieldData.pickListId,
            name: null, // Pass null to indicate no change. Picklist name should never change in the admin UI (only possible through REST). - Bug #532099
            type: null, // type should never change
            items: values,
            isSuggested: this._isSuggestedValueCheckbox ? this._isSuggestedValueCheckbox.prop("checked") : false,
            url: null,
        };
        Utils.getProcessClient().updateList(payload, this._fieldData.pickListId).then(
            callback, (error) => {
                this.showError(error.message);
                this.hideBusyOverlay();
            });
    }
}

export class EditFieldDialogHelper {
    public static EditField(
        processFieldHelper: AdminProcessCommon.ProcessFieldHelper,
        dataProvider: AdminProcessCommon.IProcessDataProvider,
        process: AdminProcessCommon.ProcessDescriptorViewModel,
        workItemType: ProcessContracts.ProcessWorkItemType,
        allProcessFields: AdminProcessContracts.ProcessDefinitionFieldUsageData,
        field: AdminProcessContracts.ProcessField,
        hideLayoutTab: boolean,
        tfsContext: TFS_Host_TfsContext.TfsContext,
        addHistoryPoint: (data: any) => void,
        refresh: (process: AdminProcessCommon.ProcessDescriptorViewModel,
            workItemType: ProcessContracts.ProcessWorkItemType,
            selectedFieldId?: string) => void,
        beginAddFieldToWorkItemType: (
            field: ProcessContracts.ProcessWorkItemTypeField,
            processId: string,
            witRefName: string) => IPromise<ProcessContracts.ProcessWorkItemTypeField>
    ): void {

        const defaultValue = processFieldHelper.getDefaultValue(field, workItemType).Value;
        var existingField: AdminDialogFieldContracts.Field = {
            id: field.Id,
            name: field.Name,
            type: ProcessContracts.FieldType[field.Type],
            description: processFieldHelper.getDescription(field, workItemType),
            url: null,
            isIdentity: ProcessContracts.FieldType[field.Type] == ProcessContracts.FieldType.Identity,
            isReadOnly: processFieldHelper.getIsReadOnly(field, workItemType),
            isRequired: processFieldHelper.getIsRequired(field, workItemType),
            defaultValue: defaultValue,
            addedToWIT: true
        };
        var fieldLabel = "";
        var groupId = "";
        var groupName = "";
        var selectedpage: ProcessContracts.Page = null;
        var sectionId: string = "";
        var isControlVisible: boolean = false;
        var isControlFromParentLayout: boolean = false;

        $.each(workItemType.layout.pages, (i, page) => {
            $.each(page.sections, (j, section) => {
                $.each(section.groups, (k, group) => {
                    $.each(group.controls, (k, control) => {
                        if (control.id === field.Id) {
                            fieldLabel = control.label;
                            groupId = group.id;
                            groupName = group.label;
                            isControlVisible = control.visible;
                            isControlFromParentLayout = control.inherited === true;
                            selectedpage = page;
                            sectionId = section.id;
                            return;
                        }
                    });
                });
            });
        });

        var fieldData: AdminDialogFieldContracts.FieldData = {
            id: field.Id,
            name: field.Name,
            type: ProcessContracts.FieldType[field.Type],
            existing: true,
            label: fieldLabel === "" ? field.Name : fieldLabel,
            description: processFieldHelper.getDescription(field, workItemType),
            required: processFieldHelper.getIsRequired(field, workItemType),
            default: processFieldHelper.getDefaultValue(field, workItemType),
            groupId: groupId,
            groupName: groupName,
            existingField: existingField,
            isVisibleOnForm: isControlVisible,
            pickListId: field.PickListId,
            allowGroups: processFieldHelper.getAllowGroups(field, workItemType)
        };

        var oldWorkItemTypeId = workItemType.referenceName;
        var options: AdminDialogFieldContracts.EditFieldDialogOptions = {
            workItemType: workItemType,
            allProcessFields: allProcessFields,
            processId: process.processTypeId,
            processName: process.name,
            processRefName: process.refName,
            fieldData: fieldData,
            refresh: (fieldId: string) => {
                dataProvider.invalidateCache(process.processTypeId);
                if (workItemType.referenceName !== oldWorkItemTypeId) {
                    addHistoryPoint({ type: workItemType.referenceName });
                }
                refresh(process, workItemType, fieldId);
            },
            tfsContext: tfsContext,
            // Disable group combo and show form checkbox disabled if the field is inherited
            disableGroup: isControlFromParentLayout,
            // Define whether this is a system field
            isInherited: processFieldHelper.isInheritedField(field, workItemType),
            isRequiredInParent: processFieldHelper.isRequiredInParent(field, workItemType),
            page: selectedpage,
            sectionId: sectionId,
            hideLayoutTab: hideLayoutTab,
            beginAddFieldToWorkItemType: beginAddFieldToWorkItemType
        };
        Dialogs.show(EditFieldDialog, options);
    }
}