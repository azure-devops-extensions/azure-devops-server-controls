import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ActionsBase } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

export interface IUpdateApprovalCommentsPayload {
    approvalId: number;
    comments: string;
}

export interface IUpdateApprovalErrorMessagePayload {
    approvalId: number;
    errorMessage: string;
}

export interface IEnableReassignMode {
    approvalId: number;
    isEnabled: boolean;
}

export interface IUpdateOverrideModeEnabledState {
    approvalId: number;
    isOverrideModeEnabled: boolean;
}

export interface IUpdateApprovalPatchState {
    approvalId: number;

    /**
     * is approval patch is in-progress mode
     */
    isApprovalInProgress: boolean;

    /**
     * is approval rejection patch is in-progress mode
     */
    isRejectionInProgress: boolean;

    /**
     * is approval reassignment is in-progress mode
     */
    isReassignmentInProgress: boolean;

    /**
     * should set focus on release history link
     */
    setFocusOnReassignHistory: boolean;
}

export interface IUpdateIsDeferDeploymentEnabledPayload {
    approvalId: number;
    enabled: boolean;
}

export interface IUpdateDeferDeploymentTimePayload {
    approvalId: number;
    time: Date;
}

export interface IUpdateWarningMessageForDeploymentAuthorization {
    subscriptionNames: string[];
    approvalId: number;
    dismissWarningMessage?: boolean;
}

export class ReleaseApprovalsActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return ReleaseProgressActionKeys.ReleaseApprovals;
    }

    public initialize(instanceId: string): void {
        this._updateApprovalComments = new ActionBase.Action<IUpdateApprovalCommentsPayload>();
        this._updateApprovalErrorMessage = new ActionBase.Action<IUpdateApprovalErrorMessagePayload>();
        this._updateApprovalPatchState = new ActionBase.Action<IUpdateApprovalPatchState>();
        this._updateIsDeferDeploymentEnabled = new ActionBase.Action<IUpdateIsDeferDeploymentEnabledPayload>();
        this._updateDeferDeploymentTime = new ActionBase.Action<IUpdateDeferDeploymentTimePayload>();
        this._updateWarningMessageForDeploymentAuthorization = new ActionBase.Action<IUpdateWarningMessageForDeploymentAuthorization>();
        this._updateOverrideModeEnabledState = new ActionBase.Action<IUpdateOverrideModeEnabledState>();
        this._enableReassignMode = new ActionBase.Action<IEnableReassignMode>();
        this._updateReassignErrorMessage = new ActionBase.Action<IUpdateApprovalErrorMessagePayload>();
    }

    public get updateApprovalComments(): ActionBase.Action<IUpdateApprovalCommentsPayload> {
        return this._updateApprovalComments;
    }

    public get updateApprovalErrorMessage(): ActionBase.Action<IUpdateApprovalErrorMessagePayload> {
        return this._updateApprovalErrorMessage;
    }

    public get updateApprovalPatchState(): ActionBase.Action<IUpdateApprovalPatchState> {
        return this._updateApprovalPatchState;
    }

    public get updateIsDeferDeploymentEnabled(): ActionBase.Action<IUpdateIsDeferDeploymentEnabledPayload> {
        return this._updateIsDeferDeploymentEnabled;
    }

    public get updateDeferDeploymentTime(): ActionBase.Action<IUpdateDeferDeploymentTimePayload> {
        return this._updateDeferDeploymentTime;
    }

    public get updateWarningMessageForDeploymentAuthorization(): ActionBase.Action<IUpdateWarningMessageForDeploymentAuthorization> {
        return this._updateWarningMessageForDeploymentAuthorization;
    }

    public get updateOverrideModeEnabledState(): ActionBase.Action<IUpdateOverrideModeEnabledState> {
        return this._updateOverrideModeEnabledState;
    }

    public get enableReassignMode(): ActionBase.Action<IEnableReassignMode> {
        return this._enableReassignMode;
    }

    public get updateReassignErrorMessage(): ActionBase.Action<IUpdateApprovalErrorMessagePayload> {
        return this._updateReassignErrorMessage;
    }

    private _updateReassignErrorMessage: ActionBase.Action<IUpdateApprovalErrorMessagePayload>;
    private _enableReassignMode: ActionBase.Action<IEnableReassignMode>;
    private _updateOverrideModeEnabledState: ActionBase.Action<IUpdateOverrideModeEnabledState>;
    private _updateWarningMessageForDeploymentAuthorization: ActionBase.Action<IUpdateWarningMessageForDeploymentAuthorization>;
    private _updateApprovalErrorMessage: ActionBase.Action<IUpdateApprovalErrorMessagePayload>;
    private _updateApprovalComments: ActionBase.Action<IUpdateApprovalCommentsPayload>;
    private _updateApprovalPatchState: ActionBase.Action<IUpdateApprovalPatchState>;
    private _updateIsDeferDeploymentEnabled: ActionBase.Action<IUpdateIsDeferDeploymentEnabledPayload>;
    private _updateDeferDeploymentTime: ActionBase.Action<IUpdateDeferDeploymentTimePayload>;
}