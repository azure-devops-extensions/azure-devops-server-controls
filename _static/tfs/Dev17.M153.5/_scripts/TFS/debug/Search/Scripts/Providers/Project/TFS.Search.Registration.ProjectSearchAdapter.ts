// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

/// <reference types="jquery" />

import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import HostUI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import VSS = require("VSS/VSS");

import {SearchConstants} from "Search/Scripts/Common/TFS.Search.Constants";

class ProjectSearchCommon {

    public static getWatermarkText(): string {
        return Resources.RepoSearchWatermark;
    }

    public static performSearch(searchText: string): void {
        Helpers.Utils.createNewSearchRequestState(searchText, SearchConstants.ProjectEntityTypeId);
    }

}

/**
* Search Adaptor to register to project search provider
*/
export class ProjectSearchAdapter extends HostUI.SearchAdapter {

    public getWatermarkText(): string {
        return ProjectSearchCommon.getWatermarkText();
    }

    public hasDropdown(): boolean {
        return false;
    }

    public performSearch(searchText: string, openInNewTab?: boolean): void {
        ProjectSearchCommon.performSearch(searchText);
    }

}

Controls.Enhancement.registerEnhancement(ProjectSearchAdapter, ".search-adapter-search")

/**
* Implements a callback for L0 repo search experience
*/
export class GlobalProjectSearchAdapter extends HostUI.MultiEntitySearchAdapter {

    public hasDropdown(): boolean {
        return !Context.SearchContext.isAccountContext();
    }

    public getWatermarkText(): string {
        return ProjectSearchCommon.getWatermarkText();
    }

    protected _getEntitySelectorDropdownItems(contextInfo, callback, errorCallback): void {
        VSS.using(["Search/Scripts/Providers/Code/TFS.Search.Registration.SearchAdapters", "WorkItemTracking/Scripts/TFS.WorkItemTracking.Global.Registration"], (_SearchAdapters: any) => {
            var menuItems = [];
            menuItems.push({ id: "global-search-adapter", text: Resources.CodeSearchWatermark, "arguments": { adapter: _SearchAdapters.GlobalCodeSearchAdapter }, noIcon: true });
            menuItems.push({ id: "global-search-adapter", text: Resources.WorkItemSearchWatermark, "arguments": { adapter: _SearchAdapters.GlobalWorkItemsSearchAdapter }, noIcon: true });
            callback(menuItems);
        });
    }

    public getHelpDropdownMenu(inputControl: JQuery, parent: JQuery, triggerSearchCallback: any, successCallback: any): void {
        successCallback("");
    }

    public performSearch(searchText: string, openInNewTab?: boolean): void {
        ProjectSearchCommon.performSearch(searchText);
    }

}

Controls.Enhancement.registerEnhancement(GlobalProjectSearchAdapter, ".global-search-adapter-projects")

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Search.Registration.ProjectSearchAdapter", exports);
