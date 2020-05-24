/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");

var delegate = Utils_Core.delegate;

/**
 * Recommended structure for an item in a CheckboxList control.
 * Not enforced - you may supply raw string items if preferred.
 */
export interface ICheckboxListItem {
    /**
     * The item's identifier or representative value.
     */
    value: any;

    /**
     * The item's display text. Ignored if 'content' is supplied.
     */
    text?: string;

    /**
     * Custom display element to render instead of 'text'.
     */
    content?: JQuery;

    /**
     * The item's tooltip.
     */
    title?: string;

    /**
     * Whether the item is checked.
     */
    checked: boolean;

    /**
     * Css class to be applied to this item.
     */
    cssClass?: string;
}

export interface ICheckboxListOptions extends Controls.EnhancementOptions {
    /**
     * List of items to be displayed.
     */
    items?: ICheckboxListItem[];

    /**
     * Css class applied to all items.
     */
    itemCssClass?: string;

    /**
     * Determine use arrow keys or TAB for navigation between tree nodes, in arrow keys mode only one node will have tabIndex at one time. 
     * @defaultvalue false
     */
    useArrowKeysForNavigation?: boolean;
}

/**
 * Presents a list view of items, with checkboxes for each item.
 */
export class CheckboxListO<TOptions extends ICheckboxListOptions> extends Controls.Control<TOptions> {

    // TODO: There are several improvements we should consider implementing iteratively.
    //  * Support strong typing of items & options.
    //  * Support strong typing of values via generics - ICheckboxListItem<TValue> & CheckboxList<TValue>.
    //  * Keep the item map updated, such that items returned via get...Items() contain correct 'checked' value.
    //    ... then add a 'getItems()' function now that 'checked' value is reliable.

    public static enhancementTypeName: string = "tfs.checkboxList";

    private _items: ICheckboxListItem[];
    private _checkedItems: any;
    private _idMap: any;
    private _inputHasTabIndex: JQuery;

    /**
     * @param options 
     */
    public initializeOptions(options?: ICheckboxListOptions) {
        super.initializeOptions($.extend(<ICheckboxListOptions>{
            coreCssClass: "checkbox-list",
            tagName: "ul"
        }, options));
    }

    public initialize() {
        super.initialize();

        this.setItems(this._options.items);

        // Attach event handlers
        this._bind("click", delegate(this, this._onCheckClick));
        if (this._options.useArrowKeysForNavigation) {
            this._bind("keydown", (e: JQueryKeyEventObject) => {
                switch (e.keyCode) {
                    case Utils_UI.KeyCode.UP:
                        let prevItem = $(e.target).closest("li").prev("li").find("input[type=checkbox]");
                        if (prevItem.length > 0) {
                            this._inputHasTabIndex && this._inputHasTabIndex.attr("tabIndex", -1);
                            this._inputHasTabIndex = prevItem.attr("tabIndex", 0).focus();
                            return false;
                        }
                        break;
                    case Utils_UI.KeyCode.DOWN:
                        let nextItem = $(e.target).closest("li").next("li").find("input[type=checkbox]");
                        if (nextItem.length > 0) {
                            this._inputHasTabIndex && this._inputHasTabIndex.attr("tabIndex", -1);
                            this._inputHasTabIndex = nextItem.attr("tabIndex", 0).focus();
                            return false;
                        }
                        break;
                }
            });
        }
    }

    public enableElement(enabled: boolean) {
        super.enableElement(enabled);
        Utils_UI.enableElement(this.getElement().find("input"), enabled);
    }

    public setItems(items: any[]) {
        this._items = items || [];
        this._draw();
    }

    public getCheckedItems(): any[] {
        return this._items.filter(item => this._checkItemState(item, true));
    }

    public getUncheckedItems(): any[] {
        return this._items.filter(item => this._checkItemState(item, false));
    }

    public getCheckedValues(): any[] {
        return this.getCheckedItems().map(item => this._getItemValue(item));
    }

    public getUncheckedValues(): any[] {
        return this.getUncheckedItems().map(item => this._getItemValue(item));
    }

    public setCheckedValues(values: any[]) {
        const valueMap = Utils_Array.toDictionary(values, v => v, v => true);
        for (let v of this.getCheckedValues()) {
            if (v in valueMap) {
                delete valueMap[v];
            }
            else {
                this.getElement().find("#" + this._idMap[v]).prop("checked", false);
                delete this._checkedItems[v];
            }
        }

        for (let v in valueMap) {
            if (valueMap.hasOwnProperty(v)) {
                this.getElement().find("#" + this._idMap[v]).prop("checked", true);
                this._checkedItems[v] = true;
            }
        }
    }

    public _initializeElement() {
        if (!this._options.id) {
            this._options.id = "cbl_" + Controls.getId();
        }

        super._initializeElement();
    }

    private _getItemValue(item: any): any {
        let value: any = null;
        if (typeof item === "string") {
            value = item;
        }
        else if (item) {
            if (typeof item.value !== "undefined") {
                value = item.value;
            }
            else if (typeof item.text !== "undefined") {
                value = item.text;
            }
        }

        return value;
    }

    private _checkItemState(item: any, state: boolean): boolean {
        let value = this._getItemValue(item);
        if (value !== null && value !== undefined && (value in this._checkedItems) === state) {
            return true;
        }

        return false;
    }

    private _draw() {
        this.getElement().empty();
        this._checkedItems = {};
        this._idMap = {};
        $.each(this._items || [], (index: number, item: ICheckboxListItem) => {
            var text: string, value: any, checked: boolean, content: JQuery;
            var id = this._options.id + "_cb" + index;

            if (typeof item === "string") {
                text = <any>item;
            }
            else if (item) {
                text = item.text;
                value = item.value;
                checked = item.checked;
                content = item.content;
            }

            text = text || value;

            if (value === null || value === undefined) {
                value = text;
            }

            // Build the actual item.
            if (text != null || content != null) {
                var $li = $("<li />");

                // Add item css class
                if (this._options.itemCssClass) {
                    $li.addClass(this._options.itemCssClass);
                }

                if (item.cssClass) {
                    $li.addClass(item.cssClass);
                }

                // Build the checkbox.
                var $cb = $("<input />")
                    .data("value", value)
                    .attr("type", "checkbox")
                    .attr("id", id)
                    .data("index", index)
                    .appendTo($li);

                if (checked) {
                    $cb.prop("checked", true);
                    this._checkedItems[value] = true;
                }

                // Build the label.
                var $label = $("<label />").attr("for", id);
                if (content) {
                    $label.append(content);
                } else {
                    $label.text(text);
                }

                $label.appendTo($li);

                // Set tabIndex
                if (this._options.useArrowKeysForNavigation) {
                    if (index === 0) {
                        this._inputHasTabIndex = $cb;
                    }
                    else {
                        $cb.attr("tabIndex", -1);
                    }
                }

                this.getElement().append($li);

                this._idMap[value] = id;
            }
        });
    }

    /**
     * @param e 
     * @return 
     */
    private _onCheckClick(e?: JQueryEventObject): any {

        var $target = $(e.target), value,
            isChecked = false;

        if ($target.is("input[type=checkbox]")) {
            value = $target.data("value");
            if ($target.prop("checked")) {
                this._checkedItems[value] = true;
                isChecked = true;
            }
            else {
                delete this._checkedItems[value];
            }

            if (this._options.useArrowKeysForNavigation) {
                this._inputHasTabIndex && this._inputHasTabIndex.attr("tabIndex", -1);
                this._inputHasTabIndex = $target.attr("tabIndex", 0);
            }

            this._fireChange([value, isChecked]);
        }
    }
}

export class CheckboxList extends CheckboxListO<ICheckboxListOptions> { }

Controls.Enhancement.registerJQueryWidget(CheckboxList, "checkboxList");

