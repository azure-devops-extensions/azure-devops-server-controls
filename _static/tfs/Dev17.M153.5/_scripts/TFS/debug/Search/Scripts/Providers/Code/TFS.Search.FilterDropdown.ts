// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Controls = require("VSS/Controls");
import SearchBoxHelper = require("Search/Scripts/Common/TFS.Search.SearchBoxHelper");
import Search_Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");

var domElem = Utils_UI.domElem;
var filterTypeEnum = {
    scopeFilters: 0,
    defaultCodeFilters: 1,
    operators: 2
}

export interface SearchFilterDropdownOptions {
    onSetSearchBoxValue: (text: string) => void;
}

export class SearchFilterDropdown extends Controls.BaseControl implements TFS_Host_UI.ISearchBoxDropdownControl {
    private static ENTITY_SEARCH_CSS_CLASS: string = "entity-search";
    private static FILTER_DROPDOWN_CSS_CLASS: string = "search-filter-dropdown";
    private static FILTER_ELEMENT_CSS_CLASS: string = "search-filter-element";
    private static OPERATOR_ELEMENT_CSS_CLASS: string = "search-operator-element";
    private static CODEFILTER_ELEMENT_WRAPPER_CSS_CLASS: string = "search-codefilter-element-wrapper";
    private static FILTER_ELEMENT_WRAPPER_CSS_CLASS: string = "search-filter-element-wrapper";
    private static SHOW_MORE_OR_LESS_LABEL_CSS_CLASS: string = "dropdown-show-more-or-less-label";
    private static SHOW_MORE_OR_LESS_ELEMENT_CSS_CLASS: string = "dropdown-show-more-or-less-element"
    private static SEARCH_HELPER_DROPDOWN_ROW: string = "search-helper-dropdown-row"
    private static SHOW_MORE_ICON_CSS_CLASS: string = "show-more-icon";
    private static SHOW_LESS_ICON_CSS_CLASS: string = "show-less-icon";
    private static SHOW_MORE_AREA_CSS_CLASS: string = "show-more-area";

    private static SEARCH_HELPER_DROPDOWN_ROW_SELECTOR: string = ".search-helper-dropdown-row";
    private static FILTER_ELEMENT_CSS_SELECTOR: string = ".search-filter-element";
    private static OPERATOR_ELEMENT_CSS_SELECTOR: string = ".search-operator-element"
    private static RESULTS_PANE_CSS_SELECTOR: string = ".search-view-results-pane";
    private static SHOW_MORE_OR_LESS_LABEL_SELECTOR: string = ".dropdown-show-more-or-less-label";
    private static SHOW_MORE_AREA_SELECTOR: string = ".show-more-area";

    private static codeFilterUsabilityExample: string = "(e.g., func:ApiRoot)";
    private static scopeFilterUsabilityExample: string = "(e.g., Activity ext:cs)";
    private static operatorsUsabilityExample: string = "(e.g., ToDo OR revisit)";

    private static helpLink: string = Constants.SearchConstants.CodeLearnMoreLink;

    private _$filterDropdown: JQuery;
    private _$remainingCodeFilterElements: JQuery[] = [];
    private _$inputTextBox: JQuery;
    private isEscaped: boolean;
    private defaultCodeFiltersMap =
    [
        ["Argument", "arg:"],
        ["Basetype", "basetype:"],
        ["Caller", "caller:"],
        ["Class", "class:"],
        ["Class Declaration", "classdecl:"],
        ["Class Definition", "classdef:"],
        ["Comment", "comment:"],
        ["Constructor", "ctor:"],
        ["Declaration", "decl:"],
        ["Definition", "def:"],
    ];

    private remainingCodeFiltersMap =
    [
        ["Destructor", "dtor:"],
        ["Enumerator", "enum:"],
        ["Extern", "extern:"],
        ["Field", "field:"],
        ["Friend", "friend:"],
        ["Function", "func:"],
        ["Function Declaration", "funcdecl:"],
        ["Function Definition", "funcdef:"],
        ["Global", "global:"],
        ["Header", "header:"],
        ["Interface", "interface:"],
        ["Macro", "macro:"],
        ["Macro Definition", "macrodef:"],
        ["Macro Reference", "macroref:"],
        ["Method", "method:"],
        ["Method Declaration", "methoddecl:"],
        ["Method Definition", "methoddef:"],
        ["Namespace", "namespace:"],
        ["Property", "prop:"],
        ["Reference", "ref:"],
        ["String Literal", "strlit:"],
        ["Struct", "struct:"],
        ["Struct Declaration", "structdecl:"],
        ["Struct Definition", "structdef:"],
        ["Template Argument", "tmplarg:"],
        ["Template Specification", "tmplspec:"],
        ["Type", "type:"],
        ["Type Definition", "typedef:"],
        ["Union", "union:"]
    ];

    private scopeFiltersMap =
    [
        [Search_Resources.FilterDropdownExtensionFilterDescription, "ext:"],
        [Search_Resources.FilterDropdownFileFilterDescription, "file:"],
        [Search_Resources.FilterDropdownPathFilterDescription, "path:"],
        [Search_Resources.FilterDropdownProjectFilterDescription, "proj:"],
        [Search_Resources.FilterDropdownRepoFilterDescription, "repo:"]
    ];

    private operators = ["AND", "NOT", "OR"];

    constructor(options?: SearchFilterDropdownOptions) {
        super(options);
        this._$filterDropdown = SearchFilterDropdown.createFilterDropdownElement();
        this.drawSection(filterTypeEnum.scopeFilters);
        this.drawSection(filterTypeEnum.defaultCodeFilters);
        this.drawRemainingCodeElementFilters();
        this.drawSection(filterTypeEnum.operators);
        this.addHelpLink();
        this._$filterDropdown.hide();
    }

    public bind(_$inputTextBox: JQuery, isLargeSearchBox: boolean): void {
        if (_$inputTextBox) {
            this._$inputTextBox = _$inputTextBox;
            var hideFilterDropdownOnClickOnBackground = Utils_Core.delegate(this, (e) => {
                if (!_$inputTextBox.is(e.target) &&
                    _$inputTextBox.has(e.target).length === 0 &&
                    !this._$filterDropdown.is(e.target) &&
                    this._$filterDropdown.has(e.target).length === 0) {
                    this.hide();
                }
            }),
                event;

            if (isLargeSearchBox) {
                event = "click.MainSearchBoxCodeSearchDropdown";
                this._$filterDropdown.attr("id", "code-dropdown");
                this._$inputTextBox.attr("aria-owns", "code-dropdown").attr("aria-controls", "code-dropdown");
            }
            else {
                event = "click.GlobalSearchBoxCodeSearchDropdown";
                this._$filterDropdown.attr("id", "multi-entity-code-dropdown");
                this._$inputTextBox.attr("aria-owns", "multi-entity-code-dropdown").attr("aria-controls", "multi-entity-code-dropdown");
            }

            $(document)
                .unbind(event)
                .bind(event, hideFilterDropdownOnClickOnBackground);

            _$inputTextBox
                .unbind("click.SearchFilterDropdown")
                .bind("click.SearchFilterDropdown", Utils_Core.delegate(this, this.show))
                .unbind("keydown.SearchFilterDropdown")
                .bind("keydown.SearchFilterDropdown", Utils_Core.delegate(this, this._onSearchBoxKeyDown, isLargeSearchBox))

            // Focus binding is required only for MainSearchBox as the
            // binding for L1 search box is done in TFS.Host.MultiEntitySearch.ts
            if (isLargeSearchBox) {
                _$inputTextBox
                .unbind("focus.SearchFilterDropdown")
                    .bind("focus.SearchFilterDropdown", Utils_Core.delegate(this, this.show))
            }

            this._$filterDropdown.unbind('keydown.helperNavigation')
                .bind('keydown.helperNavigation', Utils_Core.delegate(this, this._onHelperKeyDown));
            this._$filterDropdown.unbind('keyup.helperNavigation')
                .bind('keyup.helperNavigation', Utils_Core.delegate(this, this._onHelperKeyUp));
        }
    }

    public unbind(_$inputTextBox: JQuery): void {
        if (_$inputTextBox) {
            // have different namespaces for click event. One for the drop down from main-searchbox and the other for the drop down from
            // entity search box.
            var clickEventNamespace: string = _$inputTextBox.parent().hasClass("large-search-box")
                ? "MainSearchBox"
                : "GlobalSearchBox",
                event = "click.{0}CodeSearchDropdown".replace("{0}", clickEventNamespace);

            $(document).unbind(event);
            _$inputTextBox
                .unbind("keyup.SearchFilterDropdown")
                .unbind("focus.SearchFilterDropdown")
                .unbind("click.SearchFilterDropdown")
                .unbind("keydown.SearchFilterDropdown");
        }
    }

    // Hides the filter dropdown
    public hide(): void {
        this._$filterDropdown.hide();
        if (this._$inputTextBox) {
            this._$inputTextBox.attr("aria-expanded", "false");
        }
        // reset menu item selection
        let _$highlightedElement = $(SearchFilterDropdown.SEARCH_HELPER_DROPDOWN_ROW_SELECTOR + ".highlighted");
        _$highlightedElement.removeClass("highlighted");
    }

    // Shows filter dropdown on event callbacks
    public show(): void {
        if (!this.isEscaped) {
            this._$filterDropdown.show();
            if (this._$inputTextBox) {
                this._$inputTextBox.attr("aria-expanded", "true");
            }
        }
        else {
            this.isEscaped = false;
        }
    }

    // Creates code search help dropdown and returns the DOM element
    public getPopup(): JQuery {
        return this._$filterDropdown;
    }

    private _onHelperKeyUp(e: JQueryEventObject) {
        let _$highlightedElement = $(SearchFilterDropdown.SEARCH_HELPER_DROPDOWN_ROW_SELECTOR + ".highlighted");

        if (e.keyCode === Utils_UI.KeyCode.ENTER ||
            e.keyCode === Utils_UI.KeyCode.SPACE) {

            if (_$highlightedElement.hasClass(SearchFilterDropdown.SHOW_MORE_AREA_CSS_CLASS)) {
                $(SearchFilterDropdown.SHOW_MORE_OR_LESS_LABEL_SELECTOR).click();
                this.show();
                _$highlightedElement = $(SearchFilterDropdown.SHOW_MORE_AREA_SELECTOR);
                _$highlightedElement.focus();

                //Scrolling to bring the selected show-less button into view
                Utils_UI.Positioning.scrollIntoViewVertical(_$highlightedElement, Utils_UI.Positioning.VerticalScrollBehavior.Bottom);
            }
            else if (_$highlightedElement.is('a')) {
                _$highlightedElement[0].click();
            }
            else {
                let text: string = _$highlightedElement[0].firstChild.textContent;
                this.onHelpMenuItemSelection(null, text);
                this._$inputTextBox[0].focus();
                _$highlightedElement.removeClass("highlighted");
            }
        }
    }

    private _onHelperKeyDown(e: JQueryEventObject) {
        let _$highlightedElement = $(SearchFilterDropdown.SEARCH_HELPER_DROPDOWN_ROW_SELECTOR + ".highlighted");
        let elementList = $(SearchFilterDropdown.SEARCH_HELPER_DROPDOWN_ROW_SELECTOR, this._$filterDropdown);
        let operatorList = $(SearchFilterDropdown.OPERATOR_ELEMENT_CSS_SELECTOR, this._$filterDropdown);

        if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
            this.hide();
            this.isEscaped = true;
            this._$inputTextBox.focus();
            return false;
        }
        else if (e.keyCode === Utils_UI.KeyCode.TAB) {
            // TAB KEY
            this.hide();
            return false;
        }
        else if (e.keyCode === Utils_UI.KeyCode.UP) {
            //UP ARROW
            _$highlightedElement.removeClass("highlighted");

            //Handle up arrow when any operator element is selected
            if (_$highlightedElement.hasClass(SearchFilterDropdown.OPERATOR_ELEMENT_CSS_CLASS)) {
                _$highlightedElement = operatorList.first();
            }

            let index = elementList.index(_$highlightedElement);
            index = (index - 1 + elementList.length) % (elementList.length);
            _$highlightedElement = elementList.eq(index);

            //Handle Up arrow when switching to operator element
            if (_$highlightedElement.hasClass(SearchFilterDropdown.OPERATOR_ELEMENT_CSS_CLASS)) {
                _$highlightedElement = operatorList.first();
            }

            //setting up the new element
            _$highlightedElement.focus();
            _$highlightedElement.addClass("highlighted")
            Utils_UI.Positioning.scrollIntoViewVertical(_$highlightedElement, Utils_UI.Positioning.VerticalScrollBehavior.Top);

            //stop default scroll behavious.
            e.preventDefault();
        }

        else if (e.keyCode === Utils_UI.KeyCode.DOWN) {
            //DOWN ARROW
            _$highlightedElement.removeClass("highlighted");

            //handle down arrow when initially operator element is selected
            if (_$highlightedElement.hasClass(SearchFilterDropdown.OPERATOR_ELEMENT_CSS_CLASS)) {
                _$highlightedElement = operatorList.last();
            }

            //setting up the new selected element
            let index = elementList.index(_$highlightedElement);
            index = (index + 1) % (elementList.length);
            _$highlightedElement = elementList.eq(index);
            _$highlightedElement.focus();
            _$highlightedElement.addClass("highlighted")
            Utils_UI.Positioning.scrollIntoViewVertical(_$highlightedElement, Utils_UI.Positioning.VerticalScrollBehavior.Bottom);

            //stop default scroll behavious.
            e.preventDefault();
        }

        else if (e.keyCode === Utils_UI.KeyCode.LEFT) {
            //LEFT ARROW
            if (_$highlightedElement.hasClass(SearchFilterDropdown.OPERATOR_ELEMENT_CSS_CLASS)) {

                _$highlightedElement.removeClass("highlighted");
                //setting up the new selected element
                let index = operatorList.index(_$highlightedElement);
                index = (index - 1 + operatorList.length) % (operatorList.length);
                _$highlightedElement = operatorList.eq(index);
                _$highlightedElement.focus();
                _$highlightedElement.addClass("highlighted");
            }
        }

        else if (e.keyCode === Utils_UI.KeyCode.RIGHT) {
            //RIGHT ARROW
            if (_$highlightedElement.hasClass(SearchFilterDropdown.OPERATOR_ELEMENT_CSS_CLASS)) {
                _$highlightedElement.removeClass("highlighted");

                //setting up the new selected element
                let index = operatorList.index(_$highlightedElement);
                index = (index + 1) % (operatorList.length);
                _$highlightedElement = operatorList.eq(index);
                _$highlightedElement.focus();
                _$highlightedElement.addClass("highlighted");
            }
        }
    }

    private _onSearchBoxKeyDown(e: JQueryEventObject, isLargeSearchBox: boolean) {
        let elementList = $(SearchFilterDropdown.SEARCH_HELPER_DROPDOWN_ROW_SELECTOR, this._$filterDropdown);
        let _$highlightedElement = $(SearchFilterDropdown.SEARCH_HELPER_DROPDOWN_ROW_SELECTOR + ".highlighted");

        if (e.keyCode === Utils_UI.KeyCode.ESCAPE ||
           //ESCAPE/TAB/ENTER KEY
                e.keyCode === Utils_UI.KeyCode.TAB ||
                e.keyCode === Utils_UI.KeyCode.ENTER) {
            this.hide();
        }

        else if (e.keyCode === Utils_UI.KeyCode.DOWN) {
            //DOWN ARROW
            let index = 0;
            if (_$highlightedElement.length != 0) {
                _$highlightedElement.removeClass("highlighted");
                index = elementList.index(_$highlightedElement);
                index = (index + 1) % (elementList.length);
            }

            _$highlightedElement = elementList.eq(index);
            _$highlightedElement.focus();
            _$highlightedElement.addClass("highlighted");
            Utils_UI.Positioning.scrollIntoViewVertical(_$highlightedElement, Utils_UI.Positioning.VerticalScrollBehavior.Bottom);

            e.preventDefault();
        }

        else if (e.keyCode === Utils_UI.KeyCode.UP) {
            //UP ARROW
            if (_$highlightedElement.length != 0) {
                _$highlightedElement.removeClass("highlighted");
                let index = elementList.index(_$highlightedElement);
                index = (index - 1 + elementList.length) % (elementList.length);
                _$highlightedElement = elementList.eq(index);
                _$highlightedElement.focus();
                _$highlightedElement.addClass("highlighted");
                Utils_UI.Positioning.scrollIntoViewVertical(_$highlightedElement, Utils_UI.Positioning.VerticalScrollBehavior.Bottom);
                e.preventDefault();
            }
        }

    }

    // Displays "show more" link if needed
    private drawShowMoreLink(_$filtersWrapper: JQuery): void {
        var _$showMoreOrLessArea = SearchFilterDropdown.createShowMoreOrLessElement()
                .addClass(SearchFilterDropdown.SHOW_MORE_AREA_CSS_CLASS),
            _$showMoreOrLessIcon = SearchFilterDropdown.createShowMoreOrLessIconlElement()
                .appendTo(_$showMoreOrLessArea)
                .addClass(SearchFilterDropdown.SHOW_MORE_ICON_CSS_CLASS).addClass("bowtie-icon bowtie-triangle-down"),
            _$showMoreOrLessLabel = SearchFilterDropdown.createShowMoreOrLessLabelElement().appendTo(_$showMoreOrLessArea);

        _$showMoreOrLessLabel.text(Search_Resources.ShowMoreLabel);

        _$showMoreOrLessArea.appendTo(_$filtersWrapper)

        _$showMoreOrLessLabel.click((e) => {
            this.toggleShowMoreOrLess(_$filtersWrapper, _$showMoreOrLessArea, _$showMoreOrLessLabel, _$showMoreOrLessIcon);
        });

        _$showMoreOrLessIcon.click((e) => {
            this.toggleShowMoreOrLess(_$filtersWrapper, _$showMoreOrLessArea, _$showMoreOrLessLabel, _$showMoreOrLessIcon);
        });
    }

    // Updates show more/less label and icon, re-draws filters based on the action show more/less 
    private toggleShowMoreOrLess(_$container: JQuery, _$area: JQuery, _$label: JQuery, _$icon: JQuery): void {
        if (_$label.text() === Search_Resources.ShowMoreLabel) {
            this.showRemainingCodeFilters(_$container, _$label, _$icon);
            TelemetryHelper.TelemetryHelper.traceLog({ "FiltersHelpDropdownShowMoreAction": true });
        }
        else {
            this.hideRemainingCodeFilters(_$label, _$icon);
        }
    }
    // Expands the remaining code element filters
    private showRemainingCodeFilters(_$container: JQuery, _$label: JQuery, _$icon: JQuery): void {
        _$label.text(Search_Resources.ShowLessLabel);
        _$icon.removeClass(SearchFilterDropdown.SHOW_MORE_ICON_CSS_CLASS).removeClass("bowtie-icon bowtie-triangle-down");
        _$icon.addClass(SearchFilterDropdown.SHOW_LESS_ICON_CSS_CLASS).addClass("bowtie-icon bowtie-triangle-up");
        this.attachRemainingFilters(_$container);
    }

    // Collapse the remaining code filters resets to default code filters
    private hideRemainingCodeFilters(_$label: JQuery, _$icon: JQuery): void {
        _$label.text(Search_Resources.ShowMoreLabel);
        _$icon.removeClass(SearchFilterDropdown.SHOW_LESS_ICON_CSS_CLASS).removeClass("bowtie-icon bowtie-triangle-up");
        _$icon.addClass(SearchFilterDropdown.SHOW_MORE_ICON_CSS_CLASS).addClass("bowtie-icon bowtie-triangle-down");
        this.detachRemainingFilters();
    }

    // Draws the remaining code element filters
    private drawRemainingCodeElementFilters(): void {
        for (var i = 0; i < this.remainingCodeFiltersMap.length; i++) {
            //$filterElementContainer is a container div for codeelements div and codeelement description div 
            var $filterElementContainer: JQuery =
                SearchFilterDropdown.createFilterAndDescriptionContainerElement(this.remainingCodeFiltersMap[i][0]);

            SearchFilterDropdown.createFilterElement("span")
                .appendTo($filterElementContainer)
                .text(this.remainingCodeFiltersMap[i][1])
            SearchFilterDropdown.createFilterDescriptionElement("span")
                .appendTo($filterElementContainer)
                .text(this.remainingCodeFiltersMap[i][0]);
            this._$remainingCodeFilterElements.push($filterElementContainer);
        }
    }

    // Attach non-displayed filters on "show more" operation
    private attachRemainingFilters(_$container: JQuery): void {
        var codeElementsWrapper = $(".search-codefilter-element-wrapper", _$container);
        for (var i = 0; i < this.remainingCodeFiltersMap.length; i++) {
            codeElementsWrapper
                .append(
                this._$remainingCodeFilterElements[i]
                    .unbind('click')
                    .bind('click', Utils_Core.delegate(this, this.onHelpMenuItemSelection, this.remainingCodeFiltersMap[i][1])));
        }
    }

    // On "show less" operation, rest of the filters are disposed
    private detachRemainingFilters(): void {
        for (var i = 0; i < this.remainingCodeFiltersMap.length; i++) {
            this._$remainingCodeFilterElements[i].remove();
        }
    }

    // Inserts a text value inside the search box
    private insertFilterValueIntoSearchBox($searchBox: JQuery, text: any, addSpaceAfterFilterElement: string): void {
        var currentCursorPositionInSearchBox: number = SearchBoxHelper.SearchBoxHelper.getCaretPosition(SearchBoxHelper.SearchBoxHelper.getSearchBoxElement($searchBox)),
            searchText: string = $searchBox.val(),
            clickedFilterText: string = text;

        if (searchText === " ") {
            searchText = clickedFilterText;
            currentCursorPositionInSearchBox = clickedFilterText.length;
        }
        else {
            // adding spaces with filter text
            var stringBeforeCaretPosition: string = searchText.substring(0, currentCursorPositionInSearchBox).trim() + " " + clickedFilterText + addSpaceAfterFilterElement;
            var stringAfterCaretPosition: string = searchText.substring(currentCursorPositionInSearchBox, searchText.length).trim();

            searchText = stringBeforeCaretPosition + stringAfterCaretPosition;
            currentCursorPositionInSearchBox = stringBeforeCaretPosition.length;
        }

        if (this._options.onSetSearchBoxValue) {
            this._options.onSetSearchBoxValue(searchText);
        }

        $searchBox.val(searchText);
        SearchBoxHelper.SearchBoxHelper.setCaretPosition(SearchBoxHelper.SearchBoxHelper.getSearchBoxElement($searchBox), currentCursorPositionInSearchBox);
    }

    private addHelpLink(): void {
        var _$filtersWrapper = $(domElem("div")),
            _$helpLink = SearchFilterDropdown.createHelpLinkElement();

        SearchFilterDropdown
            .createHelpLinkTextElement()
            .appendTo(_$filtersWrapper)
            .text(Search_Resources.HelpLinkDescriptionText);

        $(domElem('a', SearchFilterDropdown.SEARCH_HELPER_DROPDOWN_ROW))
            .appendTo(_$helpLink)
            .text(Search_Resources.CodeSearchHelpLinkText)
            .attr("tabindex", "-1")
            .attr('target', '_blank')
            .attr('href', SearchFilterDropdown.helpLink)
            .attr('alt', 'See advanced help topics')
            .trigger('click');

        // Handler to catch click on filter dropdown help link
        var traceHelpLinkClick = Utils_Core.delegate(this, (e) => {
            TelemetryHelper.TelemetryHelper.traceLog({ "FilterDropdownHelpLink": true });
        });

        _$helpLink.unbind("click", traceHelpLinkClick).bind("click", traceHelpLinkClick);

        _$filtersWrapper.append(_$helpLink);
        this._$filterDropdown.append(_$filtersWrapper);
    }

    // Draws particular section of dropdown based on filters
    private drawSection(filterType): void {
        var properties: any = this.getFilterPropertiesByType(filterType),
            filterTypeText: string = properties.filterTypeText,
            filterTypeUsabilityExampleString: string = properties.filterTypeUsabilityExampleString,
            filterMap: any = properties.filterMap,
            _$filtersWrapper: JQuery = $(domElem("div")),
            _$filterElementWrapper: JQuery;

        SearchFilterDropdown.createFilterTypeElement().appendTo(_$filtersWrapper).text(filterTypeText);
        SearchFilterDropdown.createFilterTypeExampleElement().appendTo(_$filtersWrapper).text(filterTypeUsabilityExampleString);

        if (filterType === filterTypeEnum.defaultCodeFilters) {
            _$filterElementWrapper = SearchFilterDropdown.createCodeFilterWrapperElement().appendTo(_$filtersWrapper);
        }
        else {
            _$filterElementWrapper = SearchFilterDropdown.createFilterWrapperElement().appendTo(_$filtersWrapper);
        }

        for (var i = 0; i < filterMap.length; i++) {
            if (filterType === filterTypeEnum.operators) {
                SearchFilterDropdown
                    .createSearchOperatorElement()
                    .appendTo(_$filterElementWrapper)
                    .addClass(SearchFilterDropdown.SEARCH_HELPER_DROPDOWN_ROW)
                    .text(filterMap[i])
                    .attr('aria-label', filterMap[i])
                    .bind('click', Utils_Core.delegate(this, this.onHelpMenuItemSelection, filterMap[i]));
            }
            else {
                //$filterElementContainer is a container div for codeelements div and codeelement description div 
                var $filterElementContainer: JQuery = SearchFilterDropdown
                    .createFilterAndDescriptionContainerElement(filterMap[i][0])
                    .appendTo(_$filterElementWrapper)
                    .bind('click', Utils_Core.delegate(this, this.onHelpMenuItemSelection, filterMap[i][1]));

                SearchFilterDropdown
                    .createFilterElement()
                    .appendTo($filterElementContainer)
                    .text(filterMap[i][1]);

                SearchFilterDropdown
                    .createFilterDescriptionElement()
                    .appendTo($filterElementContainer)
                    .text(filterMap[i][0]);
            }
        }

        // draw show more link if required.
        if (filterType === filterTypeEnum.defaultCodeFilters) {
            this.drawShowMoreLink(_$filtersWrapper);
        }

        this._$filterDropdown.append(_$filtersWrapper);
    }

    private getFilterPropertiesByType(filterType: number): any {
        var filterMap: any, filterTypeText: string, filterTypeUsabilityExampleString: string;
        if (filterType === filterTypeEnum.scopeFilters) {
            filterMap = this.scopeFiltersMap;
            filterTypeText = Search_Resources.FilterDropdownScopeFilterTipHeading;
            filterTypeUsabilityExampleString = SearchFilterDropdown.scopeFilterUsabilityExample;
        }
        else if (filterType === filterTypeEnum.defaultCodeFilters) {
            filterMap = this.defaultCodeFiltersMap;
            filterTypeText = Search_Resources.FilterDropdownCodeFilterTipHeading;
            filterTypeUsabilityExampleString = SearchFilterDropdown.codeFilterUsabilityExample
        }
        else {
            filterMap = this.operators;
            filterTypeText = Search_Resources.FilterDropdownOperatorsTipHeading;
            filterTypeUsabilityExampleString = SearchFilterDropdown.operatorsUsabilityExample
        }

        return {
            filterMap: filterMap,
            filterTypeText: filterTypeText,
            filterTypeUsabilityExampleString: filterTypeUsabilityExampleString
        };
    }

    private onHelpMenuItemSelection(e: JQueryEventObject, text: string): void {
        if (this._$inputTextBox) {
            this.insertFilterValueIntoSearchBox(this._$inputTextBox, text, "");
            var helpDropdownAttachedTo: string = this._$inputTextBox.parent().hasClass("large-search-box")
                ? "MainSearchBox"
                : "GlobalSearchBox";

            TelemetryHelper.TelemetryHelper.traceLog({ "FiltersHelpDropdownQueryFilterAction": text, "AssociatedSearchBox": helpDropdownAttachedTo });
        }

    }

    /**
    * Helpers for filter dropown DOM element with embedded css
    * CSS from style sheet are not applied as these styles must be available to show help from
    * L0 search box too (search styles css is not part of corecss)
    */
    private static createFilterDropdownElement(): JQuery {
        return $(domElem("div", SearchFilterDropdown.FILTER_DROPDOWN_CSS_CLASS)).addClass(SearchFilterDropdown.ENTITY_SEARCH_CSS_CLASS)
            .css("display", "block")
            .css("border", "1px solid #cccccc")
            .css("background-color", "#FFFFFF")
            .css("position", "absolute")
            .css("z-index", "30000")
            .css("width", "262px")
            .css("min-width", "220px")
            .css("overflow-y", "auto")
            .css("max-height", "calc(80vh)")
            .css("box-shadow", "3px 3px 3px rgba(160,160,160,0.5)")
            .css("text-align", "left"); 
    }

    private static createFilterTypeElement(): JQuery {
        return $(domElem("div"))
            .css("text-overflow", "ellipsis")
            .css("padding", "10px 0px 5px 10px")
            .css("font-weight", "bold")
            .css("display", "inline-block")
            .css("white-space", "nowrap");
    }

    private static createFilterTypeExampleElement(): JQuery {
        return $(domElem("div"))
            .css("display", "inline-block")
            .css("color", " #666666")
            .css("text-overflow", "ellipsis")
            .css("padding-left", "5px")
            .css("white-space", "nowrap");
    }

    private static createFilterElement(type: string = "div"): JQuery {
        return $(domElem(type, SearchFilterDropdown.FILTER_ELEMENT_CSS_CLASS))
            .css("display", "inline-block")
            .css("color", " #106ebe")
            .css("margin-left","8px")
            .css("text-overflow", "ellipsis")
            .css("cursor", "pointer")
            .css("min-width", "70px");
    }

    private static createFilterDescriptionElement(type: string = "div"): JQuery {
        return $(domElem(type))
            .css("display", "inline-block")
            .css("color", " #666666")
            .css("text-overflow", "ellipsis")
            .css("width", "30%")
            .css("min-width", "120px");
    }

    private static createCodeFilterWrapperElement(): JQuery {
        return $(domElem("div", SearchFilterDropdown.CODEFILTER_ELEMENT_WRAPPER_CSS_CLASS))
            .css("overflow", "hidden")
            .css("padding", "2px 0px 2px 0px")
            .css("margin-bottom", "3px");
    }

    private static createFilterWrapperElement(): JQuery {
        return $(domElem("div", SearchFilterDropdown.FILTER_ELEMENT_WRAPPER_CSS_CLASS))
            .css("padding", "2px 0px 2px 0px")
            .css("margin-bottom", "3px");
    }

    private static createHelpLinkElement(): JQuery {
        return $(domElem("div"))
            .css("display", "inline-block")
            .attr('aria-label', "Help page link")
            .attr('role', 'link');
    }

    private static createHelpLinkTextElement(): JQuery {
        return $(domElem("div"))
            .css("padding", "10px 5px 10px 10px")
            .css("text-overflow", "ellipsis")
            .css("display", "inline-block")
            .css("white-space", "nowrap")
            .css("color", "#666666");
    }

    private static createSearchOperatorElement(): JQuery {
        return $(domElem("div", SearchFilterDropdown.OPERATOR_ELEMENT_CSS_CLASS))
            .css("display", "inline-block")
            .css("color", "#106ebe")
            .css("cursor", "pointer")
            .css("margin-left", "10px")
            .css("text-overflow", "ellipsis")
            .attr("tabindex", "-1")
            .attr("role","text");
    }

    private static createShowMoreOrLessElement(): JQuery {
        return $(domElem("div", SearchFilterDropdown.SEARCH_HELPER_DROPDOWN_ROW))
            .css("margin-top", "2px")
            .attr("tabindex", "-1")
            .attr("role", "button")
            .attr("aria-label","show more/less");
    }

    private static createShowMoreOrLessLabelElement(): JQuery {
        return $(domElem("div", SearchFilterDropdown.SHOW_MORE_OR_LESS_LABEL_CSS_CLASS))
            .css("margin-top", "-19px")
            .css("margin-left", "30px")
            .css("color", "#106ebe")
            .css("cursor", "pointer");
    }

    private static createShowMoreOrLessIconlElement(): JQuery {
        return $(domElem("div"))
            .css("display", "inline-block")
            .css("height", "14px")
            .css("width", "12px")
            .css("margin-left", "8px")
            .css("vertical-align", "middle")
            .css("cursor", "pointer");
    }

    private static createFilterAndDescriptionContainerElement(label: string): JQuery {
        return $(domElem("div", SearchFilterDropdown.SEARCH_HELPER_DROPDOWN_ROW))
            .css("width", "100%")
            .css("min-width", "190px")
            .css("cursor", "pointer")
            .attr("tabindex", "-1")
            .attr("role", "text")
            .attr("aria-label", label);
    }
}
