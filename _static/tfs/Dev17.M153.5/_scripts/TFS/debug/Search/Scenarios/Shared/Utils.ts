import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { UrlParams } from "Search/Scenarios/Hub/NavigationHandler";
import { ignoreCaseComparer, format, base64Encode } from "VSS/Utils/String";
import { TelemetryConstants } from "Search/Scenarios/Shared/Constants";

 export function deserialize<T>(dataString: string): T {
    let object: T = {} as T;

    if (!dataString || dataString === "") {
        return;
    }

    try {
        object = JSON.parse(dataString) as T;
    }
    catch (error) {
        dataString.split("}")
            .filter(c => !!c)
            .forEach((category: string) => {
                const nameValues = category.split("{");
                if (nameValues.length === 2) {
                    object[nameValues[0]] = nameValues[1].split("*").filter(s => !!s);
                }
            });
    }

    return object;
}

 export function serializeFilters(object: { [id: string]: string[] }): string {
    let filterString = "";
    if (!!object) {
        Object.keys(object)
            .forEach(key => {
                const filterValues = object[key].join("*");
                filterString = `${filterString}${key}{${filterValues}}`;
            });
    }

    return filterString;
}

 export function serializeSortOptions(sortOptions: _SearchSharedContracts.EntitySortOption[]): string {
    return JSON.stringify(sortOptions);
}

 export function areSortOptionsEqual(
    sortOptionsFromUrl: _SearchSharedContracts.EntitySortOption[],
    currentSortOptions: _SearchSharedContracts.EntitySortOption[]): boolean {
    // If both the sort options are null return true and if any one of them is null return false
    if (!sortOptionsFromUrl && !currentSortOptions) {
        return true;
    }

    if (!sortOptionsFromUrl &&
        currentSortOptions &&
        currentSortOptions.length === 0) {
        return true;
    }

    if (!currentSortOptions
        && sortOptionsFromUrl
        && sortOptionsFromUrl.length === 0) {
        return true;
    }

    if (!sortOptionsFromUrl || !currentSortOptions) {
        return false;
    }

    if (sortOptionsFromUrl.length !== currentSortOptions.length) {
        return false;
    }

    return !sortOptionsFromUrl.some(sortOptionInUrl => {
        return !currentSortOptions.some(currentSortOption => currentSortOption.field.toLowerCase() === sortOptionInUrl.field.toLowerCase() &&
            currentSortOption.sortOrder.toLowerCase() === sortOptionInUrl.sortOrder.toLowerCase());
    });
}

 export function areFiltersEqual(left: IDictionaryStringTo<string[]>, right: IDictionaryStringTo<string[]>): boolean {
    deleteEmptyFilters(left);
    deleteEmptyFilters(right);
    // If both the left and right are null return true and if any one of them is null return false
    if (!left && !right) {
        return true;
    }

    if (!left && right && Object.keys(right).length === 0) {
        return true;
    }

    if (!right && left && Object.keys(left).length === 0) {
        return true;
    }

    if (!left || !right) {
        return false;
    }

    const leftKeys = Object.keys(left),
        rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
        return false;
    }

    // keys in both left and right arrays objects should be same.
    const areKeysEqual = !leftKeys.some(lk => rightKeys.indexOf(lk) < 0);

    if (!areKeysEqual) {
        return false;
    }

    // There doesn't exist a key in leftKeys for which the corresponding array of values in "right" has different number of items or are un-equal
    const areFiltersEqual = !leftKeys.some(lk => left[lk].length !== right[lk].length || left[lk].some(lkv => right[lk].indexOf(lkv) < 0));

    return areFiltersEqual;
}

 export function isEmpty(obj): boolean {
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }

    return JSON.stringify(obj) === JSON.stringify({});
}

/**
 * Compares two string for the occurrence of the searchText
 * Ranks string with exact match higher, then the one in which searchText substring occurs quite early
 * if there is a tie, ranks the two strings based on lexicographic order.
 * @param first
 * @param second
 * @param searchText
 */
 export function compare(first: string, second: string, searchText: string): number {
    first = first.toLowerCase();
    second = second.toLowerCase();
    searchText = searchText.toLowerCase();

    if (first === searchText) {
        return -1;
    }

    if (second === searchText) {
        return 1;
    }

    const substringIndexFirst = first.indexOf(searchText),
        substringIndexSecond = second.indexOf(searchText);

    if (substringIndexFirst !== substringIndexSecond) {
        return substringIndexFirst - substringIndexSecond;
    }
    else {
        return ignoreCaseComparer(first, second);
    }
}

 export function getAccountContextUrl(searchText: string, entityTypeUrlParam: string) {
    const collectionName = TfsContext.getDefault().contextData.collection.name,
        params: UrlParams = {
            type: entityTypeUrlParam,
            text: searchText,
            project: null
        } as UrlParams;

    return TfsContext.getDefault().getCollectionActionUrl(collectionName, "", "search", params as IRouteData);
}

 function deleteEmptyFilters(filters: IDictionaryStringTo<string[]>) {
    for (const key in filters) {
        if (filters[key].length <= 0) {
            delete filters[key];
        }
    }
}

 export interface TrackingData {
    [key: string]: {};
}

 export function getUrlWithTrackingData(url: string, data: TrackingData): string {
    return url + format("{0}{1}={2}",
                (url.indexOf("?") >= 0) ? "&" : "?",
                TelemetryConstants.UrlParameterKeyTrackingData,
                encodeTrackingData(data));
}

 function encodeTrackingData(data: TrackingData): string {
    return encodeURIComponent(base64Encode(JSON.stringify(data)));
}

 export function constructCompleteOrgSearchURL(url: string, searchText: string, source: string, type: string): string  {
    url = `${url}_search?queryText=${searchText}&type=${type}`;
    const queryUrlWithTrackingData = getUrlWithTrackingData(url, {
        source: source
            });
    return queryUrlWithTrackingData;
}

export function getWindowTitle(entityLabel: string, searchText?: string): string {
    const tfsContext = TfsContext.getDefault();
    const isHosted = tfsContext.isHosted;
    const pageTitle = isHosted ? Resources.DevOpsHostedSearchPageTitle : Resources.OnPremSearchPageTitle;

    return searchText
        ? `${searchText} - ${entityLabel} - ${pageTitle}`
        : `${entityLabel} - ${pageTitle}`;
}
