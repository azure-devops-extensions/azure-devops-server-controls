import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";

// actions
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RefStatus } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

// contracts
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import VCPullRequest = require("VersionControl/Scripts/TFS.VersionControl.PullRequest");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import Utils_String = require("VSS/Utils/String");
import VSS_WebApi = require("VSS/WebApi/Contracts");
import CommitIdHelper = require("VersionControl/Scripts/CommitIdHelper");
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";

export const defaultMergeStaleTime = 120000;
export const restartMergeStaleTime = 1500;

/**
 * Basic details about the pull request.
 */
export class PullRequestDetailStore extends RemoteStore {
    // our view model to be returned from the store
    private _pullRequestDetail: IPullRequest;
    private _pullRequestId: number;

    // keep track of these so we can reconstitute PR detail
    private _repositoryContext: RepositoryContext;
    private _pullRequest: VCContracts.GitPullRequest;
    private _branchStatus: VCPullRequest.IPullRequestBranchStatus;
    private _sourceRefStatus: RefStatus = null;
    private _retargetInProgress: boolean = false;

    // Is the data for the Pull Request being updated.
    private _isUpdating: boolean;

    // does the PR exist at all?
    private _exists: boolean;

    private _canBypassPolicy: boolean = false;

    constructor() {
        super();

        this._pullRequest = null;
        this._pullRequestId = -1;
        this._isUpdating = false;
        this._exists = false;
    }

    // -- event handlers

    public onContextUpdated = (payload: Actions.IContextUpdatedPayload) => {
        // stash repo context in case we need it
        // but don't fire a change event
        this._repositoryContext = payload.repositoryContext;
    }

    public onBranchStatusUpdated = (payload: Actions.IBranchStatusUpdatedPayload) => {
        this._branchStatus = payload.branchStatus;
        this._sourceRefStatus = payload.sourceRefStatus;

        this._pullRequestDetail = this._buildPullRequest(this._pullRequest, this._branchStatus, this._sourceRefStatus);

        this._updatePullRequestLoading();
        this.emitChanged();
    }

    public onPullRequestUpdating = (payload: Actions.IPullRequestUpdatingPayload) => {
        this._isUpdating = true;
        this._pullRequestId = payload.pullRequestId;
    }

    public onPullRequestNotFound = (payload: Actions.IPullRequestNotFoundPayload) => {
        if (this._pullRequestId > 0 && this._pullRequestId !== payload.pullRequestId) {
            return;
        }

        this._exists = false;
        this._loading = false;
        this.emitChanged();
    }

    public onPullRequestUpdated = (payload: Actions.IPullRequestUpdatedPayload) => {
        if (payload.pullRequest &&
            (this._pullRequestId > 0 && this._pullRequestId !== payload.pullRequest.pullRequestId)) {
            return;
        }

        this._exists = true;

        if (
            this._pullRequest
            && this._branchStatus
            && this._pullRequest.status === VCContracts.PullRequestStatus.Active
            && payload.pullRequest.status === VCContracts.PullRequestStatus.Completed
            && payload.pullRequest.completionOptions
            && payload.pullRequest.completionOptions.deleteSourceBranch
        ) {
            // A special case: the user just completed the PR, and opted to the delete source branch. This prevents the "Delete source"
            // button from flashing enabled briefly when we get the new PR record, then disabling after get the new branch status

            this._branchStatus.sourceBranchStatus = new VCPullRequest.BranchStatus(this._repositoryContext, this._branchStatus.sourceBranchStatus.refName, false, null);
        }

        // if the updated payload does not include commits
        // but we already have them, then re-add them to the payload
        if (!payload.pullRequest.commits && this._pullRequest && this._pullRequest.commits) {
            payload.pullRequest.commits = this._pullRequest.commits;
        }

        this._isUpdating = false;
        this._pullRequest = payload.pullRequest;

        this._pullRequestDetail = this._buildPullRequest(this._pullRequest, this._branchStatus, this._sourceRefStatus);

        this._updatePullRequestLoading();
        this.emitChanged();
    }

    public onBypassPermissionLoaded = (payload: Actions.IPullRequestBypassPermissionUpdatedPayload) => {
        this._canBypassPolicy = payload.canBypass;
    }

    public onPendingDescriptionUpdated = (payload: string) => {
        this._pullRequestDetail.pendingDescription = payload;
    }

    public canBypassPolicy(): boolean {
        return this._canBypassPolicy;
    }
    
    /**
     * loading is (has been) used to indicate whether the store has been loaded with initial data.
     * We are not loading if we are currently loading and PullRequestDetails is null.
     */
    private _updatePullRequestLoading() {
        this._loading = this._loading &&
                        this._pullRequestDetail === null;
    }

    public onRefDeleted = (payload: Actions.IDeleteRefCompletedPayload) => {
        if (!payload.success) {
            return;
        }

        // reconstitute the branch status if the ref was deleted
        this._branchStatus.sourceBranchStatus = new VCPullRequest.BranchStatus(this._repositoryContext, this._branchStatus.sourceBranchStatus.refName, false, null);

        if (!this._loading) {
            this._pullRequestDetail = this._buildPullRequest(this._pullRequest, this._branchStatus, this._sourceRefStatus);
            this.emitChanged();
        }
    }

    public getPullRequestDetail(): IPullRequest {
        if (!this._pullRequestDetail) {
            // return a default instead of null if we don't have any data yet
            return this._defaultPullRequest();
        }

        return this._pullRequestDetail;
    }

    public getPullRequestExists(): boolean {
        return this._exists;
    }

    public getSourceRepositoryContext(): RepositoryContext {
        // if we have a fork, the source repo context is generated from
        // the fork source and the current tfs context
        // otherwise, the source context is the same as our existing repo (target)
        if (this._repositoryContext &&
            this._pullRequestDetail &&
            this._pullRequest.forkSource &&
            this._pullRequest.forkSource.repository) {
            return new GitRepositoryContext(this._repositoryContext.getTfsContext(), this._pullRequest.forkSource.repository);
        } else {
            return this._repositoryContext;
        }
    }

    public getTargetRepositoryContext(): RepositoryContext {
        return this._repositoryContext;
    }

    /**
     * Get boolean if we are making a request to update PullRequest details.
     */
    public getIsUpdating(): boolean {
        return this._isUpdating;
    }

    private _buildPullRequest(
        pullRequest: VCContracts.GitPullRequest,
        branchStatus: VCPullRequest.IPullRequestBranchStatus,
        sourceRefStatus: RefStatus): IPullRequest {

        if (!pullRequest || !branchStatus) {
            return null;
        }

        return new PullRequest(pullRequest, branchStatus, sourceRefStatus);
    }

    /*
     * Logic which shows a callout message if merge is running for a long time, or when user manually restarts merge
     */
    @autobind
    public onRestartMergeSucceeded() {
        if (this._pullRequest && this._pullRequest.mergeStatus === VCContracts.PullRequestAsyncStatus.Queued) {
            const key = this._getMergeKey();
            this._mergeStaleTime[key] = Date.now() + restartMergeStaleTime;
            this.emitChanged();
        }
    }

    private _getMergeKey(): string {
        if (!this._pullRequest
            || !this._pullRequest.lastMergeSourceCommit
            || !this._pullRequest.lastMergeSourceCommit.commitId
            || (this._pullRequest.lastMergeSourceCommit.commitId === CommitIdHelper.EMPTY_OBJECT_ID)
            || !this._pullRequest.lastMergeTargetCommit
            || !this._pullRequest.lastMergeTargetCommit.commitId
            || (this._pullRequest.lastMergeTargetCommit.commitId === CommitIdHelper.EMPTY_OBJECT_ID)
        ) {
            return null;
        }

        return this._pullRequest.lastMergeSourceCommit.commitId + "," + this._pullRequest.lastMergeTargetCommit.commitId;
    }

    public getMergeStaleTime(): number {
        const key = this._getMergeKey();
        let staleTime: number;

        if (this._pullRequest.mergeStatus !== VCContracts.PullRequestAsyncStatus.Queued
            || this._pullRequest.status !== VCContracts.PullRequestStatus.Active
        ) {
            staleTime = null;
        }
        else {
            staleTime = this._mergeStaleTime[key] || (Date.now() + defaultMergeStaleTime);
        }

        this._mergeStaleTime[key] = staleTime;

        return staleTime;
    }    

    // Key format: "{sourceCommit},{targetCommit}"
    private _mergeStaleTime: { [key: string]: number } = {};

    /**
     *  what should we return if we are still loading?
     */
    private _defaultPullRequest(): IPullRequest {
        return {
            pullRequestId: this._pullRequestId,
            codeReviewId: -1,
            repositoryId: "",
            repositoryName: "",
            projectGuid: "",
            canReactivate: false,
            canDeleteSourceBranch: false,
            isMerging: false,
            cannotDeleteReasonHint: "",
            externallyMerged: false,
            supportsIterations: false,
            title: "",
            description: "",
            sourceRefName: "",
            sourceFriendlyName: "",
            targetRefName: "",
            targetFriendlyName: "",
            pendingDescription: null,
            lastMergeSourceCommitId: null,
            lastMergeTargetCommitId: null,
            lastMergeCommitId: null,
            squashMerge: false,
            mergeStatus: VCContracts.PullRequestAsyncStatus.NotSet,
            mergeFailureType: VCContracts.PullRequestMergeFailureType.None,
            mergeFailureMessage: "",
            isDraft: false,
            disableRenames: false,
            isLoading: true,
            isFork: false,
            createdBy: null,
            creationDate: null,
            closedBy: null,
            closedDate: null,
            autoCompleteSetBy: null,
            completionQueueTime: null,
            status: VCContracts.PullRequestStatus.NotSet,
            pullRequestContract: () => {
                return null;
            },
            branchStatusContract: () => {
                return null;
            },
            artifactId: null,
            getStatusString: (): string => { return "" },
            getStatusClass: (): string => { return "" }
        };
    }

    public sourceRefStatusIsLoading(): boolean {
        return this._sourceRefStatus === null;
    }

    public onPullRequestTargetChanging = (): void => {
        this._retargetInProgress = true;
        this.emitChanged();
    }

    public onPullRequestTargetChanged = (): void => {
        this._retargetInProgress = false;
        this.emitChanged();
    }

    public retargetInProgress(): boolean {
        return this._retargetInProgress;
    }
}

class PullRequest implements IPullRequest {

    private _pullRequest: VCContracts.GitPullRequest;
    private _branchStatus: VCPullRequest.IPullRequestBranchStatus;

    // important ids
    public pullRequestId: number;
    public codeReviewId: number;
    public repositoryId: string;
    public repositoryName: string;
    public projectGuid: string;
    public artifactId: string;

    // people
    public createdBy: VSS_WebApi.IdentityRef;
    public closedBy: VSS_WebApi.IdentityRef;
    public autoCompleteSetBy: VSS_WebApi.IdentityRef;

    // dates
    public creationDate: Date;
    public closedDate: Date;
    public completionQueueTime: Date;

    // things to evaulate
    public squashMerge: boolean;
    public canReactivate: boolean;
    public isMerging: boolean;
    public isFork: boolean;
    public isLoading: boolean;
    public canDeleteSourceBranch: boolean;
    public cannotDeleteReasonHint: string;
    public externallyMerged: boolean;
    public supportsIterations: boolean;
    public disableRenames: boolean;

    // basic info
    public pullRequestCard: PullRequestCardInfo;

    public status: VCContracts.PullRequestStatus;
    public mergeStatus: VCContracts.PullRequestAsyncStatus;
    public mergeFailureType: VCContracts.PullRequestMergeFailureType;
    public mergeFailureMessage: string;
    public isDraft: boolean;
    public title: string;
    public description: string;
    public sourceRefName: string;
    public sourceFriendlyName: string;
    public targetRefName: string;
    public targetFriendlyName: string;
    public pendingDescription: string;

    public lastMergeSourceCommitId: string;
    public lastMergeTargetCommitId: string;
    public lastMergeCommitId: string;

    constructor(pullRequest: VCContracts.GitPullRequest, branchStatus: VCPullRequest.IPullRequestBranchStatus, sourceRefStatus: RefStatus) {
        this._pullRequest = pullRequest;
        this._branchStatus = branchStatus;

        this.pullRequestId = pullRequest.pullRequestId;
        this.artifactId = pullRequest.artifactId;
        this.codeReviewId = pullRequest.codeReviewId;
        this.title = pullRequest.title;
        this.description = pullRequest.description;
        this.repositoryId = pullRequest.repository.id;
        this.repositoryName = pullRequest.repository.name;
        this.projectGuid = pullRequest.repository.project.id;
        this.status = pullRequest.status;
        this.mergeStatus = pullRequest.mergeStatus;
        this.mergeFailureType = pullRequest.mergeFailureType;
        this.mergeFailureMessage = pullRequest.mergeFailureMessage;
        this.isDraft = !!pullRequest.isDraft;
        this.canReactivate = PullRequest._canReactivate(pullRequest, branchStatus, sourceRefStatus);
        this.isMerging = PullRequest._isMerging(pullRequest);
        this.isFork = !!pullRequest.forkSource;
        this.externallyMerged = (pullRequest.commits && pullRequest.commits.length === 0);
        this.supportsIterations = pullRequest.supportsIterations;
        this.lastMergeSourceCommitId = pullRequest.lastMergeSourceCommit ? pullRequest.lastMergeSourceCommit.commitId : null;
        this.lastMergeTargetCommitId = pullRequest.lastMergeTargetCommit ? pullRequest.lastMergeTargetCommit.commitId : null;
        this.lastMergeCommitId = pullRequest.lastMergeCommit ? pullRequest.lastMergeCommit.commitId : null;
        this.squashMerge = pullRequest.completionOptions && pullRequest.completionOptions.squashMerge;
        this.disableRenames = pullRequest.mergeOptions && pullRequest.mergeOptions.disableRenames;
        this.sourceRefName = branchStatus.sourceBranchStatus.refName;
        this.sourceFriendlyName = this.isFork ? GitRefUtility.getRefFriendlyName(pullRequest.forkSource.name) : branchStatus.sourceBranchStatus.friendlyName;
        this.targetRefName = branchStatus.targetBranchStatus.refName;
        this.targetFriendlyName = branchStatus.targetBranchStatus.friendlyName;
        this.pendingDescription = null;
        this.isLoading = false;
        this.createdBy = pullRequest.createdBy;
        this.closedBy = pullRequest.closedBy;
        this.autoCompleteSetBy = pullRequest.autoCompleteSetBy;
        this.creationDate = pullRequest.creationDate;
        this.closedDate = pullRequest.closedDate;
        this.completionQueueTime = pullRequest.completionQueueTime;
        this.canDeleteSourceBranch = PullRequest._canBranchBeDeleted(sourceRefStatus);
        this.cannotDeleteReasonHint = this._deleteReasonHint(sourceRefStatus);

        this.pullRequestCard = new PullRequestCardInfo(pullRequest);
    }

    public pullRequestContract() {
        return this._pullRequest;
    }

    public branchStatusContract() {
        return this._branchStatus;
    }

    public getStatusString(): string {
        let statusString: string = VCResources.PullRequest_PullRequestDetailsStatusUnKnown;

        switch (this.status) {
            case VCContracts.PullRequestStatus.Active:
                if (this.isDraft) {
                    statusString = VCResources.Draft;
                } else {
                    statusString = VCResources.PullRequest_PullRequestDetailsStatusActive;
                }
                break;
            case VCContracts.PullRequestStatus.Completed:
                statusString = VCResources.PullRequest_PullRequestDetailsStatusCompleted;
                break;
            case VCContracts.PullRequestStatus.Abandoned:
                statusString = VCResources.PullRequest_PullRequestDetailsStatusAbandoned;
                break;
            default:
                statusString = VCResources.PullRequest_PullRequestDetailsStatusUnKnown;
                break;
        }

        return statusString;
    }

    public getStatusClass(): string {
        let statusClass: string = "status-indicator";

        switch (this.status) {
            case VCContracts.PullRequestStatus.Active:
                if (this.isDraft) {
                    statusClass = statusClass + " draft";
                } else {
                    statusClass = statusClass + " active";
                }
                break;
            case VCContracts.PullRequestStatus.Completed:
                statusClass = statusClass + " completed";
                break;
            case VCContracts.PullRequestStatus.Abandoned:
                statusClass = statusClass + " abandoned";
                break;
        }

        return statusClass;
    }

    // -- static methods used to caluclate pull request info

    private static _canDeleteRef(sourceBranchStatus: VCPullRequest.IBranchStatus): boolean {
        return sourceBranchStatus
            && !sourceBranchStatus.isDeleted
            && !sourceBranchStatus.isDefault
            && !sourceBranchStatus.headOutOfDate;
    }

    private static _canReactivate(
        pullRequest: VCContracts.GitPullRequest,
        branchStatus: VCPullRequest.IPullRequestBranchStatus,
        sourceRefStatus: RefStatus): boolean {
        return pullRequest
            && branchStatus
            && pullRequest.status === VCContracts.PullRequestStatus.Abandoned
            && !sourceRefStatus.isDeleted
            && !branchStatus.targetBranchStatus.isDeleted;
    }

    private static _isMerging(pullRequest: VCContracts.GitPullRequest) {
        return pullRequest && pullRequest.mergeStatus === VCContracts.PullRequestAsyncStatus.Queued;
    }

    private static _canBranchBeDeleted(sourceRefStatus: RefStatus): boolean {
        return !sourceRefStatus.repoDeletedOrNotReadable
            && !sourceRefStatus.isDeleted
            && !sourceRefStatus.isInUse
            && !sourceRefStatus.isDefault
            && !sourceRefStatus.hasApplicablePolicies
            && sourceRefStatus.hasPermissionToDelete;
    }

    private _deleteReasonHint(sourceRefStatus: RefStatus): string {
        if (sourceRefStatus.repoDeletedOrNotReadable) {
            // the current user cannot access the source repo, or the source repo no longer exists
            return VCResources.PullRequest_SourceRepoDoesNotExistOrNoPermission;
        } else if (sourceRefStatus.isDefault) {
            // it is the default branch
            return VCResources.PullRequest_CompleteMergeDialog_DeleteSourceCheckboxDefaultTooltip;
        } else if (sourceRefStatus.isDeleted) {
            // no commit id means the branch was deleted already
            return Utils_String.localeFormat(
                VCResources.PullRequest_BranchHasBeenDeleted,
                this.sourceFriendlyName);
        } else if (sourceRefStatus.isInUse) {
            // there are active pull requests
            return Utils_String.localeFormat(
                VCResources.PullRequest_BranchHasOpenPullRequest,
                this.sourceFriendlyName);
        } else if (sourceRefStatus.hasApplicablePolicies) {
            return VCResources.PullRequest_SourceBranchHasPolicies;
        } else if (sourceRefStatus.hasPermissionToDelete === false) {
            return VCResources.PullRequest_DeleteSourceBranch_NoPermission;
        }

        return null;
    }
}

export interface IPullRequest {
    // important ids
    pullRequestId: number;
    codeReviewId: number;
    repositoryId: string;
    repositoryName: string;
    projectGuid: string;
    artifactId: string;

    // people
    createdBy: VSS_WebApi.IdentityRef;
    closedBy: VSS_WebApi.IdentityRef;
    autoCompleteSetBy: VSS_WebApi.IdentityRef;

    // dates
    creationDate: Date;
    closedDate: Date;
    completionQueueTime: Date;

    // things to evaulate
    squashMerge: boolean;
    canReactivate: boolean;
    isMerging: boolean;
    isFork: boolean;
    isLoading: boolean;
    canDeleteSourceBranch: boolean;
    cannotDeleteReasonHint: string;
    externallyMerged: boolean;
    supportsIterations: boolean;
    disableRenames: boolean;

    // basic info
    status: VCContracts.PullRequestStatus;
    mergeStatus: VCContracts.PullRequestAsyncStatus;
    mergeFailureMessage: string;
    mergeFailureType: VCContracts.PullRequestMergeFailureType;

    isDraft: boolean;

    title: string;
    description: string;
    sourceRefName: string;
    sourceFriendlyName: string;
    targetRefName: string;
    targetFriendlyName: string;
    pendingDescription: string;

    lastMergeSourceCommitId?: string;
    lastMergeTargetCommitId?: string;
    lastMergeCommitId?: string;

    pullRequestContract(): VCContracts.GitPullRequest;
    branchStatusContract(): VCPullRequest.IPullRequestBranchStatus;

    getStatusString(): string;
    getStatusClass(): string;
}
