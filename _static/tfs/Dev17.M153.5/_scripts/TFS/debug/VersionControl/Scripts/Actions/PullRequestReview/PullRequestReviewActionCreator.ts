// stores
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";

// actions
import { ActionsHub, ChangeNotificationType } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

// action creators
import { PullRequestAutoCompleteActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestAutoCompleteActionCreator";
import { PullRequestClientPoliciesActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestClientPoliciesActionCreator";
import { PullRequestCompleteMergeActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestCompleteMergeActionCreator";
import { PullRequestLabelsActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestLabelsActionCreator";
import { PullRequestPermissionsActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestPermissionsActionCreator";
import { PullRequestStatusActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestStatusActionCreator";
import { AttachmentActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/AttachmentActionCreator";
import { CodeExplorerActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/CodeExplorerActionCreator";
import { ConflictActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/ConflictActionCreator";
import { DiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/DiscussionActionCreator";
import { FollowsActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/FollowsActionCreator";
import { NavigationActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/NavigationActionCreator";
import { PullRequestActionCreator, PullRequestDetailRefreshOptions } from "VersionControl/Scripts/Actions/PullRequestReview/PullRequestActionCreator";
import { ReviewerActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/ReviewerActionCreator";
import { SharePullRequestActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/SharePullRequestActionCreator";
import { UserPreferenceActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/UserPreferenceActionCreator";
import { WorkItemActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/WorkItemActionCreator";
import { PullRequestTelemetrySpy } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestTelemetrySpy";

// sources
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";

// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { Notification, NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { autobind } from "OfficeFabric/Utilities";
import { Debug } from "VSS/Diag";

/**
 * This thing ties the actions and the sources together
 * and allows us to execute actions and ajax requests coherently
 */
export class PullRequestReviewActionCreator {
    private _actionsHub: ActionsHub;
    private _sourcesHub: SourcesHub;
    private _storesHub: StoresHub;
    private _telemetrySpy: PullRequestTelemetrySpy;

    private _repositoryId: string;
    public workItemActionCreator: WorkItemActionCreator;
    public discussionActionCreator: DiscussionActionCreator;
    public pullRequestActionCreator: PullRequestActionCreator;
    public codeExplorerActionCreator: CodeExplorerActionCreator;
    public reviewerActionCreator: ReviewerActionCreator;
    public userPreferenceActionCreator: UserPreferenceActionCreator;
    public navigationActionCreator: NavigationActionCreator;
    public followsActionCreator: FollowsActionCreator;
    public conflictActionCreator: ConflictActionCreator;
    public attachmentActionCreator: AttachmentActionCreator;
    public statusActionCreator: PullRequestStatusActionCreator;
    public labelsActionCreator: PullRequestLabelsActionCreator;
    public sharePullRequestActionCreator: SharePullRequestActionCreator;
    public completeMergeActionCreator: PullRequestCompleteMergeActionCreator;
    public autoCompleteActionCreator: PullRequestAutoCompleteActionCreator;
    public permissionsActionCreator: PullRequestPermissionsActionCreator;
    public clientPoliciesActionCreator: PullRequestClientPoliciesActionCreator;

    /**
     * Initialize the action creator base context so it can be used to generate actions.
     */
    constructor(
        tfsContext: TfsContext,
        repositoryContext: GitRepositoryContext,
        pullRequestId: number,
        storesHub: StoresHub,
        actionsHub: ActionsHub,
        sourcesHub: SourcesHub) {

        this._repositoryId = repositoryContext.getRepositoryId();
        this._actionsHub = actionsHub;
        this._sourcesHub = sourcesHub;
        this._storesHub = storesHub;

        this._telemetrySpy = new PullRequestTelemetrySpy(actionsHub);

        this.navigationActionCreator = new NavigationActionCreator(tfsContext, actionsHub, sourcesHub, storesHub);
        this.attachmentActionCreator = new AttachmentActionCreator(actionsHub);
        this.discussionActionCreator = new DiscussionActionCreator(tfsContext, actionsHub);
        this.codeExplorerActionCreator = new CodeExplorerActionCreator(this.discussionActionCreator, pullRequestId, storesHub, actionsHub, sourcesHub);
        this.conflictActionCreator = new ConflictActionCreator(repositoryContext, storesHub, actionsHub, sourcesHub);
        this.followsActionCreator = new FollowsActionCreator(tfsContext, storesHub, actionsHub, sourcesHub);
        this.statusActionCreator = new PullRequestStatusActionCreator(repositoryContext, actionsHub, sourcesHub, storesHub);
        this.labelsActionCreator = new PullRequestLabelsActionCreator(repositoryContext, actionsHub, sourcesHub, storesHub);
        this.completeMergeActionCreator = new PullRequestCompleteMergeActionCreator(repositoryContext, actionsHub, sourcesHub, storesHub);
        this.sharePullRequestActionCreator = new SharePullRequestActionCreator(actionsHub, sourcesHub);
        this.permissionsActionCreator = new PullRequestPermissionsActionCreator(actionsHub, sourcesHub);
        this.autoCompleteActionCreator = new PullRequestAutoCompleteActionCreator(actionsHub, sourcesHub, storesHub, pullRequestId);
        this.clientPoliciesActionCreator = new PullRequestClientPoliciesActionCreator(actionsHub, sourcesHub, storesHub, pullRequestId);
        this.workItemActionCreator = new WorkItemActionCreator(this.clientPoliciesActionCreator, this.autoCompleteActionCreator, actionsHub, sourcesHub, storesHub);

        this.pullRequestActionCreator = new PullRequestActionCreator(
            this.workItemActionCreator,
            this.discussionActionCreator,
            this.codeExplorerActionCreator,
            this.followsActionCreator,
            this.conflictActionCreator,
            this.attachmentActionCreator,
            this.statusActionCreator,
            this.sharePullRequestActionCreator,
            this.labelsActionCreator,
            this.completeMergeActionCreator,
            this.autoCompleteActionCreator,
            this.permissionsActionCreator,
            this.navigationActionCreator,
            this.clientPoliciesActionCreator,
            actionsHub,
            storesHub,
            sourcesHub);
        this.reviewerActionCreator = new ReviewerActionCreator(
            this.pullRequestActionCreator,
            this.clientPoliciesActionCreator,
            this.autoCompleteActionCreator,
            actionsHub,
            sourcesHub);
        this.userPreferenceActionCreator = new UserPreferenceActionCreator(storesHub, actionsHub, sourcesHub, this.conflictActionCreator);
    }

    /**
     * Fire page level preference initialization events.
     */
    public initializePreferences(): void {
        // get user preferences on load
        this.userPreferenceActionCreator.updateUserPreferences();
        // get feature flag state for needed features on load
        this.userPreferenceActionCreator.updateFeatureFlags({
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsCommentFeedback]: false,
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsDiscussionCollapseWidget]: false,
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsDiscussionCommentLikes]: false,
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsAutoComplete]: false,
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsLabels]: false,
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlCherryPick]: false,
            [ServerConstants.FeatureAvailabilityFlags.SourceControlRevert]: false,
            [ServerConstants.FeatureAvailabilityFlags.SourceControlGitPullRequestsConflicts]: false,
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlConflictsDisplay]: false,
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsFollows]: false,
            [ServerConstants.FeatureAvailabilityFlags.SourceControlPullRequestsAttachments]: false,
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsCommitsTabReplaced]: false,
            [ServerConstants.FeatureAvailabilityFlags.SourceControlGitPullRequestsDraft]: false,
            [ServerConstants.FeatureAvailabilityFlags.SourceControlGitPullRequestsRetarget]: false,
        });
    }

    /**
     * Used to dismiss change notifications in the UI.
     */
    public flushNotifications(type: NotificationType, specialType?: string): void {
        this._actionsHub.notificationsFlushed.invoke({ type, specialType });
    }

    public dismissNotification = (notification: Notification): void => {
        this._actionsHub.notificationDismissed.invoke({ notification });
    }

    public clearNewPushes() {
        this._actionsHub.newPushesRead.invoke(undefined);
    }

    /**
     * Indicate tab was changed on the main page. This allows us to wire hub navigation into react state.
     */
    public changeTab(action: string): void {
        this._actionsHub.tabChanged.invoke({ action: action });
    }

    public notifyMainContentLoadStarted(action: string, innerPageNavigation?: boolean): void {
        this._telemetrySpy.startNewPageLoadScenario(action, innerPageNavigation);
    }

    public notifyMainContentRendered(): void {
        this._telemetrySpy.endPageLoadScenario();
    }

    /**
     * Toggle full screen. This allows us to wire the full screen helper into react state.
     * @param isFullScreen
     */
    public toggleFullScreen(isFullScreen: boolean): void {
        this._actionsHub.fullScreenChanged.invoke({ isFullScreen: isFullScreen });
    }

    /**
     * Notify us that a SignalR notification was received.
     */
    public changeNotificationReceived(): void {
        this._actionsHub.changeNotificationReceived.invoke({
            changeType: ChangeNotificationType.push
        });
    }

    /**
     * Notify us that a SignalR retarget was received.
     */
    public retargetNotificationReceived(): void {
        this._actionsHub.changeNotificationReceived.invoke({
            changeType: ChangeNotificationType.retarget
        });
    }

    /**
     * Notify us that live updates were turned on or off.
     */
    @autobind
    public setLiveUpdate(shouldUpdate: boolean): void {
        this._actionsHub.liveUpdateChanged.invoke({ shouldUpdate: shouldUpdate });

        // if we turned back on live updating then we need to refresh the PR
        if (shouldUpdate) {
            this.refreshDataIslandIterations();
        }
    }

    /**
     * Display an error notification
     */
    public displayErrorNotification(message: string): void {
        this._actionsHub.raiseError.invoke(message);
    }

    /**
     * Display an error notification
     */
    public displayWarningNotification(message: string, specialType?: string): void {
        this._actionsHub.raiseNotification.invoke({
            message,
            type: NotificationType.warning,
            specialType,
        });
    }

    /**
     * Refresh all simple data for a pull request.
     */
    public refreshDataIslandPullRequest(pullRequestId: number) {
        this._actionsHub.refreshDataProviderStarted.invoke({
            pullRequestId,
            mode: "simple",
        });

        // 1 - refresh the data provider
        this._sourcesHub.dataProviderSource.refresh(pullRequestId).then(
            () => {
                this._actionsHub.refreshDataProviderComplete.invoke({
                    pullRequestId,
                    mode: "simple"
                });

                // 2 - clear caches for any sources we expect to update
                this._sourcesHub.pullRequestDetailSource.resetCache();
                this._sourcesHub.policyEvaluationSource.resetCache();
                this._sourcesHub.gitRepositorySource.resetCache();

                // 3 - call the appropriate actions to re-hydrate our stores
                const refreshOptions =
                    PullRequestDetailRefreshOptions.Basic |
                    PullRequestDetailRefreshOptions.Policy |
                    PullRequestDetailRefreshOptions.BranchStatus |
                    PullRequestDetailRefreshOptions.Commits;

                this.pullRequestActionCreator.queryPullRequestDetail(pullRequestId, refreshOptions);
            },
            (error) => {
                Debug.fail((error && error.message) ? error.message : (error + ""));
            }
        );
    }

    /**
     * Refresh iteration data for a pull request.
     */
    public refreshDataIslandIterations(): IPromise<void> {
        // do nothing if we are still loading
        if (this._storesHub.pullRequestDetailStore.isLoading()) {
            return;
        }

        const pullRequest = this._storesHub.pullRequestDetailStore.getPullRequestDetail();

        this._actionsHub.refreshDataProviderStarted.invoke({
            pullRequestId: pullRequest.pullRequestId,
            mode: "iterations",
        });

        // 1 - refresh the data provider
        return this._sourcesHub.dataProviderSource.refresh(pullRequest.pullRequestId, "iterations").then(
            () => {
                this._actionsHub.refreshDataProviderComplete.invoke({
                    pullRequestId: pullRequest.pullRequestId,
                    mode: "iterations",
                });

                // 2 - clear caches for any sources we expect to update
                this._sourcesHub.pullRequestDetailSource.resetCache();
                this._sourcesHub.policyEvaluationSource.resetCache();
                this._sourcesHub.gitRepositorySource.resetCache();
                this._sourcesHub.discussionSource.resetCache();
                this._sourcesHub.pullRequestChangesSource.resetCache();

                // 3 - call the appropriate actions to re-hydrate our stores
                // note that we actually don't need to refresh the PR data, but we get it "for free" since we are
                // calling the data provider already
                const refreshOptions =
                    PullRequestDetailRefreshOptions.Basic |
                    PullRequestDetailRefreshOptions.BranchStatus |
                    PullRequestDetailRefreshOptions.Commits;
                this.pullRequestActionCreator.queryPullRequestDetail(pullRequest.pullRequestId, refreshOptions);

                // this will also kick off a call to retrieve discussion threads
                this.codeExplorerActionCreator.queryIterations(!pullRequest.supportsIterations);
            },
            (error) => {
                Debug.fail((error && error.message) ? error.message : (error + ""));
            }
        );
    }
}
