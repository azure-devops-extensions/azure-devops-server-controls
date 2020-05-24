// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import FilterPrefs = require("Search/Scripts/UserPreferences/TFS.Search.FilterPreferences");
import FiltersHelper = require("Search/Scripts/Common/TFS.Search.FiltersHelper");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import KeyboardShortcuts = require("VSS/Controls/KeyboardShortcuts");
import Navigation_Services = require("VSS/Navigation/Services");
import Navigation = require("VSS/Controls/Navigation");
import Performance = require("Search/Scripts/Common/TFS.Search.Performance");
import Providers = require("Search/Scripts/Providers/TFS.Search.Providers");
import Providers_Helper = require("Search/Scripts/Providers/TFS.Search.Providers.Helpers");
import Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import SearchBoxHelper = require("Search/Scripts/Common/TFS.Search.SearchBoxHelper");
import Search_Navigation = require("Search/Scripts/Common/TFS.Search.NavigationExtensions");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import ViewBuilder = require("Search/Scripts/Common/TFS.Search.ViewBuilder");
import VSS = require("VSS/VSS");
import WebApi = require("Search/Scripts/WebApi/TFS.Search.WebApi");
import WorkItemConstants = require("Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants");

import Search_QuickStart_NO_REQUIRE = require("Search/Scripts/QuickStart/TFS.Search.FileViewerCapabilities.QuickStart");
import EngagementCore_NO_REQUIRE = require("Engagement/Core");
import EngagementDispatcher_NO_REQUIRE = require("Engagement/Dispatcher");
import Events_Services_NO_REQUIRE = require("VSS/Events/Services");
import TFS_Host_UI_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_EngagementRegistrations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Engagement.Registrations");

import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { ActionsHub, IFilterSelectionChangedPayload } from "Search/Scripts/React/ActionsHub";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { FilterPreferencesHelper } from "Search/Scripts/UserPreferences/TFS.Search.FilterPreferences.Helper";

var g_currentTfsContext = Context.SearchContext.getDefaultContext();

export class SearchView extends Navigation.NavigationView implements Search_Navigation.INavigationHandler {
    private static SEARCHBOX_INPUT_TEXT_CSS_SELECTOR: string = ".search-text";
    private static GRID_CANVAS_CSS_SELECTOR: string = ".grid-canvas";
    private static L0_SEARCHBOX_CSS_SELECTOR: string = ".title-bar-header-search.multi-entity-search-box";
    private static DESCRIPTION_FOR_SHORTCUT: string = Resources.SearchBoxShortCutLabel;
    private static SHORTCUT_GROUP: string = "Search";
    private static KEY_S: string = "s";
    public static SEARCH_CONTENT_SECTION_SELECTOR: string = ".main > .content-section";
    public static L1_SEARCH_BOX_ID_SELECTOR: string = "#multi-entity-search-box";

    private static SEARCHBOX_INPUT_WATER_MARK_CSS_CLASS: string = "watermark";

    private m_isFirstSearch: boolean = true;
    private m_searchProviders: Providers.ISearchProvider[];
    private m_showMoreRequested: boolean = false;
    private m_prefetchedResults: any = undefined;
    private m_sessionStartTime: number;
    private m_searchBoxEntityDropDown: TFS_Host_UI_NO_REQUIRE.ISearchBoxDropdownControl;
    private m_isUserStakeHolder: boolean;
    private searchV2Layout: boolean;
    private actionCreator: ActionCreator;
    private storesHub: StoresHub;

    /**
    * Initializes Search and registers providers based on avaialbility.
    */
    public initialize() {

        super.initialize();
        this.m_sessionStartTime = Performance.getNavigationStartTimestamp();
        this.m_isUserStakeHolder = Utils_Core.parseJsonIsland($(document), ".search-user-data-isStakeHolder") || false;

        // Generate a new session ID to be used in each CI log
        this.generateSessionID();

        // If IsClientParam is passed, then we need to hide L1 and L2 bars, search results view occupies entire page
        // Ensure this happens as early as possible during search initialization so that sudden jump of results view effect is minimized
        if (window.location.href.search("&client=true") > -1) {
            $(SearchView.SEARCH_CONTENT_SECTION_SELECTOR).addClass("native-client-results-view");
            TelemetryHelper.TelemetryHelper.traceLog({ "SearchPageLaunchedFromVSClient": true });
        }

        const state = (Navigation_Services.getHistoryService().getCurrentState() || {});
        let currentProviderId: string = state[SearchConstants.ProviderIdParameterName];
        currentProviderId = currentProviderId && currentProviderId.toLowerCase();

        this.actionCreator = ActionCreator.getInstance();
        this.storesHub = StoresHub.getInstance();
        this.searchV2Layout = Utils_Core.parseJsonIsland($(document), ".search-v2layout") || false;

        Providers_Helper.ProvidersHelper.getInstalledSearchExtensionProvidersPromise(this.m_isUserStakeHolder, currentProviderId, this.searchV2Layout)
            .done((providersInfo: Providers.ProvidersInfo) => {
                var providers: Providers.ISearchProvider[] = providersInfo.searchProviders;
                State.SearchViewState.registeredProviderIds = providersInfo.registeredProviderIds;

                Providers_Helper.ProvidersHelper.initializeProviders(
                    providers,
                    this.searchV2Layout,
                    this.actionCreator,
                    ActionsHub.getInstance(),
                    this.storesHub);

                // Set the default current provider as CodeSearch if its available else WorkItemSearch
                currentProviderId = currentProviderId === undefined ? State.SearchViewState.registeredProviderIds[0] : currentProviderId;

                this.actionCreator.updateSearchProviders(State.SearchViewState.registeredProviderIds, currentProviderId);

                this.m_searchProviders = providers;
                this.initializeSearch(providers, currentProviderId);

                // bind to providers specific navigation events only after complete intialization of search.
                Providers_Helper.ProvidersHelper.attachProvidersToNavigationEvents(this, providers);

                // If none of the navigation events occurred route to landing page.
                if (!State.SearchViewState.urlContainsQuery && State.SearchViewState.currentProvider) {
                    State.SearchViewState.currentProvider.showLandingPage();
                    SearchBoxHelper.SearchBoxHelper.registerSearchBoxToAnEntityType(State.SearchViewState.currentProvider.getId(),
                        Utils_Core.delegate(this, this._onRegisterSearchBoxEntityCompletion));
                }

                // Handle "Show More" click event
                VSS.using(["VSS/Events/Services"],
                    (Events_Services: typeof Events_Services_NO_REQUIRE) => {
                        let eventSvc = Events_Services.getService(),
                            currentSearchProvider = Providers_Helper.ProvidersHelper.getProviderById(providers, currentProviderId);
                        eventSvc.attachEvent(SearchConstants.ShowMoreResultsEvent, Utils_Core.delegate(
                            this,
                            (sender, noOfResultsBeforeShowMoreIsClicked) => {
                                this.m_showMoreRequested = true;
                                // Trace "Show More" click event
                                TelemetryHelper
                                    .TelemetryHelper
                                    .traceLog({
                                        "ShowMoreRequested": true
                                    });
                                this.executeSearch(
                                    currentSearchProvider,
                                    null,
                                    false, {
                                        showMoreResults: true,
                                        noOfResultsBeforeShowMoreIsClicked: noOfResultsBeforeShowMoreIsClicked
                                    });
                            }));
                    });

            }, () => {
                TelemetryHelper.TelemetryHelper.traceLog({ "InitializeSearchProviders": "InitializeSearchProviders failed." });
            });

        ActionsHub.getInstance().filterSelectionChanged.addListener((payload: IFilterSelectionChangedPayload) => {
            this.delayExecute("UpdateFilterSelection", 350, true, Utils_Core.delegate(this, () => {
                this.filterSelectionChanged(payload.filters)
            }));
        });
    }

    public entityTypeChanged(providerId: string): void {
        const searchText: string = Helpers.Utils.extractParamValueFromUrl(window.location.href, SearchConstants.SearchTextParameterName);

        this.clearState();

        const stateOverride = {};
        stateOverride[SearchConstants.ProviderIdParameterName] = providerId;
        stateOverride[SearchConstants.SearchFiltersParameterName] = undefined;
        stateOverride[SearchConstants.SelectedResultParameterName] = undefined;

        if (searchText) {
            stateOverride[SearchConstants.SearchTextParameterName] = searchText;
        }

        TelemetryHelper.TelemetryHelper.traceLog({ "EntityTypeChangedTo": providerId });
        // Entity Changed go to the new entity view.
        Helpers.Utils.createNewSearchRequestState(searchText, providerId, false);
    }

    public filterSelectionChanged(selectedFilters: Core_Contracts.IFilterCategory[]): void {
        var stateOverride = {};

        stateOverride[SearchConstants.SearchFiltersParameterName] = FiltersHelper.FiltersHelper.encodeFilters(selectedFilters);

        // Set user preference for filters
        var encodedFilters = stateOverride[SearchConstants.SearchFiltersParameterName],
            entity = State.SearchViewState.currentProvider.getId(),
            filters: string;

        if (entity && encodedFilters) {
            if (Utils_String.ignoreCaseComparer(entity, SearchConstants.CodeEntityTypeId) === 0) {
                // Trim CodeElementFilters before setting filter preferences for scoping the results.
                var codeElementFiltersRegex = /CodeElementFilters{.*}/;
                filters = encodedFilters.replace(codeElementFiltersRegex, "");
            }
            else {
                for (var i in selectedFilters) {
                    if (Utils_String.ignoreCaseComparer(selectedFilters[i].name, WorkItemConstants.WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME) === 0) {
                        filters = selectedFilters[i].name + SearchConstants.FilterValueStart
                            .concat(selectedFilters[i].valuesToString(SearchConstants.TfsProjectNameSeparator))
                            .concat(SearchConstants.FilterValueEnd);
                        break;
                    }
                }
            }

            FilterPrefs.FilterPreferences.setFilterPreference(entity, filters);
        }
        else {
            FilterPrefs.FilterPreferences.setFilterPreference(entity, "");
        }
        this.updateHistoryOnFilterSelection(stateOverride);
    }

    public searchTextChanged(searchString: string): void {
        const stateOverride = {};
        stateOverride[SearchConstants.SearchTextParameterName] = searchString;
        this.replaceHistory(stateOverride);
    }

    public setupSearchPageAndNavigate(state: any, action?: string): void {
        State.SearchViewState.urlContainsQuery = true;

        // Clear out title bar searchbox contents
        const titleSearchBoxText: HTMLInputElement = SearchBoxHelper
            .SearchBoxHelper
            .getSearchBoxElement($(SearchView.L1_SEARCH_BOX_ID_SELECTOR));

        if (titleSearchBoxText && titleSearchBoxText.value) {
            titleSearchBoxText.value = null;
        }

        // Tabbed viewer can't understand actions other than tab actions
        // so, discard other actions before calling into tabbed viewer
        State.SearchViewState.currentAction = Helpers.Utils.isTabbedViewerAction(action) ? action : "";

        // Page navigation has occurred, parse the state and act accordingly.
        this.navigate(state);
    }

    public get Provider(): Providers.ISearchProvider {
        return State.SearchViewState.currentProvider;
    }

    /**
    * Initialises Search and different entities of search page.
    */
    private initializeSearch(providers: Providers.ISearchProvider[], currentProviderId: string) {
        const currentProvider = Providers_Helper.ProvidersHelper.getProviderById(providers, currentProviderId);

        ViewBuilder.SearchViewBuilder.initialize(this);
        SearchBoxHelper
            .SearchBoxHelper
            .registerSearchBoxToAnEntityType(
            currentProvider.getId(), // use current provider's id as getProviderById in ProvidersHelper returns a default provider(1st one is the list of available providers) if providerId passed to it is undefined.
            Utils_Core.delegate(
                this,
                this._onRegisterSearchBoxEntityCompletion));

        State.SearchViewState.searchHttpClient = WebApi.SearchClient.getSearchHttpClient();

        // Security trimming API must be called in the context of a project or collection
        // Setting the context to "defaultcollection" for search to work from account level
        // Note: Update the context before any handler is registered for
        if (Context.SearchContext.isAccountContext()) {
            g_currentTfsContext.navigation.collection = Context.SearchContext.createCollectionServiceHost("defaultcollection");
        }

        if (currentProvider) {
            currentProvider.NotifyOnEntitySwitchedTo();
            State.SearchViewState.currentProvider = currentProvider;

            // Use local variables to track Json data presence and initialization start time as the globals gets reset later in the execution flow
            this.m_prefetchedResults = currentProvider.loadPrefetchedResults();
        }

        var historySvc = Navigation_Services.getHistoryService();
        historySvc.attachNavigate((sender, state) => {
            if (!historySvc.getCurrentFragment()) {
                this.clearAll();
                if (State.SearchViewState.currentProvider) {
                    State.SearchViewState.currentProvider.showLandingPage();
                }
            }
        });

        historySvc.attachNavigate(SearchConstants.SearchActionName, (sender, state) => {
            // Update user preference for filters is search triggred by right click search from code hub.
            if (Helpers.Utils.compareStrings(state.trigger, "true")) {
                var entity = State.SearchViewState.currentProvider.getId();
                state.filters = FilterPreferencesHelper.populateFilterPreferencesInProjectContext(Context.SearchContext.getDefaultContext().navigation.project, entity);
            }

            this.setupSearchPageAndNavigate(state);
        }, true);

        historySvc.attachNavigate(SearchConstants.ReSearchActionName, (sender, state) => {
            this.setupSearchPageAndNavigate(state);
        }, true);

        this.setupShortcuts();

        // registers the engagement experiences for the search page
        if (g_currentTfsContext.isHosted) {
            VSS.using(["Engagement/Dispatcher", "Engagement/Core", "Presentation/Scripts/TFS/TFS.Engagement.Registrations"], (EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE, EngagementCore: typeof EngagementCore_NO_REQUIRE, TFS_EngagementRegistrations: typeof TFS_EngagementRegistrations_NO_REQUIRE) => {
                this._registerSearchQuickStart();
                TFS_EngagementRegistrations.registerNewFeature();
                // bootstrap the engagement experiences for the search page
                EngagementDispatcher.Dispatcher.getInstance().start("Search");
            });
        }
    }

    private executeSearch(provider: Providers.ISearchProvider, selectedResult: string, isRightClickSearchFromCodeHub?: boolean, showMoreResultsData?: any) {
        if (provider) {
            var showMoreResults: boolean,
                noOfResultsBeforeShowMoreIsClicked: number,
                requestStartTime: number = this.m_sessionStartTime || Performance.getTimestamp(),
                sessionStartTime: number = this.m_sessionStartTime, /* this.m_sessionStartTime can be undefined, thus identifies whether this is the first call of the session or not */
                currentActivityId: string = TFS_Core_Utils.GUIDUtils.newGuid(),
                prefetchedResults = undefined,
                isFirstSearchOfTheSession: boolean = this.m_isFirstSearch;

            // Use a local copy of prefetched results and clear the global
            if (this.m_prefetchedResults) {
                prefetchedResults = $.extend(true, {}, this.m_prefetchedResults);
                this.m_prefetchedResults = undefined;
            }

            // Reset as the session got initialized
            this.m_sessionStartTime = undefined;
            this.m_isFirstSearch = false;

            // Call into providers hook point, Note: we are passing session start time to this method instead of requestStartTime
            State.SearchViewState.currentProvider.NotifyOnExecuteSearch(sessionStartTime);

            provider.clearResultsView();
            VSS.using(["VSS/Events/Services"],
                (Events_Services: typeof Events_Services_NO_REQUIRE) => {
                    var eventsvc = Events_Services.getService();
                    eventsvc.fire("execute-search-box");
                });

            if (showMoreResultsData) {
                showMoreResults = showMoreResultsData.showMoreResults;
                noOfResultsBeforeShowMoreIsClicked = showMoreResultsData.noOfResultsBeforeShowMoreIsClicked;
            }

            ViewBuilder.SearchViewBuilder.setEntityTypes(State.SearchViewState.currentProvider.getId());
            State.SearchViewState.currentActivityId = currentActivityId;
            var currentFilters: Core_Contracts.IFilterCategory[] = State.SearchViewState.currentFiltersDecoded,
                sortOptions: string = State.SearchViewState.sortOptions;

            // Trace search request metadata and activityId corresponding to it
            var timeZoneInfo = this.getTimeZoneInfo();
            TelemetryHelper.TelemetryHelper.traceLog({
                "SearchLaunchPoint": State.SearchViewState.searchLaunchPoint,
                "CodeHubRightClickSearch": isRightClickSearchFromCodeHub || false,
                "PrefetchedResultsFedToQuery": prefetchedResults ? true : false,
                "IsFirstSearchOfTheSession": isFirstSearchOfTheSession || false,
                "GmtOffset": timeZoneInfo["GmtOffset"],
                "TimeZone": timeZoneInfo["TimeZone"]
            }, currentActivityId);

            ViewBuilder.SearchViewBuilder.setEntityTypeSpinnerRolling(provider.getId());

            var success = Utils_Core.delegate(this,
                (response) => {
                    // Not using action creator to trigger initiate search because it would trigger an action inside another action.
                    this.storesHub.searchActionStore.updateSearchState(false);
                    // Split time to capture time took to get the results from search service/processing prefetched results (Json Island)
                    Performance.split(Performance.PerfConstants.SearchQueryEnd);
                    var isStaleResponse: boolean = State.SearchViewState.currentActivityId !== response.activityId,
                        requestResponseTime: any = Performance.getTimestamp(),
                        readOutByScreenReader: Function = (messageToBeReadOut) => {
                            Utils_Accessibility.announce(messageToBeReadOut, true);
                        };

                    TelemetryHelper.TelemetryHelper.traceLog({
                        "PrefetchedResultsFedToQuery": prefetchedResults ? true : false,
                        "IsFirstSearchOfTheSession": isFirstSearchOfTheSession || false,
                        "E2eQueryTime": requestResponseTime - requestStartTime,
                        "ResultCount": response.searchResults.results.count,
                        "StaleActivityId": isStaleResponse
                    }, response.activityId);

                    // Multiple filter selection would fire multiple search requests that results in corresponding multiple responses.
                    // Here we ignore responses of older requests based on the current request Id so that unnecessary UI rendering is avoided.
                    if (isStaleResponse) {
                        return;
                    }

                    ViewBuilder.SearchViewBuilder.setEntityTypeHitCount(provider.getId(), response.searchResults.results.count);

                    provider.renderSearchResults(response.searchResults, noOfResultsBeforeShowMoreIsClicked, selectedResult, response.activityId, provider.getId(), showMoreResults);
                    provider.handleReponseMessages(response, showMoreResults, readOutByScreenReader);

                    provider.getFiltersFromResponse(response).then((filters: Core_Contracts.IFilterCategoryName[]) => {
                        ViewBuilder.SearchViewBuilder.drawFilters(filters, null, provider.getId());
                        // Update the stores for React filters
                        this.actionCreator.changeFilters(filters);


                        // Adding a dummy AccountFilters based on FeatureFlag so that user will be able to expand it to run the 
                        // actual query and see the MultiAccount search results
                        if (provider.getId() === SearchConstants.CodeEntityTypeId &&
                            Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchMultiAccount)) {
                            var filterCategories: Array<Core_Contracts.IFilterCategoryName> = new Array<Core_Contracts.IFilterCategoryName>();
                            filterCategories.push(new Base_Contracts.AccountFilterCategory([], SearchConstants.AccountFilters));
                            ViewBuilder.SearchViewBuilder.appendFilters(filterCategories);
                        }
                    });
                });

            var failure = ((activityId) => {
                return Utils_Core.delegate(this, (error) => {
                    // Not using action creator to trigger initiate search because it would trigger an action inside another action.
                    this.storesHub.searchActionStore.updateSearchState(false);
                    Performance.split(Performance.PerfConstants.SearchQueryEnd);
                    if (State.SearchViewState.currentActivityId === activityId) {
                        var messageToBeReadOut: string = "";
                        provider.NotifyOnExecuteSearchError(error, activityId);
                        this.clearAll();
                        ViewBuilder.SearchViewBuilder.setEntityTypeHitCount(provider.getId(), -1);

                        if (Context.SearchContext.isHosted()) {
                            if (error.message === "ServiceOwnerNotFoundException") {
                                messageToBeReadOut = error.innerException.message;
                                ViewBuilder.SearchViewBuilder.drawErrorMessage(error.innerException.message, Resources.RegionNotSupportedDetailMessage);
                            }
                            else {
                                var errorDetailsMessage = Resources.GetResultsErrorDetailsMessageForHosted.replace("{0}", String(State.SearchViewState.currentActivityId));
                                messageToBeReadOut = Resources.GetResultsErrorMessage + errorDetailsMessage;
                                ViewBuilder.SearchViewBuilder.drawErrorMessage(Resources.GetResultsErrorMessage, errorDetailsMessage);
                            }
                        }
                        else {
                            messageToBeReadOut = Resources.GetResultsErrorMessage + error.message;
                            ViewBuilder.SearchViewBuilder.drawErrorMessage(Resources.GetResultsErrorMessage, error.message);
                        }

                        Utils_Accessibility.announce(messageToBeReadOut, true);

                        !this.searchV2Layout &&
                            ViewBuilder.SearchViewBuilder.setFeedbackLink(State.SearchViewState.currentActivityId, provider.getId());
                    }
                });
            })(currentActivityId);

            Performance.split(Performance.PerfConstants.SearchQueryStart);
            // Not using action creator to trigger initiate search because it would trigger an action inside another action.
            this.storesHub.searchActionStore.updateSearchState(true);
            provider.getResultsAsync(State.SearchViewState.currentActivityId, State.SearchViewState.currentQueryString,
                g_currentTfsContext.navigation.applicationServiceHost.name, currentFilters, showMoreResults, success, failure, prefetchedResults, sortOptions);
        }
    }

    /**
    * Extracts GMT offset and timezone info from date string
    * Sample date string that following method parses -- Fri Sep 04 2015 13:07:07 GMT+0530 (India Standard Time)
    */
    private getTimeZoneInfo(): any {
        var dateString = new Date().toString(),
            gmtIndex = dateString.indexOf("GMT"),
            timeZoneIndex = dateString.indexOf("(", gmtIndex || 0),
            gmtOffset: string = "NA",
            timeZone: string = "NA";

        if (gmtIndex > -1) {
            if (timeZoneIndex > -1) {
                // Skip trailing space
                gmtOffset = dateString.substr(gmtIndex, timeZoneIndex - gmtIndex - 1);
                // Exclude braces around time zone info
                timeZone = dateString.substr(timeZoneIndex + 1, dateString.length - timeZoneIndex - 2);
            }
            else {
                // If timezone info is not avialable, jsut extract the GMT offset
                gmtOffset = dateString.substr(gmtIndex, dateString.length - gmtIndex);
            }
        }
        else if (timeZoneIndex > -1) {
            // Extract timenone info alone
            timeZone = dateString.substr(timeZoneIndex + 1, dateString.length - timeZoneIndex - 2);
        }

        return {
            'GmtOffset': gmtOffset,
            'TimeZone': timeZone
        };
    }

    // Stops the event propagation on Ctrl+C event inside result grid
    private stopEventPropagationOnCopyInsideResultGrid(e?): void {
        if (e.keyCode === Utils_UI.KeyCode.C && e.ctrlKey) {

            // Stops the event from reaching the parent grid control
            e.stopImmediatePropagation();
        }
    }

    private getResultsAndCounts(selectedResult: string, isRightClickSearchFromCodeHub?: boolean): void {
        if (State.SearchViewState.currentProvider) {
            this.executeSearch(State.SearchViewState.currentProvider, selectedResult, isRightClickSearchFromCodeHub);
        }
    }

    // Generate a guid that is preserved across a session and logged with each event.
    private generateSessionID(): void {
        State.SearchViewState.currentSessionId = TFS_Core_Utils.GUIDUtils.newGuid();
    }

    private navigate(state: any) {
        this.storesHub.requestUrlStore.updateUrlState({ urlState: state });
        var executeSearch: boolean = false,
            stateSearchText: string = Helpers.StateHelper.getSearchTextValueFromState(state),
            stateProviderId: string = Helpers.StateHelper.getProviderIdValueFromState(state);

        if (!State.SearchViewState.currentProvider || State.SearchViewState.currentProvider.getId() !== stateProviderId) {
            var newProvider = Providers_Helper.ProvidersHelper.getProviderById(this.m_searchProviders, stateProviderId);
            if (!newProvider) {
                this.clearAll();
                var errorTextWithActivityId: string = Resources.InvalidTypeErrorMessage + " (ActivityId: " + State.SearchViewState.currentActivityId + ")";
                Utils_Accessibility.announce(errorTextWithActivityId, true);
                ViewBuilder.SearchViewBuilder.drawGenericErrorMessage(errorTextWithActivityId);
                return;
            }

            if (State.SearchViewState.currentProvider) {
                State.SearchViewState.currentProvider.NotifyOnEntitySwitchedFrom();
            }

            // Notify entity switched to the new provider.
            newProvider.NotifyOnEntitySwitchedTo();

            // Enabling the new provider
            State.SearchViewState.currentProvider = newProvider;
            ViewBuilder.SearchViewBuilder.clearFiltersPane();
            ViewBuilder.SearchViewBuilder.clearResultsView();
            ViewBuilder.SearchViewBuilder.setViewMode();
            ViewBuilder.SearchViewBuilder.updateCurrentEntityType(stateProviderId, true);
            ViewBuilder.SearchViewBuilder.setEntityTypes(stateProviderId);
            SearchBoxHelper.SearchBoxHelper.registerSearchBoxToAnEntityType(stateProviderId, Utils_Core.delegate(this, this._onRegisterSearchBoxEntityCompletion));
            TelemetryHelper.TelemetryHelper.traceLog({ "EntityTypeChangedTo": stateProviderId });

            this.m_isFirstSearch = true;
            // Show landing page only if the search text is empty. On entity switch new query is fired
            // for the current search text
            if (!stateSearchText && State.SearchViewState.currentProvider) {
                State.SearchViewState.currentProvider.showLandingPage();
            }
        }

        // This allows displaying search text in the search box in all cases such as browser back button,
        // copy pasting search Url into a new tab or searches initiated from Code hub,
        // updating the search text to stateSearchText in case user changes the search text and apply filters
        var searchBoxText: HTMLInputElement = SearchBoxHelper.SearchBoxHelper.getSearchBoxElement(SearchBoxHelper.SearchBoxHelper.getSearchBoxJqueryObject());
        if (searchBoxText && stateSearchText && searchBoxText.value !== stateSearchText) {
            searchBoxText.value = stateSearchText;
            $(SearchView.SEARCHBOX_INPUT_TEXT_CSS_SELECTOR).removeClass(SearchView.SEARCHBOX_INPUT_WATER_MARK_CSS_CLASS);
        }

        if (State.SearchViewState.currentQueryString !== stateSearchText) {
            State.SearchViewState.currentQueryString = stateSearchText;
            executeSearch = true;
        }

        var stateSearchLaunchPoint: string = Helpers.StateHelper.getSearchLaunchPointFromState(state);
        if (State.SearchViewState.searchLaunchPoint !== stateSearchLaunchPoint) {
            State.SearchViewState.searchLaunchPoint = stateSearchLaunchPoint;
            executeSearch = true;
        }

        State.SearchViewState.previewState = Helpers.StateHelper.getPreviewStateFromState(state);

        var stateFilters = Helpers.StateHelper.getSearchFiltersValueFromState(state);

        // Clear the Encoded filter from the last search in case stateFilters is empty string
        if (stateFilters === "") {
            State.SearchViewState.currentFiltersEncoded = undefined;
            State.SearchViewState.currentFiltersDecoded = FiltersHelper.FiltersHelper.decodeFilters(State.SearchViewState.currentFiltersEncoded);
        }
        // StateFilters should not be emply string as at account level when no prejects is selected the selected filters are null, hence in this case search should not be executed
        else if (State.SearchViewState.currentFiltersEncoded !== stateFilters) {
            State.SearchViewState.currentFiltersEncoded = stateFilters;
            State.SearchViewState.currentFiltersDecoded = FiltersHelper.FiltersHelper.decodeFilters(State.SearchViewState.currentFiltersEncoded);
            executeSearch = true;
        }

        // get current sortOptions.
        State.SearchViewState.sortOptions = state.sortOptions;

        // Re execute search query for the same search text
        var action: string = Helpers.StateHelper.getActionFromState(state),
            stateSelectedResult: string = Helpers.StateHelper.getSelectedResultValueFromState(state),
            isSearchOrResearchAction: boolean = Helpers.Utils.isSearchOrResearchAction(action),
            isSortAction: boolean = Helpers.Utils.isSortAction(action);

        // Execute search query for sort action
        if (stateSearchText &&
            (isSortAction ||
                (!stateSelectedResult &&
                    isSearchOrResearchAction))) {
            executeSearch = true;
        }

        if (executeSearch) {
            this.getResultsAndCounts(stateSelectedResult, state.trigger);
        }
        else if (isSearchOrResearchAction) {
            State.SearchViewState.currentProvider.selectResult(stateSelectedResult);
        }
    }

    private replaceHistory(stateOverride: any, onEntityChange: boolean = false) {
        // Enhance current state only if we are in current entities context
        // Use the provided state in case of entity switch as it can vary much across entities
        var state = onEntityChange ? stateOverride : this.getUpdatedState(stateOverride);

        // Restoring the filter preferences when we switched back from project search to code search
        if (onEntityChange && Helpers.StateHelper.getSearchTextValueFromState(state)
            && Helpers.StateHelper.getProviderIdValueFromState(state) === SearchConstants.CodeEntityTypeId) {
            // state.type contains the entity on which search has been fired
            // where as State.SearchViewState.currentProvider.getId() gives us the current entity
            state.filters = FilterPrefs.FilterPreferences.getFilterPreference(Helpers.StateHelper.getProviderIdValueFromState(state));
        }

        if (!Helpers.StateHelper.getSearchTextValueFromState(state)) {
            var stateProviderId: string = Helpers.StateHelper.getProviderIdValueFromState(state);

            if (!State.SearchViewState.currentProvider || State.SearchViewState.currentProvider.getId() !== stateProviderId) {
                var currentProvider = Providers_Helper.ProvidersHelper.getProviderById(this.m_searchProviders, stateProviderId);

                // Notify switched from entity in order to perform provider related cleanups.
                if (State.SearchViewState.currentProvider) {
                    State.SearchViewState.currentProvider.NotifyOnEntitySwitchedFrom();
                }

                if (currentProvider) {
                    currentProvider.NotifyOnEntitySwitchedTo();
                    State.SearchViewState.currentProvider = currentProvider;
                }

                SearchBoxHelper.SearchBoxHelper.registerSearchBoxToAnEntityType(stateProviderId, Utils_Core.delegate(this, this._onRegisterSearchBoxEntityCompletion));
                TelemetryHelper.TelemetryHelper.traceLog({ "EntityTypeChangedTo": stateProviderId });
            }

            Navigation_Services.getHistoryService().replaceHistoryPoint(SearchConstants.ScopeFiltersActionName, state);
        }
        else {
            Navigation_Services.getHistoryService().replaceHistoryPoint(SearchConstants.SearchActionName, state);
        }
    }

    private updateHistoryOnFilterSelection(stateOverride: any) {
        var state = this.getUpdatedState(stateOverride);

        if (State.SearchViewState.currentAction === SearchConstants.ScopeFiltersActionName) {
            // No need to maintain browser history for every scope filter selection
            Navigation_Services.getHistoryService().replaceHistoryPoint(SearchConstants.ScopeFiltersActionName, state);
        }
        else {
            Navigation_Services.getHistoryService().addHistoryPoint(SearchConstants.SearchActionName, state);
        }
    }

    private getUpdatedState(stateOverride: any) {
        // Get current state and update url with new parameters.
        var state = Helpers.StateHelper.getCurrentState();
        $.extend(state, stateOverride);

        // Remove the null elements so they don't show in URL
        return Helpers.StateHelper.createSearchActionState(state);
    }

    private clearAll(): void {
        this.clearState();
        ViewBuilder.SearchViewBuilder.clearAll();
    }

    private clearState(): void {
        State.SearchViewState.currentFiltersEncoded = undefined;
        State.SearchViewState.currentFiltersDecoded = undefined;
        State.SearchViewState.currentQueryString = undefined;
        State.SearchViewState.searchLaunchPoint = undefined;
        State.SearchViewState.currentSelectedResultIndex = undefined;
        State.SearchViewState.sortOptions = undefined;
    }

    // Sets the shortcut for large search box
    private setupShortcuts(): void {
        // get the singleton class instance
        var manager = KeyboardShortcuts.ShortcutManager.getInstance();
        // register shortcut to set focus on main search box.
        manager.registerShortcut(
            SearchView.SHORTCUT_GROUP,
            SearchView.KEY_S,
            SearchView.DESCRIPTION_FOR_SHORTCUT, () => {
                SearchBoxHelper.SearchBoxHelper.setFocusInSearchBox();
            });
    }

    /**
    * Registers the QuickStart to make the user aware of Code Search Features
    */
    private _registerSearchQuickStart(): void {
        VSS.using(["Engagement/Dispatcher", "Engagement/Core"], (EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE, EngagementCore: typeof EngagementCore_NO_REQUIRE) => {
            EngagementDispatcher.Dispatcher.getInstance().register(<EngagementCore_NO_REQUIRE.IEngagementModel>{
                id: "CodeSearchFileViewerCapabilities",
                type: EngagementCore.EngagementType.QuickStart,
                model: EngagementDispatcher.lazyLoadModel(
                    ["Search/Scripts/QuickStart/TFS.Search.FileViewerCapabilities.QuickStart"], (Search_QuickStart: typeof Search_QuickStart_NO_REQUIRE) => {
                        var searchContext = new Search_QuickStart.SearchQuickStartPageContext();
                        return new Search_QuickStart.SearchQuickStartModel(searchContext);
                    })
            });
        });
    }

    private _onRegisterSearchBoxEntityCompletion($searchBoxElement: JQuery): void {
        // if input box is bound to previous search box releated events, unbind first.
        var _$inputTextBox: JQuery = $searchBoxElement.find("#searchbox");
        if (this.m_searchBoxEntityDropDown) {
            this.m_searchBoxEntityDropDown.unbind(_$inputTextBox);
        }

        VSS.using(["Presentation/Scripts/TFS/TFS.Host.UI"], (Tfs_Host_UI: typeof TFS_Host_UI_NO_REQUIRE) => {
            var searchBox = <TFS_Host_UI_NO_REQUIRE.SearchBox>Controls.Enhancement.ensureEnhancement(Tfs_Host_UI.SearchBox, $searchBoxElement),
                _$dropdownAttachmentPane: JQuery = $(".search-entity-dropdown-container"),
                _$dropdownMenu: JQuery;

            if (searchBox) {
                var searchAdapter = searchBox.getAdapter();
                if (searchAdapter) {
                    _$inputTextBox.attr("aria-label", searchAdapter.getWatermarkText());
                    searchAdapter.getHelpDropdown(Utils_Core.delegate(this, (dropdownControl: TFS_Host_UI_NO_REQUIRE.ISearchBoxDropdownControl) => {
                        _$dropdownAttachmentPane.empty();
                        if (dropdownControl) {
                            // update the memeber variable with present instance of ISearchBoxDropdown control
                            this.m_searchBoxEntityDropDown = dropdownControl;
                            _$dropdownMenu = dropdownControl.getPopup();
                            _$dropdownAttachmentPane.prepend(_$dropdownMenu);
                            dropdownControl.bind(_$inputTextBox, true);
                        }
                    }));
                }
            }
        });
    }
}

Controls.Enhancement.registerEnhancement(SearchView, ".search-view")
