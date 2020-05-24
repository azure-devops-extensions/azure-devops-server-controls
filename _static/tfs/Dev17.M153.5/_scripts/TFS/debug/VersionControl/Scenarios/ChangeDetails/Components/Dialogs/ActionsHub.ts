import { Action } from "VSS/Flux/Action";

export enum SearchStatus {
    InProgress = 1,
    Succeeded = 2,
    Failed = 3,
}

export interface SearchResultEntry {
    refName: string;
    refUrl: string;
    isBranch: boolean;
    doesRefIncludeCommit: boolean;
    searchStatus: SearchStatus;
}

export interface SearchRequest {
    searchText: string;
    isTagSearch: boolean;
}

export class ActionsHub {
    public searchStarted = new Action<SearchResultEntry[]>();
    public searchSucceeded = new Action<SearchResultEntry[]>();
    public searchFailed = new Action<SearchResultEntry[]>();

    public prefixSearchForRefsStarted = new Action();
    public prefixSearchForRefsFailed = new Action();
    public prefixSearchForRefsNoResultsFound = new Action<SearchRequest>();
}
