export const ENTITY_SEARCH_STARTED = "ENTITY_SEARCH_STARTED";
export const ENTITY_SEARCH_COMPLETED = "ENTITY_SEARCH_COMPLETED";
export const ENTITY_SEARCH_FAILED = "ENTITY_SEARCH_FAILED";

export interface ISearchResultsPayload {
    resultsCount: number;

    searchFilters: { [key: string]: string[]; };

    searchText: string;
}

export interface ISearchStartedPayload {
    searchFilters: { [key: string]: string[]; };

    searchText: string;

    isLandingPage: boolean;
}