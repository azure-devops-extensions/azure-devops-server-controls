// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Code_Contracts = require("Search/Scripts/Contracts/TFS.Search.Code.Contracts");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import {FeatureAvailabilityFlags} from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import {FeatureAvailabilityService} from "VSS/FeatureAvailability/Services";
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import {queueModulePreload} from "VersionControl/Scripts/DeferredJobQueue";
import Search_CodeContentsViewer = require("Search/Scripts/Providers/Code/Viewer/TFS.Search.Controls.CodeContentsViewer");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_DiffViewer = require("Search/Scripts/Providers/Code/Viewer/TFS.Search.Controls.DiffViewer");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import {SEARCH_HISTORYTAB_GIT} from "VersionControl/Scripts/CustomerIntelligenceConstants";
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import {HistoryNavigationTab} from "VersionControl/Scenarios/Shared/HistoryNavigationTab";
import { ActionCreator} from "Search/Scripts/React/ActionCreator";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import * as _HistoryTabActionsHub from  "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryListColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { HistoryListColumnMapper } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";

import VSS = require("VSS/VSS");
import Q = require("q");

import domElem = Utils_UI.domElem;
import delegate = Utils_Core.delegate;

var logTrace: any = null;
var _previewLoadStartTime: any;
var traceArea: string = "webaccess.search";

export module SearchPreviewActionIds {
    export var Contents = "contents";
    export var History = "history";
    export var Compare = "compare";
    export var Search = "search";
}

export class TabbedSearchPreview extends Navigation.TabbedNavigationView {

    private static TAB_CONTENT_SELECTOR: string = ".search-tab-content";
    private static PIVOT_TABS_SELECTOR: string = ".search-tabs";
    private static TAB_CONTENT_CSS_CLASS: string = "search-tab-content";
    private static PIVOT_VIEW_TABS_CSS_CLASS: string = "enhance search-tabs";
    private static SEARCH_VIEWER_CONTAINER_CSS_CLASS: string = "search-viewer-container";
    private static PREVIEW_CONTENT_LOADING_CSS_SELECTOR: string = ".search-preview-contents-loading";

    private _commonPivotFilters: CommonPivotFilters;
    private _pivotView: Navigation.PivotView;
    private _selectedResult: Code_Contracts.CodeResult;
    private _selectedItem: VCLegacyContracts.ItemModel;
    private _isFirstPreviewOfNewSearch: boolean;
    public _repositoryContext: RepositoryContext;
    public _$searchTabs: JQuery;
    public _$searchViewerContainer: JQuery;
    private _isNewResultSelected: boolean;
    private _selectedResultItem: VCLegacyContracts.ItemModel;
    private _isFullScreenMode: boolean = false;
    private _wasFullScreenMode: boolean = false;
    private _isAnnotateMode: boolean = false;
    private _isStaleIndexingWarningMessageLogged: boolean = false;
    private _selectedIndex: number;
    private _totalSearchResults: number;
    private _actionCreator: ActionCreator;
    private _storesHub: StoresHub;

    // File offline settings
    private _filePreviewContentMode: Search_Constants.FilePreviewMode;
    private _offlineFileContent: VCLegacyContracts.FileContent;
    private _offlineFileContentUrl: string;
    private _canDownloadOffline: boolean;
    private _offlineFileDownloadUrl: string;
    private _hitAdornments: Array<any>;

    public initializeOptions(options?) {

        var tabs = {},
            tabOptions = {},
            tfsContext = Context.SearchContext.getTfsContext();

        tabs[SearchPreviewActionIds.Contents] = Search_CodeContentsViewer.CodeContentsViewer;
        tabs[SearchPreviewActionIds.History] = HistoryNavigationTab;
        tabs[SearchPreviewActionIds.Compare] = Search_DiffViewer.DiffViewer;
        tabs[SearchPreviewActionIds.Search] = Navigation.NavigationViewTab;

        const requiredColumns: HistoryListColumnMapper[] = [
            HistoryListColumns.CommitHashColumn,
            HistoryListColumns.MessageColumn,
            HistoryListColumns.AuthorColumn,
            HistoryListColumns.ChangeTypeColumn,
            HistoryListColumns.AuthoredDateColumn,
            HistoryListColumns.PullRequestColumn,
        ];

        tabOptions[SearchPreviewActionIds.History] = {
            tabName: SEARCH_HISTORYTAB_GIT,
            columns: requiredColumns,
            dataOptions: {
                fetchTags: true,
                fetchPullRequests: true,
                fetchGraph: false,
                fetchBuildStatuses: false,
            } as _HistoryTabActionsHub.GitHistoryDataOptions,
        };


        tabOptions[SearchPreviewActionIds.Contents] = {
            navigateSearchResults: options ? options.navigateSearchResults: null
        }

        super.initializeOptions($.extend({
            tabs: tabs,
            tabOptions: tabOptions,
            hubContentSelector: TabbedSearchPreview.TAB_CONTENT_SELECTOR,
            pivotTabsSelector: TabbedSearchPreview.PIVOT_TABS_SELECTOR,
        }, options));

    }

    public initialize() {
        this._$searchViewerContainer = $(domElem("div"));
        this._$searchTabs = $(domElem("div")).appendTo(this._$searchViewerContainer).addClass("views");
        this._pivotView = <Navigation.PivotView> Controls.BaseControl.createIn(Navigation.PivotView, this._$searchTabs, {
            items: [
                {
                    id: SearchPreviewActionIds.Contents,
                    text: Search_Resources.ContentsTabText,
                },
                {
                    id: SearchPreviewActionIds.History,
                    text: Search_Resources.HistoryTabText,
                },
                {
                    id: SearchPreviewActionIds.Compare,
                    text: Search_Resources.CompareTabText,
                },
            ],
            cssClass: TabbedSearchPreview.PIVOT_VIEW_TABS_CSS_CLASS,
        });

        this._commonPivotFilters = <CommonPivotFilters>Controls.BaseControl.createIn(CommonPivotFilters, this._$searchViewerContainer, {
            cssClass: "filters"
        });
        this._$searchViewerContainer.addClass(TabbedSearchPreview.SEARCH_VIEWER_CONTAINER_CSS_CLASS).appendTo(this._element);
        $(domElem("div")).addClass(TabbedSearchPreview.TAB_CONTENT_CSS_CLASS).appendTo(this._element);

        super.initialize();

        // start loading script files required for history tab in background asynchronously
        queueModulePreload("VersionControl/Scenarios/History/GitHistory/Components/Tabs/HistoryTab");
        queueModulePreload("VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator");
        queueModulePreload("VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub");
        queueModulePreload("VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub");

        this._actionCreator = this._options.actionCreator;
    }

    private isSupportedAction(action: string) {
        var value = (action === SearchPreviewActionIds.Contents || action === SearchPreviewActionIds.History || action === SearchPreviewActionIds.Compare);
        return value;
    }

    public setResultContext(repositoryContext: RepositoryContext,
        selectedResult: Code_Contracts.CodeResult,
        selectedIndex: number,
        totalSearchResults: number,
        state: any,
        isFirstPreviewOfNewSearch: boolean,
        urlAction: string,
        previewLoadStartTime: any,
        filePreviewMode: Search_Constants.FilePreviewMode,
        filePreviewData: any) {
        
        this._isNewResultSelected = true;
        this._repositoryContext = repositoryContext;
        this._selectedResult = selectedResult;
        this._isFirstPreviewOfNewSearch = isFirstPreviewOfNewSearch;
        this._selectedIndex = selectedIndex;
        this._totalSearchResults = totalSearchResults;
        _previewLoadStartTime = previewLoadStartTime;
        var previousAction = this.getCurrentAction();
        var newAction;

        this._filePreviewContentMode = filePreviewMode;
        if (filePreviewData) {
            this._offlineFileContent = filePreviewData.fileContent;
            this._hitAdornments = filePreviewData.hitAdornments;
            this._offlineFileContentUrl = filePreviewData.fileContentUrl;
            this._offlineFileDownloadUrl = filePreviewData.downloadUrl;
            this._canDownloadOffline = filePreviewData.canDownloadOffline;
        }
        
        // Handling case where action url is copy pasted to retain previously previewed tab on URL sharing.
        if (urlAction && this._selectedResult.vcType !== Base_Contracts.VersionControlType.Custom) {
            newAction = urlAction;
        }
        //Retention of selected Tab across results selection.
        else if (previousAction === undefined || previousAction === SearchPreviewActionIds.Search) {
            newAction = SearchPreviewActionIds.Contents;
        }
        else {
            // for custom version control type the action should always be "contents"
            newAction = this._selectedResult.vcType !== Base_Contracts.VersionControlType.Custom ? previousAction : SearchPreviewActionIds.Contents;
        }        

        var statePreview : string = Helpers.StateHelper.getPreviewStateFromState(state);

        //Adding preview flag to state so that preview doesnt remain blank on clicking history back/forward clicks. 
        if (statePreview === undefined) {
            state.preview = parseInt("1");
        }
        else {
            state.preview = (parseInt(state.preview) + 1) % 2;
        }

        Navigation_Services.getHistoryService().replaceHistoryPoint(newAction, state);
    }

    /*
    * Parse the state info and fetch any artificacts necessary to render the tab/view. Invoke the 'callback'
    * method with the new state info object when the state information has been successfully parsed.
    * </summary>
    * <param name="action" type="String">The action parameter (_a) in the url hash</param>
    * <param name="rawState" type="Object">The raw state info from the hash url for the new navigation</param>
    * <param name="callback" type="IResultCallback">
    *    Callback that should be called when the state was successfully parsed. The callback takes 2 parameters: the tab id (typically
    *    the action), and the parsed state info object.
    *
    *    callback(tabId, parsedStateInfo);
    */
    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        if (!this.isSupportedAction(action)) {
            return;
        }

        var state: any = {};
        this.setState(state);

        // Use local variables to insulate this method flow from updates to globals due to result selection change (ex.fast clicks)
        // Due to fast clicks on results, if global variables are used, this method would be operating on different states at different points of execution
        // Usage of globals was causing intermittent errors such as invalid commit id or stale file error, when result selection is fast
        var selectedResult: Code_Contracts.CodeResult = this._selectedResult;
        var repositoryContext: RepositoryContext = this._repositoryContext;
        var selectedItem: VCLegacyContracts.ItemModel = this._selectedItem;
        var selectedResultItem: VCLegacyContracts.ItemModel = this._selectedResultItem;
        var isNewResultSelected: boolean = this._isNewResultSelected;
        var isFirstPreviewOfNewSearch: boolean = this._isFirstPreviewOfNewSearch;
        var previewLoadStartTime: any = _previewLoadStartTime;
        var selectedIndex: number = this._selectedIndex;
        var totalSearchResults: number = this._totalSearchResults;

        // offline file settings
        var offlineFileContent = this._offlineFileContent;

        if ((!repositoryContext || repositoryContext === null) && this._filePreviewContentMode !== Search_Constants.FilePreviewMode.SourceDepot) {
            return;
        }
        
        this.setHubPivotVisibility(true);
        
        action = action || SearchPreviewActionIds.Contents;

        //There are two handlers listening on browser back button navigation. 
        //Contents tab and Contents -> search action. We need to supress the contents tab navigation handler 
        //since it contains stale filename in it's cache.
        if (!selectedResult || rawState.result.indexOf(selectedResult.path) === -1) {
            return;
        }

        TelemetryHelper.TelemetryHelper.traceLog(
            {
                "TabbedSearchPreviewNavigationOccurredAgainstAction": action
            });


        //creating the state for the tabs onNaviate call
        state.repositoryContext = repositoryContext;        
        state.path = selectedResult.path;
        state.project = selectedResult.project;
        state.repository = selectedResult.repository;
        state.version = selectedResult.branch;
        state.collection = selectedResult.collection;
        state.isFirstPreviewOfNewSearch = isFirstPreviewOfNewSearch;
        state.isNewResultSelected = isNewResultSelected;
        state.selectedIndex = selectedIndex;
        state.totalSearchResults = totalSearchResults;
        state.previewLoadStartTime = previewLoadStartTime;
        state.annotate = Utils_String.localeIgnoreCaseComparer(rawState.annotate, "true") === 0;
        state.resultItemMetadata = {
            contentId: selectedResult.contentId,
            vcType: selectedResult.vcType,
            changeId: selectedResult.changeId
        }

        // offline file settings
        state.filePreviewContentMode = this._filePreviewContentMode;
        state.offlineFileContent = this._offlineFileContent;
        state.hitAdornments = this._hitAdornments;
        state.offlineFileContentUrl = this._offlineFileContentUrl;
        state.offlineFileDownloadUrl = this._offlineFileDownloadUrl;
        state.canDownloadOffline = this._canDownloadOffline;

        // If file is navigated through prev/next and full screen mode was enabled- let it remain enabled
        if (Utils_String.localeIgnoreCaseComparer(rawState.fullScreen, "true") === 0 || (rawState.fullScreen === undefined && this._isFullScreenMode) ) {
            state.fullScreenMode = true;
        }
        else {
            state.fullScreenMode = false;
        }

        this.tracePreviewMode(state);
        if (rawState.historySearchCriteria) {
            state.historySearchCriteria = Utils_Core.parseMSJSON(rawState.historySearchCriteria, false);
        }
        
        var versionString: string;

        if (selectedResult.vcType === Base_Contracts.VersionControlType.Git) {
            versionString = (selectedResult.changeId !== undefined && selectedResult.changeId !== null)
                ? new VCSpecs.GitCommitVersionSpec(selectedResult.changeId).toVersionString()
                : selectedResult.branch;
        }
        else if (selectedResult.vcType === Base_Contracts.VersionControlType.Tfvc) {
            versionString = new VCSpecs.ChangesetVersionSpec(selectedResult.changeId).toVersionString();
        }
              
        // Ensure that we have a path
        if (!state.path) {
            state.path = repositoryContext === null ? selectedResult.path : repositoryContext.getRootPath();
        }

        // Fetch the item if a new result is selected
        if (isNewResultSelected) {
            if (this._filePreviewContentMode !== Search_Constants.FilePreviewMode.SourceDepot) {

                // Cook up selectedresultItem with result values to 
                // update fileViewer Preview 
                this._selectedResultItem = {
                    changeDate: null,
                    childItems: [],
                    commitId: {
                        full: selectedResult.changeId,
                        short: selectedResult.changeId.substr(0, 6)
                    },
                    objectId: {
                        full: selectedResult.contentId,
                        short: selectedResult.contentId.substr(0,6)
                    },
                    changeset: selectedResult.changeId,
                    contentMetadata: this._offlineFileContent.metadata,
                    gitObjectType: 3,
                    isFolder: false,
                    isSymLink: false,
                    serverItem: this._selectedResult.path.replace(/\\/g,"/"),
                    url: null,
                    version: (action === SearchPreviewActionIds.Contents) ? versionString : this._selectedResult.branch,
                    versionDescription: ""
                } as VCLegacyContracts.ItemModel;

                TelemetryHelper.TelemetryHelper.traceLog(
                    {
                        "PreviewingSourceItemType": "VersionControl"
                    });

                this.updateStateAndPreview(state, this._selectedResultItem, isNewResultSelected, action, callback, previewLoadStartTime);
            }
            else {
                this._selectedResultItem = {
                    changeDate: null,
                    childItems: [],
                    commitId: {
                        full: selectedResult.changeId || null,
                        short: selectedResult.changeId ? selectedResult.changeId.substr(0, 6) : null
                    },
                    objectId: {
                        full: selectedResult.contentId || null,
                        short: selectedResult.contentId ? selectedResult.contentId.substr(0, 6) : null
                    },
                    changeset: selectedResult.changeId || null,
                    contentMetadata: this._offlineFileContent.metadata,
                    isFolder: false,
                    isSymLink: false,
                    serverItem: this._selectedResult.path,
                    url: this._selectedResult.path,
                    version: this._selectedResult.branch,
                    versionDescription: ""
                } as VCLegacyContracts.ItemModel;

                state.canDownloadOffline = this._canDownloadOffline = true;

                TelemetryHelper.TelemetryHelper.traceLog(
                    {
                        "PreviewingSourceItemType": "SourceDepot"
                    });

            this.updateStateAndPreview(state, this._selectedResultItem, isNewResultSelected, action, callback, previewLoadStartTime)
            }
        }
        else {
            // Update version of cached item in case of action is changed but result is not.
            selectedResultItem.version = (action === SearchPreviewActionIds.Contents) ? versionString : this._selectedResult.branch;
            this.updateStateAndPreview(state, selectedResultItem, isNewResultSelected, action, callback, previewLoadStartTime);
        }

        // Bug 414869: After a switch is made between contents tab and any tab other than contents tab, if a selection change happens or a new search happens,
        // due to these flags being set to false highlighting issue happens due to the cache not being cleared.  
        // Hence setting these to false only when a selection change happens when we are in contents tab.
        if (action === SearchPreviewActionIds.Contents) {
            this._isNewResultSelected = false;
            this._isFirstPreviewOfNewSearch = false;
        }

        //Updating the screen settings.
        if (this._wasFullScreenMode !== state.fullScreenMode) {
            this._wasFullScreenMode = state.fullScreenMode;
        }
    }

    public getTabVisibility(tabId: any, currentTabId: string, rawState: any, parsedState: any): boolean {
        var view = this._pivotView.getView(tabId);
        return !view.disabled;
    }

    // Trace the preview mode i.e. if user changes to full screen mode or views annotate mode
    private tracePreviewMode(state: any): void {
        if (state.fullScreenMode && !this._isFullScreenMode) {
            TelemetryHelper.TelemetryHelper.traceLog({ "FullScreenModeAction": true });
        }
        this._isFullScreenMode = state.fullScreenMode;

        if (state.annotate && !this._isAnnotateMode) {
            TelemetryHelper.TelemetryHelper.traceLog({ "AnnotateModeAction": true });
        }    
        this._isAnnotateMode = state.annotate;
    }

    public showError(error: any) {
        throw new Error(error);
    }

    public showPreview(action: string, isNewResultSelected: boolean, previewLoadStartTime: any) {
        if (action == SearchPreviewActionIds.Contents) {
            // On new search, wait till the first result content is loaded, otherwise,
            // we endup showing previous preview
            this._bind(Search_Constants.SearchConstants.PreviewContentLoaded, (event: any, args: any) => {
                this._unbind(Search_Constants.SearchConstants.PreviewContentLoaded);
                // remove the loading tile before displaying the tab viewer
                this.removePreviewContentLoadingTile();
                this.showElement();
                Utils_Accessibility.announce("File preview loaded");
                TelemetryHelper.TelemetryHelper.traceLog(
                    {
                        "PreviewContentLoadedEventFired": true
                    });
            });
        }
        else if (isNewResultSelected) {
            // remove the loading tile before displaying the tab viewer
            this.removePreviewContentLoadingTile();
            this.showElement();
            Utils_Accessibility.announce("File preview loaded");
        }
    }

    public onNavigate(state: any) {
        /// <summary>Function invoked when a page/hash navigation has occurred</summary>
        /// <param name="state" type="Object">Hash object containing the hash-url parameters</param>
      
        this._commonPivotFilters.updateViewFilters(this, this._repositoryContext);
    }

    private updateStateAndPreview(
        state: any, 
        item: VCLegacyContracts.ItemModel,
        isNewResultSelected: boolean,
        action: string,
        callback: IResultCallback,
        previewLoadStartTime: any) {

        // Update the Pivot View of the Preview
        if (this._pivotView) {
            var isSourceDepotMode = state.filePreviewContentMode === Search_Constants.FilePreviewMode.SourceDepot;
            this._pivotView.setViewEnabled(SearchPreviewActionIds.History, !isSourceDepotMode);
            this._pivotView.setViewEnabled(SearchPreviewActionIds.Compare, !isSourceDepotMode);
            this._pivotView.updateItems(true);
        }

        // Update the global state
        this._selectedItem = state.item = item;
        callback(action, state);
        this.showPreview(action, isNewResultSelected, previewLoadStartTime);

        if (state.fullScreenMode !== this._wasFullScreenMode) {
            // Toggling full screen may require a redraw/layout of controls such as the virtualized Change Explorer grid and the
            // Monaco editor/diff that typically update on a window resize.  So, we trigger the window.resize event
            $(window).trigger("resize");
        }
    }

    /**
    * Removes loading tile from preview pane.
    */
    private removePreviewContentLoadingTile() {
        $(TabbedSearchPreview.PREVIEW_CONTENT_LOADING_CSS_SELECTOR).remove();
    }
}

export class CommonPivotFilters extends Controls.BaseControl {

    private _$historyFilters: JQuery;
    private _viewFiltersMenu: Menus.MenuBar;
    private _$toolBarContainer: JQuery;

    public initialize() {

        super.initialize();

        // Create place-holders for pivot filters
        this._$historyFilters = $(domElem("span", "vc-history-pivot-filters"))
            .css("display", "none")
            .appendTo(this._element);
        this._$toolBarContainer = $(domElem("span", "vc-view-pivot-filters toolbar")).appendTo(this._element);
    }

    public updateViewFilters(explorerView: Navigation.TabbedNavigationView, repository: RepositoryContext) {

        var currentState = explorerView.getState(),
            currentRawState = explorerView.getRawState(),
            currentAction = explorerView.getCurrentAction();

        explorerView.setFullScreenMode(currentState.fullScreenMode);

        this._updateViewPivotMenu(explorerView, currentAction, currentState, currentRawState, repository);

        this._$historyFilters.toggle(currentAction === VCControlsCommon.VersionControlActionIds.History);
    }

    private _updateViewPivotMenu(explorerView: Navigation.TabbedNavigationView, action: string, parsedState: any, rawState: any, repository: RepositoryContext) {
        var menuItems: any[] = [],
            linkStateParams: any,
            showFullScreenItem = false;

        if (((parsedState.item && !parsedState.item.isFolder)
            || parsedState.fullScreenMode
            || action === VCControlsCommon.VersionControlActionIds.Summary)
            && action !== VCControlsCommon.VersionControlActionIds.History) {
            showFullScreenItem = true;
        }

        // Full screen mode
        if (showFullScreenItem) {
            if (parsedState.fullScreenMode) {
                menuItems.push({
                    id: "exit-full-screen",
                    title: VCResources.ExitFullScreenMode,
                    icon: "bowtie-icon bowtie-view-full-screen-exit",
                    showText: false,
                    action: "navigate",
                    "arguments": { url: Navigation_Services.getHistoryService().getFragmentActionLink(action, $.extend({}, rawState, { fullScreen: "false" })) }
                });
            }
            else {
                menuItems.push({
                    id: "full-screen",
                    title: VCResources.EnterFullScreenModeTooltip,
                    icon: "bowtie-icon bowtie-view-full-screen",
                    showText: false,
                    action: "navigate",
                    "arguments": { url: Navigation_Services.getHistoryService().getFragmentActionLink(action, $.extend({}, rawState, { fullScreen: "true" })) }
                });
            }
        }

        if (menuItems.length > 0) {
            if (!this._viewFiltersMenu || this._viewFiltersMenu.isDisposed()) {
                this._viewFiltersMenu = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar,
                    this._$toolBarContainer,
                    {
                        cssClass: "vc-view-pivot-menu",
                        items: menuItems
                    }
                );
            }
            else {
                this._viewFiltersMenu.updateItems(menuItems);
            }
        }
        else if (this._viewFiltersMenu) {
            this._viewFiltersMenu.dispose();
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Search.Controls.FileExplorer", exports);
