import * as Q from "q";
import { PathSearchResult } from "VersionControl/Scenarios/Shared/Path/PathSearchResult";
import { IPathsSearchSource } from "VersionControl/Scenarios/Shared/Path/PathsSearchSource";

const infolderSearchDelayMs = 10;
const globalSearchDelayMs = 300;

export interface ThrottledSearchResults {
    searchCancelled: boolean;
    results?: PathSearchResult;
}

interface SearchFunction {
    (searchText: string, version: string, deferred: Q.Deferred<ThrottledSearchResults>): void;
}

/**
 * Wrapper on top of PathsSearchSource to provide search throttling
 */
export class ThrottledPathsSearchSource {
    private _inFolderThrottledSearch: SearchFunction;
    private _globalThrottledSearch: SearchFunction;

    constructor(
        private _searchSource: IPathsSearchSource,
        infolderSearchDelay: number = infolderSearchDelayMs,
        globalSearchDelay: number = globalSearchDelayMs) {

        this._inFolderThrottledSearch = debounceSearch(this._doInFolderSearch, infolderSearchDelay);
        this._globalThrottledSearch = debounceSearch(this._doGlobalSearch, globalSearchDelay);
    }

    public getInFolderSearchResults(searchText: string, version: string): IPromise<ThrottledSearchResults> {
        const deferred = Q.defer<ThrottledSearchResults>();
        this._inFolderThrottledSearch(searchText, version, deferred);
        return deferred.promise;
    }

    public getGlobalSearchResults(searchText: string, version: string): IPromise<ThrottledSearchResults> {
        const deferred = Q.defer<ThrottledSearchResults>();
        this._globalThrottledSearch(searchText, version, deferred);
        return deferred.promise;
    }

    private _doInFolderSearch = (searchText: string, version: string, deferred: Q.Deferred<ThrottledSearchResults>) => {
        this._searchSource.getInFolderSearchResults(searchText, version).then(
            searchResults => deferred.resolve({ searchCancelled: false, results: searchResults }),
            deferred.reject);
    }

    private _doGlobalSearch = (searchText: string, version: string, deferred: Q.Deferred<ThrottledSearchResults>) => {
        this._searchSource.getGlobalSearchResults(searchText, version).then(
            searchResults => deferred.resolve({ searchCancelled: false, results: searchResults }),
            deferred.reject);
    }
}

/**
 * Creates and returns a new debounced version of the search function
 * which will postpone its execution until after wait milliseconds have elapsed
 * since the last time it was invoked. While debouncing, it also resolves
 * deferred for the last function call with search cancelled flags.
 */
function debounceSearch(method: SearchFunction, ms: number): SearchFunction {
    let timeout: number;
    let lastDeferred: Q.Deferred<ThrottledSearchResults>;

    return function (searchText: string, version: string, deferred: Q.Deferred<ThrottledSearchResults>) {
        if (timeout) {
            clearTimeout(timeout);
            lastDeferred && lastDeferred.resolve({ searchCancelled: true });
        }
        lastDeferred = deferred;
        timeout = setTimeout(() => {
            timeout = null;
            lastDeferred = null;
            method(searchText, version, deferred);
        }, ms);
    };
}