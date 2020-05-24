import { autobind } from "OfficeFabric/Utilities";
import * as Q from "q";
import * as Context from "VSS/Context";
import { Debug } from "VSS/Diag";

import { traceError } from "VersionControl/Scenarios/Shared/Trace";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

// actions
import { PullRequestAutoCompleteActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestAutoCompleteActionCreator";
import { PullRequestClientPoliciesActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestClientPoliciesActionCreator";
import { PullRequestCompleteMergeActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestCompleteMergeActionCreator";
import { PullRequestLabelsActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestLabelsActionCreator";
import { PullRequestPermissionsActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestPermissionsActionCreator";
import { PullRequestStatusActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestStatusActionCreator";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { AttachmentActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/AttachmentActionCreator";
import { CodeExplorerActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/CodeExplorerActionCreator";
import { ConflictActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/ConflictActionCreator";
import { DiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/DiscussionActionCreator";
import { FollowsActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/FollowsActionCreator";
import { NavigationActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/NavigationActionCreator";
import { SharePullRequestActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/SharePullRequestActionCreator";
import { WorkItemActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/WorkItemActionCreator";

import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";

// sources
import { IGitRepositorySource } from "VersionControl/Scripts/Sources/GitRepositorySource";
import { IPullRequestDetailSource } from "VersionControl/Scripts/Sources/PullRequestDetailSource";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";

// contracts
import * as VCContracts from "TFS/VersionControl/Contracts";
import { Notification, NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import * as VCPullRequest from "VersionControl/Scripts/TFS.VersionControl.PullRequest";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { GitBranchVersionSpec } from "../../TFS.VersionControl.VersionSpecs";
import { NotificationSpecialTypes } from "VersionControl/Scripts/Stores/PullRequestReview/NotificationStore";

export enum PullRequestDetailRefreshOptions {
    Basic = 0,            // just query the basic PR detail
    BranchStatus = 1,     // also include branch status
    Policy = 2,           // query for update policy information
    WorkItems = 4,        // query for work item information
    Follows = 8,          // query if pull request is followed
    Commits = 16,         // query for commits in the PR
    Iterations = 32,      // query for iterations (and changes) in the PR
    Attachments = 64,     // query for pull request attachments
    Statuses = 128,       // query for pull request statuses
    Labels = 256,         // query for pull request labels
    Permissions = 512,
    PermissionBypass = 1024,
    TeamExpansionEnabled = 2048,
    All = BranchStatus | Policy | WorkItems | Follows | Commits | Iterations | Attachments | Statuses | Labels | Permissions | PermissionBypass | TeamExpansionEnabled // query everything
}

export class PullRequestActionCreator {

    private _gitRepositorySource: IGitRepositorySource;
    private _pullRequestDetailSource: IPullRequestDetailSource;
    private _gitPermissionsSource: GitPermissionsSource;

    constructor(
        private _workItemActionCreator: WorkItemActionCreator,
        private _discussionActionCreator: DiscussionActionCreator,
        private _codeExplorerActionCreator: CodeExplorerActionCreator,
        private _followActionCreator: FollowsActionCreator,
        private _conflictActionCreator: ConflictActionCreator,
        private _attachmentActionCreator: AttachmentActionCreator,
        private _pullRequestStatusActionCreator: PullRequestStatusActionCreator,
        private _sharePullRequestActionCreator: SharePullRequestActionCreator,
        private _pullRequestLabelsActionCreator: PullRequestLabelsActionCreator,
        private _completeMergeActionCreator: PullRequestCompleteMergeActionCreator,
        private _autoCompleteActionCreator: PullRequestAutoCompleteActionCreator,
        private _permissionsActionCreator: PullRequestPermissionsActionCreator,
        private _navigationActionCreator: NavigationActionCreator,
        private _clientPoliciesActionCreator: PullRequestClientPoliciesActionCreator,
        private _actionsHub: Actions.ActionsHub,
        private _storesHub: StoresHub,
        private _sourcesHub: SourcesHub) {

        this._pullRequestDetailSource = _sourcesHub.pullRequestDetailSource;
        this._gitRepositorySource = _sourcesHub.gitRepositorySource;
        this._gitPermissionsSource = _sourcesHub.gitPermissionsSource;
    }

    /**
     * Just update pull request details (not every dependent piece of the PR).
     * @param pullRequestId - The pull request ID to query data for.
     * @param refreshOptions - Specify which pieces of a pull request to requery for data.
     */
    public queryPullRequestDetail(pullRequestId: number, refreshOptions: PullRequestDetailRefreshOptions, initialLoad: boolean = false): void {
        const includeCommits = this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.Commits);

        this._actionsHub.pullRequestUpdating.invoke({ pullRequestId });

        if (includeCommits) {
            this._actionsHub.commitsUpdating.invoke({ pullRequestId });
        }

        this._pullRequestDetailSource.queryPullRequestAsync(pullRequestId, includeCommits)
            .then(pullRequest =>
                {
                    if (!pullRequest) {
                        this._actionsHub.pullRequestNotFound.invoke({ pullRequestId });
                        return Promise.resolve(null);
                    }

                    const permissionSetPromise = this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.Permissions)
                        ? this._permissionsActionCreator.updatePermissions(pullRequest)
                        : Promise.resolve(null) as IPromise<void>;

                    // get permissions before getting related objects so we only refresh objects that the user has permission to see
                    permissionSetPromise.then(() =>
                        {
                            this._firePullRequestUpdateAction(pullRequestId, pullRequest, includeCommits);

                            if (initialLoad) {
                                // update last visit on initial page load
                                this._navigationActionCreator.updateLastVisit(true);
                            }

                            // now query for additional data if necessary
                            this._refreshRelatedObjects(pullRequest, refreshOptions);
                        })
                        .then(undefined, (error) => {
                            this._handlePullRequestError(error, pullRequestId);
                        });
                })
            .then(undefined, (error) => {
                this._handlePullRequestError(error, pullRequestId);
            });
    }

    public queryBypassPermission(pullRequest: VCContracts.GitPullRequest): void {
        this._actionsHub.pullRequestBypassPermissionUpdated.invoke({
            canBypass: this._gitRepositorySource.queryBypassPermission(pullRequest.targetRefName)
        });
    }

    /**
     * Query for commits only if they have not already been loaded.
     * @param pullRequestId - The pull request ID to query data for.
     */
    public queryPullRequestCommits(pullRequestId: number): void {
        if (this._storesHub.pullRequestCommitsStore.shouldPopulate()) {
            this.queryPullRequestDetail(pullRequestId, PullRequestDetailRefreshOptions.Commits);
        }
    }

    private _hasFlag(option, optionToCheck) {
        return !!(option & optionToCheck);
    }

    public completePullRequest(
        pullRequest: VCContracts.GitPullRequest,
        completionOptions: VCContracts.GitPullRequestCompletionOptions,
    ): void {
        let refreshOptions: PullRequestDetailRefreshOptions = PullRequestDetailRefreshOptions.Policy;

        if (completionOptions && completionOptions.deleteSourceBranch) {
            refreshOptions = refreshOptions | PullRequestDetailRefreshOptions.BranchStatus;

            this._gitRepositorySource.invalidateRefsCache();
        }

        this._flushErrorNotifications();

        this._updatePullRequest(
            pullRequest.pullRequestId,
            {
                status: VCContracts.PullRequestStatus.Completed,
                completionOptions,
                lastMergeSourceCommit: pullRequest.lastMergeSourceCommit
            } as VCContracts.GitPullRequest,
            refreshOptions);
    }

    /**
     * Used by signalR to update the PR data without a query to the source.
     */
    public publishPullRequestDetail(pullRequestId: number, pullRequest: VCContracts.GitPullRequest, includeCommits: boolean): void {
        // if we don't have any reviewers we actually need to re-query for PR detail from the source
        // this is probably because the reviweer list is too long to pass via signalR
        if (!pullRequest) {
            return;
        }
        if (!pullRequest.reviewers) {
            this._pullRequestDetailSource.queryPullRequestAsync(pullRequestId, includeCommits).then(
                (pr) => {
                    this._firePullRequestUpdateAction(pullRequestId, pr, includeCommits);
                },
                (error) => {
                    this._handlePullRequestError(error, pullRequestId);
                }
            );
        } else {
            const loading = this._storesHub.pullRequestDetailStore.isLoading();
            const oldPullRequest = this._storesHub.pullRequestDetailStore.getPullRequestDetail();

            this._firePullRequestUpdateAction(pullRequestId, pullRequest, includeCommits);

            // if our PR has changed since our initial page load we need to update some things
            if (loading || oldPullRequest.mergeStatus !== pullRequest.mergeStatus) {
                this._refreshRelatedObjects(pullRequest, PullRequestDetailRefreshOptions.Policy);
            }
        }
    }

    /**
     * This triggers the PR update action, given a fully populated pull request.
     */
    private _firePullRequestUpdateAction(pullRequestId: number, pullRequest: VCContracts.GitPullRequest, includeCommits: boolean) {
        // pull request is ready to go
        this._actionsHub.pullRequestUpdated.invoke({pullRequest});

        // commits are ready to go
        if (includeCommits) {
            this._actionsHub.commitsUpdated.invoke({
                pullRequestId,
                commits: pullRequest.commits
            });
        }
    }

    public updatePullRequestAutoCompletion(
        pullRequestId: number,
        autoCompleteEnabled: boolean,
        completionOptions: VCContracts.GitPullRequestCompletionOptions,
        onError: (err) => void = null,
        onSuccess: (result) => void = null,
    ): void {

        let autoCompleterId: string;

        if (autoCompleteEnabled) {
            autoCompleterId = Context.getPageContext().webContext.user.id;
        }
        else {
            autoCompleterId = "00000000-0000-0000-0000-000000000000";
        }

        this._flushErrorNotifications();

        const onSuccessInternal = (result) => {
            if (autoCompleteEnabled) {
                this._autoCompleteActionCreator.getBlockingAutoCompletePolicies();
            }

            if (onSuccess) {
                onSuccess(result);
            }
        };

        this._updatePullRequest(
            pullRequestId,
            {
                autoCompleteSetBy: { id: autoCompleterId } as IdentityRef,
                completionOptions,
            } as VCContracts.GitPullRequest,
            PullRequestDetailRefreshOptions.Basic,
            onError,
            onSuccessInternal);
    }

    public abandonPullRequest(pullRequestId: number): void {
        this._flushErrorNotifications();
        this._updatePullRequest(
            pullRequestId,
            { status: VCContracts.PullRequestStatus.Abandoned } as VCContracts.GitPullRequest,
            PullRequestDetailRefreshOptions.Basic);
    }

    public reactivatePullRequest(pullRequestId: number): void {
        // Note: For fork PRs, reactivating the pull request will re-create the mirror fork source ref
        // so we want to make sure we queryBranchStatus before updating the pull request in the store.
        // This avoids a temporary moment where it would appear like the source branch is deleted.

        const updatedPR = { status: VCContracts.PullRequestStatus.Active } as VCContracts.GitPullRequest;
        this._pullRequestDetailSource.updatePullRequestAsync(pullRequestId, updatedPR)
            .then(
                pullRequest => {
                    this._actionsHub.pullRequestUpdating.invoke({ pullRequestId });
                    return this._getQueryBranchStatusPromise(pullRequest);
                })
            .then(
                pullRequest => {
                    this._actionsHub.pullRequestUpdated.invoke({ pullRequest });
                    this._refreshRelatedObjects(pullRequest, PullRequestDetailRefreshOptions.Policy);
                },
                error => this._raiseError(error));
    }

    public publishPullRequest = (pullRequestId: number): void => {
        this._flushErrorNotifications();
        this._updatePullRequest(
            pullRequestId,
            { isDraft: false } as VCContracts.GitPullRequest,
            PullRequestDetailRefreshOptions.Basic);
    }

    public unpublishPullRequest = (pullRequestId: number): void => {
        this._flushErrorNotifications();
        this._updatePullRequest(
            pullRequestId,
            { isDraft: true } as VCContracts.GitPullRequest,
            PullRequestDetailRefreshOptions.Basic);
    }

    @autobind
    public retryMergePullRequest(pullRequestId: number): void {
        this._actionsHub.pullRequestMergeRestarted.invoke(null);

        this._updatePullRequest(
            pullRequestId,
            { mergeStatus: VCContracts.PullRequestAsyncStatus.Queued } as VCContracts.GitPullRequest,
            PullRequestDetailRefreshOptions.Basic,
            null,
            (result) => this._actionsHub.pullRequestRestartMergeSucceeded.invoke(null));
    }

    @autobind
    public performPolicyAction(actionId: string, actionArg: any) {
        switch (actionId) {
            case Actions.PolicyActions.POLICY_ACTION_RETRY_MERGE:
                this.retryMergePullRequest(actionArg as number);
                return;

            case Actions.PolicyActions.POLICY_ACTION_REQUEUE_POLICY:
                this._clientPoliciesActionCreator.requeuePolicyEvaluation(actionArg as string);
                return;

            default:
                Debug.fail("Unknown actionId " + actionId);
                return;
        }
    }

    public savePullRequestTitle(
        pullRequestId: number,
        newTitle: string): void {
        this._updatePullRequest(
            pullRequestId,
            { title: newTitle } as VCContracts.GitPullRequest,
            PullRequestDetailRefreshOptions.Basic);
    }

    public savePullRequestDescription(
        pullRequestId: number,
        newDescription: string): void {
        this._updatePullRequest(
            pullRequestId,
            { description: newDescription } as VCContracts.GitPullRequest,
            PullRequestDetailRefreshOptions.Basic);
    }

    public updatePullRequestPendingDescription(newDescription: string) {
        this._actionsHub.pullRequestPendingDescriptionUpdated.invoke(newDescription);
    }

    public savePullRequestDescriptionWithAttachments(
        pullRequestId: number,
        newDescription: string,
        onError: () => void): void {

        this._attachmentActionCreator.commitAttachments(newDescription).then(
            replacementMap => {
                for (const oldUrl in replacementMap) {
                    newDescription = newDescription.replace(new RegExp(oldUrl, 'g'), replacementMap[oldUrl]);
                }
                this._updatePullRequest(
                    pullRequestId,
                    { description: newDescription } as VCContracts.GitPullRequest,
                    PullRequestDetailRefreshOptions.Basic,
                    onError);
            },
            error => {
                if (onError) {
                    onError();
                }
            }
        );
    }

    @autobind
    public favoriteBranch(refName: string): void {
        this._sourcesHub.refFavorite.addToFavorites(refName, false).then(
            newRefFavorite =>
                this._actionsHub.branchFavorited.invoke({
                    newRefFavorite,
                }),
            this._raiseError);
    }

    @autobind
    public unfavoriteBranch(favoriteId: number): void {
        this._sourcesHub.refFavorite.removeFromFavorites(favoriteId).then(
            () =>
                this._actionsHub.branchUnfavorited.invoke({
                    favoriteId,
                }),
            this._raiseError);
    }

    public sharePullRequest(
        pullRequestId: number,
        message: string,
        receivers: string[],
        onSuccess: (result) => void,
        onError: (error) => void) {
        const identities: IdentityRef[] = receivers.map(strId => { return { id: strId } as IdentityRef; });
        this._pullRequestDetailSource.sharePullRequest(pullRequestId, message, identities)
            .then(onSuccess, onError);
    }

    @autobind
    public retargetPullRequest(targetRefName: string): void {
        let pr = this._storesHub.pullRequestDetailStore.getPullRequestDetail();
        let sourceRepoContext = this._storesHub.pullRequestDetailStore.getSourceRepositoryContext();
        let targetRepoContext = this._storesHub.pullRequestDetailStore.getTargetRepositoryContext();
        let tfsContext = this._storesHub.contextStore.getTfsContext();

        this._actionsHub.pullRequestTargetChanging.invoke(null);

        this._pullRequestDetailSource.getExistingPullRequest(targetRepoContext.getRepositoryId(), sourceRepoContext.getRepositoryId(), pr.sourceRefName, targetRefName).then(existingPr => {
            if(existingPr) {
                this._actionsHub.raiseNotification.invoke({
                    message: null,
                    type: NotificationType.error,
                    specialType: NotificationSpecialTypes.existingPullRequest,
                    specialContent: {
                        pullRequestId: existingPr.pullRequestId,
                        repository: existingPr.repository,
                        tfsContext
                    },
                });
                this._actionsHub.pullRequestTargetChangedError.invoke(null);
            }
            else {
                this._pullRequestDetailSource.updatePullRequestAsync(pr.pullRequestId, { targetRefName } as VCContracts.GitPullRequest).then(
                    result => {
                        this._actionsHub.pullRequestUpdated.invoke({ pullRequest: result });
                        this._actionsHub.pullRequestTargetChanged.invoke(null);
                        
                        let refreshOptions = PullRequestDetailRefreshOptions.BranchStatus |
                            PullRequestDetailRefreshOptions.Policy |
                            PullRequestDetailRefreshOptions.Commits |
                            PullRequestDetailRefreshOptions.Iterations |
                            PullRequestDetailRefreshOptions.Statuses |
                            PullRequestDetailRefreshOptions.Permissions;
                        this._refreshRelatedObjects(result, refreshOptions, true);
                    },
                    (error) => {
                        this._actionsHub.pullRequestTargetChangedError.invoke(null);
                        this._raiseError(error);
                    }
                );
            }
        }).then(undefined, error => {
            this._raiseError(error);
        });
    }

    private _updatePullRequest(
        pullRequestId: number,
        updatedPR: VCContracts.GitPullRequest,
        refreshOptions: PullRequestDetailRefreshOptions,
        onError: (err) => void = null,
        onSuccess: (result) => void = null,
    ): void {
        this._pullRequestDetailSource.updatePullRequestAsync(pullRequestId, updatedPR).then(
            result => {
                this._actionsHub.pullRequestUpdated.invoke({ pullRequest: result });

                this._refreshRelatedObjects(result, refreshOptions);
                if (onSuccess) {
                    onSuccess(result);
                }
            },
            (error) => {
                if (onError) {
                    onError(error);
                }
                this._raiseError(error);
            }
        );
    }

    private _flushErrorNotifications() {
        this._actionsHub.notificationsFlushed.invoke({ type: NotificationType.error });
    }

    private _refreshRelatedObjects(
        pullRequest: VCContracts.GitPullRequest,
        refreshOptions: PullRequestDetailRefreshOptions,
        switchToLatestIteration?: boolean
    ): void {
        const pullRequestId: number = pullRequest && pullRequest.pullRequestId;

        if (!pullRequestId || pullRequestId <= 0) {
            return;
        }

        let branchStatusPromise: IPromise<void> = null;
        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.BranchStatus)) {
            // trigger a branch status update
            branchStatusPromise = this.queryBranchStatus(pullRequest);
        }
        else {
            branchStatusPromise = Q.resolve(null)
        }

        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.Policy)) {
            // trigger autocomplete policies update
            this._autoCompleteActionCreator.getBlockingAutoCompletePolicies();
            // trigger a policy update
            this._clientPoliciesActionCreator.queryPolicyEvaluations();
        }

        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.WorkItems)) {
            // trigger a work item update (and refresh the transitions if complete PR permission is present)
            this._workItemActionCreator.updateAssociatedWorkItems(pullRequestId);
        }

        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.Statuses)) {
            // trigger a statuses update
            this._pullRequestStatusActionCreator.queryPolicyStatusesAsync(pullRequestId);
            // load statuses contributions
            this._pullRequestStatusActionCreator.queryStatusesContributions();
        }

        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.Labels)) {
            // load in Labels
            this._pullRequestLabelsActionCreator.queryLabelsAsync(pullRequestId);
        }

        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.Iterations)) {
            // trigger a iteration update - force update from server if this PR does not support iterations
            // since the one-and-only iteration needs to be updated (and not pulled from the cache)
            this._codeExplorerActionCreator.queryIterations(!pullRequest.supportsIterations, switchToLatestIteration);
        }

        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.Follows) && this._storesHub.permissionsStore.getPermissions().follow) {
            // trigger a follow subscription update
            this._followActionCreator.queryFollowSubscription(pullRequest.artifactId);
        }

        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.Attachments)) {
            this._attachmentActionCreator.queryAttachments();
        }

        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.Permissions)) {
            // if updating permissions and branches, make sure branches has resolved so that we're fetching the right permissions
            branchStatusPromise.then(() => {
                this._permissionsActionCreator.updatePermissions(pullRequest)
            });
        }

        // Update conflict records. Note that this will not round-trip to the server unless
        // necessary, ie, merge status is Conflicts, merged commits have changed, conflicts not already loaded, etc.
        this._conflictActionCreator.updatePullRequestConflicts(pullRequest);

        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.PermissionBypass)) {
            this.queryBypassPermission(pullRequest);
        }

        if (this._hasFlag(refreshOptions, PullRequestDetailRefreshOptions.TeamExpansionEnabled)) {
            this._sharePullRequestActionCreator.queryTeamExpansionEnabled();
        }
    }

    public queryBranchStatus(pullRequest: VCContracts.GitPullRequest): IPromise<void> {
        return this._getQueryBranchStatusPromise(pullRequest)
            .then(() => {
                if (this._storesHub.permissionsStore.getPermissions().viewFavorites &&
                    this._storesHub.refFavoritesStore.state.canFavorite) {
                    this._getQueryBranchesFavorite(pullRequest).then(undefined, this._raiseError);
                }
            })
            .catch(this._raiseError);
    }

    public deleteSourceRef(pullRequest: VCContracts.GitPullRequest): void {
        const sourceRepositoryId = pullRequest.forkSource ? pullRequest.forkSource.repository.id : pullRequest.repository.id;
        const sourceRef =  pullRequest.forkSource ? pullRequest.forkSource.name : pullRequest.sourceRefName;
        this._gitRepositorySource.deleteRef(
            sourceRepositoryId,
            pullRequest.lastMergeSourceCommit.commitId,
            sourceRef)
            .then(result => {
                this._actionsHub.deleteRefCompleted.invoke({
                    pullRequestId: pullRequest.pullRequestId,
                    success: result.success,
                    message: result.customMessage
                });

                return result.success;
            })
            .then((deleteSucceeded) => {
                // re-query PR and branch status if source is deleted
                if (deleteSucceeded) {
                    this.queryPullRequestDetail(pullRequest.pullRequestId, PullRequestDetailRefreshOptions.BranchStatus);
                }
            })
            .then(undefined, this._raiseError);
    }

    public traceError(error: Error, component: string) {
        if (error) {
            traceError(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.PULL_REQUEST_DETAILS_FEATURE,
                component,
                error
            );
        }
    }

    private _getQueryBranchStatusPromise(pullRequest: VCContracts.GitPullRequest): Q.Promise<VCContracts.GitPullRequest> {
        this._actionsHub.branchStatusUpdating.invoke(null);

        return Q.all([
            this._gitRepositorySource.checkBranchStatusAsync(pullRequest.sourceRefName, pullRequest.lastMergeSourceCommit && pullRequest.lastMergeSourceCommit.commitId),
            this._gitRepositorySource.checkBranchStatusAsync(pullRequest.targetRefName, pullRequest.lastMergeTargetCommit && pullRequest.lastMergeTargetCommit.commitId),
            this._pullRequestDetailSource.querySourceRefStatusAsync(pullRequest),
            this._gitRepositorySource.queryRepositoryUseLimitedRef(),
        ]).then(([sourceBranchStatus, targetBranchStatus, sourceRefStatus, useLimitedRef]) => {
            const branchStatus = new VCPullRequest.PullRequestBranchStatus(pullRequest, sourceBranchStatus, targetBranchStatus);
            sourceRefStatus.hasPermissionToDelete = this._storesHub.permissionsStore.getPermissions().deleteSourceBranch;
            this._actionsHub.branchStatusUpdated.invoke({ branchStatus, sourceRefStatus });
            this._actionsHub.pullRequestDetailUpdated.invoke({
                pullRequestDetail: this._storesHub.pullRequestDetailStore.getPullRequestDetail(),
                canFavorite: useLimitedRef,
            });
            return pullRequest;
        });
    }

    private _getQueryBranchesFavorite(pullRequest: VCContracts.GitPullRequest): IPromise<void> {
        const filterNames = [pullRequest.targetRefName];
        if (!pullRequest.forkSource) {
            filterNames.push(pullRequest.sourceRefName);
        }

        return this._sourcesHub.refFavorite.getRefFavorites(filterNames)
            .then(refFavorites => {
                this._actionsHub.branchesFavoriteUpdated.invoke({ refFavorites });
            });
    }

    private _handlePullRequestError = (error, pullRequestId: number): void => {
        if (error && error.status === 404) {
            // speical error condition for display purposes
            this._actionsHub.pullRequestNotFound.invoke({ pullRequestId });
            return;
        }

        this._actionsHub.pullRequestUpdateError.invoke({ error });
        this._raiseError(error);
    }

    /**
     * Raise an application error. This could be a typical JS error or some text.
     */
    private _raiseError = (error): void => {
        this._actionsHub.raiseError.invoke(error);
    }
}
