// contracts needed for payloads
import { ArtifactSubscription } from "Notifications/Services";
import { PolicyEvaluationRecord } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import * as DiscussionConstants from "Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants";
import * as DiscussionCommon from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WebApiTagDefinition } from "TFS/Core/Contracts";
import * as VCContracts from "TFS/VersionControl/Contracts";
import { WorkItemNextStateOnTransition } from "TFS/WorkItemTracking/Contracts";
import * as GitPullRequestStatusUtils from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusUtils";
import { AutoCompleteBlockingPolicy } from "VersionControl/Scenarios/PullRequestDetail/Contracts/AutoCompleteBlockingPolicy";
import { PullRequestPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Contracts/PullRequestPolicyEvaluation";
import { ISquashPolicySetting } from "VersionControl/Scenarios/PullRequestDetail/Stores/ClientPolicyEvaluationStore";
import { PullRequestPermissionsSet } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestPermissionsStore";
import { Notification, NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { ChangeExplorerGridModeChangedEventArgs } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid";
import * as VCPullRequestsControls from "VersionControl/Scripts/Controls/PullRequest";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCWebAccessContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { DataProviderMode } from "VersionControl/Scripts/Sources/DataProviderSource";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { GitPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import * as VCPullRequest from "VersionControl/Scripts/TFS.VersionControl.PullRequest";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { ResourceRef } from "VSS/WebApi/Contracts";
import { GitRepository } from "TFS/VersionControl/Contracts";

import { Action } from "VSS/Flux/Action";

export class ActionsHub {
    // context actions
    public contextUpdated = new Action<IContextUpdatedPayload>();

    // pull request actions
    public pullRequestUpdating = new Action<IPullRequestUpdatingPayload>();
    public pullRequestUpdated = new Action<IPullRequestUpdatedPayload>();
    public pullRequestNotFound = new Action<IPullRequestNotFoundPayload>();
    public pullRequestUpdateError = new Action<IPullRequestUpdateErrorPayload>();
    public pullRequestMergeRestarted = new Action<void>();
    public pullRequestRestartMergeSucceeded = new Action<void>();
    public pullRequestBypassPermissionUpdated = new Action<IPullRequestBypassPermissionUpdatedPayload>();
    public pullRequestTeamExpansionEnabledUpdated = new Action<IPullRequestTeamExpansionEnabledPayload>();
    public pullRequestPendingDescriptionUpdated = new Action<string>();
    public pullRequestTargetChanging = new Action<void>();
    public pullRequestTargetChanged = new Action<void>();
    public pullRequestTargetChangedError = new Action<void>();

    // branch status actions
    public branchStatusUpdating = new Action<void>();
    public branchStatusUpdated = new Action<IBranchStatusUpdatedPayload>();
    public deleteRefCompleted = new Action<IDeleteRefCompletedPayload>();
    public branchesFavoriteUpdated = new Action<IBranchesFavoriteUpdatedPayload>();
    public branchFavorited = new Action<IBranchFavoritedPayload>();
    public branchUnfavorited = new Action<IBranchUnfavoritedPayload>();

    // commits actions
    public commitsUpdating = new Action<ICommitsUpdatingPayload>();
    public commitsUpdated = new Action<ICommitsUpdatedPayload>();

    public changeNotificationReceived = new Action<IChangeNotificationPayload>();
    public liveUpdateChanged = new Action<ILiveUpdateChangedPayload>();
    public raiseError = new Action<any>();
    public raiseNotification = new Action<INotificationPayload>();
    public notificationsFlushed = new Action<INotificationFlushPayload>();
    public notificationDismissed = new Action<INotificationDismissPayload>();
    public newPushesRead = new Action<void>();

    // code explorer actions
    public iterationSelected = new Action<IIterationSelectedPayload>();
    public iterationChangesUpdateStart = new Action<IIterationChangesUpdateStartPayload>();
    public iterationChangesUpdated = new Action<IIterationChangesUpdatedPayload>();
    public fileDiffCache = new Action<IFileDiffFetchedPayload>();
    public changesFiltered = new Action<IChangesFilteredPayload>();

    // reviewer actions
    public voteSuccess = new Action<IReviewerInfoUpdatedPayload>();
    public addReviewerSuccess = new Action<IReviewerInfoUpdatedPayload>();
    public removeReviewerStart = new Action<IRemoveReviewerPayload>();
    public removeReviewerSuccess = new Action<IRemoveReviewerPayload>();

    // change explorer actions
    public changeExplorerSelect = new Action<IChangeExplorerSelectPayload>();
    public changeItemDetailLoading = new Action<void>();
    public changeItemDetailLoaded = new Action<IChangeItemDetailLoadedPayload>();
    public changeExplorerUpdateDisplayOption = new Action<IChangeExplorerUpdateDisplayOptionPayload>();
    public diffViewerOrientationUpdated = new Action<IOrientationUpdatedPayload>();
    public summaryDiffViewerOrientationUpdated = new Action<IOrientationUpdatedPayload>();

    // work item actions
    public workItemsUpdating = new Action<void>();
    public workItemsUpdated = new Action<IWorkItemsUpdatedPayload>();
    public workItemAdded = new Action<IWorkItemAddedPayload>();
    public workItemsRemoving = new Action<IWorkItemsRemovedPayload>();
    public workItemsRemoved = new Action<IWorkItemsRemovedPayload>();
    public workItemTransitionsUpdated = new Action<IWorkItemTransitionsUpdatedPayload>();

    // user preference actions
    public userPreferencesUpdating = new Action<void>();
    public userPreferencesUpdated = new Action<IUserPreferencesUpdatedPayload>();

    // feature flag toggles
    public setFeatureFlags = new Action<ISetFeatureFlagsPayload>();

    // merge completion actions
    public completionDialogOpened = new Action<IOpenCompletionDialogPayload>();
    public mergeTitleUpdated = new Action<IMergeTitlePayload>();
    public mergeDescriptionUpdated = new Action<IMergeDescriptionPayload>();
    public bypassReasonUpdated = new Action<IBypassReasonPayload>();
    public bypassUpdated = new Action<ICompletionOptionPayload>();
    public squashMergeUpdated = new Action<ICompletionOptionPayload>();
    public deleteSourceBranchUpdated = new Action<ICompletionOptionPayload>();
    public transitionWorkItemsUpdated = new Action<ICompletionOptionPayload>();
    public pullRequestDetailUpdated = new Action<IPullRequestDetailPayload>();

    // conflict actions
    public conflictsUpdating = new Action<void>();
    public conflictsUpdated = new Action<IConflictsUpdatedPayload>();

    // discussion/comment actions
    public discussionThreadsUpdating = new Action<void>();
    public discussionThreadsUpdated = new Action<IDiscussionThreadsUpdatedPayload>();
    public discussionThreadUpdated = new Action<IDiscussionThreadPayload>();
    public discussionThreadStatusUpdated = new Action<IDiscussionThreadPayload>();
    public discussionCommentUpdated = new Action<IDiscussionCommentPayload>();
    public discussionCommentLikeUpdated = new Action<IDiscussionCommentPayload>();
    public discussionFilterUpdated = new Action<IDiscussionFilterUpdatedPayload>();
    public discussionApplyCurrentCollapseFilter = new Action<IDiscussionThreadPayload>();
    public discussionSelected = new Action<IDiscussionSelectedPayload>();
    public discussionCommentAdded = new Action<IDiscussionCommentAddedPayload>();
    public discussionCommentDeleted = new Action<IDiscussionCommentPayload>();
    public discussionThreadDeleted = new Action<IDiscussionThreadPayload>();
    public discussionCommentComitting = new Action<IDiscussionCommentPayload>();
    public discussionCommentComitted = new Action<IDiscussionCommentComittedPayload>();
    public discussionCommentCommitFailed = new Action<IDiscussionCommentPayload>();
    public discussionThreadComitting = new Action<IDiscussionThreadPayload>();
    public discussionThreadComitted = new Action<IDiscussionThreadComittedPayload>();
    public discussionThreadCommitFailed = new Action<IDiscussionThreadPayload>();
    public discussionThreadClearedNewComments = new Action<IDiscussionThreadPayload>();
    public discussionThreadCollapse = new Action<IDiscussionThreadPayload>();
    public discussionThreadExpandGroup = new Action<IDiscussionThreadPayload>();

    // discussion attachments actions
    public attachmentCreated = new Action<IAttachmentCreatedPayload>();
    public attachmentCommitted = new Action<IAttachmentCommittedPayload>();
    public attachmentsUpdated = new Action<IAttachmentsUpdatedPayload>();
    public attachmentError = new Action<IAttachmentErrorPayload>();
    public attachmentClearError = new Action<IAttachmentClearErrorPayload>();

    // activity feed actions
    public activityFeedFilterAdded = new Action<IActivityFeedFilterChangedPayload>();
    public activityFeedFilterRemoved = new Action<IActivityFeedFilterChangedPayload>();
    public activityFeedFilterSet = new Action<IActivityFeedFilterChangedPayload>();
    public activityFeedOrderUpdated = new Action<IUpdateActivityOrderPayload>();
    public activityFeedDescriptionExpanded = new Action<IExpandActivityDescriptionPayload>();

    // iteration actions
    public iterationsUpdating = new Action<IIterationsUpdatingPayload>();
    public iterationsUpdated = new Action<IIterationsUpdatedPayload>();

    // policy actions
    public policyEvaluationRecordsUpdated = new Action<IPolicyEvaluationRecordsUpdatedPayload>();
    public policyEvaluationRecordsRefreshUi = new Action<void>();
    public buildLinkUpdated = new Action<IBuildLinkUpdatedPayload>();

    // pull request status
    public pullRequestStatusUpdating = new Action<void>();
    public pullRequestStatusUpdated = new Action<IPullRequestStatusUpdatedPayload>();
    public pullRequestStatusesContributionsUpdated = new Action<IPullRequestStatusesContributionPayload>();

    // pull request labels
    public pullRequestLabelsLoading = new Action<void>();
    public pullRequestLabelsLoaded = new Action<IPullRequestLabelsUpdatedPayload>();
    public pullRequestLabelAdded = new Action<IPullRequestLabelUpdatedPayload>();
    public pullRequestLabelRemoved = new Action<IPullRequestLabelUpdatedPayload>();

    // navigation
    public tabChanged = new Action<ITabChangedPayload>();
    public fullScreenChanged = new Action<IFullScreenChangedPayload>();
    public navigationStateChanged = new Action<INavigationStateChangedPayload>();
    public lastVisitBannerDismissed = new Action<void>();
    public lastVisitUpdating = new Action<void>();
    public lastVisitUpdated = new Action<ILastVisitUpdatedPayload>();

    // These two actions are for the discussion manager. It can't listen to the same actions as the store
    // because it needs the store to react to them first and then it needs to be notified that the store is done
    public discussionCommentComitted_ForDiscussionManager = new Action<IDiscussionCommentComittedPayload>();
    public discussionThreadComitted_ForDiscussionManager = new Action<IDiscussionThreadComittedPayload>();
    public discussionThreadAdded_ForDiscussionManager = new Action<IDiscussionThreadPayload>();
    public discussionThreadsUpdated_ForDiscussionManager = new Action<IDiscussionThreadsUpdatedPayload>();

    // follow actions
    public followPullRequestSubscriptionUpdated = new Action<IFollowArtifactUpdatedPayload>();
    public followPullRequestSubscriptionDeleted = new Action<IFollowArtifactUpdatedPayload>();
    public followPullRequestUpdateStart = new Action<IFollowArtifactUpdateStartPayload>();

    // share pull request actions
    public showShareDialog = new Action<IShowShareDialogPayload>();

    // refresh data provider actions
    public refreshDataProviderStarted = new Action<IRefreshDataProviderStarted>();
    public refreshDataProviderComplete = new Action<IRefreshDataProviderComplete>();

    // autoComplete criteria updated
    public autoCompleteCriteriaUpdated = new Action<IAutoCompleteCriteriaUpdated>();

    // pull request client policies
    public clientPolicyEvaluationsUpdated = new Action<PullRequestPolicyEvaluation[]>();
    public clientPolicyEvaluationsPartiallyUpdated = new Action<PullRequestPolicyEvaluation[]>();
    public clientPolicyEvaluationsUpdateFailed = new Action<Error>();
    public dynamicClientPolicyUpdateRequested = new Action<void>();

    // permissions actions
    public permissionsUpdating = new Action<void>();
    public permissionsUpdated = new Action<PullRequestPermissionsSet>();

    // signalr actions
    public signalrHubLoading = new Action<void>();
    public signalrHubLoaded = new Action<void>();
}

// context payload
export interface IContextUpdatedPayload {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
}

// pull request payload
export interface IPullRequestUpdatingPayload {
    pullRequestId: number;
}

export interface IPullRequestNotFoundPayload {
    pullRequestId: number;
}

export interface IPullRequestUpdatedPayload {
    pullRequest: VCContracts.GitPullRequest;
}

export interface IOpenCompletionDialogPayload {
    associatedWorkItemIds: number[];
    shouldDeleteSourceBranch: boolean;
    shouldTransitionWorkItems: boolean;
    shouldSquashMerge: boolean;
    canTransitionWorkItems: boolean;
    canBypassPolicy: boolean;
    squashPolicySetting: ISquashPolicySetting;
    pullRequestDetail: IPullRequest;
}

export interface IPullRequestDetailPayload {
    pullRequestDetail: IPullRequest;
    canFavorite: boolean;
}

export interface IMergeTitlePayload {
    mergeTitle: string;
}

export interface IMergeDescriptionPayload {
    mergeDescription: string;
}

export interface IBypassReasonPayload {
    bypassReason: string;
}

export interface IPullRequestUpdateErrorPayload {
    error: any;
}

export interface IPullRequestBypassPermissionUpdatedPayload {
    canBypass: boolean;
}

export interface IPullRequestTeamExpansionEnabledPayload {
    expansionEnabled: boolean;
}

// follow payload
export interface IFollowArtifactUpdatedPayload {
    subscription: ArtifactSubscription;
}

export interface IFollowArtifactUpdateStartPayload {
    artifactId: string;
}

// code explorer payload
export interface IIterationSelectedPayload {
    iterationId: number;
    baseId: number;
}

export interface IIterationChangesUpdateStartPayload {
    iterationId: number;
    baseId: number;
}

export interface IIterationChangesUpdatedPayload {
    iterationId: number;
    baseId: number;
    changes: VCContracts.GitPullRequestIterationChanges;
    top: number;
    skip: number;
}

export interface IFileDiffFetchedPayload {
    itemDescription: string;
    fileDiff: VCLegacyContracts.FileDiff;
}

export interface IChangesFilteredPayload {
    changes: VCLegacyContracts.Change[];
}

// work item payload
export interface IWorkItemsUpdatedPayload {
    workItems: ResourceRef[];
}

export interface IWorkItemAddedPayload {
    workItemId: number;
}

export interface IWorkItemsRemovedPayload {
    workItemIds: number[];
}

export interface IWorkItemTransitionsUpdatedPayload {
    workItemTransitions: WorkItemNextStateOnTransition[];
}

export interface RefStatus {
    repoDeletedOrNotReadable: boolean;
    isDeleted: boolean;
    isInUse: boolean;
    isDefault: boolean;
    hasApplicablePolicies: boolean;
    hasPermissionToDelete: boolean;
}

// branch status payload
export interface IBranchStatusUpdatedPayload {
    branchStatus: VCPullRequest.IPullRequestBranchStatus;
    sourceRefStatus: RefStatus;
}

export interface IDeleteRefCompletedPayload {
    pullRequestId: number;
    success: boolean;
    message: string;
}

export interface IBranchesFavoriteUpdatedPayload {
    refFavorites: VCContracts.GitRefFavorite[];
}

export interface IBranchFavoritedPayload {
    newRefFavorite: VCContracts.GitRefFavorite;
}

export interface IBranchUnfavoritedPayload {
    favoriteId: number;
}

// discussion payload
export interface IDiscussionThreadsUpdatedPayload {
    threads: DiscussionConstants.DiscussionThread[];
}

export interface IDiscussionThreadPayload {
    thread: DiscussionConstants.DiscussionThread;
    focusReplyBox?: boolean;
}

export interface IDiscussionCommentPayload {
    thread: DiscussionConstants.DiscussionThread;
    comment: DiscussionConstants.DiscussionComment;
    focusReplyBox?: boolean;
}

export interface IDiscussionFilterUpdatedPayload {
    filter?: DiscussionType;
    collapseFilter?: DiscussionType;
}

// Setting a discussion or comment id to null will clear the selection
// Setting an id to undefined will leave that selection as is
export interface IDiscussionSelectedPayload {
    discussionId?: number;
    commentId?: number;
    selectFirstComment?: boolean; // default is false
}

export interface IDiscussionCommentAddedPayload {
    thread: DiscussionCommon.DiscussionThread;
    parentComment: number;
    initialContent?: string;
}

export interface IDiscussionCommentComittedPayload {
    thread: DiscussionConstants.DiscussionThread;
    comment: DiscussionConstants.DiscussionComment;
    oldComment: DiscussionConstants.DiscussionComment;
    focusReplyBox?: boolean;
}

export interface IDiscussionThreadComittedPayload {
    thread: DiscussionConstants.DiscussionThread;
    oldThread: DiscussionConstants.DiscussionThread;
    focusReplyBox?: boolean;
}

export interface IPendingCommentUpdatedPayload {
    pullRequestId: number;
    itemPath: string; // null for comments not associated with a file
    position: DiscussionCommon.DiscussionPosition;
    parentId: any;
    content: string;
}

// discussion attachments
export interface IAttachmentCreatedPayload {
    attachment: DiscussionCommon.DiscussionAttachment;
}

export interface IAttachmentCommittedPayload {
    url: string;
    fileName: string;
}

// attachments are keyed by filename
export interface IAttachmentsUpdatedPayload {
    attachments: IDictionaryStringTo<DiscussionCommon.DiscussionAttachment>;
}

export interface IAttachmentErrorPayload {
    fileName: string;
    error: string;
}

export interface IAttachmentClearErrorPayload {
    fileName: string;
}

// activity feed payload
export interface IActivityFeedFilterChangedPayload {
    filterType: number;
}

export interface IUpdateActivityOrderPayload {
    order: VCWebAccessContracts.PullRequestActivityOrder;
}

export interface IExpandActivityDescriptionPayload {
    expanded: VCWebAccessContracts.PullRequestActivityDescriptionExpanded;
}

// iteration payload
export interface IIterationsUpdatingPayload {
    pullRequestId: number;
}
export interface IIterationsUpdatedPayload {
    pullRequestId: number;
    iterations: VCContracts.GitPullRequestIteration[];
}

// change explorer payload
export interface IChangeExplorerSelectPayload {
    path: string;
    version?: string;
}

export interface IChangeItemDetailLoadedPayload {
    id: string;
    item: VCLegacyContracts.ItemModel;
}

export interface IChangeExplorerUpdateDisplayOptionPayload {
    options: ChangeExplorerGridModeChangedEventArgs;
}

export interface IOrientationUpdatedPayload {
    orientation: VCWebAccessContracts.DiffViewerOrientation;
}

// policy payload
export interface IPolicyEvaluationRecordsUpdatedPayload {
    policyEvaluations: PolicyEvaluationRecord[];
    keepExisting?: boolean;
}

export interface IBuildLinkUpdatedPayload {
    buildId: number;
    link: string;
}

// statuses
export interface IPullRequestStatusUpdatedPayload {
    pullRequestStatuses: GitPullRequestStatusUtils.PullRequestStatus[];
}

export interface IPullRequestStatusesContributionPayload {
    contributions: Contribution[];
}

// labels
export interface IPullRequestLabelsUpdatedPayload {
    pullRequestLabels: WebApiTagDefinition[];
}

export interface IPullRequestLabelUpdatedPayload {
    pullRequestLabel: WebApiTagDefinition;
}

// commits payload
export interface ICommitsUpdatingPayload {
    pullRequestId: number;
}

export interface ICommitsUpdatedPayload {
    pullRequestId: number;
    commits: VCContracts.GitCommitRef[];
}

// merge completion payload
export interface ICompletionOptionPayload {
    shouldEnable: boolean;
}

// conflict payload
export interface IConflictsUpdatedPayload {
    pullRequestId: number;
    lastMergeSourceCommit: VCContracts.GitCommitRef;
    lastMergeTargetCommit: VCContracts.GitCommitRef;
    conflicts: VCContracts.GitConflict[];
    skip: number;
    top: number;
    includeObsolete: boolean;
    excludeResolved: boolean;
    onlyResolved: boolean;
    // When true, conflict list will be empty and UI should assume there are too many conflicts to fetch (1000's, potentially)
    overflow: boolean;
}

// user preference payload
export interface IUserPreferencesUpdatedPayload {
    preferences: VCWebAccessContracts.VersionControlUserPreferences;
}

// feature flags toggles
export interface ISetFeatureFlagsPayload {
    features: IDictionaryStringTo<boolean>; // an array of feature flag keys with toggles that indicate if they are on or off
}

// reviewer payload
export interface IReviewerInfoUpdatedPayload {
    pullRequestId: number;
    reviewer: VCContracts.IdentityRefWithVote;
    action: ReviewerActionType;
}

export interface IRemoveReviewerPayload {
    pullRequestId: number;
    reviewerLocalId: string;
}

// signlar actions
export enum ChangeNotificationType {
    push = 1,
    retarget = 2
}
export interface IChangeNotificationPayload {
    changeType: ChangeNotificationType
}

export interface ILiveUpdateChangedPayload {
    shouldUpdate: boolean;
 }

export enum ReviewerActionType {
    add = 1,
    remove = 2,
    update = 3
}

export interface PullRequestAlreadyExistsNotificationContent {
    pullRequestId: number;
    repository: GitRepository;
    tfsContext: TfsContext;
}

export interface INotificationPayload {
    type: NotificationType;
    message: string;
    specialType?: string;
    specialContent?: PullRequestAlreadyExistsNotificationContent;
}

export interface INotificationFlushPayload {
    type: NotificationType;
    specialType?: string;
}

export interface INotificationDismissPayload {
    notification: Notification;
}

// navigation payload
export interface ITabChangedPayload {
    action: string;
}

export interface IFullScreenChangedPayload {
    isFullScreen: boolean;
}

export interface INavigationStateChangedPayload {
    state: INavigationState;
}

export interface INavigationState {
    action?: string;
    path?: string;           // path of the current file selected on the files tab
    discussionId?: number;   // id of the discussion to select
    iteration?: number;      // current iteration selected, none means latest
    base?: number;           // current comparing base iteration, none means no-compare
    fullScreen?: boolean;    // fullscreen or not
    contributionId?: string; // id of the extension providing the current tab
    unfollow?: boolean;      //requesting to unfollow the pull request
}

export interface ILastVisitUpdatedPayload {
    lastVisit?: Date;
}

export interface IShowShareDialogPayload {
    isVisible: boolean;
    defaultReviewers: ReviewerItem[];
}

export interface IRefreshDataProviderStarted {
    pullRequestId: number;
    mode: DataProviderMode;
}

export interface IRefreshDataProviderComplete {
    pullRequestId: number;
    mode: DataProviderMode;
}

export interface IAutoCompleteCriteriaUpdated {
    blockingPolicies: AutoCompleteBlockingPolicy[];
}

// Some constants which need to be visible to multiple action creators

export class MainTabOptions {
    public static DISCUSSION: string = VCPullRequestsControls.PullRequestDetailsViews.DISCUSSION;
    public static FILES: string = VCPullRequestsControls.PullRequestDetailsViews.FILES;
    public static COMMITS: string = VCPullRequestsControls.PullRequestDetailsViews.COMMITS;
    public static COMPARE: string = VCPullRequestsControls.PullRequestDetailsViews.COMPARE;
    public static CONTENT: string = VCPullRequestsControls.PullRequestDetailsViews.CONTENT;
}

export class PolicyActions {
    public static POLICY_ACTION_RETRY_MERGE = "2fcab40d-b019-4fa8-8eb7-61a1a21a44c2";
    public static POLICY_ACTION_REQUEUE_POLICY = "34bef68d-8a08-498a-9c45-0846c6e6b63d";
}
