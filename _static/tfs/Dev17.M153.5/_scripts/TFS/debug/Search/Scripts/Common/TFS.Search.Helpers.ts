// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import FiltersHelper = require("Search/Scripts/Common/TFS.Search.FiltersHelper");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import FilterPreference_Helper = require("Search/Scripts/UserPreferences/TFS.Search.FilterPreferences.Helper");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Service = require("VSS/Service");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import { HubsService } from "VSS/Navigation/HubsService";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { WorkItemConstants } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as VSSContext from "VSS/Context";
import * as VSSService from "VSS/Service";

/**
* Helper class to hold common logic around interacting with the state information
*/
export class StateHelper {

    /**
    * Returns the Provider Id out of the state blob. Can be null / undefined
    * @param state state blob, likely created by the Navigation Handler
    */
    public static getProviderIdValueFromState(state: any): string {
        return state[SearchConstants.ProviderIdParameterName];
    }

    /**
    * Returns the Search Text out of the state blob. Can be null / undefined
    * @param state state blob, likely created by the Navigation Handler
    */
    public static getSearchTextValueFromState(state: any): string {
        return state[SearchConstants.SearchTextParameterName];
    }

    /**
    * Returns the Search Launch Point out of the state blob. Can be null / undefined
    * @param state state blob, likely created by the Navigation Handler
    */
    public static getSearchLaunchPointFromState(state: any): string {
        return state[SearchConstants.SearchLaunchPointParameterName];
    }

    /**
    * Returns the preview state out of the state blob. Can be null / undefined
    * @param state state blob, likely created by the Navigation Handler
    */
    public static getPreviewStateFromState(state: any): string {
        return state[SearchConstants.PreviewStateName];
    }

    /**
    * Returns the Search Filters out of the state blob. Can be null / undefined
    * @param state state blob, likely created by the Navigation Handler
    */
    public static getSearchFiltersValueFromState(state: any): string {
        return state[SearchConstants.SearchFiltersParameterName];
    }

    /**
    * Returns the Selected Result out of the state blob. Can be null / undefined
    * @param state state blob, likely created by the Navigation Handler
    */
    public static getSelectedResultValueFromState(state: any): string {
        return state[SearchConstants.SelectedResultParameterName];
    }

    /**
    * Returns the current action from state information
    * @param state state blob, likely created by the Navigation Handler
    */
    public static getActionFromState(state: any): string {
        return state[SearchConstants.CurrentActionParameterName];
    }

    /**
    * Returns the current sortOptions from state information
    * @param state state blob, likely created by the Navigation Handler
    */
    public static getSortOptionsFromState(state: any): string {
        return state[SearchConstants.SortOptionsParameterName];
    }

    /**
    * Creates a consistently ordered state blob out of the given parameters using the proper object member names. 
    * This allows the URL to be neat and ordered. Only includes parameters whose value is specified & non-null to not inflate the URL
    * @param searchType Specifies which type of search provider to use. If null/undefined it is not included into the state blob.
    * @param searchText Specifies which type of search text to query. If null/undefined it is not included into the state blob.
    * @param searchFilters Specifies which filters were selected for the search. If null/undefined it is not included into the state blob.
    * @param selectedResult Specifies which result was selected. If null/undefined it is not included into the state blob..
    * @param searchLaunchPoint Specifies the search launch point. If null/undefined it is not included into the state blob.
    */
    public static createSearchActionState(searchActionState: any): any {
        var state = {};

        this.addToStateIfValueNotNull(
            state,
            SearchConstants.ProviderIdParameterName,
            searchActionState[SearchConstants.ProviderIdParameterName]);
        this.addToStateIfValueNotNull(
            state,
            SearchConstants.SearchLaunchPointParameterName,
            searchActionState[SearchConstants.SearchLaunchPointParameterName]);
        this.addToStateIfValueNotNull(
            state,
            SearchConstants.SearchTextParameterName,
            searchActionState[SearchConstants.SearchTextParameterName]);
        this.addToStateIfValueNotNull(
            state,
            SearchConstants.SelectedResultParameterName,
            searchActionState[SearchConstants.SelectedResultParameterName]);
        this.addToStateIfValueNotNull(
            state,
            SearchConstants.PreviewStateName,
            searchActionState[SearchConstants.PreviewStateName]);
        this.addToStateIfValueNotNull(
            state,
            SearchConstants.SortOptionsParameterName,
            searchActionState[SearchConstants.SortOptionsParameterName]);

        // remove duplicate filters
        var decodedFilters: Core_Contracts.IFilterCategory[] = FiltersHelper.FiltersHelper.decodeFilters(
            searchActionState[SearchConstants.SearchFiltersParameterName]
        )

        // remove unsupported filters
        state[SearchConstants.SearchFiltersParameterName] =
            FiltersHelper.FiltersHelper.encodeFilters(FiltersHelper
                .FiltersHelper
                .removeUnSupportedFilters(searchActionState[SearchConstants.ProviderIdParameterName], decodedFilters));

        return state;
    }

    /**
    * Returns current state (represented by URL)
    */
    public static getCurrentState(): any {
        var searchActionState: any = {};
        searchActionState[SearchConstants.ProviderIdParameterName] = State.SearchViewState.currentProvider.getId();
        searchActionState[SearchConstants.SearchTextParameterName] = State.SearchViewState.currentQueryString;
        searchActionState[SearchConstants.SearchFiltersParameterName] = State.SearchViewState.currentFiltersEncoded;
        searchActionState[SearchConstants.SelectedResultParameterName] = State.SearchViewState.currentSelectedResultUniqueId;
        searchActionState[SearchConstants.SearchLaunchPointParameterName] = State.SearchViewState.searchLaunchPoint;
        searchActionState[SearchConstants.PreviewStateName] = State.SearchViewState.previewState;
        searchActionState[SearchConstants.SortOptionsParameterName] = State.SearchViewState.sortOptions;

        return StateHelper.createSearchActionState(searchActionState);
    }

    /**
    * Helper function to reduce repeated logic. 
    * Adds a variable with the given member name and value to the state blob if the value is not null/undefined
    * @param state State blob, just a grab bag of properties
    * @param dataName The property name to store the dataValue in if it is not null/undefined
    * @param dataValue The value to store in the state blob, if it is not null/undefined
    */
    private static addToStateIfValueNotNull(state: any, dataName: string, dataValue: string): void {
        if (dataValue) {
            state[dataName] = dataValue;
        }
    }

}

/**
* Url helpers
*/
export class SearchUrls {

    public static GetSourceDeportFileDownloadUrl(action: string, scope: string, projectName: string, repositoryName: string, branchName: string, filePath: string, fileName: string, contentId: string, contentsOnly: boolean): string {

        var routeData = {
            area: "api",
            scope: scope,
            projectName: projectName,
            repositoryName: repositoryName,
            branchName: branchName,
            filePath: filePath,
            fileName: fileName,
            contentId: contentId,
            contentsOnly: contentsOnly
        };

        return Context.SearchContext.getRoutedActionUrl(action, routeData);
    }
}

/**
 * Utility helpers
 */
export class Utils {

    /**
     * Returns true if the current browser is IE by looking at the browsers UserAgent settings
     * Reference: WebAccess/Build/Scripts/Viva/Util/Detection.ts
     */
    public static isIE(): boolean {
        return (/MSIE /i.test(window.navigator.userAgent) || /Trident[\/]/i.test(window.navigator.userAgent));
    }

    /** 
     * Route the results to account or project page view based on where the search is initiated from. 
     * @param contextFilters Context filters string.
     * @param searchText Search Query string.
     * @param actionName Search action name.
     * @param searchLaunchPoint Search launch point.
     * @param entityTypeId Current entity type
     * @param openInNewTab Optional, tells whether to open search results in a new or current tab
     */
    public static routeToSearchResultsView(contextFilters: string, searchText: string, actionName: string,
        searchLaunchPoint: string, entityTypeId?: string, openInNewTab?: boolean, sortOptions?: any) {

        var currentPageController: string = Context.SearchContext.getDefaultContext().navigation.currentController,
            actionUrl: string,
            fragmentLink: string,
            searchActionState: any = {};

        searchActionState[SearchConstants.ProviderIdParameterName] = entityTypeId || State.SearchViewState.currentProvider.getId();
        searchActionState[SearchConstants.SearchTextParameterName] = searchText;
        searchActionState[SearchConstants.SearchFiltersParameterName] = contextFilters;
        searchActionState[SearchConstants.SearchLaunchPointParameterName] = searchLaunchPoint;
        searchActionState[SearchConstants.SortOptionsParameterName] = sortOptions;
        openInNewTab = openInNewTab || false;

        if (openInNewTab ||
            (Utils_String.ignoreCaseComparer(currentPageController, SearchConstants.SearchControllerName) !== 0) ||
            (Utils_String.ignoreCaseComparer(State.SearchViewState.currentProvider.getId(), entityTypeId) !== 0)) {
            // Search is invoked with Ctrl key pressed (irrespective of the page) or from any L1 code search box other than search results view page
            entityTypeId = entityTypeId || SearchConstants.CodeEntityTypeId;

            actionUrl = (Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchPrefetchFirstSearch)) ?
                Utils.getActionUrlWithPrefetch(entityTypeId, searchText, contextFilters) :
                Utils.getActionUrlWithoutPrefetch(entityTypeId, searchText, contextFilters);

            fragmentLink = Navigation_Services.getHistoryService().getFragmentActionLink(actionName,
                StateHelper.createSearchActionState(searchActionState)
            );

            var fullUrl: string = actionUrl;
            if (searchText) {
                fullUrl = actionUrl + fragmentLink;
            }

            if (openInNewTab) {
                // Open the results in a new tab if Ctrl key is pressed irrespective of current page
                TelemetryHelper.TelemetryHelper.traceLog({ "SearchResultsOpenedInANewTab": true });
                window.open(fullUrl);
            }
            else {
                // Redirect to search results view in the current tab
                window.location.href = fullUrl;
            }
        }
        else {
            // Search is triggered from search results page (main or L1 search box), Ctrl key is not pressed
            var currentPageUrl = window.location.href,
                prevSearchText = Utils.extractParamValueFromUrl(currentPageUrl, SearchConstants.SearchTextParameterName),
                state = StateHelper.createSearchActionState(searchActionState);
            // Replacing browser history should suffice, we don't have to redirect with in the current tab
            Navigation_Services.getHistoryService().updateHistoryEntry(actionName, state, prevSearchText === searchText);
        }
    }

    /**
     * Get Url for results view. Constructs the Url and the fragment. 
     * @param contextFilters 
     * @param searchText
     * @param actionName
     * @param searchLaunchPoint
     * @param entityTypeId
     */
    public static getAccountSearchResultsViewUrl(contextFilters: string, searchText: string, actionName: string,
        searchLaunchPoint: string, entityTypeId?: string): string {

        var actionUrl: string,
            entityTypeId = entityTypeId || SearchConstants.CodeEntityTypeId,
            searchActionState = {};

        searchActionState[SearchConstants.ProviderIdParameterName] = entityTypeId;
        searchActionState[SearchConstants.SearchTextParameterName] = searchText;
        searchActionState[SearchConstants.SearchFiltersParameterName] = contextFilters;
        searchActionState[SearchConstants.SearchLaunchPointParameterName] = searchLaunchPoint;

        // since we are only going to get the account level search URL
        var context = Context.SearchContext.getRootApplicationPath();

        actionUrl = "_" + SearchConstants.SearchControllerName;

        var fragmentLink: string = Navigation_Services.getHistoryService().getFragmentActionLink(actionName,
            StateHelper.createSearchActionState(searchActionState)
        );

        return context + actionUrl + fragmentLink;
    }

    public static getCurrentAccountName(): string {

        var currentAccountSearchUrl: string = Context.SearchContext.getRootApplicationPath();

        var firstIndexOfAccountName: number = currentAccountSearchUrl.indexOf("//") + 2;
        currentAccountSearchUrl = currentAccountSearchUrl.substr(firstIndexOfAccountName);
        var accountName: string = currentAccountSearchUrl.substr(0, currentAccountSearchUrl.indexOf("."));

        return accountName;
    }

    /**
     * Returns filter context (Project and Repo filters) from current URL
     * @param currentPageUrl Url of current page loaded
     * @return contextFilters string
     */
    public static extractFiltersFromCurrentUrl(currentPageUrl: string): string {
        // This search is fired from search results view (i.e subsequent search)
        // Retain the current context (Project and Repo filters)
        var contextFilters: string = null;
        var filters: string = null;
        var filtersValueStartIndex: number = currentPageUrl.search("&" + SearchConstants.SearchFiltersParameterName + "=");

        if (filtersValueStartIndex > -1) {
            // Skip "&filters="  (sample filters params: "&filters=ProjectFilters(p1)RepositoryFilters(p1)&")
            filtersValueStartIndex += SearchConstants.SearchFiltersParameterName.length + 2;
            var restOfTheUrl: string = currentPageUrl.substr(filtersValueStartIndex);
            var filtersValueEndIndex: number = restOfTheUrl.search("&");

            // Replace URI encode characters to printable. Ex: %7B => { and %7D => }
            if (filtersValueEndIndex > 0) {
                filters = decodeURIComponent(restOfTheUrl.substr(0, filtersValueEndIndex + 1));
            }
            else {
                filters = decodeURIComponent(restOfTheUrl.substr(0));
            }

            // Space is encoded as '+' in the URL, hence reverse that
            filters = filters.split("+").join(" ");

            while (filters.length > 0) {
                var filterCategoryEndIndex: number = filters.search(SearchConstants.FilterValueEnd);

                if (filterCategoryEndIndex < 0) {
                    break;
                }

                var filterCategory: string = filters.substr(0, filterCategoryEndIndex + 1);
                if (filterCategoryEndIndex + 1 <= filters.length) {
                    // Remaining categories
                    filters = filters.substr(filterCategoryEndIndex + 1);
                }

                if (filterCategory.indexOf(SearchConstants.CodeTypeFilters) !== 0 &&
                    filterCategory.indexOf(SearchConstants.AccountFilters) !== 0) {
                    // Include Project, Repo, Path filters.
                    if (contextFilters === null) {
                        contextFilters = filterCategory;
                    }
                    else {
                        contextFilters += filterCategory;
                    }
                }
            }
        }

        return contextFilters;
    }

    /**
     * Returns value of given param from the URL. Typically the param will be of type &param_name=param_value&
     * @param url Url of current page loaded
     * @param paramName name of the param whose value needs to be returned
     * @return extracted param value or empty string if not found
     */
    public static extractParamValueFromUrl(url: string, paramName: string, startMarker: string = "&", endMarker: string = "&"): string {
        var paramValueStartIndex: number = url.search(startMarker + paramName + "="),
            paramValue: string = "";

        if (paramValueStartIndex > -1) {
            // Discard &paramname=
            paramValueStartIndex += paramName.length + 2;

            // Extract param value from remaining URL part
            var restOfTheUrl: string = url.substr(paramValueStartIndex);
            var paramValueEndIndex: number = restOfTheUrl.search(endMarker);

            // If it's the last param in the URL, set the end offset to length of remaining URL
            if (paramValueEndIndex < 0) {
                paramValueEndIndex = restOfTheUrl.length;
            }

            // Replace URI encode characters to printable. Ex: %7B => { and %7D => }
            paramValue = decodeURIComponent(restOfTheUrl.substr(0, paramValueEndIndex));

            // Replace all instances of + with white space
            paramValue = paramValue.split("+").join(" ");
        }

        return paramValue;
    }

    /**
     * Checks whether an action is supported by tabbed viewer or not
     */
    public static isTabbedViewerAction(action: string): boolean {
        return (action === SearchConstants.ContentsActionName ||
            action === SearchConstants.HistoryActionName ||
            action === SearchConstants.CompareActionName);
    }

    /**
     * Checks whether an action is search/research
    */
    public static isSearchOrResearchAction(action: string): boolean {
        return (action === SearchConstants.SearchActionName ||
            action === SearchConstants.ReSearchActionName);
    }

    /**
     * Checks whether an action is sort
    */
    public static isSortAction(action: string): boolean {
        return action === SearchConstants.SortActionName;
    }

    /**

    /**
     * Does a locale agnostic, case insensitive compare
     * Returns true of both strings are the same, false otherwise
     */
    public static compareStrings(first: string, second: string): boolean {
        return (Utils_String.localeIgnoreCaseComparer(first, second) === 0);
    }

    /**
    * Utility function to detect mouse drag function and do something on mousemove using a callback function
    */
    public static setDomElementDragEventHandler($element: JQuery, thisArg: any, callback: Function): void {
        $element.on('mousedown', (e => {
            $element.on('mouseup mousemove', (e => {
                if (e.type === 'mousemove') {
                    callback.call(thisArg, $element);
                }

                $element.off('mouseup mousemove');
            }));
        }));
    }

    /**
     * @return Returns true if feature flag is enabled.
     */
    public static isFeatureFlagEnabled(feature: string): boolean {
        var featureAvailabilityService = Service.getApplicationService(FeatureAvailability_Services.FeatureAvailabilityService);

        return (featureAvailabilityService && featureAvailabilityService.isFeatureEnabledLocal(feature));
    }

    /** 
     * @param filters Search_Contracts.IFilter
     * @return Name of the only selected filters in the given list(if any)
     */
    public static getOnlySelectedFilterNameIfAny(filters: Core_Contracts.IFilter[]): string {
        var firstSelectionName: string = "",
            selectedFilterCount: number = 0;

        var length: number = filters.length;
        for (var index = 0; index < length; index++) {
            if (filters[index].selected === true) {
                firstSelectionName = filters[index].name;
                selectedFilterCount++;
            }
        }

        return selectedFilterCount === 1 ? firstSelectionName : "";
    }

    /**
    * Returns base URL of the current page
    */
    public static getBaseUrl(): string {
        var splitUrl = window.location.href.split("//");

        // extract and return the initial part of url from the curret url
        return splitUrl[0] + "//" + splitUrl[1].substring(0, splitUrl[1].indexOf("/"));
    }

    /**
    * Returns accountName of the request
    */
    public static getAccountName(): string {
        var splitUrl = window.location.host.split(".");

        // extract and return the first part i.e. account name
        return splitUrl[0];
    }

    /**
    * Returns if it is a landing page
    */
    public static isLandingPage(): boolean {
        var action = Utils.extractParamValueFromUrl(window.location.href, SearchConstants.ActionTextParameterNameInUrl);
        return action === SearchConstants.ScopeFiltersActionName;
    }

    /**
    * Returns a string by replacing textToReplace with replaceText using split and join.
    *
    * Using string.replace() could be a bit faster but it doesn't work for the scenario where fullText or replaceText is html encoded with a possibility of a $ immediately before a "
    * For example, if the replaceText is something like "$", after html enoding, " would become &quot; and replaceText would become &quot;$&quot;
    * In this case, note that replace() method treats $& together as a special replacement pattern and the results are not as expected.
    * Hence one should use this method in such cases.
    */
    public static replaceUsingSplitAndJoin(fullText: string, textToReplace: string, replaceText: string): string {
        return fullText.split(textToReplace).join(replaceText);
    }

    /**
    * Creates a new search request state using search text and current page URL
    */
    public static createNewSearchRequestState(searchText: string, entityTypeId?: string, openInNewTab?: boolean): void {

        if (Utils.compareStrings(entityTypeId, SearchConstants.WikiEntityTypeId)) {
            Utils.routeToWikiSearchResultsView(searchText, openInNewTab);
        }
        else {
            var currentPageUrl = window.location.href,
                context = Context.SearchContext.getDefaultContext(),
                hubsService = <HubsService>VSSService.getLocalService(HubsService),
                selectedHubGroupName: string,
                selectedHubGroupId: string,
                selectedNavigationContext: string,
                searchLaunchPoint: string,
                prevSearchText: string,
                searchAction: string,
                sortOptions: string;

            // Determines the launch point of search
            selectedHubGroupId = hubsService.getSelectedHubGroupId();
            selectedNavigationContext = Utils.getSelectedNavigationContext();
            selectedHubGroupName = Utils.getSelectedHubGroupName(selectedHubGroupId);
            searchLaunchPoint = selectedHubGroupName + "-" + selectedNavigationContext;

            // For triggering research, URL should change so that navigation handler kicks in
            // Ensure that action is changed from current when search text remains same
            // If search is successful, action would get changed to "contents" automatically, hence research will work fine
            // In case of no results, action remains "research" on retries, hence need to change it back to search
            prevSearchText = Utils.extractParamValueFromUrl(currentPageUrl, SearchConstants.SearchTextParameterName);
            searchAction = Utils.extractParamValueFromUrl(currentPageUrl, SearchConstants.ActionTextParameterNameInUrl);
            if (searchAction === SearchConstants.SearchActionName && searchText === prevSearchText) {
                searchAction = SearchConstants.ReSearchActionName;
            }
            else {
                searchAction = SearchConstants.SearchActionName;
            }

            //To make sure sortOptions are cleared up when entity  type changes
            let entityIdinURL = (State && State.SearchViewState
                && State.SearchViewState.currentProvider
                && State.SearchViewState.currentProvider.getId()) ? State.SearchViewState.currentProvider.getId() : null;
            if (entityIdinURL && entityTypeId && entityIdinURL === entityTypeId) {
                sortOptions = Utils.extractParamValueFromUrl(currentPageUrl, SearchConstants.SortOptionsParameterName);
            } else {
                sortOptions = null;
            }

            Utils._getContextFilters(context, entityTypeId, (contextFilters: string) => {
                Utils.routeToSearchResultsView(contextFilters, searchText, searchAction, searchLaunchPoint, entityTypeId, openInNewTab, sortOptions)
            });
        }
    }

    public static getUrlParams(entityTypeId: string, searchText: string, filters: string): string {
        return "type=" + entityTypeId + "&" + "text=" + encodeURIComponent(searchText) + "&" + Utils.getFiltersAsGetUrlParam(filters);
    }

    /**
     * Gets the base Url (url minus the fragment) of the controller, which will include all the Url params. 
     */
    public static getControllerBaseUrl(): string {
        var index: number = window.location.href.indexOf('#');
        if (index != -1) {
            return window.location.href.substr(0, index);
        }
        return window.location.href;
    }

    public static getUrlParam(url: string, paramName: string): string {
        var match = url.match("[\?\&#]" + paramName + "=([^\&#]+)[\&#]?");
        if (match && match.length === 2) {
            return decodeURI(match[1]);
        }
    }

    public static routeToWikiSearchResultsView(searchText: string, openInNewTab?: boolean, filters?: string) {
        const tfsContext = TfsContext.getDefault();
        const params = {
            type: SearchConstants.WikiEntityTypeId,
            text: searchText
        };

        if (filters) {
            params[SearchConstants.SearchFiltersParameterName] = filters;
        }
        else if (tfsContext.navigation.project) {
            params[SearchConstants.SearchFiltersParameterName] = SearchConstants.ProjectFilters + "{" + tfsContext.navigation.project + "}";
        }

        const actionUrl = tfsContext.getActionUrl(undefined, SearchConstants.WikiSearchControllerName, params as any);

        if (openInNewTab) {
            window.open(actionUrl);
        }
        else {
            // Redirect to search results view in the current tab
            window.location.href = actionUrl;
        }
    }

    private static getActionUrlWithPrefetch(entityTypeId: string, searchText: string, contextFilters: string): string {
        var actionUrl: string, urlParams: string = "?" + Utils.getUrlParams(entityTypeId, searchText, contextFilters);
        actionUrl = Context.SearchContext.getDefaultContext().getPublicActionUrl("", SearchConstants.SearchControllerName) + urlParams;

        return actionUrl;
    }

    private static getActionUrlWithoutPrefetch(entityTypeId: string, searchText: string, contextFilters: string): string {
        var actionUrl: string;
        var urlParams: string = "?" + "type=" + entityTypeId;
        if (Context.SearchContext.isAccountOrCollectionContext() && Context.SearchContext.isHosted()) {
            actionUrl = "/_" + SearchConstants.SearchControllerName + urlParams;
        }
        else {
            actionUrl = Context.SearchContext.getDefaultContext().getActionUrl("", SearchConstants.SearchControllerName) + urlParams;
        }
        return actionUrl;
    }

    private static getFiltersAsGetUrlParam(filters: string): string {
        if (!filters) {
            return Utils_String.empty;
        }

        // We are now not converting "filter" string to IDictionary<string, stringp[]> as this deserialization
        // is being taken care of in the controller itself.
        return "filters=" + filters;
    }

    // entityTypeId is not available only in case of right click search in the search page
    private static _getContextFilters(context, entityTypeId: string = SearchConstants.CodeEntityTypeId, callback: Function): void {
        // Do not restore preferences when new route is enabled.
        if (Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchEnableNewRoute)) {
            if (context.navigation.topMostLevel >= NavigationContextLevels.Project) {
                const keyConstant = Utils_String.localeIgnoreCaseComparer(entityTypeId, SearchConstants.CodeEntityTypeId) === 0
                    ? SearchConstants.ProjectFilters
                    : WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME;
                callback(keyConstant + SearchConstants.FilterValueStart + context.navigation.project + SearchConstants.FilterValueEnd);
            }
            else {
                callback(null);
            }
        }
        else {
            var currentPageUrl = window.location.href,
                currentPageController: string = context.navigation.currentController.toLowerCase();

            if (currentPageController === SearchConstants.SearchControllerName) {
                // This search is fired from search results view (i.e subsequent search)
                // Retain the current context (Project and Repo filters)
                var decodedURI = decodeURI(currentPageUrl),
                    match = decodedURI.match(/type=([\w\s]+)/i),
                    currentEntity = match[1];
                if (Utils_String.ignoreCaseComparer(currentEntity, entityTypeId) === 0) {
                    callback(Utils.extractFiltersFromCurrentUrl(currentPageUrl));
                    return;
                }
            }

            if (entityTypeId &&
                (Utils_String.ignoreCaseComparer(entityTypeId, SearchConstants.CodeEntityTypeId) === 0 ||
                    Utils_String.ignoreCaseComparer(entityTypeId, SearchConstants.WorkItemEntityTypeId) === 0)) {
                // Search is fired from non search hub, populate user preferences for filter
                if (Context.SearchContext.isAccountOrCollectionContext()) {
                    FilterPreference_Helper.FilterPreferencesHelper.populateFilterPreferencesInAccountContext(entityTypeId, callback);
                }
                else if (context.navigation.project) {
                    FilterPreference_Helper.FilterPreferencesHelper.populateFilterPreferencesInProjectContext(context.navigation.project, entityTypeId, callback);
                }
            }
        }
    }

    private static getSelectedHubGroupName(selectedHubGroupId: string): string {
        var hubGroupName: string,
            hubNames: IDictionaryStringTo<string> = {
                "ms.vss-wiki-web.wiki-hub-group": "wiki",
                "ms.vss-code-web.code-hub-group": "code",
                "ms.vss-work-web.work-hub-group": "workitems",
                "ms.vss-build-web.build-release-hub-group": "buildrelease",
                "ms.vss-test-web.test-hub-group": "test",
                "ms.vss-tfs-web.project-team-hidden-hub-group": "projects-team",
                "ms.vss-web.home-hub-group": "dashboard",
                "ms.vss-web.project-admin-hub-group": "projects-admin",
                "ms.vss-tfs-web.collection-project-hub-group": "apps-projects",
                "ms.vss-tfs-web.collection-favorites-hub-group": "apps-favorites",
                "ms.vss-tfs-web.collection-work-hub-group": "apps-workitems",
                "ms.vss-tfs-web.collection-pullrequests-hub-group": "apps-pullrequests",
                "ms.vss-tfs-web.collection-rooms-new-account-nav-hub-group": "apps-rooms",
                "ms.vss-tfs-web.collection-users-new-account-nav-hub-group": "apps-users",
                "ms.vss-web.collection-admin-hub-group": "apps-admin"
            };

        if (!selectedHubGroupId) {
            // If there is no hub present, we are on search page.
            hubGroupName = "search";
        }
        else if (hubNames.hasOwnProperty(selectedHubGroupId)) {
            hubGroupName = hubNames[selectedHubGroupId];
        }
        else {
            // categorizing unknown hubs as "custom".
            hubGroupName = "custom";
        }

        return hubGroupName;
    }

    private static getSelectedNavigationContext(): string {
        let navigationContextLevel = VSSContext.getPageContext().navigation.topMostLevel,
            navigationContext = NavigationContextLevels[navigationContextLevel];

        return navigationContext;
    }
}
