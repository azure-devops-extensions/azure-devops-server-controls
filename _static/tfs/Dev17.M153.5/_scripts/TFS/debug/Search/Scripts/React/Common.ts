/// copyright (c) microsoft corporation. all rights reserved.

"use strict";
import {ignoreCaseComparer} from "VSS/Utils/String";
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import {WorkItemConstants} from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import {SearchConstants} from "Search/Scripts/Common/TFS.Search.Constants";
import {
    DefaultFilterCategory,
    PathScopeFilterCategory,
    BranchFilterCategory,
    VersionControlType,
    AreaPathFilterCategory} from "Search/Scripts/Contracts/TFS.Search.Base.Contracts";
import * as Models from "Search/Scripts/React/Models";
import { Utils } from "Search/Scripts/Common/TFS.Search.Helpers";
import {FeatureAvailabilityFlags} from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

/**
 * Compares two string for the occurrence of the searchText
 * Ranks string with exact match higher, then the one in which searchText substring occurs quite early
 * if there is a tie, ranks the two strings based on lexicographic order.
 * @param first
 * @param second
 * @param searchText
 */
export function compare(first: string, second: string, searchText: string): number {
    let substringIndexFirst = first.indexOf(searchText),
        substringIndexSecond = second.indexOf(searchText);

    if (substringIndexFirst !== substringIndexSecond) {
        return substringIndexFirst - substringIndexSecond;
    }
    else if (substringIndexFirst === 0 && substringIndexSecond === 0) {
        return ignoreCaseComparer(first, searchText) === 0
            ? -1
            : (ignoreCaseComparer(second, searchText) === 0
                ? 1
                : ignoreCaseComparer(first, second));
    }
    else if (substringIndexFirst < 0 && substringIndexFirst < 0) {
        // No need to compare.
        return 0;
    }
    else {
        return ignoreCaseComparer(first, second);
    }
}

/**
 * Return a list of sorted items
 * @param items
 * @param getItemText
 * @param searchText
 */
export function substringSort<TItem>(items: TItem[], getItemText: (item: TItem) => string, searchText: string): TItem[] {
    let results = items
        .filter((item) => getItemText(item).toLowerCase().indexOf(searchText.toLowerCase()) >= 0)
        .sort((a, b) => compare(getItemText(a).toLowerCase(), getItemText(b).toLowerCase(), searchText.toLowerCase()));
    return results;
}

/**
 * Returns a list of sorted items, after transforming the items as defined by "trasform" arg.
 * @param items
 * @param getItemText
 * @param transform
 * @param searchText
 */
export function multiSelectSubstringSort<TItem>(
    items: TItem[],
    getItemText: (item: TItem) => string,
    transform: (items: TItem, hit: boolean) => TItem,
    searchText: string): TItem[] {
    let results = items
        .map(i => {
            let substringIndex = getItemText(i).toLowerCase().indexOf(searchText.toLowerCase());
            return transform(i, substringIndex >= 0);
        })
        .sort((a, b) => compare(getItemText(a).toLowerCase(), getItemText(b).toLowerCase(), searchText.toLowerCase()));

    return results;
}

/**
 * Constant vairable to hold filter list for different search entities.
 */
export const searchFilterCategories: IDictionaryNumberTo<string[]> = {}
searchFilterCategories[Models.SearchProvider.code] = [
    SearchConstants.ProjectFilters,
    SearchConstants.RepoFilters,
    SearchConstants.BranchFilters,
    SearchConstants.PathFilters,
    SearchConstants.CodeTypeFilters
];

searchFilterCategories[Models.SearchProvider.workItem] = [
    WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME,
    WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME,
    WorkItemConstants.WORK_ITEM_TYPES_FILTER_CATEGORY_NAME,
    WorkItemConstants.WORK_ITEM_STATES_FILTER_CATEGORY_NAME,
    WorkItemConstants.WORK_ITEM_ASSIGNED_TO_FILTER_CATEGORY_NAME
]

export const filterCategoryCreators: IDictionaryStringTo<() => any> = {}
filterCategoryCreators[SearchConstants.ProjectFilters] = () => new DefaultFilterCategory([], SearchConstants.ProjectFilters);
filterCategoryCreators[SearchConstants.RepoFilters] = () => new DefaultFilterCategory([], SearchConstants.RepoFilters);
filterCategoryCreators[SearchConstants.BranchFilters] = () => new BranchFilterCategory(SearchConstants.BranchFilters, [], "", "");
filterCategoryCreators[SearchConstants.PathFilters] = () => new PathScopeFilterCategory(SearchConstants.PathFilters, "", "", "", null);
filterCategoryCreators[SearchConstants.CodeTypeFilters] = () => new DefaultFilterCategory([], SearchConstants.CodeTypeFilters);
filterCategoryCreators[WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME] = () => new DefaultFilterCategory([], WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME);
filterCategoryCreators[WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME] = () => new AreaPathFilterCategory(WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME, "", "");
filterCategoryCreators[WorkItemConstants.WORK_ITEM_TYPES_FILTER_CATEGORY_NAME] = () => new DefaultFilterCategory([], WorkItemConstants.WORK_ITEM_TYPES_FILTER_CATEGORY_NAME);
filterCategoryCreators[WorkItemConstants.WORK_ITEM_STATES_FILTER_CATEGORY_NAME] = () => new DefaultFilterCategory([], WorkItemConstants.WORK_ITEM_STATES_FILTER_CATEGORY_NAME);
filterCategoryCreators[WorkItemConstants.WORK_ITEM_ASSIGNED_TO_FILTER_CATEGORY_NAME] = () => new DefaultFilterCategory([], WorkItemConstants.WORK_ITEM_ASSIGNED_TO_FILTER_CATEGORY_NAME);

export const filterCategoryViewProps = {}
filterCategoryViewProps[SearchConstants.ProjectFilters] = {
    watermark: Search_Resources.ProjectFiltersSearchBoxWaterMark,
    allFilterLabel: Search_Resources.AllProjectsLabel,
    width: 160,
    displayName: Search_Resources.ProjectFiltersDisplayLabel,
    calloutProps: {
        title: Search_Resources.RefineSearchTermText,
        content: Search_Resources.ProjectFilterCalloutContent
    },
    dropdownItemDisplayLabels: [Search_Resources.ProjectItem, Search_Resources.ProjectItems]
};
filterCategoryViewProps[SearchConstants.RepoFilters] = {
    watermark: Search_Resources.RepositoryFiltersSearchBoxWaterMark,
    width: 160,
    allFilterLabel: Search_Resources.AllRepositoriesLabel,
    displayName: Search_Resources.RepositoryFiltersDisplayName,
    calloutProps: {
        title: Search_Resources.RefineFiltersText,
        content: Search_Resources.RepositoryFilterCalloutContent
    },
    dropdownItemDisplayLabels: [Search_Resources.RepoItem, Search_Resources.RepoItems]
};
filterCategoryViewProps[SearchConstants.BranchFilters] = {
    watermark: Search_Resources.BranchFiltersSearchBoxWaterMark,
    width: 230,
    calloutProps: {
        title: Search_Resources.RefineFiltersText,
        content: Search_Resources.BranchFilterCalloutContent
    },
    dropdownItemDisplayLabels: [Search_Resources.BranchItem, Search_Resources.BranchItems]
};
filterCategoryViewProps[SearchConstants.CodeTypeFilters] = {
    watermark: Search_Resources.CodeElementFiltersSearchBoxWaterMark,
    width: 120,
    allFilterLabel: Search_Resources.AllCodeTypesLabel,
    displayName: Search_Resources.CodeElementFiltersDisplayName,
    calloutProps: {
        title: Search_Resources.RefineSearchTermText,
        content: Search_Resources.CodeTypeFilterCalloutContent
    },
    dropdownItemDisplayLabels: [Search_Resources.CodeTypeItem, Search_Resources.CodeTypeItems]
};
filterCategoryViewProps[SearchConstants.PathFilters] = {
    watermark: Search_Resources.PathDropdownSearchBoxWaterMark,
    width: 230,
    calloutProps: {
        title: Search_Resources.RefineFiltersText,
        content: Search_Resources.PathFilterCalloutContent
    },
    dropdownItemDisplayLabels: [Search_Resources.PathItem, Search_Resources.PathItems]
};

filterCategoryViewProps[WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME] = {
    watermark: Search_Resources.WorkItemProjectsSearchBoxWaterMark,
    width: 160,
    allFilterLabel: Search_Resources.AllProjectsLabel,
    displayName: Search_Resources.ProjectFiltersDisplayLabel,
    calloutProps: {
        title: Search_Resources.RefineSearchTermText,
        content: Search_Resources.ProjectFilterCalloutContent
    },
    dropdownItemDisplayLabels: [Search_Resources.ProjectItem, Search_Resources.ProjectItems]
};
filterCategoryViewProps[WorkItemConstants.WORK_ITEM_TYPES_FILTER_CATEGORY_NAME] = {
    watermark: Search_Resources.WorkItemTypesSearchBoxWaterMark,
    width: 120,
    allFilterLabel: Search_Resources.AllWorkItemTypesLabel,
    displayName: Search_Resources.WorkItemTypesFilterDisplayName,
    calloutProps: {
        title: Search_Resources.RefineSearchTermText,
        content: Search_Resources.WorkItemTypesFilterCalloutContent
    },
    dropdownItemDisplayLabels: [Search_Resources.WorkItemTypeItem, Search_Resources.WorkItemTypeItems]
};
filterCategoryViewProps[WorkItemConstants.WORK_ITEM_STATES_FILTER_CATEGORY_NAME] = {
    watermark: Search_Resources.StatesSearchBoxWaterMark,
    width: 120,
    allFilterLabel: Search_Resources.AllStatesLabel,
    displayName: Search_Resources.WorkItemStatesFilterDisplayName,
    calloutProps: {
        title: Search_Resources.RefineSearchTermText,
        content: Search_Resources.WorkItemStatesFilterCalloutContent
    },
    dropdownItemDisplayLabels: [Search_Resources.StateItem, Search_Resources.StateItems]
};
filterCategoryViewProps[WorkItemConstants.WORK_ITEM_ASSIGNED_TO_FILTER_CATEGORY_NAME] = {
    watermark: Search_Resources.AssignedToSearchBoxWaterMark,
    width: 180,
    allFilterLabel: Search_Resources.AnyText,
    displayName: Search_Resources.AssignedToFiltersDisplayLabel,
    allItemLabel: Search_Resources.AnyText,
    calloutProps: {
        title: Search_Resources.RefineSearchTermText,
        content: Search_Resources.AssignedToFilterCalloutContent
    },
    dropdownItemDisplayLabels: [Search_Resources.AssignedToItem, Search_Resources.AssignedToItems]
};
filterCategoryViewProps[WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME] = {
    watermark: Search_Resources.AreaPathDropdownSearchBoxWaterMark,
    width: 230,
    calloutProps: {
        title: Search_Resources.RefineFiltersText,
        content: Search_Resources.AreaPathFilterCalloutContent
    },
    dropdownItemDisplayLabels: [Search_Resources.AreaPathItem, Search_Resources.AreaPathItems]
};

export function isFilterCategoryEnabled(categoryName: string): boolean {
    // Test only for multibranch support in case of BranchFilters, as all other filters are enabled by default.
    if (ignoreCaseComparer(categoryName, SearchConstants.BranchFilters) === 0) {
        return Utils.isFeatureFlagEnabled(FeatureAvailabilityFlags.WebAccessSearchMultiBranch);
    }

    return true;
}

/**
 * get the status message for the items found for a particular search text.
 * @param itemCount
 * @param refinementText
 */
export function getItemsShownHint(itemCount: number, refinementText: string, displayName: any): string {
    let displayMessage = "{0} {1} {2}";
    if (!refinementText) {
        return itemCount === 1
            ? displayMessage
                .replace("{0}", Search_Resources.ShowingItems)
                .replace("{1}", itemCount.toString())
                .replace("{2}", displayName[0])
            : displayMessage
                .replace("{0}", Search_Resources.ShowingItems)
                .replace("{1}", itemCount.toString())
                .replace("{2}", displayName[1]);
    }

    return itemCount === 0
        ? Utils.replaceUsingSplitAndJoin(Search_Resources.FilterCategoryNoResultsHint, '{0}', refinementText)
        : (itemCount === 1
            ? displayMessage
                .replace("{0}", Search_Resources.FoundItems)
                .replace("{1}", itemCount.toString())
                .replace("{2}", displayName[0])
            : displayMessage
                .replace("{0}", Search_Resources.FoundItems)
                .replace("{1}", itemCount.toString())
                .replace("{2}", displayName[1]));
}

/**
 * This helper function return the list of the child element of the searched text.
 * EG: separator = "/", searchText: abc/bcd, result = abc/bcd/$ excluding abc/bcd/$/$ where "$" is any sequence of any character
 * @param items: the list of all items
 * @param getItemText: the getter for text in the list of items
 * @param searchText: the text which need to be searched in the list
 */
export function fetchImmediateChildinPath<TItem>(items: TItem[], getItemText: (item: TItem) => string, searchText: string): TItem[] {
    if (!searchText) {
        //Apply no filter if the search text is empty.
        return items;
    }
    else {
        return items.filter((item, index) => {
            let text: string = getItemText(item);

            // Position of laste separator beyong which the item will be separated out.
            let lastSeperator: number = searchText.length;

            // In case where search Text is just /, last separator is at Zero index.
            if (searchText === "/") {
                lastSeperator = 0;
            }

            if (text.toLowerCase().indexOf(searchText.toLowerCase()) === 0 &&
                (text.lastIndexOf("/") === lastSeperator ||
                    text.lastIndexOf("\\") === lastSeperator ||
                    ignoreCaseComparer(text, searchText) === 0)) {
                return true;
            }
            return false;
        }).sort((a, b) => { return ignoreCaseComparer(getItemText(a), getItemText(b)); });
    }
}