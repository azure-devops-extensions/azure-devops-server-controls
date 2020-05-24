// Copyright (c) Microsoft Corporation. All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />
"use strict";

import * as React from "react";
import AdornmentsHelper = require("Search/Scripts/Providers/Code/Viewer/TFS.Search.Adornments.Helper");
import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Code_Contracts = require("Search/Scripts/Contracts/TFS.Search.Code.Contracts");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import CodeUtils = require("Search/Scripts/Providers/Code/TFS.Search.CodeUtils");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Events_Services = require("VSS/Events/Services");
import FilterDropdown = require("Search/Scripts/Providers/Code/TFS.Search.FilterDropdown");
import FiltersHelper = require("Search/Scripts/Common/TFS.Search.FiltersHelper");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import {ISortOption} from "Search/Scripts/React/Models";
import Navigation_Services = require("VSS/Navigation/Services");
import NavigationHelper = require("Search/Scripts/Common/TFS.Search.NavigationHelper");
import Notifications = require("VSS/Controls/Notifications");
import Performance = require("Search/Scripts/Common/TFS.Search.Performance");
import ProjectList = require("Search/Scripts/Providers/Code/TFS.Search.ProjectList");
import Providers = require("Search/Scripts/Providers/TFS.Search.Providers");
import Q = require("q");
import Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Results = require("Search/Scripts/Providers/Code/TFS.Search.Controls.Results");
import ScopeFilters = require("Search/Scripts/Providers/Code/TFS.Search.ScopeFilters");
import Search_UserPreferences = require("Search/Scripts/UserPreferences/TFS.Search.UserPreferences");
import Search_Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Search_Custom = require("Search/Scripts/Providers/Code/TFS.Search.Code.Custom");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TabbedView = require("Search/Scripts/Providers/Code/Viewer/TFS.Search.Controls.TabbedSearchPreview");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_UI = require("VSS/Utils/UI");
import TFS_UI_Controls_Grids = require("VSS/Controls/Grids");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");
import ViewBuilder = require("Search/Scripts/Common/TFS.Search.ViewBuilder");
import VSS = require("VSS/VSS");
import WebApi = require("Search/Scripts/WebApi/TFS.Search.WebApi");
import WebApi_Types = require("Search/Scripts/WebApi/TFS.Search.WebApi.Types");
import Navigation = require("VSS/Controls/Navigation");

import {PreferenceRestorableSplitter} from "Search/Scripts/Controls/TFS.Search.Controls.Splitter";
import {FilePreviewMode, SearchConstants, ViewMode} from "Search/Scripts/Common/TFS.Search.Constants";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import PopupContent = require("VSS/Controls/PopupContent");

import ExtensionLicensing_NO_REQUIRE = require("Search/Scripts/Common/TFS.Search.ExtensionLicensing");
import ResponseMessageHelper_NO_REQUIRE = require("Search/Scripts/Common/TFS.Search.ResponseMessageHelper");

import * as Results_Info_Control from "Search/Scripts/React/Components/ResultsInfoView/ResultsInfoView";
import * as Results_View_Control from "Search/Scripts/React/Components/ResultsView/ResultsView";
import * as Models from "Search/Scripts/React/Models";

import {CodeSearchGridCellRenderer}from "Search/Scripts/React/Components/GridCellRenderers/GridCellRenderers";
import {ActionCreator} from "Search/Scripts/React/ActionCreator";
import {ActionsHub,
    events,
    IPreviewOrientationChangedPayload,
    IFilterSelectionChangedPayload} from "Search/Scripts/React/ActionsHub";
import {StoresHub} from "Search/Scripts/React/StoresHub";

import domElem = TFS_UI.domElem;
import TfsSearchCodeCommon = require("Search/Scripts/Providers/Code/TFS.Search.Code.Common");
var g_currentTfsContext = Context.SearchContext.getTfsContext(),
    g_scopeFilters: any,
    g_isScopedFiltersActionTriggered: boolean;

export class CodeSearchProvider implements Providers.ISearchProvider {
    private static PREVIEW_FILENAME_CSS_CLASS: string = "preview-header-filename"
    private static PREVIEW_FILENAME_LINK_OFFLINE_CSS_CLASS: string = "preview-header-filename-offline"
    private static FILENAME_HIGHLIGHT_CSS_CLASS: string = "highlight-filename"
    private static TABBED_VIEWER_CSS_CLASS: string = "search-tabbed-viewer";
    private static SEARCH_FILTER_DROPDOWN_BOTTOMS_PREVIEW_ORIENTATION_CSS_CLASS: string = "search-filter-dropdown-bottoms-preview-orientation";
    private static PIVOT_VIEW_CSS_SELECTOR: string = ".pivot-view";
    private static PREFETCHED_RESULTS_SELECTOR: string = ".code-prefetch-data";
    private static PREVIEW_FILENAME_CSS_SELECTOR: string = ".preview-header-filename";
    private static SEARCH_PREVIEW_PANE_HEADER_CSS_SELECTOR: string = ".search-preview-pane-header";
    private static FILTER_DROPDOWN_CSS_SELECTOR: string = ".search-filter-dropdown";
    private static TABBED_VIEWER_CSS_SELECTOR: string = ".search-tabbed-viewer";
    private m_currentCodeQueryResponse: Code_Contracts.ICodeQueryResponse;
    private m_fileTabbedViewer: TabbedView.TabbedSearchPreview;
    private m_lastSelectedResultRepository: RepositoryContext;
    private m_skipTakeValues: {};
    private m_resultsView: Results.ResultsView;
    private _splitter: PreferenceRestorableSplitter;
    private _pivotControl: Navigation.PivotFilter;
    private actionsHub: ActionsHub;
    private actionCreator: ActionCreator;
    private storesHub: StoresHub;
    private retainFocusOnFilterDropdown: boolean;
    private v2Layout: boolean;

    private static SHOW_MORE_RESULTS_LINK_CSS_CLASS: string = "show-more-results";
    private static SHOW_MORE_RESULTS_CELL_BACKGROUND_CSS_CLASS: string = "show-more-results-cell-background";
    private static MOUSE_OVER_CSS_CLASS: string = "mouse-over";
    private static PREVIEW_ORIENTATION_PREF_KEY: string = "UserPreferedPreviewOrientaion/" + SearchConstants.CodeEntityTypeId.charAt(0).toUpperCase() + SearchConstants.CodeEntityTypeId.slice(1);

    /**
    * This is the structure used to cache the repository context object.
    * It is stored as key-value pair. key = account + collection + project + repo value = repository context object.
    * As this is cleared whenever a new query is fired, this structire will
    * contain atmost 50 objects(as we ae showing 50 results now) and each of size around 1.7kb
    */
    private _repoContextMap = {};

    /**
    * See ISearchProvider for description
    */
    public isAvailable(): boolean {
        return true;
    }

    /**
    * See ISearchProvider for description
    */
    public initalizeProvider(actionCreator: ActionCreator, actionsHub: ActionsHub, storesHub: StoresHub, v2Layout: boolean): void {
        // Instantiate an object for the static splitter defined in index/WorkItem.aspx
        this._splitter = <PreferenceRestorableSplitter>Controls.Enhancement.enhance(
            PreferenceRestorableSplitter,
            $(".search-view-preference-restorable-splitter"),
            {
                providerExtensionName: "vss-code-search",
                minWidth: SearchConstants.PreviewPaneMinWidth
            });

        // Initialize scope filters
        this.instantiateScopeFiltersObject();
        this.m_resultsView = new Results.ResultsView();
        this.v2Layout = v2Layout;
        this.retainFocusOnFilterDropdown = false;

        // initialize flux
        this.actionsHub = actionsHub;
        this.actionCreator = actionCreator;
        this.storesHub = storesHub;


        let isServerSortEnabled: any = Helpers.Utils.isFeatureFlagEnabled(
            ServerConstants.FeatureAvailabilityFlags.WebAccessSearchCodeServerSort);
        let isClientSortEnabled: any = Helpers.Utils.isFeatureFlagEnabled(
            ServerConstants.FeatureAvailabilityFlags.WebAccessSearchCodeClientSort);

        // Adding Message for Showing Displayed/Found Results Count
        let _$resultsInfoViewContainer: any = document.getElementsByClassName("search-results-information-container"),
            properties: Results_Info_Control.ISearchResultsInfoViewProps = {
                isClientSideSortEnabled: isClientSortEnabled,
                v2Layout: v2Layout,
                isServerSortEnabled: isServerSortEnabled,
                searchEntity: SearchConstants.CodeEntityTypeId,
                sortFields: [{
                    referenceName: "relevance",
                    displayName: Search_Resources.SortOptionRelevance,
                },
                    {
                        referenceName: "path",
                        displayName: Search_Resources.SortOptionFilePath,
                    },
                    {
                        referenceName: "fileName",
                        displayName: Search_Resources.SortOptionFileName,
                    }],
                actionCreator: this.actionCreator,
                storesHub: this.storesHub
            };

        Results_Info_Control.renderResultsInfoView(_$resultsInfoViewContainer[0], properties);

        // Adding Message for Showing Displayed/Found Results Count
        let _$searchResultsContainer: NodeListOf<Element> = document.getElementsByClassName("search-results-contents");
        Results_View_Control.renderResultsView(_$searchResultsContainer[0], {
            items: [],
            columns: [{
                contentRenderer: CodeSearchGridCellRenderer,
                displayName: "",
                key: "column_1"
            }],
            initialRowIndexUnderFocus: storesHub.searchResultsStore.selectedIndex,
            searchEntity: SearchConstants.CodeEntityTypeId,
            isV2Layout: v2Layout,
            isClientSideSortEnabled: isClientSortEnabled,
            isServerSortEnabled: isServerSortEnabled,
            getComparerDelegate: isClientSortEnabled || isServerSortEnabled ? TfsSearchCodeCommon.Utils.getComparer : null,
            renderMode: "detailed",
            isHeaderVisible: false,
            getItemKey: Utils_Core.delegate(this, (item, index) => {
                return this.getUniqueIdentifier(item);
            }),
            availableWidth: _$searchResultsContainer[0].clientWidth,
            storesHub: this.storesHub,
            actionCreator: this.actionCreator
        });

        this.storesHub.searchResultsActionStore.addListener(
            events.RESULTS_GRID_ACTIVE_ROW_CHANGED_EVENT,
            Utils_Core.delegate(this, this._onRowSelectionChanged));

        this.storesHub.searchResultsActionStore.addListener(
            events.SHOW_MORE_RESULTS_EVENT,
            Utils_Core.delegate(this, this._onShowMoreClicked));

        this.storesHub.searchResultsActionStore.addListener(
            events.RESULTS_GRID_ACTIVE_ROW_INVOKED_EVENT,
            Utils_Core.delegate(this, this._onRowInvoked));

        this.storesHub.previewOrientationStore.addChangedListener(
            Utils_Core.delegate(this, this.setPreviewOrientation));

        this.actionsHub.filterSelectionChanged.addListener(Utils_Core.delegate(this, (payload: IFilterSelectionChangedPayload) => {
            // set this bool to true only if checkbox filters are modified because for only those scenarios we keep the focus on filter dropdown
            // otherwise focus shifts to the first results in the result's pane.
            this.retainFocusOnFilterDropdown = payload.retainFocusOnDropdown;
        }));
    }

    public attachToNavigationEvents(searchView: any): void {
        var historySvc = Navigation_Services.getHistoryService();

        // Attach navigation handlers for code entity
        historySvc.attachNavigate(SearchConstants.ScopeFiltersActionName, (sender, state) => {
            if (State.SearchViewState.currentProvider &&
                Utils_String.ignoreCaseComparer(State.SearchViewState.currentProvider.getId(), this.getId()) === 0) {
                g_isScopedFiltersActionTriggered = true;
                State.SearchViewState.currentAction = Helpers.StateHelper.getActionFromState(state);
                ViewBuilder.SearchViewBuilder.clearResultsView();
                ViewBuilder.SearchViewBuilder.setViewMode();
                this.showLandingPage();

                // Populate scope filters
                this.instantiateScopeFiltersObject();

                // Draw entity types
                ViewBuilder.SearchViewBuilder.setEntityTypes(this.getId());
                ViewBuilder.SearchViewBuilder.setEntityTypeHitCount(this.getId(), -1);

                g_scopeFilters.populateProjectList(() => {
                    var stateFilters = Helpers.StateHelper.getSearchFiltersValueFromState(state);
                    var defaultOrSelectedScopeFilters: Core_Contracts.IFilterCategory[] = FiltersHelper.FiltersHelper.decodeFilters(stateFilters);
                    if (g_scopeFilters._projects && g_scopeFilters._projects.length > 0) {
                        g_scopeFilters.constructScopeFilters(g_scopeFilters._projects, defaultOrSelectedScopeFilters);
                    }
                });
            }
        }, true);

        historySvc.attachNavigate(SearchConstants.ContentsActionName, (sender, state) => {
            searchView.setupSearchPageAndNavigate(state, SearchConstants.ContentsActionName);
        }, true);

        historySvc.attachNavigate(SearchConstants.HistoryActionName, (sender, state) => {
            searchView.setupSearchPageAndNavigate(state, SearchConstants.HistoryActionName);
        }, true);

        historySvc.attachNavigate(SearchConstants.CompareActionName, (sender, state) => {
            searchView.setupSearchPageAndNavigate(state, SearchConstants.CompareActionName);
        }, true);

        if (Helpers
            .Utils
            .isFeatureFlagEnabled(
            ServerConstants
                .FeatureAvailabilityFlags.WebAccessSearchCodeServerSort)) {
            historySvc.attachNavigate(SearchConstants.SortActionName, (sender, state) => {
                searchView.setupSearchPageAndNavigate(state, SearchConstants.SortActionName);
            }, true);
        }
    }

    /**
    * See ISearchProvider for description
    */
    public getId(): string {
        return SearchConstants.CodeEntityTypeId;
    }

    /**
    * See ISearchProvider for description
    */
    public getDisplayName(): string {
        return Resources.CodeEntityName;
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnExecuteSearch(sessionStartTime: number): void {
        Performance.abortCodeSearchPerfScenarios();

        if (sessionStartTime) {
            // This search is triggered from other pages, hence sessionStartTime is present
            // Mark this as a primary scenario by setting isPageInteractive to true (time to interact is measured for this scenario)
            Performance.startRedirectedCodeSearchScenario();
            TelemetryHelper.TelemetryHelper.traceLog({ "RedirectedSearchPreviewOfFirstCodeResultScenarioStarted": true });
        }
        else {
            // This tracks file preview of first result for subsequent searches or right click search from with in search results view
            Performance.startSubsequentCodeSearchScenario();
            TelemetryHelper.TelemetryHelper.traceLog({ "SubsequentSearchPreviewOfFirstCodeResultScenarioStarted": true });
        }

        if (g_isScopedFiltersActionTriggered) {
            var scopeFilters: any = this.getProjectAndRepositoryScopedFilters();

            TelemetryHelper.TelemetryHelper.traceLog({
                "ScopedProjectFiltersSelected": scopeFilters[SearchConstants.ProjectFilters] != null ,
                "ScopedRepositoryFiltersSelected": scopeFilters[SearchConstants.RepoFilters] != null
            });

            g_isScopedFiltersActionTriggered = false;
        }
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnExecuteSearchError(error: any, activityId: string): void {
        this.retainFocusOnFilterDropdown = false;
        this.actionCreator.refreshSearchErrors(null,
            [error],
            activityId,
            false);
        Performance.abortCodeSearchPerfScenarios();
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnEntitySwitchedFrom(): void {
        Performance.abortCodeSearchPerfScenarios();

        // clear hub-pivot filters
        $(SearchConstants.HubPivotFiltersSelector).empty();
        this.clearResultsView();
        // clear filters pane too
        ViewBuilder.SearchViewBuilder.clearFiltersPane();
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnEntitySwitchedTo(): void {
        // Setup results view
        if (!this.m_resultsView) {
            this.m_resultsView = new Results.ResultsView();
        }

        Performance.abortCodeSearchPerfScenarios();
        ViewBuilder.SearchViewBuilder.initializeResultsPane(this.m_resultsView);
        var previewPaneOrientation = Search_UserPreferences.UserPreferences.getUserPreference(
            CodeSearchProvider.PREVIEW_ORIENTATION_PREF_KEY,
            Search_UserPreferences.UserPreferenceScope.Account),
            isRightOriented = !previewPaneOrientation || Utils_String.ignoreCaseComparer(
                previewPaneOrientation,
                SearchConstants.PreviewPaneRightOrientation) === 0;

        this._enhancePivotFilter(isRightOriented);

        previewPaneOrientation = isRightOriented
            ? SearchConstants.PreviewPaneRightOrientation
            : SearchConstants.PreviewPaneBottomOrientation;

        this.actionCreator.updatePreviewOrientationMode(previewPaneOrientation);
    }

    /**
    * See ISearchProvider for description
    */
    public getResultsAsync(activityId: string, query: string, scope: string, filters: Core_Contracts.IFilterCategory[], getNextBatch: boolean, success: any, failure: any, prefetchedResults?: any, sortOptions?: string): void {
        var skipTakeValues = this.getSkipTakeValues(getNextBatch);
        let isServerSideSortEnabled = Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchCodeServerSort);
        if (sortOptions && !isServerSideSortEnabled) {
            sortOptions = null;
        }

        if (filters) {
            // convert pathFilter object value into an array with single value.
            filters = filters.map((f: Core_Contracts.IFilterCategory, index: number) => {
                if (f.name === SearchConstants.PathFilters) {
                    return new Core_Contracts.FilterNameList(SearchConstants.PathFilters, [f.values.path]);
                }
                else return f;
            });
        }

        var searchQuery: Code_Contracts.ICodeSearchQuery = new Code_Contracts.CodeSearchQuery(query, scope, filters || [], skipTakeValues["skip"], skipTakeValues["take"], sortOptions), prefetchedSearchResponse: Code_Contracts.ICodeQueryResponse;
        if (prefetchedResults) {
            TelemetryHelper.TelemetryHelper.traceLog({ "ProcessingPrefetchedResults": true });
            prefetchedSearchResponse = this.sanitizeResults(prefetchedResults);

            // as of now we will get filters and searchFilter both
            // In future we are going to remove filters so it will fallback to searchFilters
            if (!prefetchedSearchResponse.query.filters && prefetchedSearchResponse.query.searchFilters) {
                var filtersMap = prefetchedSearchResponse.query.searchFilters;
                var filtersList: Core_Contracts.IFilterCategory[] = new Array<Core_Contracts.IFilterCategory>();
                $.each(filtersMap, function (key, value) {
                    filtersList.push(new Core_Contracts.FilterNameList(key, value));
                });
                prefetchedSearchResponse.query.filters = filtersList;
            }

            if (this.getSearchQueryIdentifier(searchQuery) === this.getSearchQueryIdentifier(prefetchedSearchResponse.query)) {
                success(new CodeSearchResponse(activityId, prefetchedSearchResponse));
                // This is the first time the search hub has been loaded and we have loaded the results from JsonIsland. To prevent the next user Search from making
                // calls to resolve the service URLs like location ID, service URL and the webAuthToken in case of CORS, we will fire a dummy Query with no callbacks.
                if (State.SearchViewState.searchHttpClient) {
                    State.SearchViewState.searchHttpClient.beginPostCodeQuery(searchQuery, activityId).then(
                        (results) => {
                            TelemetryHelper.TelemetryHelper.traceLog({ "FiredDummyQueryUponResultsPreload": true, "failed": false, "activityId": activityId });
                        },
                        (error) => {
                            TelemetryHelper.TelemetryHelper.traceLog({ "FiredDummyQueryUponResultsPreload": true, "Failed": true, "message": error, "activityId": activityId });
                        });
                }
                return;
            }
        }           
        

        if (State.SearchViewState.searchHttpClient) {
            TelemetryHelper.TelemetryHelper.traceLog({ "InvokingSearchQueryOnSearchController": true });
            State.SearchViewState.searchHttpClient.beginPostCodeQuery(searchQuery, activityId).then(
                (result) => {
                    // X-TFS-Session is currently not present in the responseHeaders
                    // This is because the VSSF has explicitly set the Access-Control-Expose-headers
                    // to ActivityId, which limits the number of headers the client can access
                    var searchResponse: Code_Contracts.ICodeQueryResponse = this.sanitizeResults(result);

                    // comparing search query hash as a workaround to make sure we show results against the correct query
                    if (this.getSearchQueryIdentifier(searchQuery) === this.getSearchQueryIdentifier(searchResponse.query)) {
                        success(new CodeSearchResponse(activityId, searchResponse));
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
        TelemetryHelper.TelemetryHelper.traceLog({ "InvokingSearchQueryOnTfsController": true });
        WebApi.SearchClient.postMSJSON(
            WebApi_Types.WebApiConstants.PostCodeQueryTfsApi,
            activityId,
            query,
            scope,
            filters,
            skipTakeValues["skip"],
            skipTakeValues["take"],
            (jsonResult, statusText, responseHeaders) => {
                success(this.constructResponse(jsonResult, statusText, responseHeaders));
            },
            failure,
            sortOptions);
    }

    /**
    * See ISearchProvider for description
    */
    public getTenantResultsAsync(activityId: string, query: string, scope: string, filters: Core_Contracts.IFilterCategory[], getNextBatch: boolean)
        : Q.Promise<Providers.IResponseWithActivityId> {

        var deferred: Q.Deferred<Providers.IResponseWithActivityId> = Q.defer<Providers.IResponseWithActivityId>();
        var skipTakeValues = this.getSkipTakeValues(getNextBatch);

        if (filters) {
            // convert pathFilter object value into an array with single value.
            filters = filters.map((f: Core_Contracts.IFilterCategory, index: number) => {
                if (f.name === SearchConstants.PathFilters) {
                    return new Core_Contracts.FilterNameList(SearchConstants.PathFilters, [f.values.path]);
                }
                else return f;
            });
        }

        if (State.SearchViewState.searchHttpClient) {
            var searchQuery: Code_Contracts.ICodeSearchQuery = new Code_Contracts.CodeSearchQuery(query, scope, filters || [], skipTakeValues["skip"], skipTakeValues["take"], null);

            State.SearchViewState.searchHttpClient.beginPostTenantCodeQuery(searchQuery, activityId).then(
                (result) => {
                    // X-TFS-Session is currently not present in the responseHeaders
                    // This is because the VSSF has explicitly set the 
                    // Access-Control-Expose-headers to ActivityId, which limits the number of headers the client can access
                    var searchResponse: Code_Contracts.ICodeQueryResponse = result;

                    var tenantContextQuery: Code_Contracts.ICodeSearchQuery = this.getTenantContextQuery(searchQuery);

                    // comparing search query hash as a workaround to make sure we show results against the correct query
                    if (this.getSearchQueryIdentifier(tenantContextQuery) === this.getSearchQueryIdentifier(searchResponse.query)) {
                        deferred.resolve(new CodeSearchResponse(activityId, searchResponse));
                    }
                    else {
                        // resolving using activityId as null which effectively discards the search results
                        deferred.resolve(new CodeSearchResponse(null, null));
                    }
                },
                (error) => {
                    deferred.reject(error);
                });

            return deferred.promise;
        }

        // Route the request through TFS search controller
        WebApi.SearchClient.postMSJSON(WebApi_Types.WebApiConstants.PostTenantCodeQueryTfsApi, activityId, query, scope, filters,
            skipTakeValues["skip"], skipTakeValues["take"],
            (jsonResult, statusText, responseHeaders) => {
                deferred.resolve(new CodeSearchResponse(activityId, jsonResult));
            },
            (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
    * See ISearchProvider for description
    */
    public selectResult(selectedResult: string): void {
        var selectedResultHasChanged: boolean = State.SearchViewState.currentSelectedResultUniqueId === selectedResult ? false : true;

        if (selectedResultHasChanged) {
            // Being cautious, abort any open file preview perf scenarios before starting another
            Performance.abortCodeSearchPerfScenarios();
            // The selected result has changed. Find the index, update the selected row, and show the preview.
            State.SearchViewState.currentSelectedResultUniqueId = selectedResult;
            var index: number = this.findSelectedResultIndex();

            TelemetryHelper.TelemetryHelper.traceLog({
                "SelectedFileIndex": index
            });

            var state = Helpers.StateHelper.getCurrentState(),
                codeResult = <Code_Contracts.CodeResult>this.m_currentCodeQueryResponse.results.values[index],

                successCallback = Utils_Core.delegate(this, (tabbedViewer) => {
                    if (tabbedViewer) {
                        ViewBuilder.SearchViewBuilder.selectResultAndPreview(index, tabbedViewer);
                        this.appendFileNameToPreviewPane(index);
                    }
                }),

                failureCallback = Utils_Core.delegate(this, (error) => {
                    ViewBuilder.SearchViewBuilder.showNoPreviewMessage(error);
                    this.appendFileNameToPreviewPane(index);
                    Performance.abortCodeSearchPerfScenarios();
                    Utils_Accessibility.announce(error);
                }),

                activityId: string = State.SearchViewState.currentActivityId,
                providerId: string = State.SearchViewState.currentProvider.getId();

            // Start result selection change perf scenario.
            Performance.startCodeResultSelectionChangeScenario();

            var previewLoadStartTime: any = Performance.getTimestamp();
            this.getResultPreview(index, false, state, State.SearchViewState.currentAction, previewLoadStartTime, activityId, providerId, successCallback, failureCallback);
        }
    }

    /**
    * See ISearchProvider for description
    */
    public getSelectedResultUniqueId(selectedIndex: number): string {
        // results.count contains the total results which matched
        // results.values is the array which contains the actual results, so we need to check values.length
        if (selectedIndex < this.m_currentCodeQueryResponse.results.values.length) {
            return this.getUniqueIdentifier(this.m_currentCodeQueryResponse.results.values[selectedIndex]);
        }

        return null;
    }

    /**
    * See ISearchProvider for description
    */
    public showLandingPage(): void {
        ViewBuilder.SearchViewBuilder.hidePivotFilters();
        // Draw code search tips
        this.drawSearchTips();

        // Show scope filters
        var currentAction: string = Helpers.Utils.extractParamValueFromUrl(window.location.href, SearchConstants.ActionTextParameterNameInUrl);
        if (!Helpers.Utils.compareStrings(currentAction, SearchConstants.ScopeFiltersActionName)) {
            NavigationHelper.NavigationHelper.redirectToScopedFiltersAction(this.getId());
        }
    }

    /**
    * See ISearchProvider for description
    */
    public renderSearchResults(
        response: Core_Contracts.ISearchResponse,
        noOfResultsBeforeShowMoreIsClicked: number,
        selectedResult: string,
        responseActivityId: string,
        providerId: string,
        showMoreResults: boolean): void {
        var totalResultsCount: number = response.results.count,
            displayedResultsCount: number = response.results.values.length,
            revealIndex: number = this.getRevealIndexIfShowMoreIsClicked(totalResultsCount, displayedResultsCount, noOfResultsBeforeShowMoreIsClicked),
            validatedSelection: string = undefined;

        this.actionCreator.refreshSearchErrors(response, response.errors, responseActivityId, showMoreResults);

        // Clearing the repository context cache when a new query is fired and activityid matches
        this.clearRepositoryContextMap();
        this.m_currentCodeQueryResponse = <Code_Contracts.ICodeQueryResponse>response;

        if (displayedResultsCount > 0) {
            ViewBuilder.SearchViewBuilder.showPivotFilters();

            if (!State.SearchViewState.currentSelectedResultUniqueId && selectedResult) {
                // Preserve the result selection on URL sharing
                validatedSelection = selectedResult;
            }
            else if (revealIndex && revealIndex > -1) {
                validatedSelection = this.getSelectedResultUniqueId(revealIndex);
            }
            else {
                validatedSelection = this.getSelectedResultUniqueId(0);
            }

            State.SearchViewState.currentSelectedResultUniqueId = validatedSelection;

            var index: number = this.findSelectedResultIndex();
            this.getFirstResultAsync(index, responseActivityId, providerId, Utils_Core.delegate(this, (previewObject) => {
                if (previewObject) {
                    this.createPreview(previewObject.preview, index);
                }
            }), (error) => {
                // in case of error no preview error message is already shown to user. So no need to handle here.
                Performance.abortCodeSearchPerfScenarios();
            });

            this.drawResults(response, index);
            Performance.endScenario(Performance.PerfConstants.RedirectedSearchPreviewOfFirstCodeResult);
            Performance.endScenario(Performance.PerfConstants.PreviewOfFirstCodeResult);
        }
        else {
            // Abort file preview perf scenarios
            Performance.abortCodeSearchPerfScenarios();
        }

        // reset the state of the boolean which determines whether or not to shift focus to results view
        this.retainFocusOnFilterDropdown = false;
    }

    /**
    * See ISearchProvider for description
    */
    public loadPrefetchedResults(): Core_Contracts.ISearchResponse {
        var prefetchedResults: Core_Contracts.ISearchResponse;

        var results: string = $(CodeSearchProvider.PREFETCHED_RESULTS_SELECTOR).html();
        $(CodeSearchProvider.PREFETCHED_RESULTS_SELECTOR).html("");

        if (results && results !== "null") {
            prefetchedResults = this.vcTypeAdapter(Utils_Core.parseMSJSON(results, false));
        }

        return prefetchedResults;
    }

    /**
    * See ISearchProvider for description
    */
    public clearResultsView(): void {
        // Clear out custom elements
        this.clearPreviewFileTitle();
        // hide search results view as well search results information.
        this.storesHub.searchResultsStore.reset();

        ViewBuilder.SearchViewBuilder.hidePivotFilters();
        // Clear common elements
        ViewBuilder.SearchViewBuilder.clearResultsView();
        ViewBuilder.SearchViewBuilder.setViewMode(ViewMode.IntermediateViewMode);
    }

    /**
    * Draws search tips specific to code entity, shown on the landing page
    */
    public drawSearchTips(): void {
        var feedbackLink: string,
            helpPageLink: string,
            searchTipsContent: string,
            summaryContent: string,
            $summary: JQuery;

        feedbackLink = "<a href='mailto:vstssearch@microsoft.com' id='search-hub-feedbacklink' target='_top'>vstssearch@microsoft.com</a>",
            helpPageLink = "<a href='https://go.microsoft.com/fwlink/?LinkId=698587&clcid=0x409' id='search-hub-helplink' target='_blank'> " + Search_Resources.WorkItemSearchHelpPage + "</a>";

        searchTipsContent = "<ul><li>" + Resources.SearchTipClassFilter.replace('{0}', "'Driver'") + " - <b>class:Driver</b>" + "</li>" +
            "<li>" + Resources.SearchTipExtensionFilter.replace('{0}', "'ToDo'").replace('{1}', ".js") + " - <b>ToDo ext:js</b>" + "</li>" +
            "<li>" + Resources.SearchTipPathFilter.replace('{0}', "'IndexMapper' ").replace('{1}', "Services/Query") + " - <b>IndexMapper path:Services/Query</b>" + "</li></ul>";

        summaryContent = "<p>" + Resources.SearchTipsSummary1.replace('{0}', helpPageLink) + " " + Resources.SearchTipsSummary2.replace('{0}', feedbackLink) + "</p>";

        $summary = $(domElem("div"));

        $summary.append(Resources.CodeSearchValuePropForGitAndTfvc + "</br></br>");
        $summary.append(Resources.CodeSearchTipHeading);
        $summary.append($(searchTipsContent));
        $summary.append($(summaryContent));

        ViewBuilder.SearchViewBuilder.drawSearchTips(Resources.CodeSearchTipTitle, $summary, true, true);
    }

    private vcTypeAdapter(serviceResponse: Core_Contracts.ISearchResponse): Core_Contracts.ISearchResponse {
        var VCTypeContracts = Base_Contracts.VersionControlType;
        var resultsCount: number = serviceResponse.results.values.length;
        for (var i = 0; i < resultsCount; i++) {
            var value = serviceResponse.results.values[i];
            value.vcType = VCTypeContracts[value.vcType.toLowerCase().replace(/\b[a-z]/g, function (letter) {
                return letter.toUpperCase();
            })];
        }
        return serviceResponse;
    }

    private drawResults(response: Core_Contracts.ISearchResponse, indexUnderFocus: number): void {
        if (!response || !response.results) {
            return;
        }

        var totalResultsCount: number = response.results.count,
            displayedResultsCount: number = response.results.values.length;
        var sortOptions: ISortOption[] = State.SearchViewState.sortOptions ? JSON.parse(State.SearchViewState.sortOptions) : null,
            isServerSortEnabled = Helpers.Utils.isFeatureFlagEnabled(
                ServerConstants.FeatureAvailabilityFlags.WebAccessSearchCodeServerSort);
        if (displayedResultsCount > 0) {
            ViewBuilder.SearchViewBuilder.setViewMode(ViewMode.ResultsGridWithPreview);
            TelemetryHelper.TelemetryHelper.traceLog({ "DisplayedSearchResultsCount": displayedResultsCount });

            // restore preview pane preferences
            this._splitter.restorePreviewPaneSizePreferences(this._splitter.splitOrientation, true);
            // this.actionCreator.updatePreviewOrientationMode(this._pivotControl.getSelectedItem().text);
            this.actionCreator.refreshSearchResults(
                response,
                State.SearchViewState.currentActivityId,
                !(this.v2Layout && this.retainFocusOnFilterDropdown)
                    ? indexUnderFocus
                    : null,
                this._splitter.getFixedSidePixels(),
                Models.SearchProvider.code
            );
            if (isServerSortEnabled) {
                this.actionCreator.changeSearchResultsSortCriteria(sortOptions, false, Models.SearchProvider.code, false, true);
            }
        }
    }

    /** 
     * @param searchQuery Search_Contracts.ISearchQuery
     * @return Unique identifier for a searchQuery calculated using search text and filters
     */
    private getSearchQueryIdentifier(searchQuery: Code_Contracts.ICodeSearchQuery): string {

        var searchQueryIdentifier: string = searchQuery.searchText;

        for (var i: number = 0; i < searchQuery.filters.length; i++) {
            searchQueryIdentifier += searchQuery.filters[i].name;
            searchQueryIdentifier += searchQuery.filters[i].values;
        }

        return searchQueryIdentifier;
    }

    /**
    * @searchQuery Code_Contracts.ICodeSearchQuery is the query made for a particular activity Id
    * @return The same Search Query with the filters removed to suit tenant level query
    */
    private getTenantContextQuery(searchQuery: Code_Contracts.ICodeSearchQuery): Code_Contracts.ICodeSearchQuery {

        searchQuery.filters = new Array<Core_Contracts.IFilterCategory>();

        searchQuery.filters.push(new Core_Contracts.FilterNameList(SearchConstants.AccountFilters,
            new Array<string>(searchQuery.scope)));

        return searchQuery;
    }

    /** 
     * @param codeResult Code_Contracts.ICodeResult
     * @return Unique identifier for a result calculated using collection, project,repo,version,path
     * A file can be part of multiple branches or repos (same name and path)
     * Ensure that selected result identifier is unique across all TFS entities (repos, projects etc)
     */
    private getUniqueIdentifier(codeResult: Code_Contracts.ICodeResult): string {
        var identifier: string;
        if (codeResult.vcType === Base_Contracts.VersionControlType.Git
            || codeResult.vcType === Base_Contracts.VersionControlType.Custom) {
            identifier = codeResult.collection + "/" + codeResult.project + "/" + codeResult.repository + "/" + codeResult.branch + "/" + codeResult.path;
        }
        else if (codeResult.vcType === Base_Contracts.VersionControlType.Tfvc) {
            identifier = codeResult.collection + "/" + codeResult.project + "/" + codeResult.repository + "/" + codeResult.changeId + "/" + codeResult.path;
        }

        return identifier;
    }

    /** 
     * @param codeResult Search_Contracts.ICodeResult
     * @return Unique identifier for a result calculated using collection, project,repo,version,path
     * A repo with same name can be under different projects in a account or under projects with same name under different accounts.
     * To cache repository context we use account name + projectname + reponame as the key to have unique values
     */
    private getRepoIdentifier(codeResult: Code_Contracts.ICodeResult): string {
        return codeResult.account + "/" + codeResult.collection + "/" + codeResult.project + "/" + codeResult.repository;
    }

    /**
    * Appends currently previewed file name to preview pane header
    */
    private appendFileNameToPreviewPane(index: number): void {
        var codeResult: Code_Contracts.ICodeResult = this.getResult(index),
            fileNameLinkToolTip: string = Search_Resources.ResultCellFileNameToolTip.replace("{0}", codeResult.fileName + "\n");

        if (!codeResult) {
            TelemetryHelper.TelemetryHelper.traceLog({ "FileNameLookupFailed": index });
            return;
        }
        var fileName: string = codeResult.fileName;

        var fileNameDomElement: JQuery = $(domElem('a'))
            .text(fileName)
            .attr('target', '_blank')
            .attr('href', CodeUtils.CodeUtils.constructLinkToContent(codeResult));

        Controls.Enhancement.enhance(PopupContent.RichContentTooltip, fileNameDomElement, {
            cssClass: "search-richcontent-tooltip",
            text: fileNameLinkToolTip,
            openCloseOnHover: true,
            openDelay: 800
        });
        // Highlight filename if there is a match in filename field.
        var hits: Base_Contracts.IHit[] = CodeUtils.CodeUtils.getHitsByFieldName(codeResult, SearchConstants.FileNameField);
        if (hits.length === 1 && hits[0].length === -1) {
            fileNameDomElement.addClass(CodeSearchProvider.FILENAME_HIGHLIGHT_CSS_CLASS);
        }

        var previewPaneHeader: JQuery = $(CodeSearchProvider.SEARCH_PREVIEW_PANE_HEADER_CSS_SELECTOR);

        if (codeResult.vcType === Base_Contracts.VersionControlType.Custom) {
            fileNameDomElement.addClass(CodeSearchProvider.PREVIEW_FILENAME_LINK_OFFLINE_CSS_CLASS)
        }

        if (previewPaneHeader.children(CodeSearchProvider.PREVIEW_FILENAME_CSS_SELECTOR).length === 0) {
            fileNameDomElement.appendTo($(domElem('div'))
                .addClass(CodeSearchProvider.PREVIEW_FILENAME_CSS_CLASS)
                .prependTo(previewPaneHeader));
        }
        else {
            var previewFileNameElement = $(CodeSearchProvider.PREVIEW_FILENAME_CSS_SELECTOR);
            previewFileNameElement.empty();
            fileNameDomElement.appendTo(previewFileNameElement);
        }

        fileNameDomElement.click((e) => {
            TelemetryHelper.TelemetryHelper.traceLog({ "FileNameLinkClicked": true });
        });

        var $previewTabHeader: any = $(CodeSearchProvider.TABBED_VIEWER_CSS_SELECTOR).find(CodeSearchProvider.PIVOT_VIEW_CSS_SELECTOR);

        // Unbind to any previous click event on file selection change
        $previewTabHeader.off("click");

        // Bind to click event for the latest file selected
        $previewTabHeader.on("click", (e: any) => {
            var previewAction: string = e.target.innerText.toLocaleLowerCase();

            if (Helpers.Utils.isTabbedViewerAction(previewAction)) {
                TelemetryHelper.TelemetryHelper.traceLog({ "TabbedViewerAction": previewAction });
            }
        });
    }

    public rearrangeFiltersOrder(filterCategories: Array<Core_Contracts.IFilterCategoryName>): Array<Core_Contracts.IFilterCategoryName> {
        let filters = filterCategories.filter((filterCategory) => {
            return (filterCategory.name !== SearchConstants.CodeTypeFilters)
        }).concat(filterCategories.filter((filter) => {
            return (filter.name === SearchConstants.CodeTypeFilters)
        }));

        return filters;
    }

    /**
    * Returns a list of filters fetched from response.
    * Some filters for which the facets are calculated e.g. project, repo, codeelement etc. are fetched from response's fitlerCategories object.
    * If only one project filter is selected and is a Tfvc project we add path scope filter category to the list of filters need to be drawn.
    */
    public getFiltersFromResponse(response: Providers.IResponseWithActivityId): Q.Promise<Array<Core_Contracts.IFilterCategoryName>> {
        var deferred = Q.defer<Array<Core_Contracts.IFilterCategoryName>>(),
            filterCategories: Array<Core_Contracts.IFilterCategoryName> = new Array<Core_Contracts.IFilterCategoryName>(),
            queryFilters: Array<Core_Contracts.IFilterCategory> = (<Code_Contracts.ICodeQueryResponse>response.searchResults).query.filters;

        // if the queryFilters is null which will happen in future since we will be sending searchFilters instead of filters
        // so queryFilters will be null so we extract from searchFilters
        if (!queryFilters && (<Code_Contracts.ICodeQueryResponse>response.searchResults).query.searchFilters)
        {
            var filterMap = (<Code_Contracts.ICodeQueryResponse>response.searchResults).query.searchFilters;            
            var filters: Core_Contracts.IFilterCategory[] = new Array<Core_Contracts.IFilterCategory>();
            $.each(filterMap, function (key, value) {
                filters.push(new Core_Contracts.FilterNameList(key, value));
            });
            queryFilters = filters;
        }

        // create filter category objects.
        response.searchResults.filterCategories.forEach((f: any, index: number) => {

            if (f.name === SearchConstants.AccountFilters) {
                if (Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchMultiAccount)) {
                    filterCategories.push(new Base_Contracts.AccountFilterCategory(f.filters, f.name));
                }
            }
            else if (f.name === SearchConstants.BranchFilters) {
                filterCategories = CodeSearchProvider.addBranchScopeFilters(f.filters, filterCategories, queryFilters);
            }
            else {
                filterCategories.push(new Base_Contracts.DefaultFilterCategory(f.filters, f.name));
            }

        });

        var projectFilters = CodeSearchProvider.getFilterFromList(SearchConstants.ProjectFilters, response.searchResults.filterCategories);
        var selectedProjects: Array<Base_Contracts.Filter>;

        if (projectFilters && projectFilters.length === 1) {
            selectedProjects = (<Base_Contracts.DefaultFilterCategory>projectFilters[0]).filters.filter((f: Base_Contracts.Filter, index) => {
                return f.selected;
            });
        }

        var repoFilters = CodeSearchProvider.getFilterFromList(SearchConstants.RepoFilters, response.searchResults.filterCategories);
        var selectedRepos: Array<Base_Contracts.Filter>;

        if (repoFilters && repoFilters.length === 1) {
            selectedRepos = (<Base_Contracts.DefaultFilterCategory>repoFilters[0]).filters.filter((f: Base_Contracts.Filter, index) => {
                return f.selected;
            });
        }

        var branchFilters = CodeSearchProvider.getFilterFromList(SearchConstants.BranchFilters, response.searchResults.filterCategories);
        var selectedBranches: Array<Base_Contracts.Filter>;

        if (branchFilters && branchFilters.length === 1) {
            selectedBranches = (<Base_Contracts.DefaultFilterCategory>branchFilters[0]).filters.filter((f: Base_Contracts.Filter, index) => {
                return f.selected;
            });
        }

        // iff only one project is selected
        if (selectedProjects && selectedProjects.length === 1 && selectedRepos && selectedRepos.length === 1) {

            var codeResults = response.searchResults.results,
                vcType = null,
                projectName = null,
                branchName: string;

            if (selectedBranches && selectedBranches.length === 1) {
                branchName = "GB" + selectedBranches[0].name;
            }

            // if number of results is greater than 0, no need to make tfs call.
            if (codeResults.values.length > 0) {
                vcType = codeResults.values[0].vcType;
                filterCategories = CodeSearchProvider.addPathScopeFilters(vcType,
                    filterCategories,
                    queryFilters,
                    codeResults.values[0].project,
                    selectedRepos[0].name,
                    response.searchResults.results.values[0].repositoryId,
                    branchName);
                filterCategories = this.rearrangeFiltersOrder(filterCategories);
                deferred.resolve(filterCategories);
            }
            else {
                var httpClient = new ProjectList.SearchHttpClient(Context.SearchContext.getRootRequestPath());

                //Making beginGetProject API call to exclude custom project (eligible for Source Depot accounts)
                httpClient.beginGetProject(selectedProjects[0].name).then((project) => {
                    vcType = CodeUtils.CodeUtils.getRepoType(selectedRepos[0].name);
                    filterCategories = CodeSearchProvider.addPathScopeFilters(vcType,
                        filterCategories,
                        queryFilters,
                        project.name,
                        selectedRepos[0].name,
                        null,
                        branchName);
                    filterCategories = this.rearrangeFiltersOrder(filterCategories);
                    deferred.resolve(filterCategories);
                }, (error) => {
                    filterCategories = this.rearrangeFiltersOrder(filterCategories);
                    deferred.resolve(filterCategories);
                });
            }
        }
        else {
            filterCategories = this.rearrangeFiltersOrder(filterCategories);
            deferred.resolve(filterCategories);
        }

        return deferred.promise;
    }

    /**
     * Add Branch Filters to filterCategories
     */
    private static addBranchScopeFilters(filters: any,
        filterCategories: Array<Core_Contracts.IFilterCategoryName>,
        queryFilters: Array<Core_Contracts.IFilterCategory>): Array<Core_Contracts.IFilterCategoryName> {

        if (filters && filters.length >= 1) {
            var defaultBranch: string, branches: Array<string> = new Array<string>(), defaultFound = false;

            filters.forEach((f: any) => {
                branches.push(f.name);
                if (!defaultFound && f.selected) {
                    defaultBranch = f.name;
                    defaultFound = true;
                }
            });

            //Set the selected branch from the search query response.
            if (!defaultFound) {
                let queryBranches = queryFilters.filter((filter) => {
                    if (filter.name === SearchConstants.BranchFilters) {
                        return true;
                    }
                }).map((filter) => {
                    return filter.values[0]
                });
                defaultBranch = queryBranches[0];
                if (defaultBranch) {
                    defaultFound = true;
                }
            }
            if (!defaultBranch) {
                defaultBranch = branches[0];
                defaultFound = true;
            }

            filterCategories.push(new Base_Contracts.BranchFilterCategory(
                SearchConstants.BranchFilters,
                branches,
                defaultBranch,
                defaultBranch
            ));
        }

        return filterCategories;
    }

    /**
    * Add Path Filters to filterCategories.
    */
    private static addPathScopeFilters(vcType: any,
        filterCategories: Array<Core_Contracts.IFilterCategoryName>,
        queryFilters: Array<Core_Contracts.IFilterCategory>,
        projectName: string,
        repoName: string,
        repoId?: string,
        branchName?: string): Array<Core_Contracts.IFilterCategoryName> {

        // Add the path filter only for TFVC and Git
        if (vcType !== "Custom" && vcType !== Base_Contracts.VersionControlType.Custom) {
            // get value of scope path for which the search request was made.
            var path = null;
            if (queryFilters) {
                var pathFilters = CodeSearchProvider.getFilterFromList(SearchConstants.PathFilters, queryFilters);

                // Add selected branch name from query if no branch is found selected in the response.
                if (!branchName) {
                    let branchFilters = CodeSearchProvider.getFilterFromList(SearchConstants.BranchFilters, queryFilters);
                    if (branchFilters && branchFilters.length === 1) {
                        branchName = "GB" + (<Core_Contracts.PathScopeFilterNameValue>branchFilters[0]).values[0];
                    }
                }

                if (pathFilters && pathFilters.length === 1) {
                    path = (<Core_Contracts.PathScopeFilterNameValue>pathFilters[0]).values[0];
                }
            }

            var versionControlType: Base_Contracts.VersionControlType;
            if (vcType === "Tfvc" || vcType === Base_Contracts.VersionControlType.Tfvc) {
                versionControlType = Base_Contracts.VersionControlType.Tfvc;
            }
            else if (vcType === "Git" || vcType === Base_Contracts.VersionControlType.Git) {
                versionControlType = Base_Contracts.VersionControlType.Git;
            }

            // add the scope path filter category.       
            filterCategories.push(new Base_Contracts.PathScopeFilterCategory(
                SearchConstants.PathFilters,
                projectName,
                repoName,
                path,
                versionControlType,
                repoId,
                branchName));
        }

        return filterCategories;
    }

    private static getFilterFromList(categoryName: string, filters: Array<any>): Array<any> {
        return filters.filter((f: any, index: number) => {
            return f.name === categoryName;
        });
    }

    /**
    * Clears file name link from preview pane header
    */
    private clearPreviewFileTitle(): void {
        $(CodeSearchProvider.PREVIEW_FILENAME_CSS_SELECTOR).empty();
    }

    /**
    * Gets the index of a result given a unique identifier for that result.
    * @param uniqueIdentifier The identifier to select a single result.
    */
    private getIndexFromIdentifier(uniqueIdentifier: string): number {
        if (!this.m_currentCodeQueryResponse) {
            return null;
        }

        for (var i: number = 0; i < this.m_currentCodeQueryResponse.results.values.length; i++) {
            if (uniqueIdentifier === this.getUniqueIdentifier(this.m_currentCodeQueryResponse.results.values[i])) {
                return i;
            }
        }

        // Couldn't find the specified unique id.
        return null;
    }

    /**
    * Updates the selected result index
    */
    private findSelectedResultIndex(): number {
        var selectedIndex: number;
        if (State.SearchViewState.currentSelectedResultIndex) {
            if (this.getSelectedResultUniqueId(State.SearchViewState.currentSelectedResultIndex) === State.SearchViewState.currentSelectedResultUniqueId) {
                // The selected index and the unique identifier match, no need to iterate through results to find match.
                selectedIndex = State.SearchViewState.currentSelectedResultIndex;
            }
            else {
                State.SearchViewState.currentSelectedResultIndex = null;
            }
        }

        if (!selectedIndex) {
            // We must iterate through the result list to try to find the selected item;
            var selectedIndex: number = this.getIndexFromIdentifier(State.SearchViewState.currentSelectedResultUniqueId);

            if (!selectedIndex) {
                // Provided index was not found.
                // As a backup, selected index will default to 0;
                selectedIndex = 0;

                State.SearchViewState.currentSelectedResultUniqueId = this.getSelectedResultUniqueId(selectedIndex);
            }
        }

        return selectedIndex;
    }

    /**
    * Returns current skip take values
    */
    private getSkipTakeValues(getNextBatch: boolean): {} {
        if (!this.m_skipTakeValues) {
            this.m_skipTakeValues = {
                'skip': SearchConstants.DefaultSkipResults,
                'take': SearchConstants.DefaultTakeResults
            };
        }
        else {
            this.m_skipTakeValues['take'] = getNextBatch
                ? SearchConstants.MaxResults
                : SearchConstants.DefaultTakeResults;
        }

        return this.m_skipTakeValues;
    }

    /**
    * Fetches projects and repos for showing scope filters (pre search on the landing page)
    */
    private getProjectAndRepositoryScopedFilters(): any {
        var projectAndRepositoryScopedFilters = {};
        var currentFilters: Core_Contracts.IFilterCategory[] = State.SearchViewState.currentFiltersDecoded;

        for (var i in currentFilters) {
            var category = currentFilters[i];

            projectAndRepositoryScopedFilters[category.name] = category.valuesToString();
        }

        return projectAndRepositoryScopedFilters;
    }

    /**
    * Instantiates scope filters object that deals with fetching repos from tfs/search service (if sec.trimming is on)
    */
    private instantiateScopeFiltersObject(): void {
        if (!g_scopeFilters) {
            g_scopeFilters = new ScopeFilters.SearchScopeFilters();
        }
    }

    /**
    * Constructs file contents url which takes the use into code hub
    */
    private constructLinkToContent(result: Code_Contracts.ICodeResult): string {
        var resultantURLToCodeHubContent: string;

        var collectionContext = Context.SearchContext.getTfsContext(result.collection);

        if (result.vcType === Base_Contracts.VersionControlType.Tfvc) {
            resultantURLToCodeHubContent = collectionContext.navigation.serviceHost.uri
                + encodeURIComponent(result.project) + "/_versionControl" + "#path="
                + encodeURIComponent(result.path.split("\\").join("/")) + "&version="
                + encodeURIComponent(result.branch) + "&_a=contents";
        }
        else if (result.vcType === Base_Contracts.VersionControlType.Git) {
            resultantURLToCodeHubContent = collectionContext.navigation.serviceHost.uri
                + encodeURIComponent(result.project) + "/_git/"
                + encodeURIComponent(result.repository) + "#path="
                + encodeURIComponent(result.path.split("\\").join("/")) + "&version="
                + encodeURIComponent(result.branch) + "&_a=contents";
        }

        return resultantURLToCodeHubContent;
    }

    /**
    * Returns a result by index
    */
    private getResult(index: number): Code_Contracts.ICodeResult {
        return this.m_currentCodeQueryResponse.results.values[index];
    }

    /**
    * Gets a preview control for the result given.
    * @param selectedIndex The index of the result to preview.
    * @isFirstPreviewOfNewSeach indicates whether this is the first preview of current search results
    * @state current state of the search page, required for initializing the tabbed preview
    * @useLastPreview the flag indicates to reuse last preview when last preview was successfully loaded and curent selection is for the same file
    * @previewLoadStartTime is time at which user selects a new search result or it is first preview of new search
    * @isOffline is to specify if the search result is from Azure DevOps Services Version Control or an external offline version control
    */
    private getResultPreview(selectedIndex: number,
        isFirstPreviewOfNewSearch: boolean,
        state: any,
        action: string,
        previewLoadStartTime: any,
        responseActivityId: string,
        providerId: string,
        success: any,
        failure: any): void {
        var totalSearchResults: number = this.m_currentCodeQueryResponse.results.values.length;
        if (selectedIndex < 0 || selectedIndex >= this.m_currentCodeQueryResponse.results.values.length) {
            return null;
        }

        if (!this.m_fileTabbedViewer) {
            this.m_fileTabbedViewer = new TabbedView.TabbedSearchPreview({
                cssClass: CodeSearchProvider.TABBED_VIEWER_CSS_CLASS,
                navigateSearchResults: Utils_Core.delegate(this, this._navigateSearchResults)
            });
        }

        var selectedItem = this.m_currentCodeQueryResponse.results.values[selectedIndex];

        // valid for both git and tfvc projects
        var selectedItemRepoIdentifier: string = this.getRepoIdentifier(selectedItem);

        if (selectedItem.vcType === Base_Contracts.VersionControlType.Custom) {
            var fileContentFetchForCustomVCStartTime: number,
                successCallback: any = Utils_Core.delegate(this, (fileContent) => {
                    // discard stale callbacks to avoid race condition caused by navigation events.
                    if (State.SearchViewState.currentProvider.getId() === providerId &&
                        State.SearchViewState.currentActivityId === responseActivityId) {
                        Performance.split(Performance.PerfConstants.CustomFileContentFetchEnd);
                        var fileContentFetchForCustomVCEndTime: any = Performance.getTimestamp(),
                            downloadUrl: string = this.getOfflineFileDownloadUrl(selectedItem),
                            fileContentUrl: string = this.getOfflineFileDownloadUrl(selectedItem, true),
                            contentHits = CodeUtils.CodeUtils.getHitsByFieldName(selectedItem, SearchConstants.ContentField),
                            hitAdornments: any = AdornmentsHelper.AdormentsHelper.getHitHightlights(contentHits, fileContent.content),
                            data = { fileContent: fileContent, downloadUrl: downloadUrl, fileContentUrl: fileContentUrl, hitAdornments, canDownloadOffline: true };

                        this.m_fileTabbedViewer.setResultContext(
                            null,
                            selectedItem,
                            selectedIndex,
                            totalSearchResults,
                            state,
                            isFirstPreviewOfNewSearch,
                            action,
                            previewLoadStartTime,
                            FilePreviewMode.SourceDepot,
                            data);

                        this.m_lastSelectedResultRepository = null; // Updating last selected result repository

                        TelemetryHelper.TelemetryHelper.traceLog({
                            "FirstPreviewAfterSearch": isFirstPreviewOfNewSearch || false,
                            "FileContentFetchTimeForCustomVC": fileContentFetchForCustomVCEndTime - fileContentFetchForCustomVCStartTime
                        });

                        success(this.m_fileTabbedViewer);
                    }
                });

            fileContentFetchForCustomVCStartTime = Performance.getTimestamp();
            this.populateOfflineFileContent(selectedItem, successCallback, failure);
        }
        else {
            /* Reuse repository context from cache if repo-context for the selected result is already built, as we are
           caching repo-context for every new repo encountered while changing between search result for every new search */
            var fileContentFetchStartTime: number;

            Performance.split(Performance.PerfConstants.GetRepoContextStart);
            this.getRepoContext(selectedItemRepoIdentifier, Utils_Core.delegate(this, (repository: any) => {
                Performance.split(Performance.PerfConstants.GetRepoContextEnd);

                var successCallback: any = Utils_Core.delegate(this, (fileContent) => {
                    // discard stale callbacks to avoid race condition caused by navigation events.
                    if (State.SearchViewState.currentProvider.getId() === providerId &&
                        State.SearchViewState.currentActivityId === responseActivityId) {
                        Performance.split(Performance.PerfConstants.FileContentFetchEnd);
                        var fileContentFetchEndTime: any = Performance.getTimestamp(),
                            contentHits = CodeUtils.CodeUtils.getHitsByFieldName(selectedItem, SearchConstants.ContentField),
                            hitAdornments = AdornmentsHelper.AdormentsHelper.getHitHightlights(contentHits, fileContent.content),
                            filePreviewData = { fileContent: fileContent, hitAdornments: hitAdornments, canDownloadOffline: true };

                        this.m_fileTabbedViewer.setResultContext(repository,
                            selectedItem,
                            selectedIndex,
                            totalSearchResults,
                            state,
                            isFirstPreviewOfNewSearch,
                            action,
                            previewLoadStartTime,
                            FilePreviewMode.PreFetchFileContent,
                            filePreviewData);

                        this.m_lastSelectedResultRepository = repository; // Updating last selected result repository

                        TelemetryHelper.TelemetryHelper.traceLog({
                            "FirstPreviewAfterSearch": isFirstPreviewOfNewSearch || false,
                            "FileContentFetchTime": fileContentFetchEndTime - fileContentFetchStartTime
                        });

                        success(this.m_fileTabbedViewer);
                    }
                });

                var versionString: string;

                if (selectedItem.vcType === Base_Contracts.VersionControlType.Git) {
                    versionString = (selectedItem.changeId !== undefined && selectedItem.changeId !== null)
                        ? new VCSpecs.GitCommitVersionSpec(selectedItem.changeId).toVersionString()
                        : selectedItem.branch;
                }
                else if (selectedItem.vcType === Base_Contracts.VersionControlType.Tfvc) {
                    versionString = new VCSpecs.ChangesetVersionSpec(selectedItem.changeId).toVersionString();
                }

                var ajaxSettings: JQueryAjaxSettings = {
                    headers: {
                        "X-TFS-Session": State.SearchViewState.currentActivityId
                    }
                }

                // Fetch the content of the file corresponding to versionString
                Performance.split(Performance.PerfConstants.FileContentFetchStart);
                fileContentFetchStartTime = Performance.getTimestamp();

                repository.getClient().beginGetItemContentJson(
                    repository,
                    selectedItem.path,
                    versionString,
                    successCallback,
                    failure,
                    ajaxSettings);
            }), failure, selectedItem);
        }
    }

    /**
    * Gets repo context from cache for the selected search result
    */
    private getRepoContext(selectedItemRepoIdentifier: string, success: any, failure: any, codeResult?: Code_Contracts.CodeResult): void {
        if (this._repoContextMap && this._repoContextMap[selectedItemRepoIdentifier]) {
            success(this._repoContextMap[selectedItemRepoIdentifier]);
            return;
        }
        else if (codeResult) {
            var callback: any = Utils_Core.delegate(this, (repoContext: any) => {
                this._repoContextMap[selectedItemRepoIdentifier] = repoContext; // Caching repository context for any search result, with new repository
                success(repoContext);
            });

            CodeUtils.CodeUtils.getRepositoryContextForResult(codeResult, callback, failure);
            return;
        }
        else {
            failure();
        }
    }

    private constructResponse(response: any, statusText: any, responseHeaders: any): CodeSearchResponse {
        var activityId: string = responseHeaders.getResponseHeader("X-TFS-Session");
        return new CodeSearchResponse(activityId, this.sanitizeResults(this.vcTypeAdapter(response)));
    }

    private sanitizeResults(response: any): Code_Contracts.ICodeQueryResponse {
        if (response.results) {
            for (var i in response.results.values) {
                var isVcTypeDefined = response.results.values[i].vcType !== undefined && response.results.values[i].vcType !== null;

                // if vs type is not defined, set it to git by default.
                if (isVcTypeDefined === false) {
                    response.results.values[i].vcType = Base_Contracts.VersionControlType.Git;
                }

                if (response.results.values[i].vcType === Base_Contracts.VersionControlType.Git) {
                    response.results.values[i].branch = "GB" + response.results.values[i].branch;
                }
                else if (response.results.values[i].vcType === Base_Contracts.VersionControlType.Tfvc) {
                    response.results.values[i].branch = new VCSpecs.LatestVersionSpec().toVersionString();
                }
            }
            let resultsCount: number = $.isArray(response.results.values)? response.results.values.length : 0;
            if (resultsCount > 0) {
                for (let idx = 0; idx < resultsCount; idx++) {
                    response.results.values[idx]["relevance"] = resultsCount - idx;
                }
            }
        }

        return response;
    }

    private clearRepositoryContextMap(): void {
        this._repoContextMap = {};
    }

    /*
    * Fetch the tabbedsearch viewer asynchronously for the first results selected.
    * The results can either be specified using revealIndex, or the selectedResult key.
    **/
    private getFirstResultAsync(index: number, responseActivityId: string, providerId: string, success: any, failure: any): void {
        // Search, research, showmore, URL sharing are treated as a new search
        var previewObject: any;

        TelemetryHelper.TelemetryHelper.traceLog({
            "IndexOfFilePrviewedFirst": index
        });

        var state = Helpers.StateHelper.getCurrentState(),
            codeResult = <Code_Contracts.CodeResult>this.m_currentCodeQueryResponse.results.values[index],
            successCallback = Utils_Core.delegate(this, (tabbedViewer: any) => {
                this.appendFileNameToPreviewPane(index);
                previewObject = { preview: tabbedViewer };
                success(previewObject);
            }),

            failureCallback = Utils_Core.delegate(this, (error) => {
                ViewBuilder.SearchViewBuilder.showNoPreviewMessage(error);
                this.appendFileNameToPreviewPane(index);
                Performance.abortCodeSearchPerfScenarios();
                failure(error);
            });

        // Split time for fist preview start
        Performance.split(Performance.PerfConstants.CodeResultPreviewOnNewSearchStart);
        var previewLoadStartTime: any = Performance.getTimestamp();
        this.getResultPreview(index, true, state, State.SearchViewState.currentAction, previewLoadStartTime, responseActivityId, providerId, successCallback, failureCallback);
    }

    /*
    * Append the tabbed previewer to the DOM and select the row in the results pane at index 'index'.
    **/
    private createPreview(preview: any, index: number): void {
        if (preview) {
            ViewBuilder.SearchViewBuilder.selectResultAndPreview(index, preview);
        }
    }

    /*
    * Returns the index of the results to be fetched for the first preview.
    **/
    private getRevealIndexIfShowMoreIsClicked(
        totalResultsCount: number,
        displayedResultsCount: number,
        noOfResultsBeforeShowMoreIsClicked: number): number {
        var revealIndex: number = undefined;
        if (this.m_skipTakeValues['take'] === SearchConstants.MaxResults && totalResultsCount > noOfResultsBeforeShowMoreIsClicked) {
            // If the no of results did not increase after "show more" is clicked reveal the last result in the list.
            if (displayedResultsCount <= noOfResultsBeforeShowMoreIsClicked) {
                revealIndex = displayedResultsCount - 1;
            }
            else {
                // Else reveal the first result in the new results that were returned.
                revealIndex = noOfResultsBeforeShowMoreIsClicked;
            }
        }

        return revealIndex;
    }

    private populateOfflineFileContent(
        selectedResult: Code_Contracts.CodeResult,
        successCallback: any,
        failureCallback: any): void {
        if (selectedResult.vcType === Base_Contracts.VersionControlType.Custom) {
            var data = {
                "projectName": selectedResult.project,
                "branchName": selectedResult.branch,
                "filePath": selectedResult.path,
                "repositoryName": selectedResult.repository,
                "contentId": selectedResult.contentId
            };

            var customVC = new Search_Custom.Custom();
            var success = (fileContent, statusText, responseHeaders) => {
                var offlineContent = {
                    content: fileContent,
                    contentBytes: this.getBytes(fileContent),
                    contentLines: fileContent.split("\n"),
                    exceededMaxContentLength: false,
                    metadata: {
                        // Currenlty filling with a default content metadata. TODO : Fetch these details from the VC
                        // Use MimeMapper to get the content type for the given file extension/file name
                        contentType: "text/plain",
                        encoding: 65001, // utf-8 
                        extension: VersionControlPath.getFileExtension(selectedResult.path),
                        fileName: selectedResult.fileName,
                        isBinary: false,
                        isImage: false,
                        vsLink: null
                    }
                };

                successCallback(offlineContent);
            }

            Performance.split(Performance.PerfConstants.CustomFileContentFetchStart);
            customVC.getContentAsync(data, success, failureCallback);
        }
    }

    private getBytes(value: string): number[] {
        var bytes = [];
        for (var i = 0; i < value.length; ++i) {
            bytes.push(value.charCodeAt(i));
        }
        return bytes;
    }

    private getOfflineFileDownloadUrl(
        selectedResult: Code_Contracts.CodeResult,
        contentsOnly?: boolean): string {

        contentsOnly = contentsOnly || false;
        var data = {
            "projectName": selectedResult.project,
            "branchName": selectedResult.branch,
            "filePath": selectedResult.path,
            "fileName": selectedResult.fileName,
            "contentId": selectedResult.contentId,
            "repositoryName": selectedResult.repository,
            "contentsOnly": contentsOnly
        };

        var customVC = new Search_Custom.Custom();

        return customVC.getContentDownloadUrl(data);
    }

    private _enhancePivotFilter(isRightOriented: boolean): void {
        $(SearchConstants.HubPivotFiltersSelector).empty();

        this._pivotControl = Controls.create(Navigation.PivotFilter, $(SearchConstants.HubPivotFiltersSelector), {
            items: CodeSearchProvider._getPrivewOrientationPivotFilterItems(isRightOriented),
            cssClass: SearchConstants.PreviewOrientationPivotClass,
            text: Search_Resources.PreviewOrientationTitle
        });

        // use unbind/bind pattern to attach this delegate to pivotControl
        this._pivotControl.getElement().unbind("click.previewOrientation").bind("click.previewOrientation", Utils_Core.delegate(this, (e) => {
            if (State.SearchViewState.currentProvider.getId() === SearchConstants.CodeEntityTypeId) {
                this.actionCreator.updatePreviewOrientationMode(this._pivotControl.getSelectedItem().value);
            }
        }));
    }

    /**
    * Changes the orientation of the results pane and cater to the user preference of result orientation.
    * @param string The orientation mode
    */
    public setPreviewOrientation(): void {
        var orientation = this.storesHub.previewOrientationStore.orientation || this._getPreviewOrientationValue();

        TelemetryHelper.TelemetryHelper.traceLog({ "PreviewOrientationSwitchedTo": orientation });

        Search_UserPreferences.UserPreferences.setUserPreference(
            CodeSearchProvider.PREVIEW_ORIENTATION_PREF_KEY,
            orientation,
            Search_UserPreferences.UserPreferenceScope.Account);

        if (Search_Helpers.Utils.compareStrings(orientation, SearchConstants.PreviewPaneRightOrientation)) {
            this._splitter.horizontal();
            $(CodeSearchProvider.FILTER_DROPDOWN_CSS_SELECTOR).removeClass(CodeSearchProvider.SEARCH_FILTER_DROPDOWN_BOTTOMS_PREVIEW_ORIENTATION_CSS_CLASS);
        }
        else {
            this._splitter.vertical();
            $(CodeSearchProvider.FILTER_DROPDOWN_CSS_SELECTOR).addClass(CodeSearchProvider.SEARCH_FILTER_DROPDOWN_BOTTOMS_PREVIEW_ORIENTATION_CSS_CLASS);
        }

        this._splitter.split();
        // restore the size preference
        this._splitter.restorePreviewPaneSizePreferences(this._splitter.splitOrientation, true);
    }

    private _getPreviewOrientationValue(): string {
        if (this._pivotControl &&
            this._pivotControl.getSelectedItem() &&
            this._pivotControl.getSelectedItem().value) {
            return this._pivotControl.getSelectedItem().value;
        }

        // return default
        return SearchConstants.PreviewPaneRightOrientation;
    }

    private static _getPrivewOrientationPivotFilterItems(isRightOriented: boolean): Array<any> {
        return [
            {
                text: Search_Resources.PreviewPaneRightOrientation,
                value: SearchConstants.PreviewPaneRightOrientation,
                selected: isRightOriented,
                title: Search_Resources.PreviewPaneRightOrientation
            },
            {
                text: Search_Resources.PreviewPaneBottomOrientation,
                value: SearchConstants.PreviewPaneBottomOrientation,
                selected: !isRightOriented,
                title: Search_Resources.PreviewPaneBottomOrientation
            }
        ];
    }

    public handleReponseMessages(response: Providers.IResponseWithActivityId, showMoreResults: boolean, callback: Function): void {
        VSS.using(["Search/Scripts/Common/TFS.Search.ResponseMessageHelper"],
            (ResponseMessageHelper: typeof ResponseMessageHelper_NO_REQUIRE) => {
                var responseMessage: string = ResponseMessageHelper
                    .ResponseMessage
                    .handleResponseMessages(response, this.getId(), showMoreResults, this.v2Layout);
                ResponseMessageHelper.ResponseMessage.handleBannerErrorCodes(response);
                callback(responseMessage);
            });
    }

    private _onRowSelectionChanged(sender: any, args: any): void {
        let result = this.storesHub.searchResultsActionStore.item,
            index = this.storesHub.searchResultsActionStore.index;

        State.SearchViewState.currentSelectedResultIndex = index;
        let identifier = this.getUniqueIdentifier(result),
            state = Helpers.StateHelper.getCurrentState();

        state[SearchConstants.SelectedResultParameterName] = identifier;
        if (identifier) {
            Navigation_Services.getHistoryService().replaceHistoryPoint(SearchConstants.SearchActionName, state);
        }

        TelemetryHelper
            .TelemetryHelper
            .traceLog({
                "ResultSelectionChangedToIndex": index
            });
    }

    private _onShowMoreClicked(sender: any, args: any): void {
        // For now just raise the show more event. ToDo: piyusing, look this wholistically when we refactor for filter changes.
        Events_Services.getService().fire(
            SearchConstants.ShowMoreResultsEvent,
            this,
            this.storesHub.searchResultsStore.fetchedResultsCount
        );
    }

    private _onRowInvoked(sender: any, args: any): void {
        let result = this.storesHub.searchResultsActionStore.item,
            index = this.storesHub.searchResultsActionStore.index;

        let identifier = this.getUniqueIdentifier(result);

        TelemetryHelper
            .TelemetryHelper
            .traceLog({
                "ResultsRowInvoked": identifier
            });

        // open file in Code hub page.
        window.open(CodeUtils.CodeUtils.constructLinkToContent(result), "_blank");
    }

    private _navigateSearchResults(index: number, sender: any): void {
        if (this.storesHub.searchResultsStore.items[index]) {
            let item = this.storesHub.searchResultsStore.items[index];
            this.actionCreator.changeActiveRow(item, index, sender);
        }
    }
}

/**
 * Implements code search response
 */
class CodeSearchResponse implements Providers.IResponseWithActivityId {
    public activityId: string;
    public searchResults: Code_Contracts.ICodeQueryResponse;

    constructor(activityId: string, results: Code_Contracts.ICodeQueryResponse) {
        this.activityId = activityId;
        this.searchResults = results;
    }
}