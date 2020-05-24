import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import AdminCommonBowtieControls = require("Admin/Scripts/Common/BowtieControls");
import AdminCommonLoadingOverlay = require("Admin/Scripts/Common/LoadingOverlay");
import AdminCommonRadioSelection = require("Admin/Scripts/Common/RadioSelection");
import AdminControlFactory = require("Admin/Scripts/Common/ControlFactory");
import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import Diag = require("VSS/Diag");
import Notifications = require("VSS/Controls/Notifications");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import WorkItemDialogBase = require("Admin/Scripts/Dialogs/WorkItemDialogBase");
import WorkItemLayoutCommon = require("Admin/Scripts/Common/WorkItemLayout.Common");
import { Utils } from "Admin/Scripts/Common/Utils";

export interface IGroupData {
    id?: string;
    name: string;
    existing: boolean;
    sectionId: string;
}

export interface IWorkItemLayoutGroupDialogOptions extends WorkItemDialogBase.IWorkItemDialogBaseOptions<IGroupData> {
    workItemType: ProcessContracts.ProcessWorkItemType;
    processId: string;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    disableColumn?: boolean;
    page: ProcessContracts.Page;
}

/**
 *  Dialog for displaying and editing a work item layout group
 */
export class WorkItemLayoutGroupDialog
    extends WorkItemDialogBase.WorkItemDialogBase<IGroupData, IWorkItemLayoutGroupDialogOptions> {

    public static NAME_CONTROL_ID = "ae-group-name";
    public static PAGE_CONTROL_ID = "ae-group-page";
    public static COLUMN_CONTROL_ID = "ae-group-column";

    protected _groupNameControl: AdminCommonBowtieControls.ComboWithErrorMessage;
    protected _groupPageControl: AdminCommonBowtieControls.ComboWithErrorMessage;
    protected _columnControl: AdminCommonRadioSelection.RadioSelection<WorkItemLayoutCommon.ISectionData>;

    private _isEditMode: boolean;
    private _selectedPage: ProcessContracts.Page;
    private _pages: ProcessContracts.Page[];

    constructor(options?: IWorkItemLayoutGroupDialogOptions) {
        super(options);
    }

    public get isEditMode(): boolean {
        return this._isEditMode;
    }

    public get selectedPageId(): string {
        return this._selectedPage.id;
    }

    public initializeOptions(options?: IWorkItemLayoutGroupDialogOptions) {
        var that = this;

        this._isEditMode = options && options.mode === WorkItemDialogBase.WorkItemDialogBaseMode.Edit;
        var model = options.model;

        if (this._isEditMode) {
            Diag.Debug.assert(model != null, "Model should be specified for edit mode");
        } else {
            Diag.Debug.assert(model == null, "Model should not be specified for add mode");
        }
        Diag.Debug.assert(options != null && options.workItemType != null, "Work item type should be provided");

        var title = Utils_String.format(AdminResources.AddAGroupTo, options.workItemType.name);
        var okText = AdminResources.AddGroup;
        if (this.isEditMode) {
            okText = AdminResources.Save;
            title = Utils_String.format(AdminResources.EditGroup, options.model.name, options.workItemType.name);
        } else {
            model = <IGroupData>{
                name: '',
                existing: true,
                sectionId: WorkItemLayoutCommon.GroupSectionConstants.SECTIONS[0].id // new group defaults to first layout section
            };
        }

        var newOptions = $.extend(<WorkItemDialogBase.IWorkItemDialogBaseOptions<IGroupData>>{
            title: title,
            subtitle: AdminResources.GroupLayoutDescription,
            okText: okText,
            cancelText: AdminResources.Cancel,
            height: 700,
            minHeight: 700,
            minWidth: 550,
            resizable: false,
            model: model,
            confirmUnsaveChanges: this.isEditMode
        }, options);
        newOptions.okCallback = (
            dialog: WorkItemLayoutGroupDialog,
            value: IGroupData,
            loadOverlay: AdminCommonLoadingOverlay.ILoadingOverlay,
            errorMessageArea: Notifications.MessageAreaControl,
            succeeded: boolean) => {
            that._okCallback(addOrEditSucceeded => {
                if ($.isFunction(options.okCallback)) {
                    options.okCallback(dialog, value, loadOverlay, errorMessageArea, addOrEditSucceeded);
                }

                that._loadingOverlay.hide();
                if (addOrEditSucceeded) {
                    that.close();
                }
            });
        };

        super.initializeOptions(newOptions);
    }

    public initialize() {
        super.initialize();
        this._initializeInternal();
    }

    /**
     * Internal initialize method
     * Override for testing
     */
    protected _initializeInternal() {
        var that = this;
        var tfsContext = this._options.tfsContext;
        this._selectedPage = this._options.page;
        this._pages = AdminProcessCommon.ProcessLayoutHelpers.getPages(this._options.workItemType.layout, false);

        this._groupNameControl = AdminControlFactory.createTextInput(
            this._$contentContainerElement,
            WorkItemLayoutGroupDialog.NAME_CONTROL_ID,
            AdminResources.Name,
            WorkItemLayoutCommon.Constants.MAX_GROUP_NAME_LENGTH,
            newValue => {
                that._groupNameControl.setErrorMessage('');
                that._model.name = newValue;
                that.updateOkButton();
            });
        this._groupNameControl.setText(this._model.name);

        this._groupPageControl = AdminControlFactory.createCombo(
            this._$contentContainerElement,
            WorkItemLayoutGroupDialog.PAGE_CONTROL_ID,
            AdminResources.Page,
            (newValue, newIndex) => {
                that._groupPageControl.setErrorMessage('');
                that._selectedPage = that._pages[newIndex];
                that.updateOkButton();
            },
            this._pages.map(p => p.label),
            this._options.page.label
        );
        this._groupPageControl.setEnabled(!this._options.disableColumn);

        this._columnControl = AdminControlFactory.createRadioSelection<WorkItemLayoutCommon.ISectionData>(
            this._$contentContainerElement,
            AdminResources.SelectColumnForGroup,
            <AdminCommonRadioSelection.IRadioSelectionOptions<WorkItemLayoutCommon.ISectionData>>{
                id: WorkItemLayoutGroupDialog.COLUMN_CONTROL_ID,
                groupName: WorkItemLayoutCommon.GroupSectionConstants.RADIO_BUTTON_NAME,
                change: newValue => {
                    that._model.sectionId = newValue.id;
                    that.updateOkButton();
                },
                disabled: this._options.disableColumn,
                selections: WorkItemLayoutCommon.GroupSectionConstants.SECTIONS,
                defaultSelection: Utils_Array.first(WorkItemLayoutCommon.GroupSectionConstants.SECTIONS, s => s.id === this._model.sectionId),
                selectionHtmlFactory: (selection: WorkItemLayoutCommon.ISectionData, inputHtml: string) => {
                    return `<label for="${selection.imageId}">${inputHtml}
                            <img id="${selection.imageId}"
                                 src="${tfsContext.configuration.getResourcesFile(selection.imageFileName)}" 
                                 alt="${selection.altText}"/>
                            </label>`;
                },
                selectionIdGetter: (selection) => selection.imageId,
                selectionAriaLabelGetter: (selection) => selection.ariaLabel
            }
        );

        this._registerIErrorMessageControl(this._groupNameControl);
        this._registerIErrorMessageControl(this._groupPageControl);

        AdminControlFactory.createLearnMoreLinkBlock(
            this._$contentContainerElement,
            this.isEditMode ? AdminResources.EditGroupLearnMoreLink : AdminResources.AddGroupLearnMoreLink,
            this.isEditMode ? AdminResources.EditGroupLearnMoreLinkTitle : AdminResources.AddGroupLearnMoreLinkTitle
        );
        this.setInitialFocus();
    }

    protected _validate(model: IGroupData): boolean {
        return !this._groupNameControl.setErrorMessage(this._validateGroupName(this._model.name, this._getUsedGroups(this._selectedPage))) &&
            !this._groupPageControl.setErrorMessage(AdminResources.AddGroupDialog_PageRequired, this._groupPageControl.getText().length === 0);
    }

    private _validateGroupName(name: string, usedGroups: IDictionaryStringTo<ProcessContracts.Group>): string {
        const trimmedVal = AdminCommon.trim(name);

        if (trimmedVal === Utils_String.empty) {
            return AdminResources.GroupNameRequired;
        }

        if (usedGroups[trimmedVal.toLowerCase()] &&
            (!Utils_String.equals(this._selectedPage.id, this._options.page.id, true) ||
                !Utils_String.equals(this._originalModel.name, trimmedVal, true))) {
            return AdminResources.GroupNameAlreadyAdded;
        }

        if (!AdminCommon.AdminUIHelper.isGroupNameValid(trimmedVal)) {
            return AdminResources.GroupIllegalCharacters;
        }

        return null;
    }

    private _getUsedGroups(selectedPage: ProcessContracts.Page): IDictionaryStringTo<ProcessContracts.Group> {
        var usedGroups: IDictionaryStringTo<ProcessContracts.Group> = {};
        $.each(selectedPage.sections, (j, section) => {
            $.each(section.groups, (k, group: ProcessContracts.Group) => {
                // storing only groups that can have children
                if (!AdminProcessCommon.ProcessLayoutHelpers.isSealedGroup(group)) {
                    usedGroups[group.label.toLowerCase()] = group;
                }
            });
        });

        return usedGroups;
    }

    /** creates or modifies the group */
    private _okCallback(callback: (succeeded: boolean) => void): void {
        // overlay and spinner are automatically turned on by base class
        // ok button is automatically disabled by base class

        var applyGroupAddOrEditAction = () => {
            if (this.isEditMode) {
                this._updateGroup(callback);
            } else {
                this._addGroupToLayout(callback);
            }
        };

        if (this._options.workItemType.customization !== ProcessContracts.CustomizationType.System) {
            applyGroupAddOrEditAction();
        }
        else {
            this._createChildWorkItemType(succeeded => {
                if (succeeded) {
                    applyGroupAddOrEditAction();
                    return;
                }

                callback(false);
            });
        }
    }

    private _createChildWorkItemType(callback: (succeeded: boolean) => void): void {
        var that = this;
        const workItemType: ProcessContracts.CreateProcessWorkItemTypeRequest = {
            name: this._options.workItemType.name,
            color: this._options.workItemType.color,
            description: this._options.workItemType.description,
            icon: this._options.workItemType.icon,
            inheritsFrom: this._options.workItemType.referenceName,
            isDisabled: this._options.workItemType.isDisabled
        }


        Utils.getProcessClient().createProcessWorkItemType(workItemType, this._options.processId).then(
            (witResponse: ProcessContracts.ProcessWorkItemType) => {
                // store the child work item type in case one of the later REST calls fail
                this._options.workItemType.referenceName = witResponse.referenceName;
                this._options.workItemType.name = witResponse.name;
                this._options.workItemType.description = witResponse.description;
                this._options.workItemType.inherits = witResponse.inherits;
                this._options.workItemType.customization = witResponse.customization;
                callback(true);
            },
            (error) => {
                that._errorMessageArea.setMessage(error.message);
                callback(false);
            });
    }

    private _addGroupToLayout(callback: (succeeded: boolean) => void): void {
        var that = this;
        var addGroupData = this._createAddGroupRequestData();

         Utils.getProcessClient().addGroup(
            addGroupData, this._options.processId, this._options.workItemType.referenceName, this._selectedPage.id, this._model.sectionId).then(
                (group: ProcessContracts.Group) => {
                    if (group) {
                        this._model.id = group.id;
                    }
                    callback(true);
                },
                (error) => {
                    that._errorMessageArea.setMessage(error.message);
                    callback(false);
                });
    }

    private _updateGroup(callback: (succeeded: boolean) => void): void {
        var groupMovedBetweenPage = !Utils_String.equals(this._selectedPage.id, this._options.page.id, true);
        var groupMovedWithinPage = !Utils_String.equals(this._model.sectionId, this._originalModel.sectionId, true);
        if (groupMovedWithinPage || groupMovedBetweenPage) {
            this._editAndMoveGroup(groupMovedBetweenPage, callback);
        }
        else {
            this._editGroup(callback);
        }
    }

    private _editGroup(callback: (succeeded: boolean) => void): void {
        var that = this;
        var editGroupData = this._createEditGroupRequestData();

        Utils.getProcessClient().updateGroup(
            editGroupData, this._options.processId, this._options.workItemType.referenceName, this._selectedPage.id, this._model.sectionId, this._model.id)
            .then(
                (group: ProcessContracts.Group) => {
                    if (group) {
                        this._model.id = group.id;
                    }
                    callback(true);
                },
                (error) => {
                    that._errorMessageArea.setMessage(error.message);
                    callback(false);
                });
    }

    private _editAndMoveGroup(movedBetweenPages: boolean, callback: (succeeded: boolean) => void): void {
        var that = this;
        var editGroupPackage = this._createEditGroupRequestData();

        if (movedBetweenPages) {
            Utils.getProcessClient().moveGroupToPage(
                editGroupPackage,
                this._options.processId,
                this._options.workItemType.referenceName,
                this._selectedPage.id,
                this._model.sectionId,
                this._model.id,
                this._options.page.id,
                this._originalModel.sectionId)
                .then(
                    (group: ProcessContracts.Group) => {
                        if (group) {
                            this._model.id = group.id;
                        }
                        callback(true);
                    },
                    (error) => {
                        that._errorMessageArea.setMessage(error.message);
                        callback(false);
                    });
        }
        else {
            Utils.getProcessClient().moveGroupToSection(
                editGroupPackage,
                this._options.processId,
                this._options.workItemType.referenceName,
                this._selectedPage.id,
                this._model.sectionId,
                this._model.id,
                this._originalModel.sectionId)
                .then(
                    (group: ProcessContracts.Group) => {
                        if (group) {
                            this._model.id = group.id;
                        }
                        callback(true);
                    },
                    (error) => {
                        that._errorMessageArea.setMessage(error.message);
                        callback(false);
                    });
        }
    }

    private _createAddGroupRequestData(): ProcessContracts.Group {
        return <ProcessContracts.Group>{
            controls: null,
            id: null,
            label: this._model.name,
            order: null,
            overridden: null,
            inherited: null,
            visible: true
        };
    }

    private _createEditGroupRequestData(): ProcessContracts.Group {
        var data = this._createAddGroupRequestData();
        data.id = this._model.id;
        data.visible = null;
        return data;
    }
}
