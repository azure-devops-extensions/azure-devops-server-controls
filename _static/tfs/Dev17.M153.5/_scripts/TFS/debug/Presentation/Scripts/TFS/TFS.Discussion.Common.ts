import VSS = require("VSS/VSS");
import DiscussionConstants = require("Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants");
import VSS_WebApi = require("VSS/WebApi/Contracts");
import { CommentTrackingCriteria } from "TFS/VersionControl/Contracts";

export module PositionContext {
    export var LeftBuffer = "LeftBuffer";
    export var RightBuffer = "RightBuffer";
    export var InLineBuffer = "InLineBuffer";
}

export class DiscussionPosition {
    public startLine: number;
    public endLine: number;
    public startColumn: number;
    public endColumn: number;
    public positionContext: string;
}

export class DiscussionPositionContext {
    position: DiscussionPosition;
    filePath: string;
    trackingCriteria: CommentTrackingCriteria;
}

export class DiscussionComment implements DiscussionConstants.DiscussionComment {
    public id: number;
    public parentId: number;
    public threadId: number;
    public author: VSS_WebApi.IdentityRef;
    public content: string;
    public publishedDate: Date;
    public isDeleted: boolean;
    public lastUpdatedDate: Date;
    public lastContentUpdatedDate: Date;
    public canDelete: boolean;
    public commentType: DiscussionConstants.CommentType;
    public usersLiked: VSS_WebApi.IdentityRef[];

    public isCancelled: boolean;
    public isDirty: boolean;
    public isEditable: boolean;
    public isActive: boolean;
    public newContent: string;
    public pendingAction: string;
    public originalId: number;
    public originalThreadId: number;
    public _links: any;
    
    public isNew: boolean;
    public isComitting: boolean;
    public cameFromSignalR: boolean;

    public pendingAttachments: string[];
    public hasUnseenContent: boolean; // specifies this comment as having content unseen by the current user
}

export class DiscussionCommentUtils {
    public static hasNewContent(comment: DiscussionComment): boolean {
        return comment && comment.isDirty && !!comment.newContent && $.trim(comment.newContent).length !== 0;
    }
}

export class DiscussionThread {
    public id: number;
    public artifactUri: string;
    public publishedDate: Date;
    public lastUpdatedDate: Date;
    public createdDate: Date;
    public comments: DiscussionComment[];
    public properties: any;
    public workItemId: number;
    public status: DiscussionConstants.DiscussionStatus;
    public commentsCount: number;

    public itemPath: string;
    public position: DiscussionPosition;
    public originalPosition: DiscussionPosition;
    public originalId: number;
    public originalItemPath: string;
    public _links: any;
    public isDeleted: boolean;

    public changeTrackingId: number;
    public firstComparingIteration: number;
    public secondComparingIteration: number;
    public trackingCriteria: CommentTrackingCriteria;

    public supportsMarkdown: boolean;
    public contextCache: { [key: string]: DiscussionPositionContext };

    public hasUnseenContent: boolean; // specifies this thread as having content unseen by the current user
    public isCollapsed: boolean; // whether the thread should show up as collapsed

    // guid identifier used to resolve ambiguous situations where the server has a positive id and the client still has the negative id
    public uniqueId: string;

    // Does not exist on server side DiscussionThread, but used when mapping GitPullRequestCommentThread
    public identities: { [key: string]: VSS_WebApi.IdentityRef };
}

export class DiscussionThreadUtils {
    /**
     * Get the bast iteration for navigation. If base in not applicable, will return null
     * so the current base gets cleared on navigate.
     */
    public static getBaseIterationForNav(thread: DiscussionThread): number {
        return (thread.firstComparingIteration && thread.firstComparingIteration !== thread.secondComparingIteration)
            ? thread.firstComparingIteration
            : null;
    }

    /**
     * Using the buffer side and thread position, determine which update the thread was posted on.
     */
    public static getThreadUpdateNumber(thread: DiscussionThread): number {
        if (!thread || !thread.secondComparingIteration || !thread.firstComparingIteration || thread.isDeleted) {
            return -1;
        }

        // file-level comments will be labeled with the current latest update as of commenting
        if (!thread.position) {
            return thread.secondComparingIteration;
        }

        const threadOnRight: boolean = thread.position.positionContext === PositionContext.InLineBuffer
            || thread.position.positionContext === PositionContext.RightBuffer;
        
        return threadOnRight ? thread.secondComparingIteration : thread.firstComparingIteration;
    }

    /**
     * Given a thread with its position/tracking caches, make sure the position and tracking criteria match with
     * the requested iteration context
     */
    public static updateThreadPositionInContext(thread: DiscussionThread, iteration: number, base: number): void {
        const invalidInput: boolean = !thread || iteration < 0 || base < 0;
        const threadIsSystem: boolean = !thread.itemPath || !thread.position;

        if (invalidInput || threadIsSystem) {
            return;
        }

        const cacheKey: string = DiscussionThreadUtils.getCacheKeyWithIterationContext(iteration, base);
        const originalCacheKey: string = DiscussionThreadUtils.getCacheKeyWithIterationContext(thread.secondComparingIteration, thread.firstComparingIteration);

        const cacheExists: boolean = Boolean(thread.contextCache) && Boolean(thread.contextCache[cacheKey]);

        if (!cacheExists) {
            return;
        }

        const originalContext: DiscussionPositionContext = thread.contextCache[originalCacheKey];
        const requestedContext: DiscussionPositionContext = thread.contextCache[cacheKey];

        // if we don't have data for that context or the thread original, don't update anything
        if (!requestedContext && !originalContext) {
            return;
        }

        // if the requested position wasn't found as cached, assume the thread is untracked at that context
        // and fill in the original position/context
        thread.position = (requestedContext && requestedContext.position) || (originalContext && originalContext.position);
        thread.itemPath = (requestedContext && requestedContext.filePath) || (originalContext && originalContext.filePath);
        thread.trackingCriteria = (requestedContext && requestedContext.trackingCriteria) || null;
    }

    /**
     * Given a thread, ensure the position and tracking caches are properly populated from the available
     * position and comparing iteration data. If the previous thread is provided, transfer the old
     * caches before populating.
     */
    public static populateTrackingCaches(thread: DiscussionThread, prevThread?: DiscussionThread): void {
        if (!thread.position || !thread.secondComparingIteration || !thread.firstComparingIteration) {
            return;
        }

        // copy existing cache over if needed
        thread.contextCache = (prevThread && prevThread.contextCache) || thread.contextCache || {};

        // there are two cases of potential position/context cache population
        const originalPosition: DiscussionPosition = thread.originalPosition || (!thread.trackingCriteria && thread.position) || null;
        const originalFilePath: string = (thread.trackingCriteria && thread.trackingCriteria.origFilePath) || thread.itemPath;
        const trackedPosition: DiscussionPosition = (thread.trackingCriteria && thread.position) || null;
        const trackedFilePath: string = thread.itemPath;

        // we have the original thread position, add an entry for that
        if (originalPosition) {
            const iterationId: number = thread.secondComparingIteration;
            const baseId: number = thread.firstComparingIteration;
            const cacheKey: string = DiscussionThreadUtils.getCacheKeyWithIterationContext(iterationId, baseId);

            thread.contextCache[cacheKey] = thread.contextCache[cacheKey] || {
                position: originalPosition,
                filePath: originalFilePath,
                trackingCriteria: null, // no tracking criteria for a thread at its original position
            };
        }

        // we have the tracked thread position, add an entry for that
        if (trackedPosition) {
            const iterationId: number = thread.trackingCriteria.secondComparingIteration;
            const baseId: number = thread.trackingCriteria.firstComparingIteration;
            const cacheKey: string = DiscussionThreadUtils.getCacheKeyWithIterationContext(iterationId, baseId);

            thread.contextCache[cacheKey] = thread.contextCache[cacheKey] || {
                position: trackedPosition,
                filePath: trackedFilePath,
                trackingCriteria: thread.trackingCriteria,
            };
        }
    }

    /**
     * Group leader is the thread at the top of the given thread group. Since threads are sorted by published/created date,
     * the newest thread on a line is the leader. Leaders are responsible for displaying group controls (like expand buttons)
     */
    public static isThreadGroupLeader(thread: DiscussionThread, threadGroup: DiscussionThread[]): boolean {
        if (!thread) {
            return false;
        }

        if (!threadGroup || !threadGroup.length) {
            return true;
        }

        return !threadGroup.some(t => (t.publishedDate || t.createdDate) > (thread.publishedDate || thread.createdDate));
    }

    /**
     * Group key uniquely identifies a group of threads based on file location.
     */
    public static getThreadGroupKey(thread: DiscussionThread): string {
        if (!thread || !thread.itemPath || !thread.position || !thread.position.endLine) {
            return null;
        }

        let threadGroupKey: string = (thread.position.positionContext === PositionContext.InLineBuffer || thread.position.positionContext === PositionContext.RightBuffer)
            ? PositionContext.RightBuffer
            : PositionContext.LeftBuffer;
        threadGroupKey += "|" + thread.itemPath + "|" + thread.position.endLine;

        return threadGroupKey;
    }

    public static getThreadPositionsAreEqual(thread1: DiscussionThread, thread2: DiscussionThread): boolean {
        if ((!thread1 || !thread1.position) && (!thread2 || !thread2.position)) {
            return true;
        }

        return thread1.position.positionContext === thread2.position.positionContext
            && thread1.position.startLine === thread2.position.startLine
            && thread1.position.startColumn === thread2.position.startColumn
            && thread1.position.endLine === thread2.position.endLine
            && thread1.position.endColumn === thread2.position.endColumn;
    }

    public static getCacheKeyWithIterationContext(iterationId: number, baseId: number): string {
        baseId = (iterationId === baseId) ? 0 : baseId;
        return `${iterationId}|${baseId}`;
    }

    public static sortThreadsByDate(a: DiscussionThread, b: DiscussionThread): number {
        return (b.publishedDate || b.createdDate).getTime() - (a.publishedDate || a.createdDate).getTime();
    }

    public static sortThreadsById(a: DiscussionThread, b: DiscussionThread): number {
        return (a.id - b.id);
    }

    /**
     * Returns a new copy of the provided thread with EUII (end-user identifying information) stripped out.
     * Intended to allow for safely loging data without including EUII.
     */
    public static copyWithEUIIRedacted(thread: DiscussionThread): DiscussionThread {
        return {
            id: thread.id,
            isDeleted: thread.isDeleted,
            isCollapsed: thread.isCollapsed,
            position: thread.position,
            changeTrackingId: thread.changeTrackingId,
            comments: thread.comments.map(c => ({ 
                id: c.id
            }))
        } as DiscussionThread;
    }
}

export interface DiscussionAttachment {
    fileName: string;
    url: string;
    uploadFinished: boolean;
    originalUrl?: string;
    file?: File;
    uploadPromise?: IPromise<string>;
    error?: string;
}

export interface DiscussionThreadsUpdateEvent {
    currentThreads?: DiscussionThread[];
    newThreads?: DiscussionThread[];
    deletedThreads?: DiscussionThread[];
    updateThreads?: DiscussionThread[];
    newComments?: DiscussionComment[];
    deletedComments?: DiscussionComment[];
    updatedComments?: DiscussionComment[];
    savedComments?: DiscussionComment[];
    savedThreads?: DiscussionThread[];
    threadSelected?: DiscussionThread;
    navigateToSelectedThread?: boolean;
    state?: any;
    createdByUser?: boolean;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Discussion.Common", exports);
