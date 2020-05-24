// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Presentation_FilteredListDropdownMenu = require("Presentation/Scripts/TFS/FeatureRef/FilteredListDropdownMenu");
import Presentation_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import Resources = require("Search/Scripts/Resources/TFS.Resources.Search");

/**
 * Required options:
 * defaultBranch
 * onItemChanged: delegate
 */
export class BranchListDropdownMenu extends Presentation_FilteredListDropdownMenu.FilteredListDropdownMenu {
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            popupOptions: {
                elementAlign: "left-top",
                baseAlign: "left-bottom",
                overflow: "hidden-hidden",
                allowUnmatchedSelection: false
            },
            ariaDescribedByText: Resources.BranchScopeFilterAriaDescribedByText,
            initialSelectedItem: options ? options.defaultBranch : "",
            filteredListOptions: {
                cssClass: "vc-git-version-selector-control vc-git-selector",
                scrollToExactMatch: true,
                useBowtieStyle: true,
                waterMark: Resources.BranchFilterSearchWaterMark
            },
            filteredListType: Presentation_FilteredListControl.FilteredListControl
        }, options));
    }

    public initialize() {
        super.initialize();
        this._element.addClass("vc-git-selector-menu");
        this._getPopupEnhancement()._bind("action-item-clicked", () => {
            this._hidePopup();
        });

        this._element.attr("role", "button");
        this._getPopupEnhancement().getElement().attr("role", "dialog");
    }

    public _getItemIconClass(item: any): string {
        return "bowtie-icon bowtie-tfvc-branch";
    }

    public _getItemDisplayText(item: any): string {
        return item ? item.toString() : this._options.defaultBranch;
    }
}