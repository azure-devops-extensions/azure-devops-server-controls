import AdminControlFactory = require("Admin/Scripts/Common/ControlFactory");
import AdminCommonRadioSelection = require("Admin/Scripts/Common/RadioSelection");
import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import Menus = require("VSS/Controls/Menus");
import Notifications = require("VSS/Controls/Notifications");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import WorkItemBacklogsCommon = require("Admin/Scripts/Common/WorkItemBacklogs.Common");
import WorkItemPanelBase = require("Admin/Scripts/Panels/WorkItemPanelBase");
import { Utils } from "Admin/Scripts/Common/Utils";

import delegate = Utils_Core.delegate;

export interface IWorkItemTypeBacklogsPanelOptions extends
    WorkItemPanelBase.IWorkItemPanelBaseOptions, AdminProcessCommon.ProcessControlOptions.WorkItemType {
    processDescriptor: AdminProcessCommon.ProcessDescriptorViewModel;
    getFieldName: (fieldId: string) => string;
    getBehaviors: () => ProcessContracts.ProcessBehavior[];
    navigateToLayout: (message: string) => void;
    saveSucceeded?: () => void;
}

export class WorkItemTypeBacklogsPanel extends WorkItemPanelBase.WorkItemPanelBase<IWorkItemTypeBacklogsPanelOptions> {
    public static PANEL_CLASS_NAME = "wit-backlogs-panel";

    public static BACKLOG_SELECTION_CONTROL_ID = "wit-backlogs-name";
    public static SAVE_BUTTON_ID = "wit-backlogs-save";
    public static NULL_WIT_BEHAVIOR = <ProcessContracts.WorkItemTypeBehavior>{ behavior: { id: null } }; // null object for don't show

    protected _originalModel: ProcessContracts.WorkItemTypeBehavior;
    protected _originalSelection: WorkItemBacklogsCommon.IBacklogSelectionData;
    protected _model: ProcessContracts.WorkItemTypeBehavior;
    protected _backlogs: WorkItemBacklogsCommon.IBacklogSelectionData[];
    protected _backlogSelectionControl: AdminCommonRadioSelection.RadioSelection<WorkItemBacklogsCommon.IBacklogSelectionData>;

    private _processDescriptor: AdminProcessCommon.ProcessDescriptorViewModel;
    private _workItemType: ProcessContracts.ProcessWorkItemType;
    private _hadError: boolean;
    private _currentChangeMessages: WorkItemBacklogsCommon.IChangeMessages;
    private _$changeInfoContentBlock: JQuery;

    constructor(options: IWorkItemTypeBacklogsPanelOptions) {
        super(options);
    }

    public initializeOptions(options?: IWorkItemTypeBacklogsPanelOptions) {
        options = $.extend(
            <WorkItemPanelBase.IWorkItemPanelBaseOptions>{
                className: WorkItemTypeBacklogsPanel.PANEL_CLASS_NAME
            },
            options);

        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this._initializeInternal(this._options.processDescriptor, this._options.workItemType);
    }

    /**
     * Internal initialize method
     * Override for testing
     */
    protected _initializeInternal(
        processDescriptor: AdminProcessCommon.ProcessDescriptorViewModel, workItemType: ProcessContracts.ProcessWorkItemType) {

        var that = this;
        var saveSucceeded = $.isFunction(this._options.saveSucceeded) ? this._options.saveSucceeded : () => { };
        this._addToolbar(<Menus.IMenuItemSpec[]>[
            {
                id: WorkItemTypeBacklogsPanel.SAVE_BUTTON_ID,
                disabled: true,
                icon: "bowtie-icon bowtie-save",
                text: AdminResources.Save,
                title: AdminResources.Save,
                action: () => that._handleBacklogSave(saveSucceeded)
            }]);

        this._hadError = false;
        this._$changeInfoContentBlock = $('<div>');
        this.refresh(processDescriptor, workItemType);
    }

    public refresh(
        processDescriptor: AdminProcessCommon.ProcessDescriptorViewModel, workItemType: ProcessContracts.ProcessWorkItemType) {
        var that = this;

        this._clearMessageBanners();
        // refresh only for the first time or whenever there was an error or current work item/process changes (this will prevent reloading)
        if (!this._hadError && this._processDescriptor != null && this._workItemType != null &&
            this._processDescriptor.processTypeId === processDescriptor.processTypeId && this._workItemType.referenceName === workItemType.referenceName) {
            // make sure we have the latest data
            this._processDescriptor = processDescriptor;
            this._workItemType = workItemType;

            this.setFieldsEnabled(workItemType.customization === ProcessContracts.CustomizationType.Custom);
            this._resetValues();
            return;
        }
        this._hadError = false;
        this._processDescriptor = processDescriptor;
        this._workItemType = workItemType;

        this._clearContent(); // clear for on-demand reload for this particular work item type
        this.setSaveEnabled(false);

        var header = Utils_String.format(
            workItemType.customization === ProcessContracts.CustomizationType.Custom ?
                AdminResources.WorkItemTypeBacklogsCustomTypeDescription : AdminResources.WorkItemTypeBacklogsInheritedTypeDescription,
            workItemType.name);
        this._setHeader(header, header, true);

        var templateName = processDescriptor.isInherited ? processDescriptor.getInheritedProcessViewModel().name : processDescriptor.name;
        this._backlogs = WorkItemBacklogsCommon.createBacklogSelectionGroup(this._options.getBehaviors());

        Utils.getProcessClient().getBehaviorsForWorkItemType(processDescriptor.processTypeId, workItemType.referenceName).then(
            (behaviors: ProcessContracts.WorkItemTypeBehavior[]) => {
                // if the original request doesn't match the current view, don't handle the result
                if (this._processDescriptor.processTypeId != processDescriptor.processTypeId || this._workItemType.referenceName != workItemType.referenceName) {
                    return;
                }

                if (behaviors == null || behaviors.length === 0) {
                    that._createBehaviorSelections(WorkItemTypeBacklogsPanel.NULL_WIT_BEHAVIOR);
                    return;
                }

                that._createBehaviorSelections(behaviors[0]); // expecting only one
            },
            error => that._errorMessageArea.setMessage(error.message));
    }

    public setFieldsEnabled(enabled: boolean) {
        // need to check for null since this is a dynamically loaded control
        if (this._backlogSelectionControl != null) {
            this._backlogSelectionControl.setEnabled(enabled);
            if (this._model.behavior.id == null && this._workItemType.customization !== ProcessContracts.CustomizationType.Custom) {
                this._backlogSelectionControl.setSelection(WorkItemBacklogsCommon.BacklogSelectionConstants.SELECTION_NONE_ID)
            }
        }
    }

    public setSaveEnabled(enabled: boolean) {
        this._toolBar.updateCommandStates(
            [{
                id: WorkItemTypeBacklogsPanel.SAVE_BUTTON_ID,
                disabled: !enabled
            }]);
    }

    private _createSaveSucceededHeader(): JQuery {
        var that = this;
        var $result = $('<span>').html(Utils_String.format(AdminResources.BacklogChangeSavedWithNewFieldsInfo));
        $result.find('a').click(() => {
            that._options.navigateToLayout(that._currentChangeMessages.messageForLayoutPage);
            return false;
        });

        return $result;
    }

    private _createBehaviorSelections(workItemTypeBehavior: ProcessContracts.WorkItemTypeBehavior) {
        var that = this;
        this._backlogSelectionControl = AdminControlFactory.createRadioSelectionWithoutLegend<WorkItemBacklogsCommon.IBacklogSelectionData>(
            that._$contentContainerElement,
            <AdminCommonRadioSelection.IRadioSelectionOptions<WorkItemBacklogsCommon.IBacklogSelectionData>>{
                id: WorkItemTypeBacklogsPanel.BACKLOG_SELECTION_CONTROL_ID,
                groupName: WorkItemBacklogsCommon.BacklogSelectionConstants.RADIO_BUTTON_NAME,
                change: delegate(that, that._handleBacklogSelectionChange),
                disabled: that._options.workItemType.customization !== ProcessContracts.CustomizationType.Custom,
                selections: that._backlogs,
                defaultSelection: Utils_Array.first(that._backlogs, s => s.behaviorId === workItemTypeBehavior.behavior.id),
                selectionHtmlFactory: (selection: WorkItemBacklogsCommon.IBacklogSelectionData, inputHtml: string) => {
                    var color = selection.color;
                    var className = '';
                    if (color == null) {
                        color = 'initial';
                    } else {
                        className = 'backlog-name';
                    }
                    return `<label for="${selection.id}">${inputHtml}
                            <span class="${className}" title="${selection.title}" style="border-color:${color}">
                                ${selection.title}
                            </span>
                            </label>`;
                },
                selectionIdGetter: (selection) => selection.id,
                selectionAriaLabelGetter: (selection) => selection.title
            }
        );

        this._resetValues(workItemTypeBehavior);
        this.setFieldsEnabled(that._workItemType.customization === ProcessContracts.CustomizationType.Custom); // behaviors menu item shouldn't be displayed anyway
    }

    private _handleBacklogSelectionChange(newValue: WorkItemBacklogsCommon.IBacklogSelectionData) {
        var isDirty = this._originalModel.behavior.id !== newValue.behaviorId;

        this._model.behavior.id = newValue.behaviorId;
        this.setSaveEnabled(isDirty);

        this._clearMessageBanners(false);
        if (isDirty) {
            var changeMessages: WorkItemBacklogsCommon.IChangeMessages = WorkItemBacklogsCommon.getChangeMessages(
                this._workItemType, this._originalSelection, newValue, this._options.getFieldName);

            this._currentChangeMessages = changeMessages;
            var hasMoreDetails = changeMessages.info.length > 0;
            this._$changeInfoContentBlock.html(changeMessages.info.join('<br />'));
            this._infoMessageArea.setMessage(
                {
                    header: changeMessages.infoSummary,
                    content: hasMoreDetails ? this._$changeInfoContentBlock : null
                },
                Notifications.MessageAreaType.Info);

            if (changeMessages.warnings.length > 0) {
                this._warningMessageArea.setMessage($('<span>').html(changeMessages.warnings.join('<br />')), Notifications.MessageAreaType.Warning);
            }
        }
    }

    private _handleBacklogSave(succeededCallback: () => void) {
        var that = this;
        this.setSaveEnabled(false);
        this.setFieldsEnabled(false);

        function saveComplete(newBehavior: ProcessContracts.WorkItemTypeBehavior) {
            that._resetValues(newBehavior);
            that._clearMessageBanners();
            that.setFieldsEnabled(true);
            that._$changeInfoContentBlock.html(that._currentChangeMessages.postSaveInfo.join('<br />'));
            that._infoMessageArea.setMessage(
                {
                    header: that._currentChangeMessages.messageForLayoutPage == null ?
                        AdminResources.BacklogChangeSavedInfo : that._createSaveSucceededHeader(),
                    content: that._$changeInfoContentBlock.html().length > 0 ? that._$changeInfoContentBlock : null
                },
                Notifications.MessageAreaType.Info);
            succeededCallback();
        }

        function createBehavior() {
            if (that._model.behavior.id == null) {
                saveComplete(<ProcessContracts.WorkItemTypeBehavior>{
                    behavior: <ProcessContracts.WorkItemBehaviorReference>{ id: null }
                });
                return;
            }

            Utils.getProcessClient().addBehaviorToWorkItemType(
                that._model, that._processDescriptor.processTypeId, that._workItemType.referenceName).then(
                (witBehavior: ProcessContracts.WorkItemTypeBehavior) => saveComplete(witBehavior),
                error => {
                    that._clearMessageBanners();
                    that._hadError = true;
                    that._errorMessageArea.setMessage(
                        Utils_String.startsWith(error.message, 'VS403194') || Utils_String.startsWith(error.message, 'VS403193') ?
                            AdminResources.ErrorSavingWorkItemTypeBacklogs : error.message);
                });
        }

        if (this._originalModel.behavior.id != null) {
            // remove current before adding
            Utils.getProcessClient().removeBehaviorFromWorkItemType(
                this._processDescriptor.processTypeId, this._workItemType.referenceName, this._originalModel.behavior.id).then(
                createBehavior,
                error => {
                    that._clearMessageBanners();
                    that._hadError = true;
                    that._errorMessageArea.setMessage(error.status === 404 ?
                        AdminResources.ErrorSavingWorkItemTypeBacklogs : error.message);
                });
        } else {
            createBehavior(); // create-only (nothing to remove first)
        }
    }

    private _clearMessageBanners(excludeError: boolean = false) {
        this._infoMessageArea.clear();
        this._warningMessageArea.clear();
        if (!excludeError) {
            this._errorMessageArea.clear();
        }
    }

    private _resetValues(witBehavior: ProcessContracts.WorkItemTypeBehavior = null) {
        if (witBehavior == null) {
            this._backlogSelectionControl.setSelection(this._originalSelection.id);
        } else {
            this._originalModel = <ProcessContracts.WorkItemTypeBehavior>{
                behavior: { id: witBehavior.behavior.id } // only need to track ID for save
            };
            this._originalSelection = this._backlogSelectionControl.getSelection();
        }
        this._model = $.extend(true, {}, this._originalModel); // make a copy for modifications
    }
}
