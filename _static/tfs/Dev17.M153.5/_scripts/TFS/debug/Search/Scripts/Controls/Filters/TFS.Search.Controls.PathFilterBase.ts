// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Controls = require("VSS/Controls");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_Filter_Category_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterCategoryBase");
import Utils_UI = require("VSS/Utils/UI");

import domElem = Utils_UI.domElem;

export class PathFilterBase extends Controls.BaseControl{
    protected _$label: JQuery;
    private _$labelArea: JQuery;
    protected _$expander: JQuery;

    private _setExpanded: Function;

    public initialize(): void {
        super.initialize();
        this._element.addClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_GROUP_CSS_CLASS);
    }

    protected baseDrawCategory(projectName: string, textOfLabel: string, setExpanded: Function, _$clearLink?: JQuery) {
        this._setExpanded = setExpanded;

        // Create filter category elements and apply styles
        this._$labelArea = $(domElem('div')).addClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_CSS_CLASS).attr("tabindex", "-1");
        this._$expander = $(domElem('div'))
                          .addClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_SHOW_LESS_ICON_CSS_CLASS)
                          .addClass("bowtie-icon bowtie-triangle-down")
                          .addClass(Search_Filter_Category_Base.FilterCategoryBase.EXPANDED_CSS_CLASS)
                          .attr('aria-expanded', 'true');
        this._$label = $(domElem('div')).addClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_LABEL_CSS_CLASS)
            .addClass(Search_Constants.SearchConstants.TruncateLargeTextCssClass)
            .text(textOfLabel)
            .attr("aria-label", textOfLabel)
            .attr("tabindex", "0");

        // Setup expand/collapse handlers on category name and expander icon
        this._setupExpandCollapseClickHandler(this._$label);
        this._setupExpandCollapseClickHandler(this._$expander);
        this._setupExpandCollapseKeyDownHandler(this._$labelArea);

        this._$labelArea.append(this._$expander);
        this._$labelArea.append(this._$label);
        if (_$clearLink) {
            this._$labelArea.append(_$clearLink)
        };
        this._element.append(this._$labelArea);
    }

    /**
     * Sets up expand/collapse handler on given JQuery element for click event
     */
    private _setupExpandCollapseClickHandler($element: JQuery): void {
        $element.click((obj) => {
            this._setExpanded(!this._isExpanded());
        });
    }

    /**
     * Sets up expand/collapse handler on filter category area for keydown event
     */
    private _setupExpandCollapseKeyDownHandler($element: JQuery): void {
        $element.keydown((obj) => {
            if (obj.keyCode === Utils_UI.KeyCode.RIGHT) {
                this._setExpanded(true);
            }
            else if (obj.keyCode === Utils_UI.KeyCode.LEFT) {
                this._setExpanded(false);
            }
        });
    }

    private _isExpanded(): boolean {
        return this._$expander.hasClass(Search_Filter_Category_Base.FilterCategoryBase.EXPANDED_CSS_CLASS);
    }
}