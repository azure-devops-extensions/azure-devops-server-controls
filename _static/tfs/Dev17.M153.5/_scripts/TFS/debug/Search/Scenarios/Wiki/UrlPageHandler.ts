import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ActionCreator } from "Search/Scenarios/Wiki/ActionCreator";
import { AggregateState } from "Search/Scenarios/Wiki/Stores/StoresHub";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import * as Helpers from "Search/Scripts/Common/TFS.Search.Helpers";
import { SearchEntitiesIds } from "Search/Scripts/React/Models";
import * as Utils_Url from "VSS/Utils/Url";

export interface UrlParameters {
    text?: string;
    // tslint:disable-next-line:no-reserved-keywords
    type?: string;
    // tslint:enable-next-line:no-reserved-keywords
    filters?: string;
}

export function applyNavigatedUrl(actionCreator: ActionCreator, rawstate: UrlParameters, aggregateState: AggregateState): void {
    const isFirstTime = !aggregateState.searchState.searchText;
    const existingUrlParameters = getUrlParamters(aggregateState, rawstate);

    if (isFirstTime || !areEqualUrlParameters(rawstate, existingUrlParameters)) {
        actionCreator.performSearch(rawstate.text, parseFilters(rawstate.filters), rawstate.type || SearchEntitiesIds.wiki);
    }
}

export function getUrlParamters(aggregateState: AggregateState, previousParameters: UrlParameters): UrlParameters {
    const params: UrlParameters = {};

    const { searchState: { searchText, searchFilters }, contributionsState: { currentTab } } = aggregateState;

    if ((currentTab !== SearchEntitiesIds.wiki) || previousParameters.type) {
        params.type = currentTab;
    }

    if (searchText || previousParameters.text) {
        params.text = searchText;
    }

    if (searchFilters || previousParameters.filters) {
        const filters: string = filtersToUrlString(searchFilters);
        if (filters) {
            params.filters = filters;
        }
    }

    return params;
}

export function getAccountContextUrl(searchText: string) {
    const params = {
        type: SearchConstants.WikiEntityTypeId,
        text: searchText,
        project: null
    };

    const collectionName = TfsContext.getDefault().contextData.collection.name;

    return TfsContext.getDefault()
            .getCollectionActionUrl(collectionName, "", SearchConstants.WikiSearchControllerName, params as IRouteData);
}

export function areEqualUrlParameters(a: UrlParameters, b: UrlParameters): boolean {
    return a.text === b.text &&
        a.type === b.type &&
        a.filters === b.filters;
}

/**
 * Redirect to Search UI for currently search entity is anything other than wiki
 * @param aggregateState Current page state
 * @param params new url parameters
 * @returns {bool} Is redirect initiated?
 */
export function redirectIfNeeded(aggregateState: AggregateState, params: UrlParameters): boolean {
    if (params.type && params.type !== SearchEntitiesIds.wiki) {
        const redirectParams = { ...getUrlParamters(aggregateState, params), ...params };
        Helpers.Utils.createNewSearchRequestState(redirectParams.text || "", redirectParams.type);
        return true;
    }

    return false;
}

const projectFiltersRegex = /ProjectFilters{(.*?)}/g;
const wikiFiltersRegex = /WikiFilters{(.*?)}/g;

/**
 * Parse array of project filter strings from provided text
 * @param string filter
 */
function parseFilterString(filterString: string, filterRegex): string[] {
    const result = filterRegex.exec(filterString);
    if (result && result.length === 2) {
        return result[1].split("*");
    }
}

export function parseFilters(filterString: string): { [key: string]: string[]; } {
    const filters: { [key: string]: string[]; } = {};
    const projectFilters = parseFilterString(filterString, projectFiltersRegex);
    const wikiFilters = parseFilterString(filterString, wikiFiltersRegex);

    if (projectFilters && projectFilters.length > 0) {
        filters[SearchConstants.ProjectFilterNew] = projectFilters;
    }
    if (wikiFilters && wikiFilters.length > 0) {
        filters[SearchConstants.WikiFacet] = wikiFilters;
    }
    return filters;
}

export function filtersToUrlString(searchFilters: { [key: string]: string[]; }): string {
    let urlString: string = "";

    if (searchFilters) {
        $.each(searchFilters, (key: string, filters: string[]) => {
            switch (key) {
                case SearchConstants.ProjectFilterNew:
                    if (filters && filters.length) {
                        urlString = urlString + getFiltersSubString(filters, SearchConstants.ProjectFilters);
                    }
                    break;

                case SearchConstants.WikiFacet:
                    if (filters && filters.length) {
                        urlString = urlString + getFiltersSubString(filters, SearchConstants.WikiFilters);
                    }
                    break;
            }
        });
    }
    return urlString;
}

function getFiltersSubString(filters: string[], filterName: string) {
    if (filters && filters.length) {
        return filterName + `{${filters.join("*")}}`;
    }
    return "";
}
