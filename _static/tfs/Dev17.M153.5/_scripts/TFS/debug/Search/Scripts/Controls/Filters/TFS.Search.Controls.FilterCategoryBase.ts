// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Controls = require("VSS/Controls");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Search_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterBase");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import PopupContent = require("VSS/Controls/PopupContent");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;

export interface IFilterCategoryBase {
    dispose(): void;
    getSelectedFilters(options?: any): Core_Contracts.IFilterCategory;
    onFilterPaneDomUpdate(data: any): void;
}

export class FilterCategoryBase extends Controls.BaseControl implements IFilterCategoryBase {
    public static COLLAPSED_CSS_CLASS: string = "collapsed";
    public static EXPANDED_CSS_CLASS: string = "expanded";
    public static FILTER_CATEGORY_CSS_CLASS: string = "filter-category";
    public static FILTER_CATEGORY_CLEAR_ALL_LINK_CSS_CLASS: string = "filter-category-clear-all-link";
    public static FILTER_CATEGORY_LABEL_CSS_CLASS: string = "filter-category-label";
    public static FILTER_CATEGORY_GROUP_CSS_CLASS: string = "filter-category-group";
    public  static FILTER_CATEGORY_SHOW_MORE_ICON_CSS_CLASS: string = "show-filter-category-more-icon";
    public static FILTER_CATEGORY_SHOW_LESS_ICON_CSS_CLASS: string = "show-filter-category-less-icon";
    protected static CONTENT_LOADING_CSS_CLASS: string = "loading";
    protected _restrictMaxFiltersToRender: boolean;

    public _$filtersArea: JQuery;
    public _$filtersAndSearchArea: JQuery;
    public _filters: Search_Filter_Base.FilterBase[];
    public _identifier: string;
    public _name: string;
    public _showMoreLinkStateChangedHandler: Search_Filter_Base.ToggleShowMoreLinkStateClickHandler = null;
    public _showAllFilters: boolean;

    private _$clearAllLink: JQuery;
    private _$label: JQuery;
    private _$labelArea: JQuery;
    private _$expander: JQuery;
    private _$loader: JQuery;
    private _selectedProjectName: string = "";
    private _clickHandler: Search_Filter_Base.FilterItemClickHandler = null;
    private _isLoading;
    private _clearFiltersTooltip;
    private _labelTooltip;

    private static _filterMap = {
        "Projects": Search_Resources.ProjectFilters,
        "Work Item Types": Search_Resources.WorkItemTypeFiltersDisplayLabel,
        "States": Search_Resources.StateFiltersDisplayLabel,
        "Assigned To": Search_Resources.AssignedToFiltersDisplayLabel,
    };
    
    constructor(options?) {
        super(options);
        this._showAllFilters = options.showMoreLinkState || false;
        this._selectedProjectName = options.selectedProjectName || "";
        this._isLoading = false;
        this._restrictMaxFiltersToRender = false;
    }

    public initialize(): void {
        super.initialize();
        this._element.addClass(FilterCategoryBase.FILTER_CATEGORY_GROUP_CSS_CLASS);
        this._filters = new Array<Search_Filter_Base.FilterBase>();
    }

    public dispose() {
        super.dispose();
        if (this._labelTooltip) {
            this._labelTooltip.dispose();
            this._labelTooltip = null;
        }
        for (var filter in this._filters) {
            this._filters[filter].dispose();
        }
    }

    public resetFilters(): void {
        for (var filter in this._filters) {
            this._filters[filter].selectedChanged(false);
        }
    }

    public drawCategory(filterCategory: Core_Contracts.IDefaultFilterCategory, restrictMaxFiltersToRender: boolean): void {
        this._restrictMaxFiltersToRender = restrictMaxFiltersToRender;
        this._identifier = filterCategory.name;
        var filterCategoryName = Search_Resources[filterCategory.name] || filterCategory.name;
        var showClearAll: boolean = filterCategory instanceof Base_Contracts.DefaultFilterCategory;
        this._name = filterCategoryName;

        // Create filter category elements and apply styles
        this._$labelArea = $(domElem('div')).addClass(FilterCategoryBase.FILTER_CATEGORY_CSS_CLASS).attr('tabindex', '-1');
        this._$expander = $(domElem('div')).addClass(FilterCategoryBase.FILTER_CATEGORY_SHOW_LESS_ICON_CSS_CLASS)
                             .addClass("bowtie-icon bowtie-triangle-down").attr('aria-expanded', 'true');
        this._$loader = $(domElem('div')).addClass(FilterCategoryBase.CONTENT_LOADING_CSS_CLASS);

        this._$label = this.getFilterCategoryLabel(filterCategory.name).attr('aria-expanded', 'true');
        this._$clearAllLink = $(domElem('div')).addClass(FilterCategoryBase.FILTER_CATEGORY_CLEAR_ALL_LINK_CSS_CLASS)
            .text(Search_Resources.ClearAllFiltersLabel)
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', Search_Resources.ClearAllFiltersLabel);

        // Setup expand/collapse handlers on category name and expander icon
        this.setupExpandCollapseClickHandler(this._$label);
        this.setupExpandCollapseClickHandler(this._$expander);
        this.setupExpandCollapseKeyDownHandler(this._$labelArea);

        // Setup clear all link handler
        this.setupClearAllFiltersLinkHandlers();

        this._$labelArea.append(this._$expander);
        this._$labelArea.append(this._$label);
        this._$labelArea.append(this._$loader);

        this.setIsLoading(false);

        if (showClearAll) {
            this._$labelArea.append(this._$clearAllLink);
        }

        this._element.append(this._$labelArea);
    }

    /*
    * override definition in child class
    **/
    public onFilterPaneDomUpdate(data: any) {
    }

    public getName(): string {
        return this._name;
    }

    public getSelectedFilters(options?: any): Core_Contracts.IFilterCategory {
        var selected: string[] = new Array<string>()

        for (var i in this._filters) {
            if (this._filters[i].getIsSelected()) {
                selected.push(this._filters[i].getId())
            }
        }

        return new Core_Contracts.FilterNameList(this._identifier, selected);
    }

    public setFilterSelectionChangedHandler(clickHandler: Search_Filter_Base.FilterItemClickHandler) {
        this._clickHandler = clickHandler;

        for (var i in this._filters) {
            this._filters[i].setFilterSelectionChangedHandler(clickHandler);
        }
    }

    public setShowMoreLinkStateClickHandler(clickHandler: Search_Filter_Base.ToggleShowMoreLinkStateClickHandler) {
        this._showMoreLinkStateChangedHandler = clickHandler;
    }

    private isExpanded(): boolean {
        return this._$expander.hasClass(FilterCategoryBase.EXPANDED_CSS_CLASS);
    }

    protected setExpanded(expand: boolean): void {
        if (expand) {
            this._$expander.attr('aria-expanded', 'true');
            this._$label.attr('aria-expanded', 'true');
            this._$expander.removeClass(FilterCategoryBase.COLLAPSED_CSS_CLASS);
            this._$expander.addClass(FilterCategoryBase.EXPANDED_CSS_CLASS);
            this._$filtersAndSearchArea.removeClass(FilterCategoryBase.COLLAPSED_CSS_CLASS);
            this._$expander.removeClass(FilterCategoryBase.FILTER_CATEGORY_SHOW_LESS_ICON_CSS_CLASS).removeClass("bowtie-icon bowtie-triangle-right");
            this._$expander.addClass(FilterCategoryBase.FILTER_CATEGORY_SHOW_MORE_ICON_CSS_CLASS).addClass("bowtie-icon bowtie-triangle-down");
        }
        else {
            this._$expander.attr('aria-expanded', 'false');
            this._$label.attr('aria-expanded', 'false');
            this._$expander.removeClass(FilterCategoryBase.EXPANDED_CSS_CLASS);
            this._$expander.addClass(FilterCategoryBase.COLLAPSED_CSS_CLASS);
            this._$filtersAndSearchArea.addClass(FilterCategoryBase.COLLAPSED_CSS_CLASS);
            this._$expander.removeClass(FilterCategoryBase.FILTER_CATEGORY_SHOW_MORE_ICON_CSS_CLASS).removeClass("bowtie-icon bowtie-triangle-down");
            this._$expander.addClass(FilterCategoryBase.FILTER_CATEGORY_SHOW_LESS_ICON_CSS_CLASS).addClass("bowtie-icon bowtie-triangle-right");
            TelemetryHelper.TelemetryHelper.traceLog({ "FilterCategoryCollapsed": this.getName() });
        }
        // notify anybody who has this function overloaded.
        this.expandedChanged(expand);
    }

    protected expandedChanged(expand: boolean): void {
        return;
    }

    protected setIsLoading(loading: boolean): void {
        this._isLoading = loading;
        if (loading) {
            this._$loader.show();
        }
        else {
            this._$loader.hide();
        }
    }

    protected getIsLoading(): boolean {
        return this._isLoading;
    }

    // Returns filter category label object
    private getFilterCategoryLabel(filterCategoryId: string): JQuery {
        var filterCategoryLabel = FilterCategoryBase._filterMap[this._name] || this._name;

        // Special treatment for Repo filters
        if (filterCategoryId === Search_Constants.SearchConstants.RepoFilters && this._selectedProjectName !== "") {
            filterCategoryLabel = this._name.replace("{0}", this._selectedProjectName);
        }

        let label: JQuery = $(domElem('div')).addClass(FilterCategoryBase.FILTER_CATEGORY_LABEL_CSS_CLASS)
            .addClass(Search_Constants.SearchConstants.TruncateLargeTextCssClass)
            .text(filterCategoryLabel)
            .attr('tabindex', '0')
            .attr("aria-label", filterCategoryLabel)
            .attr("role", "presentation");

        this._labelTooltip = Controls.Enhancement.enhance(PopupContent.RichContentTooltip, label, {
            cssClass: "search-richcontent-tooltip",
            text: filterCategoryLabel,
            openCloseOnHover: true,
            openDelay: 800,
            onlyShowWhenOverflows: label
        });
        return label;
    }

    /**
     * Returns filter category specific tool tip for clear all action
     */
    private getClearAllFiltersToolTip(): string {
        switch (this._identifier) {
            case Search_Constants.SearchConstants.ProjectFilters:
                return Search_Resources.ClearAllProjectFiltersToolTip;

            case Search_Constants.SearchConstants.RepoFilters:
                return Search_Resources.ClearAllRepoFiltersToolTip;

            case Search_Constants.SearchConstants.CodeTypeFilters:
                return Search_Resources.ClearAllCodeTypeFiltersToolTip;

            default:
                return Search_Resources.ClearAllFiltersToolTip;
        }
    }

    /**
     * Sets up expand/collapse handler on give JQuery element for click event
     */
    private setupExpandCollapseClickHandler($element: JQuery): void {
        
        $element.click((obj) => {
            this.setExpanded(!this.isExpanded());
        });
    }

    /**
     * Sets up expand/collapse handler on filter category area for keydown event
     */
    private setupExpandCollapseKeyDownHandler($element: JQuery): void {

        $element.keydown((obj) => {
            if (obj.keyCode === Utils_UI.KeyCode.RIGHT) {
                this.setExpanded(true);
            }
            else if (obj.keyCode === Utils_UI.KeyCode.LEFT) {
                this.setExpanded(false);
            }
        });
    }

    /**
     * Sets up click and enter event handlers for filter categories clear all link
     */
    private setupClearAllFiltersLinkHandlers(): void {
        this._$clearAllLink.click((obj: any) => {
            this.resetFilters();
            TelemetryHelper.TelemetryHelper.traceLog({ "ClearAllFiltersAction": $(obj.currentTarget).attr('title') });
        });

        this._$clearAllLink.keydown((obj: any) => {
            if (obj.keyCode === Utils_UI.KeyCode.SPACE || obj.keyCode === Utils_UI.KeyCode.ENTER) {
                this.resetFilters();
                TelemetryHelper.TelemetryHelper.traceLog({ "ClearAllFiltersKeyboardAction": $(obj.currentTarget).attr('title') });
            }
        });
    }
}