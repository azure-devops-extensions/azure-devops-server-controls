// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Filter_Preference_Helper = require("Search/Scripts/UserPreferences/TFS.Search.FilterPreferences.Helper");
import Search_UserPreferences = require("Search/Scripts/UserPreferences/TFS.Search.UserPreferences");

/**
* Helper class for page navigation methods.
*/ 
export class NavigationHelper {

    /**
    * Redirects the current page to scope filters action
    * If the current page is in project scope, adds the current project to filters by default
    */
    public static redirectToScopedFiltersAction(entity: string): void {
        var contextFilters: string = null,
            currentTfsContext: any = Context.SearchContext.getDefaultContext(),
            currentPageUrl: string = window.location.href;

        // Get user preferences for filters and apply current project as the default filter
        var projectName: string = currentTfsContext.navigation.project;

        // restore filter prefs only in case of code search entity
        if (Helpers.Utils.compareStrings(entity, Constants.SearchConstants.CodeEntityTypeId))
        {
            if (projectName) {
                contextFilters = Filter_Preference_Helper.FilterPreferencesHelper.populateFilterPreferencesInProjectContext(projectName, entity);
            }
            else {
                contextFilters = Filter_Preference_Helper.FilterPreferencesHelper.populateFilterPreferencesInAccountContext(entity);
            }
        }

        Helpers.Utils.routeToSearchResultsView(contextFilters, undefined, Constants.SearchConstants.ScopeFiltersActionName, undefined, entity);
    }

}
