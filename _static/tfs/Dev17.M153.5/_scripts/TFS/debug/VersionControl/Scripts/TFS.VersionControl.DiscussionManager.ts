/// <reference types="jquery" />
import Utils_String = require("VSS/Utils/String");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import CRRestClient = require("CodeReview/Client/RestClient");
import Git_Client = require("TFS/VersionControl/GitRestClient");
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";

export module PullRequestDiscussionThreadMergeStatus {
    export let SystemMergeSucceeded = "Succeeded";
    export let SystemMergeFailed = "Failed";
    export let SystemMergeConflicts = "Conflicts";
    export let SystemMergeServerFailure = "ServerFailure";
    export let SystemMergeFailure = "Failure";
    export let SystemMergeRejectedByPolicy = "RejectedByPolicy";
}

export class PullRequestDiscussionManager extends DiscussionOM.DiscussionManager {
    private _projectGuid: string;

    private _currentPullRequestId: number;
    private _currentCodeReviewId: number;
    private _currentSourceBranchHeadCommit: string;
    private _currentTargetBranchHeadCommit: string;
    private _pullRequestDetails: VCContracts.GitPullRequest;

    private _currentIterationId: number;
    private _currentBaseIterationId: number;

    private _baseChangesListMap: { [itemPath: string]: number };
    private _modifiedChangesListMap: { [itemPath: string]: number };

    constructor(
        tfsContext: TFS_Host_TfsContext.TfsContext,
        projectGuid: string,
        discussionAdapter: DiscussionOM.IDiscussionAdapter,
        options?: any) {

        options = $.extend(options, { projectGuid: projectGuid });
        super(tfsContext, discussionAdapter, null, null, options);

        if (this._discussionAdapter) {
            this._discussionAdapter.addUpdateListener(this.fireDiscussionThreadsUpdatedEvent.bind(this));
        }
    }

    protected init(options?: any) {
        this._projectGuid = options.projectGuid;
    }

    public getCurrentPullRequestId(): number {
        return this._currentPullRequestId;
    }

    public setPullRequestDetails(pullRequest: VCContracts.GitPullRequest) {
        this._currentPullRequestId = pullRequest.pullRequestId;
        this._currentCodeReviewId = pullRequest.codeReviewId;

        this.setSourceBranchHeadCommit(null);
        this.setTargetBranchHeadCommit(null);

        if (pullRequest.supportsIterations) {
            this.updateIteration();
        }

        const artifact = new VCOM.CodeReviewArtifact({
            projectGuid: this._projectGuid,
            pullRequestId: pullRequest.pullRequestId,
            codeReviewId: pullRequest.codeReviewId,
            supportsIterations: pullRequest.supportsIterations
        });

        this._setArtifactUri(artifact.getUri());
        this._pullRequestDetails = pullRequest;
    }

    public setSourceBranchHeadCommit(commitId: string) {
        this._currentSourceBranchHeadCommit = commitId;
    }

    public setTargetBranchHeadCommit(commitId: string) {
        this._currentTargetBranchHeadCommit = commitId;
    }

    public updateIteration() {
        this._applyIteration(
            this._discussionAdapter.getIterationId(),
            this._discussionAdapter.getBaseIterationId(),
            this._discussionAdapter.getChanges());
    }

    public getExtraProperties(newThread: DiscussionCommon.DiscussionThread): any {
        const properties = {};

        if (!this._pullRequestDetails.supportsIterations) {
            if (this._currentSourceBranchHeadCommit) {
                properties[CodeReviewDiscussionConstants.CodeReviewSourceCommit] = {
                    type: "System.String",
                    value: this._currentSourceBranchHeadCommit
                };
            }

            if (this._currentTargetBranchHeadCommit) {
                properties[CodeReviewDiscussionConstants.CodeReviewTargetCommit] = {
                    type: "System.String",
                    value: this._currentTargetBranchHeadCommit
                };
            }
        }

        return properties;
    }

    public populateExtraMembers(thread: DiscussionCommon.DiscussionThread) {
        // If the current iteration or change mappings are not set up yet, 
        // ask the discussion adapter and apply the current iteration
        if (this._discussionAdapter && (!this._currentIterationId || !this._baseChangesListMap || !this._modifiedChangesListMap)) {
            this.updateIteration();
        }

        // add extra properties specific to file-level and regular comments
        if (thread.itemPath) {
            const baseChangeTrackingId: number = this._baseChangesListMap && this._baseChangesListMap[thread.itemPath];
            const modChangeTrackingId: number = this._modifiedChangesListMap && this._modifiedChangesListMap[thread.itemPath];

            thread.changeTrackingId = (thread.position && thread.position.positionContext === DiscussionCommon.PositionContext.LeftBuffer) ?
                baseChangeTrackingId || modChangeTrackingId : modChangeTrackingId || baseChangeTrackingId;

            // add the iteration context
            if (this._currentIterationId) {
                thread.firstComparingIteration = this._currentBaseIterationId || this._currentIterationId;
                thread.secondComparingIteration = this._currentIterationId;
            }
        }
    }

    public getAllThreads(): DiscussionCommon.DiscussionThread[] {
        const artifactUri = this.getArtifactUri();
        const threads = super.getAllThreads();

        $.each(threads, (threadIndex: number, thread: DiscussionCommon.DiscussionThread) => {
            $.each(thread.comments || [], (commentIndex: number, comment: DiscussionCommon.DiscussionComment) => {
                if (thread.properties && thread.properties.CodeReviewThreadType) {
                    comment.isEditable = false;
                }
            });
        });

        //The artifactUri is not used and not set on the new PR page which uses a discussion adapter
        if (this._discussionAdapter) {
            return threads;
        }

        return $.grep(threads, (element: DiscussionCommon.DiscussionThread) => {
            return Utils_String.ignoreCaseComparer(element.artifactUri, artifactUri) === 0;
        });
    }

    private _applyIteration(iterationId: number, baseId: number, iterationChanges: VCContracts.GitPullRequestIterationChanges) {
        this._currentIterationId = iterationId;
        this._currentBaseIterationId = baseId;

        if (iterationId <= 0) {
            // only set changes and id if we have an iteration
            return;
        }
        
        const baseChangesListMap: { [itemPath: string]: number } = {};
        const modifiedChangesListMap: { [itemPath: string]: number } = {};

        this._baseChangesListMap = null;
        this._modifiedChangesListMap = null;

        if (iterationChanges) {
            // only set up the maps if we have changes
            for (let i = 0; i < iterationChanges.changeEntries.length; i++) {
                if (iterationChanges.changeEntries[i].originalPath) {
                    baseChangesListMap[iterationChanges.changeEntries[i].originalPath] = iterationChanges.changeEntries[i].changeTrackingId;
                }

                if (iterationChanges.changeEntries[i].item && iterationChanges.changeEntries[i].item.path) {
                    modifiedChangesListMap[iterationChanges.changeEntries[i].item.path] = iterationChanges.changeEntries[i].changeTrackingId;
                }
            }

            this._baseChangesListMap = baseChangesListMap;
            this._modifiedChangesListMap = modifiedChangesListMap;
        }
    }

    private _findLatestIteration(iterations: VCContracts.GitPullRequestIteration[]) {
        // find the latest (last) iteration
        if (iterations && iterations.length > 0) {
            return iterations.reduce((iter1, iter2) => {
                return (iter2.id > iter1.id) ? iter2 : iter1;
            });
        }

        return null; // no iterations found
    }

    private _hasThreadsChanged(currentNewThreads: DiscussionCommon.DiscussionThread[]): boolean {
        let currentThreads: DiscussionCommon.DiscussionThread[] = this.getAllThreads(),
            oldThreads: DiscussionCommon.DiscussionThread[],
            newThreads: DiscussionCommon.DiscussionThread[];
        
        // Need to get remove the temp threads
        if (currentThreads) {    
            oldThreads = this._removeTeamAndCodeReviewSpecificThreads(currentThreads); 
        }
        if (currentNewThreads) {
            newThreads = this._removeTeamAndCodeReviewSpecificThreads(currentNewThreads);
        }

        // If both are non-existent then return
        if (!newThreads && !oldThreads) {
            return false;
        }

        if ((newThreads && !oldThreads) ||
            (!newThreads && oldThreads)) {
            return true;
        }

        if (newThreads.length !== oldThreads.length) {
            return true;
        }

        let hasChanged: boolean = false;

        $.each(newThreads, (index, newThread: DiscussionCommon.DiscussionThread) => {
            const oldThread = oldThreads[index];

            if (!newThread && !oldThread) {
                return true;
            }

            if ((newThread && !oldThread) ||
                (!newThread && oldThread)) {
                hasChanged = true;
                return false;
            }

            if (newThread.id !== oldThread.id) {
                hasChanged = true;
                return false;
            }

            if (newThread.status !== oldThread.status) {
                hasChanged = true;
                return false;
            }

            if (oldThread.comments &&
                newThread.comments &&
                oldThread.comments.length === newThread.comments.length) {

                $.each(newThread.comments, (commentIndex, newComment: DiscussionCommon.DiscussionComment) => {
                    const oldComment = oldThread.comments[commentIndex];

                    if (oldComment && newComment &&
                        oldComment.id === newComment.id &&
                        oldComment.content === newComment.content &&
                        oldComment.isDeleted === newComment.isDeleted) {
                        return true;
                    }

                    hasChanged = true;
                });

                if (hasChanged) {
                    return false;
                }
            }
            else {
                hasChanged = true;
                return false;
            }
        });

        return hasChanged;
    }

    private _removeTeamAndCodeReviewSpecificThreads(threads: DiscussionCommon.DiscussionThread[]): DiscussionCommon.DiscussionThread[] {
        const toReturn: DiscussionCommon.DiscussionThread[] = [];

        $.each(threads, (index, thread) => {
            if (thread && thread.properties && thread.properties.CodeReviewThreadType) {
                return true;
            }

            if (thread && thread.id > 0) {
                toReturn.push(thread);
            }
        });

        return toReturn;
    }
}

export class CodeReviewDiscussionManager extends DiscussionOM.DiscussionManager {
    private _workItemId: number;
    private _changeList: VCLegacyContracts.ChangeList;
    private _repositoryContext: RepositoryContext;

    constructor(
        tfsContext: TFS_Host_TfsContext.TfsContext, 
        repositoryContext: RepositoryContext,
        changeList: VCLegacyContracts.ChangeList,
        artifactUri: string,
        workItemId: number,
        discussionAdapter: DiscussionOM.IDiscussionAdapter,
        viewOptions?: DiscussionOM.DiscussionViewOptions) {

        super(tfsContext, discussionAdapter, artifactUri, viewOptions);

        this._workItemId = workItemId;
        this._changeList = changeList;
        this._repositoryContext = repositoryContext;

        if (this._discussionAdapter) {
            this._discussionAdapter.addUpdateListener(this.fireDiscussionThreadsUpdatedEvent.bind(this));
        }
    }

    public getWorkItemId() {
        return this._workItemId;
    }

    public getChangeList() {
        return this._changeList;
    }

    public getRepositoryContext() {
        return this._repositoryContext;
    }

    public _setThreadsFromServer(threads: DiscussionCommon.DiscussionThread[]) {
        const pathsInChangeList: { [path: string]: boolean; } = {};

        if (threads.length && this._changeList.changes && this._changeList.allChangesIncluded) {
            // Build a hash of item paths in this set of changes
            $.each(this._changeList.changes, (i: number, change: VCLegacyContracts.Change) => {
                pathsInChangeList[("" + change.item.serverItem).toLowerCase()] = true;
            });

            // Find discussion threads where a path is specified but the path
            // does not exist in this set of changes.
            $.each(threads, (i: number, thread: DiscussionCommon.DiscussionThread) => {
                let newComment: string;
                if (thread.itemPath && !pathsInChangeList[thread.itemPath.toLowerCase()] && thread.comments && thread.comments.length) {
                    newComment = thread.itemPath;
                    if (thread.position && thread.position.endLine) {
                        newComment += ":" + thread.position.endLine;
                    }
                    thread.comments[0].content = Utils_String.format(VCResources.CommentWithFileInfoFormat, thread.comments[0].content || "", newComment);
                    thread.originalItemPath = thread.itemPath;
                    thread.itemPath = null;
                }
            });
        }

        super._setThreadsFromServer(threads);
    }
}
