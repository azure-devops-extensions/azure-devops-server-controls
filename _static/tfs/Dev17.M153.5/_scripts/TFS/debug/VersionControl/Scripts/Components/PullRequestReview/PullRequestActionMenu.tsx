import React = require("react");
import Utils_String = require("VSS/Utils/String");

// used to fire actions from our UI components
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

// stores
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { PolicyCount } from "VersionControl/Scripts/Stores/PullRequestReview/PolicyCount";
import { PullRequestPermissions } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestPermissionsStore";

// contracts and controls
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import {TfsContext} from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import VCPullRequest = require("VersionControl/Scripts/TFS.VersionControl.PullRequest");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { PullRequestFollowStatus } from "VersionControl/Scripts/PullRequestFollowStatus";
import { IPullRequestActions, PullRequestCompleteButton } from "VersionControl/Scripts/Components/PullRequestReview/PullRequestCompleteButton";
import { CompleteMergeDialog } from "VersionControl/Scripts/Components/PullRequestReview/CompleteMergeDialog";
import { PullRequestEllipsisMenu, IPullRequestEllipsisButton } from "VersionControl/Scripts/Components/PullRequestReview/PullRequestEllipsisMenu";

import * as AsyncRefOperationActionCreator from "VersionControl/Scripts/Actions/AsyncGitOperation/AsyncRefOperationActionCreator";
import { OperationCompletedProps } from "VersionControl/Scripts/Components/AsyncGitOperation/AsyncGitOperationTracker";
import { AsyncRefOperationControllerView, IAsyncRefOperationData, IAsyncRefOperationTelemetry } from "VersionControl/Scripts/Components/AsyncGitOperation/AsyncRefOperationControllerView";
import * as Telemetry from "VSS/Telemetry/Services";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { AsyncRefOperationType } from "VersionControl/Scripts/Actions/AsyncGitOperationActions";
import { IButton, PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from 'OfficeFabric/Dialog';

export interface IPullRequestActionBarState {
    hasRejectedPolicies: boolean;
    policyCount: PolicyCount;
    policiesAreLoading: boolean;
    workItems: number[];
    showCompleteDialog: boolean;
    useAutoComplete: boolean;
    liveUpdateEnabled: boolean;
    transitionWorkItemsIsEnabled: boolean;
    pullRequest: IPullRequest;
    repositoryContext: RepositoryContext;
    tfsContext: TfsContext;
    followStatus: PullRequestFollowStatus;
    reviewerItems: ReviewerItem[];
    isVotePrimaryAction: boolean;
    permissions: PullRequestPermissions;
    draftFeatureIsEnabled: boolean;
    showResetVotesDialog : boolean;
}

/**
 * The right side drop down buttons that complete PRs.
 */
export class PullRequestActionMenuContainer extends React.Component<null, IPullRequestActionBarState> {

    private _moreActionsButton: IPullRequestEllipsisButton;

    constructor(props: null) {
        super(props);
        this._handleCompleteMergeResult = this._handleCompleteMergeResult.bind(this);
        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        const pullRequest = this.state.pullRequest;
        const repositoryContext = this.state.repositoryContext as GitRepositoryContext;

        return (
            <div className="vc-pullrequest-action-bar">
                {this._createActionButton()}
                <PullRequestEllipsisMenu
                    pullRequest={pullRequest}
                    followStatus={this.state.followStatus}
                    repositoryContext={repositoryContext}
                    reviewerItems={this.state.reviewerItems}
                    tfsContext={this.state.tfsContext}
                    commitAllComments={Flux.instance().actionCreator.discussionActionCreator.commitAllComments}
                    follow={Flux.instance().actionCreator.followsActionCreator.follow}
                    unfollow={Flux.instance().actionCreator.followsActionCreator.unfollow}
                    onViewCommit={Flux.instance().actionCreator.navigationActionCreator.viewCommit}
                    retryMergePullRequest={Flux.instance().actionCreator.pullRequestActionCreator.retryMergePullRequest}
                    mailSettingsEnabled={Flux.instance().actionCreator.followsActionCreator.isMailSettingsEnabled()}
                    liveUpdateEnabled={this.state.liveUpdateEnabled}
                    setLiveUpdate={Flux.instance().actionCreator.setLiveUpdate}
                    hasPermissionToAddComment={this.state.permissions.addEditComment}
                    hasPermissionToCherryPickRevert={this.state.permissions.cherryPickRevert}
                    hasPermissionToFollow={this.state.permissions.follow}
                    hasPermissionToRestartMerge={this.state.permissions.restartMerge}
                    hasPermissionToShare={this.state.permissions.share}
                    hasPermissionToLiveUpdate={this.state.permissions.liveUpdate}
                    componentRef={ref => this._moreActionsButton = ref} />
                {this.state.showCompleteDialog &&
                    <CompleteMergeDialog
                        autoComplete={this.state.useAutoComplete}
                        isOpen={this.state.showCompleteDialog}
                        transitionWorkItemsIsEnabled={this.state.transitionWorkItemsIsEnabled}
                        onResult={this._handleCompleteMergeResult} />
                }
                {this.state.showResetVotesDialog &&
                    /* Warn user that unpublishing will reset all votes */
                    <Dialog
                        hidden={false}
                        onDismiss={() => { this._unpublishDialogClosed(false); }}
                        dialogContentProps={{
                            type: DialogType.normal,
                            title: VCResources.PullRequest_ResetVotesOnDraft_Warning_Title,
                            subText: VCResources.PullRequest_ResetVotesOnDraft_Warning_Text,
                        }}
                        modalProps={{
                            isBlocking: true,
                            containerClassName: 'vc-dialog'
                        }}
                    >
                        <DialogFooter>
                            <PrimaryButton onClick={() => { this._unpublishDialogClosed(true); }} text={VCResources.OKLabel} />
                            <DefaultButton onClick={() => { this._unpublishDialogClosed(false); }} text={VCResources.Cancel} />
                        </DialogFooter>
                    </Dialog>
                }
                <AsyncRefOperationControllerView
                    pullRequest = {pullRequest}
                    repositoryContext={repositoryContext}
                    operationCompletedProps={this._getPrCreationProps()}/>
            </div>);
    }

    public componentDidMount(): void {
        Flux.instance().storesHub.clientPolicyEvaluationStore.addChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.navigationStore.addChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.featureAvailabilityStore.addChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.contextStore.addChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.followsStore.addChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.reviewersStore.addChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._onStoresChanged);
    }

    public componentWillUnmount(): void {
        Flux.instance().storesHub.clientPolicyEvaluationStore.removeChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.navigationStore.removeChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.featureAvailabilityStore.removeChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.contextStore.removeChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.followsStore.removeChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.reviewersStore.removeChangedListener(this._onStoresChanged);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._onStoresChanged);
    }

    public componentWillUpdate(nextProps: null, nextState: IPullRequestActionBarState): void {
        const pullRequest = this.state.pullRequest;

        if (nextState.pullRequest.status === VCContracts.PullRequestStatus.Completed &&
            pullRequest.status === VCContracts.PullRequestStatus.Active) {

                // If the user just completed the pull request the Complete button will disappear from the UI
                // and the focus will move to the Body of the document.  We need to force the focus back to the Action Menu
                // in this scenario.

                if (this._moreActionsButton && document.body === document.activeElement) {
                    this._moreActionsButton.focus();
                }
        }
    }

    private _createActionButton(): JSX.Element {
        const pullRequest = this.state.pullRequest;
        const isCTA = !this.state.isVotePrimaryAction;

        if (pullRequest.status === VCContracts.PullRequestStatus.Active) {
            const branchStatus = pullRequest.branchStatusContract();

            if ((branchStatus && branchStatus.sourceBranchStatus && branchStatus.sourceBranchStatus.isDeleted)
                || (branchStatus && branchStatus.targetBranchStatus && branchStatus.targetBranchStatus.isDeleted)
            ) {
                return this._createAbandonButton();
            }

            if (pullRequest.externallyMerged) {
                return this._createCloseButon();
            }

            const policyCount = this.state.policyCount;
            const canAutoComplete = !!(policyCount && policyCount.totalPolicies);
            const hasRejectedPolicies = this.state.hasRejectedPolicies;

            const isAutoCompleteSet = (pullRequest.autoCompleteSetBy
                && !Utils_String.isEmptyGuid(pullRequest.autoCompleteSetBy.id));

            const completionDisabledReason = this._completionDisabledReason();

            // show the split button
            return (
                <PullRequestCompleteButton
                    canAutoComplete={canAutoComplete}
                    completionDisabledReason={completionDisabledReason}
                    isAutoCompleteSet={isAutoCompleteSet}
                    isDraft={pullRequest.isDraft}
                    draftFeatureIsEnabled={this.state.draftFeatureIsEnabled}
                    hasRejectedPolicies={hasRejectedPolicies}
                    isCTA={isCTA}
                    hasPermissionToAbandonReactivate={this.state.permissions.abandonReactivate}
                    hasPermissionToCancelAutoComplete={this.state.permissions.cancelAutoComplete}
                    hasPermissionToComplete={this.state.permissions.complete}
                    hasPermissionToPublishUnpublish={this.state.permissions.publishUnpublish}
                    pullRequestActions={{
                        abandonPullRequest: this._abandonPullRequest,
                        cancelAutoComplete: this._cancelAutoComplete,
                        setAutoComplete: this._setAutoComplete,
                        publish: this._publishPullRequest,
                        unpublish: this._unpublishPullRequestBegin,
                        completePullRequest: this._completePullRequest,
                    } as IPullRequestActions}
            />);
        }
        else if (pullRequest.canReactivate) {
            return this._createReactivateButton();
        }
        else if (pullRequest.status === VCContracts.PullRequestStatus.Completed) {
            return this._createDeleteSourceBranchButton();
        }
    }

    private _completionDisabledReason(): string {
        if (this.state.policiesAreLoading) {
            return VCResources.PullRequest_MergePolicies_CheckingPolicies;
        }

        const pullRequest: VCContracts.GitPullRequest = this.state.pullRequest.pullRequestContract();
        const branchStatus: VCPullRequest.IPullRequestBranchStatus = this.state.pullRequest.branchStatusContract();

        if (!pullRequest || !branchStatus) {
            return null;
        }

        if (!!pullRequest.isDraft) {
            return null;
        }

        if (pullRequest.mergeStatus === VCContracts.PullRequestAsyncStatus.Conflicts) {
            return VCResources.PullRequest_CannotComplete_MergeConflicts;
        }

        if (this.state.pullRequest.isMerging) {
            return VCResources.PullRequest_CannotComplete_MergeInProgress;
        }

        return null;
    }

    private _createCloseButon(): JSX.Element {
        return this.state.permissions.complete &&
            <button className="bowtie-widget btn-cta vc-pullrequest-action-button" onClick={this._completePullRequest}>
                {VCResources.PullRequest_ClosePullRequest}
            </button>;
    }

    private _createAbandonButton(): JSX.Element {
        return this.state.permissions.abandonReactivate &&
            <button className="bowtie-widget btn-cta vc-pullrequest-action-button" onClick={this._abandonPullRequest}>
                {VCResources.PullRequest_AbandonPullRequest}
            </button>;
    }

    private _createReactivateButton(): JSX.Element {
        return this.state.permissions.abandonReactivate &&
            <button className="bowtie-widget btn-cta vc-pullrequest-action-button" onClick={this._reactivatePullRequest}>
                {VCResources.PullRequest_ReactivatePullRequest}
            </button>;
    }

    private _createDeleteSourceBranchButton(): JSX.Element {
        const pullRequest = this.state.pullRequest;

        return this.state.permissions.deleteSourceBranch &&
            <button type="button"
                className={pullRequest.canDeleteSourceBranch ? "bowtie-widget btn-cta vc-pull-request-action-button" : "bowtie-widget"}
                key="deleteSourceBranch"
                disabled={!pullRequest.canDeleteSourceBranch}
                title={!pullRequest.canDeleteSourceBranch ? pullRequest.cannotDeleteReasonHint : null}
                onClick={() =>
                    Flux.instance().actionCreator.pullRequestActionCreator.deleteSourceRef(pullRequest.pullRequestContract())} >
                {VCResources.PullRequest_DeleteSourceBranch}
            </button>;
    }

    private _completePullRequest = () => {
        const pullRequest = this.state.pullRequest;

        if (pullRequest.externallyMerged) {
            // Already merged; skip the merge dialog and mark the PR completed
            Flux.instance().actionCreator.pullRequestActionCreator.completePullRequest(
                pullRequest.pullRequestContract(),
                {} as VCContracts.GitPullRequestCompletionOptions
            );
        }
        else {
            // fire an action to query for branch status again
            Flux.instance().actionCreator.pullRequestActionCreator.queryBranchStatus(pullRequest.pullRequestContract());

            // also query again for work item transitions (work items may have changed since the last time we opened this dialog)
            Flux.instance().actionCreator.workItemActionCreator.queryAssociatedWorkItemTransitions(this.state.workItems);

            Flux.instance().actionCreator.completeMergeActionCreator.openCompleteMergeDialog();
            this.setState((prevState, props) => {
                const nextState = { ...prevState };
                nextState.showCompleteDialog = true;
                nextState.useAutoComplete = false;
                return nextState;
            });
        }
    }

    private _handleCompleteMergeResult = (completionOptions?: VCContracts.GitPullRequestCompletionOptions) => {
        const pullRequest = this.state.pullRequest;

        this.setState((prevState, props) => {
            const nextState = { ...prevState };
            nextState.showCompleteDialog = false;
            return nextState;
        })

        if (completionOptions) {
            if (this.state.useAutoComplete) {
                completionOptions.bypassPolicy = false;
                Flux.instance().actionCreator.pullRequestActionCreator.updatePullRequestAutoCompletion(
                    pullRequest.pullRequestId,
                    true,
                    completionOptions);
            }
            else {
                Flux.instance().actionCreator.pullRequestActionCreator.completePullRequest(pullRequest.pullRequestContract(), completionOptions);
            }
        }
    }

    private _abandonPullRequest = (): void => {
        const pullRequest = this.state.pullRequest;
        this._publishTelemetry(CustomerIntelligenceConstants.PullRequestActionMenuOption.Abandon);
        Flux.instance().actionCreator.pullRequestActionCreator.abandonPullRequest(pullRequest.pullRequestId);
    }

    private _reactivatePullRequest = (): void => {
        const pullRequest = this.state.pullRequest;
        Flux.instance().actionCreator.pullRequestActionCreator.reactivatePullRequest(pullRequest.pullRequestId);
    }

    private _publishPullRequest = (): void => {
        const pullRequest = this.state.pullRequest;
        Flux.instance().actionCreator.pullRequestActionCreator.publishPullRequest(pullRequest.pullRequestId);
    }

    private _unpublishPullRequestBegin = (): void => {
        if (!this.state.draftFeatureIsEnabled) {
            return;
        }

        // User wants to unpublish. If this would reset votes, first warn them in a dialog.

        if (this.state.reviewerItems.some(r => r.hasVote)) // some people have voted
        {
            this.setState((prevState, props): IPullRequestActionBarState => ({
                ...prevState,
                showResetVotesDialog: true,
            }));

            return;
        }

        this._unpublishPullRequest();
    }

    private _unpublishDialogClosed = (confirmUnpublish: boolean): void => {
        this.setState((prevState, props): IPullRequestActionBarState => ({
            ...prevState,
            showResetVotesDialog: false,
        }));

        if (confirmUnpublish) {
            this._unpublishPullRequest();
        }
    }

    private _unpublishPullRequest = (): void => {
        const pullRequest = this.state.pullRequest;
        Flux.instance().actionCreator.pullRequestActionCreator.unpublishPullRequest(pullRequest.pullRequestId);
    }

    private _setAutoComplete = () => {
        Flux.instance().actionCreator.completeMergeActionCreator.openCompleteMergeDialog();
        this.setState((prevState, props) => {
            const nextState = { ...prevState };
            nextState.showCompleteDialog = true;
            nextState.useAutoComplete = true;
            return nextState;
        })
    }

    private _getPrCreationProps(): OperationCompletedProps {
        return {
            primaryButtonText: VCResources.PullRequest_CreatePullRequestTitle,
            defaultButtonText: VCResources.AsyncGitOperationTracker_Close,
        };
    }

    private _cancelAutoComplete = () => {
        const pullRequest = this.state.pullRequest;

        Flux.instance().actionCreator.pullRequestActionCreator.updatePullRequestAutoCompletion(
            pullRequest.pullRequestId,
            false,
            pullRequest.pullRequestContract().completionOptions);
    }

    private _publishTelemetry = (option: CustomerIntelligenceConstants.PullRequestActionMenuOption) => {
        const pullRequest = this.state.pullRequest;

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_ACTION_DROP_MENU_ACTION,
            {
                menuOption: option,
                pullRequestId: pullRequest.pullRequestId,
            }));
    }

    private _onStoresChanged = () => {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): IPullRequestActionBarState {
        const policiesAreLoading = Flux.instance().storesHub.clientPolicyEvaluationStore.isLoading();
        const policiesState = Flux.instance().storesHub.clientPolicyEvaluationStore.state;
        const hasRejectedPolicies = policiesState.hasRejectedBlockingPolicies;
        const policyCount = { totalPolicies: policiesState.clientPolicyEvaluations.length } as PolicyCount;

        return {
            policiesAreLoading,
            hasRejectedPolicies,
            policyCount,
            workItems: Flux.instance().storesHub.relatedWorkItemsStore.getWorkItems(),
            showCompleteDialog: this.state ? this.state.showCompleteDialog : false,
            useAutoComplete: this.state ? this.state.useAutoComplete : false,
            liveUpdateEnabled: Flux.instance().storesHub.navigationStore.getIsLiveUpdateEnabled(),
            transitionWorkItemsIsEnabled: true,
            pullRequest: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail(),
            repositoryContext: Flux.instance().storesHub.contextStore.getRepositoryContext(),
            tfsContext: Flux.instance().storesHub.contextStore.getTfsContext(),
            followStatus: Flux.instance().storesHub.followsStore.getFollowStatus(),
            reviewerItems: Flux.instance().storesHub.reviewersStore.getReviewers(),
            isVotePrimaryAction: Flux.instance().storesHub.reviewersStore.isVotePrimaryAction(),
            permissions: Flux.instance().storesHub.permissionsStore.getPermissions(),
            draftFeatureIsEnabled: Flux.instance().storesHub.featureAvailabilityStore.getDraftPullRequestsIsEnabled(),
            showResetVotesDialog: this.state ? this.state.showResetVotesDialog : false,
        }
    }
}
