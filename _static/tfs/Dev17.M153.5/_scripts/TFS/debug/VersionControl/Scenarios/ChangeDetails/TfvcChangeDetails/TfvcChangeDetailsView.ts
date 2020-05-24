/// <amd-dependency path='VSS/LoaderPlugins/Css!ChangeListView' />
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Q from "q";
import * as React from "react";

import * as ReactDOM from "react-dom";
import * as Context from "VSS/Context";
import { BaseControl, Enhancement } from "VSS/Controls";
import { PivotView, IPivotViewItem } from "VSS/Controls/Navigation";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Performance from "VSS/Performance";
import * as VSS from "VSS/VSS";

import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import { ActionsHub as DiscussionActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { getChangesetsHubContributionId, getShelvesetsHubContributionId } from "VersionControl/Scripts/CodeHubContributionsHelper";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { DiscussionAdapter } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionManagerStore";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { ViewBase } from "VersionControl/Scripts/Views/BaseView";

import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionCreator";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import {
    ChangeDetailsPerfSplitScenarios,
    addPerformanceScenarioSplitTiming,
    abortPerformanceScenario,
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
import * as ChangeDetailsPage from "VersionControl/Scenarios/ChangeDetails/Components/Page";
import { RightPanelSummaryContainer } from "VersionControl/Scenarios/ChangeDetails/Components/RightPanelSummaryContainer";
import { DiscussionSetup } from "VersionControl/Scenarios/ChangeDetails/DiscussionSetup";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { ChangeListViewSource } from "VersionControl/Scenarios/ChangeDetails/Sources/ChangeListViewSource";
import { QueryChangeListSource } from "VersionControl/Scenarios/ChangeDetails/Sources/QueryChangeListSource";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import { ChangeDetailsHeaderPanel } from "VersionControl/Scenarios/ChangeDetails/TfvcChangeDetails/Components/ChangeDetailsHeaderPanel";
import { ChangeListLeftPanel } from "VersionControl/Scenarios/ChangeDetails/TfvcChangeDetails/Components/ChangeDetailsLeftPanel";
import { NoPermissionComponent } from "VersionControl/Scenarios/History/NoPermissionComponent";
import { NotFoundComponent } from "VersionControl/Scenarios/History/NotFoundComponent";
import { getChangesetUrl, getShelvesetUrl } from "VersionControl/Scripts/VersionControlUrls";

import "VSS/LoaderPlugins/Css!VersionControl/NewChangeList";

interface ChangeDetailsPageProps extends IChangeDetailsPropsBase {
    storesHub: StoresHub;
    actionCreator: ActionCreator;
}

export class TfvcChangeDetailsView extends ViewBase {
    private _actionCreator: ActionCreator;
    private _storesHub: StoresHub;
    private _lastSummaryAction: string;
    private _userHasPermissionScenario: boolean;

    // perf telemetry
    private _changeDetailsPerformanceScenario: Performance.IScenarioDescriptor;

    private _changeListViewShortcutGroup: ChangeListViewShortcutGroup;
    private _discussionAdapter: DiscussionAdapter;
    private _queryChangeListSource: QueryChangeListSource;
    private _tabIds: string[];

    public initializeOptions(options?: {}): void {

        // In this case, tabbed navigation options are set later during initialize()
        super.initializeOptions(options);
    }

    // Override to set tabbed naviation options after other required VCControlViewBase properties have been initialized
    public _setTabbedNavigationOptions(options: {}): {} {
        const tabs = {};
        const tabOptions = {};
        const tabOption = {
            performanceScenario: this._changeDetailsPerformanceScenario,
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

        this._tabIds = Object.keys(tabs);

        return $.extend(options, {
            tabs: tabs,
            tabOptions: tabOptions,
            hubContentSelector: ".version-control-item-right-pane",
            pivotTabsSelector: ".vc-explorer-tabs",
        });
    }

    public initialize() {
        // Get current changelist
        this._queryChangeListSource = new QueryChangeListSource();
        this._queryChangeListSource && this._queryChangeListSource.getCurrentChangeList(this._repositoryContext).then(
            (changeList: VCLegacyContracts.TfsChangeList) => {
                this._userHasPermissionScenario = changeList.changes.length > 0;
                const isShelveset = changeList.isShelveset;

                this._changeDetailsPerformanceScenario = Performance.getScenarioManager().startScenarioFromNavigation(
                    CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                    isShelveset
                        ? CustomerIntelligenceConstants.TFS_CHANGELIST_SHELVESET_DETAILS_FEATURE
                        : CustomerIntelligenceConstants.TFS_CHANGELIST_CHANGESET_DETAILS_FEATURE,
                    true);

                this._changeDetailsPerformanceScenario.addSplitTiming(ChangeDetailsPerfSplitScenarios.ChangeListViewInitializeStart);
                this._customerIntelligenceData.setView(isShelveset ? "ShelveSetDetailsView" : "ChangeSetDetailsView");

                const actionsHub = new ActionsHub();
                this._initializeFlux(actionsHub);

                // Register shortcuts for the changeListView
                this._changeListViewShortcutGroup = new ChangeListViewShortcutGroup(this._actionCreator);

                // Load current changelist
                this._actionCreator.changeListActionCreator.loadChangeList(changeList);

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

                this._initializePivotView();
                this._setTabbedNavigationOptions(this._options);
                this.getElement().addClass("commenting-enabled");

                // get user preferences from source and then update the comments mode option.
                this._actionCreator.userPreferenceActionCreator.fetchUserPreferences()
                    .then(() => {
                        super.initialize();
                        this._createInitialActions(discussionActionsHub);
                        this._changeDetailsPerformanceScenario.addSplitTiming(ChangeDetailsPerfSplitScenarios.ChangeListViewInitializeEnd);
                    });
                if (this._storesHub.changeListStore.originalChangeList) {
                    this.setWindowTitle(this._storesHub.changeListStore.changeListTitle);
                }
            },
            (error: Error) => {
                this._showInvalidChangesetMessage(error);
            })
    }

    private _initializeFlux(actionsHub: ActionsHub): void {
        this._storesHub = new StoresHub(actionsHub);

        this._actionCreator = new ActionCreator(
            actionsHub,
            this._storesHub,
            this._tfsContext,
            this._repositoryContext,
            new ChangeListViewSource(this)
        );
        this._actionCreator.initialize();
        this._renderComponents();
    }

    public parseStateInfo(action: string, rawState: {}, callback: IResultCallback) {
        this._actionCreator.navigationStateActionCreator.loadUrlParameters(rawState, VersionControlActionIds.Summary, this._reviewMode);
        const state = {} as ChangeDetailsViewState;
        this.setState(state);

        if (!action) {
            action = this._storesHub.urlParametersStore.currentAction;
        }

        // Update the dicussion manager (create it if needed) and set all options and state information related to discussion comments.
        this._actionCreator.discussionManagerActionCreator.createOrUpdateDiscussionManager(this._storesHub.changeListStore.currentChangeList, this._projectGuid, this._getDiscussionAdapter);

        // To go to selected comment in the file view.
        const selectedDiscussionId = this._storesHub.urlParametersStore.discussionId;
        ServiceRegistry.getService(IDiscussionActionCreator).selectComment(selectedDiscussionId, null);

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
                    itemVersion = this._storesHub.changeListStore.getPreviousVersionSpec();
                }

                addPerformanceScenarioSplitTiming(this._changeDetailsPerformanceScenario, ChangeDetailsPerfSplitScenarios.BeginGetItemStart);
                this._actionCreator.itemDetailsActionCreator.loadOrSelectItemDetails(
                    this._storesHub.urlParametersStore.path,
                    itemVersion,
                    change
                ).then(
                    () => {
                        addPerformanceScenarioSplitTiming(this._changeDetailsPerformanceScenario, ChangeDetailsPerfSplitScenarios.BeginGetItemEnd);
                        callback(action, state);
                    },
                    (error: Error) => {
                        abortPerformanceScenario(this._changeDetailsPerformanceScenario);
                        this._actionCreator.raiseError(error);
                    });
            }
        } else {
            // No path specified.
            this._lastSummaryAction = action;
            callback(action, state);
        }
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
            this._storesHub.dispose();
            this._storesHub = null;
        }

        DiscussionSetup.dispose();
        this._discussionAdapter = null;

        super._dispose();
    }

    // public for testing
    public _initializePivotView(): void {
        const pivotViewItems = TfvcChangeDetailsView._getPivotViewItems();

        const pivotView = BaseControl.createIn(PivotView, this.getElement().find(".hub-pivot .views"), {
            items: pivotViewItems,
        }) as PivotView;

        pivotView.getElement().addClass("vc-explorer-tabs enhance");

        if (!this._userHasPermissionScenario) {
            this.getElement().find(".hub-content .hub-pivot-content").addClass("no-permission-scenario");
        }

    }

    private _createInitialActions(discussionActionsHub: DiscussionActionsHub): void {
        const versionString = this._storesHub.changeListStore.originalChangeList.version;
        const versionSpec = VersionSpec.parse(versionString);
        // Load the workItems stats
        this._actionCreator.workItemsActionCreator.loadAssociatedWorkItemsForTfvc(versionSpec.toVersionString());

        // populate discussions
        DiscussionSetup.populateDiscussions(this._tfsContext, this._repositoryContext, discussionActionsHub);
    }

    private _renderComponents(): void {
        const pageProps = (): ChangeDetailsPageProps => {
            return {
                storesHub: this._storesHub,
                actionCreator: this._actionCreator,
                customerIntelligenceData: this._customerIntelligenceData.clone()
            };
        };

        ChangeDetailsPage.renderInto(
        $(".hub-content")[0],
        {
            headerPaneContent: React.createElement(ChangeDetailsHeaderPanel, pageProps()),
            rightPaneContent: this._userHasPermissionScenario
                ? React.createElement(RightPanelSummaryContainer, pageProps())
                : React.createElement(NoPermissionComponent, {
                    primaryText: VCResources.Changesets_NoPermission,
                    secondaryText: VCResources.NoPermission_ContactAdministrator,
                    imageName: TfsContext.getDefault().configuration.getResourcesFile('no-permissions.svg')
                }),
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

    // public for testing
    public static _getPivotViewItems(): IPivotViewItem[] {
        const pivotViewItems = [] as IPivotViewItem[];
        pivotViewItems.push(getPivotViewItem(VersionControlActionIds.Summary, VCResources.Summary));
        pivotViewItems.push(getPivotViewItem(VersionControlActionIds.Contents, VCResources.Contents));
        pivotViewItems.push(getPivotViewItem(VersionControlActionIds.Compare, VCResources.Compare));
        return pivotViewItems;
    }

    private _getDiscussionAdapter = (): DiscussionAdapter => {
        return this._discussionAdapter;
    }

    private _showInvalidChangesetMessage(error: Error): void {

        const navigationContext = Context.getPageContext().navigation;

        let actionUrl: string = null;
        let hubId: string = null;

        if (navigationContext.commandName == "Tfvc.changeset") {
            actionUrl = getChangesetUrl(null, this._tfsContext);
            hubId = getChangesetsHubContributionId(this._repositoryContext); 
        } else {
            actionUrl = getShelvesetUrl(null, null, this._tfsContext);
            hubId = getShelvesetsHubContributionId(this._repositoryContext);
        }

        ReactDOM.render(React.createElement(NotFoundComponent, {
            errorText: error.message,
            actionUrl: actionUrl,
            navigateBackText: VCResources.ReturnToCommitsListString,
            hubId: hubId
        }), this._element[0]);
    }
}

VSS.classExtend(TfvcChangeDetailsView, TfsContext.ControlExtensions);