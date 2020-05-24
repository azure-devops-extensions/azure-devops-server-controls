// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Search_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterBase");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;

export class CheckFilter extends Search_Filter_Base.FilterBase {
    private static FILTER_CHECKBOX_CSS_CLASS: string = "filter-checkbox";
    private static FILTER_COUNT_CSS_CLASS: string = "filter-count";
    private static FILTER_LABEL_CSS_CLASS: string = "filter-text";

    private _$checkBox: JQuery;
    private _$count: JQuery;
    private _$label: JQuery;
    private _filterId: string;

    constructor(options?) {
        super(options);
        this._filterId = options.filterId;
    }

    public initialize(): void {
        super.initialize();
    }

    public drawItem(filter: Core_Contracts.IFilter): void {
        var itemName = this.getName(),
            filterId = this._filterId,
            isSelected = this.getIsSelected();

        this._element.attr("tabindex", this._options.tabindex);
        this._element.attr("role", "listitem");
        this._element.attr("aria-label", itemName);
        this._element.attr("aria-pressed", isSelected.toString());

        // Create filter elements and apply default styles
        this._$checkBox = $(domElem('input')).attr('type', 'checkbox')
            .attr('tabindex', '-1')
            .addClass(CheckFilter.FILTER_CHECKBOX_CSS_CLASS)
            .attr("aria-labelledby", filterId);

        this._$label = $(domElem('div'))
            .addClass(CheckFilter.FILTER_LABEL_CSS_CLASS)
            .addClass(Search_Constants.SearchConstants.TruncateLargeTextCssClass)
            .text(itemName)
            .attr('id', filterId);

        var resultCount: number = this.getResultCount();

        // Checks whether hitCount is not equals to - 1
        if (resultCount === Search_Constants.SearchConstants.ResultsCountNotAvailable) {
            resultCount = undefined;
        }

        this._$count = $(domElem('div'))
            .addClass(CheckFilter.FILTER_COUNT_CSS_CLASS)
            .text(resultCount);

        this._$checkBox.prop('checked', this.getIsSelected());

        this._element.click(() => {
            this._$checkBox.prop('checked', !this.getIsSelected());
            super.selectedChanged(!this.getIsSelected());
        });

        this._element.append(this._$checkBox);
        this._element.append(this._$label);
        this._element.append(this._$count);
    }
 }
