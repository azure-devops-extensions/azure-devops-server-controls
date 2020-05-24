// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Project_Contracts = require("Search/Scripts/Contracts/TFS.Search.Project.Contracts");
import ProjectEntity_Highlighting = require("Search/Scripts/Providers/Project/TFS.Search.ProjectEntity.Highlighting");
import Providers = require("Search/Scripts/Providers/TFS.Search.Providers");
import Q = require("q");
import Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Results = require("Search/Scripts/Providers/Project/TFS.Search.Controls.ProjectResults");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import TFS_UI = require("VSS/Utils/UI");
import TFS_UI_Controls_Grids = require("VSS/Controls/Grids");
import VSS = require("VSS/VSS");
import ViewBuilder = require("Search/Scripts/Common/TFS.Search.ViewBuilder");
import WebApi = require("Search/Scripts/WebApi/TFS.Search.WebApi");
import WebApi_Types = require("Search/Scripts/WebApi/TFS.Search.WebApi.Types");

import {ActionCreator} from "Search/Scripts/React/ActionCreator";
import {ActionsHub} from "Search/Scripts/React/ActionsHub";
import {StoresHub} from "Search/Scripts/React/StoresHub";
import {SearchConstants, ViewMode} from "Search/Scripts/Common/TFS.Search.Constants";

import ResponseMessageHelper_NO_REQUIRE = require("Search/Scripts/Common/TFS.Search.ResponseMessageHelper");

import domElem = TFS_UI.domElem;

var g_showShowMoreLink: boolean;

export class ProjectSearchProvider implements Providers.ISearchProvider {

    private static GRID_CELL_CSS_CLASS: string = "grid-cell";

    private static PROJECT_VIEW_RESULTS_GRID_CSS_CLASS: string = "search-project-view-results-code-grid";
    private static PROJECT_VIEW_RESULTS_PROJECT_NAME_CSS_CLASS: string = "search-project-view-results-project-name";
    private static PROJECT_VIEW_RESULTS_IMAGE_CSS_CLASS: string = "search-project-result-image";
    private static PROJECT_VIEW_RESULTS_CONTENT_CSS_CLASS: string = "search-project-result-content";
    private static PROJECT_VIEW_RESULTS_TITLE_CSS_CLASS: string = "search-project-result-content-title";
    private static PROJECT_VIEW_RESULTS_ONLYPROJECT_NAME_CSS_CLASS: string = "search-project-view-results-onlyproject-name";
    private static PROJECT_VIEW_RESULTS_REPO_NAME_CSS_CLASS: string = "search-project-view-results-repo-name";
    private static PROJECT_VIEW_RESULTS_DESCRIPTION_CSS_CLASS: string = "search-project-view-results-description";
    private static PROJECT_VIEW_RESULTS_DESCRIPTION_CONTENT_CSS_CLASS: string = "search-project-view-results-description-content";
    private static PROJECT_VIEW_RESULTS_DESCRIPTION_NO_CONTENT_CSS_CLASS: string = "search-project-view-results-description-no-content";
    private static PROJECT_VIEW_RESULTS_LARGE_REPOSITORY_ICON_CSS_CLASS: string = "bowtie-icon bowtie-git";
    private static PROJECT_VIEW_RESULTS_LARGE_PROJECT_ICON_CSS_CLASS: string = "large-project-icon";
    private static PROJECT_VIEW_RESULTS_SMALL_PROJECT_ICON_CSS_CLASS: string = "small-project-icon";
    private static MOUSE_OVER_CSS_CLASS: string = "mouse-over";

    private static PREFETCHED_RESULTS_SELECTOR:string = ".project-prefetch-results"

    private static HttpHeaderTfsSessionId: string = "X-TFS-Session";

    private m_currentProjectQueryResponse: Project_Contracts.IProjectQueryResponse;
    private m_skipTakeValues: {};
    private m_projectHitHighlighting: ProjectEntity_Highlighting.ProjectEntityHighlighting;
    private m_resultsView: Results.ProjectResultsView;

    /**
    * See ISearchProvider for description
    */
    public isAvailable(): boolean {
        if (Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchProject)) {
            return true;
        }

        return false;
    }

    /**
    * See ISearchProvider for description
    */
    public initalizeProvider(actionCreator: ActionCreator, actionsHub: ActionsHub, storesHub: StoresHub, v2Layout: boolean): void {
        this.m_projectHitHighlighting = new ProjectEntity_Highlighting.ProjectEntityHighlighting();
        this.m_resultsView = new Results.ProjectResultsView();
    }

    /**
    * See ISearchProvider for description
    */
    public attachToNavigationEvents(searchView: any): void {
        // No-op
    }

    /**
    * See ISearchProvider for description
    */
    public getId(): string {
        return SearchConstants.ProjectEntityTypeId;
    }

    /**
    * See ISearchProvider for description
    */
    public getDisplayName(): string {
        return Resources.ProjectEntityName;
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnExecuteSearch(sessionStartTime: number): void {
        // No-op
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnExecuteSearchError(): void {
        // No-op
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnEntitySwitchedTo(): void {
        // Setup results view
        if (!this.m_resultsView) {
            this.m_resultsView = new Results.ProjectResultsView();
        }

        ViewBuilder.SearchViewBuilder.initializeResultsPane(this.m_resultsView);
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnEntitySwitchedFrom(): void {
        // No-op
    }

    /**
    * See ISearchProvider for description
    */
    public getResultsAsync(activityId: string, query: string, scope: string, filters: Core_Contracts.IFilterCategory[], getNextBatch: boolean, success: any, failure: any, prefetchedResults?: any): void {

        var deferred: JQueryDeferred<Providers.IResponseWithActivityId> = jQuery.Deferred(),
            skipTakeValues = this.getSkipTakeValues(getNextBatch);

        if (State.SearchViewState.searchHttpClient) {
            var searchQuery: Core_Contracts.ISearchQuery = new Base_Contracts.SearchQuery(query, scope, skipTakeValues["skip"], skipTakeValues["take"]);

            State.SearchViewState.searchHttpClient.beginPostProjectQuery(searchQuery, activityId).then((result) => {
                // X-TFS-Session is currently not present in the responseHeaders
                // This is because the VSSF has explicitly set the 
                // Access-Control-Expose-headers to ActivityId, which limits the number of headers the client can access
                var searchResponse: Project_Contracts.IProjectQueryResponse = result;

                // comparing search query hash as a workaround to make sure we show results against the correct query
                if (Helpers.Utils.compareStrings(query, searchResponse.query.searchText)) {
                    success(new ProjectSearchResponse(activityId, searchResponse));
                }
                else {
                    // resolving using activityId as null which effectively discards the search results
                    success(null);
                }
            },
                (error) => {
                    failure(error);
                });

            return;
        }

        // Route the request through TFS search controller
        WebApi.SearchClient.postMSJSON(WebApi_Types.WebApiConstants.PostProjectQueryTfsApi, activityId, query, scope, filters,
            skipTakeValues["skip"], skipTakeValues["take"],
            (jsonResult, statusText, responseHeaders) => {
                success(this.constructResponse(jsonResult, statusText, responseHeaders));
            },
            (error) => {
                failure(error);
            });
    }

    /**
    * See ISearchProvider for description
    */
    public getTenantResultsAsync(activityId: string, query: string, scope: string, filters: Core_Contracts.IFilterCategory[], getNextBatch: boolean)
        : Q.Promise<Providers.IResponseWithActivityId> {

        // Esentially no-op
        var deferred: Q.Deferred<Providers.IResponseWithActivityId> = Q.defer<Providers.IResponseWithActivityId>();
        return deferred.promise;
    }

    /**
    * See ISearchProvider for description
    */
    public selectResult(selectedResult: string): void {
        // No-op

        // TODO: <shyve> should we reveal selected result on URL sharing??
    }

    /**
    * See ISearchProvider for description
    */
    public getSelectedResultUniqueId(selectedIndex: number): string {
        // results.count contains the total results which matched
        // results.values is the array which contains the actual results, so we need to check values.length
        if (selectedIndex < this.m_currentProjectQueryResponse.results.values.length) {
            return this.getUniqueIdentifier(this.m_currentProjectQueryResponse.results.values[selectedIndex]);
        }

        return null;
    }

    /**
    * See ISearchProvider for description
    */
    public showLandingPage(): void {
        // Draw project search tips
        this.drawSearchTips();
    }

    /**
    * See ISearchProvider for description
    */
    public renderSearchResults(response: Core_Contracts.ISearchResponse, noOfResultsBeforeShowMoreIsClicked: number, selectedResult: string, responseActivityId: string, providerId: string): void {
        this.m_currentProjectQueryResponse = <Project_Contracts.IProjectQueryResponse> response;
        this.drawResults(response, null);
    }

    /**
    * See ISearchProvider for description
    */
    public clearResultsView(): void {
        // Clear common elements
        ViewBuilder.SearchViewBuilder.clearResultsView();
        ViewBuilder.SearchViewBuilder.setViewMode();
    }

    /**
    * See ISearchProvider for description
    */
    public getFiltersFromResponse(response: Providers.IResponseWithActivityId): Q.Promise<Array<Core_Contracts.IFilterCategoryName>> {
        // NOOP, project search has no filters
        var deferred = Q.defer<Array<Core_Contracts.IFilterCategoryName>>();
        deferred.resolve(new Array<Core_Contracts.IFilterCategoryName>());
        return deferred.promise;
    }

    /**
    * See ISearchProvider for description
    */
    public loadPrefetchedResults(): Core_Contracts.ISearchResponse  {
        return undefined;
    }

    /**
    * Draws search tips specific to code entity, shown on the landing page
    */
    public drawSearchTips(): void {
        var $summary: JQuery;

        $summary = $(domElem("div"));
        ViewBuilder.SearchViewBuilder.drawSearchTips(Resources.ProjectSearchLandingPageMessage, $summary, false, false);
    }

    /**
    * Returns current skip take values
    */
    private getSkipTakeValues(getNextBatch: boolean): {} {
        if (this.m_skipTakeValues === undefined) {
            this.m_skipTakeValues = {
                'skip': SearchConstants.DefaultSkipResults,
                'take': SearchConstants.MaxResults
            };
        }

        return this.m_skipTakeValues;
    }

    /**
    * Gets grid options which tell the result grid how to display its results.
    */
    private getResultGridOptions(cssClass: string): TFS_UI_Controls_Grids.IGridOptions {
        return {
            cssClass: cssClass,
            header: false,
            sharedMeasurements: false,
            columns: [
                {
                    getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {

                        var result: Project_Contracts.ProjectResult = this.m_currentProjectQueryResponse.results.values[dataIndex],
                            $parentContainer = $(domElem('div')).addClass(ProjectSearchProvider.GRID_CELL_CSS_CLASS),
                            $imageContainer = $(domElem('div')).addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_IMAGE_CSS_CLASS),
                            $contentContainer = $(domElem('div')).addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_CONTENT_CSS_CLASS),
                            pathSeparator: string = " | ",
                            repositoryName: string = result.name,
                            projectName: string = result.name,
                            $titleContainer = $(domElem('div')).addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_TITLE_CSS_CLASS);

                        if (result.type && (result.type === SearchConstants.Repository) && repositoryName && (0 !== repositoryName.length)) {
                            // Adding Repository Image to image container div
                            var $image = $(domElem("span", "icon")).addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_LARGE_REPOSITORY_ICON_CSS_CLASS).appendTo($imageContainer);

                            // Appending repository to title div
                            $(domElem('a'))
                                .text(repositoryName)
                                .attr('target', '_blank')
                                .trigger('click')
                                .attr('href', this.constructLinkToRepository(result))
                                .addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_REPO_NAME_CSS_CLASS)
                                .appendTo($titleContainer);

                            // Appending seperator and project image to title div
                            $(domElem('span')).appendTo($titleContainer).text(pathSeparator).addClass("path-seperator");
                            $(domElem("span", "icon")).addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_SMALL_PROJECT_ICON_CSS_CLASS).appendTo($titleContainer);

                            // Appending parent project name to titlt div
                            var projectName: string = result.parentProjectName;
                            $(domElem('span')).addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_PROJECT_NAME_CSS_CLASS)
                                .text(projectName)
                                .appendTo($titleContainer);
                        }
                        else if (result.type && (result.type === SearchConstants.Project) && projectName && 0 !== projectName.length) {
                            // Adding project iamge to image container div
                            var $image = $(domElem("span", "icon")).addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_LARGE_PROJECT_ICON_CSS_CLASS).appendTo($imageContainer);

                            // Appending project to title div
                            $(domElem('a'))
                                .text(projectName)
                                .attr('target', '_blank')
                                .trigger('click')
                                .attr('href', this.constructLinkToProject(result))
                                .addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_ONLYPROJECT_NAME_CSS_CLASS)
                                .appendTo($titleContainer);
                        }

                        // Appending title container to contetn container
                        $titleContainer.appendTo($contentContainer);

                        // Get descrition content
                        var descriptionContent: string = this.m_projectHitHighlighting.getHighlightedContent(result, SearchConstants.DescriptionHighlightFieldName);

                        //Adding description container to the content container
                        var $description = $(domElem('div')).addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_DESCRIPTION_CSS_CLASS);

                        if (result.description && result.description !== "") {
                            var finalContent = descriptionContent !== "" ? descriptionContent : result.description;
                            $description.addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_DESCRIPTION_CONTENT_CSS_CLASS).append(finalContent);
                        }
                        else { // Adding no description found message
                            $description.addClass(ProjectSearchProvider.PROJECT_VIEW_RESULTS_DESCRIPTION_NO_CONTENT_CSS_CLASS).append(Resources.NoDescriptionFoundMessage);
                        }

                        $description.appendTo($contentContainer);

                        // Appending iamge and content div to parent div
                        $imageContainer.appendTo($parentContainer);
                        $contentContainer.appendTo($parentContainer);

                        return $parentContainer;
                    },
                }]
        } as TFS_UI_Controls_Grids.IGridOptions;
    }

    /** 
    * @param result A project result
    * @return Unique identifier for a result calculated using it's attributes
    * A file can be part of multiple branches or repos (same name and path)
    * Ensure that selected result identifier is unique across all TFS entities (repos, projects etc)
    */
    private getUniqueIdentifier(result: Project_Contracts.IProjectResult): string {
        return result.collection + "/" + result.parentProjectName + "/" + result.type + "/" + result.name + "/" + result.id;
    }

    /**
    * Constructs repository landing page link.
    * @param result Result from search service.  
    */
    private constructLinkToRepository(result: Project_Contracts.IProjectResult): string {
        var collectionContext = Context.SearchContext.getTfsContext(result.collection);

        return collectionContext.navigation.serviceHost.uri
            + encodeURIComponent(result.parentProjectName) + "/_welcome#name="
            + encodeURIComponent(result.name) + "&path=README.md&_a=view";
    }

    /**
    * Constructs project landing page link.
    * @param result Result from search service.  
    */
    private constructLinkToProject(result: Project_Contracts.IProjectResult): string {
        var collectionContext = Context.SearchContext.getTfsContext(result.collection);

        return collectionContext.navigation.serviceHost.uri
            + encodeURIComponent(result.name) + "/" + "_welcome";
    }

    /**
    * Constructs projectsearch response form http response and headers.
    * @param response Response from search service.
    * @param responseHeaders Header which contains activityId.
    */
    private constructResponse(response: any, statusText: any, responseHeaders: any): ProjectSearchResponse {
        var activityId: string = responseHeaders.getResponseHeader(ProjectSearchProvider.HttpHeaderTfsSessionId);
        return new ProjectSearchResponse(activityId, response);
    }

    private drawResults(response: Core_Contracts.ISearchResponse, indexOfResultToBeShownAtTheTop: number): void {

        if (!response || !response.results) {
            return;
        }

        var totalResultsCount: number = response.results.count;
        var displayedResultsCount: number = response.results.values.length;
        g_showShowMoreLink = false;

        if (displayedResultsCount > 0) {
            ViewBuilder.SearchViewBuilder.setFeedbackLink(State.SearchViewState.currentActivityId, SearchConstants.ProjectEntityTypeId);
            ViewBuilder.SearchViewBuilder.setViewMode(ViewMode.ResultsGrid);

            // Adding Message for Showing Displayed/Found Results Count
            ViewBuilder.SearchViewBuilder.setResultCountMessage(displayedResultsCount, totalResultsCount);
            TelemetryHelper.TelemetryHelper.traceLog({ "DisplayedSearchResultsCount": displayedResultsCount });

            var gridOptions = this.getResultGridOptions(ProjectSearchProvider.PROJECT_VIEW_RESULTS_GRID_CSS_CLASS);
            $.extend(gridOptions, { source: response.results.values });
            ViewBuilder.SearchViewBuilder.drawResultsGrid(gridOptions, null, null, indexOfResultToBeShownAtTheTop);
        }
    }

    public handleReponseMessages(response: Providers.IResponseWithActivityId, showMoreResults: boolean, callback: Function): void {
        VSS.using(["Search/Scripts/Common/TFS.Search.ResponseMessageHelper"], (ResponseMessageHelper: typeof ResponseMessageHelper_NO_REQUIRE) => {
            var message = ResponseMessageHelper.ResponseMessage.handleResponseMessages(response, this.getId(), showMoreResults, false);
            ResponseMessageHelper.ResponseMessage.handleBannerErrorCodes(response);
            callback(message);
        });
    }
}

/**
 * Implements project search response
 */
class ProjectSearchResponse implements Providers.IResponseWithActivityId {

    public activityId: string;
    public searchResults: Project_Contracts.IProjectQueryResponse;

    constructor(activityId: string, results: Project_Contracts.IProjectQueryResponse) {
        this.activityId = activityId;
        this.searchResults = results;
    }

}