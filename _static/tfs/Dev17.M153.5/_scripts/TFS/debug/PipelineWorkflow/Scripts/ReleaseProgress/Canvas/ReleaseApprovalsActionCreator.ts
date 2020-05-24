import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseApprovalsActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalsActions";
import { ReleaseApprovalUtility } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalUtility";
import { ActionTelemetrySource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";
import { ReleaseProgressActionCreatorKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionCreator";
import { ReleaseApprovalPanelFeature, ReleaseApprovalPublishTelemetry } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseApprovalListHelperUtility";
import { ReleaseEnvironmentDeploymentSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseEnvironmentDeploymentSource";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { ApprovalType, ReleaseApproval, ReleaseDefinitionApprovals, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";
import { announce } from "VSS/Utils/Accessibility";

import { IdentityRef } from "VSS/WebApi/Contracts";

interface IReleaseApprovalInProgressStatus {
    isApprovalInProgress?: boolean;
    isRejectionInProgress?: boolean;
    isReassignmentInProgress?: boolean;
    isDeferInProgress?: boolean;
    setFocusOnReassignHistory?: boolean;
}

export class ReleaseApprovalsActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.ReleaseApprovals;
    }

    public initialize(instanceId?: string): void {

        this._releaseActionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);

        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseApprovalsActions>(ReleaseApprovalsActions, instanceId);
        this._approvalUtility = new ReleaseApprovalUtility();
    }

    public updateApprovalComments(approvalId: number, comments: string): void {
        this._actionsHub.updateApprovalComments.invoke({
            approvalId: approvalId,
            comments: comments
        });
    }

    public updateIsDeferDeploymentEnabled(approvalId: number, enabled: boolean): void {
        this._actionsHub.updateIsDeferDeploymentEnabled.invoke({
            approvalId: approvalId,
            enabled: enabled
        });
    }

    public updateDeferDeploymentTime(approvalId: number, time: Date): void {
        this._actionsHub.updateDeferDeploymentTime.invoke({
            approvalId: approvalId,
            time: time
        });
    }

    public deferAndApprove(deferredDateTime: Date, environment: ReleaseEnvironment, snapshot: ReleaseDefinitionApprovals, approval: ReleaseApproval, releaseId: number, isFirstPreDeploymentApprover: boolean, isApprovalOverriden: boolean, telemetrySource?: ActionTelemetrySource) {

        // reset the error message if any
        this._updateErrorMessage(approval.id, Utils_String.empty);

        // set the state to inProgress
        this._updateApprovalInProgress(approval.id, {
            isDeferInProgress: true
        });

        this._deferEnvironmentDeployment(environment, deferredDateTime).then((environment: ReleaseEnvironment) => {
            this.approve(snapshot, approval, releaseId, environment, isFirstPreDeploymentApprover, !!deferredDateTime, isApprovalOverriden, telemetrySource);
        }, (error: any) => {

            // set error message
            this._updateErrorMessage(approval.id, error.message || error);

            // set the state to not inProgress
            this._updateApprovalInProgress(approval.id, {
                isDeferInProgress: false
            });
        });
    }

    public approve(snapshot: ReleaseDefinitionApprovals, approval: ReleaseApproval, releaseId: number, environment: ReleaseEnvironment, isFirstPreDeploymentApprover: boolean, isDeferred: boolean, isApprovalOverriden: boolean, telemetrySource?: ActionTelemetrySource): void {

        // reset the error message if any
        this._updateErrorMessage(approval.id, Utils_String.empty);

        // set the state to inProgress
        this._updateApprovalInProgress(approval.id, {
            isApprovalInProgress: true
        });

        this._approvalUtility.approve({
            snapshot: snapshot,
            approval: approval,
            environment: environment,
            isFirstPreDeployApprover: isFirstPreDeploymentApprover
        }).then(() => {

            // refresh the release , it will take care of updating the canvas as well as approvals panel
            this._releaseActionCreator.refreshRelease(releaseId).then(() => {
                //  set the state to not inProgress, we are explicitly doing it so that no signalR event can change the state of in-progress            
                this._updateApprovalInProgress(approval.id, {
                    isApprovalInProgress: false
                });
            });

            //  publish telemetry
            ReleaseApprovalPublishTelemetry.publishReleaseApprovalTelemetry({
                feature: (approval.approvalType === ApprovalType.PreDeploy) ? ReleaseApprovalPanelFeature.preApprovalPanelFeature :
                    ReleaseApprovalPanelFeature.postApprovalPanelFeature,
                isApproved: true,
                isDeferred: isDeferred,
                isOverriden: isApprovalOverriden,
                telemetrySource: telemetrySource
            });

            announce(Resources.ApprovalCompletedText, true);

        }, (error: any) => {

            // set error message
            this._updateErrorMessage(approval.id, error.message || error);

            // set the state to not inProgress
            this._updateApprovalInProgress(approval.id, {
                isApprovalInProgress: false
            });
        });
    }

    public reject(snapshot: ReleaseDefinitionApprovals, approval: ReleaseApproval, releaseId: number, isApprovalOverriden: boolean, telemetrySource?: ActionTelemetrySource): void {

        // reset the error message if any
        this._updateErrorMessage(approval.id, Utils_String.empty);

        // set the state to inProgress
        this._updateApprovalInProgress(approval.id, {
            isRejectionInProgress: true
        });

        this._approvalUtility.reject(snapshot, approval).then(() => {

            // refresh the release , it will take care of updating the canvas as well as approvals panel
            this._releaseActionCreator.refreshRelease(releaseId).then(() => {
                // set the state to not inProgress
                this._updateApprovalInProgress(approval.id, {
                    isRejectionInProgress: false
                });
            });


            //  publish telemetry
            ReleaseApprovalPublishTelemetry.publishReleaseApprovalTelemetry({
                feature: (approval.approvalType === ApprovalType.PreDeploy) ? ReleaseApprovalPanelFeature.preApprovalPanelFeature :
                    ReleaseApprovalPanelFeature.postApprovalPanelFeature,
                isRejected: true,
                isOverriden: isApprovalOverriden,
                telemetrySource: telemetrySource
            });

            //  Announce Rejected
            announce(Resources.RejectionCompletedText, true);

        }, (error: any) => {

            // set error message
            this._updateErrorMessage(approval.id, error.message || error);

            // set the state to not inProgress
            this._updateApprovalInProgress(approval.id, {
                isRejectionInProgress: false
            });
        });
    }

    public reassign(snapshot: ReleaseDefinitionApprovals, approval: ReleaseApproval, releaseId: number, selectedIdentity: IdentityRef, reassignComment: string, isOverrideModeEnabled: boolean, telemetrySource?: ActionTelemetrySource): void {
        this._updateApprovalInProgress(approval.id, {
            isReassignmentInProgress: true
        });

        this._approvalUtility.reassign(snapshot, approval, selectedIdentity, reassignComment).then(() => {
            //  Close the reassign dialog box
            this.enableReassignMode(approval.id, false);

            // refresh the release , it will take care of updating the canvas as well as approvals panel
            this._releaseActionCreator.refreshRelease(releaseId).then(() => {
                this._updateApprovalInProgress(approval.id, {
                    setFocusOnReassignHistory: true,
                    isReassignmentInProgress: false
                });
            });

            //  publish telemetry
            ReleaseApprovalPublishTelemetry.publishReleaseApprovalTelemetry({
                feature: (approval.approvalType === ApprovalType.PreDeploy) ? ReleaseApprovalPanelFeature.preApprovalPanelFeature :
                    ReleaseApprovalPanelFeature.postApprovalPanelFeature,
                isReassigned: true,
                isOverriden: isOverrideModeEnabled,
                telemetrySource: telemetrySource,
                isReassignedWithComment: !!reassignComment
            });

            //  Announce Reassigned
            announce(Resources.ReassignmentCompletedText, true);

        },
            (error) => {
                // set error message
                this._updateReassignErrorMessage(approval.id, error.message || error);
                this._updateApprovalInProgress(approval.id, {
                    setFocusOnReassignHistory: false,
                    isReassignmentInProgress: false
                });
            });
    }


    public dismissErrorMessage(approvalId: number): void {
        this._updateErrorMessage(approvalId, Utils_String.empty);
    }

    public dismissWarningMessage(approvalId: number): void {
        this._actionsHub.updateWarningMessageForDeploymentAuthorization.invoke({
            subscriptionNames: [Utils_String.empty],
            approvalId: approvalId,
            dismissWarningMessage: true
        });
    }

    public updateOverrideModeEnabledState(approvalId: number, isOverrideEnabled: boolean): void {
        this._actionsHub.updateOverrideModeEnabledState.invoke({
            approvalId: approvalId,
            isOverrideModeEnabled: isOverrideEnabled
        });
    }

    public enableReassignMode(approvalId: number, isEnabled: boolean): void {
        this._actionsHub.enableReassignMode.invoke({
            approvalId: approvalId,
            isEnabled: isEnabled
        });
    }

    private _updateReassignErrorMessage(approvalId: number, errorMessage: string): void {
        this._actionsHub.updateReassignErrorMessage.invoke({
            approvalId: approvalId,
            errorMessage: errorMessage
        });
    }

    private _updateErrorMessage(approvalId: number, message: string): void {
        this._actionsHub.updateApprovalErrorMessage.invoke({
            approvalId: approvalId,
            errorMessage: message
        });
    }

    private _updateApprovalInProgress(approvalId: number, releaseApprovalInProgressStatus: IReleaseApprovalInProgressStatus): void {
        if (!!releaseApprovalInProgressStatus) {

            this._actionsHub.updateApprovalPatchState.invoke({
                approvalId: approvalId,
                isApprovalInProgress: !!releaseApprovalInProgressStatus.isApprovalInProgress || !!releaseApprovalInProgressStatus.isDeferInProgress,
                isRejectionInProgress: !!releaseApprovalInProgressStatus.isRejectionInProgress,
                isReassignmentInProgress: !!releaseApprovalInProgressStatus.isReassignmentInProgress,
                setFocusOnReassignHistory: !!releaseApprovalInProgressStatus.setFocusOnReassignHistory
            });

            /** 
            * Announcing in-progress status
            */
            if (!!releaseApprovalInProgressStatus.isApprovalInProgress) {
                announce(Resources.ApprovalInProgressText, true);
            }
            else if (!!releaseApprovalInProgressStatus.isApprovalInProgress) {
                announce(Resources.RejectionInProgressText, true);
            }
            else if (!!releaseApprovalInProgressStatus.isReassignmentInProgress) {
                announce(Resources.ReassignmentInProgressText, true);
            }
        }
    }

    private _deferEnvironmentDeployment(environment: ReleaseEnvironment, deferredDateTime: Date): IPromise<ReleaseEnvironment> {
        return ReleaseEnvironmentDeploymentSource.instance().deferEnvironmentDeployment(environment.releaseId, environment.id, deferredDateTime);
    }

    private _releaseActionCreator: ReleaseActionCreator;
    private _actionsHub: ReleaseApprovalsActions;
    private _approvalUtility: ReleaseApprovalUtility;
}