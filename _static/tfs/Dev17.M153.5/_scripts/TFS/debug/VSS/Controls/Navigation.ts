/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!PivotView' />

import Constants_Platform = require("VSS/Common/Constants/Platform");
import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Contributions_Services = require("VSS/Contributions/Services");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Events_Handlers = require("VSS/Events/Handlers");
import Menus = require("VSS/Controls/Menus");
import Navigation_Services = require("VSS/Navigation/Services");
import Notifications = require("VSS/Controls/Notifications");
import Q = require("q");
import { RichContentTooltip, IRichContentTooltipOptions } from "VSS/Controls/PopupContent";
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import SdkHost = require("VSS/SDK/Host");
import Service = require("VSS/Service");
import Splitter = require("VSS/Controls/Splitter");
import Telemetry_Services = require("VSS/Telemetry/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

/**
 * Creates a high-level view object for a given page which captures page/hash navigations,
 * handles setting page title, etc.
 */
export class NavigationView extends Controls.BaseControl {

    public static ACTION_CONTRIBUTION: string = "contribution";

    private _chromelessMode: boolean;
    private _leftPaneVisible: boolean;
    private _historyNavigated: boolean;

    /**
     * Creates an instance of the object for the given page
     * 
     * @param options 
     *     attachNavigate: If true, listen for page/hash navigations
     * 
     */
    constructor(options?: any) {
        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            attachNavigate: false,
            titleElementSelector: ".hub-title",
            hubSplitterSelector: ".hub-content > .splitter"
        }, options));
    }

    public initialize() {
        super.initialize();

        if (this._options.attachNavigate === true) {
            // Attach to the navigate event
            this._attachNavigate();
        }
    }

    /**
     * Function invoked when a page/hash navigation has occurred
     * 
     * @param state Hash object containing the hash-url parameters
     */
    public onNavigate(state: any) {
    }

    /**
     * Get the element that holds the title
     */
    public _getViewTitle() {
        return this._element.find(".hub-title").eq(0);
    }

    /**
     *     Sets the (text) title of the page
     * 
     * @param title 
     *     Title of the page
     * 
     * @param tooltip 
     *     Optional tooltip for the page's title element
     * 
     */
    public setViewTitle(title?: string, tooltip?: string) {

        this._element.find(this._options.titleElementSelector).text(title || "").attr("title", tooltip || title || "");
        this.setWindowTitle(title);
    }

    /**
     *     Sets the raw-html title element for the page
     * 
     * @param title 
     *     Text title of the page to be used as the document title
     * 
     * @param titleContent
     *     Raw HTML to inject into the title element (will not be escaped)
     *
     */
    public setViewTitleContent(title: string, titleContent: string) {

        this._element.find(this._options.titleElementSelector).html(titleContent || "").attr("title", title || "");
        this.setWindowTitle(title);
    }

    /**
     *     Sets the document's title
     *
     * @param title
     *     Title of the page (text)
     *
     */
    public setWindowTitle(title: string) {

        document.title = Utils_String.format(this._getPageTitleString(), title || "");
    }

    /**
     * Shows or hides the Left (tree) section of the explorer page
     *
     * @param visible If true, show the left side of the explorer page. False to hide it.
     */
    public setLeftHubPaneVisibility(visible: boolean) {

        var $splitter = this._element.find(this._options.hubSplitterSelector),
            splitter = <Splitter.Splitter>Controls.Enhancement.getInstance(Splitter.Splitter, $splitter);

        if (splitter && visible !== this._leftPaneVisible) {
            this._leftPaneVisible = visible;
            splitter.toggleSplit(visible);
        }
    }

    /**
     *     Set full-screen mode. If true, hide the chrome (hubs, etc.) around the main hub content, hide the splitter, etc.
     *
     * @param fullScreenMode True to enter full screen mode. False to exit full screen mode.
     */
    public setFullScreenMode(fullScreenMode: boolean, showLeftPaneInFullScreenMode: boolean = false) {
        var $body = $(document.body);
        var $notifications = $(".tfs-host-notifications");

        $body.toggleClass("no-chrome", fullScreenMode);
        $body.toggleClass("full-screen-mode", fullScreenMode);
        $notifications.toggleClass("visible", $notifications.css("display") != "none");
        this.setLeftHubPaneVisibility(!fullScreenMode || showLeftPaneInFullScreenMode);
    }

    /**
     * Obsolete. This no-ops.
     */
    public _setTitleMode(isHosted: boolean) {
    }

    /**
     * Protected API: returns the desired title format string for use by SetWindowTitle()
     */
    public _getPageTitleString(): string {

        return Navigation_Services.getDefaultPageTitleFormatString();
    }

    private _attachNavigate() {
        this._historyNavigated = false;

        var historySvc = Navigation_Services.getHistoryService();
        historySvc.attachNavigate(this._onHistoryNavigate);

        if (!this._historyNavigated) {
            this._onNavigate(historySvc.getCurrentState() || {});
        }

        this._historyNavigated = false;
    }

    public _onNavigate(state) {
        this._historyNavigated = true;
        this.onNavigate(state);
    }

    private _onHistoryNavigate = (sender, state): void => {
        this._onNavigate(state || {});
    }

    protected _dispose(): void {
        super._dispose();

        if (this._options.attachNavigate === true) {
            Navigation_Services.getHistoryService().detachNavigate(this._onHistoryNavigate);
        }
    }
}

/**
 * A high-level singleton wrapper class for a Tri-Split page, providing lightweight
 * functionality such as retrieving the left/right/center hub content, left/right
 * panes, setting the view title, etc.
 *
 * This class is designed to enhance the hub view of a Tri-Split page, and depends
 * on the structure defined in the HubPageExplorerTriSplitPivot.master page.
 */
export class TriSplitNavigationView extends NavigationView {

    private static _instance: TriSplitNavigationView;

    private _leftPane: JQuery;
    private _rightPane: JQuery;

    /**
     * @param options
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            leftPaneSelector: ".hub-content > .splitter > .leftPane",
            rightPaneSelector: ".hub-content > .splitter > .rightPane"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._leftPane = this.getElement().find(this._options.leftPaneSelector);
        this._rightPane = this.getElement().find(this._options.rightPaneSelector);
    }

    /**
     * Retrieve the singleton instance of the class for the current page.
     */
    public static getInstance(): TriSplitNavigationView {
        if (!TriSplitNavigationView._instance) {
            TriSplitNavigationView._instance = <TriSplitNavigationView>Controls.Enhancement.enhance(TriSplitNavigationView, ".hub-view", {});
        }
        return TriSplitNavigationView._instance;
    }

    /**
     * Retrieve the left pane element within the current backlog view
     */
    public getLeftPane(): JQuery {
        return this._leftPane;
    }

    /**
     * Retrieve the right pane element within the current backlog view.
     * NOTE: This retrieves the right pane of the left splitter, which has the center
     * hub content as well as the right hub content (e.g. the product backlog mapping pane).
     */
    public getRightPane(): JQuery {
        return this._rightPane;
    }
}

class DefaultFilterBehavior {

    public static toItem(element) {
        var result;
        if (element && element.length === 1) {
            result = element.data("item");

            if (!result) {
                result = {
                    text: element.find("span.anchor:first").text(),
                    title: element.data("title") || null,
                    value: element.data("value"),
                    selected: element.hasClass("selected"),
                    encoded: element.data("encoded") || false
                };

                element.data("item", result);
            }
        }

        return result;
    }

    /**
     * @param selector
     */
    public static domToItems(elements, selector) {

        var result = [];

        elements.children("li.pivot-filter-item" + (selector || "")).each(function () {
            result.push(DefaultFilterBehavior.toItem($(this)));
        });

        return result;
    }

    public static setElementContent(element, item) {
        const title = item.selectedTitle || item.title;
        const text = item.selectedText || item.text;
        const encoded = item.encoded;
        const icon = item.icon;

        // clearing the contents so that we don't append multiple elements
        element.empty();
        element.removeData("title");

        if (title) {
            let tooltipControl = element.data("tooltipControl");
            if (tooltipControl) {
                Diag.Debug.assert(tooltipControl instanceof RichContentTooltip, "Expect RichContentTooltip object");
                (tooltipControl as RichContentTooltip).setTextContent(title);
            }
            else {
                const tooltipOptions = <IRichContentTooltipOptions>{};
                if (title === text) {
                    tooltipOptions.onlyShowWhenOverflows = element;
                }
                else {
                    tooltipOptions.setAriaDescribedBy = true;
                }
                element.data("tooltipControl", RichContentTooltip.add(title, element, tooltipOptions));
            }
            element.data("title", title);
        }

        if (icon) {
            $("<span />")
                .addClass(icon)
                .addClass("selected-icon")
                .appendTo(element);
        }

        if (text) {
            const textSpan = $("<span />").attr("id", Controls.getHtmlId());
            if (encoded) {
                textSpan.html(text);
            }
            else {
                textSpan.text(text);
            }

            textSpan.appendTo(element);
        }
    }

    public _options: any;
    public _items: IPivotFilterItem[];
    public _element: JQuery;

    constructor(options?) {
        this._options = options || {};
        this._items = this._options.items || [];
    }

    public getTypeName() {
        var constructorFunc = this['constructor'];
        return (<any>constructorFunc).typeName || "select";
    }

    /**
     * @param selector
     * @return
     */
    public getItems(selector?): any[] {

        return DefaultFilterBehavior.domToItems(this._element, selector);
    }

    public _toItem(element) {
        return DefaultFilterBehavior.toItem(element);
    }

    /**
     * @param item
     */
    public _updateItem(li, item?: any) {

        item = item || this._toItem(li);
        if (item) {
            if (item.disabled) {
                li.attr("disabled", "disabled");
                li.addClass("disabled");
                li.removeClass("selected");
            }
            else {
                li.removeAttr("disabled");
                li.removeClass("disabled");
                li.toggleClass("selected", item.selected);
            }
        }
    }

    public _toggleItem(li, value) {
        var item = this._toItem(li);

        if (item) {
            if (typeof value === "undefined") {
                value = !item.selected;
            }

            item.selected = value;
            this._updateItem(li, item);
        }

        return item;
    }

    public _selectFirstEnabledItem(items) {
        var firstEnabledItem, selectedItem;
        $.each(items, function () {
            if (!this.disabled) {

                if (!firstEnabledItem) {
                    firstEnabledItem = this;
                }

                if (this.selected) {
                    selectedItem = this;
                    return false;
                }
            }
        });

        if (!selectedItem && firstEnabledItem) {
            firstEnabledItem.selected = true;
            selectedItem = firstEnabledItem;
        }

        return selectedItem;
    }

    public _fireChange(element, item) {
        element.trigger("filter-changed", [item]);
    }

    public _selectItem(li: JQuery, focusItem?: boolean) {
        var selectedItem,
            next = li.next("li:not([disabled])");

        if (next.length === 0) {
            next = li.siblings("li:not([disabled])").first();
        }

        if (next.length > 0) {
            this._toggleItem(li, false);
            selectedItem = this._toggleItem(next, true);

            if (focusItem) {
                next.find("span.anchor").focus();
            }
        }

        return selectedItem;
    }

    public _onChange(e?) {
        var target = $(e.target),
            li,
            a,
            itemToFire;

        li = target.closest("li");
        a = target.closest("span.anchor");

        if (li.length > 0) {

            // Gets the item to fire
            itemToFire = this._selectItem(li, true);

            if (itemToFire) {
                this._fireChange(this._element, itemToFire);
            }
        }

        if (a.length > 0) {
            e.preventDefault();
        }
    }

    public enhance() {
        this._element = this._options.filterContainer.find("ul.pivot-filter-items");
        this._items = this.getItems();
        this._attachChange(this._element);
        this.addAccessibility();
    }

    public populate() {
        const items = this._items,
            element = this._ensureElement(),
            titleSpan = element.siblings("span.title");
        let titleSpanId = titleSpan.attr("id");

        if (!titleSpanId) {
            if (titleSpan) {
                titleSpanId = String(Controls.getHtmlId());
                titleSpan.attr("id", titleSpanId);
            }
            else {
                titleSpanId = "";
            }
        }

        element.children().remove();

        if (items && items.length > 0) {

            this._selectFirstEnabledItem(items);

            $.each(items, function () {
                var li = $(domElem("li", "pivot-filter-item")),
                    title,
                    span,
                    textParent;

                li.data("item", this);

                if (this.disabled) {
                    li.attr("disabled", "disabled");
                    li.addClass("disabled");
                }
                else {
                    if (this.selected) {
                        li.addClass("selected");
                    }
                }

                title = this.title;

                if (!title && !this.encoded) {
                    title = this.text;
                }

                if (title) {
                    RichContentTooltip.add(title, li, title === this.text ? { onlyShowWhenOverflows: li } : undefined);
                    li.data("title", title);
                }

                if (this.value) {
                    li.data("value", this.value);
                }

                const spanId = String(Controls.getHtmlId());
                span = $(domElem("span"))
                    .attr({
                        id: spanId,
                        role: "button",
                        "aria-labelledby": `${titleSpanId} ${spanId}`,
                        tabIndex: 0
                    })
                    .addClass("anchor");
                textParent = span;

                if (this.icon) {
                    $("<span />")
                        .addClass(this.icon)
                        .appendTo(span);

                    textParent = $("<span />").appendTo(span);
                }

                textParent.addClass("text");

                if (this.encoded) {
                    textParent.html(this.text);
                }
                else {
                    textParent.text(this.text);
                }

                li.append(span);
                element.append(li);
            });

            this._attachChange(element);
        }
    }

    public updateItems(items, options?: any) {
        this._items = items;
        this.populate();
    }

    public getItem(value) {
        var item, items = this._items;

        if (typeof value === "number") {
            item = items[value];
        }
        else {
            $.each(items, function () {
                //we need weak equality here since jQuery data function converts number strings to number values. i.e. 1 and "1" both becomes number
                /*jslint eqeqeq:false */
                if (this.value == value || this.text == value) {
                    item = this;
                    return false;
                }
                /*jslint eqeqeq:true */
            });
        }

        return item;
    }

    public getSelectedItems() {
        return this.getItems(".selected");
    }

    public getSelectedItem() {
        var selecteds = this.getItems(".selected");
        return selecteds && selecteds[0];
    }

    public setSelectedItem(item) {
        var that = this,
            items = this._items;

        if (typeof item !== "object") {
            item = this.getItem(item);
        }

        if (item) {

            $.each(items, function () {
                this.selected = false;
            });

            item.selected = true;

            this._element.children("li").each(function () {
                that._updateItem($(this));
            });
        }
    }

    protected addAccessibility(): void {
        const titleSpan = (<JQuery>this._options.filterContainer).children("span.title");
        if (titleSpan.length === 1) {
            let titleSpanId = titleSpan.attr("id");
            if (!titleSpanId) {
                titleSpanId = String(Controls.getHtmlId());
                titleSpan.attr("id", titleSpanId);
            }

            const anchorClass = "span.anchor";
            if (this._element.is(anchorClass)) {
                this._attachAriaLabels(this._element, titleSpanId);
            }

            this._element.find(anchorClass).each((i, e) => {
                this._attachAriaLabels($(e), titleSpanId);
            });

        }
    }

    private _attachAriaLabels(element: JQuery, titleSpanId: string) {
        const id = element.attr("id") || String(Controls.getHtmlId());
        element.attr({
            id: id,
            "aria-labelledby": `${titleSpanId} ${id}`,
        });
    }

    private _ensureElement() {
        if (!this._element) {
            this._element = $(domElem("ul", "pivot-filter-items"));
            this._element.appendTo(this._options.filterContainer);
        }

        return this._element;
    }

    private _attachChange(element: JQuery) {
        element.children().bind("click", delegate(this, this._onChange));
        element.children().bind("keydown", Utils_UI.buttonKeydownHandler);
    }
}

VSS.initClassPrototype(DefaultFilterBehavior, {
    _options: null,
    _items: null,
    _element: null
});

export interface IPivotFilterItem {
    id?: string;
    text?: string;
    title?: string;
    selected?: boolean;
    encoded?: boolean;
    value?: any;
}

export interface IPivotFilterOptions extends Controls.EnhancementOptions {
    name?: string;
    text?: string;
    encoded?: boolean;
    behavior?: string;
    items?: IPivotFilterItem[];
    align?: any;
    useBowtieStyle?: any;
}

export class PivotFilter extends Controls.Control<IPivotFilterOptions> {

    public static enhancementTypeName: string = "tfs.ui.pivotFilter";
    private static _behaviors: any = {};

    /**
     * Registers a filter behavior for the pivot filter
     *
     * @param behaviorType Type of the registered behavior
     */
    public static registerBehavior(behaviorType: any) {

        Diag.Debug.assertParamIsNotNull(behaviorType, "behaviorType");
        PivotFilter._behaviors[behaviorType.typeName] = behaviorType;
    }

    /**
     * Creates a behavior using the specified names. First found behavior is used
     *
     * @param names Names of the behaviors to probe
     * @param options Options of the behavior
     * @return
     */
    public static createBehavior(names: any[], options?: any): any {

        var behaviorType, result;

        // Probing specified names among registered behaviors
        $.each(names || [], function (i, name) {
            behaviorType = PivotFilter._behaviors[name];
            if (behaviorType) {
                // Stopping probing for the first found behavior
                return false;
            }
        });

        if (!behaviorType) {
            // If the specified behaior is not found, using the default behavior
            behaviorType = DefaultFilterBehavior;
        }

        // Creating an instance of the behavior and returning it
        /*jslint newcap: false */
        result = new behaviorType(options);
        /*jslint newcap: true */

        return result;
    }

    private _behavior: any;

    constructor(options?) {

        super(options);
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            coreCssClass: "pivot-filter",
            behavior: "select"
        }, options));
    }

    /**
     * @param element
     */
    public _enhance(element: JQuery) {

        var classNames, domElement;

        super._enhance(element);

        // When the control is enhanced, behavior name is sent in class name.
        // Thus, we are trying to create the behavior using the class names. If no
        // suitable behavior is found, falling back to DefaultBehavior
        domElement = element[0];
        classNames = (domElement && typeof domElement.className === "string") ? domElement.className.split(" ") : [];
        this._initBehavior(classNames);

        // After behavior is created, letting it enhance itself to get the filter items
        this._behavior.enhance();
    }

    public initialize() {
        super.initialize();
        this._attachEvents();
    }

    /**
     * Gets all selected items of the pivot filter
     *
     * @return items
     */
    public getSelectedItems(): IPivotFilterItem[] {
        return this._behavior.getSelectedItems();
    }

    /**
     * Gets the currently selected item
     *
     * @return item
     */
    public getSelectedItem(): IPivotFilterItem {
        return this._behavior.getSelectedItem();
    }

    /**
     * Gets the item of the specified value
     *
     * @param value Value of the item (String or Number)
     * @return item
     */
    public getItem(value: any): IPivotFilterItem {
        return this._behavior.getItem(value);
    }

    /**
     * Gets all of the items
     * @return the items
     */
    public getItems(): IPivotFilterItem[] {
        return this._behavior.getItems();
    }

    /**
     * Gets the specified item selected
     *
     * @param item Item to select
     * @param fireChange Determines whether the control shoudl fire the change event
     */
    public setSelectedItem(item: IPivotFilterItem, fireChange: boolean = true) {
        this._behavior.setSelectedItem(item, fireChange);
    }

    /**
     * Updates the pivot filter using the specified items
     *
     * @param items New set of items for the pivot filter
     */
    public updateItems(items: IPivotFilterItem[], options?: any) {
        this._behavior.updateItems(items, options);
    }

    /**
     * Initializes behavior of this pivot filter using specified behavior names
     */
    private _initBehavior(behaviorNames) {
        this._behavior = PivotFilter.createBehavior(behaviorNames, {
            align: this._options.align,
            items: this._options.items,
            filterContainer: this._element,
            useBowtieStyle: this._options.useBowtieStyle
        });
    }

    /**
     * This method is called when the control is created in the client using createIn.
     * DOM needs to be built by the control itself
     */
    public _createElement() {
        super._createElement();
        this._initBehavior([this._options.behavior]);
        this._buildDom();
    }

    private _buildDom() {
        var element = this._element,
            behavior = this._behavior,
            options = this._options,
            titleSpan,
            useBowtieStyle,
            text,
            encoded;

        element.addClass(behavior.getTypeName());

        titleSpan = $(domElem("span", "title"));
        text = options.text;
        useBowtieStyle = options.useBowtieStyle
        encoded = options.encoded;

        if (options.title) {
            RichContentTooltip.add(options.title, element, options.title === text ? { onlyShowWhenOverflows: element } : undefined);
            element.data("title", options.title);
        }

        if (text) {
            if (encoded) {
                titleSpan.html(text);
            }
            else {
                titleSpan.text(text);
            }
        }

        element.append(titleSpan);

        if (useBowtieStyle) {
            element.addClass('bowtie-pivot-filter');
            $(domElem("span", "drop-icon bowtie-icon bowtie-chevron-down")).appendTo(element);
        }

        this._behavior.populate();
    }

    private _attachEvents() {
        this._bind(this._element, "filter-changed", delegate(this, this._onFilterChanged));
    }

    private _onFilterChanged(e?, item?) {
        this._fire("changed", [item]);
        if ($.isFunction(this._options.change)) {
            return this._options.change.call(this, item);
        }
    }
}

VSS.initClassPrototype(PivotFilter, {
    _behavior: null
});

class RadioFilterBehavior extends DefaultFilterBehavior {

    public static typeName: string = "radio";

    constructor(options?) {
        super(options);
    }

    public _selectFirstEnabledItem() {
        // Radio doesn't need to select first item
    }

    public _selectItem(li: JQuery, focusItem?: boolean) {
        var that = this,
            selectedItem,
            item = this._toItem(li);

        if (!item.selected) {
            li.siblings("li").each(function () {
                that._toggleItem($(this), false);
            });

            selectedItem = this._toggleItem(li, true);
        }

        return selectedItem;
    }
}

PivotFilter.registerBehavior(RadioFilterBehavior);

class CheckboxFilterBehavior extends DefaultFilterBehavior {

    public static typeName: string = "checkbox";

    constructor(options?) {
        super(options);
    }

    public _selectFirstEnabledItem() {
        // Checkbox doesn't need to select first item
    }

    public _selectItem(li: JQuery, focusItem?: boolean) {
        return this._toggleItem(li, true);
    }
}

PivotFilter.registerBehavior(CheckboxFilterBehavior);

class DropdownFilterBehavior extends DefaultFilterBehavior {

    public static typeName: string = "dropdown";

    private _popupMenu: Menus.PopupMenu;
    private _showItemIcons: boolean = false;

    constructor(options?) {
        super(options);
    }

    /**
     * @param selector
     * @return the array of items
     */
    public getItems(selector?): any[] {

        return this._addCommandIdToItems(super.getItems(selector));
    }

    public populate() {
        var selectedItem = this._selectFirstEnabledItem(this._items);
        if (selectedItem) {

            if (this._element) {
                this._element.remove();
            }

            this._disposeExistingPopup();

            this._element = $("<span tabIndex='0' class='selected anchor' role='button' aria-expanded='false' />").appendTo(this._options.filterContainer);
            DefaultFilterBehavior.setElementContent(this._element, selectedItem);

            if (this._options.useBowtieStyle) {
                this._options.filterContainer.bind("click", delegate(this, this._onDrop));
                this._options.filterContainer.bind("keydown", Utils_UI.buttonKeydownHandler);
            }
            else {
                this._element.bind("click", delegate(this, this._onDrop));
                this._element.bind("keydown", Utils_UI.buttonKeydownHandler);
            }

            this.addAccessibility();
        }
    }

    public enhance() {
        this._element = this._options.filterContainer.find("ul.pivot-filter-items");
        this._items = this.getItems();
        this._element.remove();
        this.populate();
    }

    public updateItems(items, options?: any) {
        this._showItemIcons = options && options.showItemIcons;

        // We need to change the items by adding id to the item.
        // This is necessary for the menu item to be executed.
        super.updateItems(this._addCommandIdToItems(items));
    }

    public getSelectedItems() {
        return [this.getSelectedItem()];
    }

    public getSelectedItem() {

        var selectedItem;

        // Gets the first selected item
        $.each(this._items, function () {
            if (this.selected === true) {
                selectedItem = this;
                return false;
            }
        });

        return selectedItem;
    }

    public setSelectedItem(item: IPivotFilterItem, fireChange: boolean = true) {
        var items = this._items;

        if (item && item !== this.getSelectedItem()) {

            // Deselecting all items
            $.each(items, function () {
                this.selected = false;
            });

            // Setting the specified item selected
            item.selected = true;

            // Updating the visible part of the filter using the selected item
            DefaultFilterBehavior.setElementContent(this._element, item);

            if (fireChange) {
                // Firing change event to notify the subscribers about the filter change
                this._fireChange(this._element, item);
            }
        }
    }

    private _addCommandIdToItems(items) {
        return $.map(items, function (item) {
            if (!item.id) {
                item.id = item.text;
            }
            return item;
        });
    }

    /**
     * Gets executed whenever the visible part is clicked
     */
    private _onDrop(e?) {

        var element = $(e.target),
            filterContainer = this._options.filterContainer,
            items = this._items;

        this._disposeExistingPopup();

        // Creating the popup menu
        const popupMenu = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, filterContainer, {
            align: this._options.align || "left-bottom",
            showIcon: this._showItemIcons,
            items: [{ childItems: items }],
            useBowtieStyle: this._options.useBowtieStyle,
            onDeactivate: () => {

                // Deactivating the visible part (which removes the border around itself)
                filterContainer.removeClass("active");
                this._element.attr("aria-expanded", "false");

                // This ensures that the popup doesn't steal the focus
                filterContainer.children("ul.menu-popup").hide();
            },
            executeAction: delegate(this, this._onExecute)
        });

        Utils_Core.delay(this, 10, function () {
            filterContainer.addClass("active");
            this._element.attr("aria-expanded", "true");

            popupMenu.popup(element, filterContainer);

            const selectedItem = Utils_Array.first(items, i => i.selected);
            const actualMenu = popupMenu.getItems()[0].getSubMenu();
            if (selectedItem) {
                const menuItem = actualMenu.getItem(selectedItem.id);
                if (menuItem) {
                    menuItem.select();
                }
                else {
                    actualMenu.selectFirstItem();
                }
            }
            else {
                actualMenu.selectFirstItem();
            }
        });

        this._popupMenu = popupMenu;
        this._element.attr("aria-controls", popupMenu.getElement().attr('id'));

        return false;
    }

    /**
     * Gets fired whenever a popup menu item is clicked
     */
    private _onExecute(e?) {

        // Deactivating the visible part (which removes the border around itself)
        this._options.filterContainer.removeClass("active");

        // Gets the clicked item selected
        this.setSelectedItem(e.get_commandSource()._item);
    }

    /**
     * Removes the popup menu from the DOM
     */
    private _disposeExistingPopup() {
        if (this._popupMenu) {
            this._popupMenu.dispose();
            delete this._popupMenu;
        }
    }
}

PivotFilter.registerBehavior(DropdownFilterBehavior);

Controls.Enhancement.registerEnhancement(PivotFilter, ".pivot-filter.enhance")

function toItem(li: JQuery): IPivotViewItem {
    var result;
    if (li && li.length === 1) {
        result = li.data("item");

        if (!result) {
            result = {
                text: li.find("a:first").html(),
                title: li.data("title") || null,
                id: li.data("id"),
                link: li.find("a:first").attr("href"),
                selected: li.hasClass("selected"),
                encoded: li.data("encoded") || false,
                disabled: li.hasClass("disabled")
            };

            li.data("item", result);
        }
    }

    return result;
}
/**
 * @param li
 * @param item
 */
function updateItem(li: JQuery, item: IPivotViewItem) {

    item = item || toItem(li);
    if (item) {
        if (item.disabled) {
            li.attr("disabled", "disabled");
            li.addClass("disabled");
            li.removeClass("selected");
            li.attr("aria-disabled", "true");
        }
        else {
            li.removeAttr("disabled");
            li.removeClass("disabled");
            li.toggleClass("selected", item.selected);
            li.removeAttr("aria-disabled");
        }
        if (item.selected) {
            li.children("a").attr("aria-selected", "true");
        }
        else {
            li.children("a").attr("aria-selected", "false");
        }
    }
}

export interface IPivotViewItem extends IPivotFilterItem {
    link?: string;
    hidden?: boolean;
    disabled?: boolean;
    contributed?: boolean;
}

export interface IPivotViewOptions extends Controls.EnhancementOptions {
    items?: IPivotViewItem[];
    contributionId?: string;
    generateContributionLink?: (contributionId: string) => string;
    getEnabledState?: (contributionId: string) => boolean;
    getContributionContext?: () => any;
}

export class PivotView extends Controls.Control<IPivotViewOptions> {

    public static enhancementTypeName: string = "tfs.ui.pivotView";

    private _extensionContainer: JQuery;
    private _contributionContext: any;

    private _itemIdToSelect: number | string;

    private _contributionsInitialized: boolean = false;

    constructor(options?) {
        super(options);
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            coreCssClass: "pivot-view",
            tagName: "ul"
        }, options));
    }

    /**
     * @param element
     */
    public _enhance(element: JQuery) {

        super._enhance(element);

        this._options.items = this.getItems();

        let dataContributionId = this._element.data("contribution-id");
        if (dataContributionId) {
            this._options.contributionId = dataContributionId;
            if (this._options.getContributionContext && typeof this._options.getContributionContext === "function") {
                this._contributionContext = this._options.getContributionContext();
            }
            this.refreshContributedItems();
        }
    }

    /* protected */
    /**
     * @param selector
     * @return the array of items
     */
    public getItems(selector?): IPivotViewItem[] {

        var result = [];

        this._element.children("li" + (selector || "")).each(function () {
            result.push(toItem($(this)));
        });

        return result;
    }

    public initialize() {
        super.initialize();

        this.getElement().attr("role", "tablist");

        this._attachEvents();
    }

    /**
     * Sets the DOM (jQuery) container that tab extensions will be loaded in. Should probably be a div.
     * @param {JQuery} container
     */
    public setExtensionContainer(container: JQuery) {
        this._extensionContainer = container;
    }

    public showExtensionTab(contributionId: string, configuration?: any) {
        Contributions_Controls.createContributedControl(this._extensionContainer, contributionId, configuration);
    }

    public setContributionContext(context: any) {
        this._contributionContext = context;
    }

    private _getTabFromContribution(contribution: Contribution, instance?: IContributedTab) {
        let disabledPromise: IPromise<boolean>, invisiblePromise: IPromise<boolean>, namePromise: IPromise<string>, titlePromise: IPromise<string>;
        let context = this._contributionContext;
        if (instance && typeof instance.isDisabled === "function") {
            disabledPromise = <IPromise<boolean>>(instance.isDisabled(context));
        } else {
            disabledPromise = Q.resolve(false);
        }
        if (instance && typeof instance.isInvisible === "function") {
            invisiblePromise = <IPromise<boolean>>(instance.isInvisible(context));
        } else {
            invisiblePromise = Q.resolve(false);
        }
        if (instance && typeof instance.name === "function") {
            let nameMethod = <{ (context: any): string | IPromise<string> }>instance.name;
            namePromise = <IPromise<string>>(nameMethod(context));
        } else if (instance && typeof instance.name === "string") {
            namePromise = Q.resolve(instance.name);
        } else {
            namePromise = Q.resolve(contribution.properties["name"]);
        }
        if (instance && typeof instance.title === "function") {
            let titleMethod = <{ (context: any): string | IPromise<string> }>instance.title;
            titlePromise = <IPromise<string>>(titleMethod(context));
        } else if (instance && typeof instance.title === "string") {
            titlePromise = Q.resolve(instance.title);
        } else if (contribution.properties["title"]) {
            titlePromise = Q.resolve(contribution.properties["title"]);
        } else {
            titlePromise = Q.resolve(null); // we will fall back to text
        }
        return Q.all<boolean | string>([disabledPromise, invisiblePromise, namePromise, titlePromise]).then((results: [boolean, boolean, string, string]) => {
            let disabled = results[0];
            let invisible = results[1];
            let name = results[2];
            let title = results[3];

            if (invisible) {
                return null;
            }
            let action = contribution.properties["action"];

            let link: string = "";
            if (this._options.generateContributionLink && typeof this._options.generateContributionLink === "function") {
                link = this._options.generateContributionLink(contribution.id);
            }
            else {
                let nextState = Navigation_Services.getHistoryService().getCurrentState();
                nextState.contributionId = contribution.id;

                link = "#" + Navigation_Services.getHistoryService().getFragmentActionLink(action || NavigationView.ACTION_CONTRIBUTION, nextState);
            }

            let checkEnabled = false;
            if (this._options.getEnabledState && typeof this._options.getEnabledState === "function") {
                checkEnabled = true;
            }

            return {
                disabled: checkEnabled && !this._options.getEnabledState(contribution.id) ? true : disabled,
                encoded: false,
                id: contribution.id,
                link: link,
                text: name,
                title: title || name,
                contributed: true,
                action: action
            };
        });
    }

    /**
     * If there is a contribution ID associated with this PivotView, load all the contributed pivot items.
     * use forceRefresh for for refreshing contributions, by default this ensures we get contributions only once
     */
    public refreshContributedItems(forceRefresh: boolean = false): IPromise<void> {
        if ((!this._contributionsInitialized || forceRefresh) && typeof this._options.contributionId === "string") {
            return Service.getService(Contributions_Services.ExtensionService).getContributionsForTargets([this._options.contributionId]).then<void>((contributions) => {
                let allSources = <IPromise<any>[]>[];
                contributions.forEach((contribution) => {
                    let instancePromise: IPromise<IContributedTab> = Q.resolve<IContributedTab>(null);

                    let isDynamicTab = contribution.properties["dynamic"];
                    if (isDynamicTab !== true && isDynamicTab !== false) {
                        // If dynamic nature of tab is not specified, infer it based on the presence of a "name" property
                        isDynamicTab = typeof contribution.properties["name"] !== "string";
                    }

                    if (isDynamicTab) {
                        instancePromise = Contributions_Controls.getBackgroundInstance<IContributedTab>(
                            contribution,
                            contribution.properties["registeredObjectId"] || contribution.id
                        );
                    }
                    let source = instancePromise.then(instance => {
                        return this._getTabFromContribution(contribution, instance);
                    });
                    allSources.push(source);
                });
                return Q.allSettled(allSources).then((items) => {
                    if ($.isArray(this._options.items)) {
                        // Filter out contributed items before re-adding them.
                        this._options.items = this._options.items.filter(i => !i.contributed);
                        this._options.items = this._options.items.concat(items.filter(i => i && i.state === "fulfilled" && !!i.value).map(i => i.value)); // filter out nulls
                    } else {
                        this._options.items = items.filter(i => i.state === "fulfilled").map(i => i.value);
                    }
                }).then(() => {
                    this._contributionsInitialized = true;
                    this.updateItems();
                });
            });
        } else {
            this._contributionsInitialized = true;
            return Q.resolve<void>(null);
        }
    }

    /**
     * Sets the focus on the selected pivot.
     */
    public focusSelectedPivot() {
        this.getElement().find("li.selected a").focus();
    }

    /**
     * @param keepTabFocus: True to keep currently focused pivot view tab after update
     */
    public updateItems(keepTabFocus?: boolean) {
        const shouldRestoreFocus = keepTabFocus && $.contains(this.getElement()[0], document.activeElement);

        var ul = this._element;
        ul.empty();
        if (this._itemIdToSelect) {
            var filteredItem = Utils_Array.first(this._options.items, (item: any) => {
                return (item.action || item.id) == this._itemIdToSelect;
            });
            if (filteredItem) {
                this._itemIdToSelect = null;
                if (!filteredItem.disabled) {
                    this._options.items.forEach((item) => { item.selected = false; });
                    filteredItem.selected = true;
                }
            }
        }
        this._populateItems(ul);

        if (shouldRestoreFocus) {
            this.getElement().find("li.selected a").focus();
        }
    }

    /**
     * Set a particular view's link to a new link.
     *
     * @param id The view whose link needs an update.
     * @param link The new link for the specified view.
     */
    public setViewLink(id: string, link: string) {
        var view = this.getView(id);

        if (view) {
            view.link = link;

            // Refresh the link element to use the new link address
            this._element.find("li").each((i: number, element: Element) => {
                var $element = $(element);
                if ($element.data("id") === id) {
                    $element.find("a:first").attr("href", link);
                    return false;
                }
            });
        }
    }

    public getSelectedView(): IPivotViewItem {
        var selecteds = this.getItems(".selected");

        return selecteds && selecteds[0];
    }

    /**
     * Set a particular view to be enabled or disabled.
     *
     * @param id The view whose state needs an update.
     * @param isEnabled Weather to enable the view or not
     */
    public setViewEnabled(id, isEnabled) {
        Diag.Debug.assertParamIsBool(isEnabled, "isEnabled");
        var view = this.getView(id);

        if (view) {

            if (!view.contributed || !isEnabled) {
                view.disabled = !isEnabled;
                return;
            }

            //Before enabling a contributed tab, check with the contribution instance itself if it is ok enabling it.
            Service.getService(Contributions_Services.ExtensionService).getContribution(id).then<void>((contribution) => {
                let sourcePromise = Contributions_Controls.getBackgroundInstance<IContributedTab>(
                    contribution,
                    contribution.properties["registeredObjectId"] || contribution.id
                ).then((instance) => {
                    let context = this._contributionContext;
                    if (instance && typeof instance.isDisabled === "function") {
                        this._makeThennable<boolean>(instance.isDisabled(context)).then((disabled) => {
                            view.disabled = disabled;
                        });
                    } else {
                        view.disabled = false;
                    }
                });
            });
        }
    }

    private _makeThennable<T>(obj: T | IPromise<T>): IPromise<T> {
        if (obj && $.isFunction((<IPromise<T>>obj).then)) {
            return <IPromise<T>>obj;
        }
        else {
            return Q.resolve(obj);
        }
    }

    public getView(id, selectedTabId?): any {
        var item: IPivotViewItem;

        if (typeof id === "number") {
            item = this._options.items[id];
        }
        else {
            $.each(this._options.items, function () {
                //we need weak equality here since jQuery data function converts number strings to number values. i.e. 1 and "1" both becomes number
                /*jslint eqeqeq:false */
                if (this.id == id) {
                    item = this;
                    return false;
                }
                /*jslint eqeqeq:true */
            });
        }

        if (!item && selectedTabId) {
            // item is probably not available yet, this is the usual case for contributed items
            // selectedTabId is state's action
            this._itemIdToSelect = selectedTabId;
        }
        else {
            this._itemIdToSelect = null;
        }

        return item;
    }

    public setSelectedView(view) {
        var items = this._options.items;

        if (typeof (view) !== "object") {
            view = this.getView(view);
        }

        if (view) {
            // Unselecting all items first
            $.each(items, function () {
                this.selected = false;
            });

            // Selecting the current one
            view.selected = true;

            // Updating UI according to the new selections
            this._element.find("li").each(function () {
                updateItem($(this), null);
            });

            // Firing change event
            this.onChanged(view);

            if (view.contributed && view.id) {
                Contributions_Services.ExtensionHelper.publishTraceData(null, null, view.id);
            }
        }
    }

    public onChanged(view) {
        this._fire("changed", [view]);
    }

    public _createElement() {
        super._createElement();
        this._buildDom();
    }

    private _buildDom() {
        this._populateItems(this._element);
    }

    private _populateItems(ul: JQuery) {
        const items = this._options.items;

        if (items) {
            let firstNonDisabled: IPivotViewItem;
            let selectedItem: IPivotViewItem;

            $.each(items, function (this: IPivotViewItem) {
                if (!this.disabled) {
                    if (!firstNonDisabled) {
                        firstNonDisabled = this;
                    }

                    if (this.selected) {
                        selectedItem = this;
                        return false;
                    }
                }
            });

            if (!selectedItem && firstNonDisabled) {
                firstNonDisabled.selected = true;
            }

            let first = true;
            let positionInSet = 0;
            let setSize = 0;
            items.forEach((item) => {
                if (item && !item.disabled) {
                    setSize++;
                }
            });

            $.each(items, function (this: IPivotViewItem) {
                const li = $(domElem("li"));

                li.data("item", this);
                li.attr("role", "presentation");

                if (this.disabled) {
                    li.attr("disabled", "disabled");
                    li.addClass("disabled");
                }
                else {
                    if (this.selected) {
                        li.addClass("selected");
                    }
                }

                const title = this.title;

                if (this.id) {
                    li.data("id", this.id);
                    li.attr("data-id", this.id);
                }

                const a = $(domElem("a"));
                if (!this.disabled) {
                    a.attr("aria-posinset", ++positionInSet);
                    a.attr("aria-setsize", setSize);
                }

                a.bind("keydown", Utils_UI.buttonKeydownHandler);

                if (first && !this.disabled && !this.hidden) {
                    a.attr("tabindex", "0");
                    first = false;
                } else {
                    a.attr("tabindex", "-1");
                }

                a.attr("role", "tab");

                if (this.disabled) {
                    a.attr("aria-disabled", "true");
                    a.attr("aria-selected", "false");
                }
                else {
                    if (this.selected) {
                        a.attr("aria-selected", "true");
                    } else {
                        a.attr("aria-selected", "false");
                    }
                }

                if (this.link) {
                    a.attr("href", this.link);
                }
                else {
                    a.attr({
                        "href": "#"
                    });
                }

                if (this.encoded) {
                    a.html(this.text);
                }
                else {
                    a.text(this.text);
                }

                if (title) {
                    RichContentTooltip.add(title, a, title === this.text ? { onlyShowWhenOverflows: li } : undefined);
                    li.data("title", title);
                }

                li.append(a);
                ul.append(li);
            });
        }
    }

    private _attachEvents() {
        this._bind("click", delegate(this, this._onClick));
        this._bind("keydown", delegate(this, this._onKeydown));

        // bind to capture phase for maximum cross-browser compatibility (I'm looking at you this time, Firefox)
        this.getElement()[0].addEventListener("focus", this._onFocus.bind(this), true);
    }

    private _onClick(e?) {
        if (e && (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2)) {
            // Use default link navigation if this is a ctrl-click, command-click, shift-click, or middle-click event.
            return;
        }

        const target = $(e.target);

        const li = target.closest("li");
        const a = target.closest("a");
        let item: IPivotViewItem;

        if (li.length > 0) {
            item = toItem(li);
        }

        if (a.length > 0 && (Utils_String.caseInsensitiveContains(a.attr("href"), "#") || (item && item.disabled))) {
            if (item && !item.disabled) {
                this.setSelectedView(item);
            }
            e.preventDefault();
            if (a.attr("href") !== "#") {
                // if we do a .click() from _onKeydown, the link won't actually work, so manually set the location
                document.location.href = a.attr("href");
            }
        }
    }

    private _onFocus(e: FocusEvent) {
        const ul = this.getElement();
        const target = <HTMLElement>e.target;

        ul.find("a").attr("tabindex", "-1");
        target.setAttribute("tabindex", "0");
    }

    private _onKeydown(jqe: JQueryEventObject) {
        const e = jqe.originalEvent as KeyboardEvent;
        if (e.ctrlKey || e.altKey || e.metaKey) {
            return;
        }
        const target = $(e.target);

        if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
            target.find("a").click();
            return;
        }

        if (e.keyCode === Utils_UI.KeyCode.LEFT || e.keyCode === Utils_UI.KeyCode.RIGHT) {
            const liTarget = target.closest("li");
            let liToFocus: JQuery;
            if (e.keyCode === Utils_UI.KeyCode.RIGHT) {
                liToFocus = liTarget.nextAll("li:visible").first();
                if (liToFocus.length === 0) {
                    liToFocus = this.getElement().children("li:visible").first();
                }
            }
            else {
                liToFocus = liTarget.prevAll("li:visible").first();
                if (liToFocus.length === 0) {
                    liToFocus = this.getElement().children("li:visible").last();
                }
            }

            let atagToFocus = liToFocus.children("a");
            atagToFocus.focus();
        }
    }
}

Controls.Enhancement.registerEnhancement(PivotView, ".pivot-view.enhance")

export class NavigationViewTab extends Controls.BaseControl {

    /**
     * Creates a control which is used to populate a navigation tab's content section
     */
    constructor(options?) {
        super(options);
    }

    /**
     * Called whenever navigation occurs with this tab as the selected tab
     *
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public onNavigate(rawState: any, parsedState: any) {
    }

    /**
     * Called whenever this tab is active and a navigation occurs that is switching to another tab
     */
    public onNavigateAway() {
    }
}

class ErrorNavigationViewTab extends NavigationViewTab {

    private _messageControl: any;

    public static TAB_ID = "error";

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "error-tab"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._messageControl = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $("<div class='tabbed-navigation-error' />").appendTo(this._element), {
            closeable: false
        });
    }

    public setContent(headerTitle, $contentHtml, messageType, expand) {
        this._messageControl.setMessage({
            type: messageType,
            header: headerTitle,
            content: $contentHtml
        });

        this._messageControl.setErrorDetailsVisibility(expand);
    }
}

class InfoNavigationViewTab extends NavigationViewTab {

    private _$title: JQuery;
    private _$description: JQuery;

    public static TAB_ID = "info";

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "info-tab"
        }, options));
    }

    public initialize() {
        super.initialize();
    }

    public setHeader(title: string, description: string) {

        if (!this._$description) {
            this._$description = $(domElem("div", "information-summary")).prependTo(this._element);
        }

        if (!this._$title) {
            this._$title = $(domElem("div", "information-title")).prependTo(this._element);
        }

        this._$title.text(title);
        this._$description.html(description);

    }

    public appendInformation(caption: string, collapsed: boolean): Notifications.InformationAreaControl {
        var control = <Notifications.InformationAreaControl>Controls.BaseControl.createIn(Notifications.InformationAreaControl, $(domElem("div")).appendTo(this._element), {
            caption: caption,
            collapsed: collapsed
        });
        return control;
    }
}

export class TabbedNavigationView extends NavigationView {

    private _hubContent: any;
    private _tabsControl: PivotView;
    private _tabsMap: { [key: string]: NavigationViewTab };
    private _tabOptionsMap: any;
    private _tabs: any;
    private _currentTab: NavigationViewTab;
    private _currentTabId: any;
    private _errorTab: ErrorNavigationViewTab;
    private _infoTab: InfoNavigationViewTab;
    private _$infoContent: JQuery;
    private _currentRawState: any;
    private _currentParsedState: any;
    private _currentNavigationContextId: number;
    private _lastParsedNavigationContextId: number;
    private _showingError: boolean;
    private _showingInfo: boolean;
    private _skipTabHideOnAsyncNavigate: boolean;

    /**
     * Creates a high-level view object for a given page that has different tabs which are
     * displayed based on the current hash/navigation.
     *
     * @param options
     *     tabs: (Object) Mapping of action id to a NavigationViewTab containing the contents of the tab
     *     hubContentSelector: (String) jQuery selector for the hub content div
     *     pivotTabsSelector: (String) jQuery selector for the hub tabs div
     *     hubSplitterSelector: (String) jQuery selector for the hub splitter control
     *
     */
    constructor(options?: any) {

        super(options);

        this._currentNavigationContextId = 0;
        this._lastParsedNavigationContextId = 0;
        this._showingError = false;
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            tabs: null,
            tabOptions: null,
            attachNavigate: true,
            hubContentSelector: ".right-hub-content .hub-pivot-content",
            pivotTabsSelector: ".right-hub-content .hub-pivot .views .pivot-view",
            hubSplitterSelector: ".hub-splitter"
        }, options));
    }

    public initialize() {
        this._hubContent = this._element.find(this._options.hubContentSelector);
        Diag.Debug.assert(this._hubContent.length > 0, "Unable to find right hub content element");

        if (this._options.tabs) {
            this._tabsControl = <PivotView>Controls.Enhancement.ensureEnhancement(PivotView, this._element.find(this._options.pivotTabsSelector));
            Diag.Debug.assertIsObject(this._tabsControl, "Unable to find pivotview tabs control.");

            this._tabsMap = {};
            this._tabOptionsMap = {};

            this.updateTabs(this._options.tabs);
            this._tabs = {};
        }

        super.initialize();
    }

    /**
     * Update the given tabs in the tabbed navigation view.
     * @param tabs Mapping of tabIds to tabControls
     */
    public updateTabs(tabs: { [key: string]: NavigationViewTab }) {
        Object.keys(tabs).forEach((tabId) => {
            this._tabsMap[("" + tabId).toUpperCase()] = tabs[tabId];
        });

        if (this._options.tabOptions) {
            Object.keys(this._options.tabOptions).forEach((tabId) => {
                this._tabOptionsMap[("" + tabId).toUpperCase()] = this._options.tabOptions[tabId];
            });
        }
    }

    public getTab(tabId: string): NavigationViewTab {
        var tab: NavigationViewTab;

        tabId = ("" + tabId).toUpperCase();
        tab = this._tabs[tabId];

        return tab;
    }

    public showError(error) {
        var title = VSS.getErrorMessage(error),
            content: any = "";

        if (error.stack) {
            content = $("<div />").text(error.stack);
        }

        this.showErrorContent(title, content, Notifications.MessageAreaType.Error, false);
    }

    public showErrorContent(title, $contentHtml, messageType, expand) {
        var errorTab: ErrorNavigationViewTab;

        if (this._tabs) {
            this._showingError = true;
            errorTab = this._getErrorTab();
            errorTab.setContent(title, $contentHtml, messageType, expand);
            this._showTab(errorTab);
            this._hubContent.show();

            this.onNavigate(this.getState());
        }
        else {
            var messageControl = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $(domElem("div", "tabbed-navigation-error")).appendTo(this._hubContent), {
                closeable: false
            });
            messageControl.setMessage({
                type: messageType,
                header: title,
                content: $contentHtml
            });
            messageControl.setErrorDetailsVisibility(expand);
        }
    }

    public showInformationTab(title: string, description: string) {
        if (this._tabs) {
            this._updateTabsControl(InfoNavigationViewTab.TAB_ID, this.getRawState(), this._currentParsedState);

            this._showingInfo = true;

            var infoTab: InfoNavigationViewTab = this._getInfoTab();
            infoTab.setHeader(title, description);

            this._showTab(infoTab);
            this._hubContent.show();

            this.onNavigate(this.getState());
        }
        else {
            this._$infoContent = $(domElem("div", "information-section"))
                .appendTo(this._hubContent);

            $(domElem("div", "information-title"))
                .appendTo(this._$infoContent)
                .text(title || "");
            $(domElem("div", "information-summary"))
                .text(description || "")
                .appendTo(this._$infoContent);
        }
    }

    public appendInformationContent(caption: string, collapsed: boolean): Notifications.InformationAreaControl {
        var control: Notifications.InformationAreaControl;
        if (this._tabs) {
            var infoTab: InfoNavigationViewTab = this._getInfoTab();
            control = infoTab.appendInformation(caption, collapsed);
        }
        else if (this._$infoContent) {
            control = <Notifications.InformationAreaControl>Controls.BaseControl.createIn(Notifications.InformationAreaControl, this._$infoContent, {
                caption: caption,
                collapsed: collapsed
            });
        }
        return control;
    }

    public appendSectionTitle(content: string) {
        if (this._tabs) {
            $(domElem("div", "information-title"))
                .appendTo(this._getInfoTab().getElement())
                .append(content);
        }
        else if (this._$infoContent) {
            $(domElem("div", "information-title"))
                .appendTo(this._$infoContent)
                .append(content);
        }
    }

    public appendSectionSummary(content: string) {
        if (this._tabs) {
            $(domElem("div", "information-summary"))
                .appendTo(this._getInfoTab().getElement())
                .append(content);
        }
        else if (this._$infoContent) {
            $(domElem("div", "information-summary"))
                .appendTo(this._$infoContent)
                .append(content);
        }
    }

    public appendElement(element: JQuery) {
        if (this._tabs) {
            element.appendTo(this._getInfoTab().getElement());
        }
        else if (this._$infoContent) {
            element.appendTo(this._$infoContent);
        }
    }

    /**
     * Refresh the current tab (causes setState to be called on the currently visible tab)
     */
    public refreshCurrentTab() {
        this._onNavigate(this._currentRawState);
    }

    /**
     * Get the action/tab id for the current state
     *
     * @return Tab id, specified in the _a parameter
     */
    public getCurrentAction(): string {
        return this._currentTabId;
    }

    /**
     * Get the current (parsed) state objects for the current navigation state
     *
     * @return State Object that was parsed by the view
     */
    public getState(): any {
        return this._currentParsedState || {};
    }

    /**
     * Set the current (parsed) state objects for the current navigation state
     */
    public setState(parsedState: any) {
        this._currentParsedState = parsedState;
    }

    /**
     * Get a state hash with null entries for each hash key that exists in the current
     * url hash. This state can be extended and passed to VSS.Host.history.addHistoryPoint
     * so that existing hash parameters are NOT included in the new url.
     *
     * @return
     */
    public getEmptyState(): any {

        var emptyState = {};
        $.each(Navigation_Services.getHistoryService().getCurrentState(), function (key, value) {
            emptyState[key] = null;
        });
        return emptyState;
    }

    /**
     * Get the raw (unparsed) state objects for the current navigation state (key/value pairs from the hash/url)
     *
     * @return Object with string values from the url hash portion
     */
    public getRawState(): any {
        return this._currentRawState || {};
    }

    /**
     * Parse the state info and fetch any artificacts necessary to render the tab/view. Invoke the 'callback'
     * method with the new state info object when the state information has been successfully parsed.
     *
     * @param action The action parameter (_a) in the url hash
     * @param rawState The raw state info from the hash url for the new navigation
     * @param callback
     *    Callback that should be called when the state was successfully parsed. The callback takes 2 parameters: the tab id (typically
     *    the action), and the parsed state info object.
     *
     *    callback(tabId, parsedStateInfo);
     *
     *
     */
    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {

        // By default, just treat the raw state key/value strings as the parsed state object.
        callback(action, rawState);
    }

    /**
     * Get the visibility state of the specified tab based on the current tab/navigation state. True to show this tab. False to hide it.
     *
     * @param tabId The Id to get the visiblility state for
     * @param currentTabId Id of the currently selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     * @return True to show the tab. False to hide it.
     */
    public getTabVisibility(tabId: any, currentTabId: string, rawState: any, parsedState: any): boolean {
        return true;
    }

    /**
     * Get the updated tab label for the specified tab based on the current tab/navigation state. null/undefined to keep the existing label.
     *
     * @param tabId The Id to get the tab label for
     * @param currentTabId Id of the currently selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public getTabLabel(tabId: any, currentTabId: string, rawState: any, parsedState: any) {
    }

    /**
     * Shows or hides the Hub pivot section (navigation tab strip + filters)
     *
     * @param visible If true, show the hub pivot (tabs/filters). If false, hide them
     */
    public setHubPivotVisibility(visible: boolean) {
        this._tabsControl.getElement().parents(".hub-pivot:first").toggleClass("hidden", !visible);
    }

    private _getErrorTab() {
        if (!this._errorTab) {
            this._errorTab = <ErrorNavigationViewTab>this._createTab(ErrorNavigationViewTab);
        }
        return this._errorTab;
    }

    private _getInfoTab() {
        if (!this._infoTab) {
            this._infoTab = <InfoNavigationViewTab>this._createTab(InfoNavigationViewTab);
        }
        return this._infoTab;
    }

    public _onNavigate(state) {
        var that = this, navigationContextId;

        this._currentRawState = state;
        navigationContextId = ++this._currentNavigationContextId;

        this.parseStateInfo(state.action, state, function (tabId, parsedState) {
            that._onParseStateInfoSuccess(tabId, state, parsedState, navigationContextId);
        });

        if (this._skipTabHideOnAsyncNavigate) {
            if (this._lastParsedNavigationContextId !== navigationContextId && !(this._showingError || this._showingInfo)) {
                this._hubContent.hide();
            }
            this._skipTabHideOnAsyncNavigate = false;
        }
    }

    public _redirectNavigation(action: string, state: any, replaceHistory?: boolean) {
        this._skipTabHideOnAsyncNavigate = true;
        if (replaceHistory) {
            Navigation_Services.getHistoryService().replaceHistoryPoint(action, state);
        }
        else {
            Navigation_Services.getHistoryService().addHistoryPoint(action, state);
        }
    }

    private _onParseStateInfoSuccess(tabId, rawState, parsedState, navigationContextId) {

        var tab;

        this._currentParsedState = parsedState || {};
        this._lastParsedNavigationContextId = navigationContextId;

        this._hubContent.show();

        if (this._tabs) {
            this._updateTabsControl(tabId, rawState, parsedState);

            tab = this._getTab(tabId);
            if (tab) {

                this._showTab(tab);
                this._showingError = false;
                this._currentTabId = tabId;

                if ($.isFunction(tab.onNavigate)) {
                    tab.onNavigate(rawState, parsedState);
                }

                this.onNavigate(parsedState);
            }
            else {
                this.showError(Utils_String.format(Resources_Platform.NavigationViewUnknownTabErrorFormat, tabId));
            }
        }
        else {
            this.onNavigate(parsedState);
        }
    }

    private _updateTabsControl(selectedTabId, rawState, parsedState) {
        // Update tab selection state, visibility, and labels
        Object.keys(this._tabsMap).forEach((tabIdUppercase) => {
            let newTabLabel;
            let tabId = ("" + tabIdUppercase).toLowerCase();
            let tabControlView = this._tabsControl.getView(tabId, selectedTabId);

            if (tabControlView) {
                tabControlView.link = Navigation_Services.getHistoryService().getFragmentActionLink(tabId, rawState);
                tabControlView.selected = tabIdUppercase === ("" + selectedTabId).toUpperCase();
                tabControlView.disabled = !this.getTabVisibility(tabId, selectedTabId, rawState, parsedState);

                newTabLabel = this.getTabLabel(tabId, selectedTabId, rawState, parsedState);
                if (newTabLabel) {
                    tabControlView.text = newTabLabel;
                }
            }
        });

        this._tabsControl.updateItems(/* keepTabFocus */ true);
    }

    private _showTab(tab: NavigationViewTab) {
        if (this._currentTab !== tab) {

            if (this._currentTab) {
                this._currentTab.onNavigateAway();
                this._currentTab.hideElement();
            }

            if (tab) {
                tab.showElement();
            }

            this._currentTab = tab;
        }
    }

    private _getTab(tabId): NavigationViewTab {
        var tab: NavigationViewTab,
            tabControl;

        tabId = ("" + tabId).toUpperCase();

        tab = this._tabs[tabId];
        if (!tab) {
            tabControl = this._tabsMap[tabId];
            if (tabControl) {
                tab = this._createTab(tabControl, this._tabOptionsMap[tabId]);
                this._tabs[tabId] = tab;
            }
        }
        return tab;
    }

    private _createTab(tabControlType, tabOptions?: any): NavigationViewTab {
        var $container = $("<div />").addClass("navigation-view-tab").appendTo(this._hubContent);
        return <NavigationViewTab>Controls.Enhancement.enhance(tabControlType, $container, $.extend({
            navigationView: this
        }, tabOptions));
    }
}

export interface NavigationLinkOptions {
    state?: any;
    getUrl?: (state: any) => string;
    target?: string;
    text?: string;
    title?: string;
    $content: JQuery;
    initialState?: any;
}

export class NavigationLink extends Controls.BaseControl {

    private _navigateHandler: (state: any) => void;
    private _navigationLinkOptions: NavigationLinkOptions;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            tagName: "a"
        }, options));
    }

    constructor(options: NavigationLinkOptions) {
        super(options);
        this._navigationLinkOptions = options || <NavigationLinkOptions>{};
    }

    public initialize() {
        super.initialize();

        this._navigateHandler = delegate(this, this.onNavigate);
        var historySvc = Navigation_Services.getHistoryService();
        historySvc.attachNavigate(this._navigateHandler);

        if (this._navigationLinkOptions.text) {
            this._element.text(this._navigationLinkOptions.text);
        }
        else if (this._navigationLinkOptions.$content) {
            this._navigationLinkOptions.$content.appendTo(this._element);
        }

        if (this._navigationLinkOptions.target) {
            this._element.attr("target", this._navigationLinkOptions.target);
        }
        if (this._navigationLinkOptions.title) {
            this._element.attr("title", this._navigationLinkOptions.title);
        }

        this.updateLink(this._navigationLinkOptions.initialState || historySvc.getCurrentState());
    }

    public dispose() {
        super.dispose();
        Navigation_Services.getHistoryService().detachNavigate(this._navigateHandler);
    }

    private onNavigate(sender: any, state: any) {
        this.updateLink(state);
    }

    private updateLink(state: any) {
        this._element.attr("href", this.getLocation(state));
    }

    public getLocation(state: any) {
        if (this._navigationLinkOptions.getUrl) {
            return this._navigationLinkOptions.getUrl.call(this, state);
        }
        else {
            state = $.extend({}, state, this._navigationLinkOptions.state);
            return Navigation_Services.getHistoryService().getFragmentActionLink(null, state);
        }
    }
}

export module FullScreenHelper {

    export var FULLSCREEN_HASH_PARAMETER = "fullScreen";

    var FULLSCREEN_ID = "fullscreen-toggle";
    var FULLSCREEN_CI = "fullscreen-ci";
    var FULLSCREEN_URL_UPDATE_EVENT = "fullscreen-url-update-event";

    var _isFullScreen: boolean;
    var _isInitialized: boolean;
    var _storedMenuBar: Menus.MenuBar;

    var _events: Events_Handlers.NamedEventCollection<any, any>;

    var _options: any;

    /**
     * Initialize the full screen helper. Sets up event handlers.
     *
     * @param menuBar A toggle button for full screen mode will be added to the menu bar (if it does not already exist).
     */
    export function initialize(menuBar: Menus.MenuBar, options?: any) {
        Diag.Debug.assertParamIsNotNull(menuBar, "menuBar");

        _options = options || {};
        _storedMenuBar = menuBar;
        if (!_isInitialized) {
            Navigation_Services.getHistoryService().attachNavigate(_onNavigate);
            $(window).bind('keydown', onKeyDown);
            _isInitialized = true;
        }
        _onNavigate();
    }

    /**
     * Gets a value indicating whether full screen mode is active.
     */
    export function getFullScreen(): boolean {
        return _isFullScreen;
    }

    /**
     * Set full screen value. Update full screen view and button.
     * Update url with full screen tag if addHistoryPoint is true.
     *
     * @param value  The full screen value to set to.
     * @param addHistoryPoint  If true, update url with full screen tag.
     * @param showLeftLane  If true, the left tab in split panes will be shown during full screen mode.
     * @param suppressNavigate  If true, the setting of full screen will not cause a navigation event, and instead will simply set to fullscreen without updating navigation tabs, etc.
     * @param replaceHistoryPoint If true, update the url with the full screen tag w/o adding to the back history.  addHistoryPoint and replaceHistoryPoint are exclusive operations.
     * @param supressWindowResizeEvent If true, don't trigger the window resize event after setting the new mode.
     */
    export function setFullScreen(value: boolean, addHistoryPoint: boolean = true, showLeftLane: boolean = false, suppressNavigate: boolean = true, replaceHistoryPoint: boolean = false, supressWindowResizeEvent: boolean = false) {

        _isFullScreen = value;

        Diag.Debug.assert(
            !(addHistoryPoint === true && replaceHistoryPoint === true),
            "Adding and replacing the history point are exclusive operations");

        TriSplitNavigationView.getInstance().setFullScreenMode(_isFullScreen, showLeftLane);
        if (_storedMenuBar) {
            _addOrUpdateFullScreenButton();
        }

        if (addHistoryPoint) {
            // update url
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, getUrlData(), undefined, suppressNavigate, true);
        }

        if (replaceHistoryPoint) {
            // replace url
            Navigation_Services.getHistoryService().replaceHistoryPoint(undefined, getUrlData(), undefined, suppressNavigate, true);
        }

        if (_events) {
            _events.invokeHandlers(FULLSCREEN_URL_UPDATE_EVENT, this, null);
        }

        if (_options && _options.publishCIData !== false) {
            _publishCi(addHistoryPoint); // add history point is true iff it is a toggle action by the user.
        }

        if (_options && _options.setFullScreenCallback && $.isFunction(_options.setFullScreenCallback)) {
            _options.setFullScreenCallback();
        }

        // Trigger a window resize event, allowing components to compute their new size.
        if (!supressWindowResizeEvent) {
            const event = document.createEvent('Event');
            event.initEvent('resize', false, true);
            window.dispatchEvent(event);
        }
    }

    /**
     * Get state object for the current full screen mode state.
     *
     * @param value Optional value to set for fullscreen mode.
     * If undefined will use current setting.
     */
    export function getUrlData(value?: boolean): any {
        var data = {};

        value = value === undefined ? _isFullScreen : value;
        data[FULLSCREEN_HASH_PARAMETER] = value;
        return data;
    }

    /**
     * Gets full screen icon.
     */
    export function getFullScreenIcon(): string {
        return "bowtie-icon " + (_isFullScreen ? "bowtie-view-full-screen-exit" : "bowtie-view-full-screen");
    }

    /**
     * Gets full screen tooltip.
     */
    export function getFullScreenTooltip(): string {
        return _isFullScreen ? Resources_Platform.ExitFullScreenModeTooltip : Resources_Platform.EnterFullScreenModeTooltip;
    }

    /**
     * Attaches a fullscreen customer intelligence change event handler.
     * This event handler will be triggered for publishing full screen customer intelligence.
     *
     * @param handler Event handler callback.
     */
    export function attachFullScreenCI(handler: IEventHandler) {
        getEvents().subscribe(FULLSCREEN_CI, <any>handler);
    }

    /**
     * Removes fullscreen customer intelligence change handler from the event handler list.
     *
     * @param handler Event handler callback.
     */
    export function detachFullScreenCI(handler: IEventHandler) {
        getEvents().unsubscribe(FULLSCREEN_CI, <any>handler);
    }

    /**
     * Attaches a fullscreen customer intelligence change event handler.
     * This event handler will be triggered for publishing full screen customer intelligence.
     *
     * @param handler Event handler callback.
     */
    export function attachFullScreenUrlUpdateEvent(handler: IEventHandler) {
        getEvents().subscribe(FULLSCREEN_URL_UPDATE_EVENT, <any>handler);
    }

    /**
     * Removes fullscreen customer intelligence change handler from the event handler list.
     *
     * @param handler Event handler callback.
     */
    export function detachFullScreenUrlUpdateEvent(handler: IEventHandler) {
        getEvents().unsubscribe(FULLSCREEN_URL_UPDATE_EVENT, <any>handler);
    }

    function onKeyDown(e: any, keyCode?: number, ctrlKey?: boolean, shiftKey?: boolean, altKey?: boolean): boolean {
        // isDefaultPrevented flag is set to true when there is key down event executed earlier in the stack.
        var isDefaultPrevented = true;
        if (e instanceof jQuery.Event) {
            isDefaultPrevented = e.isDefaultPrevented();
        } else if (e instanceof KeyboardEvent) {
            isDefaultPrevented = e.defaultPrevented;
        }

        keyCode = e.keyCode || keyCode;
        ctrlKey = e.ctrlKey || ctrlKey;
        shiftKey = e.shiftKey || shiftKey;
        altKey = e.altKey || altKey;
        // Only execute the ESC key down event if this is the first key down event executed.
        // If there is key down event executed earlier, this function will not execute.
        if (!(ctrlKey || shiftKey || altKey) && !isDefaultPrevented) {
            if (keyCode && keyCode === Utils_UI.KeyCode.ESCAPE) {
                if (getFullScreen()) {
                    // Only exit fullscreen when state is fullscreen.
                    setFullScreen(false);
                }
                return false;
            }
        }
    }

    function _onNavigate() {
        const currentState = Navigation_Services.getHistoryService().getCurrentState();
        const fullScreenMode = currentState && (Utils_String.localeIgnoreCaseComparer(currentState[FULLSCREEN_HASH_PARAMETER], "true") === 0);
        setFullScreen(fullScreenMode, false, (_options.showLeftLane === true), false, false, !!fullScreenMode === !!_isFullScreen /* Don't trigger window resize unless the mode changes */);
    }

    var _buttonHandler = function () {
        setFullScreen(!_isFullScreen, _options.addHistoryPoint !== false, (_options.showLeftLane === true));
    }

    function _getFullScreenMenuItemData(): any {
        return {
            id: FULLSCREEN_ID,
            title: _isFullScreen ? Resources_Platform.ExitFullScreenModeTooltip : Resources_Platform.EnterFullScreenModeTooltip,
            icon: getFullScreenIcon(),
            showText: false,
            action: _buttonHandler
        };
    }

    function _addOrUpdateFullScreenButton() {
        var toggleButton = _storedMenuBar.getItem(FULLSCREEN_ID);
        if (toggleButton) {
            toggleButton.update(_getFullScreenMenuItemData());
            toggleButton.removeHighlight();
        } else {
            var menuItems = _storedMenuBar.getItems();
            menuItems.push(_getFullScreenMenuItemData());
            _storedMenuBar.updateItems(menuItems);
        }
    }

    function _publishCi(isToggle: boolean) {
        var ciData: any = {
            "isToggle": isToggle,
            "isFullScreen": _isFullScreen,
            "Url": window.location.pathname,
            "HashUrl": window.location.hash,
            "UserId": Context.getDefaultWebContext().user.id,
            "ScreenWidth": window.innerWidth,
            "ScreenHeight": window.innerHeight
        };

        if (_events) {
            _events.invokeHandlers(FULLSCREEN_CI, this, ciData);
        }

        Telemetry_Services.publishEvent(new Telemetry_Services.TelemetryEventData(
            Constants_Platform.WebAccessCustomerIntelligenceConstants.Area,
            Constants_Platform.WebAccessCustomerIntelligenceConstants.FullScreenModeFeature,
            ciData));
    }

    function getEvents() {
        if (!_events) {
            _events = new Events_Handlers.NamedEventCollection();
        }
        return _events;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.UI.Controls.Navigation", exports);
