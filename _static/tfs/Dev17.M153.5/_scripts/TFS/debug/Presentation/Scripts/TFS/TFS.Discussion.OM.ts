/// <reference types="jquery" />

import VCContracts = require("TFS/VersionControl/Contracts");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionCommonUI = require("Presentation/Scripts/TFS/TFS.Discussion.Common.UI");
import DiscussionConstants = require("Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants");
import VSS_WebApi = require("VSS/WebApi/Contracts");
import Menus = require("VSS/Controls/Menus");
import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import Events_Document = require("VSS/Events/Document");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";

var queueRequest = VSS.queueRequest;

export const DISCUSSION_MANAGER_AREA = "DiscussionManager";

export interface DiscussionViewOptions {
    hideComments?: boolean;
    hideNonActiveComments?: boolean;
}

export interface IDiscussionAdapter {
    getDiscussionThreads(): DiscussionCommon.DiscussionThread[];
    getIterationId(): number;
    getBaseIterationId(): number;
    getChanges(): VCContracts.GitPullRequestIterationChanges;
    createThread(thread: DiscussionCommon.DiscussionThread): void;
    newCommentId(): number;
    newThreadId(): number;
    saveComment(thread: DiscussionCommon.DiscussionThread, comment: DiscussionCommon.DiscussionComment): void;
    deleteComment(discussionId: number, commentId: number): void;
    addUpdateListener(callback: (event: DiscussionCommon.DiscussionThreadsUpdateEvent) => void): void;
    isAddCommentEnabled(): boolean;
    isDirty(): boolean;
    dispose(): void;
}

export class DiscussionManager {

    private static EVENT_NAME_THREADS_UPDATED = "threads-updated";
    private static EVENT_NAME_THREAD_STATUS_UPDATED = "thread-status-updated";
    private static EVENT_NAME_OPTIONS_UPDATED = "discussion-options-updated";

    private static _newDiscussionThreadId = -1;
    private static _newCommentId = -1;

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _artifactUri: string;
    private _threads: DiscussionCommon.DiscussionThread[];
    private _viewOptions: DiscussionViewOptions;
    private _selectedThreadId: number;
    private _saveActive: boolean;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;
    protected _discussionAdapter: IDiscussionAdapter;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, discussionAdapter: IDiscussionAdapter, artifactUri?: string, viewOptions?: DiscussionViewOptions, options?: any) {
        this._tfsContext = tfsContext;
        this._artifactUri = artifactUri;
        this._viewOptions = viewOptions || {};
        this._saveActive = false;
        this._discussionAdapter = discussionAdapter;

        //allow subclasses to initialize their private fields before everything gets underway
        //workaround to the fact that typescript no longer allows 'this' to be called in a subclass constructor before super
        this.init(options);

        Menus.menuManager.attachExecuteCommand(this._executeCommand);

        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("DiscussionManager", this);
    }

    private _executeCommand(sender: any, args: any) {
        let commandArgument: any;
        let discussionManager: DiscussionManager;

        switch (args.get_commandName()) {
            case "add-file-discussion":
                commandArgument = args.get_commandArgument();
                discussionManager = commandArgument.discussionManager;
                discussionManager.createNewDiscussionThread(commandArgument.itemPath);
                return false;
        }
    }

    public dispose(): void {
        Menus.menuManager.detachExecuteCommand(this._executeCommand);

        if (this._discussionAdapter) {
            this._discussionAdapter.dispose();
            this._discussionAdapter = null;
        }

        if (this._documentsEntryForDirtyCheck) {
            Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);
            this._documentsEntryForDirtyCheck = null;
        }
    }

    protected init(options?: any): void {

    }

    public getTfsContext() {
        return this._tfsContext;
    }

    public isDirty(): boolean {
        return this._discussionAdapter && this._discussionAdapter.isDirty();
    }

    public isAddCommentEnabled(): boolean {
        return this._discussionAdapter && this._discussionAdapter.isAddCommentEnabled();
    }

    public getArtifactUri() {
        return this._artifactUri;
    }

    public _setArtifactUri(artifactUri: string) {
        this._artifactUri = artifactUri;
    }

    public beginLoadDiscussionThreads(callback?: (threads: DiscussionCommon.DiscussionThread[]) => void) {
        if ($.isFunction(callback)) {
            callback.call(this, this.getCurrentThreads());
        }
    }

    public getAllThreads(): DiscussionCommon.DiscussionThread[] {
        return this._discussionAdapter ? this._discussionAdapter.getDiscussionThreads() : [];
    }

    public getCurrentThreads() {
        if (this._viewOptions.hideComments) {
            return [];
        }
        else if (this._viewOptions.hideNonActiveComments) {
            return this.getAllThreads().filter(t =>
                t.status === DiscussionConstants.DiscussionStatus.Active || t.status === DiscussionConstants.DiscussionStatus.Pending);
        }
        else {
            return this.getAllThreads();
        }
    }

    public getViewOptions() {
        return <DiscussionViewOptions>$.extend({}, this._viewOptions);
    }

    public getExtraProperties(newThread: DiscussionCommon.DiscussionThread): any {
        return null;
    }

    public populateExtraMembers(newThread: DiscussionCommon.DiscussionThread) {
    }

    public setViewOptions(options: DiscussionViewOptions) {

        var fireThreadUpdateEvent = false,
            optionChanged = false;

        if (!options) {
            options = <DiscussionViewOptions>{};
        }

        //hideComments always override hideNonActiveComments
        if ((this._viewOptions.hideComments === true) !== (options.hideComments === true)
            || (this._viewOptions.hideNonActiveComments === true) !== (options.hideNonActiveComments === true)) {

            // hideComments or hideNonActiveComments mode has changed
            fireThreadUpdateEvent = true;
            optionChanged = true;

            // if any comments are being hidden, discard any new, empty comments
            if (options.hideComments === true || options.hideNonActiveComments === true) {
                if (this._threads && this._threads.length > 0) {
                    var deletedThreadIndexes: number[] = [];
                    $.each(this._threads, (i: number, thread: DiscussionCommon.DiscussionThread) => {
                        if (thread.comments && thread.comments.length > 0) {
                            var newestComment: DiscussionCommon.DiscussionComment = thread.comments[thread.comments.length - 1];
                            if (newestComment.id < 1 && !newestComment.newContent) {
                                thread.comments.splice(thread.comments.length - 1, 1);
                                if (thread.comments.length === 0) {
                                    deletedThreadIndexes.push(i);
                                }
                            }
                        }
                    });
                    while (deletedThreadIndexes.length > 0) {
                        var index: number = deletedThreadIndexes.pop();
                        this._threads.splice(index, 1);
                    }
                }
            }
        }

        this._viewOptions = options;

        if (fireThreadUpdateEvent) {
            this.fireDiscussionThreadsUpdatedEvent(<DiscussionCommon.DiscussionThreadsUpdateEvent>{
                currentThreads: this.getCurrentThreads(),
            });
        }

        if (optionChanged) {
            this.fireOptionsUpdatedEvent(options);
        }
    }

    public toggleHideComments() {
        var options = this.getViewOptions();
        options.hideComments = !options.hideComments;
        this.setViewOptions(options);
    }

    public getCurrentThreadsForItemPath(itemPath: string) {
        return this._filterDiscussionThreads(this.getCurrentThreads(), itemPath);
    }

    public filterEventData(eventData: DiscussionCommon.DiscussionThreadsUpdateEvent, itemPath: string) {
        var filteredEventData: DiscussionCommon.DiscussionThreadsUpdateEvent,
            discussionThreadsById: any;

        filteredEventData = {
            currentThreads: this._filterDiscussionThreads(eventData.currentThreads, itemPath),
            newThreads: this._filterDiscussionThreads(eventData.newThreads, itemPath),
            deletedThreads: this._filterDiscussionThreads(eventData.deletedThreads, itemPath),
            savedThreads: this._filterDiscussionThreads(eventData.savedThreads, itemPath),
            state: eventData.state
        };

        if (eventData.newComments) {
            filteredEventData.newComments = eventData.newComments;
        }
        if (eventData.deletedComments) {
            filteredEventData.deletedComments = eventData.deletedComments;
        }
        if (eventData.updatedComments) {
            filteredEventData.updatedComments = eventData.updatedComments;
        }
        if (eventData.savedComments) {
            filteredEventData.savedComments = eventData.savedComments;
        }

        filteredEventData.createdByUser = eventData.createdByUser;

        if (eventData.threadSelected) {
            if ((itemPath && eventData.threadSelected.itemPath === itemPath) || (!itemPath && !eventData.threadSelected.itemPath)) {
                filteredEventData.threadSelected = eventData.threadSelected;
                if (eventData.navigateToSelectedThread) {
                    filteredEventData.navigateToSelectedThread = true;
                }
            }
        }

        return filteredEventData;
    }

    private _filterDiscussionThreads(threads: DiscussionCommon.DiscussionThread[], itemPath: string) {
        if (threads) {
            if (!itemPath) {
                return $.grep(threads, (thread: DiscussionCommon.DiscussionThread) => { return !thread.itemPath; });
            }
            else {
                return $.grep(threads, (thread: DiscussionCommon.DiscussionThread) => { return thread.itemPath === itemPath });
            }
        }
        else {
            return null;
        }
    }

    public createNewDiscussionThread(itemPath?: string, position?: DiscussionCommon.DiscussionPosition, callback?: (newThread: DiscussionCommon.DiscussionThread) => void) {
        var threads = this.getAllThreads();
        var existingThread = $.grep(threads, (thread: DiscussionCommon.DiscussionThread, index) => {
            return thread.id < 1 &&
                thread.artifactUri === this._artifactUri &&
                thread.itemPath === itemPath &&
                ((!thread.position && !position) || (thread.position && position &&
                    thread.position.startLine === position.startLine &&
                    thread.position.endLine === position.endLine &&
                    thread.position.startColumn === position.startColumn &&
                    thread.position.endColumn === position.endColumn &&
                    thread.position.positionContext === position.positionContext));
        })[0];

        if (existingThread) {

            this.fireDiscussionThreadsUpdatedEvent(<DiscussionCommon.DiscussionThreadsUpdateEvent>{
                threadSelected: existingThread
            });
        }
        else {
            var thread: DiscussionCommon.DiscussionThread,
                newComment: DiscussionCommon.DiscussionComment;

            let newThreadId = this._discussionAdapter.newThreadId();

            thread = <DiscussionCommon.DiscussionThread>{
                id: newThreadId,
                artifactUri: this._artifactUri,
                status: DiscussionConstants.DiscussionStatus.Active,
                itemPath: itemPath,
                position: position,
                comments: [],
                supportsMarkdown: true,
                uniqueId: GUIDUtils.newGuid()
            };

            thread.originalId = thread.id;

            newComment = this._createNewComment(thread, 0);

            if ($.isFunction(callback)) {
                callback.call(this, thread);
            }

            //hack to get in the code tracking properties
            //the change tracking id should be computed on the server and the iteration id should come from a store
            this.populateExtraMembers(thread);

            this._discussionAdapter.createThread(thread);

            this.fireDiscussionThreadsUpdatedEvent(<DiscussionCommon.DiscussionThreadsUpdateEvent>{
                newThreads: [thread],
                newComments: [newComment],
                createdByUser: true
            });
        }
    }

    private _createNewComment(thread: DiscussionCommon.DiscussionThread, parentCommentId?: number) {

        let newCommentId = this._discussionAdapter.newCommentId();

        // Update temporary commentId
        var comment = <DiscussionCommon.DiscussionComment>{
            id: newCommentId,
            parentId: parentCommentId,
            threadId: thread.id,
            author: <VSS_WebApi.IdentityRef>{
                id: this._tfsContext.currentIdentity.id,
                displayName: this._tfsContext.currentIdentity.displayName
            },
            commentType: DiscussionConstants.CommentType.Text,
            isDirty: true,
            isEditable: true
        };

        comment.originalId = comment.id;
        comment.originalThreadId = thread.id;

        if (!thread.comments) {
            thread.comments = [];
        }
        thread.comments.push(comment);

        return comment;
    }

    public findThread(discussionId: number): DiscussionCommon.DiscussionThread {
        var threads = this.getAllThreads();
        return $.grep(threads, (thread: DiscussionCommon.DiscussionThread) => {
            return thread.id === discussionId
        })[0] || null;
    }

    public findCommentById(threadId: number, commentId: number): DiscussionCommon.DiscussionComment {
        var thread = this.findThread(threadId),
            foundComment: DiscussionCommon.DiscussionComment = null;

        if (thread) {
            foundComment = $.grep(thread.comments || [], (comment: DiscussionCommon.DiscussionComment, index) => {
                return comment.id === commentId;
            })[0];
        }

        return foundComment;
    }

    public findComment(discussionComment: DiscussionCommon.DiscussionComment): DiscussionCommon.DiscussionComment {
        var thread = this.findThread(discussionComment.threadId);
        if (thread) {
            return $.grep(thread.comments || [], (comment: DiscussionCommon.DiscussionComment, index) => {
                return comment.id === discussionComment.id;
            })[0];
        }
        else {
            return null;
        }
    }

    public saveComment(discussionComment: DiscussionCommon.DiscussionComment, callback?: (newComment: DiscussionCommon.DiscussionComment) => void) {
        let commentClone = $.extend({}, discussionComment) as DiscussionCommon.DiscussionComment;
        let thread = this.findThread(discussionComment.threadId);
        this._discussionAdapter.saveComment(thread, commentClone);
        return;
    }

    public deleteComment(discussionId: number, commentId: number, callback?: () => void) {
        this._discussionAdapter.deleteComment(discussionId, commentId);
    }

    public _setThreadsFromServer(threads: DiscussionCommon.DiscussionThread[]) {
        this._threads = threads;
    }

    public refresh(callback?: (threads: DiscussionCommon.DiscussionThread[]) => void) {
        this["_initialized" + this.getArtifactUri()] = null;
        this.beginLoadDiscussionThreads(callback);
    }

    public addDiscussionThreadsUpdatedListener(listener: (sender: DiscussionManager, eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) => void) {
        Events_Services.getService().attachEvent(DiscussionManager.EVENT_NAME_THREADS_UPDATED, listener);
    }

    public removeDiscussionThreadsUpdatedListener(listener: (sender: DiscussionManager, eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) => void) {
        Events_Services.getService().detachEvent(DiscussionManager.EVENT_NAME_THREADS_UPDATED, listener);
    }

    public fireDiscussionThreadsUpdatedEvent(eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) {
        Events_Services.getService().fire(DiscussionManager.EVENT_NAME_THREADS_UPDATED, this, eventData);
    }

    public addDiscussionThreadStatusUpdatedListener(listener: (sender: DiscussionManager, eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) => void) {
        Events_Services.getService().attachEvent(DiscussionManager.EVENT_NAME_THREAD_STATUS_UPDATED, listener);
    }

    public removeDiscussionThreadStatusUpdatedListener(listener: (sender: DiscussionManager, eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) => void) {
        Events_Services.getService().detachEvent(DiscussionManager.EVENT_NAME_THREAD_STATUS_UPDATED, listener);
    }

    private fireDiscussionThreadStatusUpdatedEvent(eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) {
        Events_Services.getService().fire(DiscussionManager.EVENT_NAME_THREAD_STATUS_UPDATED, this, eventData);
    }

    public addOptionsUpdatedListener(listener: (sender: DiscussionManager, eventData: DiscussionViewOptions) => void) {
        Events_Services.getService().attachEvent(DiscussionManager.EVENT_NAME_OPTIONS_UPDATED, listener);
    }

    public removeOptionsUpdatedListener(listener: (sender: DiscussionManager, eventData: DiscussionViewOptions) => void) {
        Events_Services.getService().detachEvent(DiscussionManager.EVENT_NAME_OPTIONS_UPDATED, listener);
    }

    private fireOptionsUpdatedEvent(eventData: DiscussionViewOptions) {
        Events_Services.getService().fire(DiscussionManager.EVENT_NAME_OPTIONS_UPDATED, this, eventData);
    }

    public supportsWorkItemIntegration(): boolean {
        return false;
    }
}


export class DiscussionThreadControlManager
    extends DiscussionCommonUI.DiscussionThreadControlManagerBase {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _discussionManager: DiscussionManager;
    private _discussionEventHandler: any;
    private _supportCommentStatus: boolean = false;
    
    constructor(tfsContext: TFS_Host_TfsContext.TfsContext) {
        super();
        this._tfsContext = tfsContext;
    }

    public dispose() {
        if (this._discussionManager) {
            this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionEventHandler);
            this._discussionManager = null;
        }
    }

    public setDiscussionManager(discussionManager: DiscussionManager) {

        if (discussionManager !== this._discussionManager) {

            if (this._discussionManager) {
                this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionEventHandler);
            }

            this._discussionManager = discussionManager;

            if (discussionManager) {
                discussionManager.addDiscussionThreadsUpdatedListener(this._discussionEventHandler);
            }
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Discussion.OM", exports);
