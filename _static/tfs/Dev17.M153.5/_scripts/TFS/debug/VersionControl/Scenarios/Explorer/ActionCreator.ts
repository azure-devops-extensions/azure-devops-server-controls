import * as Q from "q";
import * as React from "react";
import { format, ignoreCaseComparer } from "VSS/Utils/String";
import { getErrorMessage } from "VSS/VSS";

import { ChangeListSearchCriteria } from "TFS/VersionControl/Contracts";
import { ActionsHub, ChangeItemOptions, CompareOptions, HistorySearchCriteria } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { EditingBridge, NewCommitDescriptor } from "VersionControl/Scenarios/Explorer/Bridges/EditingBridge";
import { ItemExtraDataBridge, coerceTabOnItem } from "VersionControl/Scenarios/Explorer/Bridges/ItemExtraDataBridge";
import { ItemRetrievalBridge, ItemRetrievalInvokers, getVersionFriendlyName, isItemReadyForDisplay } from "VersionControl/Scenarios/Explorer/Bridges/ItemRetrievalBridge";
import { SearchPathBridge } from "VersionControl/Scenarios/Explorer/Bridges/SearchPathBridge";
import { ExplorerCommandCreator } from "VersionControl/Scenarios/Explorer/Commands/ItemCommands";
import { EditingDialogsSource } from "VersionControl/Scenarios/Explorer/Sources/EditingDialogsSource";
import { PageSource } from "VersionControl/Scenarios/Explorer/Sources/PageSource";
import { RepositorySource } from "VersionControl/Scenarios/Explorer/Sources/RepositorySource";
import { StatusesSource } from "VersionControl/Scenarios/Explorer/Sources/StatusesSource";
import { TelemetryWriter } from "VersionControl/Scenarios/Explorer/Sources/TelemetryWriter";
import { NotificationSpecialType } from "VersionControl/Scenarios/Explorer/Stores/NotificationStore";
import { AggregateState } from "VersionControl/Scenarios/Explorer/Stores/StoresHub";
import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { GitHistorySearchCriteria, GitHistoryDataOptions } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { HistorySourcesHub } from "VersionControl/Scenarios/History/GitHistory/Sources/HistorySourcesHub";
import { TfvcHistoryBridge, TfvcHistoryInvokers } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcHistoryBridge";
import { ChangesetsFilterSearchCriteria } from "VersionControl/Scenarios/History/TfvcHistory/Components/ChangesetsFilter";
import { TfvcHistoryListSource } from "VersionControl/Scenarios/History/TfvcHistory/Sources/TfvcHistoryListSource";
import { ChangeSetsListItem } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces";
import { CommittingSource } from "VersionControl/Scenarios/Shared/Committing/CommittingSource";
import { Notification, NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { BuildPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/BuildPermissionsSource";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { FocusManager } from "VersionControl/Scenarios/Shared/Sources/FocusManager";
import { LazyPathsSearchSource } from "VersionControl/Scenarios/Shared/Path/LazyPathsSearchSource";
import { PathSearchItemIdentifier } from "VersionControl/Scenarios/Shared/Path/IPathSearchItemIdentifier";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { LineAdornmentOptions } from "VersionControl/Scripts/FileViewerLineAdornment";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getFullRefNameFromBranch } from "VersionControl/Scripts/GitRefUtility";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { VersionSpec, GitBranchVersionSpec, GitCommitVersionSpec, LatestVersionSpec, ShelvesetVersionSpec, TipVersionSpec, IGitRefVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { normalizePath } from "VersionControl/Scripts/VersionControlPath";
import { SettingsPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

export { NewCommitDescriptor };

export interface Sources {
    repository: RepositorySource;
    committing?: CommittingSource;
    page?: PageSource;
    statuses?: StatusesSource;
    search?: LazyPathsSearchSource;
    dialogs?: EditingDialogsSource;
    historyCommits?: HistoryCommitsSource;
    permissions?: GitPermissionsSource;
    settingsPermissions?: SettingsPermissionsSource;
    tfvcHistory?: TfvcHistoryListSource;
    buildPermissions?: BuildPermissionsSource;
}

interface Bridges {
    itemRetrieval: ItemRetrievalBridge;
    itemExtraData: ItemExtraDataBridge;
    editing: EditingBridge;
    searchPath: SearchPathBridge;
    gitHistory: HistoryTabActionCreator;
    tfvcHistory: TfvcHistoryBridge;
}

/**
 * The entry point to trigger actions in the Explorer page.
 */
export class ActionCreator {
    public readonly focusManager: FocusManager;

    private bridges: Bridges;
    private mapToSpecialActionOnDismissNotification: IDictionaryStringTo<(notification: Notification) => void>;
    private initializingPromise: IPromise<undefined>;

    constructor(
        private actionsHub: ActionsHub,
        private sources: Sources,
        private getAggregateState: () => AggregateState,
        private telemetryWriter?: TelemetryWriter,
    ) {
        const itemRetrievalInvokers: ItemRetrievalInvokers = {
            itemRetrieved: this.handleRetrievedItems,
            treeItemExpanded: payload => actionsHub.treeItemExpanded.invoke(payload),
            treeItemExpanding: folderPath => actionsHub.treeItemExpanding.invoke(folderPath),
        };

        const itemRetrieval = new ItemRetrievalBridge(itemRetrievalInvokers, sources.repository, getAggregateState);

        // TODO v-panu Extract common interface for actions? Better extract logic from HistoryTabActionCreator
        const historyActionsHub = {
            ...actionsHub,
            historyItemsLoadStarted: undefined,
            historyArtifactsLoadStarted: undefined,
            errorFlushed: undefined,
            historyItemsCleared: undefined,
        };

        const historySourcesHub: HistorySourcesHub = {
            historyCommitsSource: sources.historyCommits,
            permissionsSource: sources.permissions,
        };

        const skipInitialUpdatePermissions = true;
        const gitHistory = new HistoryTabActionCreator(
            historyActionsHub,
            historySourcesHub,
            this.getAggregateState,
            this.isItemValidToReportHistoryError,
            undefined,
            skipInitialUpdatePermissions);

        const tfvcHistoryInvokers: TfvcHistoryInvokers = {
            historyItemsLoadStarted: load => this.actionsHub.tfvcHistoryItemsLoadStarted.invoke(load),
            historyItemsLoaded: items => this.actionsHub.tfvcHistoryItemsLoaded.invoke(items),
            historyItemsLoadFailed: errorPayload => this.actionsHub.historyItemsLoadErrorRaised.invoke(errorPayload.error),
            historyItemCollapsed: changesetId => this.actionsHub.changeTypeHistoryItemsCollapsed.invoke(changesetId),
            searchCriteriaChanged: filterCriteria => this.actionsHub.tfvcHistoryFilterCriteriaChanged.invoke(filterCriteria),
        };

        const tfvcHistory = new TfvcHistoryBridge(tfvcHistoryInvokers, this.getAggregateState, sources.tfvcHistory);
        const itemExtraData = new ItemExtraDataBridge(actionsHub, sources.repository, itemRetrieval.getItem, getAggregateState, this.fetchHistoryIfNeeded);

        this.bridges = {
            itemRetrieval,
            itemExtraData,
            editing: new EditingBridge(
                actionsHub,
                sources.repository,
                sources.committing,
                sources.page,
                itemExtraData.getItemAndFetchExtraData,
                itemRetrieval.getItem,
                getAggregateState),
            searchPath: new SearchPathBridge(actionsHub, sources.search, getAggregateState),
            gitHistory,
            tfvcHistory,
        };

        itemRetrieval.setAddNewFileFunction(this.bridges.editing.addNewFile);

        this.initializingPromise = this.sources.repository.loadContributedRenderers()
            .then(() => this.initializingPromise = undefined);

        this.mapToSpecialActionOnDismissNotification = {
            [NotificationSpecialType.createPullRequestSuggestion]: notification =>
                this.sources.repository.dismissCreatePullRequestSuggestion(notification.specialContent),
        };

        this.focusManager = new FocusManager();
    }

    public getHistoryTabActionCreator(): HistoryTabActionCreator {
        return this.bridges.gitHistory;
    }

    public loadExtension(commandCreator: ExplorerCommandCreator): void {
        this.actionsHub.extensionLoaded.invoke(commandCreator);
    }

    public changeRepository = (): void => {
        if (!this.sources || !this.sources.repository || !this.sources.repository.getRepositoryContext()) {
            return;
        }

        const isGit = this.sources.repository.isGit();
        let historyUrl: string;
        let branchesUrl: string;
        let pullRequestsUrl: string;
        if (isGit) {
            historyUrl = this.sources.repository.getHistoryUrl();
            branchesUrl = this.sources.repository.getBranchesUrl();
            pullRequestsUrl = this.sources.repository.getPullRequestsUrl();
        }

        let deletedUserDefaultBranchMessage: string;
        let branchNameReplacingDeleted: string;
        if (isGit && this.sources.repository.deletedUserDefaultBranchName) {
            // userLastVisitedBranch comes from ViewModel.defaultGitBranchName which already contains the
            // repo default branch when the user branch has been deleted.
            // Probably we should rename it as userDefaultBranchName across all usages.
            branchNameReplacingDeleted = this.sources.repository.userLastVisitedBranch;
            deletedUserDefaultBranchMessage = format(
                VCResources.UserDefaultBranchDeletedErrorMessage_WithoutVersionInUrl,
                this.sources.repository.deletedUserDefaultBranchName,
                this.sources.repository.userLastVisitedBranch);
        }

        this.actionsHub.currentRepositoryChanged.invoke({
            isGit,
            rootNodeIconClass: this.sources.repository.getRepositoryContext().getRepositoryClass(),
            repositoryName: this.sources.repository.getRepositoryName(),
            rootPath: this.sources.repository.getRepositoryContext().getRootPath(),
            userLastVisitedVersionSpec: isGit && this.sources.repository.userLastVisitedBranch && new GitBranchVersionSpec(this.sources.repository.userLastVisitedBranch),
            defaultGitBranchName: this.sources.repository.getDefaultGitBranchName(),
            deletedUserDefaultBranchMessage,
            branchNameReplacingDeleted,
            allowEditing: this.sources.repository.allowEditingFeatures(),
            historyUrl,
            branchesUrl,
            pullRequestsUrl,
            repositoryContext: this.sources.repository.getRepositoryContext(),
            pageOptions: this.sources.page.getOptions(),
        });

        this.sources.repository.getStats().then(
            stats => this.actionsHub.repositoryStatsLoaded.invoke(stats));

        if (isGit) {
            this.sources.repository.getPullRequestSuggestion().then(
                suggestion => suggestion && this.actionsHub.notificationRaised.invoke({
                    type: NotificationType.info,
                    specialType: NotificationSpecialType.createPullRequestSuggestion,
                    specialContent: suggestion,
                    isDismissable: true,
                }));
        }
    }

    public goRoot = (uiSource: string): void => {
        return this.changePath(this.sources.repository.getRepositoryContext().getRootPath(), undefined, uiSource);
    }

    public goToDefaultBranch = (uiSource: string): void => {
        const { versionState: { defaultGitBranchName } } = this.getAggregateState();
        return this.changeVersion(new GitBranchVersionSpec(defaultGitBranchName), uiSource);
    }

    public goLatestChangeset = (uiSource: string): void => {
        return this.changePath(this.getAggregateState().path, "T", uiSource);
    }

    /**
     * Change the version to the actual commit referenced by the current branch or tag version.
     */
    public goToRealCommit = (uiSource: string): void => {
        const commit = this.getAggregateState().versionState.realVersionSpec as GitCommitVersionSpec;
        if (commit && commit.commitId) {
            this.changeVersion(commit, uiSource);
        }
    }

    public changeVersionFromSelector = (versionSpec: VersionSpec): void =>
        this.changeVersion(versionSpec, "version-selector");

    public changeVersion = (versionSpec: VersionSpec, uiSource: string): void => {
        return this.changePath(this.getAggregateState().path, versionSpec.toVersionString(), uiSource);
    }

    public changePath = (path: string, version: string, uiSource: string): void => {
        const aggregateState = this.getAggregateState();
        version = version || aggregateState.version;

        path = normalizePath(path, aggregateState.isGit, aggregateState.fileContentState.rootPath);
        if (aggregateState.path === path && version === aggregateState.version) {
            // When this is called from PathExplorer but path didn't really change, we cancel editing
            // like the user expects after pressing Enter key or Go button.
            if (aggregateState.pathState.isEditing) {
                this.actionsHub.pathEditingCancelled.invoke(null);
            }

            return;
        }

        this.changeItem(
            undefined,
            path,
            uiSource,
            version);
    }

    public changeTab = (action: string, compareOptions?: CompareOptions): void => {
        const { tab, path, versionSpec, pivotTabsState: { defaultTab } } = this.getAggregateState();
        action = action || defaultTab;
        if (tab === action) {
            return;
        }

        const { areFolderLatestChangesRequested } = this.bridges.itemExtraData.getItemAndFetchExtraData(action, path, versionSpec);

        this.actionsHub.tabChanged.invoke({
            tab: action,
            areFolderLatestChangesRequested,
            compareOptions,
        });
    }

    public changeItem = (
        action: string,
        path: string,
        uiSource?: string,
        version?: string,
        options?: ChangeItemOptions,
        compareOptions: CompareOptions = {},
        loseChanges = false,
    ): void => {
        const callMeAgain = () => this.changeItem(action, path, uiSource, version, options, compareOptions, true);
        if (!loseChanges && this.checkChangesToLose(callMeAgain)) {
            return;
        }

        const { initializingPromise } = this;
        if (initializingPromise) {
            initializingPromise.then(callMeAgain);
            return;
        }

        const aggregateState = this.getAggregateState();
        const isTabExplicit = Boolean(action);
        action = this.normalizeAction(action, options);

        const { isGit, fileContentState: { rootPath } } = aggregateState;
        path = normalizePath(path, isGit, rootPath);

        let versionSpec: VersionSpec;
        if (version && !this.isDeletedUserDefaultBranch(version)) {
            versionSpec = VersionSpec.parse(version);
        } else {
            versionSpec = this.getFallbackVersion(compareOptions, isGit);
            version = versionSpec.toVersionString();
        }

        if (options) {
            const isFullScreen = Boolean(options.isFullScreen);
            if (aggregateState.pivotTabsState.isFullScreen !== isFullScreen) {
                this.sources.page.setFullScreen(isFullScreen);
            }
        }

        const hasChangedVersion = version !== aggregateState.version;
        if (version && hasChangedVersion) {
            this.fetchPermissions(versionSpec);
            this.fetchStatuses(aggregateState.projectId, version);
        }

        if (aggregateState.fileContentState.isEditing) {
            this.bridges.editing.discardEditingFile(uiSource, path, hasChangedVersion && version, options);
            return;
        }

        const { item, readMeItem, tab, areFolderLatestChangesRequested, isKnownNonexistent } =
            this.bridges.itemExtraData.getItemAndFetchExtraData(action, path, versionSpec, {
                createIfNew: options && options.createIfNew,
                hasChangedPath: path !== aggregateState.path,
                hasChangedVersion,
                historySearchCriteria: options && options.historySearchCriteria,
            });

        this.actionsHub.itemChanged.invoke({
            tab,
            isTabExplicit,
            path,
            versionSpec,
            hasChangedVersion,
            allowEditingVersion: this.sources.committing.allowEditingVersion(version, this.sources.repository.getRepositoryContext()),
            options,
            compareOptions,
            itemInfo: item && {
                item,
                readMeItem,
                areFolderLatestChangesRequested,
            },
            notFoundError: isKnownNonexistent ? createPathNotFoundError(path, versionSpec) : undefined,
            uiSource,
            ...this.bridges.editing.getFilePreviewAvailability(path, item),
        });
    }

    private normalizeAction(action: string, options: ChangeItemOptions): string {
        action = action ? action.toLowerCase() : this.getAggregateState().tab;

        // If anchor is present, we assume Preview mode, it won't work otherwise.
        if (options && options.anchor && action === VersionControlActionIds.Contents) {
            action = VersionControlActionIds.Preview;
        }

        return action;
    }

    private isDeletedUserDefaultBranch(version: string): boolean {
        if (!this.sources.repository.deletedUserDefaultBranchName) {
            return false;
        }

        const { branchName } = VersionSpec.parse(version) as GitBranchVersionSpec;
        return ignoreCaseComparer(branchName, this.sources.repository.deletedUserDefaultBranchName) === 0;
    }

    private getFallbackVersion(compareOptions: CompareOptions, isGit: boolean): VersionSpec {
        if (compareOptions && compareOptions.mversion) {
            const compareVersionSpec = VersionSpec.parse(compareOptions.mversion);

            if (isVersionSpecSupported(compareVersionSpec)) {
                return compareVersionSpec;
            } else {
                return new LatestVersionSpec();
            }
        } else if (!isGit) {
            return new LatestVersionSpec();
        } else if (isGit && this.sources.repository.userLastVisitedBranch) {
            return new GitBranchVersionSpec(this.sources.repository.userLastVisitedBranch);
        }
    }

    public retrieveAllLastChanges = (triggerFullName: string): void => {
        this.bridges.itemExtraData.retrieveAllLastChanges(triggerFullName);
    }

    public promptCreateBranch = (suggestedName?: string): void => {
        this.sources.dialogs.showCreateBranch(this.getAggregateState().versionSpec as IGitRefVersionSpec, suggestedName)
            .then(result =>
                !result.cancelled &&
                this.changeVersion(new GitBranchVersionSpec(result.selectedFriendlyName), "create-branch-dialog"));
    }

    public promptAddNewFile = (folderPath: string, uiSource: string, loseChanges = false): void => {
        if (!loseChanges && this.checkChangesToLose(() => this.promptAddNewFile(folderPath, uiSource, true))) {
            return;
        }

        this.checkEditEnabled(folderPath, () => this.bridges.editing.promptAddNewFile(folderPath, uiSource));
    }

    public changeAddNewTargetFolder = (newSubfolder: string): void => {
        this.bridges.editing.changeAddNewTargetFolder(newSubfolder);
    }

    public dismissAddNewFileDialog = (): void => {
        this.actionsHub.newFileDismissed.invoke(undefined);
    }

    public addNewFile = (newItemPath: string): void => {
        this.checkEditEnabled(newItemPath, () => this.bridges.editing.addNewFile(newItemPath, this.getAggregateState().version));
    }

    public editFile = (path: string, uiSource: string, loseChanges = false): void => {
        if (!loseChanges && this.checkChangesToLose(() => this.editFile(path, uiSource, true))) {
            return;
        }

        this.checkEditEnabled(path, () => this.bridges.editing.editFile(path, uiSource));
    }

    public dismissEditDisabledDialog = () => {
        this.actionsHub.editDisabledDialogDismissed.invoke(undefined);
    }

    public promptSaveEditingFile = (uiSource: string) =>
        this.bridges.editing.promptSaveEditingFile(uiSource);

    public saveEditingFile = (descriptor: NewCommitDescriptor): void => {
        this.checkEditEnabled(this.getAggregateState().path, () => this.bridges.editing.saveEditingFile(descriptor));
    }

    public promptAddNewFolder = (parentPath: string, uiSource: string, loseChanges = false): void => {
        if (!loseChanges && this.checkChangesToLose(() => this.promptAddNewFolder(parentPath, uiSource, true))) {
            return;
        }

        this.checkEditEnabled(parentPath, () => this.bridges.editing.promptAddNewFolder(parentPath, uiSource));
    }

    public addNewFolder = (parentPath: string, descriptor: NewCommitDescriptor): void => {
        this.checkEditEnabled(parentPath, () => this.bridges.editing.addNewFolder(parentPath, descriptor));
    }

    public promptUploadFilesFromFolderEmptySpace = (initialDrop: DataTransfer): void => {
        const path = this.getAggregateState().path;
        this.checkEditEnabled(path, () => this.promptUploadFiles(path, "drop-in-grid-empty-space", initialDrop));
    }

    public promptUploadFilesFromFolderInGrid = (folderPath: string, initialDrop: DataTransfer): void => {
        this.checkEditEnabled(folderPath, () => this.promptUploadFiles(folderPath, "drop-in-grid-row", initialDrop));
    }

    public promptUploadFiles = (folderPath: string, uiSource: string, initialDrop?: DataTransfer, loseChanges = false): void => {
        if (!loseChanges && this.checkChangesToLose(() => this.promptUploadFiles(folderPath, uiSource, initialDrop, true))) {
            return;
        }

        this.checkEditEnabled(folderPath, () => this.bridges.editing.promptUploadFiles(folderPath, initialDrop, uiSource));
    }

    public uploadFiles = (
        folderPath: string,
        descriptor: NewCommitDescriptor,
        existingFileList: ItemModel[],
    ): void => {
        this.checkEditEnabled(folderPath, () => this.bridges.editing.uploadFiles(folderPath, descriptor, existingFileList));
    }

    public discardEditingFile = (uiSource: string, loseChanges = false): void => {

        // If the user explicitly cancels editing a new file with no changes, then don't prompt to discard changes.
        if (!loseChanges &&
            !(this.getAggregateState().fileContentState.isNewFile && !this.getAggregateState().pathState.isDirty) &&
            this.checkChangesToLose(() => this.discardEditingFile(uiSource, true))) {
            return;
        }

        this.bridges.editing.discardEditingFile(uiSource);
    }

    public toggleEditingDiffInline = (): void => {
        this.actionsHub.diffInlineToggled.invoke(undefined);
    }

    public loadDiffLines = (diffLines: number[]): void => {
        this.actionsHub.diffLinesLoaded.invoke(diffLines);
    }

    public goToPreviousDiff = (): void => {
        this.actionsHub.goToPreviousDiffRequested.invoke(undefined);
    }

    public goToNextDiff = (): void => {
        this.actionsHub.goToNextDiffRequested.invoke(undefined);
    }

    public promptRenameItem = (path: string, uiSource: string, loseChanges = false): void => {
        if (!loseChanges && this.checkChangesToLose(() => this.promptRenameItem(path, uiSource, true))) {
            return;
        }

        this.checkEditEnabled(path, () => this.bridges.editing.promptRenameItem(path, uiSource));
    }

    public renameItem = (path: string, descriptor: NewCommitDescriptor): void => {
        this.checkEditEnabled(path, () => this.bridges.editing.renameItem(path, descriptor));
    }

    public promptDeleteItem = (path: string, uiSource: string, loseChanges = false): void => {
        if (!loseChanges && this.checkChangesToLose(() => this.promptDeleteItem(path, uiSource, true))) {
            return;
        }

        this.checkEditEnabled(path, () => this.bridges.editing.promptDeleteItem(path, uiSource));
    }

    public deleteItem = (path: string, descriptor: NewCommitDescriptor): void => {
        this.checkEditEnabled(path, () => this.bridges.editing.deleteItem(path, descriptor));
    }

    public displayInfoNotification = (message: string, specialType: string): void => {
        this.actionsHub.notificationRaised.invoke({
            message,
            type: NotificationType.info,
            specialType,
            isDismissable: true,
        });
    }

    public dismissNotification = (notification: Notification): void => {
        const specialActionOnDismiss = this.mapToSpecialActionOnDismissNotification[notification.specialType];
        if (specialActionOnDismiss) {
            specialActionOnDismiss(notification);
        }

        this.actionsHub.notificationDismissed.invoke(notification);
    }

    public selectFolderChildren = (selectedItems: ItemModel[]): void => {
        if (!shallowEqualArrays(selectedItems, this.getAggregateState().folderContentState.selectedItems)) {
            this.actionsHub.folderChildrenSelected.invoke(selectedItems);
        }
    }

    public expandTreeItem = (folderPath: string): void => {
        this.bridges.itemRetrieval.expandTreeItem(folderPath);
    }

    public collapseTreeItem = (path: string): void => {
        this.actionsHub.treeItemCollapsed.invoke(path);
    }

    public startPathEditing = (): void => {
        this.bridges.searchPath.startPathEditing();
    }

    public editPathText = (text: string): void => {
        this.bridges.searchPath.editPathText(text);
    }

    public cancelPathEditing = (): void => {
        this.actionsHub.pathEditingCancelled.invoke(null);
    }

    public selectPathSearchItem = (itemIdentifier: PathSearchItemIdentifier, newInputText?: string): void => {
        this.actionsHub.pathSearchSelectionChanged.invoke({
            itemIdentifier,
            newInputText,
        });
    }

    public showSetupBuildDialog = (): void => {
        this.telemetryWriter.publish("setupBuildClicked");
        this.sources.statuses.openCreateBuildDefinitionWindow();
    }

    public navigateToReleaseHub = (releaseHubUrl: string): void => {
        this.telemetryWriter.publish("setupReleaseClicked");
        let nextTab = window.open();
        nextTab.opener = null;
        nextTab.location.href = releaseHubUrl;
    }

    public toggleFullScreen = (isFullScreen: boolean): void => {
        if (this.getAggregateState().pivotTabsState.isFullScreen === isFullScreen) {
            return;
        }

        this.sources.page.setFullScreen(isFullScreen);
        this.actionsHub.fullScreenChanged.invoke(isFullScreen);
    }

    public changeOriginalContent = (originalContent: string, isTooBigToEdit: boolean): void => {
        this.actionsHub.fileContentLoaded.invoke({
            originalContent,
            isTooBigToEdit
        });
    }

    public editFileContent = (newContent: string): void => {
        const isDirty = newContent !== this.getAggregateState().fileContentState.originalContent;
        this.actionsHub.fileContentEdited.invoke({ newContent, isDirty });
    }

    public downloadFile = (path: string, uiSource: string): void => {
        this.sources.page.download(this.sources.repository.getFileContentUrl(path, this.getAggregateState().version));
        this.telemetryWriter.publish("downloadFile", { uiSource });
    }

    public downloadZippedFolder = (path: string, uiSource: string): void => {
        this.sources.page.download(this.sources.repository.getZippedFolderUrl(path, this.getAggregateState().version));
        this.telemetryWriter.publish("downloadZippedFolder", { uiSource });
    }

    public openBranchSelector = () => {
        this.toggleBranchSelector(true);
    }

    public closeBranchSelector = () => {
        this.toggleBranchSelector(false);
    }

    public toggleBranchSelector = (isOpen: boolean) => {
        if (this.getAggregateState().versionState.isBranchSelectorOpened !== isOpen) {
            this.actionsHub.branchSelectorToggled.invoke(isOpen);
        }
    }

    public goToLatestChangeCommit = (event: React.MouseEvent<HTMLLinkElement>) =>
        this.goToCommit(event, "latest-change-commit");

    public goToBlameCommit = (event: React.MouseEvent<HTMLLinkElement>) =>
        this.goToCommit(event, "blame-commit");

    private goToCommit(event: React.MouseEvent<HTMLLinkElement>, uiSource: string) {
        this.telemetryWriter.publish("commitClicked", { uiSource });
        this.sources.page.navigateToHistory(event, this.sources.repository.isGit(), this.sources.repository.isCollectionLevel());
    }

    public changeVersionToBlame = (version: string, line: number) => {
        this.changeItem(
            undefined,
            this.getAggregateState().path,
            "blame-view-before",
            version,
            { line: { startLineNumber: line } as LineAdornmentOptions });
    }

    public dismissLoseChangesDialog = (): void => {
        this.actionsHub.loseChangesDialogDismissed.invoke(undefined);
    }

    public dismissCommitDialog = (): void => {
        this.actionsHub.commitDialogDismissed.invoke({
            changeType: this.getAggregateState().commitPromptState.changeType,
        });
    }

    public toggleHistoryGraph = (isVisibleGraph: boolean): void => {
        this.actionsHub.historyItemsReloadStarted.invoke(undefined);
        this.bridges.gitHistory.setGraphColumnDisplay(
            isVisibleGraph,
            this.getHistorySearchCriteria(),
            this.getHistoryDataOptions(),
            false,
            true);
    }

    public toggleFilterPanelVisibility = (): void => {
        this.bridges.gitHistory.toggleFilterPanelVisibility();
    }

    public dismissHistoryGraphInfo = (): void => {
        const { historyListState } = this.getAggregateState();
        this.bridges.gitHistory.dismissGraphMessage(historyListState.gitGraphMessage.key);
    }

    public filterHistory = (criteria: GitHistorySearchCriteria): void => {
        this.actionsHub.historyItemsReloadStarted.invoke(criteria);

        const { path, version } = this.getAggregateState();
        this.fetchGitHistoryIfNeeded(path, version, criteria);
    }

    public expandTfvcHistoryItem = (item: ChangeSetsListItem): void => {
        this.bridges.tfvcHistory.expandChangeSetHistory(item);
    }

    public collapseTfvcHistoryItem = (item: ChangeSetsListItem): void => {
        this.bridges.tfvcHistory.collapseChangeSetsHistory(item);
    }

    public loadMoreTfvcHistory = (max?: number): void => {
        this.bridges.tfvcHistory.fetchMoreChangesets(max);
    }

    public updateTfvcHistoryFilters = (filters: ChangesetsFilterSearchCriteria): void => {
        this.bridges.tfvcHistory.updateHistoryFilters(filters);
    }

    public changeCompareVersion(version: string, path: string, isOriginalSide: boolean): void {
        const { compareState } = this.getAggregateState();
        this.actionsHub.compareChanged.invoke({
            mversion: isOriginalSide ? compareState.mversion : version,
            mpath: isOriginalSide ? compareState.mpath : path,
            oversion: isOriginalSide ? version : compareState.oversion,
            opath: isOriginalSide ? path : compareState.opath,
        });

        this.notifyCompareVersionPicked(version, isOriginalSide);
    }

    public changeCompare(options: CompareOptions): void {
        this.actionsHub.compareChanged.invoke(options);
    }

    public notifyTreeRendered = (itemsCount: number): void =>
        this.telemetryWriter.initialScenario.notifyTreeRendered(itemsCount);

    public notifyContentRendered = (): void =>
        this.telemetryWriter.initialScenario.notifyContentRendered();

    public notifyCommitCopied = (): void =>
        this.telemetryWriter.publish("commitCopied", { uiSource: "latest-change-commit" });

    public notifyColumnSorted = (columnKey: string, isDescending: boolean): void =>
        this.telemetryWriter.publish("folderContentColumnSorted", { columnKey, isDescending });

    public notifyCompareVersionPicked = (version: string, isOriginalSide: boolean): void =>
        this.telemetryWriter.publish("compareVersionPicked", { isOriginalSide });

    private checkChangesToLose(tentativeAction: () => void): boolean {
        if (this.getAggregateState().pathState.isDirty ||
            this.getAggregateState().fileContentState.isNewFile) {
            this.actionsHub.loseChangesAsked.invoke({
                dirtyFileName: this.getAggregateState().pathState.itemName,
                tentativeAction,
            });

            return true;
        } else {
            return false;
        }
    }

    /**
     * Proceed with the tentative editing action after confirming that editing is enabled for this repository, else alert the user.
     */
    private checkEditEnabled(path: string, tentativeAction: () => void): IPromise<void> {
        return this.sources.repository.isEditingEnabled(path).then((enabled: boolean) => {
            if (enabled) {
                tentativeAction();
            }
            else {
                const repositoryName = this.getAggregateState().isGit ?
                    this.sources.repository.getRepositoryName() : "$/" + this.sources.repository.getTfvcProjectName(path);
                this.actionsHub.editDisabledAlerted.invoke({
                    repositoryName,
                })
            }
        });
    }

    private fetchPermissions(versionSpec: VersionSpec): void {
        const permissionsPromise = versionSpec instanceof GitBranchVersionSpec
            ? this.sources.permissions.queryDefaultGitRepositoryWithRefNamePermissionsAsync(getFullRefNameFromBranch(versionSpec.branchName))
            : this.sources.permissions.queryDefaultGitRepositoryPermissionsAsync();

        permissionsPromise.then(
            permissionSet => this.actionsHub.permissionsUpdated.invoke(permissionSet),
            this.raiseError);
    }

    private raiseError = (error: Error): void => {
        this.actionsHub.notificationRaised.invoke({
            type: NotificationType.error,
            message: getErrorMessage(error),
            isDismissable: true,
        });
    }

    private fetchStatuses(projectId: string, version: string): void {
        if (!this.sources.statuses || !this.getAggregateState().isGit) {
            return;
        }

        this.sources.statuses.getBuildStatusForBranch(projectId, version)
            .then(statuses => {
                statuses = this.sources.statuses.convertArtifactUriToPublicUrl(statuses);
                this.actionsHub.buildStatusLoaded.invoke(statuses);

                if (!this.sources.statuses.isNewBuildAvailable()) {
                    return;
                }

                const hasAnyStatus = statuses && statuses.length;
                const hasAnyReleaseStatus = hasAnyStatus && statuses.filter(status => status.context.genre === "continuous-deployment/release").length;
                const hasAlreadyFetchedDefinitions = this.getAggregateState().statusesState.isSetupExperienceVisible;
                if (!hasAnyStatus && !hasAlreadyFetchedDefinitions) {
                    this.fetchHasBuildDefinitions(projectId);
                }
                else if (!hasAnyReleaseStatus) {
                    this.fetchReleaseDefinitionsIfNotFetched(projectId);
                }
            });
    }

    private fetchHasBuildDefinitions(projectId: string) {
        return Q.all([
            this.sources.statuses.getBuildDefinitions(projectId),
            this.sources.buildPermissions.queryBuildPermissionsAsync()
        ]).spread((buildDefinitions, permissions) => {
            let hasBuildDefinitions = buildDefinitions && buildDefinitions.length > 0;
            let buildDefinitionIds = buildDefinitions.map(bd => bd.id);
            if (hasBuildDefinitions) {
                this.fetchHasReleaseDefinitions(projectId, buildDefinitionIds);
            }

            this.actionsHub.hasBuildDefinitionsLoaded.invoke({
                hasBuildDefinitions: hasBuildDefinitions,
                buildDefinitionIds: buildDefinitionIds,
                canCreateBuildDefinitions: permissions.EditBuildDefinition
            });

            return true;
        });
    }

    private fetchReleaseDefinitionsIfNotFetched(projectId: string): void {
        const hasAlreadyFetchedReleaseDefintitions = this.getAggregateState().statusesState.isSetupReleaseExperienceVisible;
        if (!hasAlreadyFetchedReleaseDefintitions) {

            let preFetchedBuildDefinitions = this.getAggregateState().statusesState.fetchedBuildDefinitionIds;
            if (preFetchedBuildDefinitions && preFetchedBuildDefinitions.length > 0) {
                this.fetchHasReleaseDefinitions(projectId, preFetchedBuildDefinitions);
            }
            else {
                this.fetchHasBuildDefinitions(projectId)
                    .then(() => {
                        preFetchedBuildDefinitions = this.getAggregateState().statusesState.fetchedBuildDefinitionIds;
                        if (preFetchedBuildDefinitions && preFetchedBuildDefinitions.length > 0) {
                            this.fetchHasReleaseDefinitions(projectId, preFetchedBuildDefinitions);
                        }
                    });
            }
        }
    }

    private fetchHasReleaseDefinitions(projectId: string, buildDefinitionIds: number[]): void {
        this.sources.statuses.getHasReleaseDefinitions(projectId, buildDefinitionIds)
            .then(hasReleaseDefinitions => {
                if (!hasReleaseDefinitions) {
                    this.telemetryWriter.publish("setupReleaseDisplayed");
                    this.sources.statuses.fetchCreateReleaseDefinitionUrl()
                        .then(url => this.actionsHub.createReleaseDefinitionUrlFetched.invoke(url));
                }

                this.actionsHub.hasReleaseDefinitionsLoaded.invoke(hasReleaseDefinitions)
            },
            error => {
                // In error cases, don't show the set up release button. Set hasReleaseDefinitons to true
                this.actionsHub.hasReleaseDefinitionsLoaded.invoke(true);
            });
    }

    private handleRetrievedItems = (requestedPath: string, currentItem: ItemModel, items: ItemModel[], notFoundError: Error): void => {
        const { tab, path, versionSpec } = this.getAggregateState();
        const coercedTab = currentItem && coerceTabOnItem(tab, currentItem);

        const { areFolderLatestChangesRequested } = this.bridges.itemExtraData.fetchExtraDataForItem(coercedTab || tab, path, versionSpec, currentItem);

        const readMeItem = currentItem && this.bridges.itemExtraData.findReadMeItem(currentItem, items);
        if (tab === VersionControlActionIds.Readme &&
            readMeItem &&
            !isItemReadyForDisplay(readMeItem, true)) {
            this.bridges.itemRetrieval.getItem(path, versionSpec);
        }

        if (currentItem) {
            this.actionsHub.itemRetrieved.invoke({
                itemInfo: {
                    item: currentItem,
                    readMeItem,
                    areFolderLatestChangesRequested,
                },
                allRetrievedItems: items,
                coercedTab,
                notFoundError,
            });
        } else if (requestedPath === path) {
            this.actionsHub.itemRetrievalFailed.invoke({
                notFoundError: notFoundError || createPathNotFoundError(path, versionSpec),
                allRetrievedItems: items,
            });
        } else {
            this.actionsHub.itemRetrieved.invoke({
                itemInfo: undefined,
                allRetrievedItems: items,
            });
        }
    }

    private isItemValidToReportHistoryError = (path: string) => {
        const { item } = this.getAggregateState().itemContentState;
        return item && item.serverItem === path;
    }

    private fetchHistoryIfNeeded = (path: string, version: VersionSpec, filterCriteria: HistorySearchCriteria): void => {
        const { isGit } = this.getAggregateState();

        if (isGit) {
            this.fetchGitHistoryIfNeeded(path, version.toVersionString(), filterCriteria);
        }
        else {
            this.bridges.tfvcHistory.fetchChangesetsIfNeeded(path, version.toVersionString(), filterCriteria);
        }
    }

    private fetchGitHistoryIfNeeded = (itemPath: string, itemVersion: string, newCriteria?: ChangeListSearchCriteria): void => {
        const { historyListState, version } = this.getAggregateState();
        const previousCriteria = historyListState.searchCriteria;
        if (!newCriteria) {
            if (previousCriteria &&
                previousCriteria.itemPath === itemPath &&
                version === itemVersion) {
                return;
            }
        }

        this.bridges.gitHistory.fetchHistory(
            this.getHistorySearchCriteria(itemPath, itemVersion, newCriteria),
            this.getHistoryDataOptions(),
            false,
            false,
            false);
    }

    private getHistorySearchCriteria = (item?: string, version?: string, newCriteria?: ChangeListSearchCriteria): GitHistorySearchCriteria => {
        const aggregatedState = this.getAggregateState();

        const itemPath = item || aggregatedState.pathState.path;
        const itemVersion = version || aggregatedState.version;
        const restCriteria = $.extend(
            {},
            newCriteria || aggregatedState.historyListState.searchCriteria,
            { itemPath, itemVersion },
        ) as GitHistorySearchCriteria;

        delete restCriteria.top;
        delete restCriteria.skip;

        return restCriteria;
    }

    private getHistoryDataOptions = (): GitHistoryDataOptions => {
        return this.getAggregateState().historyListState.dataOptions || {
            fetchBuildStatuses: true,
            fetchGraph: true,
            fetchPullRequests: true,
            fetchTags: true,
        };
    }
}

function shallowEqualArrays<T>(first: T[], second: T[]): boolean {
    if (first.length !== second.length) {
        return false;
    }

    for (let i = 0; i < first.length; i++) {
        if (first[i] !== second[i]) {
            return false;
        }
    }

    return true;
}

function createPathNotFoundError(path: string, versionSpec: VersionSpec): Error {
    const friendlyVersion = getVersionFriendlyName(versionSpec);
    const message = format(VCResources.ExplorerPathNotFoundInVersion, path, friendlyVersion);
    return new Error(message);
}

/**
 * Gets whether or not the version type is supported by Explorer.
 * Not supported versions would cause getItems endpoint to work incorrectly.
 */
function isVersionSpecSupported(versionSpec: VersionSpec): boolean {
    return !(versionSpec instanceof TipVersionSpec ||
        versionSpec instanceof ShelvesetVersionSpec);
}
