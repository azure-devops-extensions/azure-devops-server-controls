// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import {FeatureAvailabilityFlags} from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import {FeatureAvailabilityService} from "VSS/FeatureAvailability/Services";
import {FilterPreferences} from "Search/Scripts/UserPreferences/TFS.Search.FilterPreferences";
import {localeIgnoreCaseComparer} from "VSS/Utils/String";
import {UserPreferenceScope} from "Search/Scripts/UserPreferences/TFS.Search.UserPreferences";
import {SearchConstants} from "Search/Scripts/Common/TFS.Search.Constants";

import Service = require("VSS/Service");

export class FilterPreferencesHelper {
    /**
    * Populates user preferences for filters in account context.
    * callback: callback(routeToSearchResultsView) is called as soon as the filter preferences are applied
    * Returning the user preferences in case of right click search (for Code Search) as there is no callback being sent.
    */
    public static populateFilterPreferencesInAccountContext(entity: string, callback?: Function): string {
        var userPreferredFilters: string = FilterPreferences.getFilterPreference(entity, UserPreferenceScope.Account);
        FilterPreferences.setFilterPreference(entity, userPreferredFilters, UserPreferenceScope.Account);

        if (localeIgnoreCaseComparer(entity, SearchConstants.WorkItemEntityTypeId) === 0) {
            FilterPreferences.applyAreaPathPreferences(userPreferredFilters, true, null, callback);
        }
        else if (callback && $.isFunction(callback)) {
            callback(userPreferredFilters);
        }

        return userPreferredFilters;
    }

    /**
    * Populates and returns user preferences for filters in project context
    * If the user preferences doesn't include current project, it is added to the saved prefernces and updated on the portal.
    */
    public static populateFilterPreferencesInProjectContext(currentProject: string, entity: string, callback?: Function): string {
        var userSelectedFilters = FilterPreferences.getFilterPreference(entity, UserPreferenceScope.Project),
            contextFilters = FilterPreferences.addCurrentProjectToPrefsIfNeeded(userSelectedFilters, currentProject, entity);

            contextFilters = FilterPreferences.filtersInCaseOfContextualNavigation(contextFilters, currentProject, entity);        

        FilterPreferences.setFilterPreference(entity, contextFilters, UserPreferenceScope.Project);
        if (localeIgnoreCaseComparer(entity, SearchConstants.WorkItemEntityTypeId) === 0) {
            FilterPreferences.applyAreaPathPreferences(contextFilters, false, currentProject, callback);
        }
        else if (callback && $.isFunction(callback)) {
            callback(contextFilters);
        }

        return contextFilters;
    }

    /**
    * @return Returns true if feature flag is enabled.
    */
    public static isFeatureFlagEnabled(feature: string): boolean {
        var featureAvailabilityService = Service.getApplicationService(FeatureAvailabilityService);
        return (featureAvailabilityService && featureAvailabilityService.isFeatureEnabledLocal(feature));
    }
}