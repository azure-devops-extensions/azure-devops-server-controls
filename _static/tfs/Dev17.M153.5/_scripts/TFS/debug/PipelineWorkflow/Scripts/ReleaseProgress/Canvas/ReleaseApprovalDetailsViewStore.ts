import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { autobind } from "OfficeFabric/Utilities";

import { DeploymentAttemptStore } from "PipelineWorkflow/Scripts/ReleaseProgress/DeploymentAttempt/DeploymentAttemptStore";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { IReleaseApprovalsData, IReleaseApprovalItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import {
    ReleaseApprovalsActions,
    IUpdateApprovalCommentsPayload,
    IUpdateApprovalErrorMessagePayload,
    IUpdateApprovalPatchState,
    IUpdateIsDeferDeploymentEnabledPayload,
    IUpdateDeferDeploymentTimePayload,
    IUpdateWarningMessageForDeploymentAuthorization,
    IUpdateOverrideModeEnabledState,
    IEnableReassignMode
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalsActions";
import { ReleaseApprovalListHelperUtility, ReleaseApprovalPublishTelemetry, ReleaseApprovalPanelFeature } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseApprovalListHelperUtility";

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { ApprovalStatus, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import * as Utils_String from "VSS/Utils/String";

export interface IReleaseApprovalItemDetailsViewState extends IStoreState {
    approvalsData: IReleaseApprovalsData;
    deploymentAuthorizationAndWarningSucceeded: boolean;
}

export abstract class ReleaseApprovalDetailsViewStore extends StoreBase {

    public initialize(instanceId: string): void {

        this._currentState = {} as IReleaseApprovalItemDetailsViewState;
        this._state = {} as IReleaseApprovalItemDetailsViewState;

        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseApprovalsActions>(ReleaseApprovalsActions, instanceId);
        this._actionsHub.updateApprovalComments.addListener(this._onUpdateApprovalComments);
        this._actionsHub.updateApprovalErrorMessage.addListener(this._onUpdateApprovalErrorMessage);
        this._actionsHub.updateApprovalPatchState.addListener(this._onUpdateApprovalPatchState);
        this._actionsHub.updateIsDeferDeploymentEnabled.addListener(this._updateIsDeferDeploymentEnabled);
        this._actionsHub.updateDeferDeploymentTime.addListener(this._updateDeferDeploymentTime);
        this._actionsHub.updateWarningMessageForDeploymentAuthorization.addListener(this._handleUpdateWarningMessageForDeploymentAuthorization);
        this._actionsHub.updateOverrideModeEnabledState.addListener(this._handleUpdateOverrideEnabledState);
        this._actionsHub.enableReassignMode.addListener(this._handleEnableReassignMode);
        this._actionsHub.updateReassignErrorMessage.addListener(this._handleUpdateReassignErrorMessage);

        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, instanceId);
        this._releaseEnvironmentStore.addChangedListener(this._onDataStoreChanged);
        this._deploymentAttemptStore = StoreManager.GetStore<DeploymentAttemptStore>(DeploymentAttemptStore, instanceId);
        this._deploymentAttemptStore.addChangedListener(this._onDataStoreChanged);
        this._onDataStoreChanged();
    }

    protected disposeInternal(): void {
        this._actionsHub.updateApprovalComments.removeListener(this._onUpdateApprovalComments);
        this._actionsHub.updateApprovalErrorMessage.removeListener(this._onUpdateApprovalErrorMessage);
        this._actionsHub.updateApprovalPatchState.removeListener(this._onUpdateApprovalPatchState);
        this._actionsHub.updateIsDeferDeploymentEnabled.removeListener(this._updateIsDeferDeploymentEnabled);
        this._actionsHub.updateDeferDeploymentTime.removeListener(this._updateDeferDeploymentTime);
        this._actionsHub.updateWarningMessageForDeploymentAuthorization.removeListener(this._handleUpdateWarningMessageForDeploymentAuthorization);
        this._actionsHub.updateOverrideModeEnabledState.removeListener(this._handleUpdateOverrideEnabledState);
        this._actionsHub.enableReassignMode.removeListener(this._handleEnableReassignMode);
        this._actionsHub.updateReassignErrorMessage.removeListener(this._handleUpdateReassignErrorMessage);

        this._releaseEnvironmentStore.removeChangedListener(this._onDataStoreChanged);
        this._deploymentAttemptStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IReleaseApprovalItemDetailsViewState {
        return this._state;
    }

    public getReleaseId(): number {
        let releaseEnvironment = this._releaseEnvironmentStore.getEnvironment();
        return releaseEnvironment.releaseId;
    }

    public getReleaseEnvironment(): ReleaseEnvironment {
        let releaseEnvironment = this._releaseEnvironmentStore.getEnvironment();
        return releaseEnvironment;
    }

    @autobind
    private _handleUpdateOverrideEnabledState(payload: IUpdateOverrideModeEnabledState): void {
        if (payload && payload.approvalId && this._state.approvalsData.approvalItems) {
            let approvalItemToUpdateOverrideEnabledState = this._state.approvalsData.approvalItems.forEach((item: IReleaseApprovalItem, index: number) => {
                if (item.approval && item.approval.id === payload.approvalId) {
                    //  Found matching approval item

                    //  Toggling override mode for user to approve/reject/reassign
                    //  This will ensure that override box layout needs to show up or not
                    item.isOverrideModeEnabled = !!payload.isOverrideModeEnabled;

                    //  Toggling whether to show override button or not. OVerride button is not shown when override button is clicked
                    item.showOverrideButtonForApprovalItem = !payload.isOverrideModeEnabled;

                    //  Clearing out all view state if close (X) button is pressed
                    //  This is done by taking the approval item from _currentState and replacing _state's approval item with that data
                    if (!payload.isOverrideModeEnabled) {
                        let defaultApprovalItem = this._getApprovalItem(this._currentState.approvalsData.approvalItems, payload.approvalId);
                        this._state.approvalsData.approvalItems[index] = JQueryWrapper.extendDeep({}, defaultApprovalItem);
                    }
                }
            });

            this.emitChanged();
        }
    }

    @autobind
    private _handleEnableReassignMode(payload: IEnableReassignMode): void {
        if (payload && payload.approvalId) {
            let approvalItem = this._getApprovalItem(this._state.approvalsData.approvalItems, payload.approvalId);
            if (approvalItem) {
                approvalItem.showReassign = payload.isEnabled;
                approvalItem.reassignErrorMessage = Utils_String.empty;
                this.emitChanged();
            }
        }
    }

    @autobind
    private _handleUpdateReassignErrorMessage(payload: IUpdateApprovalErrorMessagePayload): void {
        if (payload && payload.approvalId) {
            let approvalItems = this._state.approvalsData.approvalItems;
            let approvalItem = this._getApprovalItem(approvalItems, payload.approvalId);

            if (approvalItem) {
                approvalItem.reassignErrorMessage = payload.errorMessage;
                this.emitChanged();
            }
        }

    }

    @autobind
    private _updateIsDeferDeploymentEnabled(updateIsDeferDeploymentEnabledPayload: IUpdateIsDeferDeploymentEnabledPayload): void {

        let approvalItems = this._state.approvalsData.approvalItems;
        let approvalItem = this._getApprovalItem(approvalItems, updateIsDeferDeploymentEnabledPayload.approvalId);

        if (approvalItem) {
            approvalItem.deferDeploymentProps.isDeferDeploymentEnabled = updateIsDeferDeploymentEnabledPayload.enabled;
            this.emitChanged();
        }
    }

    private _handleDismissWarningMessage(approvalId: number) {
        let approvalItems = this._state.approvalsData.approvalItems;

        let approvalItemToDismissWarningMessage = this._getApprovalItem(approvalItems, approvalId);
        approvalItemToDismissWarningMessage.warningMessage = Utils_String.empty;
    }

    @autobind
    private _handleUpdateWarningMessageForDeploymentAuthorization(payload: IUpdateWarningMessageForDeploymentAuthorization) {
        let approvalItems = this._state.approvalsData.approvalItems;

        if (payload) {
            if (payload.dismissWarningMessage) {
                this._handleDismissWarningMessage(payload.approvalId);
            }
            else {
                if (payload.subscriptionNames && payload.approvalId) {
                    if (payload.subscriptionNames && RMUtilsCore.ArrayHelper.hasItems(payload.subscriptionNames)) {
                        const message: string = Utils_String.localeFormat(Resources.DeploymentAuthorizationRequiredFor, payload.subscriptionNames.join(","));
                        approvalItems.map((approvalItem: IReleaseApprovalItem, index: number) => {
                            if (approvalItem.approval) {
                                //  We can only execute OBO on non-merged approvals
                                //  If an approval was merged for UI sake, in-sequence mode, then approval does not exist in approval item
                                //  Refer to ReleaseApprovalListHelper getApprovalItems() code for more information
                                if (approvalItem.approval.id === payload.approvalId) {
                                    approvalItems[index].warningMessage = message;
                                }

                                this._publishTelemetryForOBO(!!approvalItems[index].isOverrideModeEnabled);
                            }
                        });

                        //  Set deployment auth and warning succeeded and to not do 
                        //  these calls again when panel is re-opened.
                        this._state.deploymentAuthorizationAndWarningSucceeded = true;
                        this.emitChanged();
                    }
                }
            }
            this.emitChanged();
        }
    }

    @autobind
    private _updateDeferDeploymentTime(updateDeferDeploymentTimePayload: IUpdateDeferDeploymentTimePayload): void {

        let approvalItems = this._state.approvalsData.approvalItems;
        let approvalItem = this._getApprovalItem(approvalItems, updateDeferDeploymentTimePayload.approvalId);

        if (approvalItem) {
            approvalItem.deferDeploymentProps.scheduledDeploymentTime = updateDeferDeploymentTimePayload.time;
            approvalItem.deferDeploymentProps.errorMessage = ReleaseApprovalListHelperUtility.isGivenTimeInFuture(updateDeferDeploymentTimePayload.time) ? Utils_String.empty : Resources.DeferredDateShouldBeInFutureText;
            this.emitChanged();
        }
    }

    @autobind
    private _onUpdateApprovalComments(updateApprovalCommentsPayload: IUpdateApprovalCommentsPayload): void {

        let approvalItems = this._state.approvalsData.approvalItems;
        let approvalItem = this._getApprovalItem(approvalItems, updateApprovalCommentsPayload.approvalId);

        if (approvalItem) {
            approvalItem.comments = updateApprovalCommentsPayload.comments;
            this.emitChanged();
        }
    }

    @autobind
    private _onUpdateApprovalPatchState(updateApprovalPatchState: IUpdateApprovalPatchState): void {

        let approvalItems = this._state.approvalsData.approvalItems;

        //  First disable all items
        approvalItems.forEach((approvalItem) => {
            approvalItem.isApprovalItemDisabled = updateApprovalPatchState.isApprovalInProgress || updateApprovalPatchState.isRejectionInProgress || updateApprovalPatchState.isReassignmentInProgress;
        });

        //  Now set approval in progress or rejection in progress for that particular item
        let approvalItem = this._getApprovalItem(approvalItems, updateApprovalPatchState.approvalId);

        if (approvalItem) {
            approvalItem.isApprovalInProgress = updateApprovalPatchState.isApprovalInProgress;
            approvalItem.isRejectionInProgress = updateApprovalPatchState.isRejectionInProgress;
            approvalItem.isReassignmentInProgress = updateApprovalPatchState.isReassignmentInProgress;
            approvalItem.focusReassignHistoryLink = updateApprovalPatchState.setFocusOnReassignHistory;
        }

        this.emitChanged();
    }

    @autobind
    private _onUpdateApprovalErrorMessage(updateApprovalErrorMessagePayload: IUpdateApprovalErrorMessagePayload): void {

        let approvalItems = this._state.approvalsData.approvalItems;
        let approvalItem = this._getApprovalItem(approvalItems, updateApprovalErrorMessagePayload.approvalId);

        if (approvalItem) {
            approvalItem.errorMessage = updateApprovalErrorMessagePayload.errorMessage;
            this.emitChanged();
        }
    }

    private _getApprovalItem(approvalItems: IReleaseApprovalItem[], approvalId: number): IReleaseApprovalItem {

        let approvalItem = approvalItems.filter((item: IReleaseApprovalItem) => {
            return !!item.approval &&
                item.approval.id === approvalId;
        });

        if (approvalItem && approvalItem.length > 0) {
            return approvalItem[0];
        }

        return null;
    }

    private _onDataStoreChanged = (): void => {
        let currentItems = this._state.approvalsData && this._state.approvalsData.approvalItems || [];
        const selectedAttempt: number = this._deploymentAttemptStore.getState().selectedAttempt;

        let releaseEnvironment = this._releaseEnvironmentStore.getEnvironment();
        this._state.approvalsData = this.getApprovalsData(releaseEnvironment, this._releaseStore.getProjectReferenceId(), selectedAttempt);
        this._currentState.approvalsData = JQueryWrapper.extendDeep({}, this._state.approvalsData);

        this._mergeItems(currentItems, this._state.approvalsData.approvalItems);

        this.emitChanged();
    }


    /**
     * In case of pending approvals, user may be in process of doing approval say writing a comment,
     * some error hit due to policy restriction, now we may get a signalR event in b/w which would repaint the UI
     * we want to remember the comments, error message etc so that to user these refresh events are not very obvious unless necessary
     * 
     * since these options are only available in pending approvals, 
     * we are merging the properties for any pending approval if required
     * 
     * @param currentItems 
     * @param nextItems 
     */
    private _mergeItems(currentItems: IReleaseApprovalItem[], nextItems: IReleaseApprovalItem[]): void {

        // find the incoming approvals items for which the status is pending
        let itemsWithPendingStatusInNextItems = nextItems.filter((item: IReleaseApprovalItem) => {
            return item.approval && item.approval.status === ApprovalStatus.Pending;
        });

        if (itemsWithPendingStatusInNextItems && itemsWithPendingStatusInNextItems.length > 0) {

            // for each approval item, find the match in the existing items and merge properties
            itemsWithPendingStatusInNextItems.forEach((nextItem: IReleaseApprovalItem) => {
                let matchingItemInCurrentItems = this._getApprovalItem(currentItems, nextItem.approval.id);

                if (this._shouldMergeItems(matchingItemInCurrentItems, nextItem)) {

                    // there is still chance of flickering due to debounce nature if the event of signalR
                    // and user updating the comment happens at the same time
                    nextItem.comments = matchingItemInCurrentItems.comments;
                    nextItem.errorMessage = matchingItemInCurrentItems.errorMessage;
                    nextItem.isApprovalItemDisabled = matchingItemInCurrentItems.isApprovalItemDisabled;
                    nextItem.warningMessage = matchingItemInCurrentItems.warningMessage;
                    nextItem.isOverrideModeEnabled = matchingItemInCurrentItems.isOverrideModeEnabled;
                    nextItem.showOverrideButtonForApprovalItem = matchingItemInCurrentItems.showOverrideButtonForApprovalItem;
                    nextItem.showReassign = matchingItemInCurrentItems.showReassign;
                    nextItem.reassignErrorMessage = matchingItemInCurrentItems.reassignErrorMessage;
                    nextItem.focusReassignHistoryLink = matchingItemInCurrentItems.focusReassignHistoryLink;

                    if (!(nextItem.deferDeploymentProps && nextItem.deferDeploymentProps.isDeferDeploymentEnabled)) {
                        //  Merge deployment props only when server is sending no deferred enabled props
                        //  This means that the user is deferring this deployment and need not know what defer value other person has set
                        //  Otherwise the user needs to know the deferred value so we will not merge the data, we will just use the server data instead.
                        nextItem.deferDeploymentProps = matchingItemInCurrentItems.deferDeploymentProps;
                    }
                }
            });
        }
    }

    private _shouldMergeItems(matchingApprovalItem: IReleaseApprovalItem, nextApprovalItem: IReleaseApprovalItem): boolean {
        //  Checking if the approval status matches and if the approver id matches
        //  If they match, it means we need to merge the states of the current object in the coming signalR object

        return (matchingApprovalItem &&
            nextApprovalItem.approval && nextApprovalItem.approval.status === ApprovalStatus.Pending &&
            (Utils_String.ignoreCaseComparer(nextApprovalItem.approval.approver.id, matchingApprovalItem.approval.approver.id) === 0));
    }

    private _publishTelemetryForOBO(isOverriden: boolean) {
        ReleaseApprovalPublishTelemetry.publishReleaseApprovalTelemetry({
            feature: ReleaseApprovalPanelFeature.preApprovalPanelFeature,
            isOBOAuthEnabled: true,
            isOverriden: isOverriden
        });
    }

    protected abstract getApprovalsData(environment: ReleaseEnvironment, projectId: string, selectedAttempt?: number): IReleaseApprovalsData;

    private _releaseStore: ReleaseStore;
    private _actionsHub: ReleaseApprovalsActions;
    private _releaseEnvironmentStore: ReleaseEnvironmentStore;
    private _currentState: IReleaseApprovalItemDetailsViewState;
    private _state: IReleaseApprovalItemDetailsViewState;
    private _deploymentAttemptStore: DeploymentAttemptStore;
}