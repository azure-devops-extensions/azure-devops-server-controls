import Q = require("q");

import ReactSource = require("VersionControl/Scripts/Sources/Source");

import Git_Client = require("TFS/VersionControl/GitRestClient");

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionConstants = require("Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants");
import VCContracts = require("TFS/VersionControl/Contracts");

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import Performance = require("VSS/Performance");

import { IDiscussionSource, SupportsMarkdownPropertyName, UniqueIDPropertyName } from "VersionControl/Scripts/Sources/IDiscussionSource";

import { PersonMentionTranslator } from "VersionControl/Scripts/Utils/DiscussionUtils";

export class DiscussionSource extends ReactSource.CachedSource implements IDiscussionSource {
    private static DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
    private static DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailProvider";

    private _gitRestClient: Git_Client.GitHttpClient;

    private _authorId: string;
    private _repositoryId: string;
    private _projectId: string;
    private _pullRequestId: number;

    constructor(tfsContext: TfsContext, projectId: string, repositoryId: string, pullRequestId: number) {
        super(DiscussionSource.DATA_ISLAND_PROVIDER_ID, DiscussionSource.DATA_ISLAND_CACHE_PREFIX);

        this._gitRestClient = TFS_OM_Common.ProjectCollection.getDefaultConnection()
            .getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);

        this._authorId = tfsContext.currentIdentity.id;
        this._repositoryId = repositoryId;
        this._projectId = projectId;
        this._pullRequestId = pullRequestId;
    }

    /**
     * Query for discussion threads tracked to the given iteration/base pair.
     * @iterationId - The iteration to track threads to
     * @baseId - The base iteration being compared to the given iteration in the current view.
     *           Default baseId of 0 means no special comparing view and instead the threads
     *           should be tracked to the given iteration
     */
    public queryDiscussionThreadsAsync(iterationId: number, baseId: number): IPromise<DiscussionCommon.DiscussionThread[]> {

        const scenario = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_VIEW_LOAD_DISCUSSIONS_FEATURE);

        scenario.addData({
            pullRequestId: this._pullRequestId,
            iterationId: iterationId,
            baseId: baseId
        });

        // check for cached value before going to REST
        const cached = this.fromCache<VCContracts.GitPullRequestCommentThread[]>(
            "DiscussionThreads." + this._pullRequestId + "." + iterationId + "." + baseId,
            VCContracts.TypeInfo.GitPullRequestCommentThread);

        if (cached) {
            // transform from CR comment threads to discussion threads
            const threads = PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInThreads(this._convertPRThreads(cached));

            scenario.addData({ cached: true });
            scenario.end();
            return Q<DiscussionCommon.DiscussionThread[]>(threads);
        }

        const this_ = this;

        const deferred = Q.defer<DiscussionCommon.DiscussionThread[]>();

        this._gitRestClient.getThreads(this._repositoryId, this._pullRequestId, this._projectId, iterationId, baseId)
            .then((prThreads: VCContracts.GitPullRequestCommentThread[]): void => {
                deferred.resolve(PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInThreads(this_._convertPRThreads(prThreads)));
            });

        return deferred.promise;
    }

    /**
     * Query for a single discussion thread by ID and tracked to the given iteration/base pair.
     * @iterationId - The iteration to track threads to
     * @baseId - The base iteration being compared to the given iteration in the current view.
     *           Default baseId of 0 means no special comparing view and instead the given thread
     *           should be tracked to the given iteration
     */
    public queryDiscussionThreadAsync(threadId: number, iterationId: number, baseId: number): IPromise<DiscussionCommon.DiscussionThread> {
        // prevent the call if it's an invalid id
        if (threadId <= 0) {
            return Q<DiscussionCommon.DiscussionThread>(null);
        }

        const this_ = this;

        const deferred = Q.defer<DiscussionCommon.DiscussionThread>();

        this._gitRestClient.getPullRequestThread(this._repositoryId, this._pullRequestId, threadId, null, iterationId, baseId)
            .then((prThread: VCContracts.GitPullRequestCommentThread): void => {
                deferred.resolve(PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInThread(this_._convertPRThread(prThread)));
            });

        return deferred.promise;
    }

    public createCommentLikeAsync(threadId: number, commentId: number): IPromise<void> {
        return this._gitRestClient.createLike(this._repositoryId, this._pullRequestId, threadId, commentId, this._projectId);
    }

    public deleteCommentLikeAsync(threadId: number, commentId: number): IPromise<void> {
        return this._gitRestClient.deleteLike(this._repositoryId, this._pullRequestId, threadId, commentId, this._projectId);
    }

    public commitNewThreadAsync(thread: DiscussionCommon.DiscussionThread): IPromise<DiscussionCommon.DiscussionThread> {
        const deferred = Q.defer<DiscussionCommon.DiscussionThread>();

        const this_ = this;

        this._gitRestClient.createThread(this._convertCommonThread(PersonMentionTranslator.getDefault().translateDisplayNameToStorageKeyInThread(thread)), this._repositoryId, this._pullRequestId, this._projectId)
            .then((prThread: VCContracts.GitPullRequestCommentThread): void => {
                deferred.resolve(PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInThread(this_._convertPRThread(prThread)));
            });

        return deferred.promise;
    }

    public commitCommentAsync(comment: DiscussionCommon.DiscussionComment): IPromise<DiscussionCommon.DiscussionComment> {
        if (comment.id > 0) {
            return this._gitRestClient.updateComment(
                    this._convertCommonComment(PersonMentionTranslator.getDefault().translateDisplayNameToStorageKeyInComment(comment)), 
                    this._repositoryId, 
                    this._pullRequestId, 
                    comment.threadId, 
                    comment.id, 
                    this._projectId)
                .then(prComment => PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInComment(this._convertPRComment(prComment, comment.threadId)));
        }
        else {
            return this._gitRestClient.createComment(
                    this._convertCommonComment(PersonMentionTranslator.getDefault().translateDisplayNameToStorageKeyInComment(comment)), 
                    this._repositoryId, 
                    this._pullRequestId, 
                    comment.threadId, 
                    this._projectId)
                .then(prComment => PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInComment(this._convertPRComment(prComment, comment.threadId)));
        }
    }

    public deleteCommentAsync(comment: DiscussionConstants.DiscussionComment): IPromise<void> {
        return this._gitRestClient.deleteComment(this._repositoryId, this._pullRequestId, comment.threadId, comment.id, this._projectId);
    }

    private _convertPRStatus(prStatus: VCContracts.CommentThreadStatus): DiscussionConstants.DiscussionStatus {
        switch (prStatus) {
            case VCContracts.CommentThreadStatus.Active: return DiscussionConstants.DiscussionStatus.Active;
            case VCContracts.CommentThreadStatus.ByDesign: return DiscussionConstants.DiscussionStatus.ByDesign
            case VCContracts.CommentThreadStatus.Closed: return DiscussionConstants.DiscussionStatus.Closed;
            case VCContracts.CommentThreadStatus.Fixed: return DiscussionConstants.DiscussionStatus.Fixed;
            case VCContracts.CommentThreadStatus.Pending: return DiscussionConstants.DiscussionStatus.Pending;
            case VCContracts.CommentThreadStatus.WontFix: return DiscussionConstants.DiscussionStatus.WontFix;
            default: return DiscussionConstants.DiscussionStatus.Unknown;
        }
    }

    private _convertPRCommentType(prCommentType: VCContracts.CommentType): DiscussionConstants.CommentType {
        switch (prCommentType) {
            case VCContracts.CommentType.Text: return DiscussionConstants.CommentType.Text;
            case VCContracts.CommentType.CodeChange: return DiscussionConstants.CommentType.CodeChange;
            case VCContracts.CommentType.System: return DiscussionConstants.CommentType.System;
            default: return DiscussionConstants.CommentType.Unknown;
        }
    }

    private _convertPRComment(prComment: VCContracts.Comment, threadId: number): DiscussionCommon.DiscussionComment {
        return {
            id: prComment.id,
            parentId: prComment.parentCommentId,
            threadId: threadId,
            author: prComment.author,
            content: prComment.content,
            publishedDate: prComment.publishedDate,
            isDeleted: prComment.isDeleted,
            lastUpdatedDate: prComment.lastUpdatedDate,
            lastContentUpdatedDate: prComment.lastContentUpdatedDate,
            usersLiked: prComment.usersLiked || [],
            canDelete: (prComment.author.id == this._authorId),
            commentType: this._convertPRCommentType(prComment.commentType),

            _links: prComment._links
        } as DiscussionCommon.DiscussionComment;
    }

    private _convertPRComments(prComments: VCContracts.Comment[], threadId: number): DiscussionCommon.DiscussionComment[] {
        const this_ = this;
        if (!prComments) {
            return [];
        }

        return prComments.map(
            (prComment: VCContracts.Comment): DiscussionCommon.DiscussionComment => {
                return this_._convertPRComment(prComment, threadId);
            });
    }

    private _convertPRPosition(
        leftFileStart: VCContracts.CommentPosition,
        leftFileEnd: VCContracts.CommentPosition,
        rightFileStart: VCContracts.CommentPosition,
        rightFileEnd: VCContracts.CommentPosition): DiscussionCommon.DiscussionPosition {

        if (leftFileStart && leftFileEnd) {
            return {
                startLine: leftFileStart.line,
                startColumn: leftFileStart.offset,
                endLine: leftFileEnd.line,
                endColumn: leftFileEnd.offset,
                positionContext: DiscussionCommon.PositionContext.LeftBuffer
            };
        }

        if (rightFileStart && rightFileEnd) {
            return {
                startLine: rightFileStart.line,
                startColumn: rightFileStart.offset,
                endLine: rightFileEnd.line,
                endColumn: rightFileEnd.offset,
                positionContext: DiscussionCommon.PositionContext.RightBuffer
            };
        }

        return null;
    }

    private _convertPRThread(prThread: VCContracts.GitPullRequestCommentThread): DiscussionCommon.DiscussionThread {
        const comments = this._convertPRComments(prThread.comments, prThread.id);
        return {
            id: prThread.id,
            artifactUri: null,
            publishedDate: prThread.publishedDate,
            lastUpdatedDate: prThread.lastUpdatedDate,
            comments,
            commentsCount: comments.length,
            properties: prThread.properties,
            identities: prThread.identities,
            workItemId: null,
            status: this._convertPRStatus(prThread.status),
            itemPath: prThread.threadContext && prThread.threadContext.filePath,
            position: prThread.threadContext &&
            this._convertPRPosition(
                prThread.threadContext.leftFileStart,
                prThread.threadContext.leftFileEnd,
                prThread.threadContext.rightFileStart,
                prThread.threadContext.rightFileEnd),
            _links: prThread._links,
            isDeleted: prThread.isDeleted,
            changeTrackingId: prThread.pullRequestThreadContext && prThread.pullRequestThreadContext.changeTrackingId,
            firstComparingIteration: prThread.pullRequestThreadContext &&
            prThread.pullRequestThreadContext.iterationContext &&
            prThread.pullRequestThreadContext.iterationContext.firstComparingIteration,
            secondComparingIteration: prThread.pullRequestThreadContext &&
            prThread.pullRequestThreadContext.iterationContext &&
            prThread.pullRequestThreadContext.iterationContext.secondComparingIteration,
            trackingCriteria: prThread.pullRequestThreadContext && prThread.pullRequestThreadContext.trackingCriteria &&
            {
                firstComparingIteration: prThread.pullRequestThreadContext.trackingCriteria.firstComparingIteration,
                secondComparingIteration: prThread.pullRequestThreadContext.trackingCriteria.secondComparingIteration,
                origFilePath: prThread.pullRequestThreadContext.trackingCriteria.origFilePath,
            },
            originalPosition: prThread.pullRequestThreadContext && prThread.pullRequestThreadContext.trackingCriteria &&
            this._convertPRPosition(
                prThread.pullRequestThreadContext.trackingCriteria.origLeftFileStart,
                prThread.pullRequestThreadContext.trackingCriteria.origLeftFileEnd,
                prThread.pullRequestThreadContext.trackingCriteria.origRightFileStart,
                prThread.pullRequestThreadContext.trackingCriteria.origRightFileEnd),
            supportsMarkdown: prThread.properties &&
            prThread.properties[SupportsMarkdownPropertyName] &&
            prThread.properties[SupportsMarkdownPropertyName].$value === 1,
            uniqueId: prThread.properties &&
            prThread.properties[UniqueIDPropertyName] &&
            prThread.properties[UniqueIDPropertyName].$value
        } as DiscussionCommon.DiscussionThread;
    }

    private _convertPRThreads(prThreads: VCContracts.GitPullRequestCommentThread[]): DiscussionCommon.DiscussionThread[] {
        const this_ = this;

        return prThreads.map<DiscussionCommon.DiscussionThread>(
            (prThread: VCContracts.GitPullRequestCommentThread): DiscussionCommon.DiscussionThread => {
                return this_._convertPRThread(prThread);
            });
    }

    private _convertCommonCommentType(commentType: DiscussionConstants.CommentType): VCContracts.CommentType {
        switch (commentType) {
            case DiscussionConstants.CommentType.Text: return VCContracts.CommentType.Text;
            case DiscussionConstants.CommentType.CodeChange: return VCContracts.CommentType.CodeChange;
            case DiscussionConstants.CommentType.System: return VCContracts.CommentType.System;
            default: return VCContracts.CommentType.Unknown;
        }
    }

    private _convertCommonComment(comment: DiscussionCommon.DiscussionComment): VCContracts.Comment {
        return {
            parentCommentId: comment.parentId,
            content: comment.content,
            commentType: this._convertCommonCommentType(comment.commentType)
        } as VCContracts.Comment;
    }

    private _convertCommonComments(comments: DiscussionCommon.DiscussionComment[]): VCContracts.Comment[] {
        if (comments) {
            const this_ = this;
            return comments.map((comment: DiscussionCommon.DiscussionComment): VCContracts.Comment => {
                return this_._convertCommonComment(comment);
            });
        }
        return null;
    }

    private _convertCommonStatus(status: DiscussionConstants.DiscussionStatus): VCContracts.CommentThreadStatus {
        switch (status) {
            case DiscussionConstants.DiscussionStatus.Active: return VCContracts.CommentThreadStatus.Active;
            case DiscussionConstants.DiscussionStatus.ByDesign: return VCContracts.CommentThreadStatus.ByDesign
            case DiscussionConstants.DiscussionStatus.Closed: return VCContracts.CommentThreadStatus.Closed;
            case DiscussionConstants.DiscussionStatus.Fixed: return VCContracts.CommentThreadStatus.Fixed;
            case DiscussionConstants.DiscussionStatus.Pending: return VCContracts.CommentThreadStatus.Pending;
            case DiscussionConstants.DiscussionStatus.WontFix: return VCContracts.CommentThreadStatus.WontFix;
            default: return VCContracts.CommentThreadStatus.Unknown;
        }
    }

    private _convertCommonContext(thread: DiscussionCommon.DiscussionThread): VCContracts.CommentThreadContext {
        if (thread.itemPath && thread.itemPath != "") {
            const leftContext: boolean = thread.position && thread.position.positionContext == DiscussionCommon.PositionContext.LeftBuffer;
            const rightContext: boolean = thread.position && thread.position.positionContext == DiscussionCommon.PositionContext.RightBuffer;

            return {
                filePath: thread.itemPath,
                leftFileEnd: leftContext ? {
                    line: thread.position.endLine,
                    offset: thread.position.endColumn
                } : null,
                leftFileStart: leftContext ? {
                    line: thread.position.startLine,
                    offset: thread.position.startColumn
                } : null,
                rightFileEnd: rightContext ? {
                    line: thread.position.endLine,
                    offset: thread.position.endColumn
                } : null,
                rightFileStart: rightContext ? {
                    line: thread.position.startLine,
                    offset: thread.position.startColumn
                } : null
            };
        }

        return null;
    }

    private _convertCommonPRContext(thread: DiscussionCommon.DiscussionThread): VCContracts.GitPullRequestCommentThreadContext {
        if (thread.itemPath && thread.itemPath != "") {

            return {
                changeTrackingId: thread.changeTrackingId,
                iterationContext: ((thread.firstComparingIteration >= 0) && (thread.secondComparingIteration > 0)) ?
                    {
                        firstComparingIteration: thread.firstComparingIteration,
                        secondComparingIteration: thread.secondComparingIteration
                    } : null,
                trackingCriteria: thread.trackingCriteria
            };
        }

        return null;
    }

    private _getClientProperties(thread: DiscussionCommon.DiscussionThread): any {
        const properties: any = {};
        if (thread.supportsMarkdown) {
            properties[SupportsMarkdownPropertyName] = {
                type: 'System.Int32',
                value: 1
            };
        }
        if (thread.uniqueId) {
            properties[UniqueIDPropertyName] = {
                type: 'System.String',
                value: thread.uniqueId
            };
        }

        return properties;
    }

    private _convertCommonThread(thread: DiscussionCommon.DiscussionThread): VCContracts.GitPullRequestCommentThread {
        return {
            comments: this._convertCommonComments(thread.comments),
            isDeleted: thread.isDeleted,
            properties: this._getClientProperties(thread),
            status: this._convertCommonStatus(thread.status),
            threadContext: this._convertCommonContext(thread),
            pullRequestThreadContext: this._convertCommonPRContext(thread)
        } as VCContracts.GitPullRequestCommentThread;
    }

    private _convertCommonThreadForStatusUpdate(thread: DiscussionCommon.DiscussionThread): VCContracts.GitPullRequestCommentThread {
        return {
            status: this._convertCommonStatus(thread.status),
        } as VCContracts.GitPullRequestCommentThread;
    }

    public updateThreadStatusAsync(thread: DiscussionCommon.DiscussionThread): IPromise<DiscussionCommon.DiscussionThread> {
        const deferred = Q.defer<DiscussionCommon.DiscussionThread>();

        const this_ = this;

        this._gitRestClient.updateThread(this._convertCommonThreadForStatusUpdate(thread), this._repositoryId, this._pullRequestId, thread.id, this._projectId)
            .then((prThread: VCContracts.GitPullRequestCommentThread): void => {
                deferred.resolve(this_._convertPRThread(prThread));
            });

        return deferred.promise;
    }
}