// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Controls = require("VSS/Controls");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterBase");
import Search_Filter_Category_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterCategoryBase");
import Search_Filter_Category_Link = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.LinkFilterCategory");
import Search_Filter_Category_Account = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.AccountFilterCategory");
import Search_Filter_Category_Multi = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.MultiSelectFilterCategory");
import Search_Filter_Category_Path_Scope = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.PathScopeFilterCategory");
import Search_Filter_Category_Branch_Scope = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.BranchScopeFilterCategory");
import Search_Filter_Category_Area_Path = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.AreaPathFilterControl");
import Search_Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Search_Navigation = require("Search/Scripts/Common/TFS.Search.NavigationExtensions");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");

import {WorkItemConstants} from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";

import domElem = Utils_UI.domElem;
import delegate = Utils_Core.delegate;

export class FilterArea extends Controls.BaseControl {
    private static FILTER_AREA_CSS_CLASS: string = "search-filter-picker";
    private static LINE_SEPARATOR_CSS_CLASS: string = "line-separator";
    private static FILTERS_CATEGORY_GROUP_TITLE_AREA_CSS_CLASS: string = "filters-category-group-title-area";
    private static FILTER_PANE_TOGGLE_BUTTON_CSS_SELECTOR: string = ".toggle-button";

    private static ACTION_DELAY_TIME_IN_MS: number = 300;
    private static SEARCH_IN_CATEGORY_GROUP: number = 1;
    private static REFINE_BY_CATEGORY_GROUP: number = 2;

    private _filterCategoryShowMoreLinkState: any;
    private _scrollOffset: any;
    private _selectedProjectName: string = "";
    private _navigationhandler: Search_Navigation.INavigationHandler;
    private _filterCategories: Search_Filter_Category_Base.IFilterCategoryBase[];
    private _$scopePathFilterCategoryCache: any;

    private _$lineSeparatorEnd: JQuery;
    private _$otherSourcesCategoryArea: JQuery;
    private _isSourceExplorerViewUsageLogged: boolean;
    private _isPathScopeInputTextBoxUsageLogged: boolean;
    private _delayTime: number;

    constructor(options?) {
        super(options);
        this._filterCategoryShowMoreLinkState = {};
        this._$scopePathFilterCategoryCache = {};
        this._scrollOffset = {};
        this._isPathScopeInputTextBoxUsageLogged = false;
        this._isSourceExplorerViewUsageLogged = false;
    }

    public initialize() {
        super.initialize();

        this._element.addClass(FilterArea.FILTER_AREA_CSS_CLASS).attr("role", "region").attr("aria-label", Search_Resources.SearchFilterAreaAriaLabel);
        this._element.parent().bind("scroll", delegate(this, this._setScrollPosition));
    }

    public clear(): void {
        if (this._filterCategories && this._filterCategories.length > 0) {
            for (var i in this._filterCategories) {
                this._filterCategories[i].dispose();
            }

            this._filterCategories = null;
            this._element.empty();
        }
    }

    // Primary function responsible for drawing the entire filter pane
    public drawFilterControl(filterCategories: Core_Contracts.IFilterCategoryName[], scopeFiltersActionDelay?: number, entityTypeId?: string): void {
        this._delayTime = scopeFiltersActionDelay ? scopeFiltersActionDelay : FilterArea.ACTION_DELAY_TIME_IN_MS;

        // The callback for when an item is selected. Iterate over all filters to see which are selected and perform the navigation.
        var selectionChangedHandler: Search_Filter_Base.FilterItemClickHandler = (selectedNode?: any) => {
            // Following adds the filter selection event to a delay map. It holds the request for said milli seconds
            // so that, if user selects different filters in the meantime, newer requests override the existing one
            // i.e it provides a way to ignore older multiple selections within the delay interval
            this.delayExecute("SearchFilterSelectionChanged", this._delayTime, true, () => {
                this._navigationhandler.filterSelectionChanged(this.findSelected(selectedNode));
            });
        }

        this.clear();
        this._$lineSeparatorEnd = $("<div />").addClass(FilterArea.LINE_SEPARATOR_CSS_CLASS);
        this._filterCategories = new Array<Search_Filter_Category_Base.FilterCategoryBase>();

        var _$fragment: JQuery = $(document.createDocumentFragment());

        if (!entityTypeId || entityTypeId === Search_Constants.SearchConstants.CodeEntityTypeId) {
            this.drawSearchInCategoryFilters(filterCategories, selectionChangedHandler, _$fragment);
            this.drawRefineByCategoryFilters(filterCategories, selectionChangedHandler, _$fragment);
        }
        else if (entityTypeId === Search_Constants.SearchConstants.WorkItemEntityTypeId) {
            this.drawWorkItemFilters(filterCategories, selectionChangedHandler, _$fragment);
        }

        // Handler to catch click event on filter pane toggle icon
        $(FilterArea.FILTER_PANE_TOGGLE_BUTTON_CSS_SELECTOR).click((e: JQueryEventObject) => {
            // Trace the current mode of filter pane when the toggle icon was clicked
            TelemetryHelper.TelemetryHelper.traceLog({ "CurrentFilterPaneMode": $(e.currentTarget).attr('title') });
        })

        this._element.append(_$fragment);
        this.afterDomUpdate();
    }

    public appendOtherSourcesFilters(filterCategories: Core_Contracts.IFilterCategoryName[]): void {
        // TODO : Current State : If the Filter Area is not in appendable state (initialized and other filters are drawn), OtherSources filters are not drawn.
        // Change to state later: Create a callback to wait till we can append the filters and then drawn the OtherSources filters.  

        var _$fragment: JQuery = $(document.createDocumentFragment());

        // The callback for when an item is selected. Iterate over all filters to see which are selected and perform the navigation.
        var selectionChangedHandler: Search_Filter_Base.FilterItemClickHandler = () => {
            // no-op
        }

        this._filterCategories = this._filterCategories || new Array();
        this.drawOtherSourcesCategoryFilters(filterCategories, selectionChangedHandler, _$fragment);
        this._element.append(_$fragment);
    }

    public setNavigationHandler(navigationHandler: Search_Navigation.INavigationHandler): void {
        this._navigationhandler = navigationHandler;
    }

    /*
    * Method is called after the dom reflow has happened.
    **/
    private afterDomUpdate(): void {
        var _$searchableFilterCategoryDivs: JQuery = $(".searchable-filter-category");
        var argsArray: Array<any> = new Array<any>();

        // get the height for each filter-item-area. Construct an array of dictionaries where against 'id' the value of 'height'
        // is the current height of the corresponding div.
        _$searchableFilterCategoryDivs.each((index: number, element: Element) => {
            var _$filterItemArea: JQuery = _$searchableFilterCategoryDivs.eq(index).find(".filter-item-area");
            argsArray.push({
                "id": element.getAttribute("id"),
                "height": _$filterItemArea.height()
            });
        });

        // update the variable to store the min-heights of the filterItemArea pane.
        for (var index in this._filterCategories) {
            this._filterCategories[index].onFilterPaneDomUpdate(argsArray);
        }

        // update scroll position so that the preview view state is maintained.
        if (this._scrollOffset["top"]) {
            this._element.parent().scrollTop(this._scrollOffset["top"]);
        }

        if (this._scrollOffset["left"]) {
            this._element.parent().scrollLeft(this._scrollOffset["left"]);
        }
    }

    private findSelected(selectedNode?: any): Core_Contracts.IFilterCategory[] {
        var projectFilterCount;
        var repoFilterCount;
        var selectedFilters: Core_Contracts.IFilterCategory[] = new Array<Core_Contracts.IFilterCategory>();

        // Selecting the Repository Filter only if the count of Project Filter is one.
        this._filterCategories.forEach((cat, index) => {
            var filters = cat.getSelectedFilters(selectedNode);
            var filterValues = <string[]>filters.values;
            if (filterValues) {
                // for project filters push to selected filters list as is, and record the selected project count.
                if ((filters.name === Search_Constants.SearchConstants.ProjectFilters
                    || filters.name === WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME)
                    && filterValues.length > 0) {
                    projectFilterCount = filterValues.length;
                    selectedFilters.push(filters);
                }
                // for repo filters see if selected projects count is 1, then only add the selected filters to the list.
                else if (filters.name === Search_Constants.SearchConstants.RepoFilters && filterValues.length > 0) {
                    repoFilterCount = filterValues.length;
                    if (projectFilterCount === 1) {
                        selectedFilters.push(filters);
                    }
                }
                // for branch scope filters see if selected project and repositories count is 1, then only add the selected filters to the list.
                else if (filters.name === Search_Constants.SearchConstants.BranchFilters && filterValues.length > 0) {
                    if (projectFilterCount === 1 && repoFilterCount === 1) {
                        selectedFilters.push(filters);
                    }
                }
                // for path scope filter category see if selected project and repositories count is 1, then only add the selected filters to the list.
                else if (filters.name === Search_Constants.SearchConstants.PathFilters) {
                    if (projectFilterCount === 1 && repoFilterCount === 1) {
                        selectedFilters.push(filters);
                    }
                }
                // for area path filter category see if selected project count is 1, then only add the selected filters to the list
                else if (filters.name === WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME) {
                    if (projectFilterCount === 1) {
                        selectedFilters.push(filters);
                    }
                }
                // for any other filters e.g. codelement filters add the list of selected filters.
                else if (filterValues.length > 0) {
                    selectedFilters.push(filters);
                }
            }
        });
        return selectedFilters;
    }

    // Draws filters from "Search in" category
    private drawSearchInCategoryFilters(
        filterCategories: Core_Contracts.IFilterCategoryName[],
        selectionChangedHandler: Search_Filter_Base.FilterItemClickHandler,
        _$fragmentJquery: JQuery): void {
        var searchInCategoryAdded: boolean = false;
        for (var i in filterCategories) {
            var category = filterCategories[i];

            if (category.name === Search_Constants.SearchConstants.ProjectFilters) {
                // get the only selected project name(if any)
                this._selectedProjectName = Search_Helpers.Utils.getOnlySelectedFilterNameIfAny(
                    (<Core_Contracts.IDefaultFilterCategory>category).filters);
            }

            if ((category.name === Search_Constants.SearchConstants.ProjectFilters ||
                category.name === Search_Constants.SearchConstants.RepoFilters ||
                category.name === Search_Constants.SearchConstants.BranchFilters ||
                category.name === Search_Constants.SearchConstants.PathFilters)) {
                if (searchInCategoryAdded === false) {
                    // Draw the top line separator followed by "Search in" category label                    
                    $("<div />").addClass(FilterArea.LINE_SEPARATOR_CSS_CLASS).appendTo(_$fragmentJquery);
                    $("<div />").appendTo(_$fragmentJquery);
                    searchInCategoryAdded = true;
                }

                this.drawFilterCategory(Number(i), category, selectionChangedHandler, _$fragmentJquery);
            }
        }

        // Draw the end line separator for "Search in" category filters
        if (filterCategories.length > 0) {
            this._$lineSeparatorEnd.appendTo(_$fragmentJquery);
        }
    }

    // Draws filters from "Refine by" category
    private drawRefineByCategoryFilters(
        filterCategories: Core_Contracts.IFilterCategoryName[],
        selectionChangedHandler: Search_Filter_Base.FilterItemClickHandler,
        _$fragmentJquery: JQuery): void {
        for (var i in filterCategories) {
            var category = filterCategories[i];

            if (category.name === Search_Constants.SearchConstants.CodeTypeFilters) {
                $("<div />").appendTo(_$fragmentJquery);

                this.drawFilterCategory(Number(i), category, selectionChangedHandler, _$fragmentJquery);
                break;
            }
        }
    }

    // Draws filters from "Other sources" category
    private drawOtherSourcesCategoryFilters(
        filterCategories: Core_Contracts.IFilterCategoryName[],
        selectionChangedHandler: Search_Filter_Base.FilterItemClickHandler,
        _$fragmentJquery: JQuery): void {

        this._$otherSourcesCategoryArea = $("<div />");
        for (var i in filterCategories) {
            var category = filterCategories[i];

            if ((category.name === Search_Constants.SearchConstants.AccountFilters)) {
                var accountFilters = (<Base_Contracts.LinkFilterCategory>category).filters;
                this._$otherSourcesCategoryArea.appendTo(_$fragmentJquery);
                // Providing filterCategories.length since we are appending the filters
                this.drawFilterCategory(this._filterCategories.length, category, selectionChangedHandler, _$fragmentJquery);

                break;
            }
        }
    }

    private drawWorkItemFilters(
        filterCategories: Core_Contracts.IFilterCategoryName[],
        selectionChangedHandler: Search_Filter_Base.FilterItemClickHandler,
        _$fragmentJquery: JQuery): void {
        var isStartSeparatorAdded: boolean = false;
        for (var i in filterCategories) {
            var category = filterCategories[i];

            if (isStartSeparatorAdded === false) {
                // Draw the top line separator followed by "Search in" category label                    
                $("<div />").addClass(FilterArea.LINE_SEPARATOR_CSS_CLASS).appendTo(_$fragmentJquery);
                $("<div />").appendTo(_$fragmentJquery);
                isStartSeparatorAdded = true;
            }

            this.drawFilterCategory(parseInt(i), category, selectionChangedHandler, _$fragmentJquery);
        }

        // Draw the end line separator for "Search in" category filters
        if (filterCategories.length > 0) {
            this._$lineSeparatorEnd.appendTo(_$fragmentJquery);
        }
    }

    // Delgates drawing of individual filter elements
    private drawFilterCategory(
        index: number,
        filterCategory: Core_Contracts.IFilterCategoryName,
        selectionChangedHandler: Search_Filter_Base.FilterItemClickHandler,
        _$fragmentJquery: JQuery): void {
        // the default expansion state of the 'showmore' label is false(collapsed).
        // "showMoreLinkState" is "true" when filter category view is expanded, otherwise false.

        if (filterCategory instanceof Base_Contracts.DefaultFilterCategory) {
            var options = {
                showMoreLinkState: this._filterCategoryShowMoreLinkState[filterCategory.name] || false,
                selectedProjectName: this._selectedProjectName
            };

            var category = <Search_Filter_Category_Multi.MultiSelectFilterCategory>Controls.BaseControl.createIn(
                Search_Filter_Category_Multi.MultiSelectFilterCategory,
                _$fragmentJquery, options);

            this._filterCategories[index] = category;

            let restrictMaxFiltersToRender = Utils_String
                .ignoreCaseComparer(
                    WorkItemConstants.WORK_ITEM_ASSIGNED_TO_FILTER_CATEGORY_NAME,
                    filterCategory.name) === 0;

            category.drawCategory(<Base_Contracts.DefaultFilterCategory>filterCategory, restrictMaxFiltersToRender);
            category.setFilterSelectionChangedHandler(selectionChangedHandler);

            var handler: Search_Filter_Base.ToggleShowMoreLinkStateClickHandler = (filterCategoryName: string, showAllFilters: boolean) => {
                this._filterCategoryShowMoreLinkState[filterCategoryName] = showAllFilters;
            };

            category.setShowMoreLinkStateClickHandler(handler);
        }
        else if (filterCategory instanceof Base_Contracts.LinkFilterCategory) {
            var options = {
                showMoreLinkState: this._filterCategoryShowMoreLinkState[filterCategory.name] || false,
                selectedProjectName: this._selectedProjectName
            };

            var linkCategory = <Search_Filter_Category_Link.LinkFilterCategory>Controls.BaseControl.createIn(
                Search_Filter_Category_Link.LinkFilterCategory,
                _$fragmentJquery, options);

            this._filterCategories[index] = linkCategory;

            linkCategory.drawCategory(<Base_Contracts.DefaultFilterCategory>filterCategory);

            var handler: Search_Filter_Base.ToggleShowMoreLinkStateClickHandler = (filterCategoryName: string, showAllFilters: boolean) => {
                this._filterCategoryShowMoreLinkState[filterCategoryName] = showAllFilters;
            };

            linkCategory.setShowMoreLinkStateClickHandler(handler);
        }
        else if (filterCategory instanceof Base_Contracts.AccountFilterCategory) {
            var options = {
                showMoreLinkState: this._filterCategoryShowMoreLinkState[filterCategory.name] || false,
                selectedProjectName: this._selectedProjectName,
            };

            var accountCategory = <Search_Filter_Category_Account.AccountFilterCategory>Controls.BaseControl.createIn(
                Search_Filter_Category_Account.AccountFilterCategory,
                _$fragmentJquery, options);

            this._filterCategories[index] = accountCategory;

            accountCategory.drawCategory(<Base_Contracts.DefaultFilterCategory>filterCategory);

            var handler: Search_Filter_Base.ToggleShowMoreLinkStateClickHandler = (filterCategoryName: string, showAllFilters: boolean) => {
                this._filterCategoryShowMoreLinkState[filterCategoryName] = showAllFilters;
            };

            accountCategory.setShowMoreLinkStateClickHandler(handler);
        }
        else if (filterCategory instanceof Base_Contracts.BranchFilterCategory) {
            if (Search_Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchMultiBranch)) {

                var branches = (<Base_Contracts.BranchFilterCategory>filterCategory).branches,
                    selectedBranch = (<Base_Contracts.BranchFilterCategory>filterCategory).selectedBranch,
                    defaultBranch = (<Base_Contracts.BranchFilterCategory>filterCategory).defaultBranch;

                var branchScopeOptions = {
                    branches: branches,
                    selectedBranch: selectedBranch,
                    defaultBranch: defaultBranch
                }

                var branchScopeFilterCategory = <Search_Filter_Category_Branch_Scope.BranchScopeFilterCategory>Controls.BaseControl.createIn(
                    Search_Filter_Category_Branch_Scope.BranchScopeFilterCategory,
                    _$fragmentJquery, branchScopeOptions);

                this._filterCategories[index] = branchScopeFilterCategory;

                branchScopeFilterCategory.drawCategory(filterCategory);
                branchScopeFilterCategory.setFilterSelectionChangedHandler(selectionChangedHandler);
            }
        }
        else if (filterCategory instanceof Base_Contracts.PathScopeFilterCategory) {
            // fetch various properties for PathScopeFilterCategory control to instantiate
            var projectName = (<Base_Contracts.PathScopeFilterCategory>filterCategory).projectName,
                repoName = (<Base_Contracts.PathScopeFilterCategory>filterCategory).repoName,
                type = (<Base_Contracts.PathScopeFilterCategory>filterCategory).repositoryType,
                pathForExpansion = (<Base_Contracts.PathScopeFilterCategory>filterCategory).defaultPathForExpansion,
                repoId = (<Base_Contracts.PathScopeFilterCategory>filterCategory).repoId,
                branchName = (<Base_Contracts.PathScopeFilterCategory>filterCategory).branchName,
                branchKey = branchName ? branchName : "default";    // to be used only to access dictionary entry.

            // try getting the PathScopeFilterCategory from the cache maintained.
            // if not found in cache instantiate a new instance of the same with properties obtained above,
            // and cache it for further future use.
            var pathScopeFilterCategory: Search_Filter_Category_Path_Scope.PathScopeFilterCategory;
            if (this._$scopePathFilterCategoryCache[projectName] &&
                this._$scopePathFilterCategoryCache[projectName][repoName] &&
                this._$scopePathFilterCategoryCache[projectName][repoName][branchKey]) {
                pathScopeFilterCategory = <Search_Filter_Category_Path_Scope.PathScopeFilterCategory>
                    this._$scopePathFilterCategoryCache[projectName][repoName][branchKey];
                pathScopeFilterCategory.createIn(_$fragmentJquery);
                pathScopeFilterCategory.drawCategory(pathForExpansion, false);
            } else {
                var pathScopeOptions = {
                    repositoryName: repoName,
                    versionControlType: type,
                    projectName: projectName,
                    logHandler: delegate(this, this._pathScopeChangeLogger)
                }

                pathScopeFilterCategory = <Search_Filter_Category_Path_Scope.PathScopeFilterCategory>Controls.BaseControl.createIn(
                    Search_Filter_Category_Path_Scope.PathScopeFilterCategory,
                    _$fragmentJquery, pathScopeOptions);
                Search_Filter_Category_Path_Scope.PathScopeFilterCategory.getRepositoryContext(pathScopeOptions.versionControlType,
                    pathScopeOptions.projectName,
                    pathScopeOptions.repositoryName,
                    repoId).done((repository: any) => {
                        pathScopeFilterCategory.initializeRepositoryContext(repository, branchName);
                        pathScopeFilterCategory.setSelectionChangedHandler(selectionChangedHandler);

                        if (this._$scopePathFilterCategoryCache[projectName]) {
                            if (this._$scopePathFilterCategoryCache[projectName][repoName]) {
                                this._$scopePathFilterCategoryCache[projectName][repoName][branchKey] = pathScopeFilterCategory;
                            } else {
                                this._$scopePathFilterCategoryCache[projectName][repoName] = {};
                                this._$scopePathFilterCategoryCache[projectName][repoName][branchKey] = pathScopeFilterCategory;
                            }
                        } else {
                            this._$scopePathFilterCategoryCache[projectName] = {};
                            this._$scopePathFilterCategoryCache[projectName][repoName] = {};
                            this._$scopePathFilterCategoryCache[projectName][repoName][branchKey] = pathScopeFilterCategory;
                        }

                        pathScopeFilterCategory.drawCategory(pathForExpansion, true);

                    });
            }

            this._filterCategories[index] = pathScopeFilterCategory;
        }
        else if (filterCategory instanceof Base_Contracts.AreaPathFilterCategory) {
            var areaPathFilterControl = <Search_Filter_Category_Area_Path.AreaPathFilterControl>Controls.BaseControl.createIn(
                Search_Filter_Category_Area_Path.AreaPathFilterControl,
                _$fragmentJquery,
                {});
            this._filterCategories[index] = <Search_Filter_Category_Base.IFilterCategoryBase>areaPathFilterControl;
            areaPathFilterControl.setSelectionChangedHandler(selectionChangedHandler);
            areaPathFilterControl.drawCategory(filterCategory);
        }
    }

    private _pathScopeChangeLogger(source: string) {
        if (Search_Helpers.Utils.compareStrings(source, Search_Constants.SearchConstants.PathScopeInputTextBoxTraceSourceName) === true &&
            this._isPathScopeInputTextBoxUsageLogged === false) {
            this._isPathScopeInputTextBoxUsageLogged = true;
            TelemetryHelper.TelemetryHelper.traceLog({ "PathSopeFilterChangeSource": source });
        }
        else if (Search_Helpers.Utils.compareStrings(source, Search_Constants.SearchConstants.SouceExplorerViewTraceSourceName) === true &&
            this._isSourceExplorerViewUsageLogged === false) {
            this._isSourceExplorerViewUsageLogged = true;
            TelemetryHelper.TelemetryHelper.traceLog({ "PathSopeFilterChangeSource": source });
        }
    }

    /*
    * Persist the scroll position, to be used to reposition the scroll bar.
    **/
    private _setScrollPosition(position: any) {
        this._scrollOffset["top"] = this._element.parent().scrollTop();
        this._scrollOffset["left"] = this._element.parent().scrollLeft();
    }

    private accountFiltersHasCurrentAccountOnly(accountFilters: Base_Contracts.Filter[]): boolean {
        var isCurrentAccountPresent: boolean = false;

        if (accountFilters !== undefined && accountFilters.length === 0) {
            return true;
        }

        // Just checking the count should be sufficient.If count is 1 then only the current account is present in filters.
        // But the name check is to make it more concrete
        if (accountFilters !== undefined && accountFilters.length === 1) {
            if (accountFilters[0].name === Search_Helpers.Utils.getCurrentAccountName()) {
                isCurrentAccountPresent = true;
            }
        } else if (accountFilters !== undefined && accountFilters.length > 1) {
            return false;
        }

        return isCurrentAccountPresent;
    }
}




