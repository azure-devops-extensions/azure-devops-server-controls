import * as React from "react";
import * as Container from "Search/Scenarios/WikiV2/Components/Container";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.Shared.Contracts";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";
import * as SearchPickList from "SearchUI/SearchPickList";
import * as Utils_String from "VSS/Utils/String";

import { FilterType, FilterStoreState } from "Search/Scenarios/Shared/Base/Stores/FilterStore";
import { compare } from "Search/Scenarios/Shared/Utils";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { FilterBar } from "SearchUI/FilterBar";
import { SearchStoreState } from "Search/Scenarios/Shared/Base/Stores/SearchStoreV2";
import { WikiSearchRequest, WikiSearchResponse } from "Search/Scripts/Generated/Search.Shared.Contracts";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WikiV2/Components/FilterPane";

const searchPickListMenuMaxWidth: number = 510;

export interface IFilterPaneProps extends Container.ContainerProps {
    searchStoreState: SearchStoreState<WikiSearchRequest, WikiSearchResponse>;

    filterStoreState: FilterStoreState;
}

export const FilterPane : React.StatelessComponent<IFilterPaneProps> = (props: IFilterPaneProps) => {
        const { filter, filterItems } = props.filterStoreState;
        const { request, response } = props.searchStoreState;

        return (
            <div className="filter-section">
                <FilterBar
                    filter={filter} >
                    {
                        Object
                            .keys(filterItems)
                            .map((key: string) => {
                                if (filterItems[key].filterType === FilterType.PickList &&
                                    filterItems[key].visible) {
                                    const items: SearchPickList.ISearchPickListItem[] = [];
                                    if (filterItems[key].enabled) {
                                        const facets = response && response.facets[key];
                                        if(facets) {
                                            facets.map((facet: _SearchSharedContracts.Filter) => {
                                                items.push({
                                                    id: facet.id,
                                                    name: facet.name,
                                                    resultCount: facet.resultCount,
                                                    selected: request.filters && request.filters[key] && request.filters[key].indexOf(facet.name) > -1
                                                });
                                            });
                                        }
                                    }

                                    return <SearchPickList.SearchPickListFilterBarItem
                                        key={key}
                                        filterItemKey={key}
                                        menuMaxWidth={searchPickListMenuMaxWidth}
                                        isExpandable={true}
                                        { ...searchPickListPropCreators[key](cloneItems(items), filterItems[key].enabled) } />;
                                }
                            })
                    }
                </FilterBar>
                <ResultsFetched searchResponse={response} />
            </div>);
    };

const ResultsFetched = (props:{searchResponse: _SearchSharedContracts.WikiSearchResponse}): JSX.Element => {
    if(!props.searchResponse) {
        return null;
    }

    const { results, count} = props.searchResponse;
    
    if(!results || count == 0) {
        return null;
    }

    let displayText: string = "";
    if (results.length > 0) {
        if (count > results.length) {
            displayText = Utils_String.format(Search_Resources.ShowingXofYResultsTitle, results.length, count);
        }
        else if (results.length === 1) {
            displayText = Utils_String.format(Search_Resources.ShowingSingleResultTitle);
        }
        else {
            displayText = Utils_String.format(Search_Resources.ShowingXResultsTitle, results.length);
        }

        return (
            <div className="results-text">
                {displayText}
            </div>
        );
    }
}

function cloneItems(items: SearchPickList.ISearchPickListItem[]): SearchPickList.ISearchPickListItem[] {
    const clonedItems = [];
    items.forEach(item => clonedItems.push(Object.assign({}, item)));

    return clonedItems;
}

function getFooterMessage(
    itemCount: number,
    searchText: string,
    showingSingleItemText: string,
    showingMultipleItemsText: string,
    foundSingleItemText: string,
    foundMultipleItemsText: string): string {
    const isSearchTextPresent = !!searchText && searchText !== "";
    itemCount = !isSearchTextPresent ? itemCount - 1 : itemCount; // Adjust for "All" item.

    return !isSearchTextPresent
        ? (itemCount > 1 ? showingMultipleItemsText.replace("{0}", itemCount.toString()) : showingSingleItemText)
        : (itemCount > 1
            ? foundMultipleItemsText.replace("{0}", itemCount.toString())
            : itemCount === 0 ? Resources.NoResultsForSearchText.replace("{0}", searchText) : foundSingleItemText);
}

function filterItems(items: SearchPickList.ISearchPickListItem[], searchText: string): SearchPickList.ISearchPickListItem[] {
    searchText = searchText.toLowerCase();
    return items
        .filter((item) => item.name.toLowerCase().indexOf(searchText) >= 0)
        .sort((a, b) => compare(a.name, b.name, searchText));
}

const searchPickListPropCreators = {
    [SearchConstants.ProjectFilterNew]:
    (items: SearchPickList.ISearchPickListItem[], enabled: boolean): SearchPickList.ISearchPickListProps => ({
        name: SearchConstants.ProjectFilterNew,
        items: items,
        allItemDisplayName: Resources.AllProjectsDisplayLabel,
        allItemLabel: Resources.All,
        width: 160,
        enabled: enabled,
        displayName: Resources.ProjectsDisplayLabel,
        searchTextPlaceholder: Resources.FindProjectPlaceholder,
        onGetFooterMessage: (itemCount: number, searchText: string) => getFooterMessage(
            itemCount,
            searchText,
            Resources.ShowingSingleProject,
            Resources.ShowingMultipleProjects,
            Resources.FoundSingleProject,
            Resources.FoundMultipleProjects),
        onRefineItems: filterItems,
        onSelectionChanged: null,
        calloutProps: {
            title: Resources.RefineSearchTermText,
            content: Resources.ProjectFilterCalloutContent
        }
    }),

    [SearchConstants.WikiFacet]:
    (items: SearchPickList.ISearchPickListItem[], enabled: boolean): SearchPickList.ISearchPickListProps => ({
        name: SearchConstants.WikiFacet,
        items: items,
        allItemDisplayName: Search_Resources.AllWikisLabel,
        allItemLabel: Search_Resources.AllWikisLabel,
        width: 160,
        enabled: enabled,
        displayName: Search_Resources.WikiFiltersDisplayLabel,
        searchTextPlaceholder: Resources.FindWikiPlaceholder,
        onGetFooterMessage: (itemCount: number, searchText: string) => getFooterMessage(
            itemCount,
            searchText,
            Resources.ShowingSingleWiki,
            Resources.ShowingMultipleWikis,
            Resources.FoundSingleWiki,
            Resources.FoundMultipleWikis),
        onRefineItems: filterItems,
        onSelectionChanged: null,
        calloutProps: {
            title: Resources.RefineSearchTermText,
            content: Resources.WikiFilterCalloutContent
        }
    })
};
