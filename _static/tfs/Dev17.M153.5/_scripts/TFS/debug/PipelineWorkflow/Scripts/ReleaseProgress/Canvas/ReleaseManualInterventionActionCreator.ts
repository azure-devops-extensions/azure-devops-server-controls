import { OverlayPanelActions } from "DistributedTaskControls/Actions/OverlayPanelActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ApproveRejectIndicator, Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { CanvasSelectorConstants, ReleaseProgressActionCreatorKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseManualInterventionActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionActions";
import { ReleaseManualInterventionSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionSource";
import { ActionTelemetrySource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";

import { ManualIntervention, ManualInterventionStatus } from "ReleaseManagement/Core/Contracts";

import { empty } from "VSS/Utils/String";

export class ReleaseManualInterventionActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.ReleaseManualIntervention;
    }

    public initialize(instanceId?: string): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseManualInterventionActions>(ReleaseManualInterventionActions, instanceId);
    }

    public updateComment(comment: string): void {
        this._actionsHub.updateComment.invoke(comment);
    }

    public resumeManualIntervention(comment: string, manualInterventionId: number, releaseId: number, approvalSource: ActionTelemetrySource): IPromise<void> {
        this._actionsHub.setErrorMessage.invoke(empty);
        this._actionsHub.setIsResumeInProgress.invoke(true);

        const resumeManualInterventionPromise: Q.Promise<ManualIntervention> = ReleaseManualInterventionSource.instance().resumeManualIntervention(comment, manualInterventionId, releaseId) as Q.Promise<ManualIntervention>;

        return resumeManualInterventionPromise.then((manualIntervention: ManualIntervention) => {
            this.publishManualInterventionResumeRejectTelemetry(ApproveRejectIndicator.Approved, comment, approvalSource);
            this._manualInterventionOperationSuccess(manualIntervention);
        }, (error: any) => {
            this._actionsHub.setErrorMessage.invoke(error.message || error);
            return Q.reject(error);
        }).fin(() => {
            this._actionsHub.setIsResumeInProgress.invoke(false);
        });
    }

    public rejectManualIntervention(comment: string, manualInterventionId: number, releaseId: number, approvalSource: ActionTelemetrySource): IPromise<void> {
        this._actionsHub.setErrorMessage.invoke(empty);
        this._actionsHub.setIsRejectInProgress.invoke(true);
        const rejectManualInterventionPromise: Q.Promise<ManualIntervention> = ReleaseManualInterventionSource.instance().rejectManualIntervention(comment, manualInterventionId, releaseId) as Q.Promise<ManualIntervention>;

        return rejectManualInterventionPromise.then((manualIntervention: ManualIntervention) => {
            this.publishManualInterventionResumeRejectTelemetry(ApproveRejectIndicator.Rejected, comment, approvalSource);
            this._manualInterventionOperationSuccess(manualIntervention);
        }, (error: any) => {
            this._actionsHub.setErrorMessage.invoke(error.message || error);
            Q.reject(error);
        }).fin(() => {
            this._actionsHub.setIsRejectInProgress.invoke(false);
        });
    }

    public clearErrorMessage(): void {
        this._actionsHub.setErrorMessage.invoke(empty);
    }

    public updateManualIntervention(manualIntervention: ManualIntervention): void {
        this._actionsHub.updateManualIntervention.invoke(manualIntervention);
    }

    public publishManualInterventionResumeRejectTelemetry(approveRejectIndicator: string, comment: string, approvalSource: ActionTelemetrySource): void {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.approveRejectIndicator] = approveRejectIndicator;
        eventProperties[Properties.IsCommentPresent] = !!comment;
        eventProperties[Properties.manualInterventionResumeRejectSource] = approvalSource;
        Telemetry.instance().publishEvent(Feature.ManualIntervention, eventProperties);
    }

    public publishViewLogsActionTelemetry(): void {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.viewLogsNavigation] = Properties.viewLogsNavigation;
        Telemetry.instance().publishEvent(Feature.ManualIntervention, eventProperties);
    }

    public publishLogsMIPanelLaunchTelemetry(havePermissions: boolean, status: ManualInterventionStatus): void {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.manualInterventionPanelSourceLogs] = Properties.manualInterventionPanelSourceLogs;
        eventProperties[Properties.isUserHavingPermissions] = havePermissions;
        eventProperties[Properties.manualInterventionStatus] = status;
        Telemetry.instance().publishEvent(Feature.ManualIntervention, eventProperties);
    }

    private _manualInterventionOperationSuccess(manualIntervention: ManualIntervention): void {
        const overlayPanelActions = ActionsHubManager.GetActionsHub<OverlayPanelActions>(OverlayPanelActions, CanvasSelectorConstants.ReleaseCanvasSelectorInstance);

        this._actionsHub.updateManualIntervention.invoke(manualIntervention);
        overlayPanelActions.hideOverlay.invoke(null);
    }

    private _actionsHub: ReleaseManualInterventionActions;
}