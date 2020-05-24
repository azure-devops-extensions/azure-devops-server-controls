///<amd-dependency path="jQueryUI/sortable"/>
///<amd-dependency path="jQueryUI/core"/>

import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import AdminDialogFieldContracts = require("Admin/Scripts/TFS.Admin.Dialogs.FieldContracts");
import Utils_UI = require("VSS/Utils/UI");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");

var domElem = Utils_UI.domElem;

export class AddEditFieldDialogTabs extends Controls.BaseControl {
    private _itemList: AdminDialogFieldContracts.AddEditFieldDialogTabItem[];

    constructor(options?: any) {
        /// <param name="options" type="any" />
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "add-field-dialog-tabs",
        }, options));
    }

    public initialize() {
        super.initialize();

        var $ul: JQuery;
        this._itemList = this._options.source;

        $ul = $("<ul />")
            .addClass("items")
            .attr("role", "tablist");
        $.each(this._options.source, (i, item) => {
            if (item.visible) {
                var $li = this._makeElement(item);
            }
            $ul.append($li);
        });

        this._element.append($ul);
    }

    public selectItem(item: AdminDialogFieldContracts.AddEditFieldDialogTabItem): void {
        $("li.tab-item.selected", this._element).removeClass("selected").attr("tabindex", "-1");
        var itemUI = $("#add-field-tab-item-" + item.id, this._element);
        if (itemUI) {
            itemUI.addClass("selected");
            itemUI.attr("tabindex", "0");
        }

        if ($.isFunction(item.callback)) {
            item.callback();
        }
    }

    public setItemIsVisible(item: AdminDialogFieldContracts.AddEditFieldDialogTabItem, isVisible: boolean) {
        var itemUI = $("#add-field-tab-item-" + item.id, this._element);
        if (itemUI) {
            if (isVisible) {
                itemUI.show();
            }
            else {
                itemUI.hide();
            }
        }
    }

    private _makeElement(item: AdminDialogFieldContracts.AddEditFieldDialogTabItem): JQuery {
        var $li = $("<li />")
            .text(item.label)
            .addClass("tab-item").addClass("propagate-keydown-event")
            .attr("id", "add-field-tab-item-" + item.id)
            .attr("tabindex", "-1")
            .attr("role", "tab")
            .attr("aria-controls", item.controls);

        Utils_UI.tooltipIfOverflow($li[0], { titleText: item.label });

        if (item.errorId) { // need to render error icon
            $li.append(`<div class="icon bowtie-icon bowtie-status-error"
                             style="position: absolute; left: 100px; display: none;"
                             id="${item.errorId}"
                             title="${AdminResources.AddFieldDialog_ErrorsInTab}" />`);
        }

        $li.click((e?: JQueryEventObject) => {
            this.selectItem(item);
        }).keydown((e: JQueryEventObject) => {
            if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                this.selectItem(item);
                return false;
            }

            if (e.keyCode === Utils_UI.KeyCode.DOWN) {
                let curFocusedElement = $("li.tab-item:focus", this._element);
                let nextElement = curFocusedElement.next();
                if (nextElement.length > 0) {
                    nextElement[0].focus();
                }
                return false;
            }

            if (e.keyCode === Utils_UI.KeyCode.UP) {

                let curFocusedElement = $("li.tab-item:focus", this._element);
                let prevElement = curFocusedElement.prev();
                if (prevElement.length > 0) {
                    prevElement[0].focus();
                }
                return false;
            }
        })

        return $li;
    }
}

export interface PicklistValidationResult {
    passed: boolean;
    message?: string;
}

export class PicklistControl extends Controls.BaseControl {
    private _model: ProcessContracts.PickList;
    private _picklistElements: SortableListControl;
    private _isNumeric: boolean;
    private _validationMessageChangedCallback: IResultCallback;
    private _inputItemFocusOutCallback: () => void;

    public onValidationChanged(callback: IResultCallback) {
        this._validationMessageChangedCallback = callback;
    }

    public onInputItemFocusOut(callback: () => void) {
        this._inputItemFocusOutCallback = callback;
    }

    public validateInput(text: string): PicklistValidationResult {
        return PicklistControl.validateInput(text, this._isNumeric, this._picklistElements.getItems(), this._options.maxPicklistItemsPerList);
    }

    /**
     * Expose directly to simplify unit testing.
     */
    public static validateInput(text: string, isNumeric: boolean, existingElements: string[], maxPicklistItems: number): PicklistValidationResult {
        if (text === "") { // just no text entered, doing nothing
            // The validation should not pass, but no validation messages should be displayed
            return {
                passed: false,
            };
        }

        // Normalization and validation of the numeric value
        if (isNumeric) {
            var convertedValue: number;
            if (/^[\-+]?\d+$/.test(text)) {
                convertedValue = Utils_Number.parseLocale(text);
            } else {
                return {
                    passed: false,
                    message: AdminResources.AddFieldDialog_InvalidIntegerValue
                };
            }
            if (!TFS_Admin_Common.isInt32Range(convertedValue)) {
                return {
                    passed: false,
                    message: AdminResources.PicklistIntRangeValidationMessage
                }
            }
            text = String(convertedValue);
        }

        if (text.length > 255) {
            return {
                passed: false,
                message: AdminResources.PicklistItemCannotBeMoreThan255Chars
            };
        }

        var alreadyExists: boolean = !existingElements.every((value: string) => {
            if (value.toUpperCase() === text.toUpperCase()) {
                return false;
            }
            else {
                return true;
            }
        });

        if (alreadyExists) {
            return {
                passed: false,
                message: AdminResources.PicklistItemAdreadyExists
            };
        }

        if (existingElements.length >= maxPicklistItems) {
            return {
                passed: false,
                message: Utils_String.format(AdminResources.PicklistSizeLimitValidationMessage, maxPicklistItems)
            };
        }

        return {
            passed: true
        };
    }

    constructor(options?: any) {
        super(options);
    }

    public initialize(model?: ProcessContracts.PickList, isNumeric: boolean = false) {
        super.initialize();

        this._isNumeric = isNumeric;

        this._model = model;
        this._createUiElements();
    }

    /** Adds listener to add/delete item events */
    public addListChangeListener(callback: IResultCallback): void {
        this._picklistElements.addListChangeListener(() => {
            callback();
        });
    }

    /** Adds listener to add/delete item events */
    public addListItemDeleteListener(callback: IResultCallback): void {
        this._picklistElements.addListItemDeleteListener(() => {
            callback();
        });
    }

    /** Returns the list of currently available items in the picklist */
    public getPicklistElements(): string[] {
        if (this._picklistElements) {
            return this._picklistElements.getItems();
        }
        return [];
    }

    public getUnsavedPicklistItem(): string {
        var newItem: JQuery = $("#new-item-text", this._element);
        var text: string = newItem.val();
        text = text.trim();
        return text;
    }

    /*
     * Adds the current text in the input box as a new picklist element
    */
    private _addItemFromInput(): void {
        var text: string = this.getUnsavedPicklistItem();

        var validationResult: PicklistValidationResult = this.validateInput(text);
        if (!validationResult.passed) {
            this.setValidationMessage(validationResult.message);
            return;
        }

        // If validation passed, make sure the number is in a friendly format
        if (this._isNumeric) {
            text = parseInt(text, 10).toFixed();
        }

        // Add the item and get the location where it was added
        var itemLocation: number = Math.max(this._picklistElements.addItem(text), 0);
        // Get the total number of items now in the list
        var itemCount: number = Math.max(this._picklistElements.getItemsCount(), 1);

        $("#new-item-text", this._element).val("");
        this.setValidationMessage("");

        var picklistElements: JQuery = $(".picklist-elements .listitem-element");

        // Scroll the item into view
        picklistElements[itemLocation].scrollIntoView();
        this.focusInput();
    }

    private _validationErrorPanel(): JQuery {
        var errorPanel = $("#picklist-error-message", this._element[0]);
        return errorPanel;
    }

    /** Returns true if the control is currently showing the validation message */
    public hasValidationMessage(): boolean {
        return this._validationErrorPanel().text() !== "";
    }

    public setValidationMessage(message: string): void {
        this._validationErrorPanel().text(message);
        if (this._validationMessageChangedCallback) {
            this._validationMessageChangedCallback.call(message);
        }
    }

    /** Adds (default) mark to the item and makes it bold
      * @param item The item to be marked as default. If the item does not exists in the list, no default mark will be defined. If (default) mark already defined for another item, the mark will be removed.
      * @returns true if item found and successfully maked as default.
    */
    public setDefaultItem(item: string): boolean {
        return this._picklistElements.setDefaultItem(item);
    }

    private _initializePickListElements() {
        var elems: string[] = [];
        var id = "picklist";
        if (this._model) {
            elems = $.map(this._model.items, (i) => { return i; });
            id = this._model.id;
        }
        this._picklistElements.initialize(elems, id);
    }

    private _createUiElements(): void {

        var inputWatermark = this._isNumeric ? AdminResources.EnterANumericValue : AdminResources.EnterAValue;

        this._element[0].innerHTML =
            `<div style="display: table-row">
                        <div style="display: table-cell"></div>
                        <div style="display: table-cell" class="error-message" id="picklist-error-message"></div>
                    </div>
                    <div style="display: table-row">
                        <label style="display: table-cell" id="picklist-items-text" for="new-item-text">${AdminResources.PicklistItems}</label>
                        <div style="display: table-cell">
                            <input type="text" class="new-item-name" id="new-item-text" placeholder="${inputWatermark}" maxlength="255"></input>
                            <div class="add-new-item-button-container tab-item" id="add-new-picklist-item-button" tabindex="0" role="button" aria-label="${AdminResources.PicklistAddItem}"><div class="bowtie-icon bowtie-math-plus-light"></div><span class="add-item-text">${AdminResources.PicklistAddItem}</span></div>
                        </div>
                    </div>
                    <div class="picklist-elements"></div>`;

        var inputBox = $('#new-item-text', this._element);
        inputBox.keypress((e: JQueryKeyEventObject) => {
            // Add to list on enter press
            if (e.which === Utils_UI.KeyCode.ENTER) {
                e.preventDefault();
                this._addItemFromInput();
                return false;
            }
        }).keyup((event: JQueryKeyEventObject) => {
            // Do not share events
            // Dialog should not close on enter
            event.stopPropagation();
        }).keydown((e: JQueryEventObject) => {
            // Do not share events
            // Dialog should not close on enter
            e.stopPropagation();
        }).focusout((e: JQueryEventObject) => {
            if (this._inputItemFocusOutCallback) {
                this._inputItemFocusOutCallback();
            }
        });

        var listControlOptions = { isNumeric: this._isNumeric, isSortable: false };
        this._picklistElements = <SortableListControl>Controls.BaseControl.createIn(SortableListControl,
            $(".picklist-elements", this._element[0]), listControlOptions);
        this._initializePickListElements();

        // Add field button click    
        $("#add-new-picklist-item-button", this._element[0]).bind("click", () => {
            this._addItemFromInput();
        });

        // add field button "enter" key
        $("#add-new-picklist-item-button", this._element[0]).keyup((e: JQueryKeyEventObject) => {
            // Add to list on enter press
            if (e.which === Utils_UI.KeyCode.ENTER) {
                e.preventDefault();
                this._addItemFromInput();
            }
        });
    }

    public focusInput(): void {
        $('#new-item-text', this._element).focus();
    }
}

export class SortableListControl extends Controls.BaseControl {
    private _model: string[];


    /** The limit for the visible part of item in characters 
      * If the item is exceeding the limit, the string will be truncated and "..." will be added to the end of the item. The text itself will not be changed */
    private static MAX_VISIBLE_ITEM_SIZE: number = 35;

    /** The id suffix to keep the identifiers in the list unique
    */
    private _listId: string;
    private _lastItemId: number = 0;
    private _listChangeCallback: IResultCallback;
    private _listItemDeletedCallback: IResultCallback;
    private _itemsCount: number = 0;
    private _isNumeric: boolean = false;
    private _isSortable: boolean = false;

    private _focusedListItem: JQuery;
    private _highlightedListItem: JQuery;

    constructor(options?: any) {
        super(options);

        if (options) {
            this._isNumeric = options.isNumeric;
            this._isSortable = options.isSortable;
        }
    }

    private _fireListChangeEvent(): void {
        if (this._listChangeCallback) {
            this._listChangeCallback();
        }
    }

    private _fireListItemDeleteEvent(): void {
        if (this._listItemDeletedCallback) {
            this._listItemDeletedCallback();
        }
    }

    private _getListId(): string {
        return "list-elements-" + this._listId;
    }

    public initialize(model?: string[], id?: string) {
        if (id) {
            this._listId = id;
        }
        else {
            this._listId = "noid";
        }
        this._model = model;
        this._createUiElements();
    }

    private _getItemsNodes(): JQuery {
        return $("#" + this._getListId(), this._element).children();
    }

    private _getItemText(item: JQuery) {
        return item.data("fulltext");
    }

    private _getItemsText(items: JQuery): string[] {
        var result: string[] = [];
        for (var i: number = 0; i < items.length; i++) {
            result.push(this._getItemText($(items[i])));
        }
        return result;
    }
    
    /** Sets the item content.
      * @param item The <li> item
      * @param text The full text for the item. No need to trncate the text
      * @param isDefault Adds (default) to the item and marks it bold
    */
    private _setItemText(item: JQuery, text: string, isDefault: boolean = false) {
        // The text to show in the list 
        var itemText: string = text;

        var textDiv: JQuery = $(".sanitized-text", item);

        if (isDefault) {
            itemText += " (" + AdminResources.DefaultPicklistElement + ")";
            item.addClass("default-item");
        }
        else {
            item.removeClass("default-item");
        }

        $(".sanitized-text", item).text(itemText);
        $(".listitem-text", item).attr("title", itemText);
        item.data("fulltext", text);
    }

    /** Adds (default) mark to the item and makes it bold
      * @param item The item to be marked as default. If the item does not exists in the list, no default mark will be defined. If (default) mark already defined for another item, the mark will be removed.
      * @returns true if item found and successfully maked as default.
    */
    public setDefaultItem(item: string): boolean {
        // Firstly, find the item which maked as default and remove the mark
        var defaultItem: JQuery = $(".default-item", this._element);
        if (defaultItem.length > 0) {
            this._setItemText(defaultItem, this._getItemText(defaultItem), false);
        }

        // Looking for element and marking it as default
        var items: JQuery = this._getItemsNodes();
        for (var i: number = 0; i < items.length; i++) {
            var itemText: string = this._getItemText($(items[i]));
            if (itemText === item) {
                this._setItemText($(items[i]), itemText, true);
                return true;
            }
        }
        return false;
    }

    public getItemsCount(): number {
        return this._itemsCount;
    }

    /** Adds listener to add/delete item events */
    public addListChangeListener(callback: IResultCallback): void {
        this._listChangeCallback = callback;
    }

    /** Adds listener to delete item events */
    public addListItemDeleteListener(callback: IResultCallback): void {
        this._listItemDeletedCallback = callback;
    }

    /** Adds new element to the list
     *  Returns the index at which the item was added (-1 if not successful)
    */
    public addItem(text: string): number {
        var that = this;
        
        var items : JQuery = this._getItemsNodes();
        var listItems : string[] = this._getItemsText(items);
        var insertionPosition = this.searchInsertPosition(listItems, text);
        if(insertionPosition === this.DUPLICATEFOUND){
            return this.DUPLICATEFOUND;
        }
        listItems.splice(insertionPosition, 0, text);

        // Find where to add the item
        for (var i: number = 0; i < listItems.length; i++) {
            // Check if we're at the point to add the item
            if (listItems[i] === text || listItems.length === 1 || i === items.length) {
                var itemToAdd: string;

                var gripperDisplayStyle = this._isSortable ? "" : "display: none;";
                itemToAdd = `
                    <li class="ui-state-default listitem-element tab-item" id="item-${this._lastItemId}" ` + (i === 0 ? `tabindex="0"` : `tabindex="-1"`) + `>
                        <div class="listitem-border">
                            <div class="listitem-text"><div class="picklist-gripper-container" style="${gripperDisplayStyle}"><div class="gripper" id="gripper-${this._lastItemId}" style="display: none;"></div></div>
                            <div class="sanitized-text"></div>
                        </div>
                        <div class="delete-listitem bowtie-icon bowtie-edit-delete" id="delete-${this._lastItemId}" style="display: none;"></div>
                    </div>
                    </li>`;

                // if there's only one item in the list, or we're at the end, append
                if (listItems.length == 1 || i == items.length) {
                    $("#" + this._getListId(), this._element[0]).append(itemToAdd);
                }
                else {
                    $(itemToAdd).insertBefore($(items[i]));
                }

                var listItem: JQuery = $(".listitem-element#item-" + this._lastItemId, this._element[0]);



                // The tooltip with full element text
                this._setItemText(listItem, listItems[i]);

                // Delete logic
                $(".delete-listitem#delete-" + this._lastItemId, this._element[0]).bind("click", function (event) {
                    listItem.remove(); // element->div->li
                    that._itemsCount--;
                    that._fireListChangeEvent();
                    that._fireListItemDeleteEvent();
                });

                listItem.keyup((e: JQueryKeyEventObject) => {
                    if (e.which === Utils_UI.KeyCode.DELETE) { // delete
                        var itemToSelect: JQuery = listItem.next();
                        if (!itemToSelect || itemToSelect.length === 0) { // Deleting the last item. so need to select previous item
                            itemToSelect = listItem.prev();
                        }

                        listItem.remove();

                        that._itemsCount--;
                        that._fireListChangeEvent();
                        that._fireListItemDeleteEvent();

                        if (itemToSelect && itemToSelect.length !== 0) {
                            itemToSelect.focus();
                        }

                        e.preventDefault();
                    }

                    if (e.which === Utils_UI.KeyCode.UP) { // up
                        var itemToSelect: JQuery = listItem.prev();
                        if (itemToSelect && itemToSelect.length !== 0) {
                            itemToSelect.focus();
                        }
                        e.preventDefault();
                    }

                    if (e.which === Utils_UI.KeyCode.DOWN) { // down
                        var itemToSelect: JQuery = listItem.next();
                        if (itemToSelect && itemToSelect.length !== 0) {
                            itemToSelect.focus();
                        }
                        e.preventDefault();
                    }
                });

                // Gripper and Delete should be visible only on hover
                listItem.mouseenter(
                    (event) => { // Move in
                        if (that._isSortable) {
                            $(".gripper", listItem).show();
                        }
                        $(".delete-listitem", listItem).show();
                        this._highlightedListItem = listItem;
                    }
                );
                listItem.mouseleave(
                    (event) => { // Move out
                        if (that._isSortable) {
                            $(".gripper", listItem).hide();
                        }

                        if (this._focusedListItem !== listItem) { // Removing the "X" icon only if the item is not already been focused by keyboard
                            $(".delete-listitem", listItem).hide();
                        }
                        this._highlightedListItem = null;
                    }
                );

                listItem.focusin( // Got the focus
                    (event) => {
                        $(".delete-listitem", listItem).show();
                        this._focusedListItem = listItem;
                    });

                listItem.focusout( // Lose the focus
                    (event) => {
                        if (this._highlightedListItem !== listItem) { // Removing the "X" icon only if the item is not already been highlighted by mouse
                            $(".delete-listitem", listItem).hide();
                        }
                        this._focusedListItem = null;
                    });

                this._lastItemId++;
                this._itemsCount++;
                this._fireListChangeEvent();
                return i;
            }
        }

        return -1;
    }

    /** Returns the array of items currently present in the UI
    */
    public getItems(): string[] {
        var result: string[] = [];
        var items: JQuery = this._getItemsNodes();
        for (var i: number = 0; i < items.length; i++) {
            result.push(this._getItemText($(items[i])));
        }
        return result;
    }

    /** Creates the list container and renders the model
    */
    private _createUiElements(): void {
        if (this._isSortable) {
            this._element[0].innerHTML = Utils_String.format('<ul id="{0}" class="sortable-list" aria-label="{1}"></ul>', this._getListId(), AdminResources.PickListItemsListName);
        }
        else {
            this._element[0].innerHTML = Utils_String.format('<ul id="{0}" class="unsortable-list" aria-label="{1}"></ul>', this._getListId(), AdminResources.PickListItemsListName);
        }

        if (this._model) {
            for (var i: number = 0; i < this._model.length; i++) {
                this.addItem(this._model[i]);
            }
        }

        if (this._isSortable) {
            $("#" + this._getListId(), this._element[0]).sortable();
        }

        $("#" + this._getListId(), this._element[0]).disableSelection();
    }

    private _getOrderedListElements(itemText: string[]): string[] {
        return itemText.sort((a, b) => {
            var aText: string = a.toLocaleLowerCase();
            var bText: string = b.toLocaleLowerCase();

            if (this._isNumeric) {
                var aNum: number = parseFloat(aText);
                var bNum: number = parseFloat(bText);

                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return aNum - bNum;
                }
            }

            return aText > bText ? 1 : aText < bText ? -1 : 0;
        });
    }

    private DUPLICATEFOUND = -1;

    private searchInsertPosition(items: string[], newItem: string):number{
        if(items === null || items.length == 0){
            //Add newItem 0th position in such case.
            return 0; 
        }
        var low: number = 0;
        var high: number = items.length -1;

        if(this.compare(newItem,items[low]) < 0 ) {
            //this means the newItem value is lower than the first item in the list, so add it to the first position. 
            return low;
        }

        if(this.compare(newItem, items[high]) > 0 ) {
            //this means the newItem value is higher than the higher item in the list, so add it to the next to last position.
            return high+1;
        }

        while(low<=high){
            var mid : number = Math.floor(low + (high - low)/2);
            if(this.compare(newItem,items[mid]) === 0 ){
                //Duplicate entry already in the list. This means the item is already present in the list.
                return this.DUPLICATEFOUND; 
            }else if(this.compare(newItem,items[mid]) < 0) {
                high = mid-1;
            }else if(this.compare(newItem,items[mid]) > 0){
                low = mid +1 ;
            }
        }
        return low;
    }

    private compare(aText : string , bText : string): number {
        if(this._isNumeric){
                var aNum: number = parseFloat(aText);
                var bNum: number = parseFloat(bText);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return aNum - bNum;
                }
        }
        return aText.localeCompare(bText);
    }
}

VSS.tfsModuleLoaded("TFS.Admin.Controls.AddField", exports)
