import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as Constants from "Search/Scenarios/Code/Constants";
import { getHistoryService } from "VSS/Navigation/Services";
import { ActionCreator } from "Search/Scenarios/Code/Flux/ActionCreator";
import { AggregatedState } from "Search/Scenarios/Code/Flux/StoresHub";
import { isValidAction } from "Search/Scenarios/Code/Flux/Stores/PivotTabStore";
import { getItemResultKey } from "Search/Scenarios/Code/Utils";
import { deserialize, serializeFilters, areFiltersEqual, areSortOptionsEqual } from "Search/Scenarios/Shared/Utils";

export function applyNavigatedUrl(
    actionCreator: ActionCreator,
    rawState: _NavigationHandler.UrlParams,
    aggregateState: AggregatedState): void {
    const { searchStoreState, pivotTabsState } = aggregateState,
        { query } = searchStoreState,
        { currentTab, tabItems } = pivotTabsState,
        filtersFromUrl = deserialize<{ [id: string]: string[] }>(rawState.filters) || {},
        sortOptionsFromUrl = deserialize<_SearchSharedContracts.EntitySortOption[]>(rawState.sortOptions) || [];

    let issueNewSearch = rawState.text && query.searchText !== rawState.text;
    issueNewSearch = issueNewSearch || !areFiltersEqual(filtersFromUrl, query.searchFilters);

    if (issueNewSearch) {
        actionCreator.performSearch(rawState.text, sortOptionsFromUrl, filtersFromUrl);
    }
    else if (rawState.action !== currentTab &&
        isValidAction(rawState.action, tabItems.map(ti => ti.tabKey))) {
        actionCreator.changeActiveTab(rawState.action, true);
    }
    else if (!rawState.text) {
        actionCreator.showLandingPage(rawState.filters);
    }
}

export function updateUrl(aggregateState: AggregatedState): void {
    let params = { type: Constants.EntityTypeUrlParam } as _NavigationHandler.UrlParams;
    const currentParams = getHistoryService().getCurrentState() as _NavigationHandler.UrlParams,
        { searchStoreState, pivotTabsState, selectedItem } = aggregateState,
        { query } = searchStoreState,
        activeTabKey = pivotTabsState.currentTab;

    let addHistoryPoint = false, replaceHistoryPoint = false;

    // Replace history point with right "type" param
    // To handle scenarios where user has put garbage in "type" param of the url
    if (params.type !== currentParams.type) {
        replaceHistoryPoint = true;
    }

    if (query.searchText !== currentParams.text) {
        addHistoryPoint = true;
        params.text = query.searchText;
    }

    const filtersInUrl = deserialize<{ [id: string]: string[] }>(currentParams.filters) || {};
    if (!areFiltersEqual(query.searchFilters, filtersInUrl)) {
        addHistoryPoint = true;
        params.filters = serializeFilters(query.searchFilters)
    }

    if (activeTabKey !== currentParams.action) {
        addHistoryPoint = true;
        params.action = activeTabKey;
    }

    const selectedItemKey = getItemResultKey(selectedItem);
    if (!!selectedItemKey &&
        selectedItemKey !== currentParams.result) {
        replaceHistoryPoint = true;
        params.result = selectedItemKey;
    }

    //Removing the sort options from url.
    currentParams.sortOptions = undefined;

    const newParams = { ...currentParams, ...params };

    // Replace is given precedence over adding history.
    if (replaceHistoryPoint) {
        getHistoryService().replaceHistoryPoint(null, newParams, undefined, true, false);
    }
    else if (addHistoryPoint) {
        getHistoryService().addHistoryPoint(null, newParams, undefined, true, false);
    }
}