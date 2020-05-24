import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import { PullRequestDetailStore } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { ClientPolicyEvaluationStore } from "VersionControl/Scenarios/PullRequestDetail/Stores/ClientPolicyEvaluationStore";
import { PullRequestAutoCompleteStore } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestAutoCompleteStore";
import { PullRequestCompleteMergeStore } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestCompleteMergeStore";
import { PullRequestStatusContributionsStore } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestStatusContributionsStore";
import { PullRequestStatusesStore } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestStatusesStore";
import { PullRequestLabelsStore } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestLabelsStore";
import { PullRequestPermissionsStore } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestPermissionsStore";
import { NotificationStore } from "VersionControl/Scripts/Stores/PullRequestReview/NotificationStore";
import { ReviewersStore } from "VersionControl/Scripts/Stores/PullRequestReview/ReviewersStore";
import { RepositoryItemDetailStore } from "VersionControl/Scripts/Stores/PullRequestReview/RepositoryItemDetailStore";
import { RelatedWorkItemsStore } from "VersionControl/Scripts/Stores/PullRequestReview/RelatedWorkItemsStore";
import { UserPreferencesStore } from "VersionControl/Scripts/Stores/PullRequestReview/UserPreferencesStore";
import { PullRequestCommitsStore } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestCommitsStore";
import { PullRequestIterationsStore } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestIterationsStore";
import { NavigationStore } from "VersionControl/Scripts/Stores/PullRequestReview/NavigationStore";
import { FileLineDiffCountStore } from "VersionControl/Scripts/Stores/PullRequestReview/FileLineDiffCountStore";
import { DiscussionsStore } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionsStore";
import { AttachmentsStore } from "VersionControl/Scripts/Stores/PullRequestReview/AttachmentsStore";
import { DiscussionAdapter, DiscussionManagerStore } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionManagerStore";
import { CodeExplorerStore } from "VersionControl/Scripts/Stores/PullRequestReview/CodeExplorerStore";
import { FollowsStore } from "VersionControl/Scripts/Stores/PullRequestReview/FollowsStore";
import { FeatureAvailabilityStore } from "VersionControl/Scenarios/Shared/Stores/FeatureAvailabilityStore";
import { ConflictStore } from "VersionControl/Scripts/Stores/PullRequestReview/ConflictStore";
import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { DiscussionRepaintStore } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionRepaintStore";
import { RefFavoritesStore } from "VersionControl/Scripts/Stores/PullRequestReview/RefFavoritesStore";
import { SharePullRequestStore } from "VersionControl/Scripts/Stores/PullRequestReview/SharePullRequestStore";

/* 
 * Stores Hub for Pull Request Details page.
*/

export class StoresHub {
    public followsStore: FollowsStore;
    public pullRequestDetailStore: PullRequestDetailStore;
    public pullRequestStatusContributionsStore: PullRequestStatusContributionsStore;
    public pullRequestLabelsStore: PullRequestLabelsStore;
    public pullRequestCompletionOptionsStore: PullRequestCompleteMergeStore;
    public permissionsStore: PullRequestPermissionsStore;
    public contextStore: ContextStore;
    public notificationStore: NotificationStore;
    public refFavoritesStore: RefFavoritesStore;
    public reviewersStore: ReviewersStore;
    public repositoryItemDetailStore: RepositoryItemDetailStore;
    public relatedWorkItemsStore: RelatedWorkItemsStore;
    public userPreferencesStore: UserPreferencesStore;
    public pullRequestCommitsStore: PullRequestCommitsStore;
    public pullRequestIterationsStore: PullRequestIterationsStore;
    public navigationStore: NavigationStore;
    public fileLineDiffCountStore: FileLineDiffCountStore;
    public discussionsStore: DiscussionsStore;
    public discussionManagerStore: DiscussionManagerStore;
    public attachmentStore: AttachmentsStore;
    public codeExplorerStore: CodeExplorerStore;
    public featureAvailabilityStore: FeatureAvailabilityStore;
    public conflictStore: ConflictStore;
    public discussionRepaintStore: DiscussionRepaintStore;
    public sharePullRequestStore: SharePullRequestStore;
    public autoCompleteStore: PullRequestAutoCompleteStore;
    public clientPolicyEvaluationStore: ClientPolicyEvaluationStore;
    public pullRequestStatusesStore: PullRequestStatusesStore;

    private _actionsHub: ActionsHub;

    // tslint:disable:max-func-body-length
    constructor(actionsHub: ActionsHub, createAdapter?: () => DiscussionAdapter) {
        // initializing stores and subscribing to Actions

        this._actionsHub = actionsHub;

        this.pullRequestDetailStore = new PullRequestDetailStore();
        this._actionsHub.contextUpdated.addListener(this.pullRequestDetailStore.onContextUpdated);
        this._actionsHub.pullRequestUpdating.addListener(this.pullRequestDetailStore.onPullRequestUpdating);
        this._actionsHub.pullRequestUpdated.addListener(this.pullRequestDetailStore.onPullRequestUpdated);
        this._actionsHub.pullRequestNotFound.addListener(this.pullRequestDetailStore.onPullRequestNotFound);
        this._actionsHub.pullRequestRestartMergeSucceeded.addListener(this.pullRequestDetailStore.onRestartMergeSucceeded);
        this._actionsHub.branchStatusUpdated.addListener(this.pullRequestDetailStore.onBranchStatusUpdated);
        this._actionsHub.deleteRefCompleted.addListener(this.pullRequestDetailStore.onRefDeleted);
        this._actionsHub.pullRequestBypassPermissionUpdated.addListener(this.pullRequestDetailStore.onBypassPermissionLoaded);
        this._actionsHub.pullRequestPendingDescriptionUpdated.addListener(this.pullRequestDetailStore.onPendingDescriptionUpdated);
        this._actionsHub.pullRequestTargetChanging.addListener(this.pullRequestDetailStore.onPullRequestTargetChanging);
        this._actionsHub.pullRequestTargetChanged.addListener(this.pullRequestDetailStore.onPullRequestTargetChanged);
        this._actionsHub.pullRequestTargetChangedError.addListener(this.pullRequestDetailStore.onPullRequestTargetChanged);

        this.pullRequestStatusContributionsStore = new PullRequestStatusContributionsStore();
        this._actionsHub.pullRequestStatusesContributionsUpdated.addListener(this.pullRequestStatusContributionsStore.onStatusContributionUpdated);

        this.contextStore = new ContextStore();
        this._actionsHub.contextUpdated.addListener(this.contextStore.onContextUpdated);

        this.pullRequestLabelsStore = new PullRequestLabelsStore();
        this._actionsHub.pullRequestLabelsLoaded.addListener(this.pullRequestLabelsStore.onLabelsLoaded);
        this._actionsHub.pullRequestLabelAdded.addListener(this.pullRequestLabelsStore.onLabelAdded);
        this._actionsHub.pullRequestLabelRemoved.addListener(this.pullRequestLabelsStore.onLabelRemoved);

        this.pullRequestCompletionOptionsStore = new PullRequestCompleteMergeStore();
        this._actionsHub.completionDialogOpened.addListener(this.pullRequestCompletionOptionsStore.onDialogOpened);
        this._actionsHub.mergeTitleUpdated.addListener(this.pullRequestCompletionOptionsStore.onMergeTitleChanged);
        this._actionsHub.pullRequestDetailUpdated.addListener(this.pullRequestCompletionOptionsStore.onPullRequestDetailUpdated);
        this._actionsHub.mergeDescriptionUpdated.addListener(this.pullRequestCompletionOptionsStore.onMergeDescriptionChanged);
        this._actionsHub.bypassReasonUpdated.addListener(this.pullRequestCompletionOptionsStore.onBypassReasonChanged);
        this._actionsHub.bypassUpdated.addListener(this.pullRequestCompletionOptionsStore.onBypassChanged);
        this._actionsHub.squashMergeUpdated.addListener(this.pullRequestCompletionOptionsStore.onSquashMergeUpdated);
        this._actionsHub.deleteSourceBranchUpdated.addListener(this.pullRequestCompletionOptionsStore.onDeleteSourceBranchUpdated);
        this._actionsHub.transitionWorkItemsUpdated.addListener(this.pullRequestCompletionOptionsStore.onTransitionWorkItemsUpdated);

        this.notificationStore = new NotificationStore();
        this._actionsHub.raiseError.addListener(this.notificationStore.onNotificationError);
        this._actionsHub.raiseNotification.addListener(this.notificationStore.onNotification);
        this._actionsHub.notificationsFlushed.addListener(this.notificationStore.onNotificationFlush);
        this._actionsHub.notificationDismissed.addListener(this.notificationStore.onNotificationDismissed);
        this._actionsHub.pullRequestMergeRestarted.addListener(this.notificationStore.rememberRestartMerge);
        this._actionsHub.pullRequestUpdated.addListener(this.notificationStore.onPullRequestUpdated);

        this.refFavoritesStore = new RefFavoritesStore();
        this._actionsHub.branchesFavoriteUpdated.addListener(this.refFavoritesStore.loadRefFavorites);
        this._actionsHub.pullRequestDetailUpdated.addListener(this.refFavoritesStore.loadCanFavorite);
        this._actionsHub.branchFavorited.addListener(this.refFavoritesStore.favoriteBranch);
        this._actionsHub.branchUnfavorited.addListener(this.refFavoritesStore.unfavoriteBranch);

        this.reviewersStore = new ReviewersStore();
        this._actionsHub.pullRequestUpdated.addListener(this.reviewersStore.onPullRequestDetailsChanged);
        this._actionsHub.voteSuccess.addListener(this.reviewersStore.onVoteChanged);
        this._actionsHub.addReviewerSuccess.addListener(this.reviewersStore.onVoteChanged);
        this._actionsHub.removeReviewerSuccess.addListener(this.reviewersStore.onReviewerRemoved);
        this._actionsHub.contextUpdated.addListener(this.reviewersStore.onContextChanged);
        this._actionsHub.policyEvaluationRecordsUpdated.addListener(this.reviewersStore.onPolicyEvaluationRecordsUpdated);
        this._actionsHub.clientPolicyEvaluationsUpdated.addListener(this.reviewersStore.onPolicyEvaluationUpdated);

        this.repositoryItemDetailStore = new RepositoryItemDetailStore();
        this._actionsHub.changeExplorerSelect.addListener(this.repositoryItemDetailStore.onResetItemDetail);
        this._actionsHub.changeItemDetailLoaded.addListener(this.repositoryItemDetailStore.onItemDetailLoaded);

        this.relatedWorkItemsStore = new RelatedWorkItemsStore();
        this._actionsHub.workItemsUpdated.addListener(this.relatedWorkItemsStore.onWorkItemsUpdated);
        this._actionsHub.workItemAdded.addListener(this.relatedWorkItemsStore.onWorkItemAdded);
        this._actionsHub.workItemsRemoving.addListener(this.relatedWorkItemsStore.onWorkItemsRemoved);
        this._actionsHub.workItemTransitionsUpdated.addListener(this.relatedWorkItemsStore.onWorkItemTransitionsUpdated);

        this.userPreferencesStore = new UserPreferencesStore();
        this._actionsHub.userPreferencesUpdated.addListener(this.userPreferencesStore.onPreferencesUpdated);
        this._actionsHub.squashMergeUpdated.addListener(this.userPreferencesStore.onSquashMergeUpdated);
        this._actionsHub.deleteSourceBranchUpdated.addListener(this.userPreferencesStore.onDeleteSourceBranchUpdated);
        this._actionsHub.transitionWorkItemsUpdated.addListener(this.userPreferencesStore.onTransitionWorkItemsUpdated);
        this._actionsHub.diffViewerOrientationUpdated.addListener(this.userPreferencesStore.onDiffViewerOrientationUpdated);
        this._actionsHub.summaryDiffViewerOrientationUpdated.addListener(this.userPreferencesStore.onSummaryDiffViewerOrientationUpdated);
        this._actionsHub.changeExplorerUpdateDisplayOption.addListener(this.userPreferencesStore.onDisplayOptionsUpdated);
        this._actionsHub.activityFeedFilterAdded.addListener(this.userPreferencesStore.onActivityFilterTypeAdded);
        this._actionsHub.activityFeedFilterRemoved.addListener(this.userPreferencesStore.onActivityFilterTypeRemoved);
        this._actionsHub.activityFeedFilterSet.addListener(this.userPreferencesStore.onActivityFilterTypeSet);
        this._actionsHub.activityFeedDescriptionExpanded.addListener(this.userPreferencesStore.onActivityDescriptionExpanded);

        this.pullRequestCommitsStore = new PullRequestCommitsStore();
        this._actionsHub.commitsUpdating.addListener(this.pullRequestCommitsStore.onCommitsUpdating);
        this._actionsHub.commitsUpdated.addListener(this.pullRequestCommitsStore.onCommitsUpdated);
        this._actionsHub.pullRequestUpdateError.addListener(this.pullRequestCommitsStore.onPullRequestError);

        this.pullRequestIterationsStore = new PullRequestIterationsStore();
        this._actionsHub.iterationsUpdating.addListener(this.pullRequestIterationsStore.onIterationsUpdating);
        this._actionsHub.iterationsUpdated.addListener(this.pullRequestIterationsStore.onIterationsUpdated);

        this.navigationStore = new NavigationStore();
        this._actionsHub.navigationStateChanged.addListener(this.navigationStore.onStateChanged);
        this._actionsHub.lastVisitUpdated.addListener(this.navigationStore.onLastVisitUpdated);
        this._actionsHub.lastVisitBannerDismissed.addListener(this.navigationStore.onLastVisitBannerDismissed);
        this._actionsHub.liveUpdateChanged.addListener(this.navigationStore.onLiveUpdateChanged);

        this.permissionsStore = new PullRequestPermissionsStore();
        this._actionsHub.permissionsUpdated.addListener(this.permissionsStore.onPermissionsUpdated);
        this._actionsHub.pullRequestUpdated.addListener(this.permissionsStore.onPullRequestUpdated);

        this.fileLineDiffCountStore = new FileLineDiffCountStore();

        this.discussionsStore = new DiscussionsStore();
        this.attachmentStore = new AttachmentsStore();

        // code review changes
        this.codeExplorerStore = new CodeExplorerStore();
        this._actionsHub.changeNotificationReceived.addListener(this.codeExplorerStore.onChangeNotification);
        this._actionsHub.iterationChangesUpdated.addListener(this.codeExplorerStore.onIterationChangesUpdated);
        this._actionsHub.iterationChangesUpdateStart.addListener(this.codeExplorerStore.onIterationUpdateStart);
        this._actionsHub.iterationSelected.addListener(this.codeExplorerStore.onIterationSelected);
        this._actionsHub.iterationsUpdated.addListener(this.codeExplorerStore.onIterationsUpdated);
        this._actionsHub.pullRequestUpdated.addListener(this.codeExplorerStore.onPullRequestUpdated);
        this._actionsHub.fileDiffCache.addListener(this.codeExplorerStore.onFileDiffCache);
        this._actionsHub.changesFiltered.addListener(this.codeExplorerStore.onChangesFiltered);
        this._actionsHub.branchStatusUpdated.addListener(this.codeExplorerStore.onBranchStatusUpdated);
        this._actionsHub.changeExplorerSelect.addListener(this.codeExplorerStore.onTreeItemSelected);
        this._actionsHub.newPushesRead.addListener(this.codeExplorerStore.onNewPushesRead);

        // DiscussionManagerStore needs new DiscussionAdapter to be initialized for each PullRequestDiscussionManager
        this.discussionManagerStore = new DiscussionManagerStore(createAdapter);
        this._actionsHub.contextUpdated.addListener(this.discussionManagerStore.onContextUpdated);
        this._actionsHub.pullRequestUpdated.addListener(this.discussionManagerStore.onPullRequestUpdated);
        this._actionsHub.iterationSelected.addListener(this.discussionManagerStore.onIterationSelected);

        this.followsStore = new FollowsStore();
        this._actionsHub.followPullRequestSubscriptionUpdated.addListener(this.followsStore.onFollowSubscriptionUpdated);
        this._actionsHub.followPullRequestSubscriptionDeleted.addListener(this.followsStore.onFollowSubscriptionDeleted);
        this._actionsHub.followPullRequestUpdateStart.addListener(this.followsStore.onFollowUpdateStarted);
        this._actionsHub.setFeatureFlags.addListener(this.followsStore.onFeatureFlagsUpdated);

        this.featureAvailabilityStore = new FeatureAvailabilityStore();
        this._actionsHub.setFeatureFlags.addListener(this.featureAvailabilityStore.onFeatureFlagEnabledUpdated);

        this.conflictStore = new ConflictStore();
        this._actionsHub.conflictsUpdated.addListener(this.conflictStore.onConflictsUpdated);
        this._actionsHub.pullRequestUpdated.addListener(this.conflictStore.onPullRequestUpdated);

        // wire the repaint store to the navigational events that discussions needs to know about for painting in monaco
        // previously it was listening to the entire nav and code explorer stores but hopefully this subset of actions covers what we need.
        this.discussionRepaintStore = new DiscussionRepaintStore();
        this._actionsHub.navigationStateChanged.addListener(this.discussionRepaintStore.onPaint);
        this._actionsHub.changeExplorerSelect.addListener(this.discussionRepaintStore.onPaint);
        this._actionsHub.changeItemDetailLoaded.addListener(this.discussionRepaintStore.onPaint);

        this.sharePullRequestStore = new SharePullRequestStore();
        this._actionsHub.showShareDialog.addListener(this.sharePullRequestStore.onShowDialog);
        this._actionsHub.pullRequestTeamExpansionEnabledUpdated.addListener(this.sharePullRequestStore.onTeamExpansionEnabled);

        this.autoCompleteStore = new PullRequestAutoCompleteStore();
        this._actionsHub.autoCompleteCriteriaUpdated.addListener(this.autoCompleteStore.autoCompleteCriteriaUpdated);
        this._actionsHub.pullRequestUpdated.addListener(this.autoCompleteStore.onPullRequestUpdated);

        this.clientPolicyEvaluationStore = new ClientPolicyEvaluationStore();
        this._actionsHub.clientPolicyEvaluationsUpdated.addListener(this.clientPolicyEvaluationStore.onPolicyEvaluationsUpdated);
        this._actionsHub.clientPolicyEvaluationsPartiallyUpdated.addListener(this.clientPolicyEvaluationStore.onPolicyEvaluationsPartiallyUpdated);
        this._actionsHub.pullRequestUpdated.addListener(payload => this.clientPolicyEvaluationStore.onPullRequestUpdated(payload.pullRequest));
        this._actionsHub.dynamicClientPolicyUpdateRequested.addListener(this.clientPolicyEvaluationStore.onDynamicPolicyEvaluation);
        this._actionsHub.clientPolicyEvaluationsUpdateFailed.addListener(this.clientPolicyEvaluationStore.onPolicyEvaluationsUpdateFailed);
        this._actionsHub.pullRequestTargetChanged.addListener(this.clientPolicyEvaluationStore.onPullRequestTargetChanged);

        this.pullRequestStatusesStore = new PullRequestStatusesStore();
        this._actionsHub.pullRequestStatusUpdated.addListener(this.pullRequestStatusesStore.onPullRequestStatusesUpdated);
        this._actionsHub.clientPolicyEvaluationsUpdated.addListener(evals => this.pullRequestStatusesStore.onPolicyEvaluationsUpdated(evals, false));
        this._actionsHub.clientPolicyEvaluationsPartiallyUpdated.addListener(evals => this.pullRequestStatusesStore.onPolicyEvaluationsUpdated(evals, true));
        this._actionsHub.iterationsUpdated.addListener(this.pullRequestStatusesStore.onIterationsUpdated);
    }

    public dispose(): void {
        if (!this._actionsHub) {
            return;
        }
        if (this.discussionManagerStore) {
            this.discussionManagerStore.dispose();
        }

        this._actionsHub = null;
    }
}
