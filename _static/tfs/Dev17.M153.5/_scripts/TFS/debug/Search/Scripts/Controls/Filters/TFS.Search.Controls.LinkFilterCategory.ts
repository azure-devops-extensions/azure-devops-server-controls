// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Controls = require("VSS/Controls");
import Filter_Search_Box = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterSearchBox");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Search_Filter_Link = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.LinkFilter");
import Search_Filter_Category_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.SearchableAndExpandableFilterCategoryBase");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;

export class LinkFilterCategory extends Search_Filter_Category_Base.SearchableAndExpandableFilterCategoryBase {
    protected static REFINE_FILTER_LIST_NO_RESULTS_CSS_CLASS: string = "filter-list-no-results";
    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        super.initialize();
        this._filters = new Array<Search_Filter_Link.LinkFilter>();
    }

    public drawCategory(filterCategory: Core_Contracts.IDefaultFilterCategory): void {
        // draw label, expander and bind expander to handle click event
        super.drawCategory(filterCategory, false);
    }

    protected appendFilters(filterCategory: Core_Contracts.IDefaultFilterCategory) {
        var linkFilters: Core_Contracts.IFilter[] = new Array<Core_Contracts.IFilter>();
         
        // sorting based on the hit count before rendering
        this.sortFilterList(filterCategory.filters);

        filterCategory.filters.forEach((value, index) => {
            if (!Helpers.Utils.compareStrings(value.name, Helpers.Utils.getCurrentAccountName())) {
                linkFilters.push(value);
            }
        });

        this._indexToStartHiding = LinkFilterCategory.DEFAULT_MAX_FILTERS_TO_SHOW;
        if (linkFilters.length === 0) {
            var noResultsFoundSection = $(domElem("div"))
                .addClass(LinkFilterCategory.REFINE_FILTER_LIST_NO_RESULTS_CSS_CLASS)
                .appendTo(this._$filtersArea)
                .text(Search_Resources.NoResultsFoundText);
            Utils_Accessibility.announce(Search_Resources.NoResultsFoundText, true);
        }
        this._drawFilters(linkFilters);

        // update DOM
        this._element.append(this._$filtersAndSearchArea);

        // update min height
        this._filtersAreaMinHeight = this._$filtersArea.height();
        Utils_Accessibility.announce(Search_Resources.AccountFiltersLoadedMessage, true);
    }
    
    private _drawFilters(
        linkFilters: Core_Contracts.IFilter[]): void {
        // draw all filters to be shown
        for (var i in linkFilters) {
            this.drawFilterItem(linkFilters[i]);
        }

        this._hideFilters(
            this._filters,
            this._showAllFilters,
            this._indexToStartHiding);
        
        this._drawShowOrMoreLessArea(this._filters, this._indexToStartHiding, this._showAllFilters);
    }

    // Draws a single filter
    private drawFilterItem(filter: Core_Contracts.IFilter): void {
        var filterItem: Search_Filter_Link.LinkFilter = <Search_Filter_Link.LinkFilter>Controls.BaseControl.createIn(
            Search_Filter_Link.LinkFilter,
            this._$filtersArea, {
                cssClass: LinkFilterCategory.FILTER_ITEM_CSS_CLASS,
                id: filter.id,
                name: filter.name,
                isSelected: filter.selected,
                resultCount: filter.resultCount
            });

        this._filters.push(filterItem);
        filterItem.drawItem(filter);
    }   
    
    private sortFilterList(linkFilters: any): any {
        linkFilters.sort((a, b) => {
            var resultCountA: number = a.resultCount;
            var resultCountB: number = b.resultCount;

            if (resultCountA > resultCountB) {
                return -1;
            }
            if (resultCountA < resultCountB) {
                return 1;
            }

            // result count of a must be equal to result count of b
            return 0;
        });
    } 
}
