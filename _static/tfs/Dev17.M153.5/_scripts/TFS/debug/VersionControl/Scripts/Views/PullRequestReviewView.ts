/// <amd-dependency path='VSS/LoaderPlugins/Css!PullRequestReviewView' />
/// <reference types="react-dom" />

import * as ReactDOM from "react-dom";
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import { WebPageDataService } from "VSS/Contributions/Services";
import { ExtensionService } from "VSS/Contributions/Services";
import * as UserClaimsService from "VSS/User/Services";

import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { Fullscreen, KeyboardShortcutGroup_Code, PullRequest_SignalR_StaleState } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as SignalRUtils from "VersionControl/Scripts/Utils/SignalRUtils";
import { reloadPageIfRepositoryChanged, reloadPage } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";

import { OverviewTab, FilesTab, CommitsTab, UpdatesTab, ContributedTab } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Tabs";
import { PullRequestDetailHub } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.SignalR";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import * as VCActionsDebugMonitor from "VersionControl/Scenarios/Shared/ActionsDebugMonitor";
import { NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { MainRenderer } from "VersionControl/Scripts/Components/PullRequestReview/Main";
import { PullRequestDetailRefreshOptions } from "VersionControl/Scripts/Actions/PullRequestReview/PullRequestActionCreator";
import { NavigationActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/NavigationActionCreator"; 
import { INavigationState } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { PullRequestActions } from "VersionControl/Scripts/Stores/PullRequestReview/NavigationStore";

// legacy components for page rendering
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Navigation_Services = require("VSS/Navigation/Services");
import { FullScreenHelper } from "VSS/Controls/Navigation";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { domElem } from "VSS/Utils/UI";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import VCPullRequestViewBase = require("VersionControl/Scripts/Views/PullRequestBaseView");
import VCPullRequestUrl = require("VersionControl/Scripts/PullRequestUrl");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

// first time quickstart
import EngagementDispatcher_NO_REQUIRE = require("Engagement/Dispatcher");
import EngagementCore_NO_REQUIRE = require("Engagement/Core");
import PullRequestQuickStart_NO_REQUIRE = require("VersionControl/Scripts/PullRequestQuickStart");
import TFS_EngagementRegistrations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Engagement.Registrations");
import { getDebugMode } from "VSS/Diag";

const viewSelector: string = ".vc-pullrequest-review-view";
const hubTitleContentSelector: string = ".vc-pullrequest-details-titleArea";
const tabContributionId: string = "ms.vss-code-web.pr-tabs";
const dialogSelector: string = ".vc-dialogs-container";

// shortcut group for the pull request page
class PullRequestReviewShortcutGroup extends ShortcutGroupDefinition {
    private _flux: Flux;

    constructor(flux: Flux) {
        super(KeyboardShortcutGroup_Code);

        this._flux = flux;
        this.registerShortcut("z", {
            description: Fullscreen,
            action: this._onShortcutAction,
        });
    }

    private _onShortcutAction = (): void => {
        const currentState = NavigationActionCreator.getState();

        // if we're on the files tab, toggle fullscreen with this keyboard shortcut
        if (currentState.action === "files") {
            this._flux && this._flux.actionCreator.navigationActionCreator.navigateWithState({ fullScreen: !currentState.fullScreen });
        }
    };

    public dispose(): void {
        this.unRegisterShortcut("z");
        this._flux = null;
    }
}

export class PullRequestReviewView extends VCPullRequestViewBase.PullRequestViewBase {
    private _pullRequestDetailHub: PullRequestDetailHub;
    private _flux: Flux;
    private _disposeActions: Function[] = [];

    private _isFullScreen: boolean = false;
    private _isInitialized: boolean = false;

    private _pullRequestId: number = 0;
    private _repositoryId: string = "";

    // we need this to trick the full screen helper into
    // behaving the way we want
    private _phantomMenu: Menus.MenuBar;
    private _phantomElement: JQuery;

    private _shortcutGroup: PullRequestReviewShortcutGroup;

    // html elements with attached react components
    private _titleElement: HTMLElement;
    private _shortTitleElement: HTMLElement;
    private _dialogAreaElement: HTMLElement;

    constructor(options?) {
        super($.extend({
            attachNavigate: true
        }, options));
    }

    public initializeOptions(options?: any): void {
        // attach tab with action matching default pivot action
        const tabs: { [key: string]: any } = {};
        tabs[PullRequestActions.Overview] = OverviewTab;
        tabs[PullRequestActions.Files] = FilesTab;
        tabs[PullRequestActions.Updates] = UpdatesTab;
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsCommitsTabReplaced)) {
            tabs[PullRequestActions.Commits] = UpdatesTab;
        }
        else {
            tabs[PullRequestActions.Commits] = CommitsTab;
        }

        super.initializeOptions($.extend({
            tabs: tabs,
            hubContentSelector: ".versioncontrol-pullrequests-content",
            pivotTabsSelector: ".vc-pullrequest-tabs",
        }, options));
    }

    public initialize(options?: any): void {
        super.initialize();
    }

    private _initializeContributedTabs(): IPromise<void> {
        // get the current contributions to our tabs target
        return Service.getService(ExtensionService).getContributionsForTarget(tabContributionId).then(
            (contributions: Contribution[]) => {
                const contributedTabs: { [key: string]: any } = {};

                contributions.forEach((contribution: Contribution) => {
                    if (contribution.properties && contribution.properties.action) {
                        // add a contributed tab for each
                        contributedTabs[contribution.properties.action] = ContributedTab;
                    }
                });

                // update the tabs in our tabbed navigation view and refresh the current tab in case the
                // user tried to directly navigate to a contributed tab
                if (contributions && contributions.length > 0) {
                    this.updateTabs(contributedTabs);
                }

                return null;
            });
    }

    private _initializeSignalR() {
        // The SignalR Hub script URL comes from the data provider
        const webPageDataService: WebPageDataService = Service.getService(WebPageDataService) as WebPageDataService;
        const pageData = webPageDataService.getPageData<any>("ms.vss-code-web.pull-request-detail-data-provider") || {};
        const signalrHubUrl = pageData["SignalrHubUrl"];
        const signalrConnectionUrl = pageData["SignalrConnectionUrl"];

        this._flux.actionsHub.signalrHubLoading.invoke(null);

        SignalRUtils.loadSignalR(signalrHubUrl)
            .then(() => {
                if (this._flux) {
                    this._pullRequestDetailHub = new PullRequestDetailHub(signalrConnectionUrl, this._pullRequestId, this._repositoryId);
                    this._flux.actionsHub.signalrHubLoaded.invoke(null);
                }
            })
            .then(null, (error) => {
                console.error(error);
                if (this._flux) {
                    this._flux.actionCreator.displayWarningNotification(PullRequest_SignalR_StaleState);
                }
            });
    }

    // return true if this was the first page load
    private _initialize(initialState: INavigationState): boolean {
        const pullRequestId = VCPullRequestUrl.Url.getPullRequestIdFromWindowHref();
        if (this._isInitialized) {
            if (this._pullRequestId !== pullRequestId) {
                reloadPage(CodeHubContributionIds.pullRequestHub);
            } else {
                reloadPageIfRepositoryChanged(this._repositoryContext, CodeHubContributionIds.pullRequestHub);
            }

            return false;
        }
        this._isInitialized = true;

        // load data for the pull request and user prefs (data needed to render any tab)
        this._pullRequestId = pullRequestId;
        this._repositoryId = this._repositoryContext.getRepositoryId();
        const tfsContext = TfsContext.getDefault();

        // initialize flux
        Flux.initialize(tfsContext, this._repositoryContext as GitRepositoryContext, this._pullRequestId);
        this._flux = Flux.instance();

        // we don't have a great way to time contributed tab load complete so don't start
        // a scenario for contributed tabs
        if (!initialState.contributionId) {
            this._flux.actionCreator.notifyMainContentLoadStarted(initialState.action);
        }

        if (getDebugMode()) {
            // TODO v-panu This should be lazy loaded only in debug mode, but then we miss initial actions.
            // Loaded in production too while we figure out a better solution.
            const debugMonitorDiv = VCActionsDebugMonitor.renderInBody(this._flux.actionsHub);

            this._disposeActions.push(() => ReactDOM.unmountComponentAtNode(debugMonitorDiv));
        }

        // load user prefs for this page
        this._flux.actionCreator.initializePreferences();

        // Update conflict records. Note that this will not round-trip to the server unless
        // necessary, ie, PR loaded, merge has Conflicts, merged commits have changed, conflicts not already loaded, etc.
        this._flux.actionCreator.conflictActionCreator.updatePullRequestConflicts();

        // render title element for this page
        this._titleElement = this.getElement().find(hubTitleContentSelector)[0];
        MainRenderer.attachTitle(this._titleElement);

        // render short title element for this page
        this._shortTitleElement = this.getElement().find(".vc-pullrequest-short-title")[0];
        MainRenderer.attachShortTitle(this._shortTitleElement);

        // render dialogs
        this._dialogAreaElement = this.getElement().find(dialogSelector)[0];
        MainRenderer.attachDialogs(this._dialogAreaElement);

        const refreshOptions = PullRequestDetailRefreshOptions.All;

        // updateload the pull request details then load the current user's permissions
        this._flux.actionCreator.pullRequestActionCreator.queryPullRequestDetail(this._pullRequestId, refreshOptions, true);

        // set up full screen handler
        this._initializeFullScreen(!!initialState.fullScreen && initialState.action === PullRequestActions.Files);

        // if the current user is a member
        if (UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member)) {
            // register the quick start guide
            VSS.using(
                ["Engagement/Dispatcher", "Presentation/Scripts/TFS/TFS.Engagement.Registrations"],
                (EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE, TFS_EngagementRegistrations: typeof TFS_EngagementRegistrations_NO_REQUIRE) => {
                    this._registerPullRequestQuickStart();
                    TFS_EngagementRegistrations.registerNewFeature();
                    EngagementDispatcher.Dispatcher.getInstance().start("PullRequestDetails");
            });

            // initialize signalr connection
            this._initializeSignalR();
        }

        // set up shortcut group for pr view keyboard shortcuts
        this._shortcutGroup = new PullRequestReviewShortcutGroup(this._flux);

        this._disposeActions.push(() => {
            Flux.dispose();
            this._flux = null;
        });

        return true;
    }

    // we are doing this in the main page so we can handle every tab
    private _initializeFullScreen(startAsFullScreen: boolean) {
        // set up full screen callback handler
        FullScreenHelper.attachFullScreenUrlUpdateEvent(this._fullScreenCallback);

        // create the fake elemments to store full screen triggers
        this._phantomElement = $(domElem("div"));
        this._phantomMenu = Controls.BaseControl.createIn(Menus.MenuBar, this._phantomElement) as Menus.MenuBar;

        FullScreenHelper.initialize(this._phantomMenu, {
            showLeftLane: true,
            publishCIData: false,
        });

        // full screen helper only recognizes the hash values by default (not query string)
        // so if we get a QS value we need to turn it on
        FullScreenHelper.setFullScreen(startAsFullScreen, false, true, true);
        this._flux.actionCreator.toggleFullScreen(startAsFullScreen);
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback): void {
        const state: any = {};
        const previousRawState = this.getState();
        const previousState: INavigationState = NavigationActionCreator.convertState(previousRawState);
        const currentState: INavigationState = NavigationActionCreator.convertState(rawState);

        const actionChanged = (previousState.action !== currentState.action);

        // remove legacy parameters from the raw state (already parsed to new state to preserve needed data)
        if (rawState.view) {
            rawState.action = currentState.action;
            delete rawState.view;
        }

        // if flux already exists, set up a new telemetry scenario for this navigation event
        // also we don't have a great way to time contributed tab load complete so don't start
        // a scenario for contributed tabs
        if (this._flux && actionChanged && !currentState.contributionId) {
            this._flux.actionCreator.notifyMainContentLoadStarted(currentState.action, true);
        }
        
        // we call initialize here so we can utilize QS params from state
        // note that it only executes once per page load (not on tab change)
        const isFirstLoad = this._initialize(currentState);

        if (this._flux) {
            const iterationChanged = (previousState.iteration !== currentState.iteration);
            const baseChanged = (previousState.base !== currentState.base);
            const pathChanged = (previousState.path !== currentState.path);

            // always update the current state for anyone interested
            this._flux.actionCreator.navigationActionCreator.updateState(currentState);

            // clear errors on the page on navigate
            this._flux.actionCreator.flushNotifications(NotificationType.error);

            if (isFirstLoad || actionChanged) {
                // change the tab to the current action on page load or if the current action has changed
                this._flux.actionCreator.changeTab(currentState.action);
            }

            if (!isFirstLoad && actionChanged) {
                // update the last visit of this user when switching from any tab to the overview
                if (action === PullRequestActions.Overview) {
                    this._flux.actionCreator.navigationActionCreator.updateLastVisit(false);
                }
                this._flux.actionCreator.navigationActionCreator.dismissLastVisitBanner();
            }

            // iteration selection on initialization is handled elsewhere (so the latest can be determined and selected)
            // always select iterations on change if specified, select iterations on change if not specified only if this is not the first page load
            if ((currentState.iteration || !isFirstLoad) && (iterationChanged || baseChanged)) {
                this._flux.actionCreator.codeExplorerActionCreator.selectIteration(currentState.iteration, currentState.base);
            }

            // select the tree item (and load item detail if necessary) if the path changed, or if we switched tabs
            if (pathChanged) {
                // ensure diff and line counts have been loaded, otherwise FilesTab getStateFromStores becomes recursive
                const respositoryContext = Flux.instance().storesHub.contextStore.getRepositoryContext();
                const selection = Flux.instance().storesHub.codeExplorerStore.getSelectedItem();
                const selectedDiffItem = selection ? selection.gitDiffItem : null;
                const selectedPath: string = selection ? selection.path : null;
                this._flux.storesHub.fileLineDiffCountStore.ensureLoaded(selectedPath, selectedDiffItem, respositoryContext);

                this._flux.actionCreator.codeExplorerActionCreator.selectChangeExplorerItem(currentState.path || null);
                this._flux.actionCreator.codeExplorerActionCreator.queryItemDetailIfNeeded();
            }

            // discussion selection is currently handled in the DiscussionsStore AND in the nav state
            // these can get out of sync so on nav we need to select the discussion that is in the current state
            this._flux.actionCreator.discussionActionCreator.selectComment(currentState.discussionId, null);
        }

        // wait for contributed tabs to load if this is our first load
        if (isFirstLoad) {
            this._initializeContributedTabs().then(() => {
                callback(currentState.action, $.extend(state, currentState));
            }, () => {
                // even if there is an error, keep going
                callback(currentState.action, $.extend(state, currentState));
            });

            return;
        }

        // add our parsed state to the current state and send it back to the navigation framework
        callback(currentState.action, $.extend(state, currentState));
    }

    private _fullScreenCallback = (): void => {
        const isFilesView = Navigation_Services.getHistoryService().getCurrentState().action === PullRequestActions.Files;
        this._isFullScreen = isFilesView && FullScreenHelper.getFullScreen();

        // note: the reason we use jquery here is the hub view is rendered via jquery
        // so we do not have control over it in react
        if (this._isFullScreen) {
            $(".hub-view").addClass("fullscreen");
        } else {
            $(".hub-view").removeClass("fullscreen");
        }
    };

    private _registerPullRequestQuickStart(): void {
        VSS.using(["Engagement/Dispatcher", "Engagement/Core"], (EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE, EngagementCore: typeof EngagementCore_NO_REQUIRE) => {

            const quickStartModel: EngagementCore_NO_REQUIRE.IEngagementModel = {
                id: "PullRequestQuickStart",
                type: EngagementCore.EngagementType.QuickStart,
                model: EngagementDispatcher.lazyLoadModel(["VersionControl/Scripts/PullRequestQuickStart"], (pullrequestQuickStart: typeof PullRequestQuickStart_NO_REQUIRE) => {
                    const pageContext = new pullrequestQuickStart.PullRequestQuickStartPageContext();
                    return new pullrequestQuickStart.PullRequestQuickStartModel(pageContext);
                })
            }

            EngagementDispatcher.Dispatcher.getInstance().register(quickStartModel);
        });
    }

    protected _dispose(): void {
        super._dispose();

        if (this._pullRequestDetailHub) {
            this._pullRequestDetailHub.dispose();
            this._pullRequestDetailHub = null;
        }

        // kill full screen helper ref
        this._phantomMenu.dispose();
        this._phantomElement = null;
        FullScreenHelper.detachFullScreenUrlUpdateEvent(this._fullScreenCallback);

        // unmount react components
        if (this._titleElement)
        {
            ReactDOM.unmountComponentAtNode(this._titleElement);
        }

        if (this._shortTitleElement)
        {
            ReactDOM.unmountComponentAtNode(this._shortTitleElement);
        }

        // find any tabs and unmount any react components as part of dispose
        // NOTE: that we don't do this in the tabs themselves because
        // we are disposing of the Flux object below and we want to
        // unmount the tabs first
        const tabs = this.getElement().find(".navigation-view-tab")
        for (let i = 0; i < tabs.length; i++) {
            ReactDOM.unmountComponentAtNode(tabs[i]);
        }

        if (this._shortcutGroup) {
            this._shortcutGroup.dispose();
            this._shortcutGroup = null;
        }

        this._disposeActions.map(dispose => dispose());
        this._disposeActions = [];
    }
}

// register this view as an enhancement to the page so it will be rendered
VSS.classExtend(PullRequestReviewView, TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(PullRequestReviewView, viewSelector);