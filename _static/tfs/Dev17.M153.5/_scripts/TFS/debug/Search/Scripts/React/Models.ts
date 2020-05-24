import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";

import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import * as SearchResources from "Search/Scripts/Resources/TFS.Resources.Search";

export interface ISortOption {
    field: string;
    sortOrder: string;
}

export enum SearchProvider {
    code,
    workItem,
    package,
    repository,
    wiki
}

export interface SearchEntity {
    entity: string;
    displayName: string;
    placeholderText: string;
    noResultsText: string;
    learnMoreText: string;
    learnMoreLink: string;
}

export const SearchEntitiesIds = {
    code: "code",
    workItem: "work item",
    wiki: "wiki",
};

const SearchEntitiesMap: IDictionaryStringTo<SearchEntity> = {
        [SearchEntitiesIds.code] : {
            entity: SearchEntitiesIds.code,
            displayName: SearchResources.CodeEntityName,
            placeholderText: SearchResources.CodeSearchWatermark,
            noResultsText: SearchResources.CodeFilesText,
            learnMoreText: SearchResources.CodeEntityName,
            learnMoreLink: SearchConstants.CodeLearnMoreLink
        },

        [SearchEntitiesIds.workItem] : {
            entity: SearchEntitiesIds.workItem,
            displayName: SearchResources.WorkItemEntityNameV2,
            placeholderText: SearchResources.WorkItemSearchWatermark,
            noResultsText: SearchResources.WorkItemsText,
            learnMoreText: SearchResources.WorkItemEntityName,
            learnMoreLink: SearchConstants.WorkItemLearnMoreLink
        },

        [SearchEntitiesIds.wiki] : {
            entity: SearchEntitiesIds.wiki,
            displayName: SearchResources.WikiEntityName,
            placeholderText: SearchResources.WikiSearchWaterMarkText,
            noResultsText: SearchResources.WikiPagesText,
            learnMoreText: SearchResources.WikiEntityName,
            learnMoreLink: SearchConstants.WikiSearchLetUsKnowLink
        }
};

export function getSearchEntitiesMap(): IDictionaryStringTo<SearchEntity> {
    return SearchEntitiesMap;
}

export function getSearchEntities(): SearchEntity[] {
    return Object.keys(SearchEntitiesMap).map(key => SearchEntitiesMap[key]);
}

export function getSearchEntity(entityId: string): SearchEntity {
    return SearchEntitiesMap[entityId.toLowerCase()];
}

/**
 * Interface for props of every menu component.
 * TODO: Define an interface for Item to accomodate Project, repo, Branch, account path etc.
 */
export interface IItemProps {
    item: any,
    onItemSelectionChanged: (name: string, selectedItems: any[]) => void
}

export interface PivotTabItem {
    tabKey: string;
    title: string;
}

export interface SearchPivotTabItem extends PivotTabItem {
    entityId: string;
}

/**
 * Interface for the data of individual menu item in Path menu
 */
export interface IPathControlElement {
    displayName: string;
}

/**
 * Interface for hte data of individual menu item of Code Path menu
 */
export interface ICodePathElement extends IPathControlElement {
    isFolder: boolean;
    isSymLink: boolean;
    isBranch: boolean;
    isRoot: boolean;
}

/**
 * Enum to list down various states an API call can have.
 */
export enum LoadingState {
    Loading = 1,
    LoadSuccess = 2,
    LoadFailed = 4,
    LoadFailedOnSizeExceeded = 8,
    LoadSuccessWithNoSearch = 16,
    UnSupported = 32
}

export interface ICalloutTriggable {
    calloutProps?: { [key: string]: string };
    triggerCallout?(show: boolean): void;
    calloutAnchor?: string;
    ariaDescribedby?: string;
}
