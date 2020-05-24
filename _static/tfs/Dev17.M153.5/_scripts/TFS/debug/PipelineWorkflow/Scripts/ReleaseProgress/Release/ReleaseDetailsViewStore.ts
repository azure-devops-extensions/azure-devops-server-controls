import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseActionsHub, IReleaseChangedContributionCallBackPayload } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionsHub";
import { ReleaseDetailsViewHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseDetailsViewHelper";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IReleaseDetailsViewState {
    releaseName: string;
    releaseStatusText: string;
    releaseNameFormat: string;
    reportDeploymentStatusToCodeEnvironmentList: ReleaseContracts.ReleaseEnvironment[];
    selectedPivotKey: string;
    releaseChangedContributionCallBack: IDictionaryStringTo<(release: ReleaseContracts.Release) => void>;
}

export class ReleaseDetailsViewStore extends ViewStoreBase {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseDetailsViewStore;
    }

    public initialize(): void {
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._releaseActions = ActionsHubManager.GetActionsHub<ReleaseActionsHub>(ReleaseActionsHub);

        this._releaseStore.addChangedListener(this._onDataStoreChanged);
        this._releaseActions.updateReleaseToolbarContributionCallBack.addListener(this._onReleaseChangedContributionCallBackUpdate);
        this._releaseActions.updateSelectedPivotKey.addListener(this._onSelectedPivotKeyChanged);
        this._releaseActions.cleanupToolbarContributionCallBack.addListener(this._onContributionCallBackCleanup);

        this._initializeState();

        this._onDataStoreChanged();
    }

    protected disposeInternal(): void {
        this._releaseStore.removeChangedListener(this._onDataStoreChanged);
        this._releaseActions.updateReleaseToolbarContributionCallBack.removeListener(this._onReleaseChangedContributionCallBackUpdate);
        this._releaseActions.updateSelectedPivotKey.removeListener(this._onSelectedPivotKeyChanged);
        this._releaseActions.cleanupToolbarContributionCallBack.removeListener(this._onContributionCallBackCleanup);
    }

    public getState(): IReleaseDetailsViewState {
        return this._state;
    }

    private _onDataStoreChanged = (): void => {
        let release: ReleaseContracts.Release = this._releaseStore.getRelease();

        this._state.releaseName = release.name;
        this._state.releaseNameFormat = release.releaseNameFormat;
        this._state.reportDeploymentStatusToCodeEnvironmentList = this._getReportDeploymentStatusToCodeEnvironmentList(release.environments);
        this._state.releaseStatusText = ReleaseDetailsViewHelper.getReleaseStatusText(release.status);

        this.emitChanged();
    }

    private _getReportDeploymentStatusToCodeEnvironmentList(environments: ReleaseContracts.ReleaseEnvironment[]): ReleaseContracts.ReleaseEnvironment[] {

        return (environments || []).filter((environment) => {
            return environment.environmentOptions ? environment.environmentOptions.publishDeploymentStatus : false;
        });
    }

    private _onReleaseChangedContributionCallBackUpdate = (releaseChangedContributionCallBackPayload: IReleaseChangedContributionCallBackPayload): void => {
        this._state.releaseChangedContributionCallBack[releaseChangedContributionCallBackPayload.contributionId] = releaseChangedContributionCallBackPayload.callBack;
    }

    private _onContributionCallBackCleanup = (): void => {
        this._state.releaseChangedContributionCallBack = {};
    }

    private _onSelectedPivotKeyChanged = (selectedPivotKey: string): void => {
        this._state.selectedPivotKey = selectedPivotKey;
        this.emitChanged();
    }

    private _initializeState() {
        this._state = {
            releaseName: Utils_String.empty,
            releaseStatusText: Utils_String.empty,
            releaseNameFormat: Utils_String.empty,
            reportDeploymentStatusToCodeEnvironmentList: [],
            selectedPivotKey: "properties",
            releaseChangedContributionCallBack: {}
        } as IReleaseDetailsViewState;
    }

    private _releaseStore: ReleaseStore;
    private _releaseActions: ReleaseActionsHub;
    private _state: IReleaseDetailsViewState;
}