import * as Utils from "Search/Scenarios/Shared/Utils";
import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.Shared.Contracts";
import * as Constants from "Search/Scenarios/WikiV2/Constants";

import { getHistoryService } from "VSS/Navigation/Services";
import { ActionCreator } from "Search/Scenarios/WikiV2/Flux/ActionCreator";
import { AggregatedState } from "Search/Scenarios/WikiV2/Flux/StoresHub";

export function applyNavigatedUrl(
    actionCreator: ActionCreator,
    rawState: _NavigationHandler.UrlParams,
    aggregateState: AggregatedState): void {
    const { searchStoreState } = aggregateState;
    const { request } = searchStoreState;
    const filtersFromUrl = Utils.deserialize<{ [id: string]: string[] }>(rawState.filters) || {};

    let issueNewSearch = rawState.text && request.searchText !== rawState.text;
    issueNewSearch = issueNewSearch || !Utils.areFiltersEqual(filtersFromUrl, request.filters);

    if (issueNewSearch) {
        actionCreator.performSearch(rawState.text, filtersFromUrl, false);
    }
    else if (!rawState.text) {
        actionCreator.showLandingPage(rawState.filters);
    }
}

export function updateUrl(aggregateState: AggregatedState): void {
    let params = { type: Constants.EntityTypeUrlParam } as _NavigationHandler.UrlParams;
    const currentParams = getHistoryService().getCurrentState() as _NavigationHandler.UrlParams;
    const { searchStoreState } = aggregateState;
    const { request } = searchStoreState;

    let addHistoryPoint = false, replaceHistoryPoint = false;

    // Replace history point with right "type" param
    // To handle scenarios where user has absurdely put garbage in "type" param of the url
    if (params.type !== currentParams.type) {
        replaceHistoryPoint = true;
    }

    if (request.searchText !== currentParams.text) {
        addHistoryPoint = true;
        params.text = request.searchText;
    }

    const filtersInUrl = Utils.deserialize<{ [id: string]: string[] }>(currentParams.filters) || {};
    if (!Utils.areFiltersEqual(request.filters, filtersInUrl)) {
        addHistoryPoint = true;
        params.filters = Utils.serializeFilters(request.filters)
    }

    const newParams = { ...currentParams, ...params };

    // these url parmas are not needed for wiki search.
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