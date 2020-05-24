import * as VSSStore from "VSS/Flux/Store";
import { ActionsHub, SearchResultEntry, SearchStatus, SearchRequest } from "VersionControl/Scenarios/ChangeDetails/Components/Dialogs/ActionsHub";
// In case we need to move SearchCommitInBranchesDialog to shared folder, we have to move BranchStats store to shared folder too.
import { BranchStats } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { GitObjectId } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

export interface State {
    searchText: string;
    isTagSearch: boolean;
    searchResults: SearchResultEntry[];
    isPrefixSearchForRefsLoading: boolean;
    isPrefixSearchForRefsFailed: boolean;
}

/**
 * Stores search results when current commit in commit details page is searched in a branch or a tag.
 */
export class Store extends VSSStore.Store {
    private _state: State;

    public getState(): State {
        return this._state;
    }

    constructor(private _actionsHub: ActionsHub, currentCommitBranchStats?: BranchStats) {
        super();

        const searchResults: SearchResultEntry[] = [];
        if (currentCommitBranchStats && currentCommitBranchStats.name && currentCommitBranchStats.url) {
            searchResults.push({
                refName: currentCommitBranchStats.name,
                refUrl: currentCommitBranchStats.url,
                isBranch: true,
                doesRefIncludeCommit: true,
                searchStatus: SearchStatus.Succeeded,
            } as SearchResultEntry);
        }

        this._state = {
            searchResults: searchResults,
        } as State;

        this._actionsHub.searchStarted.addListener(this._onSearchStarted, this);
        this._actionsHub.searchSucceeded.addListener(this._onSearchCompleted, this);
        this._actionsHub.searchFailed.addListener(this._onSearchCompleted, this);

        this._actionsHub.prefixSearchForRefsStarted.addListener(this._onPrefixSearchForRefsStarted, this);
        this._actionsHub.prefixSearchForRefsFailed.addListener(this._onPrefixSearchForRefsFailed, this);
        this._actionsHub.prefixSearchForRefsNoResultsFound.addListener(this._onPrefixSearchForRefsNoResultsFound, this);
    }

    private _onPrefixSearchForRefsStarted(): void {
        this._state.isPrefixSearchForRefsLoading = true;
        this.emitChanged();
    }

    private _onPrefixSearchForRefsNoResultsFound(searchRequest: SearchRequest): void {
        this._state.isPrefixSearchForRefsLoading = false;
        this._state.searchText = searchRequest.searchText;
        this._state.isTagSearch = searchRequest.isTagSearch;
        this._state.searchResults = null;
        this._state.isPrefixSearchForRefsFailed = false;
        this.emitChanged();
    }

    private _onPrefixSearchForRefsFailed(): void {
        this._state.isPrefixSearchForRefsLoading = false;
        this._state.isPrefixSearchForRefsFailed = true;
        this._state.searchResults = null;
        this.emitChanged();
    }

    private _clearPrefixSearchState(): void {
        this._state.searchText = null;
        this._state.isPrefixSearchForRefsFailed = false;
        this._state.isPrefixSearchForRefsLoading = false;
    }

    private _onSearchStarted(payload: SearchResultEntry[]): void {
        if (!payload) {
            return;
        }
        /* Replaces the results in case of multiple search results, otherwise prepends the result to the list of existing results
        */
        if (payload.length > 1) {
            this._state.searchResults = payload;
        }else {
            if (!this._state.searchResults) {
                this._state.searchResults = payload;
            } else {
                const searchResultEntry = payload[0];
                const filteredResults = this._state.searchResults.filter((item: SearchResultEntry) => {
                    return (item.refName === searchResultEntry.refName
                        && item.isBranch === searchResultEntry.isBranch);
                });

                if (filteredResults.length === 1) {
                    this._state.searchResults.splice(this._state.searchResults.indexOf(filteredResults[0]), 1);
                }
                this._state.searchResults.unshift(searchResultEntry);
            }
        }
        this._clearPrefixSearchState();
        this.emitChanged();
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.searchStarted.removeListener(this._onSearchStarted);
            this._actionsHub.searchSucceeded.removeListener(this._onSearchCompleted);
            this._actionsHub.searchFailed.removeListener(this._onSearchCompleted);

            this._actionsHub.prefixSearchForRefsStarted.removeListener(this._onPrefixSearchForRefsStarted);
            this._actionsHub.prefixSearchForRefsFailed.removeListener(this._onPrefixSearchForRefsFailed);
            this._actionsHub.prefixSearchForRefsNoResultsFound.removeListener(this._onPrefixSearchForRefsNoResultsFound);
            this._actionsHub = null;
        }
        this._state = null;
    }

    private _onSearchCompleted(payload: SearchResultEntry[]): void {
        if (!payload) {
            return;
        }
        /* Replaces the results in case of multiple search results, otherwise prepends the result to the list of existing results
        */
        if (payload.length > 1) {
            this._state.searchResults = payload;
            this.emitChanged();
        }else {
            const searchResultEntry = payload[0];
            const filteredResults = this._state.searchResults.filter((item: SearchResultEntry) => {
                return (item.searchStatus === SearchStatus.InProgress
                    && item.refName === searchResultEntry.refName
                    && item.isBranch === searchResultEntry.isBranch);
            });

            if (filteredResults.length === 1) {
                this._state.searchResults.splice(this._state.searchResults.indexOf(filteredResults[0]), 1);
                this._state.searchResults.unshift(searchResultEntry);
                this.emitChanged();
            }
        }
    }
}
