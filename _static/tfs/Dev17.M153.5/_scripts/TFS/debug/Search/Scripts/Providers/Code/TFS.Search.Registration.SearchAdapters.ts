// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

/// <reference types="jquery" />

import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import { Entity } from "Presentation/Scripts/TFS/TFS.Host.MultiEntitySearch";
import HostUI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import VSS = require("VSS/VSS");

import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";

import FilterDropdown_NO_REQUIRE = require("Search/Scripts/Providers/Code/TFS.Search.FilterDropdown");

class CodeSearchCommon {
    public static getWatermarkText(): string {
        return Resources.CodeSearchWatermark;
    }

    public static performSearch(searchText: string, openInNewTab?: boolean): void {
        Helpers.Utils.createNewSearchRequestState(searchText, SearchConstants.CodeEntityTypeId, openInNewTab);
    }
}

/**
* Search Adaptor created by the SEH Search team to call the new search hub's search functionality
*/
export class SearchSearchAdapter extends HostUI.SearchAdapter {

    public getWatermarkText(): string {
        return CodeSearchCommon.getWatermarkText();
    }

    public hasDropdown(): boolean {
        return false;
    }

    public performSearch(searchText: string, openInNewTab?: boolean): void {
        CodeSearchCommon.performSearch(searchText, openInNewTab);
    }

    public getHelpDropdown(callback: any): void {
        if ($.isFunction(callback)) {
            VSS.using(["Search/Scripts/Providers/Code/TFS.Search.FilterDropdown"], (FilterDropdown: typeof FilterDropdown_NO_REQUIRE) => {
                var filterDropdown = new FilterDropdown.SearchFilterDropdown();
                callback(filterDropdown);
            });
        }
    }
}

/**
* Implements a callback for L0 code search experience
*/
export class GlobalCodeSearchAdapter extends HostUI.MultiEntitySearchAdapter {

    public hasDropdown(): boolean {
        return !Context.SearchContext.isAccountContext();
    }

    public getWatermarkText(isContextualNavigationEnabled: boolean, isCollectionContext: boolean): string {
        let placeholderFormat = isCollectionContext ? Resources.SearchThisCollectionWaterMark : Resources.SearchThisProjectWaterMark;
        placeholderFormat = placeholderFormat.replace("{0}", Resources.CodeEntityName.toLowerCase());
        return isContextualNavigationEnabled ? placeholderFormat : CodeSearchCommon.getWatermarkText();
    }

    public getEntityId(): string {
        return "Code";
    }

    protected _getEntitySelectorDropdownItems(contextInfo, callback, errorCallback): void {
        const entitySearchAvail = this._options.entitySearchAvail;
        const isProjectContext = Context.SearchContext.getDefaultContext().navigation.topMostLevel >= NavigationContextLevels.Project;

        VSS.using(["Search/Scripts/Providers/WorkItem/TFS.Search.Registration.WorkItemSearchAdapter",
            "Search/Scripts/Providers/Wiki/TFS.Search.Registration.WikiSearchAdapter"],
            (_WISearchAdapter: any, _WikiSearchAdapter: any) => {
                const menuItems = [];

                if (entitySearchAvail[Entity.WorkItem] || isProjectContext) {
                    menuItems.push({
                        id: "wi-search-adapter",
                        text: Resources.WorkItemSearchWatermark,
                        "arguments": { adapter: _WISearchAdapter.MultiEntityWorkItemSearchAdapter },
                        noIcon: true
                    });
                }
                if (entitySearchAvail[Entity.Wiki]) {
                    menuItems.push({
                        id: "wiki-search-adapter", text: Resources.WikiSearchWatermark,
                        "arguments": { adapter: _WikiSearchAdapter.MultiEntityWikiSearchAdapter },
                        noIcon: true
                    });
                }

                callback(menuItems);
            });
    }

    public getHelpDropdownMenu(inputControl: JQuery, parent: JQuery, triggerSearchCallback: any, successCallback: any): void {
        VSS.using(["Search/Scripts/Providers/Code/TFS.Search.FilterDropdown"], (FilterDropdown: typeof FilterDropdown_NO_REQUIRE) => {
            var filterDropdown = new FilterDropdown.SearchFilterDropdown(),
                _$popupMenu = filterDropdown.getPopup();

            filterDropdown.bind(inputControl, false);
            parent.append(_$popupMenu);
            successCallback(filterDropdown);
        });
    }

    public performSearch(searchText: string, openInNewTab?: boolean): void {
        CodeSearchCommon.performSearch(searchText, openInNewTab);
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Search.Registration.SearchAdapters", exports);
