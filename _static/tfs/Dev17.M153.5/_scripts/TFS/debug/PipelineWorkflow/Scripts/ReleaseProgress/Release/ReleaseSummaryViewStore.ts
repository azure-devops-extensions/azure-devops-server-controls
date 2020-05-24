import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { IReleaseChangedContributionCallBackPayload, ReleaseActionsHub, IAutoSaveErrorMessagePayload } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionsHub";
import { ReleaseSummaryViewHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryViewHelper";
import { ReleaseProgressStoreKeys, ReleaseSummaryPanelActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ProgressIndicatorStore } from "PipelineWorkflow/Scripts/Common/Stores/ProgressIndicatorStore";
import { CommonConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IReleaseSummaryArtifact {
    artifactSourceText: string;
    alias: string;
    icon: string;
    sourceBranchText?: string;
    artifactSourceUrl?: string;
    artifactVersionText?: string;
    artifactVersionUrl?: string;
    isTriggeringArtifact?: boolean;
}

export interface ISaveProgressStatus {
    isSaveInProgress?: boolean;
    errorMessage?: string;
}

export interface IReleaseSummaryViewState {
    release: ReleaseContracts.Release;
    releaseName: string;
    releaseReason: ReleaseContracts.ReleaseReason;
    friendlyStartDate: string;
    triggerReasonText: string;
    triggerCreatedBy: string;
    createdByAvatarUrl: string;
    triggerIcon: string;
    contributions: Contribution[];
    startDateTooltip?: string;
    description?: string;
    isDescriptionDirty?: boolean;
    descriptionAutoSaveProgress?: ISaveProgressStatus;
    editDescriptionDisabled?: boolean;
    tags?: string[];
    tagsAutoSaveProgress?: ISaveProgressStatus;
    editTagsDisabled?: boolean;
    allTags?: string[];
    artifacts?: IReleaseSummaryArtifact[];
    doesUserHaveEditPermission?: boolean;
    imageError?: boolean;
}

export class ReleaseSummaryViewStore extends ViewStoreBase {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseSummaryViewStore;
    }

    public initialize(): void {
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._progressStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, CommonConstants.ReleaseSummaryProgressIndicatorInstanceId);
        this._releaseActions = ActionsHubManager.GetActionsHub<ReleaseActionsHub>(ReleaseActionsHub);

        this._releaseActions.updateAutoSaveErrorMessage.addListener(this._updateAutoSaveErrorMessage);
        this._releaseActions.updateContributions.addListener(this._updateContributions);
        this._releaseActions.updateReleaseChangedContributionCallBack.addListener(this._onReleaseChangedContributionCallBackUpdate);
        this._releaseActions.cleanupReleaseSummaryContributionCallBack.addListener(this._onContributionCallBackCleanup);
        this._releaseStore.addChangedListener(this._onDataStoreChanged);
        this._progressStore.addChangedListener(this._onDataStoreChanged);

        this._onDataStoreChanged();
    }

    protected disposeInternal(): void {
        this._releaseActions.updateAutoSaveErrorMessage.removeListener(this._updateAutoSaveErrorMessage);
        this._releaseActions.updateContributions.removeListener(this._updateContributions);
        this._releaseActions.updateReleaseChangedContributionCallBack.removeListener(this._onReleaseChangedContributionCallBackUpdate);
        this._releaseActions.cleanupReleaseSummaryContributionCallBack.removeListener(this._onContributionCallBackCleanup);
        this._releaseStore.removeChangedListener(this._onDataStoreChanged);
        this._progressStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IReleaseSummaryViewState {
        return this._state;
    }

    public getContributionCallBack(): IDictionaryStringTo<(release: ReleaseContracts.Release) => void> {
        return this._releaseChangedContributionCallback;
    }

    private _onDataStoreChanged = (): void => {
        let release = this._releaseStore.getRelease();
        let dataStoreState = this._releaseStore.getState();

        let prevDescriptionSaveErrorMessage: string = this._state && this._state.descriptionAutoSaveProgress ?
            this._state.descriptionAutoSaveProgress.errorMessage : Utils_String.empty;
        let prevTagSaveErrorMessage: string = this._state && this._state.tagsAutoSaveProgress ?
            this._state.tagsAutoSaveProgress.errorMessage : Utils_String.empty;

        this._state = JQueryWrapper.extendDeep({}, ReleaseSummaryViewHelper.getReleaseSummaryViewStoreState(release, dataStoreState));

        this._state.isDescriptionDirty = this._releaseStore.isDescriptionDirty();

        this.updateEditPermissions(release);
        this._updateAutoSaveProgress(prevDescriptionSaveErrorMessage, prevTagSaveErrorMessage);
        this._updateEditBehaviour();

        this.emitChanged();
    }

    private updateEditPermissions(release: ReleaseContracts.Release) {
        if (release && release.releaseDefinition) {
            this._state.doesUserHaveEditPermission = PermissionHelper.hasManageReleasePermission(release.releaseDefinition.path, release.releaseDefinition.id, release.projectReference.id);
        } else {
            this._state.doesUserHaveEditPermission = false;
        }
    }

    private _updateAutoSaveProgress(prevDescriptionSaveErrorMessage: string, prevTagSaveErrorMessage: string) {
        this._state.descriptionAutoSaveProgress = this._getAutoSaveProgress(ReleaseSummaryPanelActions.autoSaveDescription, prevDescriptionSaveErrorMessage);
        this._state.tagsAutoSaveProgress = this._getAutoSaveProgress(ReleaseSummaryPanelActions.autoSaveTags, prevTagSaveErrorMessage);
    }

    private _getAutoSaveProgress(action: string, prevErrorMessage: string): ISaveProgressStatus {
        let isAutoSaveInProgress: boolean = this._progressStore.isActionInProgress(action);
        let errorMessage: string = Utils_String.empty;
        if (!isAutoSaveInProgress) {
            errorMessage = prevErrorMessage;
        }
        return {
            isSaveInProgress: isAutoSaveInProgress,
            errorMessage: errorMessage
        };
    }

    private _updateEditBehaviour() {
        let isSaveInProgress: boolean = this._state.descriptionAutoSaveProgress && this._state.descriptionAutoSaveProgress.isSaveInProgress;
        this._state.editDescriptionDisabled = isSaveInProgress || !this._state.doesUserHaveEditPermission;
        this._state.editTagsDisabled = !this._state.doesUserHaveEditPermission;
    }

    private _updateAutoSaveErrorMessage = (payload: IAutoSaveErrorMessagePayload): void => {
        const action = payload.action;
        let autosSaveProgressStatus: ISaveProgressStatus = {
            isSaveInProgress: false,
            errorMessage: payload.errorMessage
        };

        switch (action) {
            case ReleaseSummaryPanelActions.autoSaveDescription:
                this._state.descriptionAutoSaveProgress = autosSaveProgressStatus;
                break;

            case ReleaseSummaryPanelActions.autoSaveTags:
                this._state.tagsAutoSaveProgress = autosSaveProgressStatus;
                break;
        }

        this._updateEditBehaviour();
        this.emitChanged();
    }

    private _updateContributions = (contributions: Contribution[]): void => {
        this._state.contributions = contributions;
        this.emitChanged();
    }

    private _onReleaseChangedContributionCallBackUpdate = (releaseChangedContributionCallBackPayload: IReleaseChangedContributionCallBackPayload): void => {
        this._releaseChangedContributionCallback[releaseChangedContributionCallBackPayload.contributionId] = releaseChangedContributionCallBackPayload.callBack;
    }

    private _onContributionCallBackCleanup = (): void => {
        this._releaseChangedContributionCallback = {};
    }

    private _releaseStore: ReleaseStore;
    private _state: IReleaseSummaryViewState;
    private _progressStore: ProgressIndicatorStore;
    private _releaseActions: ReleaseActionsHub;
    private _releaseChangedContributionCallback: IDictionaryStringTo<(release: ReleaseContracts.Release) => void> = {};
}