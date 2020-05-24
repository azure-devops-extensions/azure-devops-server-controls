import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as _SortOptions from "SearchUI/SortOptions";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import * as Utils from "Search/Scenarios/Shared/Utils";
import { getHistoryService } from "VSS/Navigation/Services";
import { ActionCreator } from "Search/Scenarios/WorkItem/Flux/ActionCreator";
import { AggregatedState } from "Search/Scenarios/WorkItem/Flux/StoresHub";

export function applyNavigatedUrl(
    actionCreator: ActionCreator,
    rawState: _NavigationHandler.UrlParams,
    aggregateState: AggregatedState): void {
    const { searchStoreState, appliedEntitySortOption } = aggregateState,
        { query } = searchStoreState,
        filtersFromUrl = Utils.deserialize<{ [id: string]: string[] }>(rawState.filters) || {},
        sortOptionsFromUrl = Utils.deserialize<_SearchSharedContracts.EntitySortOption[]>(rawState.sortOptions) || [];

    let issueNewSearch = rawState.text && query.searchText !== rawState.text;
    issueNewSearch = issueNewSearch || !Utils.areFiltersEqual(filtersFromUrl, query.searchFilters);
    issueNewSearch = issueNewSearch || !areSortOptionsEqual(sortOptionsFromUrl, [appliedEntitySortOption]);

    if (issueNewSearch) {
        actionCreator.performSearch(rawState.text, sortOptionsFromUrl, filtersFromUrl);
    }
    else if (!rawState.text) {
        actionCreator.showLandingPage(rawState.filters);
    }
}

export function updateUrl(aggregateState: AggregatedState): void {
    let params = { type: Constants.EntityTypeUrlParam } as _NavigationHandler.UrlParams;
    const currentParams = getHistoryService().getCurrentState() as _NavigationHandler.UrlParams,
        { searchStoreState, appliedEntitySortOption } = aggregateState,
        { query } = searchStoreState;

    let addHistoryPoint = false, replaceHistoryPoint = false;

    // Replace history point with right "type" param
    // To handle scenarios where user has absurdely put garbage in "type" param of the url
    if (params.type !== currentParams.type) {
        replaceHistoryPoint = true;
    }

    if (query.searchText !== currentParams.text) {
        addHistoryPoint = true;
        params.text = query.searchText;
    }

    const filtersInUrl = Utils.deserialize<{ [id: string]: string[] }>(currentParams.filters) || {};
    if (!Utils.areFiltersEqual(query.searchFilters, filtersInUrl)) {
        addHistoryPoint = true;
        params.filters = Utils.serializeFilters(query.searchFilters)
    }

    const sortOptionsInUrl = Utils.deserialize<_SearchSharedContracts.EntitySortOption[]>(currentParams.sortOptions) || [];
    if (!areSortOptionsEqual(sortOptionsInUrl, [appliedEntitySortOption])) {
        addHistoryPoint = true;
        params.sortOptions = Utils.serializeSortOptions([appliedEntitySortOption]);
    }

    const newParams = { ...currentParams, ...params };

    // these url parmas are not needed for work item search.
    delete newParams.result;
    delete newParams.action;

    // Replace is given precedence over adding history.
    if (replaceHistoryPoint) {
        getHistoryService().replaceHistoryPoint(null, newParams, undefined, true, false);
    }
    else if (addHistoryPoint) {
        getHistoryService().addHistoryPoint(undefined, newParams, undefined, true, false);
    }
}

function areSortOptionsEqual(
    left: _SearchSharedContracts.EntitySortOption[],
    right: _SearchSharedContracts.EntitySortOption[]): boolean {
    const leftOptionsWithoutRelevance = left.filter(so => so.field !== Constants.SortActionIds.Relevance);
    const rightOptionsWithoutRelevance = right.filter(so => so.field !== Constants.SortActionIds.Relevance);

    return Utils.areSortOptionsEqual(leftOptionsWithoutRelevance, rightOptionsWithoutRelevance);
}