import * as Q from "q";
import { autobind } from "OfficeFabric/Utilities";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { DiscussionThread, DiscussionComment, DiscussionCommentUtils } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import DiscussionResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion");
import DiscussionConstants = require("Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants");
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

import { IAutoCompleteActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestAutoCompleteActionCreator";
import { IAttachmentActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IAttachmentActionCreator";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { INavigationActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/INavigationActionCreator";
import { IPolicyActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IPolicyActionCreator";

import { IDiscussionSource } from "VersionControl/Scripts/Sources/IDiscussionSource";
import { PullRequestPolicyTypeIds } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { IDiscussionsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { ICodeExplorerStore } from "VersionControl/Scripts/Stores/PullRequestReview/ICodeExplorerStore";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export class DiscussionActionCreator implements IDiscussionActionCreator {
    private _tfsContext: TfsContext;
    private _actionsHub: Actions.ActionsHub;

    constructor(tfsContext: TfsContext, actionsHub: Actions.ActionsHub) {
        this._tfsContext = tfsContext;
        this._actionsHub = actionsHub;
    }

    public queryDiscussionThreads(iterationId: number, baseId: number, updateDiscussionManager?: boolean): IPromise<void> {
        // notify that we are starting the update
        this._actionsHub.discussionThreadsUpdating.invoke(null);

        const discussionSource = ServiceRegistry.getService(IDiscussionSource);
        return discussionSource.queryDiscussionThreadsAsync(iterationId, baseId)
            .then(threads => {
                // discussions are ready to go
                this._actionsHub.discussionThreadsUpdated.invoke({
                    threads: threads
                });

                if (updateDiscussionManager) {
                    this._actionsHub.discussionThreadsUpdated_ForDiscussionManager.invoke({
                        threads: threads
                    });
                }
            })
            .then(undefined, this.raiseError);
    }

    public queryDiscussionThread(threadId: number, iterationId: number, baseId: number): void {
        // query a single thread async
        const discussionSource = ServiceRegistry.getService(IDiscussionSource);
        discussionSource.queryDiscussionThreadAsync(threadId, iterationId, baseId)
            .then(thread => {
                // discussions are ready to go
                this._actionsHub.discussionThreadUpdated.invoke({
                    thread: thread
                });
            })
            .then(undefined, this.raiseError);
    }

    private _queryDiscussionThreadToLatest(threadId: number): void {
        const codeExplorerStore = ServiceRegistry.getService(ICodeExplorerStore);
        if (codeExplorerStore) {
            const latestIteration = codeExplorerStore.getLatestIterationId();
            const selectedIteration = codeExplorerStore.getSelectedIterationId();
            const selectedBaseIteration = codeExplorerStore.getSelectedBaseIterationId();

            if (latestIteration > 0 && (selectedIteration != latestIteration || selectedBaseIteration != 0)) {
                this.queryDiscussionThread(threadId, latestIteration, 0);
            }
        }
    }

    public saveThread(thread: DiscussionThread): void {
        this._actionsHub.discussionThreadUpdated.invoke({
            thread: thread
        });
    }

    public saveComment(thread: DiscussionThread, comment: DiscussionComment): void {
        this._actionsHub.discussionCommentUpdated.invoke({
            thread: thread,
            comment: comment
        });
    }

    public cancelComment(thread: DiscussionThread, comment: DiscussionComment): void {
        if (comment.id < 0) {
            this.deleteComment(thread, comment);
        }
        else {
            const commentClone = $.extend({}, comment) as DiscussionComment;
            commentClone.newContent = null;
            commentClone.isDirty = false;
            this.saveComment(thread, commentClone);
        }
    }

    public setThreadStatus(thread: DiscussionThread, status: DiscussionConstants.DiscussionStatus): void {
        const fullClone = $.extend({}, thread) as DiscussionThread;
        fullClone.status = status;

        this._actionsHub.discussionThreadStatusUpdated.invoke({
            thread: fullClone
        });

        // Partial clone so that we are only comitting the status and not any other unsaved changes to this thread
        // The patch call will then return the full data to be put into the store
        const partialClone: any = {};
        partialClone.artifactUri = thread.artifactUri;
        partialClone.id = thread.id;
        partialClone.status = status;

        const discussionSource = ServiceRegistry.getService(IDiscussionSource);
        discussionSource.updateThreadStatusAsync(partialClone)
            .then(() => {

                this._requestPolicyEvaluation();

                announce(VCResources.DiscussionAnnounceThreadStatusChanged);
            });

        // if we're updating a thread that has unseen content, update that the user was here at this time
        const navigationActionCreator = ServiceRegistry.getService(INavigationActionCreator);
        if (thread.hasUnseenContent && navigationActionCreator) {
            navigationActionCreator.updateLastVisit(false);
        }

        // user is setting the thread status - apply the current collapse filter to this thread
        // so the thread will collapse if necessary
        this.applyCurrentDiscussionCollapseFilter(fullClone);
    }

    public addComment(thread: DiscussionThread, parentCommentId?: number, initialContent?: string): void {
        const isFirstComment = !thread.comments || thread.comments.length === 0;
        let parentId = 0;
        if (!isFirstComment) {
            parentId = parentCommentId ? parentCommentId : thread.comments[0].id;
        }

        this._actionsHub.discussionCommentAdded.invoke({
            thread: thread,
            parentComment: parentId,
            initialContent: initialContent,
        });
    }

    public commitThread(thread: DiscussionThread, focusReplyBox?: boolean) {
        const comments = [];
        const emptyComments: DiscussionComment[] = [];
        thread.comments.forEach(c => {
            if (!c.isComitting) {
                if (c.isDirty || c.id < 0) {
                    if (DiscussionCommentUtils.hasNewContent(c)) {
                        const commentClone = $.extend({}, c) as DiscussionComment;
                        commentClone.content = c.newContent;
                        comments.push(commentClone);
                    }
                    else {
                        emptyComments.push(c);
                    }
                }
                else {
                    comments.push(c);
                }
            }
        });

        if (comments.length > 0) {
            const threadClone = $.extend({}, thread) as DiscussionThread;
            threadClone.comments = comments;
            threadClone.uniqueId = threadClone.uniqueId || GUIDUtils.newGuid();

            this._actionsHub.discussionThreadComitting.invoke({
                thread: threadClone
            });

            const comment = threadClone.comments[0];
            const attachmentActionCreator = ServiceRegistry.getService(IAttachmentActionCreator);
            let attachmentPromise: IPromise<IDictionaryStringTo<string>>;
            if (attachmentActionCreator) {
                attachmentPromise = attachmentActionCreator.commitAttachments(comment.content);
            }
            else {
                attachmentPromise = Q.resolve({});
            }

            attachmentPromise
                .then(replacementMap => {
                    for (const oldUrl in replacementMap) {
                        comment.content = comment.content.replace(new RegExp(oldUrl, 'g'), replacementMap[oldUrl]);
                    }
                })
                .then(() => {
                    const discussionSource = ServiceRegistry.getService(IDiscussionSource);
                    return discussionSource.commitNewThreadAsync(threadClone);
                })
                .then(newThread => {
                    this._actionsHub.discussionThreadComitted.invoke({
                        thread: newThread,
                        oldThread: thread,
                        focusReplyBox: focusReplyBox
                    } as any);

                    this._actionsHub.discussionThreadComitted_ForDiscussionManager.invoke({
                        thread: newThread,
                        oldThread: thread
                    } as any);

                    $.each(thread.comments, (index, c) => {
                        this._actionsHub.discussionCommentComitted_ForDiscussionManager.invoke({
                            thread: newThread,
                            comment: (newThread as any).comments[index],
                            oldComment: thread.comments[index]
                        } as any);
                    });

                    this._requestPolicyEvaluation();

                    this._queryDiscussionThreadToLatest((newThread as any).id);

                    announce(VCResources.DiscussionAnnounceThreadSaved);
                })
                .then(undefined, error => {
                    this._actionsHub.discussionThreadCommitFailed.invoke({
                        thread: thread
                    });
                });
        }

        for (const emptyComment of emptyComments) {
            this.cancelComment(thread, emptyComment);
        }
    }

    public commitCommentAndChangeStatus(
        thread: DiscussionThread,
        comment: DiscussionComment,
        status: DiscussionConstants.DiscussionStatus,
        focusReplyBox?: boolean): void {

        if (!comment || comment.isComitting) {
            return;
        }

        // update the status before committing the comment so it doesn't bounce through
        // the system with varying statuses before the source call comes back
        const threadWithUpdatedStatus: DiscussionThread = { ...thread, status: status };

        if (comment.threadId > 0) {
            this._commitCommentInternal(thread, comment, focusReplyBox).then((comment: DiscussionConstants.DiscussionComment) => {
                this.setThreadStatus(thread, status);
            }).then(undefined, error => {
            });
        }
        else {
            this.commitThread(threadWithUpdatedStatus, focusReplyBox);
        }
    }

    public commitComment(
        thread: DiscussionThread,
        comment: DiscussionComment,
        skipLastVisitUpdate?: boolean,
        focusReplyBox?: boolean): void {

        if (comment.isComitting) {
            return; // we already started submitting this comment, so do not submit it again
        }

        if (comment.threadId > 0) {
            this._commitCommentInternal(thread, comment, focusReplyBox);

            // if we're updating a thread that has unseen content, update that the user was here at this time
            const navigationActionCreator = ServiceRegistry.getService(INavigationActionCreator);
            if (!skipLastVisitUpdate && thread.hasUnseenContent && navigationActionCreator) {
                navigationActionCreator.updateLastVisit(false);
            }
        }
        else {
            this.commitThread(thread, focusReplyBox);
        }
    }

    private _commitCommentInternal(thread: DiscussionThread, comment: DiscussionComment, focusReplyBox?: boolean): IPromise<DiscussionConstants.DiscussionComment> {

        const commentClone = $.extend({}, comment) as DiscussionComment;
        commentClone.content = comment.newContent;

        this._actionsHub.discussionCommentComitting.invoke({
            thread: thread,
            comment: commentClone
        });

        const attachmentActionCreator = ServiceRegistry.getService(IAttachmentActionCreator);
        let attachmentPromise: IPromise<IDictionaryStringTo<string>>;
        if (attachmentActionCreator) {
            attachmentPromise = attachmentActionCreator.commitAttachments(commentClone.content);
        }
        else {
            attachmentPromise = Q.resolve({});
        }
        return attachmentPromise.then(replacementMap => {
                for (const oldUrl in replacementMap) {
                    commentClone.content = commentClone.content.replace(new RegExp(oldUrl, 'g'), replacementMap[oldUrl]);
                }
            })
            .then(() => {
                const discussionSource = ServiceRegistry.getService(IDiscussionSource);
                return discussionSource.commitCommentAsync(commentClone);
            })
            .then(newComment => {
                this._actionsHub.discussionCommentComitted.invoke({
                    thread: thread,
                    comment: newComment,
                    oldComment: comment,
                    focusReplyBox: focusReplyBox
                } as any);

                this._actionsHub.discussionCommentComitted_ForDiscussionManager.invoke({
                    thread: thread,
                    comment: newComment,
                    oldComment: comment
                } as any);

                announce(VCResources.DiscussionAnnounceCommentSaved);

                return newComment;
            })
            .then<DiscussionConstants.DiscussionComment>(undefined, error => {
                this.raiseError(error);
                
                this._actionsHub.discussionCommentCommitFailed.invoke({
                    thread: thread,
                    comment: comment
                });

                return Q.reject(error);
            });
    }
    
    @autobind
    public commitAllComments() {

        this.selectComment(undefined, null);

        // Get all threads
        const discussionsStore = ServiceRegistry.getService(IDiscussionsStore);
        const threads: DiscussionThread[] = discussionsStore.getDiscussionThreads({
            types: DiscussionType.AllComments,
            includePending: true,
            requestedContext: null,
        });
        
        const pendingThread = discussionsStore.getPendingThread();
        if (pendingThread) {
            threads.push(pendingThread);
        }

        const unsavedComments: { thread: DiscussionThread, comment: DiscussionComment }[] = [];

        $.each(threads, (index, t) => {
            if (t.id > 0) {
                $.each(t.comments, (cIndex, c) => {
                    if (c.isDirty) {
                        if (DiscussionCommentUtils.hasNewContent(c)) {
                            this.commitComment(t, c, true);
                        }
                        else {
                            if (c.id < 0) {
                                this.cancelComment(t, c);
                            }
                            else {
                                unsavedComments.push({thread: t, comment: c});
                            }
                        }
                    }
                });
            }
            else {
                this.commitThread(t);
            }
        });

        if (unsavedComments.length > 0) {
            let message = DiscussionResources.DiscussionThreadUnsavedComments;
            for (const unsaved of unsavedComments) {
                if (unsaved.thread.itemPath) {
                    if (unsaved.thread.position) {
                        message += "\n" + Utils_String.format(DiscussionResources.DiscussionThreadUnsavedComment, unsaved.thread.itemPath, unsaved.thread.position.endLine);
                    }
                    else {
                        message += "\n" + unsaved.thread.itemPath;
                    }
                }
                else {
                    message += "\n" + VCResources.Overview;
                }
            }

            alert(message);
        }

        // update the last visit time of the user when committing all comments (happens on vote)
        const navigationActionCreator = ServiceRegistry.getService(INavigationActionCreator);
        if (navigationActionCreator) {
            navigationActionCreator.updateLastVisit(false);
        }
    }

    public deleteComment(thread: DiscussionThread, comment: DiscussionComment): void {
        if (comment.threadId > 0 && comment.id > 0) {
            const discussionSource = ServiceRegistry.getService(IDiscussionSource);
            discussionSource.deleteCommentAsync(comment).then(() => {
                this._actionsHub.discussionCommentDeleted.invoke({
                    thread: thread,
                    comment: comment
                });
                if (thread.comments.length < 1) {
                    this._actionsHub.discussionThreadDeleted.invoke({
                        thread: thread
                    });
                    announce(VCResources.DiscussionAnnounceThreadDeleted);
                }
                else {
                    announce(VCResources.DiscussionAnnounceCommentDeleted);
                }

                this._requestPolicyEvaluation();
            })
            .then(undefined, this.raiseError);
        }
        else {
            this._actionsHub.discussionCommentDeleted.invoke({
                thread: thread,
                comment: comment
            });

            this._requestPolicyEvaluation();

            announce(VCResources.DiscussionAnnounceCommentDeleted);
        }
    }

    public createThread(newThread: DiscussionThread, updateDiscussionManager?: boolean): void {
        const discussionsStore = ServiceRegistry.getService(IDiscussionsStore);
        const codeExplorerStore = ServiceRegistry.getService(ICodeExplorerStore);

        // add default data - includes necessary ids and tracking information
        newThread.id = newThread.id || discussionsStore.newThreadId();
        newThread.originalId = newThread.originalId || newThread.id;
        newThread.status = newThread.status || DiscussionConstants.DiscussionStatus.Active;
        newThread.secondComparingIteration = newThread.secondComparingIteration || (codeExplorerStore && codeExplorerStore.getSelectedIterationId());
        newThread.firstComparingIteration = newThread.firstComparingIteration || (codeExplorerStore && codeExplorerStore.getSelectedBaseIterationId()) || newThread.secondComparingIteration;
        newThread.uniqueId = newThread.uniqueId || GUIDUtils.newGuid();
        newThread.createdDate = new Date(Date.now());

        if (newThread.itemPath) {
            newThread.changeTrackingId = newThread.changeTrackingId || (codeExplorerStore && codeExplorerStore.getChangeTrackingIdForPath(newThread.itemPath));
        }

        if (newThread.comments) {
            newThread.comments.forEach((comment) => {
                comment.threadId = comment.threadId || newThread.id;
                comment.originalThreadId = comment.originalThreadId || newThread.originalId;
                comment.id = comment.id || discussionsStore.newCommentId();
                comment.originalId = comment.originalId || comment.id;
                comment.commentType = comment.commentType || DiscussionConstants.CommentType.Text;
                comment.usersLiked = [];
            });
        }

        this._actionsHub.discussionThreadUpdated.invoke({
            thread: newThread,
        });

        if (updateDiscussionManager) {
            this._actionsHub.discussionThreadAdded_ForDiscussionManager.invoke({
                thread: newThread,
            });
        }
    }

    public createThreadAndNavigate(newThread: DiscussionThread, updateDiscussionManager?: boolean): void {
        if (newThread.itemPath) {
            const navigationActionCreator = ServiceRegistry.getService(INavigationActionCreator);
            if (navigationActionCreator) {
                navigationActionCreator.navigateWithState({ path: newThread.itemPath, discussionId: null }, false);
            }
        }

        this.createThread(newThread, updateDiscussionManager);
    }

    public selectComment(threadId: number, commentId: number): void {
        this._actionsHub.discussionSelected.invoke({
            discussionId: threadId,
            commentId: commentId
        });
    }

    public createCommentLike(thread: DiscussionThread, comment: DiscussionComment): void {
        const commentClone: DiscussionComment = { ...comment };
        commentClone.usersLiked = comment.usersLiked ? comment.usersLiked.slice(0) : [];
        
        const userLikesComment: boolean = commentClone.usersLiked.some(user => user.id === this._tfsContext.currentIdentity.id);
        if (!userLikesComment) {
            const userIdentityRef = commentClone.usersLiked.push({ 
                id: this._tfsContext.currentIdentity.id, 
                displayName: this._tfsContext.currentIdentity.displayName 
            } as IdentityRef);

            const discussionSource: IDiscussionSource = ServiceRegistry.getService(IDiscussionSource);
            discussionSource.createCommentLikeAsync(thread.id, comment.id).then(() => {
                this._actionsHub.discussionCommentLikeUpdated.invoke({
                    thread: thread,
                    comment: commentClone,
                });

                announce(VCResources.DiscussionAnnounceCommentLiked);
            })
            .then(undefined, this.raiseError);
        }
    }

    public deleteCommentLike(thread: DiscussionThread, comment: DiscussionComment): void {
        const commentClone: DiscussionComment = { ...comment };
        commentClone.usersLiked = comment.usersLiked ? comment.usersLiked.slice(0) : [];

        const usersLiked: IdentityRef[] = commentClone.usersLiked.filter(user => user.id !== this._tfsContext.currentIdentity.id);
        if (commentClone.usersLiked.length !== usersLiked.length) {
            commentClone.usersLiked = usersLiked;

            const discussionSource: IDiscussionSource = ServiceRegistry.getService(IDiscussionSource);
            discussionSource.deleteCommentLikeAsync(thread.id, comment.id).then(() => {
                this._actionsHub.discussionCommentLikeUpdated.invoke({
                    thread: thread,
                    comment: commentClone,
                });

                announce(VCResources.DiscussionAnnounceCommentLikeWithdrawn);
            })
            .then(undefined, this.raiseError);
        }
    }

    public updateDiscussionFilter(filter: DiscussionType): void {
        this._actionsHub.discussionFilterUpdated.invoke({
            filter: filter
        });
    }

    public updateDiscussionCollapseFilter(filter: DiscussionType): void {
        this._actionsHub.discussionFilterUpdated.invoke({
            collapseFilter: filter
        });
    }

    public applyCurrentDiscussionCollapseFilter(thread: DiscussionThread): void {
        this._actionsHub.discussionApplyCurrentCollapseFilter.invoke({
            thread: thread,
        });
    }

    public collapseThread(thread: DiscussionThread): void {
        this._actionsHub.discussionThreadCollapse.invoke({
            thread: thread,
        });

        // after manually adjusting the current view, set the collapse filter expanded
        // (which means we are showing all threads that are not marked collapsed)
        this.updateDiscussionCollapseFilter(DiscussionType.Expanded);
    }

    public expandThreadGroup(thread: DiscussionThread): void {
        this._actionsHub.discussionThreadExpandGroup.invoke({
            thread: thread,
        });

        // after manually adjusting the current view, set the collapse filter expanded
        // (which means we are showing all threads that are not marked collapsed)
        this.updateDiscussionCollapseFilter(DiscussionType.Expanded);
    }

    private raiseError = (error: any): void => {
        this._actionsHub.raiseError.invoke(error);
    }

    private _requestPolicyEvaluation(): void {
        const policyActionCreator = ServiceRegistry.getService(IPolicyActionCreator);
        if (policyActionCreator) {
            policyActionCreator.queryPolicyEvaluationsByType(PullRequestPolicyTypeIds.CommentRequirementsPolicy);
        }

        const autoCompleteActionCreator = ServiceRegistry.getService(IAutoCompleteActionCreator);
        if (autoCompleteActionCreator) {
            autoCompleteActionCreator.getBlockingAutoCompletePolicies();
        }
    }
}
