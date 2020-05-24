import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

import { DeploymentAttemptActions } from "PipelineWorkflow/Scripts/ReleaseProgress/DeploymentAttempt/DeploymentAttemptActions";
import { DeploymentAttemptKey } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

export class DeploymentAttemptActionCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return DeploymentAttemptKey.DeploymentAttemptActionsCreator;
    }

    public initialize(instanceId?: string): void {
        this._deploymentAttemptActions = ActionsHubManager.GetActionsHub<DeploymentAttemptActions>(DeploymentAttemptActions, instanceId);
    }

    public selectAttempt(attemptNumber: number): void {
        this._deploymentAttemptActions.selectAttempt.invoke(attemptNumber);
    }

    public resetSelectedAttempt(): void {
        this._deploymentAttemptActions.resetSelectedAttempt.invoke({});
    }

    private _deploymentAttemptActions: DeploymentAttemptActions;
}