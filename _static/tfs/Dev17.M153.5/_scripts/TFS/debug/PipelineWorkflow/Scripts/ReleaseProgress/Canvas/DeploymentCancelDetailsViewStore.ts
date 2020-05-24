import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { autobind } from "OfficeFabric/Utilities";

import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";

import { DeploymentCancelActions, IDeploymentCancelProgressState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentCancelActions";

import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import * as Utils_String from "VSS/Utils/String";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

export interface IDeploymentCancelItemDetailsViewState extends IStoreState {
    errorMessage: string;
    comment: string;
    progressState: IDeploymentCancelProgressState;
}

export class DeploymentCancelDetailsViewStore extends StoreBase {
    public static getKey(): string {
        return ReleaseProgressStoreKeys.DeploymentCancelDetailsViewStore;
    }

    public initialize(instanceId: string): void {

        this._state = {progressState: IDeploymentCancelProgressState.DialogNotShown} as IDeploymentCancelItemDetailsViewState;

        this._actionsHub = ActionsHubManager.GetActionsHub<DeploymentCancelActions>(DeploymentCancelActions, instanceId);
        this._actionsHub.updateCancelState.addListener(this._updateCancelState);
        this._actionsHub.updateDialogProgressState.addListener(this._setDialogState);

        this._releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, instanceId);

        this._onDataStoreChanged();
    }

    protected disposeInternal(): void {
        this._actionsHub.updateCancelState.removeListener(this._updateCancelState);
        this._actionsHub.updateDialogProgressState.removeListener(this._setDialogState);
    }

    private _onDataStoreChanged = (): void => {
        this.emitChanged();
    }

    public getState(): IDeploymentCancelItemDetailsViewState {
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

    public getReleaseEnvironmentName(): string {
        let releaseEnvironment = this._releaseEnvironmentStore.getEnvironment();
        return releaseEnvironment.name;
    }
    
    @autobind
    private _updateCancelState(message: string): void {
        this._state.progressState = IDeploymentCancelProgressState.Error;
        this._state.errorMessage = message;
        this.emitChanged();
    }

    @autobind
    private _setDialogState(state: IDeploymentCancelProgressState): void {
        this._state.progressState = state;       
        this.emitChanged();
    }

    private _actionsHub: DeploymentCancelActions;
    private _releaseEnvironmentStore: ReleaseEnvironmentStore;
    private _state: IDeploymentCancelItemDetailsViewState;
}