import Notifications = require("VSS/Controls/Notifications");
import Dialogs = require("VSS/Controls/Dialogs");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import Q = require("q");
import VSS = require("VSS/VSS");

import Telemetry_Services = require("VSS/Telemetry/Services");

import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Number = require("VSS/Utils/Number");

import ExtensionResources = require("Agile/Scripts/Resources/TFS.Resources.AgileExtensionsDuplicateWorkItem");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Controls_Grid = require("VSS/Controls/Grids");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Manager = require("Agile/Scripts/Extensions/TFS.Agile.DuplicateWorkItem");
import VSS_WIT_Contracts = require("TFS/WorkItemTracking/Contracts");

import WorkItemFinderDialog_NOREQUIRE = require("WorkItemTracking/SharedScripts/WorkItemFinderDialog");

import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");

var delegate = Utils_Core.delegate;


export interface IDialogOptions {
    primaryWorkItem: WITOM.WorkItem;

    workItem: WITOM.WorkItem;

    configuration: Manager.Configuration.IConfiguration;
}

export class ManageDuplicateDialog extends Dialogs.ModalDialog {

    public static enhancementTypeName: string = "ManageDuplicateDialog";
    private static KEYUP_DELAY = 200; // In milliseconds

    private _primaryWorkItemIdTextbox: JQuery;
    private _duplicateGridControl: Controls_Grid.Grid;
    private _duplicateGridItemList: VSS_WIT_Contracts.WorkItem[];
    private _primaryItemContainer: JQuery;
    private _duplicateDialogOkButton: JQuery;

    private _optionalMessageSection: Notifications.MessageAreaControl;
    private _explanationMessageSection: Notifications.MessageAreaControl;

    private _selectedPrimaryItem: WITOM.WorkItem;
    private _originalPrimaryItem: WITOM.WorkItem;
    private _originalDuplicateItems: VSS_WIT_Contracts.WorkItem[];

    private _workItemManager: WorkItemManager;
    private _duplicateWorkItemManager: Manager.DuplicateWorkItemService;
    private _duplicateWorkItemRESTManager: Manager.DuplicateWorkItemRESTService;

    private _workItem: WITOM.WorkItem;
    private _itemType: Manager.DuplicateWorkItemType;
    private _chosenIdFromDialog: number;
    private _workItemDirty: boolean = false;
    private _highlightedIndex: number = 0;

    /**
     * Initializes the duplicate item panel
     * @param options contains dialog configuration details.
     */
    constructor(options?: IDialogOptions) {
        super(options);

        Diag.Debug.assert(options.workItem instanceof WITOM.WorkItem, "options.workItem should be of type WorkItem");
        Diag.Debug.assert(options.workItem !== undefined, "options.workItem cannot be undefined.");
        Diag.Debug.assert(options.primaryWorkItem instanceof WITOM.WorkItem, "options.primaryWorkItem should be of type WorkItem");

        // initialize managers
        let workItemStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        this._workItemManager = WorkItemManager.get(workItemStore);
        this._duplicateWorkItemManager = new Manager.DuplicateWorkItemService(options.configuration);
        this._duplicateWorkItemRESTManager = new Manager.DuplicateWorkItemRESTService(options.configuration);

        this._workItem = options.workItem;

        // If it has actually has a primary work item i.e. Not equal to itself.
        if (this._workItem.id !== options.primaryWorkItem.id) {
            this._selectedPrimaryItem = options.primaryWorkItem;
            this._originalPrimaryItem = options.primaryWorkItem;
        }

        this._bind(this, "keyup", delegate(this, this._onESCKeyUp));
    }

    private _onESCKeyUp(e?) {
        if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
            this.close();
        }
    }

    /**
    * Brings first item to the front of the _duplicateGridItemList array.
    **/
    private _reOrderDuplicateGridItemList() {
        if (this._duplicateGridItemList.length === 0 || this._itemType !== Manager.DuplicateWorkItemType.Duplicate) {
            return;
        }
        for (var i = 0; i < this._duplicateGridItemList.length; i++) {
            // Move current item to top.
            if (this._duplicateGridItemList[i].id === this._workItem.id) {
                var temp = this._duplicateGridItemList[i];
                this._duplicateGridItemList[i] = this._duplicateGridItemList[0];
                this._duplicateGridItemList[0] = temp;
                break;
            }
        }
    }

    private _setItemType() {
        // Get type
        if (this._duplicateGridItemList.length > 0 && this._originalPrimaryItem === undefined) {
            this._itemType = Manager.DuplicateWorkItemType.Primary;
        } else if (this._originalPrimaryItem !== undefined) {
            this._itemType = Manager.DuplicateWorkItemType.Duplicate;
        } else {
            this._itemType = Manager.DuplicateWorkItemType.Default;
        }
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "duplicate-item-manage-dialog",
            buttons: {
                "ok": {
                    id: "duplicateDialogOk",
                    text: VSS_Resources_Platform.ModalDialogOkButton,
                    click: delegate(this, this._onOkClick)
                },
                "cancel": {
                    id: "duplicateDialogCancel",
                    text: VSS_Resources_Platform.ModalDialogCancelButton,
                    click: delegate(this, this.onCancelClick)
                }
            }

        }, options));
    }

    /**
    * Initializes the dialog.
    */
    public initialize() {
        var $firstInput;

        this._decorate();

        $firstInput = $('input:not([disabled])', this._element);
        Diag.Debug.assertIsObject($firstInput, "no enabled inputs found on the dialog.");
        this.setFormFocusDelayed($firstInput);

        super.initialize();

        this._duplicateDialogOkButton = $("#duplicateDialogOk");
        this._disableOkButton();

        var primaryId: number;
        if (this._selectedPrimaryItem === undefined) {
            primaryId = this._workItem.id;
        } else {
            primaryId = this._selectedPrimaryItem.id;
        }

        this._duplicateGridItemList = [];
        this._originalDuplicateItems = [];

        this._duplicateWorkItemManager.getDuplicateWorkItemIds(primaryId).then((duplicateIds) => {
            if (duplicateIds.length === 0) {
                this._duplicateGridItemList = [];
                this._originalDuplicateItems = [];

                this._setItemType();
                // Set the primary item after the controls are rendered.
                this._displayPrimaryWorkItem(this._originalPrimaryItem);

                this._createWorkItemGrid();
            } else {
                this._duplicateWorkItemRESTManager.getDuplicateWorkItems(duplicateIds).then((duplicates) => {
                    this._duplicateGridItemList = duplicates;
                    this._setItemType();
                    this._reOrderDuplicateGridItemList();
                    this._originalDuplicateItems = this._duplicateGridItemList;

                    // Set the primary item after the controls are rendered.
                    this._displayPrimaryWorkItem(this._originalPrimaryItem);

                    this._createWorkItemGrid();
                });
            }
        });
    }

    private _enableOkButton() {
        this._duplicateDialogOkButton.removeAttr("disabled");
    }

    private _disableOkButton(force: boolean = false) {
        if (force || !this._workItemDirty) {
            this._duplicateDialogOkButton.attr("disabled", "true");
        }
    }

    public onClose(e?) {
        this._unloadLinkDialog();
        super.onClose(e);
    }

    /**
    * Primary item textbox's Enter key press event handler
    */
    private _onEnterKeyDown(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER && this._duplicateDialogOkButton.attr("disabled") !== "disabled") {
            this._duplicateDialogOkButton.click();
        }
    }

    /**
    * Event handler for dialog's Ok button click
    */
    private _onOkClick(e?: JQueryEventObject) {
        var deferred = Q.defer();
        var invalidateCacheIds: number[] = [];

        this._disableOkButton(true);

        // If self was unlinked
        if (this._workItemDirty && this._selectedPrimaryItem === undefined) {
            deferred.resolve({});
        }
        else if (!this._originalPrimaryItem || this._originalPrimaryItem.id !== this._selectedPrimaryItem.id) {
            // Unlink old primary and link the new one.
            if (this._validatePrimaryWorkItem(this._selectedPrimaryItem.id)) {
                this._duplicateWorkItemManager.findPrimary(this._workItem.id).then((primaryItem) => {
                    var deferredUnlink = Q.defer();
                    // Unlink the older item
                    // If it was a duplicate item or if it has a temporary unsaved primary.
                    if (this._itemType === Manager.DuplicateWorkItemType.Duplicate || (this._itemType === Manager.DuplicateWorkItemType.Default && primaryItem.id != this._workItem.id)) {
                        this._duplicateWorkItemManager.unlinkFromPrimary(this._workItem.id, primaryItem.id).then(() => {
                            invalidateCacheIds.push(primaryItem.id);
                            deferredUnlink.resolve({});
                        }, (error) => {
                            // do nothing. Link might have been removed.
                            deferredUnlink.resolve({});
                        });
                    }
                    else if (this._itemType === Manager.DuplicateWorkItemType.Primary) {
                        // Unlink all children
                        this._duplicateWorkItemManager.getDuplicateWorkItemIds(this._workItem.id).then((duplicateIds) => {
                            Utils_Array.addRange(invalidateCacheIds, duplicateIds);
                            this._duplicateWorkItemRESTManager.beginUnlinkAllDuplicatesFromPrimary(this._workItem.id).then(() => {
                                this._duplicateWorkItemRESTManager.beginLinkToPrimary(this._getMinimalVSSWorkItem(this._selectedPrimaryItem), duplicateIds);
                                invalidateCacheIds.push(this._selectedPrimaryItem.id);
                                if (!this._workItem.isDirty()) {
                                    this._workItem.beginRefresh(() => {
                                        deferredUnlink.resolve({});
                                    });
                                }
                                else {
                                    deferredUnlink.resolve({});
                                }
                            }, (error: Error) => {
                                this._optionalMessageSection.setError(error.message);
                            });
                        });
                    }
                    else {
                        deferredUnlink.resolve({});
                    }

                    // Link the newer item
                    deferredUnlink.promise.then(() => {
                        this._duplicateWorkItemManager.linkToPrimary(this._workItem.id, this._selectedPrimaryItem.id).then(() => {
                            invalidateCacheIds.push(this._selectedPrimaryItem.id);
                            deferred.resolve({});
                        });
                    });

                    Telemetry_Services.publishEvent(new Telemetry_Services.TelemetryEventData(
                        CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE, "DuplicateWorkItem", {
                            "action": "CreateDuplicate",
                            "workItemType": this._workItem.workItemType.name,
                            "primaryWorkItemType": this._selectedPrimaryItem.workItemType.name
                        }));
                });
            }
            else {
                deferred.resolve({});
            }
        }

        deferred.promise.then(() => {
            invalidateCacheIds.push(this._workItem.id);
            this._workItemManager.invalidateCache(invalidateCacheIds);

            this.close();
        }, (error: Error) => {
            this._optionalMessageSection.setError(error.message);
        });
    };

    private _getMinimalVSSWorkItem(workItem: WITOM.WorkItem): VSS_WIT_Contracts.WorkItem {
        return {
            id: workItem.id,
            rev: workItem.revision,
            fields: null,
            relations: null,
            _links: null,
            url: null
        }
    }

    /**
    * This validates if workItem is a valid primary item
    * @param workItem, item to validate
    */
    private _validatePrimaryWorkItem(workItemId: number): boolean {
        if (workItemId === undefined || isNaN(workItemId) || workItemId <= 0) {
            this._optionalMessageSection.setError(ExtensionResources.InvalidIdErrorMessage);
            return false;
        }

        if (this._workItem.id === workItemId) {
            this._optionalMessageSection.setError(ExtensionResources.LinkToPrimaryItemOrItselfError);
            return false;
        }
        return true;
    }

    /**
    * Initializes the dialog UI.
    */
    private _decorate() {
        var $element = this._element,
            $layoutPanel;

        $layoutPanel = $("<div class='duplicate-item-manage-control-container'>")
            .append(this._initializeDuplicateWorkItemPanel());

        $element.append($layoutPanel);
    }

    /**
     * Initializes the duplicate Work item panel and return JQuery built panel of it.
     */
    private _initializeDuplicateWorkItemPanel(): JQuery {
        var $container = $("<div class='duplicate-panel'>"),
            $gridContainer = $("<div id='duplicate-grid-container'>");

        // Add primary item id label and input elements
        $container.append(this._createTitleElement(ExtensionResources.PrimaryItemIdText, "duplicate-primary-item-id-lbl"));

        this._primaryWorkItemIdTextbox = this._getPrimaryWIIdTextbox();
        $container.append(this._primaryWorkItemIdTextbox);
        this._bind(this._primaryWorkItemIdTextbox, "keyup", delegate(this, this._onKeyUp));
        this._bind(this._primaryWorkItemIdTextbox, "keydown", delegate(this, this._onEnterKeyDown));

        // Add search work item button
        var $searchWorkItemButton = $("<button type='button' />")
            .text(ExtensionResources.PrimaryItemIdBrowseButton)
            .addClass("duplicate-search-workItem-btn");
        this._bind($searchWorkItemButton, "click", delegate(this, this._onBrowseClick));
        this._bind($searchWorkItemButton, "keydown", delegate(this, this._onKeyBoardOpen));
        $container.append($searchWorkItemButton);

        // Add selected primary element title
        $container.append(this._createTitleElement(ExtensionResources.SelectedPrimaryItemTitle, "duplicate-selected-Primary-Item-lbl"));

        // Add primary work item and placeholders for link and title
        this._primaryItemContainer = $("<div id='duplicate-primary-item' />");
        $(this._primaryItemContainer).append($("<a/>"));
        $(this._primaryItemContainer).append($("<span/>"));
        $(this._primaryItemContainer).append($("<span class=\"duplicateWorkItem-selectedPrimary-title\">").text("None"));
        $container.append(this._primaryItemContainer);

        // Add related item title
        $container.append(this._createTitleElement(ExtensionResources.RelatedDuplicatesTitle, "duplicate-related-workItem-lbl"));

        // Create Grid
        $gridContainer.addClass("duplicate-grid");
        $container.append($gridContainer);

        // Adding the optional message
        var $optionalMessageContainer = $("<div/>").addClass("duplicate-optional-message");
        this._optionalMessageSection = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $optionalMessageContainer);
        $container.append($optionalMessageContainer);

        // Adding the explanation message
        var $messageContainer = $("<div>").addClass("duplicate-explanation-message");
        this._explanationMessageSection = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $messageContainer);
        $container.append($messageContainer);

        return $container;
    }

    private _getPrimaryWIIdTextbox() {
        return $("<input>")
            .attr("id", "primaryWorkItemId")
            .attr("name", "primaryWorkItemId")
            .attr("placeholder", ExtensionResources.PrimaryItemIdTexboxPlaceHolder)
            .addClass("duplicate-primary-item-input")
            .addClass("textbox");
    }

    private _onKeyUp(e?) {
        this.cancelDelayedFunction("onkeyUp");
        this.delayExecute("onkeyUp", ManageDuplicateDialog.KEYUP_DELAY, true, () => {
            this._optionalMessageSection.clear();

            // Set the original primary if it was duplicate item
            if (this._primaryWorkItemIdTextbox.val() === Utils_String.empty) {
                this._restoreOriginalState();
                return;
            }

            var primaryItemId = Utils_Number.parseLocale(this._primaryWorkItemIdTextbox.val());
            this._setWorkItem(primaryItemId);
        });
    };

    private _restoreOriginalState() {
        this._selectedPrimaryItem = this._originalPrimaryItem;

        // if it was primary work item set primary item to itself.
        if (this._itemType === Manager.DuplicateWorkItemType.Primary) {
            this._displayPrimaryWorkItem(this._workItem);
            this._setGrid();
            this._updateActionMessage();
        } else if (this._itemType === Manager.DuplicateWorkItemType.Duplicate) {
            this._selectedPrimaryItem = this._originalPrimaryItem;
            this._displayPrimaryWorkItem(this._originalPrimaryItem);
            this._setGrid();
            this._updateActionMessage();
        }
        else {
            // If it was a default type
            this._eraseSelectedPrimaryItem();
            this._duplicateGridControl.setDataSource([]);
            this._updateActionMessage();
        }
        // Disable ok button if no action was performed
        this._disableOkButton();
    }

    private _createTitleElement(title: string, className?: string) {
        var label = $("<label/>").text(title);

        if (className) {
            label.addClass(className);
        }
        return label;
    }

    /**
    * This sets the primary work item as selected on the dialog
    * @param primaryWI is the work item
    */
    private _displayPrimaryWorkItem(primaryWI?: WITOM.WorkItem) {
        var contents = this._primaryItemContainer.contents();

        // If there was no primary item selected
        if (primaryWI === undefined) {
            if (this._itemType === Manager.DuplicateWorkItemType.Primary) {
                primaryWI = this._workItem;
            } else if (this._itemType === Manager.DuplicateWorkItemType.Duplicate) {
                primaryWI = this._originalPrimaryItem;
            } else {
                return;
            }
        }

        // Append the link and a space
        if (contents.length > 2) {
            $(contents[0]).attr("href", this._getWorkItemURL(primaryWI)).attr("target", "_blank").attr("rel", "noopener noreferrer").addClass("duplicateWorkItem-selectedPrimary-link").text(primaryWI.id);
            $(contents[1]).addClass("duplicateWorkItem-selectedPrimary-state").text(primaryWI.getState());
            $(contents[2]).text(primaryWI.getTitle()).attr("title", primaryWI.getTitle());
        }
    }

    /**
    * This resets the Selected primary item field to None on the dialog
    */
    private _eraseSelectedPrimaryItem() {
        var contents = this._primaryItemContainer.contents();
        // Append the link and a space
        if (contents.length > 2) {
            $(contents[0]).attr("href", "").attr("target", "").removeClass("duplicateWorkItem-selectedPrimary-link").text(""); // ID with link
            $(contents[1]).removeClass("duplicateWorkItem-selectedPrimary-state").text(""); // State
            $(".duplicateWorkItem-selectedPrimary-title").text("None").removeAttr("title"); // In title
        }
    }

    /**
    * This returns the URL for the full screen of the work item
    * @param workItem to generate the link.
    */
    private _getWorkItemURL(workItem: WITOM.WorkItem): string {
        return workItem.store.getTfsContext().getActionUrl("edit", "workitems",
            $.extend(
                {
                    project: workItem.project.name,
                    team: null,
                    parameters: [workItem.id]
                },
                false));
    }

    private _getRESTWorkItemURL(workItem: VSS_WIT_Contracts.WorkItem): string {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var webContext = tfsContext.contextData;
        var collectionUrl = webContext.collection.uri;
        var teamProject = webContext.project.name;

        // build url
        var wiUrl = collectionUrl
            + teamProject
            + "/_workitems#id="
            + workItem.id
            + "&triage=true&_a=edit";
        wiUrl = encodeURI(wiUrl);
        return wiUrl;
    }

    /**
    * This opens choose work item dialog
    */
    private _onBrowseClick(mouseEvent: JQueryMouseEventObject) {
        this._launchBrowseDialog(this._getChooseItemDialogOptions());

        Telemetry_Services.publishEvent(new Telemetry_Services.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE, "DuplicateWorkItem", {
                "action": "OpenSearch",
                "workItemType": this._workItem.workItemType.name
            }));
    }

    private _onKeyBoardOpen(keyboardEvent: JQueryKeyEventObject) {
        // Allow only ENTER key alone to open the dialog.
        if (keyboardEvent.keyCode === Utils_UI.KeyCode.ENTER) {
            this._launchBrowseDialog(this._getChooseItemDialogOptions());
        }
    }

    private _getChooseItemDialogOptions() {
        return {
            workItem: this._workItem,
            title: ExtensionResources.ChooseItemDialogTitle,
            coreCssClass: "duplicate-choose-workitem-form",
        };
    }

    private _launchBrowseDialog(options) {
        // Load the TFS.WorkItemTracking.Controls.Query module since on some pages it is not included.  This module 
        // registers the worker for OPEN_BROWSE_DIALOG so without it the button will do nothing.
        VSS.using(["WorkItemTracking/SharedScripts/WorkItemFinderDialog"], (WorkItemFinderDialog: typeof WorkItemFinderDialog_NOREQUIRE) => {
            WorkItemFinderDialog.WITQueryDialogs.findWorkItem($.extend({}, options, {
                width: 600,
                height: 500,
                minHeight: 450,
                okCallback: (workItem) => {
                    if (workItem.length > 0) {
                        this._chosenIdFromDialog = workItem[0];
                        this._onIdChange();
                    }
                },
                // We don't allow multiselect
                allowMultiSelect: false
            }));
        });
    }

    private _onIdChange(e?) {
        this._setWorkItem(this._chosenIdFromDialog);
        this._primaryWorkItemIdTextbox.val(Utils_Number.toDecimalLocaleString(this._chosenIdFromDialog));
    }

    /**
    * This verifies the @param workItemId, and sets the selected workItem in the dialog.
    * This sets to the root primary item of the workItemId if any.
    */
    private _setWorkItem(workItemId?: number) {
        this._disableOkButton();

        this._explanationMessageSection.clear();

        if (!this._validatePrimaryWorkItem(workItemId)) {
            return;
        }

        // fetch Id
        this._workItemManager.beginGetWorkItem(workItemId, (workItem) => {
            if (Utils_Array.contains(this._duplicateWorkItemManager.getSupportedWorkItemTypeNames(), workItem.workItemType.name, Utils_String.localeIgnoreCaseComparer)) {
                // Show the ultimate primary item
                this._duplicateWorkItemManager.findPrimary(workItem.id).then((primaryWorkItem) => {

                    // No change
                    if (this._itemType === Manager.DuplicateWorkItemType.Duplicate && primaryWorkItem.id === this._originalPrimaryItem.id) {
                        this._restoreOriginalState();
                        return;
                    }

                    if (this._itemType === Manager.DuplicateWorkItemType.Primary && primaryWorkItem.id === this._workItem.id) {
                        this._optionalMessageSection.setError(ExtensionResources.CircularDependencyErrorMessage);
                        return;
                    }

                    this._selectedPrimaryItem = primaryWorkItem;
                    this._displayPrimaryWorkItem(this._selectedPrimaryItem);
                    this._setGrid();
                    this._updateActionMessage();

                    // Enable ok button and set focus
                    // If there were changes
                    if (primaryWorkItem.id === this._selectedPrimaryItem.id) {
                        this._enableOkButton();
                    }

                    this._optionalMessageSection.clear();
                });
            }
            else {
                this._optionalMessageSection.setError(Utils_String.format(ExtensionResources.InvalidWorkItemTypeErrorMessage, workItem.workItemType.name));
            }
        }, (error: Error) => {
            this._optionalMessageSection.setError(ExtensionResources.InvalidIdErrorMessage);
        });
    }

    /**
    * This sets the explanation message
    */
    private _updateActionMessage() {
        // If there was no selected primary item or no changes were made.
        if (this._selectedPrimaryItem !== undefined && (!this._originalPrimaryItem || this._selectedPrimaryItem.id !== this._originalPrimaryItem.id)) {
            if (this._originalPrimaryItem === undefined) {
                if (this._itemType === Manager.DuplicateWorkItemType.Primary) {
                    this._explanationMessageSection.setMessage(Utils_String.format(ExtensionResources.AssignNewPrimaryMessage + ExtensionResources.UpdatePrimaryNoteMessage, this._selectedPrimaryItem.id), Notifications.MessageAreaType.Info);
                } else {
                    this._explanationMessageSection.setMessage(Utils_String.format(ExtensionResources.AssignNewPrimaryMessage, this._selectedPrimaryItem.id), Notifications.MessageAreaType.Info);
                }
            }
            else { /* If it originally had a primary work item. So just updating */
                this._explanationMessageSection.setMessage(Utils_String.format(ExtensionResources.UpdatePrimaryItemMessage, this._originalPrimaryItem.id, this._selectedPrimaryItem.id), Notifications.MessageAreaType.Info);
            }
        }
        else {
            this._explanationMessageSection.clear();
        }
    }

    /**
    * Creates work item grid with all the columns and sets the data source
    */
    private _createWorkItemGrid() {
        // Load VSTS controls
        VSS.using(["VSS/Controls/Grids"],
            (Grids) => {
                this._duplicateGridControl = <Controls_Grid.Grid>Controls.BaseControl.createIn(Grids.Grid, $("#duplicate-grid-container"), {
                    height: "100%",
                    allowSort: true,
                    columns: [
                        {
                            text: "ID",
                            index: "id",
                            canSortBy: true,
                            width: 70,
                            getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {
                                var $item = $("<div class='grid-cell'/>")
                                    .innerWidth(column.width || 100);
                                var currentItem: VSS_WIT_Contracts.WorkItem = this._duplicateGridControl.getRowData(dataIndex);
                                $item.append($("<a/>").attr("href", this._getRESTWorkItemURL(currentItem)).attr("target", "_blank").attr("rel", "noopener noreferrer").text(currentItem.id));
                                return $item;
                            }
                        },
                        {
                            text: "Title",
                            width: 240,
                            comparer: function (column, order, rowA: VSS_WIT_Contracts.WorkItem, rowB: VSS_WIT_Contracts.WorkItem) {
                                var title1 = rowA.fields["System.Title"];
                                var title2 = rowB.fields["System.Title"];
                                return Utils_String.localeIgnoreCaseComparer(title1, title2);
                            },
                            getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                                return $("<div class='grid-cell'/>")
                                    .innerWidth(column.width || 100)
                                    .text(this.getRowData(dataIndex).fields["System.Title"])
                                    .attr("title", this.getRowData(dataIndex).fields["System.Title"]);
                            }
                        },
                        {
                            text: "State",
                            comparer: function (column, order, rowA: VSS_WIT_Contracts.WorkItem, rowB: VSS_WIT_Contracts.WorkItem) {
                                var state1 = rowA.fields["System.State"];
                                var state2 = rowB.fields["System.State"];
                                return Utils_String.localeIgnoreCaseComparer(state1, state2);
                            },
                            width: 80,
                            getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                                return $("<div class='grid-cell'/>")
                                    .innerWidth(column.width || 100)
                                    .text(this.getRowData(dataIndex).fields["System.State"]);
                            }
                        },
                        {
                            text: "Unlink",
                            canSortBy: false,
                            width: 50,
                            getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {
                                var currentItem: VSS_WIT_Contracts.WorkItem = this._duplicateGridControl.getRowData(dataIndex);
                                return $("<div class='grid-cell' ><span class='duplicate-unlink-image'></div>")
                                    .innerWidth(50)
                                    .attr("title", "Unlink")
                                    .attr("alt", "Unlink")
                                    .click(() => {
                                        var confirmation = confirm(Utils_String.format(ExtensionResources.UnlinkConfirmMessage, currentItem.id));
                                        if (!confirmation) {
                                            return;
                                        }

                                        // Actual primary item for this row's item
                                        // If selected primary item is undefined, Dialog host work item is the root workItem.
                                        var primaryItem = this._selectedPrimaryItem === undefined ? this._workItem : this._selectedPrimaryItem;

                                        // Unlink item
                                        if (this._workItem.id === currentItem.id) {
                                            this._duplicateGridItemList = [];
                                            this._selectedPrimaryItem = undefined;
                                            this._eraseSelectedPrimaryItem();
                                            this._duplicateWorkItemManager.unlinkFromPrimary(currentItem.id, primaryItem.id).then(() => {
                                                this._explanationMessageSection.setMessage(Utils_String.format(ExtensionResources.UnlinkMessage, currentItem.id, primaryItem.id), Notifications.MessageAreaType.Info);
                                                this._workItemDirty = true;
                                                this._enableOkButton();
                                                this._removeRowFromGrid(currentItem.id);
                                                this._itemType = Manager.DuplicateWorkItemType.Default;
                                            }, (error: Error) => {
                                                this._optionalMessageSection.setError(error.message);
                                                this._removeRowFromGrid(currentItem.id);
                                            });
                                        }
                                        else {
                                            this._duplicateWorkItemRESTManager.beginUnlinkFromPrimary(currentItem.id, primaryItem.id, this._workItemManager.store.getCurrentUserName()).then(() => {
                                                if (this._itemType === Manager.DuplicateWorkItemType.Primary && !this._workItem.isDirty()) {
                                                    this._workItem.beginRefresh(null, (error: Error) => {
                                                        this._optionalMessageSection.setError(error.message);
                                                    });
                                                }
                                                // Refresh grid
                                                this._removeRowFromGrid(currentItem.id);
                                                this._workItemManager.invalidateCache([currentItem.id, primaryItem.id]);
                                            }, (error: Error) => {
                                                this._optionalMessageSection.setError(error.message);
                                                this._removeRowFromGrid(currentItem.id);
                                            });
                                        }
                                    });
                            }
                        }
                    ],
                    initialSelection: this._itemType === Manager.DuplicateWorkItemType.Duplicate
                                        && this._duplicateGridItemList.length > 0
                                        && this._duplicateGridItemList[0] !== null
                                        && this._workItem.id === this._duplicateGridItemList[0].id,
                    allowMultiSelect: false,
                    keepSelection: false,
                    allowTextSelection: false,
                    source: this._duplicateGridItemList
                });

                $("#duplicate-grid-container").bind(Grids.GridO.EVENT_SELECTED_INDEX_CHANGED, <any>((evt, selectedIndex: number) => {
                    // Highlight only if the current item is found
                    if (this._itemType === Manager.DuplicateWorkItemType.Duplicate
                        && this._duplicateGridItemList.length > this._highlightedIndex
                        && this._duplicateGridItemList[this._highlightedIndex].id === this._workItem.id) {
                        // If we have already selected that item, avoid infinite loop
                        if (selectedIndex !== this._highlightedIndex) {
                            this._duplicateGridControl.setSelectedDataIndex(this._highlightedIndex);
                        }
                    }
                    else {
                        this._duplicateGridControl._clearSelection();
                    }
                }));

                $("#duplicate-grid-container").bind("sort", () => {
                    this._highlightCurrentItem();
                });
            });
    }

    /**
    * This finds and highlight current host work item on grid.
    */
    private _highlightCurrentItem() {
        for (var i = 0;i < this._duplicateGridItemList.length; i++) {
            if (this._duplicateGridItemList[i].id === this._workItem.id) {
                this._highlightedIndex = i; // This is used by selection changed event handler, which keeps this selection
                this._duplicateGridControl.setSelectedDataIndex(i);
                break;
            }
        }
    }

    private _unloadGrid() {
        if (this._duplicateGridControl) {
            this._duplicateGridControl = null;
        }
    }

    private _removeRowFromGrid(itemId: number) {
        var itemIndex: number;
        $.each(this._duplicateGridItemList, (index, item) => {
            if (itemId === item.id) {
                itemIndex = index;
                return false;
            }
        });

        // Could not find the item
        if (itemIndex === this._duplicateGridItemList.length) {
            return;
        }

        this._duplicateGridItemList.splice(itemIndex, 1);
        this._duplicateGridControl.setDataSource(this._duplicateGridItemList);

        this._highlightCurrentItem();
    }

    /**
    * This loads the Grid with data
    * @param data contains list of work items
    */
    public _setGrid() {
        var realprimaryItemId: number;

        if (this._originalPrimaryItem && this._selectedPrimaryItem.id === this._originalPrimaryItem.id) {
            this._duplicateGridItemList = this._originalDuplicateItems;
            this._duplicateGridControl.setDataSource(this._duplicateGridItemList);
            this._duplicateGridControl.setSelectedDataIndex(0);
            this._highlightedIndex = 0;
            return;
        }

        if (this._selectedPrimaryItem === undefined) {
            realprimaryItemId = this._workItem.id;
            this._getDuplicatesFromPrimary(realprimaryItemId);
        }
        else {
            // Set the grid for this selected primary work item
            this._duplicateWorkItemManager.findPrimary(this._selectedPrimaryItem.id).then(primaryItem => {
                realprimaryItemId = primaryItem.id;
                this._getDuplicatesFromPrimary(realprimaryItemId);
            });
        }
    }

    private _getDuplicatesFromPrimary(realprimaryItemId: number) {
        this._duplicateWorkItemManager.getDuplicateWorkItemIds(realprimaryItemId).then((duplicateIds) => {
            if (duplicateIds.length !== 0) {
                this._duplicateWorkItemRESTManager.getDuplicateWorkItems(duplicateIds).then((duplicates) => {
                    this._duplicateGridItemList = duplicates;
                    this._duplicateGridControl.setDataSource(this._duplicateGridItemList);
                }, (error: Error) => {
                    this._optionalMessageSection.setError(error.message);
                });
            } else {
                this._duplicateGridItemList = [];
                this._duplicateGridControl.setDataSource(this._duplicateGridItemList);
            }
        });
    }

    private _unloadLinkDialog() {
        this._unloadGrid();
        this._workItem = null;
    }
}
