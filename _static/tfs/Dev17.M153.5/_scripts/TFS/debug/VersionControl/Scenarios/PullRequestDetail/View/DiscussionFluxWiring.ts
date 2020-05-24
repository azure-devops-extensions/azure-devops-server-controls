import { IAttachmentsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IAttachmentsStore";
import { IDiscussionsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";

export class DiscussionFluxWiring {
    public static initialize(actionsHub: ActionsHub) {
        const discussionStore = ServiceRegistry.getService(IDiscussionsStore);
        const attachmentStore = ServiceRegistry.getService(IAttachmentsStore);

        if (discussionStore) {
            actionsHub.discussionSelected.addListener(discussionStore.onDiscussionSelect, discussionStore);
            actionsHub.discussionThreadsUpdated.addListener(discussionStore.onDiscussionThreadsUpdated, discussionStore);
            actionsHub.discussionThreadUpdated.addListener(discussionStore.onDiscussionThreadUpdated, discussionStore);
            actionsHub.discussionThreadComitted.addListener(discussionStore.onDiscussionThreadComitted, discussionStore);
            actionsHub.discussionThreadComitting.addListener(discussionStore.onDiscussionThreadComitting, discussionStore);
            actionsHub.discussionThreadCommitFailed.addListener(discussionStore.onDiscussionThreadCommitFailed, discussionStore);
            actionsHub.discussionCommentUpdated.addListener(discussionStore.onDiscussionCommentUpdated, discussionStore);
            actionsHub.discussionCommentLikeUpdated.addListener(discussionStore.onDiscussionCommentLikeUpdated, discussionStore);
            actionsHub.discussionCommentComitted.addListener(discussionStore.onDiscussionCommentComitted, discussionStore);
            actionsHub.discussionCommentComitting.addListener(discussionStore.onDiscussionCommentComitting, discussionStore);
            actionsHub.discussionCommentCommitFailed.addListener(discussionStore.onDiscussionCommentCommitFailed, discussionStore);
            actionsHub.discussionCommentDeleted.addListener(discussionStore.onDiscussionCommentDeleted, discussionStore);
            actionsHub.discussionThreadDeleted.addListener(discussionStore.onDiscussionThreadDeleted, discussionStore);
            actionsHub.discussionCommentAdded.addListener(discussionStore.onDiscussionCommentAdded, discussionStore);
            actionsHub.discussionThreadStatusUpdated.addListener(discussionStore.onDiscussionThreadStatusChanged, discussionStore);

            actionsHub.contextUpdated.addListener(discussionStore.onContextUpdated, discussionStore);
            actionsHub.iterationSelected.addListener(discussionStore.onIterationUpdated, discussionStore);
            actionsHub.lastVisitUpdated.addListener(discussionStore.onLastVisitUpdated, discussionStore);

            actionsHub.discussionFilterUpdated.addListener(discussionStore.onDiscussionFilterUpdated, discussionStore);
            actionsHub.discussionApplyCurrentCollapseFilter.addListener(discussionStore.onDiscussionApplyCurrentCollapseFilter, discussionStore);
            actionsHub.discussionThreadCollapse.addListener(discussionStore.onDiscussionThreadCollapse, discussionStore);
            actionsHub.discussionThreadExpandGroup.addListener(discussionStore.onDiscussionThreadExpandGroup, discussionStore);

            actionsHub.iterationsUpdated.addListener(discussionStore.onIterationsUpdated, discussionStore);
            actionsHub.pullRequestUpdated.addListener(discussionStore.onPullRequestUpdated, discussionStore);
            actionsHub.setFeatureFlags.addListener(discussionStore.onFeatureFlagEnabledUpdated, discussionStore);
        }

        if (attachmentStore) {
            actionsHub.attachmentsUpdated.addListener(attachmentStore.onAttachmentsUpdated, attachmentStore);
            actionsHub.attachmentCreated.addListener(attachmentStore.onAttachmentCreated, attachmentStore);
            actionsHub.attachmentCommitted.addListener(attachmentStore.onAttachmentCommitted, attachmentStore);
            actionsHub.attachmentError.addListener(attachmentStore.onAttachmentError, attachmentStore);
            actionsHub.attachmentClearError.addListener(attachmentStore.onAttachmentClearError, attachmentStore);
        }
    }
}