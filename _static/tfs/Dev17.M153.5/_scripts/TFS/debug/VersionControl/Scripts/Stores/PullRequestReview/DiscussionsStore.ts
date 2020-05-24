import { Async, autobind } from "OfficeFabric/Utilities";
import Diag = require("VSS/Diag");
import { RemoteStore } from "VSS/Flux/Store";
import Utils_String = require("VSS/Utils/String");
import { IdentityRef } from "VSS/WebApi/Contracts";
import { 
    DiscussionThread, 
    DiscussionComment,
    PositionContext,
    DiscussionThreadUtils,
    DiscussionCommentUtils 
} from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { CommentType, DiscussionStatus } from "Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { GitPullRequest } from "TFS/VersionControl/Contracts";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { ChangeExplorerGridCommentsMode, PullRequestActivityOrder } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { DiscussionType, IDiscussionFilterOptions, DiscussionFilter } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { CodeReviewArtifact } from "VersionControl/Scripts/TFS.VersionControl";
import { IDiscussionsStore, SignalRThreadsAddedEvent, DiscussionContext, DiscussionThreadIterationContext } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { DiscussionRenderer, defaultMarkdownOptions } from "Discussion/Scripts/DiscussionRenderer";
import { GUIDUtils, getCookie } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";

interface ThreadPair {
    serverThread?: DiscussionThread,
    localThread?: DiscussionThread
}

interface IterationPair {
    iteration: number;
    base: number;
}

interface ThreadIdMap {
    [key: number]: ThreadPair;
}

export namespace DiscussionsStoreEvents {
    export const DISCUSSION_CHANGED: string = "discussionChange";

    // HACK: Default discussions store subscriptions will be debounced where necessary
    // Components that need realtime events should subscribe to this new one
    export const DISCUSSION_CHANGED_REALTIME: string = "discussionChangedRealtime";
}

/**
 * Information about current discussion threads. Right now we provide a discussion manager
 * which is really not what we want to be doing, but in order to support the legacy controls
 * that is what we are doing for now.
 */
export class DiscussionsStore extends RemoteStore implements IDiscussionsStore {
    private _tfsContext: TfsContext;
    private _pullRequest: GitPullRequest;

    private _pendingThread: DiscussionThread;
    private _discussionThreads: DiscussionThread[];

    private _selectedDiscussionId: number;
    private _selectedCommentId: number;

    private _selectedIterationId: number;
    private _selectedBaseIterationId: number;
    private _latestIterationId: number;

    // The currently set discussion filter. Threads that fail this filter are not returned.
    private _selectedDiscussionFilter: DiscussionType;

    // The currently set discussion collapse filter. Threads that fail this filter are
    // returned with collapse status set to TRUE.
    private _selectedDiscussionCollapseFilter: DiscussionType;
    private _previousDiscussionCollapseFilter: DiscussionType;
    private _discussionFilter: DiscussionFilter;

    private _newCommentId: number = -1;
    private _newThreadId: number = -1;

    private _feedbackIsEnabled: boolean;
    private _collapseWidgetIsEnabled: boolean;
    private _commentLikesIsEnabled: boolean;
    private _defaultCollapseFilterSet: boolean = false;

    private _discussionRenderer: DiscussionRenderer;

    private _lastVisit: Date;
    private static readonly _THREAD_IDENTITY_KEYS: string[] = [
        CodeReviewDiscussionIdentityConstants.CodeReviewRefUpdatedByIdentity,
        CodeReviewDiscussionIdentityConstants.CodeReviewVotedByIdentity,
        CodeReviewDiscussionIdentityConstants.CodeReviewReviewersUpdatedByIdentity,
        CodeReviewDiscussionIdentityConstants.CodeReviewStatusUpdatedByIdentity,
        CodeReviewDiscussionIdentityConstants.CodeReviewAutoCompleteUpdatedByIdentity,
        CodeReviewDiscussionIdentityConstants.CodeReviewIsDraftUpdatedByIdentity,
    ];

    private static readonly _THREAD_TFID_KEYS: string[] = [
        CodeReviewDiscussionConstants.CodeReviewRefUpdatedByTfId,
        CodeReviewDiscussionConstants.CodeReviewVotedByTfId,
        CodeReviewDiscussionConstants.CodeReviewReviewersUpdatedByTfId,
        CodeReviewDiscussionConstants.CodeReviewStatusUpdatedByTfId,
        CodeReviewDiscussionConstants.CodeReviewAutoCompleteUpdatedByTfId
    ];

    private _signalRThreadsAddedListener: SignalRThreadsAddedEvent;

    private _async: Async;
    private _throttledEmitChanged: () => void;

    private static readonly COMMENT_FEEDBACK_FEATURE = FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsCommentFeedback;
    private static readonly COLLAPSE_WIDGET_FEATURE = FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsDiscussionCollapseWidget;
    private static readonly COMMENT_LIKES_FEATURE = FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsDiscussionCommentLikes;

    constructor() {
        super();

        this._tfsContext = null;
        this._pullRequest = null;

        this._selectedDiscussionId = null;
        this._selectedCommentId = null;

        this._selectedIterationId = -1;
        this._selectedBaseIterationId = 0;
        this._latestIterationId = -1;

        this._discussionThreads = null;

        this._feedbackIsEnabled = false;
        this._collapseWidgetIsEnabled = false;
        this._commentLikesIsEnabled = false;

        this._selectedDiscussionFilter = DiscussionType.All; // initially show all discussions
        this._selectedDiscussionCollapseFilter = DiscussionType.AllActiveComments; // initially have active discussions not collapsed
        this._previousDiscussionCollapseFilter = DiscussionType.AllActiveComments;
        this._discussionFilter = new DiscussionFilter();

        this._pendingThread = null;

        this._async = new Async();
        this._throttledEmitChanged = this._async.debounce(this._emitChanged, 100, { trailing: true });

        const markdownOptions = defaultMarkdownOptions();
        markdownOptions.sanitize = true;
        this._discussionRenderer = new DiscussionRenderer({markdownOptions: markdownOptions});
    }

    public addChangedListener(handler: IEventHandler, eventName?: string): void {
        eventName = eventName || DiscussionsStoreEvents.DISCUSSION_CHANGED;
        super.addListener(eventName, handler);
    }

    public removeChangedListener(handler: IEventHandler): void {
        super.removeListener(DiscussionsStoreEvents.DISCUSSION_CHANGED, handler);
        super.removeListener(DiscussionsStoreEvents.DISCUSSION_CHANGED_REALTIME, handler);
    }

    @autobind
    private _emitChanged(): void {
        this.emit(DiscussionsStoreEvents.DISCUSSION_CHANGED, this);
    }

    private _emit(data?: any): void {
        this.emit(DiscussionsStoreEvents.DISCUSSION_CHANGED_REALTIME, this, data);
        this._emitChanged();
    }

    private _emitThrottled(data?: any): void {
        this.emit(DiscussionsStoreEvents.DISCUSSION_CHANGED_REALTIME, this, data);
        this._throttledEmitChanged();
    }

    public onContextUpdated(payload: Actions.IContextUpdatedPayload): void {
        this._tfsContext = payload.tfsContext;
        this._discussionFilter.setCurrentIdentityId(this._tfsContext);
        this._setDefaultCollapseFilter();
        this._emit();
    }

    public onPullRequestUpdated(payload: Actions.IPullRequestUpdatedPayload): void {
        if (null == payload.pullRequest) {
            return;
        }

        this._pullRequest = payload.pullRequest;
        this._setDefaultCollapseFilter();

        this._emit();
    }

    public onIterationsUpdated(payload: Actions.IIterationsUpdatedPayload): void {
        if (payload.iterations && payload.iterations.length) {
            // If there is no "selected" iteration, then default to the latest
            // This is the first time we know the id of the latest iteration.
            if (this._selectedIterationId <= 0) {
                this._selectedIterationId = this._latestIterationId;
                this._selectedBaseIterationId = 0;
            }

            this._latestIterationId = payload.iterations.slice(-1)[0].id;
            this._discussionFilter && this._discussionFilter.invalidateCache();
        }
        this._emit();
    }
    
    public onFeatureFlagEnabledUpdated(payload: Actions.ISetFeatureFlagsPayload): void {
        if (typeof payload.features[DiscussionsStore.COMMENT_FEEDBACK_FEATURE] !== "undefined") {
            this._feedbackIsEnabled = payload.features[DiscussionsStore.COMMENT_FEEDBACK_FEATURE];
            this._emit();
        }
        if (typeof payload.features[DiscussionsStore.COLLAPSE_WIDGET_FEATURE] !== "undefined") {
            this._collapseWidgetIsEnabled = payload.features[DiscussionsStore.COLLAPSE_WIDGET_FEATURE];
            this._emit();
        }
        if (typeof payload.features[DiscussionsStore.COMMENT_LIKES_FEATURE] !== "undefined") {
            this._commentLikesIsEnabled = payload.features[DiscussionsStore.COMMENT_LIKES_FEATURE];
            this._emit();
        }
    }

    public onLastVisitUpdated(payload: Actions.ILastVisitUpdatedPayload): void {
        if (this._lastVisit === payload.lastVisit) {
            return;
        }

        this._lastVisit = payload.lastVisit;

        // update the new label on threads now that the last visited date has updated
        if (this._discussionThreads) {
            this._discussionThreads.forEach((thread: DiscussionThread) => {
                this._labelUnseenThreadContent(thread);
            });

            // emit changed if we modified the threads
            this._emit();
        }
    }

    public onDiscussionFilterUpdated(payload: Actions.IDiscussionFilterUpdatedPayload): void {
        const filterUnchanged = payload.filter === undefined 
            || payload.filter === null 
            || payload.filter === this._selectedDiscussionFilter;

        const collapseFilterUnchanged = payload.collapseFilter === undefined 
            || payload.collapseFilter === null 
            || payload.collapseFilter === this._selectedDiscussionCollapseFilter;

        if (filterUnchanged && collapseFilterUnchanged) {
            return;
        }

        if (!filterUnchanged) {
            this._selectedDiscussionFilter = payload.filter;
        }

        if (!collapseFilterUnchanged) {
            this._previousDiscussionCollapseFilter = this._selectedDiscussionCollapseFilter;
            this._selectedDiscussionCollapseFilter = payload.collapseFilter;
            
            // if collapse filter is modified, update collapsed flags (if needed)
            if (this._selectedDiscussionCollapseFilter !== DiscussionType.Expanded) {
                this._discussionThreads && this._discussionThreads.forEach(thread => {
                    this.onDiscussionApplyCurrentCollapseFilter({ thread: thread }, true);
                });
            }
        }

        this._emit();
    }

    public onDiscussionApplyCurrentCollapseFilter(payload: Actions.IDiscussionThreadPayload, noEmit?: boolean): void {
        const threadIndex: number = this._matchingThreadIndex(payload.thread as DiscussionThread);
        const thread: DiscussionThread = threadIndex >= 0 ? this._discussionThreads[threadIndex] : payload.thread as DiscussionThread;
        const filter: DiscussionType = this._selectedDiscussionCollapseFilter === DiscussionType.Expanded
            ? this._previousDiscussionCollapseFilter
            : this._selectedDiscussionCollapseFilter;

        const shouldCollapse: boolean = !this._discussionFilter.threadMatchesFilter(thread, { types: filter, includePending: true });

        if (thread.isCollapsed !== shouldCollapse) {
            this._discussionFilter && this._discussionFilter.invalidateCache();
        }

        thread.isCollapsed = shouldCollapse;
        
        if (!noEmit) {
            this._emit({
                threadId: thread.id,
                threadGroup: DiscussionThreadUtils.getThreadGroupKey(thread),
            });
        }
    }

    public onDiscussionThreadCollapse(payload: Actions.IDiscussionThreadPayload): void {
        this._discussionFilter && this._discussionFilter.invalidateCache();

        const thread = payload.thread as DiscussionThread;
        const threadIndex: number = this._matchingThreadIndex(thread);

        if (threadIndex >= 0) {
            this._discussionThreads[threadIndex].isCollapsed = true;
            this._emit({ 
                threadId: thread.id,
                threadGroup: DiscussionThreadUtils.getThreadGroupKey(thread),
            });
        }
    }

    public onDiscussionThreadExpandGroup(payload: Actions.IDiscussionThreadPayload, noEmit?: boolean): void {
        this._discussionFilter && this._discussionFilter.invalidateCache();

        const thread = payload.thread as DiscussionThread;
        const threadGroup: DiscussionThread[] = this.getDiscussionThreadGroup(thread);
        threadGroup.push(thread);
        
        threadGroup.forEach(t => {
            const threadIndex: number = this._matchingThreadIndex(t);

            if (threadIndex >= 0) {
                this._discussionThreads[threadIndex].isCollapsed = false;
            }
        });

        if (!noEmit) {
            this._emit({
                threadId: thread.id,
                threadGroup: DiscussionThreadUtils.getThreadGroupKey(thread),
            });
        }
    }

    public onDiscussionThreadsUpdated(payload: Actions.IDiscussionThreadsUpdatedPayload): void {
        // if this came from an update from the server, we need to reconcile the the differences
        // We might have user edits that the server doesn't yet know about and we don't want to
        // just throw them away
        const wasInitialized: boolean = Boolean(this._discussionThreads);
        const newThreads = payload.threads as DiscussionThread[];
        const addedThreads: DiscussionThread[] = [];

        const dirtyComments = [];
        if (this._discussionThreads && this._discussionThreads.length > 0) {
            const threadMap: ThreadIdMap = {};

            $.each(this._discussionThreads, (index, localThread) => {
                threadMap[localThread.id] = threadMap[localThread.id] || {};
                threadMap[localThread.id].localThread = localThread;
            });

            $.each(newThreads, (index, serverThread) => {
                threadMap[serverThread.id] = threadMap[serverThread.id] || {};
                threadMap[serverThread.id].serverThread = serverThread;

                // when we get new threads from the server, apply the current collapse filter
                if (!threadMap[serverThread.id].localThread) {
                    this.onDiscussionApplyCurrentCollapseFilter({ thread: serverThread }, true);
                }
            });

            // when new threads or comments come over signalR, mark them as new so that we can
            // prevent disrupting the user's view. For example, if a new comment is posted to thread 1
            // while I'm replying to that thread, instead of the comment just showing up and jumping my view
            // we append a message saying '1 new comment' that I can click if I want to see it.
            $.each(threadMap, (index, mapping: ThreadPair) => {
                if (mapping.serverThread && mapping.localThread) {
                    // if a thread exists in both memory and server, scan for new comments so that we can mark them as new
                    const localComments = {};
                    $.each(mapping.localThread.comments, (index2, localComment) => {
                        localComments[localComment.id] = localComment;
                    });

                    $.each(mapping.serverThread.comments, (index2, serverComment) => {
                        if (localComments[serverComment.id]) {
                            // preserve the original comment id (in case anyone in the UI references the old negative value)
                            serverComment.originalId = localComments[serverComment.id].originalId;
                        }
                        else {
                            // if no match this came from signalr
                            serverComment.cameFromSignalR = true;
                        }
                    });

                    // add current context cache to the matched server thread (in case anyone in the UI references the old negative value)
                    mapping.serverThread.contextCache = mapping.localThread.contextCache;

                    // preserve original thread id
                    mapping.serverThread.originalId = mapping.localThread.originalId;

                    // preserve the current collapse status
                    mapping.serverThread.isCollapsed = mapping.localThread.isCollapsed;
                }
                else if (mapping.localThread && mapping.localThread.id > 0 && !mapping.serverThread) {
                    // If we have a positive thread id but no server thread, this is most likely signalR race shenanigans
                    // Simulate a server thread and ignore the fact that the server list didn't have this thread as the server list is probably wrong.
                    // Example: you save two new threads in sequence while experiencing high latency: threads 1 and 2
                    // signalR comes back in response to thread 1 being saved and we query threads. But thread 2 hasn't finished saving, and so the server reports that thread 1 exists and 2 doesn't
                    const threadClone = $.extend({}, mapping.localThread) as DiscussionThread;
                    mapping.serverThread = threadClone;
                    mapping.serverThread.comments = mapping.serverThread.comments.filter(c => c.id > 0);
                }
                else if (mapping.serverThread && mapping.serverThread.uniqueId && !mapping.serverThread.isDeleted && !mapping.localThread) {
                    // possibly signalR came back before our posting of the new comment has returned. In this case,
                    // we can't rely on id matching and instead need to look at the guid.
                    const matches = this._discussionThreads.filter(t => t.uniqueId === mapping.serverThread.uniqueId);
                    if (matches.length === 1 && matches[0].comments.length === 1)
                    {
                        // The server thread has a guid that matches one of our local threads but not by id
                        const match = matches[0];

                        mapping.serverThread.originalId = match.id;
                        mapping.serverThread.comments[0].originalThreadId = match.id;
                        mapping.serverThread.comments[0].originalId = match.comments[0].id;

                        // add current context cache to the matched server thread (in case anyone in the UI references the old negative value)
                        mapping.serverThread.contextCache = match.contextCache;

                        // now remove the comitting thread. It is out of date and will be replaced by mapping.serverThread below
                        this._discussionThreads.splice(this._discussionThreads.indexOf(match), 1);
                    }
                    else {
                        // otherwise, this really is a new thread that came over signalR thread and not one added by the current user
                        addedThreads.push(mapping.serverThread);
                    }
                }
            });

            // If an in memory thread has id < 0, then it is an unsaved thread for the current user
            // Append it to the list coming from the server
            // If a comment has an id < 0, but a thread id > 0, then the user has unsaved replies that need
            // to be integrated into the thread coming from the server (which might also have edits)
            // If a comment has an id > 0 but 'isDirty' then the user has made unsaved edits to the comment
            // We need to handle both the collision where changes were made to the thread and siblind comments
            // But also, if a user edits their comment on machine A while they have unsaved changes to the same
            // comment on machine B we don't want to just throw away their unsaved comment.
            $.each(this._discussionThreads, (index, thread) => {
                if (thread.id < 1) {
                    newThreads.push(thread);
                }
                else {
                    $.each(thread.comments, (commentIndex, comment) => {
                        if (comment.id < 1) {
                            const newThreadForComment = threadMap[comment.threadId].serverThread;
                            if (newThreadForComment) {
                                newThreadForComment.comments.push(comment);
                                if (newThreadForComment.isDeleted && !comment.isDeleted) {
                                    // if someone is in the middle of replying to a thread that's deleted,
                                    // restore the thread
                                    newThreadForComment.isDeleted = false;
                                }
                            }
                            else {
                                // should no longer be possible, but I've been wrong about this block being impossible before!
                                // removed the logic though because in the situation where I did hit this, the logic was completely wrong.
                                Diag.Debug.assert(false);
                            }
                        }
                        else {
                            if (comment.isDirty) {
                                dirtyComments.push({
                                    thread: thread,
                                    comment: comment
                                });
                            }
                        }
                    });
                }
            });
        }

        // update the position cache of each new thread based on its original thread context and
        // the possible tracking context
        $.each(newThreads, (index, thread) => {
            // update the new tag - if it was new before it still new
            this._labelUnseenThreadContent(thread);

            // new threads from the server will initially obey the current collapse filter
            if (!this._discussionThreads || !this._discussionThreads.length) {
                this.onDiscussionApplyCurrentCollapseFilter({ thread: thread }, true);
            }

            DiscussionThreadUtils.populateTrackingCaches(thread);
        });

        this._discussionThreads = newThreads;

        // if we had no threads previously, we are loading the page and we should expand any selected
        // discussion threads
        if (!wasInitialized) {
            this._expandSelectedThread();
        }

        // write the dirty comments back into the array
        // example scenario: I'm editing one of my comments on a thread while someone else replies at the same time
        $.each(dirtyComments, (index, dirtyComment) => {
            const matchingThreadIndex = this._matchingThreadIndex(dirtyComment.thread);
            if (matchingThreadIndex >= 0) {
                const matchingThread = this._discussionThreads[matchingThreadIndex];
                const matchingComment = matchingThread.comments.filter(c => c.id === dirtyComment.comment.id)[0];
                if (matchingComment && !matchingComment.isDeleted) {
                    const matchingCommentIndex = matchingThread.comments.indexOf(matchingComment);
                    matchingThread.comments[matchingCommentIndex] = dirtyComment.comment;
                }
            }
        });

        $.each(this._discussionThreads, (index, thread) => {
            $.each(thread.comments, (cIndex, comment) => {
                const isEditable = Utils_String.localeIgnoreCaseComparer(this._tfsContext.currentIdentity.id, comment.author.id) === 0;
                comment.isEditable = isEditable;
                comment.usersLiked = comment.usersLiked || [];
            });
        });

        this._discussionFilter && this._discussionFilter.invalidateCache();

        if (addedThreads.length > 0) {
            // let the discussion store manager know that threads were added or deleted via signalR
            // remove this when discussion manager is put to death
            if (this._signalRThreadsAddedListener) {
                this._signalRThreadsAddedListener(addedThreads);
            }
        }

        this._emit();
    }

    public onIterationUpdated(payload: Actions.IIterationSelectedPayload): void {
        this._selectedIterationId = payload.iterationId;
        this._selectedBaseIterationId = payload.baseId;
        this._discussionFilter && this._discussionFilter.invalidateCache();
    }

    public onDiscussionThreadUpdated(payload: Actions.IDiscussionThreadPayload): void {
        const thread = payload.thread as DiscussionThread;
        const oldThreadIndex = this._matchingThreadIndex(thread);
        let createdNewThread = false;

        if (oldThreadIndex >= 0) {
            const oldThread = this._discussionThreads[oldThreadIndex];
            DiscussionThreadUtils.populateTrackingCaches(thread, oldThread);

            // at some point hopefully we can remove this cast
            this._discussionThreads[oldThreadIndex] = thread as DiscussionThread;
        }
        else {
            createdNewThread = true;
            DiscussionThreadUtils.populateTrackingCaches(thread);
            this._discussionThreads.push(thread as DiscussionThread);
        }

        $.each(thread.comments, (cIndex, comment) => {
            const isEditable = Utils_String.localeIgnoreCaseComparer(this._tfsContext.currentIdentity.id, comment.author.id) === 0;
            comment.isEditable = isEditable;
        });

        this._discussionFilter && this._discussionFilter.invalidateCache();

        let selectedThreadId, prevSelectedThreadId;
        if (this._pendingThread && this._pendingThread.id === thread.originalId) {
            this._pendingThread = null;
        }
        else if (createdNewThread) {
            prevSelectedThreadId = this._selectedDiscussionId;
            selectedThreadId = thread.id;
            this.onDiscussionSelectNoEmit({
                discussionId: thread.id,
                selectFirstComment: true
            });
        }

        this._emit({
            threadId: thread.id,
            threadGroup: DiscussionThreadUtils.getThreadGroupKey(thread),
            selectedThreadId: selectedThreadId,
            prevSelectedThreadId: prevSelectedThreadId,
            focusReplyBox: payload.focusReplyBox
        });
    }

    public onDiscussionThreadStatusChanged(payload: Actions.IDiscussionThreadPayload): void {
        const thread = payload.thread as DiscussionThread;
        const oldThreadIndex = this._matchingThreadIndex(thread);
        if (oldThreadIndex >= 0) {
            // need to replace the thread to be a new ref so that vairous shouldUpdate checks trigger
            this._discussionThreads[oldThreadIndex] = thread;
            this._discussionFilter && this._discussionFilter.invalidateCache();

            this._emit({ 
                threadId: thread.id,
            });
        }
    }

    public onDiscussionThreadComitting(payload: Actions.IDiscussionThreadComittedPayload): void {
        const thread = payload.thread as DiscussionThread;

        const oldThreadIndex = this._matchingThreadIndex(thread);
        if (oldThreadIndex >= 0) {
            const oldThread = this._discussionThreads[oldThreadIndex];
            oldThread.uniqueId = thread.uniqueId;
            for (const comment of oldThread.comments) {
                comment.isEditable = false;
                comment.isComitting = true;
            }
        }
        else if (this._pendingThread && this._pendingThread.id === thread.id) {
            // prior to committing the pending thread, convert it into a 'real' thread in the array
            thread.comments[0].isEditable = false;
            thread.comments[0].isComitting = true;
            this._discussionThreads.push(thread as DiscussionThread);
            this._pendingThread = null;
            this._discussionFilter && this._discussionFilter.invalidateCache();
        }

        this._selectedCommentId = null;

        this._emit({ threadId: thread.id });
    }

    public onDiscussionThreadComitted(payload: Actions.IDiscussionThreadComittedPayload): void {
        const thread = payload.thread as DiscussionThread;
        const sentThread = payload.oldThread as DiscussionThread;

        if (sentThread.id < 1) {
            thread.originalId = sentThread.id;
            $.each(thread.comments, (index, newComment) => {
                newComment.originalThreadId = sentThread.id;
                newComment.originalId = sentThread.comments[index].id;
            });
        }

        this.onDiscussionThreadUpdated({
            thread: thread,
            focusReplyBox: payload.focusReplyBox
        });
    }

    public onDiscussionThreadCommitFailed(payload: Actions.IDiscussionThreadPayload): void {
        const thread = payload.thread as DiscussionThread;

        const oldThreadIndex = this._matchingThreadIndex(thread);
        if (oldThreadIndex >= 0) {
            const oldThread = this._discussionThreads[oldThreadIndex];
            const commentClones = [];
            for (const comment of oldThread.comments) {
                const commentClone = $.extend({}, comment) as DiscussionComment;
                commentClone.isComitting = false;
                commentClone.isDirty = true;
                commentClones.push(commentClone);
            }

            oldThread.comments = commentClones;

            for (const comment of thread.comments) {
                const isEditable = Utils_String.localeIgnoreCaseComparer(this._tfsContext.currentIdentity.id, comment.author.id) === 0;
                comment.isEditable = isEditable;
            }

            this._emit({ threadId: thread.id });
        }
    }

    public onDiscussionThreadDeleted(payload: Actions.IDiscussionThreadPayload): void {
        const thread = payload.thread as DiscussionThread;
        const oldThreadIndex = this._matchingThreadIndex(thread);
        if (oldThreadIndex >= 0) {
            this._discussionThreads.splice(oldThreadIndex, 1);
            this._discussionFilter && this._discussionFilter.invalidateCache();

            this._emit({ 
                threadId: thread.id,
                threadGroup: DiscussionThreadUtils.getThreadGroupKey(thread),
            });
        }
    }

    public onDiscussionCommentUpdated(payload: Actions.IDiscussionCommentPayload): void {
        const thread = payload.thread as DiscussionThread;
        const comment = payload.comment as DiscussionComment;
        comment.isEditable = Utils_String.localeIgnoreCaseComparer(this._tfsContext.currentIdentity.id, comment.author.id) === 0;
        comment.usersLiked = comment.usersLiked || [];

        const oldComment = thread.comments.filter(c => c.id === comment.id)[0];
        const oldCommentIndex = thread.comments.indexOf(oldComment);

        if (oldCommentIndex >= 0) {
            comment.usersLiked = thread.comments[oldCommentIndex].usersLiked;
            thread.comments[oldCommentIndex] = comment as DiscussionComment;
        }
        else if (this._pendingThread && this._pendingThread.id === thread.id) {
            this._pendingThread.comments[0] = comment;
        }

        // comment updates are throttled since they are the most likely events to be fired in rapid succession
        // (while typing a new comment for example) - real time versions of the emit are also sent for those few
        // components that need it
        this._emitThrottled({ threadId: thread.id, focusReplyBox: payload.focusReplyBox });
    }

    public onDiscussionCommentLikeUpdated(payload: Actions.IDiscussionCommentPayload): void {
        const thread = payload.thread as DiscussionThread;
        const comment = payload.comment as DiscussionComment;

        const oldComment = thread.comments.filter(c => c.id === comment.id)[0];
        const oldCommentIndex = thread.comments.indexOf(oldComment);
        if (oldCommentIndex >= 0) {
            thread.comments[oldCommentIndex] = payload.comment as DiscussionComment;

            this._emit({ threadId: thread.id });
        }
    }

    public onDiscussionCommentComitting(payload: Actions.IDiscussionCommentPayload): void {
        const thread = payload.thread as DiscussionThread;
        const comment = payload.comment as DiscussionComment;

        const oldComment = thread.comments.filter(c => c.id === comment.id)[0];
        if (oldComment) {
            const oldIndex = thread.comments.indexOf(oldComment);
            const commentClone = $.extend({}, oldComment) as DiscussionComment;
            commentClone.isEditable = false;
            commentClone.isComitting = true;
            thread.comments[oldIndex] = commentClone;
        }

        this._selectedCommentId = null;

        this._emit({ threadId: thread.id });
    }

    public onDiscussionCommentCommitFailed(payload: Actions.IDiscussionCommentPayload): void {
        const thread = payload.thread as DiscussionThread;
        const comment = payload.comment as DiscussionComment;

        const oldThreadIndex = this._matchingThreadIndex(thread);
        if (oldThreadIndex >= 0) {
            const oldComment = thread.comments.filter(c => c.id === comment.id)[0];
            if (oldComment) {
                const commentClone = $.extend({}, oldComment) as DiscussionComment;
                commentClone.isEditable = true;
                commentClone.isComitting = false;
                commentClone.isDirty = true;

                const oldIndex = thread.comments.indexOf(oldComment);
                this._discussionThreads[oldThreadIndex].comments[oldIndex] = commentClone;

                this._emit({ threadId: thread.id });
            }
        }
    }

    public onDiscussionCommentComitted(payload: Actions.IDiscussionCommentComittedPayload): void {
        const thread = payload.thread as DiscussionThread;
        const comment = payload.comment as DiscussionComment;
        const sentComment = payload.oldComment as DiscussionComment;

        if (sentComment.id < 1) {
            comment.originalId = sentComment.id;
            const oldComment = thread.comments.filter(c => c.id === sentComment.id)[0];
            if (oldComment) {
                const oldIndex = thread.comments.indexOf(oldComment);
                thread.comments[oldIndex] = comment;
                this.onDiscussionThreadUpdated({
                    thread: thread
                });
            }
        }

        this.onDiscussionCommentUpdated({
            thread: thread,
            comment: comment,
            focusReplyBox: payload.focusReplyBox
        });
    }

    public onDiscussionCommentDeleted(payload: Actions.IDiscussionCommentPayload): void {
        this.onDiscussionCommentDeletedNoEmit(payload);
        this._emit({
            threadId: payload.thread.id,
            threadGroup: DiscussionThreadUtils.getThreadGroupKey(payload.thread as DiscussionThread),
        });
    }

    public onDiscussionCommentDeletedNoEmit(payload: Actions.IDiscussionCommentPayload) {
        const thread = payload.thread as DiscussionThread;
        const comment = payload.comment;
        const oldThreadIndex = this._matchingThreadIndex(thread);
        if (oldThreadIndex >= 0) {
            const oldComment = thread.comments.filter(c => c.id === comment.id)[0];
            if (oldComment) {
                const oldCommentIndex = thread.comments.indexOf(oldComment);
                const aliveComments = thread.comments.filter(c => !c.isDeleted);
                const numComments = aliveComments.length;
                const lastCommentDeleted = numComments === 0 || (numComments === 1 && aliveComments[0].id === oldComment.id)

                if (lastCommentDeleted) {
                    this._discussionThreads.splice(oldThreadIndex, 1);
                    this._discussionFilter && this._discussionFilter.invalidateCache();
                }
                else {
                    // if the comment was ever comitted, flag it as deleted
                    // if it was just an in memory comment, just delete it
                    if (comment.id > 0) {
                        const commentClone = $.extend({}, oldComment) as DiscussionComment;
                        commentClone.isDeleted = true;
                        thread.comments[oldCommentIndex] = commentClone as DiscussionComment;
                    }
                    else {
                        thread.comments[oldCommentIndex] = comment as DiscussionComment;
                        thread.comments.splice(oldCommentIndex, 1);
                    }
                }
            }
        }
        else if (this._pendingThread && thread.id === this._pendingThread.id) {
            // this can happen during a save all where the pending thread needs to be included with everything else
            // but where a normal thread would be deleted if it contained only whitespace, the pending thread has to be handled differently
            this._pendingThread.comments[0] = { ...this._pendingThread.comments[0], newContent: null, isDirty: false } as DiscussionComment;
        }
    }

    public onDiscussionCommentAdded(payload: Actions.IDiscussionCommentAddedPayload): void {
        const thread = payload.thread as DiscussionThread;

        const comment = <DiscussionComment>{
            id: this._newCommentId--,
            parentId: payload.parentComment,
            threadId: thread.id,
            author: {
                id: this._tfsContext.currentIdentity.id,
                displayName: this._tfsContext.currentIdentity.displayName
            } as IdentityRef,
            commentType: CommentType.Text,
            isDirty: true,
            isEditable: true,
            newContent: payload.initialContent,
            usersLiked: [],
        };

        comment.originalId = comment.id;
        comment.originalThreadId = thread.id;

        thread.comments.push(comment);

        const prevSelectedThreadId = this._selectedDiscussionId;
        this.onDiscussionSelectNoEmit({
            discussionId: thread.id,
            commentId: comment.id
        });

        this._emit({
            threadId: thread.id,
            selectedThreadId: thread.id,
            prevSelectedThreadId: prevSelectedThreadId
        });
    }

    public onDiscussionSelect(payload: Actions.IDiscussionSelectedPayload): void {
        // if they reselected the same discussion (or none was selected)
        // we don't need to update
        if (this._selectedDiscussionId === payload.discussionId &&
            this._selectedCommentId === payload.commentId) {
            return;
        }

        const prevSelection = this._selectedDiscussionId;
        this.onDiscussionSelectNoEmit(payload);

        this._emit({
            selectedThreadId: payload.discussionId,
            prevSelectedThreadId: prevSelection,
        });
    }

    /**
     * Sets the current thread/comment selection
     * Important: We should not call this function from handlers that are responding
     * to server events. The user might have changed the state from when we sent the request
     * and we shouldn't clear that state just because something happened to come back from the server
     * @param payload
     */
    public onDiscussionSelectNoEmit(payload: Actions.IDiscussionSelectedPayload): void {
        // if they reselected the same discussion (or none was selected)
        // we don't need to update
        if (this._selectedDiscussionId == payload.discussionId &&
            this._selectedCommentId == payload.commentId) {
            return;
        }

        // if deselecting an empty unsaved comment, just delete it after handling the selection change
        let threadOfDeletedComment: DiscussionThread = null;
        let commentToDelete: DiscussionComment = null;
        if (this._selectedDiscussionId && this._selectedCommentId && this._selectedCommentId != payload.commentId) {
            threadOfDeletedComment = this._discussionThreads.filter(t => t.id === this._selectedDiscussionId)[0];
            if (threadOfDeletedComment) {
                const comment = threadOfDeletedComment.comments.filter(c => c.id === this._selectedCommentId)[0];
                if (comment && comment.id < 0 && !comment.newContent) {
                    commentToDelete = comment;
                }
            }
        }

        // null means no selection
        // undefined means leave the selection the way it was
        if (payload.discussionId !== undefined) {
            this._selectedDiscussionId = payload.discussionId;
            this._expandSelectedThread();
        }
        if (payload.commentId !== undefined) {
            this._selectedCommentId = payload.commentId;
        }

        if (payload.selectFirstComment) {
            const thread = this._discussionThreads.filter(thread => thread.id === payload.discussionId)[0];
            if (thread && thread.comments && thread.comments.length > 0) {
                this._selectedCommentId = thread.comments[0].id;
            }
        }

        if (threadOfDeletedComment && commentToDelete) {
            this.onDiscussionCommentDeletedNoEmit({
                thread: threadOfDeletedComment,
                comment: commentToDelete
            });
        }
    }

    public setSignalRThreadsAddedListener(listener: SignalRThreadsAddedEvent): void {
        this._signalRThreadsAddedListener = listener;
    }
    
    public getDiscussionContext(): DiscussionContext {
        return {
            tfsContext: this._tfsContext,
            pullRequest: this._pullRequest
        };
    }

    public getFeedbackIsEnabled(): boolean {
        return this._feedbackIsEnabled;
    }

    public getCollapseWidgetIsEnabled(): boolean {
        return this._collapseWidgetIsEnabled;
    }

    public getCommentLikesIsEnabled(): boolean {
        return this._commentLikesIsEnabled;
    }

    private _setDefaultCollapseFilter(): DiscussionType {
        if (this._defaultCollapseFilterSet) {
            return;
        }

        const filterCookie: string = getCookie("TFS-DiscussionCollapseFilter");
        const reviewerIdentity = this._tfsContext && this._tfsContext.currentIdentity && this._tfsContext.currentIdentity.id;
        const authorIdentity = this._pullRequest && this._pullRequest.createdBy && this._pullRequest.createdBy.id;

        if (filterCookie.length && reviewerIdentity && authorIdentity && reviewerIdentity !== authorIdentity) {
            this._defaultCollapseFilterSet = true;

            const defaultFilter: DiscussionType = parseInt(filterCookie) as DiscussionType;
            this.onDiscussionFilterUpdated({
                collapseFilter: defaultFilter
            } as Actions.IDiscussionFilterUpdatedPayload);
        }
    }

    /**
     * Get all current discussion threads and then filter/sort the list based on the given filter options. 
     * If supplied in the options the positions of threads will be replaced with the position of the
     * thread as of that context (or currently selected iteration by default).
     */
    public getDiscussionThreads(options?: IDiscussionFilterOptions): DiscussionThread[] {
        if (!this._discussionThreads) {
            return [];
        }
        
        this._discussionFilter = this._discussionFilter || new DiscussionFilter();

        options = this._discussionFilter.getDiscussionFilterOptionsWithDefaults(options);
        if (this._discussionFilter.hasCachedThreads(options)) {
            return this._discussionFilter.getCachedThreads(options);
        }

        const iterPair: IterationPair = this._getIterationPairForContext(options.requestedContext);
        let threads: DiscussionThread[] = this._discussionThreads;

        // if we've requested the threads at a specific context, copy current threads and populate the correct positions
        if (Boolean(options.requestedContext)) {
            threads = Array(this._discussionThreads.length);
            this._discussionThreads.forEach((thread, i) => {
                const threadCopy: DiscussionThread = { ...thread };
                DiscussionThreadUtils.updateThreadPositionInContext(threadCopy, iterPair.iteration, iterPair.base);
                threads[i] = threadCopy;
            });
        }

        return this._discussionFilter.filterAndSortDiscussionThreads(threads, options);
    }

    /**
     * Get a single discussion thread by ID with position returned based on the given context
     * (or currently selected iteration by default).
     */
    public getDiscussionThread(id: number, iterationContext?: DiscussionThreadIterationContext): DiscussionThread {
        // look for the requested thread by id, then by original id, and finally check the pending thread
        let thread = this._discussionThreads.filter(thread => thread.id === id)[0];
        thread = thread || this._discussionThreads.filter(thread => thread.originalId === id)[0];
        thread = thread || (this._pendingThread && this._pendingThread.id === id && this._pendingThread);

        if (!thread) {
            return null;
        }

        const threadCopy: DiscussionThread = { ...thread };
        const iterPair: IterationPair = this._getIterationPairForContext(iterationContext);
        DiscussionThreadUtils.updateThreadPositionInContext(threadCopy, iterPair.iteration, iterPair.base);

        return threadCopy;
    }

    /**
     * Return the next thread that should be selected given the currently selected discussion
     * Optionally specify a type as a filter to return only the next thread based on that criteria
     * NOTE: This function is currently not used. Leaving this logic here just in case we decide
     * to revisit the ability to select comments in this way.
     */
    public getNextDiscussionThread(filterType: DiscussionType = DiscussionType.AllComments): DiscussionThread {
        let nextThread: DiscussionThread = null;
        const threadCounts = this.getDiscussionCountByType();

        // if there are no threads that meet the criteria, return null
        if (!threadCounts[filterType]) {
            return nextThread;
        }

        // a negative discussion index means nothing is currently selected
        let selectedDiscussionIndex: number = -1;
        if (this._selectedDiscussionId) {
            selectedDiscussionIndex = this._matchingThreadIndex({ id: this._selectedDiscussionId } as DiscussionThread);
        }

        // if nothing is currently selected, start the index off the end of the threads (last published)
        selectedDiscussionIndex = (selectedDiscussionIndex < 0) ? this._discussionThreads.length : selectedDiscussionIndex;
        let count: number = 0;

        while (!nextThread && count < this._discussionThreads.length) {
            // go backwards through the threads (and loop if the beginning is reached)
            selectedDiscussionIndex = (selectedDiscussionIndex - 1 + this._discussionThreads.length) % this._discussionThreads.length;
            count++;

            const thread = this._discussionThreads[selectedDiscussionIndex];
            const threadType = this._discussionFilter.getDiscussionType(thread);

            // if the status filter matches, return the thread
            if (this._isThreadTypeSupported(threadType) && (threadType & filterType)) {
                nextThread = { ...thread };
            }
        }

        return nextThread;
    }

    /**
     * Get discussion threads related by position and file to the given thread.
     */
    public getDiscussionThreadGroup(thread: DiscussionThread): DiscussionThread[] {
        const threadGroup: DiscussionThread[] = [];

        if (!thread || thread.isDeleted || !thread.itemPath || !thread.position || !thread.position.endLine) {
            return threadGroup;
        }

        this._discussionThreads && this._discussionThreads.forEach(dThread => {
            if (thread.id !== dThread.id && !dThread.isDeleted && dThread.itemPath && dThread.position && dThread.position.endLine) {
                const pathsAreSame: boolean = dThread.itemPath === thread.itemPath;
                const linesAreSame: boolean = dThread.position.endLine === thread.position.endLine;
                const buffersAreSame: boolean = dThread.position.positionContext === thread.position.positionContext;

                const inlineAndRightBuffer: boolean = 
                    (dThread.position.positionContext === PositionContext.InLineBuffer && thread.position.positionContext === PositionContext.RightBuffer) ||
                    (dThread.position.positionContext === PositionContext.RightBuffer && thread.position.positionContext === PositionContext.InLineBuffer);

                if (pathsAreSame && linesAreSame && (buffersAreSame || inlineAndRightBuffer)) {
                    threadGroup.push({ ...dThread });
                }
            }
        });

        return threadGroup;
    }
    
    public getUnsavedCommentCount(): number {
        let count = 0;
        $.each(this._discussionThreads || [], (index, t) => {
            $.each(t.comments, (cIndex, c) => {
                if (DiscussionCommentUtils.hasNewContent(c)) {
                    count++;
                }
            });
        });

        if (this._pendingThread && DiscussionCommentUtils.hasNewContent(this._pendingThread.comments[0])) {
            count++;
        }

        return count;
    }

    public getDiscussionCountByType(filterTypes?: DiscussionType[], options?: IDiscussionFilterOptions): IDictionaryNumberTo<number> {
        if (!filterTypes || filterTypes.length === 0) {
            // if no specific types given, count all types
            filterTypes = [];
            Object.keys(DiscussionType).forEach((key) => {
                const keyNum = parseInt(key);
                !isNaN(keyNum) && filterTypes.push(keyNum);
            });
        }

        const counts: IDictionaryNumberTo<number> = {};
        const filteredThreads: DiscussionThread[] = this._discussionFilter.filterDiscussionThreads(this._discussionThreads, options);

        filteredThreads && filteredThreads.forEach(thread => {
            const threadType: DiscussionType = this._discussionFilter.getDiscussionType(thread);

            // for every discussion type, check to see if this thread is of that type
            // if so, increment the count after initializing if needed
            filterTypes.forEach((filterType) => {
                if (this._isThreadTypeSupported(threadType) && (threadType & filterType)) {
                    counts[filterType] = (counts[filterType] || 0);
                    counts[filterType]++;
                }
            });

        });

        return counts;
    }

    private _isThreadTypeSupported(threadType: DiscussionType): boolean {
        return Boolean(threadType & DiscussionType.AllExact);
    }

    public getSelectedDiscussionId(): number {
        return this._selectedDiscussionId;
    }
    
    public getSelectedCommentId(): number {
        return this._selectedCommentId;
    }

    public getSelectedDiscussionFilter(): DiscussionType {
        return this._selectedDiscussionFilter;
    }

    public getSelectedDiscussionCollapseFilter(): DiscussionType {
        return this._selectedDiscussionCollapseFilter;
    }

    public getPreviousDiscussionCollapseFilter(): DiscussionType {
        return this._previousDiscussionCollapseFilter;
    }

    public isLoading(): boolean {
        return this._tfsContext === null ||
            this._pullRequest === null ||
            this._discussionThreads === null;
    }

    public newCommentId(): number {
        return this._newCommentId--;
    }

    public newThreadId(): number {
        return this._newThreadId--;
    }

    public getPendingThread(): DiscussionThread {
        if (!this._pendingThread && !this.isLoading()) {
            const newThreadId = this.newThreadId();

            const artifact = new CodeReviewArtifact({
                projectGuid: this._pullRequest.repository.project.id,
                pullRequestId: this._pullRequest.pullRequestId,
                codeReviewId: this._pullRequest.codeReviewId,
                supportsIterations: this._pullRequest.supportsIterations
            });

            this._pendingThread = new DiscussionThread();
            this._pendingThread.id = newThreadId;
            this._pendingThread.originalId = newThreadId;
            this._pendingThread.artifactUri = artifact.getUri();
            this._pendingThread.status = DiscussionStatus.Active;
            this._pendingThread.comments = [];
            this._pendingThread.supportsMarkdown = true;
            this._pendingThread.uniqueId = GUIDUtils.newGuid();

            const newComment: DiscussionComment = new DiscussionComment();
            newComment.id = this.newCommentId();
            newComment.threadId = newThreadId;
            newComment.author = $.extend({
                id: this._tfsContext.currentIdentity.id,
                displayName: this._tfsContext.currentIdentity.displayName
            }, null);
            newComment.commentType = CommentType.Text;
            newComment.isDirty = true;
            newComment.isEditable = true;
            newComment.originalId = newComment.id;
            newComment.originalThreadId = newThreadId;
            newComment.content = null;
            newComment.newContent = null;

            this._pendingThread.comments.push(newComment);
        }

        return this._pendingThread;
    }

    public clearThreads(): void {
        this._discussionThreads = null;
    }

    public getDiscussionRenderer(): DiscussionRenderer {
        return this._discussionRenderer;
    }

    private _expandSelectedThread(): void {
        if (this._selectedDiscussionId) {
            const threadIndex: number = this._matchingThreadIndex({ id: this._selectedDiscussionId } as DiscussionThread);
            
            // if the thread is currently collapsed we need to expand the group it's in
            if (threadIndex >= 0 && this._discussionThreads[threadIndex].isCollapsed) {
                this.onDiscussionThreadExpandGroup({ thread: this._discussionThreads[threadIndex] }, true);
                
                // if not already, adjust the filter to reflect the new Expanded state
                // (which will show the dirty * on the filter component)
                if (this._selectedDiscussionCollapseFilter !== DiscussionType.Expanded) {
                    this._previousDiscussionCollapseFilter = this._selectedDiscussionCollapseFilter;
                    this._selectedDiscussionCollapseFilter = DiscussionType.Expanded;
                }
            }
        }
    }

    private _matchingThreadIndex(newThread: DiscussionThread): number {
        if (!this._discussionThreads) {
            return -1;
        }

        let thread = this._discussionThreads.filter(thread => thread.id === newThread.id)[0] || null;
        thread = thread || this._discussionThreads.filter(thread => thread.originalId !== undefined && thread.originalId === newThread.originalId)[0] || null;

        return thread ? this._discussionThreads.indexOf(thread) : -1;
    }

    private _getIterationPairForContext(iterationContext?: DiscussionThreadIterationContext): IterationPair {
        const iterPair: IterationPair = { iteration: -1, base: -1 };

        // default to returning data in the context of the currently selected iteration
        iterationContext = iterationContext || DiscussionThreadIterationContext.Current;

        const useCurrent: boolean = (iterationContext === DiscussionThreadIterationContext.Current) && this._selectedIterationId > 0;

        iterPair.iteration = useCurrent ? this._selectedIterationId : this._latestIterationId;
        iterPair.base = useCurrent ? this._selectedBaseIterationId : 0;

        return iterPair;
    }

    /**
     * Label a given thread (and comments if applicable) as new based on the last updated date and
     * whether that update was triggered by the current user (not new if caused by the user)
     */
    private _labelUnseenThreadContent(thread: DiscussionThread): void {
        const currentUser: string = this._tfsContext.currentIdentity.id;
        const threadType = this._discussionFilter.getDiscussionType(thread);

        // if the overall thread isn't new there's no point in going any further
        // also, we need to skip merges (since the update we care about is RefUpdate and we don't want to double count)
        const threadIsNew: boolean = !!this._lastVisit && (this._lastVisit < thread.lastUpdatedDate);
        if (!threadIsNew || (threadType & DiscussionType.Merge) || (!this._isThreadTypeSupported(threadType) )) {
            thread.hasUnseenContent = false;
            return;
        }

        // first check the code review properties for the author of the last update on this thread
        let threadIdentityId: string;
        DiscussionsStore._THREAD_IDENTITY_KEYS.forEach(key => {
            if (thread.properties && thread.properties[key]) {
                threadIdentityId = thread.identities[thread.properties[key].$value].id;
            }
        });

        if (!threadIdentityId) {
            DiscussionsStore._THREAD_TFID_KEYS.forEach(key => {
                if (thread.properties && thread.properties[key]) {
                    threadIdentityId = thread.properties[key].$value;
                }
            });
        }

        // by this point, the thread is new, so if we found an identity that didn't match the current user
        // as the cause of the update, return that this is a new thread
        if (!!threadIdentityId) {
            thread.hasUnseenContent = (threadIdentityId !== currentUser);
            return;
        }

        // go through the comments of the thread to try and find comments updated since the last visit
        // that were authored by someone other than the current user
        if (thread.comments) {
            thread.comments.forEach(comment => {
                const commentIsNew: boolean = !!this._lastVisit && (this._lastVisit < comment.lastContentUpdatedDate);
                comment.hasUnseenContent = (commentIsNew && comment.author.id !== currentUser);

                // if any of these comments are unseen, then so is the thread
                thread.hasUnseenContent = thread.hasUnseenContent || comment.hasUnseenContent;
            });
        }
    }
}
