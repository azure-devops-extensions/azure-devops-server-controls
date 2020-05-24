import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { autobind } from "OfficeFabric/Utilities";

import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { IReleaseEnvironmentGatesData } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";

import { DeploymentAttempt, ReleaseEnvironment, ReleaseGates, IgnoredGate } from "ReleaseManagement/Core/Contracts";

import { ReleaseGatesActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesActions";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

export interface IReleaseGatesItemDetailsViewState extends IStoreState {
    gatesData: IReleaseEnvironmentGatesData;
}

export abstract class ReleaseGatesDetailsViewStore extends StoreBase {

    public initialize(instanceId: string): void {

        this._currentState = {} as IReleaseGatesItemDetailsViewState;
        this._state = {} as IReleaseGatesItemDetailsViewState;

        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseGatesActions>(ReleaseGatesActions, instanceId);
        this._actionsHub.updateReleaseGate.addListener(this._onIgnoreGate);

        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, instanceId);
        this._releaseEnvironmentStore.addChangedListener(this._onDataStoreChanged);

        this._onDataStoreChanged();
    }

    protected disposeInternal(): void {
        this._actionsHub.updateReleaseGate.removeListener(this._onIgnoreGate);
        this._releaseEnvironmentStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IReleaseGatesItemDetailsViewState {
        return this._state;
    }

    public getEnvironmentId(): number {
        return this._releaseEnvironmentStore.getEnvironmentId();
    }

    public hasManageReleaseApproverPermissions(): boolean {
        const projectId: string = this._releaseStore.getProjectReferenceId();
        const releaseDefinitionId: number = this._releaseStore.getReleaseDefinitionId();
        const releaseDefinitionFolderPath: string = this._releaseStore.getReleaseDefinitionFolderPath();
        const definitionEnvironmentId: number = this._releaseEnvironmentStore.getEnvironmentDefinitionId();

        if (releaseDefinitionId > 0 && definitionEnvironmentId > 0) {
            return PermissionHelper.hasManageReleaseApproversPermissions(releaseDefinitionFolderPath, releaseDefinitionId, projectId, definitionEnvironmentId);
        }

        return true;  // API will return error if user don't have permission so returing true here.
    }

    private _onDataStoreChanged = (): void => {
        let releaseEnvironment = this._releaseEnvironmentStore.getEnvironment();

        if (releaseEnvironment) {
            this._state.gatesData = this.getGatesData(releaseEnvironment, this._releaseStore.getProjectReferenceId());

            this.emitChanged();
        }
    }

    @autobind
    private _onIgnoreGate(ignoredGate: IgnoredGate): void {
        let releaseEnvironment = this._releaseEnvironmentStore.getEnvironment();
        if (releaseEnvironment
            && this._state.gatesData
            && this._state.gatesData.gatesStepId
            && ignoredGate) {
            const gatesStepId: number = this._state.gatesData.gatesStepId;
            let isPreDeploymentGate: boolean = false;

            let deployment = Utils_Array.first(releaseEnvironment.deploySteps, (deployment: DeploymentAttempt) => {
                if (this._isGateStepPresent(deployment.preDeploymentGates, gatesStepId)) {
                    isPreDeploymentGate = true;
                    return true;
                }
                else if (this._isGateStepPresent(deployment.postDeploymentGates, gatesStepId)) {
                    return true;
                }

                return false;
            });

            if (deployment) {
                let releaseGates = isPreDeploymentGate ? deployment.preDeploymentGates : deployment.postDeploymentGates;
                this._updateReleaseIgnoredGates(releaseGates, ignoredGate);
                this._state.gatesData = this.getGatesData(releaseEnvironment, this._releaseStore.getProjectReferenceId());
                this.emitChanged();
            }
        }
    }

    private _isGateStepPresent(releaseGates: ReleaseGates, gatesStepId: number): boolean {
        return releaseGates && releaseGates.id === gatesStepId;
    }

    private _updateReleaseIgnoredGates(releaseGates: ReleaseGates, ignoredGate: IgnoredGate): void {
        if (releaseGates.ignoredGates) {
            releaseGates.ignoredGates.push(ignoredGate);
        }
        else {
            releaseGates.ignoredGates = [ignoredGate];
        }
    }

    protected abstract getGatesData(releaseEnv: ReleaseEnvironment, projectId: string): IReleaseEnvironmentGatesData;

    private _actionsHub: ReleaseGatesActions;
    private _releaseStore: ReleaseStore;
    private _releaseEnvironmentStore: ReleaseEnvironmentStore;
    private _currentState: IReleaseGatesItemDetailsViewState;
    protected _state: IReleaseGatesItemDetailsViewState;
}