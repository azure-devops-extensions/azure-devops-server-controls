// Copyright (c) Microsoft Corporation. All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />
"use strict";

import * as React from "react";
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import NavigationHelper = require("Search/Scripts/Common/TFS.Search.NavigationHelper");
import Navigation_Services = require("VSS/Navigation/Services");
import Notifications = require("VSS/Controls/Notifications");
import Performance = require("Search/Scripts/Common/TFS.Search.Performance");
import Providers = require("Search/Scripts/Providers/TFS.Search.Providers");
import Q = require("q");
import Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Results = require("Search/Scripts/Providers/WorkItem/TFS.Search.Controls.WorkItemResults");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import TFS_UI = require("VSS/Utils/UI");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import ViewBuilder = require("Search/Scripts/Common/TFS.Search.ViewBuilder");
import WebApi = require("Search/Scripts/WebApi/TFS.Search.WebApi");
import WebApi_Types = require("Search/Scripts/WebApi/TFS.Search.WebApi.Types");
import WorkItemContracts = require("Search/Scripts/Contracts/TFS.Search.WorkItem.Contracts");
import WorkItemBanner = require("Search/Scripts/Common/TFS.Search.MessageBanner");
import WorkItemGrid = require("Search/Scripts/Providers/WorkItem/TFS.Search.Controls.WorkItem.Grid");
import Navigation = require("VSS/Controls/Navigation");
import domElem = TFS_UI.domElem;

import * as Models from "Search/Scripts/React/Models";
import * as IndexingLandingPage from "Search/Scripts/React/Components/IndexingLandingPage";
import { PreferenceRestorableSplitter } from "Search/Scripts/Controls/TFS.Search.Controls.Splitter";
import { SearchConstants, ViewMode } from "Search/Scripts/Common/TFS.Search.Constants";
import { WorkItemConstants } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import { UserPreferenceScope, UserPreferences } from "Search/Scripts/UserPreferences/TFS.Search.UserPreferences";
import * as Results_Info_Control from "Search/Scripts/React/Components/ResultsInfoView/ResultsInfoView";
import * as Results_View_Control from "Search/Scripts/React/Components/ResultsView/ResultsView";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import {
    ActionsHub,
    events,
    IFilterSelectionChangedPayload
} from "Search/Scripts/React/ActionsHub";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { ISortOption } from "Search/Scripts/React/Models";
import { WorkItemCommon, Utils } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Common";
import { WorkItemSearchGridCellRenderer } from "Search/Scripts/React/Components/GridCellRenderers/GridCellRenderers";

import WITForm_NO_REQUIRE = require("WorkItemTracking/Scripts/Controls/WorkItemForm");
import WorkItemEventHandlers_NO_REQUIRE = require("Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.EventHandlers");
import ResponseMessageHelper_NO_REQUIRE = require("Search/Scripts/Common/TFS.Search.ResponseMessageHelper");

export const WORK_ITEM_SEARCH_PREVIEWPANE_PREFERENCE_KEY: string = "WorkItemSearch/PreviewPanePreferences";

export class WorkItemSearchProvider implements Providers.ISearchProvider {
    private resultsView: Results.WorkItemResults;
    private resultsGrid: WorkItemGrid.WorkItemGridControl;
    private workItemPreviewer: WITForm_NO_REQUIRE.WorkItemForm;
    private splitter: PreferenceRestorableSplitter;
    private previewPaneOrientationPivotControl: Navigation.PivotFilter;
    private resultsViewModePivotControl: Navigation.PivotFilter;
    private messageBanner: WorkItemBanner.WorkItemSearchBannerMessage;
    private actionCreator: ActionCreator;
    private actionsHub: ActionsHub;
    private storesHub: StoresHub;
    private projectCollectionTfsContext: any;
    private previousSelectedWorkItemId: number;
    private v2Layout: boolean;
    private isListViewEnabled: boolean;
    private retainFocusOnFilterDropdown: boolean;
    private _$bannerContainer: JQuery;
    private _$container: JQuery;
    private static WORKITEM_PREFETCHED_RESULTS_CSS_SELECTOR: string = ".workitem-prefetch-data";
    private static RESULTS_VIEW_PREF_KEY: string = "UserPreferredResultsView/" + SearchConstants.WorkItemEntityTypeId;
    private static PREVIEW_ORIENTATION_PREF_KEY: string = "UserPreferedPreviewOrientaion/" + SearchConstants.WorkItemEntityTypeId.charAt(0).toUpperCase() + SearchConstants.WorkItemEntityTypeId.slice(1);
    private static WORKITEM_FORM_MESSAGE_BANNER_CSS_SELECTOR: string = ".search-preview-info-banner-message";
    private static MESSAGE_BANNER_CSS_SELECTOR: string = "search-preview-info-banner-message";
    private static MESSAGE_BANNER_TOP_CLASS: string = "search-workitem-top-correction";

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
        this.resultsView = new Results.WorkItemResults({
            resultSelectionChangedHandler: this
        });

        this.splitter = <PreferenceRestorableSplitter>Controls.Enhancement.enhance(
            PreferenceRestorableSplitter,
            $(".search-view-preference-restorable-splitter"),
            {
                providerExtensionName: "vss-workitem-search",
                minWidth: SearchConstants.PreviewPaneMinWidth
            },
            {
                cssClass: "search-workitem-preview-rightfix"
            });

        this._$bannerContainer = $(".search-preview-contents");
        this._$container = $(domElem("div")).addClass(WorkItemSearchProvider.MESSAGE_BANNER_CSS_SELECTOR);
        this.messageBanner = new WorkItemBanner.WorkItemSearchBannerMessage(this._$container);
        this.previousSelectedWorkItemId = -1;
        this.v2Layout = v2Layout;
        this.retainFocusOnFilterDropdown = false;
        this.isListViewEnabled = Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItemEnableListView);

        this.actionsHub = actionsHub;
        this.actionCreator = actionCreator;
        this.storesHub = storesHub;

        // Adding Message for Showing Displayed/Found Results Count
        let _$resultsViewContainer: any = document.getElementsByClassName("search-results-information-container"),
            sortFields = Object.keys(WorkItemCommon.FIELD_METADATA).map((refName, index) => {
                if (Utils_String.ignoreCaseComparer("system.rev", refName) !== 0) {
                    return {
                        referenceName: refName,
                        displayName: WorkItemCommon.FIELD_METADATA[refName].displayName,
                    }
                }
            }).filter((p, i) => {
                return !!p;
            }),
            isGridClientSortEnabled = Helpers.Utils.isFeatureFlagEnabled(
                ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItemClientSort),
            isServerSortEnabled = Helpers.Utils.isFeatureFlagEnabled(
                ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItemServerSort),
            properties: Results_Info_Control.ISearchResultsInfoViewProps = {
                isClientSideSortEnabled: isGridClientSortEnabled,
                v2Layout: v2Layout,
                isServerSortEnabled: isServerSortEnabled,
                searchEntity: SearchConstants.WorkItemEntityTypeId,
                sortFields: sortFields.sort((first, second) => {
                    return Utils_String.ignoreCaseComparer(first.displayName, second.displayName);
                }),
                actionCreator: this.actionCreator,
                storesHub: this.storesHub
            };

        Results_Info_Control.renderResultsInfoView(_$resultsViewContainer[0], properties);

        // Adding Message for Showing Displayed/Found Results Count
        let _$searchResultsContainer: NodeListOf<Element> = document.getElementsByClassName("search-results-contents");
        Results_View_Control.renderResultsView(_$searchResultsContainer[0], {
            items: [],
            columns: [{
                contentRenderer: WorkItemSearchGridCellRenderer,
                displayName: "",
                key: "column_1"
            }],
            initialRowIndexUnderFocus: storesHub.searchResultsStore.selectedIndex,
            searchEntity: SearchConstants.WorkItemEntityTypeId,
            isV2Layout: v2Layout,
            isClientSideSortEnabled: isGridClientSortEnabled,
            isServerSortEnabled: isServerSortEnabled,
            isHeaderVisible: false,
            renderMode: "detailed",
            getItemKey: (item: any, index: number) => { return item.flattenFields["system.id"].value; },
            getComparerDelegate: isGridClientSortEnabled || isServerSortEnabled ? Utils.getComparer : null,
            availableWidth: _$searchResultsContainer[0].clientWidth,
            storesHub: this.storesHub,
            actionCreator: this.actionCreator
        });

        // render indexing landing page only in old layout.
        if (!this.v2Layout) {
            const _$landingPageContainer: NodeListOf<Element> = document.getElementsByClassName("indexing-landing-page-container");
            IndexingLandingPage.renderInto(_$landingPageContainer[0] as HTMLElement, {
                storesHub: storesHub,
                actionCreator: actionCreator,
                isOldLayout: !this.v2Layout
            });

        }

        // initialize work item list view as well.
        // Not rendering list view in new layout.
        if (this.isListViewEnabled && !this.v2Layout) {
            this.resultsGrid = <WorkItemGrid.WorkItemGridControl>Controls.BaseControl.createIn(
                WorkItemGrid.WorkItemGridControl,
                $(_$searchResultsContainer[0]),
                {
                    source: [],
                    sortOptions: [],
                    isGridClientSortEnabled: isGridClientSortEnabled,
                    isServerSortEnabled: isServerSortEnabled,
                    storesHub: this.storesHub,
                    actionCreator: this.actionCreator,
                    cssClass: "workitem-search-grid-container"
                });

        }

        this.storesHub.searchResultsActionStore.addListener(
            events.RESULTS_GRID_ACTIVE_ROW_CHANGED_EVENT,
            Utils_Core.delegate(this, this._onRowSelectionChanged));

        this.storesHub.searchResultsActionStore.addListener(
            events.RESULTS_GRID_ACTIVE_ROW_INVOKED_EVENT,
            Utils_Core.delegate(this, this._onRowInvoked));

        this.storesHub.previewOrientationStore.addChangedListener(
            Utils_Core.delegate(this, this._updatePreviewOrientation));

        this.storesHub.resultsViewStore.addChangedListener(
            Utils_Core.delegate(this, this._updateResultsViewMode));

        this.actionsHub.filterSelectionChanged.addListener(
            Utils_Core.delegate(this, (payload: IFilterSelectionChangedPayload) => {
                this.retainFocusOnFilterDropdown = payload.retainFocusOnDropdown;
            }));
    }

    /**
    * See ISearchProvider for description
    */
    public attachToNavigationEvents(searchView: any): void {
        var historySvc = Navigation_Services.getHistoryService();

        // Attach navigation handlers for work item search entity
        historySvc.attachNavigate(SearchConstants.ScopeFiltersActionName, (sender, state) => {
            if (State.SearchViewState.currentProvider &&
                Utils_String.ignoreCaseComparer(State.SearchViewState.currentProvider.getId(), this.getId()) === 0) {
                State.SearchViewState.currentAction = Helpers.StateHelper.getActionFromState(state);
                ViewBuilder.SearchViewBuilder.clearAll();
                this.showLandingPage();

                // Draw entity types
                ViewBuilder.SearchViewBuilder.setEntityTypes(this.getId());
                ViewBuilder.SearchViewBuilder.setEntityTypeHitCount(this.getId(), -1);
            }
        }, true);

        if (Helpers
            .Utils
            .isFeatureFlagEnabled(
            ServerConstants
                .FeatureAvailabilityFlags.WebAccessSearchWorkItemServerSort)) {
            historySvc.attachNavigate(SearchConstants.SortActionName, (sender, state) => {
                searchView.setupSearchPageAndNavigate(state, SearchConstants.SortActionName);
            }, true);
        }
    }

    /**
    * See ISearchProvider for description
    */
    public getId(): string {
        return SearchConstants.WorkItemEntityTypeId;
    }

    /**
    * See ISearchProvider for description
    */
    public getDisplayName(): string {
        return Resources.WorkItemEntityName;
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnExecuteSearch(sessionStartTime: number): void {
        // abort all dangling scenarios if any        
        Performance.abortWitSearchPerfScenarios();
        if (sessionStartTime) {
            // This search is triggered from other pages, hence sessionStartTime is present
            // Mark this as a primary scenario by setting isPageInteractive to true (time to interact is measured for this scenario)
            Performance.startRedirectedWitSearchScenario();
            TelemetryHelper.TelemetryHelper.traceLog({ "RedirectedSearchPreviewOfFirstWorkItemResultScenarioStarted": true });
        }
        else {
            Performance.startSubsequentWitSearchScenario();
            TelemetryHelper.TelemetryHelper.traceLog({ "SubsequentSearchPreviewOfFirstWorkItemResultScenarioStarted": true });
        }
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnExecuteSearchError(error: any, activityId: string): void {
        // Being cautious, abort any open WI perf scenarios before starting another
        // this.storesHub.searchResultsErrorStore.reset();
        this.actionCreator.refreshSearchErrors(
            null,
            [error],
            activityId,
            false);
        this.retainFocusOnFilterDropdown = false;
        Performance.abortWitSearchPerfScenarios();
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnEntitySwitchedTo(): void {
        // Setup results view
        if (!this.resultsView) {
            this.resultsView = new Results.WorkItemResults({
                resultSelectionChangedHandler: this
            });
        }

        Performance.abortWitSearchPerfScenarios();
        ViewBuilder.SearchViewBuilder.initializeResultsPane(this.resultsView);

        var previewPaneOrientation: string = UserPreferences.getUserPreference(
            WorkItemSearchProvider.PREVIEW_ORIENTATION_PREF_KEY,
            UserPreferenceScope.Account) ||
            SearchConstants.PreviewPaneRightOrientation,
            resultsViewMode: string = UserPreferences.getUserPreference(
                WorkItemSearchProvider.RESULTS_VIEW_PREF_KEY,
                UserPreferenceScope.Account) ||
                SearchConstants.WorkItemDetailedResultsViewMode;

        this._enhancePivotFilter(resultsViewMode, previewPaneOrientation);

        this.actionCreator.updatePreviewOrientationMode(previewPaneOrientation);
    }

    /**
    * See ISearchProvider for description
    */
    public NotifyOnEntitySwitchedFrom(): void {
        Performance.abortWitSearchPerfScenarios();

        // clear hub-pivot filters
        $(SearchConstants.HubPivotFiltersSelector).empty();
        this.clearResultsView();

        // clear filters pane too
        ViewBuilder.SearchViewBuilder.clearFiltersPane();
    }

    /**
    * See ISearchProvider for description
    */
    public getResultsAsync(
        activityId: string,
        query: string,
        scope: string,
        filters: Core_Contracts.IFilterCategory[],
        getNextBatch: boolean,
        success: any,
        failure: any,
        prefetchedResults: any,
        sortOptions?: string): void {
        let isClientSideSortEnabled = Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItemClientSort),
            isServerSideSortEnabled = Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItemServerSort);

        // A note to do task when CORS is enabled on workitem search service.
        // Change this function to call search service directly when CORS is enabled. See code search for refernce.
        let resultViewPivotControlSelectedItem: any = this.resultsViewModePivotControl && this.resultsViewModePivotControl.getSelectedItem(),
            previewPaneMode: string = this.splitter && this.splitter.splitOrientation;
        TelemetryHelper
            .TelemetryHelper
            .traceLog({
                "WorkItemSearchResultsViewModeOnSearch": resultViewPivotControlSelectedItem && resultViewPivotControlSelectedItem.value,
                "WorkItemSearchPreviewPaneModeOnSearch": previewPaneMode
            });

        if (prefetchedResults) {
            TelemetryHelper.TelemetryHelper.traceLog({ "ProcessingWorkItemPrefetchedResults": true });

            // as of now we will get filters and searchFilter both
            // In future we are going to remove filters so it will fallback to searchFilters
            if (!prefetchedResults.query.filters && prefetchedResults.query.searchFilters) {
                var filtersMap = prefetchedResults.query.searchFilters;
                var filtersList: Core_Contracts.IFilterCategory[] = new Array<Core_Contracts.IFilterCategory>();
                $.each(filtersMap, function (key, value) {
                    filtersList.push(new Core_Contracts.FilterNameList(key, value));
                });
                prefetchedResults.query.filters = filtersList;
            }

            // The check is required for not to show the stale results 
            if (this.getSearchQueryIdentifier(
                query,
                filters || []) ===
                this.getSearchQueryIdentifier(
                    prefetchedResults.query.searchText,
                    prefetchedResults.query.filters)) {
                let jsonResult = this._transformSearchResponse(prefetchedResults),
                    workItemSearchResponse: Providers.IResponseWithActivityId = {
                        activityId: activityId,
                        searchResults: jsonResult
                    };

                success(workItemSearchResponse);
                return;
            }
        }

        if (sortOptions && !isServerSideSortEnabled) {
            sortOptions = null;
        }

        WebApi.SearchClient.postMSJSON(
            WebApi_Types.WebApiConstants.PostWorkItemQueryTfsApi,
            activityId,
            query,
            scope,
            filters,
            SearchConstants.DefaultSkipResults,
            // If client side sorting feature is disabled take same number of results as the one which we are rendering.
            isClientSideSortEnabled || isServerSideSortEnabled
                ? SearchConstants.WorkItemSearchTakeResults
                : SearchConstants.WorkItemSearchResultsToRender,
            (jsonResult, statusText, responseHeaders) => {
                let responseJsonResult = this._transformSearchResponse(jsonResult);
                let activityId: string = responseHeaders.getResponseHeader("X-TFS-Session"),
                    workItemSearchResponse: Providers.IResponseWithActivityId = {
                        activityId: activityId,
                        searchResults: responseJsonResult
                    };

                success(workItemSearchResponse);
            },
            (error) => {
                failure(error);
            },
            sortOptions);
    }

    /**
     * Function to modify Json Results given
     * @param jsonResult
     */
    private _transformSearchResponse(jsonResult: any): any {
        let modifiedJsonResult = jsonResult;
        this.projectCollectionTfsContext = $.extend(true, {}, Context.SearchContext.getTfsContext());

        if (!this.projectCollectionTfsContext.navigation.project &&
            modifiedJsonResult.results.values &&
            modifiedJsonResult.results.values.length > 0) {
            this.projectCollectionTfsContext.navigation.project = modifiedJsonResult.results.values[0].project;
            this.projectCollectionTfsContext.navigation.projectId = modifiedJsonResult.results.values[0].projectId;
        }

        // Add relevance rank field for the purpose of sorting on client side.
        let resultsCount: number = modifiedJsonResult.results.values.length;
        if ($.isArray(modifiedJsonResult.results.values) && resultsCount > 0) {
            for (let idx = 0; idx < resultsCount; idx++) {
                modifiedJsonResult.results.values[idx]["relevance"] = resultsCount - idx;
                let fields = modifiedJsonResult.results.values[idx].fields,
                    flattenFields = {};
                for (let i = 0; i < fields.length; i++) {
                    let key = fields[i].referenceName.toLowerCase();
                    flattenFields[key] = fields[i];
                }

                // Add an object property "flattenFields" so as to enable field access in a single lookup.
                modifiedJsonResult.results.values[idx]["flattenFields"] = flattenFields;
            }
        }

        return modifiedJsonResult;
    }

    /**
     * 
     * @param searchText string
     * @param filters Core_Contracts.IFilterCategory[]
     * @return Unique identifier for a searchQuery calculated using search text and filters
     */
    private getSearchQueryIdentifier(searchText: string, filters: Core_Contracts.IFilterCategory[]): string {
        let searchQueryIdentifier: string = searchText;

        for (let i: number = 0; i < filters.length; i++) {
            searchQueryIdentifier += filters[i].name;
            searchQueryIdentifier += filters[i].values;
        }

        return searchQueryIdentifier;
    }

    /**
    * See ISearchProvider for description
    */
    public getTenantResultsAsync(
        activityId: string,
        query: string,
        scope: string,
        filters: Core_Contracts.IFilterCategory[],
        getNextBatch: boolean)
        : Q.Promise<Providers.IResponseWithActivityId> {
        return Q.resolve<Providers.IResponseWithActivityId>(null);
    }

    /**
    * See ISearchProvider for description
    */
    public selectResult(workItemId: string, revisionId?: number, workItemType?: string): void {
        var isDefaultSelection: boolean = false;
        VSS.using(["WorkItemTracking/Scripts/Controls/WorkItemForm"],
            Utils_Core.delegate(this, (WITForm: typeof WITForm_NO_REQUIRE) => {
                if (!this.workItemPreviewer ||
                    this.workItemPreviewer.isDisposed()) {
                    isDefaultSelection = true;
                    this.workItemPreviewer = <WITForm_NO_REQUIRE.WorkItemForm>Controls.BaseControl.createIn(
                        WITForm.WorkItemForm,
                        $(".search-preview-contents"),
                        {
                            tfsContext: this.projectCollectionTfsContext,
                            cssClass: "search-workitem-preview"
                        });
                }

                if (!isDefaultSelection) {
                    Performance.abortWitSearchPerfScenarios();
                    Performance.startWitResultSelectionChangeScenario();
                }

                var startTime = Performance.getTimestamp();
                this.messageBanner.removeBanner();
                this._$bannerContainer.removeClass(WorkItemSearchProvider.MESSAGE_BANNER_TOP_CLASS);
                let mode: string = this.splitter.splitOrientation;
                this.workItemPreviewer.beginShowWorkItem(parseInt(workItemId), (workitemform, workitem) => {
                    if (revisionId && (workitem.revision > revisionId)) {
                        this._$bannerContainer.prepend(this._$container);
                        this.messageBanner.showBanner(Search_Resources.WorkItemOudatedIndexMessage, Notifications.MessageAreaType.Warning, false, () => {
                            this._$bannerContainer.removeClass(WorkItemSearchProvider.MESSAGE_BANNER_TOP_CLASS);
                        });

                        this.messageBannerTopCorrection(mode);

                        TelemetryHelper.TelemetryHelper.traceLog({
                            "StaleWorkitemIndex": {
                                "WorkitemId": workItemId
                            }
                        });
                    }

                    TelemetryHelper.TelemetryHelper.traceLog({
                        "SearchWorkItemPreviewPaneLoadTime": Performance.getTimestamp() - startTime
                    });

                    Performance.endScenario(Performance.PerfConstants.FirstWorkItemSearchWithPreview);
                    Performance.endScenario(Performance.PerfConstants.SubsequentWorkItemSearchWithPreview);
                    Performance.endScenario(Performance.PerfConstants.PreviewOfSelectedWorkItemResult);
                    Utils_Accessibility.announce(Search_Resources.WorkItemPreviewPaneLoaded);
                }, () => {
                    this.workItemPreviewer.dispose();
                    this.workItemPreviewer = null;
                    this._$bannerContainer.prepend(this._$container);
                    this.messageBanner.showBanner(Search_Resources.WorkItemDeletedMessage, Notifications.MessageAreaType.Warning, false, () => {
                        this._$bannerContainer.removeClass(WorkItemSearchProvider.MESSAGE_BANNER_TOP_CLASS);
                    });

                    this.messageBannerTopCorrection(mode);
                    Performance.abortWitSearchPerfScenarios();
                    TelemetryHelper.TelemetryHelper.traceLog({
                        "SearchWorkItemDeletedOrDoNotHavePermissionMessageBannerShown": true
                    });
                    Utils_Accessibility.announce(Search_Resources.WorkItemDeletedMessage);
                }, false, revisionId);
            }));
    }


    /**
    * See ISearchProvider for description
    */
    public getSelectedResultUniqueId(selectedIndex: number): string {
        return null;
    }

    /**
    * See ISearchProvider for description
    */
    public showLandingPage(): void {
        // hide pivot filters
        ViewBuilder.SearchViewBuilder.hidePivotFilters();
        // Draw project search tips
        this.drawSearchTips();

        // Show scope filters
        var currentAction: string = Helpers
            .Utils
            .extractParamValueFromUrl(
            window.location.href,
            SearchConstants.ActionTextParameterNameInUrl);

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
        this.previousSelectedWorkItemId = -1;
        this.actionCreator.refreshSearchErrors(response, response.errors, responseActivityId, showMoreResults);
        if (!response || !response.results || response.results.values.length < 0) {
            // abort any lying work item preview perf scenarios.
            Performance.abortWitSearchPerfScenarios();
            return;
        }
        else if (response.results.values.length === 0) {
            // Zero Result end the required scenarios
            Performance.endScenario(Performance.PerfConstants.RedirectedSearchPreviewOfFirstWorkItemResult);
            Performance.endScenario(Performance.PerfConstants.PreviewOfFirstWorkItemResult);
            Performance.endScenario(Performance.PerfConstants.FirstWorkItemSearchWithPreview);
            Performance.endScenario(Performance.PerfConstants.SubsequentWorkItemSearchWithPreview);
            return;
        }
        else {
            ViewBuilder.SearchViewBuilder.showPivotFilters();
            this.drawResults(response, null);
            Performance.endScenario(Performance.PerfConstants.RedirectedSearchPreviewOfFirstWorkItemResult);
            Performance.endScenario(Performance.PerfConstants.PreviewOfFirstWorkItemResult);

            // select first result in new filter layout as we are not actively bringing the first row under focus
            // because of which the preview isn't getting loaded.
            if (this.v2Layout && this.retainFocusOnFilterDropdown) {
                let item = this.storesHub.searchResultsStore.items[0];
                if (item) {
                    let workItemId = item.flattenFields["system.id"].value,
                        revision = item.flattenFields["system.rev"].value,
                        workItemType = item.flattenFields["system.workitemtype"].value;

                    this.selectResult(workItemId, revision, workItemType);
                }
            }
        }

        this.retainFocusOnFilterDropdown = false;
    }

    /**
    * See ISearchProvider for description
    */
    public clearResultsView(): void {
        // Clear common elements
        ViewBuilder.SearchViewBuilder.clearResultsView();
        this.storesHub.searchResultsStore.reset();

        // hide pivot filters
        ViewBuilder.SearchViewBuilder.hidePivotFilters();
        if (this.workItemPreviewer) {
            this.workItemPreviewer.dispose();
            this.workItemPreviewer = null;
        }

        ViewBuilder.SearchViewBuilder.setViewMode(ViewMode.IntermediateViewMode);
    }

    /**
    * See ISearchProvider for description
    */
    public getFiltersFromResponse(response: Providers.IResponseWithActivityId): Q.Promise<Array<Core_Contracts.IFilterCategoryName>> {
        var filterCategories = response.searchResults.filterCategories,
            defaultFilterCategories: Array<Core_Contracts.IFilterCategoryName> = new Array<Core_Contracts.IFilterCategoryName>(),
            selectedProjects: Array<Base_Contracts.Filter> = [];

        // Add project filters first.
        for (var i = 0, l = response.searchResults.filterCategories.length; i < l; i++) {
            var f: any = filterCategories[i];
            if (localeIgnoreCaseComparer(
                f.name,
                WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME) === 0) {
                defaultFilterCategories.push(new Base_Contracts.DefaultFilterCategory(f.filters, f.name));
                selectedProjects = (<Base_Contracts.DefaultFilterCategory>f).filters.filter((value: Base_Contracts.Filter, index) => {
                    return value.selected
                });
            }
        }

        var queryFilters: Array<Core_Contracts.IFilterCategory> =
            (<WorkItemContracts.WorkItemSearchResponse>response.searchResults).query.filters;

        if (!queryFilters && (<WorkItemContracts.WorkItemSearchResponse>response.searchResults).query.searchFilters) {
            var filterMap = (<WorkItemContracts.WorkItemSearchResponse>response.searchResults).query.searchFilters;
            var filters: Core_Contracts.IFilterCategory[] = new Array<Core_Contracts.IFilterCategory>();
            $.each(filterMap, function (key, value) {
                filters.push(new Core_Contracts.FilterNameList(key, value));
            });
            queryFilters = filters;
        }

        var filtersInRequest: Core_Contracts.IFilterCategory[] = queryFilters,
            areaPathFilters = filtersInRequest.filter((f: any, index: number) => {
                return f.name === WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME;
            });

        // Add area path filters second.
        if (selectedProjects.length === 1) {
            var areaPath = (areaPathFilters && areaPathFilters.length === 1) ? areaPathFilters[0].values : null,
                areaPathString = $.isArray(areaPath) ? areaPath[0] : areaPath;

            defaultFilterCategories.push(
                new Base_Contracts.AreaPathFilterCategory(
                    WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME,
                    selectedProjects[0].name,
                    areaPathString));

        }

        // Add all other filters next.
        for (var i = 0, l = response.searchResults.filterCategories.length; i < l; i++) {
            var f: any = filterCategories[i];
            // transform the "assigned to" filter category to remove the email within <>
            if (localeIgnoreCaseComparer(
                f.name,
                WorkItemConstants.WORK_ITEM_ASSIGNED_TO_FILTER_CATEGORY_NAME) === 0) {
                if ($.isArray(f.filters)) {
                    f.filters.forEach((value, index) => {
                        var name = value.name.replace(/(<.*>)/i, "");
                        value.name = name;
                    });
                }
            }

            if (localeIgnoreCaseComparer(
                f.name,
                WorkItemConstants.PROJECT_FILTER_CATEGORY_NAME) !== 0) {
                defaultFilterCategories.push(new Base_Contracts.DefaultFilterCategory(f.filters, f.name));
            }
        }

        return Q.resolve(defaultFilterCategories);
    }

    /**
    * See ISearchProvider for description
    */
    public loadPrefetchedResults(): Core_Contracts.ISearchResponse {
        var prefetchedResults: Core_Contracts.ISearchResponse;

        var results = $(WorkItemSearchProvider.WORKITEM_PREFETCHED_RESULTS_CSS_SELECTOR).html();
        $(WorkItemSearchProvider.WORKITEM_PREFETCHED_RESULTS_CSS_SELECTOR).html("");

        if (results && results !== "null") {
            prefetchedResults = Utils_Core.parseMSJSON(results);
        }

        return prefetchedResults
    }

    /**
    * Draws search tips specific to WorkItem entity, shown on the landing page
    */
    public drawSearchTips(): void {
        var $summary: JQuery;

        $summary = $(domElem("div"));
        ViewBuilder.SearchViewBuilder.drawSearchTips(Resources.WorkItemSearchLandingPageMessage, $summary, false, false);
    }

    public handleReponseMessages(response: Providers.IResponseWithActivityId, showMoreResults: boolean, callback: Function): void {
        VSS.using(["Search/Scripts/Common/TFS.Search.ResponseMessageHelper"], (ResponseMessageHelper: typeof ResponseMessageHelper_NO_REQUIRE) => {
            var message = ResponseMessageHelper
                .ResponseMessage
                .handleResponseMessages(response, this.getId(), showMoreResults, this.v2Layout);
            ResponseMessageHelper.ResponseMessage.handleBannerErrorCodes(response);

            callback(message);
        });
    }

    private _onRowSelectionChanged(): void {
        let item: WorkItemContracts.WorkItemResult = this.storesHub.searchResultsActionStore.item,
            index = this.storesHub.searchResultsActionStore.index,
            workItemId = item.flattenFields["system.id"].value,
            revision = item.flattenFields["system.rev"].value,
            workItemType = item.flattenFields["system.workitemtype"].value;

        if (workItemId !== this.previousSelectedWorkItemId) {
            this.previousSelectedWorkItemId = workItemId;
            this.selectResult(workItemId, revision, workItemType);

            TelemetryHelper
                .TelemetryHelper
                .traceLog({
                    "ResultSelectionChanged": workItemId
                });
        }
    }

    private _onRowInvoked(): void {
        let item: WorkItemContracts.WorkItemResult = this.storesHub.searchResultsActionStore.item,
            index = this.storesHub.searchResultsActionStore.index,
            workItemId = item.flattenFields["system.id"].value;
        TelemetryHelper
            .TelemetryHelper
            .traceLog({
                "WorkItemSearchResultSelectionInvoked": workItemId
            });

        VSS.using(["Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.EventHandlers"],
            (WorkItemEventHandlers: typeof WorkItemEventHandlers_NO_REQUIRE) => {
                WorkItemEventHandlers.WorkItemEventHandlers.openModalDialogForWorkItem(parseInt(workItemId));
            });
    }

    private drawResults(response: Core_Contracts.ISearchResponse, indexOfResultToBeShownAtTheTop: number): void {
        let resultsViewMode: string = (this.isListViewEnabled && !this.v2Layout) ? this.resultsViewModePivotControl.getSelectedItem().value : "detailed",
            previewPaneMode: string = this.splitter.splitOrientation,
            sortOptions: ISortOption[] = State.SearchViewState.sortOptions ? JSON.parse(State.SearchViewState.sortOptions) : null,
            isServerSortEnabled = Helpers.Utils.isFeatureFlagEnabled(
                ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItemServerSort),
            maxDigits: number;

        const availableWidth = this.splitter.splitOrientation === "horizontal"
            ? this.splitter.getFixedSidePixels()
            : $(".leftPane.search-view-results-pane").width();

        ViewBuilder.SearchViewBuilder.setViewMode(ViewMode.ResultsGridWithPreview);
        this.splitter.restorePreviewPaneSizePreferences(previewPaneMode, true, true);
        this.actionCreator.updateWorkItemSearchResultsViewMode(resultsViewMode);

        if (isServerSortEnabled) {
            this.actionCreator.changeSearchResultsSortCriteria(sortOptions, false, Models.SearchProvider.workItem, false, false);
        }

        // update search results response.
        this.actionCreator.refreshSearchResults(
            response,
            State.SearchViewState.currentActivityId,
            !(this.v2Layout && this.retainFocusOnFilterDropdown)
                ? (indexOfResultToBeShownAtTheTop || 0)
                : null,
            availableWidth,
            Models.SearchProvider.workItem);

        WorkItemCommon.getWITColorsAndIconData(response.results.values, (statesColor) => {
            this.actionCreator.updateTfsData({
                statesColorMap: statesColor
            })
        });

        Performance.split(Performance.PerfConstants.WorkItemSearchResultsRendered);
    }

    private _updatePreviewOrientation(): void {
        let previewOrientation: string = this.storesHub.previewOrientationStore.orientation;

        TelemetryHelper.TelemetryHelper.traceLog({ "WorkItemSearchResultsPreviewOrientation": previewOrientation });

        UserPreferences.setUserPreference(
            WorkItemSearchProvider.PREVIEW_ORIENTATION_PREF_KEY,
            previewOrientation,
            UserPreferenceScope.Account);

        if (Helpers.Utils.compareStrings(previewOrientation, SearchConstants.PreviewPaneRightOrientation)) {
            this.splitter.horizontal();

            // Show element first before splitting so that WIT form can resize according to split size
            // BUG ID: 930428
            if (this.workItemPreviewer) {
                this.workItemPreviewer.showElement();
            }

            this.splitter.split();
            this.splitter.restorePreviewPaneSizePreferences(this.splitter.splitOrientation, true);
        }
        else if (Helpers.Utils.compareStrings(previewOrientation, SearchConstants.PreviewPaneBottomOrientation)) {
            this.splitter.vertical();
            if (this.workItemPreviewer) {
                this.workItemPreviewer.showElement();
            }

            this.splitter.split();
            this.splitter.restorePreviewPaneSizePreferences(this.splitter.splitOrientation, true);
        }
        else {
            this.splitter.noSplit();
            this.splitter.leftPane.show();
            if (this.workItemPreviewer) {
                this.workItemPreviewer.hideElement();
            }
        }

        if (this.messageBanner.isVisible()) {
            let mode: string = this.splitter.splitOrientation;
            this.messageBannerTopCorrection(mode);
        }
    }

    public messageBannerTopCorrection(mode: string): void {
        if (Utils_String.ignoreCaseComparer(mode, "horizontal") === 0) {
            this._$bannerContainer.addClass(WorkItemSearchProvider.MESSAGE_BANNER_TOP_CLASS);
        }
        else {
            this._$bannerContainer.removeClass(WorkItemSearchProvider.MESSAGE_BANNER_TOP_CLASS);
        }
    }

    private _updateResultsViewMode(): void {
        if (this.resultsView) {
            let resultsViewMode: string = this.storesHub.resultsViewStore.viewMode,
                previewOrientation: string = this.storesHub.previewOrientationStore.orientation;

            TelemetryHelper.TelemetryHelper.traceLog({
                "WorkItemSearchResultsGridViewMode": resultsViewMode,
                "WorkItemSearchResultsPreviewOrientation": previewOrientation
            });

            UserPreferences.setUserPreference(
                WorkItemSearchProvider.RESULTS_VIEW_PREF_KEY,
                resultsViewMode,
                UserPreferenceScope.Account);
        }
    }

    private _enhancePivotFilter(resultsView: string, previewOrientation: string): void {
        $(SearchConstants.HubPivotFiltersSelector).empty();
        if (this.isListViewEnabled) {
            this.resultsViewModePivotControl = Controls.create(Navigation.PivotFilter, $(SearchConstants.HubPivotFiltersSelector), {
                items: WorkItemSearchProvider._getListViewPivotFilterItems(resultsView),
                cssClass: SearchConstants.WorkItemGridViewPivotClass,
                text: Search_Resources.WorkItemSearchResultsViewPivotFilterLabel,
            });

            this.resultsViewModePivotControl.getElement().unbind("click").bind("click", Utils_Core.delegate(this, (e) => {
                if (State.SearchViewState.currentProvider.getId() === SearchConstants.WorkItemEntityTypeId) {
                    this.actionCreator.updateWorkItemSearchResultsViewMode(this.resultsViewModePivotControl.getSelectedItem().value);
                }
            }));
        }

        this.previewPaneOrientationPivotControl = Controls.create(Navigation.PivotFilter, $(SearchConstants.HubPivotFiltersSelector), {
            items: WorkItemSearchProvider._getPrivewOrientationPivotFilterItems(previewOrientation),
            cssClass: SearchConstants.PreviewOrientationPivotClass,
            text: Search_Resources.PreviewOrientationTitle,

        });

        this.previewPaneOrientationPivotControl.getElement().addClass("workitem-preview-orientation");
        this.previewPaneOrientationPivotControl.getElement().unbind("click").bind("click", Utils_Core.delegate(this, (e) => {
            if (State.SearchViewState.currentProvider.getId() === SearchConstants.WorkItemEntityTypeId) {
                // this._updatePreviewOrientation(this.previewPaneOrientationPivotControl.getSelectedItem().value, true);
                this.actionCreator.updatePreviewOrientationMode(this.previewPaneOrientationPivotControl.getSelectedItem().value);
            }
        }));
    }

    private static _getListViewPivotFilterItems(resultsView: string): Array<any> {
        var isDetailedViewSelected: boolean = Helpers.Utils.compareStrings(resultsView, SearchConstants.WorkItemDetailedResultsViewMode),
            isListViewSelected: boolean = Helpers.Utils.compareStrings(resultsView, SearchConstants.WorkItemListResultsViewMode);
        return [
            {
                text: Search_Resources.WorkItemDetailedResultsViewMode,
                value: "detailed",
                selected: isDetailedViewSelected,
                title: Search_Resources.WorkItemDetailedResultsViewMode
            },
            {
                text: Search_Resources.WorkItemListResultsViewMode,
                value: "list",
                selected: isListViewSelected,
                title: Search_Resources.WorkItemListResultsViewMode
            },
        ];
    }

    private static _getPrivewOrientationPivotFilterItems(previewOrientation: string): Array<any> {
        var isRightOrientationSelected: boolean = Helpers.Utils.compareStrings(previewOrientation, SearchConstants.PreviewPaneRightOrientation),
            isBottomOrientationSelected: boolean = Helpers.Utils.compareStrings(previewOrientation, SearchConstants.PreviewPaneBottomOrientation),
            isOrientationOff: boolean = Helpers.Utils.compareStrings(previewOrientation, SearchConstants.PreviewPaneOff);
        return [
            {
                text: Search_Resources.PreviewPaneRightOrientation,
                value: "right",
                selected: isRightOrientationSelected,
                title: Search_Resources.PreviewPaneRightOrientation
            },
            {
                text: Search_Resources.PreviewPaneBottomOrientation,
                value: "bottom",
                selected: isBottomOrientationSelected,
                title: Search_Resources.PreviewPaneBottomOrientation
            },
            {
                text: Search_Resources.PreviewPaneOff,
                value: "off",
                selected: isOrientationOff,
                title: Search_Resources.PreviewPaneOff
            },
        ];
    }
}
