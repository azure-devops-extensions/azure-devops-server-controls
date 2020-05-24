import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import TFS_ListControl = require("Presentation/Scripts/TFS/FeatureRef/ListControl");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Q = require("q");

import "VSS/LoaderPlugins/Css!FilteredListDropdown";

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;
var KeyCode = Utils_UI.KeyCode;

export interface FilteredListControlOptions {
    tabNames?: any,
    defaultTabId?: string,
    selectedItem?: any,
    maxMenuItems?: number,
    showItemIcons?: boolean,
    hideSearchBox?: boolean,
    /**
    * Wait until asynchronously fetched items arrive before taking action on the Enter key 
    */
    waitOnFetchedItems?: boolean
    /** 
    * Select first item in the list by default
    */
    selectFirstItemByDefault?: boolean,
    /** 
    * Update the selected item css in the list after selection
    * Not needed if the list closes after the selection
    */
    updateSelectedItemInList?: boolean,
    /**
    * A function which takes a string and returns an item
    * This function is invoked when Enter key is pressed and there is no item in the filtered list
    * The object returned from the function will be set as selected item.
    */
    getItemFromSearchText?: { [tabId: string]: (text: string) => any },
    /**
    * Scroll if needed to put an exact match into view so the user can see that it's highlighted
    */
    scrollToExactMatch?: boolean
    /**
     * Specifies whether to use the modern bowtie styling (bowtie styles are in preview and subject to change).
     * @defaultvalue false
     */
    useBowtieStyle?: boolean
    /**
    * If true, then display the favorite icon for toggling and enable item favorite callbacks.
    */
    showFavorites?: boolean
}

export class FilteredListControl extends TFS_ListControl.ListControl {

    private static _defaultMaxItems = 250;

    private _tabsById: any;
    protected _selectedTab: string;
    private _contentByTabId: any;
    private _ariaLiveByTabId: { [tabId: string]: JQuery };
    private _listsByTabId: any;
    private _searchBoxByTabId: { [tabId: string]: JQuery; };
    private _lastSearchTextByTabId: { [tabId: string]: string; };
    private _itemsByTabId: any;
    private _deferredItemsByTabId: { [tabId: string]: Q.Deferred<any> };
    private _$tabContentContainer: JQuery;
    private _maxMenuItems: number;
    private _initialFilter: string;
    private _selectFirstItemByDefault: boolean;
    private _delayedFilteredListUpdate: Utils_Core.DelayedFunction;
    private _scrollTopBeforeExactMatchByTabId: { [tabId: string]: number };

    private _favoriteIcon = "bowtie-favorite";
    private _nonFavoriteIcon = "bowtie-favorite-outline";

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "filtered-list-control"
        }, options));
    }

    public initialize() {

        var $pivotViews: JQuery;

        super.initialize();

        if (this._options.useBowtieStyle) {
            this._element.addClass("bowtie-filtered-list");
        }

        this._maxMenuItems = this._options.maxMenuItems || FilteredListControl._defaultMaxItems;
        this._initialFilter = this._options.initialFilter || null;
        this._selectFirstItemByDefault = this._options.selectFirstItemByDefault || false;

        this._contentByTabId = {};
        this._ariaLiveByTabId = {};
        this._listsByTabId = {};
        this._searchBoxByTabId = {};
        this._lastSearchTextByTabId = {};
        this._itemsByTabId = {};
        this._deferredItemsByTabId = {};
        this._scrollTopBeforeExactMatchByTabId = {};
        this._delayedFilteredListUpdate = new Utils_Core.DelayedFunction(this, 100, "delayedFilteredListUpdate", this.updateFilteredList);

        if (this._options.tabNames) {
            $pivotViews = $(domElem("ul", "pivot-view"))
                .attr("role", "tablist")
                .appendTo($(domElem("div", "views")).appendTo(this._element));

            this._tabsById = {};
            this._contentByTabId = {};
            this._selectedTab = this._options.defaultTabId;

            let firstTab = true;
            $.each(this._options.tabNames, (tabId: string, tabName: string) => {
                this._tabsById[tabId] = $(domElem("li", "filtered-list-tab"))
                    .addClass(tabId)
                    .attr("role", "presentation")
                    .data("tabId", tabId)
                    .appendTo($pivotViews);

                const id = this.getTabAnchorId(tabId);
                const tabContentId = this.getTabContentId(tabId);
                $(domElem("a"))
                    .attr("id", id)
                    .attr("role", "tab")
                    .attr("aria-controls", tabContentId)
                    .attr("tabindex", firstTab ? "0" : "-1")
                    .text(tabName)
                    .mousedown(event => {
                        event.stopPropagation();
                        return false;
                    }) // Safari is bubbling this mousedown up much higher than any sane browser.
                    .click(delegate(this, this.onTabClick))
                    .keydown(delegate(this, this.onTabKeyDown))
                    .appendTo(this._tabsById[tabId]);

                if (!this._selectedTab) {
                    this._selectedTab = tabId;
                }

                firstTab = false;
            });
        }

        this._$tabContentContainer = $(domElem("div", "tab-content-container")).appendTo(this._element);
        this._element.keydown(delegate(this, this.onKeyDown));

        if (this._options.tabNames && this._selectedTab) {
            this.onTabSelected(this._selectedTab);
        }
        else {
            this.onTabSelected(null);
        }
    }

    protected onTabClick(e: JQueryEventObject) {
        var tabId = $(e.target).closest(".filtered-list-tab").data("tabId");
        if (tabId) {
            this.selectTab(tabId);
        }
        return false;
    }

    /**
     * Set focus on the search box if shown, else on the selected list item.
     */
    public setFocus() {
        if (this._options.hideSearchBox) {
            var $list = this._listsByTabId[this._selectedTab || ""];
            if ($list) {
                const $focusables: JQuery = $list.children().find(":tabbable");
                if ($focusables.length) {
                    $focusables.first().focus();
                }
                else {
                    $list.focus();
                }
            }
        }
        else {
            var $searchBox = this._searchBoxByTabId[this._selectedTab || ""];
            if ($searchBox) {
                $searchBox.focus();
            }
        }
    }

    public getSearchText() {
        var $searchBox = this._searchBoxByTabId[this._selectedTab || ""];
        return $searchBox ? ($searchBox.val() || "") : "";
    }

    /**
     * Set the search text for the currently selected tab
     */
    protected setSearchText(text: string) {
        let $searchBox = this._searchBoxByTabId[this._selectedTab || ""];
        if ($searchBox && $searchBox.val() !== text) {
            $searchBox.val(text);
            this.updateFilteredList();
        }
    }

    public clearInput() {
        $.each(this._searchBoxByTabId, (tabId: string, $searchBox: JQuery) => {
            if ($searchBox.val()) {
                $searchBox.val("");
                this.updateFilteredList(tabId);
            }
        });
    }

    public _clearCachedItems(tabId?: string) {
        if (tabId) {
            this._itemsByTabId[tabId] = undefined;
            this._deferredItemsByTabId[tabId] = undefined;
        }
        else {
            this._itemsByTabId = {};
            this._deferredItemsByTabId = {};
        }
    }

    /**
     * Select an existing tab with the specified tabId
     */
    protected selectTab(tabId: string) {
        this._selectedTab = tabId;
        this.onTabSelected(tabId);
    }

    protected onTabSelected(tabId: string) {
        var $tab: JQuery,
            $tabContent: JQuery,
            $ariaLive: JQuery,
            $filter: JQuery,
            $filterContent: JQuery,
            $searchBoxContainer: JQuery,
            $searchBox: JQuery,
            $list: JQuery;

        if (!tabId) {
            // Use empty string for empty tab id (e.g. for a non-tabbed view)
            tabId = "";
        }

        // Update the tabs control (if any)
        if (this._tabsById) {

            // Update the tab selection state
            this._element.find(".filtered-list-tab")
                .removeClass("selected")
                .children("a").attr("aria-selected", "false");
            $tab = this._tabsById[tabId];
            if ($tab) {
                $tab.addClass("selected")
                    .children("a").attr("aria-selected", "true");
            }

            // Hide the appropriate tab contents
            $.each(this._contentByTabId, (id: string, tabContent: JQuery) => {
                if (id !== tabId) {
                    tabContent.attr("aria-hidden", "true").hide();
                }
            });
        }

        // Draw the tab content
        let tabContentId = this.getTabContentId(tabId);
        $tabContent = this._contentByTabId[tabId || ""];
        if (!$tabContent) {

            $tabContent = $(domElem("div", "filtered-list-tab-content"))
                .attr("id", tabContentId)
                .attr("role", "tabpanel")
                .appendTo(this._$tabContentContainer);

            $ariaLive = $(domElem("div", "visually-hidden"))
                .attr("aria-live", "polite")
                .attr("aria-atomic", "true")
                .appendTo(this._element);

            $filter = $(domElem("div", "filter-container")).appendTo($tabContent);
            $filterContent = $(domElem("div", "filter-content")).appendTo($filter);

            if (this._options.searchBoxIconCss && this._options.searchBoxIconCss[tabId]) {
                // Search box icon
                $(domElem("span", "filtered-list-search-icon"))
                    .addClass(this._options.searchBoxIconCss[tabId])
                    .click(delegate(this, this._onEmptyListSearchEnterClick))
                    .appendTo($filterContent);
            }

            if (this._options.hideSearchBox) {
                $filter.hide();
            }

            $searchBoxContainer = $(domElem("div", "filtered-list-search-container"))
                .appendTo($filterContent);

            if (this._options.useBowtieStyle) {
                $searchBoxContainer.addClass("bowtie-style");
            }

            $searchBox = $(domElem("input", "filtered-list-search"))
                .attr("type", "text")
                .attr("role", "textbox")
                .attr("aria-controls", tabContentId)
                .appendTo($searchBoxContainer)
                .bind("input keyup change", (e) => {
                    // Throttle the list filtering as the user types, but ignore the keyboard up/down arrow and tab keys for selecting list items.
                    if (Utils_String.localeIgnoreCaseComparer(e.type, "keyup") !== 0 ||
                        (e.keyCode !== KeyCode.DOWN && e.keyCode !== KeyCode.UP && e.keyCode !== KeyCode.TAB)) {

                        // The placeholder text in IE triggers the input event when losing or gaining focus (it does not in Chrome and Edge),
                        // Tabbing out also triggers the change event, and document.activeElement is different on different browsers.
                        // This can create race conditions with list updates during favoriting and keyboard navigation.
                        // So, we check if there really has been a change since the last time the method was called.
                        if (this.hasSearchTextChanged()) {
                            this.onSearchTextChanged();
                        }
                    }
                });


            $searchBox.attr("placeholder", this._getWaterMarkText(tabId));

            // Set the search box text if this._initialFilter is not null and any one of the following:
            // 1. There's only one tab or no tab: this._options.tabNames would be "" or undefined or <name of the tab>
            // 2. There are more than one tabs and the defaultTab is same as the selectedTab
            var tabNames = this._options.tabNames;
            if (this._initialFilter && (!tabNames || (Object.keys(tabNames).length <= 1 || this._options.defaultTabId && this._options.defaultTabId === this._selectedTab))) {
                $searchBox.val(this._initialFilter);
            }

            $list = $(domElem("ul", "filtered-list"))
                .attr("tabindex", "-1")
                .attr("aria-label", Resources.FilteredListSuggestions)
                .attr("role", "listbox")
                .click(delegate(this, this.onItemClicked))
                .appendTo($tabContent);

            if (tabId) {
                $tabContent.addClass(tabId + "-tab-content");
                $searchBox.addClass(tabId + "-search");
                $list.addClass(tabId + "-list");
            }

            this._contentByTabId[tabId] = $tabContent;
            this._ariaLiveByTabId[tabId] = $ariaLive;
            this._searchBoxByTabId[tabId] = $searchBox;
            this._listsByTabId[tabId] = $list;

            this.bindTabContentEvents($tabContent, $list);

            this.updateFilteredList();
        }
        else {
            if (this._options.updateListOnTabSelection || !this._itemsByTabId[tabId]) {
                // This will allow update of the filtered list even if the tab contents were drawn before
                this.updateFilteredList();
            }
            else {
                this.resetAriaLive(tabId);
            }
        }

        // Edge triggers a focus change above that closes the popup when pressing enter when there are no filtered items.
        // We re-open the popup here so we can show the "All branches" list.
        this._element.trigger($.Event("popup-opened", { bubbles: true }));
        this._element.parent().parent().show();

        $tabContent.attr("aria-hidden", "false").show();
        this.setFocus();
    }

    protected onSearchTextChanged() {
        this._delayedFilteredListUpdate.reset();
    }

    private get options(): FilteredListControlOptions {
        return this._options as FilteredListControlOptions;
    }

    private getTabAnchorId(tabId: string) {
        return tabId + this.getId();
    }

    private getTabContentId(tabId: string) {
        return this.getTabAnchorId(tabId) + "content";
    }

    /**
     * Announces states/actions in the control via aria-live for screen readers.  Example: Loading, No matches, Showing X of Y, etc.
     * forceAnnounce appends to the Body DOM such that it is assertively announced even when hidden.
     */
    private setAriaLive(tabId: string, status: string, forceAnnounce: boolean = false) {
        if (forceAnnounce) {
            Utils_Accessibility.announce(status, true);
        }
        else {
            const $ariaLive = this._ariaLiveByTabId[tabId];
            if ($ariaLive) {
                $ariaLive.text(status);
            }
        }
    }

    /**
     * Trigger a repeat of the previous status text for the given tabId.
     */
    private resetAriaLive(tabId: string) {
        const $ariaLive = this._ariaLiveByTabId[tabId];
        if ($ariaLive) {
            $ariaLive.text($ariaLive.text());
        }
    }

    /**
     * Returns true if the search text on the current tab has changed since the last time this method was called.
     */
    private hasSearchTextChanged(): boolean {
        const tabId = this._selectedTab || "";
        const $searchBox = this._searchBoxByTabId[tabId];
        const currentText = $searchBox ? ($searchBox.val() || "") : "";
        const lastText = this._lastSearchTextByTabId[tabId] || "";
        this._lastSearchTextByTabId[tabId] = currentText;
        return currentText !== lastText;
    }

    /**
     * Prevent tabbing out of this FilteredListControl, cycling through its focusable areas instead.
     */
    private onKeyDown(e: JQueryKeyEventObject) {
        if (e.ctrlKey || e.altKey || e.metaKey) {
            return;
        }

        switch (e.keyCode) {
            case KeyCode.TAB:
                // The optional jQuery menus become un-tabbable (tabindex = -1) when focused, hence the additional selector
                const $focusables = $(this._element).children().find(":tabbable, .menu-bar[tabindex='-1']");

                if ($focusables.length > 1) {
                    const endElement = e.shiftKey ? $focusables.first()[0] : $focusables.last()[0];

                    let $target = $(e.target);
                    if ($target[0] !== endElement) {
                        if ($target.hasClass("menu-item")) {
                            $target = $target.closest(".menu-bar");
                        }
                        else if ($target.hasClass("filtered-list-favorite")) {
                            $target = $target.closest("li.filtered-list-item.new-selection");
                        }
                    }

                    if ($target[0] === endElement) {
                        const $nextFocus = e.shiftKey ? $focusables.last() : $focusables.first();
                        $nextFocus.focus();
                        return false;
                    }
                }
                return true;

            case KeyCode.ESCAPE:
                this._fire("escape-key-pressed");
                return false;
        }        
    }

    /**
     * Handle keyboard events on the list of tabs across the top
     */
    private onTabKeyDown(e: JQueryKeyEventObject) {
        if (e.ctrlKey || e.altKey || e.metaKey) {
            return;
        }

        let $tab = $(e.target).closest(".filtered-list-tab");
        if ($tab.length) {

            let $tabToFocus: JQuery;
            switch (e.keyCode) {
                case KeyCode.LEFT:     // Focus previous tab
                    $tabToFocus = $tab.prev(".filtered-list-tab");
                    break;
                case KeyCode.RIGHT:    // Focus next tab
                    $tabToFocus = $tab.next(".filtered-list-tab");
                    break;
                case KeyCode.ENTER:    // Select tab
                    var tabId = $tab.data("tabId");
                    if (tabId) {
                        this.selectTab(tabId);
                    }
                    return false;
                default:
                    return true;
            }

            if ($tabToFocus.length) {
                $tab.parent().children(".filtered-list-tab").children("a").attr("tabindex", -1);
                $tabToFocus.children("a").attr("tabindex", 0).focus();
                return false;
            }
        }
    }

    private bindTabContentEvents($tab: JQuery, $list: JQuery) {

        $tab.bind("keydown", (e) => {

            // Announce the selected item text for a screenreader unless the item already gets announced from focus.
            let setAriaLive = ($selectedItem: JQuery) => {
                if (!$selectedItem.is(":focus")) {
                    this.setAriaLive(this._selectedTab || "", $selectedItem.text() || "");
                }
            }

            switch (e.keyCode) {
                case KeyCode.DOWN:
                    setAriaLive(this.selectNextItem($list, 1));
                    return false;
                case KeyCode.UP:
                    setAriaLive(this.selectNextItem($list, -1));
                    return false;
                case KeyCode.ENTER:
                    this._onEnterKeyClick($list);
                    return false;
            }
        });

        $list.bind("mouseover", (e) => {
            var $newSelection = $(e.target).closest(".filtered-list-item");
            if ($newSelection.length) {
                $list.children(".filtered-list-item")
                    .removeClass("new-selection")
                    .attr("tabindex", "-1");
                $newSelection
                    .addClass("new-selection")
                    .attr("tabindex", "0");
            }
        });

        if (this.options.showFavorites) {
            $list.keydown(delegate(this, this.onListKeyDown));
        }
    }

    /**
     * Handle keyboard events for within the list items (for example, to set/unset favorites)
     */
    private onListKeyDown(e: JQueryKeyEventObject) {
        if (!this.options.showFavorites || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
            return;
        }

        const $target = $(e.target);
        const $itemElement = $target.closest("li.filtered-list-item.new-selection");
        if ($itemElement.length === 1) {

            switch (e.keyCode) {
                case KeyCode.UP:        // For consistent focusing on the item row, up/down arrows first focuses
                case KeyCode.DOWN:      // the current item, then the parent container selects the next item.
                    if (!$target.hasClass("filtered-list-item")) {
                        $itemElement.focus();
                    }
                    return true;
                case KeyCode.RIGHT:     // Focus the favorite star
                    $itemElement.find(".filtered-list-favorite").focus();
                    return false;
                case KeyCode.LEFT:      // Focus the list item
                    $itemElement.focus();
                    return false;
                case KeyCode.ENTER:     // Toggle favorite or select item.
                    if ($target.hasClass("filtered-list-favorite")) {
                        this.toggleFavorite($itemElement, $target);
                    }
                    else {
                        this.onItemSelected($itemElement);
                    }
                    return false;
            }
        }
    }

    private toggleFavorite($itemElement: JQuery, $favorite: JQuery) {
        let item: any = this._getItem($itemElement);
        if (item) {
            let makeFavorite = $favorite.hasClass(this._nonFavoriteIcon);
            $favorite.toggleClass(this._favoriteIcon, makeFavorite)
                .toggleClass(this._nonFavoriteIcon, !makeFavorite)
                .attr("title", (makeFavorite ? Resources.FilteredListRemoveFromFavorites : Resources.FilteredListAddToFavorites))
                .attr("aria-pressed", String(makeFavorite));
            this._setItemIsFavorite(item, makeFavorite);
        }
    }

    private _onEnterKeyClick($list: JQuery) {

        // A promise is used here to optionally wait until asynchronously items are fetched
        // before taking any action when the user presses Enter.
        var deferred: Q.Deferred<any> = this._deferredItemsByTabId[this._selectedTab || ""];
        if (!deferred || !this._options.waitOnFetchedItems) {
            deferred = Q.defer();
            deferred.resolve({});
        }
        deferred.promise.done((items: any) => {
            if (!this.isDisposed() && this._element.is(':visible')) {

                if (this._delayedFilteredListUpdate.isPending()) {
                    this._delayedFilteredListUpdate.invokeNow();
                }

                var $listSelection = $list.children(".new-selection");
                if ($listSelection.length > 0) {
                    this.onItemSelected($listSelection);
                }
                else {
                    var $searchBox = this._searchBoxByTabId[this._selectedTab || ""];
                    if (($searchBox && $searchBox.is(":focus")) ||
                        $list.children(".filtered-list-no-matches").is(":focus")) {
                        this._onEmptyListSearchEnterClick();
                    }
                }
            }
        });
    }

    public _onEmptyListSearchEnterClick() {
        // Optionally overridden in child class. The Enter key was clicked from the search text box when there was no selection.
        // Creates an item from the search text and sets it as selected item
        var getItemFromSearchText = this._options.getItemFromSearchText;
        if (getItemFromSearchText && $.isFunction(getItemFromSearchText[this._selectedTab])) {
            var $searchBox = this._searchBoxByTabId[this._selectedTab || ""],
                searchText = $searchBox ? $searchBox.val() : "";

            var item = getItemFromSearchText[this._selectedTab](searchText);
            this._onItemSelected(item);
        }
    }

    public _setItemsForTabId(tabId: string, items: any[]) {
        this._itemsByTabId[tabId] = items;
    }

    public _getCurrentItemsForTabId(tabId: string) {
        return this._itemsByTabId[tabId];
    }

    /** Updates the filtered list for the given tabId, or for the current selected tab if not specified. */
    public updateFilteredList(tabId?: string, clearCache: boolean = false) {
        var $list: JQuery,
            $ariaLive: JQuery,
            status: string,
            items: any[],
            $searchBox: JQuery,
            searchText: string,
            matchingItemCount = 0,
            previousNewSelectionItem = null,
            hasCurrentItem = false;

        tabId = tabId || this._selectedTab || "";
        $list = this._listsByTabId[tabId];
        if (!$list) {
            return;
        }

        previousNewSelectionItem = $list.children(".filtered-list-item.new-selection").data("item");

        $list.empty();
        status = "";
        if (clearCache) {
            this._clearCachedItems();
        }
        items = this._itemsByTabId[tabId];
        if (!items) {
            status = VSS_Resources_Platform.Loading;
            var deferred = this._deferredItemsByTabId[tabId] || Q.defer();
            this._deferredItemsByTabId[tabId] = deferred;
            $(domElem("li", "message"))
                .text(status)
                .attr("tabindex", "0")
                .appendTo($list);

            this.setAriaLive(tabId, status);
            this._beginGetListItems(tabId, (items) => {
                this._setItemsForTabId(tabId, items);
                this.updateFilteredList(tabId);
                deferred.resolve(items);
            });
            return;
        }

        $searchBox = this._searchBoxByTabId[tabId];
        if ($searchBox) {
            searchText = $searchBox.val().trim().toLowerCase();
        }
        else {
            searchText = "";
        }

        if (items.length === 0) {
            status = this._getNoItemsText(tabId);
            $(domElem("li", "message"))
                .text(status)
                .attr("tabindex", "0")
                .appendTo($list);
        }
        else {
            var numMatches = 0;
            var $exactMatchNode: JQuery = null;
            var $newSelectionNode: JQuery = null;
            $.each(items, (i, item) => {
                var $node: JQuery;
                var itemName = this._getItemName(item) || "";
                var itemNameLowerCase = itemName.toLowerCase();

                if (!searchText || itemNameLowerCase.indexOf(searchText) >= 0) {

                    if (++numMatches > this._maxMenuItems && this._maxMenuItems > 0) {
                        return true;
                    }

                    $node = $(domElem("li", "filtered-list-item"))
                        .text(itemName)
                        .attr("title", this._getItemTooltip(item, itemName))
                        .data("item", item)
                        .attr("role", "option")
                        .attr("tabindex", "-1")
                        .appendTo($list);

                    if (this._options.showItemIcons) {
                        $node.prepend(domElem("span", "icon " + this._getItemIconClass(item)));
                    }

                    if (this._options.showFavorites) {
                        let isFavorite = this._getItemIsFavorite(item);
                        // Future: For a Bowtie tooltip, we'll need a container <div class="filtered-list-favorite bowtie-tooltipped bowtie-tooltipped-n">.
                        // However, we would also need to work around the tooltip clipping caused by the list items and container overflow: hidden properties.
                        $node.prepend($(domElem("span", "bowtie-icon icon filtered-list-favorite " + (isFavorite ? this._favoriteIcon : this._nonFavoriteIcon)))
                            .attr("title", (isFavorite ? Resources.FilteredListRemoveFromFavorites : Resources.FilteredListAddToFavorites))
                            .attr("role", "button")
                            .attr("aria-pressed", String(isFavorite))
                            .attr("tabindex", "-1")
                        );
                    }

                    if (this._selectedItem && this._isSelectedItem(item, this._selectedItem)) {
                        $node.addClass("current-item").attr("aria-selected", "true");
                        hasCurrentItem = true;
                    }

                    if (!$newSelectionNode && previousNewSelectionItem && item === previousNewSelectionItem) {
                        $newSelectionNode = $node;
                    }

                    if (!$exactMatchNode && searchText === itemNameLowerCase) {
                        $exactMatchNode = $node;
                    }

                    matchingItemCount++;
                }
            });

            if (numMatches > this._maxMenuItems && this._maxMenuItems > 0) {
                $(domElem("li", "filtered-list-item message show-more-item"))
                    .text(Utils_String.format(this._getTooManyMatchesTextFormat(tabId), this._maxMenuItems, numMatches))
                    .click(() => {
                        this._showMoreItem();
                    })
                    .bind("keydown", (e) => {
                        switch (e.keyCode) {
                            case Utils_UI.KeyCode.ENTER:
                                this._showMoreItem();
                                return false;
                        }
                    })
                    .attr("tabindex", "-1")
                    .appendTo($list);
            }

            if (matchingItemCount) {
                status = Utils_String.format(Resources.FilteredListShowingCount, matchingItemCount);
                var $selectedNode = $exactMatchNode || $newSelectionNode || $list.children(".filtered-list-item").eq(0);
                $selectedNode.addClass("new-selection").attr("tabindex", "0");

                if (!hasCurrentItem && this._selectFirstItemByDefault) {
                    $selectedNode.addClass("current-item").attr("aria-selected", "true");
                    this._onItemSelected($selectedNode.data("item"));
                }

                // Scroll if needed to put an exact match into view so the user can see that it's highlighted, else reset the scroll after there is no longer an exact match.
                if (this._options.scrollToExactMatch) {
                    let previousScrollTop = this._scrollTopBeforeExactMatchByTabId[tabId];
                    previousScrollTop = (previousScrollTop === undefined) ? null : previousScrollTop;
                    if ($exactMatchNode) {
                        if (previousScrollTop === null) {
                            this._scrollTopBeforeExactMatchByTabId[tabId] = $list.scrollTop();
                        }
                        Utils_UI.Positioning.scrollIntoViewVertical($selectedNode, Utils_UI.Positioning.VerticalScrollBehavior.Bottom);
                    }
                    else if (previousScrollTop !== null) {
                        $list.scrollTop(previousScrollTop);
                        this._scrollTopBeforeExactMatchByTabId[tabId] = null;
                    }
                }
            }
            else {
                status = this._getNoMatchesText(tabId);
                if (this._selectFirstItemByDefault) {
                    this._onItemSelected(null);
                }
                $(domElem("li", "message filtered-list-no-matches"))
                    .text(status)
                    .attr("tabindex", "0")
                    .appendTo($list);
            }
        }

        this.setAriaLive(tabId, status);
    }

    private _showMoreItem(): void {
        this._maxMenuItems = 0;
        this.updateFilteredList();
    }

    public getAriaDescription(): string {
        let description: string[] = [];
        if (!this.options.hideSearchBox) {
            description.push(Resources.FilteredListAriaDescribeSearchbox);
        }
        if (this.options.tabNames && Object.keys(this.options.tabNames).length > 1) {
            description.push(Resources.FilteredListAriaDescribeTabs);
        }
        if (this.options.showFavorites) {
            description.push(Resources.FilteredListAriaDescribeFavorites);
        }
        return description.join(" ");
    }

    public _beginGetListItems(tabId: string, callback: (items: any[]) => void) {
        if ($.isFunction(this._options.beginGetListItems)) {
            this._options.beginGetListItems.call(this, tabId, callback);
        }
        else {
            callback.call(this, []);
        }
    }

    public _getWaterMarkText(tabId: string) {
        var text: string;
        if ((this._options.waterMarks && this._options.waterMarks[tabId])) {
            text = this._options.waterMarks[tabId];
        }
        else if (this._options.waterMark) {
            text = this._options.waterMark;
        }
        else {
            text = Resources.FilteredListWatermark;
        }
        return text;
    }

    public _getNoItemsText(tabId: string) {
        var text: string;
        if ((this._options.noItemsMessages && this._options.noItemsMessages[tabId])) {
            text = this._options.noItemsMessages[tabId];
        }
        else if (this._options.noItemsMessage) {
            text = this._options.noItemsMessage;
        }
        else {
            text = Resources.FilteredListNoItems;
        }
        return text;
    }

    public _getNoMatchesText(tabId: string) {
        var text: string;
        if ((this._options.noMatchesMessages && this._options.noMatchesMessages[tabId])) {
            text = this._options.noMatchesMessages[tabId];
        }
        else if (this._options.noMatchesMessage) {
            text = this._options.noMatchesMessage;
        }
        else {
            text = Resources.FilteredListNoMatches;
        }
        return text;
    }

    public _getTooManyMatchesTextFormat(tabId: string) {
        var text: string;
        if ((this._options.tooManyMatchesMessages && this._options.tooManyMatchesMessages[tabId])) {
            text = this._options.tooManyMatchesMessages[tabId];
        }
        else if (this._options.tooManyMatchesMessage) {
            text = this._options.tooManyMatchesMessage;
        }
        else {
            text = Resources.FilteredListTooManyMatches;
        }
        return text;
    }

    public _isSelectedItem(item: any, selectedItem: any) {
        if ($.isFunction(this._options.isSelectedItem)) {
            return this._options.isSelectedItem(item, selectedItem);
        }
        else {
            return this._getItemName(item) === this._getItemName(selectedItem);
        }
    }

    public _getItemName(item: any) {
        if ($.isFunction(this._options.getItemName)) {
            return this._options.getItemName.call(this, item);
        }
        else {
            return item ? item.toString() : "";
        }
    }

    protected _getItemIsFavorite(item: any): boolean {
        if ($.isFunction(this._options.getItemIsFavorite)) {
            return this._options.getItemIsFavorite.call(this, item);
        }
        else {
            return false;
        }
    }

    protected _setItemIsFavorite(item: any, makeFavorite: boolean) {
        if ($.isFunction(this._options.setItemIsFavorite)) {
            return this._options.setItemIsFavorite.call(this, item, makeFavorite);
        }
    }

    protected _getItemTooltip(item: any, defaultTooltip?: string): string {
        var itemTooltip = this._options.getItemTooltip;
        if (itemTooltip) {
            if ($.isFunction(itemTooltip)) {
                return itemTooltip.call(this, item);
            }
            return itemTooltip;
        }
        return defaultTooltip || this._getItemName(item);
    }

    protected _getItemIconClass(item: any): string {
        var itemIconClass = this._options.getItemIconClass;
        if (itemIconClass) {
            if ($.isFunction(itemIconClass)) {
                return itemIconClass.call(this, item);
            }
            return itemIconClass;
        }
        return "";
    }

    public _getSelectedItem(): any {
        return this._selectedItem;
    }

    public setSelectedItem(item: any, skipUpdate?: boolean) {
        this._selectedItem = item;
        if (skipUpdate !== true) {
            this.updateFilteredList();
        }
    }

    private onItemClicked(e: JQueryEventObject) {
        let $target = $(e.target)
        let $itemElement = $target.closest("li.filtered-list-item");
        if (this._options.showFavorites && $target.hasClass("filtered-list-favorite")) {
            this.toggleFavorite($itemElement, $target)
        }
        else {
            this.onItemSelected($itemElement);
        }
        return false;
    }

    private onItemSelected($itemElement: JQuery) {
        let item = this._getItem($itemElement);
        if (item) {
            this._onItemSelected(item);
            if (this._options.updateSelectedItemInList) {
                this._updateSelectedItemInList($itemElement);
            }
        }
    }

    private _getItem($itemElement: JQuery): any {
        let item: any;
        if ($itemElement.length === 1) {
            item = $itemElement.data("item");
        }
        return item;
    }

    public _onItemSelected(item: any) {
        let selectedItemText = Utils_String.format(Resources.FilteredListSelectedItem, this._getItemName(item) || "");
        this.setAriaLive(this._selectedTab || "", selectedItemText, true);

        this._selectedItem = item;
        this._fire("selected-item-changed", { selectedItem: item });
    }

    private _updateSelectedItemInList($itemElement: JQuery, tabId?: string) {
        tabId = tabId || this._selectedTab || "";
        var $list: JQuery = this._listsByTabId[tabId];
        if ($list) {
            $list.children(".filtered-list-item").removeClass("current-item").removeAttr("aria-selected");
            $itemElement.addClass("current-item").attr("aria-selected", "true");
        }
    }
}

VSS.classExtend(FilteredListControl, TFS_Host_TfsContext.TfsContext.ControlExtensions);

