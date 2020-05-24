import Q = require("q");

import Navigation_Services = require("VSS/Navigation/Services");
import Controls = require("VSS/Controls");
import CodeHubCloneRepositoryAction_NO_REQUIRE = require("VersionControl/Scripts/CodeHubCloneRepositoryAction");
import Menus = require("VSS/Controls/Menus");
import Performance = require("VSS/Performance");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import ControlsCommon = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import Notifications = require("VSS/Controls/Notifications");
import {ShortcutGroupDefinition} from "TfsCommon/Scripts/KeyboardShortcuts";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import VSS = require("VSS/VSS");

import VCSourceExplorerTree = require("VersionControl/Scripts/Controls/SourceExplorerTree");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import VCSourceEditingEvents = require("VersionControl/Scripts/Controls/SourceEditingEvents");
import _VCFileDefaultContentProvider = require("VersionControl/Scripts/TFS.VersionControl.FileDefaultContentProvider");
import VCFileDefaultContentProviderScenario = require("VersionControl/Scripts/TFS.VersionControl.FileDefaultContentProvider.Scenario");
import VCViewBase = require("VersionControl/Scripts/Views/BaseView");
import VCCommonPivotFilters = require("VersionControl/Scripts/Controls/CommonPivotFiltersControl");
import VCGitVersionSelectorMenu = require("VersionControl/Scripts/Controls/GitVersionSelectorMenu");
import VCCompareTab = require("VersionControl/Scripts/Views/Tabs/CompareTab");
import VCContentsTab = require("VersionControl/Scripts/Views/Tabs/ContentsTab");
import { HistoryNavigationTab } from "VersionControl/Scenarios/Shared/HistoryNavigationTab";
import GitUIService = require("VersionControl/Scripts/Services/GitUIService");
import VCSourceExplorerGridOrTreeMenuItemClickedEvent = require("VersionControl/Scripts/SourceExplorerGridOrTreeMenuItemClickedEvent");
import VCGitItemFromJsonIsland = require("VersionControl/Scripts/GitItemFromJsonIsland");
import VCCommentParser = require("VersionControl/Scripts/CommentParser");
import { startCodeSearchEngagements } from "VersionControl/Scripts/Utils/CodeSearch";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";

import * as VCPathExplorerContainer from "VersionControl/Scenarios/Shared/Path/PathExplorerContainer";
import * as VCStatusBadge from "VersionControl/Scenarios/Explorer/Components/StatusBadge";
import * as VCChangesetVersion from "VersionControl/Scenarios/Explorer/Components/ChangesetVersion";
import { ActionCreator } from  "VersionControl/Scenarios/Explorer/ActionCreator";
import { StoresHub, AggregateState } from  "VersionControl/Scenarios/Explorer/Stores/StoresHub";
import { ItemContentStore } from "VersionControl/Scenarios/Explorer/Stores/ItemContentStore";
import { PathStore } from "VersionControl/Scenarios/Shared/Path/PathStore";
import { ActionsHub } from  "VersionControl/Scenarios/Explorer/ActionsHub";
import { PageSource } from  "VersionControl/Scenarios/Explorer/Sources/PageSource";
import { RepositorySource } from  "VersionControl/Scenarios/Explorer/Sources/RepositorySource";
import { StatusesSource } from  "VersionControl/Scenarios/Explorer/Sources/StatusesSource";
import { EditingDialogsSource } from  "VersionControl/Scenarios/Explorer/Sources/EditingDialogsSource";
import { CommittingSource } from  "VersionControl/Scenarios/Shared/Committing/CommittingSource";
import { LazyPathsSearchSource } from "VersionControl/Scenarios/Shared/Path/LazyPathsSearchSource";
import * as UrlPageHandler from "VersionControl/Scenarios/Explorer/UrlPageHandler";

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;
import CommonMenuItems = ControlsCommon.CommonMenuItems;

import "VSS/LoaderPlugins/Css!BuildStyles";
import "VSS/LoaderPlugins/Css!DistributedTasksLibrary";
import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!ExplorerView";
import "VSS/LoaderPlugins/Css!VersionControl";

class ExplorerShortcutGroup extends ShortcutGroupDefinition {
    constructor(protected vcView: ExplorerView, protected repoContext: RepositoryContext) {
        super(VCResources.KeyboardShortcutGroup_Explorer);

        const historyService = Navigation_Services.getHistoryService();
        this.registerShortcut("1", {
            description: VCResources.Contents,
            action: () => historyService.addHistoryPoint(VCControlsCommon.VersionControlActionIds.Contents)
        });
        this.registerShortcut("2", {
            description: VCResources.History,
            action: () => historyService.addHistoryPoint(VCControlsCommon.VersionControlActionIds.History)
        });
        this.registerShortcut("t", {
            description: VCResources.ChangesetListPath,
            action: () => this.vcView.startPathEditing()
        });
    }
}

class GitExplorerShortcutGroup extends ExplorerShortcutGroup {
    constructor(protected vcView: ExplorerView, protected repoContext: RepositoryContext) {
        super(vcView, repoContext);

        this.registerShortcut("w", {
            description: VCResources.KeyboardShortcutDescription_SelectBranch,
            action: () => this.vcView.showVersionMenu()
        });
        this.registerShortcut("c b", {
            description: VCResources.KeyboardShortcutDescription_CreateBranch,
            action: () => this.keyboardCreateBranch()
        });
    }

    private keyboardCreateBranch() {
        const gitRepoContext = <GitRepositoryContext>this.repoContext;
        const gitUIService = GitUIService.getGitUIService(gitRepoContext);
        const options = <GitUIService.ICreateBranchOptions>{
            sourceRef: new VCSpecs.GitBranchVersionSpec(GitRefUtility.getRefFriendlyName(gitRepoContext.getRepository().defaultBranch))
        };
        gitUIService.createBranch(options).then(result => {
            if (!result.cancelled) {
                window.location.href = VersionControlUrls.getExplorerUrl(gitRepoContext, null, null, { version: new VCSpecs.GitBranchVersionSpec(result.selectedFriendlyName).toVersionString() });
            }
        }, () => { });
    }
}

export class ExplorerView extends VCViewBase.ViewBase {

    private _$sourcePathTextBox: JQuery;
    private _sourceExplorerTree: VCSourceExplorerTree.Tree;
    private _$branchesContainer: JQuery;
    private _$pageTitleContainer: JQuery;
    private _gitVersionMenu: VCGitVersionSelectorMenu.GitVersionSelectorMenu;
    private _pageTitleMenu: Menus.MenuBar;
    private _clonePopupCreated: boolean = false;
    private _currentItem: VCLegacyContracts.ItemModel;
    private _currentItemVersion: string;
    private _commonPivotFilters: VCCommonPivotFilters.VersionControlCommonPivotFilters;
    private _messageArea: Notifications.MessageAreaControl;
    private _messageItemPath: string;
    private _messageItemVersion: VCContracts.GitVersionDescriptor;
    private _previousParsedState: any;
    private _previousRawState: any;
    private _currentItemIsDirty: boolean;
    private _isGitRepo: boolean;
    private actionCreator: ActionCreator;
    private repositorySource: RepositorySource;
    private itemContentStore: ItemContentStore;
    private pathStore: PathStore;
    private getAggregateState: () => AggregateState;
    private _performance: Performance.IScenarioDescriptor;
    private _isRecordedLatestChangesLoaded: boolean;

    public initializeOptions(options?) {

        const tabs = {},
            tabOptions = {};

        tabs[VCControlsCommon.VersionControlActionIds.Contents] = VCContentsTab.ContentsTab;
        tabs[VCControlsCommon.VersionControlActionIds.Compare] = VCCompareTab.CompareTab;
        tabs[VCControlsCommon.VersionControlActionIds.History] = HistoryNavigationTab;

        tabOptions[VCControlsCommon.VersionControlActionIds.History] = {
            tabName: CustomerIntelligenceConstants.FILES_HISTORYTAB_GIT,
            onFilterUpdated: delegate(this, this._onHistoryFilterUpdated),
            scenarioComplete: () => this._onScenarioComplete(),
        };

        tabOptions[VCControlsCommon.VersionControlActionIds.Contents] = {
            lineLinkingWidgetEnabled: true,
            onScenarioComplete: () => this._onScenarioComplete(),
            onLatestChangesLoaded: () => this._onLatestChangesLoaded(),
        };

        tabOptions[VCControlsCommon.VersionControlActionIds.Compare] = {
            scenarioComplete: () => this._onScenarioComplete(),
        };

        super.initializeOptions($.extend({
            tabs: tabs,
            tabOptions: tabOptions,
            hubContentSelector: ".version-control-item-right-pane",
            pivotTabsSelector: ".vc-explorer-tabs",
            titleElementSelector: ".vc-page-title",
            showPullRequestSuggestion: true
        }, options));
    }

    public initialize() {
        ///<summary>View for the VC Explorer page which allows browsing through VC files and folders</summary>
        let $pivotFilters: JQuery,
            $viewFilters: JQuery;
        this._isGitRepo = (this._repositoryContext.getRepositoryType() === RepositoryType.Git);

        this._performance = Performance.getScenarioManager().startScenarioFromNavigation(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            this._isGitRepo ? "ExplorerViewPerformance" : "ExplorerViewTfvcPerformance",
            true);

        this._customerIntelligenceData.setView(this._isGitRepo ? "GitExplorerView" : "TfvcExplorerView");
        this._performance.addSplitTiming("startedInitialization");

        if (!this._emptyRepository) {
            this._$branchesContainer = this._element.find(".vc-branches-container");
            if (this._isGitRepo) {
                this._gitVersionMenu = <VCGitVersionSelectorMenu.GitVersionSelectorMenu>Controls.BaseControl.createIn(
                    VCGitVersionSelectorMenu.GitVersionSelectorMenu, this._$branchesContainer, <VCGitVersionSelectorMenu.GitVersionSelectorMenuOptions>{
                        onItemChanged: delegate(this, this._onBranchChanged),
                        showVersionActions: VCSourceEditing.EditingEnablement.isSourceEditingFeatureEnabled(),
                        waitOnFetchedItems: true,
                        customerIntelligenceData: this._customerIntelligenceData.clone()
                    });
                this._gitVersionMenu.setRepository(<GitRepositoryContext>this._repositoryContext);
            }

            // TODO: BrWillis 659674 - Remove Clone button code when new nav is default
            if ((this._repositoryContext.getRepositoryType() === RepositoryType.Git) && !this._options.showCloneButtonOnL2Header) {
                this._$pageTitleContainer = this._element.find(".vc-page-title-area");
                this._pageTitleMenu = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar,
                    $(domElem("span", "vc-view-title-menu-container toolbar")).appendTo(this._$pageTitleContainer),
                    { cssClass: "vc-view-title-menu" }
                );

                const menuItems: any[] = [];
                menuItems.push({
                    id: "clone-popup",
                    title: VCResources.CloneAction,
                    text: VCResources.CloneAction,
                    icon: "bowtie-icon bowtie-clone-to-desktop",
                    showText: true,
                    cssClass: "vc-clone-menu-button-main-view",
                    action: () => {
                        VSS.using(["VersionControl/Scripts/CodeHubCloneRepositoryAction"], (CodeHubCloneRepositoryAction: typeof CodeHubCloneRepositoryAction_NO_REQUIRE) => {
                            if (!this._clonePopupCreated) {
                                CodeHubCloneRepositoryAction.createCloneRepositoryPopup(this._pageTitleMenu.getItem("clone-popup")._element, {
                                    repositoryContext: this._repositoryContext,
                                    openInVsLink: this._options.openInVsLink,
                                    sshEnabled: this._options.sshEnabled,
                                    sshUrl: this._options.sshUrl,
                                    cloneUrl: this._options.cloneUrl,
                                    branchName: this.getState().versionSpec.branchName,
                                    openedFromL2Header: false
                                });
                                this._clonePopupCreated = true;
                            }
                        });
                    }
                });

                this._pageTitleMenu.updateItems(menuItems);
            }

            this._commonPivotFilters = <VCCommonPivotFilters.VersionControlCommonPivotFilters>Controls.Enhancement.enhance(VCCommonPivotFilters.VersionControlCommonPivotFilters, this._element.find(".right-hub-content .hub-pivot > .filters"), {
                repositoryContext: this._repositoryContext
            });

            this._sourceExplorerTree = <VCSourceExplorerTree.Tree>Controls.Enhancement.enhance(VCSourceExplorerTree.Tree, this._element.find(".source-explorer-tree"), {
                customerIntelligenceData: this._customerIntelligenceData.clone()
            });
            this._sourceExplorerTree._bind("source-item-path-changed", delegate(this, this._onSourceItemPathChange));

            this.initializeFlux();

            this._element.bind(VCSourceExplorerGridOrTreeMenuItemClickedEvent.name, delegate(this, this._onContextMenuItemClick));

            VCSourceEditingEvents.Events.subscribeItemRenamedEvent((newVersion: VCSpecs.VersionSpec, comment: string, originalItemPath: string, originalItemVersion: string, newItemPath: string) => {
                this._handleItemCommitedEvent(newVersion, comment, originalItemPath, originalItemVersion, newItemPath);
            });
            VCSourceEditingEvents.Events.subscribeItemDeletedEvent((newVersion: VCSpecs.VersionSpec, comment: string, originalPath: string, originalVersion: string) => {
                this._handleItemCommitedEvent(newVersion, comment, originalPath, originalVersion, null);
            });
            VCSourceEditingEvents.Events.subscribeItemsUploadedEvent((newVersion: VCSpecs.VersionSpec, comment: string, folderPath: string, fileNames: string[]) => {
                this._showCheckinSuccessMessage(newVersion, comment, this.getState().path);
                if (this._currentItem && this._currentItem.serverItem === folderPath) {
                    this._currentItem = null;
                    this.refreshCurrentTab();
                }
            });
            VCSourceEditingEvents.Events.subscribeItemEditedEvent((newVersion: VCSpecs.VersionSpec, comment: string, itemPath: string, originalVersion: string, newBranchVersion?: string, repositoryId?: string) => {
                // Git can have multiple repositories. Before showing item edited notification, verify the repository id
                // Otherwise adding files on a create repository dialog, causes a flicker before navigating.
                if (repositoryId == null || this._repositoryContext.getRepositoryId() === repositoryId) {
                    this._showCheckinSuccessMessage(newVersion, comment, this.getState().path, newBranchVersion);
                }

                if (this._currentItem && itemPath === this._currentItem.serverItem) {

                    // Current item has been saved. Reset the item so that it is fetched at the next view.
                    this._currentItem = null;
                    this._previousParsedState = null;
                    this._previousRawState = null;
                    this._setCurrentFileDirtyState(false);

                    if (this.getState().newFile || (newBranchVersion && newBranchVersion !== this._currentItemVersion)) {
                        // A new file was saved. Re-navigate (clearing the newFile state)
                        // And/or the file was saved to a new git branch, so navigate to that branch.
                        this._currentItemVersion = newBranchVersion || this._currentItemVersion;
                        this._navigateToPath(itemPath, true, this._currentItemVersion);
                    }
                }
            });
            VCSourceEditingEvents.Events.subscribeItemDirtyStateChangedEvent((isDirty: boolean, itemPath: string, originalItemVersion: string) => {
                if (this._currentItem && this._currentItem.serverItem === itemPath) {
                    this._setCurrentFileDirtyState(isDirty);
                }
            });
            VCSourceEditingEvents.Events.subscribeRevertEditedItemEvent((itemPath: string, itemVersion: string) => {
                if (this._currentItem && this._currentItem.serverItem === itemPath
                    && this.getState().newFile && this.getState().editMode && !(this._previousParsedState && this._previousParsedState.newFile && !this._previousParsedState.editMode)) {
                    // New file which started in edit mode was reverted. Navigate away from this file (to the parent folder).
                    // If the new file started in non-edit mode, we will do nothing and stay at the file in non-edit mode.
                    this._navigateToPath(VersionControlPath.getFolderName(itemPath), true, this._currentItemVersion);
                }
            });
            VCSourceEditingEvents.Events.subscribeEditModeChangedEvent((itemPath: string, itemVersion: string, editMode: boolean) => {
                const state = this.getState();

                // A Tfvc edit results in a different changeset itemVersion, as expected.  A Git edit results in the same branch itemVersion unless
                // the user chose to commit and navigate to a new branch. So, we need to check for the case of committing to a new Git branch
                // to avoid a possible race condition with the subscribeItemEditedEvent navigation.
                const isGitBranchChange = this._repositoryContext.getRepositoryType() === RepositoryType.Git && state.version !== itemVersion;
                if (state.path === itemPath && !isGitBranchChange && !state.newFile && state.editMode !== editMode) {
                    Navigation_Services.getHistoryService().addHistoryPoint(null, {
                        editMode: editMode ? "true" : null,
                        /* No annotation */
                        annotate: null,
                        /* No line decoration */
                        line: null,
                        lineEnd: null,
                        lineStyle: null,
                        lineTooltip: null,
                        lineStartColumn: null,
                        lineEndColumn: null,
                    });
                }
            });
            VCSourceEditingEvents.Events.subscribeRefreshItemEvent((itemPath: string, itemVersion: string) => {
                if (this._currentItem && this._currentItem.serverItem === itemPath) {
                    // Current item has changed externally. Reset the item so that it is fetched/refreshed at the next view.
                    this._currentItem = null;
                    this._previousParsedState = null;
                    this._previousRawState = null;
                    this._setCurrentFileDirtyState(false);
                    this.refreshCurrentTab();
                }
            });
        }

        super.initialize();
        this._performance.addSplitTiming("initialized");

        if (this._isGitRepo) {
            new GitExplorerShortcutGroup(this, this._repositoryContext)
        }
        else {
            new ExplorerShortcutGroup(this, this._repositoryContext);
        }

        startCodeSearchEngagements("CodeExplorer", this._tfsContext.isHosted);

        if (this._isGitRepo) {
            queueModulePreload([
                "VersionControl/Scenarios/History/GitHistory/Components/Tabs/HistoryTab",
                "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator",
                "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub",
                "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource",
                "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub",
            ]);
        } else {
            queueModulePreload("VersionControl/Scripts/Views/Tabs/HistoryTab");
        }
}

    private initializeFlux(): void {
        this.repositorySource = new RepositorySource(
            this._tfsContext,
            this._options.gitRepository,
            this._defaultGitBranchName,
            this._deletedUserDefaultBranchName);

        const actionsHub = new ActionsHub();
        const isPathSearchEnabled = this._isGitRepo;
        const lazyPathsSearchSource = isPathSearchEnabled ? new LazyPathsSearchSource(this._repositoryContext) : undefined;

        // Override methods to avoid duplicate REST calls in the standard explorer page.
        // They are necessary on the newexplorer page, so I prefer not adding flags for a temporary solution.
        this.repositorySource.getItems = () => Q([]);
        this.repositorySource.getChangeListsForChildItems = () => Q([]);
        this.repositorySource.getGitLastChangeForChildItems = () => Q({ items: [] }) as any;

        const noOpHistoryCommitsSource: any = {
            getCommitsFromJsonIsland: () => undefined,
            getCommitsFromDataProvider: () => undefined,
        };

        const noOpHistoryCommitsPermissionSource: any = {
            getPermissionsAsync: () => undefined,
            refreshPermissions: () => undefined,
        };

        const storesHub = new StoresHub(actionsHub, this.repositorySource.isGit());
        this.getAggregateState = storesHub.getAggregateState;
        this.actionCreator = new ActionCreator(
            actionsHub,
            {
                repository: this.repositorySource,
                committing: new CommittingSource(),
                page: new PageSource(this, this._repositoryContext),
                statuses: new StatusesSource(this._repositoryContext),
                search: lazyPathsSearchSource,
                dialogs: new EditingDialogsSource(this._repositoryContext),
                historyCommits: noOpHistoryCommitsSource,
                permissions: noOpHistoryCommitsPermissionSource,
            },
            this.getAggregateState);

        this.actionCreator.changeRepository();

        VCPathExplorerContainer.renderInto(
            $(".vc-path-explorer-container")[0],
            {
                onEditingStart: this.startPathEditing,
                onInputTextEdit: this.actionCreator.editPathText,
                onPathChange: (path: string, version?: string, source?: string) => {
                    this._publishPathChangeTelemetry(source);
                    this.actionCreator.changePath(path, version, undefined);
                },
                onEditingCancel: this.actionCreator.cancelPathEditing,
                pathStore: storesHub.pathStore,
                onSearchItemSelection: this.actionCreator.selectPathSearchItem,
                pathSearchStore: isPathSearchEnabled ? storesHub.pathSearchStore : null,
            });

        VCStatusBadge.renderStatusTextIconInto(
            this._element.find(".vc-status-container")[0],
            {
                actionCreator: this.actionCreator,
                storesHub,
            });

        // TODO: BrWillis 659674 - This can go away when new nav is default
        this._element.find(".vc-status-container").addClass(this._options.showCloneButtonOnL2Header ? "new-nav" : "old-nav");

        storesHub.getCompositeStore(["path"]).addChangedListener(() => {
            if (this.getState().path !== this.getAggregateState().path) {
                this._navigateToPath(this.getAggregateState().path, true, this.getState().version);
            }
        });

        this.itemContentStore = storesHub.itemContentStore;
        this.pathStore = storesHub.pathStore;
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        /// <summary>
        /// Parse the state info and fetch any artificacts necessary to render the tab/view. Invoke the 'callback'
        /// method with the new state info object when the state information has been successfully parsed.
        /// </summary>
        /// <param name="action" type="String">The action parameter (_a) in the url hash</param>
        /// <param name="rawState" type="Object">The raw state info from the hash url for the new navigation</param>
        /// <param name="callback" type="IResultCallback">
        ///    Callback that should be called when the state was successfully parsed. The callback takes 2 parameters: the tab id (typically
        ///    the action), and the parsed state info object.
        ///
        ///    callback(tabId, parsedStateInfo);
        ///
        /// </param>

        let state: any = {},
            title: string;

        this.setState(state);
        this._checkForDeletedDefaultBranch(rawState);
        state.repositoryContext = this._repositoryContext;

        if (this._emptyRepository) {
            this._showEmptyRepositoryView();
            this.setHubPivotVisibility(false);
            return;
        }
        else {
            this.setHubPivotVisibility(true);
        }

        action = action || VCControlsCommon.VersionControlActionIds.Contents;

        state.path = VersionControlPath.normalizePath(rawState.path, this._isGitRepo, this._repositoryContext.getRootPath());
        state.version = rawState.version;

        state.fullScreenMode = Utils_String.localeIgnoreCaseComparer(rawState.fullScreen, "true") === 0;
        this.actionCreator.toggleFullScreen(state.fullScreenMode);

        state.annotate = Utils_String.localeIgnoreCaseComparer(rawState.annotate, "true") === 0;
        state.editMode = Utils_String.localeIgnoreCaseComparer(rawState.editMode, "true") === 0;
        state.newFile = Utils_String.localeIgnoreCaseComparer(rawState.newFile, "true") === 0;
        state.createIfNew = Utils_String.localeIgnoreCaseComparer(rawState.createIfNew, "true") === 0;
        state.anchor = rawState.anchor;
        state.scrollToAnchor = rawState.scrollToAnchor;
        state.line = rawState.line;
        state.lineEnd = rawState.lineEnd;
        state.lineStyle = rawState.lineStyle;
        state.lineTooltip = rawState.lineTooltip;
        state.lineStartColumn = rawState.lineStartColumn;
        state.lineEndColumn = rawState.lineEndColumn;
        state.scenario = rawState.scenario;

        if (rawState.historySearchCriteria) {
            state.historySearchCriteria = JSON.parse(rawState.historySearchCriteria);
        }

        // Check for navigate away from an in-progress edit
        if (this._previousParsedState && (this._previousParsedState.editMode || this._previousParsedState.newFile)) {

            // Check for: Turn off edit mode or switch path or switch tab
            if (!state.editMode || state.path !== this._previousParsedState.path || action !== VCControlsCommon.VersionControlActionIds.Contents) {

                // If currently dirty, prompt for unsaved changes
                if (this._currentItemIsDirty) {
                    if (!confirm(Utils_String.format(VCResources.UnsavedFileNavigateAwayFormat, VersionControlPath.getFileName(this._previousParsedState.path)))) {
                        this._redirectNavigation(VCControlsCommon.VersionControlActionIds.Contents, this._previousRawState);
                        return;
                    }
                }

                // Mark file as not dirty and not in edit mode
                VCSourceEditingEvents.Events._triggerRevertEditedItemEvent(this._previousParsedState.path, this._previousParsedState.version);
                VCSourceEditingEvents.Events._triggerItemDirtyStateChangedEvent(false, this._previousParsedState.path, this._previousParsedState.version);
            }
        }

        // If the "&anchor=[name]" option is passed, rename it to "&scrollToAnchor=[name]".
        // Link hrefs should always use the "anchor" option.
        // This mechanism is a workaround for a limitation in how VSTS does navigation. If a user
        //  clicks on a link to exactly the same URL as the window's current URL, no navigation
        //  event is raised at all. The standard behavior of anchor links is to re-scroll to the
        //  target anchor if the user clicks on a link, scrolls, and then clicks on the same link
        //  again. Renaming the option ensures that application will always raise a navigation
        //  event for every time a link to an anchor is clicked.
        if (state.anchor) {
            const newState: any = $.extend({}, rawState, {
                anchor: null,
                scrollToAnchor: state.anchor
            });
            this._redirectNavigation(VCControlsCommon.VersionControlActionIds.Contents, newState, true);
            return;
        }

        // Parse out the version spec
        if (state.version) {
            state.versionSpec = VCSpecs.VersionSpec.parse(state.version);
        } else if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
            state.versionSpec = new VCSpecs.LatestVersionSpec();
            state.version = state.versionSpec.toVersionString();
        } else if (this._repositoryContext.getRepositoryType() === RepositoryType.Git && this._defaultGitBranchName) {
            state.versionSpec = new VCSpecs.GitBranchVersionSpec(this._defaultGitBranchName);
            state.version = state.versionSpec.toVersionString();
        }

        if (this._repositoryContext.getRepositoryType() === RepositoryType.Git && state.versionSpec) {
            this._gitVersionMenu.setSelectedVersion(state.versionSpec);
        } else {
            VCChangesetVersion.renderInto(
                this._$branchesContainer[0],
                {
                    version: state.version,
                    onShowLatestClick: () => this._onBranchChanged(new VCSpecs.LatestVersionSpec()),
                });
        }

        // Set the title of the page
        this._element.removeClass("no-hub-title-text");
        if (state.versionSpec) {
            const versionSpec: VCSpecs.VersionSpec = state.versionSpec;
            if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                if (!state.path || state.path === this._repositoryContext.getRootPath()) {
                    // The title already includes the repository name from the repositories dropdown, so only
                    // set the window/document title here. Leave the hub title empty.
                    title = versionSpec.formatPath(this._getFriendlyPathForTooltip(state.path));
                    this.setWindowTitle(title);
                    this._element.addClass("no-hub-title-text");
                }
                else {
                    this.setWindowTitle(this._getFriendlyPathTitle(state.path));
                }
            }
            else {
                this.setWindowTitle(versionSpec.formatPath(this._getFriendlyPathTitle(state.path)));
            }
        }
        else {
            this.setWindowTitle(state.path);
        }

        // Remember the state
        this._previousParsedState = state;
        this._previousRawState = rawState;

        if (this._currentItem && this._currentItem.serverItem === state.path && this._currentItemVersion === state.version) {
            // The selected item has not changed.
            state.item = this._currentItem;

            if (this.getAggregateState().path !== state.path || this.getAggregateState().version !== state.version) {
                this.actionCreator.changePath(state.path, state.version, undefined);
            }

            callback(action, state);
            return;
        }

        this._currentItemIsDirty = false;

        if (state.newFile) {
            this._currentItem = <VCLegacyContracts.ItemModel>{
                serverItem: state.path,
                version: state.version,
                contentMetadata: <VCLegacyContracts.FileContentMetadata>{
                    extension: VersionControlPath.getFileExtension(state.path)
                }
            };
            state.item = this._currentItem;
            this._currentItemVersion = state.version;

            UrlPageHandler.applyNavigatedUrl(this.actionCreator, rawState, this.getAggregateState());

            VSS.using(["VersionControl/Scripts/TFS.VersionControl.FileDefaultContentProvider"], (VCFileDefaultContentProvider: typeof _VCFileDefaultContentProvider) => {
                const fileExtension = VersionControlPath.getFileExtension(state.item.serverItem);
                const defaultContentProvider = VCFileDefaultContentProvider.FileDefaultContentProviderFactory
                    .getProvider(fileExtension, this._repositoryContext.getRepositoryType(), state.scenario);
                if (defaultContentProvider) {
                    state.initialContent = defaultContentProvider.getContent({
                        repositoryContext: this._repositoryContext,
                        item: state.item,
                        repositoryExists: true,
                        showError: true,
                    });
                }

                callback(action, state);
            });

            return;
        }

        // Fetch the item
        this._repositoryContext.getClient().beginGetItem(this._repositoryContext, state.path, state.version, {
            recursionLevel: VCLegacyContracts.VersionControlRecursionType.OneLevelPlusNestedEmptyFolders,
            includeContentMetadata: true,
            includeVersionDescription: false
        }, (item) => {
            if (this._performance.isActive()) {
                this._performance.addSplitTiming("loadedItems");

                if (this._isGitRepo) {
                    this._performance.addData({
                        numberOfSeededGitItems: VCGitItemFromJsonIsland.GitItemFromJsonIsland.seededItemCount
                    });
                }
            }

            state.item = item;
            this._currentItem = item;
            this._currentItemVersion = state.version;

            this.actionCreator.changePath(state.path, state.version, undefined);
            // HACK to update the latest item in itemContentStore to support the old explorer page
            if (this.getAggregateState().path === state.path && this.getAggregateState().version === state.version) {
                this.itemContentStore.loadItem({ item, readMeItem: undefined, areFolderLatestChangesRequested: false });
            }

            callback(action, state);

            if (action === VCControlsCommon.VersionControlActionIds.Contents && item.isFolder) {
                this._onScenarioComplete();
            }
        }, delegate(this, function (error) {

            if (state.createIfNew) {
                const newState: any = $.extend({}, rawState, {
                    createIfNew: null,
                    newFile: true,
                    scenario: VCFileDefaultContentProviderScenario.Scenario.MissingFile
                });
                this._redirectNavigation(VCControlsCommon.VersionControlActionIds.Contents, newState, true);
            } else {
                this.showError(error);
                this.actionCreator.changePath(state.path, state.version, undefined);

                if (this._performance.isActive()) {
                    this._performance.abort();
                }
            }
        }));
    }

    private _onScenarioComplete(): void {
        if (this._performance.isActive()) {
            this._performance.addSplitTiming("renderedItems");
            this._performance.end();
        }
    }

    private _onLatestChangesLoaded(): void {
        if (!this._isRecordedLatestChangesLoaded) {
            this._performance.addSplitTiming("latestChangesFetched");
            this._isRecordedLatestChangesLoaded = true;
        }
    }

    public onNavigate(state: any) {
        /// <summary>Function invoked when a page/hash navigation has occurred</summary>
        /// <param name="state" type="Object">Hash object containing the hash-url parameters</param>

        const currentAction = this.getCurrentAction(),
            currentState = this.getRawState();

        if (!this._emptyRepository) {
            this._sourceExplorerTree.setRepositoryAndVersion(state.repositoryContext, state.version, !state.editMode);
            if (state.newFile) {
                this._sourceExplorerTree.addUnsavedItem(state.item, true);
            }

            this._sourceExplorerTree.setSelectedItem(state.item, error => { });

            this._commonPivotFilters.updateViewFilters(this);

            // The messageArea is used to show commit information.  Clear it if the user has navigated away from the relevant context.
            if (this._messageArea && ((this._messageItemPath && this._messageItemPath !== state.path) || (this._messageItemVersion && this._messageItemVersion !== state.version))) {
                this._messageArea.clear();
                this._messageItemPath = null;
                this._messageItemVersion = null;
            }
        }
    }

    public getTabVisibility(tabId: any, currentTabId: string, rawState: any, parsedState: any): boolean {

        if (Utils_String.localeIgnoreCaseComparer(tabId, VCControlsCommon.VersionControlActionIds.History) === 0) {
            if (parsedState.editMode || parsedState.newFile) {
                return false;
            }
        }
        else if (Utils_String.localeIgnoreCaseComparer(tabId, VCControlsCommon.VersionControlActionIds.Compare) === 0) {

            // Compare tab is only visible for Files
            if (!parsedState.item || parsedState.item.isFolder || parsedState.editMode || parsedState.newFile) {
                return false;
            }
        }

        return super.getTabVisibility(tabId, currentTabId, rawState, parsedState);
    }

    /**
     *  Show the version picker, for keyboard accessibility.
     */
    public showVersionMenu() {
        this._gitVersionMenu._showPopup();
    }

    /**
     * Sets the focus in the Path Explorer and makes it into edit mode.
     */
    public startPathEditing = (): void => {
        publishTelemetry(
            CustomerIntelligenceConstants.SOURCEEXPLORERVIEW_PATH_EDIT_START,
            {
                repositoryType: RepositoryType[this._repositoryContext.getRepositoryType()],
            }
        );

        this.actionCreator.startPathEditing();
    }

    private _publishPathChangeTelemetry(source: string, immediate?: boolean): void {
        publishTelemetry(
            CustomerIntelligenceConstants.SOURCEEXPLORERVIEW_PATHCONTROL_PATH_CHANGE,
            {
                repositoryType: RepositoryType[this._repositoryContext.getRepositoryType()],
                source: source
            },
            immediate);
    }

    private _onContextMenuItemClick(e?: VCSourceExplorerGridOrTreeMenuItemClickedEvent.Event, eventArgs?: VCSourceExplorerGridOrTreeMenuItemClickedEvent.CommandEventArgs) {
        /// <summary>Context menu item click handler.</summary>
        /// <param name="e" type="Object">click event</param>
        /// <param name="args" type="Object">selected menu item arguments.</param>
        const command = eventArgs.get_commandName();
        const args = eventArgs.get_commandArgument();

        // Checking to see if the command we can handle is executed
        switch (command) {
            case CommonMenuItems.ITEM_SECURITY_ACTION:
                publishTelemetry(CustomerIntelligenceConstants.SOURCEEXPLORER_SECURITY);
                this._showSecurityPermissions(args.item.path, args.item.path);
                break;
        }
    }

    private _onSourceItemPathChange(e?: any, args?: any): boolean {
        /// <summary>Handles favorite path changes.</summary>
        /// <param name="e" type="Object">change event</param>
        /// <param name="args" type="Object">favorite path arguments.</param>
        /// <returns type="Boolean">false</returns>
        this._publishPathChangeTelemetry(CustomerIntelligenceConstants.PATHCHANGESOURCE_SOURCE_EXPLORER_TREE, true);
        this._navigateToPath(args.path, args.folder, args.version || this.getState().version);

        return false;
    }

    private _navigateToPath(path: string, isFolder: boolean, version: string) {
        /// <summary>Navigate to the new path</summary>
        /// <param name="path" type="String">New path</param>
        /// <param name="isFolder" type="Boolean">Is the path for a folder</param>
        /// <param name="version" type="String">Version</param>
        let action = this.getCurrentAction(),
            pathUrl: string,
            extraParams: any = {};

        if (isFolder && !VCControlsCommon.VersionControlActionIds.supportsFolders(action)) {
            action = VCControlsCommon.VersionControlActionIds.Contents;
        }

        if (action === VCControlsCommon.VersionControlActionIds.History && this.getState().historySearchCriteria) {
            extraParams.historySearchCriteria = JSON.stringify(this.getState().historySearchCriteria);
        }

        pathUrl = VCControlsCommon.getFragmentAction(action, path, version, extraParams);
        if (Utils_UI.BrowserCheckUtils.isMsie() && (window.location.href.length + pathUrl.length) >= 2048) {
            // A very long path will exceed the maximum url query length for most browsers
            alert(Utils_String.format(VCResources.ErrorWebPathTooLong, 2048));
            return;
        }

        if (this.isPathOfDifferentTeamProject(path)) {
            const projectName = path.split("/")[1];
            const otherTfsContext = this.createSiblingTfsContext(projectName);
            pathUrl = otherTfsContext.getActionUrl(null, "versionControl", null) + pathUrl;
        }

        window.location.href = pathUrl;
    }

    private isPathOfDifferentTeamProject(path: string): boolean {
        if (!path || path.substr(0, 2) !== "$/") {
            return false;
        }

        const root = this._repositoryContext.getRootPath();
        return root !== path.substr(0, root.length);
    }

    private createSiblingTfsContext(projectName: string): TfsContext {
        return new TfsContext({
            account: this._tfsContext.contextData.account,
            collection: this._tfsContext.contextData.collection,
            host: this._tfsContext.contextData.host,
            project: { id: null, name: projectName },
            team: this._tfsContext.contextData.team,
            user: this._tfsContext.contextData.user,
        });
    }

    private _onBranchChanged(selectedVersion: VCSpecs.VersionSpec) {
        /// <summary>Invoked when the branch value is changed</summary>
        /// <param name="changeInfo" type="Object">Information about the new selection</param>

        const state = this.getState(),
            action = this.getCurrentAction(),
            selectedVersionText = selectedVersion ? selectedVersion.toVersionString() : "";

        this._updateUserDefaultBranchName(selectedVersion);

        this.actionCreator.changePath(state.path, selectedVersionText, undefined);

        if (state.item) {
            // Check if the currently selected item exists in the newly selected branch
            this._repositoryContext.getClient().beginGetItem(this._repositoryContext, state.item.serverItem, selectedVersionText, null, (item) => {
                // Item exists: Go to this item in the new branch
                window.location.href = VCControlsCommon.getFragmentAction(action, state.item.serverItem, selectedVersionText);
            }, (error) => {
                // Item does not exist: Go to the root in the new branch
                Navigation_Services.getHistoryService().addHistoryPoint(VCControlsCommon.VersionControlActionIds.supportsFolders(action) ? action : VCControlsCommon.VersionControlActionIds.Contents, {
                    path: "",
                    version: selectedVersionText
                });
            });
        }
        else {
            Navigation_Services.getHistoryService().addHistoryPoint(action, { version: selectedVersionText });
        }
    }

    private _onHistoryFilterUpdated(searchCriteria: VCContracts.ChangeListSearchCriteria) {
        this.getState().historySearchCriteria = searchCriteria;
        this._navigateToPath(this.getState().path, this._currentItem.isFolder, this.getState().version);
        return false;
    }

    private _handleItemCommitedEvent(newVersion: VCSpecs.VersionSpec, comment: string, originalItemPath: string, originalItemVersion: string, newItemPath: string) {
        const currentItem = this._currentItem;
        let navigateToPath: string = null;

        // Reset the cached current item
        this._currentItem = null;

        if (newItemPath) {
            // An item was renamed. Navigate to the new path of the renamed item.
            navigateToPath = newItemPath;

            // Reload the source explorer tree. We could do something fancier here, but this
            // should get the user back in a state that is reasonable.
            this._sourceExplorerTree.reload();
        }
        else {
            if (currentItem) {
                if (currentItem.serverItem === originalItemPath) {
                    // Delete of the current item - navigate to the parent folder
                    navigateToPath = VersionControlPath.getContainingFolder(originalItemPath, this._repositoryContext.getRootPath());
                }
                else if (currentItem.serverItem.indexOf(originalItemPath + "/") === 0) {
                    // Delete of a parent item of the item being viewed. Navigate to the deleted item's parent folder.
                    navigateToPath = VersionControlPath.getContainingFolder(originalItemPath, this._repositoryContext.getRootPath());
                }
            }
        }

        this._showCheckinSuccessMessage(newVersion, comment, navigateToPath || this.getState().path);

        if (navigateToPath) {
            this._navigateToPath(navigateToPath, true, this._currentItemVersion);
        }
        else {
            this.refreshCurrentTab();
        }
    }

    private _setCurrentFileDirtyState(isDirty: boolean) {
        this._currentItemIsDirty = isDirty;
        this.pathStore.changeDirty(isDirty);
    }

    private _showCheckinSuccessMessage(newVersion: VCSpecs.VersionSpec, comment: string, pathToShowMessageFor: string, newBranchVersion?: string) {
        const $container = $(".hub-splitter > .rightPane");
        let prefixMessage;
        let linkText;
        let linkHref;
        let linkTooltip;

        this._messageItemPath = pathToShowMessageFor;
        this._messageItemVersion = null;

        if (!this._messageArea) {
            this._createMessageArea($container);
        }

        if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
            const commitSpec = <VCSpecs.GitCommitVersionSpec>newVersion;
            if (newBranchVersion) {
                let branchName = (<VCSpecs.GitBranchVersionSpec>VCSpecs.VersionSpec.parse(newBranchVersion)).branchName;
                branchName = Utils_UI.htmlEncode(branchName);
                prefixMessage = Utils_String.format(VCResources.CommitToNewBranchSuccessMessageHtml, branchName);
            }
            else {
                prefixMessage = VCResources.CommitSuccessMessageHtml;
            }
            linkHref = VersionControlUrls.getCommitUrl(<GitRepositoryContext>this._repositoryContext, commitSpec.commitId);
            linkText = Utils_String.format(VCResources.CommitSuccessLinkFormat, commitSpec.getShortCommitId(), VCCommentParser.Parser.getShortComment(comment, 80, true));
            linkTooltip = VCResources.CommitTooltipMessage;
        }
        else {
            const changesetSpec = <VCSpecs.ChangesetVersionSpec>newVersion;
            prefixMessage = VCResources.CheckinSuccessMessageHtml;
            linkHref = VersionControlUrls.getChangesetUrl(changesetSpec.changeset);
            linkText = Utils_String.format(VCResources.CheckinSuccessLinkFormat, changesetSpec.changeset, VCCommentParser.Parser.getShortComment(comment, 80, true));
            linkTooltip = VCResources.CheckinSuccessfulMessage;
        }

        this._messageArea.setMessage({
            type: Notifications.MessageAreaType.Info,
            content: this._createCheckinMessageHtmlContent(prefixMessage, linkHref, linkTooltip, linkText)
        });

        $container.addClass("vc-with-message");
    }

    private _createCheckinMessageHtmlContent(prefixMessage: string, linkHref: string, linkTooltip: string, linkText: string): JQuery {
        const $contentHtml = $(domElem("div")).addClass("checkin-success-message");
        const $linkIconElement = $(domElem("div", "bowtie-icon bowtie-tfvc-commit"));
        const $linkSpanElement = $(domElem("span")).text(linkText);

        // Populate non-anchor tag message
        $(domElem('span')).text(prefixMessage)
            .appendTo($contentHtml);

        // Populate anchor tag content
        $(domElem('a')).attr("href", linkHref)
            .attr("title", linkTooltip)
            .append($linkIconElement)
            .append($linkSpanElement)
            .appendTo($contentHtml);

        return $contentHtml;
    }

    private _createMessageArea($container: JQuery) {
        const $messageContainer = $(domElem("div", "vc-message-container")).appendTo($container);
        this._messageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $messageContainer, {
            showDetailsLink: false,
            showHeader: false,
            showIcon: true
        });
        this._messageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, (e) => {
            $container.removeClass("vc-with-message");
        });
    }
}

function publishTelemetry(featureName: string, data: IDictionaryStringTo<any> = {}, immediate?: boolean) {
    Telemetry.publishEvent(new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, featureName, data), immediate);
}

VSS.classExtend(ExplorerView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(ExplorerView, ".versioncontrol-explorer-view");
