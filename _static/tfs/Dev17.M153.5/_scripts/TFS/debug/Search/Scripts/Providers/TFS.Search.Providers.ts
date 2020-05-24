// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Q = require("q");

import {ActionCreator} from "Search/Scripts/React/ActionCreator";
import {ActionsHub} from "Search/Scripts/React/ActionsHub";
import {StoresHub} from "Search/Scripts/React/StoresHub";

/**
* Provider and entity can be used interchangeably - ex - Code, Project etc
*/ 
export interface ISearchProvider {

    /**
    * Determines whether a provider can be used based on FF status or other criteria
    */
    isAvailable(): boolean;

    /**
    * When the search page is initialized, this method is invoked on all the registered providers
    */
    initalizeProvider(actionCreator: ActionCreator, actionsHub: ActionsHub, storesHub: StoresHub, v2Layout: boolean): void;

    /**
    * Attaches to various providers specific navigation events to listen to.
    */
    attachToNavigationEvents(searchView: any): void;

    /**
    * Returns provider id
    */
    getId(): string;

    /**
    * Returns provider's display name (localized)
    */
    getDisplayName(): string;

    /**
    * Defines the initital behavior
    */
    showLandingPage(): void;

    /**
    * Hook into main execute search, allows doing custom work when
    * executeSearch is invoked (ex. logging etc)
    */
    NotifyOnExecuteSearch(sessionStartTime: number): void;

    /**
    * Notify on error while executing search
    */
    NotifyOnExecuteSearchError(error: any, activityId: string): void;

    /**
    * Hook to notify that a switch into current provider action
    * this can be used to initalize/setup on every entity switch in.
    */
    NotifyOnEntitySwitchedTo(): void;
    
    /**
    * Hook to notify a switch from current provider action.
    */
    NotifyOnEntitySwitchedFrom(): void;

    /**
    * Gets the results from the search service asynchronously
    * @param activityId Activity Id associated with the current query (a GUID)
    * @param query The query to search for
    * @param scope The Scope of the current search (account by default)
    * @param filters Project scope and refinement filters to apply if any
    * @param getBextBatch true if showmore is requested
    *
    * @returns Entity search respose with associated activity id
    */
    getResultsAsync(activityId: string,
                    query: string,
                    scope: string,
                    filters: Core_Contracts.IFilterCategory[],
                    getNextBatch: boolean,
                    success,
                    failure,
                    prefetchedResults?,
                    sortOptions?: string): void;

    /**
    * Gets the results from other accounts in the tenant from the search service asynchronously
    * @param activityId Activity Id associated with the current query (a GUID)
    * @param query The query to search for
    * @param scope The Scope of the current search (account by default)
    * @param filters Project scope and refinement filters to apply if any
    * @param getBextBatch true if showmore is requested
    *
    * @returns Entity search respose with associated activity id
    * Note: Currently it does not return any code results and returns only the filters
    */
    getTenantResultsAsync(activityId: string,
        query: string,
        scope: string,
        filters: Core_Contracts.IFilterCategory[],
        getNextBatch: boolean): Q.Promise<IResponseWithActivityId>;

    /**
    * Marks the giving result as selected in results pane
    * @param selectedResult Selected result
    */
    selectResult(selectedResult: string): void;

    /**
    * Returns a unique id of a results identified by givien index in the results pane
    * @param selectedIndex Index of the selected result entry
    */
    getSelectedResultUniqueId(selectedIndex: number): string;

    /**
    * Draws search results
    * @param searchResponse search response
    * @param selectedResult if specified, selected result will be marked as selected, defaults to first result otherwise
    * @param noOfResultsBeforeShowMoreIsClicked Indicates to bring results seen at the index to be shown in the current view port, defaults to index 0 (first result)
    *        (ex. on show more, we show the 51st result as selected and bring that into viewable area)
    */
    renderSearchResults(searchResponse: Core_Contracts.ISearchResponse, noOfResultsBeforeShowMoreIsClicked: number, selectedResult: string, responseActivityId: string, providerId: string, showMoreResults: boolean): void;

    /**
    * Clears results pane elements
    */
    clearResultsView(): void;

    /**
    * create filters from the response
    */
    getFiltersFromResponse(response: IResponseWithActivityId): Q.Promise<Array<Core_Contracts.IFilterCategoryName>>;

    /**
    * Loads prefetched Results from jsonIsland
    */
    loadPrefetchedResults(): Core_Contracts.ISearchResponse;

    /**
    * Handles response messages
    */
    handleReponseMessages(response: IResponseWithActivityId, showMoreResults: boolean, callback: Function): void;
}

/**
* Class to associate response with requested acitivity id
*/
export interface IResponseWithActivityId {
    activityId: string;
    searchResults: Core_Contracts.ISearchResponse;
}

/**
* Class to have 
* 1. registeredProviders - To show the entity chooser to switch between them.
* 2. searchProviders - The current chosen provider used to query and show results. only 1 chosen at a time
*/
export class ProvidersInfo {
    public registeredProviderIds: string[];
    public searchProviders: ISearchProvider[];

    public constructor(registeredProviderIds: string[], searchProviders: ISearchProvider[]) {
        this.registeredProviderIds = registeredProviderIds;
        this.searchProviders = searchProviders;
    }
}