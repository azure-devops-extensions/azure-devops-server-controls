/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import WIT = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import AgileUtils = require("Agile/Scripts/Common/Utils");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import CardControls = require("Agile/Scripts/Card/CardsControls");
import Cards = require("Agile/Scripts/Card/Cards");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import Util_Cards = require("Agile/Scripts/Card/CardUtils");

import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");

import BoardControls_NO_REQUIRE = require("Agile/Scripts/Board/BoardsControls");
import AgileResources_NO_REQUIRE = require("Agile/Scripts/Resources/TFS.Resources.Agile");
import { WorkItemStateCategory } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()

var DatabaseCoreFieldRefName = AgileUtils.DatabaseCoreFieldRefName;
var delegate = Utils_Core.delegate;
var eventSvc = Events_Services.getService();

export class ItemListCollectionViewModel {
    public defaultItemType: string;
    public listItems: KnockoutObservableArray<ItemViewModel> = ko.observableArray<ItemViewModel>([]);
    public sourceItem: Boards.Item;

    constructor(sourceItem: Boards.Item, listItems: Boards.Item[], defaultItemType?: string) {
        this.sourceItem = sourceItem;
        this.defaultItemType = defaultItemType;
    }

    /**
     * Adds a new checklist item.
     * @params successCallback The callback when beginAddNewChild of source item succeed.
     * @params itemType The type of the child item, it is optional.
     */
    public addNewItem(teamId: string, successCallback: IResultCallback, itemType?: string) {
        this.sourceItem.beginAddNewChild(teamId, itemType)
            .done((item: Boards.Item) => {
                successCallback(item);
            }, (e: any) => {
                // Error Handling here
            });
    }

    /**
     * Adds an existing item.
     * @params item An item to add
     */
    public addItem(item: Boards.Item) {
        Diag.Debug.fail("addItem: IsAbstract");
    }

    /**
     * Insert an item at the specified index
     * @params index  The zero-based index at which item should be inserted.
     * @params item An item to add
     */
    public insertItem(index: number, item: Boards.Item) {
        Diag.Debug.fail("insertItem: IsAbstract");
    }

    public updateListItems(items: Boards.Item[]) {
        /// <summary>Updates work-items observable array with the given items</summary>
        Diag.Debug.fail("updateListItems: IsAbstract");
    }

    /**
     * Removes the item view models from the collection.
     * @params ids The id array of the items should be removed from the collection
     */
    public removeItems(ids: number[]) {
        for (var i = 0, len = ids.length; i < len; i++) {
            this.removeItemFromCollection(ids[i]);
        }
    }

    /**
     * Removes the item view model from the collection.
     * @params ids The id of the item should be removed from the collection
     */
    public removeItemFromCollection(id: number) {
        for (var i = 0, itemCount = this.listItems().length; i < itemCount; i++) {
            if (this.listItems()[i].id() === id) {
                var removedItems: ItemViewModel[] = this.listItems.splice(i, 1);
                removedItems[0].dispose();
                break;
            }
        }
    }

    public dispose() {
        var items = this.listItems();
        for (var i = 0, len = items.length; i < len; i++) {
            if (items[i].id() <= 0) {
                this.removeItemFromCollection(items[i].id());
            } else {
                items[i].dispose();
            }
        }
        this.listItems.removeAll();
    }
}

/**
 *@interface
 * An interface for IWorkItemListCollectionViewModelOptions options
 */
export interface IWorkItemListCollectionViewModelOptions {
    /** Id of the owning team */
    teamId: string;
    /**
     * parentWorkItem: Parent Work Item
     */
    parentWorkItem: Boards.Item;
    /**
     * workItems: An array of work items
     */
    workItems: Boards.Item[];
    /**
     * workItemCreationEnabled: Should users be able to create new work items from this list
     */
    workItemCreationEnabled: boolean;
    /**
     * defaultWorkItemType: Default work item type
     */
    defaultWorkItemType?: string;
    /**
     * workItemType: Work item type of this list view instance
     */
    workItemType?: string;
    /**
     * onCreateContextMenu: Optional: On create work item context menu
     */
    onCreateContextMenu?: (e: JQueryEventObject, workItem: WorkItemViewModel) => void;
    /**
     * eventScope: Scope for events for the work items
     */
    eventScope: string;
}

export class WorkItemListCollectionViewModel extends ItemListCollectionViewModel {
    private _options: IWorkItemViewModelOptions;
    private _isAddingNewItem: boolean;
    private _workItemType: string;
    public scrolledItem: KnockoutObservable<WorkItemViewModel> = ko.observable(<any>{});
    public addItemText: string;
    public workItemCreationEnabled: boolean;

    constructor(options: IWorkItemListCollectionViewModelOptions) {
        super(options.parentWorkItem, options.workItems, options.defaultWorkItemType);
        this._options = <IWorkItemViewModelOptions>{
            teamId: options.teamId,
            onMarkComplete: () => { this._fireChecklistChanged(); },
            onEditStart: delegate(this, this._onEditStart),
            onEditEnd: delegate(this, this._onEditEnd),
            onDiscard: delegate(this, this._onDiscard),
            onSaveCompleted: () => { this._fireChecklistChanged(); },
            onSaveFailed: () => { this._fireChecklistChanged(); },
            onCreateContextMenu: options.onCreateContextMenu,
            eventScope: options.eventScope
        };
        $.each(options.workItems, (index, workItem) => {
            this.listItems.push(new WorkItemViewModel(workItem, this._options));
        });
        if (options.workItemType) {
            this._workItemType = options.workItemType;
        } else {
            this._workItemType = options.defaultWorkItemType;
        }
        this.addItemText = Utils_String.format(AgileControlsResources.Checklist_Add_Item, this._workItemType);
        this.workItemCreationEnabled = options.workItemCreationEnabled;
    }

    /**
     * Specifies if new items can be added to the collection.
     * This disables the add experience while an item is already being added in the UI
     * @returns boolean specifying whether add should be disabled or not
     */
    public disableAdd(): boolean {
        return this._isAddingNewItem;
    }

    /**
     * Adds a new checklist item.
     * @param itemType The type of the item to add, optional
     */
    public addNewWorkItem(itemType?: string) {
        if (!this._isAddingNewItem) {
            this._isAddingNewItem = true;
            this.addNewItem(
                this._options.teamId,
                (item: Boards.Item) => {
                    item.setParentId(this.sourceItem.id());
                    var workItemViewModel = new WorkItemViewModel(item, this._options);
                    workItemViewModel.isSaved(false);
                    this.listItems.push(workItemViewModel);
                    var newWorkItemJQuerySelector = Utils_String.format(".work-item-list-container #{0} .work-item-title-container .title", item.id());

                    let $newWorkItemInput = $(newWorkItemJQuerySelector);
                    workItemViewModel.onStartEditWorkItem($(newWorkItemJQuerySelector));
                    this.scrolledItem(workItemViewModel);

                    let $window = $(window);

                    // Ensure that the new work item text box is inside current viewport.
                    if ($newWorkItemInput && $newWorkItemInput.length) {
                        let viewport = {
                            top: $window.scrollTop(),
                            bottom: $window.scrollTop() + $window.height()
                        };

                        let newWorkItemBox = {
                            top: $newWorkItemInput.offset().top,
                            bottom: $newWorkItemInput.offset().top + $newWorkItemInput.outerHeight()
                        };

                        if (!(viewport.top < newWorkItemBox.top && viewport.bottom > newWorkItemBox.bottom)) {
                            $newWorkItemInput[0].scrollIntoView();
                        }
                    }
                },
                itemType);
        }
    }

    /**
     * Adds a new checklist item of this instance type. Used by the ko binding.
     * Uses addThisWorkItem when all card annotations feature flag enabled.
     * @param data The sender of the ko handler, optional
     * @param event The event that caused this handler to be called, optional
     */
    public addNewDefaultWorkItem(data?: WorkItemListCollectionViewModel, event?: JQueryEventObject) {
        this.addThisWorkItem();
    }

    public addThisWorkItem(data?: WorkItemListCollectionViewModel, event?: JQueryEventObject) {
        this.addNewWorkItem(this._workItemType);
        Boards.KanbanTelemetry.recordChecklistTelemetry(this._workItemType, "Add", "AddButton");
    }

    /**
     * Adds an existing item.
     * @params item An item to add
     */
    public addItem(item: Boards.Item) {
        this.listItems.push(new WorkItemViewModel(item, this._options));
    }

    /**
     * Insert an item at the specified index
     * @params index  The zero-based index at which item should be inserted.
     * @params item An item to add
     */
    public insertItem(index: number, item: Boards.Item) {
        this.listItems.splice(index, 0, new WorkItemViewModel(item, this._options));
    }

    /**
     * Discard newly created but not in saving state item.
     */
    public discardNewItems() {
        var listItems = this.listItems();
        var discardedIds: number[] = [];
        $.each(listItems, (index: number, workItem: WorkItemViewModel) => {
            if (workItem.item.id() < 0 && !workItem.isSaving()) {
                workItem.discard();
                discardedIds.push(workItem.item.id());
            }
        });
        this.removeItems(discardedIds);
    }

    /**
     * Implement the base view model updateListItem method
     * Updates workItems observable array with the given items
     * @param {Boards.Item[]} items - array of Item representing checklist
     */
    public updateListItems(items: Boards.Item[]) {
        this.listItems.removeAll();
        for (var i = 0, len = items.length; i < len; i++) {
            this.listItems.push(new WorkItemViewModel(items[i], this._options));
        }
    }

    /**
     * Fire checklist item changed event
     */
    private _fireChecklistChanged() {
        this.sourceItem.fire(Boards.Item.EVENT_ITEM_CHANGED, this, {
            item: this.sourceItem,
            change: Boards.ItemSource.ChangeTypes.ChecklistChanged,
            workItemType: this._workItemType
        });
    }

    private _onEditEnd(quickAddMode?: boolean) {
        this._isAddingNewItem = false;
        eventSvc.fire(Cards.Notifications.CardWorkItemListEndEdit, null, { id: this.sourceItem.id() }, this._options.eventScope);
        this._fireChecklistChanged();
        if (quickAddMode) {
            this.addNewWorkItem(this._workItemType);
            Boards.KanbanTelemetry.recordChecklistTelemetry(this._workItemType, "Add", "QuickAdd");
        }
    }

    private _onEditStart() {
        eventSvc.fire(Cards.Notifications.CardWorkItemListBeginEdit, null, { id: this.sourceItem.id() }, this._options.eventScope);
    }

    private _onDiscard(discardedItemId: number) {
        this.sourceItem.discardChildItem(discardedItemId);
    }
}

export class ItemViewModel {
    public item: any;
    public itemType: string;
    public name: KnockoutObservable<string> = ko.observable("");
    public isValid: KnockoutObservable<boolean> = ko.observable(true);
    public isComplete: KnockoutObservable<boolean> = ko.observable(false);
    public isSaving: KnockoutObservable<boolean> = ko.observable(false);

    constructor(item: any) {
        this.item = item;
        this.itemType = item.type();
        Diag.Debug.assertIsNotUndefined(this.itemType, "item.type()");
    }

    /**
    * Gets the id of the underlying member
    */
    public id(): number {
        return this.item.id();
    }

    /**
    * Gets the message of the underlying member
    */
    public message(): string {
        return this.item.message();
    }

    /**
    * Returns a flag indicating whether the user has a permission to reorder/reparent
    */
    public canReorder(): boolean {
        Diag.Debug.fail("canReorder: IsAbstract");
        return false;
    }

    public dispose() {

    }
}

/**
 * @interface
 * An interface for IWorkItemViewModelOptions options
 */
export interface IWorkItemViewModelOptions {
    /** Id of the owning team */
    teamId: string;
    /**
     * eventScope: Scope for the events.
     */
    eventScope: string;
    /**
    * onEditStart: Optional: Callback on beginning the edit action.
    */
    onEditStart?: IArgsFunctionR<any>;
    /**
    * onEditEnd: Optional: Callback on completing the edit action.
    */
    onEditEnd?: IArgsFunctionR<any>;
    /**
    * onMarkComplete: Optional: Callback on marking an item as complete.
    */
    onMarkComplete?: IArgsFunctionR<any>;
    /**
    * onSaveCompleted: Optional: Callback on completing the save action.
    */
    onSaveCompleted?: IArgsFunctionR<any>;
    /**
    * onSaveFailed: Optional: Callback on save failure
    */
    onSaveFailed?: IArgsFunctionR<any>;
    /**
    * onDiscard: Optional: Callback on discarding the changes.
    */
    onDiscard?: IArgsFunctionR<any>;
    /**
    * onCreateContextMenu: Optional: Callback on create work item context menu.
    */
    onCreateContextMenu?: IArgsFunctionR<any>;
}

export class WorkItemViewModel extends ItemViewModel {
    public item: Boards.WorkItemItemAdapter;
    public isEditing: KnockoutObservable<boolean> = ko.observable(false);
    public isSaved: KnockoutObservable<boolean> = ko.observable(true);
    public isContextMenuOpen: KnockoutObservable<boolean> = ko.observable(false);
    public projectName: string;
    public workItemTypeName: string;

    private _control: CardControls.CardFieldTitleControl;
    private _editableFieldContainer: JQuery;
    private _editStartCallback: Function;
    private _editEndCallback: Function;
    private _markCompleteCallback: Function;
    private _saveCompletedCallback: Function;
    private _saveFailedCallback: Function;
    private _discardCallback: Function;
    private _isCompleteSubscription: KnockoutSubscription<boolean>;
    private _onCreateContextMenu: (e: JQueryEventObject, workItem: WorkItemViewModel) => void;

    constructor(item: Boards.Item, options: IWorkItemViewModelOptions) {
        super(item);
        this.name(item.fieldValue(DatabaseCoreFieldRefName.Title));
        this._editStartCallback = options.onEditStart;
        this._editEndCallback = options.onEditEnd;
        this._markCompleteCallback = options.onMarkComplete;
        this._saveCompletedCallback = options.onSaveCompleted;
        this._saveFailedCallback = options.onSaveFailed;
        this._discardCallback = options.onDiscard;
        this._onCreateContextMenu = options.onCreateContextMenu;
        if (item.message()) {
            this.isValid(false);
        }

        this.projectName = TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;
        this.workItemTypeName = this.itemType;

        this.isComplete(AgileUtils.WorkItemUtils.isStateComplete(this.id(),
            item.fieldValue(DatabaseCoreFieldRefName.State),
            item.fieldValue(DatabaseCoreFieldRefName.WorkItemType)));

        this._isCompleteSubscription = this.isComplete.subscribe((newValue: boolean) => {
            this._markComplete(newValue, this.workItemTypeName);
        });

    }

    /**
    * Returns a flag indicating whether the user has a permission to reorder/reparent
    */
    public canReorder(): boolean {
        return TFS_Agile.areAdvancedBacklogFeaturesEnabled(true);
    }

    /**
     * Event handler binding in knockout template when user clicks on work item context menu.
     * @param data - Work Item view model
     * @param event - JQuery event object associated with click event
     */
    public createContextMenu(data: WorkItemViewModel, event: JQueryEventObject): void {
        if ($.isFunction(this._onCreateContextMenu)) {
            this.isContextMenuOpen(true);
            this._onCreateContextMenu(event, this);
        }
    }

    public openWorkItem(data: WorkItemViewModel, event: JQueryEventObject) {
        if (event && $(event.target).hasClass("work-item-state")) {
            return true;
        }
        else {
            WITDialogShim.showWorkItemById(this.id(), {
                save: () => {
                    //refresh the children data for the item as it may have changed
                    this._onWorkItemSaveSuccess();
                }
            });

            Boards.KanbanTelemetry.recordChecklistTelemetry(this.itemType, "Open", "WorkItemTitle");
            return false;
        }
    }

    // Handle / dismiss click events (linked from aspx via knockout) to achieve desired behavior
    // ------------------------------
    public onClickWorkItemListContainer(data: WorkItemViewModel, event: JQueryEventObject) {
        return false;
    }

    public onClickWorkItem(data: WorkItemViewModel, event: JQueryEventObject) {
        return false;
    }

    public onClickWorkItemStateCheckBox(data: WorkItemViewModel, event: JQueryEventObject) {
        return true;
    }

    public dispose() {
        this._isCompleteSubscription.dispose();
        super.dispose();
    }
    // ------------------------------


    public discard() {
        this.item.discard();
        this.item.dispose();

        if ($.isFunction(this._discardCallback)) {
            this._discardCallback(this.item.id());
        }
    }

    /**
     * Event handler binding in knockout template when user presses a key down to edit or open a work item.
     * @param data - Work Item view model
     * @param event - JQuery event object associated with key down event
     */
    public onKeyDownWorkItemHandler(data: WorkItemViewModel, event: JQueryEventObject) {
        if (event.keyCode === Utils_UI.KeyCode.ENTER) {
            this.openItem(() => { this._onWorkItemSaveSuccess(); });
        }
        else if (event.keyCode === Utils_UI.KeyCode.F2) {
            const $fieldContainer = $(event.currentTarget).find(".title");
            this.onStartEditWorkItem($fieldContainer);
        }
        else if (!this.isEditing() && event.keyCode === Utils_UI.KeyCode.SPACE) {
            this.isComplete(!this.isComplete());
        }
        else if ((event.keyCode === Utils_UI.KeyCode.F10) && event.shiftKey) {
            this.createContextMenu(this, event);
        }
        else {
            return true;
        }
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * Event handler when user starts to edit a work item.
     * @param $fieldContainer Container element of a work item.
     */
    public onStartEditWorkItem($fieldContainer: JQuery) {
        if (this.isSaving()) {
            return;
        }

        this.isEditing(true);

        if ($.isFunction(this._editStartCallback)) {
            this._editStartCallback();
        }

        var options = {
            allowEdit: true,
            validator: function (value) {
                return value.trim().length > 0;
            },
            onEditEnd: delegate(this, this.onEditEnd),
            label: AgileControlsResources.TestAnnotation_EditTitle
        };

        if ($fieldContainer && $fieldContainer.length > 0) {
            if ($fieldContainer.children(".editableTitle").length <= 0) {
                $fieldContainer.addClass("edit-mode-borders");

                var $workItemElement = $fieldContainer.parents(".work-item");
                $workItemElement.addClass("editMode");
                // if editable control does not exist.
                this._editableFieldContainer = $fieldContainer;
                this._control = <CardControls.CardFieldTitleControl>Controls.Control.createIn(CardControls.CardFieldTitleControl, $("<div>"), options);
                this._control.init($fieldContainer, this.name());
                this._control.startEdit();

                // Hide the readonly node
                $fieldContainer.children().hide();

                // Append the editable control
                $fieldContainer[0].appendChild(this._control.getElement()[0]);
            }
        }
    }

    public onEditEnd(event: JQueryEventObject, isInvalid: boolean, quickAddMode?: boolean) {
        var isNew = this.item.isNew();
        var currentValue = this._control.getValue();

        this.isEditing(false);

        this.name(""); // this is a knockout hack to force knockout to repaint the title back to the top of its view

        if (!isInvalid) {
            this.item.fieldValue(DatabaseCoreFieldRefName.Title, currentValue);
            this.isSaving(true);
            var $workItemElement = $(event.target).parents(".work-item");
            this._saveItem().then(
                () => {
                    this.isSaved(true);
                    $workItemElement.attr("id", this.item.id());
                    if ($.isFunction(this._saveCompletedCallback)) {
                        this._saveCompletedCallback();
                    }
                },
                () => {
                    if (isNew) {
                        // saving a new item failed as there is a missing required field
                        this.openItem(() => {
                            $workItemElement.attr("id", this.item.id());
                            this._onWorkItemSaveSuccess();
                        });
                    }
                    else {
                        // saving an existing item failed. update checkklist items
                        if ($.isFunction(this._saveFailedCallback)) {
                            this._saveFailedCallback();
                        }
                    }
                });
        }
        var index: number = null, tabbableElements: JQuery = null, workItemListLength: number = null;
        var $titleElement = $(event.target).parents(".title");
        $titleElement.removeClass("edit-mode-borders");
        var $workItemElement = $(event.target).parents(".work-item");
        $workItemElement.removeClass("editMode");

        if (event.keyCode === Utils_UI.KeyCode.TAB || ((event.keyCode === Utils_UI.KeyCode.ENTER || event.keyCode === Utils_UI.KeyCode.ESCAPE) && isNew && isInvalid)) {
            tabbableElements = $(document).find("[tabindex='0']");
            index = tabbableElements.index($workItemElement);
            workItemListLength = $(event.target).parents(".work-item-list-container")[0].children.length;
        }

        // Remove the editable control
        this._control.tearDown();
        this._control.dispose();
        this._control = null;

        if (isInvalid && isNew) {
            // Remove the readonly field
            ko.removeNode(this._editableFieldContainer.children()[0]);
            this._discardNewItem();
            this.dispose();

            if (event.keyCode === Utils_UI.KeyCode.ENTER || event.keyCode === Utils_UI.KeyCode.ESCAPE) { // if I press enter or escape on an empty work item then...
                if (workItemListLength > 1) { // if it's not an empty checklist, we need to just focus on the last work item in the list
                    tabbableElements[index - 1].focus();
                }
                else { // else it's an empty checklist, we need to focus on the context menu or the card as it is the closest tabbable element
                    tabbableElements[index - 2].focus();
                }
                tabbableElements = null; // and finally so we don't do any more focusing, remove this reference
            }
        }
        else {
            // Show the readonly node
            var editableElement = this._editableFieldContainer.children()[1];
            if (editableElement) {// handles the case of clicking the clickable div on the border of the text box
                ko.removeNode(editableElement);
            }
            this._editableFieldContainer.children().show();
            if ((event.keyCode === Utils_UI.KeyCode.ENTER || event.keyCode === Utils_UI.KeyCode.ESCAPE) && !isNew) {
                // We are losing focus on ENTER, but setting focus explicitly on ENTER, 
                // causes the drag and drop to get disabled.
                $workItemElement.focus();
            }

            if ($titleElement) {
                var $clickableTitle = $titleElement.children();
                Util_Cards.applyEllipsis($titleElement, $clickableTitle);
            }
        }
        //this is the second part of the earlier knockout hack
        this.name(currentValue);

        if (tabbableElements !== null && index > -1) {
            if (event.shiftKey) {
                if (isNew && isInvalid && workItemListLength === 1) { // if the work item is new and invalid, and we press shift + tab, we need to focus on the context menu as the item and add item will dissapear
                    tabbableElements[index - 2].focus();
                }
                else {
                    tabbableElements[index - 1].focus(); // if not, we just need to focus on the work item above this as we cannot focus on the check box as this item is saving and it will be disabled
                }
            }
            else {
                if (index === (tabbableElements.length - 1)) { // if we just press tab we need to focus on the next available item which is either the next tile or the next checkbox in the list
                    tabbableElements[0].focus();
                }
                else {
                    tabbableElements[index + 1].focus(); // and if we're at the end, we just need to focus back onto the first element
                }
            }
        }

        event.stopPropagation();
        event.preventDefault();
        if ($.isFunction(this._editEndCallback)) {
            this._editEndCallback(quickAddMode && !isInvalid && isNew);
        }
    }

    public openItem(onWorkItemSaveSuccess?: Function) {
        var workItemId = this.id();

        WITDialogShim.showWorkItemById(workItemId, {
            close: (workItem: WIT.WorkItem) => {
                if (workItemId < 0) {
                    if (workItem.id <= 0) {
                        // new work item was not saved successfully
                        this._discardNewItem();

                        if ($.isFunction(this._saveFailedCallback)) {
                            this._saveFailedCallback();
                        }
                    }
                    else {
                        if ($.isFunction(onWorkItemSaveSuccess)) {
                            onWorkItemSaveSuccess();
                        }
                    }
                }
            }
        });
    }

    private _markComplete(isComplete: boolean, workItemTypeName?: string) {
        var metaState: WorkItemStateCategory;

        if (isComplete === true) {
            metaState = WorkItemStateCategory.Completed;
        }
        else {
            metaState = WorkItemStateCategory.Proposed;
        }

        var errorHandler = () => {
            this.isSaving(false);
            if ($.isFunction(this._saveFailedCallback)) {
                this._saveFailedCallback();
            }
        };
        var originalState = this.item.fieldValue(DatabaseCoreFieldRefName.State);
        var stateValue = AgileUtils.WorkItemUtils.getStateValueForMetaState(metaState, this.item.fieldValue(DatabaseCoreFieldRefName.WorkItemType));
        this.isSaving(true);
        this.item.fieldValue(DatabaseCoreFieldRefName.State, stateValue);

        this.item.beginRefresh().then(
            () => {
                if (!this.item.isValid()) {
                    if (!isComplete) {
                        // The transition from Completed to Proposed is invalid, so attempt the transition to InProgress
                        metaState = WorkItemStateCategory.InProgress;
                        var inProgressStateValue = AgileUtils.WorkItemUtils.getStateValueForMetaState(metaState, this.item.fieldValue(DatabaseCoreFieldRefName.WorkItemType));
                        if (inProgressStateValue) {
                            this.item.fieldValue(DatabaseCoreFieldRefName.State, inProgressStateValue);
                        }
                        if (!this.item.isValid()) {
                            this.item.fieldValue(DatabaseCoreFieldRefName.State, stateValue); // Revert to the "Proposed" mapped state
                            this.item.message(Utils_String.format(AgileControlsResources.Checklist_Invalid_Transition_From_Complete, originalState));
                            errorHandler();
                            return;
                        }
                    }
                    else {
                        // Unable to mark the item as complete, the state is not valid
                        this.item.message(Utils_String.format(AgileControlsResources.Checklist_Invalid_Transition_To_Complete, originalState, stateValue));

                        VSS.using(["Agile/Scripts/Board/BoardsControls", "Agile/Scripts/Resources/TFS.Resources.Agile"], (BoardControls: typeof BoardControls_NO_REQUIRE, AgileResources: typeof AgileResources_NO_REQUIRE) => {
                            var $errorMessage = $("<span>" + Utils_String.format(AgileControlsResources.Checklist_Invalid_Transition_To_Complete_With_Link, originalState, stateValue) + "</>");
                            var $link = $("<a />", {
                                href: AgileControlsResources.Checklist_Invalid_Transition_Link,
                                text: AgileResources.FWLink_LearnMore,
                                target: "learnMore"
                            });
                            $errorMessage.append($link);
                            eventSvc.fire(BoardControls.Tile.CHECKLIST_STATE_TRANSITION_FAILED, $errorMessage);
                        });

                        errorHandler();
                        return;
                    }
                }

                this._saveItem().then(
                    () => {
                        if ($.isFunction(this._saveCompletedCallback)) {
                            this._saveCompletedCallback();
                        }
                    },
                    errorHandler);
            },
            errorHandler);

        if ($.isFunction(this._markCompleteCallback)) {
            this._markCompleteCallback();
        }
    }

    private _saveItem(): Q.IPromise<any> {
        var deferred = Q.defer();
        this.item.beginSave(
            () => {
                this.isSaving(false);
                this.isValid(true);
                deferred.resolve({});
            },
            (error) => {
                this.isValid(false);
                deferred.reject(error);
            });
        return deferred.promise;
    }

    private _discardNewItem() {
        this.discard();
    }

    protected _onWorkItemSaveSuccess(): void {
        this.isSaving(false);
        this.isSaved(true);
        this.isValid(true);
        if ($.isFunction(this._saveCompletedCallback)) {
            this._saveCompletedCallback();
        }
    }
}
