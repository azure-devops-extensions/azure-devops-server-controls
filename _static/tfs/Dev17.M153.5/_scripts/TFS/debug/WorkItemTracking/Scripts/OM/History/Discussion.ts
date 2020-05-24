import Context = require("VSS/Context");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import Q = require("q");
import Service = require("VSS/Service");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_Social_Discussion = require("WorkItemTracking/Scripts/Controls/WorkItemForm/TFS.Social.Discussion");
import TFS_Wit_Contracts = require("TFS/WorkItemTracking/Contracts");
import TFS_Wit_WebApi = require("TFS/WorkItemTracking/RestClient");
import Utils_Array = require("VSS/Utils/Array");
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { Actions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { IFieldDataDictionary } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import RichTextPreRenderUtility = require("WorkItemTracking/Scripts/Utils/RichTextPreRenderUtility");

export const DISCUSSION_MAX_PAGE_SIZE: number = 200;

export interface IWorkItemDiscussionComment extends TFS_Social_Discussion.IDiscussionMessage {
    revision: number;
}

export interface IWorkItemDiscussionResult {
    totalCount: number;
    comments: IWorkItemDiscussionComment[];
}

interface IWorkItemDiscussionProvider {
    getDiscussion(startRevision: number, count: number): IPromise<IWorkItemDiscussionResult>;
}

/**
 * Discussion provider for getting work item discussion from the optimized Comments REST API
 */
class WorkItemCommentsApiDiscussionProvider implements IWorkItemDiscussionProvider {
    private _httpClient: TFS_Wit_WebApi.WorkItemTrackingHttpClient;
    private _workItem: WorkItem;
    private _promiseCache: IDictionaryStringTo<IPromise<IWorkItemDiscussionResult>>;

    constructor(workItem: WorkItem) {
        this._workItem = workItem;
        this._promiseCache = {};
    }

    private _ensureInitialized(): void {
        if (!this._httpClient) {
            this._httpClient = Service.getCollectionClient(TFS_Wit_WebApi.WorkItemTrackingHttpClient, Context.getDefaultWebContext());
        }
    }

    private _getSafeHtmlMessage(message: string): string {
        var safeMessage = message ? RichTextPreRenderUtility.normalizeHtmlValue(message) : "";
        return safeMessage;
    }

    private _createWorkItemDiscussionResult(comments: TFS_Wit_Contracts.WorkItemComments): IWorkItemDiscussionResult {
        const discussionResultComments = comments.comments.map((c, index, commentArray) => {
            const revisedBy = c.revisedBy;
            const displayName = revisedBy ? revisedBy.displayName : "";

            const commentResult: IWorkItemDiscussionComment = {
                content: this._getSafeHtmlMessage(c.text),
                revision: c.revision,
                timestamp: c.revisedDate,
                user: {
                    displayName: displayName,
                    identity: revisedBy || {}
                }
            };

            return commentResult;
        });

        const discussionResult: IWorkItemDiscussionResult = {
            comments: discussionResultComments,
            totalCount: comments.fromRevisionCount
        };

        return discussionResult;
    }

    public getDiscussion(startRevision: number, count: number): IPromise<IWorkItemDiscussionResult> {
        this._ensureInitialized();

        var cacheKey = startRevision + "_" + count;
        var cachedPromise = this._promiseCache[cacheKey];
        if (cachedPromise) {
            return this._promiseCache[cacheKey];
        }

        var projectGuid: string = this._workItem.project == null ? null : this._workItem.project.guid;
        cachedPromise = this._httpClient.getComments(this._workItem.id, startRevision, count, TFS_Wit_Contracts.CommentSortOrder.Desc, projectGuid)
            .then((comments) => {
                delete this._promiseCache[cacheKey];

                var discussionResult = this._createWorkItemDiscussionResult(comments);
                return discussionResult;
            });
        this._promiseCache[cacheKey] = cachedPromise;
        return cachedPromise;
    }
}

/**
 * Interface defining an iterator for getting sets of work item discussions.
 */
export interface IWorkItemDiscussionIterator {
    /**
     * Resets the iterator to the beginning
     */
    reset();

    /**
     * Retrieves the number of items in the collection.
     */
    count(): IPromise<number>;

    /**
     * Retrieves the next 'count' items from the collection.  Will return truncated results if count >
     * the number of items remaining.
     * @param count
     */
    next(count: number): IPromise<IWorkItemDiscussionResult>;
}


/**
 * Class to expose an iterator for getting sets of work item discussions
 */
class WorkItemDiscussionIterator implements IWorkItemDiscussionIterator {
    private _discussion: WorkItemDiscussion;
    private _currentRevision: number;
    private _startRevision: number;

    constructor(discussion: WorkItemDiscussion, startRevision: number) {
        Diag.Debug.assertIsNotNull(discussion, "discussion");

        this._startRevision = startRevision;
        this._discussion = discussion;
        this.reset();
    }

    public reset() {
        this._currentRevision = this._startRevision;
    }

    public count(): IPromise<number> {
        return this._discussion._getDiscussions(this._startRevision, 1).then(
            (discussions: IWorkItemDiscussionResult) => {
                return discussions.totalCount;
            });
    }

    public next(count: number): IPromise<IWorkItemDiscussionResult> {
        return this._discussion._getDiscussions(this._currentRevision, count).then(
            (discussion: IWorkItemDiscussionResult) => {
                if (discussion.comments.length > 0) {
                    this._currentRevision = discussion.comments[discussion.comments.length - 1].revision - 1;
                }
                return discussion;
            });
    }
}

/**
 * Provides progressively disclosed work item discussions
 */
class WorkItemDiscussion {

    private _provider: IWorkItemDiscussionProvider;
    private _comments: IWorkItemDiscussionComment[];
    private _totalCount: number;
    private _workItem: WorkItem;
    private _initialized: boolean;
    private static _listenersInitialized: boolean;
    public static DISCUSSION_KEY = "wit-discussion";

    constructor(workItem: WorkItem, provider: IWorkItemDiscussionProvider) {
        this._provider = provider;
        this._comments = [];
        this._workItem = workItem;
        this._totalCount = 0;
        this._initialized = workItem.isNew();

        if (!WorkItemDiscussion._listenersInitialized) {
            WorkItemDiscussion._listenersInitialized = true;
            Events_Services.getService().attachEvent(Actions.DISCUSSION_ADDED, WorkItemDiscussion.onDiscussionAdded);
            Events_Services.getService().attachEvent(Actions.RESET_DISCUSSION, WorkItemDiscussion.onResetDiscussion);
        }
    }

    public static getDiscussionFromWorkItem(workItem: WorkItem): WorkItemDiscussion {
        return <WorkItemDiscussion>workItem.relatedData[WorkItemDiscussion.DISCUSSION_KEY];
    }

    public static setDiscussionForWorkItem(workItem: WorkItem, discussion: WorkItemDiscussion) {
        workItem.relatedData[WorkItemDiscussion.DISCUSSION_KEY] = discussion;
    }

    public getIterator(): IWorkItemDiscussionIterator {
        return new WorkItemDiscussionIterator(this, this._workItem.revision);
    }

    /**
     * Retrieves a set of comments from a specified revision. Must start from 0 and progressively ask for the 'next' set of comments
     * Should only be called by the iterator
     * @param fromRevision
     * @param count
     */
    public _getDiscussions(fromRevision: number, count: number): IPromise<IWorkItemDiscussionResult> {

        Diag.Debug.assert(fromRevision >= 0, "invalid start revision for comments, must be >= 0");
        Diag.Debug.assert(count > 0, "count should be > 0");
        Diag.Debug.assert(count <= DISCUSSION_MAX_PAGE_SIZE, "count must be less than or equal to 200 items");

        if (fromRevision === 0 && this._initialized) {
            return Q.resolve<IWorkItemDiscussionResult>({
                comments: [],
                totalCount: this._totalCount
            });
        }

        // See if everything requested is cached.

        var startIndex = this._findInsertionIndex(this._comments, fromRevision);

        if (this._initialized
            && (startIndex + count <= this._comments.length
                || this._totalCount === this._comments.length)) {

            // Already have everything we need in the cache, just return it.
            var cachedComments = this._comments.slice(startIndex, startIndex + count);
            return Q({ totalCount: this._totalCount, comments: cachedComments });
        }

        var lastEntry: IWorkItemDiscussionComment = this._comments.length > 0 ? this._comments[this._comments.length - 1] : null;
        var rev = lastEntry ? lastEntry.revision - 1 : fromRevision;

        // Always get 200 items at a time
        return this._provider.getDiscussion(rev, DISCUSSION_MAX_PAGE_SIZE).then(
            (discussion: IWorkItemDiscussionResult) => {
                // Cache the initial total-count since it can change over time.  
                if (!this._initialized) {
                    this._initialized = true;
                    this._totalCount += discussion.totalCount;
                }

                startIndex = this._findInsertionIndex(this._comments, rev);

                // By the time this callback is hit it's possible that the cache has already been updated.
                // Find the new insertion point and only add the items that do not already exist in the array.
                var countOverlapping = this._comments.length - startIndex;

                var commentsToAdd = discussion.comments.slice(countOverlapping);
                Utils_Array.addRange(this._comments, commentsToAdd);

                // Find the start index in the array from the client specified location.
                startIndex = this._findInsertionIndex(this._comments, fromRevision);
                return { totalCount: this._totalCount, comments: this._comments.slice(startIndex, startIndex + count) };
            });
    }

    /**
     * Adds a comment to the beginning of the list.
     * @param comment
     */
    public addComment(comment: IWorkItemDiscussionComment) {
        this._comments.splice(0, 0, comment);
        this._totalCount++;
    }

    public static convertRevisionToDiscussionComment(workItem: WorkItem, historyText: string, revision: IFieldDataDictionary): IWorkItemDiscussionComment {
        const changedDate = revision["" + WITConstants.CoreField.ChangedDate] || new Date();
        const changedBy = revision["" + WITConstants.CoreField.ChangedBy];
        const changedByIdentity = workItem.getIdentity(changedBy);

        const comment: IWorkItemDiscussionComment = {
            revision: revision[WITConstants.CoreField.Rev],
            user: {
                displayName: changedByIdentity.displayName,
                identity: changedByIdentity,
            },
            timestamp: changedDate,
            content: RichTextPreRenderUtility.normalizeHtmlValue(historyText)
        };

        return comment;
    }

    private _findInsertionIndex(comments: IWorkItemDiscussionComment[], revision: number) {
        if (!comments) {
            return 0;
        }

        var index;

        for (index = 0; index < comments.length; index++) {
            if (comments[index].revision <= revision) {
                break;
            }
        }

        return index;
    }

    private static onDiscussionAdded(workItem: WorkItem, args: any) {
        let discussion = WorkItemDiscussion.getDiscussionFromWorkItem(workItem);

        if (discussion) {
            let message: IWorkItemDiscussionComment = WorkItemDiscussion.convertRevisionToDiscussionComment(workItem, args.historyText, args.revision);
            discussion.addComment(message);
        }
    }

    private static onResetDiscussion(workItem: WorkItem, args: any) {
        WorkItemDiscussion.setDiscussionForWorkItem(workItem, null);
    }
}

export class WorkItemDiscussionFactory {

    public static getDiscussionIterator(workItem: WorkItem): IWorkItemDiscussionIterator {

        let discussion = WorkItemDiscussion.getDiscussionFromWorkItem(workItem);

        if (!discussion) {
            var provider = new WorkItemCommentsApiDiscussionProvider(workItem);
            discussion = new WorkItemDiscussion(workItem, provider);
            WorkItemDiscussion.setDiscussionForWorkItem(workItem, discussion);
        }

        return discussion.getIterator();
    }
}

