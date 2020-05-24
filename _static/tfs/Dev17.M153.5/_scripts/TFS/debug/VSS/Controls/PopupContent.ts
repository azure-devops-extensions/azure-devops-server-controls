import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export interface IPopupContentControlOptions extends Controls.EnhancementOptions {
    /**
     * Text to display. HTML content will be escaped.
     */
    text?: string | ((this: PopupContentControlO<IPopupContentControlOptions>) => string);

    /**
     * HTML content to display. Use text property for plain text instead of this.
     */
    html?: JQuery | ((this: PopupContentControlO<IPopupContentControlOptions>) => JQuery);

    /**
     * By default popup is shown on click of its drop element. If this option is set to true, the
     * popup will instead be shown on hover or focus of the drop element.
     */
    openCloseOnHover?: boolean;

    /**
     * The number of milliseconds to wait before displaying the tooltip on hover or focus.
     */
    openDelay?: number;

    /**
     * If openCloseOnHover is true, popup will be shown on focus as well as hover unlesss this is set to false.
     */
    showOnFocus?: boolean;

    /**
     * Only show the popup when this element's content overflows its visible area.
     */
    onlyShowWhenOverflows?: HTMLElement | JQuery;

    /**
     * If true, set the aria-describedby attribute on the parent.
     */
    setAriaDescribedBy?: boolean;

    /**
     * where to align the element (horizontal-vertical)
     */
    elementAlign?: string;
    /**
     * where to align the element against base element (horizontal-vertical)
     */
    baseAlign?: string;
    /**
     * behavior when the element overflows the window (horizontal-vertical)
     */
    overflow?: string;
    /**
     * how much extra left offset (if any) should be given to the target element versus the reference element.
     */
    leftOffsetPixels?: number;
    /**
     * how much extra top offset (if any) should be given to the target element versus the reference element.
     */
    topOffsetPixels?: number;

    /**
     * if set, use this instead of leftOffsetPixels when shown on mouse over
     */
    mouseLeftOffsetPixels?: number;

    /**
     * if set, use this instead of topOffsetPixels when shown on mouse over
     */
    mouseTopOffsetPixels?: number;


    supportScroll?: boolean;

    /**
     * Put the tooltip in this container. (doesn't have to be a menu)
     */
    menuContainer?: JQuery;

    /**
     * If false, position the popup on hover based on the drop element’s location, not the mouse position
     */
    useMousePosition?: boolean;

    /**
     * Whether the hover target must be _$dropElement strictly, if false then children that are inside of the _$dropElement will cause tooltipping
     */
    useStrictTarget?: boolean;
    /**
     * When a mouseover event is received, call this function. If it returns false, ignore the event.
     */
    mouseEventFilter?: (e: JQueryEventObject) => boolean;
}

export interface IPositionOptions {
    useMousePosition: boolean;
}

/** Time in milliseconds to ignore focus events after a mouseup to implement ignoreClickFocus */
const BlockFocusTime = 100;
/** Time to wait between hover/focus and display. */
const DefaultOpenDelay = 1000;

export class PopupContentControlO<TOptions extends IPopupContentControlOptions> extends Controls.Control<TOptions> {
    private _$dropElement: JQuery;
    protected _$contentContainer: JQuery;
    private _contentSet: boolean;
    protected _visible: boolean;
    private _hasFocus = false;
    /** don't respond to focus events until this time */
    private _blockFocusUntil = -BlockFocusTime - 1; // L0 tests have 0 for Date.now() so this makes the check in _onFocus pass
    private _hasMouse = false;
    private _enabled = true;

    private _documentEventDelegate: any;
    private _onForceHideDropPopupDelegate: () => void;
    private _handlers: { [event: string]: EventListener } = {};

    private _delayedShow: Utils_Core.DelayedFunction;
    private _delayedHide: Utils_Core.DelayedFunction;
    protected _mousePosition: Utils_UI.Positioning.ILocation;
    private _lastPositionContext: { options: IPositionOptions, mousePosition?: Utils_UI.Positioning.ILocation };

    public initialize() {
        super.initialize();
        this._element[0].classList.add("popup-content-control");
        this._setAriaDescribedBy();
            
        if (!this._options.openDelay && this._$dropElement.is(":focus")) {
            this.show();
        }

        this._onForceHideDropPopupDelegate = this.onForceHideDropPopup.bind(this);
    }

    public onForceHideDropPopup(e?: JQueryEventObject): void {
        this.hide();
    }

    /**
     * Set the text to display. HTML will be escaped.
     * @param content 
     */
    public setTextContent(content: string) {
        this._setContent(Utils_String.htmlEncode(content));
    }

    /**
     * Set the rich content to display.
     * @param content 
     */
    public setHtmlContent(content: JQuery) {
        this._setContent(content);
    }

    /**
     * Set the content to display (in HTML)
     *
     * This method displays raw HTML. Do not use to display user-provided content without properly
     * escaping. Prefer to use setTextContent(), which escapes HTML content, or setHtmlContent(),
     * which does not.
     */
    private _setContent(content: string | JQuery) {
        // This cast is for back-compat. JQuery claims .html() only takes strings, but JQuery is too modest.
        this._$contentContainer.html(<any>content);
        this._contentSet = true;

        if (this._visible) {
            this._reposition();
        }
    }
    
    private _initializeContent() {
        if (!this._contentSet) {
            if (this._options.text) {
                if (typeof this._options.text === "function") {
                    this.setTextContent((<Function>this._options.text).call(this));
                }
                else {
                    this.setTextContent(this._options.text);
                }
            }
            else if (this._options.html) {
                if (typeof this._options.html === "function") {
                    this.setHtmlContent((<Function>this._options.html).call(this));
                }
                else {
                    this.setHtmlContent(this._options.html);
                }
            }
            else if ((<any>this._options).content) {
                // we used to support a content option
                const content: string | JQuery | ((this: PopupContentControlO<IPopupContentControlOptions>) => string) = (<any>this._options).content;
                if (typeof content === "function") {
                    this._setContent((<Function>content).call(this));
                }
                else {
                    this._setContent(content);
                }
            }

            this._contentSet = true;
        }
    }

    private _setAriaDescribedBy() {
        if (this._options.setAriaDescribedBy) {
            this._initializeContent();
            const id = this._$contentContainer.attr("id");
            const currentDescribedBy = this._$dropElement.attr("aria-describedby") || "";
            if (currentDescribedBy.indexOf(id) === -1) {
                this._$dropElement.attr("aria-describedby", (currentDescribedBy ? (currentDescribedBy + " ") : "") + id);
            }
        }
    }

    public resetContent() {
        this._contentSet = false;
    }

    public show() {
        this._show({ useMousePosition: false });
    }

    public toggle() {
        if (this._element.is(":visible")) {
            this.hide();
        }
        else {
            this.show();
        }
    }

    public _enhance($dropElement) {
        Diag.Debug.assertParamIsObject($dropElement, "$dropElement");

        this._createElement();
        this._$dropElement = $dropElement;

        let $container = this._options.menuContainer || $("#PopupContentContainer")
        if ($container.length === 0) {
            $container = $("<div id='PopupContentContainer'></div>").appendTo(document.body);
        }
        this._element.appendTo($container);
        this._element.css("position", "fixed");

        this._$contentContainer = $(domElem('div', 'popup-content-container'))
            .attr({
                role: 'tooltip',
                id: Controls.getHtmlId(),
                'aria-hidden': 'true'
            })
            .appendTo(this._element);

        this._decorate();

        this._bind($dropElement, "remove.removePopupDropElement", () => {
            this.dispose();
        });
    }

    private _decorate() {
        if (!this._options.openCloseOnHover) {
            this._documentEventDelegate = delegate(this, this._handleDocumentMouseDown);

            this._bind(this._$dropElement, "click", (e: JQueryEventObject) => {
                if (!this._element.is(":visible")) {
                    this.show();
                }
                else {
                    this.hide();
                }
            });
        }
        else {
            this._listen("mouseover", this.onMouseOver);

            if (this._options.showOnFocus !== false) {
                this._listen("focus", this._onFocus);
            }
        }
    }

    /**
     * Add an event listener on the drop element.
     *
     * Doing it this way is faster than through JQuery and still makes it convenient to clean up event listeners.
     * @param event 
     * @param handler 
     */
    private _listen(event: string, handler: EventListener) {
        if (!this._handlers[event] && this._$dropElement.length > 0) {
            this._$dropElement[0].addEventListener(event, this._handlers[event] = handler.bind(this));
        }
    }

    /**
     * Remove an event listener on the drop element.
     * @param event
     */
    private _stopListening(event: string) {
        const handler = this._handlers[event];
        if (handler) {
            this._$dropElement[0].removeEventListener(event, handler);
        }
    }

    private _onInteract(e: JQueryEventObject) {
        this.hide();
        // no more tooltip on focus until the focus leaves and comes back
        this._hasFocus = false;
        this._blockFocusUntil = Date.now() + BlockFocusTime;
    }

    private _onFocus(e: JQueryEventObject) {
        if (e.target === this._$dropElement[0] && Date.now() > this._blockFocusUntil) {
            this._hasFocus = true;
            this._listen("blur", this._onBlur);
            if (!this._hasMouse && this._enabled) {
                this._showDelayed();
            }
        }
    }

    private _onBlur(e: JQueryEventObject) {
        this._hasFocus = false;
        if (!this._hasMouse) {
            this.hide();
        }
    }

    private _onMouseMove(e: JQueryEventObject | MouseEvent) {
        if (this._mousePosition) {
            // do our part to minimize allocations
            this._mousePosition.left = e.pageX;
            this._mousePosition.top = e.pageY;
        }
        else {
            this._mousePosition = {
                left: e.pageX,
                top: e.pageY,
            };
        }
    }

    public onMouseOver(e: JQueryEventObject) {
        // This function handles the mouseenter event for the drop element so that we will show the popup.
        // This function also handles the mouseenter event for the popup itself, so that we will not hide the popup.
        if (this._options.mouseEventFilter && !this._options.mouseEventFilter(e)) {
            return;
        }

        if (this._options.useStrictTarget && e.target !== this._$dropElement[0]) {
            return;
        }
        this._hasMouse = true;

        if (!this._enabled) {
            return;
        }

        this._listen("mouseout", this._onMouseOut);
        this._listen("mousemove", this._onMouseMove);

        // set initial position
        this._onMouseMove(e);
        this._showDelayed({ useMousePosition: true });

        if (this._delayedHide) {
            this._delayedHide.cancel();
        }
    }

    private _onMouseOut(e: JQueryEventObject) {
        this._hasMouse = false;

        // This function is called when the mouse leaves the drop element or the popup.
        if (this._delayedHide) {
            this._delayedHide.cancel();
        }

        this._delayedHide = Utils_Core.delay(this, 100, () => { this.hide(); this._delayedHide = null; });
    }

    public showDelayed() {
        this._showDelayed({ useMousePosition: false });
    }

    /**
     * Show the popup, after a delay if the openDelay option is set.
     */
    private _showDelayed(options?: IPositionOptions) {
        if (this._visible) {
            return;
        }

        options = options || { useMousePosition: false };
        if (!this._options.openDelay) {
            this._show(options);
        }
        else {
            if (this._delayedShow) {
                this._delayedShow.cancel();
            }
            this._delayedShow = Utils_Core.delay(this, this._options.openDelay, () => { this._show(options); });
        }
    }

    private _handleDocumentMouseDown(e: JQueryEventObject) {
        var $target = $(e.target);
        if (!(this._$dropElement.has(<any>e.target).length > 0 || this._$dropElement[0] === e.target) &&
            !(this._$contentContainer.has(<any>e.target).length > 0 || this._$contentContainer[0] === e.target) &&
            !(this._element.has(<any>e.target).length > 0 || this._element[0] === e.target)) {

            // Mouse-down from outside of this control. Hide the dropdown
            this.hide();
        }
    }

    /**
     * Set the position of the popup.
     */
    public _setPosition() {
        this._setPositionInternal({ useMousePosition: false });
    }

    protected _setPositionInternal(options: IPositionOptions) {
        if (!this._visible) {
            return;
        }

        this._element.css({
            top: 0,
            left: 0
        });

        this._lastPositionContext = { options };

        const positionOptions: Utils_UI.Positioning.IPositionOptions = {
            elementAlign: this._options.elementAlign || "left-top",
            baseAlign: this._options.baseAlign || "left-bottom",
            overflow: this._options.overflow,
            supportScroll: this._options.supportScroll,
            leftOffsetPixels: this._options.leftOffsetPixels,
            topOffsetPixels: this._options.topOffsetPixels
        };

        if (options.useMousePosition && this._options.useMousePosition !== false) {
            this._lastPositionContext.mousePosition = { left: this._mousePosition.left, top: this._mousePosition.top };
            positionOptions.leftOffsetPixels = this._options.mouseLeftOffsetPixels || positionOptions.leftOffsetPixels;
            positionOptions.topOffsetPixels = this._options.mouseTopOffsetPixels || positionOptions.topOffsetPixels;
            Utils_UI.Positioning.positionAtLocation(this._element, this._mousePosition, positionOptions);
        }
        else {
            if (this._$dropElement.length > 0) {
                Utils_UI.Positioning.position(this._element, this._$dropElement, positionOptions);
            }
        }
    }

    protected _reposition() {
        if (!this._lastPositionContext) {
            return;
        }
        if (this._lastPositionContext.mousePosition) {
            this._mousePosition = this._lastPositionContext.mousePosition;
        }
        this._setPositionInternal(this._lastPositionContext.options);
    }

    public _getDropElement() {
        return this._$dropElement;
    }

    protected _show(options: IPositionOptions) {
        // if tool tip was delayed show, but that element has been disposed now so we should just not do anything here
        if (this.isDisposed() || !this._getDropElement().is(":visible")) {
            return;
        }

        if (this._options.onlyShowWhenOverflows && !Utils_UI.contentsOverflow(this._options.onlyShowWhenOverflows)) {
            return;
        }

        if (!this._visible) {
            this._visible = true;

            if (this._options.openCloseOnHover) {
                this._listen("click", this._onInteract);
                this._listen("keypress", this._onInteract);
            }

            this._initializeContent();

            // show before setting position so that popup is rendered for size calculation
            this.getElement().show();
            this._setPositionInternal(options);
            this._fire("popup-opened");

            if (this._documentEventDelegate) {
                $(document).bind("mousedown", this._documentEventDelegate);
            }

            Utils_UI.attachResize(this._element, delegate(this, this._setPosition));
            this._bind(this._$dropElement.parents(), "scroll", this._onForceHideDropPopupDelegate);

            if (this._delayedShow) {
                this._delayedShow.cancel();
            }
        }
    }

    public hide() {
        // if tool tip was delayed hide, but that element has been disposed now so we should just not do anything here
        if (this.isDisposed()) {
            return;
        }

        if (this._delayedShow) {
            this._delayedShow.cancel();
        }

        if (!this._visible) {
            return;
        }
        
        this._visible = false;

        if (this._documentEventDelegate) {
            $(document).unbind("mousedown", this._documentEventDelegate);
        }

        Utils_UI.detachResize(this._element);
        if (this._onForceHideDropPopupDelegate) {
            this._unbind(this._$dropElement.parents(), "scroll", this._onForceHideDropPopupDelegate);
        }

        this._element.hide();
        this._fire("popup-closed");

        this._stopListening("mousemove");
    }

    public enable() {
        this._enabled = true;

        if (this._hasFocus || this._hasMouse) {
            this._showDelayed();
        }
    }

    public disable() {
        this._enabled = false;
        this.hide();
    }

    public _dispose() {
        super._dispose();

        if (this._options.setAriaDescribedBy) {
            const id = this._$contentContainer.attr("id");
            let describedBy = this._$dropElement.attr("aria-describedby") || "";
            describedBy = describedBy.replace(new RegExp(`\\b${id}\\b`, 'g'), "").trim().replace(/\s+/, " ");
            if (describedBy) {
                this._$dropElement.attr("aria-describedby", describedBy);
            }
            else {
                this._$dropElement.removeAttr("aria-describedby");
            }
        }

        if (this._documentEventDelegate) {
            $(document).unbind("mousedown", this._documentEventDelegate);
            this._documentEventDelegate = null;
        }

        if (this._onForceHideDropPopupDelegate) {
            this._unbind(this._$dropElement.parents(), "scroll", this._onForceHideDropPopupDelegate);
            this._onForceHideDropPopupDelegate = null;
        }

        if (this._$dropElement && this._$dropElement.length >= 1) {
            this._unbind(this._$dropElement, "click");
            this._unbind(this._$dropElement, "remove.removePopupDropElement");

            this._stopListening("mouseover");
            this._stopListening("mouseout");
            this._stopListening("mousemove");
            this._stopListening("focus");
            this._stopListening("blur");
            this._stopListening("click");
            this._stopListening("keypress");
        }

        Utils_UI.detachResize(this._element);
    }
}

export class PopupContentControl extends PopupContentControlO<any> { }

export interface IRichContentTooltipOptions extends IPopupContentControlOptions {
    /**
     * If explicitly set to false, show popup on click, not hover.
     */
    openCloseOnHover?: boolean;

    /**
     * If explicitly set to false, don't show the little arrow at the top of the tooltip pointing to its parent.
     */
    popupTag?: boolean;

    /**
     * If true, adjust width of the tooltip to better fit content.
     */
    autoWidth?: boolean;
}

export class RichContentTooltipO<TOptions extends IRichContentTooltipOptions> extends PopupContentControlO<TOptions> {
    private static _shownTooltip: PopupContentControlO<IPopupContentControlOptions>;

    private _$popupTag: JQuery;

    /**
     * Hide the shown tooltip
     */
    public static hide() : void {
        if (RichContentTooltipO._shownTooltip) {
            RichContentTooltipO._shownTooltip.hide(); 
        }
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "rich-content-tooltip",
            openCloseOnHover: true,
            elementAlign: "middle-top",
            baseAlign: "middle-bottom",
            useMousePosition: false,
        }, options));
    }

    public initialize() {
        let element = this.getElement();
        let options = this._options;

        if (options.popupTag !== false) {
            this._$popupTag = $(domElem('div', 'popup-tag')).prependTo(element);
        }

        super.initialize();

        element[0].classList.add("v2");
        if (options.autoWidth) {
            element[0].classList.add("auto-width");
        }
    }

    /* Protected for derived types */
    public _getPopupTooltipElement() {
        return this._$popupTag;
    }

    protected _show(options: IPositionOptions) {
        super._show(options);

        if (this._visible) {
            let shownTooltip = RichContentTooltipO._shownTooltip;
            if (shownTooltip && shownTooltip !== this) {
                shownTooltip.hide();
            }
            
            RichContentTooltipO._shownTooltip = this;
        }
    }

    public hide() {
        super.hide();

        if (RichContentTooltipO._shownTooltip === this) {
            RichContentTooltipO._shownTooltip = null;
        }
    }

    protected _setPositionInternal(options: IPositionOptions) {
        super._setPositionInternal(options);

        if (!this._visible) {
            return;
        }

        if (this._$popupTag) {
            const useMousePosition = options && options.useMousePosition && this._options.useMousePosition !== false;

            this._$popupTag.css({
                top: 0,
                left: 0
            });
            this._$contentContainer.toggleClass("mouse", useMousePosition);

            const popupLocation: Utils_UI.Positioning.ILocation = {
                left: parseInt(this._element.css("left"), 10),
                top: parseInt(this._element.css("top"), 10),
                width: this._element.outerWidth(),
                height: this._element.outerHeight()
            }

            // location the tooltip points at
            let anchorLocation: Utils_UI.Positioning.ILocation;
            if (useMousePosition) {
                anchorLocation = this._mousePosition;
            }
            else {
                const dropElement = this._getDropElement();
                const dropPosition = dropElement.offset();
                anchorLocation = { left: dropPosition.left + dropElement.outerWidth() / 2, top: dropPosition.top };
            }

            // If a parent of the popup element has a transform, its position (and the position of
            // the tag) will be relative to that parent element and not the document. So we want to
            // make the position of the anchor element relative to that same location.
            const popupLocationAbsolute = this._element.offset();
            anchorLocation.left += popupLocation.left - popupLocationAbsolute.left;
            anchorLocation.top += popupLocation.top - popupLocationAbsolute.top;

            // keep these values in sync with value in _PopupContent.scss
            const tooltipMarginTop = useMousePosition ? 27 : 11; 
            const tooltipMarginBottom = 11;
            const tooltipBorderWidth = 1;
            const tooltipTagSize = 14 + tooltipBorderWidth;

            // determine where to put the tag (the "beak" of the tooltip)
            const beakOffset = tooltipTagSize * 0.5; // distance from the left edge of the tag to its point
            // The tag is created by rotating a square 45 degrees. When you do this, the width increases by
            // popupTagSize * (Math.SQRT2 - 1), so we can't let the tag get within 1/2 of that.
            const leftStop = tooltipTagSize * (Math.SQRT2 - 1) * 0.5; // how close the tag can get to the left edge of the popup
            const rightStop = leftStop + tooltipTagSize; // how close the tag can get to the right edge of the popup
            const tagLocation = {
                left: Math.max(Math.min(anchorLocation.left - beakOffset, popupLocation.left + popupLocation.width - rightStop), popupLocation.left + leftStop),
                // we want half the tag above the tooltip, so we raise it by 1/2 popupTagSize
                top: popupLocation.top + tooltipMarginTop - tooltipTagSize * 0.5
            }

            // is the tooltip above the anchor? (this happens when the anchor is near the bottom of the screen)
            // the 0.5 is to account for fuzziness when the user is zoomed
            if (popupLocation.top < anchorLocation.top - 0.5) {
                this._$popupTag.addClass("flipped");
                // height includes the margin because we're actually measuring the parent of the element that has the margin
                tagLocation.top = popupLocation.top + popupLocation.height - tooltipMarginBottom - tooltipTagSize * 0.5;
            }
            else {
                this._$popupTag.removeClass("flipped");
            }

            this._$popupTag.css({
                left: tagLocation.left + "px",
                top: tagLocation.top + "px",
            });
        }
    }

    /**
     * Add a tooltip to the target with common default settings.
     *
     * @param text content to place in the tooltip, either plain text or a JQuery object
     * @param target
     * @param options
     */
    public static add(content: string | JQuery, target: HTMLElement | JQuery, options?: IRichContentTooltipOptions): RichContentTooltip {
        options = {
            openDelay: DefaultOpenDelay,
            topOffsetPixels: 0,
            mouseTopOffsetPixels: 0,
            autoWidth: true,
            ...options,
        };

        if (typeof content === "string") {
            options.text = content;
        }
        else if (content) {
            options.html = content;
        }

        return Controls.Enhancement.enhance<IRichContentTooltipOptions>(RichContentTooltip, $(target), options) as RichContentTooltip;
    }

    /**
     * Add a tooltip to the target with common default settings. Only display the tooltip if the
     * content in target is overflowing.
     *
     * @param content text to place in the tooltip (html in the text will be escaped)
     * @param target 
     * @param options 
     */
    public static addIfOverflow(content: string | JQuery, target: HTMLElement | JQuery, options?: IRichContentTooltipOptions): RichContentTooltip {
        return RichContentTooltip.add(content, target, { ...options, onlyShowWhenOverflows: target });
    }

}

export class RichContentTooltip extends RichContentTooltipO<any> { }
