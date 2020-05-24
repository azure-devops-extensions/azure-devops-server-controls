/// <amd-dependency path='VSS/LoaderPlugins/Css!ChangeListView' />
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Q from "q";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { WebPageDataService } from "VSS/Contributions/Services";
import { BaseControl, Enhancement } from "VSS/Controls";
import { NavigationViewTab, PivotView, IPivotViewItem } from "VSS/Controls/Navigation";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Performance from "VSS/Performance";
import * as VSS_Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import { GitCommitPermissionsStore } from "VersionControl/Scenarios/ChangeDetails/GitCommit/GitCommitPermissionsStore";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { getShortCommitId } from "VersionControl/Scripts/CommitIdHelper";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as SignalRUtils from "VersionControl/Scripts/Utils/SignalRUtils";
import { ViewBase } from "VersionControl/Scripts/Views/BaseView";

import {
    ChangeDetailsPerfScenarios,
    ChangeDetailsPerfSplitScenarios,
    addPerformanceScenarioSplitTiming,
    abortPerformanceScenario,
    getOrCreatePerformanceScenario
} from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import { findChange } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";
import {
    ChangeDetailsViewState,
    VCChangesSummaryTab,
    VCCompareTab,
    VCContentsTab,
    ChangeListViewShortcutGroup,
    getPivotViewItem,
    getDiscussionAdapter,
} from "VersionControl/Scenarios/ChangeDetails/ChangeListView";
import { ChangeListLeftPanel } from "VersionControl/Scenarios/ChangeDetails/Components/ChangeListLeftPanel";
import { CommitDetailsHeaderPanel } from "VersionControl/Scenarios/ChangeDetails/Components/CommitDetailsHeaderPanel";
import * as ChangeDetailsPage from "VersionControl/Scenarios/ChangeDetails/Components/Page";
import { RightPanelSummaryContainer } from "VersionControl/Scenarios/ChangeDetails/Components/RightPanelSummaryContainer";
import * as CommitDiffSummaryTab from "VersionControl/Scenarios/ChangeDetails/Components/Tabs/CommitDiffSummaryTab";
import { DiscussionSetup } from "VersionControl/Scenarios/ChangeDetails/DiscussionSetup";
import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionCreator";
import { ActionsHub, ICommitDetailsReadPageData } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/StoresHub";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { ChangeListViewSource } from "VersionControl/Scenarios/ChangeDetails/Sources/ChangeListViewSource";

import { ActionsHub as DiscussionActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { DiscussionAdapter } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionManagerStore";

import "VSS/LoaderPlugins/Css!VersionControl/NewChangeList";

import { createArtifactFromVersion } from "VersionControl/Scripts/ArtifactHelper";
import { getGitActionUrl } from "VersionControl/Scripts/VersionControlUrls";
import { NotFoundComponent } from "VersionControl/Scenarios/History/NotFoundComponent";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { CommitsHubRoutes } from "VersionControl/Scenarios/History/HistoryPushesRoutes";

interface CommitDetailsPageProps extends IChangeDetailsPropsBase {
    storesHub: StoresHub;
    actionCreator: ActionCreator;
}

// shim for commit diff summary tab -> react rendering
// Exporting for testing
export class VCCommitDiffSummaryTab extends NavigationViewTab {
    private _customerIntelligenceData: CustomerIntelligenceData;
    private _hasComponent: boolean;

    public initialize(): void {
        super.initialize();

        this._customerIntelligenceData = (this._options.customerIntelligenceData) ? this._options.customerIntelligenceData : (new CustomerIntelligenceData());
        this._customerIntelligenceData.setTab(CustomerIntelligenceConstants.CHANGELIST_DETAILS_VIEW_COMMIT_DIFF_SUMMARY_TAB_FEATURE);
    }

    public onNavigate(rawState: {}, parsedState: ChangeDetailsViewState): void {
        if (!this._hasComponent) {
            const performanceScenario = getOrCreatePerformanceScenario(this._options.performanceScenario, ChangeDetailsPerfScenarios.CommitDiffSummary);
            addPerformanceScenarioSplitTiming(performanceScenario, ChangeDetailsPerfSplitScenarios.CommitDiffSummaryTabLoadBegin);

            CustomerIntelligenceData.publishFirstTabView(CustomerIntelligenceConstants.CHANGELIST_DETAILS_VIEW_COMMIT_DIFF_SUMMARY_TAB_FEATURE, parsedState, this._options);

            const commitDiffSummaryTabProps: CommitDiffSummaryTab.ICommitDiffSummaryTabProps = {
                customerIntelligenceData: this._customerIntelligenceData,
                performanceScenario: performanceScenario,
                storesHub: this._options.storesHub,
                currentAction: this._options.storesHub.urlParametersStore.currentAction,
                fullScreenModeChangedCallBack: this._options.actionCreator.toggleFullScreen,
            };

            CommitDiffSummaryTab.renderTab(this._element[0], commitDiffSummaryTabProps);

            this._hasComponent = true;
        }
    }

    protected _dispose(): void {
        ReactDOM.unmountComponentAtNode(this._element[0]);

        super._dispose();
    }
}

export class CommitDetailsView extends ViewBase {
    private _actionCreator: ActionCreator;
    private _storesHub: StoresHub;

    // For Git merge commits: we have parent tabs to allow diffing with each parent commit (tabId = action, example: diffparent2)
    private _gitMergeChangeList: VCLegacyContracts.GitCommit;       // A typed version of this._currentChangeList

    // We are in the context of diffing a Git merge commit with one of its parents, and this is the current parent key (example: diffparent2)
    private _currentGitMergeParentTabId: string;
    private _lastSummaryAction: string;     // Used to reset the path if no matches are found after switching summary actions (summary, diffparent1, diffparent2, etc.)

    // perf telemetry
    private _changelistPerformanceScenario: Performance.IScenarioDescriptor;

    private _changeListViewShortcutGroup: ChangeListViewShortcutGroup;
    private _changelistViewSource: ChangeListViewSource;
    private _tabIds: string[];

    private _discussionAdapter: DiscussionAdapter;

    public initializeOptions(options?: {}) {

        // In this case, tabbed navigation options are set later during initialize()
        super.initializeOptions(options);

    }

    // Override to set tabbed naviation options after other required VCControlViewBase properties have been initialized
    public _setTabbedNavigationOptions(options: {}): {} {
        const tabs = {};
        const tabOptions = {};

        const tabOption = {
            performanceScenario: this._changelistPerformanceScenario,
            customerIntelligenceData: this._customerIntelligenceData,
            actionCreator: this._actionCreator,
            storesHub: this._storesHub,
        };

        tabs[VersionControlActionIds.Summary] = VCChangesSummaryTab;
        tabOptions[VersionControlActionIds.Summary] = tabOption;

        tabs[VersionControlActionIds.Contents] = VCContentsTab;
        tabOptions[VersionControlActionIds.Contents] = tabOption;

        tabs[VersionControlActionIds.Compare] = VCCompareTab;
        tabOptions[VersionControlActionIds.Compare] = tabOption;

        // If this is a Git merge commit, then add tabs for diffing against each parent.
        if (this._storesHub.changeListStore.isGitMergeCommit) {
            this._gitMergeChangeList = this._storesHub.changeListStore.originalChangeList as VCLegacyContracts.GitCommit;

            $.each(this._gitMergeChangeList.parents, (i, parentCommit) => {
                const tabId = VersionControlActionIds.DiffParent + (i + 1);
                tabs[tabId] = VCCommitDiffSummaryTab;
                tabOptions[tabId] = tabOption;
            });
        }

        this._tabIds = Object.keys(tabs);

        return $.extend(options, {
            tabs: tabs,
            tabOptions: tabOptions,
            hubContentSelector: ".version-control-item-right-pane",
            pivotTabsSelector: ".vc-explorer-tabs",
        });
    }

    public initialize() {
        this._changelistPerformanceScenario = Performance.getScenarioManager().startScenarioFromNavigation(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.CHANGELIST_DETAILS_FEATURE, true);
        this._changelistPerformanceScenario.addSplitTiming(ChangeDetailsPerfSplitScenarios.ChangeListViewInitializeStart);

        this._customerIntelligenceData.setView("CommitView");

        const actionsHub = new ActionsHub();
        this._initializeFlux(actionsHub);

        // Register shortcuts for the changeListView
        this._changeListViewShortcutGroup = new ChangeListViewShortcutGroup(this._actionCreator);

        // Load changelist

        this._actionCreator.changeListActionCreator.loadCommitDetailsPageData().then(
            (data) => {
                // Initialize discussion adapter
                let discussionActionsHub = null;

                // set up discussion actions and data
                discussionActionsHub = new DiscussionActionsHub();
                this._discussionAdapter = getDiscussionAdapter(
                    this._storesHub.changeListStore.versionSpec,
                    actionsHub,
                    discussionActionsHub,
                    this._storesHub.discussionsStore,
                    this._storesHub.permissionsStore,
                    this._tfsContext,
                    this._repositoryContext,
                    this._projectGuid,
                );

                // Fetch meta data for parent commits
                this._actionCreator.changeListActionCreator.fetchGitCommitParentDetails();

                this._initializePivotView();
                // Now that we have the required this._element and the repositoryContext, set the tab navigation options.
                this._setTabbedNavigationOptions(this._options);

                this.getElement().addClass("commenting-enabled");

                this._storesHub.urlParametersStore.addChangedListener(this._onUrlParamatersChange);
                this._storesHub.permissionsStore.addChangedListener(this._postPermissionsInitialize);

                // get user preferences from source and then update the comments mode option.
                this._actionCreator.userPreferenceActionCreator.fetchUserPreferences()
                    .then(() => {
                        super.initialize();
                        this._createInitialActions(discussionActionsHub);
                        this._changelistPerformanceScenario.addSplitTiming(ChangeDetailsPerfSplitScenarios.ChangeListViewInitializeEnd);
                    });

                if (this._storesHub.changeListStore.originalChangeList) {
                    this.setWindowTitle(this._storesHub.changeListStore.changeListTitle);
                }

            }, (error: Error) => {
                this._showInvalidCommitMessage(error);
            });
    }

    private _showInvalidCommitMessage(error: Error): void {
        const actionUrl: string = getGitActionUrl(TfsContext.getDefault(), this._projectInfo.project.name, CommitsHubRoutes.commitsRoute, null);

        ReactDOM.render(React.createElement(NotFoundComponent, {
            errorText: error.message,
            actionUrl: actionUrl,
            navigateBackText: VCResources.ReturnToCommitsListString,
            hubId: CodeHubContributionIds.historyHub
        }), this._element[0]);
    }

    private _initializeFlux(actionsHub: ActionsHub): void {
        this._storesHub = new StoresHub(actionsHub);
        this._changelistViewSource = new ChangeListViewSource(this);

        this._actionCreator = new ActionCreator(
            actionsHub,
            this._storesHub,
            this._tfsContext,
            this._repositoryContext,
            this._changelistViewSource
        );
        this._actionCreator.initialize();
        this._renderComponents();
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

        const {isGitMergeCommit} = this._storesHub.changeListStore;
        const defaultAction = isGitMergeCommit ? VersionControlActionIds.DiffParent + "1" : VersionControlActionIds.Summary;
        this._actionCreator.navigationStateActionCreator.loadUrlParameters(rawState, defaultAction, this._reviewMode);

        const state = {} as ChangeDetailsViewState;
        this.setState(state);

        if (!action) {
            action = this._storesHub.urlParametersStore.currentAction;
        }

        // Update the dicussion manager (create it if needed) and set all options and state information related to discussion comments.
        this._actionCreator.discussionManagerActionCreator.createOrUpdateDiscussionManager(
            this._storesHub.changeListStore.currentChangeList,
            this._projectGuid,
            this._getDiscussionAdapter);

        // To go to selected comment in the file view.
        ServiceRegistry.getService(IDiscussionActionCreator).selectComment(this._storesHub.urlParametersStore.discussionId, null);

        // If this is a Git merge commit, then we may also need the context of a specific parent for diffing (and visualize that ChangeList instead).
        // Set _currentGitMergeParentTabId based on the action and rawState.  We'll need the parent diff ChangeList for all but the Summary tab.
        this._currentGitMergeParentTabId = null;
        if (this._storesHub.changeListStore.isGitMergeCommit) {
            if (this._storesHub.urlParametersStore.isSummaryAction) {
                this._currentGitMergeParentTabId = VersionControlActionIds.Summary;
            } else if (this._storesHub.urlParametersStore.isDiffParentAction) {
                this._currentGitMergeParentTabId = action.toLowerCase();
            } else {
                this._currentGitMergeParentTabId = this._storesHub.urlParametersStore.diffParent ? rawState.diffParent.toLowerCase() : null;
            }
        }

        const gitMergeParentTabId: string = this._currentGitMergeParentTabId;
        this._updateChangeListIfGitMergeCommit(state).then(() => {

            // If the user switched tabs during this asynch call for Git merge commits,
            // then just return without updating state or executing the navigation callback for the now inactive tab.
            if (gitMergeParentTabId !== this._currentGitMergeParentTabId) {
                return;
            }

            // Path can be for a folder for filtered summary view (the normal summary or a Git diffparentX summary tab), or a for a specific file for Compare.
            if (this._storesHub.urlParametersStore.path) {

                // A folder path is specified and we are on a summary tab
                if (this._storesHub.urlParametersStore.isSummaryAction || this._storesHub.urlParametersStore.isDiffParentAction) {
                    callback(action, state);
                } else {
                    // A file path is specified and we are not on a summary tab,
                    // Show the file-level information (Content, History, and Compare tabs) after fetching the item metadata
                    const change = findChange(this._storesHub.changeListStore.currentChangeList, this._storesHub.urlParametersStore.path);

                    let itemVersion = this._storesHub.changeListStore.currentChangeList.version;
                    if (change && ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Delete)) {
                        const gitParentDifIndex = this._storesHub.urlParametersStore.gitParentDiffIndex;
                        const isGitMergeCommitParentDiff = (gitParentDifIndex && gitParentDifIndex > 0);
                        itemVersion = this._storesHub.changeListStore.getPreviousVersionSpec(isGitMergeCommitParentDiff);
                    }

                    addPerformanceScenarioSplitTiming(this._changelistPerformanceScenario, ChangeDetailsPerfSplitScenarios.BeginGetItemStart);
                    this._actionCreator.itemDetailsActionCreator.loadOrSelectItemDetails(
                        this._storesHub.urlParametersStore.path,
                        itemVersion,
                        change
                    ).then(
                        () => {
                            addPerformanceScenarioSplitTiming(this._changelistPerformanceScenario, ChangeDetailsPerfSplitScenarios.BeginGetItemEnd);
                            callback(action, state);
                        },
                        (error: Error) => {
                            abortPerformanceScenario(this._changelistPerformanceScenario);
                            this._actionCreator.raiseError(error);
                        });
                }
            } else {
                // No path specified.
                if (this._gitMergeChangeList) {
                    this._lastSummaryAction = action;
                }
                callback(action, state);
            }
        }).then(null, (error: Error) => {
            // this._updateStateChangeList(state) failed. (Fetching the Git merge commit parent diff, if applicable).
            // No need to show if the user already switched tabs after a slow parent diff query.
            if (gitMergeParentTabId === this._currentGitMergeParentTabId) {
                this._actionCreator.raiseError(error);
            }
        });
    }

    public getTabVisibility(tabId: {}, currentTabId: string, rawState: {}, parsedState: {}): boolean {
        // We need to hide all tabs
        return false;
    }

    protected _dispose(): void {
        if (this._changeListViewShortcutGroup) {
            this._changeListViewShortcutGroup.removeShortcutGroup();
            this._changeListViewShortcutGroup = null;
        }

        this._disposeTabs();
        this._disposeReactComponents();

        if (this._actionCreator) {
            this._actionCreator.discussionManagerActionCreator.removeDiscussionThreadsUpdatedListener();
        }

        if (this._storesHub) {
            this._storesHub.urlParametersStore.removeChangedListener(this._onUrlParamatersChange);
            this._storesHub.permissionsStore.removeChangedListener(this._postPermissionsInitialize);
            this._storesHub.dispose();
            this._storesHub = null;
        }

        if (this._changelistViewSource) {
            this._changelistViewSource.dispose();
        }

        DiscussionSetup.dispose();
        this._discussionAdapter = null;

        super._dispose();
    }

    // public for testing
    public _initializePivotView(): void {
        const pivotViewItems = CommitDetailsView._getPivotViewItems(this._storesHub.changeListStore.originalChangeList as VCLegacyContracts.GitCommit);

        const pivotView = BaseControl.createIn(PivotView, this.getElement().find(".hub-pivot .views"), {
            items: pivotViewItems,
        }) as PivotView;

        pivotView.getElement().addClass("vc-explorer-tabs enhance");
    }

    private _createInitialActions(discussionActionsHub: DiscussionActionsHub): void {
        const version = this._storesHub.changeListStore.originalChangeList.version;
        const versionSpec = VCSpecs.VersionSpec.parse(version);
        const commitId = (versionSpec as VCSpecs.GitCommitVersionSpec).commitId;

        let branchFullName = this._storesHub.urlParametersStore.refName;
        if (!branchFullName) {
            branchFullName = this._repositoryContext.getRepository().defaultBranch;
        }

        // Load the pull request stats
        if (this._actionCreator.pullRequestActionCreator) {

            this._actionCreator.pullRequestActionCreator.loadPullRequestsData(commitId, branchFullName);
        }

        // Load the branch stats
        if (this._actionCreator.branchActionCreator) {
            this._actionCreator.branchActionCreator.loadBranchStats(GitRefUtility.getRefFriendlyName(branchFullName), commitId);
        }

        const artifact = createArtifactFromVersion(versionSpec, this._projectGuid, this._repositoryContext.getRepository().id);
        // Load the workItems stats
        this._actionCreator.workItemsActionCreator.loadAssociatedWorkItemsForGit(
            artifact.getUri(),
            this._projectGuid);

        // Load build status
        this._actionCreator.buildStatusActionCreator.loadBuildStatus(commitId);

        // fetch tags List
        this._actionCreator.tagsActionCreator.fetchTags(commitId);

        // fetch GitPermissions
        this._actionCreator.gitPermissionsActionCreator.fetchGitPermissions();

        // Load discussion threads
        DiscussionSetup.populateDiscussions(this._tfsContext, this._repositoryContext, discussionActionsHub);
    }

    private _renderComponents(): void {
        const pageProps = (): CommitDetailsPageProps => {
            return {
                storesHub: this._storesHub,
                actionCreator: this._actionCreator,
                customerIntelligenceData: this._customerIntelligenceData.clone()
            };
        };

        ChangeDetailsPage.renderInto(
            $(".hub-content")[0],
            {
                headerPaneContent: React.createElement(CommitDetailsHeaderPanel, pageProps()),
                rightPaneContent: React.createElement(RightPanelSummaryContainer, pageProps()),
                leftPaneContent: React.createElement(ChangeListLeftPanel, pageProps())
            });
    }

    private _disposeReactComponents(): void {
        ReactDOM.unmountComponentAtNode($(".hub-content")[0]);
    }

    private _disposeTabs(): void {
        if (this._tabIds) {
            this._tabIds.forEach((tabId: string) => {
                const tab = this.getTab(tabId);
                if (tab) {
                    tab.dispose();
                }
            });
            this._tabIds = null;
        }
    }

    private _onUrlParamatersChange = (): void => {
        const urlParametersStore = this._storesHub.urlParametersStore;
        this.setHubPivotVisibility(!urlParametersStore.isSummaryAction && !urlParametersStore.isDiffParentAction);
    }

    // any initialization that requires permission details beforehand
    private _postPermissionsInitialize = (): void => {
        const { cherryPick, revertCommit } = (this._storesHub.permissionsStore as GitCommitPermissionsStore).getState();
        if (cherryPick || revertCommit) {
            this._initializeSignalR();
            this._storesHub.permissionsStore.removeChangedListener(this._postPermissionsInitialize);
        }
    }

    private _initializeSignalR(): void {
        const webPageDataService: WebPageDataService = VSS_Service.getService(WebPageDataService) as WebPageDataService;
        const pageData = webPageDataService.getPageData
            <ICommitDetailsReadPageData>(Constants.CommitDetailsDataProviderId) || {};

        const signalrHubUrl = pageData["SignalrHubUrl"];
        if (signalrHubUrl) {
            SignalRUtils.loadSignalR(signalrHubUrl);
        }
    }

    // For a Git merge commit, the changeList might be the diff with a particular parent.  Fetch and update the changeListStore if so.
    // public for testing
    public _updateChangeListIfGitMergeCommit(state: {}): IPromise<void> {
        const deferred = Q.defer<void>();

        if (this._storesHub.changeListStore.isGitMergeCommit && this._currentGitMergeParentTabId) {
            const parentTabId = this._currentGitMergeParentTabId;
            addPerformanceScenarioSplitTiming(this._changelistPerformanceScenario, ChangeDetailsPerfSplitScenarios.GitMergeCommitParentChangeListLoadStart);
            this._actionCreator.changeListActionCreator.loadGitMergeCommitParentChangeList(this._currentGitMergeParentTabId).then(() => {
                addPerformanceScenarioSplitTiming(this._changelistPerformanceScenario, ChangeDetailsPerfSplitScenarios.GitMergeCommitParentChangeListLoadEnd);

                // If someone has changed the parent by now, ignore. Else call parent selected action
                if (parentTabId === this._currentGitMergeParentTabId) {
                    this._actionCreator.changeListActionCreator.selectGitMergeCommitParentChangeList(this._currentGitMergeParentTabId);
                }
                deferred.resolve(null);
            }).then(null, (error: Error) => {
                abortPerformanceScenario(this._changelistPerformanceScenario);
                deferred.reject(error);
            });
        } else {
            deferred.resolve(null);
        }

        return deferred.promise;
    }

    // public for testing
    public static _getPivotViewItems(gitCommit: VCLegacyContracts.GitCommit): IPivotViewItem[] {
        const pivotViewItems = [] as IPivotViewItem[];

        if (gitCommit && gitCommit.parents && gitCommit.parents.length > 1) {
            const parentsLength = gitCommit.parents.length;
            for (let i = 0; i < parentsLength; i++) {
                const parent: VCLegacyContracts.GitObjectReference = gitCommit.parents[i];
                const parentId = i + 1;
                const actionId = VersionControlActionIds.DiffParent + parentId;
                const text = Utils_String.format(VCResources.DiffParentCommitFormat, parentId);
                const title = Utils_String.format(VCResources.DiffParentCommitTitleFormat, parentId, getShortCommitId(parent.objectId.full));

                pivotViewItems.push(getPivotViewItem(actionId, text, title));
            }

            const title = Utils_String.format(VCResources.MergeCommitTitleFormat, getShortCommitId(gitCommit.commitId.full));
            pivotViewItems.push(getPivotViewItem(VersionControlActionIds.Summary, VCResources.MergeCommit, title));
        } else {
            pivotViewItems.push(getPivotViewItem(VersionControlActionIds.Summary, VCResources.Summary));
        }

        pivotViewItems.push(getPivotViewItem(VersionControlActionIds.Contents, VCResources.Contents));
        pivotViewItems.push(getPivotViewItem(VersionControlActionIds.Compare, VCResources.Compare));

        return pivotViewItems;
    }

    private _getDiscussionAdapter = (): DiscussionAdapter => {
        return this._discussionAdapter;
    }
}

VSS.classExtend(CommitDetailsView, TfsContext.ControlExtensions);
Enhancement.registerEnhancement(CommitDetailsView, ".versioncontrol-new-change-list-view");
