// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Filters_Helper = require("Search/Scripts/Common/TFS.Search.FiltersHelper");
import Search_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterBase");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;

export class LinkFilter extends Search_Filter_Base.FilterBase {
    private static FILTER_COUNT_CSS_CLASS: string = "filter-count";
    private static FILTER_LINK_CSS_CLASS: string = "filter-link";

    private _$count: JQuery;
    private _$link: JQuery;
    private _url: string;
    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        super.initialize();
    }

    public drawItem(filter: Core_Contracts.IFilter): void {
        this._$link = $(domElem('a'))
            .text(this.getName())
            .addClass(LinkFilter.FILTER_LINK_CSS_CLASS)
            .addClass(Search_Constants.SearchConstants.TruncateLargeTextCssClass)
            .attr("aria-label", this.getName())
            .attr("role", "listitem");

        var resultCount: number = this.getResultCount();

        // Checks whether hitCount is not equals to - 1
        if (resultCount === Search_Constants.SearchConstants.ResultsCountNotAvailable) {
            resultCount = undefined;
        }

        this._$count = $(domElem('div'))
            .addClass(LinkFilter.FILTER_COUNT_CSS_CLASS)
            .text(resultCount);

        this._url = this.getAccountSearchUrl(this.getName(), State.SearchViewState.currentQueryString);
        this._element.click(() => {
            TelemetryHelper.TelemetryHelper.traceLog({ "CrossAccountClicked": true });
            // open a new tab pointing to new search query.
            window.open(this._url, "_blank");
        });

        this._element.append(this._$link);
        this._element.append(this._$count);
    }

    private getAccountSearchUrl(accountName: string, searchText: string): string {
        var currentFilters: Core_Contracts.IFilterCategory[] = State.SearchViewState.currentFiltersDecoded,
            codeElementFilters: Core_Contracts.IFilterCategory[],
            codeElementFiltersString: string;

        if (currentFilters && currentFilters.length > 0) {
            codeElementFilters = currentFilters.filter((value: Core_Contracts.IFilterCategory, index: number) => {
                return value.name === Search_Constants.SearchConstants.CodeTypeFilters;
            });

            if (codeElementFilters && codeElementFilters.length > 0) {
                codeElementFiltersString = Filters_Helper.FiltersHelper.encodeFilters(codeElementFilters);
            }
        }

        var currentAccountSearchUrl: string = Helpers.Utils.getAccountSearchResultsViewUrl(codeElementFiltersString,
            searchText,
            Search_Constants.SearchConstants.SearchActionName,
            undefined);

        var firstIndexOfAccountName: number = currentAccountSearchUrl.indexOf("//") + 2;
        var prefix = currentAccountSearchUrl.substr(0, firstIndexOfAccountName);
        var suffix = currentAccountSearchUrl.substr(currentAccountSearchUrl.indexOf(".")).replace("#","?");

        return prefix + accountName + suffix;
    }
}
