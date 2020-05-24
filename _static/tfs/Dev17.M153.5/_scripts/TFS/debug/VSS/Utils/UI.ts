
import "jQueryUI/core"; // Needed for tabbable support

import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import VSS_Context = require("VSS/Context");

var log = Diag.log;

export function getWheelDelta(e?) {
    var result = 0;

    if (e.wheelDelta) {
        result = e.wheelDelta / 120;
    } else if (e.detail) { // firefox gives delta differently
        result = -e.detail / 3;
    } else if (e.originalEvent && e.originalEvent.wheelDelta) {
        result = e.originalEvent.wheelDelta / 120;
    } else if (e.originalEvent && e.originalEvent.detail) {
        result = -e.originalEvent.detail / 3;
    } else if (e.deltaY) { // https://developer.mozilla.org/en-US/docs/Web/Events/wheel
        result = -e.deltaY / 3;
    }
    return result;
}

/**
 * @param element 
 * @param enable 
 */
export function enableElement(element: Element | JQuery, enable: boolean) {
    if (enable === true) {
        $(element).removeAttr("disabled");
    }
    else {
        $(element).attr("disabled", "disabled");
    }
}

export function makeElementUnselectable(element) {
    if (BrowserCheckUtils.isMozilla()) {
        element.style.MozUserFocus = "ignore";
    }
    else if (BrowserCheckUtils.isMsie()) {
        element.unselectable = "on";

        var i = 0,
            e = element.all && element.all[i++];

        while (e) {
            switch (e.tagName) {
                case "IFRAME":
                case "TEXTAREA":
                case "INPUT":
                case "SELECT":
                    break;
                default:
                    e.unselectable = "on";
                    break;
            }

            e = element.all[i++];
        }
    }
}

/**
 * Best-effort attempt to set focus on the specified element. Exceptions will be caught and logged to console.
 * 
 * @param element Element to set focus on (DomElement or jQuery element)
 * @param delay Optional delay in ms before calling focus
 */
export function tryFocus(element: any, delay?: number) {

    var $element = (element instanceof jQuery) ? element : $(element);

    function doSetFocus() {
        try {
            $element.focus();
        }
        catch (ex) {
            log(Diag.LogVerbosity.Warning, "Failed to set focus to element: " + ex);
        }
    }

    if (typeof delay === "undefined") {
        doSetFocus();
    }
    else {
        Utils_Core.delay(this, delay, function () {
            doSetFocus();
        });
    }
}

export function alignWidth(element, baseWidth) {
    var $element = $(element),
        widthFix = $element.outerWidth() - baseWidth;

    if (widthFix !== 0) {
        // Fixing the width
        $element.width(baseWidth - widthFix);
    }
}

/**
* Is the given element in the DOM hierarchy
*
* @param element Element to check if it exists somewhere in the current document
*/
export function isInDomTree(element) {
    return $.contains(document.documentElement, element);
}

export function getCustomData(element, key) {
    if (!element.dataset) {
        return element.getAttribute("data-" + key);
    }
    else {
        return element.dataset[key];
    }
}

export enum KeyCode {
    ALT = 18,
    BACKSPACE = 8,
    CAPS_LOCK = 20,
    COMMA = 188,
    CONTROL = 17,
    DELETE = 46,
    DOWN = 40,
    END = 35,
    ENTER = 13,
    ESCAPE = 27,
    HOME = 36,
    INSERT = 45,
    LEFT = 37,
    PAGE_DOWN = 34,
    PAGE_UP = 33,
    PERIOD = 190,
    RIGHT = 39,
    SEMI_COLON = 186,
    FIREFOX_SEMI_COLON = 59,
    SHIFT = 16,
    SPACE = 32,
    TAB = 9,
    UP = 38,
    F1 = 112,
    F2 = 113,
    F6 = 117,
    F10 = 121,
    IME_INPUT = 229,
    M = 77,
    N = 78,
    P = 80,
    Q = 81,
    S = 83,
    E = 69,
    A = 65,
    B = 66,
    C = 67,
    D = 68,
    H = 72,
    I = 73,
    J = 74,
    K = 75,
    T = 84,
    U = 85,
    QUESTION_MARK = 191,
    CONTEXT_MENU = 93
}

export module KeyUtils {
    /**
     * Check if only the ctrl key modifier was pressed.
     * 
     * @param e The event object.
     */
    export function isExclusivelyCtrl(e: JQueryKeyEventObject) {
        return e.ctrlKey && !e.altKey && !e.shiftKey;
    }

    /**
     * Check if any modifier keys were pressed
     * 
     * @param e The event object.
     */
    export function isModifierKey(e: JQueryKeyEventObject) {
        return e.ctrlKey || e.altKey || e.shiftKey;
    }

    /**
     * Check if only Meta is pressed on Mac/OSX or if Ctrl is pressed on Windows. This 
     * should generally be used unless you have a specific reason to not use the key that
     * is expected on a Mac.
     * 
     * @param e The event object.
     */
    export function isExclusivelyCommandOrMetaKeyBasedOnPlatform(e: JQueryKeyEventObject | KeyboardEvent) {
        return !e.altKey && !e.shiftKey 
               && (shouldUseMetaKeyInsteadOfControl()? e.metaKey : e.ctrlKey);
    }

    /**
     * Determines if we are running in an OS that prefers use of Meta key instead of Control key.
     * MacOSx and IOS prefer Meta, Windows/Linux prefer Control
     */
    export function shouldUseMetaKeyInsteadOfControl() {
        return BrowserCheckUtils.isMacintosh() || BrowserCheckUtils.isIOS();
    }
}

var blurTimeout = 250;

export module Constants {

    export var HtmlNewLine: string = "<BR>";
    export var BlurTimeout: any = blurTimeout;
}

/**
 * @param tagName 
 * @param className 
 */
export function domElem(tagName: string, className?: string) {

    var element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    return element;
}

function ensure$(element: Node | JQuery): JQuery {
    return (<JQuery>element).jquery ? <JQuery>element : $(element);
}

function ensureHtmlElement(element: HTMLElement | JQuery): HTMLElement {
    return (<JQuery>element).jquery ? (<JQuery>element)[0] : <HTMLElement>element;
}

export function htmlEncode(input) {
    if (!input) {
        return "";
    }

    var result = input;

    if (typeof input !== "string") {
        result = "" + input;
    }

    return result.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;");
}

export module Positioning {

    export enum VerticalScrollBehavior {

        // If scrolling up, equivalent to Top, if scrolling down, equivalent to Bottom.
        Default = 0,

        // After scrolling, the top of the element rests at the top of the viewable area
        Top = 1,

        // After scrolling, the element is centered vertically in the viewable area
        Middle = 2,

        // After scrolling, the bottom of the element rests at the bottom of the page
        Bottom = 3
    }

    export interface IPositionOptions {
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
         * flag to specify that markers should be used to horizontally align the elements rather than the elements themselves.
         */
        alignToMarkerHorizontal?: boolean;
        /**
         * flag to specify that markers should be used to vertically align the elements rather than the elements themselves.
         */
        alignToMarkerVertical?: boolean;
        /**
         * jQuery object inside the element that should be aligned with the base
         */
        elementAlignmentMarker?: JQuery;
        /**
         * jQuery object inside the base element that should be aligned with the element
         */
        baseAlignmentMarker?: JQuery;
        /**
         * Indicates whether the scroll should by browser window or the specified marker or not.
         */
        scrollByMarker?: boolean;
        /**
         * how much extra left offset (if any) should be given to the target element versus the reference element.
         */
        leftOffsetPixels?: number;
        /**
         * how much extra top offset (if any) should be given to the target element versus the reference element.
         */
        topOffsetPixels?: number;
        supportScroll?: boolean;
        /**
         * prevent setting z-index on the target element
         */
        skipZIndexSetting?: boolean;
    }

    export interface ILocation {
        left: number;
        top: number;
        width?: number;
        height?: number;
    }

    export function _topOverflow(top) {
        return (0 - top);
    }

    export function _bottomOverflow(bottom) {
        var $window = $(window),
            windowHeight = $window.height() + $window.scrollTop();

        return (bottom - windowHeight);
    }

    export function _fitHorizontal(position: JQueryCoordinates, data: { leftOffsetPixels?: number, elementMeasure: number, adjustedWidth: number }) {
        const $window = $(window),
            leftOffset = data.leftOffsetPixels || 0,
            over = position.left + data.elementMeasure - ($window.width() + $window.scrollLeft()) + leftOffset,
            finalLeftPosition = position.left - over;

        position.left = over > 0 ? Math.max(0, finalLeftPosition) : Math.max(0, position.left);
        if (over > 0 && finalLeftPosition < 0) {
            data.adjustedWidth = Math.min(data.elementMeasure, ($window.width() + $window.scrollLeft()));
        }
    }

    export function _flipHorizontal(position: JQueryCoordinates, data: { baseMeasure: number, elementMeasure: number, elementAlign: string, adjustedWidth: number }) {
        const $window = $(window),
            over = position.left + data.elementMeasure - ($window.width() + $window.scrollLeft()),
            offset = data.elementAlign === "left" ? -data.elementMeasure : data.elementMeasure;

        position.left += (position.left < 0) ? offset + data.baseMeasure
            : ((over > 0) ? offset - data.baseMeasure : 0);
    }

    /**
     * Tries to fit the positioned element by using the base element if any overflow exists.
     * If still overflow exists after flipping, it shrinks the element where it best fits.
     */
    export function _fitVertical(position: JQueryCoordinates, data) {

        var newTop, shrink = 0,
            topOverflow, bottomOverflow;

        newTop = position.top;

        // Checking top overflow
        topOverflow = Positioning._topOverflow(newTop);
        if (topOverflow > 0) {
            // Top overflow exists, fitting the element
            newTop = 0;

            // Checking any overflow from bottom as a result of fit
            bottomOverflow = Positioning._bottomOverflow(newTop + data.elementMeasure);
            if (bottomOverflow > 0) {
                // Bottom overflow exists. Shrinking the element to fit the screen.
                shrink = bottomOverflow;
            }
        }
        else {
            // Checking bottom overflow
            bottomOverflow = Positioning._bottomOverflow(newTop + data.elementMeasure);
            if (bottomOverflow > 0) {
                // Bottom overflow exists, fitting the element
                newTop -= bottomOverflow;

                // Checking any overflow from top as a result of fit
                topOverflow = Positioning._topOverflow(newTop);
                if (topOverflow > 0) {
                    // Top overflow exists. Shrinking the element to fit the screen.
                    newTop = 0;
                    shrink = topOverflow;
                }
            }
        }

        return { top: newTop, shrink: shrink };
    }

    /**
     * Tries to flip the positioned element by using the base element if any overflow exists.
     * If still overflow exists after flipping, it shrinks the element where it best fits.
     */
    export function _flipVertical(position: JQueryCoordinates, data: { elementMeasure: number, baseMeasure: number, elementAlign: string, baseAlign: string }) {
        let newTop = position.top;
        let shrink: number;
        const offset = data.elementAlign === "top" ? -data.elementMeasure : data.elementMeasure;

        // Checking top overflow
        const topOverflow = Positioning._topOverflow(newTop);
        if (topOverflow > 0) {
            // Top overflow exists, flipping the element
            newTop += (offset + data.baseMeasure);

            // Checking any overflow from bottom as a result of flip
            const bottomOverflow = Positioning._bottomOverflow(newTop + data.elementMeasure);
            if (bottomOverflow > 0) {
                // Bottom overflow exists. Trying to position the element in the area
                // where fewest overflow occurs.
                if (bottomOverflow >= topOverflow) {
                    // First position was better, recovering.
                    newTop = position.top;
                    shrink = topOverflow;
                }
                else {
                    // New position is better
                    shrink = bottomOverflow;
                }
            }
        }
        else {
            // Checking bottom overflow
            const bottomOverflow = Positioning._bottomOverflow(newTop + data.elementMeasure);
            if (bottomOverflow > 0) {

                const baseOffset = data.baseAlign === "top" ? data.baseMeasure : -data.baseMeasure;

                // Bottom overflow exists, flipping the element
                newTop += (offset + baseOffset);

                // Checking any overflow from top as a result of flip
                const topOverflow = Positioning._topOverflow(newTop);
                if (topOverflow > 0) {
                    // Top overflow exists. Trying to position the element in the area
                    // where fewest overflow occurs.
                    if (topOverflow >= bottomOverflow) {
                        // First position was better, recovering.
                        newTop = position.top;
                        shrink = bottomOverflow;
                    }
                    else {
                        // New position is better
                        newTop = 0;
                        shrink = topOverflow;
                    }
                }
            }
        }

        return { top: newTop, shrink: shrink };
    }

    /**
     * Gets the effective z-index of the given element
     *
     * jQueryUI provides a zIndex function but it doesn't work with elements with position: -ms-device-fixed.
     * @param element
     */
    function getZIndex(element: JQuery): number {
        if (!element || !element.length || element[0] === <any>document) {
            return 0;
        }

        const position = element.css("position");
        if (position === "absolute" || position === "relative" || position === "fixed" || position === "-ms-device-fixed") {
            const zIndex = parseInt(element.css("zIndex"), 10);
            if (zIndex !== 0 && !isNaN(zIndex)) {
                return zIndex;
            }
        }

        return getZIndex(element.parent());
    }

    /**
     * Positions the given element at a location, making sure it fits on screen.
     * 
     * @param element The element to position
     * @param location The location to position the element at
     * @param options Options for positioning
     */
    export function positionAtLocation(element: any, location: ILocation, options?: IPositionOptions) {
        const $element = ensure$(element);

        positionShared($element, { left: location.left, top: location.top }, location.width || 0, location.height || 0, null, options);
    }

    /**
     * Positions the given element by taking the given base element
     * as a reference using the options provided
     * 
     * @param element Element to position
     * @param baseElement Reference element for positioning
     * @param options Options for positioning
     */
    export function position(element: any, baseElement: any, options?: IPositionOptions) {
        const $element = ensure$(element);
        const $baseElement = ensure$(baseElement);
        const basePosition = $baseElement.offset();
        const baseWidth = $baseElement.outerWidth();
        const baseHeight = $baseElement.outerHeight();

        positionShared($element, basePosition, baseWidth, baseHeight, $baseElement, options);
    }

    function positionShared($element: JQuery, basePosition: JQueryCoordinates, baseWidth: number, baseHeight: number, $zIndexElement: JQuery, options?: IPositionOptions): void {
        options = $.extend({}, options);

        const x = 0,  // horizontal
            y = 1;  // vertical
        let zIndex = 20000;

        let elementAlignmentMarker: JQuery;
        if (options.elementAlignmentMarker && options.elementAlignmentMarker.length) {
            elementAlignmentMarker = options.elementAlignmentMarker;
        }

        let baseAlignmentMarker: JQuery;
        if (options.baseAlignmentMarker && options.baseAlignmentMarker.length) {
            baseAlignmentMarker = options.baseAlignmentMarker;
        }

        const supportScroll = options.supportScroll === true; // positioning should support scroll or not (if overflow occurs)

        if (!options.skipZIndexSetting) {
            // Moving element to top
            const currentZIndex = $zIndexElement ? getZIndex($zIndexElement) : 0;
            if (currentZIndex !== 0) {
                zIndex = zIndex + currentZIndex;
            }
            $element.css("z-index", zIndex);
        }

        // Resetting height
        if (supportScroll) {
            if (options.scrollByMarker === true && baseAlignmentMarker) {
                $element.css("min-height", baseAlignmentMarker.outerHeight());
            }
            else {
                $element[0].style.height = "";
            }
        }

        let { width: elementWidth, height: elementHeight } = $element[0].getBoundingClientRect();
        if (!elementWidth || !elementHeight) {
            // We use getBoundingClientRect() because it has more accuracy, but sometimes it doesn't
            // actually work so we fall back to outerWidth()/outerHeight().
            elementWidth = $element.outerWidth();
            elementHeight = $element.outerHeight();
        }

        const elementAlign = (options.elementAlign || "left-top").split("-"); // Splitting the element align into two. First is horizontal, second is vertical value;
        const baseAlign = (options.baseAlign || "left-bottom").split("-"); // Splitting the base align into two. First is horizontal, second is vertical value;
        const overflow = (options.overflow || "fit-flip").split("-"); // Splitting overflow into two. First is horizontal, second is vertical value;

        // if markers should be used to horizontally align and a marker is present
        if (options.alignToMarkerHorizontal && baseAlignmentMarker) {
            // set the base to use the base marker's left and width
            basePosition.left = baseAlignmentMarker.offset().left;
            baseWidth = baseAlignmentMarker.outerWidth();
        }

        // if markers should be used to vertically align and a marker is present
        if (options.alignToMarkerVertical && baseAlignmentMarker) {
            // set the base to use the base marker's top and height
            basePosition.top = baseAlignmentMarker.offset().top;
            baseHeight = baseAlignmentMarker.outerHeight();
        }

        if (baseAlign[x] === "right") {
            basePosition.left += baseWidth;
        }
        else if (baseAlign[x] === "middle") {
            basePosition.left += baseWidth / 2;
        }

        if (baseAlign[y] === "bottom") {
            basePosition.top += baseHeight;
        }

        // Creating a copy of the base position
        const position: JQueryCoordinates = $.extend({}, basePosition);

        if (options.alignToMarkerHorizontal && elementAlignmentMarker) {
            // get the horizontal distance from the element's left to the marker's left and adjust the element's position
            const offsetLeft = $element.offset().left - elementAlignmentMarker.offset().left;
            position.left += offsetLeft;
            elementWidth = elementAlignmentMarker.outerWidth();
        }

        if (options.alignToMarkerVertical && elementAlignmentMarker) {
            // get the vertical distance from the element's top to the marker's top and adjust the element's position
            const offsetTop = $element.offset().top - elementAlignmentMarker.offset().top;
            position.top += offsetTop;
            elementHeight = elementAlignmentMarker.outerHeight();
        }

        if (elementAlign[x] === "right") {
            position.left -= elementWidth;
        }
        else if (elementAlign[x] === "middle") {
            position.left -= elementWidth / 2;
        }

        if (elementAlign[y] === "bottom") {
            position.top -= elementHeight;
        }

        position.left = Math.round(position.left);
        position.top = Math.round(position.top);


        // Fixing vertical overflow
        const oHandlerY: (position: JQueryCoordinates, data: any) => any = Positioning["_" + overflow[y].toLowerCase() + "Vertical"]; // vertical overflow handler
        if (oHandlerY) {
            const oResultY = oHandlerY(position, {
                baseMeasure: baseHeight,
                baseAlign: baseAlign[y],
                elementMeasure: elementHeight,
                elementAlign: elementAlign[y]
            });

            position.top = oResultY.top;

            if (supportScroll && oResultY.shrink > 0) {
                $element.height($element.height() - oResultY.shrink);

                // We need to re-measure width because of the scrollbar
                elementWidth = $element.outerWidth();
            }
        }

        // Fixing horizontal overflow
        const oHandlerX: (position: JQueryCoordinates, data: any) => void = Positioning["_" + overflow[x].toLowerCase() + "Horizontal"]; // horizontal overflow handler
        const data = {
            baseMeasure: baseWidth,
            baseAlign: baseAlign[x],
            elementMeasure: elementWidth,
            elementAlign: elementAlign[x],
            adjustedWidth: 0,
            leftOffsetPixels: options.leftOffsetPixels
        };

        if ($.isFunction(oHandlerX)) {
            oHandlerX(position, data);
        }

        const curOffset = $element.offset();
        let curTop = parseInt((<any>jQuery).css($element[0], "top", true), 10) || 0;
        let curLeft = parseInt((<any>jQuery).css($element[0], "left", true), 10) || 0;

        if (options.leftOffsetPixels) {
            curLeft += options.leftOffsetPixels;
        }
        if (options.topOffsetPixels) {
            curTop += options.topOffsetPixels;
        }

        const props: { top: number, left: number, width?: number } = {
            top: Math.floor((position.top - curOffset.top) + curTop),
            left: Math.floor((position.left - curOffset.left) + curLeft)
        };

        if (data.adjustedWidth > 0) {
            props.width = data.adjustedWidth;
        }

        // Setting the position
        $element.css(props);
    }

    /**
     * Get the first parent of the given element that allows scrolling
     * 
     * @param $element Element to scroll into view
     */
    export function getVerticalScrollContainer($element: JQuery): JQuery {

        var $container = $element.parent();

        while ($container.length && !($container.css("overflow-y") === "auto" || $container.css("overflow-y") === "scroll")) {
            $container = $container.parent();
        }

        if (!$container.length) {
            $container = $(document);
        }

        return $container;
    }

    function _performPositionedScroll(elementOffsetTop: number, elementHeight: number, $container: JQuery, position, scrollAnimationDuration: number) {

        var newScrollTop: number;

        switch (position) {

            case Positioning.VerticalScrollBehavior.Top:
                newScrollTop = elementOffsetTop;
                break;

            case Positioning.VerticalScrollBehavior.Middle:
                newScrollTop = elementOffsetTop + ((elementHeight - $container.height()) / 2);
                break;

            case Positioning.VerticalScrollBehavior.Bottom:
                newScrollTop = elementOffsetTop + elementHeight - $container.height();
                break;
        }

        if (typeof newScrollTop !== "undefined") {
            if (scrollAnimationDuration > 0) {
                $container.animate({
                    scrollTop: newScrollTop
                }, scrollAnimationDuration);
            }
            else {
                $container.scrollTop(newScrollTop);
            }
        }
    }

    function _getOffsetTop($element: JQuery, $container: JQuery): number {
        var currentElement: HTMLElement = $element[0],
            foundContainer = false,
            elementTop = 0;

        while (currentElement) {
            if ($container && currentElement === $container[0]) {
                foundContainer = true;
                break;
            }
            elementTop += currentElement.offsetTop;
            currentElement = <HTMLElement>currentElement.offsetParent;
        }

        if ($container && !foundContainer) {
            elementTop -= _getOffsetTop($container, null);
        }

        return elementTop;
    }

    /**
     * Sets the scroll (top) position of the $container element so that the $element is visible.
     * This is a no-op if the element is already visible.
     * 
     * @param $element Element to scroll into view
     * @param position The destination position of the element after scrolling (top, middle, bottom)
     * @param scrollIfAlreadyVisible 
     *    If true, perform the scroll even if the element is already in view
     * 
     * @param scrollAnimationDuration 
     *    If true, scroll with animation using the given animation time
     * 
     */
    export function scrollIntoViewVertical($element: JQuery, position?: Positioning.VerticalScrollBehavior, scrollIfAlreadyVisible?: boolean, scrollAnimationDuration?: number) {

        var $container = Positioning.getVerticalScrollContainer($element),
            elementTop = _getOffsetTop($element, $container),
            elementBottom,
            containerTop,
            containerBottom;

        containerTop = $container.scrollTop();

        if (elementTop < containerTop) {
            // Top of element is above the viewable range
            _performPositionedScroll(elementTop, $element.outerHeight(), $container, position ? position : Positioning.VerticalScrollBehavior.Top, scrollAnimationDuration);
        }
        else {
            elementBottom = elementTop + $element.outerHeight();
            containerBottom = containerTop + $container.height();

            if (elementBottom > containerBottom) {

                // bottom of element is below the viewable range
                _performPositionedScroll(elementTop, $element.outerHeight(), $container, position ? position : Positioning.VerticalScrollBehavior.Bottom, scrollAnimationDuration);
            }
            else if (scrollIfAlreadyVisible) {
                _performPositionedScroll(elementTop, $element.outerHeight(), $container, position ? position : Positioning.VerticalScrollBehavior.Middle, scrollAnimationDuration);
            }
        }
    }
}

class ResizeHandler {
    private $element: JQuery;
    private handler: (e: JQueryEventObject, args?) => void;

    constructor($element: JQuery, handler: (e: JQueryEventObject, args?) => void) {
        this.$element = $element;
        this.handler = handler;
    }

    public execute(e: JQueryEventObject, args?) {
        if (this.handler) {
            this.handler(e, args);
        }
    }

    public isMyParent($target: JQuery): boolean {
        // <summary>Checks to see the specified target element is one of the parents or not</summary>

        var result = false,
            target = $target.get(0);

        if (<any>target === <any>window) {
            // If the target is window this means browser window is resized (not a dialog resize)
            // We need to call all resize handlers in this case
            return true;
        }

        this.$element.parents().each(function () {
            if (target === this) {
                // parent found, exiting..
                result = true;
                return false;
            }
        });

        return result;
    }

    public owns($element: JQuery): boolean {
        return this.$element.get(0) === $element.get(0);
    }
}

class ContainerResizeManager {
    private handlers: ResizeHandler[] = [];

    constructor() {
        // Attaching the resize handler once
        $(window).bind("resize.containerResizeManager", Utils_Core.delegate(this, this.onResize));
    }

    private onResize(e: JQueryEventObject, args?) {
        var i, len,
            handler: ResizeHandler,
            $target = $(e.target);

        for (i = 0, len = this.handlers.length; i < len; i++) {
            handler = this.handlers[i];
            // Checking to see for this handler, whether the target is one of their parents
            if (handler.isMyParent($target)) {
                // Execute the resize handler
                handler.execute(e, args);
            }
        }
    }

    public attach($element: JQuery, handler: (e: JQueryEventObject, args?) => void) {
        this.handlers.push(new ResizeHandler($element, handler));
    }

    public detach($element: JQuery) {
        var i,
            handlers = this.handlers || [],
            handler: ResizeHandler;

        for (i = handlers.length - 1; i >= 0; i--) {
            handler = handlers[i];
            // Checking to see for this handler, whether the target is one of their parents
            if (handler.owns($element)) {
                // Execute the resize handler
                handlers.splice(i, 1);
            }
        }
    }

    public dispose() {
        this.handlers = null;
        $(window).unbind("resize.containerResizeManager");
    }
}

var containerResizeManager: ContainerResizeManager = null;

export function attachResize(element, handler: (e: JQueryEventObject, args?) => void) {
    // <summary> Attaches to the global resize event. It makes sure that the handler is called
    // when the actual container is resized</summary>
    if (!containerResizeManager) {
        containerResizeManager = new ContainerResizeManager();
    }

    containerResizeManager.attach($(element), handler);
}

export function detachResize(element) {
    // <summary> Detaches from the global resize event. </summary>
    if (containerResizeManager) {
        containerResizeManager.detach($(element));
    }
}

export function clearResizeHandlers() {
    // <summary>Clears all resize handlers</summary>
    if (containerResizeManager) {
        containerResizeManager.dispose();
        containerResizeManager = null;
    }
}

export interface SelectionRange {
    $startNode: JQuery;
    $endNode: JQuery;
    startNodeOffset: number;
    endNodeOffset: number;
}

export interface IBrowserInformation {
    msie?: boolean;
    edge?: boolean;
    chrome?: boolean;
    safari?: boolean;
    mozilla?: boolean;
    webkit?: boolean;
    version?: string;

    isWindows?: boolean;
    isMacintosh?: boolean;
    iOS?: boolean;
}

export module BrowserCheckUtils {

    class BrowserInformation {
        private static _instance: BrowserInformation;
        private _browserInformation: IBrowserInformation;

        constructor() {

        }

        public static getInstance(): BrowserInformation {
            if (!BrowserInformation._instance) {
                BrowserInformation._instance = new BrowserInformation();
                this._instance._initialize();
            }
            return BrowserInformation._instance;
        }

        public getBrowserInformation(): IBrowserInformation {
            return this._browserInformation;
        }

        private _initialize() {
            if (!this._browserInformation) {
                this._browserInformation = {};

                this._browserInformation.isWindows = navigator.platform.indexOf("Win") > -1;
                this._browserInformation.isMacintosh = navigator.userAgent.indexOf("Mac OS X") > -1;
                var iOS = /iphone|ipod|ipad/i.exec(navigator.userAgent);
                if (iOS) {
                    this._browserInformation.iOS = true;
                }

                var edge = /edge\/([\d+.]+)/i.exec(navigator.userAgent);
                if (edge) {
                    this._browserInformation.edge = true;
                    this._browserInformation.version = edge[1];
                    return;
                }

                var msie = /msie ([\d+.]+)/i.exec(navigator.userAgent);
                if (msie) {
                    this._browserInformation.msie = true;
                    this._browserInformation.version = msie[1];
                    return;
                }

                var chrome = /chrome\/([\d.]+)/i.exec(navigator.userAgent);
                if (chrome) {
                    this._browserInformation.chrome = true;
                    this._browserInformation.webkit = true;
                    this._browserInformation.version = chrome[1];
                    return;
                }

                var safari = /safari\/([\d.]+)/i.exec(navigator.userAgent);
                if (safari) {
                    this._browserInformation.safari = true;
                    this._browserInformation.webkit = true;
                    this._browserInformation.version = safari[1];
                    return;
                }

                var mozilla = /mozilla.*rv:([\d+.]+)/i.exec(navigator.userAgent);
                if (mozilla) {
                    this._browserInformation.mozilla = true;
                    this._browserInformation.version = mozilla[1];
                    return;
                }
            }
        }
    }

    export function isFirefox(): boolean {
        var userAgent = window.navigator.userAgent.toLowerCase();

        return BrowserInformation.getInstance().getBrowserInformation().mozilla && userAgent.indexOf("trident") === -1;
    }

    export function isChrome(): boolean {
        return BrowserInformation.getInstance().getBrowserInformation().chrome;
    }

    export function isSafari(): boolean {
        return BrowserInformation.getInstance().getBrowserInformation().safari;
    }

    export function isMozilla(): boolean {
        return BrowserInformation.getInstance().getBrowserInformation().mozilla;
    }

    /**
     * Returns true if browser is Internet Explorer 10 or earlier.
     */
    export function isMsie(): boolean {
        return BrowserInformation.getInstance().getBrowserInformation().msie;
    }

    /**
     *  Returns true if the browser is Internet Explorer
     */
    export function isIE(): boolean {
        var userAgent = window.navigator.userAgent.toLowerCase();
        if (BrowserInformation.getInstance().getBrowserInformation().msie) {
            return true;
        }
        else if (userAgent.indexOf("trident") !== -1) {
            //using trident as it is used as the string  in user agent name for IE11
            return true;
        }
        return false;
    }

    export function isEdge(): boolean {
        return BrowserInformation.getInstance().getBrowserInformation().edge;
    }

    export function getVersion(): string {
        return BrowserInformation.getInstance().getBrowserInformation().version;
    }

    export function isIEVersion(version: number): boolean {
        if (BrowserCheckUtils.isIE()) {
            var browserVersion: number = 0;
            var userAgent = window.navigator.userAgent.toLowerCase();
            if (BrowserInformation.getInstance().getBrowserInformation().msie) {
                browserVersion = Number(BrowserInformation.getInstance().getBrowserInformation().version);
            }
            else if (userAgent.indexOf("trident") !== -1) {
                //using trident as it is used as the string  in user agent name for IE11
                browserVersion = 11;
            }
            return version === browserVersion;
        }
        return false;
    }

    export function isLessThanOrEqualToIE9(): boolean {
        if (BrowserCheckUtils.isIE()) {
            var browserVersion: number = Number(BrowserInformation.getInstance().getBrowserInformation().version);
            return (browserVersion > 0) && (browserVersion <= 9);
        }
        return false;
    }

    export function isLessThanOrEqualToIE8(): boolean {
        if (BrowserCheckUtils.isIE()) {
            var browserVersion: number = Number(BrowserInformation.getInstance().getBrowserInformation().version);
            return (browserVersion > 0) && (browserVersion <= 8);
        }
        return false;
    }

    export function isMacintosh(): boolean {
        return BrowserInformation.getInstance().getBrowserInformation().isMacintosh;
    }

    export function isWindows(): boolean {
        return BrowserInformation.getInstance().getBrowserInformation().isWindows;
    }

    export function isIOS(): boolean {
        return BrowserInformation.getInstance().getBrowserInformation().iOS;
    }
}

export module SelectionUtils {

    export function getSelection(): SelectionRange {
        var selectedRange: SelectionRange = null,
            selection: any;

        if (window.getSelection) {
            selection = window.getSelection();
            if (selection && selection.anchorNode && selection.focusNode &&
                (selection.anchorNode !== selection.focusNode || selection.anchorOffset !== selection.focusOffset)) {

                selectedRange = <SelectionRange>{
                    $startNode: $(selection.anchorNode),
                    $endNode: $(selection.focusNode),
                    startNodeOffset: selection.anchorOffset,
                    endNodeOffset: selection.focusOffset
                };
            }
        }

        return selectedRange;
    }

    export function selectInputText($input: JQuery, startPosition: number, endPosition: number, focus: boolean) {
        if (focus) {
            $input.focus();
        }
        var inputElement = <HTMLInputElement>$input[0];
        if (typeof inputElement.selectionStart !== "undefined") {
            inputElement.selectionStart = startPosition;
            inputElement.selectionEnd = endPosition;
        }
        else if (Utils_Core.documentSelection && Utils_Core.documentSelection.createRange) {
            inputElement.select();
            var range = Utils_Core.documentSelection.createRange();
            range.collapse(true);
            range.moveStart("character", startPosition);
            range.moveEnd("character", endPosition);
            range.select();
        }
    }
}

export module HtmlInsertionUtils {
    export function pasteHtmlAtCaret(html: string, parentWindow?: Window) {
        var sel,
            range,
            parentDocument: Document;

        if (!parentWindow) {
            parentWindow = window;
            parentDocument = document;
        }
        else {
            parentDocument = parentWindow.document;
        }

        var parentDocumentSelection = (<any>parentDocument).selection;
        if (parentWindow.getSelection) { // IE9 and non-IE

            sel = parentWindow.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();

                var el = parentDocument.createElement("div");
                el.innerHTML = html;

                var frag = parentDocument.createDocumentFragment(),
                    node,
                    lastNode,
                    textNode = parentDocument.createTextNode($("<div>&nbsp;</div>").text());

                while ((node = el.firstChild)) {
                    lastNode = frag.appendChild(node);
                }
                range.insertNode(frag);

                // Preserve the selection
                if (lastNode) {
                    range = range.cloneRange();
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    // add a dummy text node so that chrome respects the <br> tag at the end
                    range.insertNode(textNode);
                    range.selectNodeContents(textNode);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        } else if (parentDocumentSelection && parentDocumentSelection.createRange) {// IE 8
            parentDocumentSelection.createRange().pasteHTML(html);
        }
    }
}

export interface ISectionManager {
    identifySections: () => void;
    nextSection: () => boolean;
    previousSection: () => boolean;
}

class SectionManager implements ISectionManager {
    private _index = 0;

    /**
     * Identifies the sections on the page and adds index.
     */
    public identifySections(): void {
        $(".splitter").each((index: number, elem: Element) => {
            this._identify($(elem).children(".leftPane"));
            this._identify($(elem).children(".rightPane"));
        });
    }

    /**
     * Enables focusing the first element in the next section.
     */
    public nextSection(): boolean {
        var index = this._getCurrentSectionIndex();
        return this._focusElement(index + 1);
    }

    /**
     * Enables focusing the first element in the previous section.
     */
    public previousSection(): boolean {
        var index = this._getCurrentSectionIndex();
        if (index >= 1) {
            return this._focusElement(index - 1);
        }

        return false;
    }

    private _identify($element: JQuery): void {
        if ($element.length > 0) {
            var index = this._index++;
            $element.addClass("hotkey-section hotkey-section-" + index);
            $element.data("hotkey-section-index", index);
        }
    }

    private _getCurrentSectionIndex(): number {
        if (document.activeElement) {
            var parentSection = $(document.activeElement).closest(".hotkey-section");
            if (parentSection.length > 0) {
                return parentSection.data("hotkey-section-index");
            }
        }

        return -1;
    }

    private _focusElement(index: number): boolean {
        var $tabbable = $(".hotkey-section-" + index + " :tabbable:first");
        if ($tabbable.length > 0) {
            $tabbable.focus();
            return true;
        }

        return false;
    }
}

export var sectionManager: ISectionManager = new SectionManager();

export interface IFilterGroup {
    start: number;
    end: number;
    level: number;
}

export function updateFilterGroups(groups: IFilterGroup[], clauseNumber: number, insert: boolean): IFilterGroup[] {
    var newGroups: IFilterGroup[];
    var gmap: IDictionaryStringTo<boolean>;

    if (groups && groups.length) {
        if (insert) {
            $.each(groups, function (i: number, g: IFilterGroup) {
                if (g.end >= clauseNumber) {
                    if (g.start >= clauseNumber) {
                        g.start++;
                    }

                    g.end++;
                }
            });
        }
        else {
            newGroups = [];
            gmap = {};

            $.each(groups, function (i: number, g: IFilterGroup) {
                var gkey: string;
                if (g.end >= clauseNumber) {
                    if (g.start > clauseNumber) {
                        g.start = Math.max(1, g.start - 1);
                    }

                    g.end = Math.max(1, g.end - 1);
                }

                if (g.start !== g.end) {
                    gkey = g.start + "_" + g.end;

                    if (!(gkey in gmap)) {
                        gmap[gkey] = true;
                        newGroups.push(g);
                    }
                }
            });

            return newGroups;
        }
    }

    return groups;
}

export function updateFilterGroupLevels(groups: IFilterGroup[]): number {
    var maxLevel = 0;

    function assignLevels(groups: IFilterGroup[], group: IFilterGroup) {

        $.each(groups, function (i: number, g: IFilterGroup) {
            if (!group) {
                assignLevels(groups, g);
            }
            else if (g !== group) {
                if (group.start <= g.start && group.end >= g.end) { //if group contains g
                    assignLevels(groups, g);
                    group.level = Math.max(group.level, g.level + 1);
                    maxLevel = Math.max(maxLevel, group.level);
                }
            }
        });
    }

    if (groups && groups.length) {
        $.each(groups, function (i: number, g: IFilterGroup) {
            g.level = 0;
        });

        assignLevels(groups, null);
    }

    return maxLevel;
}

export function findTreeNode(path: string, separator: string, comparer: IComparer<string>, textField: string): any {
    var pos: number;
    var part: string;
    var children: any[];
    var result: any = null;
    var item: any;
    var i: number;
    var l: number;

    if (path) {
        children = this.children;

        if (children && (l = children.length) > 0) {
            separator = separator || "/";

            do {
                pos = path.indexOf(separator);

                if (pos >= 0) {
                    part = path.substring(0, pos);
                    path = path.substring(pos + separator.length);
                }
                else {
                    part = path;
                    path = null;
                }
            }
            while (path && part === separator);

            if (part) {
                textField = textField || "text";
                comparer = comparer || Utils_String.localeIgnoreCaseComparer;

                for (i = 0; i < l; i++) {
                    item = children[i];
                    if (comparer(item[textField], part) === 0) {
                        result = item;
                        break;
                    }
                }

                if (result) {
                    if (path) {
                        if (result.children) {
                            return findTreeNode.call(result, path, separator, comparer, textField);
                        }
                        else {
                            result = null;
                        }
                    }
                }
            }
        }
    }

    return result;
}

export function calculateTreePath(includeRoot: boolean, separator: string, textField: string, rootField: string): string {
    var parent: any = this.parent;

    rootField = rootField || "root";

    if (parent && !includeRoot && parent[rootField]) {
        parent = null;
    }

    textField = textField || "text";

    if (parent) {
        separator = separator || "/";
        return calculateTreePath.call(parent, includeRoot, separator, textField, rootField) + separator + this[textField];
    }
    else {
        return this[textField];
    }
}

export function walkTree(f: IFunctionPPR<any, any, void>) {
    var i: number;
    var l: number;
    var children: any[];
    var item: any;
    if (f) {
        f.call(this, this);
        children = this.children;

        if (children && (l = children.length)) {
            for (i = 0; i < l; i++) {
                item = children[i];
                walkTree.call(item, f);
            }
        }
    }
}

export function injectStylesheets(cssReferenceUrls: string[], baseUrl: string = null) {
    // Get the existing stylesheet references
    var $existingStyles = $("head > link[rel=stylesheet]");
    var existingStyleUrls: { [url: string]: boolean; } = {};
    $.each($existingStyles, (i, existingStyleElem) => {
        var href = $(existingStyleElem).attr("href");
        if (href) {
            existingStyleUrls[href] = true;
        }
    });

    // Add any new stylesheet references
    $.each(cssReferenceUrls, (i, cssReference: string) => {
        if (!existingStyleUrls[cssReference]) {
            var fullUrl = (baseUrl || "") + cssReference;
            if (!existingStyleUrls[fullUrl]) {
                $("<link />").attr("rel", "stylesheet").attr("href", fullUrl).appendTo($(document.head));
            }
        }
    });
}

function doAccessibleAction(e: JQueryEventObject, handler?: Function) {
    var tabbables = $(":tabbable");
    var target = $(e.target);
    var current = tabbables.index(target);
    var totalTabbables;
    var notVisibleTabbables = 0;

    if (handler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");
        handler.call(target, e);
    } else {
        target.click();
    }

    totalTabbables = tabbables.length;
    while (!target.is(":visible:tabbable") && totalTabbables) {
        target = tabbables.eq((current++) % totalTabbables);
        if (target) {
            if (target.is(":visible:tabbable")) {
                // found target
                target.focus();
                break;
            }
            else {
                // target is not visible
                notVisibleTabbables++;
                // break if all the tabbables are not visible
                if (notVisibleTabbables === totalTabbables) {
                    break;
                }

                continue;
            }
        }
        else {
            // could not find any targets
            break;
        }
    }

    // prevent event propagation
    return false;
}

/**
 * When user presses space or enter on element, execute click handler and then move keyboard
 * focus to the next visible and tabbable element on the page.
 * @param element
 * @param handler
 */
export function accessible(element: JQuery, handler?: Function): JQuery {
    return element.addClass("propagate-keydown-event").attr("tabindex", "0")
        .keypress(function (e: JQueryEventObject) {
            if (e.keyCode === KeyCode.ENTER) {
                return doAccessibleAction(e, handler);
            }
        })
        .keyup(function (e: JQueryEventObject) {
            if (e.keyCode === KeyCode.SPACE) {
                return doAccessibleAction(e, handler);
            }
        });
}

/**
 * Keydown handler that, when the user presses enter or spacebar, executes the click event handler.
 * @param e
 */
export function buttonKeydownHandler(e: JQueryEventObject) {
    if (e.key === " " || e.key === "Spacebar" || e.key === "Enter") {
        (<HTMLElement>e.currentTarget).click();
        e.preventDefault();
    }
}

/**
 * Copy all css styles from source element to dest.
 * @param source
 * @param dest
 */
function copyStyle(source: HTMLElement, dest: HTMLElement) {
    const sourceStyle = window.getComputedStyle(source);
    for (let i in sourceStyle) {
        dest.style[i] = sourceStyle[i];
    }
}

/**
 * Returns true if the contents of the element overflow its visible bounds.
 * @param element
 */
export function contentsOverflow(element: HTMLElement | JQuery) {
    element = ensureHtmlElement(element);

    if ((element instanceof HTMLInputElement)
        && (BrowserCheckUtils.isEdge() || BrowserCheckUtils.isIE())) {
        // scrollWidth doesn't exceed offsetWidth in input elements on IE and Edge
        // so we copy style and contents into a div and measure that
        if (!element.value) {
            // optimize for empty elements
            return false;
        }
        const target = document.createElement("div");
        target.style['position'] = 'absolute';
        target.style['top'] = '-10000px';
        target.style['left'] = '-10000px';
        target.textContent = element.value;
        document.body.appendChild(target);
        const value = target.offsetWidth > element.offsetWidth;
        document.body.removeChild(target);
        return value;
    }

    return element.offsetWidth < element.scrollWidth;
}

export interface ITooltipIfOverflowOptions {
    /**
     * titleTarget element which will get the tooltip, and whose text will be used to populate the tooltip, only need specify if different than element argument passed in to tooltipIfOverflow()
     */
    titleTarget?: HTMLElement | HTMLInputElement;
    /**
     * element that generates the mouseenter, mouseleave, focus, and blur events we should listen for
     */
    eventSource?: HTMLElement;
    /**
     * titleText text to set the title to, otherwise use the titleTarget's .text() or .val()
     */
    titleText?: string;
    /**
     * Function that will add the tooltip on mouseenter or focus (default is to add title attribute).
     * The options object passed to this function will have titleTarget and titleText set to the correct values to use.
     */
    addTooltipDelegate?: (e: MouseEvent | FocusEvent, options: ITooltipIfOverflowOptions) => void;
    /**
     * Function that removes the tooltip on mouseleave or blur
     */
    removeTooltipDelegate?: (e: MouseEvent | FocusEvent, options: ITooltipIfOverflowOptions) => void;
}

/**
 * Show a tooltip on hover, only if the text of the element overflows the visible area.
 * @param element element with text-overflow set
 * @param options 
 *                
 */
export function tooltipIfOverflow(element: HTMLElement | HTMLInputElement, options?: ITooltipIfOverflowOptions) {
    const tooltipTextKey = "tooltipText";

    options = {
        titleTarget: element,
        eventSource: element,
        addTooltipDelegate: (e, o) => {
            o.titleTarget.setAttribute("title", o.titleText);
        },
        removeTooltipDelegate: (e, o) => {
            o.titleTarget.removeAttribute("title")
        },
        ...options
    };

    const inHandler = (e: MouseEvent) => {
        if (contentsOverflow(element)) {
            options.titleText = $(element).data(tooltipTextKey) || (options.titleTarget instanceof HTMLInputElement ? options.titleTarget.value : options.titleTarget.textContent);
            options.addTooltipDelegate(e, options);
        }
    };
    const outHandler = (e: MouseEvent) => {
        options.removeTooltipDelegate(e, options);
    };


    if (element && !$(element).data(tooltipTextKey)) {
        if (options.addTooltipDelegate) {
            options.eventSource.addEventListener("mouseenter", inHandler);
            options.eventSource.addEventListener("focus", inHandler);
        }
        if (options.removeTooltipDelegate) {
            options.eventSource.addEventListener("mouseleave", outHandler);
            options.eventSource.addEventListener("blur", outHandler);
        }
    }
    $(element).data(tooltipTextKey, options.titleText);
}

/**
 * Gets the overflow element using the specified element or its children and grandchildren (optionally).
 *
 * @param elem DOM element to check the overflow.
 * @param recursive Determines whether to go deeper with children and grandchildren or not.
 */
export function getOverflowElement(elem: HTMLElement, recursive: boolean = false): HTMLElement {
    if (elem) {
        if (elem.scrollWidth > elem.offsetWidth) {
            return elem;
        }

        if (recursive && elem.children && elem.children.length > 0) {
            for (let i = 0, len = elem.children.length; i < len; i++) {
                let overflowElem = getOverflowElement(elem.children[i] as HTMLElement, recursive);
                if (overflowElem) {
                    return overflowElem;
                }
            }
        }
    }

    return null;
}

class WatermarkSupport {
    private static _instance: WatermarkSupport;

    public static instance(): WatermarkSupport {
        if (!this._instance) {
            this._instance = new WatermarkSupport();
        }

        return this._instance;
    }

    public watermark(element: JQuery, args: any[]): JQuery {
        if (args.length > 0) {
            if (typeof (args[0].watermarkText) === "string") {
                // Use specified watermark text
                element.attr("placeholder", args[0].watermarkText);
            } else if (args[0] === "focus") {
                // Focus the element
                tryFocus(element);
            }
        }

        return element;
    }
}

export function Watermark(element: JQuery, ...args: any[]): JQuery {
    return WatermarkSupport.instance().watermark(element, args);
}

class HighContrastService {
    static readonly HighContrastThemeName = "HighContrast";

    /**
     * Detects the operating system for the high contrast mode by appending a
     * probe element to the body and trying to read the background-image css property.
     * IE sets this property to 'none' for high contrast mode, even though a valid property is set.
     * 
     * It this case, we set a cookie and reload the page to get the new styles.
     */
    public static execute(): void {
        const globalizationContext = VSS_Context.getPageContext().globalization;
        if (!globalizationContext.explicitTheme) {
            if (VSS_Context.isAutoHighContrastMode() && globalizationContext.theme !== HighContrastService.HighContrastThemeName) {
                Utils_Core.setCookie("TFS-AUTO-THEME", HighContrastService.HighContrastThemeName);
                window.location.reload();
            }
            else if (!VSS_Context.isAutoHighContrastMode() && globalizationContext.theme === HighContrastService.HighContrastThemeName) {
                Utils_Core.deleteCookie("TFS-AUTO-THEME");
                window.location.reload(true);
            }
        }
    }
}

namespace ScriptedFocusRing {
    /**
     * Any time a key that might change focus is pressed, add a class to
     * <body> that indicates this state.
     * When mouse is clicked, remove the class.
     */
    export const directionalKeyCodes = [
        KeyCode.UP,
        KeyCode.DOWN,
        KeyCode.LEFT,
        KeyCode.RIGHT,
        KeyCode.TAB,
        KeyCode.PAGE_DOWN,
        KeyCode.PAGE_UP,
        KeyCode.HOME,
        KeyCode.END,

        // In a UI that has master and detail view, F6 is used
        // to shift focus between master and details view. 
        KeyCode.F6
    ];
    export let focusRingHidden = true;
    export let lastKeyCodePressed: number = null;
    let focusRingTarget: HTMLElement = null;
    let lastFocusRingSize: number = 2;

    function focusRingVisible(): boolean {
        return focusRingTarget && document.body.classList.contains("vss-focus-visible") && !focusRingHidden;
    }

    export function initFocusHandling() {
        const focusVisibleClass = "vss-focus-visible";
        document.addEventListener("keydown", (e: KeyboardEvent) => {
            lastKeyCodePressed = e.keyCode;
            if (directionalKeyCodes.indexOf(e.keyCode) >= 0) {
                document.body.classList.add(focusVisibleClass);
            }
        }, true);
        document.addEventListener("mousedown", (e: MouseEvent) => {
            lastKeyCodePressed = null;
            document.body.classList.remove(focusVisibleClass);
        }, true);

        document.addEventListener("focus", (e: MouseEvent) => {
            hideFocusRing();
        }, true);

        let ignoreScrollEvents = false;
        const scrollRafCallback = () => {
            ignoreScrollEvents = false;
            if (focusRingVisible()) {
                positionFocusRing();
            }
        };
        document.addEventListener("scroll", (event: UIEvent) => {
            if (!ignoreScrollEvents) {
                window.requestAnimationFrame(scrollRafCallback);
            }
            ignoreScrollEvents = true;
        }, true);

        // Create a global focus ring that can be manipulated with JS when 
        // required by various circumstances.
        const focusRing = document.createElement("div");
        focusRing.setAttribute("id", "vssFocusRing");
        if (document.body.lastElementChild) {
            document.body.insertBefore(focusRing, document.body.lastElementChild);
        } 
        else {
            document.body.appendChild(focusRing);
        }
    }

    export function focusRingFocusHandler(event: FocusEvent, ringSize: number) {
        focusRingTarget = event.target as HTMLElement;
        lastFocusRingSize = ringSize;
        positionFocusRing();
    }

    function positionFocusRing() {
        const focusRing = getFocusRing();

        // This bounding is relative to the window.
        const bounding = focusRingTarget.getBoundingClientRect();

        // Ensure the focus ring takes into account scrolling.
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Ensure that the focus ring target is not occluded by other UI. This
        // is a best effort by testing the middle of the focused element.
        if (!focusRingTarget.contains(document.elementFromPoint(bounding.left + bounding.width / 2, bounding.top + bounding.height / 2))) {
            hideFocusRing();
            return;
        }

        // Account for an element jammed against the edge of the window
        const left = bounding.left - lastFocusRingSize;
        const leftEdge = Math.round(Math.max(left, 0));
        const leftOffset = leftEdge + scrollLeft;
        const top = bounding.top - lastFocusRingSize;
        const topEdge = Math.round(Math.max(top, 0));
        const topOffset = topEdge + scrollTop;
        const width = bounding.width + lastFocusRingSize * 2;
        let rectWidth = width - Math.max(0, leftEdge - left);
        const height = bounding.height + lastFocusRingSize * 2;
        let rectHeight = height - Math.max(0, topEdge - top);

        if (leftEdge + rectWidth > window.innerWidth) {
            rectWidth = window.innerWidth - leftEdge;
        }
        if (topEdge + rectHeight > window.innerHeight) {
            rectHeight = window.innerHeight - topEdge;
        }

        focusRing.style.width = rectWidth + "px";
        focusRing.style.height = rectHeight + "px";
        focusRing.style.transform = `translate(${leftOffset}px, ${topOffset}px)`;
        focusRing.style.removeProperty("visibility");
        focusRingHidden = false;
    }
}

/**
 * Gets the global focus ring element. Messing with this element could break
 * focus in other UI.
 */
export function getFocusRing(): HTMLElement {
    return document.getElementById("vssFocusRing");
}

/**
 * Hides the global focus ring. It can only be shown again with a focus event
 */
export function hideFocusRing() {
    getFocusRing().style.visibility = "hidden";
    ScriptedFocusRing.focusRingHidden = true;
}

/**
 * Gets a handler that is intended to be executed on a focus event. This handler
 * draws a box around the focused element if it is focused via the keyboard.
 * @param keyCodes List of keycodes that could lead to this focus event being called.
 * @param ringSize Size of the ring to draw around the focused element.
 */
export function getFocusRingFocusHandler(keyCodes: number[] = ScriptedFocusRing.directionalKeyCodes, ringSize: number = 1) {
    return (event: FocusEvent) => {
        if (keyCodes.indexOf(ScriptedFocusRing.lastKeyCodePressed) >= 0) {
            ScriptedFocusRing.focusRingFocusHandler(event, ringSize);
        }
    }
}

// Detect high contrast
// Set up global class for keyboard focus styles
$(() => {
    HighContrastService.execute();
    ScriptedFocusRing.initFocusHandling();
});


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.UI", exports);
