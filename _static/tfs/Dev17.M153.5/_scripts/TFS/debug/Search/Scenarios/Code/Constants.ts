export namespace PivotTabActionIds {
    export const Contents: string = "contents";
    export const History: string = "history";
    export const Compare: string = "compare";
    export const Blame: string = "blame";
    export const Preview: string = "preview";
}

export namespace ActionIds {
    export const Download: string = "download";
    export const FullScreen: string = "fullScreen";
}

export namespace SortActionIds {
    export type sortOrderType = "asc" | "desc";
    export const FilePath: string = "path";
    export const FileName: string = "fileName";
    export const Relevance: string = "relevance";
    export const Ascending: sortOrderType = "asc";
    export const Descending: sortOrderType = "desc";
}

export namespace FilterKeys {
    export const ProjectFiltersKey: string = "ProjectFilters";
    export const RepositoryFiltersKey: string = "RepositoryFilters";
    export const BranchFiltersKey: string = "BranchFilters";
    export const PathFiltersKey: string = "PathFilters";
    export const CodeTypeFiltersKey: string = "CodeElementFilters";
    export const AccountFilterKey: string = "AccountFilters";
}

export namespace PreviewOrientationActionIds {
    export const Right: string = "right";
    export const Bottom: string = "bottom";
}

export namespace HitsNavigationActionIds {
    export const NextHitNavigation: string = "nextHitNavigation";
    export const PrevHitNavigation: string = "prevHitNavigation";
}

export namespace CompareViewActionIds {
    export const NextDiffNavigation: string = "nextDiffNavigation";
    export const PrevDiffNavigation: string = "prevDiffNavigation";
    export const ToggleInlineDiff: string = "toggleInlineDiff";
}

export namespace CustomerIntelligenceConstants {
    export const TTIScenarioName: string = "CodeSearchTTIScenario";
    export const TabSwitchScenarioName: string = "CodeSearchTabSwitchScenario";
    export const SubsequentSearchScenarioName: string = "CodeSearchSubsequentSearchScenario";
    export const RedirectedPreviewScenarioName: string = "CodeSearchPreviewRedirectedScenario";
    export const PreviewOnTabSwitchScenarioName: string = "CodeSearchPreviewOnTabSwitchScenario";
    export const QueryResultScenarioName: string = "CodeSearchQueryResultsScenario";
    export const EntityName: string = "Code";
    export const SearchStarted: string = "SearchStarted";
    export const ResultsLoaded: string = "ResultsLoaded";
    export const TabChanged: string = "TabChanged";
    export const FilterPaneVisibilityChanged: string = "FilterPaneVisibilityChanged";
    export const NextHitNavigated: string = "NextHitNavigated";
    export const PrevHitNavigated: string = "PrevHitNavigated";
    export const ItemChanged: string = "ItemChanged";
    export const SortOptionChanged: string = "SortOptionChanged";
    export const PreviewOrientationChanged: string = "PreviewOrientationChanged";
    export const ZeroData: string = "ZeroData";
    export const NotificationBanner: string = "NotificationBanner";
    export const SearchHelpFilterActivated: string = "SearchHelpFilterActivated";
    export const TenantQueryStarted: string = "TenantQueryStarted";
    export const SearchInNewTab: string = "SearchInNewTab";
    export const FetchMoreResultsStarted: string = "FetchMoreResultsStarted";
    export const SearchTextRemoved: string = "SearchTextRemoved";
    export const AccountLinkClicked: string = "AccountLinkClicked";
    export const AccountButtonClicked: string = "AccountButtonClicked";
    export const FeedbackLinkClicked: string = "FeedbackLinkClicked";
    export const FeedbackMailLinkClicked: string = "FeedbackMailLinkClicked";
    export const ContextualMenuItemClicked: string = "ContextualMenuItemClicked";
    export const FileDownloadStarted: string = "DownloadFileStarted";
    export const FullScreenToggled: string = "FullScreenToggled";
    export const FileNameClicked: string = "FileNameClicked";
    export const FilterResetClicked: string = "FilterResetClicked";
    export const LeftPaneFileNameClicked: string = "LeftPaneFileNameClicked";
    export const FiltersUpdated: string = "FiltersUpdated";
    export const LaunchPoint: string = "LaunchPoint";
    export const LearnMoreOnPartialCodeResultsClicked: string = "LearnMoreOnPartialCodeResultsClicked";
    export const OrgSearchNavigationFromCodeSearchPageSource: string = "tfs.Search.code";
}

export namespace IndexingErrorCodeConstants {
    export const AccountIsBeingIndexed: string = "AccountIsBeingIndexed";
    export const AccountIsBeingReindexed: string = "AccountIsBeingReindexed";
    export const AccountIsBeingOnboarded: string = "AccountIsBeingOnboarded";
    export const BranchesAreBeingIndexed: string = "BranchesAreBeingIndexed";
}

export namespace SearchErrorCodeConstants {
    export const PartialResultsDueToSearchRequestTimeout: string = "PartialResultsDueToSearchRequestTimeout";
}

export namespace FeatureFlags {
    export const MultiAccount: string = "WebAccess.Search.MultiAccount";
}

export namespace KeyCodes {
    export const F8_KeyCode: number = 119;
}

export namespace ErrorTypeKeys {
    export const GitFilePathsMaxCountExceededException: string = "GitFilePathsMaxCountExceededException";
}

export namespace ItemCommandKeys {
    export const browseFile: string = "browseFile";
    export const download: string = "download";
    export const copyPath: string = "copyPath";
    export const linkToFile: string = "linkToFile";
}

export const PathSeparator: string = "/";
export const GitRootPath: string = "/";
export const TfvcRootPath: string = "$/";
export const MaxHitsToHighlight: number = 100;
export const EntityTypeUrlParam: string = "code";
export const CodeSearchTakeResults: number = 50;
export const CodeSearchShowMoreTakeResults: number = 1000;

export const FeedbackMailToLinkFormat: string =
    "mailto:vstssearch@microsoft.com?Subject=Feedback on Azure DevOps Services Code Search [Reference ID: {0}]";
export const CodexFeedbackMailToLinkFormat: string =
    "https://developercommunity.visualstudio.com/content/problem/post.html?space=21&version=NONE&azActivityId={0}";
export const LearnMoreLink: string = "https://go.microsoft.com/fwlink/?linkid=859315";
export const VersionControlPermissionsBlogLink: string = "http://blogs.msdn.com/b/wlennon/archive/2015/09/21/what-are-my-version-control-permissions-on-visual-studio-online.aspx";
export const ContentHitKey: string = "content";
export const FileNameHitKey: string = "fileName";
export const HitHightedLineCssClass: string = "search-hit-highlighted-line";
export const SelectedHit: string = "search-selected-hit";
export const PartialResultsForCodeBlogLink: string = "http://blogs.msdn.microsoft.com/divyamalini/2018/04/30/partial-search-results-code-search/";