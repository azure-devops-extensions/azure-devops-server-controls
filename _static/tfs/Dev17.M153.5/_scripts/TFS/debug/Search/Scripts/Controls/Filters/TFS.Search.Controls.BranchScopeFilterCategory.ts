// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Controls = require("VSS/Controls");
import Search_Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Search_Branch_List_Dropdown_Menu = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.BranchListDropdownMenu");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Search_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterBase");
import Search_Filter_Category_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterCategoryBase");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;

export class BranchScopeFilterCategory extends Search_Filter_Category_Base.FilterCategoryBase {
    
    private static SEARCHABLE_FILTER_CATEGORY_CSS_CLASS = "searchable-filter-category";
    private static BRANCH_SCOPE_FILTER_CONTAINER_CSS_CLASS = "branch-scope-filter";
    private static BRANCH_SCOPE_FILTER_NAME = "Branches";
    private static FILTER_ITEM_AREA_CSS_CLASS: string = "filter-item-area";

    private _branchChangeHandler: Search_Filter_Base.FilterItemClickHandler = null;
    private _currentBranch: string;
    private _dropDownMenu: Search_Branch_List_Dropdown_Menu.BranchListDropdownMenu;
    private isBranchListInitialized: boolean = false;
    
    public initialize(): void {
        super.initialize();
        this._name = BranchScopeFilterCategory.BRANCH_SCOPE_FILTER_NAME;
        this._element.addClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_GROUP_CSS_CLASS);
    }
    
    public drawCategory(filterCategory: Search_Base_Contracts.BranchFilterCategory): void {
        super.drawCategory(filterCategory, false);

        this._$filtersAndSearchArea = $(domElem("div"))
            .addClass(BranchScopeFilterCategory.BRANCH_SCOPE_FILTER_CONTAINER_CSS_CLASS);

        this._dropDownMenu = <Search_Branch_List_Dropdown_Menu.BranchListDropdownMenu>Controls.BaseControl.createIn(
            Search_Branch_List_Dropdown_Menu.BranchListDropdownMenu,
            this._$filtersAndSearchArea,
            $.extend({
                onItemChanged: delegate(this, this.onBranchChanged)
            }, this._options)
        );
        
        this._element
            .addClass(BranchScopeFilterCategory.SEARCHABLE_FILTER_CATEGORY_CSS_CLASS)
            .append(this._$filtersAndSearchArea);

        this._dropDownMenu.getElement().on("click", delegate(this, this.onClick));

        this._currentBranch = filterCategory.selectedBranch;
    }

    private onBranchChanged(branch: string) {
        this._currentBranch = branch;
        var selectedNode = {
            filterType: "branchFilter",
            value: this._currentBranch
        };

        if (this._branchChangeHandler) {
            this._branchChangeHandler(selectedNode);
        }
    }

    private onClick(): void {
        if (!this.isBranchListInitialized) {
            this._dropDownMenu._showPopup();
            var filteredList = this._dropDownMenu.getFilteredList();
            filteredList._setItemsForTabId("", this._options.branches);
            filteredList.updateFilteredList();
            this.isBranchListInitialized = true;
        }
    }
    
    public getSelectedFilters(options?): Search_Core_Contracts.IFilterCategory {
        var value = this._currentBranch || "";
        return new Search_Core_Contracts.FilterNameValue(Search_Constants.SearchConstants.BranchFilters, value); 
    }

    public onFilterPaneDomUpdate(data): void {
        // no-op
    }

    public setFilterSelectionChangedHandler(clickHandler: Search_Filter_Base.FilterItemClickHandler) {
        super.setFilterSelectionChangedHandler(clickHandler);
        this._branchChangeHandler = clickHandler;
    }
}