import * as  Settings from "VSS/Settings";
import * as Utils_String from "VSS/Utils/String";

import * as TFS_AgileCommon from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import * as TFS_TeamAwarenessService from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";

import * as Constants from "Search/Scripts/Common/TFS.Search.Constants";
import * as Context from "Search/Scripts/Common/TFS.Search.Context";
import * as FiltersHelper from "Search/Scripts/Common/TFS.Search.FiltersHelper";
import * as Core_Contracts from "Search/Scripts/Contracts/TFS.Search.Core.Contracts";

import {SearchConstants} from "Search/Scripts/Common/TFS.Search.Constants";
import {WorkItemConstants} from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import {UserPreferences, UserPreferenceScope} from "Search/Scripts/UserPreferences/TFS.Search.UserPreferences";

const entityBackCompatID = (entity: string) => entity && (entity.charAt(0).toUpperCase() + entity.slice(1));

export namespace FilterPreferences {

    // Filter preference key
    const UserPreferredFilters = "UserPreferedFilters";

    // Returns user preference for the given key if found else sets the preference to default value
    export function getFilterPreference(entity: string, scope?: UserPreferenceScope): string {
        const userPreferredFiltersEntitySpecific = Utils_String.format("{0}/{1}", UserPreferredFilters, entityBackCompatID(entity));
        return UserPreferences.getUserPreference(userPreferredFiltersEntitySpecific, scope);
    }

    // Sets the user preference for the given key
    export function setFilterPreference(entity: string, value: any, scope?: UserPreferenceScope): void {
        const userPreferredFiltersEntitySpecific = Utils_String.format("{0}/{1}", UserPreferredFilters, entityBackCompatID(entity));
        UserPreferences.setUserPreference(userPreferredFiltersEntitySpecific, value, scope);
    }

    /**
     * Updates the existing user preferred filters with current project context
     * if current project already exist in user preferred filters then return current user preferred filters.
     * else if current project not part of user preferred filters then add it to user preferred filters
     */
    export function addCurrentProjectToPrefsIfNeeded(filters: string, projName: string, entity: string): string {
        const decodedFilters: Core_Contracts.IFilterCategory[] = FiltersHelper.FiltersHelper.decodeFilters(filters);
        const keyConstant = Utils_String.localeIgnoreCaseComparer(entity, SearchConstants.CodeEntityTypeId) === 0
            ? Constants.SearchConstants.ProjectFilters
            : WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME;

        const projectFilterNameValue = filterNameValuePairList(decodedFilters, keyConstant);

        if (projectFilterNameValue && projectFilterNameValue[0] && projectFilterNameValue[0].values) {
            if (projectFilterNameValue[0].values.indexOf(projName) !== -1) {
                return filters;
            }
            else {
                projectFilterNameValue[0].values.push(projName);
                return FiltersHelper.FiltersHelper.encodeFilters(projectFilterNameValue);
            }
        }

        return keyConstant + Constants.SearchConstants.FilterValueStart + projName + Constants.SearchConstants.FilterValueEnd;
    }

    /**
     * Updates the existing user preferred filters with current project context in case of contextual navigation
     * if only current project exists in user preferred filters then return current user preferred filters
     * else remove everything and add it to user preferred filters
     */
    export function filtersInCaseOfContextualNavigation(filters: string, projName: string, entity: string): string {
        const decodedFilters = FiltersHelper.FiltersHelper.decodeFilters(filters);
        const keyConstant: string = Utils_String.localeIgnoreCaseComparer(entity, SearchConstants.CodeEntityTypeId) === 0 ?
                Constants.SearchConstants.ProjectFilters :
                WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME;

        const projectFilterNameValue = filterNameValuePairList(decodedFilters, keyConstant);

        if (projectFilterNameValue && projectFilterNameValue[0] && projectFilterNameValue[0].values) {
            if (projectFilterNameValue[0].values.indexOf(projName) === 0 && projectFilterNameValue[0].values.length === 1) {
                return filters;
            }
            else {
                projectFilterNameValue[0].values = [];
                projectFilterNameValue[0].values.push(projName);
                return FiltersHelper.FiltersHelper.encodeFilters(projectFilterNameValue);
            }
        }

        return keyConstant + Constants.SearchConstants.FilterValueStart + projName + Constants.SearchConstants.FilterValueEnd;
    }

    export function applyAreaPathPreferences(filters: string, isAccount: boolean, projName: string, callback: Function): void {
        const decodedFilters: Core_Contracts.IFilterCategory[] = FiltersHelper.FiltersHelper.decodeFilters(filters);
        const projectFilterNameValue = filterNameValuePairList(decodedFilters, WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME);
        if (callback && $.isFunction(callback)) {
            // Area Path filter is to be applied only if there is a single project in the project filter
            // preferences stored and that is same as the current project.
            if (projectFilterNameValue
                && projectFilterNameValue[0]
                && projectFilterNameValue[0].values
                && projectFilterNameValue[0].values.length === 1
                && (isAccount || Utils_String.localeIgnoreCaseComparer(projectFilterNameValue[0].values[0], projName) === 0)) {
                const context = Context.SearchContext.getDefaultContext();
                const scope = isAccount ? Settings.LocalSettingsScope.Global : Settings.LocalSettingsScope.Team;
                const userPrefs = UserPreferences.getUserPreference(WorkItemConstants.WORK_ITEM_AREA_PATH_FILTER_PREFERENCE_KEY, scope);

                // callback called with filters stored in the area path preferences
                if (userPrefs) {
                    callback(filters
                        + WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME
                        + SearchConstants.FilterValueStart
                        + userPrefs
                        + SearchConstants.FilterValueEnd);
                }
                // Callback called when there are no area path preferences saved
                else {
                    callback(filters);
                }
            }
            else {
                callback(filters);
            }
        }
    }

    function filterNameValuePairList(list: Core_Contracts.IFilterCategory[], filterName: string): Core_Contracts.IFilterCategory[] {
        if (list) {
            const filteredValue = list.filter((nv: Core_Contracts.IFilterCategory, index) => {
                return nv.name === filterName;
            });

            if (filteredValue && filteredValue.length === 1) {
                return filteredValue;
            }
        }

        return null;
    }
}
