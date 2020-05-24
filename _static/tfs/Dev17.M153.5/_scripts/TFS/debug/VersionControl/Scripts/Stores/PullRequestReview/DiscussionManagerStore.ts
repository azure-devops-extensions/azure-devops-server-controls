import { RemoteStore } from "VSS/Flux/Store";

// actions
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";

// stores
import { IDiscussionsStore, DiscussionThreadIterationContext } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { IDiscussionPermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/DiscussionPermissionsStore";
import { ICodeExplorerStore } from "VersionControl/Scripts/Stores/PullRequestReview/ICodeExplorerStore";

// contracts
import { PullRequestDiscussionManager } from "VersionControl/Scripts/TFS.VersionControl.DiscussionManager";
import { GitPullRequest, GitPullRequestIterationChanges } from "TFS/VersionControl/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { DiscussionThread, DiscussionComment, DiscussionThreadsUpdateEvent } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { PullRequestActivityOrder } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { IDiscussionAdapter } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import { IDiscussionManagerStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionManagerStore";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";

export class DiscussionManagerStore extends RemoteStore implements IDiscussionManagerStore {
    private _tfsContext: TfsContext;
    private _pullRequest: GitPullRequest;
    private _discussionManager: PullRequestDiscussionManager;
    private _initializeAdapterFunc: () => DiscussionAdapter;

    constructor(initializeAdapterFunc: () => DiscussionAdapter) {
        super();

        this._tfsContext = null;
        this._pullRequest = null;
        this._discussionManager = null;
        this._initializeAdapterFunc = initializeAdapterFunc;
    }

    public onContextUpdated = (payload: Actions.IContextUpdatedPayload): void => {
        this._tfsContext = payload.tfsContext;
        this.emitChanged();
    }

    public onPullRequestUpdated = (payload: Actions.IPullRequestUpdatedPayload): void => {
        if (null == payload.pullRequest) {
            return;
        }

        this._pullRequest = payload.pullRequest;

        this.emitChanged();
    }

    public onIterationSelected = (payload: Actions.IIterationSelectedPayload): void => {
        const discussionManager = this.getDiscussionManager();
        if (discussionManager) {
            discussionManager.updateIteration();
        }
    }

    public getDiscussionManager(): PullRequestDiscussionManager {
        if (!this._discussionManager && this._tfsContext && this._pullRequest) {

            const projectId = this._pullRequest.repository.project.id;
            this._discussionManager = new PullRequestDiscussionManager(this._tfsContext, projectId, this._initializeAdapterFunc());
            this._discussionManager.setPullRequestDetails(this._pullRequest);
        }

        return this._discussionManager;
    }

    public dispose(): void {
        if (this._discussionManager) {
            this._discussionManager.dispose();
            this._discussionManager = null;
        }
    }
}

export class DiscussionAdapter implements IDiscussionAdapter {
    private _updateListeners: ((event: DiscussionThreadsUpdateEvent) => void)[];
    private _discussionsStore: IDiscussionsStore;
    private _discussionActionCreator: IDiscussionActionCreator;
    private _actionsHub: Actions.ActionsHub;

    constructor(discussionsStore: IDiscussionsStore, discussionActionCreator: IDiscussionActionCreator, actionsHub: Actions.ActionsHub) {
        this._updateListeners = [];
        this._discussionsStore = discussionsStore;
        this._actionsHub = actionsHub;
        this._discussionActionCreator = discussionActionCreator;

        this._discussionsStore.setSignalRThreadsAddedListener(this._onSignalRThreadsAdded);
    }

    public dispose(): void {
        this._updateListeners = null;
        this._discussionsStore = null;
        this._discussionActionCreator = null;
        this._actionsHub = null;
    }

    private _onSignalRThreadsAdded = (newThreads: DiscussionThread[]): void => {
        if (newThreads && newThreads.length) {
            for (const listener of this._updateListeners) {
                listener({
                    newThreads: newThreads
                });
            }
        }
    }

    public getDiscussionThreads(): DiscussionThread[] {
        return this._discussionsStore.getDiscussionThreads({ 
            types: DiscussionType.AllComments,
            includePending: true,
            excludeTypes: DiscussionType.Comment, // exclude PR comments
            sort: PullRequestActivityOrder.Time_OldFirst
        }) || [];
    }

    public getIterationId(): number {
        const codeExplorerStore = ServiceRegistry.getService(ICodeExplorerStore);
        if (codeExplorerStore) {
            return codeExplorerStore.getSelectedIterationId();
        }

        return 0;
    }

    public getBaseIterationId(): number {
        const codeExplorerStore = ServiceRegistry.getService(ICodeExplorerStore);
        if (codeExplorerStore) {
            return codeExplorerStore.getSelectedBaseIterationId();
        }

        return 0;
    }

    public getChanges(): GitPullRequestIterationChanges {
        const codeExplorerStore = ServiceRegistry.getService(ICodeExplorerStore);
        if (codeExplorerStore) {
            return codeExplorerStore.getSelectedIterationChanges();
        }

        return null;
    }

    public createThread(thread: DiscussionThread): void {
        this._discussionActionCreator.createThread(thread);
    }

    public newCommentId(): number {
        return this._discussionsStore.newCommentId();
    }

    public newThreadId(): number {
        return this._discussionsStore.newThreadId();
    }

    public saveComment(thread: DiscussionThread, comment: DiscussionComment): void {
        this._discussionActionCreator.saveComment(thread, comment);
    }

    public deleteComment(discussionId: number, commentId: number): void {
        const thread: DiscussionThread = this._discussionsStore.getDiscussionThread(discussionId);

        if (thread && thread.comments.length > 0) {
            const comment: DiscussionComment =
                thread.comments.filter(c => c.id === commentId)[0] ||
                thread.comments.filter(c => c.originalId === commentId)[0];

            if (comment) {
                this._discussionActionCreator.deleteComment(thread, comment);
            }
        }
    }

    public isAddCommentEnabled(): boolean {
        const discussionPermissionsStore = ServiceRegistry.getService(IDiscussionPermissionsStore);
        if (discussionPermissionsStore) {
            return discussionPermissionsStore.getPermissions().addEditComment;
        }

        return false;
    }

    public isDirty(): boolean {
        return this._discussionsStore.getUnsavedCommentCount() !== 0;
    }

    public addUpdateListener(callback: (event: DiscussionThreadsUpdateEvent) => void): void {
        this._updateListeners.push(callback);
        this._actionsHub.discussionCommentDeleted.addListener(payload => {
            callback({
                deletedComments: [payload.comment as DiscussionComment]
            });
        });
        this._actionsHub.discussionThreadDeleted.addListener(payload => {
            callback({
                deletedThreads: [payload.thread as DiscussionThread]
            });
        });
        this._actionsHub.discussionCommentComitted_ForDiscussionManager.addListener(payload => {
            callback({
                savedComments: [payload.comment as DiscussionComment]
            });
        });
        this._actionsHub.discussionCommentUpdated.addListener(payload => {
            callback({
                updatedComments: [payload.comment as DiscussionComment]
            });
        });
        this._actionsHub.discussionCommentAdded.addListener(payload => {
            callback({
                newComments: [payload.thread.comments[payload.thread.comments.length - 1] as DiscussionComment]
            });
        });
        this._actionsHub.discussionThreadComitted_ForDiscussionManager.addListener(payload => {
            callback({
                savedThreads: [payload.thread as DiscussionThread]
            });
        });
        this._actionsHub.discussionThreadAdded_ForDiscussionManager.addListener(payload => {
            callback({
                newThreads: [payload.thread as DiscussionThread]
            });
        });
        this._actionsHub.discussionThreadStatusUpdated.addListener(payload => {
            callback({
                updateThreads: [payload.thread as DiscussionThread]
            });
        });
        this._actionsHub.discussionThreadsUpdated_ForDiscussionManager.addListener(payload => {
            callback({
                currentThreads: payload.threads as DiscussionThread[]
            });
        });
    }
}
