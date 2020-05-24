/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import { RichContentTooltip } from "VSS/Controls/PopupContent";

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

export class VirtualizingListView extends Controls.BaseControl {

    protected _itemsContainer: JQuery;
    private _scrollContainer: JQuery;
    private _scrollSpacer: JQuery;
    protected _dataSource: Controls.BaseDataSource;

    protected _firstVisible = 0;
    private _selectedIndex = -1;
    private _rowHeight = 20;

    private _ignoreScrollEvent = false;
    protected _enableMouseOver = true;
    private _prevMousePos = "";

    public visibleRowCount = 1;

    /**
     * Y position of the pointer when the pointerDown event was fired. Set to null when the pointer is not down.
     */
    private _pointerDownY: number = null;
    /**
     * The value of this._firstVisible when the pointerDown event was fired.
     */
    private _pointerDownFirstVisible: number;

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "virtualizing-list-view",
            maxRowCount: 8,
            selectedIndex: -1
        }, options));
    }

    public initialize(): void {
        this._bind("click", delegate(this, this._onClick));
        this._itemsContainer = $(domElem("ul", "items"));
        this._itemsContainer.attr("role", this._options.virtualizingListViewRole || "listbox");
        this._itemsContainer.attr("id", Controls.getId());
        this._bind(this._itemsContainer, "mouseover", delegate(this, this._onMouseOver));
        this._bind(this._itemsContainer, "mousemove", delegate(this, this._onMouseMove));

        //There is an issue with chrome that doing a mousedown and dragging the mouse even for a few pixels triggers the scroll event on the parent container
        //This is a hack which prevents the scroll event from getting triggered
        if (this._options.preventMouseDown) {
            this._bind(this._itemsContainer, "mousedown",(e) => e.preventDefault());
        }

        this._bind(this._itemsContainer, Utils_UI.BrowserCheckUtils.isFirefox() ? "DOMMouseScroll" : "mousewheel", delegate(this, this._onMouseWheel));

        this._bind(this._itemsContainer, "pointerdown", this._onPointerDown.bind(this));
        this._bind(this._itemsContainer, "pointerleave", this._onPointerLeave.bind(this));
        this._bind(this._itemsContainer, "pointermove", this._onPointerMove.bind(this));

        this._element.append(this._itemsContainer);

        this._scrollContainer = $(domElem("div", "scroller"));
        this._bind(this._scrollContainer, "scroll", delegate(this, this._onScroll));

        this._scrollSpacer = $(domElem("div", "content-spacer"));
        this._scrollContainer.append(this._scrollSpacer);

        this._element.append(this._scrollContainer);
        this._dataSource = this._options.dataSource;
        this._selectedIndex = this._options.selectedIndex;

        this.update();
        this._enableMouseOver = true;

        super.initialize();
    }

    public update(): void {
        var count = this._dataSource.getCount();
        this.visibleRowCount = Math.min(count, this._options.maxRowCount);

        if (this._selectedIndex >= 0) {
            this._selectedIndex = Math.min(this._selectedIndex, count - 1);
        }

        this._setVisibleBounds(this._selectedIndex);
        this._drawItems();
        var height = this._itemsContainer.outerHeight();
        this._element.height(height);
        this._setupScrollbar(height);
    }

    public scrollItemIntoView(index): void {
        const previousFirstItem = this._firstVisible;
        this._setVisibleBounds(index);
        if (this._firstVisible !== previousFirstItem) {
            this._drawItems();
            this._updateScrollbar();
        }
        else {
            this._updateItemStyles();
        }
    }

    /**
     * @param page 
     * @return 
     */
    public selectNext(page?: boolean): boolean {

        var selectedIndex = this._dataSource.nextIndex(this._selectedIndex, page ? this.visibleRowCount : 1, null);

        if (selectedIndex >= 0) {
            this.setSelectedIndex(selectedIndex);
            this._fireSelectionChanged();
            return true;
        }

        return false;
    }

    /**
     * @param page 
     * @return 
     */
    public selectPrev(page?: boolean): boolean {

        var selectedIndex = this._dataSource.nextIndex(this._selectedIndex, -(page ? this.visibleRowCount : 1), null);

        if (selectedIndex >= 0) {
            this.setSelectedIndex(selectedIndex);
            this._fireSelectionChanged();
            return true;
        }

        return false;
    }

    public getSelectedIndex(): number {
        return this._selectedIndex;
    }

    public getSelectedItem() {
        return this._itemsContainer.children("li.selected");
    }

    /**
     * @param noScrollIntoView 
     */
    public setSelectedIndex(selectedIndex: number, noScrollIntoView?: boolean): void {

        if (this._selectedIndex !== selectedIndex) {
            this._selectedIndex = selectedIndex;

            if (!noScrollIntoView) {
                this.scrollItemIntoView(selectedIndex);
            }
        }
    }

    private _setVisibleBounds(visibleItemIndex: number): void {
        visibleItemIndex = visibleItemIndex || 0;

        if (visibleItemIndex <= this._firstVisible) {
            this._firstVisible = Math.max(0, visibleItemIndex);
        }
        else if (visibleItemIndex >= (this._firstVisible + this.visibleRowCount)) {
            this._firstVisible = Math.max(0, Math.min(visibleItemIndex, this._dataSource.getCount() - this.visibleRowCount));
        }

        this._firstVisible = Math.max(0, Math.min(this._firstVisible, this._dataSource.getCount() - this.visibleRowCount));
    }

    protected _createItem(index: number): JQuery {
        const text = this._dataSource.getItemText(index) || "";
        const $item = $(domElem("li", this._options.itemCss));
        $item.attr({
            id: Controls.getId(),
            role: "option",
            "aria-posinset": index + 1,
            "aria-setsize": this._dataSource.getCount(),
        });
        if (text && $.isFunction(this._options.getItemContents)) {
            $item.append(this._options.getItemContents(text));
        }
        else {
            $item.text(text);
        }

        if (this._options.setTitleOnlyOnOverflow === false || Utils_UI.contentsOverflow($item[0])) {
            RichContentTooltip.add(text, $item, { useStrictTarget: true });
        }

        return $item;
    }

    protected _drawItems(): void {
        this._itemsContainer.empty();
        var createItem = this._options.createItem || this._createItem;
        var start = this._firstVisible;
        var end = Math.min(start + this.visibleRowCount, this._dataSource.getCount());
        for (var i = start; i < end; i++) {
            var item = createItem.call(this, i);
            item.data("index", i);
            item.attr('data-id', i);
            this._itemsContainer.append(item);
            const text = this._dataSource.getItemText(i) || "";
            if (this._options.setTitleOnlyOnOverflow === false || Utils_UI.contentsOverflow(item)) {
                RichContentTooltip.add(text, item, { useStrictTarget: true });
            }
        }

        this._updateItemStyles();
        this._updateAriaAttributes();
        this._enableMouseOver = false;

        this._fireItemsUpdated();
    }

    protected _updateItemStyles(): void {
        var firstVisible = this._firstVisible;
        var selectedIndex = this._selectedIndex;
        this._itemsContainer.children("li").each(function (i, item) {
            $(this).toggleClass("selected",(i + firstVisible) === selectedIndex);
        });
    }

    protected _updateAriaAttributes(): void {
        const selectedIndex = this._selectedIndex;
        this._itemsContainer.children("li").each(function(i, item) {
            $(this).attr("aria-selected", `${i === selectedIndex}`);
        });
    }

    private _setupScrollbar(height: number): void {
        var itemCount = this._dataSource.getCount();
        var needsScrollBars = this.visibleRowCount < itemCount;

        this._element.toggleClass("scroll", needsScrollBars);

        if (needsScrollBars) {
            this._rowHeight = (height || this._itemsContainer.outerHeight()) / this.visibleRowCount;
            this._scrollSpacer.height(this._rowHeight * itemCount);
            this._updateScrollbar();
        }
    }

    private _updateScrollbar(): void {
        try {
            this._ignoreScrollEvent = true;
            this._scrollContainer.scrollTop(Math.ceil(this._rowHeight * this._firstVisible));
        } finally {
            this._ignoreScrollEvent = false;
        }
    }

    private _onScroll(e: JQueryEventObject): any {
        var itemCount = this._dataSource.getCount();
        if (!this._ignoreScrollEvent) {
            this._firstVisible = Math.max(0, Math.min(Math.round(this._scrollContainer.scrollTop() / this._rowHeight), itemCount - this.visibleRowCount));
            this._drawItems();
        }

        return false;
    }

    private _onMouseMove(e: JQueryEventObject): any {
        var mousePos = `${e.screenX}-${e.screenY}`;

        //needed for IE. When itemcontainer is emptied and filled with new elements
        //mouse over event is get fired in IE
        if (!this._prevMousePos || this._prevMousePos !== mousePos) {
            this._prevMousePos = mousePos;
            this._enableMouseOver = true;
        }
    }

    private _onMouseOver(e: JQueryEventObject): any {
        var $target = $(e.target);

        Utils_Core.delay(this, 10, () => {
            // delay so that if this mouseover is associated with a pointerdown event, it will get handled first
            if (this._enableMouseOver && this._pointerDownY === null) {
                this._enableMouseOver = false;

                var $li = $target.closest("li");
                if ($li.length) {
                    this._selectedIndex = $li.data("index");
                    this._updateItemStyles();
                }
            }
        });
    }

    private _onPointerDown(jqueryEvent: JQueryEventObject) {
        const e = <PointerEvent>jqueryEvent.originalEvent;
        if (e.pointerType === "touch" && e.isPrimary) {
            this._pointerDownY = e.pageY;
            this._pointerDownFirstVisible = this._firstVisible;
        }
    }

    private _onPointerLeave(jqueryEvent: JQueryEventObject) {
        const e = <PointerEvent>jqueryEvent.originalEvent;
        if (e.pointerType === "touch" && e.isPrimary) {
            this._pointerDownY = null;
        }
    }

    private _onPointerMove(jqueryEvent: JQueryEventObject) {
        const e = <PointerEvent>jqueryEvent.originalEvent;
        if (e.pointerType !== "touch"
            || !e.isPrimary
            || this._pointerDownY === null) {
            return;
        }

        const itemCount = this._dataSource.getCount();
        let lineDelta = (this._pointerDownY - e.pageY) / this._rowHeight;
        lineDelta -= lineDelta % 1; // remove fractional part of the number
        let firstVisible = this._pointerDownFirstVisible + lineDelta;
        firstVisible = Math.max(firstVisible, 0);
        firstVisible = Math.min(firstVisible, itemCount - this.visibleRowCount);

        if (this._firstVisible !== firstVisible) {
            this._firstVisible = firstVisible;
            this._drawItems();
            this._updateScrollbar();
        }
    }

    private _onMouseWheel(e: JQueryEventObject): any {
        var delta = Utils_UI.getWheelDelta(e);
        if (delta !== 0) {
            this._firstVisible = Math.max(0, Math.min(this._firstVisible + (delta > 0 ? -1 : 1), this._dataSource.getCount() - this.visibleRowCount));
            this._drawItems();
            this._updateScrollbar();
            return false;
        }
    }

    private _onClick(e: JQueryEventObject): any {
        var $target = $(e.target);
        var $li = $target.closest("li");

        if ($li.length) {
            var itemIndex = $li.data("index");

            if (this._options.itemClick) {
                if (this._options.itemClick.call(this, e, itemIndex, $target, $li) === false) {
                    return false;
                }
            }

            this.setSelectedIndex(itemIndex);
            this._updateItemStyles();
            this._fireSelectionChanged(true);
        }
    }

    /**
     * Optional delegate. Selected index will be representative of dataSource._items
     * @param accept 
     */
    private _fireSelectionChanged(accept?: boolean): void {
        if (this._options.selectionChange) {
            this._options.selectionChange.call(this, this._selectedIndex, accept);
        }
    }

    /**
     * Optional delegate. This is fired when items in the list are updated.
     */
    private _fireItemsUpdated(): void {
        if (this._options.itemsUpdated) {
            this._options.itemsUpdated.call(this);
        }
    }

}