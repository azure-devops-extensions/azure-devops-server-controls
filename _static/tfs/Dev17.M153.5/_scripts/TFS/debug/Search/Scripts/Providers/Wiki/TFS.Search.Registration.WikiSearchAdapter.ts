// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

/// <reference types="jquery" />

import { Entity } from "Presentation/Scripts/TFS/TFS.Host.MultiEntitySearch";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as HostUI from "Presentation/Scripts/TFS/TFS.Host.UI";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as VSS from "VSS/VSS";

export class WikiSearchCommon {

    public static getWatermarkText(): string {
        return Resources.WikiSearchWatermark;
    }

    public static performSearch(searchText: string, openInNewTab?: boolean): void {
        const tfsContext = TfsContext.getDefault();
        const params = {
            type: SearchConstants.WikiEntityTypeId,
            text: searchText
        };
        
        const isSearchOnNewRoute = FeatureAvailabilityService.isFeatureEnabled("WebAccess.Search.EnableNewRoute", false);
        const controllerName = isSearchOnNewRoute ? SearchConstants.SearchControllerName : SearchConstants.WikiSearchControllerName;

        const actionUrl = tfsContext.getActionUrl(undefined, controllerName, params as any);

        if (openInNewTab) {
            window.open(actionUrl);
        }
        else {
            // Redirect to search results view in the current tab
            window.location.href = actionUrl;
        }
    }
}

/**
* Implements a callback for L0 wiki search experience
*/
export class MultiEntityWikiSearchAdapter extends HostUI.MultiEntitySearchAdapter {

    public getWatermarkText(isContextualNavigationEnabled: boolean, isCollectionContext: boolean): string {
        let placeholderFormat = isCollectionContext ? Resources.SearchThisCollectionWaterMark : Resources.SearchThisProjectWaterMark;
        placeholderFormat = placeholderFormat.replace("{0}", Resources.WikiEntityName.toLowerCase());
        return isContextualNavigationEnabled ? placeholderFormat : WikiSearchCommon.getWatermarkText();
    }

    public getEntityId(): string {
        return SearchConstants.WikiEntityTypeId;
    }

    public performSearch(searchText: string, openInNewTab?: boolean): void {
        WikiSearchCommon.performSearch(searchText, openInNewTab);
    }

    public hasDropdown(): boolean {
        return true;
    }

    protected _getEntitySelectorDropdownItems(contextInfo, callback, errorCallback): void {
        const entitySearchAvail = this._options.entitySearchAvail;
        const isProjectContext = TfsContext.getDefault().navigation.topMostLevel >= NavigationContextLevels.Project;

        VSS.using(["Search/Scripts/Providers/Code/TFS.Search.Registration.SearchAdapters",
            "Search/Scripts/Providers/WorkItem/TFS.Search.Registration.WorkItemSearchAdapter"],
            (_SearchAdapters: any, _WISearchAdapter: any) => {
                const menuItems = [];

                if (entitySearchAvail[Entity.Code]) {
                    menuItems.push({
                        id: "global-search-adapter", text: Resources.CodeSearchWatermark,
                        "arguments": { adapter: _SearchAdapters.GlobalCodeSearchAdapter },
                        noIcon: true
                    });
                }
                if (entitySearchAvail[Entity.WorkItem] || isProjectContext) {
                    menuItems.push({
                        id: "wi-search-adapter", text: Resources.WorkItemSearchWatermark,
                        "arguments": { adapter: _WISearchAdapter.MultiEntityWorkItemSearchAdapter },
                        noIcon: true
                    });
                }

                callback(menuItems);
            });
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Search.Registration.WikiSearchAdapter", exports);
