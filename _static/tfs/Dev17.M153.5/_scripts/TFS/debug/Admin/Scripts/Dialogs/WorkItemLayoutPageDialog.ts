import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import AdminCommonBowtieControls = require("Admin/Scripts/Common/BowtieControls");
import AdminCommonLoadingOverlay = require("Admin/Scripts/Common/LoadingOverlay");
import AdminControlFactory = require("Admin/Scripts/Common/ControlFactory");
import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import Diag = require("VSS/Diag");
import Notifications = require("VSS/Controls/Notifications");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");
import Utils_String = require("VSS/Utils/String");
import WorkItemDialogBase = require("Admin/Scripts/Dialogs/WorkItemDialogBase");
import WorkItemLayoutCommon = require("Admin/Scripts/Common/WorkItemLayout.Common");
import { Utils } from "Admin/Scripts/Common/Utils";
export interface IPageData {
    pageLabel: string;
    pageId: string;
    numSections: number;
    order?: number;
}

export interface IWorkItemLayoutPageDialogOptions extends WorkItemDialogBase.IWorkItemDialogBaseOptions<IPageData> {
    workItemType: ProcessContracts.ProcessWorkItemType;
    processId: string;
    pageData?: IPageData;
}

/**
 *  Dialog for displaying and editing a work item layout page
 */
export class WorkItemLayoutPageDialog extends WorkItemDialogBase.WorkItemDialogBase<IPageData, IWorkItemLayoutPageDialogOptions> {
    public static NAME_CONTROL_ID = "ae-page-name";

    protected _pageNameControl: AdminCommonBowtieControls.ComboWithErrorMessage;

    private _isEditMode: boolean;

    constructor(options?: IWorkItemLayoutPageDialogOptions) {
        super(options);
    }

    public get isEditMode(): boolean {
        return this._isEditMode;
    }

    public initializeOptions(options?: IWorkItemLayoutPageDialogOptions): void {
        var that = this;

        this._isEditMode = options != null && options.mode === WorkItemDialogBase.WorkItemDialogBaseMode.Edit;
        var model = options.model;

        if (this._isEditMode) {
            Diag.Debug.assert(model != null, "Model should be specified for edit mode");
        } else {
            Diag.Debug.assert(model == null, "Model should not be specified for add mode");
        }
        Diag.Debug.assert(options != null && options.workItemType != null, "Work item type should be provided");

        var title = Utils_String.format(AdminResources.AddAPageTo, options.workItemType.name);
        var okText = AdminResources.AddPage;
        if (this.isEditMode) {
            okText = AdminResources.Save;
            title = Utils_String.format(AdminResources.EditPage, options.model.pageLabel, options.workItemType.name);
        } else {
            model = <IPageData>{
                pageLabel: '',
                pageId: '',
                numSections: WorkItemLayoutCommon.GroupSectionConstants.SECTIONS.length
            };
        }

        var newOptions = $.extend(<WorkItemDialogBase.IWorkItemDialogBaseOptions<IPageData>>{
            title: title,
            subtitle: this.isEditMode ? AdminResources.PageLayoutEditDescription : AdminResources.PageLayoutDescription,
            okText: okText,
            cancelText: AdminResources.Cancel,
            minHeight: 280,
            minWidth: 520,
            resizable: false,
            model: model,
            confirmUnsaveChanges: this.isEditMode
        }, options);
        newOptions.okCallback = (
            dialog: WorkItemLayoutPageDialog,
            value: IPageData,
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

    public initialize(): void {
        super.initialize();
        this._initializeInternal();
    }

    /**
     * Internal initialize method
     * Override for testing
     */
    protected _initializeInternal() {
        var that = this;
        this._pageNameControl = AdminControlFactory.createTextInput(
            this._$contentContainerElement,
            WorkItemLayoutPageDialog.NAME_CONTROL_ID,
            AdminResources.Name,
            WorkItemLayoutCommon.Constants.MAX_PAGE_NAME_LENGTH,
            newValue => {
                that._pageNameControl.setErrorMessage('');
                that._model.pageLabel = newValue;
                that.updateOkButton();
            });
        this._pageNameControl.setText(this._model.pageLabel);

        this._registerIErrorMessageControl(this._pageNameControl);

        AdminControlFactory.createLearnMoreLinkBlock(
            this._$contentContainerElement,
            this.isEditMode ? AdminResources.EditPageLearnMoreLink : AdminResources.AddPageLearnMoreLink,
            this.isEditMode ? AdminResources.EditPageLearnMoreLinkTitle : AdminResources.AddPageLearnMoreLinkTitle);
        this.setInitialFocus();
    }

    protected _validate(model: IPageData): boolean {
        return !this._pageNameControl.setErrorMessage(this._validatePageName(this._model.pageLabel, this._getUsedPages()));
    }

    private _validatePageName(name: string, usedPages: IDictionaryStringTo<ProcessContracts.Page>): string {
        const trimmedValue = AdminCommon.trim(name);
        if (trimmedValue === Utils_String.empty) {
            return AdminResources.PageNameRequired;
        }

        if (usedPages[trimmedValue.toLowerCase()] && !Utils_String.equals(this._originalModel.pageLabel, trimmedValue, true)) {
            return AdminResources.PageNameAlreadyAdded;
        }

        if (!AdminCommon.AdminUIHelper.isPageNameValid(trimmedValue)) {
            return AdminResources.PageIllegalCharacters;
        }

        return null;
    }

    private _getUsedPages(): IDictionaryStringTo<ProcessContracts.Page> {
        var usedPages: IDictionaryStringTo<ProcessContracts.Page> = {};
        $.each(this._options.workItemType.layout.pages, (i, page) => {
            usedPages[page.label.toLowerCase()] = page;
        });

        return usedPages;
    }

    /** creates or modifies the group */
    private _okCallback(callback: (succeeded: boolean) => void): void {
        // overlay and spinner are automatically turned on by base class
        // ok button is automatically disabled by base class

        var applyPageAddOrEditAction = () => {
            if (this._isEditMode) {
                this._updatePage(callback);
            } else {
                this._addPageToLayout(callback);
            }
        };

        if (this._options.workItemType.customization !== ProcessContracts.CustomizationType.System) {
            applyPageAddOrEditAction();
        }
        else {
            this._createChildWorkItemType(succeeded => {
                if (succeeded) {
                    applyPageAddOrEditAction();
                    return;
                }

                callback(false);
            });
        }
    }

    private _createChildWorkItemType(callback: (succeeded: boolean) => void): void {
        var that = this;
        const workItemType: ProcessContracts.CreateProcessWorkItemTypeRequest = {
            color: this._options.workItemType.color,
            description: this._options.workItemType.description,
            name: this._options.workItemType.name,
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

    private _addPageToLayout(callback: (succeeded: boolean) => void): void {
        var that = this;
        var addPageData = this._createAddPageRequestData();

        Utils.getProcessClient().addPage(addPageData, this._options.processId, this._options.workItemType.referenceName).then(
            (page: ProcessContracts.Page) => {
                if (page) {
                    this._model.pageId = page.id;
                }
                callback(true);
            },
            (error) => {
                that._errorMessageArea.setMessage(error.message);
                callback(false);
            });
    }

    private _updatePage(callback: (succeeded: boolean) => void): void {
        var that = this;
        var editPageData = this._createEditPageRequestData();

        Utils.getProcessClient().updatePage(editPageData, this._options.processId, this._options.workItemType.referenceName).then(
            (page: ProcessContracts.Page) => {
                if (page) {
                    this._model.pageId = page.id;
                }
                callback(true);
            },
            (error) => {
                that._errorMessageArea.setMessage(error.message);
                callback(false);
            });
    }

    private _createAddPageRequestData(): ProcessContracts.Page {
        return <ProcessContracts.Page>{
            sections: WorkItemLayoutCommon.GroupSectionConstants.SECTIONS.map(section =>
                <ProcessContracts.Section>{
                    id: section.id,
                    groups: [],
                    overridden: false
                }),
            id: this._model.pageId,
            label: this._model.pageLabel,
            order: null,
            overridden: null,
            inherited: null,
            visible: true,
            locked: false,
            pageType: ProcessContracts.PageType.Custom,
            contribution: null
        };
    }

    private _createEditPageRequestData(): ProcessContracts.Page {
        return <ProcessContracts.Page>{
            sections: null,
            id: this._model.pageId,
            label: this._model.pageLabel,
            order: this._model.order,
            overridden: null,
            inherited: null,
            visible: null,
            locked: false,
            pageType: ProcessContracts.PageType.Custom,
            contribution: null
        };
    }
}