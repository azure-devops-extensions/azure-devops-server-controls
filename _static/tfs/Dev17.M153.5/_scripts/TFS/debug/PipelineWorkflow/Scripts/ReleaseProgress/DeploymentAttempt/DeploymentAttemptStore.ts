import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { DeploymentAttemptActions } from "PipelineWorkflow/Scripts/ReleaseProgress/DeploymentAttempt/DeploymentAttemptActions";
import { DeploymentAttemptKey } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

export interface IAttemptState {
    selectedAttempt: number;
}

export class DeploymentAttemptStore extends StoreBase {

    public initialize(instanceId: string) {
        this._deploymentAttemptActions = ActionsHubManager.GetActionsHub<DeploymentAttemptActions>(DeploymentAttemptActions, instanceId);
        this._deploymentAttemptActions.selectAttempt.addListener(this._handleSelectAttempt);
        this._deploymentAttemptActions.resetSelectedAttempt.addListener(this._handleResetSelectedAttempt);
    }

    public static getKey(): string {
        return DeploymentAttemptKey.DeploymentAttemptStore;
    }

    public disposeInternal(): void {
        this._deploymentAttemptActions.selectAttempt.removeListener(this._handleSelectAttempt);
        this._deploymentAttemptActions.resetSelectedAttempt.removeListener(this._handleResetSelectedAttempt);
    }

    public getState(): IAttemptState {
        return {
            selectedAttempt: this._selectedAttempt
        };
    }

    private _handleSelectAttempt = (attempt: number): void => {
        this._selectedAttempt = attempt;
        this.emitChanged();
    }

    private _handleResetSelectedAttempt = (): void => {
        this._selectedAttempt = -1;
        this.emitChanged();
    }

    private _deploymentAttemptActions: DeploymentAttemptActions;
    private _selectedAttempt: number = -1;
}