/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import WidgetResources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import MultiLine = require("Widgets/Scripts/Shared/MultiLineTextBlockControl");
import * as Utils_UI from "VSS/Utils/UI";
import * as StringUtils from "VSS/Utils/String";
import { HiddenFieldControl, HiddenFieldControlOptions } from "Presentation/Scripts/TFS/TFS.UI.Controls.MoreInfoControl";

//TODO: We need a sane model for passing pixel sizes around, and converting widget size to pixels.
//This needs to exist for 3rd party when we do Lightbox support.
export interface SizeOptions {
    width?: number;
    height?: number;
}


export interface CountFilterItem {
    /*The bowtie icon string for the filter items, if not set it will display color bar*/ 
    icon?: string;

    /* The color associated with the filter item*/
    color: string;

    /* The label for the filter item*/
    label: string;

    /*A number associated with the filter item (e.g. count)*/
    value: number;
}

/**Extension contract for packing "other" information on items */
export interface OtherCountFilterItem extends CountFilterItem {
    /* The set of filter items associated with this item*/
    otherItemSet: CountFilterItem[]
}

export interface ItemListControlOptions extends Controls.EnhancementOptions {
    source?: CountFilterItem[];
    size?: SizeOptions;
    onSelectionChanged?(selection: CountFilterItem[]);

    /*the delegate to draw color and icon*/
    colorAndIconDrawer: (container: JQuery, color: string, icon: string, tooltip?: string) => void;

    /*the margin for value to be away from color and icon*/
    marginForColorAndIcon?: string;

    /**
    * Default value is 2, which would display up to 99 and 99+ for anything above
    * support 3 as well, which would display up to 999 and 999+ for anything above
    * any other number would be ignore and set to 2.
    */
    maxNumberDigit?: number;
}

export class ItemListControl extends Controls.Control<ItemListControlOptions> {
    public static ColorClass = "item-color";
    public static NumberClass = "item-number";
    public static NumberSuffixClass = "item-number-suffix";
    public static DisplayClass = "item-label";

    public static WidthPerInstance = 120;

    private selectedId: number;
    private elementList: HTMLElement[];
    private itemList: CountFilterItem[];
    private renderedItems: CountFilterItem[];

    constructor(options?: ItemListControlOptions) {
        /// <param name="options" type="any" />
        super(options);
    }

    public initializeOptions(options?: ItemListControlOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "item-list-control"
        }, options));

        if (this._options && this._options.source) {
            this.itemList = this._options.source;
        } else {
            this.itemList = [];
        }
    }

    public initialize() {
        super.initialize();

        if (this.itemList) {
            this.renderSize(this._options.size);
        }
    }

    /**
     * Passes the set of Items to render in the list.
     * This is supported to de-couple control creation from init. If not needed, we can do this step during control creation.
     * @param itemList
     */
    public setItems(itemList: CountFilterItem[]): void {
        this.itemList = itemList;
        this.renderSize(this._options.size, true);
    }

    /**
     * Renders the visible elements of control using existing settings, with supplied sizeOptions
     * Keeping the selection of the item list control. The selection would get clear if get ungroup or group into the other
     * @param options
     */
    public renderSize(sizeOptions?: SizeOptions, keepSelection?: boolean) {
        var previousSelectedLabel: string;
        var previousSelectedId: number;

        //On resize, the number of grouping elements can change. Where the selected grouping is affected, we would clear the selection.
        if (keepSelection && this.selectedId != null) {
            previousSelectedLabel = this.getSelectedItem().label;
            previousSelectedId = this.selectedId;
        }

        //If we have a description of the available space, we need to limit the # of visible elements
        this.getElement().empty();


        var maxElements = null;
        if (sizeOptions && sizeOptions.width) {

            if (this._options.size !== sizeOptions) {
                this._options.size = sizeOptions;
            }
            maxElements = Math.max(0, Math.floor((sizeOptions.width / ItemListControl.WidthPerInstance)));

            // Sort the options from largest to smallest
            this.itemList.sort(this.compare);

            var otherBucket: OtherCountFilterItem = null;
            var elementsToShow = maxElements;
            if (this.itemList.length > maxElements) {
                otherBucket = {
                    color: "#777",
                    label: WidgetResources.CountFilterList_Other,
                    value: 0,
                    otherItemSet: []
                };
                elementsToShow = maxElements - 1;
            }

            var outputList: CountFilterItem[] = [];
            this.itemList.forEach((value: CountFilterItem, index: number) => {
                if (index < elementsToShow) {
                    outputList.push(value);
                } else {
                    otherBucket.value += value.value;
                    otherBucket.otherItemSet.push(value);
                }
            });

            if (otherBucket) {
                outputList.push(otherBucket);
            }

            this.renderItems(outputList, sizeOptions.width);

            // If the keepSelection is on, and the label from pre-rendering match label after render, we re-select the item
            if (keepSelection) {
                var match = false;
                outputList.forEach((item, index) => {
                    // We are using both Label and Id just so we don't run into the case of the 'Other' label
                    if (index === previousSelectedId && item.label === previousSelectedLabel) {
                        this.setSelectedItem(index);
                        match = true;
                    }
                });
                if (!match) {
                    this.notifyListener();
                }
            }
        }
    }

    private compare(a: CountFilterItem, b: CountFilterItem) {
        if (a.value > b.value) {
            return -1;
        }
        if (a.value < b.value) {
            return 1;
        }
        return 0;
    }

    /**
     * Toggles selection for the specified element, and clears all other selections.
     * @param id
     * @param toggleOn
     */
    public toggleSelection(id: number, toggleOn: boolean) {
        if (this.selectedId >= 0) {
            this.toggleSelectionElement($(this.elementList[this.selectedId]), false);
        }

        if (toggleOn == true && id >= 0 && id < this.elementList.length) {
            this.selectedId = id;
            this.toggleSelectionElement($(this.elementList[id]), true);
        } else {
            this.selectedId = null;
        }
    }

    private toggleSelectionElement($element: JQuery, toggleOn: boolean) : void {
        if (toggleOn) {
            $element.addClass("selected").find("a").attr("aria-pressed", "true");
        }
        else
        {
            $element.removeClass("selected").find("a").attr("aria-pressed", "false");
        }
    }

    /**
     * request control to change the selection state.
     * @param item
     */
    public selectItem(item: HTMLElement) {
        ///<summary>Selects the element assocatiated with the list item</summary>
        var index = this.elementList.indexOf($(item).parent("li")[0]);
        this.setSelectedItem(index);
    }

    public setSelectedItem(index: number) {
        if (index >= 0) {
            var toggleOn = index !== this.selectedId;
            this.toggleSelection(index, toggleOn);
        }
        this.notifyListener();
    }

    /**
     * Exposes the currently select item.
     * If other item is selected, the caller must interpret that.
     */
    public getSelectedItem(): CountFilterItem {
        return this.renderedItems[this.selectedId];
    }

    /**
     * Tell listeners the selection state has changed, with a payload of 0, 1 or many elements.
     */
    public notifyListener(): void {

        var notifyHandler = this._options.onSelectionChanged;
        if ($.isFunction(notifyHandler)) {
            var payload: CountFilterItem[] = [];
            var selected = this.getSelectedItem();
            if (selected) {
                //Other Item needs to be interpreted, to expose the items in contains
                //Could use concrete types to encapsulate, but that is more hassle for consumer construction
                payload = ((selected as OtherCountFilterItem).otherItemSet) || [selected];
            }
            notifyHandler(payload);
        }
    }

    private renderItems(itemList: CountFilterItem[], availableWidth: number) {
        var $li: JQuery,
            $ul: JQuery;
        this.renderedItems = itemList;
        this.elementList = [];
        this.selectedId = null;
        $ul = $("<ul />").addClass("items");

        //Req: Control shifts any surplus + 20px of space away from last element equally to all prior elements
        //If we have a single element, it can have all surplus space.
        var lastElementWidthAdjustment = availableWidth;

        var lastElementReduction = 4;
        if (itemList.length > 1) {
            var surplusSpace = availableWidth - (itemList.length * ItemListControl.WidthPerInstance);
            var perItemWidthSurplus = (lastElementReduction + surplusSpace) / itemList.length;
            lastElementWidthAdjustment = -lastElementReduction;
        }

        // when there is only 1 item in the list, don't allow interaction with control
		let isInteractive = itemList.length > 1;

        $.each(itemList, (i: number, item: CountFilterItem) => {
            //If we're on the last item, use last element adjustment
            var activeWidthAdjustment = (i === itemList.length - 1) ? lastElementWidthAdjustment : perItemWidthSurplus;
            $li = this.renderElement(item, activeWidthAdjustment, isInteractive);
            this.elementList[i] = $li[0];
            $ul.append($li);
        });

        this.getElement().append($ul);
    }

    private getTooltipText(item: CountFilterItem): string {
        return StringUtils.format(WidgetResources.ItemListControl_TooltipTextFormat, item.label, item.value);
    }

    /**
     * Renders the item control
     * @param item
     * @param widthAdjustment : this is an integer, which allows the element to be larger OR smaller than default size
	 * @param isInteractive describes if the element can be interacted with by keyboard and mouse
     */
    private renderElement(item: CountFilterItem, widthAdjustment: number, isInteractive: boolean): JQuery {
        var that: ItemListControl = this;

        var $li = $("<li />");
        var $link = $("<a>")
            .appendTo($li);

        if (item.value > this.getMaxFilterValue()) {
            RichContentTooltip.add(this.getTooltipText(item), $link);
            $link.attr("aria-label", item.value);
        }

        var describedByElement = Controls.Control.create<HiddenFieldControl, HiddenFieldControlOptions>(HiddenFieldControl, $li, {
            description: StringUtils.format(WidgetResources.ItemListControl_FilterAriaDescriptionTextFormat, item.label)
        });
            

        $link.attr("tabindex", 0)
            .attr("aria-describedby", describedByElement.getId())
            .attr("role", "button");

        if (isInteractive) { 
            $link.click(function (e?: JQueryEventObject) {
                that.selectItem(this);
                //Suppress default navigation on hyperlink.
                e.preventDefault();
            });
            this.toggleSelectionElement($li, false);

            Utils_UI.accessible($link);
        } else {
            $link.addClass("disabled")
                .attr("aria-disabled", "true");
        }
        
        if(this._options.colorAndIconDrawer) {
            const colorAndIconContainer = $("<div>")
            .addClass(ItemListControl.ColorClass)
            .appendTo($link);
            this._options.colorAndIconDrawer(colorAndIconContainer, item.color, item.icon, item.label);
        }

        this.createNumberElement(item.value).appendTo($link);

        var lOuterPadding = 3;
        var barThickness = 5;
        var numberLPadding = 8;
        var labelLPadding = 3;
        var rOuterPadding = 9;
        var itemSeparator = 2; //Space between each list item


        var reservedSpace = lOuterPadding +
            barThickness +
            numberLPadding +
            this.getNumberWidth(item.value) +
            labelLPadding +
            lOuterPadding +
            itemSeparator +
            2; //allowance for space bleeding out.

        //Text can be rendered in available space minus reserved space for the cell.
        var maxTextWidth = (ItemListControl.WidthPerInstance + widthAdjustment) - reservedSpace

        var $textContainer = $("<div>")
            .addClass(ItemListControl.DisplayClass)
            .appendTo($link);
        <MultiLine.MultiLineTextBlock>Controls.create(MultiLine.MultiLineTextBlock, $textContainer,
            <MultiLine.MultiLineTextBlockOptions>{
                text: item.label,
                maxwidth: maxTextWidth
            });

        return $li;
    }

    private getMaxFilterValue(): number {
        return (this._options.maxNumberDigit && this._options.maxNumberDigit == 3) ? 999 : 99;
    }

    private createNumberElement(value: number): JQuery {
        var numberText = value.toString();
        
        let maxFilterValue = this.getMaxFilterValue();

        if (value > maxFilterValue) {
            numberText = maxFilterValue.toString();
        }

        var $result = $("<div>")
            .addClass(ItemListControl.NumberClass)
            .css("margin-left", this._options.marginForColorAndIcon)
            .text(numberText);

        if (value > maxFilterValue) {
            $("<span>")
                .addClass(ItemListControl.NumberSuffixClass)
                .text(WidgetResources.CountFilter_ExcessItemsSuffix)
                .appendTo($result);
        }
        return $result;
    }

    /**
     * Note: Measuring text size is a browser dependent exercise which requires a render cycle 
     * Here, we heuristically allocate space on worst case-basis.
     * If we're wrong, the label text sections will get less space than we might have been able to provide.
     * @param value
     */
    private getNumberWidth(value: number): number {
        if (value <= 9) {
            return 18; //single digit width
        } else if (value <= 99) {
            return 35; //two digit width
        } else {
            if (this._options.maxNumberDigit && this._options.maxNumberDigit == 3 && value > 999) {
                return 64; // three digits and small "+"
            } else {
                return 51; //two digits and small "+" or 3 digit number
            }
        }
    }
}
