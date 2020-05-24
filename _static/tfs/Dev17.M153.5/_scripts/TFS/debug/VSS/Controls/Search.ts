/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Diag = require("VSS/Diag");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Search = require("VSS/Search");
import Telemetry_Services = require("VSS/Telemetry/Services");
import TreeView = require("VSS/Controls/TreeView");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import { RichContentTooltip } from "VSS/Controls/PopupContent";

var delegate = Utils_Core.delegate;
var keyCode = Utils_UI.KeyCode;

/**
 * @interface 
 * An interface for SearchBoxControl options
 */
export interface ISearchBoxControlOptions {
    /**
    * filterTitle: Optional: Aria-label for the control input. 
    */
    filterTitle?: string;

    /**
     * activateSearchHandler: Optional: Callback when the control is activated. 
     */
    activateSearchHandler?: Function;

    /**
     * deactivateSearchHandler: Optional: Callback when the control is deactivated. 
     */
    deactivateSearchHandler?: Function;

    /**
     * inputChangedEventHandler: Optional: When the control input changed.
     */
    inputChangedEventHandler?: Function;

    /**
     * hideWatermark: Optional: Set to true to hide watermark for the control.
     */
    hideWatermark?: boolean;

    /**
     * searchIconTooltip: Optional: Tooltip for the search icon of ToggleSearchBoxControl.
     */
    searchIconTooltip?: string;

    /**
     * Optional: Search icon, defaults to bowtie-search icon.
     */
    searchBoxIcon?: string;

    /**
     * Optional: Search box icon when it's active, default behaviour is icon unchanged.
     */
    searchBoxActiveIcon?: string;

    /**
     * Optional: Place holder/water mark text for search box.
     */
    placeholderText?: string;

    /**
     * Optional: Tab index for search box.
     */
    tabIndex?: number;
}

/**
 * A input box control for search or filter.
 */
export class SearchBoxControl extends Controls.Control<ISearchBoxControlOptions> {
    private static inputChangedEventThrottlingInterval = 300;
    private _$searchInputTextbox: JQuery;
    private _$searchIcon: JQuery;
    private _active: boolean;
    private _suppressBlur: boolean;
    private _activateSearchHandler: Function;
    private _deactivateSearchHandler: Function;
    private _inputChangedEventHandler: Function;
    private _value: string;
    private _inputChangedEventHandlerReset: Function;
    private _tabIndex: number;

    // true if input change happened whithin inputChangedEventThrottlingInterval (threshhold used in keyup event handler)
    private _subsequentInputChange: boolean;

    private _bowtieSearchIcon: string = "bowtie-icon bowtie-search";

    constructor(options?: ISearchBoxControlOptions) {
        super(options);

        this._active = false;
        this._suppressBlur = false;

        this._activateSearchHandler = options.activateSearchHandler;
        this._deactivateSearchHandler = options.deactivateSearchHandler;
        this._inputChangedEventHandler = options.inputChangedEventHandler;

        this._tabIndex = options.tabIndex || 0;
    }

    public initialize() {
        this._createSearchInput();
    }

    /**
     * Return the triming value of the input box.
     */
    public getValue(): string {
        return this._getValue().trim();
    }

    /**
     * Return the value of the input box.
     */
    private _getValue(): string {
        return this._$searchInputTextbox.val();
    }

    /**
     * Displays the search box and hides the search button.
     */
    public activateSearch() {
        this._active = true;
        this.getElement().addClass("active");

        this._$searchInputTextbox.focus();

        if ($.isFunction(this._activateSearchHandler)) {
            this._activateSearchHandler();
        }
    }

    /**
     * Removes the search box and shows the search button instead.
     */
    public deactivateSearch(deactivateSearchHandler: boolean = true) {
        this._clearInput();
        this._active = false;
        this.getElement().removeClass("active");
        this._$searchInputTextbox.blur();

        if (deactivateSearchHandler && $.isFunction(this._deactivateSearchHandler)) {
            this._deactivateSearchHandler();
        }
    }

    protected _displaySearchInputBox(isVisible: boolean) {
        if (isVisible) {
            this._$searchInputTextbox.show();
            this._$searchIcon.show();
        }
        else {
            this._$searchInputTextbox.hide();
            this._$searchIcon.hide();
        }
    }

    private _clearInput() {
        this._$searchInputTextbox.val("");
        this._value = this.getValue();
    }

    private _createSearchInput() {
        var $element = this.getElement();
        $element.addClass("base-filter-box");

        // Add search input
        this._$searchInputTextbox = $("<input>").attr("type", "text")
            .addClass("text-filter-input")
            .attr("aria-label", this._options.filterTitle ? this._options.filterTitle : Resources_Platform.TextFilterInputBoxWaterMark)
            .attr("tabindex", this._tabIndex)
            .focus(delegate(this, this._handleFocus))
            .blur(delegate(this, this._handleBlur));

        if (!this._options.hideWatermark) {
            Utils_UI.Watermark(this._$searchInputTextbox, { watermarkText: this._options.placeholderText ? this._options.placeholderText : Resources_Platform.TextFilterInputBoxWaterMark });
        }

        this._value = this.getValue();

        $element.append(this._$searchInputTextbox)
            .bind("mousedown", delegate(this, this._mouseDown))
            .bind("mouseup", delegate(this, this._mouseUp))
            .bind("mouseout", delegate(this, this._mouseOut));

        this._$searchIcon = $("<span>").addClass("text-filter-image " + this._getSearchIconClass())
            .mousedown(delegate(this, this._searchIconClickHandler))
            .attr("role", "button");

        $element.append(this._$searchIcon);
        this._bindInputChangedEventHandler();
    }

    private _getSearchIconClass() {
        return this._options.searchBoxIcon ? this._options.searchBoxIcon : this._bowtieSearchIcon;
    }

    private _searchIconClickHandler(e?: JQueryEventObject) {
        if (this._active && this.getValue() !== "") {
            this._clearInput();
            this._$searchInputTextbox.focus();
            this._suppressBlur = true;
            if ($.isFunction(this._inputChangedEventHandler)) {
                this._inputChangedEventHandler(this._value);
            }
        } else if (this._active && this.getValue() === "") {
            this.deactivateSearch();
            // Stop mousedown blurHandler event propagation
            e.stopPropagation();
        } else {
            this.activateSearch();
        }
    }

    private _bindInputChangedEventHandler() {
        this._$searchInputTextbox.bind("keydown", delegate(this, this._keyDown))
            .bind("keyup", delegate(this, this._keyUp));
    }

    private _keyDown(e?: JQueryEventObject) {
        // Stop propagating L/R arrows events
        // don't jump to other menu items if in menu
        if(e.keyCode === Utils_UI.KeyCode.UP ||
            e.keyCode === Utils_UI.KeyCode.DOWN ||
            e.keyCode === Utils_UI.KeyCode.LEFT ||
            e.keyCode === Utils_UI.KeyCode.RIGHT ||
            e.keyCode === Utils_UI.KeyCode.END ||
            e.keyCode === Utils_UI.KeyCode.HOME ||
            e.keyCode === Utils_UI.KeyCode.SPACE) {

            e.stopPropagation();
        }
        // Deactivate search if user presses Esc
        if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
            this.deactivateSearch();
            e.preventDefault();
            return false;
        }
    }

    private _keyUp(e?: JQueryEventObject) {
        var currentValue = this.getValue();
        if (this._value === currentValue) {
            return;
        }

        this._value = currentValue;
        if ($.isFunction(this._inputChangedEventHandler)) {
            if (!this._inputChangedEventHandlerReset) {
                // If there is no handler then fire this immediately so there is no delay for the first key up
                this._inputChangedEventHandler(this._value);
                this._subsequentInputChange = false;
                this._inputChangedEventHandlerReset = Utils_Core.throttledDelegate(this, SearchBoxControl.inputChangedEventThrottlingInterval, () => {
                    if (this._subsequentInputChange) {
                        this._inputChangedEventHandler(this._value);
                    }
                    this._inputChangedEventHandlerReset = null;
                });
            }
            else {
                this._subsequentInputChange = true;
            }
            this._inputChangedEventHandlerReset();
        }
    }

    private _mouseDown(e?: JQueryEventObject) {
        this._suppressBlur = true;
        if (!this._active && this._$searchInputTextbox.css("display") !== "none") {
            // only activate search when the input has not been activate.
            this.activateSearch();
        }
    }

    private _mouseUp() {
        // The mousedown() causes a blur in Chrome, so we need to
        // refocus the text input on mouseup.
        if (this._active) {
            this._$searchInputTextbox.focus();
        }
        this._suppressBlur = false;
    }

    private _mouseOut() {
        this._suppressBlur = false;
    }

    /**
     * Handle the blur which deactivates search
     */
    private _handleBlur() {
        // The Blur will be called when activating via mousedown, so we suppress
        // the blur event until the mouse is released to prevent this from happening.
        // We then Utils_Core.delay to make sure it's being run after the mouse events.
        if (this.getValue() === "" && !this._suppressBlur) {
            if (this._active) {    
                this.deactivateSearch();
            }

            if (this._options.searchBoxActiveIcon) {
                this._$searchIcon.removeClass(this._options.searchBoxActiveIcon);
                this._$searchIcon.addClass(this._getSearchIconClass());
            }
        }
    }

    /**
     * Handle the focus which activates search
     */
    private _handleFocus(e?: JQueryEventObject) {
        if (!this._active) {
            this.activateSearch();
        }
        else if (this._options.searchBoxActiveIcon) {
            this._$searchIcon.removeClass(this._getSearchIconClass());
            this._$searchIcon.addClass(this._options.searchBoxActiveIcon);
        }

        e.stopPropagation();
    }
}

export interface IToggleSearchBoxControlOptions extends ISearchBoxControlOptions {
    isDataSetComplete?: Function;
}

/**
 * A search icon control. When click, it expands to input box control for search or filter.
 */
export class ToggleSearchBoxControl extends SearchBoxControl {
    private _$searchIconContainer: JQuery;
    private _isDataSetComplete: Function;

    constructor(options?: IToggleSearchBoxControlOptions) {
        super(options);
        this._isDataSetComplete = options.isDataSetComplete;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            hideWatermark: true,
            searchBoxIcon: "bowtie-icon bowtie-math-multiply-light"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._addSearchToggleIcon();
    }

    /**
     * Show the inputbox and hide the search icon.
     */
    public activateSearch() {
        if ($.isFunction(this._isDataSetComplete) && !this._isDataSetComplete()) {
            // do not start search if data set has not completely loaded.
            return;
        }

        this._toggleSearchIcon(false);
        super.activateSearch();
    }

    /**
     * Hide the inputbox and shows the search icon.
     */
    public deactivateSearch() {
        this._toggleSearchIcon(true);
        super.deactivateSearch();
    }

    private _addSearchToggleIcon() {
        var $element = this.getElement();
        $element.addClass("search-input-control-container");

        this._$searchIconContainer = $("<div>").addClass("search-icon-container")
            .attr("tabindex", 0)
            .attr("aria-label", this._options.searchIconTooltip)
            .bind("keyup", delegate(this, this._searchIconkeyUpHandler))
            .bind("keydown", delegate(this, this._searchIconKeyDownHandler))
            .bind("blur", delegate(this, this._searchIconHoverOut))
            .attr("role", "button")
            .click(delegate(this, this.activateSearch))
            .hover(delegate(this, this._searchIconHoverIn), delegate(this, this._searchIconHoverOut));

        var $searchIcon = $("<div>").addClass("bowtie-icon bowtie-search");

        RichContentTooltip.add(this._options.searchIconTooltip, this._$searchIconContainer);

        this._$searchIconContainer.append($searchIcon);
        $element.append(this._$searchIconContainer);

        this._toggleSearchIcon(true);
    }

    private _searchIconHoverIn() {
        this._$searchIconContainer.addClass("hover");
    }

    private _searchIconHoverOut() {
        this._$searchIconContainer.removeClass("hover");
    }

    private _toggleSearchIcon(isVisible: boolean) {
        if (isVisible) {
            this._displaySearchInputBox(false);
            this._searchIconHoverOut();
            this._$searchIconContainer.show();
        }
        else {
            this._$searchIconContainer.hide();
            this._displaySearchInputBox(true);
        }
    }

    private _searchIconKeyDownHandler(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.TAB || e.keyCode === Utils_UI.KeyCode.ESCAPE) {
            this._searchIconHoverOut();
        }
        else if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this.activateSearch();
        }
    }

    private _searchIconkeyUpHandler(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.TAB) {
            this._searchIconHoverIn();
        }
    }
}

export interface ITextFilterControlOptions extends ISearchBoxControlOptions {
    adapter?: Search.SearchAdapter<any>;
    comparer?: IComparer<any>;
    delimiter?: string | RegExp
}

export class TextFilterControl extends Controls.Control<ITextFilterControlOptions> {
    public static tagName: string = "li";
    public static coreCssClass: string = "text-filter-box";

    public _textFilterInput: SearchBoxControl;
    public _searchCore: Search.SearchCore<any>;
    private _active: boolean;
    private _suppressBlur: boolean;
    private _tabIndex: number;

    public _searchAdapter: Search.SearchAdapter<any>;

    /**
     * Control for backlog search.
     * 
     * @param options Options for the control
     */
    constructor(options?: ITextFilterControlOptions) {

        super(options);

        Diag.Debug.assertParamIsObject(options.adapter, "options.adapter");

        this._searchAdapter = options.adapter;
        this._tabIndex = options.tabIndex;

        this._active = false;
        this._suppressBlur = false;
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            coreCssClass: TextFilterControl.coreCssClass,
            tagName: TextFilterControl.tagName
        }, options));
    }

    public isActive(): boolean {
        return this._active;
    }

    /**
     * Initializes the control. Creates the search box and initializes events.
     */
    public initialize() {
        this._createSearchInputBox();

        if (!this._searchCore) {
            this._searchCore = new Search.SearchCore(this._createSearchStrategy(), this._searchAdapter);
        }
    }

    protected _createSearchStrategy(): Search.SearchStrategy<any> {
        var options: Search.ISearchStrategyOptions<any> = {
            delimiter: this._options.delimiter,
            comparer: this._options.comparer
        };
        return new Search.IndexedSearchStrategy<any>(undefined, options);
    }

    private _createSearchInputBox() {
        var $element = this.getElement();
        $element.addClass("menu-item");

        var activateSearchHandler = delegate(this, this.activateSearch);
        var deactivateSearchHandler = delegate(this, this.deactivateSearch);
        var inputChangedEventHandler = delegate(this, this.attachEventOnKeyUp);

        this._textFilterInput = <SearchBoxControl>Controls.BaseControl.createIn(SearchBoxControl, $element, {
            coreCssClass: TextFilterControl.coreCssClass,
            activateSearchHandler: activateSearchHandler,
            deactivateSearchHandler: deactivateSearchHandler,
            inputChangedEventHandler: inputChangedEventHandler,
            searchBoxActiveIcon: this._options.searchBoxActiveIcon,
            tabIndex: this._tabIndex
        });
    }

    /**
     * Displays the search box and hides the search button
     */
    public activateSearch() {
        Diag.logTracePoint("TextFilter.activateFilter");
        this._active = true;

        // Add items to the search core if it doesn't already have data
        // The input is disabled while we wait for the initial index to build
        if (!this._searchCore.getStrategy().dataExists()) {
            this.createIndex();
        }
    }

    /**
     * Removes the search bar and shows the search button instead
     * 
     * @param suppressClear Suppress the clearing event
     */
    public deactivateSearch(suppressClear: boolean = false) {
        this._active = false;

        // Because we switch providers while switching queries, clearing
        // the filter will cause a flicker while we restore the original
        // state, and then switch the providers.
        if (!suppressClear) {
            this._searchAdapter.handleClear();
        }
        this._textFilterInput.deactivateSearch(false);
    }

    /**
     * Creates the index in the searchCore
     */
    public createIndex() {
        this._searchCore.addItems(this._searchAdapter.createSearchableObjects());
    }

    /**
     * Clears the index in the Search Core
     */
    public clearIndex() {
        this._searchCore.clearStrategyStore();
    }

    /**
     * Clears the store and performs the search if search is active.
     */
    public refreshResults() {

        // Clear the store and index the new data.
        this.clearIndex();

        // If search is active, perform the search on the new data set.
        if (this._active) {
            this._performSearch();
        }
    }

    /**
     * Handle input changed event.
     */
    public attachEventOnKeyUp(e?: JQueryEventObject) {
        Diag.logTracePoint("TextFilter.keyUp");

        // Re-index if needed.
        if (!this._searchCore.getStrategy().dataExists()) {
            this._searchCore.addItems(this._searchAdapter.createSearchableObjects());
        }

        this._performSearch();
    }

    /**
     * Perform the search.
     */
    public _performSearch() {
        var filterString = this._textFilterInput.getValue();
        if (filterString !== "") {
            this._searchCore.beginSearch(filterString);
        } else {
            this._searchAdapter.handleClear();
        }
    }
}
