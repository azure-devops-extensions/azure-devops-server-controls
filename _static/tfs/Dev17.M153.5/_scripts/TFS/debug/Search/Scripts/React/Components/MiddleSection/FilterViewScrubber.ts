/// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";
import * as Context from "VSS/Context";
import * as Models from "Search/Scripts/React/Models";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { WorkItemConstants } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";

export function viewScrubber(searchProvider: Models.SearchProvider,
    filters: any[],
    isContextualNavigationEnabled: boolean,
    currentPageContext: NavigationContextLevels) {
    let isProjectContext = currentPageContext >= NavigationContextLevels.Project,
        projectFilterNameMap = {
            [Models.SearchProvider.code]: SearchConstants.ProjectFilters,
            [Models.SearchProvider.workItem]: WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME
        };
    if (!isContextualNavigationEnabled || !isProjectContext) {
        return filters;
    }

    return filters.filter((f, i) => {
        return f.name !== projectFilterNameMap[searchProvider]
    });
}