///<amd-dependency path="jQueryUI/droppable"/>
///<amd-dependency path="jQueryUI/button"/>
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");

var delegate = Utils_Core.delegate;

/*
 * Identifies the scroll direction.
 */
enum ScrollDirection {
    LEFT,
    RIGHT,
    TOP,
    BOTTOM
}

/*
 * Identifies the scroll alignment.
 */
export enum ScrollAlign {
    HORIZONTAL,
    VERTICAL
}

/*
 * @interface for arrow scroll support class.
 */
export interface IArrowScrollSupport {
    align: ScrollAlign;
    scrollContainer: JQuery;
    scrollContent: JQuery;
}

/*
 * Class for creating and binding arrow scroll support on a specified container.
 */
export class ArrowScrollbar {
    private static SCROLL_PRESS_AND_HOLDER_INTERVAL = 200;
    private static SCROLL_CALCULATION_DELTA = 3;
    private static SCROLL_ANIMATE_DELTA = 100;
    private static SCROLL_MOUSEWHEEL_DELTA = 20;
    private static SCROLL_SCROLLBUTTON_WIDTH = 18;
    private static SCROLL_SCROLLBUTTON_HEIGHT = 15;

    private static TAB_SCROLL_PREV_SELECTOR = ".arrow-scroll-button.prev";
    private static TAB_SCROLL_NEXT_SELECTOR = ".arrow-scroll-button.next";

    private _align: ScrollAlign;
    private _$scrollContainer: JQuery;
    private _$scrollContent: JQuery;
    private _$navButtonPrev: JQuery;
    private _$navButtonNext: JQuery;

    constructor(options: IArrowScrollSupport) {
        this._align = options.align;
        this._$scrollContainer = options.scrollContainer;
        this._$scrollContent = options.scrollContent;

        // create navigation button.
        var alignClass: string;
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                alignClass = "horizontal";
                break;
            case ScrollAlign.VERTICAL:
                alignClass = "vertical";
                break;
        }

        this._$navButtonPrev = $("<div>").addClass("arrow-scroll-button").addClass("prev").addClass(alignClass);
        this._$navButtonNext = $("<div>").addClass("arrow-scroll-button").addClass("next").addClass(alignClass);
        this._$scrollContainer.append(this._$navButtonPrev);
        this._$scrollContainer.append(this._$navButtonNext);
    }

    /*
     * Initialize the arrow scrollbar.
     */
    public initialize() {
        this._initializedScrollSupport();
        this._updateNavigationButtons();
    }

    /*
     * Update the visibility of arrow scrollbar.
     */
    public onContainerResize() {
        this._updateNavigationButtons();
    }

    /*
    * Update the the navigation button visibility based on need.
    */
    public _updateNavigationButtons() {
        if (this._isScrollContainerTopMost()) {
            this._$navButtonPrev.hide();
        }
        else {
            this._$navButtonPrev.show();
        }

        if (this._isScrollContainerBottomMost()) {
            this._$navButtonNext.hide();
        }
        else {
            this._$navButtonNext.show();
        }
    }

    /*
     * Scroll to ensure the given element fully visible
     * @param element - jQuery selector for the element
     */
    public scrollElementIntoView(element: JQuery) {
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                {
                    var elemLeft = element.position().left;
                    var elemRight = elemLeft + element.outerWidth();
                    var containerLeft = this._$scrollContainer.position().left;
                    var containerRight = containerLeft + this._$scrollContainer.outerWidth();
                    var pixelToScroll = 0;
                    if (elemRight > containerRight - ArrowScrollbar.SCROLL_SCROLLBUTTON_WIDTH) {
                        pixelToScroll = elemRight - containerRight + ArrowScrollbar.SCROLL_SCROLLBUTTON_WIDTH;
                    }
                    else if (elemLeft < containerLeft + ArrowScrollbar.SCROLL_SCROLLBUTTON_WIDTH) {
                        pixelToScroll = elemLeft - containerLeft - ArrowScrollbar.SCROLL_SCROLLBUTTON_WIDTH;
                    }
                    if (pixelToScroll !== 0) {
                        var currentScrollLeft = this._$scrollContainer.scrollLeft();
                        this._$scrollContainer.scrollLeft(currentScrollLeft + pixelToScroll);
                    }
                    break;
                }
            case ScrollAlign.VERTICAL:
                {
                    var elemTop = element.position().top;
                    var elemBottom = elemTop + element.outerHeight();
                    var containerTop = this._$scrollContainer.position().top;
                    var containerBottom = containerTop + this._$scrollContainer.outerHeight();
                    var pixelToScroll = 0;
                    if (elemBottom > containerBottom - ArrowScrollbar.SCROLL_SCROLLBUTTON_HEIGHT) {
                        pixelToScroll = elemBottom - containerBottom + ArrowScrollbar.SCROLL_SCROLLBUTTON_HEIGHT;
                    }
                    else if (elemTop < containerTop + ArrowScrollbar.SCROLL_SCROLLBUTTON_HEIGHT) {
                        pixelToScroll = elemTop - containerTop - ArrowScrollbar.SCROLL_SCROLLBUTTON_HEIGHT;
                    }
                    if (pixelToScroll !== 0) {
                        var currentScrollTop = this._$scrollContainer.scrollTop();
                        this._$scrollContainer.scrollTop(currentScrollTop + pixelToScroll);
                    }
                    break;
                }
        }
        this._updateNavigationButtons();
    }

    private _initializedScrollSupport() {
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                this._bindScrollContainer(ScrollDirection.LEFT);
                this._bindScrollContainer(ScrollDirection.RIGHT);
                break;
            case ScrollAlign.VERTICAL:
                this._bindScrollContainer(ScrollDirection.TOP);
                this._bindScrollContainer(ScrollDirection.BOTTOM);
                break;
        }
        this._bindScrollContent();
    }

    private _bindScrollContainer(direction: ScrollDirection) {
        var scrollButton: JQuery;
        var scrollButtonCssSelector: string;
        switch (direction) {
            case ScrollDirection.LEFT:
            case ScrollDirection.TOP:
                scrollButton = this._$navButtonPrev;
                scrollButtonCssSelector = ArrowScrollbar.TAB_SCROLL_PREV_SELECTOR;
                break;
            case ScrollDirection.RIGHT:
            case ScrollDirection.BOTTOM:
                scrollButton = this._$navButtonNext;
                scrollButtonCssSelector = ArrowScrollbar.TAB_SCROLL_NEXT_SELECTOR;
                break;
        }

        // Interval when pressed and hold down the arrow scrollbar.
        var buttonPressedAndHoldInterval: number;
        var buttonPressedAndHoldStartTimer = () => {
            buttonPressedAndHoldInterval = setInterval(() => {
                if (this._isScrollContainerAtTheEnd(direction)) {
                    buttonPressedStop();
                }
                this._scroll(direction);
            }, ArrowScrollbar.SCROLL_PRESS_AND_HOLDER_INTERVAL);
        };

        // Function to start pressing the arrow scrollbar.
        var buttonPressedStart = (e: Event) => {
            if (this._$scrollContainer.find(scrollButtonCssSelector + ":visible").length === 1) {
                scrollButton.addClass('pressed');
                this._scroll(direction);
                e.preventDefault();
                e.stopPropagation();
                buttonPressedAndHoldStartTimer();
            }
        };

        // Function to stop pressing the arrow scrollbar.
        var buttonPressedStop = () => {
            scrollButton.removeClass('pressed');
            clearInterval(buttonPressedAndHoldInterval);
        };

        scrollButton.mousedown((e: JQueryMouseEventObject) => {
            buttonPressedStart(e);
        }).bind("mouseup mouseleave", () => {
            buttonPressedStop();
        }).droppable({
            over: (e, ui) => {
                buttonPressedStart(e);
            },
            out: (e, ui) => {
                buttonPressedStop();
            }
        });
    }

    private _bindScrollContent() {
        var scrollContent = this._$scrollContent;

        // Mouse wheel support
        scrollContent.bind("mousewheel DOMMouseScroll", delegate(this, this._onMouseWheel));

        // bind tab support to update the navigation bar.
        scrollContent.keydown((e?: JQueryEventObject) => {
            if (e.keyCode === Utils_UI.KeyCode.TAB) {
                this._updateNavigationButtons();
            }
        });
    }

    private _onMouseWheel(e: JQueryEventObject) {
        var delta = Utils_UI.getWheelDelta(e);

        if (delta !== 0) {
            var start: number;
            switch (this._align) {
                case ScrollAlign.HORIZONTAL:
                    start = this._$scrollContainer.scrollLeft();
                    this._$scrollContainer.scrollLeft(start - delta * ArrowScrollbar.SCROLL_MOUSEWHEEL_DELTA);
                    break;
                case ScrollAlign.VERTICAL:
                    start = this._$scrollContainer.scrollTop();
                    this._$scrollContainer.scrollTop(start - delta * ArrowScrollbar.SCROLL_ANIMATE_DELTA);
                    break;
            }
            this._updateNavigationButtons();
        }
        e.stopPropagation();
    }

    private _scroll(direction: ScrollDirection) {
        switch (direction) {
            case ScrollDirection.LEFT:
            case ScrollDirection.TOP:
                this._scrollTop();
                break;
            case ScrollDirection.RIGHT:
            case ScrollDirection.BOTTOM:
                this._scrollBottom();
                break;
        }
    }

    private _isScrollContainerAtTheEnd(direction: ScrollDirection): boolean {
        switch (direction) {
            case ScrollDirection.LEFT:
            case ScrollDirection.TOP:
                return this._isScrollContainerTopMost();
            case ScrollDirection.RIGHT:
            case ScrollDirection.BOTTOM:
                return this._isScrollContainerBottomMost();
        }
    }

    private _scrollTop() {
        var start: number;
        var animateProperties: any;
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                start = this._$scrollContainer.scrollLeft();
                animateProperties = { scrollLeft: (start - ArrowScrollbar.SCROLL_ANIMATE_DELTA) + 'px' };
                break;
            case ScrollAlign.VERTICAL:
                start = this._$scrollContainer.scrollTop();
                animateProperties = { scrollTop: (start - ArrowScrollbar.SCROLL_ANIMATE_DELTA) + 'px' };
                break;
        }
        this._$scrollContainer.animate(animateProperties, ArrowScrollbar.SCROLL_PRESS_AND_HOLDER_INTERVAL, delegate(this, () => { this._updateNavigationButtons(); }));
    }

    private _scrollBottom() {
        var start: number;
        var animateProperties: any;
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                start = this._$scrollContainer.scrollLeft();
                animateProperties = { scrollLeft: (start + ArrowScrollbar.SCROLL_ANIMATE_DELTA) + 'px' };
                break;
            case ScrollAlign.VERTICAL:
                start = this._$scrollContainer.scrollTop();
                animateProperties = { scrollTop: (start + ArrowScrollbar.SCROLL_ANIMATE_DELTA) + 'px' };
                break;
        }
        this._$scrollContainer.animate(animateProperties, ArrowScrollbar.SCROLL_PRESS_AND_HOLDER_INTERVAL, delegate(this, () => { this._updateNavigationButtons(); }));
    }

    private _isScrollContainerTopMost(): boolean {
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                var containerLeftPosition = this._$scrollContainer.scrollLeft();
                if (containerLeftPosition <= ArrowScrollbar.SCROLL_CALCULATION_DELTA) {
                    return true;
                }
                return false;
            case ScrollAlign.VERTICAL:
                var containerTopPosition = this._$scrollContainer.scrollTop();
                if (containerTopPosition <= ArrowScrollbar.SCROLL_CALCULATION_DELTA) {
                    return true;
                }
                return false;
        }
    }

    private _isScrollContainerBottomMost(): boolean {
        switch (this._align) {
            case ScrollAlign.HORIZONTAL:
                var containerLeftPosition = this._$scrollContainer.scrollLeft();
                var contentWidth = this._$scrollContent[0].scrollWidth;
                if (containerLeftPosition + ArrowScrollbar.SCROLL_CALCULATION_DELTA >= contentWidth - this._$scrollContainer.outerWidth()) {
                    return true;
                }
                return false;
            case ScrollAlign.VERTICAL:
                var containerTopPosition = this._$scrollContainer.scrollTop();
                var contentHeight = this._$scrollContent[0].scrollHeight;
                if (containerTopPosition + ArrowScrollbar.SCROLL_CALCULATION_DELTA >= contentHeight - this._$scrollContainer.outerHeight()) {
                    return true;
                }
                return false;
        }
    }
}