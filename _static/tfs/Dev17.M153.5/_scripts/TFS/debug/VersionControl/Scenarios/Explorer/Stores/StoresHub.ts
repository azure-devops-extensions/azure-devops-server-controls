import { logWarning } from "VSS/Diag";
import { Action } from "VSS/Flux/Action";
import { Store } from "VSS/Flux/Store";

import * as SmartTreeStore from "Presentation/Scripts/TFS/Stores/TreeStore";
import { ActionsHub } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { AddNewFilePromptState, AddNewFilePromptStore } from "VersionControl/Scenarios/Explorer/Stores/AddNewFilePromptStore";
import { CompareStore, CompareState } from "VersionControl/Scenarios/Explorer/Stores/CompareStore";
import { EditDisabledAlertStore, EditDisabledAlertState } from "VersionControl/Scenarios/Explorer/Stores/EditDisabledAlertStore";
import { ExplorerPermissionsStore, ExplorerPermissionsState, getTfvcExplorerPermissions } from "VersionControl/Scenarios/Explorer/Stores/ExplorerPermissionsStore";
import { ExtensionsStore, ExtensionsState } from "VersionControl/Scenarios/Explorer/Stores/ExtensionsStore";
import { FileContentStore, FileContentState } from "VersionControl/Scenarios/Explorer/Stores/FileContentStore";
import { FolderContentStore, FolderContentState } from "VersionControl/Scenarios/Explorer/Stores/FolderContentStore";
import { GitFolderContentStore } from "VersionControl/Scenarios/Explorer/Stores/GitFolderContentStore";
import { ItemContentStore, ItemContentState } from "VersionControl/Scenarios/Explorer/Stores/ItemContentStore";
import { KnownItemsStore, KnownItemsState } from "VersionControl/Scenarios/Explorer/Stores/KnownItemsStore";
import { LoseChangesPromptStore, LoseChangesPromptState } from "VersionControl/Scenarios/Explorer/Stores/LoseChangesPromptStore";
import { NotificationStore, NotificationState } from "VersionControl/Scenarios/Explorer/Stores/NotificationStore";
import { PivotTabsStore, PivotTabsState } from "VersionControl/Scenarios/Explorer/Stores/PivotTabsStore";
import { RepositoryBadgesStore, RepositoryBadgesState } from "VersionControl/Scenarios/Explorer/Stores/RepositoryBadgesStore";
import { StatusesStore, StatusesState } from "VersionControl/Scenarios/Explorer/Stores/StatusesStore";
import { TfvcFolderContentStore } from "VersionControl/Scenarios/Explorer/Stores/TfvcFolderContentStore";
import { ExplorerTreeAdapter, createTreeStore, TreeState } from "VersionControl/Scenarios/Explorer/Stores/TreeStore";
import { VersionStore, VersionState } from "VersionControl/Scenarios/Explorer/Stores/VersionStore";
import { HistoryListPermissionsStore } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryListPermissionsStore";
import { HistoryListStore, HistoryListState } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryListStore";
import { TfvcChangesetsFilterStore, TfvcChangesetsFilterStoreState } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangesetsFilterStore";
import { TfvcChangeSetsStoreState, TfvcChangeSetsStore } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangeSetsStore";
import { CommitPromptStore, CommitPromptState } from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";
import { PathSearchStore, PathSearchState } from "VersionControl/Scenarios/Shared/Path/PathSearchStore";
import { PathStore, PathState } from "VersionControl/Scenarios/Shared/Path/PathStore";
import { PermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/PermissionsStore";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import { VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

/**
 * The consolidated state of all the stores that make up the Explorer scenario.
 */
export interface AggregateState {
    pathState: PathState;
    pathSearchState: PathSearchState;
    versionState: VersionState;
    repositoryBadgesState: RepositoryBadgesState;
    statusesState: StatusesState;
    pivotTabsState: PivotTabsState;
    knownItemsState: KnownItemsState;
    notificationState: NotificationState;
    itemContentState: ItemContentState;
    folderContentState: FolderContentState;
    fileContentState: FileContentState;
    commitPromptState: CommitPromptState;
    compareState: CompareState;
    editDisabledAlertState: EditDisabledAlertState;
    extensionsState: ExtensionsState;
    loseChangesPromptState: LoseChangesPromptState;
    addNewFilePromptState: AddNewFilePromptState;
    historyListState: HistoryListState;
    permissionsState: ExplorerPermissionsState;
    tfvcHistoryFilterState: TfvcChangesetsFilterStoreState;
    tfvcHistoryListState: TfvcChangeSetsStoreState;
    treeState: TreeState;
    repositoryContext: RepositoryContext;
    projectId: string;
    tab: string;
    path: string;
    isFolder: boolean;
    version: string;
    versionSpec: VersionSpec;
    isGit: boolean;
    rootPath: string;
    settingPermissionState: SettingsPermissions;
}

export type StoreName =
    "commitPrompt" |
    "compare" |
    "context" |
    "editDisabledAlert" |
    "extensions" |
    "fileContent" |
    "permissions" |
    "folderContent" |
    "historyListPermission" |
    "historyList" |
    "tfvcHistoryList" |
    "tfvcHistoryFilter" |
    "itemContent" |
    "knownItems" |
    "loseChangesPrompt" |
    "addNewFilePrompt" |
    "notification" |
    "path" |
    "pathSearch" |
    "pivotTabs" |
    "repositoryBadges" |
    "smartFolderTree" |
    "statuses" |
    "version"|
    "settingsPermissions";

export type StoreSet = StoreName[];

export type EmitChangedFunction<TPayload> = (changedStores: StoreSet, action: Action<TPayload>, payload: TPayload) => void;

/**
 * A class to get together the stores of Explorer page, so they can be accessed easily.
 */
export class StoresHub {
    private readonly compositeStores = new CompositeStoresManager();
    private readonly listener: ListeningActionsManager;
    private aggregateState: AggregateState;

    constructor(
        actionsHub: ActionsHub,
        isGit: boolean,
        private readonly onDispatched?: EmitChangedFunction<any>,
    ) {
        this.listener = new ListeningActionsManager(this.emitChanged);

        this.commitPromptStore = this.createCommitPromptStore(actionsHub);
        this.compareStore = this.createCompareStore(actionsHub);
        this.contextStore = this.createContextStore(actionsHub);
        this.editDisabledAlertStore = this.createEditDisabledAlertStore(actionsHub);
        this.extensionsStore = this.createExtensionsStore(actionsHub);
        this.fileContentStore = this.createFileContentStore(actionsHub);
        this.folderContentStore = this.createFolderContentStore(actionsHub, isGit);
        this.itemContentStore = this.createItemContentStore(actionsHub);
        this.knownItemsStore = this.createKnownItemsStore(actionsHub);
        this.loseChangesPromptStore = this.createLoseChangesPromptStore(actionsHub);
        this.addNewFileStore = this.createAddNewFileStore(actionsHub);
        this.notificationStore = this.createNotificationStore(actionsHub);
        this.pathStore = this.createPathStore(actionsHub);
        this.pathSearchStore = this.createPathSearchStore(actionsHub);
        this.pivotTabsStore = this.createPivotTabsStore(actionsHub);
        this.repositoryBadgesStore = this.createRepositoryBadgesStore(actionsHub);
        this.smartFolderTreeStore = this.createSmartFolderTreeStore(actionsHub, isGit);
        this.statusesStore = this.createStatusesStore(actionsHub);
        this.versionStore = this.createVersionStore(actionsHub);

        if (isGit) {
            this.explorerPermissionsStore = this.createExplorerPermissionsStore(actionsHub);
            this.historyListPermissionStore = this.createHistoryListPermissionStore(actionsHub);
            this.settingsPermissionsStore = this.createSettingsPermissionStore(actionsHub);
            this.historyListStore = this.createHistoryListStore(actionsHub);
        } else {
            this.tfvcHistoryListStore = this.createTfvcHistoryListStore(actionsHub);
            this.tfvcHistoryFilterStore = this.createTfvcHistoryFilterStore(actionsHub);
        }
    }

    private emitChanged = (changedStores: StoreSet, action: Action<any>, payload: any): void => {
        this.aggregateState = this.createAggregateState(changedStores);

        this.compositeStores.emitCompositeChanged(changedStores);

        if (this.onDispatched) {
            this.onDispatched(changedStores, action, payload);
        }
    }

    public commitPromptStore: CommitPromptStore;
    public compareStore: CompareStore;
    public contextStore: ContextStore;
    public editDisabledAlertStore: EditDisabledAlertStore;
    public extensionsStore: ExtensionsStore;
    public folderContentStore: FolderContentStore;
    public fileContentStore: FileContentStore;
    public historyListPermissionStore: HistoryListPermissionsStore;
    public historyListStore: HistoryListStore;
    public explorerPermissionsStore: ExplorerPermissionsStore;
    public tfvcHistoryListStore: TfvcChangeSetsStore;
    public tfvcHistoryFilterStore: TfvcChangesetsFilterStore;
    public itemContentStore: ItemContentStore;
    public knownItemsStore: KnownItemsStore;
    public loseChangesPromptStore: LoseChangesPromptStore;
    public addNewFileStore: AddNewFilePromptStore;
    public notificationStore: NotificationStore;
    public pathStore: PathStore;
    public pathSearchStore: PathSearchStore;
    public pivotTabsStore: PivotTabsStore;
    public repositoryBadgesStore: RepositoryBadgesStore;
    public statusesStore: StatusesStore;
    public settingsPermissionsStore: PermissionsStore<SettingsPermissions, SettingsPermissions>;
    public versionStore: VersionStore;
    public smartFolderTreeStore: SmartTreeStore.TreeStore;

    public getAggregateState = (): AggregateState => {
        return this.aggregateState;
    }

    private createAggregateState(changedStores: StoreSet): AggregateState {
        const hasChangedTree = changedStores.indexOf("smartFolderTree") >= 0;
        const treeState = this.aggregateState && !hasChangedTree
            ? this.aggregateState.treeState
            : { visibleItems: this.smartFolderTreeStore.getVisible() };

        return {
            pathState: this.pathStore.state,
            pathSearchState: this.pathSearchStore.getState(),
            versionState: this.versionStore.state,
            repositoryBadgesState: this.repositoryBadgesStore.state,
            statusesState: this.statusesStore.state,
            pivotTabsState: this.pivotTabsStore.state,
            knownItemsState: this.knownItemsStore.state,
            notificationState: this.notificationStore.state,
            itemContentState: this.itemContentStore.state,
            folderContentState: this.folderContentStore.state,
            fileContentState: this.fileContentStore.state,
            commitPromptState: this.commitPromptStore.state,
            compareState: this.compareStore.state,
            editDisabledAlertState: this.editDisabledAlertStore.state,
            extensionsState: this.extensionsStore.state,
            loseChangesPromptState: this.loseChangesPromptStore.state,
            addNewFilePromptState: this.addNewFileStore.state,
            historyListState: this.historyListStore && this.historyListStore.state,
            permissionsState: this.explorerPermissionsStore ? this.explorerPermissionsStore.getPermissions() : getTfvcExplorerPermissions(),
            tfvcHistoryFilterState: this.tfvcHistoryFilterStore && this.tfvcHistoryFilterStore.state,
            tfvcHistoryListState: this.tfvcHistoryListStore && this.tfvcHistoryListStore.state,
            treeState,
            repositoryContext: this.contextStore.getRepositoryContext(),
            projectId: this.contextStore.getProjectId(),
            isGit: this.pathStore.state.isGit,
            rootPath: this.fileContentStore.state.rootPath,
            tab: this.pivotTabsStore.state.currentTab,
            path: this.pathStore.state.path,
            isFolder: this.itemContentStore.state.item && this.itemContentStore.state.item.isFolder,
            version: this.versionStore.state.versionSpec && this.versionStore.state.versionSpec.toVersionString(),
            versionSpec: this.versionStore.state.versionSpec,
            settingPermissionState: this.settingsPermissionsStore ? this.settingsPermissionsStore.getPermissions() : this.getDefaultSettingsPermissions()
        };
    }

    public getCompositeStore(storeNames: StoreSet): CompositeStore {
        return this.compositeStores.getOrCreate(storeNames);
    }

    private createCommitPromptStore(actionsHub: ActionsHub): CommitPromptStore {
        const store = new CommitPromptStore();
        this.listen(actionsHub.currentRepositoryChanged, "commitPrompt", payload =>
            store.initialize(payload.isGit));
        this.listen(actionsHub.commitPrompted, "commitPrompt", store.prompt);
        this.listen(actionsHub.commitStarted, "commitPrompt", store.start);
        this.listen(actionsHub.commitSaved, "commitPrompt", store.hideAndRememberBranch);
        this.listen(actionsHub.filesUploaded, "commitPrompt", store.hideAndRememberBranch);
        this.listen(actionsHub.commitGatedCheckin, "commitPrompt", store.notifyGatedCheckin);
        this.listen(actionsHub.commitFailed, "commitPrompt", store.notifyError);
        this.listen(actionsHub.commitDialogDismissed, "commitPrompt", store.hide);
        this.listen(actionsHub.existingBranchesLoaded, "commitPrompt", store.loadExistingBranches);
        this.listen(actionsHub.itemRetrieved, "commitPrompt", payload => store.updateChildren(payload.allRetrievedItems));
        this.listen(actionsHub.editDisabledAlerted, "commitPrompt", store.hide);
        return store;
    }

    private createAddNewFileStore(actionsHub: ActionsHub): AddNewFilePromptStore {
        const store = new AddNewFilePromptStore();
        this.listen(actionsHub.currentRepositoryChanged, "addNewFilePrompt", payload =>
            store.initialize(payload.isGit));
        this.listen(actionsHub.newFileAsked, "addNewFilePrompt", store.prompt);
        this.listen(actionsHub.newFileDismissed, "addNewFilePrompt", store.hide);
        this.listen(actionsHub.newFileAdded, "addNewFilePrompt", store.hide);
        this.listen(actionsHub.newFileTargetFolderChanged, "addNewFilePrompt", store.changeTargetFolder);
        this.listen(actionsHub.itemRetrieved, "addNewFilePrompt", payload => store.updateChildren(payload.allRetrievedItems));
        this.listen(actionsHub.editDisabledAlerted, "addNewFilePrompt", store.hide);
        return store;
    }

    private createCompareStore(actionsHub: ActionsHub): CompareStore {
        const store = new CompareStore();
        this.listen(actionsHub.itemChanged, "compare", payload =>
            payload.compareOptions && store.update(payload.compareOptions));
        this.listen(actionsHub.tabChanged, "compare", payload =>
            payload.compareOptions && store.update(payload.compareOptions));
        this.listen(actionsHub.compareChanged, "compare", store.update);
        this.listen(actionsHub.diffInlineToggled, "compare", store.toggleDiffInline);
        this.listen(actionsHub.diffLinesLoaded, "compare", store.loadDiffLines);
        this.listen(actionsHub.goToPreviousDiffRequested, "compare", store.goToPreviousDiff);
        this.listen(actionsHub.goToNextDiffRequested, "compare", store.goToNextDiff);
        return store;
    }

    private createContextStore(actionsHub: ActionsHub): ContextStore {
        const store = new ContextStore();
        this.listen(actionsHub.currentRepositoryChanged, "context", payload =>
            store.onContextUpdated({
                tfsContext: payload.repositoryContext.getTfsContext(),
                repositoryContext: payload.repositoryContext,
            }));
        return store;
    }

    private createEditDisabledAlertStore(actionsHub: ActionsHub): EditDisabledAlertStore {
        const store = new EditDisabledAlertStore();
        this.listen(actionsHub.editDisabledAlerted, "editDisabledAlert", store.prompt);
        this.listen(actionsHub.editDisabledDialogDismissed, "editDisabledAlert", store.dismiss);
        return store;
    }

    private createExtensionsStore(actionsHub: ActionsHub): ExtensionsStore {
        const store = new ExtensionsStore();
        this.listen(actionsHub.extensionLoaded, "extensions", store.load);
        return store;
    }

    private createFileContentStore(actionsHub: ActionsHub): FileContentStore {
        const store = new FileContentStore();
        this.listen(actionsHub.currentRepositoryChanged, "fileContent", store.changeRepository);
        this.listen(actionsHub.itemChanged, "fileContent", store.selectItem);
        this.listen(actionsHub.newFileAdded, "fileContent", payload =>
            store.addNewFile(payload.newFileItem));
        this.listen(actionsHub.initialContentRetrieved, "fileContent", initialContent =>
            store.loadOriginalContent({ originalContent: initialContent }));
        this.listen(actionsHub.editFileStarted, "fileContent", payload =>
            store.editFile(payload.fileItem));
        this.listen(actionsHub.fileContentLoaded, "fileContent", store.loadOriginalContent);
        this.listen(actionsHub.fileContentEdited, "fileContent", payload =>
            store.editContent(payload.newContent));
        this.listen(actionsHub.commitSaved, "fileContent", store.commit);
        this.listen(actionsHub.editingFileDiscarded, "fileContent", store.discardEditingFile);
        this.listen(actionsHub.diffInlineToggled, "fileContent", store.toggleDiffInline);
        return store;
    }

    private createFolderContentStore(actionsHub: ActionsHub, isGit: boolean): FolderContentStore {
        let store: FolderContentStore;
        if (isGit) {
            const gitFolderContentStore = new GitFolderContentStore();
            this.listen(actionsHub.remainderFolderLatestChangesRequested, "folderContent", gitFolderContentStore.showLoadingRemainderLatestChanges);
            this.listen(actionsHub.commitDetailsRetrieved, "folderContent", gitFolderContentStore.loadCommitDetails);
            store = gitFolderContentStore;
        } else {
            store = new TfvcFolderContentStore();
        }

        this.listen(actionsHub.tabChanged, "folderContent", store.changeTab);
        this.listen(actionsHub.itemChanged, "folderContent", ({ path, itemInfo }) =>
            this.folderContentStore.changeItem(path, itemInfo));
        this.listen(actionsHub.newFileAdded, "folderContent", ({ newFileItem }) =>
            this.folderContentStore.changeItem(newFileItem.serverItem, undefined));
        this.listen(actionsHub.commitSaved, "folderContent", store.commit);
        this.listen(actionsHub.filesUploaded, "folderContent", store.commit);
        this.listen(actionsHub.folderChildrenSelected, "folderContent", store.selectChildren);
        this.listen(actionsHub.itemRetrieved, "folderContent", payload =>
            store.loadItems(payload.itemInfo));
        this.listen(actionsHub.editingFileDiscarded, "folderContent", ({ path, navigateItemInfo }) =>
            this.folderContentStore.changeItem(path, navigateItemInfo));
        this.listen(actionsHub.folderLatestChangesRetrieved, "folderContent", store.loadLatestChanges);
        return store;
    }

    private createItemContentStore(actionsHub: ActionsHub): ItemContentStore {
        const store = new ItemContentStore();
        this.listen(actionsHub.tabChanged, "itemContent", store.changeTab);
        this.listen(actionsHub.itemChanged, "itemContent", store.changeItem);
        this.listen(actionsHub.newFileAdded, "itemContent", payload =>
            store.editOrAddNewFile(payload.newFileItem));
        this.listen(actionsHub.editFileStarted, "itemContent", payload =>
            store.editOrAddNewFile(payload.fileItem));
        this.listen(actionsHub.commitSaved, "itemContent", store.commit);
        this.listen(actionsHub.editingFileDiscarded, "itemContent", store.discardEditingFile);
        this.listen(actionsHub.itemRetrieved, "itemContent", payload =>
            payload.itemInfo && store.loadItem(payload.itemInfo, payload.coercedTab));
        this.listen(actionsHub.itemRetrievalFailed, "itemContent", store.failRetrieval);
        return store;
    }

    private createHistoryListStore(actionsHub: ActionsHub): HistoryListStore {
        const store = new HistoryListStore();
        this.listen(actionsHub.historyItemsLoaded, "historyList", store.populateHistoryList);
        this.listen(actionsHub.historyArtifactsLoaded, "historyList", store.mergeArtifactsToHistoryList);
        this.linkToAllActionsThatChangeItem(actionsHub, "historyList", payload =>
            store.clearAndStartLoading(payload && payload.options && payload.options.historySearchCriteria));
        this.listen(actionsHub.historyFullCommentLoaded, "historyList", payload =>
            store.updateFullComment(payload));
        this.listen(actionsHub.historyItemsLoadErrorRaised, "historyList", store.failLoad);
        this.listen(actionsHub.historyGraphMessageDismissed, "historyList", store.dismissGraphMessage);
        this.listen(actionsHub.historyItemsReloadStarted, "historyList", store.startLoading);
        this.listen(actionsHub.historyGraphRowSelected, "historyList", store.historyGraphUpdated);
        this.listen(actionsHub.historyGraphRowUnSelected, "historyList", store.historyGraphUpdated);
        this.listen(actionsHub.toggleFilterPanelVisibility, "historyList", store.toggleFilterPanelVisibility);
        return store;
    }

    private createHistoryListPermissionStore(actionsHub: ActionsHub): HistoryListPermissionsStore {
        const store = new HistoryListPermissionsStore();
        this.listen(actionsHub.permissionsUpdated, "historyListPermission", store.onPermissionsUpdated);
        return store;
    }
    private createSettingsPermissionStore(actionsHub: ActionsHub): PermissionsStore<SettingsPermissions, SettingsPermissions> {
        const store = new PermissionsStore<SettingsPermissions, SettingsPermissions>();
        this.listen(actionsHub.settingsPermissionsUpdated, "settingsPermissions", store.onPermissionsUpdated);
        return store;
    }

    private getDefaultSettingsPermissions(): SettingsPermissions{
        return {Read: true, Write: true};
    }

    private createExplorerPermissionsStore(actionsHub: ActionsHub): ExplorerPermissionsStore {
        const store = new ExplorerPermissionsStore();
        this.linkToAllActionsThatChangeItem(actionsHub, "permissions", store.setVersion);
        this.listen(actionsHub.permissionsUpdated, "permissions", store.onPermissionsUpdated);
        return store;
    }

    private createTfvcHistoryListStore(actionsHub: ActionsHub): TfvcChangeSetsStore {
        const store = new TfvcChangeSetsStore();
        this.listen(actionsHub.tfvcHistoryItemsLoadStarted, "tfvcHistoryList", store.setLoadingStarted);
        this.listen(actionsHub.tfvcHistoryItemsLoaded, "tfvcHistoryList", store.loadHistoryList);
        this.linkToAllActionsThatChangeItem(actionsHub, "tfvcHistoryList", store.setLoadingStarted);
        this.listen(actionsHub.changeTypeHistoryItemsCollapsed, "tfvcHistoryList", store.collapseChangeset);
        this.listen(actionsHub.historyItemsLoadErrorRaised, "tfvcHistoryList", () => store.failLoad(null));
        return store;
    }

    private createTfvcHistoryFilterStore(actionsHub: ActionsHub): TfvcChangesetsFilterStore {
        const store = new TfvcChangesetsFilterStore();
        this.listen(actionsHub.itemChanged, "tfvcHistoryFilter", payload =>
            payload.options && payload.options.historySearchCriteria && store.updateFilters(payload.options.historySearchCriteria));
        this.listen(actionsHub.tfvcHistoryFilterCriteriaChanged, "tfvcHistoryFilter", store.updateFilters);
        return store;
    }

    private createKnownItemsStore(actionsHub: ActionsHub): KnownItemsStore {
        const store = new KnownItemsStore();
        this.listen(actionsHub.currentRepositoryChanged, "knownItems", payload =>
            store.initializeRepository(payload.isGit, payload.rootNodeIconClass));
        this.listen(actionsHub.itemChanged, "knownItems", payload =>
            payload.hasChangedVersion && store.reset());
        this.listen(actionsHub.editFileStarted, "knownItems", payload =>
            store.loadItems([payload.fileItem]));
        this.listen(actionsHub.commitSaved, "knownItems", payload =>
            payload.path && store.confirmSavedItems([payload.path]));
        this.listen(actionsHub.editingFileDiscarded, "knownItems", store.discardEdit);
        this.listen(actionsHub.filesUploaded, "knownItems", payload =>
            store.confirmSavedItems(payload.newPaths));
        this.listen(actionsHub.itemRetrieved, "knownItems", payload =>
            store.loadItems(payload.allRetrievedItems));
        this.listen(actionsHub.itemRetrievalFailed, "knownItems", payload =>
            store.loadItems(payload.allRetrievedItems));
        this.listen(actionsHub.treeItemExpanded, "knownItems", payload =>
            store.loadItems(payload.allRetrievedItems));
        this.listen(actionsHub.newFileAdded, "knownItems", store.addNewItem);
        return store;
    }

    private createLoseChangesPromptStore(actionsHub: ActionsHub): LoseChangesPromptStore {
        const store = new LoseChangesPromptStore();
        this.listen(actionsHub.loseChangesAsked, "loseChangesPrompt", store.prompt);
        this.listen(actionsHub.loseChangesDialogDismissed, "loseChangesPrompt", store.dismiss);
        this.linkToAllActionsThatChangeItem(actionsHub, "loseChangesPrompt", store.dismiss);
        this.listen(actionsHub.tabChanged, "loseChangesPrompt", store.dismiss);
        this.listen(actionsHub.filesUploaded, "loseChangesPrompt", store.dismiss);
        this.listen(actionsHub.itemRetrievalFailed, "loseChangesPrompt", store.dismiss);
        this.listen(actionsHub.commitPrompted, "loseChangesPrompt", store.dismiss);
        return store;
    }

    private createNotificationStore(actionsHub: ActionsHub): NotificationStore {
        const store = new NotificationStore();

        this.listen(actionsHub.currentRepositoryChanged, "notification", store.initializeRepository);
        this.listen(actionsHub.tabChanged, "notification", store.clearErrors);
        this.listen(actionsHub.itemChanged, "notification", store.changeItem);
        this.listen(actionsHub.itemRetrieved, "notification", payload =>
            payload.notFoundError && store.addSoloWarning(payload.notFoundError));
        this.listen(actionsHub.itemRetrievalFailed, "notification", payload =>
            payload.resumableError && store.addSoloWarning(payload.resumableError));

        this.listen(actionsHub.notificationRaised, "notification", store.addSoloSpecialType);
        this.listen(actionsHub.notificationDismissed, "notification", store.dismiss);

        this.listen(actionsHub.newFileAdded, "notification", store.startEditing);
        this.listen(actionsHub.editFileStarted, "notification", store.startEditing);
        this.listen(actionsHub.commitSaved, "notification", store.notifyCommit);
        this.listen(actionsHub.filesUploaded, "notification", store.uploadFiles);

        this.listen(actionsHub.historyItemsLoadErrorRaised, "notification", store.addSoloError);

        return store;
    }

    private createPathStore(actionsHub: ActionsHub): PathStore {
        const store = new PathStore();
        this.listen(actionsHub.currentRepositoryChanged, "path", payload =>
            store.changeRepository(payload.repositoryName, payload.isGit));
        this.listen(actionsHub.itemChanged, "path", payload =>
            store.setPath(payload.path));
        this.listen(actionsHub.newFileAdded, "path", payload =>
            store.setPath(payload.newFileItem.serverItem));
        this.listen(actionsHub.editFileStarted, "path", payload =>
            store.setPath(payload.fileItem.serverItem));
        this.listen(actionsHub.editingFileDiscarded, "path", payload =>
            store.setPath(payload.navigatePath));
        this.listen(actionsHub.commitSaved, "path", payload =>
            payload.navigatePath
            ? store.setPath(payload.navigatePath)
            : store.changeDirty(false));
        this.listen(actionsHub.itemRetrieved, "path", payload =>
            payload.itemInfo && store.setPath(payload.itemInfo.item.serverItem));
        this.listen(actionsHub.pathEditingStarted, "path", store.startEditing);
        this.listen(actionsHub.pathEditingCancelled, "path", store.cancelEditing);
        this.listen(actionsHub.fileContentEdited, "path", payload =>
            store.changeDirty(payload.isDirty));
        this.listen(actionsHub.pathEdited, "path", store.changeInputText);
        this.listen(actionsHub.pathSearchSelectionChanged, "path", payload =>
            store.changeInputText(payload.newInputText));
        return store;
    }

    private createPathSearchStore(actionsHub: ActionsHub): PathSearchStore {
        const store = new PathSearchStore();
        this.listen(actionsHub.pathEditingStarted, "pathSearch", store.setInitialSearchText);
        this.listen(actionsHub.pathEdited, "pathSearch", store.onPathEdit);
        this.listen(actionsHub.itemChanged, "pathSearch", store.reset);
        this.listen(actionsHub.commitSaved, "pathSearch", store.reset);
        this.listen(actionsHub.newFileAdded, "pathSearch", store.reset);
        this.listen(actionsHub.editFileStarted, "pathSearch", store.reset);
        this.listen(actionsHub.editingFileDiscarded, "pathSearch", store.reset);
        this.listen(actionsHub.pathEditingCancelled, "pathSearch", store.reset);
        this.listen(actionsHub.pathSearchSelectionChanged, "pathSearch", payload =>
            store.selectItem(payload.itemIdentifier));
        this.listen(actionsHub.globalPathSearchResultsLoaded, "pathSearch", store.setGlobalSearchResults);
        this.listen(actionsHub.inFolderPathSearchResultsLoaded, "pathSearch", store.setInFolderSearchResults);
        this.listen(actionsHub.pathSearchFailed, "pathSearch", store.failPathSearch);
        return store;
    }

    private createPivotTabsStore(actionsHub: ActionsHub): PivotTabsStore {
        const store = new PivotTabsStore();
        this.listen(actionsHub.currentRepositoryChanged, "pivotTabs", store.changeRepository);
        this.listen(actionsHub.tabChanged, "pivotTabs", store.changeTab);
        this.listen(actionsHub.itemChanged, "pivotTabs", store.selectItem);
        this.listen(actionsHub.newFileAdded, "pivotTabs", store.editNewOrExistingFile);
        this.listen(actionsHub.editFileStarted, "pivotTabs", store.editNewOrExistingFile);
        this.listen(actionsHub.commitSaved, "pivotTabs", store.commit);
        this.listen(actionsHub.editingFileDiscarded, "pivotTabs", store.discardEditingFile);
        this.listen(actionsHub.fullScreenChanged, "pivotTabs", store.changeFullScreen);
        this.listen(actionsHub.itemRetrieved, "pivotTabs", payload =>
            store.setItem(payload.itemInfo, payload.coercedTab));
        return store;
    }

    private createRepositoryBadgesStore(actionsHub: ActionsHub): RepositoryBadgesStore {
        const store = new RepositoryBadgesStore();
        this.listen(actionsHub.currentRepositoryChanged, "repositoryBadges", store.changeRepository);
        this.listen(actionsHub.repositoryStatsLoaded, "repositoryBadges", store.loadStats);
        return store;
    }

    private createStatusesStore(actionsHub: ActionsHub): StatusesStore {
        const store = new StatusesStore();
        this.listen(actionsHub.currentRepositoryChanged, "statuses", store.clearStatuses);
        this.listen(actionsHub.itemChanged, "statuses", payload =>
            payload.hasChangedVersion && store.clearStatuses());
        this.listen(actionsHub.commitSaved, "statuses", store.clearStatuses);
        this.listen(actionsHub.buildStatusLoaded, "statuses", store.loadStatuses);
        this.listen(actionsHub.hasBuildDefinitionsLoaded, "statuses", store.loadHasBuildDefinitions);
        this.listen(actionsHub.hasReleaseDefinitionsLoaded, "statuses", store.loadHasReleaseDefinitions);
        this.listen(actionsHub.createReleaseDefinitionUrlFetched, "statuses", store.createReleaseDefinitionUrlFetched);
        return store;
    }

    private createSmartFolderTreeStore(actionsHub: ActionsHub, isGit: boolean): SmartTreeStore.TreeStore {
        const adapter = new ExplorerTreeAdapter(isGit);

        this.listen(actionsHub.itemChanged, "smartFolderTree", payload =>
            adapter.selectItem(payload.path, payload.hasChangedVersion, payload.itemInfo && payload.itemInfo.item, Boolean(payload.notFoundError)));
        this.listen(actionsHub.filesUploaded, "smartFolderTree", payload =>
            adapter.addNewPathsAndExpand(payload.newPaths));
        this.listen(actionsHub.commitSaved, "smartFolderTree", payload =>
            (payload.changeType === VersionControlChangeType.Rename || payload.changeType === VersionControlChangeType.Delete) &&
            adapter.renameOrDeleteItem(payload.path, payload.isFolder, payload.navigatePath, payload.newPath));
        this.listen(actionsHub.itemRetrieved, "smartFolderTree", payload =>
            adapter.addItemsAndExpandParent(payload.allRetrievedItems, payload.itemInfo && payload.itemInfo.item));
        this.listen(actionsHub.itemRetrievalFailed, "smartFolderTree", payload =>
            adapter.addItemsAndExpand(payload.allRetrievedItems));
        this.listen(actionsHub.treeItemExpanding, "smartFolderTree", adapter.startExpand);
        this.listen(actionsHub.treeItemExpanded, "smartFolderTree", payload =>
            adapter.addItemsAndExpand(payload.allRetrievedItems, payload.folderPath));
        this.listen(actionsHub.treeItemCollapsed, "smartFolderTree", adapter.collapse);
        this.listen(actionsHub.newFileAdded, "smartFolderTree", payload =>
            adapter.addItemsAndExpand([payload.newFileItem, ...payload.allRetrievedItems], payload.newFileItem.serverItem));
        this.listen(actionsHub.editingFileDiscarded, "smartFolderTree", payload =>
            adapter.deleteDiscardedNewFile(payload.creatingItemPaths));

        return createTreeStore(adapter, isGit);
    }

    private createVersionStore(actionsHub: ActionsHub): VersionStore {
        const store = new VersionStore();
        this.listen(actionsHub.currentRepositoryChanged, "version", store.changeRepository);
        this.listen(actionsHub.itemChanged, "version", payload =>
            store.selectVersion(payload.versionSpec));
        this.listen(actionsHub.editingFileDiscarded, "version", payload =>
            payload.navigateVersionSpec &&
            store.selectVersion(payload.navigateVersionSpec));
        this.listen(actionsHub.itemRetrieved, "version", store.selectRealVersion);
        this.listen(actionsHub.itemRetrievalFailed, "version", store.selectRealVersion);
        this.listen(actionsHub.newFileAdded, "version", store.selectRealVersion);
        this.listen(actionsHub.treeItemExpanded, "version", store.selectRealVersion);
        this.listen(actionsHub.commitSaved, "version", store.commit);
        this.listen(actionsHub.branchSelectorToggled, "version", store.toggleBranchSelector);
        return store;
    }

    private linkToAllActionsThatChangeItem(actionsHub: ActionsHub, storeName: StoreName, handler: (payload: any) => void) {
        this.listen(actionsHub.itemChanged, storeName, handler);
        this.listen(actionsHub.newFileAdded, storeName, handler);
        this.listen(actionsHub.editFileStarted, storeName, handler);
        this.listen(actionsHub.editingFileDiscarded, storeName, handler);
        this.listen(actionsHub.commitSaved, storeName, handler);
    }

    private listen<TPayload>(action: Action<TPayload>, storeName: StoreName, handle: (payload: TPayload) => void) {
        this.listener.listen(action, storeName, handle);
    }
}

const storeRunningThresholdMilliseconds = 10;

interface ActionListener<TPayload> {
    action: Action<TPayload>;
    stores: StoreSet;
    handles: ((payload: TPayload) => void)[];
}

class ListeningActionsManager {
    private readonly listeners: ActionListener<any>[] = [];

    constructor(private readonly emitChanged: EmitChangedFunction<any>) {
    }

    public listen<TPayload>(action: Action<TPayload>, storeName: StoreName, handle: (payload: TPayload) => void): void {
        const listener = this.getOrCreate(action);

        if (listener.stores.indexOf(storeName) >= 0) {
            throw new Error("A store must only listen once each action.");
        }

        listener.stores.push(storeName);

        listener.handles.push(handle);
    }

    private getOrCreate<TPayload>(action: Action<TPayload>): ActionListener<TPayload> {
        const filtered = this.listeners.filter(existing => existing.action === action);
        if (filtered.length) {
            return filtered[0];
        } else {
            const actionListener: ActionListener<TPayload> = { action, stores: [], handles: [] };

            action.addListener(payload => {
                for (let i = 0; i < actionListener.handles.length; i++) {
                    const handle = actionListener.handles[i];
                    const start = performance.now();
                    handle(payload);

                    const milliseconds = performance.now() - start;
                    if (milliseconds > storeRunningThresholdMilliseconds) {
                        const storeName = actionListener.stores[i];
                        logWarning(`Explorer/StoresHub: A slow method in ${storeName} store took ${milliseconds.toFixed(2)}ms`);
                    }
                }

                this.emitChanged(actionListener.stores, action, payload);
            });

            this.listeners.push(actionListener);

            return actionListener;
        }
    }
}

class CompositeStoresManager {
    private compositeStores: CompositeStore[] = [];

    public getOrCreate(storeNames: StoreSet): CompositeStore {
        let store = this.compositeStores.filter(s => areEqualSets(s.childStores, storeNames))[0];

        if (!store) {
            store = new CompositeStore(storeNames);
            this.compositeStores.push(store);
        }

        return store;
    }

    public emitCompositeChanged = (changedStores: string[]): void => {
        for (const store of this.compositeStores) {
            if (intersect(changedStores, store.childStores).length) {
                store.emitCompositeChanged();
            }
        }
    }
}

export class CompositeStore extends Store {
    constructor(public readonly childStores: StoreSet) {
        super();
    }

    public emitCompositeChanged(): void {
        this.emitChanged();
    }
}

function areEqualSets<T>(a: T[], b: T[]): boolean {
    return a.length === b.length &&
        intersect(a, b).length === a.length;
}

function intersect<T>(a: T[], b: T[]): T[] {
    return a.filter(item => b.indexOf(item) >= 0);
}
