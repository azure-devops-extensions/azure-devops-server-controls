import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ReleaseManualInterventionActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionActions";
import { ManualInterventionTimeoutPolicy } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionStatusHelper";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { ManualInterventionHelper } from "PipelineWorkflow/Scripts/Shared/ReleaseEnvironment/ManualInterventionHelper";
import { ReleaseEnvironmentHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";

import { ManualIntervention, ManualInterventionStatus, Release, WorkflowTask } from "ReleaseManagement/Core/Contracts";

import { autobind } from "OfficeFabric/Utilities";

import { IdentityRef } from "VSS/WebApi/Contracts";

export const ManualInterventionTaskDefinitionId = "BCB64569-D51A-4AF0-9C01-EA5D05B3B622";

export interface IReleaseManualInterventionDetailsViewStoreState extends IStoreState {
    manualInterventionName: string;
    instructions: string;
    comment: string;
    manualInterventionId: number;
    status: ManualInterventionStatus;
    isResumeInProgress: boolean;
    isRejectInProgress: boolean;
    error: string;
    approverIdentity: IdentityRef;
    timeoutPolicy: ManualInterventionTimeoutPolicy;
    timeout: number;
    lastModifiedDate: Date;
    imageError?: boolean;
    timelineRecordId: string;
    createdDate?: Date;
    jobNameWithMultiplier?: string;
}

export class ReleaseManualInterventionDetailsViewStore extends StoreBase {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseManualInterventionDetailsViewStore;
    }

    public initialize(instanceId: string): void {
        this._releaseManualInterventionActions = ActionsHubManager.GetActionsHub<ReleaseManualInterventionActions>(ReleaseManualInterventionActions, instanceId);

        this._state = {
            manualInterventionName: "",
            comment: "",
            instructions: "",
            manualInterventionId: parseInt(instanceId),
            status: ManualInterventionStatus.Unknown,
            isResumeInProgress: false,
            isRejectInProgress: false,
            error: "",
            approverIdentity: null,
            timeoutPolicy: ManualInterventionTimeoutPolicy.Reject,
            timeout: 0,
            lastModifiedDate: new Date(Date.now()),
            timelineRecordId: "",
            createdDate: new Date(Date.now()),
            jobNameWithMultiplier: ""
        };

        this._releaseManualInterventionActions.updateComment.addListener(this._handleCommentChanged);
        this._releaseManualInterventionActions.setIsResumeInProgress.addListener(this._handleIsResumeInProgress);
        this._releaseManualInterventionActions.setIsRejectInProgress.addListener(this._handleIsRejectInProgress);
        this._releaseManualInterventionActions.updateManualIntervention.addListener(this._handleUpdateManualIntervention);
        this._releaseManualInterventionActions.setErrorMessage.addListener(this._handleUpdateErrorMessage);

        this._initializeState();
    }

    public disposeInternal(): void {
        if (this._environmentStore) {
            this._environmentStore.removeChangedListener(this._onChange);
        }

        this._releaseManualInterventionActions.updateComment.removeListener(this._handleCommentChanged);
        this._releaseManualInterventionActions.setIsResumeInProgress.removeListener(this._handleIsResumeInProgress);
        this._releaseManualInterventionActions.setIsRejectInProgress.removeListener(this._handleIsRejectInProgress);
        this._releaseManualInterventionActions.updateManualIntervention.removeListener(this._handleUpdateManualIntervention);
        this._releaseManualInterventionActions.setErrorMessage.removeListener(this._handleUpdateErrorMessage);
    }

    public getState(): IReleaseManualInterventionDetailsViewStoreState {
        if (!this._hasStateInitialized) {
            this._initializeState();
        }

        return this._state;
    }

    private static _getManualInterventionByIdInRelease(miId: number): ManualIntervention {
        const releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        const release = releaseStore.getRelease() || {} as Release;
        const environments = release.environments || [];

        // go through each of the environments --> deploySteps --> deployPhases --> manualInterventions
        for (const environment of environments) {
            const environmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, environment.id.toString());
            const mi = ManualInterventionHelper.getManualInterventionByIdInEnvironment(environmentStore.getEnvironment(), miId);
            if (mi) {
                return mi;
            }
        }

        return null;
    }

    private _onChange = () => {
        if (this._environmentStore) {
            const mi = ManualInterventionHelper.getManualInterventionByIdInEnvironment(this._environmentStore.getEnvironment(), this._state.manualInterventionId);
            this._updateManualIntervention(mi);
            this.emitChanged();
        }
    }

    @autobind
    private _handleCommentChanged(comment: string): void {
        this._state.comment = comment;
        this.emitChanged();
    }

    @autobind
    private _handleIsResumeInProgress(isResumeInProgress: boolean): void {
        this._state.isResumeInProgress = isResumeInProgress;
        this.emitChanged();
    }

    @autobind
    private _handleIsRejectInProgress(isRejectInProgress: boolean): void {
        this._state.isRejectInProgress = isRejectInProgress;
        this.emitChanged();
    }

    @autobind
    private _handleUpdateManualIntervention(manualIntervention: ManualIntervention): void {
        this._updateManualIntervention(manualIntervention);
        this._resumedOrRejectedByUser = true;
        this.emitChanged();
    }

    @autobind
    private _handleUpdateErrorMessage(errorMessage: string): void {
        this._state.error = errorMessage;
        this.emitChanged();
    }

    private _initializeState(): void {
        let mi = ReleaseManualInterventionDetailsViewStore._getManualInterventionByIdInRelease(this._state.manualInterventionId);
        if (mi) {
            this._initializeNonModifiableProperties(mi);

            this._environmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, mi.releaseEnvironment.id.toString());
            this._environmentStore.addChangedListener(this._onChange);

            this._setTimeoutPolicy(mi.status);

            this._updateManualIntervention(mi);
            this._hasStateInitialized = true;
        }
    }

    private _updateManualIntervention(manualIntervention: ManualIntervention): void {
        // if user has resumed/rejected this MI, then do not update it.
        if (this._resumedOrRejectedByUser) {
            return;
        }

        if (manualIntervention) {
            this._state.status = manualIntervention.status;
            this._state.approverIdentity = manualIntervention.approver;
            this._state.lastModifiedDate = manualIntervention.status === ManualInterventionStatus.Pending ? manualIntervention.createdOn : manualIntervention.modifiedOn;

            if (manualIntervention.status !== ManualInterventionStatus.Pending) {
                this._state.comment = manualIntervention.comments || "";
            }
        }
    }

    private _getTimeoutPolicy(manualInterventionTask: WorkflowTask): ManualInterventionTimeoutPolicy {
        if (manualInterventionTask
            && manualInterventionTask.inputs
            && manualInterventionTask.inputs[ReleaseManualInterventionDetailsViewStore.ON_TIMEOUT_TASK_INPUT_KEY] === ReleaseManualInterventionDetailsViewStore.RESUME_VALUE) {
            return ManualInterventionTimeoutPolicy.Resume;
        }

        return ManualInterventionTimeoutPolicy.Reject;
    }

    private _setTimeoutPolicy(miStatus: ManualInterventionStatus): void {
        if (miStatus === ManualInterventionStatus.Pending && this._environmentStore) {
            const taskData = ReleaseEnvironmentHelper.getTaskDefinitionWithJobNameMultiplierForLatestAttempt(this._environmentStore.getEnvironment(), this._state.timelineRecordId);
            const taskDefinition = taskData ? taskData.taskDefinition : null;
            this._state.timeout = taskDefinition ? taskDefinition.timeoutInMinutes : 0;
            this._state.timeoutPolicy = this._getTimeoutPolicy(taskDefinition);
            this._state.jobNameWithMultiplier = taskData && taskData.jobNameWithMultiplier ? taskData.jobNameWithMultiplier : "";
        }
    }

    private _initializeNonModifiableProperties(mi: ManualIntervention): void {
        // initialize the values that will never change
        this._state.manualInterventionName = mi.name;
        this._state.instructions = mi.instructions;
        this._state.timelineRecordId = mi.taskInstanceId;
        this._state.createdDate = mi.createdOn;
    }

    private _environmentStore: ReleaseEnvironmentStore;
    private _state: IReleaseManualInterventionDetailsViewStoreState;
    private _releaseManualInterventionActions: ReleaseManualInterventionActions;
    private _resumedOrRejectedByUser: boolean = false;
    private _hasStateInitialized: boolean = false;

    private static readonly ON_TIMEOUT_TASK_INPUT_KEY: string = "onTimeout";
    private static readonly RESUME_VALUE: string = "resume";
}