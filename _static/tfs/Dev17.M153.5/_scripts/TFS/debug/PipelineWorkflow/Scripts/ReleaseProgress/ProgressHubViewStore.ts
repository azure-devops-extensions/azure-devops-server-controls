import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { SettingsManager } from "DistributedTaskControls/Common/SettingsManager";
import { ViewStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { IErrorState } from "DistributedTaskControls/Common/Types";

import { ReleaseProgressStoreKeys, ReleaseSettingsConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseActionsHub, IReleaseConfirmationDialogStatePayload } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionsHub";
import { ReleaseStore, IReleaseState } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseEnvironmentListStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironmentList/ReleaseEnvironmentListStore";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { IReleaseEnvironmentActionInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseVariablesListStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseVariablesListStore";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

export interface IProgressHubViewState extends Base.IState {
    isEditMode: boolean;
    isDirty: boolean;
    isValid: boolean;
    release: RMContracts.Release;
    hasVariableGroups: boolean;
    isVariableTabValid: boolean;
    isSaveInProgress?: boolean;
    isDiscardInProgress?: boolean;
    showSaveDialog?: boolean;
    showDiscardDialog?: boolean;
    isEditDisabled?: boolean;
    showEditRelease?: boolean;
    error?: IErrorState;
    selectedEnvironmentKey?: number;
    actions?: IReleaseEnvironmentActionInfo[];
    isDeployPermissible?: boolean;
    isApprovePermissible?: boolean;
    areEnvironmentsValid?: boolean;
    isManageReleasePermissible?: boolean;
    showinfoMessage?: boolean;
}

export class ProgressHubViewStore extends ViewStoreBase {

    public initialize(instanceId?: string): void {
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._variableListStore = StoreManager.GetStore<ReleaseVariablesListStore>(ReleaseVariablesListStore);
        this._releaseEnvironmentListStore = StoreManager.GetStore<ReleaseEnvironmentListStore>(ReleaseEnvironmentListStore);
        this._releaseActions = ActionsHubManager.GetActionsHub<ReleaseActionsHub>(ReleaseActionsHub);
        this._releaseActions.toggleEditMode.addListener(this._handleToggleEditMode);
        this._releaseActions.updateErrorMessage.addListener(this._handleUpdateErrorMessage);
        this._releaseActions.toggleDiscardDialogState.addListener(this._toggleDiscardDialogState);
        this._releaseActions.toggleSaveDialogState.addListener(this._toggleSaveDialogState);
        this._initializeState();
        this._releaseStore.addChangedListener(this._onDataStoreChanged);
    }

    public disposeInternal(): void {
        this._releaseStore.removeChangedListener(this._onDataStoreChanged);
        this._releaseActions.toggleEditMode.removeListener(this._handleToggleEditMode);
        this._releaseActions.updateErrorMessage.removeListener(this._handleUpdateErrorMessage);
        this._releaseActions.toggleDiscardDialogState.removeListener(this._toggleDiscardDialogState);
        this._releaseActions.toggleSaveDialogState.removeListener(this._toggleSaveDialogState);
    }

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ProgressHubViewStore;
    }

    public getState(): IProgressHubViewState {
        return this._state;
    }

    public getUpdatedRelease(): RMContracts.Release {
        return this._releaseStore.getUpdatedRelease();
    }

    public getRelease(): RMContracts.Release {
        return this._releaseStore.getRelease();
    }

    public getReleaseId(): number {
        return this._releaseStore.getReleaseId();
    }

    public getReleaseDefinitionId(): number {
        return this._releaseStore.getReleaseDefinitionId();
    }

    public getReleaseName(): string {
        return this._releaseStore.getReleaseName();
    }

    public getReleaseDefinitionName(): string {
        return this._releaseStore.getReleaseDefinitionName();
    }

    public isVariableStoreDirty(): boolean {
        return this._variableListStore.isDirty();
    }

    public hasReleaseNotStarted(): boolean {
        const release: RMContracts.Release = this.getRelease();

        if (!release) {
            return true;
        } else if (!release.environments) {
            return false;
        } else {
            return release.environments.every((env: RMContracts.ReleaseEnvironment) => (env.status === RMContracts.EnvironmentStatus.NotStarted
                || env.status === RMContracts.EnvironmentStatus.Scheduled));
        }
    }

    private _onDataStoreChanged = (): void => {
        this._updateState();
    }

    private _toggleDiscardDialogState = (payload: IReleaseConfirmationDialogStatePayload): void => {
        if (payload.showDialog !== undefined) {
            this._state.showDiscardDialog = payload.showDialog;
        }
        this._state.isDiscardInProgress = !!payload.isInProgress;
        this.emitChanged();
    }

    private _toggleSaveDialogState = (payload: IReleaseConfirmationDialogStatePayload): void => {
        if (payload.showDialog !== undefined) {
            this._state.showSaveDialog = payload.showDialog;
        }
        this._state.isSaveInProgress = payload.isInProgress;
        this.emitChanged();
    }

    private _initializeState(): void {
        let release = this.getRelease();
        this._state = {
            isEditMode: false,
            isDirty: false,
            isValid: true,
            release: release,
            showSaveDialog: false,
            isSaveInProgress: false,
            showDiscardDialog: false,
            isDiscardInProgress: false,
            isEditDisabled: this._isEditButtonDisabled(release),
            showEditRelease: this._releaseStore.hasManageReleasePermission(),
            error: null,
            hasVariableGroups: this._releaseStore.getState().hasVariableGroups,
            isVariableTabValid: true,
            areEnvironmentsValid: true,
            showinfoMessage: !SettingsManager.instance().getSetting<boolean>(ReleaseSettingsConstants.PathPrefix + ReleaseSettingsConstants.IsEditReleaseInfoBarDismissedKey)
        };
    }

    private _isEditButtonDisabled(release: RMContracts.Release): boolean {
        if (release) {
            const isReleaseAbandoned = release.status === RMContracts.ReleaseStatus.Abandoned;
            return isReleaseAbandoned;
        }
        else {
            return true;
        }
    }

    private _updateState(): void {
        let shouldEmitChange: boolean = false;
        let state: IReleaseState = this._releaseStore.getState();
        let oldrelease = this._state.release;
        this._state.release = this._releaseStore.getRelease();
        this._state.hasVariableGroups = state.hasVariableGroups;
        let isVariableTabValid: boolean = this._variableListStore.isValid();
        let areEnvironmentsValid: boolean = this._releaseEnvironmentListStore.isValid();

        if (this._state.isEditMode) {
            let isReleaseStoreDirty: boolean = this._releaseStore.isDirty();
            let isReleaseStoreValid: boolean = this._releaseStore.isValid();
            if (this._state.isDirty !== isReleaseStoreDirty || this._state.isValid !== isReleaseStoreValid) {
                this._state.isDirty = isReleaseStoreDirty;
                this._state.isValid = isReleaseStoreValid;
                shouldEmitChange = true;
            }
        }

        if (isVariableTabValid !== this._state.isVariableTabValid || areEnvironmentsValid !== this._state.areEnvironmentsValid) {
            this._state.isVariableTabValid = isVariableTabValid;
            this._state.areEnvironmentsValid = areEnvironmentsValid;
            shouldEmitChange = true;
        }

        const showEditRelease = this._releaseStore.hasManageReleasePermission();
        if (this._state.showEditRelease !== showEditRelease) {
            this._state.showEditRelease = showEditRelease;
            shouldEmitChange = true;
        }

        if (this._state.release && oldrelease && this._state.release.status !== oldrelease.status && this._state.release.status === RMContracts.ReleaseStatus.Abandoned)
        {
            shouldEmitChange = true;
        }
        
        if (shouldEmitChange) {
            this.emitChanged();
        }
    }

    private _handleToggleEditMode = (isEditMode: boolean): void => {
        this._state.isEditMode = isEditMode;
        this.emitChanged();
    }

    private _handleUpdateErrorMessage = (error: IErrorState): void => {
        this._state.error = error;
        this._state.isDiscardInProgress = false;
        this._state.isSaveInProgress = false;
        this._state.showDiscardDialog = false;
        this._state.showSaveDialog = false;
        this.emitChanged();
    }

    private _variableListStore: ReleaseVariablesListStore;
    private _releaseStore: ReleaseStore;
    private _state: IProgressHubViewState;
    private _releaseActions: ReleaseActionsHub;
    private _releaseEnvironmentListStore: ReleaseEnvironmentListStore;
}