// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Controls = require("VSS/Controls");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_Workitem_Constants = require("Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;

export class FilterSearchBox extends Controls.BaseControl {
    private static CORE_CSS_CLASS: string = "sidebar-search";
    private static ICON_SEARCH_CSS_CLASS: string = "bowtie-search";
    private static ICON_CANCEL_CSS_CLASS: string = "bowtie-math-multiply";
    private static SEARCH_INPUT_WRAPPER_CSS_CLASS: string = "search-input-wrapper";
    private static SEARCH_INPUT_CONTAINER_CSS_CLASS: string = "search-input-container";
    private static INPUT_CSS_CLASS: string = "input";
    private static ICON_CSS_CLASS: string = "icon";
    private static BUTTON_CSS_CLASS: string = "button";

    private _input: any;
    private _button: any;
    private _executeSearchHandler: any;
    private _clearSearchHandler: any;
    private _arrowKeyHandler: any;
    private _filterCategoryName: string;
    private _filterCategoryWaterMark: string;

    constructor(options?) {
        super(options);
        this._filterCategoryName = options.filterCategoryName || "";
    }

    public initialize(): void {
        super.initialize();
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: FilterSearchBox.CORE_CSS_CLASS
        }, options));
        this._filterCategoryWaterMark = options.waterMark;
    }

    public getSearchWaterMarkText(): string {
        return this._filterCategoryWaterMark;
    }

    public focus(): void {
        Utils_UI.Watermark(this._input, 'focus');
    }

    public _changeSearchIcon(isSearchIcon: boolean): void {
        this._button.addClass(isSearchIcon ? FilterSearchBox.ICON_SEARCH_CSS_CLASS : FilterSearchBox.ICON_CANCEL_CSS_CLASS);
        this._button.removeClass(isSearchIcon ? FilterSearchBox.ICON_CANCEL_CSS_CLASS : FilterSearchBox.ICON_SEARCH_CSS_CLASS);
    }

    public setExecuteSearchHandler(_handler: any): void {
        this._executeSearchHandler = _handler;
    }

    public setClearSearchHandler(_handler: any): void {
        this._clearSearchHandler = _handler;
    }

    public setArrowKeyHandler(_handler: any): void {
        this._arrowKeyHandler = _handler;
    }

    public drawSearchArea(): void {
        var title = this.getSearchWaterMarkText(),
            _$container: JQuery = $(domElem('div')).addClass(FilterSearchBox.SEARCH_INPUT_WRAPPER_CSS_CLASS),
            _$inputContainer: JQuery = $(domElem('div')).addClass(FilterSearchBox.SEARCH_INPUT_CONTAINER_CSS_CLASS);

        this._input = $(domElem('input'))
            .addClass(FilterSearchBox.INPUT_CSS_CLASS)
            .attr("spellcheck", "false");

        Utils_UI.Watermark(this._input, { watermarkText: title });

        this._button = $(domElem("span"))
            .addClass(FilterSearchBox.ICON_CSS_CLASS)
            .addClass(FilterSearchBox.ICON_SEARCH_CSS_CLASS)
            .addClass(FilterSearchBox.BUTTON_CSS_CLASS)

        _$inputContainer.append(this._input);
        _$container.append(this._button);
        _$container.append(_$inputContainer);
        this._element.append(_$container);

        this._attachEvents();
    }
    
    private _attachEvents(): void {
        this._bind(this._input, "focus", Utils_Core.delegate(this, this._onFocus));
        this._bind(this._input, "keydown", Utils_Core.delegate(this, this._onKeyDown));
        this._bind(this._input, "keyup", Utils_Core.delegate(this, this._onSearch));
        this._bind(this._button, "click", Utils_Core.delegate(this, this._onClearSearch));
    }

    // Handler to catch focus event on filter search box
    private _onFocus(): void {
        // Trace focus event on filter search box
        TelemetryHelper.TelemetryHelper.traceLog({ "FiltersSearchBoxFocusAction": true });
    }

    private _onSearch(e?): void {

        var searchText;

        searchText = $.trim(this._input.val());

        if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
            this._onClearSearch();
            return;
        }

        this.cancelDelayedFunction("onSearch");

        if (searchText) {
            this._changeSearchIcon(false);
            this.delayExecute("onSearch", this._options.eventTimeOut || 250, true, function () {
                if (this._executeSearchHandler !== undefined) {
                    this._executeSearchHandler(searchText);
                }
            });
        }
        else {
            this._clearSearch();
        }
    }

    private _onKeyDown(e?): void { 
        if (e.keyCode === Utils_UI.KeyCode.DOWN ||
            e.keyCode === Utils_UI.KeyCode.UP) {
            this._input.blur();
            if (this._arrowKeyHandler !== undefined) {
                this._arrowKeyHandler(e);
            }

            return;
        }
    }

    private _onClearSearch(): void {
        this._input.val("");
        this._input.blur();
        this._clearSearch();
    }

    private _clearSearch(): void {
        this._changeSearchIcon(true);

        if (this._clearSearchHandler !== undefined) {
            this._clearSearchHandler();
        }
    }
}