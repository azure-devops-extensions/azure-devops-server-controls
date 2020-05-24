import { Action } from "VSS/Flux/Action";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WikiSearchRequest, WikiSearchResponse } from 'Search/Scripts/Generated/Search.Shared.Contracts';
import { RelationFromExactCount } from 'Search/Scripts/Generated/Search.SharedLegacy.Contracts';

export interface ContextUpdatedPayload {
    tfsContext: TfsContext;
}

export interface SearchStartedPayload {
    searchText: string;
    tab: string;
    searchFilters: { [key: string]: string[]; };
    isLoadMore?: boolean;
}

export interface SearchResultsLoadedPayload {
    query: WikiSearchRequest;
    response: WikiSearchResponse;
    isLoadMore?: boolean;
}

export interface TabsLoadedPayload {
    availableTabs: string[];
}

export interface TabChangedPayload {
    tab: string;
}

export interface ResultsCountPayLoad {
    entityResults: IEntityResultCount[];
}

export interface IEntityResultCount  {
    entityName: string;
    count: number;
    relationFromExactCount: RelationFromExactCount;
}

export class ActionsHub {
    public contextUpdated = new Action<ContextUpdatedPayload>();
    public searchFailed = new Action<number>();
    public searchStarted = new Action<SearchStartedPayload>();
    public searchResultsLoaded = new Action<SearchResultsLoadedPayload>();

    public tabChanged = new Action<TabChangedPayload>();
    public tabsLoaded = new Action<TabsLoadedPayload>();
    public resultsCountLoaded = new Action<ResultsCountPayLoad>();
    public resultsCountFailed = new Action<Error>();
}
