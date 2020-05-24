export let VERSION_CONTROL_AREA = "VersionControl";

export let SHOW_LAZY_DIALOG = "ShowLazyDialog";

export let CREATE_PAT = "CreatePatClick";
export let CREATE_ALTERNATE_CREDS = "CreateAlternateCredentialsClick";
export let CREDENTIAL_HELPER_DOWNLOAD = "DownloadCredentialHelperClick";
export let GIT_FOR_WINDOWS_DOWNLOAD = "DownloadGitForWindowsClick";
export let VISUAL_STUDIO_DOWNLOAD = "DownloadVisualStudioClick";
export let MANAGE_SSH_KEYS_BUTTON = "ManageSshKeysButtonClick";
export let EDITOR_PREFERENCES_UPDATED = "EditorPreferencesUpdated";
export let FILEVIEWER_PREVIEW_ON_FEATURE = "FileViewerPreviewOn";
export let FILEVIEWER_PREVIEW_OFF_FEATURE = "FileViewerPreviewOff";
export let FILEVIEWER_EDIT_ON_FEATURE = "FileViewerEditOn";
export let FILEVIEWER_EDIT_CANCEL_FEATURE = "FileViewerEditCancel";
export let FILEVIEWER_EDIT_COMMIT_FEATURE = "FileViewerEditCommit";
export let FILEVIEWER_EDIT_DISCARD_FEATURE = "FileViewerEditDiscard";
export let FILEVIEWER_EDIT_DIFF_FEATURE = "FileViewerEditDiff";
export let FILEVIEWER_FILE_ADD_COMMIT_FEATURE = "FileViewerFileAddCommit";
export let FILEVIEWER_FILE_UPLOAD_COMMIT_FEATURE = "FileViewerFileUploadCommit";
export let FILEVIEWER_FILE_DELETE_COMMIT_FEATURE = "FileViewerFileDeleteCommit";
export let FILEVIEWER_FILE_RENAME_COMMIT_FEATURE = "FileViewerFileRenameCommit";
export let FILEVIEWER_PREVIEW_FILE_FEATURE = "FileViewerPreviewFile";

export let FILEVIEWER_IS_EDIT_MODE_PROPERTY = "IsEditMode";
export let FILEVIEWER_COMMIT_MESSAGE_CHANGED_PROPERTY = "CommitMessageChanged";
export let FILEVIEWER_FILE_EXTENSION_PROPERTY = "FileExtension";
export let FILEVIEWER_PREVIEW_FILE_DURATION_PROPERTY = "TimeInMSec";
export let FILEVIEWER_PREVIEW_FILE_SIZE_PROPERTY = "ItemSizeInBytes";

export let FILEVIEWER_ANNOTATE_CLICK = "FileViewAnnotateClick";
export let FILEVIEWER_DOWNLOAD_CLICK = "FileViewDownloadClick";

export let GIT_REPO_CLONE_POPUP_VIEW = "GitRepoClonePopupView";
export let EMPTY_REPO_OPEN_IN_VS = "EmptyRepoOpenInVSClick";
export let EMPTY_REPO_INIT_REPO_WITH_README = "EmptyRepoInitWithReadMeClick";
export let EMPTY_REPO_INIT_REPO = "EmptyRepoInit";

// Action Sources (i.e., optional source triggering the feature/action)
export let ACTIONSOURCE = "ActionSource";
export let ACTIONSOURCE_CONTEXT_MENU = "ContextMenu"
export let ACTIONSOURCE_ROW_ACTION = "RowAction"
export let ACTIONSOURCE_VIEW_CTA_BUTTON = "ViewCallToActionButton"
export let ACTIONSOURCE_VIEW_SEARCH_INPUT = "ViewSearchInput"

// New Branches View telemetry constants
export let BRANCHESVIEW_BRANCH_ADDFAVORITE = "NewBranchesView.Branch.AddFavorite";
export let BRANCHESVIEW_BRANCH_REMOVEFAVORITE = "NewBranchesView.Branch.RemoveFavorite";
export let BRANCHESVIEW_COMPARE = "NewBranchesView.Compare";
export let BRANCHESVIEW_SETCOMPARE = "NewBranchesView.SetCompare";
export let BRANCHESVIEW_DELETE = "NewBranchesView.Delete";
export let BRANCHESVIEW_EXPLORE = "NewBranchesView.Explorer";
export let BRANCHESVIEW_FIRSTFILTER = "NewBranchesView.FirstFilter";
export let BRANCHESVIEW_FOLDER_ADDFAVORITE = "NewBranchesView.Folder.AddFavorite";
export let BRANCHESVIEW_FOLDER_REMOVEFAVORITE = "NewBranchesView.Folder.RemoveFavorite";
export let BRANCHESVIEW_HISTORY = "NewBranchesView.History";
export let BRANCHESVIEW_LOCK = "NewBranchesView.Lock";
export let BRANCHESVIEW_NEW = "NewBranchesView.New";
export let BRANCHESVIEW_POLICIES = "NewBranchesView.Policies";
export let BRANCHESVIEW_PROPERTY_COMPAREISDEFAULT = "NewBranchesView.Compare.IsDefault";
export let BRANCHESVIEW_NEWPULLREQUEST = "NewBranchesView.NewPullRequest";
export let BRANCHESVIEW_RESTOREBRANCH = "NewBranchesView.RestoreBranch";
export let BRANCHESVIEW_SECURITY = "NewBranchesView.Security";
export let BRANCHESVIEW_UNLOCK = "NewBranchesView.UnLock";
export let BRANCHESVIEW_VIEWPULLREQUEST = "NewBranchesView.ViewPullRequest";
export let BRANCHESVIEW_VIEWLASTUPDATE = "NewBranchesView.ViewLastUpdate";

// GitVersionSelectorControl - Selected item properties.  The active Tab is recorded as ActionSource.
export let GITVERSIONSELECTOR_ITEMSELECTED = "GetVersionSelector.ItemSelected";
export let GITVERSIONSELECTOR_ITEMSELECTED_ISFILTERED = "IsFiltered";
export let GITVERSIONSELECTOR_ITEMSELECTED_TOTALCOUNT = "TotalCount";

// GitRepositorySelectorControl - Repositories Favorited/Unfavorited and Selected.  The active Tab is recorded as ActionSource.
export let GITREPOSITORYSELECTOR_REPO_FAVORITED = "GetRepositorySelector.RepositoryFavorited";
export let GITREPOSITORYSELECTOR_REPO_UNFAVORITED = "GetRepositorySelector.RepositoryUnFavorited";
export let GITREPOSITORYSELECTOR_REPO_SELECTED = "GetRepositorySelector.RepositorySelected";
// Additional properties
export let GITREPOSITORYSELECTOR_FAVORITE_REPOS_ENABLED = "FavoriteRepositoriesEnabled";
export let GITREPOSITORYSELECTOR_ALL_REPOS_COUNT = "AllRepositoriesCount";
export let GITREPOSITORYSELECTOR_FAVORITE_REPOS_COUNT = "FavoriteRepositoriesCount";

// GitRefService - Performance Scenarios for getting all Git refs, my branches, etc.
export let GITREFSERVICE_GETALLREFS = "GitRefService.GetAllRefs";
export let GITREFSERVICE_GETMYBRANCHES = "GitRefService.GetMyBranches";
export let GITREFSERVICE_TIME_FETCHED = "RefsFetched";
export let GITREFSERVICE_TIME_SORTED = "RefsSorted";
export let GITREFSERVICE_COUNT = "Count";
export let GITREFSERVICE_FILTER = "Filter";

export let EMPTY_VIEW_FEATURE = "Empty.View";

export let PULL_REQUEST_CREATE_SOURCEUI_PROPERTY = "SourceUI";
export let PULL_REQUEST_CREATE_SOURCEUI_SUGGESTION = "Suggestion";
export let PULL_REQUEST_DISMISS_SUGGESTION = "DismissSuggestion";
export let PULL_REQUEST_CREATE_SOURCEUI_TOOLBAR = "Toolbar";
export let PULL_REQUEST_CREATE_SOURCEVIEW_PROPERTY = "SourceView";
export let PULL_REQUEST_COMPLETE_MERGE = "CompleteMerge";
export let PULL_REQUEST_FILTER_DISCUSSION_FEATURE = "PullRequestFilterDiscussion";
export let PULL_REQUEST_SORT_ACTIVITY_FEATURE = "PullRequestSortActivity";
export let PULL_REQUEST_FILTER_ACTIVITY_FEATURE = "PullRequestFilterActivity";
export let PULL_REQUEST_FILTER_FILES_FEATURE = "PullRequestFilterActivity";
export let PULL_REQUEST_DESCRIPTION_ACTIVITY_FEATURE = "PullRequestDescriptionActivity";
export let PULL_REQUEST_QUERY_CRITERIA_FEATURE = "PullRequestQueryCriteria";
export let PULL_REQUEST_CREATE_FEATURE = "PullRequest.Create";
export let PULL_REQUEST_DETAILS_FEATURE = "PullRequest.Details";
export let PULL_REQUEST_REVIEW_FEATURE = "PullRequest.Review";
export let PULL_REQUEST_BRANCH_SELECTION_FEATURE = "PullRequest.BranchSelection";
export let PULL_REQUEST_VIEW_FEATURE = "PullRequest.View";
export let PULL_REQUEST_VIEW_LOAD_FILE_FEATURE = "PullRequest.View.LoadFile";
export let PULL_REQUEST_VIEW_LOAD_DISCUSSIONS_FEATURE = "PullRequest.View.LoadDiscussions";
export let PULL_REQUEST_OPEN_IN_CLIENT = "PullRequestOpenInClient";
export let PULL_REQUEST_LEARN_MORE_CLICKED = "PullRequestLearnMoreClicked";
export let PULL_REQUEST_VOTE_BUTTON_ACTION = "PullRequestVoteButtonAction";
export let PULL_REQUEST_ACTION_DROP_MENU_ACTION = "PullRequestActionDropMenuAction";
export let PULL_REQUEST_VIEW_LOAD_ATTACHMENTS_FEATURE = "PullRequest.View.LoadAttachments";
export let PULL_REQUEST_CREATE_ATTACHMENT = "PullRequest.CreateAttachment";
export let PULL_REQUEST_CREATE_ATTACHMENT_ERROR = "PullRequest.CreateAttachmentError";
export let PULL_REQUEST_UPDATE_VISIT_FEATURE = "PullRequest.UpdateLastVisit";
export let PULL_REQUEST_DISCUSSION_CHANGE_STATUS_FEATURE = "PullRequest.DiscussionChangeStatus";
export let PULL_REQUEST_REPLY_AND_RESOLVE_FEATURE = "PullRequest.ReplayAndResolve";
export let PULL_REQUEST_TOGGLE_COLLAPSE_DISCUSSION_FEATURE = "PullRequest.ToggleCollapseDiscussion";
export let PULL_REQUEST_LIKE_COMMENT_FEATURE = "PullRequest.LikeComment";
export let PULL_REQUEST_COMMENT_CONTEXT_FEATURE = "PullRequest.DiscussionCommentContext";
export let PULL_REQUEST_TEMPLATE_SELECTION_FEATURE = "PullRequest.TemplateSelection";
export let PULL_REQUEST_RETARGET_FEATURE = "PullRequest.Retarget";

export let PULL_REQUESTS_LIST_VIEW_FEATURE = "PullRequestsList.View";
export let PULL_REQUESTS_LIST_QUERY_FEATURE = "PullRequestsList.Query";
export let PULL_REQUESTS_LIST_QUERY_RESULTS_FEATURE = "PullRequestsList.QueryResults";
export let PULL_REQUESTS_LIST_LINK_CLICKED_FEATURE = "PullRequestsList.LinkClicked";
export let PULL_REQUESTS_LIST_CUSTOMIZE = "PullRequestsList.Customize";
export let PULL_REQUESTS_LIST_CUSTOMIZE_GETTINGSTARTED = "PullRequestsList.Customize.GettingStarted";

export let MY_PULL_REQUEST_VIEW_FEATURE = "MyPullRequest.View";
export let MY_PULL_REQUEST_LIST_TEAMS_FEATURE = "MyPullRequestList.Teams";
export let MY_PULL_REQUEST_LIST_EXPAND_FEATURE = "MyPullRequestList.ExpandGroup";

export let CHANGELIST_DETAILS_FEATURE = "ChangeList.Details";
export let TFS_CHANGELIST_CHANGESET_DETAILS_FEATURE = "TfsChangeList.ChangeSet.Details";
export let TFS_CHANGELIST_SHELVESET_DETAILS_FEATURE = "TfsChangeList.ShelveSet.Details";
export let CHANGELIST_DETAILS_VIEW_HISTORY_TAB_FEATURE = "ChangeList.Details.HistoryTab";
export let CHANGELIST_DETAILS_VIEW_COMPARE_TAB_FEATURE = "ChangeList.Details.CompareTab";
export let CHANGELIST_DETAILS_VIEW_CONTENTS_TAB_FEATURE = "ChangeList.Details.ContentsTab";
export let CHANGELIST_DETAILS_VIEW_CHANGES_SUMMARY_TAB_FEATURE = "ChangeList.Details.ChangesSummaryTab";
export let CHANGELIST_DETAILS_VIEW_COMMIT_DIFF_SUMMARY_TAB_FEATURE = "ChangeList.Details.CommitDiffSummaryTab";

export let CHANGELIST_DETAILS_DIFF_CHANGED = "ChangeList.Details.DiffChanged";

export let STATS_BADGE = "StatsBadge";
export let STATS_BADGE_CLICK = "StatsBadgeClick";
export let STATS_BADGE_NAME_PROPERTY = "BadgeName";

export enum PullRequestActionMenuOption {
    Share = 1,
    Abandon = 2,
    SaveComments = 3,
    CherryPick = 4,
    Legacy = 5,
    Revert = 6,
    Follow = 7,
    Unfollow = 8,
    RestartMerge = 9,
    LiveUpdate = 10,
    ViewMergeCommit = 11,
}

export enum PullRequestVoteActionSource {
    defaultButton = 0,
    dropdown = 1
}

export let CREATE_BRANCH_MENU_EXECUTED = "CreateBranchMenuExecuted";
export let CREATE_BRANCH_MENU_CREATED = "CreateBranchMenuCreated";
export let CREATE_BRANCH_WIT_LINK_FAILED = "CreateBranchWITLinkFailed";

export let CREATE_REPOSITORY_DIALOG_CREATE_REPOSITORY = "CreateRepositoryDialog.CreateRepository";

export let ADMIN_VIEW = "AdminView";
export let ADMIN_VIEW_TREE_TFVC_PATH = "AdminView.Tree.TfvcPath";
export let ADMIN_VIEW_TREE_GIT_REPOSITORY = "AdminView.Tree.GitRepository";
export let ADMIN_VIEW_TREE_GIT_BRANCH = "AdminView.Tree.GitBranch";
export let ADMIN_NEW_REPO_CLICK = "AdminNewRepoClick";
export let ADMIN_NEW_GIT_REPO = "AdminNewGitRepo";
export let ADMIN_NEW_TFVC_REPO = "AdminNewTfvcRepo";
export let ADMIN_REPOSITORY_OPTION = "AdminRepoOption";

export let VIEW_PR_FROM_ARTIFACT_ACTION = "ViewPRFromArtifactAction";
export let CREATE_PR_FROM_ARTIFACT_ACTION = "CreatePRFromArtifactAction";
export let VIEW_PR_FROM_ARTIFACT = "ViewPRFromArtifact";
export let VIEW_BRANCH_FROM_ARTIFACT = "ViewBranchFromArtifact";
export let VIEW_COMMIT_FROM_ARTIFACT = "ViewCommitFromArtifact";
export let RELATED_WORK_ITEMS_DELETE = "RelatedWorkItemsControlDelete";
export let RELATED_WORK_ITEMS_DELETE_ALL_CREATE = "RelatedWorkItemsControlDeleteAllCreate";
export let RELATED_WORK_ITEMS_DELETE_ALL_DETAILS = "RelatedWorkItemsControlDeleteAllDetails";
export let RELATED_WORK_ITEMS_ADD = "RelatedWorkItemsControlAdd";

export let VIEW_BRANCH_FROM_COMMIT = "ViewBranchFromCommitDetails";
export let VIEW_PR_FROM_COMMIT = "ViewPRFromCommitDetails";

export let REPOSITORYSELECTOR_NEW_REPO_CLICK = "RepositorySelectorNewRepoClick";

export let CHANGELISTSUMMARYHEADER_DIFF_PULLUP_OPENED = "ChangeListSummaryHeaderDiffPopUpOpened";

export let SOURCEEDITING_ADD_FILES = "SourceEditingAddFiles";
export let SOURCEEDITING_EDIT = "SourceEditingEdit";
export let SOURCEEDITING_RENAME = "SourceEditingRename";
export let SOURCEEDITING_DELETE = "SourceEditingDelete";
export let SOURCEEDITING_UPLOAD_LIMIT = "SourceEditingUploadLimit";

export let SOURCEEXPLORERTREE_SHOW_MY_FAVS = "SourceExplorerTreeShowMyFavorites";
export let SOURCEEXPLORERTREE_SHOW_TEAM_FAVS = "SourceExplorerTreeShowTeamFavorites";
export let SOURCEEXPLORERTREE_CLICK_MY_FAVS = "SourceExplorerTreeClickMyFavorites";
export let SOURCEEXPLORERTREE_CLICK_TEAM_FAVS = "SourceExplorerTreeClickTeamFavorites";
export let SOURCEEXPLORERTREE_ADD_TO_MY_FAVS = "SourceExplorerTreeAddToMyFavorites";
export let SOURCEEXPLORERTREE_REMOVE_FROM_MY_FAVS = "SourceExplorerTreeRemoveFromMyFavorites";
export let SOURCEEXPLORERTREE_ADD_TO_TEAM_FAVS = "SourceExplorerTreeAddToTeamFavorites";
export let SOURCEEXPLORERTREE_REMOVE_FROM_TEAM_FAVS = "SourceExplorerTreeRemoveFromTeamFavorites";
export let SOURCEEXPLORERTREE_DOWNNLOAD_AS_ZIP = "SourceExplorerTreeDownloadAsZip";
export let SOURCEEXPLORERTREE_DOWNNLOAD = "SourceExplorerTreeDownload";
export let SOURCEEXPLORERTREE_VIEW_CONTENT = "SourceExplorerTreeViewContent";
export let SOURCEEXPLORERTREE_VIEW_HISTORY = "SourceExplorerTreeViewHistory";

export let SOURCEEXPLORERGRID_DOWNNLOAD_AS_ZIP = "SourceExplorerGridDownloadAsZip";
export let SOURCEEXPLORERGRID_DOWNNLOAD = "SourceExplorerGridDownload";
export let SOURCEEXPLORERGRID_VIEW_CONTENT = "SourceExplorerGridViewContent";
export let SOURCEEXPLORERGRID_VIEW_HISTORY = "SourceExplorerGridViewHistory";

export let SOURCEEXPLORER_SECURITY = "SourceExplorerSecurity";

export let SOURCEEXPLORERVIEW_PATH_EDIT_START = "SourceExplorerViewPathEditStart";
export let SOURCEEXPLORERVIEW_PATHCONTROL_PATH_CHANGE = "SourceExplorerViewPathChange";
export let PATHCHANGESOURCE_SOURCE_EXPLORER_TREE = "SourceExplorerTree";

export let HISTORY_PATH_EDIT_START = "HistoryViewPathEditStart";
export let HISTORY_PATHCONTROL_PATH_CHANGE = "HistoryViewPathChange";

export let CHANGELISTNAVIGATOR_CHANGEEXPLORER_EMAIL = "ChangeListNavigatorChangeExplorerEmail";
export let CHANGELISTNAVIGATOR_CHANGEEXPLORER_DISPLAY_MODE_FLAT = "ChangeListNavigatorChangeExplorerDisplayModeFlat";
export let CHANGELISTNAVIGATOR_CHANGEEXPLORER_DISPLAY_MODE_BY_FOLDER = "ChangeListNavigatorChangeExplorerDisplayModeByFolder";
export let CHANGELISTNAVIGATOR_CHANGEEXPLORER_DISPLAY_MODE_FULL = "ChangeListNavigatorChangeExplorerDisplayModeFull";
export let CHANGELISTNAVIGATOR_CHANGEEXPLORER_DOWNLOAD = "ChangeListNavigatorChangeExplorerDownload";

export let CHANGELISTSUMMARY_FILES_SIDE_BY_SIDE_DIFF = "ChangeListSummayFilesSideBySideDiff";
export let CHANGELISTSUMMARY_FILES_INLINE_DIFF = "ChangeListSummayFilesInlineDiff";
export let CHANGELISTSUMMARY_FILES_EXPAND_ALL = "ChangeListSummayFilesExpandAll";
export let CHANGELISTSUMMARY_FILES_COLLAPSE_ALL = "ChangeListSummayFilesCollapseAll";

export let DIFFVIEWER_FILES_SIDE_BY_SIDE_DIFF = "DiffViewerFilesSideBySideDiff";
export let DIFFVIEWER_FILES_INLINE_DIFF = "DiffViewerFilesInlineDiff";
export let DIFFVIEWER_ANNOTATE = "DiffViewerAnnotate";
export let DIFFVIEWER_DOWNLOAD = "DiffViewerDownload";

export let CHERRYPICK = "CherryPick";
export let REVERT = "Revert";

export let COMMENT_FILTER = "CommentFilter";
export let TREE_FILTER = "TreeFilter";
export let ITERATION_SELECTION = "IterationSelect";
export let IMPORTDIALOG_OPENED = "ImportDialogOpened"
export let IMPORTDIALOG_IMPORT_CLICKED = "ImportDialogImportClicked"
export let IMPORTSTATUS_IMPORT_COMPLETED = "ImportStatusImportCompleted"
export let IMPORTSTATUS_IMPORT_FAILED = "ImportStatusImportFailed"
export let IMPORTSTATUS_UNEXPECTED_STATE = "ImportStatusUnexpectedStatus"
export let IMPORTREQUEST_FAILED = "ImportRequestFailed"
export let IMPORTREQUEST_SUCCEED = "ImportRequestSucceed"
export let IMPORTREQUEST_FAILED_SERVICE_ENDPOINT_CREATION = "ImportRequestFailedServiceEndpointCreation"
export let IMPORTREQUEST_FAILED_REPOSITORY_CREATION = "ImportRequestFailedRepositoryCreation"
export let IMPORTREQUEST_FAILED_VALIDATION = "ImportRequestFailedValidation"

export let SEARCH_HISTORYTAB_GIT = "Git.Search.HistoryTab";
export let FILES_HISTORYTAB_GIT = "Git.Files.HistoryTab";

export let HISTORYLIST_SHOWHIDE_RENAME_HISTORY = "HistoryListShowHideRenameHistory";
export let HISTORYLIST_SHOW_MORE_HISTORY = "HistoryListShowMoreHistory";
export let CHANGELINK_OPENED = "ChangeLinkOpened";
export let CHANGELINK_SHOWHIDE_COMPLETE_MESSAGE = "ChangeLinkShowHideCompleteMessage";
export let NEW_GIT_HISTORY_VIEW = "NewGitHistoryView";

export let BRANCH_UPDATES_LIST_ITEM_EXPANDED = "BranchUpdatesListItemExpanded";
export let BRANCH_UPDATES_LIST_SHOW_MORE = "BranchUpdatesListShowMore";
export let BRANCH_UPDATES_LIST_SHOW_MORE_PERF = "BranchUpdatesListShowMorePerf";
//Perf Scenarios for History
export let HISTORYLIST_SHOWRENAME_PERF = "HistoryList.ShowRenameHistory";
export let HISTORYLIST_SHOWMORE_PERF = "HistoryList.ShowMoreHistory";
export let HISTORYLIST_COMMITS_SEARCH_VIEW = "CommitsSearchViewPerformance";

// Telemetry for Tags Page
export let TAGS_PAGE_VIEW = "TagsPageView";

// Telemetry for Pushes Page
export let PUSHES_PAGE_VIEW = "PushesPageView";

// Telemetry for Create Tags
export let CREATETAGS_DIALOG_OPENED = "CreateTags.DialogOpened";
export let CREATETAGS_CREATION_SUCCEEDED = "CreateTags.CreationSucceeded";

// Telemetry for signalR
export let PULL_REQUEST_SIGNALR_BANNER_SHOWN = "PullRequest.SignalR.BannerShown";