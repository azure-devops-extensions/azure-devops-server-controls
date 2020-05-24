// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Controls = require("VSS/Controls");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Filter_Search_Box = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterSearchBox");
import Search_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterBase");
import Search_Filter_Check = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.CheckFilter");
import Search_Filter_Category_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterCategoryBase");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;

export const MAX_FILTER_ITEMS_TO_RENDER = 50;

export class SearchableAndExpandableFilterCategoryBase extends Search_Filter_Category_Base.FilterCategoryBase {
    protected static FILTER_ITEM_CSS_CLASS: string = "checkbox-filter-item";
    protected static ITEM_SELECTED_CSS_CLASS: string = "selected";
    protected static REFINE_FILTER_LIST_NO_RESULTS_CSS_CLASS: string = "filter-list-no-results";
    protected static SEARCHABLE_FILTER_CATEGORY_CSS_CLASS: string = "searchable-filter-category";
    protected static FILTER_ITEM_AREA_CSS_CLASS: string = "filter-item-area";
    protected static SHOW_MORE_OR_LESS_COLLAPSED_CSS_CLASS: string = "collapsed";
    protected static SHOW_MORE_OR_LESS_AREA_CSS_CLASS: string = "show-more-or-less-area";
    protected static SHOW_MORE_OR_LESS_LABEL_CSS_CLASS: string = "show-more-or-less-label";
    protected static SHOW_MORE_OR_LESS_ICON_CSS_CLASS: string = "show-more-or-less-icon";
    protected static SHOW_MORE_ICON_CSS_CLASS: string = "show-more-icon";
    protected static SHOW_LESS_ICON_CSS_CLASS: string = "show-less-icon";
    protected static DEFAULT_MAX_FILTERS_TO_SHOW: number = 8;

    protected _filterSearchControl: Filter_Search_Box.FilterSearchBox;
    private _resultsSet: Search_Filter_Base.FilterBase[];

    protected _indexToStartHiding: number = -1;
    protected _filtersAreaMinHeight: number = -1;
    protected _previousFilterSearchText: string;
    protected _filtersAndSearchAreaId: string;
    protected _$showMoreOrLessArea: JQuery;
    protected _$showMoreOrLessIcon: JQuery;
    protected _$showMoreOrLessLabel: JQuery;

    constructor(options?) {
        super(options);
        this._filtersAndSearchAreaId = ["_filters", TFS_Core_Utils.GUIDUtils.newGuid().replace("-", "")].join(".");
    }

    public initialize(): void {
        super.initialize();
    }

    private _filterSearchBoxWaterMarkMap = {
        "ProjectFilters": Search_Resources.ProjectFiltersSearchBoxWaterMark,
        "RepositoryFilters": Search_Resources.RepositoryFiltersSearchBoxWaterMark,
        "BranchFilters": Search_Resources.BranchFiltersSearchBoxWaterMark,
        "CodeElementFilters": Search_Resources.CodeElementFiltersSearchBoxWaterMark,
        "AccountFilters": Search_Resources.AccountFiltersSearchBoxWaterMark,
        "Projects": Search_Resources.WorkItemProjectsSearchBoxWaterMark,
        "Work Item Types": Search_Resources.WorkItemTypesSearchBoxWaterMark,
        "States": Search_Resources.StatesSearchBoxWaterMark,
        "Assigned To": Search_Resources.AssignedToSearchBoxWaterMark
    };

    public drawCategory(filterCategory: Core_Contracts.IDefaultFilterCategory, restrictMaxFiltersToRender: boolean): void {
        // draw label, expander and bind expander to handle click event
        super.drawCategory(filterCategory, restrictMaxFiltersToRender);

        // draw search and filters area        
        this._$filtersAndSearchArea = $(domElem('div'))
            .addClass(SearchableAndExpandableFilterCategoryBase.SEARCHABLE_FILTER_CATEGORY_CSS_CLASS)
            .attr("id", this._filtersAndSearchAreaId);

        // draw the search control if the number of filters exceed the threshold length.
        if (filterCategory.filters.length > SearchableAndExpandableFilterCategoryBase.DEFAULT_MAX_FILTERS_TO_SHOW) {
            this._filterSearchControl = <Filter_Search_Box.FilterSearchBox>Controls.BaseControl.createIn(
                Filter_Search_Box.FilterSearchBox,
                this._$filtersAndSearchArea,
                {
                    filterCategoryName: filterCategory.name,
                    waterMark: this._filterSearchBoxWaterMarkMap[filterCategory.name]
                });

            // draw search control
            this._filterSearchControl.drawSearchArea();
        }

        this._$filtersArea = $(domElem('div'))
            .addClass(SearchableAndExpandableFilterCategoryBase.FILTER_ITEM_AREA_CSS_CLASS)
            .appendTo(this._$filtersAndSearchArea)
            .attr("role", "list")
            .attr('tabindex', '-1');

        this._attachEventHandlers();
    }

    /*
    * Update minimum filters pane height to maintain.
    * Iterate through the array containing div heights againints div id's and,
    * set filtersAreaMinHeight with the value for which id is the same as the one represented by instance of this class.
    **/
    public onFilterPaneDomUpdate(data: any): void {
        if ($.isArray(data)) {
            for (var index in data) {
                if (data[index].id === this._filtersAndSearchAreaId) {
                    this._filtersAreaMinHeight = data[index].height;
                    break;
                }
            }
        }
    }

    private drawShowMoreLink(showAllFilters: boolean, expandAction: any, collapseAction: any): void {
        if (showAllFilters === false) {
            this._$showMoreOrLessArea = $(domElem("div", SearchableAndExpandableFilterCategoryBase.SHOW_MORE_OR_LESS_AREA_CSS_CLASS))
                .attr("aria-label", Search_Resources.ShowMoreLabel)
                .attr("role", "button");
            this._$showMoreOrLessIcon = $(domElem("div", SearchableAndExpandableFilterCategoryBase.SHOW_MORE_OR_LESS_ICON_CSS_CLASS))
                .addClass(SearchableAndExpandableFilterCategoryBase.SHOW_MORE_ICON_CSS_CLASS)
                .addClass("bowtie-icon");
            this._$showMoreOrLessLabel = $(domElem("div", SearchableAndExpandableFilterCategoryBase.SHOW_MORE_OR_LESS_LABEL_CSS_CLASS));
            this._$showMoreOrLessLabel.text(Search_Resources.ShowMoreLabel);
        }
        else {
            this._$showMoreOrLessArea = $(domElem("div", SearchableAndExpandableFilterCategoryBase.SHOW_MORE_OR_LESS_AREA_CSS_CLASS))
                .attr("aria-label", Search_Resources.ShowLessLabel)
                .attr("role", "button");
            this._$showMoreOrLessIcon = $(domElem("div", SearchableAndExpandableFilterCategoryBase.SHOW_MORE_OR_LESS_ICON_CSS_CLASS))
                .addClass(SearchableAndExpandableFilterCategoryBase.SHOW_LESS_ICON_CSS_CLASS)
                .addClass("bowtie-icon");
            this._$showMoreOrLessLabel = $(domElem("div", SearchableAndExpandableFilterCategoryBase.SHOW_MORE_OR_LESS_LABEL_CSS_CLASS));
            this._$showMoreOrLessLabel.text(Search_Resources.ShowLessLabel);
        }

        this._$showMoreOrLessArea.append(this._$showMoreOrLessIcon);
        this._$showMoreOrLessArea.append(this._$showMoreOrLessLabel);
        this._$filtersArea.append(this._$showMoreOrLessArea);

        // Onclick handlers for Show more/less label and icons
        this._$showMoreOrLessArea.bind("click", (obj) => {
            this.toggleShowMoreOrLess(expandAction, collapseAction);
        });
    }

    // Updates show more/less label and icon. Calls expandAction delegate on clicking "show more" and "collapseAction" delegate
    // on clicking "show less".
    private toggleShowMoreOrLess(expandAction: any, collapseAction: any): void {
        var showMoreLinkState = false;
        if (this._$showMoreOrLessLabel.text() === Search_Resources.ShowMoreLabel) {
            this._$showMoreOrLessLabel.text(Search_Resources.ShowLessLabel);
            this._$showMoreOrLessIcon.removeClass(SearchableAndExpandableFilterCategoryBase.SHOW_MORE_ICON_CSS_CLASS);
            this._$showMoreOrLessIcon.addClass(SearchableAndExpandableFilterCategoryBase.SHOW_LESS_ICON_CSS_CLASS);

            if (expandAction !== undefined) {
                expandAction();
            }

            // expanded
            showMoreLinkState = true;
        }
        else {
            this._$showMoreOrLessLabel.text(Search_Resources.ShowMoreLabel);
            this._$showMoreOrLessIcon.removeClass(SearchableAndExpandableFilterCategoryBase.SHOW_LESS_ICON_CSS_CLASS);
            this._$showMoreOrLessIcon.addClass(SearchableAndExpandableFilterCategoryBase.SHOW_MORE_ICON_CSS_CLASS);

            if (collapseAction !== undefined) {
                collapseAction();
            }

            // collapsed
            showMoreLinkState = false
        }

        // update this._showAllFilters flag according to the state of the "show more" link.
        // Call the uber level state change handler to persist this state which would be
        // used to restore the state of the "show more" link when a response is received from the server.
        if (this._showMoreLinkStateChangedHandler !== undefined) {
            this._showAllFilters = showMoreLinkState;
            this._filtersAreaMinHeight = this._$filtersArea.height();

            // reset min height of the filters area div.
            this._$filtersArea.css("min-height", "");
            this._showMoreLinkStateChangedHandler(this._identifier, showMoreLinkState);
        }
    }

    // method called when the search text box is cleared/
    private clearSearch() {
        this._previousFilterSearchText = undefined;
        this._restoreFiltersArea();
    }

    // method restore the original state of the fitlers area.
    private _restoreFiltersArea() {
        // clean up the filters area. Unbind click events from "show more" link element
        this._resetFiltersArea();

        // draw the filters
        this._drawFilterItems(this._filters);

        // hide optional filters(if applicable) and draw show more link
        this._hideFilters(
            this._filters,
            this._showAllFilters,
            this._indexToStartHiding)

        // draw show more area.
        this._drawShowOrMoreLessArea(this._filters, this._indexToStartHiding, this._showAllFilters);

        // update min height of the filters area to be maintained afterwards.
        this._filtersAreaMinHeight = this._$filtersArea.height();

        if (this._filterSearchControl) {
            this._filterSearchControl.focus();
        }
    }

    // method called when the search is performed(i.e as soon as the user starts typing)
    private executeSearch(searchText: string) {
        if (this._previousFilterSearchText !== undefined &&
            this._previousFilterSearchText === searchText) {
            return;
        }

        this._previousFilterSearchText = searchText;

        // clean up the filters area.
        this._resetFiltersArea();

        // get the results based on the search text.     
        this._resultsSet = this._filter(searchText);

        if (this._resultsSet.length === 0) {
            var noResultsFoundSection = $(domElem("div"))
                .addClass(SearchableAndExpandableFilterCategoryBase.REFINE_FILTER_LIST_NO_RESULTS_CSS_CLASS)
                .appendTo(this._$filtersArea)
                .text(Search_Resources.NoMatchesFoundText);
        }
        else {
            // draw resultant filters.
            this._drawFilterItems(this._resultsSet);
            let itemsRendered = !this._restrictMaxFiltersToRender ? this._resultsSet.length : Math.min(MAX_FILTER_ITEMS_TO_RENDER, this._resultsSet.length),
                areMoreFiltersPresent = this._resultsSet.length > MAX_FILTER_ITEMS_TO_RENDER;

            var showMoreExpandDelegate = () => {
                for (var j = SearchableAndExpandableFilterCategoryBase.DEFAULT_MAX_FILTERS_TO_SHOW; j < itemsRendered; j++) {
                    this._resultsSet[j].showElement();
                }

                if (this._restrictMaxFiltersToRender && areMoreFiltersPresent) {
                    this._drawMoreItemsMessageArea();
                }
            },
                showMoreCollapseDelegate = () => {
                    for (var j = SearchableAndExpandableFilterCategoryBase.DEFAULT_MAX_FILTERS_TO_SHOW; j < itemsRendered; j++) {
                        this._resultsSet[j].hideElement();
                    }

                    this._removeMoreItemsMessageArea();
                };

            // Hide filters lying beyond the threshold number of filter items.
            this._hideFilters(
                this._resultsSet,
                this._showAllFilters,
                SearchableAndExpandableFilterCategoryBase.DEFAULT_MAX_FILTERS_TO_SHOW);


            // draw show more area only iff 
            // 1. not all filters were shown previously and the current results set has more than threshold number of items. Or,
            // 2. the real estate required by full list of filters is > the current min height of the div containing all the filters.
            if ((this._showAllFilters === false &&
                itemsRendered > SearchableAndExpandableFilterCategoryBase.DEFAULT_MAX_FILTERS_TO_SHOW) ||
                this._$filtersArea.height() > this._filtersAreaMinHeight) {
                this.drawShowMoreLink(
                    this._showAllFilters,
                    Utils_Core.delegate(this, showMoreExpandDelegate),
                    Utils_Core.delegate(this, showMoreCollapseDelegate));
            }

            // show message if not all filters are rendered, and the pane is in expanded state.
            if (this._restrictMaxFiltersToRender && areMoreFiltersPresent && this._showAllFilters) {
                this._drawMoreItemsMessageArea();
            }
            else {
                this._removeMoreItemsMessageArea();
            }
        }

        // maintain a minimum height of the div to avoid jumping of filter categories.
        if (this._filtersAreaMinHeight > -1) {
            this._$filtersArea.css("min-height", this._filtersAreaMinHeight.toString() + "px");
        }
    }

    // handles up/down and enter arrow key events on filters area.
    // Pressing Up key(given the filter area is in focus) this method will hightlight
    // the next filter item appropriately. On pressing enter the highilghted filter item is applied
    private arrowKeyAction(e?): void {
        var filterItemSelector = SearchableAndExpandableFilterCategoryBase.getSelectorFromClassName(
            SearchableAndExpandableFilterCategoryBase.FILTER_ITEM_CSS_CLASS),
            showMoreOrLessAreaSelector = SearchableAndExpandableFilterCategoryBase.getSelectorFromClassName(
                SearchableAndExpandableFilterCategoryBase.SHOW_MORE_OR_LESS_AREA_CSS_CLASS);

        let currentFocusedFilter: JQuery = SearchableAndExpandableFilterCategoryBase.getFocusedFilterElement(this._$filtersArea);
                
        if (e.keyCode === Utils_UI.KeyCode.DOWN) {
            if (!currentFocusedFilter) {
                currentFocusedFilter = this._$filtersArea.children(filterItemSelector).eq(0);
            }
            else {
                currentFocusedFilter.attr("tabindex", -1);

                // skip all hidden elements.
                currentFocusedFilter = this._skipHiddenFilterElements((_$currentElement: JQuery): JQuery => {
                    return _$currentElement.next()
                }, currentFocusedFilter);

                if (currentFocusedFilter.length <= 0) {
                    currentFocusedFilter = this._$filtersArea.children(filterItemSelector).eq(0);
                }
            }

            e && e.preventDefault();
        }
        else if (e.keyCode === Utils_UI.KeyCode.UP) {
            if (!currentFocusedFilter) {
                currentFocusedFilter = this._$filtersArea.children(showMoreOrLessAreaSelector).last();
                // if currentFilterItem is undefined this means "show more/less" link wasn't visible. So select the last filter item
                if (currentFocusedFilter.length === 0) {
                    currentFocusedFilter = this._$filtersArea.children(filterItemSelector).last();
                }
            }
            else {
                currentFocusedFilter.attr("tabindex", -1);

                // skip all hidden elements.
                currentFocusedFilter = this._skipHiddenFilterElements((_$currentElement: JQuery): JQuery => {
                    return _$currentElement.prev()
                }, currentFocusedFilter);

                if (currentFocusedFilter.length <= 0) {
                    currentFocusedFilter = this._$filtersArea.children(showMoreOrLessAreaSelector).last();

                    // if currentFilterItem is undefined this means "show more/less" link wasn't visible. So select the last filter item
                    if (currentFocusedFilter.length === 0) {
                        currentFocusedFilter = this._$filtersArea.children(filterItemSelector).last();
                    }
                }
            }

            e && e.preventDefault();
        }
        else if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
            if (currentFocusedFilter) {
                currentFocusedFilter.click();

                var showLessIconFilter: string = SearchableAndExpandableFilterCategoryBase.getSelectorFromClassName(SearchableAndExpandableFilterCategoryBase.SHOW_LESS_ICON_CSS_CLASS);
                var _$showLessIcon = currentFocusedFilter.children(showLessIconFilter);

                // if show more is clicked highlight the item after the threshold length.
                if (_$showLessIcon.length > 0) {
                    currentFocusedFilter.attr("tabindex", -1);
                    currentFocusedFilter = this._$filtersArea
                        .children(filterItemSelector)
                        .eq(SearchableAndExpandableFilterCategoryBase.DEFAULT_MAX_FILTERS_TO_SHOW);
                }
            }
        }

        // update tabindex for the current focussed element.
        if (currentFocusedFilter) {
            currentFocusedFilter.attr("tabindex", 0);
            currentFocusedFilter.focus();

            Utils_UI.Positioning.scrollIntoViewVertical(
                currentFocusedFilter,
                Utils_UI.Positioning.VerticalScrollBehavior.Bottom);
        }
    }

    private _filter(searchText: string): Search_Filter_Base.FilterBase[] {
        var tupleList: Array<Object> = new Array<Object>(),
            results = new Array<Search_Filter_Base.FilterBase>();

        for (var i in this._filters) {
            var substringIndex = this._filters[i].getName().toLowerCase().indexOf(searchText.toLowerCase());
            if (substringIndex >= 0) {

                tupleList.push({
                    "index": i,
                    "substringIndex": substringIndex
                });
            }
        }

        // 1. Exact matches with the filter substring takes priority.
        // 2. Filter names with search text as substring coming at the earliest take the next priority.
        // 3. Alphabetical order of filter names takes the next priority.
        tupleList.sort((a, b) => {
            // place the exact match in front of the array
            if (this._filters[a["index"]].getName().toLowerCase() === searchText.toLowerCase()) {
                return -1;
            }
            else if (this._filters[b["index"]].getName().toLowerCase() === searchText.toLowerCase()) {
                return 1;
            }
            else if (a["substringIndex"] < b["substringIndex"]) {
                return -1;
            }
            else if (b["substringIndex"] < a["substringIndex"]) {
                return 1;
            }
            else {
                return this._filters[a["index"]]
                    .getName()
                    .toLowerCase()
                    .localeCompare(
                    this._filters[b["index"]]
                        .getName()
                        .toLowerCase());
            }
        });

        tupleList.forEach((tuple, index) => {
            results.push(this._filters[tuple["index"]]);
        });

        return results;
    }

    // Draws non-displayed filters on "show more" operation
    private drawRemainingFilters(): void {
        let lastIndexToRender = !this._restrictMaxFiltersToRender ? this._filters.length : Math.min(MAX_FILTER_ITEMS_TO_RENDER, this._filters.length);
        for (var i = this._indexToStartHiding; i < lastIndexToRender; i++) {
            this._filters[i].showElement();
        }

        let areMoreFiltersPresent = this._filters.length > MAX_FILTER_ITEMS_TO_RENDER;
        if (this._restrictMaxFiltersToRender && areMoreFiltersPresent) {
            this._drawMoreItemsMessageArea();
        }
    }

    // By default max(selected-filter-count, DEFAULT_MAX_FILTERS_TO_SHOW) are shown
    // On "show less" operation, rest of the filters are disposed
    private drawLessFilters(): void {
        let lastIndexToHide = !this._restrictMaxFiltersToRender ? this._filters.length : Math.min(MAX_FILTER_ITEMS_TO_RENDER, this._filters.length);
        for (var i = this._indexToStartHiding; i < lastIndexToHide; i++) {
            this._filters[i].hideElement();
        }

        this._removeMoreItemsMessageArea();
        // remove message area.
    }

    private _resetFiltersArea(): void {
        this._$filtersArea.empty();
        this._$filtersArea.removeAttr("style");
        if (this._$showMoreOrLessArea !== undefined) {
            this._$showMoreOrLessArea.unbind("click");
        }
    }

    protected _attachEventHandlers(): void {
        // set search/clear search handlers
        if (this._filterSearchControl) {
            this._filterSearchControl.setClearSearchHandler(Utils_Core.delegate(this, this.clearSearch));
            this._filterSearchControl.setExecuteSearchHandler(Utils_Core.delegate(this, this.executeSearch));
            this._filterSearchControl.setArrowKeyHandler(Utils_Core.delegate(this, (e) => {
                this._$filtersArea.focus();

                // delegate the call to arrowKeyAction method.
                // this method handles setting the css class of different filter items as and when up/down keys are pressed.
                this.arrowKeyAction(e);
            }));
        }

        // bind keyup event on filters area. To listen to arrow down key event.
        if (this._$filtersArea) {
            this._$filtersArea.bind("keydown", Utils_Core.delegate(this, this.arrowKeyAction));
        }
    }

    private _drawFilterItems(filterList: Search_Filter_Base.FilterBase[]): void {
        // if this._restrictMaxFiltersToRender is enabled, then draw only top few
        let lastIndex = !this._restrictMaxFiltersToRender ? filterList.length : Math.min(MAX_FILTER_ITEMS_TO_RENDER, filterList.length);
        for (let i = 0; i < lastIndex; i++) {
            let filter = filterList[i];
            filter.createIn(this._$filtersArea);
            filter.drawItem(<Core_Contracts.IFilter>{
                id: filter.getId(),
                name: filter.getName(),
                resultCount: filter.getResultCount(),
                selected: filter.getIsSelected()
            });
        }
    }

    /*
     * Method hides the the filter elements which lie beyond a threshold index in the list of FilterBase passed.
    */
    protected _hideFilters(
        filters: Search_Filter_Base.FilterBase[],
        showAllFilters: boolean,
        index: number): void {
        let lastRenderedItemIndex = !this._restrictMaxFiltersToRender ? filters.length : Math.min(MAX_FILTER_ITEMS_TO_RENDER, filters.length);
        let shouldHide = !showAllFilters && lastRenderedItemIndex > index;
        if (shouldHide) {
            // hide all the filters which lie beyond the threshold iff "show more" toggle state is collapsed.
            for (var i = index; i < lastRenderedItemIndex; i++) {
                // hide the item
                filters[i].hideElement();
            }
        }
    }

    /*
     * draws the show more area if the number of filters exceed the threshold number of filters to be shown
    */
    protected _drawShowOrMoreLessArea(filters: Search_Filter_Base.FilterBase[], threshold: number, showAllFilters: boolean) {
        let numberOfFilterItems = !this._restrictMaxFiltersToRender ? filters.length : Math.min(MAX_FILTER_ITEMS_TO_RENDER, filters.length);
        if (numberOfFilterItems > threshold) {
            this.drawShowMoreLink(
                showAllFilters,
                Utils_Core.delegate(this, this.drawRemainingFilters),
                Utils_Core.delegate(this, this.drawLessFilters));
        }

        // if showAllFilters is true that means all filters are shown to user.
        // When number of displayed checked filters exceed the threshold it implies filters area is exhausted to show more items when
        // number of filters to be drawn is restricted by an upper limit.
        let areAllItemsRendered = showAllFilters || numberOfFilterItems === threshold;

        if (this._restrictMaxFiltersToRender && filters.length > MAX_FILTER_ITEMS_TO_RENDER && areAllItemsRendered) {
            this._drawMoreItemsMessageArea();
        }
    }

    private _drawMoreItemsMessageArea(): void {
        // show "more results" info area if filters to render is restricted by an upper limit
        this._removeMoreItemsMessageArea();
        let _$messageSpan = $(domElem("span")),
            _$messageArea = $(domElem("div", "more-items-message-area")).css({
                margin: "10px 0px 5px 18px",
                color: "#7F7F7F"
            });
        _$messageSpan.text(Search_Resources.FiltersAreaMoreItemsPresentText);
        _$messageArea.append(_$messageSpan);
        this._$filtersArea.append(_$messageArea);
    }

    private _removeMoreItemsMessageArea(): void {
        let _$messageArea = this._$filtersArea.find(".more-items-message-area");
        _$messageArea.remove();
    }

    private _skipHiddenFilterElements(getNextElement: any, currentFocusedFilter: JQuery): JQuery {
        var _$currentItem: JQuery = currentFocusedFilter;
        // skip all hidden elements.
        do {
            _$currentItem = getNextElement(_$currentItem);
        } while (_$currentItem !== undefined &&
        _$currentItem.length > 0 &&
            _$currentItem.is(":visible") === false);

        return _$currentItem;
    }

    private static getFirstItemAndMarkAsSelected(filterArea: JQuery, selector: string): JQuery {
        var item: JQuery = filterArea
            .children(selector)
            .eq(0)
            .addClass(SearchableAndExpandableFilterCategoryBase.ITEM_SELECTED_CSS_CLASS);

        return item;
    }

    private static getFocusedFilterElement(filterArea: JQuery): JQuery {
        var itemArray: JQuery = filterArea
            .children()
            .filter((index, el) => $(el).is(":focus"));

        return itemArray.length === 1 ? itemArray.eq(0) : null;
    }

    private static getLastItemAndMarkAsSelected(filterArea: JQuery, selector: string): JQuery {
        var item = filterArea
            .children(selector)
            .last()
            .addClass(SearchableAndExpandableFilterCategoryBase.ITEM_SELECTED_CSS_CLASS);
        return item;
    }

    private static getSelectorFromClassName(cssClass: string): string {
        return ".".concat(cssClass);
    }
}
