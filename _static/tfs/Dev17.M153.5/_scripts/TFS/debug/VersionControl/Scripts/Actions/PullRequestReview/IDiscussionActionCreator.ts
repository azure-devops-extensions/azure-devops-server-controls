import { DiscussionThread, DiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionStatus } from "Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { IDiscussionContextItemActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionContextItemActionCreator";

export abstract class IDiscussionActionCreator implements IDiscussionContextItemActionCreator {
    /**
     * Query discussion threads for a given pull request.
     * @param iterationId
     * @param baseId
     */
    abstract queryDiscussionThreads(iterationId: number, baseId: number, updateDiscussionManager?: boolean): void;

    abstract queryDiscussionThread(threadId: number, iterationId: number, baseId: number): void;

    /**
     * locally save (but don't send to server) a discussion thread
     */
    abstract saveThread(thread: DiscussionThread): void;

    /**
     * locally save (but don't send to the server) a comment
     */
    abstract saveComment(thread: DiscussionThread, comment: DiscussionComment): void;

    abstract cancelComment(thread: DiscussionThread, comment: DiscussionComment): void;

    /**
     * change the status of a thread
     */
    abstract setThreadStatus(thread: DiscussionThread, status: DiscussionStatus): void;

    /**
     * create a new comment locally and append it to the thread
     */
    abstract addComment(thread: DiscussionThread, parentCommentId?: number, initialContent?: string): void;

    /**
     * commit a thread and all its comments to the server
     * Empty comments will not be saved
     * If a thread contains only empty comments, the thread will not be saved
     * Optionally specify to refresh latest discussions after committing (will keep activity feed tracks up to date)
     */
    abstract commitThread(thread: DiscussionThread);

    /**
     * commit a comment to the server and update its status
     */
    abstract commitCommentAndChangeStatus(thread: DiscussionThread, comment: DiscussionComment, status: DiscussionStatus, focusReplyBox?: boolean): void;

    /**
     * commit a comment to the server
     * if the containing discussion thread hasn't yet been comitted, commit that as well
     * @param thread
     * @param comment
     * @param skipLastVisitUpdate If true, don't update the last visit if applicable (useful when this method is called in a loop)
     * @param focusReplyBox If true, set keyboard focus into the reply box after the comment finishes saving
     */
    abstract commitComment(thread: DiscussionThread, comment: DiscussionComment, skipLastVisitUpdate?: boolean, focusReplyBox?: boolean): void;

    /**
     * Commits all dirty comments and threads to the server.
     * Additionally, it will clear the comment selection so that focus doesn't jump back
     * to whatever comment might have been in edit mode before saving all comments
     * Do not save any empty comments
     */
    abstract commitAllComments();

    /**
     * delete a comment from a thread (deletes from server as well)
     */
    abstract deleteComment(thread: DiscussionThread, comment: DiscussionComment): void;

    /**
     * create a new thread locally (without notifying the server)
     */
    abstract createThread(newThread: DiscussionThread, updateDiscussionManager?: boolean): void;

    /**
     * navigate to the file where the thread is being created and create the thread
     */
    abstract createThreadAndNavigate(newThread: DiscussionThread, updateDiscussionManager?: boolean): void;

    abstract selectComment(threadId: number, commentId: number): void;
    
    /**
     * Update the current discussion filter. If this filter is used to retrieve filtered threads,
     * Discussions that fail this filter will be removed from the list of returned threads.
     * @param filter 
     */
    abstract updateDiscussionFilter(filter: DiscussionType): void;

    /**
     * Update the current discussion collapse filter. On update, discussions that fail this filter
     * will be marked as "collapsed". Collapsed discussions in the UI take up minimal space with only 
     * a visible control to toggle their collapse status.
     */
    abstract updateDiscussionCollapseFilter(filter: DiscussionType): void;

    /**
     * Apply the current discussion collapse filter to the given thread
     */
    abstract applyCurrentDiscussionCollapseFilter(thread: DiscussionThread): void;

    /**
     * Collapse the given thread. Collapsed threads are hidden from file views and display only the toggle control.
     */
    abstract collapseThread(thread: DiscussionThread): void;

    /**
     * Expand the group for the given thread. Grouped threads are those on the same line of code.
     */
    abstract expandThreadGroup(thread: DiscussionThread): void;

    /**
     * Mark the given comment as "liked" by the current user.
     */
    abstract createCommentLike(thread: DiscussionThread, comment: DiscussionComment): void;

    /**
     * Remove the "liked" status by the current user on the given comment.
     */
    abstract deleteCommentLike(thread: DiscussionThread, comment: DiscussionComment): void;

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "IDiscussionActionCreator"; }
}