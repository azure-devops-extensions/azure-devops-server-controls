// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import {SearchConstants} from "Search/Scripts/Common/TFS.Search.Constants";
import {WorkItemConstants} from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import {ignoreCaseComparer} from "VSS/Utils/String";

/**
* Helper class for filter related operations
*/
export class FiltersHelper {

    public static encodeFilters(selectedFilters: Core_Contracts.IFilterCategory[]): string {
        var categoriesEncoded = new Array<string>();

        if (!selectedFilters || selectedFilters.length === 0) {
            return null;
        }

        for (var i in selectedFilters) {
            categoriesEncoded[i] = selectedFilters[i].name;
            categoriesEncoded[i] += SearchConstants.FilterValueStart
                .concat(selectedFilters[i].valuesToString(SearchConstants.TfsProjectNameSeparator))
                .concat(SearchConstants.FilterValueEnd);
        }

        return categoriesEncoded.join("");
    }

    /**
     * This method will remove duplicate filters. If duplicates are found, last instance is taken
     * @param filters
     */
    public static decodeFilters(filters: string): Core_Contracts.IFilterCategory[] {
        var searchFilters: Core_Contracts.IFilterCategory[] = new Array<Core_Contracts.IFilterCategory>(),
            filtersWithNoDuplicates = {};

        if (!filters) {
            return null;
        }

        var categoriesEncoded = filters.split(SearchConstants.FilterValueEnd);
        for (var i in categoriesEncoded) {
            if (categoriesEncoded[i].length > 3) {
                var nameValues: string[] = categoriesEncoded[i].split(SearchConstants.FilterValueStart, 2);
                if (nameValues.length === 2) {
                    if (FiltersHelper.isPathFilterCategory(nameValues[0]) === false) {
                        var values: Array<string> = nameValues[1].split(SearchConstants.TfsProjectNameSeparator).filter((value, index) => {
                            return value && value !== '';
                        });

                        filtersWithNoDuplicates[nameValues[0]] = new Core_Contracts.FilterNameList(nameValues[0], values);
                    }
                    else {
                        filtersWithNoDuplicates[nameValues[0]] = new Core_Contracts.PathScopeFilterNameValue(nameValues[0], { path: nameValues[1] });
                    }
                }
            }
        }

        for (var i in filtersWithNoDuplicates) {
            searchFilters.push(filtersWithNoDuplicates[i]);
        }

        return searchFilters;
    }

    /**
     * Removes unsupported filters
     * @param filtersString
     */
    public static removeUnSupportedFilters(entity: string, filters: Core_Contracts.IFilterCategory[]): Core_Contracts.IFilterCategory[] {
        var supportedFiltes: Core_Contracts.IFilterCategory[] = new Array<Core_Contracts.IFilterCategory>();

        if (!filters) {
            return null;
        }

        for (var i in filters) {
            if (FiltersHelper.isSupportedFilter(entity, filters[i].name)) {
                supportedFiltes.push(filters[i]);
            }
        }

        return supportedFiltes;
    }

    private static isPathFilterCategory(filterCategoryName: string): boolean {
        return filterCategoryName === SearchConstants.PathFilters;
    }

    private static isSupportedFilter(entityTypeId: string, filterCategoryName: string): boolean {
        if (ignoreCaseComparer(entityTypeId, SearchConstants.CodeEntityTypeId) === 0) {
            return (filterCategoryName === SearchConstants.ProjectFilters
                || filterCategoryName === SearchConstants.RepoFilters
                || filterCategoryName === SearchConstants.BranchFilters
                || filterCategoryName === SearchConstants.PathFilters
                || filterCategoryName === SearchConstants.CodeTypeFilters);
        }
        else if (ignoreCaseComparer(entityTypeId, SearchConstants.WorkItemEntityTypeId) === 0) {
            return (filterCategoryName === WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME
                || filterCategoryName === WorkItemConstants.WORK_ITEM_ASSIGNED_TO_FILTER_CATEGORY_NAME
                || filterCategoryName === WorkItemConstants.WORK_ITEM_STATES_FILTER_CATEGORY_NAME
                || filterCategoryName === WorkItemConstants.WORK_ITEM_TYPES_FILTER_CATEGORY_NAME
                || filterCategoryName === WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME);
        }

        return false;
    }
}