import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Virtualization = require("VSS/Controls/Virtualization");

export interface IRichComboOptions extends Combos.IComboOptions {
    getItemContents: (text: string) => JQuery;
    getItemTooltip?: (value: string) => string;
    dropOptions?: IRichComboDropOptions;
}

export interface IRichComboDropOptions extends Combos.IComboDropOptions {
    /**
     * Appends JQuery item when there is no data to display in droppopup
     */
    emptyRenderer?: () => JQuery;
    getItemTooltip?: (value: string) => string;
}

export class RichComboBehavior<T> extends Combos.ComboListBehavior {
    /**
     * Set the drop control type to control drop pop up behavior
     * @param combo
     * @param options
     */
    constructor(combo: Combos.Combo, options?: IRichComboOptions) {
        super(combo, $.extend({
            dropControlType: RichComboDropPopup
        }, options));
    }
}
Combos.Combo.registerBehavior("richCombo", RichComboBehavior);

/**
 * Custom drop pop up. Overrides ComboListDropPopup virtualizing view which controls rendering
 */
export class RichComboDropPopup<T> extends Combos.ComboListDropPopup {
    /**
     * Override base class to create custom virtualizing list view for grouped rendering
     */
    protected _initializeVirtualization() {
        this.virtualizingListView = <RichVirtualizingListView<T>>Controls.Enhancement.enhance(RichVirtualizingListView, this.getElement(), $.extend(Combos.extendWithout(this._options, ["coreCssClass"]), {
            maxRowCount: this._options.dropCount
        }));
    }
}

/**
 * Controls rendering inside of a drop pop up
 */
export class RichVirtualizingListView<T> extends Virtualization.VirtualizingListView {

    /**
     * Override. Create item and group elements then append to container 
     */
    protected _drawItems(): void {
        // Clear our container and get new bounds
        this._itemsContainer.empty();
        var start = this._firstVisible;
        var end = Math.min(start + this.visibleRowCount, this._dataSource.getCount());
        // No Items to draw, use empty renderer if passed in
        if (start >= end && $.isFunction(this._options.emptyRenderer)) {
            var $emptyItem = $("<li>").addClass(this._options.itemCss);
            $emptyItem.append(this._options.emptyRenderer());
            this._itemsContainer.append($emptyItem);
        }
        else {
            super._drawItems();
        }
    }

    protected _createItem(index: number): JQuery {
        var item = super._createItem(index);
        var text = this._dataSource.getItemText(index) || "";
        if (this._options.getItemTooltip) {
            item.attr("title", this._options.getItemTooltip(text));
        }
        else {
            item.attr("title", text);
        }
        return item;
    }
}

export class RichCombo extends Combos.ComboO<IRichComboOptions> {
    public getInputText(): string {
        return this._input.attr("data-value");
    }

    public setInputText(text: string, fireEvent?: boolean) {
        this._input.empty();
        this._input.append(this._options.getItemContents(text));
        if (this._options.getItemTooltip) {
            this._input.attr("title", this._options.getItemTooltip(text));
        }
        else {
            this._input.attr("title", text);
        }

        // Updating tooltip
        this._input.attr("data-value", text);

        if (fireEvent) {
            this.fireChangeIfNecessary(text);
        }
        else {
            this._currentText = text;
        }
    }

    public setTextSelection(selectionStart: number): void {

    }
}