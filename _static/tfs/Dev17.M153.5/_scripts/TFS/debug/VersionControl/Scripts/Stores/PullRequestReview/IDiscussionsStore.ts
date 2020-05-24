import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitPullRequest } from "TFS/VersionControl/Contracts";
import { DiscussionThread, DiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { ChangeExplorerGridCommentsMode, PullRequestActivityOrder } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { DiscussionType, DiscussionFilter, IDiscussionFilterOptions } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { GitPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { DiscussionRenderer } from "Discussion/Scripts/DiscussionRenderer";

// Not using the event manager for this because right now we don't have a way to clean up the event if that is the case
// At least this way, when we create a new store the new discussion adapter will get attached to this store and not to both
// And there's nothing that should care about this event other than the discussion manager that we want to throw away anyway
export type SignalRThreadsAddedEvent = (newThreads: DiscussionThread[]) => void;

export enum DiscussionThreadIterationContext {
    Current = 1,
    Latest = 2,
}

export interface DiscussionContext {
    tfsContext: TfsContext;
    pullRequest: GitPullRequest;
}

export abstract class IDiscussionsStore {
    abstract onContextUpdated(payload: Actions.IContextUpdatedPayload): void;

    abstract onPullRequestUpdated(payload: Actions.IPullRequestUpdatedPayload): void;
    abstract onIterationsUpdated(payload: Actions.IIterationsUpdatedPayload): void;
    abstract onFeatureFlagEnabledUpdated(payload: Actions.ISetFeatureFlagsPayload): void;
    abstract onLastVisitUpdated(payload: Actions.ILastVisitUpdatedPayload): void;

    abstract onDiscussionFilterUpdated(payload: Actions.IDiscussionFilterUpdatedPayload): void;
    abstract onDiscussionApplyCurrentCollapseFilter(payload: Actions.IDiscussionThreadPayload, noEmit?: boolean): void;
    abstract onDiscussionThreadCollapse(payload: Actions.IDiscussionThreadPayload): void;
    abstract onDiscussionThreadExpandGroup(payload: Actions.IDiscussionThreadPayload, noEmit?: boolean): void;

    abstract onDiscussionThreadsUpdated(payload: Actions.IDiscussionThreadsUpdatedPayload): void;
    abstract onIterationUpdated(payload: Actions.IIterationSelectedPayload): void;

    abstract onDiscussionThreadUpdated(payload: Actions.IDiscussionThreadPayload): void;
    abstract onDiscussionThreadStatusChanged(payload: Actions.IDiscussionThreadPayload): void;
    abstract onDiscussionThreadComitting(payload: Actions.IDiscussionThreadComittedPayload): void;
    abstract onDiscussionThreadComitted(payload: Actions.IDiscussionThreadComittedPayload): void;
    abstract onDiscussionThreadCommitFailed(payload: Actions.IDiscussionThreadPayload): void;
    abstract onDiscussionThreadDeleted(payload: Actions.IDiscussionThreadPayload): void;

    abstract onDiscussionCommentUpdated(payload: Actions.IDiscussionCommentPayload): void;
    abstract onDiscussionCommentLikeUpdated(payload: Actions.IDiscussionCommentPayload): void;
    abstract onDiscussionCommentComitting(payload: Actions.IDiscussionCommentPayload): void;
    abstract onDiscussionCommentCommitFailed(payload: Actions.IDiscussionCommentPayload): void;
    abstract onDiscussionCommentComitted(payload: Actions.IDiscussionCommentComittedPayload): void;
    abstract onDiscussionCommentDeleted(payload: Actions.IDiscussionCommentPayload): void;
    abstract onDiscussionCommentDeletedNoEmit(payload: Actions.IDiscussionCommentPayload): void;
    abstract onDiscussionCommentAdded(payload: Actions.IDiscussionCommentAddedPayload): void;

    /**
     * We need to subscribe to select in case someone selects a discussion.
     * @param payload
     */
    abstract onDiscussionSelect(payload: Actions.IDiscussionSelectedPayload): void;

    /**
     * Sets the current thread/comment selection
     * Important: We should not call this function from handlers that are responding
     * to server events. The user might have changed the state from when we sent the request
     * and we shouldn't clear that state just because something happened to come back from the server
     * @param payload
     */
    abstract onDiscussionSelectNoEmit(payload: Actions.IDiscussionSelectedPayload): void;

    abstract setSignalRThreadsAddedListener(listener: SignalRThreadsAddedEvent): void;

    abstract getDiscussionContext(): DiscussionContext;

    abstract getFeedbackIsEnabled(): boolean;
    abstract getCollapseWidgetIsEnabled(): boolean;
    abstract getCommentLikesIsEnabled(): boolean;

    /**
     * Get all current discussion threads and then filter/sort the list based on the given filter options. 
     * If supplied in the options the positions of threads will be replaced with the position of the
     * thread as of that context (or currently selected iteration by default).
     */
    abstract getDiscussionThreads(options?: IDiscussionFilterOptions): DiscussionThread[];

    /**
     * Return the given thread by id
     * Optionally specify an iteration context (latest or current) in which to return thread position.
     * @param id
     * @param iterationContext
     */
    abstract getDiscussionThread(id: number, iterationContext?: DiscussionThreadIterationContext): DiscussionThread;

    /**
     * Return the next thread that should be selected given the currently selected discussion
     * Optionally specify a type as a filter to return only the next thread based on that criteria
     * NOTE: This function is currently not used. Leaving this logic here just in case we decide
     * to revisit the ability to select comments in this way.
     * @param filterType
     */
    abstract getNextDiscussionThread(filterType: DiscussionType): DiscussionThread;

    /**
     * Get discussion threads related by position and file to the given thread.
     */
    abstract getDiscussionThreadGroup(thread: DiscussionThread): DiscussionThread[];

    abstract getUnsavedCommentCount(): number;

    /**
     * Returns the count for discussion threads based on status type. Does not include counts for deleted threads.
     * @param types Optionally pass in the specific types to return counts for
     */
    abstract getDiscussionCountByType(filterTypes?: DiscussionType[]): IDictionaryNumberTo<number>;

    /**
     * Returns the id of the currently selected discussion thread
     */
    abstract getSelectedDiscussionId(): number;

    /**
     * Returns the id of the currently selected comment of the currently selected thread
     * The selected discussion id + selected comment id gives you the full selection
     * You can have a selected thread without a selected comment but not the other way around
     */
    abstract getSelectedCommentId(): number;

    abstract getSelectedDiscussionFilter(): DiscussionType;
    abstract getSelectedDiscussionCollapseFilter(): DiscussionType;
    abstract getPreviousDiscussionCollapseFilter(): DiscussionType;

    abstract isLoading(): boolean;

    /**
     * Discussion threads and comments that have not been sent to the server use negative numbers
     * for id's to distinguish them from posted threads and comments.  Use this method to
     * generate a unique negative number for a new comment
     */
    abstract newCommentId(): number;

    /**
     * Discussion threads and comments that have not been sent to the server use negative numbers
     * for id's to distinguish them from posted threads and comments.  Use this method to
     * generate a unique negative number for a new comment
     */
    abstract newThreadId(): number;

    /**
     * The pending thread is a comment about the pull request that is not tied to specific file and has
     * not been submitted to the server yet.  When it is sent to the server, a new pending thread is created
     */
    abstract getPendingThread(): DiscussionThread;

    abstract addChangedListener(handler: IEventHandler, eventName?: string);
    abstract removeChangedListener(handler: IEventHandler);

    abstract getDiscussionRenderer(): DiscussionRenderer;

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "IDiscussionsStore"; }
}
