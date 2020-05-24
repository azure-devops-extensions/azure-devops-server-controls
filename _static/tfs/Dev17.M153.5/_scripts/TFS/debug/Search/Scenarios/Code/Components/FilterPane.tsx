import * as React from "react";
import * as Constants from "Search/Scenarios/Code/Constants";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as SearchPickList from "SearchUI/SearchPickList";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { TreeFilterBarItem } from "Search/Scenarios/Code/Components/TreeFilterBarItem";
import { BranchSelectorFilterBarItem } from "Search/Scenarios/Code/Components/BranchSelectorFilterBarItem";
import { compare } from "Search/Scenarios/Shared/Utils";
import { FilterBar } from "SearchUI/FilterBar"
import { FilterStoreState, FilterType } from "Search/Scenarios/Shared/Base/Stores/FilterStore";
import { SearchStoreState } from "Search/Scenarios/Shared/Base/Stores/SearchStore";
import { SearchQuery, CodeQueryResponse } from "Search/Scenarios/WebApi/Code.Contracts";

const searchPickListMenuMaxWidth: number = 510;

export interface IFilterPaneProps extends Container.ContainerProps {
    searchStoreState: SearchStoreState<SearchQuery, CodeQueryResponse>;

    filterStoreState: FilterStoreState;
}

export const FilterPane : React.StatelessComponent<IFilterPaneProps> = (props: IFilterPaneProps) => {
    const { response, query } = props.searchStoreState,
        { onFiltersChanged } = props.actionCreator,
        { filter, filterItems } = props.filterStoreState;
    return (
            <FilterBar
                filter={filter}>
                {
                    Object
                        .keys(filterItems)
                        .map((key: string) => {
                            if (filterItems[key].filterType === FilterType.PickList &&
                                filterItems[key].visible) {
                                let items = [];
                                if (filterItems[key].enabled) {
                                    const filters = response && response
                                        .filterCategories
                                        .filter(c => c.name === key)[0];
                                    items = filters ? filters.filters : [];
                                }

                                return <SearchPickList.SearchPickListFilterBarItem
                                    key={key}
                                    filterItemKey={key}
                                    menuMaxWidth={searchPickListMenuMaxWidth}
                                    isExpandable={true}
                                    { ...searchPickListPropCreators[key](cloneItems(items), filterItems[key].enabled, onFiltersChanged) } />;
                            }
                            else if (filterItems[key].filterType === FilterType.Branch &&
                                filterItems[key].visible) {
                                let items = [];
                                if (filterItems[key].enabled) {
                                    const filters = response && response
                                        .filterCategories
                                        .filter(c => c.name === key)[0];
                                    items = filters ? filters.filters : [];
                                }

                                const { searchFilters } = query,
                                    project = searchFilters[Constants.FilterKeys.ProjectFiltersKey] &&
                                        searchFilters[Constants.FilterKeys.ProjectFiltersKey][0];

                                return <BranchSelectorFilterBarItem
                                    key={key}
                                    filterItemKey={key}
                                    items={cloneItems(items)}
                                    enabled={filterItems[key].enabled}
                                    project={project}
                                    onSelectionChanged={onFiltersChanged}
                                    showFooter={props.isMember}
                                    {...props}/>;
                            }
                            else if (filterItems[key].filterType === FilterType.Path &&
                                filterItems[key].visible) {
                                return <TreeFilterBarItem
                                    key={key}
                                    filterItemKey={key}
                                    enabled={filterItems[key].enabled}
                                    onSelectionChanged={onFiltersChanged}
                                    {...props} />;
                            }
                        })
                }
            </FilterBar>);
    };

function cloneItems(items: _SearchSharedContracts.Filter[]): _SearchSharedContracts.Filter[] {
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
    [Constants.FilterKeys.ProjectFiltersKey]:
    (items: SearchPickList.ISearchPickListItem[], enabled: boolean, onSelectionChanged: (name: string) => void): SearchPickList.ISearchPickListProps => ({
        name: Constants.FilterKeys.ProjectFiltersKey,
        items: items,
        allItemDisplayName: Resources.AllProjectsDisplayLabel,
        allItemLabel: Resources.All,
        width: 160,
        enabled: enabled,
        searchTextPlaceholder: Resources.FindProjectPlaceholder,
        displayName: Resources.ProjectsDisplayLabel,
        onGetFooterMessage: (itemCount: number, searchText: string) =>
            getFooterMessage(
                itemCount,
                searchText,
                Resources.ShowingSingleProject,
                Resources.ShowingMultipleProjects,
                Resources.FoundSingleProject,
                Resources.FoundMultipleProjects),
        onRefineItems: filterItems,
        onSelectionChanged,
        calloutProps: {
            title: Resources.RefineSearchTermText,
            content: Resources.ProjectFilterCalloutContent
        }
    }),
    [Constants.FilterKeys.RepositoryFiltersKey]:
    (items: SearchPickList.ISearchPickListItem[], enabled: boolean, onSelectionChanged: (name: string) => void): SearchPickList.ISearchPickListProps => ({
        name: Constants.FilterKeys.RepositoryFiltersKey,
        items: items,
        allItemDisplayName: Resources.AllRepositoriesDisplayLabel,
        allItemLabel: Resources.All,
        width: 160,
        enabled: enabled,
        searchTextPlaceholder: Resources.FindRepoPlaceholder,
        displayName: Resources.RepoDisplayLabel,
        onGetFooterMessage: (itemCount: number, searchText: string) =>
            getFooterMessage(
                itemCount,
                searchText,
                Resources.ShowingSingleRepo,
                Resources.ShowingMultipleRepos,
                Resources.FoundSingleRepo,
                Resources.FoundMultipleRepos),
        onRefineItems: filterItems,
        onSelectionChanged,
        calloutProps: {
            title: Resources.RefineFiltersText,
            content: Resources.RepositoryFilterCalloutContent
        }
    }),
    [Constants.FilterKeys.CodeTypeFiltersKey]:
    (items: SearchPickList.ISearchPickListItem[], enabled: boolean, onSelectionChanged: (name: string) => void): SearchPickList.ISearchPickListProps => ({
        name: Constants.FilterKeys.CodeTypeFiltersKey,
        items: items,
        allItemDisplayName: Resources.AllCodeTypesDisplayLabel,
        allItemLabel: Resources.All,
        width: 160,
        enabled: enabled,
        searchTextPlaceholder: Resources.FindCodeTypePlaceholder,
        displayName: Resources.CodeTypeDisplayLabel,
        onGetFooterMessage: (itemCount: number, searchText: string) =>
            getFooterMessage(
                itemCount,
                searchText,
                Resources.ShowingSingleCodeType,
                Resources.ShowingMultipleCodeTypes,
                Resources.FoundSingleCodeType,
                Resources.FoundMultipleCodeTypes),
        onRefineItems: filterItems,
        onSelectionChanged,
        calloutProps: {
            title: Resources.RefineSearchTermText,
            content: Resources.CodeTypeFilterCalloutContent
        },
        compactMode: true,
        compactModeCalloutProps: {
            // ToDo: this should go in SearchPickList
            title: Resources.RefineSearchTermText,
            content: items.length > 0 && (items[0].resultCount === 1
                ? Resources.CompactModeCalloutContentWithSingleMatch
                : Resources.CompactModeCalloutContent)
                .replace("{0}", items[0].resultCount.toString())
                .replace("{1}", items[0].name.toLowerCase())
        }
    })
};