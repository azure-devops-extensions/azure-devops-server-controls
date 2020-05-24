import { Action } from "VSS/Flux/Action";

import { GitStatus, GitRepositoryStats, GitLastChangeItem, GitCommitRef, GitPullRequest, ChangeListSearchCriteria } from "TFS/VersionControl/Contracts";
import { TreeItemExpandedPayload } from "VersionControl/Scenarios/Explorer/Bridges/ItemRetrievalBridge";
import { ExplorerCommandCreator } from "VersionControl/Scenarios/Explorer/Commands/ItemCommands";
import { HistoryItemsLoadedPayload, GitHistorySearchCriteria } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { GitCommitArtifactsMap } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { IHistoryGraph } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import { CriteriaChangedPayload, TfvcHistoryListPayload, TfvcHistoryLoadStartPayload } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces";
import { Notification } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { PathSearchItemIdentifier } from "VersionControl/Scenarios/Shared/Path/IPathSearchItemIdentifier";
import { PathSearchResult } from "VersionControl/Scenarios/Shared/Path/PathSearchResult";
import { GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import { LineAdornmentOptions } from "VersionControl/Scripts/FileViewerLineAdornment";
import { VersionControlChangeType, ItemModel, ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface CurrentRepositoryChangedPayload {
    isGit: boolean;
    rootNodeIconClass: string;
    rootPath: string;
    repositoryName: string;
    userLastVisitedVersionSpec: VersionSpec;
    defaultGitBranchName: string;
    deletedUserDefaultBranchMessage: string;
    branchNameReplacingDeleted: string;
    allowEditing: boolean;
    historyUrl: string;
    branchesUrl: string;
    pullRequestsUrl: string;
    repositoryContext: RepositoryContext;
    pageOptions: any;
}

export interface TabChangedPayload {
    tab: string;
    areFolderLatestChangesRequested?: boolean;
    compareOptions?: CompareOptions;
}

export interface CommitPayload {
    newRealVersionSpec: VersionSpec;
    comment: string;
    userName: string;
    newBranchVersionSpec?: GitBranchVersionSpec;
    newBranchVersionAllowEditing?: boolean;
    hasLinkedWorkitems: boolean;
    isCommentDefault: boolean;
    /**
     * The details of the Pull Request, if exists, of the committed branch (even if it's not a new branch)
     */
    existingPullRequest: GitPullRequest;
    /**
     * Error that happened after commit succeeded
     */
    postCommitError: Error;
}

export interface CommitSavedPayload extends CommitPayload {
    path?: string;
    changeType?: VersionControlChangeType;
    newPath?: string;
    isFolder: boolean;
    navigatePath: string;
    coercedTab?: string;
}

export interface GatedCheckinPayload {
    isGatedCheckin: boolean;

    affectedBuildDefinitionUris: string[];
    affectedBuildDefinitionNames: string[];
    shelvesetName: string;
    buildId: number;
    buildUri: string;
}

export interface FilesUploadedPayload extends CommitPayload {
    newPaths: string[];
}

export interface CommitDialogDismissedPayload {
    changeType: VersionControlChangeType;
}

export interface ItemInfo {
    item: ItemModel;
    readMeItem: ItemModel;
    areFolderLatestChangesRequested: boolean;
}

export interface EditingFileDiscardedPayload extends FilePreviewAvailabilityChangedPayload {
    path: string;
    coercedTab?: string;
    creatingItemPaths: string[];
    navigatePath: string;
    navigateVersionSpec?: VersionSpec;
    navigateVersionAllowEditing?: boolean;
    navigateItemInfo?: ItemInfo;
    uiSource: string;
}

export type HistorySearchCriteria = ChangeListSearchCriteria & CriteriaChangedPayload;

export interface ChangeItemOptions {
    createIfNew?: boolean;
    anchor?: string;
    line?: LineAdornmentOptions;
    isFullScreen?: boolean;
    historySearchCriteria?: HistorySearchCriteria;
}

export interface ItemChangedPayload extends FilePreviewAvailabilityChangedPayload {
    tab: string;
    /**
     * Whether the tab has been selected intentionally by user or it's a fallback.
     */
    isTabExplicit: boolean;
    path: string;
    versionSpec: VersionSpec;
    hasChangedVersion?: boolean;
    allowEditingVersion?: boolean;
    options?: ChangeItemOptions;
    compareOptions?: CompareOptions;
    itemInfo?: ItemInfo;
    notFoundError?: Error;
    uiSource: string;
}

export interface ItemRetrievedPayload {
    itemInfo: ItemInfo;
    allRetrievedItems?: ItemModel[];
    coercedTab?: string;
    /**
     * Possible not found error if the path doesn't exist on this version,
     * but that was mitigated by retrieving the parent or root item.
     */
    notFoundError?: Error;
}

export interface ItemRetrievalFailedPayload {
    notFoundError?: Error;
    resumableError?: Error;
    allRetrievedItems?: ItemModel[];
}

export interface FolderLatestChangesRetrievedPayload {
    changeLists?: ChangeList[];
    gitLastChanges?: GitLastChangeItem[];
    gitCommits?: GitCommitRef[];
    lastExploredTime?: Date;
    /** Url of each commit or changeset. Key is the full-commit or version */
    changeUrls: IDictionaryStringTo<string>;
}

export interface RemainderFolderLatestChangesRequestedPayload {
    triggerFullName: string;
}

export interface PathSearchSelectionChangedPayload {
    itemIdentifier: PathSearchItemIdentifier;
    newInputText?: string;
}

export interface LoseChangesAskedPayload {
    dirtyFileName: string;
    tentativeAction(): void;
}

export interface EditDisabledAlertedPayload {
    repositoryName: string;
}

export interface AddNewFileDialogPromptPayload {
    folderPath: string;
    childItems: ItemModel[];
    isLoadingChildItems: boolean;
    uiSource: string;
    isCreatingFolder: boolean;
}

export interface NewFileTargetFolderChangedPayload {
    newSubfolder: string;
    fileUsedAsFolder: string;
    childItems: ItemModel[];
    isLoadingChildItems: boolean;
}

export interface CompareOptions {
    mpath?: string;
    mversion?: string;
    opath?: string;
    oversion?: string;
}

export interface FilePreviewAvailabilityChangedPayload {
    isPreviewAvailable: boolean;
    isPreviewDefault: boolean;
}

export interface FileContentLoadedPayload {
    originalContent: string;
    isTooBigToEdit?: boolean;
}

export interface FileContentEditedPayload {
    newContent: string;
    isDirty: boolean;
}

export interface CommitPromptedPayload {
    path: string;
    newSubfolder?: string;
    changeType: VersionControlChangeType;
    existingFileList?: ItemModel[];
    isUploading?: boolean;
    initialDrop?: DataTransfer;
    uiSource: string;
    isCreatingFolder?: boolean;
}

export interface NewFileAddedPayload extends FilePreviewAvailabilityChangedPayload {
    newFileItem: ItemModel;
    allRetrievedItems: ItemModel[];
    newFolders: ItemModel[];
}

export interface EditFileStartedPayload extends FilePreviewAvailabilityChangedPayload {
    fileItem: ItemModel;
    uiSource: string;
}

export interface SetupExperiencePayload {
    hasBuildDefinitions: boolean;
    buildDefinitionIds: number[];
    canCreateBuildDefinitions: boolean;
}

/**
 * A container for the current instances of the actions that can be triggered in Explorer page.
 */
export class ActionsHub {
    public currentRepositoryChanged = new Action<CurrentRepositoryChangedPayload>();
    public itemRetrieved = new Action<ItemRetrievedPayload>();
    public folderLatestChangesRetrieved = new Action<FolderLatestChangesRetrievedPayload>();
    public remainderFolderLatestChangesRequested = new Action<RemainderFolderLatestChangesRequestedPayload>();
    public commitDetailsRetrieved = new Action<GitCommitRef[]>();
    public itemRetrievalFailed = new Action<ItemRetrievalFailedPayload>();
    public repositoryStatsLoaded = new Action<GitRepositoryStats>();
    public tabChanged = new Action<TabChangedPayload>();
    public itemChanged = new Action<ItemChangedPayload>();
    public branchSelectorToggled = new Action<boolean>();
    public extensionLoaded = new Action<ExplorerCommandCreator>();

    public newFileAsked = new Action<AddNewFileDialogPromptPayload>();
    public newFileTargetFolderChanged = new Action<NewFileTargetFolderChangedPayload>();
    public newFileAdded = new Action<NewFileAddedPayload>();
    public newFileDismissed = new Action<void>();
    public filesUploaded = new Action<FilesUploadedPayload>();
    public editDisabledAlerted = new Action<EditDisabledAlertedPayload>();
    public editDisabledDialogDismissed = new Action<void>();
    public editFileStarted = new Action<EditFileStartedPayload>();
    public initialContentRetrieved = new Action<string>();
    public commitPrompted = new Action<CommitPromptedPayload>();
    public commitStarted = new Action<void>();
    public commitSaved = new Action<CommitSavedPayload>();
    public commitGatedCheckin = new Action<GatedCheckinPayload>();
    public commitFailed = new Action<Error>();
    public commitDialogDismissed = new Action<CommitDialogDismissedPayload>();
    public editingFileDiscarded = new Action<EditingFileDiscardedPayload>();
    public diffInlineToggled = new Action<void>();
    public existingBranchesLoaded = new Action<string[]>();
    public loseChangesAsked = new Action<LoseChangesAskedPayload>();
    public loseChangesDialogDismissed = new Action<void>();

    public folderChildrenSelected = new Action<ItemModel[]>();
    public treeItemExpanding = new Action<string>();
    public treeItemExpanded = new Action<TreeItemExpandedPayload>();
    public treeItemCollapsed = new Action<string>();

    public pathEditingStarted = new Action<string>();
    public pathEdited = new Action<string>();
    public pathEditingCancelled = new Action<void>();
    public pathSearchSelectionChanged = new Action<PathSearchSelectionChangedPayload>();
    public inFolderPathSearchResultsLoaded = new Action<PathSearchResult>();
    public globalPathSearchResultsLoaded = new Action<PathSearchResult>();
    public pathSearchFailed = new Action<Error>();

    public fullScreenChanged = new Action<boolean>();
    public fileContentLoaded = new Action<FileContentLoadedPayload>();
    public fileContentEdited = new Action<FileContentEditedPayload>();
    public hasBuildDefinitionsLoaded = new Action<SetupExperiencePayload>();
    public hasReleaseDefinitionsLoaded = new Action<boolean>();
    public createReleaseDefinitionUrlFetched = new Action<string>();
    public buildStatusLoaded = new Action<GitStatus[]>();
    public notificationRaised = new Action<Notification>();
    public notificationDismissed = new Action<Notification>();

    public historyItemsLoaded = new Action<HistoryItemsLoadedPayload>();
    public historyArtifactsLoaded = new Action<GitCommitArtifactsMap>();
    public historyItemsLoadErrorRaised = new Action<Error>();
    public historyFullCommentLoaded = new Action<ChangeList>();
    public historyGraphMessageDismissed = new Action<string>();
    public historyItemsReloadStarted = new Action<GitHistorySearchCriteria>();
    public historyGraphRowSelected = new Action<IHistoryGraph>();
    public historyGraphRowUnSelected = new Action<IHistoryGraph>();
    public toggleFilterPanelVisibility = new Action<void>();

    public permissionsUpdated = new Action<GitRepositoryPermissionSet>();
    public settingsPermissionsUpdated = new Action<SettingsPermissions>();

    public tfvcHistoryItemsLoaded = new Action<TfvcHistoryListPayload>();
    public changeTypeHistoryItemsCollapsed = new Action<number>();
    public tfvcHistoryItemsLoadStarted = new Action<TfvcHistoryLoadStartPayload>();

    public tfvcHistoryFilterCriteriaChanged = new Action<CriteriaChangedPayload>();

    public compareChanged = new Action<CompareOptions>();
    public diffLinesLoaded = new Action<number[]>();
    public goToPreviousDiffRequested = new Action<void>();
    public goToNextDiffRequested = new Action<void>();
}
