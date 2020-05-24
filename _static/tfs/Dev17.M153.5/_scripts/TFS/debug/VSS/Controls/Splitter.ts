/// <amd-dependency path='VSS/LoaderPlugins/Css!Splitter' />

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

/**
 * @publicapi
 */
export interface ISplitterOptions {
    /**
     * Initial size of the grid in px.
     */
    initialSize?: number;

    /**
     * Specifies which side of the splitter is fixed (left or right).
     * @defaultvalue "left"
     */
    fixedSide?: string;

    /**
     * Specifies whether the split should be vertical or not.
     * @defaultvalue true
     */
    vertical?: boolean;

    /**
     * Text displayed on splitter handle when toggle button is enabled and splitter is collapsed.
     */
    collapsedLabel?: string;

    /**
     * Enables the toggle button which displays a button for expand/collapse.
     * @defaultvalue false
     */
    enableToggleButton?: boolean;

    animationSpeed?: number;

    expandState?: string;

    /**
     * Sets the minimum width of the splitter's fixed side.
     */
    minWidth?: number;

    /**
     * Sets the maximum width of the splitter's fixed side.
     */
    maxWidth?: number;

    /**
     * Optional: Tooltip show on the toggle button when the splitter is collapsed
     */
    toggleButtonCollapsedTooltip?: string;

    /**
     * Optional: Tooltip show on the toggle button when the splitter is expanded 
     */
    toggleButtonExpandedTooltip?: string;

    /**
     * Optional: Toggle handler called when expand state changes
     */
    onToggle?: (isExpanded: boolean) => void;
}

/**
 * @publicapi
 */
export class SplitterO<TOptions extends ISplitterOptions> extends Controls.Control<TOptions> {

    public static enhancementTypeName: string = "tfs.splitter";
    private static _noSplitCssClass = "no-split";

    public static CORE_CSS_CLASS: string = "splitter";
    public static HORIZONTAL_CLASS: string = "horizontal";
    public static VERTICAL_CLASS: string = "vertical";
    public static TOGGLE_BUTTON_LENGTH: number = 16;
    public static TOGGLE_BUTTON_MARGIN: number = 2;
    public static COLLAPSED_CLASS_NAME: string = "collapsed";
    public static TOGGLE_BUTTON_ENABLED_CLASS_NAME: string = "toggle-button-enabled";
    public static TOGGLE_BUTTON_HOTKEY_ENABLED_CLASS_NAME: string = "toggle-button-hotkey-enabled";
    public static AUTO_COLLAPSE_THRESHOLD: number = 20;
    public static DEFAULT_ANIMATION_SPEED: number = 800;
    public static HANDLE_BAR_CLONE_SIZE: number = 5;

    private _screenXY = "pageX";
    private _cssPosProp = "left";
    private _cssSizeProp = "width";
    private _leftFix = true;
    private _fixedSide: JQuery;
    private _fillSide: JQuery;
    private _deltaMultiplier = 1;
    private _dragStart: any = false;
    private _fixedSidePixels: number;
    private _splitterOverlay: any;
    private _$handleBarClone: JQuery;
    private _ignoreWindowResize = false;
    private _$toggleButton: JQuery;
    private _$toggleButtonIcon: JQuery;
    private _minWidth: number;
    private _maxWidth: number;
    private _savedFixedSidePixels: number;

    public leftPane: JQuery;
    public rightPane: JQuery;
    public handleBar: JQuery;
    /**
     * Set to null or undefined if the splitter is currently not collapsed.
     * "right" if collapsed on the left side of the page.
     * "left" if collapsed on the right side of the page.
     */
    public expandState: string;

    constructor(options: TOptions) {
        super(options);
        if (options && options.initialSize) {
            this._fixedSidePixels = options.initialSize;
        }
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions): void {
        super.initializeOptions($.extend(<ISplitterOptions>{
            coreCssClass: "splitter",
            vertical: true,
            fixedSide: "left"
        }, options));
    }

    /**
     * @param element 
     */
    public _enhance(element: JQuery): void {

        super._enhance(element);

        this.leftPane = element.children(".leftPane");
        this.handleBar = element.children(".handleBar");
        this.rightPane = element.children(".rightPane");

        // Overlay a larger hit target div inside a skinny splitter.
        this.handleBar.append(domElem("div", "handleBar-hitTarget"));

        var options = this._options;

        // Synch orientation with the appropriate class name
        if (element.hasClass(Splitter.VERTICAL_CLASS)) {
            options.vertical = true;
        } else if (element.hasClass(Splitter.HORIZONTAL_CLASS)) {
            options.vertical = false;
        } else if (options.vertical === true) {
            element.addClass(Splitter.VERTICAL_CLASS);
        } else {
            element.addClass(Splitter.HORIZONTAL_CLASS);
        }

        // Determine initial size
        if (!options.expandState) {
            if (this.getElement().hasClass("left-expand")) {
                this.expandState = "left";
            }
            else if (this.getElement().hasClass("right-expand")) {
                this.expandState = "right";
            }
        } else {
            this.expandState = options.expandState;
        }

        // Determine fixed side
        if (this.getElement().hasClass("right-fix")) {
            options.fixedSide = "right";
        } else if (options.fixedSide === "right") {
            element.addClass("right-fix");
        } else {
            options.fixedSide = "left";
        }

        // Set collapsedLavel if specified
        var collapsedLabel = options.collapsedLabel;
        if (!collapsedLabel) {
            collapsedLabel = element.data().collapsedLabel;
        }

        if (collapsedLabel) {
            this.setCollapsedLabel(collapsedLabel);
        }
    }

    public initialize(): void {
        super.initialize();

        this._setupHandleBar();

        var options = this._options;
        this.setMaxWidth(options.maxWidth);
        this.setMinWidth(options.minWidth);

        this._configureCssProps();

        if (!this._isCollapsed()) {
            this._setInitialSize();
        }

        this._attachEvents();

        // now that all the styles are initialized, make sure the toggle button is positioned correctly
        if (this._options.enableToggleButton || this._isToggleButtonEnabled()) {
            this.getElement().addClass(Splitter.TOGGLE_BUTTON_ENABLED_CLASS_NAME);
            this._ensureToggleButton();
            if (this._isToggleButtonHotkeyEnabled()) {
                this._bind($(window.document), "keyup", delegate(this, this._onDocumentKeyup));
            }
        }

        if (this.getElement().hasClass(Splitter._noSplitCssClass)) {
            this._fixedSide.toggle(false);
        }
    }

    private _setupHandleBar(): void {
        // Handle bar is a separator in terms of accessibility
        let separator = this.handleBar;

        separator.attr({
            tabindex: this.isExpanded() ? "0" : "-1",
            role: "separator",
            "aria-label": Resources_Platform.SplitterLabel,
        });

        // Set orientation
        this._setAriaOrientation(this._options.vertical);
    }

    private _setInitialSize(): void {
        var initialSize = 0;

        // Try getting initial size from options
        if (this._options.initialSize > 0) {
            initialSize = this._options.initialSize;
        }

        // Try getting initial size from the element
        if (initialSize <= 0) {
            initialSize = this.getElement().data().initialSize;
        }

        // Adjust initial size if specified, otherwise falls back to default value (40%)
        if (initialSize) {
            this.resize(initialSize, true, false);
        }
    }

    /**
     * Sets the minimum width of the splitter's fixed side.
     * 
     * @param minWidth minimum number of pixels the fixed side will fill.
     * @publicapi
     */
    public setMinWidth(minWidth: number): void {
        this._minWidth = minWidth;
        this.setAttribute("aria-valuemin", minWidth, this.handleBar);
    }

    /**
     * Sets the maximum width of the splitter's fixed side.
     * 
     * @param maxWidth maximum number of pixels the fixed side will fill.
     * @publicapi
     */
    public setMaxWidth(maxWidth: number): void {
        this._maxWidth = maxWidth;
        this.setAttribute("aria-valuemax", maxWidth, this.handleBar);
    }

    private _getAdjustedSize(size: number): number {
        let minWidth = this._minWidth;
        let maxWidth = this._maxWidth;

        // Respect our minimum width if it's set
        if (typeof minWidth === "number" && size < minWidth) {
            size = minWidth;
        }

        // Respect our maximum width if it is set
        if (typeof maxWidth === "number" && size > maxWidth) {
            size = maxWidth;
        }

        return size;
    }

    /**
     * Resize the fixed side of the splitter to the specified size.
     *
     * @param newSize New fixed side size in px.
     * @param suppressFireResize Determines whether to suppress firing resize event or not.
     * @param useAnimation Determines whether to use animation during resize or not.
     * @param complete A callback function to notify that the resize operation completes.
     * @publicapi
     */
    public resize(newSize: any, suppressFireResize?: boolean, useAnimation?: boolean, complete?: Function): void {
        if (this.getElement().hasClass(Splitter._noSplitCssClass)) {
            // Don't attempt resize if there is no split. It does not behave nicely.
            return;
        }

        if (!this.getElement().is(":visible")) {
            // Don't resize if splitter is invisible
            return;
        }

        var newSizeCss, animationOption, animationSpeed;

        // make sure the splitter is no longer "collapsed"
        // so that the child components, e.g. handleBar, are properly styled
        // before we start re-computing their size and position
        this.getElement().toggleClass(Splitter.COLLAPSED_CLASS_NAME, false);

        if (newSize !== null && newSize !== undefined) {
            if (newSize < 0) {
                newSize = 0;
            } else {
                var elemSize = (<any>this.getElement())[this._cssSizeProp]() - (<any>this.handleBar)[this._cssSizeProp]();
                if (newSize > elemSize) {
                    var leftPaneSize = this.leftPane[this._cssSizeProp]();
                    // The element might be hidden now (example: When switching between tabs, the tab with splitter will go hidden)
                    // To restore same state as previous try to adjust based on leftpane size
                    if (elemSize < leftPaneSize) {
                        elemSize = leftPaneSize;
                    }
                    newSize = elemSize;
                }
            }
        }

        if (newSize === null || newSize === undefined) {
            newSizeCss = "";
        } else {
            newSizeCss = newSize;
        }

        if (useAnimation) {
            animationSpeed = this._options.animationSpeed || Splitter.DEFAULT_ANIMATION_SPEED;
            animationOption = this._createAnimationOption(this._cssSizeProp, newSizeCss + "px");
            this._fixedSide.animate(animationOption, animationSpeed);

            animationOption = this._createAnimationOption(this._cssPosProp, newSizeCss + "px");
            this._fillSide.animate(animationOption, animationSpeed);
            this.handleBar.animate(animationOption, animationSpeed, complete);
        }
        else {
            this._fixedSide.css(this._cssSizeProp, newSizeCss);
            this._fillSide.css(this._cssPosProp, newSizeCss);
            this.handleBar.css(this._cssPosProp, newSizeCss);
            if (complete) {
                complete();
            }
        }

        this._fixedSidePixels = newSize;
        this._layoutToggleButton(useAnimation);

        this.setAttribute("aria-valuenow", newSize, this.handleBar);

        if (!suppressFireResize) {
            this._fireWindowResize();
        }
    }

    /**
     * Expand or collapse the splitter.
     * 
     * @param expanded True to expand the splitter, false to collapse it. If not provided, the expansion state toggles.
     */
    public toggleExpanded(expanded?: boolean): void {
        if (expanded === undefined || expanded !== this.isExpanded()) {
            if (this.expandState) {
                this.removeExpand();
                this.handleBar.attr("tabindex", "0");
            }
            else {
                if (this._options.fixedSide === "left") {
                    this._expandInternal("right");
                }
                else {
                    this._expandInternal("left");
                }

                this.handleBar.attr("tabindex", "-1");
            }

            this.getElement().toggleClass(Splitter.COLLAPSED_CLASS_NAME, !this.isExpanded());
            this._setToggleButtonTooltip();

            this._fireWindowResize();

            this._fire("changed", this);

            if (this._options.onToggle) {
                this._options.onToggle(this.isExpanded());
            }
        }
    }

    /**
     * Expands the splitter.
     * @publicapi
     */
    public expand(): void {
        this.toggleExpanded(true);
    }

    /**
     * Collapses the splitter.
     * @publicapi
     */
    public collapse(): void {
        this.toggleExpanded(false);
    }

    /**
     * Specifies whether the splitter is expanded or not.
     *
     * @returns {boolean}
     * @publicapi
     */
    public isExpanded(): boolean {
        return !this.expandState;
    }

    /**
     * Expands the splitter.
     * @param suppressResize 
     */
    public removeExpand(suppressResize?: boolean) {

        this.getElement().removeClass("left-expand");
        this.getElement().removeClass("right-expand");
        this.expandState = null;

        if (!suppressResize) {
            this.resize(this._fixedSidePixels);
        } else {
            this._layoutToggleButton();
            this._fireWindowResize();
        }
    }

    /**
     * Collapses the splitter.
     * @param side 
     */
    protected _expandInternal(side?: string) {
        let element = this.getElement();

        if (!side) {
            side = "left";
        }

        if (side === "left") {
            element.removeClass("right-expand").addClass("left-expand");
        }
        else {
            element.removeClass("left-expand").addClass("right-expand");
        }

        this.expandState = side;

        this._fixedSide.css(this._cssSizeProp, "");
        this._fillSide.css(this._cssPosProp, "");
        this.handleBar.css(this._cssPosProp, "");
        this._layoutToggleButton();

        // Update aria value
        this.setAttribute("aria-valuenow", 0, this.handleBar);
    }

    /**
     * Gets the fixed side size in px.
     * 
     * @returns {number}
     * @publicapi
     */
    public getFixedSidePixels(): number {
        return this._fixedSidePixels;
    }

    /**
     * Shows/hides the fixed side of the splitter.
     * @param visible whether the fixed side should be shown. Defaults to false, does NOT toggle.
     */
    public toggleSplit(visible?: boolean, animate?: boolean, defaultExpandToPixels?: number) {
        if (visible) {
            this.getElement().removeClass(Splitter._noSplitCssClass);
            if (this._savedFixedSidePixels !== undefined) {
                this._fixedSidePixels = this._savedFixedSidePixels;
                this._savedFixedSidePixels = undefined;
            }

            this._fixedSide.css("display", "");

            if (this.expandState) {
                this._expandInternal(this.expandState);
                this.getElement().addClass(Splitter.COLLAPSED_CLASS_NAME);
                this._setToggleButtonTooltip();
                this._fireWindowResize();
            }
            else {
                if (animate) {
                    const resizeToValue = this._fixedSidePixels || defaultExpandToPixels;
                    this.resize(0, true, false);
                    this.resize(resizeToValue, true, true);
                }
                else {
                    this.resize(this._fixedSidePixels || defaultExpandToPixels);
                }
            }
        } else {
            this._savedFixedSidePixels = this._fixedSidePixels;
            this.resize(0, true, animate, () => {
                this.getElement().addClass(Splitter._noSplitCssClass);
                this.getElement().removeClass(Splitter.COLLAPSED_CLASS_NAME);

                this._fixedSide.css(this._cssSizeProp, "").css("display", "none");
                this._fillSide.css(this._cssPosProp, "");
                this.handleBar.css(this._cssPosProp, "");

                this._fireWindowResize();
            });
        }
    }

    /**
     * Disables the split.
     * @publicapi
     */
    public noSplit(animate?: boolean) {
        this.toggleSplit(false, animate);
    }

    /**
     * Enables the split.
     *
     * @param animate Determines split operation is animated or not (default false).
     * @param defaultExpandToPixels Specified value used for split amount. If not specified default value is used.
     * @publicapi
     */
    public split(animate?: boolean, defaultExpandToPixels?: number) {
        this.toggleSplit(true, animate, defaultExpandToPixels);
    }

    /**
     * @param newSize 
     */
    public toggleOrientation(vertical, newSize?: number) {

        vertical = Boolean(vertical);

        if (this._options.vertical !== vertical) {
            let element = this.getElement();
            element.removeClass("left-expand");
            element.removeClass("right-expand");
            this.expandState = null;
            this._fixedSide.css(this._cssSizeProp, "");
            this._fillSide.css(this._cssPosProp, "");
            this.handleBar.css(this._cssPosProp, "");

            this._options.vertical = vertical;
            element.toggleClass(Splitter.VERTICAL_CLASS, vertical);
            element.toggleClass(Splitter.HORIZONTAL_CLASS, !vertical);
            this._configureCssProps();

            this._setAriaOrientation(vertical);

            this.resize(newSize);
        }
    }

    /**
     * Changes split orientation to vertical.
     * @publicapi
     */
    public vertical(): void {
        this.toggleOrientation(true);
    }

    /**
     * Changes split orientation to horizontal.
     * @publicapi
     */
    public horizontal(): void {
        this.toggleOrientation(false);
    }

    /**
     * Sets the orientation value of corresponding aria attribute.
     * 
     * @param vertical Determines whether splitter in vertical position or not.
     */
    private _setAriaOrientation(vertical: boolean): void {
        // When splitter is vertical, separator is horizontal and vice versa
        this.setAttribute("aria-orientation", vertical === false ? "vertical" : "horizontal", this.handleBar);
    }

    /**
     * Sets the label that is shown when the splitter is collapsed
     * 
     * @param labelText Text displayed when the splitter is collapsed (null/empty for none)
     * @publicapi
     */
    public setCollapsedLabel(labelText: string): void {

        var $container: JQuery;

        this.handleBar.children(":not(.handleBar-hitTarget)").remove();

        if (labelText) {

            $container = $(domElem("div", "handlebar-label"))
                .prependTo(this.handleBar)
                .attr("title", labelText)
                .bind("mousedown", (e) => {
                    this.toggleExpanded(true);
                    e.preventDefault();
                    e.stopPropagation();
                });

            $(domElem("span", "handlebar-label-text"))
                .appendTo($container)
                .text(labelText);
        }
    }

    public _createElement() {
        super._createElement();
        if (this._options.vertical === false) {
            this.getElement().addClass(Splitter.HORIZONTAL_CLASS);
        }
        else {
            this.getElement().addClass(Splitter.VERTICAL_CLASS);
        }

        if (this._options.expandState) {
            this.expandState = this._options.expandState;
            this.getElement().addClass(this.expandState === "left" ? "left-expand" : "right-expand");
        }

        if (this._options.fixedSide === "right") {
            this.getElement().addClass("right-fix");
        }

        this.leftPane = $(domElem("div", "leftPane")).appendTo(this.getElement());
        this.handleBar = $(domElem("div", "handleBar")).appendTo(this.getElement());
        this.rightPane = $(domElem("div", "rightPane")).appendTo(this.getElement());

        this.handleBar.append(domElem("div", "handleBar-hitTarget"));

        if (this._options.collapsedLabel) {
            this.setCollapsedLabel(this._options.collapsedLabel);
        }
    }

    private _configureCssProps() {
        var leftFix = this._leftFix = this._options.fixedSide === "left";

        if (leftFix) {
            this._deltaMultiplier = 1;
            this._fixedSide = this.leftPane;
            this._fillSide = this.rightPane;
        }
        else {
            this._deltaMultiplier = -1;
            this._fixedSide = this.rightPane;
            this._fillSide = this.leftPane;
        }

        if (this._options.vertical === false) {
            this._screenXY = "pageX";
            this._cssSizeProp = "width";
            this._cssPosProp = leftFix ? "left" : "right";
        }
        else {
            this._screenXY = "pageY";
            this._cssSizeProp = "height";
            this._cssPosProp = leftFix ? "top" : "bottom";
        }

        if (this._isCollapsed()) {
            if (this._options.fixedSide === "left") {
                this.expandState = "right";
            }
            else {
                this.expandState = "left";
            }
        }
    }

    private _attachEvents() {
        var that = this;
        this._bind(this.handleBar, "mousedown", delegate(this, this._handleBarMouseDown));
        this._bind(this.handleBar, "dblclick", delegate(this, this._handleBarDoubleClick));
        this._bind(this.handleBar, "mouseover", function (e) { that.handleBar.addClass("hover"); });
        this._bind(this.handleBar, "mouseout", function (e) { that.handleBar.removeClass("hover"); });
        this._bind(this.handleBar, "selectstart", function () { return false; });
        this._bind(this.handleBar, "keydown", this._handleBarKeydown.bind(this));
        Utils_UI.attachResize(this.getElement(), delegate(this, this._onWindowResize));
    }

    /**
     * Gets the collapse/expand toggle button of this splitter control.
     */
    private _ensureToggleButton() {
        if (!this._$toggleButton) {
            let element = this.getElement();
            let $toggleButton = element.find(".toggle-button");

            if ($toggleButton.length === 0) {
                this._$toggleButtonIcon = $("<span>").addClass("bowtie-icon");
                $toggleButton = $("<button>").addClass("toggle-button")
                    .append(this._$toggleButtonIcon);

                $toggleButton.insertBefore(element.children(".handleBar"));
            }

            this._$toggleButton = $toggleButton;
            this._setToggleButtonTooltip();
            this._layoutToggleButton();
            this._$toggleButton.click(delegate(this, this._onToggleButtonClick));
        }
    }

    /**
     * Re-position the toggle button.
     * 
     * @param useAnimation true if the layout change is animated; false, otherwise.
     */
    private _layoutToggleButton(useAnimation?: boolean) {
        var position,
            animationOption,
            isExpanded = this.isExpanded();

        if (!this._$toggleButton) {
            return;
        }

        if (isExpanded) {
            this._measureFixedSide();
            position = this._fixedSidePixels - (Splitter.TOGGLE_BUTTON_MARGIN + Splitter.TOGGLE_BUTTON_LENGTH);
        }
        else {
            position = Splitter.TOGGLE_BUTTON_MARGIN;
        }

        // Set toggle button icon based on collapsed/expanded status
        if (this._$toggleButtonIcon) {
            this._setToggleButtonIconClass(isExpanded);
        }

        if (useAnimation) {
            animationOption = this._createAnimationOption(this._cssPosProp, position + "px");
            this._$toggleButton.animate(animationOption, this._options.animationSpeed || Splitter.DEFAULT_ANIMATION_SPEED);
        }
        else {
            this._$toggleButton.css(this._cssPosProp, position);
        }
    }

    /**
     * Set toggle button icon class for rendering
     * 
     * @param isExpanded true if to show expanded icon; false, otherwise.
     */
    private _setToggleButtonIconClass(isExpanded: boolean) {
        Diag.Debug.assertParamIsBool(isExpanded, "isExpanded");
        let fixedSideLeft = this._options.fixedSide === "left";
        let classToAdd = "bowtie-icon ";
        if (this._options.vertical) {
            if (isExpanded) {
                classToAdd += (fixedSideLeft ? "bowtie-chevron-up" : "bowtie-chevron-down");
            } else {
                classToAdd += (fixedSideLeft ? "bowtie-chevron-down" : "bowtie-chevron-up");
            }
        } else {
            if (isExpanded) {
                classToAdd += (fixedSideLeft ? "bowtie-chevron-left" : "bowtie-chevron-right");
            } else {
                classToAdd += (fixedSideLeft ? "bowtie-chevron-right" : "bowtie-chevron-left");
            }
        }

        // Remove all class and add the class we need 
        this._$toggleButtonIcon.removeClass().addClass(classToAdd);
    }

    /**
     * Sets the tooltip for the toggle button.
     */
    private _setToggleButtonTooltip() {
        let options = this._options;
        let $toggleButton = this._$toggleButton;
        if ($toggleButton) {
            if (this._isCollapsed()) {
                $toggleButton.attr({
                    "title": options.toggleButtonCollapsedTooltip ? options.toggleButtonCollapsedTooltip : Resources_Platform.ExpandSplitterTooltip,
                    "aria-expanded": "false"
                });
            }
            else {
                $toggleButton.attr({
                    "title": options.toggleButtonExpandedTooltip ? options.toggleButtonExpandedTooltip : Resources_Platform.CollapseSplitterTooltip,
                    "aria-expanded": "true"
                });
            }
        }
    }

    /**
     * set the handler on toggle - this should only be used when Splitter control was automatically enhanced, otherwise specify in options
     */
    public setOnToggle(handler: (isExpanded: boolean) => void) {
        this._options.onToggle = handler;
    }

    /**
     * Measures the full size of the fixed side pane.
     */
    private _measureFixedSide() {

        // Note: Sometimes, jquery.width() returns the content width (same applies to height), but sets
        //       the element outer size. This is actually dependent on the value of the box-sizing css property. 
        //       If it's 'border-box' (as it is in our case) then this holds true. 
        //       Here, we "cache"/measure the outer width of the panel, which counts in border, margin, padding, etc.
        this._fixedSidePixels = this._cssSizeProp === "width" ? this._fixedSide.outerWidth() : this._fixedSide.outerHeight();
    }

    private _handleBarMouseDown(e?) {
        // In Chrome we need to prevent the default event handling to avoid selecting text
        e.preventDefault();

        this._dragStart = {
            pointer: e[this._screenXY],
            originalSize: this._isCollapsed() ? e[this._screenXY] : (<any>this._fixedSide)[this._cssSizeProp]()
        };

        this.getElement().addClass("dragging");
        this._ensureHandleBarClone();
        this._setupDragEvents();

        this._ensureOverlay();
    }

    private _handleBarKeydown(e: JQueryEventObject): any {
        let vertical = this._options.vertical !== false;
        let expanded = !this._isCollapsed();

        switch (e.keyCode) {
            case Utils_UI.KeyCode.LEFT:
                // If collapsed, no-op
                if (expanded && !vertical) {
                    this._moveSeparator("left");
                }
                break;

            case Utils_UI.KeyCode.RIGHT:
                // If collapsed, no-op
                if (expanded && !vertical) {
                    this._moveSeparator("right");
                }
                break;

            case Utils_UI.KeyCode.UP:
                // If collapsed, no-op
                if (expanded && vertical) {
                    this._moveSeparator("left");
                }
                break;

            case Utils_UI.KeyCode.DOWN:
                // If collapsed, no-op
                if (expanded && vertical) {
                    this._moveSeparator("right");
                }
                break;
        }
    }

    /**
     * Moves the separator either left or right.
     */
    private _moveSeparator(direction: string): void {
        let amountToMove = 25 * (this._options.fixedSide === direction ? -1 : 1);

        // Make sure we know the size of the fixed side
        if (typeof this._fixedSidePixels !== "number") {
            this._measureFixedSide();
        }

        this.resize(this._getAdjustedSize(this._fixedSidePixels + amountToMove));
    }

    /**
     * Checks if the toggle button is enabled.
     */
    private _isToggleButtonEnabled() {
        return this.getElement().hasClass(Splitter.TOGGLE_BUTTON_ENABLED_CLASS_NAME);
    }

    /**
     * Checks if the toggle button hotkey is enabled.
     */
    private _isToggleButtonHotkeyEnabled() {
        return this.getElement().hasClass(Splitter.TOGGLE_BUTTON_HOTKEY_ENABLED_CLASS_NAME);
    }

    /**
     * Checks if the splitter is marked as collapsed.
     */
    private _isCollapsed() {
        return this.getElement().hasClass(Splitter.COLLAPSED_CLASS_NAME);
    }

    /**
     * Handles the keyup event for the document.
     * 
     * @param e 
     * @return 
     */
    private _onDocumentKeyup(e?: JQueryEventObject): any {

        Diag.Debug.assertParamIsObject(e, "e");

        if (e.ctrlKey && e.altKey && (e.keyCode === Utils_UI.KeyCode.SPACE)) {
            if (this._isToggleButtonHotkeyEnabled()) {
                this.toggleExpanded();
                return false;
            }
        }
    }

    /**
     * Handles the click event for the toggle button.
     * 
     * @param e 
     * @return 
     */
    private _onToggleButtonClick(e?: JQueryEventObject): any {

        Diag.Debug.assertParamIsObject(e, "e");
        this.toggleExpanded();
        return false;
    }

    /**
     * Ensures that a clone of the handlebar is available.
     */
    private _ensureHandleBarClone() {
        if (!this._$handleBarClone) {
            Diag.Debug.assertIsObject(this._dragStart, "_dragStart");

            // Note: We do not $.clone() the handleBar element here because
            //   some of the computed styles override the inline style, i.e. being defined with !important.
            this._$handleBarClone = $("<div>").addClass("handleBar-clone")
                .css(this._cssPosProp, this._dragStart.originalSize + "px")
                .css(this._cssSizeProp, Splitter.HANDLE_BAR_CLONE_SIZE)
                .appendTo(this.getElement());
        }
    }

    /**
     * Removes the handlebar clone.
     */
    private _removeHandleBarClone() {
        if (this._$handleBarClone) {
            this._$handleBarClone.remove();
            this._$handleBarClone = null;
        }
    }

    private _setupDragEvents() {
        this._bind(window.document, "mousemove", delegate(this, this._documentMouseMove), true);
        this._bind(window.document, "mouseup", delegate(this, this._documentMouseUp), true);
    }

    private _ensureOverlay() {
        if (!this._splitterOverlay) {
            this._splitterOverlay = $(domElem("div", "overlay"));
            this.getElement().append(this._splitterOverlay);

            this._bind(this._splitterOverlay, "mousemove", delegate(this, this._documentMouseMove));
            this._bind(this._splitterOverlay, "mouseup", delegate(this, this._documentMouseUp));
            this._bind(this._splitterOverlay, "selectstart", function () { return false; });
        }
    }

    private _removeOverlay() {
        if (this._splitterOverlay) {
            this._splitterOverlay.remove();
            this._splitterOverlay = null;
        }
    }

    private _clearDragEvents() {
        this._removeOverlay();

        this._unbind(window.document, "mousemove");
        this._unbind(window.document, "mouseup");
    }

    /**
     * @param e 
     * @return 
     */
    private _documentMouseMove(e?: JQueryEventObject): any {

        var delta;

        if (this._dragStart) {
            delta = e[this._screenXY] - this._dragStart.pointer;

            if (delta) {
                this._ensureOverlay();
            }

            this._ensureHandleBarClone();
            this._$handleBarClone.css(this._cssPosProp, +(this._dragStart.originalSize + this._deltaMultiplier * delta) + "px");

            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _documentMouseUp(e?: JQueryEventObject): any {
        if (this._dragStart) {
            let delta = e[this._screenXY] - this._dragStart.pointer;
            let changed = false;
            if (Math.abs(delta) > 1) {
                changed = true;

                let newSize = this._dragStart.originalSize + this._deltaMultiplier * delta;

                // Adjust size according to max and min width
                newSize = this._getAdjustedSize(newSize);

                if (this._isToggleButtonEnabled() && newSize <= Splitter.AUTO_COLLAPSE_THRESHOLD) {
                    this.toggleExpanded(false);
                }
                else {
                    if (this.expandState) {
                        this.removeExpand(true);
                    }

                    this.resize(newSize);
                }
            }

            this._dragStart = null;
            this.getElement().removeClass("dragging");
            this._removeHandleBarClone();
            this._clearDragEvents();

            if (changed) {
                this._fire("changed", this);
            }

            return false;
        }
    }

    private _onWindowResize() {
        if (!this._ignoreWindowResize) {
            if (!this.expandState) {
                this.resize(this._fixedSidePixels, true);
            }
        }
    }

    private _fireWindowResize() {
        try {
            this._ignoreWindowResize = true;
            const event = document.createEvent("Event");
            event.initEvent("resize", false, true);
            window.dispatchEvent(event);
        } finally {
            this._ignoreWindowResize = false;
        }

    }

    /**
     * Attaches the splitter to the window resize event, performing a resize immediately if specified
     * by the input parameter. This is primarily useful for attaching to the resize event after the
     * splitter has just been re-attached to the DOM and needs to see if the viewwport size has changed.
     * 
     * @param resizeNow Whether or not the splitter should perform resize now.
     */
    public attachResize(resizeNow?: boolean) {
        this._ignoreWindowResize = false;
        if (resizeNow) {
            this._onWindowResize();
        }
    }

    /**
     * Detaches the splitter from the window resize event (tells it to ignore the event).
     */
    public detachResize() {
        this._ignoreWindowResize = true;
    }

    /**
     * Creates an option object to be used with $.animate().
     * 
     * @param cssPropertyName The CSS property for the animation.
     * @param cssPropertyValue The target CSS property value for the animation.
     */
    private _createAnimationOption(cssPropertyName: string, cssPropertyValue: string) {
        Diag.Debug.assertParamIsString(cssPropertyName, "cssPropertyName");
        Diag.Debug.assertParamIsString(cssPropertyValue, "cssPropertyValue");
        var animationOption = {};
        animationOption[cssPropertyName] = cssPropertyValue;
        return animationOption;
    }

    /**
     * @param e 
     * @return 
     */
    private _handleBarDoubleClick(e?: JQueryEventObject): any {

        this.toggleExpanded();
    }

    public _dispose() {
        super._dispose();
        this.unregisterEvents();
    }

    public unregisterEvents() {
        Utils_UI.detachResize(this.getElement());
    }
}

export class Splitter extends SplitterO<ISplitterOptions> { }

Controls.Enhancement.registerJQueryWidget(Splitter, Splitter.CORE_CSS_CLASS);
Controls.Enhancement.registerEnhancement(Splitter, "." + Splitter.CORE_CSS_CLASS);
