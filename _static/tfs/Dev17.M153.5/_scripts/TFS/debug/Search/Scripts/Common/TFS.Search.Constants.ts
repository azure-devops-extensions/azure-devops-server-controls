// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

export class SearchConstants {

    // URL params
    public static ActionTextParameterNameInUrl: string = "_a";
    public static CurrentActionParameterName: string = "action";

    public static FilterValueStart = "{";
    public static FilterValueEnd = "}";

    public static SearchFiltersParameterName: string = "filters";
    public static SearchTextParameterName: string = "text";
    public static SelectedResultParameterName: string = "result";
    public static PreviewStateName: string = "preview";
    public static SortOptionsParameterName: string = "sortOptions";

    public static AccountFilters: string = "AccountFilters";
    public static CodeTypeFilters: string = "CodeElementFilters";
    public static ProjectFilters: string = "ProjectFilters";
    public static ProjectFilterNew: string = "Project";
    public static RepoFilters: string = "RepositoryFilters";
    public static BranchFilters: string = "BranchFilters";
    public static PathFilters: string = "PathFilters";
    public static WikiFilters: string = "WikiFilters";
    public static WikiFacet: string = "Wiki";

    // Telemetry
    public static SearchLaunchPointParameterName: string = "lp";

    // Version Control Types
    public static CustomVersionControl: string = "custom";
    public static GitVersionControl: string = "Git";
    public static TfvcVersionControl: string = "Tfvc";

    // Controllers
    public static CodeHubGitController: string = "git";
    public static CodeHubTfvcController: string = "versioncontrol";
    public static SearchControllerName = "search";
    public static WikiSearchControllerName = "wikisearch";
    public static WikiSearchAction = "_" + SearchConstants.WikiSearchControllerName;
    public static SearchAction: string = "_" + SearchConstants.SearchControllerName;

    // Provider/entity
    public static CodeEntityTypeId: string = "code";
    public static ProjectEntityTypeId: string = "repositories";
    public static WorkItemEntityTypeId: string = "work item";
    public static WorkItemEntityTypeIdV2: string = "work items";
    public static ProviderIdParameterName: string = "type";
    public static WikiEntityTypeId: string = "wiki";

    // File viewer tab actions
    public static ContentsActionName: string = "contents";
    public static HistoryActionName: string = "history";
    public static CompareActionName: string = "compare";

    // Project result types
    public static Repository: string = "Repository";
    public static Project: string = "Project";
    public static DescriptionHighlightFieldName: string = "content";

    // Search page actions
    public static NullActionName: string = "nullAction";
    public static SearchActionName: string = "search";
    public static ReSearchActionName: string = "research";
    public static ScopeFiltersActionName: string = "scopeFilters";
    public static SortActionName: string = "sort";

    // Events
    public static PreviewContentLoaded: string = "PreviewContentLoaded";
    public static ShowMoreResultsEvent: string = "CODE_SEARCH_FETCH_RESULTS_EVENT";

    // DOM constants
    public static CodeGridCssClass: string = "search-view-results-code-grid";
    public static WorkItemGridCssClass: string = "search-view-results-workitem-grid";
    public static PreviewOrientationAreaCssSelector: string = ".preview-orientation";
    public static SearchResultsViewModePivotCssSelector: string = ".search-results-view-selector";

    public static LandingPageViewModeCssClass: string = "landing-page-view-mode";
    public static ResultsGridViewModeCssClass: string = "results-grid-view-mode";
    public static ResultsGridWithPreviewViewModeCssClass: string = "results-grid-with-preview-view-mode";
    public static IntermediatePageViewModeCssClass: string = "intermediate-view-mode";

    public static SearchResultsPaneContentsCssSelector: string = ".search-results-contents";
    public static SearchViewAreaCssSelector: string = ".search-view-content-area";
    public static TruncateLargeTextCssClass: string = "truncate-large-text";

    public static PreviewPaneHorizontalSplitterSelector: string = ".results-grid-with-preview-view-mode .horizontal.splitter > .handleBar.search-view-content-handle-bar";
    public static PreviewPaneHorizontalSplitRightPaneSelector: string = ".results-grid-with-preview-view-mode .horizontal.splitter > .rightPane.search-view-preview-pane";
    public static PreviewPaneHorizontalSplitLeftPaneSelector: string = ".results-grid-with-preview-view-mode .horizontal.splitter > .leftPane.search-view-results-pane";

    public static PreviewPaneVerticalSplitterSelector: string = ".results-grid-with-preview-view-mode .vertical.splitter > .handleBar.search-view-content-handle-bar";
    public static PreviewPaneVerticalSplitRightPaneSelector: string = ".results-grid-with-preview-view-mode .vertical.splitter > .rightPane.search-view-preview-pane";
    public static PreviewPaneVerticalSplitLeftPaneSelector: string = ".results-grid-with-preview-view-mode .vertical.splitter > .leftPane.search-view-results-pane";

    public static HubPivotFiltersSelector: string = ".hub-pivot .filters";
    public static PreviewOrientationPivotClass: string = "preview-orientation";
    public static WorkItemGridViewPivotClass: string = "search-results-view-selector";

    public static SearchViewInformationAreaContainerCssSelector: string = ".search-view-information-area-container";
    public static SearchViewInformationAreaCssSelector: string = ".search-view-information-area";

    // PreviewPaneOrientation
    public static PreviewPaneRightOrientation: string = "Right";
    public static PreviewPaneBottomOrientation: string = "Bottom";
    public static PreviewPaneOff: string = "Off";

    // Work Item Results View Mode
    public static WorkItemDetailedResultsViewMode: string = "Detailed";
    public static WorkItemListResultsViewMode: string = "List";

    // Skip and take values for results
    public static DefaultSkipResults: number = 0;
    public static DefaultTakeResults: number = 50;
    public static MaxResults: number = 1000;
    public static WorkItemSearchTakeResults: number = 1000;
    public static CodeSearchClientSortLimit: number = 1000;
    public static WorkItemSearchResultsToRender: number = 100;

    public static ResultsCountNotAvailable: number = -1;
    public static HitCountNotAvailable: number = -1;

    public static MaxHitsToHighlight: number = 100;
    public static PreviewPaneMinWidth: number = 250; // pixels

    // Error Codes
    // TODO: [bsarkar] Remove AccountIsBeingIndexed in favour of AccountIsBeingReindexed in S113
    public static AccountIsBeingIndexed: string = "AccountIsBeingIndexed";
    public static AccountIsBeingReindexed: string = "AccountIsBeingReindexed";
    public static AccountIsBeingOnboarded: string = "AccountIsBeingOnboarded";
    public static IndexingNotStartedErrorCode: string = "IndexingNotStarted";
    public static PrefixWildcardQueryNotSupported: string = "PrefixWildcardQueryNotSupported";
    public static BranchesAreBeingIndexed: string = "BranchesAreBeingIndexed";
    public static WorkItemsNotAccessible: string = "WorkItemsNotAccessible";
    public static EmptyQueryNotSupported: string = "EmptyQueryNotSupported";
    public static OnlyWildcardQueryNotSupported: string = "OnlyWildcardQueryNotSupported";
    public static ZeroResultsWithWildcard: string = "ZeroResultsWithWildcard";
    public static ZeroResultsWithFilter: string = "ZeroResultsWithFilter";
    public static ZeroResultsWithWildcardAndFilter: string = "ZeroResultsWithWildcardAndFilter";
    public static ZeroResultsWithNoWildcardNoFilter: string = "ZeroResultsWithNoWildcardNoFilter";    

    // Key Codes
    public static F8_KeyCode: number = 119;
    public static F9_KeyCode: number = 120;

    // Hits CSS classes
    public static HitHightedLineCssClass: string = "search-hit-highlighted-line";
    public static SelectedHit: string = "search-selected-hit";

    // Default user preferred orientation
    public static defaultUserPreferredOrientation: string = "defaultOrientation";

    // Field name
    public static FileNameField: string = "fileName";
    public static ContentField: string = "content";

    /* Misc */

    // Reference - http://msdn.microsoft.com/en-us/library/aa980550.aspx
    public static TfsProjectNameSeparator: string = "*";

    public static SouceExplorerViewTraceSourceName: string = "SourceExplorerView";
    public static PathScopeInputTextBoxTraceSourceName: string = "PathScopeInputTextBox";
    public static CODE_SEARCH_SORT_PREF_KEY: string = "vss-search-platform/SortOption/Code";

    // Learn about entities Urls
    public static CodeLearnMoreLink: string = "https://go.microsoft.com/fwlink/?linkid=859315";
    public static WorkItemLearnMoreLink: string = "https://go.microsoft.com/fwlink/?linkid=859316";

    // Feedback link
    public static WikiSearchLetUsKnowLink: string = "https://go.microsoft.com/fwlink/?linkid=862601";
    public static Feedback_Link_Content_Format: string =
    "mailto:vstssearch@microsoft.com?Subject=Feedback on Azure DevOps Services {0} Search [Reference ID: {1}]";

    // Permissions blog link
    public static VersionControlPermissionsBlogLink: string = "http://blogs.msdn.com/b/wlennon/archive/2015/09/21/what-are-my-version-control-permissions-on-visual-studio-online.aspx";
}

export enum ViewMode {
    LandingPage,
    ResultsGrid,
    ResultsGridWithPreview,
    IntermediateViewMode
}

export enum FilePreviewMode {
    Default,
    PreFetchFileContent,
    SourceDepot
}