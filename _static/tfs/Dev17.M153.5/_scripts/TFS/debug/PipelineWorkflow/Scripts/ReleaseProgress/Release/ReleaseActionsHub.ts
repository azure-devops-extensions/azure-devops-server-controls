import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { IErrorState } from "DistributedTaskControls/Common/Types";

import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import { ActionsBase } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";

export interface IReleaseActionsPayload {
    release: ReleaseContracts.Release;
}

export interface ISiblingReleasesPayload {
    siblingReleases: IPromise<ReleaseContracts.Release[]>;
}

export interface IAutoSaveErrorMessagePayload {
    action: string;
    errorMessage: string;
}

export interface IReleaseChangedContributionCallBackPayload {
    contributionId: string;
    callBack: (release: ReleaseContracts.Release) => void;
}

export interface IReleaseConfirmationDialogStatePayload {
    isInProgress: boolean;
    showDialog?: boolean;
}

export class ReleaseActionsHub extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return ReleaseProgressActionKeys.Release;
    }

    public initialize(): void {
        this._initializeRelease = new ActionBase.Action<IReleaseActionsPayload>();
        this._siblingReleases = new ActionBase.Action<ISiblingReleasesPayload>();
        this._updateExistingRelease = new ActionBase.Action<IReleaseActionsPayload>();
        this._updateReleaseFromService = new ActionBase.Action<ReleaseContracts.Release>();
        this._initializeAllTags = new ActionBase.Action<string[]>();
        this._updateDescription = new ActionBase.Action<string>();
        this._updateTags = new ActionBase.Action<string[]>();
        this._updateServerTags = new ActionBase.Action<string[]>();
        this._resetTags = new ActionBase.Action<ActionBase.IActionPayload>();
        this._updateAutoSaveErrorMessage = new ActionBase.Action<IAutoSaveErrorMessagePayload>();
        this._updateContributions = new ActionBase.Action<Contribution[]>();
        this._updateReleaseChangedContributionCallBack = new ActionBase.Action<IReleaseChangedContributionCallBackPayload>();
        this._updateReleaseToolbarContributionCallBack = new ActionBase.Action<IReleaseChangedContributionCallBackPayload>();
        this._updateSelectedPivotKey = new ActionBase.Action<string>();
        this._cleanupReleaseSummaryContributionCallBack = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
        this._cleanupToolbarContributionCallBack = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
        this._updateErrorMessage = new ActionBase.Action<IErrorState>();
        this._toggleEditMode = new ActionBase.Action<boolean>();
        this._toggleSaveDialogState = new ActionBase.Action<IReleaseConfirmationDialogStatePayload>();
        this._toggleDiscardDialogState = new ActionBase.Action<IReleaseConfirmationDialogStatePayload>();
        this._updateMyPendingApprovals = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
    }

    public get initializeRelease(): ActionBase.Action<IReleaseActionsPayload> {
        return this._initializeRelease;
    }

    public get initializeSiblingReleases(): ActionBase.Action<ISiblingReleasesPayload> {
        return this._siblingReleases;
    }

    public get updateExistingRelease(): ActionBase.Action<IReleaseActionsPayload> {
        return this._updateExistingRelease;
    }

    public get initializeAllTags(): ActionBase.Action<string[]> {
        return this._initializeAllTags;
    }

    public get updateDescription(): ActionBase.Action<string> {
        return this._updateDescription;
    }

    public get updateTags(): ActionBase.Action<string[]> {
        return this._updateTags;
    }

    public get updateServerTags(): ActionBase.Action<string[]> {
        return this._updateServerTags;
    }

    public get resetTags(): ActionBase.Action<ActionBase.IActionPayload> {
        return this._resetTags;
    }

    public get updateAutoSaveErrorMessage(): ActionBase.Action<IAutoSaveErrorMessagePayload> {
        return this._updateAutoSaveErrorMessage;
    }

    public get updateReleaseToolbarContributionCallBack(): ActionBase.Action<IReleaseChangedContributionCallBackPayload> {
        return this._updateReleaseToolbarContributionCallBack;
    }

    public get updateSelectedPivotKey(): ActionBase.Action<string> {
        return this._updateSelectedPivotKey;
    }

    public get updateContributions(): ActionBase.Action<Contribution[]> {
        return this._updateContributions;
    }

    public get updateReleaseFromService(): ActionBase.Action<ReleaseContracts.Release> {
        return this._updateReleaseFromService;
    }

    public get updateReleaseChangedContributionCallBack(): ActionBase.Action<IReleaseChangedContributionCallBackPayload> {
        return this._updateReleaseChangedContributionCallBack;
    }

    public get cleanupToolbarContributionCallBack(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._cleanupToolbarContributionCallBack;
    }

    public get cleanupReleaseSummaryContributionCallBack(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._cleanupReleaseSummaryContributionCallBack;
    }

    public get updateErrorMessage(): ActionBase.Action<IErrorState> {
        return this._updateErrorMessage;
    }

    public get toggleEditMode(): ActionBase.Action<boolean> {
        return this._toggleEditMode;
    }

    public get toggleSaveDialogState(): ActionBase.Action<IReleaseConfirmationDialogStatePayload> {
        return this._toggleSaveDialogState;
    }

    public get toggleDiscardDialogState(): ActionBase.Action<IReleaseConfirmationDialogStatePayload> {
        return this._toggleDiscardDialogState;
    }

    public get updateMyPendingApprovals(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._updateMyPendingApprovals;
    }

    private _updateMyPendingApprovals: ActionBase.Action<ActionBase.IEmptyActionPayload>;
    private _initializeRelease: ActionBase.Action<IReleaseActionsPayload>;
    private _siblingReleases: ActionBase.Action<ISiblingReleasesPayload>;
    private _updateExistingRelease: ActionBase.Action<IReleaseActionsPayload>;
    private _updateReleaseFromService: ActionBase.Action<ReleaseContracts.Release>;
    private _initializeAllTags: ActionBase.Action<string[]>;
    private _updateDescription: ActionBase.Action<string>;
    private _updateTags: ActionBase.Action<string[]>;
    private _updateServerTags: ActionBase.Action<string[]>;
    private _resetTags: ActionBase.Action<ActionBase.IActionPayload>;
    private _updateAutoSaveErrorMessage: ActionBase.Action<IAutoSaveErrorMessagePayload>;
    private _updateReleaseToolbarContributionCallBack: ActionBase.Action<IReleaseChangedContributionCallBackPayload>;
    private _updateSelectedPivotKey: ActionBase.Action<string>;
    private _updateContributions: ActionBase.Action<Contribution[]>;
    private _updateReleaseChangedContributionCallBack: ActionBase.Action<IReleaseChangedContributionCallBackPayload>;
    private _cleanupToolbarContributionCallBack: ActionBase.Action<ActionBase.IEmptyActionPayload>;
    private _cleanupReleaseSummaryContributionCallBack: ActionBase.Action<ActionBase.IEmptyActionPayload>;
    private _updateErrorMessage: ActionBase.Action<IErrorState>;
    private _toggleEditMode: ActionBase.Action<boolean>;
    private _toggleSaveDialogState: ActionBase.Action<IReleaseConfirmationDialogStatePayload>;
    private _toggleDiscardDialogState: ActionBase.Action<IReleaseConfirmationDialogStatePayload>;
}
