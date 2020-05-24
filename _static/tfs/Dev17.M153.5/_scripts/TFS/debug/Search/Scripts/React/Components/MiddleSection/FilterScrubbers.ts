/// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";
import * as Models from "Search/Scripts/React/Models";
import * as Context from "VSS/Context";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { WorkItemConstants } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { FilterNameList, FilterNameValue, IFilterCategory} from "Search/Scripts/Contracts/TFS.Search.Core.Contracts";


interface IFilterScrubber {
    scrub: Function;
    isPathFilter: (name: string) => boolean;
    reset: (project: string) => IFilterCategory[]
}

class CodeSearchFilterScruber implements IFilterScrubber {
    public scrub(allSelectedFiltersInCategory: any): IFilterCategory[] {
        let projectsSelected = (allSelectedFiltersInCategory[SearchConstants.ProjectFilters] || [] as any[])
            .filter((f, i) => {
                return f.selected;
            }).length,
            scrubbedFilters: IFilterCategory[];

        if (projectsSelected > 1) {
            scrubbedFilters = [
                new FilterNameList(
                    SearchConstants.ProjectFilters,
                    getFilterIds(
                        allSelectedFiltersInCategory[SearchConstants.ProjectFilters]))
            ];

            return allSelectedFiltersInCategory[SearchConstants.CodeTypeFilters]
                ? scrubbedFilters.concat([
                    new FilterNameList(
                        SearchConstants.CodeTypeFilters,
                        getFilterIds(
                            allSelectedFiltersInCategory[SearchConstants.CodeTypeFilters]))
                ])
                : scrubbedFilters;
        }

        let repostoriesSelected = (allSelectedFiltersInCategory[SearchConstants.RepoFilters] || [] as any[])
            .filter((f, i) => {
                return f.selected;
            }).length;

        if (projectsSelected > 0 && repostoriesSelected > 1) {
            scrubbedFilters = [
                new FilterNameList(
                    SearchConstants.ProjectFilters,
                    getFilterIds(
                        allSelectedFiltersInCategory[SearchConstants.ProjectFilters])),
                new FilterNameList(
                    SearchConstants.RepoFilters,
                    getFilterIds(
                        allSelectedFiltersInCategory[SearchConstants.RepoFilters]))
            ];

            return allSelectedFiltersInCategory[SearchConstants.CodeTypeFilters]
                ? scrubbedFilters.concat([
                    new FilterNameList(
                        SearchConstants.CodeTypeFilters,
                        getFilterIds(
                            allSelectedFiltersInCategory[SearchConstants.CodeTypeFilters]))
                ])
                : scrubbedFilters;
        }

        scrubbedFilters = [];
        projectsSelected > 0 && scrubbedFilters.push(
            new FilterNameList(
                SearchConstants.ProjectFilters,
                getFilterIds(
                    allSelectedFiltersInCategory[SearchConstants.ProjectFilters])));
        projectsSelected > 0 && repostoriesSelected > 0 && scrubbedFilters.push(
            new FilterNameList(
                SearchConstants.RepoFilters,
                getFilterIds(
                    allSelectedFiltersInCategory[SearchConstants.RepoFilters])));

        scrubbedFilters = projectsSelected > 0 &&
            repostoriesSelected > 0 &&
            allSelectedFiltersInCategory[SearchConstants.PathFilters] &&
            allSelectedFiltersInCategory[SearchConstants.PathFilters][0] &&
            // No scoping is required if the selected path is root.
            allSelectedFiltersInCategory[SearchConstants.PathFilters][0] !== "/" &&
            allSelectedFiltersInCategory[SearchConstants.PathFilters][0] !== "$/"
            ? scrubbedFilters.concat([
                new FilterNameValue(
                    SearchConstants.PathFilters,
                    allSelectedFiltersInCategory[SearchConstants.PathFilters][0])
            ])
            : scrubbedFilters;

        scrubbedFilters = projectsSelected > 0 &&
            repostoriesSelected > 0 &&
            allSelectedFiltersInCategory[SearchConstants.BranchFilters]
            ? scrubbedFilters.concat([
                new FilterNameValue(
                    SearchConstants.BranchFilters,
                    allSelectedFiltersInCategory[SearchConstants.BranchFilters][0])
            ])
            : scrubbedFilters;

        return allSelectedFiltersInCategory[SearchConstants.CodeTypeFilters]
            ? scrubbedFilters.concat([
                new FilterNameList(
                    SearchConstants.CodeTypeFilters,
                    getFilterIds(
                        allSelectedFiltersInCategory[SearchConstants.CodeTypeFilters]))
            ])
            : scrubbedFilters;
    }

    public isPathFilter(name): boolean {
        return ignoreCaseComparer(name, SearchConstants.PathFilters) === 0;
    }

    /**
     * Resets the current selected filters based on the current navigation level the user is in.
     * For account/collection pages nothing needs to be selected hence routine returns an empty list of filters.
     * For actions within project pages, the current project needs to be selected.
     * @param projectName
     */
    public reset(projectName: string): IFilterCategory[] {
        if (!projectName) {
            return [];
        }
        else {
            return [new FilterNameList(SearchConstants.ProjectFilters, [projectName])];
        }
    }
}

class WorkItemSearchFilterScruber implements IFilterScrubber {
    public scrub(allSelectedFiltersInCategory: any): IFilterCategory[] {
        let projectsSelected = (allSelectedFiltersInCategory[WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME] || [] as any[])
            .filter((f, i) => {
                return f.selected;
            }).length,
            scrubbedFilters: IFilterCategory[] = [];

        allSelectedFiltersInCategory[WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME] &&
            scrubbedFilters.push(
                new FilterNameList(
                    WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME,
                    getFilterIds(
                        allSelectedFiltersInCategory[WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME])));

        projectsSelected == 1 && allSelectedFiltersInCategory[WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME] &&
            scrubbedFilters.push(
                new FilterNameValue(
                    WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME,
                    allSelectedFiltersInCategory[WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME][0]));

        allSelectedFiltersInCategory[WorkItemConstants.WORK_ITEM_ASSIGNED_TO_FILTER_CATEGORY_NAME] &&
            scrubbedFilters.push(
                new FilterNameList(
                    WorkItemConstants.WORK_ITEM_ASSIGNED_TO_FILTER_CATEGORY_NAME,
                    getFilterIds(
                        allSelectedFiltersInCategory[WorkItemConstants.WORK_ITEM_ASSIGNED_TO_FILTER_CATEGORY_NAME])));

        allSelectedFiltersInCategory[WorkItemConstants.WORK_ITEM_STATES_FILTER_CATEGORY_NAME] &&
            scrubbedFilters.push(
                new FilterNameList(
                    WorkItemConstants.WORK_ITEM_STATES_FILTER_CATEGORY_NAME,
                    getFilterIds(
                        allSelectedFiltersInCategory[WorkItemConstants.WORK_ITEM_STATES_FILTER_CATEGORY_NAME])));

        allSelectedFiltersInCategory[WorkItemConstants.WORK_ITEM_TYPES_FILTER_CATEGORY_NAME] &&
            scrubbedFilters.push(
                new FilterNameList(
                    WorkItemConstants.WORK_ITEM_TYPES_FILTER_CATEGORY_NAME,
                    getFilterIds(
                        allSelectedFiltersInCategory[WorkItemConstants.WORK_ITEM_TYPES_FILTER_CATEGORY_NAME])));

        return scrubbedFilters;
    }

    public isPathFilter(name): boolean {
        return ignoreCaseComparer(name, WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME) === 0;
    }

    /**
     * Resets the current selected filters based on the current navigation level the user is in.
     * For account/collection pages nothing needs to be selected hence routine returns an empty list of filters.
     * For actions within project pages, the current project is needed to sent with the search query.
     * @param projectName
     */
    public reset(projectName: string): IFilterCategory[] {
        if (!projectName) {
            return [];
        }
        else {
            return [
                new FilterNameList(WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME, [projectName]),
                new FilterNameList(WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME, [projectName])
            ];
        }
    }
}

const scrubbers: IDictionaryNumberTo<IFilterScrubber> = {};
scrubbers[Models.SearchProvider.code] = new CodeSearchFilterScruber();
scrubbers[Models.SearchProvider.workItem] = new WorkItemSearchFilterScruber();

export function scrub(
    searchProvider: Models.SearchProvider,
    allSelectedFiltersInCategory: any): any[] {
    return scrubbers[searchProvider] && scrubbers[searchProvider].scrub(allSelectedFiltersInCategory);
}

export function reset(searchProvider: Models.SearchProvider): IFilterCategory[] {
    let project = Context.getDefaultWebContext().project,
        projectName = project && project.name;

    return scrubbers[searchProvider].reset(projectName);
}

export function isPathFilter(searchProvider: Models.SearchProvider, name: string): boolean {
    return scrubbers[searchProvider].isPathFilter(name);
}

function getFilterIds(filter: any[]): string[] {
    return filter.map((f, i) => {
        return f.id;
    });
} 