

import ko = require("knockout");

import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Utils_Core = require("VSS/Utils/Core");

/**
 * An item in a dropdown filter.
 */
export class PivotFilterItem {

    /**
     * The name of the item
     */
    public name: KnockoutObservable<string> = ko.observable("");

    /**
     * The value associated with the item
     */
    public value: KnockoutObservable<string> = ko.observable("");

    /**
     * Whether the item is selected
     */
    public selected: KnockoutObservable<boolean> = ko.observable(false);

    constructor(name: string, value: string, selected: boolean) {
        this.name(name);
        this.value(value);
        this.selected(selected);
    }
}

/**
 * A dropdown filter
 */
export class PivotFilter {

    /**
     * The name of the filter
     */
    public name: KnockoutObservable<string> = ko.observable("");

    /**
     * The filter key
     */
    public key: KnockoutObservable<string> = ko.observable("");

    /**
     * The filter values
     */
    public items: KnockoutObservableArray<PivotFilterItem> = ko.observableArray(<PivotFilterItem[]>[]);

    /**
     * The text of the selected item
     */
    public selectedText: KnockoutComputed<string>;

    /**
     * The value of the selected item
     */
    public selectedValue: KnockoutComputed<any>;

    /**
     * Whether the filter is showing the dropdown
     */
    public active: KnockoutObservable<boolean> = ko.observable(false);

    private _valueConverter: { (value: string): string };
    private _widget: Widget;
    private _selectedItem: KnockoutObservable<PivotFilterItem> = ko.observable(null);
    private _popupMenu: Menus.PopupMenu;

    constructor(name: string, key: string, items: PivotFilterItem[], valueConverter: { (value: string): string }) {
        this.name(name);
        this.key(key);
        this._valueConverter = valueConverter;

        this.items.subscribe((newValue: PivotFilterItem[]) => {
            // find the first "selected" item and unselect the rest
            var selectedItem: PivotFilterItem = null;
            $.each(newValue, (index: number, item: PivotFilterItem) => {
                if (item.selected()) {
                    if (!selectedItem) {
                        selectedItem = item;
                    }
                    else {
                        item.selected(false);
                    }
                }
            });

            // select the first item if none were explicitly selected
            this._selectedItem(selectedItem || this.items()[0]);
        });

        this.items(items);

        this.selectedText = ko.computed({
            read: () => {
                var selectedItem: PivotFilterItem = this._selectedItem();
                if (!!selectedItem) {
                    return selectedItem.name();
                }
            }
        });

        this.selectedValue = ko.computed({
            read: () => {
                var selectedItem: PivotFilterItem = this._selectedItem();
                var value: string;
                if (!!selectedItem) {
                    value = selectedItem.value();
                }

                if ($.isFunction(this._valueConverter)) {
                    value = this._valueConverter(value);
                }
                
                return value;
            }
        });
    }

    public setWidget(widget: Widget) {
        this._widget = widget;
    }

    public onDropdownClick(target: PivotFilter, eventArgs: JQueryEventObject) {
        this._disposeExistingPopup();

        var $dropdown: JQuery = this._widget.$element.find(".dropdown");
        // create the dropdown menu
        var popupMenu: Menus.PopupMenu = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, $dropdown, {
            align: "left-bottom",
            showIcon: false,
            items: [{
                childItems: $.map(this.items(), (item: PivotFilterItem, index: number) => {
                    return {
                        text: item.name(),
                        title: item.name(),
                        value: item.value(),
                        selected: item.selected(),
                        action: () => {
                            this.active(false);
                            this._selectedItem(item);
                        }
                    };
                })
            }],
            onDeactivate: () => {
                this.active(false);

                // This ensures that the popup doesn't steal the focus
                this._widget.$element.children("ul.menu-popup").hide();
            }
        });

        Utils_Core.delay(this, 10, function () {
            this.active(true);
            popupMenu.popup($(eventArgs.currentTarget), $dropdown);
        });

        this._popupMenu = popupMenu;

        return false;
    }

    private _disposeExistingPopup() {
        if (this._popupMenu) {
            this._popupMenu.dispose();
            delete this._popupMenu;
        }
    }
}

export class Widget {

    public $element: JQuery;
    private _viewModel: PivotFilter;

    constructor(element: JQuery, options: PivotFilter);

    constructor(element: JQuery, options: Object);

    constructor(element: JQuery, options: any) {
        var that = this;

        this.$element = element;
        this._viewModel = options;

        ko.applyBindings(this._viewModel, this.$element[0]);

        this._viewModel.setWidget(this);
    }

}
