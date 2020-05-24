// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Controls = require("VSS/Controls");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Filter_Search_Box = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterSearchBox");
import Search_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterBase");
import Search_Filter_Check = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.CheckFilter");
import Search_Filter_Category_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.SearchableAndExpandableFilterCategoryBase");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;


export class MultiSelectFilterCategory extends Search_Filter_Category_Base.SearchableAndExpandableFilterCategoryBase {
    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        super.initialize();
        this._filters = new Array<Search_Filter_Check.CheckFilter>();
    }

    public drawCategory(filterCategory: Core_Contracts.IDefaultFilterCategory, restrictMaxFiltersToRender: boolean): void {
        // draw label, expander and bind expander to handle click event
        super.drawCategory(filterCategory, restrictMaxFiltersToRender);

        var selectedFilters: Core_Contracts.IFilter[] = new Array<Core_Contracts.IFilter>(),
            nonSelectedFilters: Core_Contracts.IFilter[] = new Array<Core_Contracts.IFilter>();

        // separate out selected and non-selected filters.
        filterCategory.filters.forEach((value, index) => {
            if (value.selected === true) {
                selectedFilters.push(value);
            }
            else {
                nonSelectedFilters.push(value);
            }
        });

        // compute starting index of element in this._filters to hide/show upon clicking "showless/more" icon.
        let hidingIndex = Math.max(selectedFilters.length, Search_Filter_Category_Base.SearchableAndExpandableFilterCategoryBase.DEFAULT_MAX_FILTERS_TO_SHOW);
        this._indexToStartHiding = this._restrictMaxFiltersToRender ? Math.min(hidingIndex, Search_Filter_Category_Base.MAX_FILTER_ITEMS_TO_RENDER) : hidingIndex;

        this._drawFromSelectedAndNonSelectedFilters(selectedFilters, nonSelectedFilters);

        // update DOM
        this._element.append(this._$filtersAndSearchArea);
    }

    private _drawFromSelectedAndNonSelectedFilters(
        selectedFilters: Core_Contracts.IFilter[],
        nonSelectedFilters: Core_Contracts.IFilter[]): void {
        let count = 0;
        // draw all filters to be shown
        for (var i in selectedFilters) {
            count++;
            let shouldRender = !this._restrictMaxFiltersToRender || count <= Search_Filter_Category_Base.MAX_FILTER_ITEMS_TO_RENDER;
            this.drawFilterItem(selectedFilters[i], count, shouldRender);
        }

        for (var i in nonSelectedFilters) {
            count++;
            let shouldRender = !this._restrictMaxFiltersToRender || count <= Search_Filter_Category_Base.MAX_FILTER_ITEMS_TO_RENDER;
            this.drawFilterItem(nonSelectedFilters[i], count, shouldRender);
        }

        this._hideFilters(
            this._filters,
            this._showAllFilters,
            this._indexToStartHiding);
        
        this._drawShowOrMoreLessArea(this._filters, this._indexToStartHiding, this._showAllFilters);
    }

    // Draws a single filter
    private drawFilterItem(filter: Core_Contracts.IFilter, count: number, shouldRender: boolean): void {
        var filterItem: Search_Filter_Check.CheckFilter = new Search_Filter_Check.CheckFilter({
            cssClass: MultiSelectFilterCategory.FILTER_ITEM_CSS_CLASS,
            category: this._name,
            filterId: this._filtersAndSearchAreaId + count,
            name: filter.name,
            isSelected: filter.selected,
            id: filter.id,
            resultCount: filter.resultCount,
            tabindex: count === 1 ? 0 : -1
        });

        this._filters.push(filterItem);
        if (shouldRender) {
            filterItem.createIn(this._$filtersArea)
            filterItem.drawItem(filter);
        }
    }
}
