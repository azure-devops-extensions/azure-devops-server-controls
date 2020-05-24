import * as React from "react";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import * as Container from "Search/Scenarios/WorkItem/Components/Container";
import * as SearchPickList from "SearchUI/SearchPickList";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { AreaNodeTreeFilterBarItem } from "Search/Scenarios/WorkItem/Components/AreaNodeTreeFilterBarItem";
import { compare } from "Search/Scenarios/Shared/Utils";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { FilterBar } from "SearchUI/FilterBar";
import { FilterType, FilterStoreState } from "Search/Scenarios/Shared/Base/Stores/FilterStore";
import { SearchStoreState } from "Search/Scenarios/Shared/Base/Stores/SearchStore";
import { WorkItemSearchRequest, WorkItemSearchResponse, WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";

const searchPickListMenuMaxWidth: number = 510;

export interface IFilterPaneProps extends Container.ContainerProps {
    searchStoreState: SearchStoreState<WorkItemSearchRequest, WorkItemSearchResponse>;

    filterStoreState: FilterStoreState;
}

export const FilterPane : React.StatelessComponent<IFilterPaneProps> = (props: IFilterPaneProps) => {
        const { filter, filterItems } = props.filterStoreState,
            { onFiltersChanged } = props.actionCreator,
            { response } = props.searchStoreState;
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
                                    { ...searchPickListPropCreators[key](cloneItems(items, getFilterItemMap(key)), filterItems[key].enabled, onFiltersChanged) } />;
                            }
                            else if (filterItems[key].filterType === FilterType.Path &&
                                filterItems[key].visible) {
                                return <AreaNodeTreeFilterBarItem
                                    key={key}
                                    filterItemKey={key}
                                    enabled={filterItems[key].enabled}
                                    onItemSelected={onFiltersChanged}
                                    {...props} />;
                            }
                        })
                }
            </FilterBar>);
    }

function getFilterItemMap(
    key: string
): (item: _SearchSharedContracts.Filter) => _SearchSharedContracts.Filter {
    return ignoreCaseComparer(Constants.FilterKeys.AssignedToFiltersKey, key) === 0 ? (item: _SearchSharedContracts.Filter) =>
        {
            item.name = item.name.replace(/(<.*>)/i, "");
            return item;
        }
        : undefined;
}



function cloneItems(
    items: _SearchSharedContracts.Filter[],
    mapFilterItem?: (item: _SearchSharedContracts.Filter) => _SearchSharedContracts.Filter): _SearchSharedContracts.Filter[] {
    const clonedItems = [];
    items.forEach(item => {
        const clonedItem: _SearchSharedContracts.Filter = Object.assign({}, item);
        mapFilterItem ? clonedItems.push(mapFilterItem(clonedItem)): clonedItems.push(clonedItem);
    });
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
        onSelectionChanged,
        calloutProps: {
            title: Resources.RefineSearchTermText,
            content: Resources.ProjectFilterCalloutContent
        }
    }),
    [Constants.FilterKeys.WorkItemTypesFiltersKey]:
    (items: SearchPickList.ISearchPickListItem[], enabled: boolean, onSelectionChanged: (name: string) => void): SearchPickList.ISearchPickListProps => ({
        name: Constants.FilterKeys.WorkItemTypesFiltersKey,
        items: items,
        allItemDisplayName: Resources.AllWorkItemTypesDisplayLabel,
        allItemLabel: Resources.All,
        width: 160,
        enabled: enabled,
        displayName: Resources.WorkItemTypesDisplayLabel,
        searchTextPlaceholder: Resources.FindWorkItemTypePlaceholder,
        onGetFooterMessage: (itemCount: number, searchText: string) =>
            getFooterMessage(
                itemCount,
                searchText,
                Resources.ShowingSingleWorkItemType,
                Resources.ShowingMultipleWorkItemTypes,
                Resources.FoundSingleWorkItemType,
                Resources.FoundMultipleWorkItemTypes),
        onRefineItems: filterItems,
        onSelectionChanged,
        calloutProps: {
            title: Resources.RefineSearchTermText,
            content: Resources.WorkItemTypesFilterCalloutContent
        }
    }),
    [Constants.FilterKeys.StateFiltersKey]:
    (items: SearchPickList.ISearchPickListItem[], enabled: boolean, onSelectionChanged: (name: string) => void): SearchPickList.ISearchPickListProps => ({
        name: Constants.FilterKeys.StateFiltersKey,
        items: items,
        allItemDisplayName: Resources.AllStatesDisplayLabel,
        allItemLabel: Resources.All,
        width: 160,
        enabled: enabled,
        displayName: Resources.WorkItemStatesDisplayLabel,
        searchTextPlaceholder: Resources.FindStatePlaceholder,
        onGetFooterMessage: (itemCount: number, searchText: string) =>
            getFooterMessage(
                itemCount,
                searchText,
                Resources.ShowingSingleState,
                Resources.ShowingMultipleStates,
                Resources.FoundSingleState,
                Resources.FoundMultipleStates),
        onRefineItems: filterItems,
        onSelectionChanged,
        calloutProps: {
            title: Resources.RefineSearchTermText,
            content: Resources.WorkItemStatesFilterCalloutContent
        }
    }),
    [Constants.FilterKeys.AssignedToFiltersKey]:
    (items: SearchPickList.ISearchPickListItem[], enabled: boolean, onSelectionChanged: (name: string) => void): SearchPickList.ISearchPickListProps => ({
        name: Constants.FilterKeys.AssignedToFiltersKey,
        items: items,
        allItemDisplayName: Resources.Any,
        allItemLabel: Resources.Any,
        width: 160,
        enabled: enabled,
        displayName: Resources.AssignedToDisplayLabel,
        searchTextPlaceholder: Resources.FindAssignedToPlaceholder,
        onGetFooterMessage: (itemCount: number, searchText: string) => getFooterMessage(
            itemCount,
            searchText,
            Resources.ShowingSingleUser,
            Resources.ShowingMultipleUsers,
            Resources.FoundSingleUser,
            Resources.FoundMultipleUsers),
        onRefineItems: filterItems,
        onSelectionChanged,
        calloutProps: {
            title: Resources.RefineSearchTermText,
            content: Resources.AssignedToFilterCalloutContent
        }
    })
};