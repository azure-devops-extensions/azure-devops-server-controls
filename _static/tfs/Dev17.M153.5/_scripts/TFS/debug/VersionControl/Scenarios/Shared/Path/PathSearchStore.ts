import * as VSSStore from  "VSS/Flux/Store";
import { format } from 'VSS/Utils/String';
import { equals } from 'VSS/Utils/Core';

import { PathSearchItemIdentifier } from "VersionControl/Scenarios/Shared/Path/IPathSearchItemIdentifier";
import { PathSearchResult, PathSearchResultItem } from "VersionControl/Scenarios/Shared/Path/PathSearchResult";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

export interface PathSearchState {
    searchText: string;
    /**
     * Required for displaying initial search message like 'begin typing to search'
     */
    inputTextEdited: boolean;
    globalSearchResults: PathSearchResult;
    inFolderSearchResults: PathSearchResult;
    selectedItemIdentifier: PathSearchItemIdentifier;
    resultsSetAtLeastOnce: boolean;
    areAllResultsSet: boolean;
    errorMessage: string;
}

/**
 * This store maintains the state of global and infolder path search results including the corresponding header/footer message.
 */
export class PathSearchStore extends VSSStore.Store {
    private _state = PathSearchStore._getEmptyState();

    public onPathEdit = (text: string): void => {
        this._state.searchText = text;
        this._state.inputTextEdited = true;
    }

    /**
     * Before a user can edit the text box, there is default text already present like the current path in our case. This method is used to set that text.
     * We don't set _inputTextChanged to true in this method. It is required for showing message something like 'begin typing to search'.
     */
    public setInitialSearchText = (text: string): void => {
        this._state.searchText = text;
    }

    public setGlobalSearchResults = (results: PathSearchResult): void => {
        this._setSearchResults(this._state.inFolderSearchResults, results);
        this.emitChanged();
    }

    public setInFolderSearchResults = (results: PathSearchResult) => {
        this._setSearchResults(results, this._state.globalSearchResults);
        this.emitChanged();
    }

    public reset = (): void => {
        this._state = PathSearchStore._getEmptyState();
        this.emitChanged();
    }

    public selectItem = (itemIdentifier: PathSearchItemIdentifier): void => {
        this._state.selectedItemIdentifier = itemIdentifier;
        this.emitChanged();
    }

    public failPathSearch = (error: Error): void => {
        this._state.errorMessage = error.message;
        this.emitChanged();
    }

    public getState = (): PathSearchState => {
        return this._state;
    }

    private _setSearchResults(inFolderResults: PathSearchResult, globalResults: PathSearchResult): void {
        let allResultsSet = true;
        if (inFolderResults && this._state.searchText === inFolderResults.searchText) {
            this._state.inFolderSearchResults = inFolderResults;
        }
        else {
            this._state.inFolderSearchResults = PathSearchStore._getEmptyState().inFolderSearchResults;
            allResultsSet = false;
        }

        if (globalResults && this._state.searchText === globalResults.searchText) {
            this._state.globalSearchResults = $.extend({}, globalResults);
            this._state.globalSearchResults.results = filterItems(
                this._state.globalSearchResults.results,
                this._state.inFolderSearchResults.results);
        }
        else {
            this._state.globalSearchResults = PathSearchStore._getEmptyState().globalSearchResults;
            allResultsSet = false;
        }

        this._state.areAllResultsSet = allResultsSet;
        this._state.selectedItemIdentifier = null;
        this._state.resultsSetAtLeastOnce = true;
    }

    private static _getEmptyState(): PathSearchState {
        return {
            searchText: null,
            inputTextEdited: false,
            globalSearchResults: {
                searchText: null,
                results: [],
            },
            inFolderSearchResults: {
                searchText: null,
                results: [],
            },
            selectedItemIdentifier: null,
            resultsSetAtLeastOnce: false,
            areAllResultsSet: false,
            errorMessage: null,
        };
    }
}

/**
 * Filter path items from first array if present in second array
 */
function filterItems(items: PathSearchResultItem[], itemsToFilter: PathSearchResultItem[]): PathSearchResultItem[] {
    if (!items.length || !itemsToFilter.length) {
        return items;
    }

    const filterPathsMap: IDictionaryStringTo<boolean> = {};
    itemsToFilter.forEach((result) => filterPathsMap[result.path] = true);

    return items.filter(result => !filterPathsMap[result.path]);
}